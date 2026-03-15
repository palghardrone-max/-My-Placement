-- My Placement Database Schema

-- Users table (all roles)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('super_admin', 'employer', 'employee')),
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  location TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  pincode TEXT,
  company_size TEXT CHECK(company_size IN ('1-10', '11-50', '51-200', '201-500', '500-1000', '1000+')),
  founded_year INTEGER,
  contact_phone TEXT,
  contact_email TEXT,
  is_verified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Employee profiles table
CREATE TABLE IF NOT EXISTS employee_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  date_of_birth TEXT,
  gender TEXT CHECK(gender IN ('male', 'female', 'other')),
  profile_photo TEXT,
  resume_url TEXT,
  current_location TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  pincode TEXT,
  current_job_title TEXT,
  current_company TEXT,
  total_experience_years REAL DEFAULT 0,
  expected_salary INTEGER,
  current_salary INTEGER,
  notice_period INTEGER DEFAULT 0,
  is_actively_looking INTEGER DEFAULT 1,
  skills TEXT DEFAULT '[]',
  education TEXT DEFAULT '[]',
  work_experience TEXT DEFAULT '[]',
  certifications TEXT DEFAULT '[]',
  languages TEXT DEFAULT '["English"]',
  bio TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  department TEXT,
  job_type TEXT CHECK(job_type IN ('full_time', 'part_time', 'contract', 'internship', 'freelance')),
  work_mode TEXT CHECK(work_mode IN ('onsite', 'remote', 'hybrid')),
  location TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  responsibilities TEXT,
  skills_required TEXT DEFAULT '[]',
  experience_min REAL DEFAULT 0,
  experience_max REAL DEFAULT 10,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'INR',
  education_required TEXT,
  no_of_openings INTEGER DEFAULT 1,
  application_deadline TEXT,
  is_active INTEGER DEFAULT 1,
  views_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Job Applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  status TEXT DEFAULT 'applied' CHECK(status IN ('applied', 'shortlisted', 'interview_scheduled', 'interviewed', 'offered', 'hired', 'rejected', 'withdrawn')),
  cover_letter TEXT,
  match_score REAL DEFAULT 0,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (employee_id) REFERENCES employee_profiles(id),
  UNIQUE(job_id, employee_id)
);

-- Employee Reviews table (companies reviewing employees)
CREATE TABLE IF NOT EXISTS employee_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  reviewer_name TEXT,
  rating INTEGER CHECK(rating BETWEEN 1 AND 5),
  punctuality INTEGER CHECK(punctuality BETWEEN 1 AND 5),
  work_quality INTEGER CHECK(work_quality BETWEEN 1 AND 5),
  communication INTEGER CHECK(communication BETWEEN 1 AND 5),
  teamwork INTEGER CHECK(teamwork BETWEEN 1 AND 5),
  review_text TEXT,
  is_flagged INTEGER DEFAULT 0,
  flag_reason TEXT,
  worked_from TEXT,
  worked_to TEXT,
  job_title TEXT,
  is_public INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (employee_id) REFERENCES employee_profiles(id)
);

-- Saved Jobs table
CREATE TABLE IF NOT EXISTS saved_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (employee_id) REFERENCES employee_profiles(id),
  UNIQUE(job_id, employee_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);
CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_applications_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_employee ON job_applications(employee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_employee ON employee_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_company ON employee_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_location ON employee_profiles(city, state);
