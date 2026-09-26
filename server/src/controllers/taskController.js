const { Op } = require('sequelize');
const { Task, TaskDependency, Project, User, TaskDecisionLog, Notification, sequelize } = require('../models');

const SAFE_USER_ATTRIBUTES = ['id', 'name', 'email', 'role', 'weekly_capacity_hours'];

// Helper to check if task is overdue
const isTaskOverdue = (task) => {
  if (!task.due_date || task.status === 'Completed') return false;
  const today = new Date().toISOString().split('T')[0];
  return task.due_date < today;
};

// Helper: Check if all predecessors are completed
const validatePredecessorsCompleted = async (taskId, transaction = null) => {
  const task = await Task.findByPk(taskId, {
    include: [
      {
        model: Task,
        as: 'predecessors',
        attributes: ['id', 'title', 'status', 'priority']
      }
    ],
    transaction
  });

  if (!task) return { valid: true, uncompletedPredecessors: [] };

  const uncompleted = (task.predecessors || []).filter(
    (p) => p.status !== 'Completed'
  );

  return {
    valid: uncompleted.length === 0,
    uncompletedPredecessors: uncompleted
  };
};

// 1. GET /api/projects/:id/tasks
const getProjectTasks = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assigned_to, search } = req.query;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    const where = { project_id: id };
    if (status && status !== 'All') where.status = status;
    if (priority && priority !== 'All') where.priority = priority;
    if (assigned_to && assigned_to !== 'All') where.assigned_to = assigned_to;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const tasks = await Task.findAll({
      where,
      include: [
        { model: User, as: 'assignee', attributes: SAFE_USER_ATTRIBUTES },
        { model: User, as: 'creator', attributes: SAFE_USER_ATTRIBUTES },
        { model: Task, as: 'predecessors', attributes: ['id', 'title', 'status'] },
        { model: Task, as: 'dependents', attributes: ['id', 'title', 'status'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const formattedTasks = tasks.map((t) => {
      const tJson = t.toJSON();
      return {
        ...tJson,
        isOverdue: isTaskOverdue(tJson)
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedTasks
    });
  } catch (error) {
    console.error('[getProjectTasks Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve project tasks.'
    });
  }
};

// 2. GET /api/tasks (Global Task List with filters)
const getAllTasks = async (req, res) => {
  try {
    const { project_id, status, priority, assigned_to, search } = req.query;
    const where = {};

    if (project_id && project_id !== 'All') where.project_id = project_id;
    if (status && status !== 'All') where.status = status;
    if (priority && priority !== 'All') where.priority = priority;
    if (assigned_to && assigned_to !== 'All') where.assigned_to = assigned_to;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const tasks = await Task.findAll({
      where,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
        { model: User, as: 'assignee', attributes: SAFE_USER_ATTRIBUTES },
        { model: User, as: 'creator', attributes: SAFE_USER_ATTRIBUTES },
        { model: Task, as: 'predecessors', attributes: ['id', 'title', 'status'] },
        { model: Task, as: 'dependents', attributes: ['id', 'title', 'status'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const formattedTasks = tasks.map((t) => {
      const tJson = t.toJSON();
      return {
        ...tJson,
        isOverdue: isTaskOverdue(tJson)
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedTasks
    });
  } catch (error) {
    console.error('[getAllTasks Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tasks.'
    });
  }
};

// 3. GET /api/tasks/:id
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status', 'manager_id'] },
        { model: User, as: 'assignee', attributes: SAFE_USER_ATTRIBUTES },
        { model: User, as: 'creator', attributes: SAFE_USER_ATTRIBUTES },
        {
          model: Task,
          as: 'predecessors',
          attributes: ['id', 'title', 'status', 'priority', 'due_date'],
          include: [{ model: User, as: 'assignee', attributes: SAFE_USER_ATTRIBUTES }]
        },
        {
          model: Task,
          as: 'dependents',
          attributes: ['id', 'title', 'status', 'priority', 'due_date'],
          include: [{ model: User, as: 'assignee', attributes: SAFE_USER_ATTRIBUTES }]
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    const tJson = task.toJSON();
    return res.status(200).json({
      success: true,
      data: {
        ...tJson,
        isOverdue: isTaskOverdue(tJson)
      }
    });
  } catch (error) {
    console.error('[getTaskById Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve task details.'
    });
  }
};

// 4. POST /api/tasks
const createTask = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      project_id,
      title,
      description,
      assigned_to,
      estimated_hours,
      priority,
      status,
      start_date,
      due_date,
      depends_on,
      reason,
      next_action,
      next_owner_id,
      next_action_due_at
    } = req.body;

    if (!project_id || !title || !title.trim()) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Project ID and task title are required.'
      });
    }

    const project = await Project.findByPk(project_id, { transaction: t });
    if (!project) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Selected project does not exist.'
      });
    }

    const newTask = await Task.create({
      project_id,
      title: title.trim(),
      description: description ? description.trim() : null,
      assigned_to: assigned_to ? parseInt(assigned_to, 10) : null,
      estimated_hours: estimated_hours ? parseFloat(estimated_hours) : 0,
      priority: priority || 'Medium',
      status: status || 'To Do',
      start_date: start_date || null,
      due_date: due_date || null,
      created_by: req.user.id
    }, { transaction: t });

    // Handle initial dependencies if provided
    if (Array.isArray(depends_on) && depends_on.length > 0) {
      const validPredecessorIds = depends_on.filter((depId) => parseInt(depId, 10) !== newTask.id);
      const depRecords = validPredecessorIds.map((depId) => ({
        task_id: newTask.id,
        depends_on_task_id: parseInt(depId, 10)
      }));
      if (depRecords.length > 0) {
        await TaskDependency.bulkCreate(depRecords, { ignoreDuplicates: true, transaction: t });
      }
    }

    // Record initial decision log entry
    await TaskDecisionLog.create({
      task_id: newTask.id,
      decision_type: 'task_created',
      change_summary: `Task created with priority ${priority || 'Medium'} and status ${status || 'To Do'}`,
      previous_value: null,
      new_value: {
        title: newTask.title,
        priority: newTask.priority,
        status: newTask.status,
        assigned_to: newTask.assigned_to,
        estimated_hours: newTask.estimated_hours,
        due_date: newTask.due_date
      },
      reason: reason ? reason.trim() : 'Initial task definition and scoping',
      decided_by: req.user.id,
      decided_at: new Date(),
      next_action: next_action ? next_action.trim() : 'Commence planned work',
      next_owner_id: next_owner_id ? parseInt(next_owner_id, 10) : (newTask.assigned_to || req.user.id),
      next_action_due_at: next_action_due_at || newTask.due_date || null,
      handoff_status: 'pending'
    }, { transaction: t });

    await t.commit();

    const createdTask = await Task.findByPk(newTask.id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: User, as: 'assignee', attributes: SAFE_USER_ATTRIBUTES },
        { model: Task, as: 'predecessors', attributes: ['id', 'title', 'status'] }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      data: createdTask
    });
  } catch (error) {
    await t.rollback();
    console.error('[createTask Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create task.'
    });
  }
};

