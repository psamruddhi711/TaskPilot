require('dotenv').config();
const { validateEnv } = require('../config/envValidator');

validateEnv();

const { sequelize } = require('../models');
const { connectWithRetry } = require('../config/db');

const migrateDatabase = async () => {
  console.log('====================================================');
  console.log('🚀 TaskPilot Database Migration Tool');
  console.log('====================================================');
  console.log(`Target Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log(`Database:    ${process.env.DB_NAME}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('----------------------------------------------------');

  try {
    // 1. Connect with retry logic
    await connectWithRetry(5, 2000);

    // 2. Temporarily disable foreign key checks to avoid schema creation ordering issues
    console.log('[Migration] Disabling foreign key checks for table creation...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 3. Create all tables defined in models if they do not exist
    console.log('[Migration] Synchronizing all model schemas (creating tables)...');
    await sequelize.sync();

    // 4. Re-enable foreign key checks
    console.log('[Migration] Re-enabling foreign key checks...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    // 5. Query and display all created tables in the database
    const [tables] = await sequelize.query('SHOW TABLES;');
    const tableNames = tables.map((row) => Object.values(row)[0]);

    console.log('----------------------------------------------------');
    console.log(`✔ Schema migration completed successfully!`);
    console.log(`✔ Total tables verified in "${process.env.DB_NAME}": ${tableNames.length}`);
    tableNames.forEach((name, idx) => {
      console.log(`   ${(idx + 1).toString().padStart(2, ' ')}. ${name}`);
    });
    console.log('====================================================');
    console.log('🎉 TaskPilot database is ready for application use.');
    console.log('====================================================');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('====================================================');
    console.error('❌ MIGRATION FAILED:', error.message);
    console.error('====================================================');
    process.exit(1);
  }
};

migrateDatabase();
