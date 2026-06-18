const express = require('express');
const { z } = require('zod');
const usersService = require('./users.service');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

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
    const result = await usersService.updateSelf(req.user.id, parseResult.data);
    const updatedUser = await usersService.getById(req.user.id);
    res.json({ ...result, user: updatedUser });
  } catch (err) {
    next(err);
  }
});

// --- Admin: grid + single-record management ---

router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { search, status, page, pageSize } = req.query;
    const result = await usersService.list({
      search,
      status,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/export', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const csv = await usersService.exportToCsv({ search, status });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');
    res.send('\uFEFF' + csv); // BOM so Excel opens UTF-8/Hebrew correctly
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const user = await usersService.getById(Number(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const user = await usersService.updateAsAdmin(Number(req.params.id), req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
