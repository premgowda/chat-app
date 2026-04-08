CREATE DATABASE IF NOT EXISTS thrivewell_chatbot;
USE thrivewell_chatbot;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30) DEFAULT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_key VARCHAR(100) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  status ENUM('active', 'resolved', 'escalated') NOT NULL DEFAULT 'active',
  outcome ENUM('answered', 'unanswered', 'pending') NOT NULL DEFAULT 'pending',
  topic VARCHAR(100) DEFAULT NULL,
  escalated_to_hr BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_outcome (outcome),
  INDEX idx_topic (topic),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  sender ENUM('user', 'bot') NOT NULL,
  content TEXT NOT NULL,
  is_negative BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  INDEX idx_session (session_id),
  INDEX idx_negative (is_negative),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SAMPLE DATA
-- ============================================
-- Admin password: admin123 (bcrypt hash)
INSERT INTO users (email, password_hash, display_name, phone, role) VALUES
('admin@thrivewell.com',   '$2b$10$8KzaNdKIMyOkASCymcbwce0XR1X.qGMjFBV.bEz4E4VXMhDPJKFMG', 'Admin User',     NULL,           'admin'),
('hr@thrivewell.com',      '$2b$10$8KzaNdKIMyOkASCymcbwce0XR1X.qGMjFBV.bEz4E4VXMhDPJKFMG', 'HR Manager',     NULL,           'admin'),
('alice@thrivewell.com',   '$2b$10$8KzaNdKIMyOkASCymcbwce0XR1X.qGMjFBV.bEz4E4VXMhDPJKFMG', 'Alice Johnson',  '9876543210',   'user'),
('bob@thrivewell.com',     '$2b$10$8KzaNdKIMyOkASCymcbwce0XR1X.qGMjFBV.bEz4E4VXMhDPJKFMG', 'Bob Smith',      '9876543211',   'user'),
('carol@thrivewell.com',   '$2b$10$8KzaNdKIMyOkASCymcbwce0XR1X.qGMjFBV.bEz4E4VXMhDPJKFMG', 'Carol Williams', NULL,           'user'),
('dave@thrivewell.com',    '$2b$10$8KzaNdKIMyOkASCymcbwce0XR1X.qGMjFBV.bEz4E4VXMhDPJKFMG', 'Dave Brown',     '9876543213',   'user'),
('eve@thrivewell.com',     '$2b$10$8KzaNdKIMyOkASCymcbwce0XR1X.qGMjFBV.bEz4E4VXMhDPJKFMG', 'Eve Davis',      NULL,           'user');

INSERT INTO sessions (session_key, user_id, status, outcome, topic, escalated_to_hr, created_at) VALUES
('sess_001', 3, 'resolved',  'answered',   'Leave Policy',        FALSE, '2026-03-15 09:10:00'),
('sess_002', 3, 'resolved',  'answered',   'Health Insurance',    FALSE, '2026-03-16 14:22:00'),
('sess_003', 4, 'escalated', 'unanswered', 'Harassment Complaint', TRUE,  '2026-03-17 10:05:00'),
('sess_004', 4, 'resolved',  'answered',   'Work From Home',      FALSE, '2026-03-18 11:30:00'),
('sess_005', 5, 'escalated', 'unanswered', 'Payroll',             TRUE,  '2026-03-20 08:45:00'),
('sess_006', 5, 'resolved',  'answered',   'Onboarding',          FALSE, '2026-03-21 16:00:00'),
('sess_007', 5, 'resolved',  'answered',   'Expense Policy',      FALSE, '2026-03-22 09:15:00'),
('sess_008', 6, 'escalated', 'unanswered', 'Sabbatical',          TRUE,  '2026-03-25 13:10:00'),
('sess_009', 6, 'resolved',  'answered',   'IT Support',          FALSE, '2026-03-26 10:00:00'),
('sess_010', 7, 'resolved',  'answered',   'Dress Code',          FALSE, '2026-03-28 15:30:00'),
('sess_011', 7, 'escalated', 'unanswered', 'Promotions',          TRUE,  '2026-03-30 11:20:00'),
('sess_012', 3, 'active',    'pending',    'Referral Program',    FALSE, '2026-04-01 09:00:00'),
('sess_013', 4, 'resolved',  'answered',   'Leave Policy',        FALSE, '2026-04-02 14:15:00'),
('sess_014', 6, 'resolved',  'answered',   'Resignation Policy',  FALSE, '2026-04-03 10:45:00'),
('sess_015', 7, 'escalated', 'unanswered', 'Grievance',           TRUE,  '2026-04-04 16:30:00');

