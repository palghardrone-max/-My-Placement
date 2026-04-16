-- Standalone HRMS Employees table (no portal registration required)
-- HR can add any employee directly - with or without portal account
CREATE TABLE IF NOT EXISTS hrms_staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  -- Optional link to portal account
  employee_profile_id INTEGER DEFAULT NULL,
  -- Direct employee info (used when no portal account)
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  designation TEXT,
  department TEXT,
  join_date DATE,
  basic_salary REAL DEFAULT 0,
  employment_type TEXT DEFAULT 'full_time', -- full_time, part_time, contract, intern
  employee_code TEXT,  -- company's own employee ID/code
  is_active INTEGER DEFAULT 1,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Attendance v2 - uses hrms_staff.id instead of employee_profile_id
CREATE TABLE IF NOT EXISTS hrms_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  staff_id INTEGER NOT NULL,   -- hrms_staff.id
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

-- Salary Slips v2 - uses hrms_staff.id
CREATE TABLE IF NOT EXISTS hrms_salary (
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

CREATE INDEX IF NOT EXISTS idx_hrms_staff_company ON hrms_staff(company_id);
CREATE INDEX IF NOT EXISTS idx_hrms_attendance_company ON hrms_attendance(company_id, date);
CREATE INDEX IF NOT EXISTS idx_hrms_salary_company ON hrms_salary(company_id, month, year);
