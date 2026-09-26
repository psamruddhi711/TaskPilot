const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TaskDependency = sequelize.define('TaskDependency', {
  task_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'tasks',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  depends_on_task_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'tasks',
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'task_dependencies',
  timestamps: false
});

module.exports = TaskDependency;
