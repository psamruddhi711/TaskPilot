const validateEnv = () => {
  const required = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET'
  ];

  const missing = required.filter((key) => {
    const val = process.env[key];
    return val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
  });

  if (missing.length > 0) {
    console.error('================================================================');
    console.error('❌ FATAL STARTUP CONFIGURATION ERROR: Missing Required Env Vars');
    console.error('================================================================');
    console.error('The following required environment variable(s) are missing or empty:');
    missing.forEach((v) => console.error(`   ▶ ${v}`));
    console.error('\nPlease verify your .env file or cloud environment configuration.');
    console.error('Refer to .env.example for details on all required variables.');
    console.error('================================================================');
    process.exit(1);
  }
};

module.exports = {
  validateEnv
};
