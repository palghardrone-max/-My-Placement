-- Seed data for My Placement (with correct password hashes)

-- Super Admin user (password: admin123)
INSERT OR IGNORE INTO users (id, email, password_hash, role) VALUES 
  (1, 'admin@myplacement.com', 'g10hvh_8', 'super_admin');

-- Sample Company users (password: company123)
INSERT OR IGNORE INTO users (id, email, password_hash, role) VALUES 
  (2, 'hr@techcorp.com', 'e0pkdn_10', 'employer'),
  (3, 'hr@infosys.com', 'e0pkdn_10', 'employer');

-- Sample Employee users (password: employee123)
INSERT OR IGNORE INTO users (id, email, password_hash, role) VALUES 
  (4, 'rahul@example.com', 'f4745g_11', 'employee'),
  (5, 'priya@example.com', 'f4745g_11', 'employee');

-- Sample Companies
INSERT OR IGNORE INTO companies (id, user_id, company_name, industry, description, location, city, state, company_size, is_verified, contact_email) VALUES 
  (1, 2, 'TechCorp Solutions', 'Information Technology', 'Leading IT solutions company providing cutting-edge software development and consulting services across India.', 'Pune, Maharashtra', 'Pune', 'Maharashtra', '201-500', 1, 'hr@techcorp.com'),
  (2, 3, 'Infosys Limited', 'Information Technology', 'Global leader in next-generation digital services and consulting. We enable clients in more than 50 countries to navigate their digital transformation.', 'Bangalore, Karnataka', 'Bangalore', 'Karnataka', '1000+', 1, 'hr@infosys.com');

-- Sample Jobs
INSERT OR IGNORE INTO jobs (id, company_id, title, department, job_type, work_mode, location, city, state, description, requirements, responsibilities, skills_required, experience_min, experience_max, salary_min, salary_max, no_of_openings, is_active) VALUES 
  (1, 1, 'Senior React Developer', 'Engineering', 'full_time', 'hybrid', 'Pune, Maharashtra', 'Pune', 'Maharashtra', 
   'We are looking for a Senior React Developer to join our dynamic engineering team. You will be responsible for developing and maintaining high-quality web applications using React.js and related technologies. You will work closely with UX designers, backend developers, and product managers to deliver exceptional user experiences.

Key Responsibilities:
- Develop new user-facing features using React.js
- Build reusable components and front-end libraries for future use  
- Translate designs and wireframes into high-quality code
- Optimize components for maximum performance across devices and browsers
- Participate in code reviews and mentor junior developers',
   'Must have 3+ years of React.js experience. Strong knowledge of JavaScript ES6+, TypeScript, HTML5, CSS3. Experience with state management (Redux/MobX). Experience with REST APIs and GraphQL. Knowledge of testing frameworks (Jest, React Testing Library). Familiarity with Agile/Scrum methodology.',
   'Lead frontend development for key product features. Conduct code reviews. Collaborate with cross-functional teams. Optimize application performance. Write technical documentation.',
   '["React", "JavaScript", "TypeScript", "HTML5", "CSS3", "Redux", "REST APIs", "Jest", "Git"]',
   3, 7, 800000, 1500000, 2, 1),

  (2, 1, 'Backend Node.js Developer', 'Engineering', 'full_time', 'onsite', 'Pune, Maharashtra', 'Pune', 'Maharashtra',
   'TechCorp is seeking a skilled Node.js Backend Developer to build scalable server-side applications. You will design and implement APIs, manage databases, and ensure high performance and responsiveness of applications.

We value clean code, good architecture, and collaborative problem-solving. Join our team of passionate engineers building products used by thousands of users.',
   'Minimum 2 years in Node.js backend development. Strong knowledge of Express.js framework. Experience with relational databases (MySQL/PostgreSQL). Understanding of RESTful API design. Knowledge of authentication (JWT, OAuth). Experience with Docker and basic DevOps.',
   'Design and implement scalable REST APIs. Manage database schema and optimization. Implement authentication and authorization. Write unit and integration tests. Collaborate with frontend developers.',
   '["Node.js", "Express.js", "MySQL", "PostgreSQL", "REST API", "Docker", "JWT", "Git"]',
   2, 5, 600000, 1200000, 1, 1),

  (3, 2, 'Java Full Stack Developer', 'Technology', 'full_time', 'hybrid', 'Bangalore, Karnataka', 'Bangalore', 'Karnataka',
   'Infosys is seeking talented Java Full Stack developers to work on enterprise-level applications for our global clients. You will be part of an agile team delivering end-to-end solutions.

This role offers excellent growth opportunities, access to cutting-edge technologies, and exposure to diverse global projects. You will work with modern microservices architecture on AWS cloud platform.',
   '4+ years Java development experience required. Strong Spring Boot and Spring framework knowledge. Frontend experience with Angular or React. Solid SQL database skills. Experience with microservices architecture. AWS or Azure cloud experience preferred. Must have excellent communication skills for client interaction.',
   'Develop end-to-end features for enterprise applications. Design microservices architecture. Work directly with international clients. Conduct technical interviews. Mentor junior team members.',
   '["Java", "Spring Boot", "Angular", "React", "SQL", "Microservices", "AWS", "Docker", "Git"]',
   4, 8, 1000000, 2000000, 5, 1),

  (4, 2, 'Data Science Engineer', 'Analytics', 'full_time', 'remote', 'Bangalore, Karnataka', 'Bangalore', 'Karnataka',
   'Join Infosys Analytics team as a Data Science Engineer. Build ML models, data pipelines, and analytics solutions for Fortune 500 clients. Work with big data technologies and cutting-edge AI frameworks.

This is a fully remote position. You will collaborate with global data teams and contribute to AI-driven product development.',
   'Strong Python programming skills. Experience with ML frameworks (TensorFlow/PyTorch/Scikit-learn). Knowledge of SQL and NoSQL databases. Experience with data visualization tools. Big data experience (Spark/Hadoop) is a plus. Strong statistical and mathematical background.',
   'Build and deploy machine learning models. Create data pipelines. Analyze large datasets. Present insights to stakeholders. Collaborate with engineering teams.',
   '["Python", "TensorFlow", "PyTorch", "SQL", "Pandas", "NumPy", "Scikit-learn", "Spark", "Git"]',
   2, 6, 900000, 1800000, 3, 1);

