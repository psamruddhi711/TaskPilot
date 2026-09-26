const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember
} = require('../controllers/projectController');
const { getProjectTasks } = require('../controllers/taskController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All project routes require authentication
router.use(authenticateToken);

// Project Collection Endpoints
router.get('/', getProjects);
router.post('/', authorizeRoles('Admin', 'Project Manager'), createProject);

// Single Project Endpoints
router.get('/:id', getProjectById);
router.put('/:id', authorizeRoles('Admin', 'Project Manager'), updateProject);
router.delete('/:id', authorizeRoles('Admin', 'Project Manager'), deleteProject);

// Project Members Endpoints
router.get('/:id/members', getProjectMembers);
router.post('/:id/members', authorizeRoles('Admin', 'Project Manager'), addProjectMember);
router.delete('/:id/members/:userId', authorizeRoles('Admin', 'Project Manager'), removeProjectMember);

// Project Tasks Endpoint
router.get('/:id/tasks', getProjectTasks);

module.exports = router;
