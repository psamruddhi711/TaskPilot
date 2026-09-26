const { Op } = require('sequelize');
const {
  Task,
  User,
  Project,
  ProjectMember,
  Skill,
  UserSkill,
  TaskRequiredSkill,
  TaskEstimate,
  TaskRecommendation,
  TaskDecisionLog,
  Notification,
  sequelize
} = require('../models');

/**
 * Core Algorithm: Compute recommendations for a task across eligible project members
 */
const computeRecommendationScores = async (taskId, options = {}) => {
  const { complexity_factor = 1.0 } = options;

  const task = await Task.findByPk(taskId, {
    include: [
      { model: Project, as: 'project', include: [{ model: User, as: 'members' }] },
      {
        model: TaskRequiredSkill,
        as: 'taskRequiredSkills',
        include: [{ model: Skill, as: 'skill' }]
      }
    ]
  });

  if (!task) throw new Error('Task not found.');

  const requiredSkills = task.taskRequiredSkills || [];
  const baseline_hours = parseFloat(task.estimated_hours) || 8.0;

  // Find candidate users (project members or all users if project has no members)
  let candidateUsers = [];
  if (task.project && task.project.members && task.project.members.length > 0) {
    candidateUsers = task.project.members;
  } else {
    candidateUsers = await User.findAll();
  }

  const recommendations = [];

  for (const user of candidateUsers) {
    // 1. Fetch User Skills
    const userSkills = await UserSkill.findAll({
      where: { user_id: user.id },
      include: [{ model: Skill, as: 'skill' }]
    });
    const userSkillMap = new Map();
    userSkills.forEach(us => userSkillMap.set(us.skill_id, us));

    // Calculate Skill Match Score (0 - 100)
    const matchedSkills = [];
    const missingSkills = [];
    let skillMatchScore = 100;
    let skillAdjustmentFactor = 1.0;

    if (requiredSkills.length > 0) {
      let totalWeight = 0;
      let earnedWeight = 0;
      let hasMissingMandatory = false;
      let totalReqProf = 0;
      let totalUserProf = 0;

      for (const reqSkill of requiredSkills) {
        const weight = reqSkill.is_mandatory ? 2 : 1;
        totalWeight += weight;
        totalReqProf += reqSkill.minimum_proficiency;

        const userSkill = userSkillMap.get(reqSkill.skill_id);
        const skillName = reqSkill.skill ? reqSkill.skill.name : `Skill #${reqSkill.skill_id}`;

        if (userSkill) {
          totalUserProf += userSkill.proficiency_level;
          const meets = userSkill.proficiency_level >= reqSkill.minimum_proficiency;
          matchedSkills.push({
            skill_id: reqSkill.skill_id,
            name: skillName,
            user_proficiency: userSkill.proficiency_level,
            required_proficiency: reqSkill.minimum_proficiency,
            years_experience: userSkill.years_experience,
            meets_requirement: meets
          });

          if (meets) {
            earnedWeight += weight;
          } else {
            earnedWeight += (userSkill.proficiency_level / reqSkill.minimum_proficiency * 0.7) * weight;
          }
        } else {
          missingSkills.push({
            skill_id: reqSkill.skill_id,
            name: skillName,
            required_proficiency: reqSkill.minimum_proficiency,
            is_mandatory: reqSkill.is_mandatory
          });
          if (reqSkill.is_mandatory) {
            hasMissingMandatory = true;
          }
        }
      }

      skillMatchScore = totalWeight > 0 ? (earnedWeight / totalWeight) * 100 : 100;
      if (hasMissingMandatory) {
        skillMatchScore = skillMatchScore * 0.6; // Heavy penalty for missing mandatory skills
      }
      skillMatchScore = Math.min(100, Math.max(0, Math.round(skillMatchScore * 10) / 10));

      // Determine skill adjustment factor
      const avgReq = totalReqProf / requiredSkills.length;
      const avgUser = matchedSkills.length > 0 ? totalUserProf / matchedSkills.length : 0;
      if (missingSkills.length === 0 && avgUser > avgReq) {
        skillAdjustmentFactor = 0.8; // Exceeds requirements -> faster
      } else if (missingSkills.length === 0 && avgUser >= avgReq) {
        skillAdjustmentFactor = 1.0; // Meets requirements -> baseline
      } else {
        skillAdjustmentFactor = 1.3; // Below minimum or missing skill -> slower
      }
    }

    // 2. Calculate Capacity Score (0 - 100)
    const activeTasks = await Task.findAll({
      where: {
        assigned_to: user.id,
        id: { [Op.ne]: task.id },
        status: { [Op.notIn]: ['Completed', 'Cancelled'] }
      },
      attributes: ['id', 'estimated_hours']
    });

    const assignedWorkload = activeTasks.reduce(
      (sum, t) => sum + (parseFloat(t.estimated_hours) || 0),
      0
    );
    const weeklyCapacity = parseFloat(user.weekly_capacity_hours) || 40;
    const availableCapacity = Math.max(0, weeklyCapacity - assignedWorkload);
    const capacityScore = Math.min(100, Math.max(0, Math.round((availableCapacity / weeklyCapacity) * 100 * 10) / 10));

    // 3. Calculate Experience Score (0 - 100)
    // Count completed tasks that shared required skills
    let experienceScore = 50; // Neutral default
    if (requiredSkills.length > 0) {
      const requiredSkillIds = requiredSkills.map(r => r.skill_id);
      const completedTasksWithSkills = await Task.count({
        where: {
          assigned_to: user.id,
          status: 'Completed'
        },
        include: [
          {
            model: TaskRequiredSkill,
            as: 'taskRequiredSkills',
            where: { skill_id: { [Op.in]: requiredSkillIds } }
          }
        ]
      });

      experienceScore = 50 + Math.min(50, completedTasksWithSkills * 15);
    }

    // 4. Calculate Total Score (0.60*skill + 0.25*capacity + 0.15*experience)
    const totalScore = Math.round(
      ((0.60 * skillMatchScore) + (0.25 * capacityScore) + (0.15 * experienceScore)) * 10
    ) / 10;

    // 5. Effort and Duration
    const complexity = parseFloat(complexity_factor) || 1.0;
    const estimatedEffortHours = Math.round((baseline_hours * skillAdjustmentFactor * complexity) * 10) / 10;
    const availableHoursPerDay = Math.max(1, Math.round((availableCapacity / 5) * 10) / 10);
    const estimatedDurationDays = Math.round((estimatedEffortHours / availableHoursPerDay) * 10) / 10;

    recommendations.push({
      task_id: task.id,
      user_id: user.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        weekly_capacity_hours: weeklyCapacity,
        assigned_workload: assignedWorkload,
        available_capacity: availableCapacity
      },
      skill_match_score: skillMatchScore,
      capacity_score: capacityScore,
      experience_score: experienceScore,
      total_score: totalScore,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      skill_adjustment_factor: skillAdjustmentFactor,
      complexity_factor: complexity,
      estimated_effort_hours: estimatedEffortHours,
      available_hours_per_day: availableHoursPerDay,
      estimated_duration_days: estimatedDurationDays
    });
  }

  // Sort descending by total score
  recommendations.sort((a, b) => b.total_score - a.total_score);

  return recommendations;
};

