const { sequelize } = require('../config/db');
const User = require('./User');

// Central export of models & associations for modular extension in future stages
const models = {
  User
};

module.exports = {
  sequelize,
  ...models
};
