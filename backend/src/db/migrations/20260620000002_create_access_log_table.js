exports.up = function (knex) {
  return knex.schema.createTable('access_log', (table) => {
    table.increments('id').primary();
    table.integer('actor_user_id').references('id').inTable('users').onDelete('SET NULL');
    table.integer('target_user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('action', 20).notNullable(); // 'view' | 'update' | 'delete' | 'export'
    table.string('ip_address', 45);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['target_user_id']);
    table.index(['actor_user_id']);
    table.index(['created_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('access_log');
};
