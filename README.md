# My Placement - Smart Job Matching Platform

## Project Overview
- **Name**: My Placement
- **Goal**: Full-stack job portal with employee, employer, and admin panels
- **Tech Stack**: Hono + TypeScript + Cloudflare Pages + D1 SQLite

## Live Demo
- **App**: http://localhost:3000 (sandbox)
- **GitHub**: https://github.com/palghardrone-max/-My-Placement

## Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@myplacement.com | admin123 |
| Employer | hr@techcorp.com | company123 |
| Employee | rahul@example.com | employee123 |
| Employee | priya@example.com | employee123 |

## Features Completed
- ✅ Employee registration, login, profile management
- ✅ Employer registration, login, company profile
- ✅ Job posting, editing, activate/deactivate
- ✅ Smart job matching with score (skills 60%, experience 25%, location 15%)
- ✅ Job applications with status tracking
- ✅ Employee reviews system with flagging
- ✅ HRMS - standalone employee management
- ✅ HRMS - bulk CSV import
- ✅ HRMS - attendance tracking
- ✅ HRMS - salary slip generation
- ✅ Admin panel - full control
- ✅ Admin - employee delete & toggle active/inactive
- ✅ Admin - company verify/delete
- ✅ Admin - review removal requests
- ✅ Forgot password / Reset password / Change password
- ✅ AI profile summary generator
- ✅ Resume PDF download
- ✅ Mobile responsive (hamburger menu, responsive tables)
- ✅ CSV export for admin employee data

## API Endpoints Summary

### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/auth/change-password

### Employee
- GET/PUT /api/profile
- GET /api/profile/applications/list
- GET /api/jobs (with filters)
- POST /api/jobs/:id/apply
- POST /api/jobs/:id/save

### Employer
- GET/PUT /api/company/profile
- GET/POST /api/company/jobs
- GET /api/company/jobs/:id/applications
- GET/POST/PUT /api/company/hrms/employees
- GET/POST /api/company/hrms/attendance
- GET/POST /api/company/hrms/salary

### Admin
- GET /api/admin/stats
- GET /api/admin/users
- GET /api/admin/employees/search
- PUT /api/admin/employees/:id/toggle
- DELETE /api/admin/employees/:id
- GET /api/admin/companies
- PUT /api/admin/companies/:id/verify
- DELETE /api/admin/companies/:id
- GET /api/admin/jobs
- PUT /api/admin/jobs/:id/toggle
- GET /api/admin/reviews
- DELETE /api/admin/reviews/:id
- GET /api/admin/review-removal-requests
- PUT /api/admin/review-removal-requests/:id

## Database
- **Type**: Cloudflare D1 (SQLite)
- **Tables**: users, companies, employee_profiles, jobs, job_applications, employee_reviews, hrms_staff, hrms_employees, hrms_attendance, hrms_salary, salary_slips, saved_jobs, review_removal_requests, password_reset_tokens, d1_migrations
- **Export**: `database_export.sql` (full SQL dump for restore)

## Setup Instructions
```bash
# Install dependencies
npm install

# Apply database migrations
npx wrangler d1 migrations apply webapp-production --local

# Seed demo data
npx wrangler d1 execute webapp-production --local --file=./seed.sql

# Build
npm run build

# Start (development)
pm2 start ecosystem.config.cjs
```

## Restore Database
```bash
# From SQL export
sqlite3 new.sqlite < database_export.sql

# To Cloudflare D1 (production)
npx wrangler d1 execute webapp-production --file=database_export.sql
```

## Load Test Results
- 61/62 API tests passed (98.4%)
- 50 concurrent users handled
- Average response time: ~12ms
- See `LOAD_TEST_RESULTS.md` for full details

## Deployment
- **Platform**: Cloudflare Pages
- **Build command**: `npm run build`
- **Output dir**: `dist/`
- **Last Updated**: 2026-05-03
