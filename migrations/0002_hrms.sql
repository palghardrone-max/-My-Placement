-- HRMS Employees table
CREATE TABLE IF NOT EXISTS hrms_employees (
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

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  employee_profile_id INTEGER NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present', -- present, absent, half_day, leave, holiday, wfh
  check_in TEXT,
  check_out TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, employee_profile_id, date),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (employee_profile_id) REFERENCES employee_profiles(id)
);

-- Salary Slips table
CREATE TABLE IF NOT EXISTS salary_slips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  employee_profile_id INTEGER NOT NULL,
  month INTEGER NOT NULL,  -- 1-12
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

CREATE INDEX IF NOT EXISTS idx_attendance_company_date ON attendance(company_id, date);
CREATE INDEX IF NOT EXISTS idx_salary_company_month ON salary_slips(company_id, month, year);
CREATE INDEX IF NOT EXISTS idx_hrms_company ON hrms_employees(company_id);
