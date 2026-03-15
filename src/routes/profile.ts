import { Hono } from 'hono'
import { verifyToken } from './auth'

type Bindings = { DB: D1Database }
const profile = new Hono<{ Bindings: Bindings }>()

function getAuthUser(c: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return null
  return verifyToken(authHeader.replace('Bearer ', ''))
}

// Get employee profile
profile.get('/', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employee') return c.json({ success: false, message: 'Employee access required' }, 403)

    const ep = await c.env.DB.prepare(
      'SELECT ep.*, u.email FROM employee_profiles ep JOIN users u ON ep.user_id = u.id WHERE ep.user_id = ?'
    ).bind(user.userId).first() as any

    if (!ep) return c.json({ success: false, message: 'Profile not found' }, 404)

    // Get reviews
    const reviews = await c.env.DB.prepare(`
      SELECT er.*, c.company_name FROM employee_reviews er
      JOIN companies c ON er.company_id = c.id
      WHERE er.employee_id = ? AND er.is_public = 1
      ORDER BY er.created_at DESC
    `).bind(ep.id).all()

    // Get applied jobs
    const applications = await c.env.DB.prepare(`
      SELECT ja.*, j.title, j.city, j.job_type, c.company_name, c.logo_url
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      WHERE ja.employee_id = ?
      ORDER BY ja.applied_at DESC LIMIT 10
    `).bind(ep.id).all()

    // Get saved jobs
    const savedJobs = await c.env.DB.prepare(`
      SELECT sj.*, j.title, j.city, j.job_type, j.salary_min, j.salary_max, c.company_name, c.logo_url
      FROM saved_jobs sj
      JOIN jobs j ON sj.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      WHERE sj.employee_id = ?
      ORDER BY sj.saved_at DESC LIMIT 10
    `).bind(ep.id).all()

    return c.json({ 
      success: true, 
      profile: ep, 
      reviews: reviews.results,
      applications: applications.results,
      savedJobs: savedJobs.results
    })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Update employee profile
profile.put('/', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employee') return c.json({ success: false, message: 'Employee access required' }, 403)

    const body = await c.req.json()
    const {
      full_name, phone, date_of_birth, gender, city, state, country, pincode,
      current_job_title, current_company, total_experience_years, expected_salary,
      current_salary, notice_period, is_actively_looking, skills, education,
      work_experience, certifications, languages, bio, linkedin_url, github_url,
      portfolio_url, profile_photo, resume_url
    } = body

    await c.env.DB.prepare(`
      UPDATE employee_profiles SET
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        date_of_birth = COALESCE(?, date_of_birth),
        gender = COALESCE(?, gender),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        country = COALESCE(?, country),
        pincode = COALESCE(?, pincode),
        current_job_title = COALESCE(?, current_job_title),
        current_company = COALESCE(?, current_company),
        total_experience_years = COALESCE(?, total_experience_years),
        expected_salary = COALESCE(?, expected_salary),
        current_salary = COALESCE(?, current_salary),
        notice_period = COALESCE(?, notice_period),
        is_actively_looking = COALESCE(?, is_actively_looking),
        skills = COALESCE(?, skills),
        education = COALESCE(?, education),
        work_experience = COALESCE(?, work_experience),
        certifications = COALESCE(?, certifications),
        languages = COALESCE(?, languages),
        bio = COALESCE(?, bio),
        linkedin_url = COALESCE(?, linkedin_url),
        github_url = COALESCE(?, github_url),
        portfolio_url = COALESCE(?, portfolio_url),
        profile_photo = COALESCE(?, profile_photo),
        resume_url = COALESCE(?, resume_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).bind(
      full_name, phone, date_of_birth, gender, city, state, country, pincode,
      current_job_title, current_company, total_experience_years, expected_salary,
      current_salary, notice_period, is_actively_looking,
      skills ? JSON.stringify(skills) : null,
      education ? JSON.stringify(education) : null,
      work_experience ? JSON.stringify(work_experience) : null,
      certifications ? JSON.stringify(certifications) : null,
      languages ? JSON.stringify(languages) : null,
      bio, linkedin_url, github_url, portfolio_url, profile_photo, resume_url,
      user.userId
    ).run()

    const updated = await c.env.DB.prepare('SELECT * FROM employee_profiles WHERE user_id = ?').bind(user.userId).first()
    return c.json({ success: true, message: 'Profile updated successfully', profile: updated })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Get public employee profile (for companies)
profile.get('/:id', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || !['employer', 'super_admin'].includes(user.role)) {
      return c.json({ success: false, message: 'Access denied' }, 403)
    }

    const empId = c.req.param('id')
    const ep = await c.env.DB.prepare(
      'SELECT ep.*, u.email FROM employee_profiles ep JOIN users u ON ep.user_id = u.id WHERE ep.id = ?'
    ).bind(empId).first() as any

    if (!ep) return c.json({ success: false, message: 'Profile not found' }, 404)

    const reviews = await c.env.DB.prepare(`
      SELECT er.*, c.company_name FROM employee_reviews er
      JOIN companies c ON er.company_id = c.id
      WHERE er.employee_id = ? AND er.is_public = 1
      ORDER BY er.created_at DESC
    `).bind(empId).all()

    return c.json({ success: true, profile: ep, reviews: reviews.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Get employee's applications
profile.get('/applications/list', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employee') return c.json({ success: false, message: 'Employee access required' }, 403)

    const ep = await c.env.DB.prepare('SELECT id FROM employee_profiles WHERE user_id = ?').bind(user.userId).first() as any
    if (!ep) return c.json({ success: false, message: 'Profile not found' }, 404)

    const applications = await c.env.DB.prepare(`
      SELECT ja.*, j.title, j.city, j.state, j.job_type, j.work_mode,
             j.salary_min, j.salary_max, j.skills_required, j.experience_min, j.experience_max,
             c.company_name, c.logo_url, c.city as company_city
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      WHERE ja.employee_id = ?
      ORDER BY ja.applied_at DESC
    `).bind(ep.id).all()

    return c.json({ success: true, applications: applications.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

export default profile
