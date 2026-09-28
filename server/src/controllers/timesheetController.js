const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const {
  sequelize,
  Timesheet,
  TimesheetEntry,
  TimesheetAuditLog,
  User,
  Project,
  Task,
  ProjectMember,
  Notification
} = require('../models');

// Month names helper
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Calculate working days (Monday-Friday) in a given month/year
 */
const getWorkingDaysInMonth = (year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }
  return workingDays;
};

/**
 * Recalculate and update timesheet total hours
 */
const recalculateTimesheetHours = async (timesheetId) => {
  const total = await TimesheetEntry.sum('hours_worked', {
    where: { timesheet_id: timesheetId }
  });
  const totalHours = total ? parseFloat(total.toFixed(2)) : 0;
  await Timesheet.update(
    { total_hours: totalHours },
    { where: { id: timesheetId } }
  );
  return totalHours;
};

/**
 * 1. Get Logged-In User's Monthly Timesheet
 */
const getMyTimesheet = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);

    // Find or create the monthly timesheet header
    let [timesheet] = await Timesheet.findOrCreate({
      where: { user_id: userId, year, month },
      defaults: {
        user_id: userId,
        year,
        month,
        status: 'Draft',
        total_hours: 0
      }
    });

    // Fetch all entries for this timesheet
    const entries = await TimesheetEntry.findAll({
      where: { timesheet_id: timesheet.id },
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status', 'manager_id']
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title', 'estimated_hours', 'priority', 'status']
        }
      ],
      order: [
        ['work_date', 'ASC'],
        ['start_time', 'ASC'],
        ['created_at', 'ASC']
      ]
    });

    // Fetch audit logs
    const auditLogs = await TimesheetAuditLog.findAll({
      where: { timesheet_id: timesheet.id },
      include: [
        {
          model: User,
          as: 'actor',
          attributes: ['id', 'name', 'email', 'role']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Compute metrics
    const totalHours = entries.reduce((sum, e) => sum + (parseFloat(e.hours_worked) || 0), 0);
    const uniqueDays = new Set(entries.map((e) => e.work_date));
    const workingDaysLogged = uniqueDays.size;
    const totalWorkingDaysInMonth = getWorkingDaysInMonth(year, month);
    
    const userCapacity = req.user.weekly_capacity_hours || 40;
    const dailyTarget = userCapacity / 5;
    const expectedMonthlyHours = Math.round(dailyTarget * totalWorkingDaysInMonth);
    const progressPercent = expectedMonthlyHours > 0
      ? Math.min(100, Math.round((totalHours / expectedMonthlyHours) * 100))
      : 0;

    // Counts
    const submittedCount = entries.filter((e) => e.status === 'Submitted').length;
    const approvedCount = entries.filter((e) => e.status === 'Approved').length;
    const draftCount = entries.filter((e) => e.status === 'Draft' || e.status === 'Rejected').length;

    // Category breakdown
    const categoryBreakdown = {};
    entries.forEach((e) => {
      const cat = e.work_category || 'Other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + parseFloat(e.hours_worked || 0);
    });

    // Project breakdown
    const projectBreakdown = {};
    entries.forEach((e) => {
      const projName = e.project?.name || `Project #${e.project_id}`;
      projectBreakdown[projName] = (projectBreakdown[projName] || 0) + parseFloat(e.hours_worked || 0);
    });

    res.status(200).json({
      success: true,
      data: {
        timesheet: {
          ...timesheet.toJSON(),
          total_hours: parseFloat(totalHours.toFixed(2)),
          month_name: MONTH_NAMES[month - 1]
        },
        entries,
        auditLogs,
        summary: {
          year,
          month,
          month_name: MONTH_NAMES[month - 1],
          total_hours: parseFloat(totalHours.toFixed(2)),
          working_days_logged: workingDaysLogged,
          total_working_days_in_month: totalWorkingDaysInMonth,
          expected_monthly_hours: expectedMonthlyHours,
          progress_percent: progressPercent,
          draft_count: draftCount,
          submitted_count: submittedCount,
          approved_count: approvedCount,
          category_breakdown: categoryBreakdown,
          project_breakdown: projectBreakdown
        }
      }
    });
  } catch (error) {
    console.error('Error fetching employee timesheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve monthly timesheet.',
      error: error.message
    });
  }
};

/**
 * 2. Get Work Log Entries for a Specific Date
 */
const getMyDailyEntries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date query parameter (YYYY-MM-DD) is required.'
      });
    }

    const entries = await TimesheetEntry.findAll({
      where: {
        user_id: userId,
        work_date: date
      },
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Task, as: 'task', attributes: ['id', 'title', 'status'] }
      ],
      order: [['start_time', 'ASC'], ['created_at', 'ASC']]
    });

    const dayTotalHours = entries.reduce((sum, e) => sum + (parseFloat(e.hours_worked) || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        date,
        total_hours: parseFloat(dayTotalHours.toFixed(2)),
        entries
      }
    });
  } catch (error) {
    console.error('Error fetching daily entries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve daily work logs.',
      error: error.message
    });
  }
};

