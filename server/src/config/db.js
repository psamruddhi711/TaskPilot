const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT, 10) || 3306;
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'taskpilot';

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false, // Set to console.log for SQL debug queries
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const initializeDatabase = async () => {
  try {
    // 1. Ensure the MySQL database exists
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();

    // 2. Authenticate Sequelize
    await sequelize.authenticate();
    console.log(`[Database] Connected successfully to MySQL database "${dbName}"`);

    // 3. Sync models (alter table if needed)
    await sequelize.sync({ alter: true });
    console.log('[Database] Models synchronized with MySQL schema.');
  } catch (error) {
    console.error('[Database Error] Failed to connect or sync database:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  initializeDatabase
};
