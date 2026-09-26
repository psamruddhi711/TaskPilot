const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TaskRecommendation = sequelize.define('TaskRecommendation', {
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
  skill_match_score: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  capacity_score: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  experience_score: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  total_score: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  matched_skills: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  missing_skills: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  estimated_effort_hours: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  estimated_duration_days: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'task_recommendations',
  timestamps: false
});

module.exports = TaskRecommendation;
