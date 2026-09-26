const express = require('express');
const router = express.Router();
const { getUsers } = require('../controllers/userController');
const { getUserHandoffs } = require('../controllers/decisionController');
const { getUserSkills, setUserSkills } = require('../controllers/skillController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/users - List users
router.get('/', getUsers);

// GET /api/users/me/handoffs - List handoffs for logged in user
router.get('/me/handoffs', getUserHandoffs);

// GET/POST /api/users/:id/skills - User skill matrix
router.get('/:id/skills', getUserSkills);
router.post('/:id/skills', setUserSkills);

module.exports = router;
