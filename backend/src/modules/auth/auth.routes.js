const express = require('express');
const { z } = require('zod');
const passport = require('passport');
const authService = require('./auth.service');
const { requireAuth } = require('../../middleware/auth');
const { signAccessToken, signRefreshToken } = require('../../utils/tokens');

const router = express.Router();

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['email', 'profile'], session: false }));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=no_account` }),
  (req, res) => {
    const user = req.user;
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const params = new URLSearchParams({ accessToken, refreshToken });
    res.redirect(`${process.env.FRONTEND_URL}/auth/google/callback?${params}`);
  }
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login({ email, password });
    if (!result) {
      return res.status(401).json({ error: 'דוא"ל או סיסמה שגויים' });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const forgotSchema = z.object({ email: z.string().email() });

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = forgotSchema.parse(req.body);
    await authService.requestPasswordReset(email);
    // Same response regardless of whether the email exists.
    res.json({ message: 'אם הדוא"ל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה' });
  } catch (err) {
    next(err);
  }
});

const resetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = resetSchema.parse(req.body);
    await authService.resetPassword({ token, newPassword });
    res.json({ message: 'הסיסמה עודכנה בהצלחה' });
  } catch (err) {
    next(err);
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await authService.changePassword({ userId: req.user.id, currentPassword, newPassword });
    res.json({ message: 'הסיסמה עודכנה בהצלחה' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
