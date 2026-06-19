const db = require('../../db/connection');
const { computeAcceptanceCriterion, computeRoundsSinceLast } = require('../../utils/computedFields');

const ALLOWED_WORKSHOP_SORT = ['workshop_number', 'start_date', 'end_date', 'cycle_number'];

async function list({ search, track, page = 1, pageSize = 20, sortBy = 'workshop_number', sortDir = 'asc' }) {
  const col = ALLOWED_WORKSHOP_SORT.includes(sortBy) ? sortBy : 'workshop_number';
  const dir = sortDir === 'desc' ? 'desc' : 'asc';

  const staffSubquery = (role) =>
    db.raw(
      `(SELECT string_agg(u.full_name, ', ' ORDER BY u.full_name)
        FROM user_workshop_links uwl
        JOIN users u ON u.id = uwl.user_id
        WHERE uwl.workshop_id = workshops.id AND uwl.role = ?) as ??`,
      [role, role + 's']
    );

  let query = db('workshops').select(
    'workshops.*',
    staffSubquery('facilitator'),
    staffSubquery('coordinator'),
    staffSubquery('dj'),
    staffSubquery('chaperone')
  );
  let countQuery = db('workshops');

  if (search) {
    const asNumber = Number(search);
    if (!Number.isNaN(asNumber)) {
      query = query.where('workshop_number', asNumber);
      countQuery = countQuery.where('workshop_number', asNumber);
    } else {
      query = query.where('workshop_number', -1);
      countQuery = countQuery.where('workshop_number', -1);
    }
  }
  if (track) {
    query = query.where('track', track);
    countQuery = countQuery.where('track', track);
  }

  const rows = await query
    .orderBy(col, dir)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await countQuery.count('* as count');
  return { rows, total: Number(count), page, pageSize };
}

/** Creates a workshop manually (admin form), as opposed to via CSV import. */
async function create(payload) {
  const [workshop] = await db('workshops')
    .insert({
      workshop_number: payload.workshop_number,
      cycle_number: payload.cycle_number,
      track: payload.track,
      start_date: payload.start_date,
      end_date: payload.end_date,
      publish_start_date: payload.publish_start_date,
      publish_end_date: payload.publish_end_date,
      feedback_date: payload.feedback_date || null,
      email: payload.email || null,
      notes: payload.notes || null,
    })
    .returning('*');
  return workshop;
}

async function getById(id) {
  const workshop = await db('workshops').where('id', id).first();
  if (!workshop) return null;

  const counts = await db('user_workshop_links')
    .select('role')
    .count('* as count')
    .where('workshop_id', id)
    .groupBy('role');

  const countsByRole = Object.fromEntries(counts.map((c) => [c.role, Number(c.count)]));
  return {
    ...workshop,
    student_count: countsByRole.student || 0,
    assistant_count: countsByRole.assistant || 0,
  };
}

/** Participants for one workshop, filtered by role, with computed fields per participant. */
async function getParticipants(workshopId, role) {
  const workshop = await db('workshops').where('id', workshopId).first();
  if (!workshop) return null;

  let query = db('user_workshop_links')
    .join('users', 'users.id', 'user_workshop_links.user_id')
    .select(
      'user_workshop_links.id as link_id',
      'users.id as user_id',
      'users.full_name',
      'users.email',
      'users.phone',
      'user_workshop_links.role',
      'user_workshop_links.registered_at',
      'user_workshop_links.attended'
    )
    .where('user_workshop_links.workshop_id', workshopId);

  if (role === 'staff') {
    query = query.whereIn('user_workshop_links.role', [
      'coordinator',
      'dj',
      'facilitator',
      'translator',
      'chaperone',
    ]);
  } else if (role) {
    query = query.where('user_workshop_links.role', role);
  }

  const rows = await query.orderBy('user_workshop_links.registered_at');

  // Acceptance criterion + rounds-since-last only make sense for assistants.
  if (role === 'assistant') {
    const enriched = [];
    for (const row of rows) {
      const criterion = await computeAcceptanceCriterion({ userId: row.user_id, workshopId });

      const lastAssist = await db('user_workshop_links')
        .join('workshops', 'workshops.id', 'user_workshop_links.workshop_id')
        .select('workshops.cycle_number')
        .where('user_workshop_links.user_id', row.user_id)
        .where('user_workshop_links.role', 'assistant')
        .whereNot('user_workshop_links.workshop_id', workshopId)
        .orderBy('workshops.start_date', 'desc')
        .first();

      enriched.push({
        ...row,
        acceptance_criterion: criterion,
        rounds_since_last: computeRoundsSinceLast(workshop.cycle_number, lastAssist?.cycle_number ?? null),
      });
    }
    return enriched;
  }

  return rows;
}

