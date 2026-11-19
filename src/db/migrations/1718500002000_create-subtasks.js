exports.up = (pgm) => {
  // Add parent_id column to tasks for subtask relationships
  pgm.addColumn('tasks', {
    parent_id: {
      type: 'integer',
      references: '"tasks"',
      onDelete: 'cascade',
      onUpdate: 'cascade',
    },
    position: {
      type: 'integer',
      default: 0,
    },
  });

  // Create index for faster parent lookups
  pgm.createIndex('tasks', 'parent_id');
  pgm.createIndex('tasks', ['parent_id', 'position']);
};

exports.down = (pgm) => {
  pgm.dropIndex('tasks', 'parent_id');
  pgm.dropIndex('tasks', ['parent_id', 'position']);
  pgm.dropColumn('tasks', 'parent_id');
  pgm.dropColumn('tasks', 'position');
};
