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

// =============================================
// HRMS v2 - STANDALONE (no portal registration needed)
// Uses hrms_staff, hrms_attendance, hrms_salary tables
// =============================================

const n = (v: any) => (v === undefined || v === '') ? null : v

// GET /hrms/employees - list all staff for this company
company.get('/hrms/employees', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)
    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    const staff = await c.env.DB.prepare(`
      SELECT * FROM hrms_staff WHERE company_id = ? ORDER BY is_active DESC, full_name
    `).bind(comp.id).all()

    return c.json({ success: true, employees: staff.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// GET /hrms/employees/search - search portal registered employees to import
company.get('/hrms/employees/search', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)
    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    const { q } = c.req.query()
    let query = `
      SELECT ep.id, ep.full_name, ep.current_job_title, ep.city, ep.phone, u.email
      FROM employee_profiles ep
      JOIN users u ON ep.user_id = u.id
      WHERE u.is_active = 1
    `
    const params: any[] = []
    if (q && q.trim()) {
      query += ` AND (ep.full_name LIKE ? OR u.email LIKE ? OR ep.current_job_title LIKE ?)`
      const lq = `%${q.trim()}%`
      params.push(lq, lq, lq)
    }
    query += ' ORDER BY ep.full_name LIMIT 50'

    const employees = params.length
      ? await c.env.DB.prepare(query).bind(...params).all()
      : await c.env.DB.prepare(query).all()

    return c.json({ success: true, employees: employees.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// POST /hrms/employees - add single employee (manual or portal-linked)
company.post('/hrms/employees', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)
    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    const body = await c.req.json()
    const { full_name, email, phone, designation, department, join_date, basic_salary, employment_type, employee_code, notes } = body

    if (!full_name || !full_name.trim())
      return c.json({ success: false, message: 'Employee name is required' }, 400)

    await c.env.DB.prepare(`
      INSERT INTO hrms_staff (company_id, full_name, email, phone, designation, department, join_date, basic_salary, employment_type, employee_code, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(comp.id, full_name.trim(), n(email), n(phone), n(designation), n(department),
            n(join_date), Number(basic_salary) || 0, employment_type || 'full_time', n(employee_code), n(notes)).run()

    return c.json({ success: true, message: `${full_name} added to HRMS` })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// POST /hrms/employees/bulk - add multiple employees at once (CSV/array)
company.post('/hrms/employees/bulk', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)
    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    const { employees } = await c.req.json()
    if (!employees?.length) return c.json({ success: false, message: 'No employees provided' }, 400)

    let added = 0, skipped = 0
    for (const emp of employees) {
      if (!emp.full_name?.trim()) { skipped++; continue }
      try {
        await c.env.DB.prepare(`
          INSERT INTO hrms_staff (company_id, full_name, email, phone, designation, department, join_date, basic_salary, employment_type, employee_code)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(comp.id, emp.full_name.trim(), n(emp.email), n(emp.phone), n(emp.designation),
                n(emp.department), n(emp.join_date), Number(emp.basic_salary) || 0,
                emp.employment_type || 'full_time', n(emp.employee_code)).run()
        added++
      } catch { skipped++ }
    }

    return c.json({ success: true, message: `${added} employees added${skipped ? ', ' + skipped + ' skipped' : ''}`, added, skipped })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// PUT /hrms/employees/:id - update staff record
company.put('/hrms/employees/:id', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)
    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    const staffId = c.req.param('id')
    const body = await c.req.json()
    const { full_name, email, phone, designation, department, join_date, basic_salary, employment_type, employee_code, notes, is_active } = body

    await c.env.DB.prepare(`
      UPDATE hrms_staff SET
        full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        designation = COALESCE(?, designation),
        department = COALESCE(?, department),
        join_date = COALESCE(?, join_date),
        basic_salary = COALESCE(?, basic_salary),
        employment_type = COALESCE(?, employment_type),
        employee_code = COALESCE(?, employee_code),
        notes = COALESCE(?, notes),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ?
    `).bind(n(full_name), n(email), n(phone), n(designation), n(department), n(join_date),
            basic_salary !== undefined ? Number(basic_salary) : null,
            n(employment_type), n(employee_code), n(notes),
            is_active !== undefined ? (is_active ? 1 : 0) : null,
            staffId, comp.id).run()

    return c.json({ success: true, message: 'Employee updated' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// PUT /hrms/employees/:id/toggle - enable/disable employee (discontinue)
company.put('/hrms/employees/:id/toggle', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)
    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    const staffId = c.req.param('id')
    const staff = await c.env.DB.prepare('SELECT id, full_name, is_active FROM hrms_staff WHERE id = ? AND company_id = ?').bind(staffId, comp.id).first() as any
    if (!staff) return c.json({ success: false, message: 'Employee not found' }, 404)

    const newStatus = staff.is_active ? 0 : 1
    await c.env.DB.prepare('UPDATE hrms_staff SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?')
      .bind(newStatus, staffId, comp.id).run()

    const action = newStatus ? 'reactivated' : 'discontinued'
    return c.json({ success: true, message: `${staff.full_name} ${action} successfully`, is_active: newStatus })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// DELETE /hrms/employees/:id - soft delete (deactivate)
company.delete('/hrms/employees/:id', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)
    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)
    const staffId = c.req.param('id')
    await c.env.DB.prepare('UPDATE hrms_staff SET is_active=0, updated_at=CURRENT_TIMESTAMP WHERE id=? AND company_id=?').bind(staffId, comp.id).run()
    return c.json({ success: true, message: 'Employee removed from HRMS' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// POST /hrms/attendance - mark single attendance
company.post('/hrms/attendance', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)
    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    const body = await c.req.json()
    const { staff_id, date, status, check_in, check_out, notes } = body

    if (!staff_id || !date || !status)
      return c.json({ success: false, message: 'Staff, date and status are required' }, 400)

    const existing = await c.env.DB.prepare(
      'SELECT id FROM hrms_attendance WHERE company_id=? AND staff_id=? AND date=?'
    ).bind(comp.id, staff_id, date).first() as any

    if (existing) {
      await c.env.DB.prepare(`UPDATE hrms_attendance SET status=?,check_in=?,check_out=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .bind(status, n(check_in), n(check_out), n(notes), existing.id).run()
    } else {
      await c.env.DB.prepare(`INSERT INTO hrms_attendance (company_id,staff_id,date,status,check_in,check_out,notes) VALUES (?,?,?,?,?,?,?)`)
        .bind(comp.id, staff_id, date, status, n(check_in), n(check_out), n(notes)).run()
    }

    return c.json({ success: true, message: 'Attendance marked' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// GET /hrms/attendance - get attendance for a month
company.get('/hrms/attendance', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)
    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    const { month, year, staff_id } = c.req.query()
    const m = month || new Date().getMonth() + 1
    const y = year || new Date().getFullYear()

    let query = `
      SELECT a.*, s.full_name, s.designation, s.department, s.employee_code
      FROM hrms_attendance a
      JOIN hrms_staff s ON a.staff_id = s.id
      WHERE a.company_id=? AND strftime('%m',a.date)=? AND strftime('%Y',a.date)=?
    `
    const params: any[] = [comp.id, String(m).padStart(2,'0'), String(y)]
    if (staff_id) { query += ' AND a.staff_id=?'; params.push(staff_id) }
    query += ' ORDER BY a.date DESC, s.full_name'

    const records = await c.env.DB.prepare(query).bind(...params).all()
    return c.json({ success: true, attendance: records.results })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// POST /hrms/attendance/bulk - mark all staff for a day
company.post('/hrms/attendance/bulk', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)
    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    const { date, records } = await c.req.json()
    if (!date || !records?.length) return c.json({ success: false, message: 'Date and records required' }, 400)

    for (const rec of records) {
      const existing = await c.env.DB.prepare(
        'SELECT id FROM hrms_attendance WHERE company_id=? AND staff_id=? AND date=?'
      ).bind(comp.id, rec.staff_id, date).first() as any
      if (existing) {
        await c.env.DB.prepare('UPDATE hrms_attendance SET status=?,check_in=?,check_out=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
          .bind(rec.status, rec.check_in || null, rec.check_out || null, existing.id).run()
      } else {
        await c.env.DB.prepare('INSERT INTO hrms_attendance (company_id,staff_id,date,status,check_in,check_out) VALUES (?,?,?,?,?,?)')
          .bind(comp.id, rec.staff_id, date, rec.status, rec.check_in || null, rec.check_out || null).run()
      }
    }
    return c.json({ success: true, message: `Attendance marked for ${records.length} employees` })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// =============================================
// HRMS - SALARY SLIP GENERATION
// =============================================

// Get salary slips
company.get('/hrms/salary', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)
    const comp = await c.env.DB.prepare('SELECT id, company_name FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    const { month, year } = c.req.query()
    const m = month || new Date().getMonth() + 1
    const y = year || new Date().getFullYear()

    const slips = await c.env.DB.prepare(`
      SELECT ss.*, s.full_name, s.designation, s.department, s.email, s.phone, s.employee_code
      FROM hrms_salary ss
      JOIN hrms_staff s ON ss.staff_id = s.id
      WHERE ss.company_id=? AND ss.month=? AND ss.year=?
      ORDER BY s.full_name
    `).bind(comp.id, Number(m), Number(y)).all()

    return c.json({ success: true, slips: slips.results, company: comp })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// DELETE /hrms/salary/:id - delete salary slip
company.delete('/hrms/salary/:id', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)
    const comp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)
    const slipId = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM hrms_salary WHERE id=? AND company_id=?').bind(slipId, comp.id).run()
    return c.json({ success: true, message: 'Salary slip deleted' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Generate / update salary slip
company.post('/hrms/salary', async (c) => {
  try {
    const user = getAuthUser(c)
    if (!user || user.role !== 'employer') return c.json({ success: false, message: 'Employer access required' }, 403)
    const comp = await c.env.DB.prepare('SELECT id, company_name FROM companies WHERE user_id = ?').bind(user.userId).first() as any
    if (!comp) return c.json({ success: false, message: 'Company not found' }, 404)

    const body = await c.req.json()
    const { staff_id, month, year, basic_salary, hra, ta, other_allowances, pf_deduction, tax_deduction, other_deductions, working_days, present_days, notes } = body

    if (!staff_id || !month || !year || !basic_salary)
      return c.json({ success: false, message: 'Employee, month, year and basic salary are required' }, 400)

    // Verify staff belongs to this company
    const staffCheck = await c.env.DB.prepare('SELECT id FROM hrms_staff WHERE id=? AND company_id=? AND is_active=1').bind(staff_id, comp.id).first()
    if (!staffCheck) return c.json({ success: false, message: 'Employee not found in HRMS' }, 404)

    const basicSal = Number(basic_salary) || 0
    const hraAmt = Number(hra) || Math.round(basicSal * 0.4)
    const taAmt = Number(ta) || Math.round(basicSal * 0.1)
    const otherAllow = Number(other_allowances) || 0
    const grossSalary = basicSal + hraAmt + taAmt + otherAllow

    const pfDed = Number(pf_deduction) || Math.round(basicSal * 0.12)
    const taxDed = Number(tax_deduction) || 0
    const otherDed = Number(other_deductions) || 0
    const totalDeductions = pfDed + taxDed + otherDed

    const wDays = Number(working_days) || 26
    const pDays = Number(present_days) || wDays
    const perDaySalary = grossSalary / wDays
    const lossOfPay = pDays < wDays ? Math.round((wDays - pDays) * perDaySalary) : 0
    const netSalary = Math.round(grossSalary - totalDeductions - lossOfPay)

    // Check if slip already exists in hrms_salary
    const existing = await c.env.DB.prepare(
      'SELECT id FROM hrms_salary WHERE company_id=? AND staff_id=? AND month=? AND year=?'
    ).bind(comp.id, Number(staff_id), Number(month), Number(year)).first() as any

    if (existing) {
      await c.env.DB.prepare(`
        UPDATE hrms_salary SET basic_salary=?,hra=?,ta=?,other_allowances=?,gross_salary=?,
        pf_deduction=?,tax_deduction=?,other_deductions=?,total_deductions=?,
        loss_of_pay=?,net_salary=?,working_days=?,present_days=?,notes=?,updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).bind(basicSal, hraAmt, taAmt, otherAllow, grossSalary, pfDed, taxDed, otherDed, totalDeductions, lossOfPay, netSalary, wDays, pDays, n(notes), existing.id).run()
    } else {
      await c.env.DB.prepare(`
        INSERT INTO hrms_salary (company_id,staff_id,month,year,basic_salary,hra,ta,other_allowances,gross_salary,pf_deduction,tax_deduction,other_deductions,total_deductions,loss_of_pay,net_salary,working_days,present_days,notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).bind(comp.id, Number(staff_id), Number(month), Number(year), basicSal, hraAmt, taAmt, otherAllow, grossSalary, pfDed, taxDed, otherDed, totalDeductions, lossOfPay, netSalary, wDays, pDays, n(notes)).run()
    }

    return c.json({ success: true, message: 'Salary slip generated', data: { grossSalary, totalDeductions, netSalary } })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

export default company
