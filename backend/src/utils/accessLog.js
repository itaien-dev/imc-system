const db = require('../db/connection');

/**
 * Records who accessed/modified which user record, for privacy-law
 * accountability (Amendment 13). Fire-and-forget — logging failures
 * must never break the actual request.
 *
 * @param {object} params
 * @param {number|null} params.actorUserId - the logged-in user performing the action
 * @param {number} params.targetUserId - the user record being accessed
 * @param {'view'|'update'|'delete'|'export'} params.action
 * @param {string} [params.ip]
 */
async function logAccess({ actorUserId, targetUserId, action, ip }) {
  try {
    await db('access_log').insert({
      actor_user_id: actorUserId ?? null,
      target_user_id: targetUserId,
      action,
      ip_address: ip ?? null,
    });
  } catch (err) {
    // Never let logging break the actual request
    console.error('access_log insert failed:', err.message);
  }
}

module.exports = { logAccess };
