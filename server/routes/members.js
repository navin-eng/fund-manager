const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { db, getSettings } = require('../db');

// Configure multer for member photo uploads
const photoDir = path.join(__dirname, '..', 'uploads', 'member-photos');
if (!fs.existsSync(photoDir)) {
  fs.mkdirSync(photoDir, { recursive: true });
}
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, photoDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `member-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

// Helper: hash password (same method as auth.js)
function hashPassword(password) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Helper: generate random 8-character password
function generatePassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Helper: generate username from member name
function generateUsername(name) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '');

  // Check if username exists already
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(base);
  if (!existing) return base;

  // Append incrementing number until unique
  let counter = 1;
  while (true) {
    const candidate = `${base}${counter}`;
    const found = db.prepare('SELECT id FROM users WHERE username = ?').get(candidate);
    if (!found) return candidate;
    counter++;
  }
}

// Helper: get mail transporter from DB settings or env vars
function getMailTransporter() {
  const settings = getSettings();
  return nodemailer.createTransport({
    host: settings.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(settings.smtp_port || process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: settings.smtp_user || process.env.SMTP_USER || '',
      pass: settings.smtp_pass || process.env.SMTP_PASS || '',
    },
  });
}

// Helper: send welcome email with login credentials
async function sendWelcomeEmail(member, username, password) {
  const transporter = getMailTransporter();
  const settings = getSettings();
  const orgName = settings.organization_name || 'Community Savings Fund';
  const loginUrl = settings.app_url || process.env.APP_URL || 'http://localhost:5173/login';

  const mailOptions = {
    from: settings.smtp_from || process.env.SMTP_FROM || `"${orgName}" <noreply@fundmanager.com>`,
    to: member.email,
    subject: `Welcome to ${orgName} - Your Login Credentials`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0; padding:0; background-color:#f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #4f46e5, #6366f1); padding: 32px 40px; text-align:center;">
                    <h1 style="color:#ffffff; margin:0; font-size:24px; font-weight:700; letter-spacing:-0.5px;">
                      ${orgName}
                    </h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color:#1e293b; margin:0 0 16px 0; font-size:20px; font-weight:600;">
                      Welcome, ${member.name}!
                    </h2>
                    <p style="color:#475569; font-size:15px; line-height:1.6; margin:0 0 24px 0;">
                      Your membership account has been created successfully. Below are your login credentials to access the fund management portal.
                    </p>
                    <!-- Credentials Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:24px;">
                      <tr>
                        <td style="padding: 24px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 8px 0;">
                                <span style="color:#64748b; font-size:13px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Username</span>
                                <br>
                                <span style="color:#1e293b; font-size:18px; font-weight:700; font-family:monospace;">${username}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; border-top:1px solid #e2e8f0;">
                                <span style="color:#64748b; font-size:13px; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">Password</span>
                                <br>
                                <span style="color:#1e293b; font-size:18px; font-weight:700; font-family:monospace;">${password}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <!-- Login Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" style="display:inline-block; background-color:#4f46e5; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:8px; font-size:15px; font-weight:600;">
                            Login to Your Account
                          </a>
                        </td>
                      </tr>
                    </table>
                    <!-- Instructions -->
                    <div style="background-color:#fef3c7; border:1px solid #fde68a; border-radius:8px; padding:16px; margin-bottom:24px;">
                      <p style="color:#92400e; font-size:14px; margin:0; line-height:1.5;">
                        <strong>Important:</strong> Please change your password after your first login for security. Go to your account settings to update your password.
                      </p>
                    </div>
                    <p style="color:#475569; font-size:14px; line-height:1.6; margin:0;">
                      Through your account, you can:
                    </p>
                    <ul style="color:#475569; font-size:14px; line-height:1.8; padding-left:20px; margin:8px 0 0 0;">
                      <li>View your savings balance and transaction history</li>
                      <li>Track your loan status and repayment progress</li>
                      <li>Access your financial statements</li>
                    </ul>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color:#f8fafc; padding:24px 40px; border-top:1px solid #e2e8f0; text-align:center;">
                    <p style="color:#94a3b8; font-size:12px; margin:0; line-height:1.5;">
                      This is an automated message from ${orgName}.<br>
                      If you did not expect this email, please contact your fund administrator.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${member.email}`);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error.message);
    return false; // Don't fail member creation if email fails
  }
}

