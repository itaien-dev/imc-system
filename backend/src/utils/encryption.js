const db = require('../db/connection');

/**
 * Encrypted-field helpers for sensitive PII (currently: national_id).
 * Uses PostgreSQL pgcrypto (pgp_sym_encrypt/decrypt) with a server-side key
 * from DB_ENCRYPTION_KEY — the key never lives in application code or in the DB.
 *
 * IMPORTANT: DB_ENCRYPTION_KEY must be set in every environment (Render, local .env)
 * and backed up securely (e.g. password manager). Losing the key makes all
 * encrypted national_id values permanently unrecoverable.
 */

function encryptedColumn(rawColumnExpr = 'national_id') {
  return db.raw(
    `CASE WHEN ${rawColumnExpr} IS NULL THEN NULL
     ELSE pgp_sym_decrypt(${rawColumnExpr}, ?)::text END as national_id`,
    [process.env.DB_ENCRYPTION_KEY]
  );
}

function encryptValue(plainValue) {
  if (!plainValue) return null;
  return db.raw('pgp_sym_encrypt(?, ?)', [plainValue, process.env.DB_ENCRYPTION_KEY]);
}

module.exports = { encryptedColumn, encryptValue };
