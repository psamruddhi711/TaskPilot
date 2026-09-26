const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('Admin', 'Project Manager', 'Team Member'),
    allowNull: false,
    defaultValue: 'Team Member',
    validate: {
      isIn: [['Admin', 'Project Manager', 'Team Member']]
    }
  },
  weekly_capacity_hours: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 40,
    validate: {
      min: 0,
      max: 168
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// Helper to remove password_hash in JSON responses
User.prototype.toSafeJSON = function () {
  const values = { ...this.get() };
  delete values.password_hash;
  return values;
};

module.exports = User;