// GET /api/members - list all members
router.get('/', (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT m.*,
        COALESCE(
          (SELECT SUM(CASE WHEN s.type = 'deposit' THEN s.amount ELSE -s.amount END)
           FROM savings s WHERE s.member_id = m.id), 0
        ) AS total_savings,
        (SELECT COUNT(*) FROM loans l
         WHERE l.member_id = m.id AND l.status IN ('active', 'approved')
        ) AS active_loans
      FROM members m
    `;

    const params = [];
    if (status) {
      query += ' WHERE m.status = ?';
      params.push(status);
    }

    query += ' ORDER BY m.name ASC';

    const members = db.prepare(query).all(...params);
    res.json(members);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// GET /api/members/:id - get single member with savings history and loans
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const member = db.prepare(`
      SELECT m.*,
        COALESCE(
          (SELECT SUM(CASE WHEN s.type = 'deposit' THEN s.amount ELSE -s.amount END)
           FROM savings s WHERE s.member_id = m.id), 0
        ) AS total_savings,
        (SELECT COUNT(*) FROM loans l
         WHERE l.member_id = m.id AND l.status IN ('active', 'approved')
        ) AS active_loans
      FROM members m WHERE m.id = ?
    `).get(id);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const savings = db.prepare(
      'SELECT * FROM savings WHERE member_id = ? ORDER BY date DESC'
    ).all(id);

    const loans = db.prepare(
      'SELECT * FROM loans WHERE member_id = ? ORDER BY created_at DESC'
    ).all(id);

    res.json({ ...member, savings_history: savings, loans });
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// GET /api/members/:id/statement - member's full financial statement
router.get('/:id/statement', (req, res) => {
  try {
    const { id } = req.params;

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const deposits = db.prepare(
      "SELECT * FROM savings WHERE member_id = ? AND type = 'deposit' ORDER BY date DESC"
    ).all(id);

    const withdrawals = db.prepare(
      "SELECT * FROM savings WHERE member_id = ? AND type = 'withdrawal' ORDER BY date DESC"
    ).all(id);

    const totalDeposits = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM savings WHERE member_id = ? AND type = 'deposit'"
    ).get(id).total;

    const totalWithdrawals = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM savings WHERE member_id = ? AND type = 'withdrawal'"
    ).get(id).total;

    const loans = db.prepare(
      'SELECT * FROM loans WHERE member_id = ? ORDER BY created_at DESC'
    ).all(id);

    const repayments = db.prepare(`
      SELECT lr.* FROM loan_repayments lr
      JOIN loans l ON lr.loan_id = l.id
      WHERE l.member_id = ?
      ORDER BY lr.date DESC
    `).all(id);

    const totalRepayments = db.prepare(`
      SELECT COALESCE(SUM(lr.amount), 0) AS total FROM loan_repayments lr
      JOIN loans l ON lr.loan_id = l.id
      WHERE l.member_id = ?
    `).get(id).total;

    const totalLoanAmount = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM loans WHERE member_id = ? AND status IN ('active', 'completed')"
    ).get(id).total;

    res.json({
      member,
      summary: {
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        net_savings: totalDeposits - totalWithdrawals,
        total_loan_amount: totalLoanAmount,
        total_repayments: totalRepayments,
        outstanding_balance: totalLoanAmount - totalRepayments,
      },
      deposits,
      withdrawals,
      loans,
      repayments,
    });
  } catch (error) {
    console.error('Error fetching member statement:', error);
    res.status(500).json({ error: 'Failed to fetch member statement' });
  }
});

// POST /api/members - create member
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { name, email, phone, address, joined_date, emergency_contact } = req.body;
    const photo_url = req.file ? `/uploads/member-photos/${req.file.filename}` : (req.body.photo_url || null);

    if (!name || !joined_date) {
      return res.status(400).json({ error: 'Name and joined_date are required' });
    }

    const result = db.prepare(`
      INSERT INTO members (name, email, phone, address, joined_date, emergency_contact, photo_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, email || null, phone || null, address || null, joined_date, emergency_contact || null, photo_url || null);

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid);

    // Auto-create user account for the new member
    let generatedUsername = null;
    let generatedPassword = null;
    let emailSent = false;

    try {
      generatedUsername = generateUsername(name);
      generatedPassword = generatePassword();
      const passwordHash = hashPassword(generatedPassword);

      db.prepare(
        'INSERT INTO users (username, password_hash, name, email, role, member_id) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(generatedUsername, passwordHash, name, email || null, 'member', member.id);

      console.log(`User account created for member "${name}": username="${generatedUsername}"`);

      // Send welcome email if member has an email address
      if (member.email) {
        emailSent = await sendWelcomeEmail(member, generatedUsername, generatedPassword);
      }
    } catch (userError) {
      console.error('Error creating user account for member:', userError.message);
      // Don't fail member creation if user account creation fails
    }

    res.status(201).json({
      ...member,
      username: generatedUsername,
      email_sent: emailSent,
    });
  } catch (error) {
    console.error('Error creating member:', error);
    res.status(500).json({ error: 'Failed to create member' });
  }
});

// Conditional multer: only parse multipart if content-type is multipart/form-data
function optionalUpload(req, res, next) {
  if (req.is('multipart/form-data')) {
    upload.single('photo')(req, res, next);
  } else {
    next();
  }
}

// PUT /api/members/:id - update member
router.put('/:id', optionalUpload, (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, joined_date, emergency_contact, status } = req.body;
    const photo_url = req.file ? `/uploads/member-photos/${req.file.filename}` : req.body.photo_url;

    const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Member not found' });
    }

    db.prepare(`
      UPDATE members
      SET name = ?, email = ?, phone = ?, address = ?, joined_date = ?,
          emergency_contact = ?, photo_url = ?, status = ?
      WHERE id = ?
    `).run(
      name || existing.name,
      email !== undefined ? email : existing.email,
      phone !== undefined ? phone : existing.phone,
      address !== undefined ? address : existing.address,
      joined_date || existing.joined_date,
      emergency_contact !== undefined ? emergency_contact : existing.emergency_contact,
      photo_url !== undefined ? photo_url : existing.photo_url,
      status || existing.status,
      id
    );

    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
    res.json(member);
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// DELETE /api/members/:id - soft delete (set status=inactive)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Member not found' });
    }

    db.prepare("UPDATE members SET status = 'inactive' WHERE id = ?").run(id);
    res.json({ message: 'Member deactivated successfully' });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

module.exports = router;
