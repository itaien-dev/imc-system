const { parse } = require('csv-parse/sync');
const db = require('../../db/connection');

const GENDER_MAP = { זכר: 'male', נקבה: 'female', male: 'male', female: 'female' };

function parseCsvBuffer(buffer) {
  return parse(buffer.toString('utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    quote: null, // disable quote handling — Hebrew headers like דוא"ל contain a literal quote mark
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
      const full_name = r['שם'] || r.full_name || '';
      const email = (r['דוא"ל'] || r.email || '').trim();
      const phone = r['טלפון'] || r.phone || '';
      const genderRaw = r['מגדר'] || r.gender || '';

      if (!full_name) warnings.push('שם חסר');
      if (!email) warnings.push('דוא"ל חסר — שורה לא ניתנת לייבוא');
      if (!phone) warnings.push('טלפון חסר');
      if (genderRaw && !GENDER_MAP[genderRaw]) warnings.push(`ערך מגדר לא מוכר: "${genderRaw}"`);

      const willUpdate = email && existingEmails.has(email.toLowerCase());
      if (email && seenInFile.has(email.toLowerCase())) {
        warnings.push('דוא"ל כפול בתוך הקובץ עצמו');
      }
      if (email) seenInFile.add(email.toLowerCase());

      return {
        rowNumber: index + 2, // +1 header, +1 to make it 1-indexed for humans
        full_name,
        email,
        phone,
        gender: GENDER_MAP[genderRaw] || null,
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
    if (existing) {
      await db('users')
        .where('id', existing.id)
        .update({
          full_name: row.full_name || existing.full_name,
          phone: row.phone || existing.phone,
          gender: row.gender || existing.gender,
        });
      updated += 1;
    } else {
      await db('users').insert({
        full_name: row.full_name,
        email: row.email,
        phone: row.phone || null,
        gender: row.gender || null,
      });
      created += 1;
    }
  }
  return { created, updated };
}

function previewWorkshops(buffer) {
  const records = parseCsvBuffer(buffer);
  return db('workshops')
    .select('workshop_number')
    .then((existing) => {
      const existingNumbers = new Set(existing.map((r) => r.workshop_number));

      return records.map((r, index) => {
        const warnings = [];
        const workshop_number = Number(r['מספר סדנה'] || r.workshop_number);
        const cycle_number = Number(r['מספר סבב'] || r.cycle_number);
        const start_date = r['תאריך תחילה'] || r.start_date;
        const end_date = r['תאריך סיום'] || r.end_date;
        const publish_start_date = r['תאריך תחילת פרסום'] || r.publish_start_date;
        const publish_end_date = r['תאריך תום פרסום'] || r.publish_end_date;
        const track = r['שיוך'] || r.track || 'general';

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
      workshop_number: row.workshop_number,
      cycle_number: row.cycle_number,
      track: row.track,
      start_date: row.start_date,
      end_date: row.end_date,
      publish_start_date: row.publish_start_date,
      publish_end_date: row.publish_end_date,
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
