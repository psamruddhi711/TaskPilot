const { Op } = require('sequelize');
const { Project, ProjectMember, User, Task } = require('../models');

const INACTIVE_STATUSES = ['Completed', 'Cancelled'];

// 1. GET /api/workload/:projectId
const getProjectWorkload = async (req, res) => {
  try {
    const { projectId } = req.params;

    let project = null;
    let usersToAnalyze = [];

    if (projectId === 'all') {
      // Global team workload across all projects
      usersToAnalyze = await User.findAll({
        attributes: ['id', 'name', 'email', 'role', 'weekly_capacity_hours'],
        order: [['name', 'ASC']]
      });
    } else {
      project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found.'
        });
      }

      const members = await ProjectMember.findAll({
        where: { project_id: projectId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'role', 'weekly_capacity_hours']
          }
        ]
      });

      usersToAnalyze = members
        .filter((m) => m.user)
        .map((m) => ({
          ...m.user.toJSON(),
          project_role: m.project_role
        }));
    }

    // Calculate active workload for each member
    const memberWorkloads = await Promise.all(
      usersToAnalyze.map(async (member) => {
        const activeTasks = await Task.findAll({
          where: {
            assigned_to: member.id,
            status: { [Op.notIn]: INACTIVE_STATUSES }
          },
          include: [
            {
              model: Project,
              as: 'project',
              attributes: ['id', 'name']
            }
          ],
          order: [['due_date', 'ASC']]
        });

        const assigned_workload = activeTasks.reduce(
          (sum, t) => sum + (parseFloat(t.estimated_hours) || 0),
          0
        );

        const weekly_capacity_hours = parseFloat(member.weekly_capacity_hours) || 40;
        const available_capacity = Math.max(0, weekly_capacity_hours - assigned_workload);
        const raw_utilization = (assigned_workload / weekly_capacity_hours) * 100;
        const utilization_percentage = Math.round(raw_utilization * 10) / 10;

        let status = 'Optimal';
        if (utilization_percentage > 100) {
          status = 'Overallocated';
        } else if (utilization_percentage >= 80) {
          status = 'High';
        }

        return {
          user_id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          project_role: member.project_role || member.role,
          weekly_capacity_hours,
          assigned_workload,
          available_capacity,
          utilization_percentage,
          status,
          active_tasks_count: activeTasks.length,
          active_tasks: activeTasks.map((t) => ({
            id: t.id,
            title: t.title,
            project_id: t.project_id,
            project_name: t.project?.name,
            estimated_hours: t.estimated_hours,
            priority: t.priority,
            status: t.status,
            due_date: t.due_date
          }))
        };
      })
    );

    // Summary statistics
    const total_capacity = memberWorkloads.reduce((sum, m) => sum + m.weekly_capacity_hours, 0);
    const total_assigned = memberWorkloads.reduce((sum, m) => sum + m.assigned_workload, 0);
    const avg_utilization =
      total_capacity > 0 ? Math.round((total_assigned / total_capacity) * 100 * 10) / 10 : 0;
    const overallocated_count = memberWorkloads.filter((m) => m.status === 'Overallocated').length;

    return res.status(200).json({
      success: true,
      data: {
        project: project
          ? {
              id: project.id,
              name: project.name,
              status: project.status
            }
          : null,
        members: memberWorkloads,
        summary: {
          total_members: memberWorkloads.length,
          total_capacity,
          total_assigned,
          avg_utilization,
          overallocated_count
        }
      }
    });
  } catch (error) {
    console.error('[getProjectWorkload Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve workload metrics.'
    });
  }
};

