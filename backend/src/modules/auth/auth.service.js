const bcrypt = require('bcrypt');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const db = require('../../db/connection');
const { signAccessToken, signRefreshToken } = require('../../utils/tokens');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// In-memory store for password reset tokens — fine for a single-instance dev/staging deployment.
// For production with multiple server instances, move this to a DB table or Redis.
const resetTokens = new Map(); // token -> { userId, expiresAt }

async function login({ email, password }) {
  const user = await db('users').where('email', email).first();
  if (!user || !user.password_hash) {
    return null; // generic failure — caller returns a generic message
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  return { accessToken, refreshToken, user: { id: user.id, full_name: user.full_name, role: user.role } };
}

async function requestPasswordReset(email) {
  const user = await db('users').where('email', email).first();
  // Always behave the same whether or not the user exists, to avoid leaking which emails are registered.
  if (!user) return;

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
  resetTokens.set(token, { userId: user.id, expiresAt });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

  if (process.env.SENDGRID_API_KEY) {
    await sgMail.send({
      to: email,
      from: { email: 'kesher.imc@gmail.com', name: 'מערכת מ.ל.א' },
      subject: 'איפוס סיסמה — מערכת מ.ל.א',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
          <h2 style="color: #2E75B6;">איפוס סיסמה</h2>
          <p>שלום ${user.full_name},</p>
          <p>קיבלנו בקשה לאיפוס הסיסמה שלך במערכת עמותת מ.ל.א.</p>
          <p>לחץ על הכפתור הבא לאיפוס הסיסמה (הקישור תקף לשעה אחת):</p>
          <a href="${resetLink}"
             style="display:inline-block;padding:12px 24px;background:#2E75B6;color:#fff;text-decoration:none;border-radius:4px;font-size:15px;">
            איפוס סיסמה
          </a>
          <p style="margin-top:24px;color:#888;font-size:12px;">
            אם לא ביקשת לאפס את הסיסמה, אפשר להתעלם מהודעה זו.
          </p>
        </div>
      `,
    });
  } else {
    console.log(`[dev] Password reset link for ${email}: ${resetLink}`);
  }
}

async function resetPassword({ token, newPassword }) {
  const entry = resetTokens.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    throw err;
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db('users').where('id', entry.userId).update({ password_hash: passwordHash });
  resetTokens.delete(token);
}

module.exports = { login, requestPasswordReset, resetPassword };
