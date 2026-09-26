const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ProjectMember = sequelize.define('ProjectMember', {
  project_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  project_role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Member'
  }
}, {
  tableName: 'project_members',
  timestamps: false
});

module.exports = ProjectMember;
