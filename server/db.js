const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'fund.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function loansTableSupportsRejectedStatus() {
  const table = db.prepare(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'loans'"
  ).get();

  return Boolean(table?.sql?.includes("'rejected'"));
}

function migrateLoansTableForRejectedStatus() {
  if (loansTableSupportsRejectedStatus()) {
    return;
  }

  db.pragma('foreign_keys = OFF');

  try {
    const migrate = db.transaction(() => {
      db.exec(`
        CREATE TABLE loans_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          member_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          interest_rate REAL NOT NULL,
          term_months INTEGER NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'active', 'completed', 'defaulted', 'rejected')),
          purpose TEXT,
          penalty_rate REAL DEFAULT 2.0,
          approved_date TEXT,
          approved_by TEXT,
          monthly_payment REAL,
          total_interest REAL,
          total_amount REAL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (member_id) REFERENCES members(id)
        );

        INSERT INTO loans_new (
          id,
          member_id,
          amount,
          interest_rate,
          term_months,
          start_date,
          end_date,
          status,
          purpose,
          penalty_rate,
          approved_date,
          approved_by,
          monthly_payment,
          total_interest,
          total_amount,
          created_at
        )
        SELECT
          id,
          member_id,
          amount,
          interest_rate,
          term_months,
          start_date,
          end_date,
          status,
          purpose,
          penalty_rate,
          approved_date,
          approved_by,
          monthly_payment,
          total_interest,
          total_amount,
          created_at
        FROM loans;

        DROP TABLE loans;
        ALTER TABLE loans_new RENAME TO loans;
      `);
    });

    migrate();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

function initializeDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_no TEXT,
      name TEXT NOT NULL,
      name_np TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      joined_date TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      emergency_contact TEXT,
      photo_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS savings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('deposit', 'withdrawal')),
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      interest_rate REAL NOT NULL,
      term_months INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'active', 'completed', 'defaulted', 'rejected')),
      purpose TEXT,
      penalty_rate REAL DEFAULT 2.0,
      approved_date TEXT,
      approved_by TEXT,
      monthly_payment REAL,
      total_interest REAL,
      total_amount REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS loan_repayments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      principal REAL,
      interest REAL,
      penalty REAL DEFAULT 0,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (loan_id) REFERENCES loans(id)
    );

    CREATE TABLE IF NOT EXISTS loan_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (loan_id) REFERENCES loans(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS balance_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('credit', 'debit')),
      date TEXT NOT NULL,
      adjusted_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS penalties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      reason TEXT,
      date TEXT NOT NULL,
      status TEXT DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'paid')),
      paid_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (loan_id) REFERENCES loans(id)
    );

    CREATE TABLE IF NOT EXISTS fund_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      particulars TEXT NOT NULL,
      debit REAL,
      credit REAL,
      balance REAL NOT NULL,
      type TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS income_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_index INTEGER NOT NULL,
      title_np TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS income_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_id INTEGER NOT NULL,
      date TEXT,
      particulars TEXT NOT NULL,
      amount REAL NOT NULL,
      balance REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (period_id) REFERENCES income_periods(id)
    );

    CREATE TABLE IF NOT EXISTS distributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      particulars TEXT NOT NULL,
      debit REAL,
      credit REAL,
      balance REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reserve_fund (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      particulars TEXT NOT NULL,
      debit REAL,
      credit REAL,
      balance REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add member_no and name_np columns if they don't exist (migration)
  try { db.exec('ALTER TABLE members ADD COLUMN member_no TEXT'); } catch (e) { }
  try { db.exec('ALTER TABLE members ADD COLUMN name_np TEXT'); } catch (e) { }
  migrateLoansTableForRejectedStatus();

  const defaultSettings = [
    { key: 'fiscal_year_start', value: '01' },
    { key: 'fiscal_year_start_day', value: '01' },
    { key: 'default_interest_rate', value: '12' },
    { key: 'default_penalty_rate', value: '2' },
    { key: 'currency', value: 'NPR' },
    { key: 'language', value: 'en' },
    { key: 'calendar', value: 'AD' },
    { key: 'theme', value: 'light' },
    { key: 'organization_name', value: 'नव उर्जाशील साथी बचत कोष' },
    { key: 'organization_name_en', value: 'Nawa Urjasheel Sathi Saving Fund' },
    { key: 'established_date', value: '2080-11-30' },
    { key: 'meeting_frequency', value: 'monthly' },
    { key: 'minimum_savings', value: '2000' },
  ];

  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  );

  const insertMany = db.transaction((settings) => {
    for (const setting of settings) {
      insertSetting.run(setting.key, setting.value);
    }
  });

  insertMany(defaultSettings);
}

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function updateSetting(key, value) {
  const result = db.prepare(
    'UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?'
  ).run(value, key);

  if (result.changes === 0) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }

  return { key, value };
}

module.exports = {
  db,
  initializeDB,
  getSettings,
  getSetting,
  updateSetting,
};
