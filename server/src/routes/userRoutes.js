const express = require('express');
const router = express.Router();
const { getUsers } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/', getUsers);

module.exports = router;
