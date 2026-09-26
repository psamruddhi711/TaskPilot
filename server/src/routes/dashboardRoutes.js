const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getDashboardSummary } = require('../controllers/dashboardController');

// All dashboard endpoints require authentication
router.use(authenticateToken);

// GET /api/dashboard/summary (with optional ?projectId=)
router.get('/summary', getDashboardSummary);

// GET /api/dashboard/:projectId/summary
router.get('/:projectId/summary', getDashboardSummary);

module.exports = router;
