const { Skill, UserSkill, TaskRequiredSkill, User, Task } = require('../models');

/**
 * Get all skills
 * GET /api/skills
 */
const getSkills = async (req, res) => {
  try {
    const skills = await Skill.findAll({
      order: [['name', 'ASC']]
    });
    return res.json(skills);
  } catch (error) {
    console.error('Error fetching skills:', error);
    return res.status(500).json({ message: 'Internal server error while fetching skills.' });
  }
};

/**
 * Create a new skill
 * POST /api/skills
 */
const createSkill = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Skill name is required.' });
    }

    const [skill, created] = await Skill.findOrCreate({
      where: { name: name.trim() },
      defaults: { name: name.trim() }
    });

    return res.status(created ? 201 : 200).json(skill);
  } catch (error) {
    console.error('Error creating skill:', error);
    return res.status(500).json({ message: 'Internal server error while creating skill.' });
  }
};

/**
 * Update a skill
 * PUT /api/skills/:id
 */
const updateSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const skill = await Skill.findByPk(id);
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found.' });
    }

    await skill.update({ name: name.trim() });
    return res.json(skill);
  } catch (error) {
    console.error('Error updating skill:', error);
    return res.status(500).json({ message: 'Internal server error while updating skill.' });
  }
};

/**
 * Delete a skill
 * DELETE /api/skills/:id
 */
const deleteSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const skill = await Skill.findByPk(id);
    if (!skill) {
      return res.status(404).json({ message: 'Skill not found.' });
    }

    await UserSkill.destroy({ where: { skill_id: id } });
    await TaskRequiredSkill.destroy({ where: { skill_id: id } });
    await skill.destroy();

    return res.json({ message: 'Skill deleted successfully.' });
  } catch (error) {
    console.error('Error deleting skill:', error);
    return res.status(500).json({ message: 'Internal server error while deleting skill.' });
  }
};

/**
 * Get skills for a user
 * GET /api/users/:id/skills
 */
const getUserSkills = async (req, res) => {
  try {
    const { id } = req.params;
    const userSkills = await UserSkill.findAll({
      where: { user_id: id },
      include: [{ model: Skill, as: 'skill' }],
      order: [['proficiency_level', 'DESC']]
    });

    return res.json(userSkills);
  } catch (error) {
    console.error('Error fetching user skills:', error);
    return res.status(500).json({ message: 'Internal server error while fetching user skills.' });
  }
};

/**
 * Set / update user skills
 * POST /api/users/:id/skills
 * Body: { skills: [{ skill_id, proficiency_level, years_experience }] } or single { skill_id, proficiency_level, years_experience }
 */
const setUserSkills = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { skills, skill_id, proficiency_level, years_experience } = req.body;

    if (Array.isArray(skills)) {
      // Bulk sync skills for user
      await UserSkill.destroy({ where: { user_id: id } });
      const records = skills.map((s) => ({
        user_id: parseInt(id, 10),
        skill_id: parseInt(s.skill_id, 10),
        proficiency_level: Math.min(5, Math.max(1, parseInt(s.proficiency_level, 10) || 1)),
        years_experience: parseFloat(s.years_experience) || 0
      }));
      if (records.length > 0) {
        await UserSkill.bulkCreate(records);
      }
    } else if (skill_id) {
      // Add or update single skill
      await UserSkill.upsert({
        user_id: parseInt(id, 10),
        skill_id: parseInt(skill_id, 10),
        proficiency_level: Math.min(5, Math.max(1, parseInt(proficiency_level, 10) || 1)),
        years_experience: parseFloat(years_experience) || 0
      });
    }

    const updatedSkills = await UserSkill.findAll({
      where: { user_id: id },
      include: [{ model: Skill, as: 'skill' }]
    });

    return res.json({
      message: 'User skills updated successfully.',
      skills: updatedSkills
    });
  } catch (error) {
    console.error('Error updating user skills:', error);
    return res.status(500).json({ message: 'Internal server error while updating user skills.' });
  }
};

/**
 * Get required skills for a task
 * GET /api/tasks/:id/required-skills
 */
const getTaskRequiredSkills = async (req, res) => {
  try {
    const { id } = req.params;
    const requiredSkills = await TaskRequiredSkill.findAll({
      where: { task_id: id },
      include: [{ model: Skill, as: 'skill' }]
    });
    return res.json(requiredSkills);
  } catch (error) {
    console.error('Error fetching task required skills:', error);
    return res.status(500).json({ message: 'Internal server error while fetching required skills.' });
  }
};

/**
 * Set required skills for a task
 * POST /api/tasks/:id/required-skills
 * Body: { skills: [{ skill_id, minimum_proficiency, is_mandatory }] }
 */
const setTaskRequiredSkills = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const { skills } = req.body;

    if (Array.isArray(skills)) {
      await TaskRequiredSkill.destroy({ where: { task_id: id } });
      const records = skills.map((s) => ({
        task_id: parseInt(id, 10),
        skill_id: parseInt(s.skill_id, 10),
        minimum_proficiency: Math.min(5, Math.max(1, parseInt(s.minimum_proficiency, 10) || 1)),
        is_mandatory: Boolean(s.is_mandatory)
      }));
      if (records.length > 0) {
        await TaskRequiredSkill.bulkCreate(records);
      }
    }

    const updated = await TaskRequiredSkill.findAll({
      where: { task_id: id },
      include: [{ model: Skill, as: 'skill' }]
    });

    return res.json({
      message: 'Task required skills updated successfully.',
      requiredSkills: updated
    });
  } catch (error) {
    console.error('Error setting task required skills:', error);
    return res.status(500).json({ message: 'Internal server error while setting required skills.' });
  }
};

module.exports = {
  getSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  getUserSkills,
  setUserSkills,
  getTaskRequiredSkills,
  setTaskRequiredSkills
};
