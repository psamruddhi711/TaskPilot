const { sequelize } = require('../config/db');
const User = require('./User');
const Project = require('./Project');
const ProjectMember = require('./ProjectMember');

// Associations

// Project Manager Relationship
Project.belongsTo(User, {
  as: 'manager',
  foreignKey: 'manager_id'
});

User.hasMany(Project, {
  as: 'managedProjects',
  foreignKey: 'manager_id'
});

// Project Members (Many-to-Many through ProjectMember)
Project.belongsToMany(User, {
  through: ProjectMember,
  as: 'members',
  foreignKey: 'project_id',
  otherKey: 'user_id'
});

User.belongsToMany(Project, {
  through: ProjectMember,
  as: 'projects',
  foreignKey: 'user_id',
  otherKey: 'project_id'
});

// Direct join table associations for detailed queries
Project.hasMany(ProjectMember, {
  as: 'projectMembers',
  foreignKey: 'project_id'
});

ProjectMember.belongsTo(Project, {
  foreignKey: 'project_id'
});

ProjectMember.belongsTo(User, {
  as: 'user',
  foreignKey: 'user_id'
});

module.exports = {
  sequelize,
  User,
  Project,
  ProjectMember
};
