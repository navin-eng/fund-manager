const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initializeDB } = require('./db');

const membersRouter = require('./routes/members');
const savingsRouter = require('./routes/savings');
const loansRouter = require('./routes/loans');
const reportsRouter = require('./routes/reports');
const settingsModule = require('./routes/settings');
const authRouter = require('./routes/auth');
const fundLedgerRouter = require('./routes/fund-ledger');
const incomeRouter = require('./routes/income');
const distributionsRouter = require('./routes/distributions');
const reserveRouter = require('./routes/reserve');

const { authenticate, requireRole } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow localhost for dev, and any render.com subdomain for production
    if (!origin || origin.includes('localhost') || origin.endsWith('.onrender.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Static file serving for uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const loanDocsDir = path.join(uploadsDir, 'loan-docs');
if (!fs.existsSync(loanDocsDir)) {
  fs.mkdirSync(loanDocsDir, { recursive: true });
}
const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API routes
// Auth routes handle their own authentication (login is public)
app.use('/api/auth', authRouter);

// Data routes - require authentication
app.use('/api/members', authenticate, membersRouter);
app.use('/api/savings', authenticate, savingsRouter);
app.use('/api/loans', authenticate, loansRouter);

// Admin/Manager only routes - members cannot access these
app.use('/api/reports', authenticate, requireRole('admin', 'manager'), reportsRouter);
app.use('/api/settings', authenticate, settingsModule.settingsRouter);
app.use('/api/balance-adjustments', authenticate, requireRole('admin', 'manager'), settingsModule.adjustmentsRouter);
app.use('/api/fund-ledger', authenticate, requireRole('admin', 'manager'), fundLedgerRouter);
app.use('/api/income', authenticate, requireRole('admin', 'manager'), incomeRouter);
app.use('/api/distributions', authenticate, requireRole('admin', 'manager'), distributionsRouter);
app.use('/api/reserve', authenticate, requireRole('admin', 'manager'), reserveRouter);

// Export and backup routes (loaded after they're created)
try {
  const exportRouter = require('./routes/export');
  app.use('/api/export', authenticate, requireRole('admin', 'manager'), exportRouter);
} catch (e) {
  console.log('Export routes not available yet');
}

try {
  const backupRouter = require('./routes/backup');
  app.use('/api/backup', authenticate, requireRole('admin'), backupRouter);
} catch (e) {
  console.log('Backup routes not available yet');
}

// Production: serve client build
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Initialize database and start server
initializeDB();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fund Manager server running on port ${PORT}`);
  console.log(`Default admin login: admin / admin123`);
  
  // Auto-seed if running in production and no data exists
  if (process.env.NODE_ENV === 'production') {
    try {
      const { db } = require('./db');
      const memberCount = db.prepare('SELECT COUNT(*) as c FROM members').get().c;
      if (memberCount === 0) {
        console.log('No members found. Running auto-seed for demo mode...');
        require('./seed');
      }
    } catch (e) {
      console.error('Error during auto-seed check:', e.message);
    }
  }
});

module.exports = app;
