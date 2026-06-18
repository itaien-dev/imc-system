// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === '23505') {
    // Postgres unique_violation
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
