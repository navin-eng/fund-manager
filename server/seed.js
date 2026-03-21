#!/usr/bin/env node
/**
 * Seed script — populates the fund manager DB with data from the
 * Nawa Urjasheel dashboard (seed-data.json).
 *
 * Usage:  node server/seed.js          (additive — skips if members exist)
 *         node server/seed.js --reset  (wipes all data first)
 */

const path = require('path');
const { db, initializeDB } = require('./db');
const DATA = require('./seed-data.json');

const RESET = process.argv.includes('--reset');

// ──────────── helpers ────────────
function txType(p) {
  const q = (p || '').toLowerCase();
  if (q.includes('bank interest')) return 'bk';
  if (q.includes('adjustment')) return 'adj';
  if (q.includes('refund')) return 'ref';
  if (q.includes('loan given') || q.startsWith('loan to ')) return 'lo';
  if (q.includes('clearance') || q.includes('partial loan c') ||
      q.includes('interest received') || q.includes('interest collection')) return 'clr';
  if (q.includes('interest')) return 'int';
  if (q.includes('saving')) return 'sav';
  return 'oth';
}

// Map English name ↔ dashboard member record
const nameMap = {
  'बिशाल राई': 'Bishal Rai',
  'शिव कुमार ताजपुरिया': 'Shiv Kumar Tajpuriya',
  'निरज नेपाल': 'Niraj Nepal',
  'कृष्ण न्यौपाने': 'Krishna Neupane',
  'रोशन परियार': 'Roshan Pariyar',
  'आशिष भुजेल': 'Ashish Bhujel',
  'नविन निरौला': 'Navin Niroula',
  'प्रकाश बस्नेत': 'Prakash Basnet',
  'पासाङ तामांग': 'Pasang Tamang',
  'दिवेश कुम्हार': 'Dibesh Kumhar',
  'सन्देश गिरी': 'Sandesh Giri',
  'रुपक कटवाल': 'Rupak Katwal',
  'अर्जुन ढुंगाना': 'Arjun Dhungana',
  'परिश रायमाझी': 'Perish Rayamajhi',
  'सुवाष गिरी': 'Suvas Giri',
  'बिशाल खड्का': 'Bishal Khadka',
};

