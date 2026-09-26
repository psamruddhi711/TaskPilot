const express = require('express');
const router = express.Router();
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  assignTask,
  getTaskDependencies,
  addDependency,
  removeDependency,
  deleteTask
} = require('../controllers/taskController');
const { authenticateToken } = require('../middleware/auth');

// All task routes require authentication
router.use(authenticateToken);

// Collection endpoints
router.get('/', getAllTasks);
router.post('/', createTask);

// Single task endpoints
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

// Status & Assignment Patch endpoints
router.patch('/:id/status', updateTaskStatus);
router.patch('/:id/assign', assignTask);

// Task Dependencies endpoints
router.get('/:id/dependencies', getTaskDependencies);
router.post('/:id/dependencies', addDependency);
router.delete('/:id/dependencies/:dependsOnTaskId', removeDependency);

module.exports = router;