async function exportParticipantsToCsv(workshopId, role) {
  const rows = await getParticipants(workshopId, role);
  if (rows === null) return null;

  const headers =
    role === 'assistant'
      ? ['שם', 'דוא"ל', 'טלפון', 'קריטריון קבלה', 'תאריך רישום', 'לפני כמה סבבים השתתף']
      : ['שם', 'דוא"ל', 'טלפון', 'תפקיד', 'תאריך רישום'];

  const lines = [headers.join(',')];
  for (const r of rows) {
    const fields =
      role === 'assistant'
        ? [r.full_name, r.email, r.phone || '', r.acceptance_criterion, r.registered_at, r.rounds_since_last ?? '']
        : [r.full_name, r.email, r.phone || '', r.role, r.registered_at];
    lines.push(fields.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  }
  return lines.join('\n');
}

/**
 * Adds an existing user manually to a workshop with a given role (brief note #2),
 * enforcing two business rules clarified with the association:
 *
 * 1. A user can be a "student" at most once, ever, across any workshop. Trying to
 *    add them as a student a second time (to any workshop, including the same one)
 *    is rejected.
 * 2. A user can only be added as assistant/staff if they already have a student
 *    link somewhere (i.e. they went through the program once) — EXCEPT that they
 *    may not be added as assistant/staff to the *same* workshop where they were
 *    the student.
 */
async function addParticipantManually({ workshopId, userId, role }) {
  const existingStudentLink = await db('user_workshop_links')
    .where('user_id', userId)
    .where('role', 'student')
    .first();

  if (role === 'student') {
    if (existingStudentLink) {
      const err = new Error('משתמש זה כבר רשום כסטודנט בסדנה אחרת — לא ניתן לרשום סטודנט פעמיים');
      err.status = 409;
      throw err;
    }
  } else {
    // Assistant or any staff role (coordinator, dj, facilitator, translator, chaperone).
    if (!existingStudentLink) {
      const err = new Error('ניתן להוסיף כאסיסטנט/איש צוות רק משתמש שהיה סטודנט בעבר באחת הסדנאות');
      err.status = 409;
      throw err;
    }
    if (existingStudentLink.workshop_id === workshopId) {
      const err = new Error('משתמש זה היה סטודנט באותה סדנה — לא ניתן לרשום אותו גם כאסיסטנט/איש צוות באותה סדנה');
      err.status = 409;
      throw err;
    }
  }

  const [link] = await db('user_workshop_links')
    .insert({ workshop_id: workshopId, user_id: userId, role })
    .returning('*');
  return link;
}

/** Data needed to render the "close workshop" screen: assistants to mark attendance, pending student signups. */
async function getClosingSummary(workshopId) {
  const assistants = await db('user_workshop_links')
    .join('users', 'users.id', 'user_workshop_links.user_id')
    .select('user_workshop_links.id as link_id', 'users.full_name', 'users.email', 'user_workshop_links.attended')
    .where('user_workshop_links.workshop_id', workshopId)
    .where('user_workshop_links.role', 'assistant');

  const pendingSignups = await db('workshop_signups')
    .where('workshop_id', workshopId)
    .where('processed', false);

  // Flag which signups would create a brand-new user vs. match an existing one by email.
  const enrichedSignups = [];
  for (const signup of pendingSignups) {
    const existingUser = await db('users').where('email', signup.email).first();
    enrichedSignups.push({ ...signup, will_create_new_user: !existingUser });
  }

  return { assistants, pendingSignups: enrichedSignups };
}

/**
 * Closes a workshop: marks assistant attendance, and converts selected pending
 * student signups into real users + user_workshop_links rows.
 * Runs as a single DB transaction (brief section 3.9, point 3).
 */
async function closeWorkshop(workshopId, { attendedAssistantLinkIds = [], processedSignupIds = [] }) {
  return db.transaction(async (trx) => {
    // Mark attendance for all assistant links in this workshop: true if selected, false otherwise.
    await trx('user_workshop_links')
      .where('workshop_id', workshopId)
      .where('role', 'assistant')
      .whereIn('id', attendedAssistantLinkIds)
      .update({ attended: true });

    await trx('user_workshop_links')
      .where('workshop_id', workshopId)
      .where('role', 'assistant')
      .whereNotIn('id', attendedAssistantLinkIds.length > 0 ? attendedAssistantLinkIds : [-1])
      .update({ attended: false });

    const createdUsers = [];
    for (const signupId of processedSignupIds) {
      const signup = await trx('workshop_signups').where('id', signupId).first();
      if (!signup || signup.workshop_id !== workshopId) continue;

      let user = await trx('users').where('email', signup.email).first();
      if (!user) {
        const [newUser] = await trx('users')
          .insert({
            full_name: signup.full_name,
            email: signup.email,
            phone: signup.phone,
            role: 'member',
          })
          .returning('*');
        user = newUser;
        createdUsers.push(user);
      }

      await trx('user_workshop_links')
        .insert({ user_id: user.id, workshop_id: workshopId, role: 'student' })
        .onConflict(['user_id', 'workshop_id', 'role'])
        .ignore();

      await trx('workshop_signups').where('id', signupId).update({ processed: true });
    }

    return { createdUsers };
  });
}

async function removeParticipant(workshopId, linkId) {
  const deleted = await db('user_workshop_links')
    .where({ id: linkId, workshop_id: workshopId })
    .delete();
  return deleted > 0;
}

module.exports = {
  list,
  create,
  getById,
  getParticipants,
  exportParticipantsToCsv,
  addParticipantManually,
  removeParticipant,
  getClosingSummary,
  closeWorkshop,
};
