-- My Placement Database Export
-- Generated: 2026-04-28
-- Tables: _cf_METADATA, attendance, companies, d1_migrations, employee_profiles, employee_reviews, hrms_attendance, hrms_employees, hrms_salary, hrms_staff, job_applications, jobs, password_reset_tokens, review_removal_requests, salary_slips, saved_jobs, sqlite_sequence, users

BEGIN TRANSACTION;
CREATE TABLE _cf_METADATA (
        key INTEGER PRIMARY KEY,
        value BLOB
      );
INSERT INTO "_cf_METADATA" VALUES(2,4342);
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  employee_profile_id INTEGER NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present', 
  check_in TEXT,
  check_out TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, employee_profile_id, date),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (employee_profile_id) REFERENCES employee_profiles(id)
);
INSERT INTO "attendance" VALUES(1,5,3,'2026-04-15','leave','09:00','18:00','','2026-04-15 11:03:12','2026-04-15 11:05:19');
CREATE TABLE companies (
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
INSERT INTO "companies" VALUES(1,2,'Tech Corp Pvt Ltd','IT','Leading IT solutions company providing cutting-edge software development and consulting services across India.','https://techcorp.com',NULL,'Pune, Maharashtra','Pune','Maharashtra','India',NULL,'201-500',NULL,NULL,'hr@techcorp.com',1,'2026-03-15 08:34:03','2026-04-26 08:52:47');
INSERT INTO "companies" VALUES(2,3,'Infosys Limited','Information Technology','Global leader in next-generation digital services and consulting. We enable clients in more than 50 countries to navigate their digital transformation.',NULL,NULL,'Bangalore, Karnataka','Bangalore','Karnataka','India',NULL,'1000+',NULL,NULL,'hr@infosys.com',1,'2026-03-15 08:34:03','2026-03-15 08:34:03');
INSERT INTO "companies" VALUES(3,6,'Mango''s Enterprises',NULL,NULL,NULL,NULL,NULL,'','','India',NULL,NULL,NULL,NULL,NULL,1,'2026-04-10 08:01:53','2026-04-10 08:01:53');
INSERT INTO "companies" VALUES(5,9,'Arc cad Soft Technologies',NULL,NULL,NULL,NULL,NULL,'','','India',NULL,NULL,NULL,NULL,NULL,1,'2026-04-15 10:52:35','2026-04-15 10:52:35');
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" VALUES(1,'0001_initial.sql','2026-03-15 08:33:10');
INSERT INTO "d1_migrations" VALUES(2,'0002_hrms.sql','2026-04-12 11:10:41');
INSERT INTO "d1_migrations" VALUES(3,'0003_hrms_standalone.sql','2026-04-16 11:22:56');
INSERT INTO "d1_migrations" VALUES(4,'0004_features.sql','2026-04-17 16:18:23');
CREATE TABLE employee_profiles (
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
INSERT INTO "employee_profiles" VALUES(1,4,'Rahul Sharma','9876543210','','male',NULL,NULL,NULL,'Mumbai','Maharashtra','India',NULL,'Software Engineer','TechCorp',3.0,800000,700000,30,1,'["React", "JavaScript", "TypeScript", "HTML5", "CSS3", "Node.js", "Git", "Redux"]','[{"degree":"B.E. Computer Science","institution":"Pune University","year":"2020","grade":"8.2 CGPA"}]','[]','[]','["English"]','I am a React Developer based in Pune with 3+ years of professional experience in the technology domain. Proficient in React, JavaScript, TypeScript, HTML5, CSS3, I bring strong problem-solving skills and a passion for delivering high-quality solutions. I hold a B.E. Computer Science from Pune University. Currently actively seeking new opportunities.','','','','2026-03-15 08:34:03','2026-04-26 08:52:47');
INSERT INTO "employee_profiles" VALUES(2,5,'Priya Patel','9876543211',NULL,NULL,NULL,NULL,NULL,'Bangalore','Karnataka','India',NULL,'Java Developer','InfoTech Ltd',4.0,1200000,950000,60,1,'["Java", "Spring Boot", "Angular", "SQL", "Docker", "AWS", "Git", "Microservices"]','[{"degree":"B.Tech Information Technology","institution":"VTU Bangalore","year":"2019","grade":"8.7 CGPA"}]','[]','[]','["English"]','Experienced Java full-stack developer with expertise in Spring Boot microservices and Angular frontend development. Passionate about cloud technologies and clean code.',NULL,NULL,NULL,'2026-03-15 08:34:03','2026-03-15 08:34:03');
INSERT INTO "employee_profiles" VALUES(3,7,'Pradip Shedge',NULL,NULL,NULL,NULL,NULL,NULL,'','','India',NULL,NULL,NULL,0.0,NULL,NULL,0,1,'[]','[]','[]','[]','["English"]',NULL,NULL,NULL,NULL,'2026-04-10 08:04:17','2026-04-10 08:04:17');
CREATE TABLE employee_reviews (
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
INSERT INTO "employee_reviews" VALUES(1,1,2,NULL,4,5,4,4,4,'Priya worked with us as an intern and showed excellent technical skills. Very punctual and hardworking. Would recommend for full-time positions.',0,NULL,'2018-01-01','2018-06-30','Java Intern',1,'2026-03-15 08:34:03');
CREATE TABLE hrms_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,   
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  check_in TEXT,
  check_out TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, staff_id, date),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (staff_id) REFERENCES hrms_staff(id)
);
CREATE TABLE hrms_employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  employee_profile_id INTEGER NOT NULL,
  designation TEXT,
  department TEXT,
  join_date DATE,
  basic_salary REAL DEFAULT 0,
  employment_type TEXT DEFAULT 'full_time',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, employee_profile_id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (employee_profile_id) REFERENCES employee_profiles(id)
);
INSERT INTO "hrms_employees" VALUES(1,5,3,'ACCOUNTANT','ACCOUNT DEPT','2025-07-17',20000.0,'full_time',1,'2026-04-15 10:57:26','2026-04-15 11:02:46');
CREATE TABLE hrms_salary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  basic_salary REAL DEFAULT 0,
  hra REAL DEFAULT 0,
  ta REAL DEFAULT 0,
  other_allowances REAL DEFAULT 0,
  gross_salary REAL DEFAULT 0,
  pf_deduction REAL DEFAULT 0,
  tax_deduction REAL DEFAULT 0,
  other_deductions REAL DEFAULT 0,
  total_deductions REAL DEFAULT 0,
  loss_of_pay REAL DEFAULT 0,
  net_salary REAL DEFAULT 0,
  working_days INTEGER DEFAULT 26,
  present_days INTEGER DEFAULT 26,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, staff_id, month, year),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (staff_id) REFERENCES hrms_staff(id)
);
INSERT INTO "hrms_salary" VALUES(1,1,1,4,2026,75000.0,30000.0,7500.0,0.0,112500.0,9000.0,0.0,0.0,9000.0,8654.0,94846.0,26,24,NULL,'2026-04-16 11:26:33','2026-04-16 11:26:33');
CREATE TABLE hrms_staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  
  employee_profile_id INTEGER DEFAULT NULL,
  
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  designation TEXT,
  department TEXT,
  join_date DATE,
  basic_salary REAL DEFAULT 0,
  employment_type TEXT DEFAULT 'full_time', 
  employee_code TEXT,  
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);
INSERT INTO "hrms_staff" VALUES(1,1,NULL,'Amit Joshi','amit@gmail.com','9876543210','Senior Developer','Engineering','2024-01-15',75000.0,'full_time','EMP101',1,NULL,'2026-04-16 11:26:20','2026-04-16 11:26:20');
INSERT INTO "hrms_staff" VALUES(2,1,NULL,'Priya Sharma','priya@company.com',NULL,'HR Manager','HR',NULL,55000.0,'full_time',NULL,1,NULL,'2026-04-16 11:26:26','2026-04-16 11:26:26');
INSERT INTO "hrms_staff" VALUES(3,1,NULL,'Suresh Kumar','suresh@company.com',NULL,'Accountant','Finance',NULL,48000.0,'full_time',NULL,1,NULL,'2026-04-16 11:26:26','2026-04-16 11:26:26');
INSERT INTO "hrms_staff" VALUES(4,1,NULL,'Kavita Singh',NULL,NULL,'Designer','Marketing',NULL,42000.0,'full_time',NULL,1,NULL,'2026-04-16 11:26:26','2026-04-16 11:26:26');
INSERT INTO "hrms_staff" VALUES(5,1,NULL,'Test Employee','test.emp@test.com',NULL,'Developer','Tech','2025-01-01',60000.0,'full_time',NULL,1,NULL,'2026-04-20 09:40:56','2026-04-20 09:40:56');
INSERT INTO "hrms_staff" VALUES(6,1,NULL,'Test Worker','test.worker@techcorp.com','9876543210','Tester','QA','2024-01-01',45000.0,'full_time',NULL,1,NULL,'2026-04-26 08:50:00','2026-04-26 08:50:00');
INSERT INTO "hrms_staff" VALUES(7,1,NULL,'Load Tester','lt999@test.com','9900000001','Tester','QA','2024-01-01',40000.0,'full_time',NULL,1,NULL,'2026-04-26 08:52:48','2026-04-26 08:52:48');
CREATE TABLE job_applications (
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
INSERT INTO "job_applications" VALUES(1,1,1,'shortlisted','',87.0,'2026-04-10 07:46:09','2026-04-10 07:47:28','');
CREATE TABLE jobs (
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
INSERT INTO "jobs" VALUES(1,1,'Senior Node.js Backend Developer','Engineering','full_time','hybrid','Pune','Pune','Maharashtra','India','TechCorp is seeking a skilled Node.js Backend Developer to build scalable server side applications. You will design and implement APIs, manage databases, and ensure high performance.','Minimum 2 years in Node.js backend development. Strong knowledge of Express.js framework.','Design and implement scalable REST APIs. Manage database schema.','["Node.js","Express.js","MySQL","PostgreSQL","REST API","Docker","JWT","Git"]',2.0,6.0,600000,1200000,'INR',NULL,3,'2026-06-30',1,7,'2026-03-15 08:34:03','2026-04-20 09:39:26');
INSERT INTO "jobs" VALUES(2,1,'Backend Node.js Developer','Engineering','full_time','onsite','Pune, Maharashtra','Pune','Maharashtra','India','TechCorp is seeking a skilled Node.js Backend Developer to build scalable server-side applications. You will design and implement APIs, manage databases, and ensure high performance and responsiveness of applications.

We value clean code, good architecture, and collaborative problem-solving. Join our team of passionate engineers building products used by thousands of users.','Minimum 2 years in Node.js backend development. Strong knowledge of Express.js framework. Experience with relational databases (MySQL/PostgreSQL). Understanding of RESTful API design. Knowledge of authentication (JWT, OAuth). Experience with Docker and basic DevOps.','Design and implement scalable REST APIs. Manage database schema and optimization. Implement authentication and authorization. Write unit and integration tests. Collaborate with frontend developers.','["Node.js", "Express.js", "MySQL", "PostgreSQL", "REST API", "Docker", "JWT", "Git"]',2.0,5.0,600000,1200000,'INR',NULL,1,NULL,1,2,'2026-03-15 08:34:03','2026-03-15 08:34:03');
INSERT INTO "jobs" VALUES(3,2,'Java Full Stack Developer','Technology','full_time','hybrid','Bangalore, Karnataka','Bangalore','Karnataka','India','Infosys is seeking talented Java Full Stack developers to work on enterprise-level applications for our global clients. You will be part of an agile team delivering end-to-end solutions.

This role offers excellent growth opportunities, access to cutting-edge technologies, and exposure to diverse global projects. You will work with modern microservices architecture on AWS cloud platform.','4+ years Java development experience required. Strong Spring Boot and Spring framework knowledge. Frontend experience with Angular or React. Solid SQL database skills. Experience with microservices architecture. AWS or Azure cloud experience preferred. Must have excellent communication skills for client interaction.','Develop end-to-end features for enterprise applications. Design microservices architecture. Work directly with international clients. Conduct technical interviews. Mentor junior team members.','["Java", "Spring Boot", "Angular", "React", "SQL", "Microservices", "AWS", "Docker", "Git"]',4.0,8.0,1000000,2000000,'INR',NULL,5,NULL,1,0,'2026-03-15 08:34:03','2026-03-15 08:34:03');
INSERT INTO "jobs" VALUES(4,2,'Data Science Engineer','Analytics','full_time','remote','Bangalore, Karnataka','Bangalore','Karnataka','India','Join Infosys Analytics team as a Data Science Engineer. Build ML models, data pipelines, and analytics solutions for Fortune 500 clients. Work with big data technologies and cutting-edge AI frameworks.

This is a fully remote position. You will collaborate with global data teams and contribute to AI-driven product development.','Strong Python programming skills. Experience with ML frameworks (TensorFlow/PyTorch/Scikit-learn). Knowledge of SQL and NoSQL databases. Experience with data visualization tools. Big data experience (Spark/Hadoop) is a plus. Strong statistical and mathematical background.','Build and deploy machine learning models. Create data pipelines. Analyze large datasets. Present insights to stakeholders. Collaborate with engineering teams.','["Python", "TensorFlow", "PyTorch", "SQL", "Pandas", "NumPy", "Scikit-learn", "Spark", "Git"]',2.0,6.0,900000,1800000,'INR',NULL,3,NULL,1,0,'2026-03-15 08:34:03','2026-03-15 08:34:03');
INSERT INTO "jobs" VALUES(5,1,'Updated Job Title','','full_time','remote','Bangalore','Bangalore','Karnataka','India','Updated description for the job posting.','Updated requirements for candidates.','','["Node.js","Python"]',2.0,5.0,500000,900000,'INR','',2,NULL,0,1,'2026-04-20 09:39:26','2026-04-20 09:48:35');
INSERT INTO "jobs" VALUES(6,1,'Test Job','','full_time','remote','Pune','Pune','','India','Test desc','Test req','','["Python"]',1.0,3.0,NULL,NULL,'INR','',10,NULL,0,1,'2026-04-20 09:40:56','2026-04-20 09:48:29');
INSERT INTO "jobs" VALUES(7,1,'Test QA Engineer (Updated)','','full_time','onsite','Pune','Pune','Maharashtra','India','Updated description','Manual and automation testing','Write and execute test cases','[]',0.0,10.0,350000,600000,'INR','',1,NULL,0,0,'2026-04-26 08:49:59','2026-04-26 08:49:59');
INSERT INTO "jobs" VALUES(8,1,'Load Test Job v2','','full_time','onsite','Mumbai','Mumbai','Maharashtra','India','Updated','None','Test','[]',0.0,10.0,350000,550000,'INR','',1,NULL,0,0,'2026-04-26 08:52:47','2026-04-26 08:52:48');
CREATE TABLE password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
INSERT INTO "password_reset_tokens" VALUES(1,4,'fwQG25mEU9Sb9oQrBbkxwBoakhAVwALg','2026-04-17T17:18:55.333Z',1,'2026-04-17 16:18:55');
INSERT INTO "password_reset_tokens" VALUES(2,4,'dRGr0D1NTG5HpxYBUtK6YNYml5hBr6li','2026-04-19T05:58:10.029Z',1,'2026-04-19 04:58:10');
INSERT INTO "password_reset_tokens" VALUES(3,4,'HKx4JUVEFD6MSDHte618dBMilDkmAQ2Y','2026-04-20T10:39:27.140Z',1,'2026-04-20 09:39:27');
INSERT INTO "password_reset_tokens" VALUES(4,4,'ugDbwrXcqKC3QTCoiXwoCGh6OBLJFAvk','2026-04-20T10:40:56.411Z',1,'2026-04-20 09:40:56');
INSERT INTO "password_reset_tokens" VALUES(5,4,'bn5QlgAkl1i4jxEBMiwdT9RnVUdaOFZl','2026-04-26T09:49:48.917Z',1,'2026-04-26 08:49:49');
INSERT INTO "password_reset_tokens" VALUES(6,4,'FKjNBoUQEqWvgTD7sQREcf4y46FD4Z18','2026-04-26T09:52:47.816Z',0,'2026-04-26 08:52:47');
CREATE TABLE review_removal_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id INTEGER NOT NULL,
  employee_profile_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  
  amount_charged REAL DEFAULT 499,          
  payment_ref TEXT,                         
  admin_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES employee_reviews(id),
  FOREIGN KEY (employee_profile_id) REFERENCES employee_profiles(id)
);
CREATE TABLE salary_slips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  employee_profile_id INTEGER NOT NULL,
  month INTEGER NOT NULL,  
  year INTEGER NOT NULL,
  basic_salary REAL DEFAULT 0,
  hra REAL DEFAULT 0,
  ta REAL DEFAULT 0,
  other_allowances REAL DEFAULT 0,
  gross_salary REAL DEFAULT 0,
  pf_deduction REAL DEFAULT 0,
  tax_deduction REAL DEFAULT 0,
  other_deductions REAL DEFAULT 0,
  total_deductions REAL DEFAULT 0,
  loss_of_pay REAL DEFAULT 0,
  net_salary REAL DEFAULT 0,
  working_days INTEGER DEFAULT 26,
  present_days INTEGER DEFAULT 26,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, employee_profile_id, month, year),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (employee_profile_id) REFERENCES employee_profiles(id)
);
CREATE TABLE saved_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (employee_id) REFERENCES employee_profiles(id),
  UNIQUE(job_id, employee_id)
);
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('super_admin', 'employer', 'employee')),
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "users" VALUES(1,'admin@myplacement.com','g10hvh_8','super_admin',1,'2026-03-15 08:34:03','2026-03-15 08:34:03');
INSERT INTO "users" VALUES(2,'hr@techcorp.com','e0pkdn_10','employer',1,'2026-03-15 08:34:03','2026-03-15 08:34:03');
INSERT INTO "users" VALUES(3,'hr@infosys.com','e0pkdn_10','employer',1,'2026-03-15 08:34:03','2026-03-15 08:34:03');
INSERT INTO "users" VALUES(4,'rahul@example.com','f4745g_11','employee',1,'2026-03-15 08:34:03','2026-03-15 08:34:03');
INSERT INTO "users" VALUES(5,'priya@example.com','f4745g_11','employee',1,'2026-03-15 08:34:03','2026-03-15 08:34:03');
INSERT INTO "users" VALUES(6,'account@mangosent.com','svb9wy_10','employer',1,'2026-04-10 08:01:53','2026-04-10 08:01:53');
INSERT INTO "users" VALUES(7,'pradip.shedge2@gmail.com','gz5uz5_9','employee',1,'2026-04-10 08:04:17','2026-04-10 08:04:17');
INSERT INTO "users" VALUES(9,'account@arccadsoft.in','e0pkdn_10','employer',1,'2026-04-15 10:52:35','2026-04-15 10:52:35');
CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_city ON jobs(city);
CREATE INDEX idx_jobs_active ON jobs(is_active);
CREATE INDEX idx_applications_job ON job_applications(job_id);
CREATE INDEX idx_applications_employee ON job_applications(employee_id);
CREATE INDEX idx_reviews_employee ON employee_reviews(employee_id);
CREATE INDEX idx_reviews_company ON employee_reviews(company_id);
CREATE INDEX idx_employee_location ON employee_profiles(city, state);
CREATE INDEX idx_attendance_company_date ON attendance(company_id, date);
CREATE INDEX idx_salary_company_month ON salary_slips(company_id, month, year);
CREATE INDEX idx_hrms_company ON hrms_employees(company_id);
CREATE INDEX idx_hrms_staff_company ON hrms_staff(company_id);
CREATE INDEX idx_hrms_attendance_company ON hrms_attendance(company_id, date);
CREATE INDEX idx_hrms_salary_company ON hrms_salary(company_id, month, year);
CREATE INDEX idx_prt_token ON password_reset_tokens(token);
CREATE INDEX idx_rrr_status ON review_removal_requests(status);
CREATE INDEX idx_rrr_employee ON review_removal_requests(employee_profile_id);
DELETE FROM "sqlite_sequence";
INSERT INTO "sqlite_sequence" VALUES('d1_migrations',4);
INSERT INTO "sqlite_sequence" VALUES('users',9);
INSERT INTO "sqlite_sequence" VALUES('companies',5);
INSERT INTO "sqlite_sequence" VALUES('jobs',8);
INSERT INTO "sqlite_sequence" VALUES('employee_profiles',3);
INSERT INTO "sqlite_sequence" VALUES('employee_reviews',1);
INSERT INTO "sqlite_sequence" VALUES('job_applications',1);
INSERT INTO "sqlite_sequence" VALUES('hrms_employees',1);
INSERT INTO "sqlite_sequence" VALUES('attendance',1);
INSERT INTO "sqlite_sequence" VALUES('hrms_staff',7);
INSERT INTO "sqlite_sequence" VALUES('hrms_salary',1);
INSERT INTO "sqlite_sequence" VALUES('password_reset_tokens',6);
COMMIT;
