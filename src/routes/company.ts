import { Hono } from 'hono'
import { verifyToken } from './auth'

type Bindings = { DB: D1Database }
const company = new Hono<{ Bindings: Bindings }>()

function getAuthUser(c: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return null
  return verifyToken(authHeader.replace('Bearer ', ''))
}

// Get company profile
company.get('/profile', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)

    const comp = await c.env.DB.prepare(
      'SELECT c.*, u.email FROM companies c JOIN users u ON c.user_id = u.id WHERE c.user_id = ?'
    ).bind(user.userId).first()

    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)
    return c.json({ success: true, company: comp })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Update company profile
company.put('/profile', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)

    const body = await c.req.json()
    const {
      company_name, industry, description, website, logo_url, location,
      city, state, country, pincode, company_size, founded_year, contact_phone, contact_email
    } = body

    await c.env.DB.prepare(`
      UPDATE companies SET
        company_name = COALESCE(?, company_name),
        industry = COALESCE(?, industry),
        description = COALESCE(?, description),
        website = COALESCE(?, website),
        logo_url = COALESCE(?, logo_url),
        location = COALESCE(?, location),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        country = COALESCE(?, country),
        pincode = COALESCE(?, pincode),
        company_size = COALESCE(?, company_size),
        founded_year = COALESCE(?, founded_year),
        contact_phone = COALESCE(?, contact_phone),
        contact_email = COALESCE(?, contact_email),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).bind(
      company_name, industry, description, website, logo_url, location,
      city, state, country, pincode, company_size, founded_year, contact_phone, contact_email,
      user.userId
    ).run()

    const updated = await c.env.DB.prepare('SELECT * FROM companies WHERE user_id = ?').bind(user.userId).first()
    return c.json({ success: true, message: 'Company profile updated', company: updated })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Get company jobs
company.get('/jobs', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)

    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    const jobsList = await c.env.DB.prepare(`
      SELECT j.*, 
        (SELECT COUNT(*) FROM job_applications WHERE job_id = j.id) as applications_count,
        (SELECT COUNT(*) FROM job_applications WHERE job_id = j.id AND status = 'applied') as new_applications,
        (SELECT COUNT(*) FROM job_applications WHERE job_id = j.id AND status = 'shortlisted') as shortlisted_count
      FROM jobs j WHERE j.company_id = ?
      ORDER BY j.created_at DESC
    `).bind(comp.id).all()

    return c.json({ success: true, jobs: jobsList.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Create job
company.post('/jobs', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)

    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    const body = await c.req.json()
    const {
      title, department, job_type, work_mode, location, city, state, country,
      description, requirements, responsibilities, skills_required,
      experience_min, experience_max, salary_min, salary_max, salary_currency,
      education_required, no_of_openings, application_deadline
    } = body

    if (!title || !description || !requirements) {
      return c.json({ success: false, message: 'Title, description and requirements are required' }, 400)
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO jobs (
        company_id, title, department, job_type, work_mode, location, city, state, country,
        description, requirements, responsibilities, skills_required,
        experience_min, experience_max, salary_min, salary_max, salary_currency,
        education_required, no_of_openings, application_deadline
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      comp.id, title, department || '', job_type || 'full_time', work_mode || 'onsite',
      location || city || '', city || '', state || '', country || 'India',
      description, requirements, responsibilities || '',
      JSON.stringify(skills_required || []),
      experience_min || 0, experience_max || 10,
      salary_min || null, salary_max || null, salary_currency || 'INR',
      education_required || '', no_of_openings || 1, application_deadline || null
    ).run()

    return c.json({ success: true, message: 'Job posted successfully', jobId: result.meta.last_row_id })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Update job
company.put('/jobs/:id', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)

    const jobId = c.req.param('id')
    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    
    const job = await c.env.DB.prepare('SELECT id FROM jobs WHERE id = ? AND company_id = ?').bind(jobId, comp?.id).first()
    if (!job) return c.json({ success: false, message: 'Job not found' }, 404)

    const body = await c.req.json()
    const {
      title, department, job_type, work_mode, location, city, state, country,
      description, requirements, responsibilities, skills_required,
      experience_min, experience_max, salary_min, salary_max,
      education_required, no_of_openings, application_deadline, is_active
    } = body

    await c.env.DB.prepare(`
      UPDATE jobs SET
        title = COALESCE(?, title),
        department = COALESCE(?, department),
        job_type = COALESCE(?, job_type),
        work_mode = COALESCE(?, work_mode),
        location = COALESCE(?, location),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        description = COALESCE(?, description),
        requirements = COALESCE(?, requirements),
        responsibilities = COALESCE(?, responsibilities),
        skills_required = COALESCE(?, skills_required),
        experience_min = COALESCE(?, experience_min),
        experience_max = COALESCE(?, experience_max),
        salary_min = COALESCE(?, salary_min),
        salary_max = COALESCE(?, salary_max),
        education_required = COALESCE(?, education_required),
        no_of_openings = COALESCE(?, no_of_openings),
        application_deadline = COALESCE(?, application_deadline),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      title, department, job_type, work_mode, location, city, state,
      description, requirements, responsibilities,
      skills_required ? JSON.stringify(skills_required) : null,
      experience_min, experience_max, salary_min, salary_max,
      education_required, no_of_openings, application_deadline, is_active,
      jobId
    ).run()

    return c.json({ success: true, message: 'Job updated successfully' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Delete/deactivate job
company.delete('/jobs/:id', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)

    const jobId = c.req.param('id')
    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    
    await c.env.DB.prepare('UPDATE jobs SET is_active = 0 WHERE id = ? AND company_id = ?').bind(jobId, comp?.id).run()
    return c.json({ success: true, message: 'Job deactivated' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Get company dashboard stats
company.get('/stats', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)

    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    const totalJobs = await c.env.DB.prepare('SELECT COUNT(*) as count FROM jobs WHERE company_id = ? AND is_active = 1').bind(comp.id).first() as any
    const totalApplications = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM job_applications ja 
      JOIN jobs j ON ja.job_id = j.id WHERE j.company_id = ?
    `).bind(comp.id).first() as any
    const newApplications = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM job_applications ja 
      JOIN jobs j ON ja.job_id = j.id WHERE j.company_id = ? AND ja.status = 'applied'
    `).bind(comp.id).first() as any
    const shortlisted = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM job_applications ja 
      JOIN jobs j ON ja.job_id = j.id WHERE j.company_id = ? AND ja.status = 'shortlisted'
    `).bind(comp.id).first() as any

    return c.json({
      success: true,
      stats: {
        totalJobs: totalJobs?.count || 0,
        totalApplications: totalApplications?.count || 0,
        newApplications: newApplications?.count || 0,
        shortlisted: shortlisted?.count || 0
      }
    })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

export default company
