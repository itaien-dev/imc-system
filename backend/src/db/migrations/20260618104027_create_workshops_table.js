exports.up = function (knex) {
  return knex.schema.createTable('workshops', (table) => {
    table.increments('id').primary();
    table.integer('workshop_number').notNullable().unique();
    table.integer('cycle_number').notNullable();
    table.string('track', 20).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.date('publish_start_date').notNullable();
    table.date('publish_end_date').notNullable();
    table.date('feedback_date').nullable();
    table.string('email', 255).nullable();
    table.text('notes').nullable();

    table.check("track IN ('adults','youth','general')", [], 'workshops_track_check');
    table.check('publish_start_date <= publish_end_date', [], 'workshops_publish_dates_check');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('workshops');
};
