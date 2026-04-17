import { Hono } from 'hono'

type Bindings = { DB: D1Database }
const auth = new Hono<{ Bindings: Bindings }>()

// Simple hash function (for demo - in production use bcrypt)
function simpleHash(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36) + '_' + password.length
}

function generateToken(userId: number, role: string, email: string): string {
  const payload = { userId, role, email, exp: Date.now() + 86400000 * 7 }
  return btoa(JSON.stringify(payload))
}

// Simple random token for password reset (no crypto dependency)
function generateResetToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export function verifyToken(token: string): { userId: number; role: string; email: string } | null {
  try {
    const payload = JSON.parse(atob(token))
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

// Register
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password, role, fullName, companyName } = body

    if (!email || !password || !role) {
      return c.json({ success: false, message: 'Email, password and role required' }, 400)
    }
    if (!['employer', 'employee'].includes(role)) {
      return c.json({ success: false, message: 'Invalid role' }, 400)
    }

    // Check existing user
    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
    if (existing) {
      return c.json({ success: false, message: 'Email already registered' }, 409)
    }

    const passwordHash = simpleHash(password)

    // Create user
    const userResult = await c.env.DB.prepare(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)'
    ).bind(email, passwordHash, role).run()

    const userId = userResult.meta.last_row_id as number

    // Create profile based on role
    if (role === 'employee') {
      await c.env.DB.prepare(
        'INSERT INTO employee_profiles (user_id, full_name, city, state) VALUES (?, ?, ?, ?)'
      ).bind(userId, fullName || email.split('@')[0], '', '').run()
    } else if (role === 'employer') {
      await c.env.DB.prepare(
        'INSERT INTO companies (user_id, company_name, city, state) VALUES (?, ?, ?, ?)'
      ).bind(userId, companyName || 'My Company', '', '').run()
    }

    const token = generateToken(userId, role, email)
    
    // Get profile id
    let profileId = null
    if (role === 'employee') {
      const ep = await c.env.DB.prepare('SELECT id FROM employee_profiles WHERE user_id = ?').bind(userId).first() as any
      profileId = ep?.id
    } else if (role === 'employer') {
      const cp = await c.env.DB.prepare('SELECT id FROM companies WHERE user_id = ?').bind(userId).first() as any
      profileId = cp?.id
    }

    return c.json({ success: true, token, user: { id: userId, email, role, profileId } })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Login
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password } = body

    if (!email || !password) {
      return c.json({ success: false, message: 'Email and password required' }, 400)
    }

    const user = await c.env.DB.prepare(
      'SELECT id, email, password_hash, role, is_active FROM users WHERE email = ?'
    ).bind(email).first() as any

    if (!user) {
      return c.json({ success: false, message: 'Invalid credentials' }, 401)
    }
    if (!user.is_active) {
      return c.json({ success: false, message: 'Account is deactivated' }, 403)
    }

    const passwordHash = simpleHash(password)
    if (passwordHash !== user.password_hash) {
      return c.json({ success: false, message: 'Invalid credentials' }, 401)
    }

    const token = generateToken(user.id, user.role, user.email)

    // Get profile id
    let profileId = null
    let profileData: any = null
    if (user.role === 'employee') {
      const ep = await c.env.DB.prepare('SELECT id, full_name, city, state FROM employee_profiles WHERE user_id = ?').bind(user.id).first() as any
      profileId = ep?.id
      profileData = ep
    } else if (user.role === 'employer') {
      const cp = await c.env.DB.prepare('SELECT id, company_name, city, state FROM companies WHERE user_id = ?').bind(user.id).first() as any
      profileId = cp?.id
      profileData = cp
    }

    return c.json({ 
      success: true, 
      token, 
      user: { id: user.id, email: user.email, role: user.role, profileId, profileData } 
    })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// Get current user
auth.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) return c.json({ success: false, message: 'No token' }, 401)

    const token = authHeader.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload) return c.json({ success: false, message: 'Invalid token' }, 401)

    const user = await c.env.DB.prepare(
      'SELECT id, email, role, is_active FROM users WHERE id = ?'
    ).bind(payload.userId).first() as any

    if (!user || !user.is_active) return c.json({ success: false, message: 'User not found' }, 404)

    let profileId = null
    let profileData: any = null
    if (user.role === 'employee') {
      const ep = await c.env.DB.prepare('SELECT id, full_name, city, state, profile_photo FROM employee_profiles WHERE user_id = ?').bind(user.id).first() as any
      profileId = ep?.id
      profileData = ep
    } else if (user.role === 'employer') {
      const cp = await c.env.DB.prepare('SELECT id, company_name, city, state, logo_url FROM companies WHERE user_id = ?').bind(user.id).first() as any
      profileId = cp?.id
      profileData = cp
    }

    return c.json({ success: true, user: { ...user, profileId, profileData } })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── FORGOT PASSWORD (generate reset token) ──
auth.post('/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json()
    if (!email) return c.json({ success: false, message: 'Email is required' }, 400)

    const user = await c.env.DB.prepare('SELECT id, email, role FROM users WHERE email = ? AND is_active = 1').bind(email).first() as any
    // Always return success to avoid email enumeration
    if (!user) return c.json({ success: true, message: 'If this email exists, a reset token has been generated.' })

    // Generate token valid for 1 hour
    const token = generateResetToken()
    const expiresAt = new Date(Date.now() + 3600000).toISOString()

    // Invalidate old tokens for this user
    await c.env.DB.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').bind(user.id).run()

    await c.env.DB.prepare(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).bind(user.id, token, expiresAt).run()

    // In production, send by email. For demo, return token directly.
    return c.json({ success: true, message: 'Password reset token generated', token, email: user.email })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── RESET PASSWORD (use token) ──
auth.post('/reset-password', async (c) => {
  try {
    const { token, new_password } = await c.req.json()
    if (!token || !new_password) return c.json({ success: false, message: 'Token and new password are required' }, 400)
    if (new_password.length < 6) return c.json({ success: false, message: 'Password must be at least 6 characters' }, 400)

    const resetRecord = await c.env.DB.prepare(
      "SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')"
    ).bind(token).first() as any

    if (!resetRecord) return c.json({ success: false, message: 'Invalid or expired reset token' }, 400)

    const newHash = simpleHash(new_password)
    await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, resetRecord.user_id).run()
    await c.env.DB.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').bind(resetRecord.id).run()

    return c.json({ success: true, message: 'Password reset successfully! Please login with your new password.' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

// ── CHANGE PASSWORD (logged-in user) ──
auth.post('/change-password', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) return c.json({ success: false, message: 'Auth required' }, 401)
    const payload = verifyToken(authHeader.replace('Bearer ', ''))
    if (!payload) return c.json({ success: false, message: 'Invalid token' }, 401)

    const { current_password, new_password } = await c.req.json()
    if (!current_password || !new_password) return c.json({ success: false, message: 'Current and new password required' }, 400)
    if (new_password.length < 6) return c.json({ success: false, message: 'New password must be at least 6 characters' }, 400)

    const user = await c.env.DB.prepare('SELECT id, password_hash FROM users WHERE id = ?').bind(payload.userId).first() as any
    if (!user) return c.json({ success: false, message: 'User not found' }, 404)

    if (simpleHash(current_password) !== user.password_hash)
      return c.json({ success: false, message: 'Current password is incorrect' }, 400)

    await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(simpleHash(new_password), user.id).run()
    return c.json({ success: true, message: 'Password changed successfully!' })
  } catch (e: any) {
    return c.json({ success: false, message: e.message }, 500)
  }
})

export default auth
