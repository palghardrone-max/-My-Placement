import { Hono } from 'hono'
import { verifyToken } from './auth'

type Bindings = { DB: D1Database }
const reviews = new Hono<{ Bindings: Bindings }>()

function getAuthUser(c: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return null
  return verifyToken(authHeader.replace('Bearer ', ''))
}

// Add review for employee (by company)
reviews.post('/', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || !['employer', 'super_admin'].includes(user.role)) {
      return c.json({ success: false, message: 'Employer access required' }, 403)
    }

    const body = await c.req.json()
    const {
      employee_id, rating, punctuality, work_quality, communication, teamwork,
      review_text, is_flagged, flag_reason, worked_from, worked_to, job_title, is_public
    } = body

    let companyId: number
    if (user.role === 'employer') {
      const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
      if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)
      companyId = comp.id
    } else {
      companyId = body.company_id || 1
    }

    // Check employee exists
    const emp = await c.env.DB.prepare('SELECT id FROM employee_profiles WHERE id = ?').bind(employee_id).first()
    if (!emp) return c.json({ success: false, message: 'Employee not found' }, 404)

    const result = await c.env.DB.prepare(`
      INSERT INTO employee_reviews (
        company_id, employee_id, rating, punctuality, work_quality, communication, teamwork,
        review_text, is_flagged, flag_reason, worked_from, worked_to, job_title, is_public
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      companyId, employee_id,
      rating || 3, punctuality || 3, work_quality || 3, communication || 3, teamwork || 3,
      review_text || '',
      is_flagged ? 1 : 0, flag_reason || '',
      worked_from || null, worked_to || null, job_title || '',
      is_public !== false ? 1 : 0
    ).run()

    return c.json({ success: true, message: 'Review added successfully', reviewId: result.meta.last_row_id })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Get reviews for an employee
reviews.get('/employee/:id', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user) return c.json({ success: false, message: 'Auth required' }, 401)

    const empId = c.req.param('id')
    const reviewsList = await c.env.DB.prepare(`
      SELECT er.*, c.company_name, c.logo_url
      FROM employee_reviews er
      JOIN companies c ON er.company_id = c.id
      WHERE er.employee_id = ? AND er.is_public = 1
      ORDER BY er.created_at DESC
    `).bind(empId).all()

    const stats = await c.env.DB.prepare(`
      SELECT 
        AVG(rating) as avg_rating,
        AVG(punctuality) as avg_punctuality,
        AVG(work_quality) as avg_work_quality,
        AVG(communication) as avg_communication,
        AVG(teamwork) as avg_teamwork,
        COUNT(*) as total_reviews,
        SUM(is_flagged) as total_flags
      FROM employee_reviews WHERE employee_id = ?
    `).bind(empId).first()

    return c.json({ success: true, reviews: reviewsList.results, stats })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Get reviews given by company
reviews.get('/company/given', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)

    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    const reviewsList = await c.env.DB.prepare(`
      SELECT er.*, ep.full_name, ep.profile_photo, ep.current_job_title
      FROM employee_reviews er
      JOIN employee_profiles ep ON er.employee_id = ep.id
      WHERE er.company_id = ?
      ORDER BY er.created_at DESC
    `).bind(comp.id).all()

    return c.json({ success: true, reviews: reviewsList.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Flag/unflag review (admin only)
reviews.put('/:id/flag', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'super_admin') return c.json({ success: false, message: 'Admin access required' }, 403)

    const reviewId = c.req.param('id')
    const { is_flagged, flag_reason } = await c.req.json()

    await c.env.DB.prepare(
      'UPDATE employee_reviews SET is_flagged = ?, flag_reason = ? WHERE id = ?'
    ).bind(is_flagged ? 1 : 0, flag_reason || '', reviewId).run()

    return c.json({ success: true, message: 'Review updated' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── EMPLOYEE: Get own reviews ──
reviews.get('/my', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employee') return c.json({ success: false, message: 'Employee access required' }, 403)

    const ep = await c.env.DB.prepare('SELECT id FROM employee_profiles WHERE user_id = ?').bind(user.userId).first() as any
    if (!ep) return c.json({ success: false, message: 'Profile not found' }, 404)

    const reviewsList = await c.env.DB.prepare(`
      SELECT er.*, c.company_name, c.logo_url,
        (SELECT id FROM review_removal_requests WHERE review_id = er.id AND employee_profile_id = ? ORDER BY created_at DESC LIMIT 1) as removal_request_id,
        (SELECT status FROM review_removal_requests WHERE review_id = er.id AND employee_profile_id = ? ORDER BY created_at DESC LIMIT 1) as removal_status
      FROM employee_reviews er
      JOIN companies c ON er.company_id = c.id
      WHERE er.employee_id = ?
      ORDER BY er.created_at DESC
    `).bind(ep.id, ep.id, ep.id).all()

    return c.json({ success: true, reviews: reviewsList.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── EMPLOYEE: Request review removal ──
reviews.post('/:id/request-removal', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employee') return c.json({ success: false, message: 'Employee access required' }, 403)

    const ep = await c.env.DB.prepare('SELECT id FROM employee_profiles WHERE user_id = ?').bind(user.userId).first() as any
    if (!ep) return c.json({ success: false, message: 'Profile not found' }, 404)

    const reviewId = c.req.param('id')
    const { reason, payment_ref } = await c.req.json()
    if (!reason?.trim()) return c.json({ success: false, message: 'Reason is required' }, 400)

    // Check review belongs to this employee
    const review = await c.env.DB.prepare('SELECT id FROM employee_reviews WHERE id = ? AND employee_id = ?').bind(reviewId, ep.id).first()
    if (!review) return c.json({ success: false, message: 'Review not found' }, 404)

    // Check for existing pending request
    const existing = await c.env.DB.prepare(
      "SELECT id FROM review_removal_requests WHERE review_id = ? AND employee_profile_id = ? AND status = 'pending'"
    ).bind(reviewId, ep.id).first()
    if (existing) return c.json({ success: false, message: 'You already have a pending removal request for this review' }, 400)

    await c.env.DB.prepare(`
      INSERT INTO review_removal_requests (review_id, employee_profile_id, reason, payment_ref)
      VALUES (?, ?, ?, ?)
    `).bind(reviewId, ep.id, reason.trim(), payment_ref?.trim() || null).run()

    return c.json({ success: true, message: 'Removal request submitted! Admin will review it shortly.' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

export default reviews
