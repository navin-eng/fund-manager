const { db } = require('./db');

db.exec(`
  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    entity_type TEXT,
    entity_id INTEGER,
    amount REAL,
    activity_date TEXT,
    metadata TEXT,
    actor_user_id INTEGER,
    actor_name TEXT,
    actor_role TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

function safeJsonParse(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeTimestamp(value, fallback = null) {
  const source = value || fallback;
  if (!source) return '';

  const text = String(source).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `${text}T00:00:00`;
  }

  return text.includes('T') ? text : text.replace(' ', 'T');
}

function toComparableTime(entry) {
  const timestamp = normalizeTimestamp(entry.created_at, entry.activity_date);
  const ms = Date.parse(timestamp);
  return Number.isNaN(ms) ? 0 : ms;
}

function getActorDetails(req) {
  if (!req?.user) {
    return {
      actor_user_id: null,
      actor_name: null,
      actor_role: null,
    };
  }

  return {
    actor_user_id: req.user.id || null,
    actor_name: req.user.name || req.user.username || null,
    actor_role: req.user.role || null,
  };
}

function logActivity({
  req,
  category,
  action,
  title,
  description = null,
  entityType = null,
  entityId = null,
  amount = null,
  activityDate = null,
  metadata = null,
}) {
  try {
    const actor = getActorDetails(req);
    const metadataText = metadata ? JSON.stringify(metadata) : null;

    db.prepare(`
      INSERT INTO activity_logs (
        category,
        action,
        title,
        description,
        entity_type,
        entity_id,
        amount,
        activity_date,
        metadata,
        actor_user_id,
        actor_name,
        actor_role
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      category,
      action,
      title,
      description,
      entityType,
      entityId,
      amount,
      activityDate,
      metadataText,
      actor.actor_user_id,
      actor.actor_name,
      actor.actor_role
    );
  } catch (error) {
    console.error('Error writing activity log:', error);
  }
}

