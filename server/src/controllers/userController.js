const { Op } = require('sequelize');
const { User } = require('../models');

// GET /api/users
const getUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    const where = {};

    if (role && role !== 'All') {
      where.role = role;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where,
      attributes: ['id', 'name', 'email', 'role', 'weekly_capacity_hours', 'created_at'],
      order: [['name', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('[getUsers Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users.'
    });
  }
};

module.exports = {
  getUsers
};
