/**
 * Enables pgcrypto and converts users.national_id to encrypted storage.
 * Strategy: add a new bytea column (national_id_enc), migrate existing data,
 * drop the old plaintext column, rename the new one.
 * Encryption key comes from an app-level secret (DB_ENCRYPTION_KEY env var),
 * passed as a query parameter — never hardcoded in the migration or DB.
 */
exports.up = async function (knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await knex.schema.alterTable('users', (table) => {
    table.specificType('national_id_enc', 'bytea');
  });

  await knex.raw(
    `UPDATE users
     SET national_id_enc = pgp_sym_encrypt(national_id, ?)
     WHERE national_id IS NOT NULL`,
    [process.env.DB_ENCRYPTION_KEY]
  );

  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('national_id');
  });

  await knex.schema.renameColumn('users', 'national_id_enc', 'national_id');
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.specificType('national_id_plain', 'varchar(9)');
  });

  await knex.raw(
    `UPDATE users
     SET national_id_plain = pgp_sym_decrypt(national_id, ?)
     WHERE national_id IS NOT NULL`,
    [process.env.DB_ENCRYPTION_KEY]
  );

  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('national_id');
  });

  await knex.schema.renameColumn('users', 'national_id_plain', 'national_id');
};
