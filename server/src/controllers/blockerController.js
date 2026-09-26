const { TaskBlocker, Task, Project, User, EscalationEvent, Notification } = require('../models');
const { Op } = require('sequelize');

/**
 * Mark a task as blocked
 * POST /api/tasks/:id/blockers
 */
const createTaskBlocker = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'A blocker reason is required' });
    }

    const task = await Task.findByPk(id, {
      include: [
        { model: Project, as: 'project' },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Create the blocker
    const blocker = await TaskBlocker.create({
      task_id: task.id,
      reason: reason.trim(),
      blocked_at: new Date(),
      status: 'active'
    });

    // Update the task status to 'Blocked'
    await task.update({ status: 'Blocked' });

    // Notify project manager if different from reporter
    if (task.project && task.project.manager_id) {
      await Notification.create({
        user_id: task.project.manager_id,
        type: 'task_blocked',
        message: `Task "${task.title}" in project "${task.project.name}" was marked as Blocked. Reason: ${reason.trim()}`,
        related_id: blocker.id
      });
    }

    // Fetch complete blocker with task & project details
    const fullBlocker = await TaskBlocker.findByPk(blocker.id, {
      include: [
        {
          model: Task,
          as: 'task',
          include: [
            { model: Project, as: 'project' },
            { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
          ]
        },
        { model: EscalationEvent, as: 'escalationEvents' }
      ]
    });

    return res.status(201).json({
      message: 'Task marked as blocked successfully',
      blocker: fullBlocker,
      task
    });
  } catch (error) {
    console.error('Error creating task blocker:', error);
    return res.status(500).json({ message: 'Internal server error while marking task as blocked' });
  }
};

/**
 * Resolve an active or escalated blocker
 * PATCH /api/blockers/:id/resolve
 */
const resolveBlocker = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes, next_status } = req.body;

    const blocker = await TaskBlocker.findByPk(id, {
      include: [
        {
          model: Task,
          as: 'task',
          include: [
            { model: Project, as: 'project' },
            { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
          ]
        }
      ]
    });

    if (!blocker) {
      return res.status(404).json({ message: 'Blocker not found' });
    }

    if (blocker.status === 'resolved') {
      return res.status(400).json({ message: 'Blocker is already resolved' });
    }

    // Update blocker status
    await blocker.update({
      status: 'resolved',
      resolved_at: new Date(),
      resolution_notes: resolution_notes ? resolution_notes.trim() : null
    });

    // Update associated task status if still Blocked
    if (blocker.task && blocker.task.status === 'Blocked') {
      const updatedStatus = next_status || 'In Progress';
      await blocker.task.update({ status: updatedStatus });
    }

    // Notify project manager & assignee of resolution
    if (blocker.task) {
      const recipientIds = new Set();
      if (blocker.task.project && blocker.task.project.manager_id) {
        recipientIds.add(blocker.task.project.manager_id);
      }
      if (blocker.task.assigned_to) {
        recipientIds.add(blocker.task.assigned_to);
      }

      for (const userId of recipientIds) {
        await Notification.create({
          user_id: userId,
          type: 'blocker_resolved',
          message: `Blocker on task "${blocker.task.title}" has been resolved. Note: ${resolution_notes || 'Resolved'}`,
          related_id: blocker.id
        });
      }
    }

    const updatedBlocker = await TaskBlocker.findByPk(id, {
      include: [
        {
          model: Task,
          as: 'task',
          include: [
            { model: Project, as: 'project' },
            { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
          ]
        },
        { model: EscalationEvent, as: 'escalationEvents' }
      ]
    });

    return res.json({
      message: 'Blocker resolved successfully',
      blocker: updatedBlocker
    });
  } catch (error) {
    console.error('Error resolving blocker:', error);
    return res.status(500).json({ message: 'Internal server error while resolving blocker' });
  }
};

/**
 * List active and escalated blockers (or filter by status/project)
 * GET /api/blockers
 */
const getBlockers = async (req, res) => {
  try {
    const { status, projectId } = req.query;

    const whereClause = {};

    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      whereClause.status = { [Op.in]: statuses };
    } else {
      // Default: list active + escalated
      whereClause.status = { [Op.in]: ['active', 'escalated'] };
    }

    const taskWhere = {};
    if (projectId) {
      taskWhere.project_id = projectId;
    }

    const blockers = await TaskBlocker.findAll({
      where: whereClause,
      include: [
        {
          model: Task,
          as: 'task',
          where: Object.keys(taskWhere).length > 0 ? taskWhere : undefined,
          include: [
            {
              model: Project,
              as: 'project',
              include: [
                { model: User, as: 'manager', attributes: ['id', 'name', 'email'] }
              ]
            },
            { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'role'] }
          ]
        },
        {
          model: EscalationEvent,
          as: 'escalationEvents'
        }
      ],
      order: [
        ['blocked_at', 'ASC'] // Oldest blockers first
      ]
    });

    return res.json(blockers);
  } catch (error) {
    console.error('Error fetching blockers:', error);
    return res.status(500).json({ message: 'Internal server error while fetching blockers' });
  }
};

/**
 * Get downstream affected tasks count for a task (placeholder for Stage 5)
 * GET /api/tasks/:id/impact
 */
const getTaskImpact = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Placeholder downstream affected count of 0 as requested for this stage
    return res.json({
      task_id: parseInt(id),
      downstream_affected_count: 0,
      downstream_tasks: []
    });
  } catch (error) {
    console.error('Error fetching task impact:', error);
    return res.status(500).json({ message: 'Internal server error while fetching task impact' });
  }
};

module.exports = {
  createTaskBlocker,
  resolveBlocker,
  getBlockers,
  getTaskImpact
};
