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

// Fields a regular (non-admin) member is allowed to update on their own profile.
// created_at, membership_expiry_date, notes, role are intentionally excluded — admin only.
const SELF_EDITABLE_FIELDS = ['full_name', 'national_id', 'birth_date', 'phone', 'email', 'address', 'gender'];

async function getById(id) {
  const user = await db('users').select(PUBLIC_FIELDS).where('id', id).first();
  if (!user) return null;
  return attachComputedFields(user);
}

async function attachComputedFields(user) {
  const computedMap = await getUserComputedFieldsBulk([user.id]);
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
  };
}

async function list({ search, status, page = 1, pageSize = 20 }) {
  let query = db('users').select(PUBLIC_FIELDS);

  if (search) {
    query = query.where((qb) => {
      qb.whereILike('full_name', `%${search}%`)
        .orWhereILike('phone', `%${search}%`)
        .orWhereILike('email', `%${search}%`);
    });
  }

  const countQuery = query.clone();
  const [{ count }] = await countQuery.clearSelect().count('* as count');

  const rows = await query
    .orderBy('full_name')
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const userIds = rows.map((r) => r.id);
  const computedMap = await getUserComputedFieldsBulk(userIds);

  let withComputed = rows.map((user) => {
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
    };
  });

  // Status filter is applied after computing membership_status, since it's derived, not a stored column.
  if (status) {
    withComputed = withComputed.filter((u) => u.membership_status === status);
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
  return getById(userId);
}

async function exportToCsv({ search, status }) {
  const { rows } = await list({ search, status, page: 1, pageSize: 100000 });
  const headers = [
    'שם',
    'חבר עמותה',
    'טלפון',
    'דוא"ל',
    'סדנת סטודנט',
    'כמות סדנאות',
    'סדנה אחרונה',
    'גיל',
  ];
  const lines = [headers.join(',')];
  for (const u of rows) {
    lines.push(
      [
        u.full_name,
        u.membership_status,
        u.phone || '',
        u.email,
        u.student_workshop ?? '',
        u.assist_count,
        u.last_workshop ?? '',
        u.age ?? '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
  }
  return lines.join('\n');
}

module.exports = { getById, list, updateSelf, updateAsAdmin, exportToCsv };
