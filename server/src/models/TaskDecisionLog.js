const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TaskDecisionLog = sequelize.define('TaskDecisionLog', {
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
  decision_type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g. reassignment, deadline_change, priority_change, description_change, dependency_change, blocker_resolution, status_change, manual_decision'
  },
  change_summary: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  previous_value: {
    type: DataTypes.JSON,
    allowNull: true
  },
  new_value: {
    type: DataTypes.JSON,
    allowNull: true
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  decided_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  decided_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  next_action: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  next_owner_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  next_action_due_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  handoff_status: {
    type: DataTypes.ENUM('pending', 'accepted', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'task_decision_logs',
  timestamps: false
});

module.exports = TaskDecisionLog;
