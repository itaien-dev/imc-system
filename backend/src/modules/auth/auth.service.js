const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../../db/connection');
const { signAccessToken, signRefreshToken } = require('../../utils/tokens');

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

  // TODO: wire to a real email provider (SendGrid / SES) per the dev brief, section 1.1.
  console.log(`[dev only] Password reset link for ${email}: /reset-password?token=${token}`);
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
