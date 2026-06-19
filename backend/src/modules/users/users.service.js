const db = require('../../db/connection');
const {
  computeMembershipStatus,
  computeAge,
  getUserComputedFieldsBulk,
} = require('../../utils/computedFields');

const PUBLIC_FIELDS = [
  'id',
  'full_name',
  'national_id',
  'birth_date',
  'phone',
  'email',
  'address',
  'gender',
  'membership_expiry_date',
  'created_at',
  'notes',
  'role',
];

const SELF_EDITABLE_FIELDS = ['full_name', 'national_id', 'birth_date', 'phone', 'email', 'address', 'gender'];

async function getById(id) {
  const user = await db('users').select(PUBLIC_FIELDS).where('id', id).first();
  if (!user) return null;
  return attachComputedFields(user);
}

async function attachComputedFields(user) {
  const computedMap = await getUserComputedFieldsBulk([user.id]);
  const computed = computedMap.get(user.id) || { assist_count: 0, student_workshop: null, last_workshop: null };

  const recruiterRow = await db('user_recruitments')
    .join('users as r', 'r.id', 'user_recruitments.recruiter_id')
    .select('r.id as recruiter_id', 'r.full_name as recruiter_name', 'r.email as recruiter_email')
    .where('user_recruitments.recruit_id', user.id)
    .first();

  const [{ count: staffCount }] = await db('user_workshop_links')
    .where('user_id', user.id)
    .whereIn('role', ['facilitator', 'coordinator', 'dj', 'chaperone', 'translator'])
    .count('* as count');

  return {
    ...user,
    age: computeAge(user.birth_date),
    membership_status: computeMembershipStatus({
      membership_expiry_date: user.membership_expiry_date,
      assist_count: computed.assist_count,
    }),
    assist_count: computed.assist_count,
    student_workshop: computed.student_workshop,
    last_workshop: computed.last_workshop,
    staff_count: Number(staffCount),
    recruiter_id:    recruiterRow?.recruiter_id    ?? null,
    recruiter_name:  recruiterRow?.recruiter_name  ?? null,
    recruiter_email: recruiterRow?.recruiter_email ?? null,
  };
}

const MEMBERSHIP_STATUS_SQL = `
  CASE
    WHEN users.membership_expiry_date IS NOT NULL AND users.membership_expiry_date >= CURRENT_DATE THEN 'כן'
    WHEN (
      SELECT COUNT(*) FROM user_workshop_links
      WHERE user_workshop_links.user_id = users.id AND user_workshop_links.role = 'assistant'
    ) >= 3 THEN 'זכאי'
    WHEN users.membership_expiry_date IS NOT NULL AND users.membership_expiry_date < CURRENT_DATE THEN 'פג'
    ELSE 'לא'
  END
`;

const STAFF_COUNT_SQL = `(
  SELECT COUNT(*) FROM user_workshop_links
  WHERE user_workshop_links.user_id = users.id
  AND user_workshop_links.role IN ('facilitator','coordinator','dj','chaperone','translator')
)`;

const ALLOWED_USER_SORT = ['full_name', 'age', 'assist_count', 'student_workshop', 'last_workshop', 'staff_count', 'membership_status'];

async function list({ search, status, page = 1, pageSize = 20, sortBy = 'full_name', sortDir = 'asc' }) {
  const dir = sortDir === 'desc' ? 'desc' : 'asc';
  const col = ALLOWED_USER_SORT.includes(sortBy) ? sortBy : 'full_name';

  let query = db('users').select(PUBLIC_FIELDS);

  if (search) {
    query = query.where((qb) => {
      qb.whereILike('full_name', `%${search}%`)
        .orWhereILike('phone', `%${search}%`)
        .orWhereILike('email', `%${search}%`);
    });
  }

  if (status) {
    query = query.whereRaw(`(${MEMBERSHIP_STATUS_SQL}) = ?`, [status]);
  }

  const countQuery = query.clone();
  const [{ count }] = await countQuery.clearSelect().count('* as count');

  // Computed sort columns — resolved after fetching rows
  const COMPUTED_SORT = ['age', 'assist_count', 'student_workshop', 'last_workshop', 'staff_count', 'membership_status'];
  const dbRows = await (COMPUTED_SORT.includes(col)
    ? query.orderBy('full_name', 'asc')
    : query.orderBy(col, dir))
    .limit(COMPUTED_SORT.includes(col) ? 999999 : pageSize)
    .offset(COMPUTED_SORT.includes(col) ? 0 : (page - 1) * pageSize);

  const userIds = dbRows.map((r) => r.id);
  const computedMap = await getUserComputedFieldsBulk(userIds);

  // Fetch staff_count for all users in one query
  const staffCounts = await db('user_workshop_links')
    .select('user_id')
    .count('* as cnt')
    .whereIn('user_id', userIds)
    .whereIn('role', ['facilitator', 'coordinator', 'dj', 'chaperone', 'translator'])
    .groupBy('user_id');
  const staffCountMap = new Map(staffCounts.map((r) => [r.user_id, Number(r.cnt)]));

  let withComputed = dbRows.map((user) => {
    const computed = computedMap.get(user.id) || { assist_count: 0, student_workshop: null, last_workshop: null };
    return {
      ...user,
      age: computeAge(user.birth_date),
      membership_status: computeMembershipStatus({
        membership_expiry_date: user.membership_expiry_date,
        assist_count: computed.assist_count,
      }),
      assist_count: computed.assist_count,
      student_workshop: computed.student_workshop,
      last_workshop: computed.last_workshop,
      staff_count: staffCountMap.get(user.id) || 0,
    };
  });

  if (COMPUTED_SORT.includes(col)) {
    withComputed.sort((a, b) => {
      const av = a[col] ?? (typeof a[col] === 'number' ? -Infinity : '');
      const bv = b[col] ?? (typeof b[col] === 'number' ? -Infinity : '');
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'he');
      return dir === 'asc' ? cmp : -cmp;
    });
    const start = (page - 1) * pageSize;
    withComputed = withComputed.slice(start, start + pageSize);
  }

  return { rows: withComputed, total: Number(count), page, pageSize };
}