// 5. PUT /api/tasks/:id (With DB Transaction & Decision Logging)
const updateTask = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      title,
      description,
      assigned_to,
      estimated_hours,
      priority,
      status,
      start_date,
      due_date,
      depends_on,
      reason,
      next_action,
      next_owner_id,
      next_action_due_at,
      handoff_status
    } = req.body;

    const task = await Task.findByPk(id, { transaction: t });
    if (!task) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    // Business rule check when moving to In Progress
    if (status === 'In Progress' && task.status !== 'In Progress') {
      const { valid, uncompletedPredecessors } = await validatePredecessorsCompleted(id, t);
      if (!valid) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          code: 'DEPENDENCY_BLOCK',
          message: `Cannot move task to "In Progress" because predecessor task(s) are not completed: ${uncompletedPredecessors
            .map((p) => `"${p.title}" (${p.status})`)
            .join(', ')}`,
          uncompletedPredecessors
        });
      }
    }

    // Capture changes for decision logging
    const previousSnapshot = {
      title: task.title,
      description: task.description,
      assigned_to: task.assigned_to,
      estimated_hours: task.estimated_hours,
      priority: task.priority,
      status: task.status,
      due_date: task.due_date
    };

    const changeDescriptions = [];
    let decisionType = 'task_update';

    if (title !== undefined && title.trim() !== task.title) {
      changeDescriptions.push(`Title changed from "${task.title}" to "${title.trim()}"`);
      task.title = title.trim();
    }

    if (description !== undefined && description !== task.description) {
      changeDescriptions.push(`Requirements/description updated`);
      decisionType = 'description_change';
      task.description = description ? description.trim() : null;
    }

    if (assigned_to !== undefined && assigned_to !== task.assigned_to) {
      changeDescriptions.push(`Assignee changed to user #${assigned_to || 'Unassigned'}`);
      decisionType = 'reassignment';
      task.assigned_to = assigned_to ? parseInt(assigned_to, 10) : null;
    }

    if (estimated_hours !== undefined && parseFloat(estimated_hours) !== task.estimated_hours) {
      changeDescriptions.push(`Estimated hours updated to ${estimated_hours}h`);
      task.estimated_hours = parseFloat(estimated_hours) || 0;
    }

    if (priority !== undefined && priority !== task.priority) {
      changeDescriptions.push(`Priority changed from ${task.priority} to ${priority}`);
      decisionType = 'priority_change';
      task.priority = priority;
    }

    if (status !== undefined && status !== task.status) {
      changeDescriptions.push(`Status changed from "${task.status}" to "${status}"`);
      if (decisionType === 'task_update') decisionType = 'status_change';
      task.status = status;
    }

    if (start_date !== undefined && start_date !== task.start_date) {
      task.start_date = start_date || null;
    }

    if (due_date !== undefined && due_date !== task.due_date) {
      changeDescriptions.push(`Deadline changed from "${task.due_date || 'None'}" to "${due_date || 'None'}"`);
      decisionType = 'deadline_change';
      task.due_date = due_date || null;
    }

    await task.save({ transaction: t });

    // Sync dependencies if depends_on array is explicitly supplied
    if (Array.isArray(depends_on)) {
      await TaskDependency.destroy({ where: { task_id: id }, transaction: t });
      const validDepIds = depends_on.filter((dId) => parseInt(dId, 10) !== parseInt(id, 10));
      if (validDepIds.length > 0) {
        const depRecords = validDepIds.map((dId) => ({
          task_id: parseInt(id, 10),
          depends_on_task_id: parseInt(dId, 10)
        }));
        await TaskDependency.bulkCreate(depRecords, { ignoreDuplicates: true, transaction: t });
        changeDescriptions.push(`Updated predecessor dependencies count: ${validDepIds.length}`);
      }
    }

    // Insert Decision Log if changes were detected or reason provided
    if (changeDescriptions.length > 0 || reason) {
      const summary = changeDescriptions.length > 0 ? changeDescriptions.join('; ') : 'Task details updated';
      const isRoutineStatusOnly = changeDescriptions.length === 1 && decisionType === 'status_change';
      
      const newSnapshot = {
        title: task.title,
        description: task.description,
        assigned_to: task.assigned_to,
        estimated_hours: task.estimated_hours,
        priority: task.priority,
        status: task.status,
        due_date: task.due_date
      };

      const decisionLog = await TaskDecisionLog.create({
        task_id: task.id,
        decision_type: decisionType,
        change_summary: summary,
        previous_value: previousSnapshot,
        new_value: newSnapshot,
        reason: reason ? reason.trim() : (isRoutineStatusOnly ? 'Routine status progression' : 'Operational adjustment'),
        decided_by: req.user.id,
        decided_at: new Date(),
        next_action: next_action ? next_action.trim() : null,
        next_owner_id: next_owner_id ? parseInt(next_owner_id, 10) : (task.assigned_to || null),
        next_action_due_at: next_action_due_at || task.due_date || null,
        handoff_status: handoff_status || 'pending'
      }, { transaction: t });

      if (next_owner_id && parseInt(next_owner_id, 10) !== req.user.id) {
        await Notification.create({
          user_id: parseInt(next_owner_id, 10),
          type: 'handoff_assigned',
          message: `📋 Decision Handoff on "${task.title}": ${next_action || summary}`,
          related_id: decisionLog.id
        }, { transaction: t });
      }
    }

    await t.commit();

    const updatedTask = await Task.findByPk(id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: User, as: 'assignee', attributes: SAFE_USER_ATTRIBUTES },
        { model: Task, as: 'predecessors', attributes: ['id', 'title', 'status'] },
        { model: Task, as: 'dependents', attributes: ['id', 'title', 'status'] }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      data: updatedTask
    });
  } catch (error) {
    await t.rollback();
    console.error('[updateTask Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update task.'
    });
  }
};

