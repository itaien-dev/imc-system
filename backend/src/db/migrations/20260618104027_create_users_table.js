exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('full_name', 200).notNullable();
    table.string('national_id', 9).nullable();
    table.date('birth_date').nullable();
    table.string('phone', 20).nullable();
    table.string('email', 255).notNullable().unique();
    table.string('address', 255).nullable();
    table.string('gender', 10).nullable();
    table.date('membership_expiry_date').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.text('notes').nullable();
    table.string('password_hash', 255).nullable();
    table.string('role', 20).notNullable().defaultTo('member');

    table.check("gender IN ('male','female')", [], 'users_gender_check');
    table.check("role IN ('member','admin')", [], 'users_role_check');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
