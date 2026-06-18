// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  // Zod throws a ZodError (name === 'ZodError') when .parse() rejects input — this affects
  // every route that validates req.body with schema.parse(), so it's handled once, centrally,
  // rather than risk forgetting it in some routes and not others.
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'נתונים לא תקינים', details: err.issues });
  }

  if (err.code === '23505') {
    // Postgres unique_violation — give a specific message for constraints we know about,
    // since "duplicate value" alone doesn't tell the person which field to fix.
    if (err.constraint === 'users_email_unique') {
      return res.status(409).json({ error: 'כתובת הדוא"ל הזו רשומה במערכת על משתמש אחר' });
    }
    if (err.constraint === 'workshops_workshop_number_unique') {
      return res.status(409).json({ error: 'מספר סדנה זה כבר קיים במערכת' });
    }
    return res.status(409).json({ error: 'Duplicate value violates a unique constraint' });
  }
  if (err.code === '23503') {
    // Postgres foreign_key_violation
    return res.status(400).json({ error: 'Referenced record does not exist' });
  }
  if (err.code === '23514') {
    // Postgres check_violation
    return res.status(400).json({ error: 'Value violates a check constraint', detail: err.detail });
  }

  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = errorHandler;
