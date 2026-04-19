import { Hono } from 'hono'
import { verifyToken } from './auth'

function simpleHash(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36) + '_' + password.length
}

type Bindings = { DB: D1Database }
const admin = new Hono<{ Bindings: Bindings }>()

function getAuthUser(c: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return null
  return verifyToken(authHeader.replace('Bearer ', ''))
}

function requireAdmin(c: any) {
  const user = getAuthUser(c)
  if (!user || user.role !== 'super_admin') return null
  return user
}

// Dashboard stats
admin.get('/stats', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const totalUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first() as any
    const totalCompanies = await c.env.DB.prepare('SELECT COUNT(*) as count FROM companies').first() as any
    const totalEmployees = await c.env.DB.prepare('SELECT COUNT(*) as count FROM employee_profiles').first() as any
    const totalJobs = await c.env.DB.prepare('SELECT COUNT(*) as count FROM jobs WHERE is_active = 1').first() as any
    const totalApplications = await c.env.DB.prepare('SELECT COUNT(*) as count FROM job_applications').first() as any
    const pendingVerification = await c.env.DB.prepare('SELECT COUNT(*) as count FROM companies WHERE is_verified = 0').first() as any
    const totalReviews = await c.env.DB.prepare('SELECT COUNT(*) as count FROM employee_reviews').first() as any
    const flaggedReviews = await c.env.DB.prepare('SELECT COUNT(*) as count FROM employee_reviews WHERE is_flagged = 1').first() as any

    // Recent activities
    const recentJobs = await c.env.DB.prepare(`
      SELECT j.title, j.created_at, c.company_name FROM jobs j
      JOIN companies c ON j.company_id = c.id
      ORDER BY j.created_at DESC LIMIT 5
    `).all()

    const recentUsers = await c.env.DB.prepare(`
      SELECT email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5
    `).all()

    return c.json({
      success: true,
      stats: {
        totalUsers: totalUsers?.count || 0,
        totalCompanies: totalCompanies?.count || 0,
        totalEmployees: totalEmployees?.count || 0,
        totalJobs: totalJobs?.count || 0,
        totalApplications: totalApplications?.count || 0,
        pendingVerification: pendingVerification?.count || 0,
        totalReviews: totalReviews?.count || 0,
        flaggedReviews: flaggedReviews?.count || 0
      },
      recentJobs: recentJobs.results,
      recentUsers: recentUsers.results
    })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Get all users
admin.get('/users', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const { role, page = '1', search } = c.req.query()
    const pageNum = parseInt(page)
    const offset = (pageNum - 1) * 20

    let query = 'SELECT u.id, u.email, u.role, u.is_active, u.created_at FROM users u WHERE 1=1'
    const params: any[] = []

    if (role) { query += ' AND u.role = ?'; params.push(role) }
    if (search) { query += ' AND u.email LIKE ?'; params.push(`%${search}%`) }

    query += ' ORDER BY u.created_at DESC LIMIT 20 OFFSET ?'
    params.push(offset)

    const users = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, users: users.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Toggle user status
admin.put('/users/:id/toggle', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const userId = c.req.param('id')
    await c.env.DB.prepare(
      'UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?'
    ).bind(userId).run()

    return c.json({ success: true, message: 'User status updated' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Get all companies
admin.get('/companies', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const companies = await c.env.DB.prepare(`
      SELECT c.*, u.email, u.is_active,
        (SELECT COUNT(*) FROM jobs WHERE company_id = c.id AND is_active = 1) as active_jobs,
        (SELECT COUNT(*) FROM job_applications ja JOIN jobs j ON ja.job_id = j.id WHERE j.company_id = c.id) as total_applications
      FROM companies c JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
    `).all()

    return c.json({ success: true, companies: companies.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Verify/unverify company
admin.put('/companies/:id/verify', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const compId = c.req.param('id')
    const { is_verified } = await c.req.json()

    await c.env.DB.prepare('UPDATE companies SET is_verified = ? WHERE id = ?').bind(is_verified ? 1 : 0, compId).run()
    return c.json({ success: true, message: `Company ${is_verified ? 'verified' : 'unverified'}` })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Get all employees
admin.get('/employees', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const employees = await c.env.DB.prepare(`
      SELECT ep.*, u.email, u.is_active,
        (SELECT COUNT(*) FROM job_applications WHERE employee_id = ep.id) as total_applications,
        (SELECT ROUND(AVG(rating),1) FROM employee_reviews WHERE employee_id = ep.id) as avg_rating,
        (SELECT COUNT(*) FROM employee_reviews WHERE employee_id = ep.id AND is_flagged = 1) as flag_count,
        (SELECT hs.basic_salary FROM hrms_staff hs WHERE hs.employee_profile_id = ep.id AND hs.is_active = 1 LIMIT 1) as hrms_salary,
        (SELECT c2.company_name FROM hrms_staff hs2 JOIN companies c2 ON hs2.company_id = c2.id WHERE hs2.employee_profile_id = ep.id AND hs2.is_active = 1 LIMIT 1) as hrms_company
      FROM employee_profiles ep JOIN users u ON ep.user_id = u.id
      ORDER BY ep.created_at DESC
    `).all()

    return c.json({ success: true, employees: employees.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Get all reviews with flags
admin.get('/reviews', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const { flagged } = c.req.query()

    let query = `
      SELECT er.*, c.company_name, ep.full_name as employee_name
      FROM employee_reviews er
      JOIN companies c ON er.company_id = c.id
      JOIN employee_profiles ep ON er.employee_id = ep.id
    `
    if (flagged === 'true') query += ' WHERE er.is_flagged = 1'
    query += ' ORDER BY er.created_at DESC'

    const reviewsList = await c.env.DB.prepare(query).all()
    return c.json({ success: true, reviews: reviewsList.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Get all jobs
admin.get('/jobs', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const jobsList = await c.env.DB.prepare(`
      SELECT j.*, c.company_name,
        (SELECT COUNT(*) FROM job_applications WHERE job_id = j.id) as applications_count
      FROM jobs j JOIN companies c ON j.company_id = c.id
      ORDER BY j.created_at DESC
    `).all()

    return c.json({ success: true, jobs: jobsList.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Toggle job status
admin.put('/jobs/:id/toggle', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const jobId = c.req.param('id')
    await c.env.DB.prepare('UPDATE jobs SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?').bind(jobId).run()
    return c.json({ success: true, message: 'Job status updated' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── CREATE COMPANY (admin creates a new company + user account) ──
admin.post('/companies', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const body = await c.req.json()
    const { company_name, email, password, industry, city, state, country, website, contact_phone } = body

    if (!company_name || !email || !password)
      return c.json({ success: false, message: 'Company name, email and password are required' }, 400)

    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (existing) return c.json({ success: false, message: 'Email already registered' }, 400)

    // Hash password (simple hash like auth route)
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    const shortHash = hashHex.substring(0, 16)

    // Create user
    const userResult = await c.env.DB.prepare(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)'
    ).bind(email, shortHash, 'employer').run()

    const newUserId = userResult.meta.last_row_id

    // Create company profile
    await c.env.DB.prepare(`
      INSERT INTO companies (user_id, company_name, industry, city, state, country, website, contact_phone, contact_email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      newUserId, company_name,
      industry || null, city || null, state || null,
      country || 'India', website || null, contact_phone || null, email
    ).run()

    return c.json({ success: true, message: `Company "${company_name}" created successfully` })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── DISABLE / ENABLE COMPANY ──
admin.put('/companies/:id/toggle', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const compId = c.req.param('id')
    // Get company's user_id first
    const comp = await c.env.DB.prepare('SELECT user_id FROM companies WHERE id = ?').bind(compId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    await c.env.DB.prepare(
      'UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?'
    ).bind(comp.user_id).run()

    const updatedUser = await c.env.DB.prepare('SELECT is_active FROM users WHERE id = ?').bind(comp.user_id).first() as any
    const status = updatedUser?.is_active ? 'enabled' : 'disabled'
    return c.json({ success: true, message: `Company ${status} successfully` })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── DELETE COMPANY ──
admin.delete('/companies/:id', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const compId = c.req.param('id')
    const comp = await c.env.DB.prepare('SELECT user_id FROM companies WHERE id = ?').bind(compId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    // Deactivate all jobs, then delete company + user
    await c.env.DB.prepare('UPDATE jobs SET is_active = 0 WHERE company_id = ?').bind(compId).run()
    await c.env.DB.prepare('DELETE FROM companies WHERE id = ?').bind(compId).run()
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(comp.user_id).run()

    return c.json({ success: true, message: 'Company deleted successfully' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── CHANGE COMPANY PASSWORD (admin resets employer password) ──
admin.put('/companies/:id/password', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const compId = c.req.param('id')
    const { new_password } = await c.req.json()
    if (!new_password || new_password.length < 6)
      return c.json({ success: false, message: 'Password must be at least 6 characters' }, 400)

    const comp = await c.env.DB.prepare('SELECT user_id FROM companies WHERE id = ?').bind(compId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(simpleHash(new_password), comp.user_id).run()

    return c.json({ success: true, message: 'Company password changed successfully' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── ADMIN: Get employees with search + pagination ──
admin.get('/employees/search', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const { q, city, flag, page = '1' } = c.req.query()
    const pageNum = parseInt(page)
    const offset = (pageNum - 1) * 50

    let query = `
      SELECT ep.id, ep.full_name, ep.current_job_title, ep.current_company, ep.city, ep.state,
             ep.total_experience_years, ep.expected_salary,
             u.email, u.is_active, u.created_at,
             (SELECT COUNT(*) FROM job_applications WHERE employee_id = ep.id) as total_applications,
             (SELECT ROUND(AVG(rating),1) FROM employee_reviews WHERE employee_id = ep.id) as avg_rating,
             (SELECT COUNT(*) FROM employee_reviews WHERE employee_id = ep.id AND is_flagged = 1) as flag_count,
             (SELECT hs.basic_salary FROM hrms_staff hs WHERE hs.employee_profile_id = ep.id AND hs.is_active = 1 LIMIT 1) as hrms_salary,
             (SELECT c2.company_name FROM hrms_staff hs2 JOIN companies c2 ON hs2.company_id = c2.id WHERE hs2.employee_profile_id = ep.id AND hs2.is_active = 1 LIMIT 1) as hrms_company
      FROM employee_profiles ep JOIN users u ON ep.user_id = u.id
      WHERE 1=1`
    const params: any[] = []

    if (q?.trim()) {
      query += ' AND (ep.full_name LIKE ? OR u.email LIKE ? OR ep.current_job_title LIKE ?)'
      const lq = `%${q.trim()}%`
      params.push(lq, lq, lq)
    }
    if (city?.trim()) { query += ' AND ep.city LIKE ?'; params.push(`%${city.trim()}%`) }
    if (flag === 'true') { query += ' AND (SELECT COUNT(*) FROM employee_reviews WHERE employee_id = ep.id AND is_flagged = 1) > 0' }

    query += ' ORDER BY ep.full_name LIMIT 50 OFFSET ?'
    params.push(offset)

    const employees = params.length
      ? await c.env.DB.prepare(query).bind(...params).all()
      : await c.env.DB.prepare(query).all()

    return c.json({ success: true, employees: employees.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── REVIEW REMOVAL REQUESTS: list ──
admin.get('/review-removal-requests', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const { status } = c.req.query()
    let query = `
      SELECT rrr.*, ep.full_name as employee_name, u.email as employee_email,
             er.review_text, er.rating, c.company_name
      FROM review_removal_requests rrr
      JOIN employee_profiles ep ON rrr.employee_profile_id = ep.id
      JOIN users u ON ep.user_id = u.id
      JOIN employee_reviews er ON rrr.review_id = er.id
      JOIN companies c ON er.company_id = c.id
      WHERE 1=1`
    if (status) query += ` AND rrr.status = '${status}'`
    query += ' ORDER BY rrr.created_at DESC'

    const requests = await c.env.DB.prepare(query).all()
    return c.json({ success: true, requests: requests.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── REVIEW REMOVAL REQUESTS: approve / reject ──
admin.put('/review-removal-requests/:id', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const reqId = c.req.param('id')
    const { status, admin_notes, amount_charged, delete_review } = await c.req.json()

    if (!['approved', 'rejected'].includes(status))
      return c.json({ success: false, message: 'Status must be approved or rejected' }, 400)

    const req = await c.env.DB.prepare('SELECT * FROM review_removal_requests WHERE id = ?').bind(reqId).first() as any
    if (!req) return c.json({ success: false, message: 'Request not found' }, 404)

    await c.env.DB.prepare(`
      UPDATE review_removal_requests SET status=?, admin_notes=?, amount_charged=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).bind(status, admin_notes || null, amount_charged || req.amount_charged, reqId).run()

    // If approved and delete_review=true, delete the review
    if (status === 'approved' && delete_review) {
      await c.env.DB.prepare('DELETE FROM employee_reviews WHERE id = ?').bind(req.review_id).run()
    }

    return c.json({ success: true, message: `Request ${status}${status === 'approved' && delete_review ? ' and review deleted' : ''}` })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── DELETE REVIEW ──
admin.delete('/reviews/:id', async (c) => {
  try {
    const user = requireAdmin(c)
    if (!user) return c.json({ success: false, message: 'Admin access required' }, 403)

    const reviewId = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM employee_reviews WHERE id = ?').bind(reviewId).run()
    return c.json({ success: true, message: 'Review deleted successfully' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

export default admin
