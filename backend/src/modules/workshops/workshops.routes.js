const express = require('express');
const { z } = require('zod');
const workshopsService = require('./workshops.service');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { search, track, page, pageSize, sortBy, sortDir } = req.query;
    const result = await workshopsService.list({
      search,
      track,
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

const createWorkshopSchema = z.object({
  workshop_number: z.number().int().positive(),
  cycle_number: z.number().int().positive(),
  track: z.enum(['adults', 'youth', 'general']),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  publish_start_date: z.string().min(1),
  publish_end_date: z.string().min(1),
  feedback_date: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = createWorkshopSchema.parse(req.body);
    if (new Date(data.end_date) < new Date(data.start_date)) {
      return res.status(400).json({ error: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה' });
    }
    if (new Date(data.publish_end_date) < new Date(data.publish_start_date)) {
      return res.status(400).json({ error: 'תאריך תום הפרסום חייב להיות אחרי תאריך תחילת הפרסום' });
    }
    const workshop = await workshopsService.create(data);
    res.status(201).json(workshop);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const workshop = await workshopsService.getById(Number(req.params.id));
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
    res.json(workshop);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = createWorkshopSchema.parse(req.body);
    const workshop = await workshopsService.update(Number(req.params.id), data);
    if (!workshop) return res.status(404).json({ error: 'Workshop not found' });
    res.json(workshop);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/participants', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.query; // 'student' | 'assistant' | 'staff'
    const participants = await workshopsService.getParticipants(Number(req.params.id), role);
    if (participants === null) return res.status(404).json({ error: 'Workshop not found' });
    res.json(participants);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/export', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.query;
    const csv = await workshopsService.exportParticipantsToCsv(Number(req.params.id), role);
    if (csv === null) return res.status(404).json({ error: 'Workshop not found' });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="workshop_${req.params.id}_${role || 'all'}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    next(err);
  }
});

const addParticipantSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(['student', 'assistant', 'coordinator', 'dj', 'facilitator', 'translator', 'chaperone']),
});

router.post('/:id/participants', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { userId, role } = addParticipantSchema.parse(req.body);
    const link = await workshopsService.addParticipantManually({
      workshopId: Number(req.params.id),
      userId,
      role,
    });
    res.status(201).json(link);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/participants/:linkId', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const deleted = await workshopsService.removeParticipant(
      Number(req.params.id),
      Number(req.params.linkId),
    );
    if (!deleted) return res.status(404).json({ error: 'Participant link not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/closing-summary', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const summary = await workshopsService.getClosingSummary(Number(req.params.id));
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

const closeWorkshopSchema = z.object({
  attendedAssistantLinkIds: z.array(z.number().int()).default([]),
  processedSignupIds: z.array(z.number().int()).default([]),
});

router.post('/:id/close', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = closeWorkshopSchema.parse(req.body);
    const result = await workshopsService.closeWorkshop(Number(req.params.id), body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
