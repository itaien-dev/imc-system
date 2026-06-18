const bcrypt = require('bcrypt');

exports.seed = async function (knex) {
  // Clean slate (respect FK order)
  await knex('workshop_signups').del();
  await knex('user_recruitments').del();
  await knex('user_workshop_links').del();
  await knex('workshops').del();
  await knex('users').del();

  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const memberPasswordHash = await bcrypt.hash('member123', 10);

  const [admin] = await knex('users')
    .insert({
      full_name: 'מנהל מערכת',
      email: 'admin@imc.org.il',
      phone: '050-0000000',
      role: 'admin',
      password_hash: adminPasswordHash,
    })
    .returning('*');

  const [dana, yossi, maya, ron] = await knex('users')
    .insert([
      {
        full_name: 'דנה כהן',
        email: 'dana@mail.com',
        phone: '050-1234567',
        birth_date: '1992-03-14',
        gender: 'female',
        address: 'הרצל 12, תל אביב',
        membership_expiry_date: '2026-12-31',
        password_hash: memberPasswordHash,
      },
      {
        full_name: 'יוסי לוי',
        email: 'yossi@mail.com',
        phone: '052-7654321',
        birth_date: '1996-07-02',
        gender: 'male',
        password_hash: memberPasswordHash,
      },
      {
        full_name: 'מאיה אברהם',
        email: 'maya@mail.com',
        phone: '054-1112223',
        birth_date: '1984-11-20',
        gender: 'female',
        membership_expiry_date: '2025-01-01', // expired on purpose
        password_hash: memberPasswordHash,
      },
      {
        full_name: 'רון שרון',
        email: 'ron@mail.com',
        phone: '053-9998887',
        birth_date: '2000-05-09',
        gender: 'male',
        password_hash: memberPasswordHash,
      },
    ])
    .returning('*');

  const [ws39, ws42, ws44] = await knex('workshops')
    .insert([
      {
        workshop_number: 39,
        cycle_number: 13,
        track: 'adults',
        start_date: '2025-03-01',
        end_date: '2025-03-03',
        publish_start_date: '2025-01-01',
        publish_end_date: '2025-02-20',
        feedback_date: '2025-03-15',
        email: 'workshop39@imc.org.il',
      },
      {
        workshop_number: 42,
        cycle_number: 14,
        track: 'adults',
        start_date: '2025-11-01',
        end_date: '2025-11-03',
        publish_start_date: '2025-09-01',
        publish_end_date: '2025-10-20',
        feedback_date: '2025-11-15',
        email: 'workshop42@imc.org.il',
      },
      {
        workshop_number: 44,
        cycle_number: 14,
        track: 'adults',
        start_date: '2026-06-25',
        end_date: '2026-06-27',
        // Deliberately published "today" so it shows on the public home page in dev
        publish_start_date: '2026-05-01',
        publish_end_date: '2026-12-31',
        feedback_date: '2026-07-12',
        email: 'workshop44@imc.org.il',
      },
    ])
    .returning('*');

  await knex('user_workshop_links').insert([
    // Dana: student in workshop 39, then assistant several times since (member, 3+ assists -> "זכאי" demo if expiry removed)
    { user_id: dana.id, workshop_id: ws39.id, role: 'student', attended: true },
    { user_id: dana.id, workshop_id: ws42.id, role: 'assistant', attended: true },

    // Yossi: assistant only, first time in ws44 (no prior assistant rows) -> "אסיסט ראשון"
    { user_id: yossi.id, workshop_id: ws44.id, role: 'assistant', attended: null },

    // Maya: assistant a while back, none recently -> "לא השתתף מעל שנה" candidate for ws44
    { user_id: maya.id, workshop_id: ws39.id, role: 'assistant', attended: true },

    // Ron: coordinator on ws44 (staff, not student/assistant)
    { user_id: ron.id, workshop_id: ws44.id, role: 'coordinator', attended: null },
  ]);

  // Dana recruited Maya in the last year -> demonstrates "מגייסים" criterion for Maya in a future workshop
  await knex('user_recruitments').insert([
    { recruiter_id: dana.id, recruit_id: maya.id, recruited_at: knex.fn.now() },
  ]);

  // A pending public signup for workshop 44, not yet processed
  await knex('workshop_signups').insert([
    {
      workshop_id: ws44.id,
      full_name: 'רן אשכנזי',
      email: 'ran.ashkenazi@mail.com',
      phone: '058-1231231',
      requested_role: 'student',
      processed: false,
    },
  ]);

  console.log('Seed complete. Admin login: admin@imc.org.il / admin123');
};
