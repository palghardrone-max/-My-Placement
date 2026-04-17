-- Password reset tokens (for forgot-password flow)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens(token);

-- Review removal requests (employee pays to remove bad review)
CREATE TABLE IF NOT EXISTS review_removal_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id INTEGER NOT NULL,
  employee_profile_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
  amount_charged REAL DEFAULT 499,          -- default ₹499
  payment_ref TEXT,                         -- payment reference / UTR
  admin_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES employee_reviews(id),
  FOREIGN KEY (employee_profile_id) REFERENCES employee_profiles(id)
);
CREATE INDEX IF NOT EXISTS idx_rrr_status ON review_removal_requests(status);
CREATE INDEX IF NOT EXISTS idx_rrr_employee ON review_removal_requests(employee_profile_id);