/**
 * 3. Create Daily Work Log Entry
 */
const createEntry = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const {
      project_id,
      task_id,
      work_date,
      work_description,
      work_category,
      start_time,
      end_time,
      break_minutes = 0,
      hours_worked,
      remarks
    } = req.body;

    // Validation
    if (!project_id) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Project selection is required.' });
    }

    if (!work_date || isNaN(Date.parse(work_date))) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Valid work date is required.' });
    }

    if (!work_description || !work_description.trim()) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Work description is required.' });
    }

    // Check project authorization (user must be project member or manager or admin)
    if (req.user.role === 'Team Member') {
      const isMember = await ProjectMember.findOne({
        where: { project_id, user_id: userId }
      });
      if (!isMember) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this project.'
        });
      }
    }

    // If task_id provided, verify task belongs to project
    if (task_id) {
      const task = await Task.findOne({
        where: { id: task_id, project_id }
      });
      if (!task) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Selected task does not belong to the selected project.'
        });
      }
    }

    // Calculate or validate hours
    let computedHours = parseFloat(hours_worked);

    if (start_time && end_time) {
      const [startH, startM] = start_time.split(':').map(Number);
      const [endH, endM] = end_time.split(':').map(Number);

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (endMinutes <= startMinutes) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'End time must be greater than start time.'
        });
      }

      const netMinutes = (endMinutes - startMinutes) - (parseInt(break_minutes, 10) || 0);
      if (netMinutes <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Break duration exceeds or equals total working time.'
        });
      }

      computedHours = parseFloat((netMinutes / 60).toFixed(2));

      // Check for overlapping intervals on the same day for this user
      const existingEntries = await TimesheetEntry.findAll({
        where: {
          user_id: userId,
          work_date,
          start_time: { [Op.ne]: null },
          end_time: { [Op.ne]: null }
        }
      });

      for (const entry of existingEntries) {
        const [eStartH, eStartM] = entry.start_time.split(':').map(Number);
        const [eEndH, eEndM] = entry.end_time.split(':').map(Number);
        const eStartMin = eStartH * 60 + eStartM;
        const eEndMin = eEndH * 60 + eEndM;

        // Overlap condition: start < otherEnd && end > otherStart
        if (startMinutes < eEndMin && endMinutes > eStartMin) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Time interval (${start_time} - ${end_time}) overlaps with an existing entry (${entry.start_time} - ${entry.end_time}).`
          });
        }
      }
    }

    if (!computedHours || isNaN(computedHours) || computedHours <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Hours worked must be a positive number greater than 0.'
      });
    }

    if (computedHours > 24) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Hours worked for a single entry cannot exceed 24 hours.'
      });
    }

    // Extract year and month
    const dateObj = new Date(work_date);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;

    // Find or create monthly Timesheet header
    let [timesheet] = await Timesheet.findOrCreate({
      where: { user_id: userId, year, month },
      defaults: {
        user_id: userId,
        year,
        month,
        status: 'Draft',
        total_hours: 0
      },
      transaction
    });

    // If timesheet is Approved or Submitted, cannot add entries
    if (timesheet.status === 'Approved') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot add work logs to an already Approved monthly timesheet.'
      });
    }

    if (timesheet.status === 'Submitted') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'This timesheet is currently Submitted and pending manager review. It is locked for editing.'
      });
    }

    // Create entry
    const newEntry = await TimesheetEntry.create({
      timesheet_id: timesheet.id,
      user_id: userId,
      project_id,
      task_id: task_id || null,
      work_date,
      work_description: work_description.trim(),
      work_category: work_category || 'Development',
      start_time: start_time || null,
      end_time: end_time || null,
      break_minutes: parseInt(break_minutes, 10) || 0,
      hours_worked: computedHours,
      remarks: remarks ? remarks.trim() : null,
      status: 'Draft'
    }, { transaction });

    // If timesheet was previously Rejected, reset to Draft when new edits are made
    if (timesheet.status === 'Rejected') {
      await timesheet.update({ status: 'Draft' }, { transaction });
    }

    await transaction.commit();

    // Recalculate total hours
    const updatedTotal = await recalculateTimesheetHours(timesheet.id);

    // Fetch the created entry with associations
    const completeEntry = await TimesheetEntry.findByPk(newEntry.id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Task, as: 'task', attributes: ['id', 'title'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Work log entry recorded successfully.',
      data: {
        entry: completeEntry,
        timesheet_total_hours: updatedTotal
      }
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error creating work log entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record work log entry.',
      error: error.message
    });
  }
};

/**
 * 4. Update Work Log Entry
 */
const updateEntry = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      project_id,
      task_id,
      work_date,
      work_description,
      work_category,
      start_time,
      end_time,
      break_minutes = 0,
      hours_worked,
      remarks
    } = req.body;

    const entry = await TimesheetEntry.findByPk(id, {
      include: [{ model: Timesheet, as: 'timesheet' }]
    });

    if (!entry) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Work log entry not found.' });
    }

    if (entry.user_id !== userId && req.user.role !== 'Admin') {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'You can only edit your own work logs.' });
    }

    if (entry.timesheet.status === 'Approved') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Cannot edit entries of an Approved timesheet.' });
    }

    if (entry.timesheet.status === 'Submitted') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Timesheet is currently under manager review and locked for edits.' });
    }

    // Compute or validate hours
    let computedHours = parseFloat(hours_worked || entry.hours_worked);

    if (start_time && end_time) {
      const [startH, startM] = start_time.split(':').map(Number);
      const [endH, endM] = end_time.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (endMinutes <= startMinutes) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'End time must be greater than start time.' });
      }

      const netMinutes = (endMinutes - startMinutes) - (parseInt(break_minutes, 10) || 0);
      if (netMinutes <= 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Break duration exceeds total working time.' });
      }

      computedHours = parseFloat((netMinutes / 60).toFixed(2));
    }

    if (!computedHours || computedHours <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Hours worked must be a positive number.' });
    }

    await entry.update({
      project_id: project_id || entry.project_id,
      task_id: task_id !== undefined ? (task_id || null) : entry.task_id,
      work_date: work_date || entry.work_date,
      work_description: work_description ? work_description.trim() : entry.work_description,
      work_category: work_category || entry.work_category,
      start_time: start_time !== undefined ? (start_time || null) : entry.start_time,
      end_time: end_time !== undefined ? (end_time || null) : entry.end_time,
      break_minutes: break_minutes !== undefined ? parseInt(break_minutes, 10) : entry.break_minutes,
      hours_worked: computedHours,
      remarks: remarks !== undefined ? (remarks ? remarks.trim() : null) : entry.remarks,
      status: 'Draft'
    }, { transaction });

    // If timesheet was rejected, transition back to Draft
    if (entry.timesheet.status === 'Rejected') {
      await entry.timesheet.update({ status: 'Draft' }, { transaction });
    }

    await transaction.commit();

    const updatedTotal = await recalculateTimesheetHours(entry.timesheet_id);

    const updatedEntry = await TimesheetEntry.findByPk(entry.id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Task, as: 'task', attributes: ['id', 'title'] }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Work log entry updated successfully.',
      data: {
        entry: updatedEntry,
        timesheet_total_hours: updatedTotal
      }
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error updating work log entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update work log entry.',
      error: error.message
    });
  }
};

/**
 * 5. Delete Work Log Entry
 */
const deleteEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const entry = await TimesheetEntry.findByPk(id, {
      include: [{ model: Timesheet, as: 'timesheet' }]
    });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Work log entry not found.' });
    }

    if (entry.user_id !== userId && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'You can only delete your own work logs.' });
    }

    if (entry.timesheet.status === 'Approved') {
      return res.status(400).json({ success: false, message: 'Cannot delete entries from an Approved timesheet.' });
    }

    if (entry.timesheet.status === 'Submitted') {
      return res.status(400).json({ success: false, message: 'Timesheet is currently Submitted and locked for deletion.' });
    }

    const timesheetId = entry.timesheet_id;
    await entry.destroy();

    const updatedTotal = await recalculateTimesheetHours(timesheetId);

    res.status(200).json({
      success: true,
      message: 'Work log entry deleted successfully.',
      data: { timesheet_total_hours: updatedTotal }
    });
  } catch (error) {
    console.error('Error deleting work log entry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete work log entry.',
      error: error.message
    });
  }
};

/**
 * 6. Submit Monthly Timesheet for Manager Review
 */
const submitTimesheet = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const { year, month, submission_notes } = req.body;

    if (!year || !month) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Year and month are required.' });
    }

    const timesheet = await Timesheet.findOne({
      where: { user_id: userId, year: parseInt(year, 10), month: parseInt(month, 10) },
      include: [
        {
          model: TimesheetEntry,
          as: 'entries',
          include: [{ model: Project, as: 'project' }]
        }
      ],
      transaction
    });

    if (!timesheet || timesheet.entries.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot submit an empty timesheet. Please log work entries before submitting.'
      });
    }

    if (timesheet.status === 'Approved') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'This timesheet is already approved and locked.'
      });
    }

    if (timesheet.status === 'Submitted') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'This timesheet is already submitted and pending review.'
      });
    }

    const wasRejected = timesheet.status === 'Rejected';
    const actionType = wasRejected ? 'RESUBMITTED' : 'SUBMITTED';

    // Update Timesheet
    await timesheet.update({
      status: 'Submitted',
      submitted_at: new Date(),
      submission_notes: submission_notes ? submission_notes.trim() : null,
      rejection_reason: null
    }, { transaction });

    // Update all entries to 'Submitted'
    await TimesheetEntry.update(
      { status: 'Submitted' },
      { where: { timesheet_id: timesheet.id }, transaction }
    );

    // Create Audit Log
    await TimesheetAuditLog.create({
      timesheet_id: timesheet.id,
      action: actionType,
      actor_id: userId,
      comments: submission_notes ? `Submitted with note: ${submission_notes.trim()}` : 'Submitted for manager approval'
    }, { transaction });

    // Notify Project Managers
    const projectManagerIds = new Set();
    timesheet.entries.forEach((entry) => {
      if (entry.project && entry.project.manager_id) {
        projectManagerIds.add(entry.project.manager_id);
      }
    });

    // Also notify admins if no specific PM
    if (projectManagerIds.size === 0) {
      const admins = await User.findAll({ where: { role: 'Admin' } });
      admins.forEach((a) => projectManagerIds.add(a.id));
    }

    for (const managerId of projectManagerIds) {
      if (managerId !== userId) {
        await Notification.create({
          user_id: managerId,
          type: 'timesheet_submission',
          title: 'New Timesheet Submitted for Review',
          message: `${req.user.name} submitted timesheet for ${MONTH_NAMES[month - 1]} ${year} (${timesheet.total_hours} hrs) for your approval.`,
          is_read: false
        }, { transaction });
      }
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: `Timesheet for ${MONTH_NAMES[month - 1]} ${year} submitted successfully for manager review.`,
      data: {
        timesheet_id: timesheet.id,
        status: 'Submitted',
        total_hours: timesheet.total_hours
      }
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error submitting timesheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit timesheet.',
      error: error.message
    });
  }
};

/**
 * 7. Get Timesheets for Manager Approvals Dashboard
 */
const getApprovals = async (req, res) => {
  try {
    const { year, month, status, employeeId, projectId } = req.query;

    const whereClause = {};
    if (year) whereClause.year = parseInt(year, 10);
    if (month) whereClause.month = parseInt(month, 10);
    if (status && status !== 'All') whereClause.status = status;
    if (employeeId && employeeId !== 'All') whereClause.user_id = parseInt(employeeId, 10);

    // Filter based on PM managed projects
    let userFilter = {};
    if (req.user.role === 'Project Manager') {
      const managedProjects = await Project.findAll({
        where: { manager_id: req.user.id },
        attributes: ['id']
      });
      const projectIds = managedProjects.map((p) => p.id);

      // Find all users who are members of PM's projects or logged work on PM's projects
      const projectMembers = await ProjectMember.findAll({
        where: { project_id: { [Op.in]: projectIds } },
        attributes: ['user_id']
      });
      const memberIds = [...new Set(projectMembers.map((pm) => pm.user_id))];

      // PM can review their team members or themselves
      whereClause.user_id = { [Op.in]: [...memberIds, req.user.id] };
    }

    const timesheets = await Timesheet.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'role', 'weekly_capacity_hours']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: TimesheetEntry,
          as: 'entries',
          include: [
            { model: Project, as: 'project', attributes: ['id', 'name'] }
          ]
        }
      ],
      order: [
        ['submitted_at', 'DESC'],
        ['updated_at', 'DESC']
      ]
    });

    // Compute approval stats
    const allPending = timesheets.filter((t) => t.status === 'Submitted');
    const allApproved = timesheets.filter((t) => t.status === 'Approved');
    const allRejected = timesheets.filter((t) => t.status === 'Rejected');
    const allDraft = timesheets.filter((t) => t.status === 'Draft');

    const totalHoursPending = allPending.reduce((sum, t) => sum + (parseFloat(t.total_hours) || 0), 0);
    const totalHoursApproved = allApproved.reduce((sum, t) => sum + (parseFloat(t.total_hours) || 0), 0);

    // Format list for manager view
    const formattedTimesheets = timesheets.map((t) => {
      const projectsInvolved = [...new Set(t.entries.map((e) => e.project?.name).filter(Boolean))];
      return {
        id: t.id,
        user_id: t.user_id,
        employee_name: t.employee?.name || 'Unknown',
        employee_email: t.employee?.email || '',
        employee_role: t.employee?.role || 'Team Member',
        year: t.year,
        month: t.month,
        month_name: MONTH_NAMES[t.month - 1],
        total_hours: parseFloat(t.total_hours.toFixed(2)),
        status: t.status,
        submitted_at: t.submitted_at,
        reviewed_at: t.reviewed_at,
        reviewer_name: t.reviewer?.name || null,
        rejection_reason: t.rejection_reason,
        submission_notes: t.submission_notes,
        entries_count: t.entries.length,
        projects_involved: projectsInvolved
      };
    });

    res.status(200).json({
      success: true,
      data: {
        timesheets: formattedTimesheets,
        metrics: {
          pending_count: allPending.length,
          approved_count: allApproved.length,
          rejected_count: allRejected.length,
          draft_count: allDraft.length,
          total_hours_pending: parseFloat(totalHoursPending.toFixed(2)),
          total_hours_approved: parseFloat(totalHoursApproved.toFixed(2))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching manager approval timesheets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve manager timesheet approvals.',
      error: error.message
    });
  }
};

/**
 * 8. Get Specific Timesheet Details
 */
const getTimesheetById = async (req, res) => {
  try {
    const { id } = req.params;

    const timesheet = await Timesheet.findByPk(id, {
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'role', 'weekly_capacity_hours']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: TimesheetEntry,
          as: 'entries',
          include: [
            { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
            { model: Task, as: 'task', attributes: ['id', 'title', 'estimated_hours', 'status', 'priority'] }
          ]
        },
        {
          model: TimesheetAuditLog,
          as: 'auditLogs',
          include: [
            { model: User, as: 'actor', attributes: ['id', 'name', 'role'] }
          ]
        }
      ],
      order: [
        [{ model: TimesheetEntry, as: 'entries' }, 'work_date', 'ASC'],
        [{ model: TimesheetEntry, as: 'entries' }, 'start_time', 'ASC'],
        [{ model: TimesheetAuditLog, as: 'auditLogs' }, 'created_at', 'DESC']
      ]
    });

    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet not found.' });
    }

    // Security check
    if (
      req.user.role === 'Team Member' &&
      timesheet.user_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view another employee\'s timesheet.'
      });
    }

    // Summary calculation
    const totalWorkingDays = getWorkingDaysInMonth(timesheet.year, timesheet.month);
    const uniqueDays = new Set(timesheet.entries.map((e) => e.work_date));

    res.status(200).json({
      success: true,
      data: {
        timesheet: {
          ...timesheet.toJSON(),
          month_name: MONTH_NAMES[timesheet.month - 1]
        },
        working_days_count: uniqueDays.size,
        total_working_days_in_month: totalWorkingDays
      }
    });
  } catch (error) {
    console.error('Error fetching timesheet by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve timesheet details.',
      error: error.message
    });
  }
};

/**
 * 9. Approve Monthly Timesheet
 */
const approveTimesheet = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const reviewerId = req.user.id;

    const timesheet = await Timesheet.findByPk(id, {
      include: [{ model: User, as: 'employee' }],
      transaction
    });

    if (!timesheet) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Timesheet not found.' });
    }

    if (timesheet.status === 'Approved') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Timesheet is already approved.' });
    }

    // Update timesheet
    await timesheet.update({
      status: 'Approved',
      reviewed_at: new Date(),
      reviewed_by: reviewerId,
      rejection_reason: null
    }, { transaction });

    // Update child entries
    await TimesheetEntry.update(
      { status: 'Approved' },
      { where: { timesheet_id: timesheet.id }, transaction }
    );

    // Create Audit Log
    await TimesheetAuditLog.create({
      timesheet_id: timesheet.id,
      action: 'APPROVED',
      actor_id: reviewerId,
      comments: comments ? comments.trim() : 'Monthly timesheet approved'
    }, { transaction });

    // Notify employee
    await Notification.create({
      user_id: timesheet.user_id,
      type: 'timesheet_approval',
      title: 'Timesheet Approved',
      message: `Your timesheet for ${MONTH_NAMES[timesheet.month - 1]} ${timesheet.year} (${timesheet.total_hours} hrs) has been approved by ${req.user.name}.`,
      is_read: false
    }, { transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: `Timesheet for ${timesheet.employee?.name} (${MONTH_NAMES[timesheet.month - 1]} ${timesheet.year}) approved successfully.`,
      data: {
        timesheet_id: timesheet.id,
        status: 'Approved',
        reviewed_at: timesheet.reviewed_at
      }
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error approving timesheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve timesheet.',
      error: error.message
    });
  }
};

/**
 * 10. Reject Monthly Timesheet
 */
const rejectTimesheet = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const reviewerId = req.user.id;

    if (!rejection_reason || !rejection_reason.trim()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'A mandatory rejection reason must be provided.'
      });
    }

    const timesheet = await Timesheet.findByPk(id, {
      include: [{ model: User, as: 'employee' }],
      transaction
    });

    if (!timesheet) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Timesheet not found.' });
    }

    // Update timesheet
    await timesheet.update({
      status: 'Rejected',
      reviewed_at: new Date(),
      reviewed_by: reviewerId,
      rejection_reason: rejection_reason.trim()
    }, { transaction });

    // Update child entries
    await TimesheetEntry.update(
      { status: 'Rejected' },
      { where: { timesheet_id: timesheet.id }, transaction }
    );

    // Create Audit Log
    await TimesheetAuditLog.create({
      timesheet_id: timesheet.id,
      action: 'REJECTED',
      actor_id: reviewerId,
      comments: `Rejected: ${rejection_reason.trim()}`
    }, { transaction });

    // Notify employee with high urgency
    await Notification.create({
      user_id: timesheet.user_id,
      type: 'timesheet_rejection',
      title: 'Action Required: Timesheet Rejected',
      message: `Your timesheet for ${MONTH_NAMES[timesheet.month - 1]} ${timesheet.year} was returned with feedback by ${req.user.name}. Reason: "${rejection_reason.trim()}". Please update and resubmit.`,
      is_read: false
    }, { transaction });

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: `Timesheet rejected and returned to ${timesheet.employee?.name} for revision.`,
      data: {
        timesheet_id: timesheet.id,
        status: 'Rejected',
        rejection_reason: rejection_reason.trim()
      }
    });
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error('Error rejecting timesheet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject timesheet.',
      error: error.message
    });
  }
};

/**
 * 11. Export Monthly Timesheet to Styled Excel (.xlsx)
 */
const exportExcel = async (req, res) => {
  try {
    const { timesheetId, year, month, employeeId } = req.query;

    let targetTimesheet;
    if (timesheetId) {
      targetTimesheet = await Timesheet.findByPk(timesheetId, {
        include: [
          { model: User, as: 'employee' },
          { model: User, as: 'reviewer' },
          {
            model: TimesheetEntry,
            as: 'entries',
            include: [
              { model: Project, as: 'project' },
              { model: Task, as: 'task' }
            ]
          }
        ]
      });
    } else {
      const targetUserId = (req.user.role === 'Admin' || req.user.role === 'Project Manager') && employeeId
        ? parseInt(employeeId, 10)
        : req.user.id;

      const targetYear = parseInt(year, 10) || new Date().getFullYear();
      const targetMonth = parseInt(month, 10) || (new Date().getMonth() + 1);

      targetTimesheet = await Timesheet.findOne({
        where: { user_id: targetUserId, year: targetYear, month: targetMonth },
        include: [
          { model: User, as: 'employee' },
          { model: User, as: 'reviewer' },
          {
            model: TimesheetEntry,
            as: 'entries',
            include: [
              { model: Project, as: 'project' },
              { model: Task, as: 'task' }
            ]
          }
        ]
      });
    }

    if (!targetTimesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet records not found for export.' });
    }

    // Security check
    if (
      req.user.role === 'Team Member' &&
      targetTimesheet.user_id !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized to download this timesheet.' });
    }

    const employee = targetTimesheet.employee || req.user;
    const entries = targetTimesheet.entries || [];
    const monthName = MONTH_NAMES[targetTimesheet.month - 1];

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TaskPilot Platform';
    workbook.lastModifiedBy = req.user.name;
    workbook.created = new Date();

    // Sheet 1: Detailed Timesheet
    const sheet = workbook.addWorksheet(`${monthName} ${targetTimesheet.year} Timesheet`, {
      views: [{ showGridLines: true }]
    });

    // Styling Palette
    const primaryFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' } // Indigo 600
    };
    const headerFont = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    const titleFont = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF202124' } };
    const labelFont = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF4B5563' } };
    const valueFont = { name: 'Segoe UI', size: 10, color: { argb: 'FF111827' } };

    // Brand Header
    sheet.mergeCells('A1:K1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'TASKPILOT – SMART TIMESHEET REPORT';
    titleCell.font = titleFont;
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.getRow(1).height = 30;

    // Metadata Block
    sheet.getCell('A3').value = 'Employee Name:';
    sheet.getCell('A3').font = labelFont;
    sheet.getCell('B3').value = employee.name;
    sheet.getCell('B3').font = valueFont;

    sheet.getCell('D3').value = 'Period:';
    sheet.getCell('D3').font = labelFont;
    sheet.getCell('E3').value = `${monthName} ${targetTimesheet.year}`;
    sheet.getCell('E3').font = valueFont;

    sheet.getCell('G3').value = 'Status:';
    sheet.getCell('G3').font = labelFont;
    sheet.getCell('H3').value = targetTimesheet.status.toUpperCase();
    sheet.getCell('H3').font = { ...valueFont, bold: true };

    sheet.getCell('A4').value = 'Employee Email:';
    sheet.getCell('A4').font = labelFont;
    sheet.getCell('B4').value = employee.email;
    sheet.getCell('B4').font = valueFont;

    sheet.getCell('D4').value = 'Total Hours:';
    sheet.getCell('D4').font = labelFont;
    sheet.getCell('E4').value = `${targetTimesheet.total_hours} hrs`;
    sheet.getCell('E4').font = { ...valueFont, bold: true, color: { argb: 'FF4F46E5' } };

    sheet.getCell('G4').value = 'Reviewed By:';
    sheet.getCell('G4').font = labelFont;
    sheet.getCell('H4').value = targetTimesheet.reviewer?.name || 'Pending Review';
    sheet.getCell('H4').font = valueFont;

    sheet.getRow(3).height = 20;
    sheet.getRow(4).height = 20;

    // Table Column Headers
    const headers = [
      'Date',
      'Day',
      'Project',
      'Task Title',
      'Category',
      'Start Time',
      'End Time',
      'Break (min)',
      'Hours Worked',
      'Status',
      'Work Description',
      'Remarks'
    ];

    sheet.getRow(6).values = headers;
    sheet.getRow(6).height = 26;

    sheet.getRow(6).eachCell((cell) => {
      cell.fill = primaryFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'medium', color: { argb: 'FF312E81' } }
      };
    });

    // Populate Data Rows
    let rowIndex = 7;
    entries.forEach((entry, idx) => {
      const dateObj = new Date(entry.work_date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      const row = sheet.getRow(rowIndex);
      row.values = [
        entry.work_date,
        dayName,
        entry.project?.name || `Project #${entry.project_id}`,
        entry.task?.title || 'General Task / Unassigned',
        entry.work_category,
        entry.start_time || '-',
        entry.end_time || '-',
        entry.break_minutes || 0,
        parseFloat(entry.hours_worked),
        entry.status,
        entry.work_description,
        entry.remarks || '-'
      ];

      // Zebra striping
      const isEven = idx % 2 === 0;
      const rowFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF9FAFB' }
      };

      row.eachCell((cell, colNumber) => {
        cell.fill = rowFill;
        cell.font = { name: 'Segoe UI', size: 9.5 };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFF3F4F6' } }
        };
        if (colNumber === 9) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0.00 "hrs"';
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true };
        } else if ([1, 2, 6, 7, 8, 10].includes(colNumber)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });

      row.height = 22;
      rowIndex++;
    });

    // Total Row
    const totalRow = sheet.getRow(rowIndex);
    totalRow.getCell(1).value = 'TOTAL MONTHLY HOURS';
    sheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
    totalRow.getCell(1).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1F2937' } };
    totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };

    const totalHoursCell = totalRow.getCell(9);
    totalHoursCell.value = targetTimesheet.total_hours;
    totalHoursCell.numFmt = '#,##0.00 "hrs"';
    totalHoursCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF4F46E5' } };
    totalHoursCell.alignment = { horizontal: 'right', vertical: 'middle' };

    totalRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
        bottom: { style: 'double', color: { argb: 'FF4B5563' } }
      };
    });
    totalRow.height = 24;

    // Auto Column Widths
    sheet.columns = [
      { key: 'date', width: 14 },
      { key: 'day', width: 8 },
      { key: 'project', width: 22 },
      { key: 'task', width: 28 },
      { key: 'category', width: 16 },
      { key: 'start', width: 12 },
      { key: 'end', width: 12 },
      { key: 'break', width: 12 },
      { key: 'hours', width: 15 },
      { key: 'status', width: 12 },
      { key: 'desc', width: 45 },
      { key: 'remarks', width: 25 }
    ];

    // Sheet 2: Project & Category Summary Breakdown
    const summarySheet = workbook.addWorksheet('Summary Breakdown', {
      views: [{ showGridLines: true }]
    });

    summarySheet.getCell('A1').value = 'PROJECT WISE BREAKDOWN';
    summarySheet.getCell('A1').font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF4F46E5' } };

    summarySheet.getRow(3).values = ['Project Name', 'Total Hours', '% of Month'];
    summarySheet.getRow(3).eachCell((cell) => {
      cell.fill = primaryFill;
      cell.font = headerFont;
    });

    const projectTotals = {};
    const categoryTotals = {};
    entries.forEach((e) => {
      const pName = e.project?.name || `Project #${e.project_id}`;
      projectTotals[pName] = (projectTotals[pName] || 0) + parseFloat(e.hours_worked);
      const cat = e.work_category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(e.hours_worked);
    });

    let sRow = 4;
    Object.entries(projectTotals).forEach(([pName, hrs]) => {
      const pct = targetTimesheet.total_hours > 0 ? (hrs / targetTimesheet.total_hours) * 100 : 0;
      summarySheet.getRow(sRow).values = [pName, hrs, `${pct.toFixed(1)}%`];
      sRow++;
    });

    sRow += 2;
    summarySheet.getCell(`A${sRow}`).value = 'CATEGORY WISE BREAKDOWN';
    summarySheet.getCell(`A${sRow}`).font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF4F46E5' } };
    sRow++;

    summarySheet.getRow(sRow).values = ['Category', 'Total Hours', '% of Month'];
    summarySheet.getRow(sRow).eachCell((cell) => {
      cell.fill = primaryFill;
      cell.font = headerFont;
    });
    sRow++;

    Object.entries(categoryTotals).forEach(([cat, hrs]) => {
      const pct = targetTimesheet.total_hours > 0 ? (hrs / targetTimesheet.total_hours) * 100 : 0;
      summarySheet.getRow(sRow).values = [cat, hrs, `${pct.toFixed(1)}%`];
      sRow++;
    });

    summarySheet.columns = [
      { key: 'name', width: 30 },
      { key: 'hours', width: 16 },
      { key: 'pct', width: 16 }
    ];

    // Response Headers for File Download
    const sanitizedName = employee.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Timesheet_${sanitizedName}_${targetTimesheet.year}_${monthName}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating timesheet excel export:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export timesheet to Excel.',
      error: error.message
    });
  }
};

