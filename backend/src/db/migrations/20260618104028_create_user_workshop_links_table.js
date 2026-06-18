exports.up = function (knex) {
  return knex.schema.createTable('user_workshop_links', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('workshop_id').notNullable().references('id').inTable('workshops').onDelete('CASCADE');
    table.string('role', 20).notNullable();
    table.timestamp('registered_at').notNullable().defaultTo(knex.fn.now());
    table.boolean('attended').nullable();

    table.check(
      "role IN ('student','assistant','coordinator','dj','facilitator','translator','chaperone')",
      [],
      'user_workshop_links_role_check'
    );
    table.unique(['user_id', 'workshop_id', 'role'], { indexName: 'user_workshop_links_unique' });
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('user_workshop_links');
};
