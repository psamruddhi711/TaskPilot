const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
require('dotenv').config();
const { validateEnv } = require('./envValidator');

// Validate critical environment variables before initializing DB connection
validateEnv();

const dbHost = process.env.DB_HOST;
const dbPort = parseInt(process.env.DB_PORT, 10) || 3306;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;
const dbDialect = process.env.DB_DIALECT || 'mysql';

const isProduction = process.env.NODE_ENV === 'production';
const isSslRequested = process.env.DB_SSL === 'true' || isProduction;

const dialectOptions = isSslRequested
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  : {};

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: dbDialect,
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  dialectOptions,
  pool: {
    max: parseInt(process.env.DB_POOL_MAX, 10) || 5,
    min: parseInt(process.env.DB_POOL_MIN, 10) || 0,
    idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000
  }
});

/**
 * Connect with retry and exponential backoff
 */
const connectWithRetry = async (maxRetries = 5, initialDelayMs = 2000) => {
  let attempt = 1;
  let delay = initialDelayMs;

  while (attempt <= maxRetries) {
    try {
      console.log(`[Database] Attempting connection to ${dbHost}:${dbPort}/${dbName} (Attempt ${attempt}/${maxRetries})...`);
      await sequelize.authenticate();
      console.log(`✔ [Database] Successfully connected to MySQL database "${dbName}" (${isSslRequested ? 'SSL enabled' : 'SSL disabled'}).`);
      return;
    } catch (error) {
      console.error(`❌ [Database Error] (Attempt ${attempt}/${maxRetries}): ${error.message}`);
      if (attempt === maxRetries) {
        throw new Error(`Failed to establish database connection after ${maxRetries} attempts: ${error.message}`);
      }
      console.log(`[Database] Retrying connection in ${delay / 1000}s...`);
      await new Promise((res) => setTimeout(res, delay));
      delay *= 2;
      attempt++;
    }
  }
};

const initializeDatabase = async () => {
  try {
    // 1. In local development only, attempt to auto-create database if not exists
    if (!isProduction) {
      try {
        const connection = await mysql.createConnection({
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: dbPassword
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        await connection.end();
      } catch (createErr) {
        console.warn(`[Database] Notice: Auto-create database skipped or not permitted (${createErr.message}). Assuming database exists.`);
      }
    }

    // 2. Authenticate Sequelize with retry logic
    await connectWithRetry(5, 2000);

    // 3. Sync models (create new tables if they do not exist)
    try {
      await sequelize.sync();
      console.log('✔ [Database] Models synchronized with MySQL schema.');
    } catch (syncErr) {
      console.warn('⚠ [Database Sync Warning]:', syncErr.message);
    }
  } catch (error) {
    console.error('❌ [Database Fatal] Failed to initialize database:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  initializeDatabase,
  connectWithRetry
};
