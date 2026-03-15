import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import authRoutes from './routes/auth'
import jobRoutes from './routes/jobs'
import profileRoutes from './routes/profile'
import companyRoutes from './routes/company'
import reviewRoutes from './routes/reviews'
import adminRoutes from './routes/admin'

type Bindings = {
  DB: D1Database
  JWT_SECRET?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS
app.use('/api/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

// Static files
app.use('/static/*', serveStatic({ root: './' }))

// API Routes
app.route('/api/auth', authRoutes)
app.route('/api/jobs', jobRoutes)
app.route('/api/profile', profileRoutes)
app.route('/api/company', companyRoutes)
app.route('/api/reviews', reviewRoutes)
app.route('/api/admin', adminRoutes)

// Serve main HTML for all non-API routes (SPA)
app.get('*', async (c) => {
  return c.html(getMainHTML())
})

function getMainHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Placement - Smart Job Matching Platform</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #f0f4f8; }
    .sidebar { transition: transform 0.3s ease; }
    .page { display: none; }
    .page.active { display: block; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .match-badge { animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
    .skill-tag { display:inline-block; padding:2px 8px; border-radius:12px; font-size:12px; margin:2px; }
    .modal { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:1000; }
    .modal.active { display:flex; align-items:center; justify-content:center; }
    .loader { display:none; }
    .loader.active { display:flex; }
    input,select,textarea { outline:none; }
    .nav-link.active { background: rgba(255,255,255,0.2); border-radius: 8px; }
    .star-rating { color: #fbbf24; }
    .match-high { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .match-med { background: #fef9c3; color: #854d0e; border: 1px solid #fde047; }
    .match-low { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #f1f5f9; }
    ::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="/static/app.js"></script>
</body>
</html>`
}

export default app
