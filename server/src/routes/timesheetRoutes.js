const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  getMyTimesheet,
  getMyDailyEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  submitTimesheet,
  getApprovals,
  getTimesheetById,
  approveTimesheet,
  rejectTimesheet,
  exportExcel,
  getTaskActuals
} = require('../controllers/timesheetController');

// All timesheet routes require active authentication
router.use(authenticateToken);

// Employee Timesheet Endpoints
router.get('/my-timesheet', getMyTimesheet);
router.get('/my-entries', getMyDailyEntries);
router.post('/entries', createEntry);
router.put('/entries/:id', updateEntry);
router.delete('/entries/:id', deleteEntry);
router.post('/submit', submitTimesheet);
router.get('/export/excel', exportExcel);
router.get('/task-actuals/:taskId', getTaskActuals);

// Manager / Admin Approvals Endpoints
router.get('/approvals/list', authorizeRoles('Admin', 'Project Manager'), getApprovals);
router.post('/:id/approve', authorizeRoles('Admin', 'Project Manager'), approveTimesheet);
router.post('/:id/reject', authorizeRoles('Admin', 'Project Manager'), rejectTimesheet);

// Detail inspection endpoint
router.get('/:id', getTimesheetById);

module.exports = router;
