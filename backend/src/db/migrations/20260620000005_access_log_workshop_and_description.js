exports.up = function (knex) {
  return knex.schema.alterTable('access_log', (table) => {
    table.integer('target_workshop_id').nullable().references('id').inTable('workshops').onDelete('SET NULL');
    table.text('description').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('access_log', (table) => {
    table.dropColumn('target_workshop_id');
    table.dropColumn('description');
  });
};
