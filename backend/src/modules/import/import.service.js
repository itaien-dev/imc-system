const { parse } = require('csv-parse/sync');
const db = require('../../db/connection');

const GENDER_MAP = { זכר: 'male', נקבה: 'female', male: 'male', female: 'female' };

function parseCsvBuffer(buffer) {
  return parse(buffer.toString('utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
}

/** Validates parsed user rows and reports per-row warnings without writing to the DB. */
function previewUsers(buffer) {
  const records = parseCsvBuffer(buffer);
  const existingEmailsPromise = db('users').select('email');

  return existingEmailsPromise.then((existing) => {
    const existingEmails = new Set(existing.map((r) => r.email.toLowerCase()));
    const seenInFile = new Set();

    const rows = records.map((r, index) => {
      const warnings = [];
      const full_name       = r['full_name']        || r['שם מלא']         || '';
      const email           = (r['email']            || r['דוא"ל']          || '').trim();
      const phone           = r['phone']             || r['טלפון']          || '';
      const genderRaw       = r['gender']            || r['מגדר']           || '';
      const city            = r['city']              || r['עיר']            || '';
      const birth_date      = r['birth_date']        || r['תאריך לידה']     || '';
      const category        = r['category']          || r['קטגוריה']        || '';
      const student_workshop  = r['student_workshop']  || r['סדנת סטודנט']  || '';
      const assist_workshops  = r['assist_workshops']  || r['סדנאות אסיסט'] || '';
      const national_id       = r['national_id']       || r['ת״ז']            || '';
      const recruiter_email     = r['recruiter_email']   || '';
      const membership_expiry   = r['membership_expiry'] || '';

      if (!full_name) warnings.push('שם חסר');
      if (!email) warnings.push('דוא"ל חסר — שורה לא ניתנת לייבוא');
      if (!phone) warnings.push('טלפון חסר');
      if (genderRaw && !GENDER_MAP[genderRaw]) warnings.push(`ערך מגדר לא מוכר: "${genderRaw}"`);
      if (!student_workshop) warnings.push('סדנת סטודנט חסרה');

      const willUpdate = email && existingEmails.has(email.toLowerCase());
      if (email && seenInFile.has(email.toLowerCase())) {
        warnings.push('דוא"ל כפול בתוך הקובץ עצמו');
      }
      if (email) seenInFile.add(email.toLowerCase());

      return {
        rowNumber: index + 2,
        full_name,
        email,
        phone,
        gender: GENDER_MAP[genderRaw] || null,
        city,
        birth_date: birth_date || null,
        category,
        student_workshop,
        assist_workshops,
        national_id,
        recruiter_email,
        membership_expiry,
        warnings,
        action: !email ? 'skip' : willUpdate ? 'update' : 'create',
      };
    });

    return rows;
  });
}

async function commitUsers(rows) {
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    if (row.action === 'skip' || !row.email) continue;

    const existing = await db('users').where('email', row.email).first();

    const userPayload = {
      full_name:   row.full_name  || undefined,
      phone:       row.phone      || null,
      gender:      row.gender     || null,
      address:     row.city        || null,
      birth_date:  row.birth_date  || null,
      notes:       row.category    || null,
      national_id:            row.national_id       || null,
      membership_expiry_date: row.membership_expiry || null,
    };

    let userId;
    if (existing) {
      // Only overwrite non-empty values
      const updatePayload = Object.fromEntries(
        Object.entries(userPayload).filter(([, v]) => v !== undefined)
      );
      await db('users').where('id', existing.id).update(updatePayload);
      userId = existing.id;
      updated += 1;
    } else {
      const [insertedId] = await db('users')
        .insert({ ...userPayload, email: row.email, full_name: row.full_name })
        .returning('id');
      userId = insertedId?.id ?? insertedId;
      created += 1;
    }

    // Link recruiter if provided
    if (row.recruiter_email) {
      const recruiter = await db('users').where('email', row.recruiter_email.toLowerCase().trim()).first();
      if (recruiter) {
        const existingLink = await db('user_recruitments')
          .where({ recruiter_id: recruiter.id, recruit_id: userId })
          .first();
        if (!existingLink) {
          await db('user_recruitments').insert({ recruiter_id: recruiter.id, recruit_id: userId });
        }
      }
    }

    // Upsert student workshop link
    if (row.student_workshop) {
      await upsertWorkshopLink(userId, row.student_workshop, 'student');
    }

    // Upsert assistant workshop links
    if (row.assist_workshops) {
      const assistList = row.assist_workshops.split(',').map((s) => s.trim()).filter(Boolean);
      for (const wsCode of assistList) {
        await upsertWorkshopLink(userId, wsCode, 'assistant');
      }
    }
  }

  return { created, updated };
}

/** Find or create a workshop by its code (e.g. "IMC321"), then upsert the link. */
async function upsertWorkshopLink(userId, workshopCode, role) {
  // Extract numeric part: "IMC321" → 321
  const match = workshopCode.match(/(\d+)/);
  if (!match) return;
  const workshopNumber = parseInt(match[1], 10);

  let workshop = await db('workshops').where('workshop_number', workshopNumber).first();
  if (!workshop) {
    const [inserted] = await db('workshops')
      .insert({ workshop_number: workshopNumber, cycle_number: 0, track: 'IMC' })
      .returning('id');
    workshop = { id: inserted?.id ?? inserted };
  }

  const existing = await db('user_workshop_links')
    .where({ user_id: userId, workshop_id: workshop.id, role })
    .first();

  if (!existing) {
    await db('user_workshop_links').insert({
      user_id: userId,
      workshop_id: workshop.id,
      role,
    });
  }
}

function previewWorkshops(buffer) {
  const records = parseCsvBuffer(buffer);
  return db('workshops')
    .select('workshop_number')
    .then((existing) => {
      const existingNumbers = new Set(existing.map((r) => r.workshop_number));

      return records.map((r, index) => {
        const warnings = [];
        const workshop_number     = Number(r['מספר סדנה']          || r.workshop_number);
        const cycle_number        = Number(r['מספר סבב']           || r.cycle_number);
        const start_date          = r['תאריך תחילה']               || r.start_date;
        const end_date            = r['תאריך סיום']                || r.end_date;
        const publish_start_date  = r['תאריך תחילת פרסום']        || r.publish_start_date;
        const publish_end_date    = r['תאריך תום פרסום']          || r.publish_end_date;
        const track               = r['שיוך']                      || r.track || 'general';

        if (!workshop_number) warnings.push('מספר סדנה חסר או לא תקין — שורה לא ניתנת לייבוא');
        if (!start_date || !end_date) warnings.push('תאריכי התחלה/סיום חסרים');
        if (!publish_start_date || !publish_end_date) warnings.push('תאריכי פרסום חסרים');

        const willUpdate = workshop_number && existingNumbers.has(workshop_number);

        return {
          rowNumber: index + 2,
          workshop_number,
          cycle_number,
          track,
          start_date,
          end_date,
          publish_start_date,
          publish_end_date,
          warnings,
          action: !workshop_number ? 'skip' : willUpdate ? 'update' : 'create',
        };
      });
    });
}

async function commitWorkshops(rows) {
  let created = 0;
  let updated = 0;
  for (const row of rows) {
    if (row.action === 'skip') continue;
    const existing = await db('workshops').where('workshop_number', row.workshop_number).first();
    const payload = {
      workshop_number:    row.workshop_number,
      cycle_number:       row.cycle_number,
      track:              row.track,
      start_date:         row.start_date,
      end_date:           row.end_date,
      publish_start_date: row.publish_start_date,
      publish_end_date:   row.publish_end_date,
    };
    if (existing) {
      await db('workshops').where('id', existing.id).update(payload);
      updated += 1;
    } else {
      await db('workshops').insert(payload);
      created += 1;
    }
  }
  return { created, updated };
}

module.exports = { previewUsers, commitUsers, previewWorkshops, commitWorkshops };
