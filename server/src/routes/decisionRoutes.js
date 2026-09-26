const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getDecisionById,
  updateHandoffStatus
} = require('../controllers/decisionController');

router.use(authenticateToken);

// GET /api/decisions/:id - Get single decision log details
router.get('/:id', getDecisionById);

// PATCH /api/decisions/:id/handoff - Update handoff status
router.patch('/:id/handoff', updateHandoffStatus);

module.exports = router;
