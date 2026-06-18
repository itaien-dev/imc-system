exports.up = function (knex) {
  return knex.schema.createTable('workshop_signups', (table) => {
    table.increments('id').primary();
    table.integer('workshop_id').notNullable().references('id').inTable('workshops').onDelete('CASCADE');
    table.string('full_name', 200).notNullable();
    table.string('email', 255).notNullable();
    table.string('phone', 20).nullable();
    table.string('requested_role', 20).notNullable();
    table.timestamp('submitted_at').notNullable().defaultTo(knex.fn.now());
    table.boolean('processed').notNullable().defaultTo(false);

    table.check("requested_role IN ('student','assistant')", [], 'workshop_signups_role_check');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('workshop_signups');
};