/**
 * Compute and store recommendations for a task
 * POST /api/tasks/:id/recommendations
 */
const computeTaskRecommendations = async (req, res) => {
  try {
    const { id } = req.params;
    const { complexity_factor } = req.body;

    const scoredCandidates = await computeRecommendationScores(id, { complexity_factor });

    // Store in task_recommendations table
    await TaskRecommendation.destroy({ where: { task_id: id } });
    const records = scoredCandidates.map(c => ({
      task_id: parseInt(id, 10),
      user_id: c.user_id,
      skill_match_score: c.skill_match_score,
      capacity_score: c.capacity_score,
      experience_score: c.experience_score,
      total_score: c.total_score,
      matched_skills: c.matched_skills,
      missing_skills: c.missing_skills,
      estimated_effort_hours: c.estimated_effort_hours,
      estimated_duration_days: c.estimated_duration_days
    }));

    if (records.length > 0) {
      await TaskRecommendation.bulkCreate(records);
    }

    return res.json({
      message: 'Recommendations computed and stored successfully.',
      task_id: parseInt(id, 10),
      recommendations: scoredCandidates
    });
  } catch (error) {
    console.error('Error computing task recommendations:', error);
    return res.status(500).json({ message: error.message || 'Internal server error while computing recommendations.' });
  }
};

/**
 * Get stored recommendations for a task
 * GET /api/tasks/:id/recommendations
 */
