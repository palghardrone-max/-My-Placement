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

export default auth
