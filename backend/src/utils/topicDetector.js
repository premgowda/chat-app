const TOPIC_RULES = [
  { topic: 'Leave Policy',         keywords: ['leave', 'annual leave', 'sick leave', 'vacation', 'time off', 'pto', 'holiday', 'days off', 'casual leave', 'maternity', 'paternity'] },
  { topic: 'Health Insurance',     keywords: ['health insurance', 'medical', 'dental', 'vision', 'insurance', 'premium', 'coverage', 'claim', 'hospitalization'] },
  { topic: 'Payroll',             keywords: ['payroll', 'salary', 'paycheck', 'payslip', 'deduction', 'tax', 'ctc', 'compensation', 'bonus', 'increment'] },
  { topic: 'Work From Home',      keywords: ['work from home', 'wfh', 'remote', 'hybrid', 'work remotely', 'home office'] },
  { topic: 'Onboarding',          keywords: ['onboarding', 'joining', 'new employee', 'first day', 'induction', 'orientation', 'documents for joining'] },
  { topic: 'Expense Policy',      keywords: ['expense', 'reimbursement', 'travel claim', 'expense report', 'receipt', 'meal allowance', 'travel allowance'] },
  { topic: 'IT Support',          keywords: ['vpn', 'password', 'laptop', 'software', 'access', 'login', 'email setup', 'wifi', 'it support', 'tech support', 'system'] },
  { topic: 'Resignation Policy',  keywords: ['resign', 'resignation', 'notice period', 'exit', 'leaving', 'quit', 'last working day', 'relieving', 'full and final'] },
  { topic: 'Promotions',          keywords: ['promotion', 'appraisal', 'performance review', 'rating', 'career growth', 'designation change', 'level change'] },
  { topic: 'Referral Program',    keywords: ['referral', 'refer', 'referral bonus', 'recommend someone', 'hiring bonus'] },
  { topic: 'Harassment Complaint', keywords: ['harassment', 'complaint', 'posh', 'misconduct', 'inappropriate', 'bully', 'bullying', 'hostile'] },
  { topic: 'Grievance',           keywords: ['grievance', 'unfair', 'discrimination', 'bias', 'injustice', 'formal complaint'] },
  { topic: 'Sabbatical',          keywords: ['sabbatical', 'long leave', 'career break', 'extended leave'] },
  { topic: 'Dress Code',          keywords: ['dress code', 'attire', 'uniform', 'clothing', 'what to wear'] },
  { topic: 'Training',            keywords: ['training', 'learning', 'course', 'certification', 'upskilling', 'workshop', 'conference'] },
  { topic: 'Company Policy',      keywords: ['policy', 'handbook', 'guideline', 'rule', 'code of conduct', 'compliance'] },
  { topic: 'Benefits',            keywords: ['benefits', 'perks', 'gym', 'food', 'transport', 'allowance', 'gratuity', 'provident fund', 'pf', 'esop'] },
  { topic: 'Attendance',          keywords: ['attendance', 'punch in', 'check in', 'late', 'absent', 'shift', 'working hours', 'overtime'] },
];

export function detectTopic(text) {
  if (!text) return 'General';
  const lower = text.toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const rule of TOPIC_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        // Longer keyword matches get higher score (more specific)
        score += kw.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = rule.topic;
    }
  }

  return bestMatch || 'General';
}