// ──────────── main ────────────
function seed() {
  initializeDB();

  if (RESET) {
    console.log('🗑  Resetting all data…');
    const tables = [
      'reserve_fund', 'distributions', 'income_entries', 'income_periods',
      'fund_ledger', 'loan_repayments', 'loan_documents', 'penalties',
      'loans', 'savings', 'balance_adjustments', 'members',
    ];
    for (const t of tables) {
      try { db.exec(`DELETE FROM ${t}`); } catch (_) {}
    }
    // Reset autoincrement
    try { db.exec("DELETE FROM sqlite_sequence"); } catch (_) {}
    console.log('   Done.\n');
  }

  // Check if already seeded
  const existingCount = db.prepare('SELECT COUNT(*) AS c FROM members').get().c;
  if (existingCount > 0 && !RESET) {
    console.log(`⚠  ${existingCount} members already in DB. Use --reset to re-seed.`);
    process.exit(0);
  }

  // ── 1. Members ──
  console.log('👥 Seeding members…');
  const insertMember = db.prepare(`
    INSERT INTO members (member_no, name, name_np, phone, address, joined_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const memberIdMap = {}; // English name → DB id

  const insertMembers = db.transaction(() => {
    for (const m of DATA.members) {
      const engName = nameMap[m.name] || m.name;
      const res = insertMember.run(
        m.no, engName, m.name,
        m.phone || null, m.addr || null,
        m.joined, m.status
      );
      memberIdMap[engName] = res.lastInsertRowid;
    }
  });
  insertMembers();
  console.log(`   ${DATA.members.length} members inserted.`);

  // ── 2. Savings ──
  console.log('💰 Seeding savings…');
  const insertSaving = db.prepare(
    'INSERT INTO savings (member_id, amount, type, date, notes) VALUES (?, ?, ?, ?, ?)'
  );
  let savCount = 0;
  const insertSavings = db.transaction(() => {
    for (const [name, info] of Object.entries(DATA.savings)) {
      const memberId = memberIdMap[name];
      if (!memberId) { console.log(`   ⚠ No member ID for savings: ${name}`); continue; }
      for (const r of info.rows) {
        const type = r.dr ? 'withdrawal' : 'deposit';
        const amount = r.dr || r.cr;
        insertSaving.run(memberId, amount, type, r.d, r.p);
        savCount++;
      }
    }
  });
  insertSavings();
  console.log(`   ${savCount} savings transactions inserted.`);

  // ── 3. Loans ──
  console.log('🏷️  Seeding loans…');
  const insertLoan = db.prepare(`
    INSERT INTO loans (member_id, amount, interest_rate, term_months, start_date, end_date,
      status, purpose, monthly_payment, total_interest, total_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
  `);
  const insertRepayment = db.prepare(
    'INSERT INTO loan_repayments (loan_id, amount, principal, interest, date, notes) VALUES (?, ?, ?, ?, ?, ?)'
  );

  let loanCount = 0, repayCount = 0;
  const insertLoans = db.transaction(() => {
    for (const [name, info] of Object.entries(DATA.loans)) {
      const memberId = memberIdMap[name];
      if (!memberId) { console.log(`   ⚠ No member ID for loan: ${name}`); continue; }

      // Parse loan events from the rows
      let currentLoanId = null;
      let currentPrincipal = 0;

      for (const r of info.rows) {
        const pLower = (r.p || '').toLowerCase();

        if (pLower.includes('loan given')) {
          // New loan disbursement
          const loanAmount = r.dr;
          // Extract maturity from particulars
          const matMatch = r.p.match(/Maturity:\s*(\S+)/i);
          const endDate = matMatch ? matMatch[1].replace(/\)$/, '') : null;
          const lastRow = info.rows[info.rows.length - 1];
          const isCleared = lastRow.b === 0 || lastRow.b < 1;
          const status = isCleared ? 'completed' : 'active';

          const res = insertLoan.run(
            memberId, loanAmount, 12, 6,
            r.d, endDate, status,
            r.p, loanAmount
          );
          currentLoanId = res.lastInsertRowid;
          currentPrincipal = loanAmount;
          loanCount++;
        } else if (currentLoanId) {
          // Interest accrual or payment
          if (r.cr && r.cr > 0) {
            // Payment (clearance or interest received)
            const isInterestPayment = pLower.includes('interest received') || pLower.includes('interest collection');
            insertRepayment.run(
              currentLoanId, r.cr,
              isInterestPayment ? 0 : r.cr,
              isInterestPayment ? r.cr : 0,
              r.d, r.p
            );
            repayCount++;
          }
          // Interest accrual entries (dr amounts on loan) are tracked but not as repayments
        }
      }
    }
  });
  insertLoans();
  console.log(`   ${loanCount} loans, ${repayCount} repayments inserted.`);

  // ── 4. Fund Ledger ──
  console.log('📋 Seeding fund ledger…');
  const insertLedger = db.prepare(
    'INSERT INTO fund_ledger (date, particulars, debit, credit, balance, type) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertLedgerAll = db.transaction(() => {
    for (const r of DATA.ledger) {
      insertLedger.run(r.d, r.p, r.dr || null, r.cr || null, r.b, txType(r.p));
    }
  });
  insertLedgerAll();
  console.log(`   ${DATA.ledger.length} ledger entries inserted.`);

  // ── 5. Income Periods & Entries ──
  console.log('📈 Seeding income periods…');
  const insertPeriod = db.prepare(
    'INSERT INTO income_periods (period_index, title_np) VALUES (?, ?)'
  );
  const insertIncEntry = db.prepare(
    'INSERT INTO income_entries (period_id, date, particulars, amount, balance) VALUES (?, ?, ?, ?, ?)'
  );
  let entryCount = 0;
  const insertIncome = db.transaction(() => {
    DATA.income_periods.forEach((p, idx) => {
      const res = insertPeriod.run(idx, p.title_np);
      const periodId = res.lastInsertRowid;
      for (const r of p.rows) {
        insertIncEntry.run(periodId, r.d || null, r.p || '(upcoming)', r.amt, r.bal);
        entryCount++;
      }
    });
  });
  insertIncome();
  console.log(`   ${DATA.income_periods.length} periods, ${entryCount} entries inserted.`);

  // ── 6. Distributions ──
  console.log('🎁 Seeding distributions…');
  const insertDist = db.prepare(
    'INSERT INTO distributions (date, particulars, debit, credit, balance) VALUES (?, ?, ?, ?, ?)'
  );
  const insertDistAll = db.transaction(() => {
    for (const r of DATA.dist) {
      insertDist.run(r.d, r.p, r.dr || null, r.cr || null, Math.abs(r.b));
    }
  });
  insertDistAll();
  console.log(`   ${DATA.dist.length} distribution entries inserted.`);

  // ── 7. Reserve Fund ──
  console.log('🔒 Seeding reserve fund…');
  const insertRes = db.prepare(
    'INSERT INTO reserve_fund (date, particulars, debit, credit, balance) VALUES (?, ?, ?, ?, ?)'
  );
  const insertResAll = db.transaction(() => {
    for (const r of DATA.reserve) {
      insertRes.run(r.d, r.p, r.dr || null, r.cr || null, r.b);
    }
  });
  insertResAll();
  console.log(`   ${DATA.reserve.length} reserve entries inserted.`);

  // ── 8. Update settings ──
  console.log('⚙️  Updating settings…');
  const upsert = db.prepare(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
  );
  upsert.run('organization_name', 'नव उर्जाशील साथी बचत कोष');
  upsert.run('organization_name_en', 'Nawa Urjasheel Sathi Saving Fund');
  upsert.run('established_date', '2080-11-30');

  console.log('\n✅ Seed complete!');

  // Summary
  const counts = {
    members: db.prepare('SELECT COUNT(*) AS c FROM members').get().c,
    savings: db.prepare('SELECT COUNT(*) AS c FROM savings').get().c,
    loans: db.prepare('SELECT COUNT(*) AS c FROM loans').get().c,
    repayments: db.prepare('SELECT COUNT(*) AS c FROM loan_repayments').get().c,
    fund_ledger: db.prepare('SELECT COUNT(*) AS c FROM fund_ledger').get().c,
    income_periods: db.prepare('SELECT COUNT(*) AS c FROM income_periods').get().c,
    income_entries: db.prepare('SELECT COUNT(*) AS c FROM income_entries').get().c,
    distributions: db.prepare('SELECT COUNT(*) AS c FROM distributions').get().c,
    reserve_fund: db.prepare('SELECT COUNT(*) AS c FROM reserve_fund').get().c,
  };
  console.log('\n📊 Database Summary:');
  for (const [table, count] of Object.entries(counts)) {
    console.log(`   ${table}: ${count} rows`);
  }
}

seed();
