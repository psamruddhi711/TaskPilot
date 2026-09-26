const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TaskRequiredSkill = sequelize.define('TaskRequiredSkill', {
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
  skill_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'skills',
      key: 'id'
    }
  },
  minimum_proficiency: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 5
    }
  },
  is_mandatory: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'task_required_skills',
  timestamps: false
});

module.exports = TaskRequiredSkill;
