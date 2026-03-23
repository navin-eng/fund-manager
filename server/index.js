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
app.use('/api/auth', authRouter);
app.use('/api/members', membersRouter);
app.use('/api/savings', savingsRouter);
app.use('/api/loans', loansRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsModule.settingsRouter);
app.use('/api/balance-adjustments', settingsModule.adjustmentsRouter);
app.use('/api/fund-ledger', fundLedgerRouter);
app.use('/api/income', incomeRouter);
app.use('/api/distributions', distributionsRouter);
app.use('/api/reserve', reserveRouter);

// Export and backup routes (loaded after they're created)
try {
  const exportRouter = require('./routes/export');
  app.use('/api/export', exportRouter);
} catch (e) {
  console.log('Export routes not available yet');
}

try {
  const backupRouter = require('./routes/backup');
  app.use('/api/backup', backupRouter);
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
