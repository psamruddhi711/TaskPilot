const { Op } = require('sequelize');
const { Task, TaskDependency, Project, User } = require('../models');

const SAFE_USER_ATTRIBUTES = ['id', 'name', 'email', 'role', 'weekly_capacity_hours'];

// Helper to check if task is overdue
const isTaskOverdue = (task) => {
  if (!task.due_date || task.status === 'Completed') return false;
  const today = new Date().toISOString().split('T')[0];
  return task.due_date < today;
};

// Helper: Check if all predecessors are completed
const validatePredecessorsCompleted = async (taskId) => {
  const task = await Task.findByPk(taskId, {
    include: [
      {
        model: Task,
        as: 'predecessors',
        attributes: ['id', 'title', 'status', 'priority']
      }
    ]
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
      depends_on
    } = req.body;

    if (!project_id || !title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and task title are required.'
      });
    }

    const project = await Project.findByPk(project_id);
    if (!project) {
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
    });

    // Handle initial dependencies if provided
    if (Array.isArray(depends_on) && depends_on.length > 0) {
      const validPredecessorIds = depends_on.filter((depId) => depId !== newTask.id);
      const depRecords = validPredecessorIds.map((depId) => ({
        task_id: newTask.id,
        depends_on_task_id: parseInt(depId, 10)
      }));
      if (depRecords.length > 0) {
        await TaskDependency.bulkCreate(depRecords, { ignoreDuplicates: true });
      }
    }

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
    console.error('[createTask Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create task.'
    });
  }
};

// 5. PUT /api/tasks/:id
const updateTask = async (req, res) => {
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
      depends_on
    } = req.body;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    // Business rule check when moving to In Progress
    if (status === 'In Progress' && task.status !== 'In Progress') {
      const { valid, uncompletedPredecessors } = await validatePredecessorsCompleted(id);
      if (!valid) {
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

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Task title cannot be empty.' });
      }
      task.title = title.trim();
    }

    if (description !== undefined) task.description = description ? description.trim() : null;
    if (assigned_to !== undefined) task.assigned_to = assigned_to ? parseInt(assigned_to, 10) : null;
    if (estimated_hours !== undefined) task.estimated_hours = parseFloat(estimated_hours) || 0;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    if (start_date !== undefined) task.start_date = start_date || null;
    if (due_date !== undefined) task.due_date = due_date || null;

    await task.save();

    // Sync dependencies if depends_on array is explicitly supplied
    if (Array.isArray(depends_on)) {
      await TaskDependency.destroy({ where: { task_id: id } });
      const validDepIds = depends_on.filter((dId) => parseInt(dId, 10) !== parseInt(id, 10));
      if (validDepIds.length > 0) {
        const depRecords = validDepIds.map((dId) => ({
          task_id: parseInt(id, 10),
          depends_on_task_id: parseInt(dId, 10)
        }));
        await TaskDependency.bulkCreate(depRecords, { ignoreDuplicates: true });
      }
    }

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
    console.error('[updateTask Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update task.'
    });
  }
};

// 6. PATCH /api/tasks/:id/status
const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['To Do', 'In Progress', 'Blocked', 'In Review', 'Completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of [${validStatuses.join(', ')}].`
      });
    }

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    // Business rule: a task cannot move to “In Progress” if any predecessor task is not “Completed”
    if (status === 'In Progress') {
      const { valid, uncompletedPredecessors } = await validatePredecessorsCompleted(id);
      if (!valid) {
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

    task.status = status;
    await task.save();

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
    console.error('[updateTaskStatus Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update task status.'
    });
  }
};

// 7. PATCH /api/tasks/:id/assign
const assignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to, confirmed_override } = req.body;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    if (assigned_to) {
      const user = await User.findByPk(assigned_to);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Assigned user does not exist.'
        });
      }

      // Calculate user's active workload (excluding this task)
      const activeTasks = await Task.findAll({
        where: {
          assigned_to: user.id,
          id: { [Op.ne]: task.id },
          status: { [Op.notIn]: ['Completed', 'Cancelled'] }
        },
        attributes: ['id', 'estimated_hours']
      });

      const current_assigned_hours = activeTasks.reduce(
        (sum, t) => sum + (parseFloat(t.estimated_hours) || 0),
        0
      );

      const task_estimated_hours = parseFloat(task.estimated_hours) || 0;
      const projected_hours = current_assigned_hours + task_estimated_hours;
      const weekly_capacity_hours = parseFloat(user.weekly_capacity_hours) || 40;

      // Check if assignment exceeds weekly capacity
      if (projected_hours > weekly_capacity_hours && confirmed_override !== true) {
        const excess_hours = Math.round((projected_hours - weekly_capacity_hours) * 10) / 10;
        const projected_utilization = Math.round((projected_hours / weekly_capacity_hours) * 100 * 10) / 10;

        return res.status(409).json({
          success: false,
          code: 'OVERLOAD_WARNING',
          message: `Workload Alert: Assigning this task (${task_estimated_hours}h) will overload ${user.name} to ${projected_hours}h / ${weekly_capacity_hours}h (${projected_utilization}% capacity, +${excess_hours}h excess). Confirmation required to override.`,
          data: {
            user_id: user.id,
            user_name: user.name,
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

    await task.save();

    const updatedTask = await Task.findByPk(id, {
      include: [{ model: User, as: 'assignee', attributes: SAFE_USER_ATTRIBUTES }]
    });

    return res.status(200).json({
      success: true,
      message: 'Task assignee updated successfully.',
      data: updatedTask
    });
  } catch (error) {
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

// 9. POST /api/tasks/:id/dependencies
const addDependency = async (req, res) => {
  try {
    const { id } = req.params;
    const { depends_on_task_id } = req.body;

    if (!depends_on_task_id) {
      return res.status(400).json({
        success: false,
        message: 'depends_on_task_id is required.'
      });
    }

    const taskId = parseInt(id, 10);
    const dependsOnId = parseInt(depends_on_task_id, 10);

    if (taskId === dependsOnId) {
      return res.status(400).json({
        success: false,
        message: 'A task cannot depend on itself.'
      });
    }

    const [task, predecessor] = await Promise.all([
      Task.findByPk(taskId),
      Task.findByPk(dependsOnId)
    ]);

    if (!task || !predecessor) {
      return res.status(404).json({
        success: false,
        message: 'Target task or predecessor task not found.'
      });
    }

    // Check for circular dependency (if predecessor already depends on task)
    const reverseDependency = await TaskDependency.findOne({
      where: {
        task_id: dependsOnId,
        depends_on_task_id: taskId
      }
    });

    if (reverseDependency) {
      return res.status(400).json({
        success: false,
        message: 'Circular dependency detected: The predecessor task already depends on this task.'
      });
    }

    await TaskDependency.findOrCreate({
      where: {
        task_id: taskId,
        depends_on_task_id: dependsOnId
      }
    });

    const dependencies = await getTaskDependenciesData(taskId);

    return res.status(201).json({
      success: true,
      message: 'Task dependency added successfully.',
      data: dependencies
    });
  } catch (error) {
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

// 10. DELETE /api/tasks/:id/dependencies/:dependsOnTaskId
const removeDependency = async (req, res) => {
  try {
    const { id, dependsOnTaskId } = req.params;

    const record = await TaskDependency.findOne({
      where: {
        task_id: id,
        depends_on_task_id: dependsOnTaskId
      }
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Dependency relation not found.'
      });
    }

    await record.destroy();

    return res.status(200).json({
      success: true,
      message: 'Dependency removed successfully.'
    });
  } catch (error) {
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
