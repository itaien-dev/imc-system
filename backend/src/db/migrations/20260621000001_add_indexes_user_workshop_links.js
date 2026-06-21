exports.up = function (knex) {
  return knex.schema.alterTable('user_workshop_links', (table) => {
    table.index(['user_id', 'role'], 'idx_uwl_user_role');
    table.index(['workshop_id', 'role'], 'idx_uwl_workshop_role');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('user_workshop_links', (table) => {
    table.dropIndex(['user_id', 'role'], 'idx_uwl_user_role');
    table.dropIndex(['workshop_id', 'role'], 'idx_uwl_workshop_role');
  });
};
