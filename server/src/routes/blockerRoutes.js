const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getBlockers, resolveBlocker } = require('../controllers/blockerController');

router.use(authenticateToken);

// GET /api/blockers - List active and escalated blockers
router.get('/', getBlockers);

// PATCH /api/blockers/:id/resolve - Resolve a blocker
router.patch('/:id/resolve', resolveBlocker);

module.exports = router;
