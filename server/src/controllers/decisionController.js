const { TaskDecisionLog, Task, Project, User, Notification, sequelize } = require('../models');

/**
 * Record a manual decision or handoff for a task
 * POST /api/tasks/:id/decisions
 */
const createTaskDecision = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      decision_type = 'general_decision',
      change_summary,
      previous_value = null,
      new_value = null,
      reason,
      next_action = null,
      next_owner_id = null,
      next_action_due_at = null,
      handoff_status = 'pending'
    } = req.body;

    if (!change_summary || !change_summary.trim()) {
      await t.rollback();
      return res.status(400).json({ message: 'A change summary is required.' });
    }

    const task = await Task.findByPk(id, {
      include: [{ model: Project, as: 'project' }],
      transaction: t
    });

    if (!task) {
      await t.rollback();
      return res.status(404).json({ message: 'Task not found.' });
    }

    const decisionLog = await TaskDecisionLog.create({
      task_id: task.id,
      decision_type,
      change_summary: change_summary.trim(),
      previous_value,
      new_value,
      reason: reason ? reason.trim() : null,
      decided_by: req.user.id,
      decided_at: new Date(),
      next_action: next_action ? next_action.trim() : null,
      next_owner_id: next_owner_id ? parseInt(next_owner_id, 10) : null,
      next_action_due_at: next_action_due_at || null,
      handoff_status
    }, { transaction: t });

    // If next_owner_id specified and different from decider, notify them
    if (next_owner_id && parseInt(next_owner_id, 10) !== req.user.id) {
      await Notification.create({
        user_id: parseInt(next_owner_id, 10),
        type: 'handoff_assigned',
        message: `📋 Decision Handoff: You were assigned next action on "${task.title}": "${next_action || change_summary}" by ${req.user.name}`,
        related_id: decisionLog.id
      }, { transaction: t });
    }

    await t.commit();

    const fullLog = await TaskDecisionLog.findByPk(decisionLog.id, {
      include: [
        { model: User, as: 'decider', attributes: ['id', 'name', 'email', 'role'] },
        { model: User, as: 'nextOwner', attributes: ['id', 'name', 'email', 'role'] },
        { model: Task, as: 'task', include: [{ model: Project, as: 'project' }] }
      ]
    });

    return res.status(201).json({
      message: 'Decision and handoff recorded successfully.',
      decision: fullLog
    });
  } catch (error) {
    await t.rollback();
    console.error('Error recording task decision:', error);
    return res.status(500).json({ message: 'Internal server error while recording decision log.' });
  }
};

/**
 * Get all decision logs for a specific task
 * GET /api/tasks/:id/decisions
 */
const getTaskDecisions = async (req, res) => {
  try {
    const { id } = req.params;

    const decisions = await TaskDecisionLog.findAll({
      where: { task_id: id },
      include: [
        { model: User, as: 'decider', attributes: ['id', 'name', 'email', 'role'] },
        { model: User, as: 'nextOwner', attributes: ['id', 'name', 'email', 'role'] }
      ],
      order: [['decided_at', 'DESC']]
    });

    return res.json(decisions);
  } catch (error) {
    console.error('Error fetching task decisions:', error);
    return res.status(500).json({ message: 'Internal server error while fetching decision logs.' });
  }
};

/**
 * Get single decision log by ID
 * GET /api/decisions/:id
 */
const getDecisionById = async (req, res) => {
  try {
    const { id } = req.params;

    const decision = await TaskDecisionLog.findByPk(id, {
      include: [
        { model: User, as: 'decider', attributes: ['id', 'name', 'email', 'role'] },
        { model: User, as: 'nextOwner', attributes: ['id', 'name', 'email', 'role'] },
        {
          model: Task,
          as: 'task',
          include: [{ model: Project, as: 'project' }]
        }
      ]
    });

    if (!decision) {
      return res.status(404).json({ message: 'Decision log entry not found.' });
    }

    return res.json(decision);
  } catch (error) {
    console.error('Error fetching decision log:', error);
    return res.status(500).json({ message: 'Internal server error while fetching decision log.' });
  }
};

/**
 * Update handoff status
 * PATCH /api/decisions/:id/handoff
 */
const updateHandoffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { handoff_status } = req.body;

    const validStatuses = ['pending', 'accepted', 'completed', 'cancelled'];
    if (!validStatuses.includes(handoff_status)) {
      return res.status(400).json({ message: `Invalid handoff_status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const decision = await TaskDecisionLog.findByPk(id, {
      include: [
        { model: User, as: 'decider', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'nextOwner', attributes: ['id', 'name', 'email'] },
        { model: Task, as: 'task', include: [{ model: Project, as: 'project' }] }
      ]
    });

    if (!decision) {
      return res.status(404).json({ message: 'Decision log entry not found.' });
    }

    await decision.update({ handoff_status });

    // Notify original decider if different from updater
    if (decision.decided_by && decision.decided_by !== req.user.id) {
      await Notification.create({
        user_id: decision.decided_by,
        type: 'handoff_status_updated',
        message: `Handoff for task "${decision.task?.title}" was marked as "${handoff_status}" by ${req.user.name}.`,
        related_id: decision.id
      });
    }

    return res.json({
      message: `Handoff status updated to "${handoff_status}".`,
      decision
    });
  } catch (error) {
    console.error('Error updating handoff status:', error);
    return res.status(500).json({ message: 'Internal server error while updating handoff status.' });
  }
};

/**
 * Get handoffs where authenticated user is the next_owner
 * GET /api/users/me/handoffs
 */
const getUserHandoffs = async (req, res) => {
  try {
    const userId = req.user.id;

    const handoffs = await TaskDecisionLog.findAll({
      where: { next_owner_id: userId },
      include: [
        { model: User, as: 'decider', attributes: ['id', 'name', 'email', 'role'] },
        {
          model: Task,
          as: 'task',
          include: [
            { model: Project, as: 'project' },
            { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
          ]
        }
      ],
      order: [
        ['handoff_status', 'ASC'], // pending & accepted first
        ['decided_at', 'DESC']
      ]
    });

    return res.json(handoffs);
  } catch (error) {
    console.error('Error fetching user handoffs:', error);
    return res.status(500).json({ message: 'Internal server error while fetching handoffs.' });
  }
};

/**
 * Get all decision logs across all tasks in a project
 * GET /api/projects/:id/decisions
 */
const getProjectDecisions = async (req, res) => {
  try {
    const { id } = req.params;

    const decisions = await TaskDecisionLog.findAll({
      include: [
        {
          model: Task,
          as: 'task',
          where: { project_id: id },
          attributes: ['id', 'title', 'status', 'priority', 'project_id']
        },
        { model: User, as: 'decider', attributes: ['id', 'name', 'email', 'role'] },
        { model: User, as: 'nextOwner', attributes: ['id', 'name', 'email', 'role'] }
      ],
      order: [['decided_at', 'DESC']]
    });

    return res.json(decisions);
  } catch (error) {
    console.error('Error fetching project decisions:', error);
    return res.status(500).json({ message: 'Internal server error while fetching project decision history.' });
  }
};

module.exports = {
  createTaskDecision,
  getTaskDecisions,
  getDecisionById,
  updateHandoffStatus,
  getUserHandoffs,
  getProjectDecisions
};
