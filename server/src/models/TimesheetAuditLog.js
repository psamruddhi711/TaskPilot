const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TimesheetAuditLog = sequelize.define('TimesheetAuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  timesheet_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'timesheets',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  action: {
    type: DataTypes.ENUM('CREATED', 'SAVED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RESUBMITTED'),
    allowNull: false
  },
  actor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'timesheet_audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      fields: ['timesheet_id']
    }
  ]
});

module.exports = TimesheetAuditLog;
