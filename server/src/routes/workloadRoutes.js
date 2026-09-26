const express = require('express');
const router = express.Router();
const {
  getProjectWorkload,
  getWorkloadSuggestions
} = require('../controllers/workloadController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Workload metrics and suggestions
router.get('/:projectId/suggestions', getWorkloadSuggestions);
router.get('/:projectId', getProjectWorkload);

module.exports = router;