/**
 * 12. Get Task Actual Logged Hours & Analytics
 */
const getTaskActuals = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findByPk(taskId, {
      attributes: ['id', 'title', 'estimated_hours', 'status']
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const entries = await TimesheetEntry.findAll({
      where: { task_id: taskId },
      include: [
        { model: User, as: 'employee', attributes: ['id', 'name', 'email'] }
      ],
      order: [['work_date', 'DESC']]
    });

    const totalActualHours = entries.reduce((sum, e) => sum + (parseFloat(e.hours_worked) || 0), 0);
    const approvedHours = entries
      .filter((e) => e.status === 'Approved')
      .reduce((sum, e) => sum + (parseFloat(e.hours_worked) || 0), 0);

    // Contributor breakdown
    const contributorMap = {};
    entries.forEach((e) => {
      const uId = e.user_id;
      if (!contributorMap[uId]) {
        contributorMap[uId] = {
          user_id: uId,
          name: e.employee?.name || 'Unknown',
          hours: 0,
          entries_count: 0
        };
      }
      contributorMap[uId].hours += parseFloat(e.hours_worked);
      contributorMap[uId].entries_count++;
    });

    const varianceHours = totalActualHours - (task.estimated_hours || 0);

    res.status(200).json({
      success: true,
      data: {
        task_id: task.id,
        task_title: task.title,
        estimated_hours: task.estimated_hours || 0,
        total_actual_hours: parseFloat(totalActualHours.toFixed(2)),
        approved_hours: parseFloat(approvedHours.toFixed(2)),
        variance_hours: parseFloat(varianceHours.toFixed(2)),
        is_over_estimate: varianceHours > 0,
        entries_count: entries.length,
        contributors: Object.values(contributorMap),
        recent_entries: entries.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Error fetching task actual hours:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve task actuals.',
      error: error.message
    });
  }
};

module.exports = {
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
};