// 6. PATCH /api/tasks/:id/status
const updateTaskStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { status, reason, next_action, next_owner_id, next_action_due_at } = req.body;

    const validStatuses = ['To Do', 'In Progress', 'Blocked', 'In Review', 'Completed'];
    if (!status || !validStatuses.includes(status)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of [${validStatuses.join(', ')}].`
      });
    }

    const task = await Task.findByPk(id, { transaction: t });
    if (!task) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    // Business rule: a task cannot move to “In Progress” if any predecessor task is not “Completed”
    if (status === 'In Progress') {
      const { valid, uncompletedPredecessors } = await validatePredecessorsCompleted(id, t);
      if (!valid) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          code: 'DEPENDENCY_BLOCK',
          message: `Cannot move task to "In Progress" because predecessor task(s) are not completed: ${uncompletedPredecessors
            .map((p) => `"${p.title}" (${p.status})`)
            .join(', ')}`,
          uncompletedPredecessors
        });
      }
    }

    const oldStatus = task.status;
    task.status = status;
    await task.save({ transaction: t });

    // Record decision log entry (reason is optional for routine status changes)
    await TaskDecisionLog.create({
      task_id: task.id,
      decision_type: 'status_change',
      change_summary: `Status transitioned from "${oldStatus}" to "${status}"`,
      previous_value: { status: oldStatus },
      new_value: { status },
      reason: reason ? reason.trim() : 'Workflow status transition',
      decided_by: req.user.id,
      decided_at: new Date(),
      next_action: next_action ? next_action.trim() : null,
      next_owner_id: next_owner_id ? parseInt(next_owner_id, 10) : (task.assigned_to || null),
      next_action_due_at: next_action_due_at || null,
      handoff_status: 'pending'
    }, { transaction: t });

    await t.commit();

    const updatedTask = await Task.findByPk(id, {
      include: [
        { model: User, as: 'assignee', attributes: SAFE_USER_ATTRIBUTES },
        { model: Task, as: 'predecessors', attributes: ['id', 'title', 'status'] }
      ]
    });

    return res.status(200).json({
      success: true,
      message: `Task status changed to "${status}".`,
      data: updatedTask
    });
  } catch (error) {
    await t.rollback();
    console.error('[updateTaskStatus Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update task status.'
    });
  }
};

// 7. PATCH /api/tasks/:id/assign
const assignTask = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { assigned_to, confirmed_override, reason, next_action, next_action_due_at } = req.body;

    const task = await Task.findByPk(id, { transaction: t });
    if (!task) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    const previousAssigneeId = task.assigned_to;
    let targetUser = null;

    if (assigned_to) {
      targetUser = await User.findByPk(assigned_to, { transaction: t });
      if (!targetUser) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: 'Assigned user does not exist.'
        });
      }

      // Calculate user's active workload (excluding this task)
      const activeTasks = await Task.findAll({
        where: {
          assigned_to: targetUser.id,
          id: { [Op.ne]: task.id },
          status: { [Op.notIn]: ['Completed', 'Cancelled'] }
        },
        attributes: ['id', 'estimated_hours'],
        transaction: t
      });

      const current_assigned_hours = activeTasks.reduce(
        (sum, at) => sum + (parseFloat(at.estimated_hours) || 0),
        0
      );

      const task_estimated_hours = parseFloat(task.estimated_hours) || 0;
      const projected_hours = current_assigned_hours + task_estimated_hours;
      const weekly_capacity_hours = parseFloat(targetUser.weekly_capacity_hours) || 40;

      // Check if assignment exceeds weekly capacity
      if (projected_hours > weekly_capacity_hours && confirmed_override !== true) {
        await t.rollback();
        const excess_hours = Math.round((projected_hours - weekly_capacity_hours) * 10) / 10;
        const projected_utilization = Math.round((projected_hours / weekly_capacity_hours) * 100 * 10) / 10;

        return res.status(409).json({
          success: false,
          code: 'OVERLOAD_WARNING',
          message: `Workload Alert: Assigning this task (${task_estimated_hours}h) will overload ${targetUser.name} to ${projected_hours}h / ${weekly_capacity_hours}h (${projected_utilization}% capacity, +${excess_hours}h excess). Confirmation required to override.`,
          data: {
            user_id: targetUser.id,
            user_name: targetUser.name,
            weekly_capacity_hours,
            current_assigned_hours,
            task_estimated_hours,
            projected_hours,
            excess_hours,
            projected_utilization
          }
        });
      }

      task.assigned_to = assigned_to;
    } else {
      task.assigned_to = null;
    }

    await task.save({ transaction: t });

    // Record decision log entry for reassignment
    const decisionLog = await TaskDecisionLog.create({
      task_id: task.id,
      decision_type: 'reassignment',
      change_summary: `Task reassigned ${previousAssigneeId ? `from User #${previousAssigneeId}` : ''} to ${targetUser ? targetUser.name : 'Unassigned'}`,
      previous_value: { assigned_to: previousAssigneeId },
      new_value: { assigned_to: task.assigned_to },
      reason: reason ? reason.trim() : (targetUser ? `Reassigned for workload balancing & execution` : 'Unassigned'),
      decided_by: req.user.id,
      decided_at: new Date(),
      next_action: next_action ? next_action.trim() : 'Take ownership and review deliverables',
      next_owner_id: task.assigned_to || null,
      next_action_due_at: next_action_due_at || task.due_date || null,
      handoff_status: 'pending'
    }, { transaction: t });

    if (task.assigned_to && task.assigned_to !== req.user.id) {
      await Notification.create({
        user_id: task.assigned_to,
        type: 'handoff_assigned',
        message: `Task "${task.title}" was assigned to you by ${req.user.name}.`,
        related_id: decisionLog.id
      }, { transaction: t });
    }

    await t.commit();

    const updatedTask = await Task.findByPk(id, {
      include: [{ model: User, as: 'assignee', attributes: SAFE_USER_ATTRIBUTES }]
    });

    return res.status(200).json({
      success: true,
      message: 'Task assignee updated successfully.',
      data: updatedTask
    });
  } catch (error) {
    await t.rollback();
    console.error('[assignTask Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update task assignee.'
    });
  }
};

// 8. GET /api/tasks/:id/dependencies
const getTaskDependencies = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id, {
      include: [
        {
          model: Task,
          as: 'predecessors',
          attributes: ['id', 'title', 'status', 'priority', 'due_date'],
          include: [{ model: User, as: 'assignee', attributes: SAFE_USER_ATTRIBUTES }]
        },
        {
          model: Task,
          as: 'dependents',
          attributes: ['id', 'title', 'status', 'priority', 'due_date'],
          include: [{ model: User, as: 'assignee', attributes: SAFE_USER_ATTRIBUTES }]
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        task_id: parseInt(id, 10),
        task_title: task.title,
        predecessors: task.predecessors || [],
        dependents: task.dependents || []
      }
    });
  } catch (error) {
    console.error('[getTaskDependencies Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve task dependencies.'
    });
  }
};

// 9. POST /api/tasks/:id/dependencies (Transaction + Decision log)
const addDependency = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { depends_on_task_id, reason, next_action, next_owner_id, next_action_due_at } = req.body;

    if (!depends_on_task_id) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'depends_on_task_id is required.'
      });
    }

    const taskId = parseInt(id, 10);
    const dependsOnId = parseInt(depends_on_task_id, 10);

    if (taskId === dependsOnId) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'A task cannot depend on itself.'
      });
    }

    const [task, predecessor] = await Promise.all([
      Task.findByPk(taskId, { transaction: t }),
      Task.findByPk(dependsOnId, { transaction: t })
    ]);

    if (!task || !predecessor) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Target task or predecessor task not found.'
      });
    }

    // Check for circular dependency
    const reverseDependency = await TaskDependency.findOne({
      where: {
        task_id: dependsOnId,
        depends_on_task_id: taskId
      },
      transaction: t
    });

    if (reverseDependency) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Circular dependency detected: The predecessor task already depends on this task.'
      });
    }

    await TaskDependency.findOrCreate({
      where: {
        task_id: taskId,
        depends_on_task_id: dependsOnId
      },
      transaction: t
    });

    // Record decision log
    await TaskDecisionLog.create({
      task_id: taskId,
      decision_type: 'dependency_added',
      change_summary: `Added prerequisite dependency: "${predecessor.title}" (#${predecessor.id})`,
      previous_value: null,
      new_value: { depends_on_task_id: dependsOnId, predecessor_title: predecessor.title },
      reason: reason ? reason.trim() : `Prerequisite ordering requirement established`,
      decided_by: req.user.id,
      decided_at: new Date(),
      next_action: next_action ? next_action.trim() : `Complete prerequisite deliverable "${predecessor.title}"`,
      next_owner_id: next_owner_id ? parseInt(next_owner_id, 10) : (predecessor.assigned_to || null),
      next_action_due_at: next_action_due_at || predecessor.due_date || null,
      handoff_status: 'pending'
    }, { transaction: t });

    await t.commit();

    const dependencies = await getTaskDependenciesData(taskId);

    return res.status(201).json({
      success: true,
      message: 'Task dependency added successfully.',
      data: dependencies
    });
  } catch (error) {
    await t.rollback();
    console.error('[addDependency Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add task dependency.'
    });
  }
};

