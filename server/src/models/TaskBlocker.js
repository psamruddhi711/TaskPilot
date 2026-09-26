const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TaskBlocker = sequelize.define('TaskBlocker', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  task_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tasks',
      key: 'id'
    }
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  blocked_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('active', 'escalated', 'resolved'),
    defaultValue: 'active'
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolution_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'task_blockers',
  timestamps: false
});

module.exports = TaskBlocker;
