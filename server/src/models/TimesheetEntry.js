const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const TimesheetEntry = sequelize.define('TimesheetEntry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  timesheet_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'timesheets',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  task_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tasks',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  work_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  work_description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  work_category: {
    type: DataTypes.ENUM(
      'Development',
      'Testing',
      'Bug Fixing',
      'Meeting',
      'Documentation',
      'Research',
      'Code Review',
      'Other'
    ),
    allowNull: false,
    defaultValue: 'Development'
  },
  start_time: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  end_time: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  break_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  hours_worked: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0.1,
      max: 24
    }
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Submitted', 'Approved', 'Rejected'),
    allowNull: false,
    defaultValue: 'Draft'
  }
}, {
  tableName: 'timesheet_entries',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['timesheet_id']
    },
    {
      fields: ['user_id', 'work_date']
    },
    {
      fields: ['project_id']
    },
    {
      fields: ['task_id']
    }
  ]
});

module.exports = TimesheetEntry;
