const cron = require('node-cron');
const { Op } = require('sequelize');
const { TaskBlocker, Task, Project, User, EscalationEvent, Notification } = require('../models');

/**
 * Get configured thresholds in milliseconds
 */
const getThresholds = () => {
  // Support both hours (float/int) and explicit minutes env variables
  const notifyHours = process.env.BLOCKER_NOTIFY_MINUTES
    ? parseFloat(process.env.BLOCKER_NOTIFY_MINUTES) / 60
    : parseFloat(process.env.BLOCKER_NOTIFY_HOURS || '24');

  const escalateHours = process.env.BLOCKER_ESCALATE_MINUTES
    ? parseFloat(process.env.BLOCKER_ESCALATE_MINUTES) / 60
    : parseFloat(process.env.BLOCKER_ESCALATE_HOURS || '48');

  return {
    notifyMs: notifyHours * 60 * 60 * 1000,
    escalateMs: escalateHours * 60 * 60 * 1000,
    notifyHours,
    escalateHours
  };
};

/**
 * Check blockers and trigger notifications / escalations as necessary
 */
const checkBlockerEscalations = async () => {
  try {
    const { notifyMs, escalateMs, notifyHours, escalateHours } = getThresholds();
    const now = Date.now();

    // Find all un-resolved blockers
    const openBlockers = await TaskBlocker.findAll({
      where: {
        status: {
          [Op.in]: ['active', 'escalated']
        }
      },
      include: [
        {
          model: Task,
          as: 'task',
          include: [
            {
              model: Project,
              as: 'project',
              include: [
                { model: User, as: 'manager', attributes: ['id', 'name', 'email'] }
              ]
            },
            { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
          ]
        },
        {
          model: EscalationEvent,
          as: 'escalationEvents'
        }
      ]
    });

    if (openBlockers.length === 0) {
      return;
    }

    for (const blocker of openBlockers) {
      if (!blocker.task || !blocker.task.project) continue;

      const projectManagerId = blocker.task.project.manager_id;
      const blockedTime = new Date(blocker.blocked_at).getTime();
      const elapsedMs = now - blockedTime;

      const existingEvents = blocker.escalationEvents || [];
      const hasNotified = existingEvents.some(e => e.event_type === 'notified');
      const hasEscalated = existingEvents.some(e => e.event_type === 'escalated');

      // 1. Check Level 1: Warning Notification threshold (e.g. 24h)
      if (elapsedMs >= notifyMs && !hasNotified) {
        // Record 'notified' escalation event
        await EscalationEvent.create({
          blocker_id: blocker.id,
          event_type: 'notified',
          created_at: new Date()
        });

        // Notify project manager if configured
        if (projectManagerId) {
          const displayThreshold = notifyHours < 1 ? `${Math.round(notifyHours * 60)} minutes` : `${notifyHours} hours`;
          await Notification.create({
            user_id: projectManagerId,
            type: 'blocker_warning',
            message: `⚠️ Blocker Warning: Task "${blocker.task.title}" in "${blocker.task.project.name}" has been blocked for over ${displayThreshold}. Reason: "${blocker.reason}"`,
            related_id: blocker.id
          });
        }
        console.log(`[Escalation Cron] Warning notification sent for Blocker #${blocker.id} (Task: ${blocker.task.title})`);
      }

      // 2. Check Level 2: Escalation threshold (e.g. 48h)
      if (elapsedMs >= escalateMs && !hasEscalated) {
        // Update blocker status to 'escalated'
        await blocker.update({ status: 'escalated' });

        // Record 'escalated' escalation event
        await EscalationEvent.create({
          blocker_id: blocker.id,
          event_type: 'escalated',
          created_at: new Date()
        });

        // Notify project manager
        if (projectManagerId) {
          const displayThreshold = escalateHours < 1 ? `${Math.round(escalateHours * 60)} minutes` : `${escalateHours} hours`;
          await Notification.create({
            user_id: projectManagerId,
            type: 'blocker_escalation',
            message: `🚨 CRITICAL ESCALATION: Task "${blocker.task.title}" in "${blocker.task.project.name}" has been blocked for over ${displayThreshold} without resolution!`,
            related_id: blocker.id
          });
        }
        console.log(`[Escalation Cron] Blocker #${blocker.id} escalated for Task "${blocker.task.title}"`);
      }
    }
  } catch (error) {
    console.error('[Escalation Cron] Error running blocker escalation check:', error);
  }
};

/**
 * Start the cron scheduler
 * Runs every minute in development / production
 */
const initBlockerCron = () => {
  const cronSchedule = process.env.CRON_SCHEDULE || '* * * * *'; // Run every minute
  console.log(`[Escalation Cron] Initialized blocker escalation background worker (schedule: ${cronSchedule})`);

  cron.schedule(cronSchedule, () => {
    checkBlockerEscalations();
  });

  // Run an immediate check on startup
  setTimeout(() => {
    checkBlockerEscalations();
  }, 3000);
};

module.exports = {
  initBlockerCron,
  checkBlockerEscalations
};
