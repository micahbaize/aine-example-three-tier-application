exports.up = (pgm) => {
  // Self-referential parent link. Deleting a parent cascades to all descendants.
  pgm.addColumn('tasks', {
    parent_id: {
      type: 'integer',
      references: { name: 'tasks', field: 'id' },
      onDelete: 'cascade',
    },
  });

  // Ordering among siblings that share the same parent_id.
  pgm.addColumn('tasks', {
    position: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.createIndex('tasks', 'parent_id');
  pgm.createIndex('tasks', ['parent_id', 'position']);
};

exports.down = (pgm) => {
  pgm.dropIndex('tasks', ['parent_id', 'position']);
  pgm.dropIndex('tasks', 'parent_id');
  pgm.dropColumn('tasks', 'position');
  pgm.dropColumn('tasks', 'parent_id');
};
