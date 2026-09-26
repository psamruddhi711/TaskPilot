const { sequelize } = require('../config/db');
const User = require('./User');
const Project = require('./Project');
const ProjectMember = require('./ProjectMember');
const Task = require('./Task');
const TaskDependency = require('./TaskDependency');
const TaskBlocker = require('./TaskBlocker');
const EscalationEvent = require('./EscalationEvent');
const Notification = require('./Notification');
const TaskDecisionLog = require('./TaskDecisionLog');
const Skill = require('./Skill');
const UserSkill = require('./UserSkill');
const TaskRequiredSkill = require('./TaskRequiredSkill');
const TaskEstimate = require('./TaskEstimate');
const TaskRecommendation = require('./TaskRecommendation');

// ==========================================
// User & Project Associations
// ==========================================
Project.belongsTo(User, {
  as: 'manager',
  foreignKey: 'manager_id'
});

User.hasMany(Project, {
  as: 'managedProjects',
  foreignKey: 'manager_id'
});

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

// ==========================================
// Task Associations
// ==========================================
Task.belongsTo(Project, {
  as: 'project',
  foreignKey: 'project_id'
});

Project.hasMany(Task, {
  as: 'tasks',
  foreignKey: 'project_id'
});

Task.belongsTo(User, {
  as: 'assignee',
  foreignKey: 'assigned_to'
});

User.hasMany(Task, {
  as: 'assignedTasks',
  foreignKey: 'assigned_to'
});

Task.belongsTo(User, {
  as: 'creator',
  foreignKey: 'created_by'
});

User.hasMany(Task, {
  as: 'createdTasks',
  foreignKey: 'created_by'
});

// ==========================================
// Task Dependency Associations
// ==========================================
Task.belongsToMany(Task, {
  through: TaskDependency,
  as: 'predecessors',
  foreignKey: 'task_id',
  otherKey: 'depends_on_task_id'
});

Task.belongsToMany(Task, {
  through: TaskDependency,
  as: 'dependents',
  foreignKey: 'depends_on_task_id',
  otherKey: 'task_id'
});

Task.hasMany(TaskDependency, {
  as: 'dependenciesAsDependent',
  foreignKey: 'task_id'
});

Task.hasMany(TaskDependency, {
  as: 'dependenciesAsPredecessor',
  foreignKey: 'depends_on_task_id'
});

TaskDependency.belongsTo(Task, {
  as: 'task',
  foreignKey: 'task_id'
});

TaskDependency.belongsTo(Task, {
  as: 'predecessorTask',
  foreignKey: 'depends_on_task_id'
});

// ==========================================
// Task Blocker & Escalation Associations
// ==========================================
Task.hasMany(TaskBlocker, {
  as: 'blockers',
  foreignKey: 'task_id'
});

TaskBlocker.belongsTo(Task, {
  as: 'task',
  foreignKey: 'task_id'
});

TaskBlocker.hasMany(EscalationEvent, {
  as: 'escalationEvents',
  foreignKey: 'blocker_id'
});

EscalationEvent.belongsTo(TaskBlocker, {
  as: 'blocker',
  foreignKey: 'blocker_id'
});

// ==========================================
// Notification Associations
// ==========================================
User.hasMany(Notification, {
  as: 'notifications',
  foreignKey: 'user_id'
});

Notification.belongsTo(User, {
  as: 'user',
  foreignKey: 'user_id'
});

// ==========================================
// Task Decision & Handoff Associations
// ==========================================
Task.hasMany(TaskDecisionLog, {
  as: 'decisionLogs',
  foreignKey: 'task_id'
});

TaskDecisionLog.belongsTo(Task, {
  as: 'task',
  foreignKey: 'task_id'
});

TaskDecisionLog.belongsTo(User, {
  as: 'decider',
  foreignKey: 'decided_by'
});

User.hasMany(TaskDecisionLog, {
  as: 'decisionsMade',
  foreignKey: 'decided_by'
});

TaskDecisionLog.belongsTo(User, {
  as: 'nextOwner',
  foreignKey: 'next_owner_id'
});

User.hasMany(TaskDecisionLog, {
  as: 'assignedHandoffs',
  foreignKey: 'next_owner_id'
});

// ==========================================
// Skill & Task Required Skills Associations
// ==========================================
User.belongsToMany(Skill, {
  through: UserSkill,
  as: 'skills',
  foreignKey: 'user_id',
  otherKey: 'skill_id'
});

Skill.belongsToMany(User, {
  through: UserSkill,
  as: 'users',
  foreignKey: 'skill_id',
  otherKey: 'user_id'
});

User.hasMany(UserSkill, {
  as: 'userSkills',
  foreignKey: 'user_id'
});

UserSkill.belongsTo(User, {
  as: 'user',
  foreignKey: 'user_id'
});

UserSkill.belongsTo(Skill, {
  as: 'skill',
  foreignKey: 'skill_id'
});

Skill.hasMany(UserSkill, {
  as: 'userSkills',
  foreignKey: 'skill_id'
});

Task.belongsToMany(Skill, {
  through: TaskRequiredSkill,
  as: 'requiredSkills',
  foreignKey: 'task_id',
  otherKey: 'skill_id'
});

Skill.belongsToMany(Task, {
  through: TaskRequiredSkill,
  as: 'tasks',
  foreignKey: 'skill_id',
  otherKey: 'task_id'
});

Task.hasMany(TaskRequiredSkill, {
  as: 'taskRequiredSkills',
  foreignKey: 'task_id'
});

TaskRequiredSkill.belongsTo(Task, {
  as: 'task',
  foreignKey: 'task_id'
});

TaskRequiredSkill.belongsTo(Skill, {
  as: 'skill',
  foreignKey: 'skill_id'
});

Skill.hasMany(TaskRequiredSkill, {
  as: 'taskRequiredSkills',
  foreignKey: 'skill_id'
});

// ==========================================
// Task Estimates & Recommendations Associations
// ==========================================
Task.hasMany(TaskEstimate, {
  as: 'estimates',
  foreignKey: 'task_id'
});

TaskEstimate.belongsTo(Task, {
  as: 'task',
  foreignKey: 'task_id'
});

TaskEstimate.belongsTo(User, {
  as: 'user',
  foreignKey: 'user_id'
});

User.hasMany(TaskEstimate, {
  as: 'estimates',
  foreignKey: 'user_id'
});

Task.hasMany(TaskRecommendation, {
  as: 'recommendations',
  foreignKey: 'task_id'
});

TaskRecommendation.belongsTo(Task, {
  as: 'task',
  foreignKey: 'task_id'
});

TaskRecommendation.belongsTo(User, {
  as: 'candidate',
  foreignKey: 'user_id'
});

User.hasMany(TaskRecommendation, {
  as: 'recommendations',
  foreignKey: 'user_id'
});

module.exports = {
  sequelize,
  User,
  Project,
  ProjectMember,
  Task,
  TaskDependency,
  TaskBlocker,
  EscalationEvent,
  Notification,
  TaskDecisionLog,
  Skill,
  UserSkill,
  TaskRequiredSkill,
  TaskEstimate,
  TaskRecommendation
};