function mapAuditEntries(limit) {
  return db.prepare(`
    SELECT
      id,
      category,
      action,
      title,
      description,
      entity_type,
      entity_id,
      amount,
      activity_date,
      metadata,
      actor_user_id,
      actor_name,
      actor_role,
      created_at
    FROM activity_logs
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(limit).map((entry) => ({
    ...entry,
    source: 'audit',
    metadata: safeJsonParse(entry.metadata),
  }));
}

function mapMemberEntries(limit) {
  return db.prepare(`
    SELECT id, name, email, joined_date, created_at
    FROM members
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(limit).map((member) => ({
    id: `member-${member.id}`,
    source: 'members',
    category: 'member',
    action: 'created',
    title: 'Member added',
    description: member.email
      ? `${member.name} was added to the fund with ${member.email} as the registered email.`
      : `${member.name} was added to the fund.`,
    entity_type: 'member',
    entity_id: member.id,
    amount: null,
    activity_date: member.joined_date || null,
    metadata: {
      member_name: member.name,
      email: member.email || null,
    },
    actor_user_id: null,
    actor_name: null,
    actor_role: null,
    created_at: member.created_at,
  }));
}

function mapSavingsEntries(limit) {
  return db.prepare(`
    SELECT
      s.id,
      s.member_id,
      s.amount,
      s.type,
      s.date,
      s.notes,
      s.created_at,
      m.name AS member_name
    FROM savings s
    JOIN members m ON m.id = s.member_id
    ORDER BY s.created_at DESC, s.id DESC
    LIMIT ?
  `).all(limit).map((entry) => ({
    id: `savings-${entry.id}`,
    source: 'savings',
    category: 'savings',
    action: entry.type,
    title: entry.type === 'withdrawal' ? 'Savings withdrawal recorded' : 'Savings deposit recorded',
    description: entry.notes
      ? `${entry.member_name} ${entry.type === 'withdrawal' ? 'withdrew' : 'deposited'} funds. Note: ${entry.notes}`
      : `${entry.member_name} ${entry.type === 'withdrawal' ? 'withdrew' : 'deposited'} funds.`,
    entity_type: 'saving',
    entity_id: entry.id,
    amount: entry.amount,
    activity_date: entry.date,
    metadata: {
      member_id: entry.member_id,
      member_name: entry.member_name,
      type: entry.type,
      notes: entry.notes || null,
    },
    actor_user_id: null,
    actor_name: null,
    actor_role: null,
    created_at: entry.created_at,
  }));
}

function mapLoanEntries(limit) {
  return db.prepare(`
    SELECT
      l.id,
      l.member_id,
      l.amount,
      l.term_months,
      l.interest_rate,
      l.start_date,
      l.status,
      l.created_at,
      m.name AS member_name
    FROM loans l
    JOIN members m ON m.id = l.member_id
    ORDER BY l.created_at DESC, l.id DESC
    LIMIT ?
  `).all(limit).map((loan) => ({
    id: `loan-${loan.id}`,
    source: 'loans',
    category: 'loan',
    action: 'requested',
    title: 'Loan request submitted',
    description: `${loan.member_name} submitted a loan request for ${loan.amount}.`,
    entity_type: 'loan',
    entity_id: loan.id,
    amount: loan.amount,
    activity_date: loan.start_date,
    metadata: {
      member_id: loan.member_id,
      member_name: loan.member_name,
      status: loan.status,
      term_months: loan.term_months,
      interest_rate: loan.interest_rate,
    },
    actor_user_id: null,
    actor_name: null,
    actor_role: null,
    created_at: loan.created_at,
  }));
}

function mapRepaymentEntries(limit) {
  return db.prepare(`
    SELECT
      lr.id,
      lr.loan_id,
      lr.amount,
      lr.principal,
      lr.interest,
      lr.penalty,
      lr.date,
      lr.created_at,
      m.name AS member_name
    FROM loan_repayments lr
    JOIN loans l ON l.id = lr.loan_id
    JOIN members m ON m.id = l.member_id
    ORDER BY lr.created_at DESC, lr.id DESC
    LIMIT ?
  `).all(limit).map((repayment) => ({
    id: `repayment-${repayment.id}`,
    source: 'repayments',
    category: 'loan',
    action: 'repayment',
    title: 'Loan repayment recorded',
    description: `${repayment.member_name} made a loan repayment${repayment.penalty ? ' with penalty charges applied' : ''}.`,
    entity_type: 'loan_repayment',
    entity_id: repayment.id,
    amount: repayment.amount,
    activity_date: repayment.date,
    metadata: {
      member_name: repayment.member_name,
      loan_id: repayment.loan_id,
      principal: repayment.principal || 0,
      interest: repayment.interest || 0,
      penalty: repayment.penalty || 0,
    },
    actor_user_id: null,
    actor_name: null,
    actor_role: null,
    created_at: repayment.created_at,
  }));
}

function mapAdjustmentEntries(limit) {
  return db.prepare(`
    SELECT id, amount, type, reason, date, adjusted_by, created_at
    FROM balance_adjustments
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(limit).map((entry) => ({
    id: `adjustment-${entry.id}`,
    source: 'balance_adjustments',
    category: 'funds',
    action: entry.type,
    title: entry.type === 'debit' ? 'Balance debit adjustment recorded' : 'Balance credit adjustment recorded',
    description: entry.reason || 'Manual balance adjustment recorded.',
    entity_type: 'balance_adjustment',
    entity_id: entry.id,
    amount: entry.amount,
    activity_date: entry.date,
    metadata: {
      type: entry.type,
      adjusted_by: entry.adjusted_by || null,
    },
    actor_user_id: null,
    actor_name: entry.adjusted_by || null,
    actor_role: null,
    created_at: entry.created_at,
  }));
}

function listActivityFeed({ limit = 50 } = {}) {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const sourceLimit = Math.min(Math.max(normalizedLimit * 2, 50), 400);

  const combined = [
    ...mapAuditEntries(sourceLimit),
    ...mapMemberEntries(sourceLimit),
    ...mapSavingsEntries(sourceLimit),
    ...mapLoanEntries(sourceLimit),
    ...mapRepaymentEntries(sourceLimit),
    ...mapAdjustmentEntries(sourceLimit),
  ];

  return combined
    .sort((a, b) => toComparableTime(b) - toComparableTime(a))
    .slice(0, normalizedLimit);
}

module.exports = {
  logActivity,
  listActivityFeed,
};
