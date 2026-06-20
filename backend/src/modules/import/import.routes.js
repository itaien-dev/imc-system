const express = require('express');
const multer = require('multer');
const importService = require('./import.service');
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const { logAccess } = require('../../utils/accessLog');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/users/preview', requireAuth, requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const rows = await importService.previewUsers(req.file.buffer);
    res.json({ rows });
  } catch (err) {
    next(err);
  }
});

router.post('/users/commit', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array' });
    const result = await importService.commitUsers(rows);
    logAccess({ actorUserId: req.user.id, action: 'import', ip: req.ip, description: `ייבוא CSV משתמשים: ${rows.length} שורות (${result.created} חדשים, ${result.updated} מעודכנים)` });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/workshops/preview', requireAuth, requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const rows = await importService.previewWorkshops(req.file.buffer);
    res.json({ rows });
  } catch (err) {
    next(err);
  }
});

router.post('/workshops/commit', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be an array' });
    const result = await importService.commitWorkshops(rows);
    logAccess({ actorUserId: req.user.id, action: 'import', ip: req.ip, description: `ייבוא CSV סדנאות: ${rows.length} שורות` });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
