const express = require('express');
const db = require('../../db/connection');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 50;
    const { action } = req.query;

    let query = db('access_log as al')
      .leftJoin('users as actor', 'actor.id', 'al.actor_user_id')
      .leftJoin('users as target', 'target.id', 'al.target_user_id')
      .select(
        'al.id',
        'al.created_at',
        'al.action',
        'al.ip_address',
        'al.changes',
        'actor.full_name as actor_name',
        'actor.id as actor_id',
        'target.full_name as target_name',
        'target.id as target_id'
      )
      .orderBy('al.created_at', 'desc');

    if (action) query = query.where('al.action', action);

    const countQuery = query.clone();
    const [{ count }] = await countQuery.clearSelect().count('* as count');

    const rows = await query.limit(pageSize).offset((page - 1) * pageSize);
    res.json({ rows, total: Number(count), page, pageSize });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