const getTaskRecommendations = async (req, res) => {
  try {
    const { id } = req.params;

    // First try computing fresh or fetching stored
    const recommendations = await computeRecommendationScores(id);

    return res.json({
      task_id: parseInt(id, 10),
      recommendations
    });
  } catch (error) {
    console.error('Error getting task recommendations:', error);
    return res.status(500).json({ message: error.message || 'Internal server error while fetching recommendations.' });
  }
};

/**
 * Preview task estimate dynamically given candidate, complexity, daily hours
 * POST /api/tasks/:id/estimate
 */
const previewTaskEstimate = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, baseline_hours, complexity_factor = 1.0, available_hours_per_day } = req.body;

    const task = await Task.findByPk(id, {
      include: [
        {
          model: TaskRequiredSkill,
          as: 'taskRequiredSkills',
          include: [{ model: Skill, as: 'skill' }]
        }
      ]
    });

    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const user = await User.findByPk(user_id, {
      include: [{ model: UserSkill, as: 'userSkills' }]
    });

    if (!user) return res.status(404).json({ message: 'User not found.' });

    const baseHours = baseline_hours !== undefined ? parseFloat(baseline_hours) : (parseFloat(task.estimated_hours) || 8.0);
    const complexity = parseFloat(complexity_factor) || 1.0;

    // Calculate skill adjustment factor
    let skillAdjustmentFactor = 1.0;
    const requiredSkills = task.taskRequiredSkills || [];
    if (requiredSkills.length > 0) {
      const userSkillMap = new Map();
      (user.userSkills || []).forEach(us => userSkillMap.set(us.skill_id, us));

      let totalReq = 0;
      let totalUser = 0;
      let missingCount = 0;

      for (const req of requiredSkills) {
        totalReq += req.minimum_proficiency;
        const us = userSkillMap.get(req.skill_id);
        if (us) {
          totalUser += us.proficiency_level;
        } else {
          missingCount++;
        }
      }

      const avgReq = totalReq / requiredSkills.length;
      const avgUser = (requiredSkills.length - missingCount) > 0 ? totalUser / (requiredSkills.length - missingCount) : 0;

      if (missingCount === 0 && avgUser > avgReq) {
        skillAdjustmentFactor = 0.8;
      } else if (missingCount === 0 && avgUser >= avgReq) {
        skillAdjustmentFactor = 1.0;
      } else {
        skillAdjustmentFactor = 1.3;
      }
    }

    const adjustedEffort = Math.round((baseHours * skillAdjustmentFactor * complexity) * 10) / 10;

    let dailyHours = parseFloat(available_hours_per_day);
    if (!dailyHours || dailyHours <= 0) {
      // derive from user's available capacity
      const activeTasks = await Task.findAll({
        where: { assigned_to: user.id, id: { [Op.ne]: task.id }, status: { [Op.notIn]: ['Completed', 'Cancelled'] } }
      });
      const currentWorkload = activeTasks.reduce((sum, t) => sum + (parseFloat(t.estimated_hours) || 0), 0);
      const availCap = Math.max(0, (user.weekly_capacity_hours || 40) - currentWorkload);
      dailyHours = Math.max(1, Math.round((availCap / 5) * 10) / 10);
    }

    const estimatedDurationDays = Math.round((adjustedEffort / dailyHours) * 10) / 10;

    return res.json({
      task_id: parseInt(id, 10),
      user_id: user.id,
      user_name: user.name,
      baseline_hours: baseHours,
      skill_adjustment_factor: skillAdjustmentFactor,
      complexity_factor: complexity,
      adjusted_effort_hours: adjustedEffort,
      available_hours_per_day: dailyHours,
      estimated_duration_days: estimatedDurationDays
    });
  } catch (error) {
    console.error('Error previewing task estimate:', error);
    return res.status(500).json({ message: 'Internal server error while previewing estimate.' });
  }
};

/**
 * Confirm assignment + save final estimate + trigger Decision Log (in DB Transaction)
 * POST /api/tasks/:id/assign
 */
