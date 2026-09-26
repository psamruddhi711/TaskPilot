const { Op } = require('sequelize');
const {
  Project,
  ProjectMember,
  User,
  Task,
  TaskBlocker,
  TaskDecisionLog,
  Notification
} = require('../models');

const INACTIVE_TASK_STATUSES = ['Completed', 'Cancelled'];

/**
 * Helper to check if a date string/Date is overdue compared to today
 */
const isDateOverdue = (dateStr) => {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return target < today;
};

/**
 * GET /api/dashboard/summary
 * GET /api/dashboard/:projectId/summary
 */
const getDashboardSummary = async (req, res) => {
  try {
    const projectId = req.params.projectId || req.query.projectId || 'all';

    // 1. Projects Scope
    let projectWhere = {};
    let taskWhere = {};
    let memberWhere = {};

    if (projectId !== 'all') {
      const pid = parseInt(projectId, 10);
      projectWhere = { id: pid };
      taskWhere = { project_id: pid };
      memberWhere = { project_id: pid };
    }

    // 2. Fetch Projects
    const allProjects = await Project.findAll({
      where: projectId !== 'all' ? projectWhere : {},
      include: [
        {
          model: Task,
          as: 'tasks',
          attributes: ['id', 'status', 'estimated_hours', 'due_date']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const projectProgressList = allProjects.map((p) => {
      const tasks = p.tasks || [];
      const total = tasks.length;
      const completed = tasks.filter((t) => t.status === 'Completed').length;
      const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
      const blocked = tasks.filter((t) => t.status === 'Blocked').length;
      const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status,
        deadline: p.deadline,
        total_tasks: total,
        completed_tasks: completed,
        in_progress_tasks: inProgress,
        blocked_tasks: blocked,
        progress_percent: progressPercent
      };
    });

    // 3. Fetch Tasks
    const allTasks = await Task.findAll({
      where: taskWhere,
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'role'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const totalTasksCount = allTasks.length;
    const completedTasksCount = allTasks.filter((t) => t.status === 'Completed').length;
    const inProgressTasksCount = allTasks.filter((t) => t.status === 'In Progress').length;
    const blockedTasksCount = allTasks.filter((t) => t.status === 'Blocked').length;
    const inReviewTasksCount = allTasks.filter((t) => t.status === 'In Review').length;
    const toDoTasksCount = allTasks.filter((t) => t.status === 'To Do').length;

    const overdueTasks = allTasks.filter(
      (t) => t.status !== 'Completed' && isDateOverdue(t.due_date)
    );
    const overdueTasksCount = overdueTasks.length;

    // 4. Fetch Members / Workload
    let usersToAnalyze = [];
    if (projectId === 'all') {
      usersToAnalyze = await User.findAll({
        attributes: ['id', 'name', 'email', 'role', 'weekly_capacity_hours'],
        order: [['name', 'ASC']]
      });
    } else {
      const members = await ProjectMember.findAll({
        where: memberWhere,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'role', 'weekly_capacity_hours']
          }
        ]
      });
      usersToAnalyze = members.filter((m) => m.user).map((m) => m.user.toJSON());
    }

    const teamWorkloadList = await Promise.all(
      usersToAnalyze.map(async (member) => {
        const activeTasks = await Task.findAll({
          where: {
            assigned_to: member.id,
            status: { [Op.notIn]: INACTIVE_TASK_STATUSES },
            ...(projectId !== 'all' ? { project_id: parseInt(projectId, 10) } : {})
          },
          attributes: ['id', 'estimated_hours', 'status']
        });

        const assignedWorkload = activeTasks.reduce(
          (sum, t) => sum + (parseFloat(t.estimated_hours) || 0),
          0
        );
        const weeklyCapacity = parseFloat(member.weekly_capacity_hours) || 40;
        const availableCapacity = Math.max(0, weeklyCapacity - assignedWorkload);
        const utilization = weeklyCapacity > 0 ? Math.round((assignedWorkload / weeklyCapacity) * 100 * 10) / 10 : 0;

        return {
          user_id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          weekly_capacity_hours: weeklyCapacity,
          assigned_workload: assignedWorkload,
          available_capacity: availableCapacity,
          utilization_percent: utilization,
          active_tasks_count: activeTasks.length
        };
      })
    );

    // 5. Blockers (Active + Escalated)
    const blockerWhere = {
      status: { [Op.in]: ['active', 'escalated'] }
    };

    const openBlockers = await TaskBlocker.findAll({
      where: blockerWhere,
      include: [
        {
          model: Task,
          as: 'task',
          where: taskWhere,
          attributes: ['id', 'title', 'priority', 'status', 'project_id'],
          include: [{ model: Project, as: 'project', attributes: ['id', 'name'] }]
        }
      ],
      order: [['blocked_at', 'DESC']]
    });

    const activeBlockersCount = openBlockers.filter((b) => b.status === 'active').length;
    const escalatedBlockersCount = openBlockers.filter((b) => b.status === 'escalated').length;

    // 6. Upcoming Deadlines (Next 7 Days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7Days = new Date();
    in7Days.setDate(today.getDate() + 7);
    in7Days.setHours(23, 59, 59, 999);

    const upcomingTasks = allTasks
      .filter((t) => {
        if (t.status === 'Completed' || !t.due_date) return false;
        const d = new Date(t.due_date);
        return d >= today && d <= in7Days;
      })
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    // 7. Recent Activity Feed (Combined Decision Logs & Notifications)
    let decisionWhere = {};
    if (projectId !== 'all') {
      const taskIdsInProj = allTasks.map((t) => t.id);
      decisionWhere = { task_id: { [Op.in]: taskIdsInProj } };
    }

    const recentDecisions = await TaskDecisionLog.findAll({
      where: decisionWhere,
      include: [
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title', 'project_id'],
          include: [{ model: Project, as: 'project', attributes: ['id', 'name'] }]
        },
        { model: User, as: 'decider', attributes: ['id', 'name', 'role'] },
        { model: User, as: 'nextOwner', attributes: ['id', 'name', 'role'] }
      ],
      order: [['decided_at', 'DESC']],
      limit: 15
    });

    const formattedActivities = recentDecisions.map((d) => ({
      id: `decision-${d.id}`,
      type: 'decision',
      decision_type: d.decision_type,
      summary: d.change_summary,
      reason: d.reason,
      task_id: d.task_id,
      task_title: d.task?.title || 'Untitled Task',
      project_name: d.task?.project?.name || null,
      actor_name: d.decider?.name || 'System',
      actor_role: d.decider?.role || 'Member',
      next_owner_name: d.nextOwner?.name || null,
      handoff_status: d.handoff_status,
      timestamp: d.decided_at || d.created_at
    }));

    return res.status(200).json({
      success: true,
      selected_project_id: projectId,
      metrics: {
        total_projects: allProjects.length,
        total_tasks: totalTasksCount,
        total_members: usersToAnalyze.length,
        completed_tasks: completedTasksCount,
        in_progress_tasks: inProgressTasksCount,
        blocked_tasks: blockedTasksCount,
        in_review_tasks: inReviewTasksCount,
        to_do_tasks: toDoTasksCount,
        overdue_tasks: overdueTasksCount,
        active_blockers: activeBlockersCount,
        escalated_blockers: escalatedBlockersCount,
        total_open_blockers: activeBlockersCount + escalatedBlockersCount
      },
      project_progress: projectProgressList,
      team_workload: teamWorkloadList,
      upcoming_deadlines: upcomingTasks.slice(0, 8),
      recent_blockers: openBlockers.slice(0, 5),
      recent_activities: formattedActivities
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard summary data.'
    });
  }
};

module.exports = {
  getDashboardSummary
};