// 2. GET /api/workload/:projectId/suggestions?taskId=
const getWorkloadSuggestions = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { taskId } = req.query;

    let targetTask = null;
    let taskEstimatedHours = 0;

    if (taskId) {
      targetTask = await Task.findByPk(taskId, {
        attributes: ['id', 'title', 'project_id', 'estimated_hours', 'assigned_to', 'status']
      });
      if (targetTask) {
        taskEstimatedHours = parseFloat(targetTask.estimated_hours) || 0;
      }
    }

    // Get eligible project members (or all users if projectId is 'all')
    let eligibleMembers = [];
    if (projectId === 'all') {
      const users = await User.findAll({
        attributes: ['id', 'name', 'email', 'role', 'weekly_capacity_hours']
      });
      eligibleMembers = users.map((u) => ({
        ...u.toJSON(),
        project_role: u.role
      }));
    } else {
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found.'
        });
      }

      const members = await ProjectMember.findAll({
        where: { project_id: projectId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'role', 'weekly_capacity_hours']
          }
        ]
      });

      eligibleMembers = members
        .filter((m) => m.user)
        .map((m) => ({
          ...m.user.toJSON(),
          project_role: m.project_role
        }));
    }

    // Compute suggestion scores for each member
    const suggestions = await Promise.all(
      eligibleMembers.map(async (member) => {
        // Query active tasks for this user (exclude target task so we don't double count)
        const whereClause = {
          assigned_to: member.id,
          status: { [Op.notIn]: INACTIVE_STATUSES }
        };
        if (targetTask) {
          whereClause.id = { [Op.ne]: targetTask.id };
        }

        const activeTasks = await Task.findAll({
          where: whereClause,
          attributes: ['id', 'estimated_hours']
        });

        const current_workload = activeTasks.reduce(
          (sum, t) => sum + (parseFloat(t.estimated_hours) || 0),
          0
        );

        const weekly_capacity_hours = parseFloat(member.weekly_capacity_hours) || 40;
        const available_capacity = Math.max(0, weekly_capacity_hours - current_workload);

        const projected_workload = current_workload + taskEstimatedHours;
        const projected_available = weekly_capacity_hours - projected_workload;
        const projected_utilization =
          weekly_capacity_hours > 0
            ? Math.round((projected_workload / weekly_capacity_hours) * 100 * 10) / 10
            : 100;

        const is_overloaded = projected_workload > weekly_capacity_hours;

        // Reason generator
        let reason = '';
        if (is_overloaded) {
          const excess = Math.round((projected_workload - weekly_capacity_hours) * 10) / 10;
          reason = `Overload Warning: Adding ${taskEstimatedHours}h will push total workload to ${projected_workload}h (${projected_utilization}% capacity, +${excess}h excess).`;
        } else if (projected_utilization <= 70) {
          reason = `Recommended match: Has ${available_capacity}h available. Projected workload will be ${projected_workload}h (${projected_utilization}%).`;
        } else if (projected_utilization <= 90) {
          reason = `Balanced load: Projected workload will reach ${projected_workload}h (${projected_utilization}% capacity).`;
        } else {
          reason = `Near capacity: Projected workload will reach ${projected_workload}h (${projected_utilization}% capacity).`;
        }

        return {
          user_id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          project_role: member.project_role,
          weekly_capacity_hours,
          current_workload,
          available_capacity,
          task_estimated_hours: taskEstimatedHours,
          projected_workload,
          projected_available,
          projected_utilization,
          is_overloaded,
          is_currently_assigned: targetTask ? targetTask.assigned_to === member.id : false,
          reason
        };
      })
    );

    // Sort: Non-overloaded first, then by available capacity DESC
    suggestions.sort((a, b) => {
      if (a.is_overloaded !== b.is_overloaded) {
        return a.is_overloaded ? 1 : -1;
      }
      return b.available_capacity - a.available_capacity;
    });

    return res.status(200).json({
      success: true,
      data: {
        task: targetTask
          ? {
              id: targetTask.id,
              title: targetTask.title,
              estimated_hours: taskEstimatedHours,
              current_assignee_id: targetTask.assigned_to
            }
          : null,
        suggestions
      }
    });
  } catch (error) {
    console.error('[getWorkloadSuggestions Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve workload recommendations.'
    });
  }
};

module.exports = {
  getProjectWorkload,
  getWorkloadSuggestions
};
