const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EscalationEvent = sequelize.define('EscalationEvent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  blocker_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'task_blockers',
      key: 'id'
    }
  },
  event_type: {
    type: DataTypes.ENUM('notified', 'escalated'),
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'escalation_events',
  timestamps: false
});

module.exports = EscalationEvent;
