const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const { db, getSettings, updateSetting, getSetting } = require('../db');

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

// GET /api/settings/email - get email settings (exclude password)
router.get('/', (req, res) => {
  try {
    const settings = getSettings();
    res.json({
      smtp_host: settings.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com',
      smtp_port: settings.smtp_port || process.env.SMTP_PORT || '587',
      smtp_user: settings.smtp_user || process.env.SMTP_USER || '',
      smtp_from: settings.smtp_from || process.env.SMTP_FROM || '',
      smtp_configured: !!(settings.smtp_user || process.env.SMTP_USER),
    });
  } catch (error) {
    console.error('Error fetching email settings:', error);
    res.status(500).json({ error: 'Failed to fetch email settings' });
  }
});

// PUT /api/settings/email - update email settings
router.put('/', (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from } = req.body;

    if (smtp_host !== undefined) updateSetting('smtp_host', smtp_host);
    if (smtp_port !== undefined) updateSetting('smtp_port', String(smtp_port));
    if (smtp_user !== undefined) updateSetting('smtp_user', smtp_user);
    if (smtp_pass !== undefined) updateSetting('smtp_pass', smtp_pass);
    if (smtp_from !== undefined) updateSetting('smtp_from', smtp_from);

    const settings = getSettings();
    res.json({
      smtp_host: settings.smtp_host || '',
      smtp_port: settings.smtp_port || '587',
      smtp_user: settings.smtp_user || '',
      smtp_from: settings.smtp_from || '',
      smtp_configured: !!settings.smtp_user,
      message: 'Email settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({ error: 'Failed to update email settings' });
  }
});

// POST /api/settings/email/test - send a test email
router.post('/test', async (req, res) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Recipient email address (to) is required' });
    }

    const transporter = getMailTransporter();
    const settings = getSettings();
    const orgName = settings.organization_name || 'Community Savings Fund';

    const mailOptions = {
      from: settings.smtp_from || process.env.SMTP_FROM || `"${orgName}" <noreply@fundmanager.com>`,
      to,
      subject: `Test Email from ${orgName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0; padding:0; background-color:#f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="500" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #4f46e5, #6366f1); padding: 24px 32px; text-align:center;">
                      <h1 style="color:#ffffff; margin:0; font-size:20px; font-weight:700;">${orgName}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 32px;">
                      <div style="text-align:center; margin-bottom:20px;">
                        <div style="display:inline-block; background-color:#ecfdf5; border-radius:50%; padding:16px;">
                          <span style="font-size:32px;">&#10003;</span>
                        </div>
                      </div>
                      <h2 style="color:#1e293b; text-align:center; margin:0 0 12px 0; font-size:18px;">Email Configuration Working!</h2>
                      <p style="color:#475569; font-size:14px; line-height:1.6; text-align:center; margin:0;">
                        Your SMTP settings are correctly configured. The fund management system can now send email notifications to members.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color:#f8fafc; padding:16px 32px; border-top:1px solid #e2e8f0; text-align:center;">
                      <p style="color:#94a3b8; font-size:12px; margin:0;">
                        This is a test email from ${orgName} Fund Manager.
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

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: `Test email sent successfully to ${to}` });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      details: error.message,
    });
  }
});

module.exports = router;
