exports.up = (pgm) => {
  pgm.addColumn('tasks', {
    category_id: {
      type: 'integer',
      references: '"categories"(id)',
      onDelete: 'set null',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('tasks', 'category_id');
};
