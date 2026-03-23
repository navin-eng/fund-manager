const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { db } = require('../db');

const dataDir = path.join(__dirname, '..', 'data');
const backupsDir = path.join(__dirname, '..', 'backups');
const dbPath = path.join(dataDir, 'fund.db');

// Ensure backups directory exists
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Multer configuration for restore uploads
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads', 'temp'),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.db') {
      cb(null, true);
    } else {
      cb(new Error('Only .db files are allowed'));
    }
  },
});

// Helper: format date for filenames
function backupFilename() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `backup_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.db`;
}

// Helper: get file size in human-readable format
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getBackupKind(filename) {
  if (filename.startsWith('pre_restore_')) return 'pre_restore';
  if (filename.startsWith('backup_')) return 'snapshot';
  return 'archive';
}

// GET /api/backup - Create and download database backup
router.get('/', (req, res) => {
  try {
    // Use better-sqlite3's backup API for a safe copy
    const filename = backupFilename();
    const tempPath = path.join(backupsDir, `temp_download_${Date.now()}.db`);

    // Copy database safely using backup
    db.backup(tempPath).then(() => {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const stream = fs.createReadStream(tempPath);
      stream.pipe(res);

      stream.on('end', () => {
        // Clean up temp file
        try { fs.unlinkSync(tempPath); } catch (e) { /* ignore */ }
      });

      stream.on('error', (err) => {
        console.error('Error streaming backup:', err);
        try { fs.unlinkSync(tempPath); } catch (e) { /* ignore */ }
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to stream backup' });
        }
      });
    }).catch((err) => {
      console.error('Error creating backup:', err);
      // Fallback: copy the file directly
      try {
        fs.copyFileSync(dbPath, tempPath);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const stream = fs.createReadStream(tempPath);
        stream.pipe(res);
        stream.on('end', () => {
          try { fs.unlinkSync(tempPath); } catch (e) { /* ignore */ }
        });
      } catch (copyErr) {
        console.error('Error copying database:', copyErr);
        res.status(500).json({ error: 'Failed to create backup' });
      }
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// POST /api/backup/restore - Upload and restore from backup
router.post('/restore', upload.single('backup'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No backup file uploaded' });
    }

    const uploadedPath = req.file.path;

    // Validate the uploaded file is a valid SQLite database
    let testDb;
    try {
      testDb = new Database(uploadedPath, { readonly: true });
      // Check that essential tables exist
      const tables = testDb.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all().map(t => t.name);

      const requiredTables = ['members', 'savings', 'loans'];
      const missingTables = requiredTables.filter(t => !tables.includes(t));

      if (missingTables.length > 0) {
        testDb.close();
        fs.unlinkSync(uploadedPath);
        return res.status(400).json({
          error: `Invalid backup file. Missing tables: ${missingTables.join(', ')}`,
        });
      }

      testDb.close();
    } catch (validationErr) {
      try { if (testDb) testDb.close(); } catch (e) { /* ignore */ }
      try { fs.unlinkSync(uploadedPath); } catch (e) { /* ignore */ }
      return res.status(400).json({ error: 'Invalid database file. The uploaded file is not a valid SQLite database.' });
    }

    // Create an auto-backup before restoring
    const preRestoreBackup = path.join(backupsDir, `pre_restore_${backupFilename()}`);
    try {
      fs.copyFileSync(dbPath, preRestoreBackup);
    } catch (e) {
      console.warn('Could not create pre-restore backup:', e.message);
    }

    // Close the current database connection (checkpoint WAL first)
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) { /* ignore if WAL not active */ }

    // Replace the database file
    try {
      fs.copyFileSync(uploadedPath, dbPath);
      fs.unlinkSync(uploadedPath);
    } catch (copyErr) {
      // Try to restore from pre-restore backup
      try { fs.copyFileSync(preRestoreBackup, dbPath); } catch (e) { /* last resort */ }
      return res.status(500).json({ error: 'Failed to replace database file' });
    }

    res.json({
      success: true,
      message: 'Database restored successfully. Please restart the server for changes to take full effect.',
      pre_restore_backup: path.basename(preRestoreBackup),
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

// GET /api/backup/history - List available backups
router.get('/history', (req, res) => {
  try {
    if (!fs.existsSync(backupsDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith('.db') && !f.startsWith('temp_'))
      .map(filename => {
        const filePath = path.join(backupsDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          kind: getBackupKind(filename),
          size: stats.size,
          size_formatted: formatFileSize(stats.size),
          created_at: stats.mtime.toISOString(),
          date: stats.mtime.toISOString().split('T')[0],
          time: stats.mtime.toISOString().split('T')[1].substring(0, 8),
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(files);
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// POST /api/backup/auto - Create automatic backup
router.post('/auto', (req, res) => {
  try {
    const filename = backupFilename();
    const backupPath = path.join(backupsDir, filename);

    // Use backup API
    db.backup(backupPath).then(() => {
      // Clean up old backups - keep last 10
      cleanupOldBackups();

      const stats = fs.statSync(backupPath);
      res.json({
        success: true,
        filename,
        size: stats.size,
        size_formatted: formatFileSize(stats.size),
        created_at: new Date().toISOString(),
      });
    }).catch((err) => {
      // Fallback: direct copy
      try {
        fs.copyFileSync(dbPath, backupPath);
        cleanupOldBackups();

        const stats = fs.statSync(backupPath);
        res.json({
          success: true,
          filename,
          size: stats.size,
          size_formatted: formatFileSize(stats.size),
          created_at: new Date().toISOString(),
        });
      } catch (copyErr) {
        console.error('Error creating auto backup:', copyErr);
        res.status(500).json({ error: 'Failed to create auto backup' });
      }
    });
  } catch (error) {
    console.error('Error creating auto backup:', error);
    res.status(500).json({ error: 'Failed to create auto backup' });
  }
});

// GET /api/backup/download/:filename - Download a specific backup
router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    // Sanitize filename to prevent directory traversal
    const safeName = path.basename(filename);
    const filePath = path.join(backupsDir, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
});

// DELETE /api/backup/files/:filename - Delete a specific backup file
router.delete('/files/:filename', (req, res) => {
  try {
    const safeName = path.basename(req.params.filename);

    if (!safeName.endsWith('.db')) {
      return res.status(400).json({ error: 'Only backup database files can be deleted' });
    }

    const filePath = path.join(backupsDir, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      filename: safeName,
      message: 'Backup deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

// Helper: clean up old backups, keep last 10
function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith('.db') && f.startsWith('backup_'))
      .map(filename => ({
        filename,
        path: path.join(backupsDir, filename),
        mtime: fs.statSync(path.join(backupsDir, filename)).mtime,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    // Delete files beyond the 10th
    if (files.length > 10) {
      for (let i = 10; i < files.length; i++) {
        try {
          fs.unlinkSync(files[i].path);
          console.log(`Deleted old backup: ${files[i].filename}`);
        } catch (e) {
          console.warn(`Failed to delete old backup: ${files[i].filename}`, e.message);
        }
      }
    }
  } catch (e) {
    console.warn('Error cleaning up old backups:', e.message);
  }
}

module.exports = router;
