const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { validateEnv } = require('./config/envValidator');
validateEnv();

const { sequelize, initializeDatabase } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const workloadRoutes = require('./routes/workloadRoutes');
const blockerRoutes = require('./routes/blockerRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const decisionRoutes = require('./routes/decisionRoutes');
const skillRoutes = require('./routes/skillRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const timesheetRoutes = require('./routes/timesheetRoutes');
const { initBlockerCron } = require('./cron/blockerEscalationJob');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration supporting comma-separated allowlist and preflight requests
const rawOrigins = process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173,https://task-pilot-one-tau.vercel.app';
const allowedOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, uptime bots) without origin header
    if (!origin) {
      return callback(null, true);
    }
    const normalizedOrigin = origin.trim().replace(/\/$/, '');
    if (allowedOrigins.includes('*') || allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    console.warn(`[CORS Blocked] Origin "${origin}" rejected. Allowed origins:`, allowedOrigins);
    return callback(new Error(`CORS policy violation: Origin '${origin}' is not authorized.`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Disposition'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// Request logger for API calls
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Production Health Check endpoint with DB connectivity check
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    return res.status(200).json({
      status: 'ok',
      db: 'connected'
    });
  } catch (error) {
    console.error('[Health Check DB Error]:', error.message);
    return res.status(503).json({
      status: 'error',
      db: 'unreachable',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/workload', workloadRoutes);
app.use('/api/blockers', blockerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/decisions', decisionRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/timesheets', timesheetRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API route '${req.originalUrl}' not found.`
  });
});

// Global error handler (handles CORS rejections cleanly)
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('CORS policy violation')) {
    return res.status(403).json({
      success: false,
      message: err.message
    });
  }
  console.error('[Unhandled Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.'
  });
});

// Start Server with Database Connection
const startServer = async () => {
  try {
    await initializeDatabase();

    // Initialize background cron jobs
    initBlockerCron();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`========================================`);
      console.log(`🚀 TaskPilot Server running on port ${PORT}`);
      console.log(`📡 Healthcheck: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Allowed CORS Origins: ${allowedOrigins.join(', ')}`);
      console.log(`========================================`);
    });
  } catch (error) {
    console.error('❌ Failed to start server due to database connection error:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
