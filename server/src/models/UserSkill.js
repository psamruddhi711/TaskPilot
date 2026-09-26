const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UserSkill = sequelize.define('UserSkill', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
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
  proficiency_level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  years_experience: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  }
}, {
  tableName: 'user_skills',
  timestamps: false
});

module.exports = UserSkill;