async function updateSelf(userId, patch) {
  const filteredPatch = {};
  for (const key of SELF_EDITABLE_FIELDS) {
    if (key in patch) filteredPatch[key] = patch[key];
  }
  const blockedFields = Object.keys(patch).filter((k) => !SELF_EDITABLE_FIELDS.includes(k));
  if (Object.keys(filteredPatch).length > 0) {
    await db('users').where('id', userId).update(filteredPatch);
  }
  return { updated: Object.keys(filteredPatch), blocked: blockedFields };
}

async function updateAsAdmin(userId, patch) {
  const allowedFields = [...SELF_EDITABLE_FIELDS, 'membership_expiry_date', 'notes', 'role'];
  const filteredPatch = {};
  for (const key of allowedFields) {
    if (key in patch) filteredPatch[key] = patch[key];
  }
  if (Object.keys(filteredPatch).length > 0) {
    await db('users').where('id', userId).update(filteredPatch);
  }

  // Update recruiter link if recruiter_email provided
  if ('recruiter_email' in patch) {
    // Remove existing recruiter link
    await db('user_recruitments').where('recruit_id', userId).delete();

    if (patch.recruiter_email) {
      const recruiter = await db('users')
        .where('email', patch.recruiter_email.toLowerCase().trim())
        .first();
      if (recruiter) {
        await db('user_recruitments').insert({
          recruiter_id: recruiter.id,
          recruit_id: userId,
        });
      }
    }
  }

  return getById(userId);
}

async function exportToCsv({ search, status }) {
  const { rows } = await list({ search, status, page: 1, pageSize: 100000 });
  const headers = ['שם', 'חבר עמותה', 'טלפון', 'דוא"ל', 'סדנת סטודנט', 'כמות סדנאות', 'סדנה אחרונה', 'גיל'];
  const lines = [headers.join(',')];
  for (const u of rows) {
    lines.push(
      [u.full_name, u.membership_status, u.phone || '', u.email,
       u.student_workshop ?? '', u.assist_count, u.last_workshop ?? '', u.age ?? '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
  }
  return lines.join('\n');
}

async function searchLite(query) {
  if (!query || query.trim().length < 2) return [];
  const rows = await db('users')
    .select('id', 'full_name', 'email', 'phone')
    .where((qb) => {
      qb.whereILike('full_name', `%${query}%`).orWhereILike('email', `%${query}%`);
    })
    .orderBy('full_name')
    .limit(15);

  const userIds = rows.map((r) => r.id);
  const studentLinks = userIds.length
    ? await db('user_workshop_links')
        .select('user_id', 'workshop_id')
        .where('role', 'student')
        .whereIn('user_id', userIds)
    : [];
  const studentLinkMap = new Map(studentLinks.map((l) => [l.user_id, l.workshop_id]));
  return rows.map((r) => ({
    ...r,
    has_student_link: studentLinkMap.has(r.id),
    student_workshop_id: studentLinkMap.get(r.id) ?? null,
  }));
}

async function getWorkshopHistory(userId) {
  const rows = await db('user_workshop_links')
    .join('workshops', 'workshops.id', 'user_workshop_links.workshop_id')
    .select(
      'user_workshop_links.id as link_id',
      'user_workshop_links.role',
      'user_workshop_links.registered_at',
      'user_workshop_links.attended',
      'workshops.id as workshop_id',
      'workshops.workshop_number',
      'workshops.track',
      'workshops.start_date',
      'workshops.end_date',
      'workshops.cycle_number'
    )
    .where('user_workshop_links.user_id', userId)
    .orderBy('workshops.start_date', 'desc');
  return rows;
}

async function create(payload) {
  const [user] = await db('users')
    .insert({
      full_name: payload.full_name,
      national_id: payload.national_id || null,
      birth_date: payload.birth_date || null,
      phone: payload.phone || null,
      email: payload.email,
      address: payload.address || null,
      gender: payload.gender || null,
      membership_expiry_date: payload.membership_expiry_date || null,
      notes: payload.notes || null,
      role: payload.role || 'member',
    })
    .returning(PUBLIC_FIELDS);
  return attachComputedFields(user);
}

module.exports = { getById, list, create, updateSelf, updateAsAdmin, exportToCsv, searchLite, getWorkshopHistory };
