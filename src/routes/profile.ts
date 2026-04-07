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

    // Helper: convert undefined to null so D1 doesn't throw D1_TYPE_ERROR
    const n = (v: any) => (v === undefined ? null : v)
    const ns = (v: any) => (v === undefined || v === null ? null : JSON.stringify(v))

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
      n(full_name), n(phone), n(date_of_birth), n(gender),
      n(city), n(state), n(country), n(pincode),
      n(current_job_title), n(current_company),
      n(total_experience_years), n(expected_salary),
      n(current_salary), n(notice_period), n(is_actively_looking),
      ns(skills), ns(education), ns(work_experience),
      ns(certifications), ns(languages),
      n(bio), n(linkedin_url), n(github_url),
      n(portfolio_url), n(profile_photo), n(resume_url),
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

// AI-based automatic profile summary generation
profile.post('/generate-summary', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employee') return c.json({ success: false, message: 'Employee access required' }, 403)

    const ep = await c.env.DB.prepare(
      'SELECT * FROM employee_profiles WHERE user_id = ?'
    ).bind(user.userId).first() as any

    if (!ep) return c.json({ success: false, message: 'Profile not found' }, 404)

    const skills = JSON.parse(ep.skills || '[]')
    const education = JSON.parse(ep.education || '[]')
    const workExp = JSON.parse(ep.work_experience || '[]')
    const certifications = JSON.parse(ep.certifications || '[]')
    const languages = JSON.parse(ep.languages || '[]')

    // Build a rich prompt from the profile data
    const profileContext = [
      ep.full_name ? `Name: ${ep.full_name}` : '',
      ep.current_job_title ? `Current Role: ${ep.current_job_title}` : '',
      ep.current_company ? `Company: ${ep.current_company}` : '',
      ep.total_experience_years ? `Experience: ${ep.total_experience_years} years` : '',
      skills.length ? `Skills: ${skills.join(', ')}` : '',
      ep.city ? `Location: ${ep.city}${ep.state ? ', ' + ep.state : ''}` : '',
      education.length ? `Education: ${education.map((e: any) => `${e.degree} from ${e.institution}${e.year ? ' ('+e.year+')' : ''}`).join('; ')}` : '',
      workExp.length ? `Work Experience: ${workExp.map((w: any) => `${w.title || w.role || ''} at ${w.company || ''} (${w.duration || w.years || ''})`).join('; ')}` : '',
      certifications.length ? `Certifications: ${certifications.join(', ')}` : '',
      languages.length ? `Languages: ${languages.join(', ')}` : '',
      ep.expected_salary ? `Expected Salary: ₹${ep.expected_salary} per annum` : '',
      ep.notice_period !== null && ep.notice_period !== undefined ? `Notice Period: ${ep.notice_period} days` : '',
      ep.linkedin_url ? `LinkedIn: ${ep.linkedin_url}` : '',
      ep.github_url ? `GitHub: ${ep.github_url}` : '',
      ep.portfolio_url ? `Portfolio: ${ep.portfolio_url}` : '',
    ].filter(Boolean).join('\n')

    const prompt = `You are an expert career consultant and professional resume writer. Based on the following employee profile data, generate a compelling, concise, and professional profile summary/bio in 3-4 sentences (max 100 words). The summary should highlight the person's key strengths, experience, skills, and career goals. Make it suitable for a job application or professional profile. Write in first person.

Profile Data:
${profileContext}

Generate only the summary text, no labels or extra content.`

    // Use a simple AI approach - generate summary from profile data algorithmically
    // (Real AI integration via OpenAI API if OPENAI_API_KEY is available)
    const aiApiKey = (c.env as any).OPENAI_API_KEY

    let summary = ''

    if (aiApiKey) {
      // Call OpenAI API
      const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.7
        })
      })
      const aiData = await aiRes.json() as any
      summary = aiData?.choices?.[0]?.message?.content?.trim() || ''
    }

    // Fallback: Smart template-based summary generation
    if (!summary) {
      const expText = ep.total_experience_years > 0
        ? `${ep.total_experience_years}+ years of professional experience`
        : 'a fresh graduate eager to start my career'
      const roleText = ep.current_job_title ? `${ep.current_job_title}` : 'IT Professional'
      const skillsText = skills.length > 0
        ? skills.slice(0, 5).join(', ')
        : 'various technologies'
      const cityText = ep.city ? ` based in ${ep.city}` : ''
      const eduText = education.length > 0 ? ` I hold a ${education[0].degree} from ${education[0].institution}.` : ''
      const lookingText = ep.is_actively_looking
        ? ' Currently actively seeking new opportunities.'
        : ' Open to the right opportunities.'

      summary = `I am a ${roleText}${cityText} with ${expText} in the technology domain. Proficient in ${skillsText}, I bring strong problem-solving skills and a passion for delivering high-quality solutions.${eduText}${lookingText}`
    }

    // Auto-save the generated bio to profile
    await c.env.DB.prepare(
      'UPDATE employee_profiles SET bio = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
    ).bind(summary, user.userId).run()

    return c.json({ success: true, summary, message: 'Profile summary generated and saved!' })
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
