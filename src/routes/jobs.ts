import { Hono } from 'hono'
import { verifyToken } from './auth'

type Bindings = { DB: D1Database }
const jobs = new Hono<{ Bindings: Bindings }>()

// Smart JD matching algorithm
function calculateMatchScore(jobSkills: string[], employeeSkills: string[], jobDesc: string, employeeProfile: any): number {
  let score = 0
  const totalWeight = 100

  // Skill match (60% weight)
  if (jobSkills.length > 0 && employeeSkills.length > 0) {
    const jobSkillsLower = jobSkills.map(s => s.toLowerCase())
    const empSkillsLower = employeeSkills.map(s => s.toLowerCase())
    let matched = 0
    for (const skill of jobSkillsLower) {
      if (empSkillsLower.some(es => es.includes(skill) || skill.includes(es))) matched++
    }
    score += (matched / jobSkills.length) * 60
  }

  // Experience match (25% weight)
  const empExp = employeeProfile.total_experience_years || 0
  // We'll pass expMin/expMax from job
  const expMin = employeeProfile._expMin || 0
  const expMax = employeeProfile._expMax || 20
  if (empExp >= expMin && empExp <= expMax) {
    score += 25
  } else if (empExp >= expMin * 0.7) {
    score += 12
  }

  // Location match (15% weight)
  const jobCity = (employeeProfile._jobCity || '').toLowerCase()
  const empCity = (employeeProfile.city || '').toLowerCase()
  if (jobCity && empCity && (jobCity === empCity || empCity.includes(jobCity) || jobCity.includes(empCity))) {
    score += 15
  } else {
    score += 5 // partial for remote-friendly
  }

  return Math.min(Math.round(score), 100)
}

function getAuthUser(c: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return null
  return verifyToken(authHeader.replace('Bearer ', ''))
}

// Safe JSON parse – returns [] if value is not valid JSON array
function safeParseSkills(val: any): string[] {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) return parsed
    // It parsed but isn't an array (e.g. a plain string wrapped in quotes)
    return [String(parsed)]
  } catch {
    // Plain comma-separated string like "Python,JavaScript"
    return String(val).split(',').map(s => s.trim()).filter(Boolean)
  }
}

