# TaskPilot

TaskPilot is a full-stack project & task management system featuring smart workload balancing, blocker escalation, dependency tracking, a decision/handoff history log, and skill-based task assignment.

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS (`/client`)
- **Backend**: Node.js + Express + Sequelize + MySQL (`/server`)
- **Authentication**: JWT + bcryptjs with role-based route protection

---

## Getting Started Locally

### Prerequisites
- Node.js (v18+)
- MySQL Server (v8.0+)

---

### 1. Database Setup
1. Ensure your MySQL server is running.
2. The server will automatically create the database configured in `DB_NAME` (`taskpilot`) if it doesn't already exist.

---

### 2. Backend Setup (`/server`)

1. Open a terminal and navigate to `/server`:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Update `server/.env` with your MySQL credentials:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=taskpilot
   JWT_SECRET=super_secret_jwt_key_taskpilot_2026_change_in_production
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5173
   ```
5. Start the backend server:
   ```bash
   npm run dev
   # or
   npm start
   ```
   The backend API will run on `http://localhost:5000`.

---

### 3. Frontend Setup (`/client`)

1. Open a new terminal and navigate to `/client`:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web app in your browser:
   **[http://localhost:5173](http://localhost:5173)**

---

## Features Implemented in Stage 1
- **Monorepo Architecture**: Clean separation into `/server` and `/client`.
- **Database Schema**: `users` table managed via Sequelize with columns:
  - `id` (Primary Key, Auto Increment)
  - `name` (VARCHAR)
  - `email` (VARCHAR, Unique)
  - `password_hash` (VARCHAR)
  - `role` (ENUM: `'Admin'`, `'Project Manager'`, `'Team Member'`)
  - `weekly_capacity_hours` (INT, default 40)
  - `created_at` (TIMESTAMP)
- **JWT Authentication API**:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- **Role-Based Authorization Middleware**:
  - `authenticateToken`
  - `authorizeRoles('Admin', 'Project Manager', ...)`
- **Frontend Core**:
  - Sign-in and registration tabs with role selection
  - AuthContext with localStorage token persistence
  - Protected route wrapper (`<ProtectedRoute>`)
  - Modern dashboard layout (responsive sidebar, topbar, user profile chip, weekly capacity indicator)
  - Placeholder pages for: Dashboard, Projects, Tasks, Team, Workload, Blockers
