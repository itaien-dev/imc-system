exports.up = function (knex) {
  return knex.schema.createTable('user_recruitments', (table) => {
    table.increments('id').primary();
    table.integer('recruiter_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('recruit_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('recruited_at').notNullable().defaultTo(knex.fn.now());

    table.check('recruiter_id <> recruit_id', [], 'user_recruitments_no_self_recruit_check');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('user_recruitments');
};
