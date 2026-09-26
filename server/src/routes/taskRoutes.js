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
const {
  createTaskBlocker,
  getTaskImpact
} = require('../controllers/blockerController');
const {
  createTaskDecision,
  getTaskDecisions
} = require('../controllers/decisionController');
const {
  getTaskRequiredSkills,
  setTaskRequiredSkills
} = require('../controllers/skillController');
const {
  computeTaskRecommendations,
  getTaskRecommendations,
  previewTaskEstimate,
  assignTaskWithEstimate
} = require('../controllers/recommendationController');
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

// Status & Assignment endpoints
router.patch('/:id/status', updateTaskStatus);
router.patch('/:id/assign', assignTask);
router.post('/:id/assign', assignTaskWithEstimate);

// Task Dependencies endpoints
router.get('/:id/dependencies', getTaskDependencies);
router.post('/:id/dependencies', addDependency);
router.delete('/:id/dependencies/:dependsOnTaskId', removeDependency);

// Task Blocker & Impact endpoints
router.post('/:id/blockers', createTaskBlocker);
router.get('/:id/impact', getTaskImpact);

// Task Decision Log endpoints
router.post('/:id/decisions', createTaskDecision);
router.get('/:id/decisions', getTaskDecisions);

// Task Required Skills endpoints
router.get('/:id/required-skills', getTaskRequiredSkills);
router.post('/:id/required-skills', setTaskRequiredSkills);

// Task Recommendations & Estimates endpoints
router.get('/:id/recommendations', getTaskRecommendations);
router.post('/:id/recommendations', computeTaskRecommendations);
router.post('/:id/estimate', previewTaskEstimate);

module.exports = router;
