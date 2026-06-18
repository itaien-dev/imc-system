/**
 * Computed-field logic for users and workshop participants.
 * These values are never stored — always derived at query time,
 * per the dev brief (section 2.3 / 5).
 */

const db = require('../db/connection');

/**
 * חבר עמותה (membership_status)
 * Priority order matters: active expiry date wins over everything else.
 */
function computeMembershipStatus({ membership_expiry_date, assist_count }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (membership_expiry_date) {
    const expiry = new Date(membership_expiry_date);
    if (expiry >= today) return 'כן';
  }
  if ((assist_count ?? 0) >= 3) return 'זכאי';
  if (membership_expiry_date) {
    const expiry = new Date(membership_expiry_date);
    if (expiry < today) return 'פג';
  }
  return 'לא';
}

/** גיל (age) — computed from birth_date vs. today. */
function computeAge(birth_date) {
  if (!birth_date) return null;
  const birth = new Date(birth_date);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/**
 * Bulk-fetch the derived fields needed for the Users grid (section 3.3 of the brief):
 * membership status, student workshop, assist_count, last_workshop, age.
 * Returns a Map keyed by user_id -> { ...computed }.
 */
async function getUserComputedFieldsBulk(userIds) {
  if (userIds.length === 0) return new Map();

  const assistCounts = await db('user_workshop_links')
    .select('user_id')
    .count('* as assist_count')
    .where('role', 'assistant')
    .whereIn('user_id', userIds)
    .groupBy('user_id');

  const studentLinks = await db('user_workshop_links')
    .join('workshops', 'workshops.id', 'user_workshop_links.workshop_id')
    .select('user_workshop_links.user_id', 'workshops.workshop_number')
    .where('user_workshop_links.role', 'student')
    .whereIn('user_workshop_links.user_id', userIds);

  const lastAssistRows = await db('user_workshop_links')
    .join('workshops', 'workshops.id', 'user_workshop_links.workshop_id')
    .select(
      'user_workshop_links.user_id',
      'workshops.workshop_number',
      'workshops.start_date',
      'workshops.cycle_number'
    )
    .where('user_workshop_links.role', 'assistant')
    .whereIn('user_workshop_links.user_id', userIds)
    .orderBy('workshops.start_date', 'desc');

  const assistCountMap = new Map(assistCounts.map((r) => [r.user_id, Number(r.assist_count)]));
  const studentWorkshopMap = new Map(studentLinks.map((r) => [r.user_id, r.workshop_number]));

  // First row per user_id after ORDER BY start_date desc = most recent assist
  const lastAssistMap = new Map();
  for (const row of lastAssistRows) {
    if (!lastAssistMap.has(row.user_id)) {
      lastAssistMap.set(row.user_id, row);
    }
  }

  const result = new Map();
  for (const id of userIds) {
    const assist_count = assistCountMap.get(id) ?? 0;
    result.set(id, {
      assist_count,
      student_workshop: studentWorkshopMap.get(id) ?? null,
      last_workshop: lastAssistMap.get(id)?.workshop_number ?? null,
      _last_assist_cycle: lastAssistMap.get(id)?.cycle_number ?? null, // internal use for rounds_since_last
    });
  }
  return result;
}

/**
 * קריטריון קבלה (acceptance_criterion) — computed in the context of one workshop,
 * for a candidate user_id being evaluated as an assistant for that workshop.
 *
 * Check order matters (per brief section 2.3-ו):
 *   1. אסיסט ראשון
 *   2. מגייסים
 *   3. לא השתתף מעל שנה
 *   4. איזונים (default)
 */
async function computeAcceptanceCriterion({ userId, workshopId }) {
  const workshop = await db('workshops').where('id', workshopId).first();
  if (!workshop) throw new Error('Workshop not found');

  const priorAssists = await db('user_workshop_links')
    .join('workshops', 'workshops.id', 'user_workshop_links.workshop_id')
    .select('workshops.start_date', 'workshops.cycle_number')
    .where('user_workshop_links.user_id', userId)
    .where('user_workshop_links.role', 'assistant')
    .whereNot('user_workshop_links.workshop_id', workshopId);

  if (priorAssists.length === 0) {
    return 'אסיסט ראשון';
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const recentRecruitment = await db('user_recruitments')
    .where('recruiter_id', userId)
    .where('recruited_at', '>=', oneYearAgo)
    .first();

  if (recentRecruitment) {
    return 'מגייסים';
  }

  const hasRecentAssist = priorAssists.some((a) => new Date(a.start_date) >= oneYearAgo);
  if (!hasRecentAssist) {
    return 'לא השתתף מעל שנה';
  }

  return 'איזונים';
}

/** לפני כמה סבבים השתתף (rounds_since_last) for a given workshop + last-assist-cycle pair. */
function computeRoundsSinceLast(currentCycleNumber, lastAssistCycleNumber) {
  if (lastAssistCycleNumber == null) return null;
  return currentCycleNumber - lastAssistCycleNumber;
}

module.exports = {
  computeMembershipStatus,
  computeAge,
  getUserComputedFieldsBulk,
  computeAcceptanceCriterion,
  computeRoundsSinceLast,
};
