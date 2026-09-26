const { Op } = require('sequelize');
const { Project, ProjectMember, User } = require('../models');

// Safe user attributes for joins
const SAFE_USER_ATTRIBUTES = ['id', 'name', 'email', 'role', 'weekly_capacity_hours'];

// 1. GET /api/projects
const getProjects = async (req, res) => {
  try {
    const { status, search } = req.query;
    const where = {};

    if (status && status !== 'All') {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const projects = await Project.findAll({
      where,
      include: [
        {
          model: User,
          as: 'manager',
          attributes: SAFE_USER_ATTRIBUTES
        },
        {
          model: ProjectMember,
          as: 'projectMembers',
          include: [
            {
              model: User,
              as: 'user',
              attributes: SAFE_USER_ATTRIBUTES
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const formattedProjects = projects.map(p => {
      const pJson = p.toJSON();
      return {
        ...pJson,
        membersCount: pJson.projectMembers ? pJson.projectMembers.length : 0
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedProjects
    });
  } catch (error) {
    console.error('[getProjects Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve projects.'
    });
  }
};

// 2. GET /api/projects/:id
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id, {
      include: [
        {
          model: User,
          as: 'manager',
          attributes: SAFE_USER_ATTRIBUTES
        },
        {
          model: ProjectMember,
          as: 'projectMembers',
          include: [
            {
              model: User,
              as: 'user',
              attributes: SAFE_USER_ATTRIBUTES
            }
          ]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    const pJson = project.toJSON();
    const members = (pJson.projectMembers || []).map(pm => ({
      user_id: pm.user_id,
      project_role: pm.project_role,
      user: pm.user
    }));

    return res.status(200).json({
      success: true,
      data: {
        ...pJson,
        members,
        membersCount: members.length
      }
    });
  } catch (error) {
    console.error('[getProjectById Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve project details.'
    });
  }
};

// 3. POST /api/projects (Admin / Project Manager only)
const createProject = async (req, res) => {
  try {
    const { name, description, manager_id, start_date, deadline, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required.'
      });
    }

    const assignedManagerId = manager_id ? parseInt(manager_id, 10) : req.user.id;

    // Verify manager exists
    const manager = await User.findByPk(assignedManagerId);
    if (!manager) {
      return res.status(400).json({
        success: false,
        message: 'Assigned project manager does not exist.'
      });
    }

    const newProject = await Project.create({
      name: name.trim(),
      description: description ? description.trim() : null,
      manager_id: assignedManagerId,
      start_date: start_date || null,
      deadline: deadline || null,
      status: status || 'Planning'
    });

    // Auto-add manager as a project member with 'Lead' role
    await ProjectMember.findOrCreate({
      where: {
        project_id: newProject.id,
        user_id: assignedManagerId
      },
      defaults: {
        project_id: newProject.id,
        user_id: assignedManagerId,
        project_role: 'Lead'
      }
    });

    const createdProject = await Project.findByPk(newProject.id, {
      include: [
        {
          model: User,
          as: 'manager',
          attributes: SAFE_USER_ATTRIBUTES
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      data: createdProject
    });
  } catch (error) {
    console.error('[createProject Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create project.'
    });
  }
};

// 4. PUT /api/projects/:id (Admin / Project Manager only)
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, manager_id, start_date, deadline, status } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Project name cannot be empty.'
        });
      }
      project.name = name.trim();
    }

    if (description !== undefined) {
      project.description = description ? description.trim() : null;
    }

    if (manager_id !== undefined) {
      const managerExists = await User.findByPk(manager_id);
      if (!managerExists) {
        return res.status(400).json({
          success: false,
          message: 'Selected project manager does not exist.'
        });
      }
      project.manager_id = manager_id;

      // Ensure new manager is enrolled in project_members
      await ProjectMember.findOrCreate({
        where: { project_id: project.id, user_id: manager_id },
        defaults: { project_id: project.id, user_id: manager_id, project_role: 'Lead' }
      });
    }

    if (start_date !== undefined) project.start_date = start_date || null;
    if (deadline !== undefined) project.deadline = deadline || null;
    if (status !== undefined) project.status = status;

    await project.save();

    const updatedProject = await Project.findByPk(project.id, {
      include: [
        {
          model: User,
          as: 'manager',
          attributes: SAFE_USER_ATTRIBUTES
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      data: updatedProject
    });
  } catch (error) {
    console.error('[updateProject Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update project.'
    });
  }
};

// 5. DELETE /api/projects/:id (Admin / Project Manager only)
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    await project.destroy();

    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully.'
    });
  } catch (error) {
    console.error('[deleteProject Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete project.'
    });
  }
};

// 6. GET /api/projects/:id/members
const getProjectMembers = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    const members = await ProjectMember.findAll({
      where: { project_id: id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: SAFE_USER_ATTRIBUTES
        }
      ]
    });

    const formatted = members.map(m => ({
      user_id: m.user_id,
      project_id: m.project_id,
      project_role: m.project_role,
      user: m.user
    }));

    return res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('[getProjectMembers Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve project members.'
    });
  }
};

// 7. POST /api/projects/:id/members (Admin / Project Manager only)
const addProjectMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, project_role } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'user_id is required.'
      });
    }

    const project = await Project.findByPk(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    const user = await User.findByPk(user_id, {
      attributes: SAFE_USER_ATTRIBUTES
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const existingMember = await ProjectMember.findOne({
      where: {
        project_id: id,
        user_id
      }
    });

    if (existingMember) {
      return res.status(409).json({
        success: false,
        message: 'User is already a member of this project.'
      });
    }

    const newMember = await ProjectMember.create({
      project_id: id,
      user_id,
      project_role: project_role && project_role.trim() ? project_role.trim() : 'Member'
    });

    return res.status(201).json({
      success: true,
      message: 'Member added to project successfully.',
      data: {
        project_id: newMember.project_id,
        user_id: newMember.user_id,
        project_role: newMember.project_role,
        user
      }
    });
  } catch (error) {
    console.error('[addProjectMember Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add member to project.'
    });
  }
};

// 8. DELETE /api/projects/:id/members/:userId (Admin / Project Manager only)
const removeProjectMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const membership = await ProjectMember.findOne({
      where: {
        project_id: id,
        user_id: userId
      }
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: 'Member not found in this project.'
      });
    }

    await membership.destroy();

    return res.status(200).json({
      success: true,
      message: 'Member removed from project successfully.'
    });
  } catch (error) {
    console.error('[removeProjectMember Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove member from project.'
    });
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember
};