-- Sample Employee Profiles
INSERT OR IGNORE INTO employee_profiles (id, user_id, full_name, phone, city, state, current_job_title, current_company, total_experience_years, expected_salary, current_salary, notice_period, is_actively_looking, skills, education, bio) VALUES 
  (1, 4, 'Rahul Sharma', '9876543210', 'Pune', 'Maharashtra', 'React Developer', 'StartupXYZ', 3, 900000, 700000, 30, 1, 
   '["React", "JavaScript", "TypeScript", "HTML5", "CSS3", "Node.js", "Git", "Redux"]',
   '[{"degree":"B.E. Computer Science","institution":"Pune University","year":"2020","grade":"8.2 CGPA"}]',
   'Passionate frontend developer with 3 years of experience building responsive web applications. Strong React.js skills with experience in state management and REST API integration.'),
  (2, 5, 'Priya Patel', '9876543211', 'Bangalore', 'Karnataka', 'Java Developer', 'InfoTech Ltd', 4, 1200000, 950000, 60, 1,
   '["Java", "Spring Boot", "Angular", "SQL", "Docker", "AWS", "Git", "Microservices"]',
   '[{"degree":"B.Tech Information Technology","institution":"VTU Bangalore","year":"2019","grade":"8.7 CGPA"}]',
   'Experienced Java full-stack developer with expertise in Spring Boot microservices and Angular frontend development. Passionate about cloud technologies and clean code.');

-- Sample Reviews
INSERT OR IGNORE INTO employee_reviews (company_id, employee_id, rating, punctuality, work_quality, communication, teamwork, review_text, worked_from, worked_to, job_title, is_public) VALUES
  (1, 2, 4, 5, 4, 4, 4, 'Priya worked with us as an intern and showed excellent technical skills. Very punctual and hardworking. Would recommend for full-time positions.', '2018-01-01', '2018-06-30', 'Java Intern', 1);