INSERT INTO messages (session_id, sender, content, is_negative, created_at) VALUES
(1, 'user', 'What is our annual leave policy?', FALSE, '2026-03-15 09:10:00'),
(1, 'bot',  'At ThriveWell, full-time employees receive 20 days of paid annual leave per year. Leave accrues monthly and can be carried forward up to 5 days into the next year.', FALSE, '2026-03-15 09:10:05'),
(1, 'user', 'Can I carry forward more than 5 days?', FALSE, '2026-03-15 09:11:00'),
(1, 'bot',  'No, the maximum carry-forward is 5 days. Any unused leave beyond that expires at year end. You can speak with your manager for exceptional circumstances.', FALSE, '2026-03-15 09:11:04'),
(2, 'user', 'What health insurance benefits do we have?', FALSE, '2026-03-16 14:22:00'),
(2, 'bot',  'ThriveWell offers comprehensive health insurance covering medical, dental, and vision. The company covers 80% of premiums for employees and 50% for dependents.', FALSE, '2026-03-16 14:22:06'),
(3, 'user', 'I need to file a harassment complaint against my team lead', FALSE, '2026-03-17 10:05:00'),
(3, 'bot',  'I don\'t have specific information about the harassment complaint process. Let me connect you with our HR team who can assist you properly.', TRUE, '2026-03-17 10:05:05'),
(4, 'user', 'What is the work from home policy?', FALSE, '2026-03-18 11:30:00'),
(4, 'bot',  'ThriveWell follows a hybrid model. Employees can work from home up to 3 days per week. You need to coordinate with your team lead on which days.', FALSE, '2026-03-18 11:30:05'),
(5, 'user', 'My last paycheck was incorrect, there is a deduction I don\'t recognize', FALSE, '2026-03-20 08:45:00'),
(5, 'bot',  'I\'m not sure about specific payroll deductions. I don\'t have access to payroll information. I\'d recommend reaching out to HR for this.', TRUE, '2026-03-20 08:45:06'),
(6, 'user', 'What documents do I need for onboarding?', FALSE, '2026-03-21 16:00:00'),
(6, 'bot',  'For onboarding you will need: government-issued photo ID, proof of address, bank details for salary deposit, PAN card, and signed offer letter.', FALSE, '2026-03-21 16:00:05'),
(7, 'user', 'How do I submit expense reports?', FALSE, '2026-03-22 09:15:00'),
(7, 'bot',  'Expense reports are submitted through the ThriveWell Finance Portal. Log in, navigate to Expenses, attach receipts, and submit for manager approval.', FALSE, '2026-03-22 09:15:06'),
(8, 'user', 'I want to take a sabbatical. What are the rules?', FALSE, '2026-03-25 13:10:00'),
(8, 'bot',  'I don\'t have detailed information about sabbatical policies. This is something I\'d recommend discussing with HR directly.', TRUE, '2026-03-25 13:10:05'),
(9, 'user', 'How do I reset my VPN password?', FALSE, '2026-03-26 10:00:00'),
(9, 'bot',  'To reset your VPN password: Go to vpn.thrivewell.com/reset, enter your employee email, and follow the reset link.', FALSE, '2026-03-26 10:00:06'),
(10, 'user', 'What is the dress code policy?', FALSE, '2026-03-28 15:30:00'),
(10, 'bot', 'ThriveWell follows a business casual dress code Monday through Thursday. Fridays are casual. Client-facing meetings require business formal attire.', FALSE, '2026-03-28 15:30:05'),
(11, 'user', 'When is the next promotion cycle and what are the criteria?', FALSE, '2026-03-30 11:20:00'),
(11, 'bot', 'I don\'t have enough information about the current promotion cycle. I\'d suggest reaching out to your manager or HR.', TRUE, '2026-03-30 11:20:06'),
(12, 'user', 'Can you tell me about the referral bonus program?', FALSE, '2026-04-01 09:00:00'),
(12, 'bot', 'ThriveWell offers a referral bonus of 25,000 for successful hires through employee referrals. The bonus is paid after the referred employee completes 90 days.', FALSE, '2026-04-01 09:00:05'),
(13, 'user', 'How many sick leaves do we get per year?', FALSE, '2026-04-02 14:15:00'),
(13, 'bot', 'Employees are entitled to 12 sick leaves per year. These do not carry forward. A medical certificate is required for absences exceeding 3 consecutive days.', FALSE, '2026-04-02 14:15:05'),
(14, 'user', 'What is the notice period for resignation?', FALSE, '2026-04-03 10:45:00'),
(14, 'bot', 'The standard notice period at ThriveWell is 60 days for all full-time employees.', FALSE, '2026-04-03 10:45:06'),
(15, 'user', 'I feel I was unfairly passed over for promotion and want to file a formal grievance', FALSE, '2026-04-04 16:30:00'),
(15, 'bot', 'I don\'t have the ability to process formal grievances. I\'d recommend contacting HR directly for this matter.', TRUE, '2026-04-04 16:30:05');
