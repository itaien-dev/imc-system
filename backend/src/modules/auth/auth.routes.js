const express = require('express');
const { z } = require('zod');
const authService = require('./auth.service');

const router = express.Router();

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

module.exports = router;
