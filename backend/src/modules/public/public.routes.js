const express = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const db = require('../../db/connection');

const router = express.Router();

// Public + unauthenticated, so it's open to abuse — keep it tight.
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Returns only workshops currently within their publish window.
 * Computed at request time — never a stored "is visible" flag (brief section 5).
 */
router.get('/workshops', async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const workshops = await db('workshops')
      .select('id', 'workshop_number', 'track', 'start_date', 'end_date')
      .where('publish_start_date', '<=', today)
      .where('publish_end_date', '>=', today)
      .orderBy('workshop_number');
    res.json(workshops);
  } catch (err) {
    next(err);
  }
});

const signupSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  requested_role: z.enum(['student', 'assistant']),
});

router.post('/workshops/:id/signup', signupLimiter, async (req, res, next) => {
  try {
    const workshopId = Number(req.params.id);
    const data = signupSchema.parse(req.body);

    const today = new Date().toISOString().slice(0, 10);
    const workshop = await db('workshops')
      .where('id', workshopId)
      .where('publish_start_date', '<=', today)
      .where('publish_end_date', '>=', today)
      .first();

    if (!workshop) {
      return res.status(404).json({ error: 'הסדנה לא נמצאה או שאינה פתוחה להרשמה כעת' });
    }

    await db('workshop_signups').insert({ workshop_id: workshopId, ...data });
    res.status(201).json({ message: 'הרישום התקבל בהצלחה' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
