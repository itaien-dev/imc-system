const express = require('express');
const multer = require('multer');
const importService = require('./import.service');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

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
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