// Helper for fetching dependency payload
const getTaskDependenciesData = async (taskId) => {
  const task = await Task.findByPk(taskId, {
    include: [
      {
        model: Task,
        as: 'predecessors',
        attributes: ['id', 'title', 'status', 'priority', 'due_date'],
        include: [{ model: User, as: 'assignee', attributes: SAFE_USER_ATTRIBUTES }]
      },
      {
        model: Task,
        as: 'dependents',
        attributes: ['id', 'title', 'status', 'priority', 'due_date'],
        include: [{ model: User, as: 'assignee', attributes: SAFE_USER_ATTRIBUTES }]
      }
    ]
  });
  return {
    task_id: taskId,
    task_title: task?.title,
    predecessors: task?.predecessors || [],
    dependents: task?.dependents || []
  };
};

// 10. DELETE /api/tasks/:id/dependencies/:dependsOnTaskId (Transaction + Decision log)
const removeDependency = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id, dependsOnTaskId } = req.params;
    const { reason, next_action, next_owner_id } = req.body || {};

    const record = await TaskDependency.findOne({
      where: {
        task_id: id,
        depends_on_task_id: dependsOnTaskId
      },
      transaction: t
    });

    if (!record) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Dependency relation not found.'
      });
    }

    const predecessor = await Task.findByPk(dependsOnTaskId, { transaction: t });
    await record.destroy({ transaction: t });

    // Record decision log
    await TaskDecisionLog.create({
      task_id: parseInt(id, 10),
      decision_type: 'dependency_removed',
      change_summary: `Removed prerequisite dependency: "${predecessor?.title || dependsOnTaskId}" (#${dependsOnTaskId})`,
      previous_value: { depends_on_task_id: parseInt(dependsOnTaskId, 10) },
      new_value: null,
      reason: reason ? reason.trim() : 'Dependency decouple decision',
      decided_by: req.user.id,
      decided_at: new Date(),
      next_action: next_action ? next_action.trim() : null,
      next_owner_id: next_owner_id ? parseInt(next_owner_id, 10) : null,
      handoff_status: 'completed'
    }, { transaction: t });

    await t.commit();

    return res.status(200).json({
      success: true,
      message: 'Dependency removed successfully.'
    });
  } catch (error) {
    await t.rollback();
    console.error('[removeDependency Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove dependency.'
    });
  }
};

// 11. DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    await task.destroy();

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully.'
    });
  } catch (error) {
    console.error('[deleteTask Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete task.'
    });
  }
};

module.exports = {
  getProjectTasks,
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  assignTask,
  getTaskDependencies,
  addDependency,
  removeDependency,
  deleteTask
};
