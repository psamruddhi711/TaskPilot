const express = require('express');
const router = express.Router();
const { getUsers } = require('../controllers/userController');
const { getUserHandoffs } = require('../controllers/decisionController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/users - List users
router.get('/', getUsers);

// GET /api/users/me/handoffs - List handoffs for logged in user
router.get('/me/handoffs', getUserHandoffs);

module.exports = router;
