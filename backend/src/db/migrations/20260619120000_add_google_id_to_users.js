exports.up = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.string('google_id', 255).nullable().unique();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('google_id');
  });
};
