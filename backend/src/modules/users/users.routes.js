const express = require('express');
const { z } = require('zod');
const sgMail = require('@sendgrid/mail');
const usersService = require('./users.service');
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const { logAccess } = require('../../utils/accessLog');

const ADMIN_EMAIL = 'itaien@gmail.com';

const router = express.Router();

// --- Self-service ---

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await usersService.getById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

const selfUpdateSchema = z
  .object({
    full_name: z.string().min(1).optional(),
    national_id: z.string().max(9).optional(),
    birth_date: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    gender: z.enum(['male', 'female']).optional(),
  })
  .strict()
  .partial();

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    // Validate the allowed shape first; anything outside it is rejected at the schema level.
    // We still also defend in the service layer in case this route is ever reused.
    const parseResult = selfUpdateSchema.safeParse(req.body);
    const blockedKeys = Object.keys(req.body).filter(
      (k) => !['full_name', 'national_id', 'birth_date', 'phone', 'email', 'address', 'gender'].includes(k)
    );
    if (blockedKeys.length > 0) {
      return res.status(403).json({ error: 'Cannot update restricted fields', fields: blockedKeys });
    }
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.flatten() });
    }
    const before = await usersService.getById(req.user.id);
    const result = await usersService.updateSelf(req.user.id, parseResult.data);
    const updatedUser = await usersService.getById(req.user.id);
    const TRACKED = ['full_name', 'national_id', 'birth_date', 'phone', 'email', 'address', 'gender'];
    const changes = {};
    for (const field of TRACKED) {
      const oldVal = before?.[field] ?? null;
      const newVal = parseResult.data[field] ?? null;
      if (newVal !== undefined && String(oldVal ?? '') !== String(newVal ?? '')) {
        changes[field] = { old: oldVal, new: newVal };
      }
    }
    logAccess({ actorUserId: req.user.id, targetUserId: req.user.id, action: 'update', ip: req.ip, changes: Object.keys(changes).length ? changes : undefined, description: 'עדכון פרופיל אישי' });
    res.json({ ...result, user: updatedUser });
  } catch (err) {
    next(err);
  }
});

router.post('/me/request-deletion', requireAuth, async (req, res, next) => {
  try {
    const user = await usersService.requestDeletion(req.user.id);
    // Send email notification to admin
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({
        to: ADMIN_EMAIL,
        from: process.env.EMAIL_FROM || 'no-reply@imc.org.il',
        subject: `בקשת מחיקת חשבון — ${user.full_name}`,
        text: `המשתמש ${user.full_name} (${user.email}) ביקש למחוק את חשבונו.\n\nתאריך הבקשה: ${new Date().toLocaleString('he-IL')}\n\nכדי לאשר את המחיקה, כנס למערכת ועבור לכרטיס המשתמש.`,
        html: `<div dir="rtl"><p>המשתמש <strong>${user.full_name}</strong> (${user.email}) ביקש למחוק את חשבונו.</p><p>תאריך הבקשה: ${new Date().toLocaleString('he-IL')}</p><p>כדי לאשר את המחיקה, כנס למערכת ועבור לכרטיס המשתמש.</p></div>`,
      }).catch((err) => console.error('sendgrid error:', err.message));
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/me/history', requireAuth, async (req, res, next) => {
  try {
    const history = await usersService.getWorkshopHistory(req.user.id);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// --- Admin: grid + single-record management ---

router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { search, status, page, pageSize, sortBy, sortDir } = req.query;
    const result = await usersService.list({
      search,
      status,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      sortBy,
      sortDir,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const createUserSchema = z.object({
  full_name: z.string().min(1),
  national_id: z.string().max(9).optional().nullable().or(z.literal('')),
  birth_date: z.string().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  email: z.string().email(),
  address: z.string().optional().nullable().or(z.literal('')),
  gender: z.enum(['male', 'female']).optional().nullable().or(z.literal('')),
  membership_expiry_date: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
  role: z.enum(['member', 'admin']).optional(),
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await usersService.create(data);
    logAccess({ actorUserId: req.user.id, targetUserId: user.id, action: 'create', ip: req.ip, description: `יצירת משתמש: ${user.full_name}` });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/export', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const csv = await usersService.exportToCsv({ search, status });
    logAccess({ actorUserId: req.user.id, targetUserId: null, action: 'export', ip: req.ip });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');
    res.send('\uFEFF' + csv); // BOM so Excel opens UTF-8/Hebrew correctly
  } catch (err) {
    next(err);
  }
});

// Must be declared before GET /:id, otherwise Express would treat "search" as an :id value.
router.get('/search', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const results = await usersService.searchLite(req.query.q);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const user = await usersService.getById(targetId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    logAccess({ actorUserId: req.user.id, targetUserId: targetId, action: 'view', ip: req.ip });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const before = await usersService.getById(targetId);
    const user = await usersService.updateAsAdmin(targetId, req.body);
    const TRACKED = ['full_name', 'national_id', 'birth_date', 'phone', 'email', 'address', 'gender', 'membership_expiry_date', 'notes', 'role'];
    const changes = {};
    for (const field of TRACKED) {
      const oldVal = before?.[field] ?? null;
      const newVal = req.body[field] ?? null;
      if (String(oldVal ?? '') !== String(newVal ?? '')) {
        changes[field] = { old: oldVal, new: newVal };
      }
    }
    logAccess({ actorUserId: req.user.id, targetUserId: targetId, action: 'update', ip: req.ip, changes: Object.keys(changes).length ? changes : undefined });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    logAccess({ actorUserId: req.user.id, targetUserId: targetId, action: 'delete', ip: req.ip });
    await usersService.approveDeletion(targetId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/history', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const history = await usersService.getWorkshopHistory(Number(req.params.id));
    res.json(history);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