const assignTaskWithEstimate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      user_id,
      baseline_hours,
      adjusted_effort_hours,
      available_hours_per_day,
      estimated_duration_days,
      complexity_factor = 1.0,
      reason,
      next_action,
      next_action_due_at,
      confirmed_override = false
    } = req.body;

    const task = await Task.findByPk(id, { transaction: t });
    if (!task) {
      await t.rollback();
      return res.status(404).json({ message: 'Task not found.' });
    }

    const user = await User.findByPk(user_id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: 'Assigned user not found.' });
    }

    const finalEffortHours = adjusted_effort_hours ? parseFloat(adjusted_effort_hours) : (parseFloat(task.estimated_hours) || 8.0);
    const finalBaselineHours = baseline_hours ? parseFloat(baseline_hours) : (parseFloat(task.estimated_hours) || 8.0);
    const finalDailyHours = available_hours_per_day ? parseFloat(available_hours_per_day) : 8.0;
    const finalDurationDays = estimated_duration_days ? parseFloat(estimated_duration_days) : (finalEffortHours / finalDailyHours);

    // Check capacity overload
    const activeTasks = await Task.findAll({
      where: {
        assigned_to: user.id,
        id: { [Op.ne]: task.id },
        status: { [Op.notIn]: ['Completed', 'Cancelled'] }
      },
      transaction: t
    });

    const currentWorkload = activeTasks.reduce((sum, at) => sum + (parseFloat(at.estimated_hours) || 0), 0);
    const projectedHours = currentWorkload + finalEffortHours;
    const weeklyCapacity = parseFloat(user.weekly_capacity_hours) || 40;

    if (projectedHours > weeklyCapacity && confirmed_override !== true) {
      await t.rollback();
      const excess_hours = Math.round((projectedHours - weeklyCapacity) * 10) / 10;
      const projected_utilization = Math.round((projectedHours / weeklyCapacity) * 100 * 10) / 10;

      return res.status(409).json({
        success: false,
        code: 'OVERLOAD_WARNING',
        message: `Workload Alert: Assigning this task (${finalEffortHours}h) will overload ${user.name} to ${projectedHours}h / ${weeklyCapacity}h (${projected_utilization}% capacity). Confirmation required to override.`,
        data: {
          user_id: user.id,
          user_name: user.name,
          weekly_capacity_hours: weeklyCapacity,
          current_assigned_hours: currentWorkload,
          task_estimated_hours: finalEffortHours,
          projected_hours: projectedHours,
          excess_hours,
          projected_utilization
        }
      });
    }

    const previousAssignee = task.assigned_to;
    const previousHours = task.estimated_hours;

    // 1. Update Task
    task.assigned_to = user.id;
    task.estimated_hours = finalEffortHours;
    await task.save({ transaction: t });

    // 2. Save Estimate Record
    const estimate = await TaskEstimate.create({
      task_id: task.id,
      user_id: user.id,
      baseline_hours: finalBaselineHours,
      adjusted_effort_hours: finalEffortHours,
      available_hours_per_day: finalDailyHours,
      estimated_duration_days: finalDurationDays,
      estimation_method: 'skill_complexity_model'
    }, { transaction: t });

    // 3. Create Decision Log Entry
    const decisionLog = await TaskDecisionLog.create({
      task_id: task.id,
      decision_type: 'skill_based_assignment',
      change_summary: `Smart assignment to ${user.name} (Effort: ${finalEffortHours}h, Est. Duration: ${finalDurationDays} days)`,
      previous_value: { assigned_to: previousAssignee, estimated_hours: previousHours },
      new_value: {
        assigned_to: user.id,
        assignee_name: user.name,
        estimated_hours: finalEffortHours,
        complexity_factor,
        estimated_duration_days: finalDurationDays
      },
      reason: reason ? reason.trim() : `Skill and capacity optimized recommendation match`,
      decided_by: req.user.id,
      decided_at: new Date(),
      next_action: next_action ? next_action.trim() : `Review task requirements and begin sprint execution`,
      next_owner_id: user.id,
      next_action_due_at: next_action_due_at || task.due_date || null,
      handoff_status: 'pending'
    }, { transaction: t });

    // 4. Notify Assignee
    if (user.id !== req.user.id) {
      await Notification.create({
        user_id: user.id,
        type: 'task_assigned',
        message: `🎯 Task Assigned: You were assigned "${task.title}" with estimated effort of ${finalEffortHours} hours.`,
        related_id: decisionLog.id
      }, { transaction: t });
    }

    await t.commit();

    return res.status(200).json({
      success: true,
      message: `Task assigned to ${user.name} with adjusted estimate of ${finalEffortHours} hours.`,
      task,
      estimate,
      decision: decisionLog
    });
  } catch (error) {
    await t.rollback();
    console.error('Error assigning task with estimate:', error);
    return res.status(500).json({ message: 'Internal server error while confirming task assignment.' });
  }
};

module.exports = {
  computeTaskRecommendations,
  getTaskRecommendations,
  previewTaskEstimate,
  assignTaskWithEstimate
};
