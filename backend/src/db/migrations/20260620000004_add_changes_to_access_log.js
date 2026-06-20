exports.up = function (knex) {
  return knex.schema.alterTable('access_log', (table) => {
    table.jsonb('changes').nullable().defaultTo(null);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('access_log', (table) => {
    table.dropColumn('changes');
  });
};
