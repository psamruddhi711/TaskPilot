const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TaskEstimate = sequelize.define('TaskEstimate', {
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
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  baseline_hours: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  adjusted_effort_hours: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  available_hours_per_day: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  estimated_duration_days: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  estimation_method: {
    type: DataTypes.STRING,
    defaultValue: 'skill_complexity_model'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'task_estimates',
  timestamps: false
});

module.exports = TaskEstimate;
