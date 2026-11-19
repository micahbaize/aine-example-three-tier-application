exports.up = (pgm) => {
  // Create projects table
  pgm.createTable('projects', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    color: { type: 'varchar(7)', default: '#3b82f6' }, // hex color code
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  // Add project_id column to tasks table with foreign key
  pgm.addColumn('tasks', {
    project_id: {
      type: 'integer',
      references: { name: 'projects', field: 'id' },
      onDelete: 'cascade',
    },
  });
};

exports.down = (pgm) => {
  // Remove project_id column from tasks
  pgm.dropColumn('tasks', 'project_id');
  
  // Drop projects table
  pgm.dropTable('projects');
};