// Get all jobs with filters + smart matching for employee
jobs.get('/', async (c) => {
  try {
    const user = getAuthUser(c)
    const { city, state, search, job_type, work_mode, exp_min, exp_max, salary_min, page = '1', limit = '10' } = c.req.query()
    
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    let query = `
      SELECT j.*, c.company_name, c.logo_url, c.city as company_city, c.is_verified,
             (SELECT COUNT(*) FROM job_applications WHERE job_id = j.id) as applications_count
      FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE j.is_active = 1`
    
    const params: any[] = []

    if (city) { query += ` AND (j.city LIKE ? OR j.location LIKE ?)`; params.push(`%${city}%`, `%${city}%`) }
    if (state) { query += ` AND j.state LIKE ?`; params.push(`%${state}%`) }
    if (job_type) { query += ` AND j.job_type = ?`; params.push(job_type) }
    if (work_mode) { query += ` AND j.work_mode = ?`; params.push(work_mode) }
    if (exp_min) { query += ` AND j.experience_max >= ?`; params.push(parseFloat(exp_min)) }
    if (exp_max) { query += ` AND j.experience_min <= ?`; params.push(parseFloat(exp_max)) }
    if (salary_min) { query += ` AND j.salary_max >= ?`; params.push(parseInt(salary_min)) }
    if (search) {
      query += ` AND (j.title LIKE ? OR j.description LIKE ? OR j.skills_required LIKE ? OR c.company_name LIKE ?)`
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    }

    query += ` ORDER BY j.created_at DESC LIMIT ? OFFSET ?`
    params.push(limitNum, offset)

    const result = await c.env.DB.prepare(query).bind(...params).all()
    let jobsList = result.results as any[]

    // If employee, calculate match scores
    let empProfile: any = null
    if (user && user.role === 'employee') {
      empProfile = await c.env.DB.prepare(
        'SELECT * FROM employee_profiles WHERE user_id = ?'
      ).bind(user.userId).first() as any

      if (empProfile) {
        const empSkills = safeParseSkills(empProfile.skills)
        jobsList = jobsList.map(job => {
          const jobSkills = safeParseSkills(job.skills_required)
          const profileWithJobData = {
            ...empProfile,
            _expMin: job.experience_min,
            _expMax: job.experience_max,
            _jobCity: job.city
          }
          const matchScore = calculateMatchScore(jobSkills, empSkills, job.description, profileWithJobData)
          return { ...job, match_score: matchScore }
        })
        // Sort by match score for employees
        jobsList.sort((a, b) => b.match_score - a.match_score)
      }
    }

    // Count total
    let countQuery = `SELECT COUNT(*) as total FROM jobs j JOIN companies c ON j.company_id = c.id WHERE j.is_active = 1`
    const countParams: any[] = []
    if (city) { countQuery += ` AND (j.city LIKE ? OR j.location LIKE ?)`; countParams.push(`%${city}%`, `%${city}%`) }
    if (search) { countQuery += ` AND (j.title LIKE ? OR j.description LIKE ? OR j.skills_required LIKE ? OR c.company_name LIKE ?)`; countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`) }
    
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first() as any

    return c.json({ 
      success: true, 
      jobs: jobsList, 
      total: countResult?.total || 0,
      page: pageNum,
      totalPages: Math.ceil((countResult?.total || 0) / limitNum)
    })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Get single job
jobs.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    // Increment views
    await c.env.DB.prepare('UPDATE jobs SET views_count = views_count + 1 WHERE id = ?').bind(id).run()
    
    const job = await c.env.DB.prepare(`
      SELECT j.*, c.company_name, c.logo_url, c.description as company_desc, 
             c.city as company_city, c.website, c.company_size, c.is_verified,
             c.industry, c.founded_year, c.contact_email,
             (SELECT COUNT(*) FROM job_applications WHERE job_id = j.id) as applications_count
      FROM jobs j JOIN companies c ON j.company_id = c.id WHERE j.id = ?
    `).bind(id).first() as any

    if (!job) return c.json({ success: false, message: 'Job not found' }, 404)

    // Check if user has applied
    const user = getAuthUser(c)
    let hasApplied = false
    let isSaved = false
    let matchScore = 0

    if (user && user.role === 'employee') {
      const empProfile = await c.env.DB.prepare('SELECT * FROM employee_profiles WHERE user_id = ?').bind(user.userId).first() as any
      if (empProfile) {
        const app = await c.env.DB.prepare(
          'SELECT id FROM job_applications WHERE job_id = ? AND employee_id = ?'
        ).bind(id, empProfile.id).first()
        hasApplied = !!app

        const saved = await c.env.DB.prepare(
          'SELECT id FROM saved_jobs WHERE job_id = ? AND employee_id = ?'
        ).bind(id, empProfile.id).first()
        isSaved = !!saved

        const jobSkills = safeParseSkills(job.skills_required)
        const empSkills = safeParseSkills(empProfile.skills)
        const profileWithJobData = { ...empProfile, _expMin: job.experience_min, _expMax: job.experience_max, _jobCity: job.city }
        matchScore = calculateMatchScore(jobSkills, empSkills, job.description, profileWithJobData)
      }
    }

    return c.json({ success: true, job: { ...job, hasApplied, isSaved, match_score: matchScore } })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Create new job (employer only)
jobs.post('/', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || !['employer', 'super_admin'].includes(user.role)) {
      return c.json({ success: false, message: 'Employer access required' }, 403)
    }

    const body = await c.req.json()
    const {
      title, description, requirements, skills_required,
      job_type, work_mode, city, state, location,
      salary_min, salary_max, experience_min, experience_max,
      openings, deadline
    } = body

    if (!title || !description || !requirements) {
      return c.json({ success: false, message: 'Title, description and requirements are required' }, 400)
    }

    let companyId: number
    if (user.role === 'employer') {
      const company = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
      if (!company) return c.json({ success: false, message: 'Company profile not found' }, 404)
      companyId = company.id
    } else {
      // super_admin can post under any company - use first company
      const company = await c.env.DB.prepare('SELECT id FROM companies LIMIT 1').first() as any
      if (!company) return c.json({ success: false, message: 'No company found' }, 404)
      companyId = company.id
    }

    const skillsJson = Array.isArray(skills_required)
      ? JSON.stringify(skills_required)
      : (skills_required || '[]')

    const validJobTypes: Record<string, string> = {
      'full-time': 'full_time', 'part-time': 'part_time',
      'full_time': 'full_time', 'part_time': 'part_time',
      'contract': 'contract', 'internship': 'internship', 'freelance': 'freelance'
    }
    const validWorkModes: Record<string, string> = {
      'remote': 'remote', 'onsite': 'onsite', 'office': 'onsite', 'hybrid': 'hybrid'
    }
    const normalizedJobType = validJobTypes[job_type] || 'full_time'
    const normalizedWorkMode = validWorkModes[work_mode] || 'onsite'

    const result = await c.env.DB.prepare(`
      INSERT INTO jobs (
        company_id, title, description, requirements, skills_required,
        job_type, work_mode, city, state, location,
        salary_min, salary_max, experience_min, experience_max,
        no_of_openings, application_deadline, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      companyId, title, description, requirements, skillsJson,
      normalizedJobType, normalizedWorkMode,
      city || '', state || '', location || '',
      salary_min || 0, salary_max || 0,
      experience_min || 0, experience_max || 10,
      openings || 1, deadline || null
    ).run()

    return c.json({ success: true, message: 'Job created successfully', jobId: result.meta.last_row_id })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Edit job (employer only)
jobs.put('/:id', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || !['employer', 'super_admin'].includes(user.role)) {
      return c.json({ success: false, message: 'Employer access required' }, 403)
    }

    const jobId = c.req.param('id')

    // Verify ownership
    if (user.role === 'employer') {
      const company = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
      if (!company) return c.json({ success: false, message: 'Company not found' }, 404)
      const job = await c.env.DB.prepare('SELECT id FROM jobs WHERE id = ? AND company_id = ?').bind(jobId, company.id).first()
      if (!job) return c.json({ success: false, message: 'Job not found or not authorized' }, 404)
    }

    const body = await c.req.json()
    const {
      title, description, requirements, skills_required,
      job_type, work_mode, city, state, location,
      salary_min, salary_max, experience_min, experience_max,
      openings, deadline, is_active
    } = body

    const skillsJson = Array.isArray(skills_required)
      ? JSON.stringify(skills_required)
      : (skills_required !== undefined ? skills_required : undefined)

    // Build dynamic update
    const fields: string[] = []
    const vals: any[] = []
    if (title !== undefined) { fields.push('title = ?'); vals.push(title) }
    if (description !== undefined) { fields.push('description = ?'); vals.push(description) }
    if (requirements !== undefined) { fields.push('requirements = ?'); vals.push(requirements) }
    if (skillsJson !== undefined) { fields.push('skills_required = ?'); vals.push(skillsJson) }
    if (job_type !== undefined) { fields.push('job_type = ?'); vals.push(job_type) }
    if (work_mode !== undefined) { fields.push('work_mode = ?'); vals.push(work_mode) }
    if (city !== undefined) { fields.push('city = ?'); vals.push(city) }
    if (state !== undefined) { fields.push('state = ?'); vals.push(state) }
    if (location !== undefined) { fields.push('location = ?'); vals.push(location) }
    if (salary_min !== undefined) { fields.push('salary_min = ?'); vals.push(salary_min) }
    if (salary_max !== undefined) { fields.push('salary_max = ?'); vals.push(salary_max) }
    if (experience_min !== undefined) { fields.push('experience_min = ?'); vals.push(experience_min) }
    if (experience_max !== undefined) { fields.push('experience_max = ?'); vals.push(experience_max) }
    if (openings !== undefined) { fields.push('openings = ?'); vals.push(openings) }
    if (deadline !== undefined) { fields.push('deadline = ?'); vals.push(deadline) }
    if (is_active !== undefined) { fields.push('is_active = ?'); vals.push(is_active ? 1 : 0) }

    if (fields.length === 0) return c.json({ success: false, message: 'No fields to update' }, 400)

    fields.push('updated_at = CURRENT_TIMESTAMP')
    vals.push(jobId)

    await c.env.DB.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).bind(...vals).run()

    return c.json({ success: true, message: 'Job updated successfully' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Delete job (employer/admin only)
jobs.delete('/:id', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || !['employer', 'super_admin'].includes(user.role)) {
      return c.json({ success: false, message: 'Employer access required' }, 403)
    }

    const jobId = c.req.param('id')

    if (user.role === 'employer') {
      const company = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
      if (!company) return c.json({ success: false, message: 'Company not found' }, 404)
      const job = await c.env.DB.prepare('SELECT id FROM jobs WHERE id = ? AND company_id = ?').bind(jobId, company.id).first()
      if (!job) return c.json({ success: false, message: 'Job not found or not authorized' }, 404)
    }

    // Soft delete - just deactivate
    await c.env.DB.prepare('UPDATE jobs SET is_active = 0 WHERE id = ?').bind(jobId).run()

    return c.json({ success: true, message: 'Job deleted successfully' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Apply for job
jobs.post('/:id/apply', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employee') return c.json({ success: false, message: 'Employee access required' }, 403)

    const jobId = c.req.param('id')
    let cover_letter = ''
    try { const body = await c.req.json(); cover_letter = body?.cover_letter || '' } catch (_) {}

    const empProfile = await c.env.DB.prepare('SELECT id FROM employee_profiles WHERE user_id = ?').bind(user.userId).first() as any
    if (!empProfile) return c.json({ success: false, message: 'Profile not found' }, 404)

    const job = await c.env.DB.prepare('SELECT * FROM jobs WHERE id = ? AND is_active = 1').bind(jobId).first() as any
    if (!job) return c.json({ success: false, message: 'Job not found' }, 404)

    // Calculate match score
    const empProfileFull = await c.env.DB.prepare('SELECT * FROM employee_profiles WHERE id = ?').bind(empProfile.id).first() as any
    const jobSkills = safeParseSkills(job.skills_required)
    const empSkills = safeParseSkills(empProfileFull?.skills)
    const profileWithJobData = { ...empProfileFull, _expMin: job.experience_min, _expMax: job.experience_max, _jobCity: job.city }
    const matchScore = calculateMatchScore(jobSkills, empSkills, job.description, profileWithJobData)

    await c.env.DB.prepare(
      'INSERT INTO job_applications (job_id, employee_id, cover_letter, match_score) VALUES (?, ?, ?, ?)'
    ).bind(jobId, empProfile.id, cover_letter || '', matchScore).run()

    return c.json({ success: true, message: 'Applied successfully', matchScore })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ success: false, message: 'Already applied' }, 409)
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Save/unsave job
jobs.post('/:id/save', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employee') return c.json({ success: false, message: 'Employee access required' }, 403)

    const jobId = c.req.param('id')
    const empProfile = await c.env.DB.prepare('SELECT id FROM employee_profiles WHERE user_id = ?').bind(user.userId).first() as any
    if (!empProfile) return c.json({ success: false, message: 'Profile not found' }, 404)

    const saved = await c.env.DB.prepare('SELECT id FROM saved_jobs WHERE job_id = ? AND employee_id = ?').bind(jobId, empProfile.id).first()
    if (saved) {
      await c.env.DB.prepare('DELETE FROM saved_jobs WHERE job_id = ? AND employee_id = ?').bind(jobId, empProfile.id).run()
      return c.json({ success: true, saved: false, message: 'Job removed from saved' })
    } else {
      await c.env.DB.prepare('INSERT INTO saved_jobs (job_id, employee_id) VALUES (?, ?)').bind(jobId, empProfile.id).run()
      return c.json({ success: true, saved: true, message: 'Job saved successfully' })
    }
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Get applications for a job (employer)
jobs.get('/:id/applications', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)

    const jobId = c.req.param('id')

    // Verify job belongs to this company
    const company = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    const job = await c.env.DB.prepare('SELECT id FROM jobs WHERE id = ? AND company_id = ?').bind(jobId, company?.id).first()
    if (!job) return c.json({ success: false, message: 'Job not found' }, 404)

    const applications = await c.env.DB.prepare(`
      SELECT ja.*, ep.full_name, ep.phone, ep.city, ep.state, ep.current_job_title,
             ep.total_experience_years, ep.expected_salary, ep.skills, ep.resume_url,
             ep.profile_photo, u.email,
             (SELECT AVG(rating) FROM employee_reviews WHERE employee_id = ep.id) as avg_rating,
             (SELECT COUNT(*) FROM employee_reviews WHERE employee_id = ep.id AND is_flagged = 1) as flag_count
      FROM job_applications ja
      JOIN employee_profiles ep ON ja.employee_id = ep.id
      JOIN users u ON ep.user_id = u.id
      WHERE ja.job_id = ?
      ORDER BY ja.match_score DESC, ja.applied_at DESC
    `).bind(jobId).all()

    return c.json({ success: true, applications: applications.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Update application status (employer)
jobs.put('/applications/:appId/status', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)

    const appId = c.req.param('appId')
    const { status, notes } = await c.req.json()

    await c.env.DB.prepare(
      'UPDATE job_applications SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(status, notes || '', appId).run()

    return c.json({ success: true, message: 'Status updated' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

export default jobs
