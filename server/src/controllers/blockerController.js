const { TaskBlocker, Task, Project, User, EscalationEvent, Notification, TaskDependency } = require('../models');
const { Op } = require('sequelize');

/**
 * Traversal helper: Computes all unique incomplete downstream tasks
 * that depend on a given taskId directly or transitively (BFS traversal).
 * Computes `is_dependency_blocked` and `is_actively_blocked` as derived properties.
 */
const calculateDownstreamImpact = async (startTaskId) => {
  const visitedTaskIds = new Set();
  const queue = [parseInt(startTaskId, 10)];
  const downstreamTaskIds = new Set();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visitedTaskIds.has(currentId)) continue;
    visitedTaskIds.add(currentId);

    // Find all tasks that depend directly on currentId (task_id where depends_on_task_id = currentId)
    const directDependencies = await TaskDependency.findAll({
      where: { depends_on_task_id: currentId }
    });

    for (const dep of directDependencies) {
      const depTaskId = dep.task_id;
      if (!visitedTaskIds.has(depTaskId) && depTaskId !== parseInt(startTaskId, 10)) {
        downstreamTaskIds.add(depTaskId);
        queue.push(depTaskId);
      }
    }
  }

  if (downstreamTaskIds.size === 0) {
    return {
      task_id: parseInt(startTaskId, 10),
      downstream_affected_count: 0,
      downstream_tasks: []
    };
  }

  // Fetch full details of all downstream tasks
  const downstreamTasks = await Task.findAll({
    where: {
      id: { [Op.in]: Array.from(downstreamTaskIds) },
      status: { [Op.ne]: 'Completed' } // Only incomplete tasks are affected
    },
    include: [
      {
        model: User,
        as: 'assignee',
        attributes: ['id', 'name', 'email']
      },
      {
        model: Project,
        as: 'project',
        attributes: ['id', 'name']
      },
      {
        model: Task,
        as: 'predecessors',
        attributes: ['id', 'title', 'status']
      },
      {
        model: TaskBlocker,
        as: 'blockers',
        where: { status: { [Op.in]: ['active', 'escalated'] } },
        required: false
      }
    ]
  });

  // Map each task and compute derived flags
  const formattedTasks = downstreamTasks.map(t => {
    // 1. Actively Blocked: has an active/escalated row in task_blockers
    const activeBlockers = t.blockers || [];
    const isActivelyBlocked = activeBlockers.length > 0 || t.status === 'Blocked';
    const activeBlockerReason = activeBlockers.length > 0 ? activeBlockers[0].reason : null;

    // 2. Dependency-Blocked: derived flag if any predecessor is not 'Completed'
    const predecessors = t.predecessors || [];
    const hasUncompletedPredecessor = predecessors.some(p => p.status !== 'Completed');
    const isDependencyBlocked = hasUncompletedPredecessor;

    return {
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      estimated_hours: t.estimated_hours,
      assigned_to: t.assigned_to,
      assignee: t.assignee,
      project: t.project,
      is_actively_blocked: isActivelyBlocked,
      is_dependency_blocked: isDependencyBlocked,
      active_blocker_reason: activeBlockerReason,
      predecessors: predecessors.map(p => ({
        id: p.id,
        title: p.title,
        status: p.status
      }))
    };
  });

  return {
    task_id: parseInt(startTaskId, 10),
    downstream_affected_count: formattedTasks.length,
    downstream_tasks: formattedTasks
  };
};

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

    // Compute downstream impact for each blocker's task
    const enhancedBlockers = await Promise.all(
      blockers.map(async (b) => {
        const bJson = b.toJSON();
        if (bJson.task_id) {
          const impact = await calculateDownstreamImpact(bJson.task_id);
          bJson.downstream_affected_count = impact.downstream_affected_count;
          bJson.downstream_tasks = impact.downstream_tasks;
        } else {
          bJson.downstream_affected_count = 0;
          bJson.downstream_tasks = [];
        }
        return bJson;
      })
    );

    return res.json(enhancedBlockers);
  } catch (error) {
    console.error('Error fetching blockers:', error);
    return res.status(500).json({ message: 'Internal server error while fetching blockers' });
  }
};

/**
 * Get downstream affected tasks count for a task (BFS traversal)
 * GET /api/tasks/:id/impact
 */
const getTaskImpact = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const impact = await calculateDownstreamImpact(id);

    return res.json(impact);
  } catch (error) {
    console.error('Error fetching task impact:', error);
    return res.status(500).json({ message: 'Internal server error while fetching task impact' });
  }
};

module.exports = {
  createTaskBlocker,
  resolveBlocker,
  getBlockers,
  getTaskImpact,
  calculateDownstreamImpact
};
