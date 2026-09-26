const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);

// Protected endpoints
router.get('/me', authenticateToken, getMe);

// Example role-protected endpoints verifying middleware functionality
router.get('/admin-only', authenticateToken, authorizeRoles('Admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Welcome Admin! You have access to restricted administrative settings.',
    user: req.user
  });
});

router.get('/manager-only', authenticateToken, authorizeRoles('Admin', 'Project Manager'), (req, res) => {
  res.json({
    success: true,
    message: 'Welcome Manager! You have access to project management controls.',
    user: req.user
  });
});

module.exports = router;
