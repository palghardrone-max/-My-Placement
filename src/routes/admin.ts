import { Hono } from 'hono'
import { verifyToken } from './auth'

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
        (SELECT AVG(rating) FROM employee_reviews WHERE employee_id = ep.id) as avg_rating,
        (SELECT COUNT(*) FROM employee_reviews WHERE employee_id = ep.id AND is_flagged = 1) as flag_count
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
