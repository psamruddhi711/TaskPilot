const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');
const {
  User,
  Project,
  ProjectMember,
  Task,
  TaskDependency,
  TaskBlocker,
  EscalationEvent,
  Notification,
  TaskDecisionLog,
  Skill,
  UserSkill,
  TaskRequiredSkill,
  TaskEstimate,
  TaskRecommendation,
  Timesheet,
  TimesheetEntry,
  TimesheetAuditLog
} = require('../models');

const seedDatabase = async () => {
  console.log('==============================================');
  console.log('🌱 Starting TaskPilot Database Seed Process...');
  console.log('==============================================');

  try {
    // 1. Force sync schema to start fresh and clean
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.sync({ force: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✔ Cleaned all tables and synchronized schema.');

    // 2. Hash default password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 3. Create Users with varied roles and weekly capacity limits
    const usersData = [
      {
        id: 1,
        name: 'Alex Rivera',
        email: 'alex@taskpilot.io',
        password_hash: hashedPassword,
        role: 'Admin',
        weekly_capacity_hours: 40
      },
      {
        id: 2,
        name: 'Sarah Chen',
        email: 'sarah@taskpilot.io',
        password_hash: hashedPassword,
        role: 'Project Manager',
        weekly_capacity_hours: 35
      },
      {
        id: 3,
        name: 'David Kim',
        email: 'david@taskpilot.io',
        password_hash: hashedPassword,
        role: 'Team Member',
        weekly_capacity_hours: 40 // Calibrated to 32h active -> 8h available
      },
      {
        id: 4,
        name: 'Elena Rostova',
        email: 'elena@taskpilot.io',
        password_hash: hashedPassword,
        role: 'Team Member',
        weekly_capacity_hours: 30 // Calibrated to 16h active -> 14h available
      },
      {
        id: 5,
        name: 'Marcus Vance',
        email: 'marcus@taskpilot.io',
        password_hash: hashedPassword,
        role: 'Team Member',
        weekly_capacity_hours: 40 // Calibrated to 20h active -> 20h available
      },
      {
        id: 6,
        name: 'Priya Patel',
        email: 'priya@taskpilot.io',
        password_hash: hashedPassword,
        role: 'Team Member',
        weekly_capacity_hours: 20 // Calibrated to 8h active -> 12h available
      }
    ];

    const users = await User.bulkCreate(usersData);
    console.log(`✔ Seeded ${users.length} Users (Admin, PM, and Team Members).`);

    // 4. Create Skills
    const skillsData = [
      { id: 1, name: 'React' },
      { id: 2, name: 'Node.js' },
      { id: 3, name: 'Express' },
      { id: 4, name: 'MySQL' },
      { id: 5, name: 'REST APIs' },
      { id: 6, name: 'TypeScript' },
      { id: 7, name: 'Docker' }
    ];

    const skills = await Skill.bulkCreate(skillsData);
    console.log(`✔ Seeded ${skills.length} Technology Skills.`);

    // 5. Assign User Skills (with varied proficiency levels 1-5 and experience)
    const userSkillsData = [
      // David Kim (Fullstack Expert)
      { user_id: 3, skill_id: 1, proficiency_level: 5, years_experience: 5 }, // React (5)
      { user_id: 3, skill_id: 2, proficiency_level: 5, years_experience: 6 }, // Node.js (5)
      { user_id: 3, skill_id: 3, proficiency_level: 5, years_experience: 5 }, // Express (5)
      { user_id: 3, skill_id: 4, proficiency_level: 4, years_experience: 4 }, // MySQL (4)
      { user_id: 3, skill_id: 5, proficiency_level: 5, years_experience: 6 }, // REST APIs (5)
      { user_id: 3, skill_id: 6, proficiency_level: 4, years_experience: 3 }, // TypeScript (4)

      // Elena Rostova (Frontend Lead)
      { user_id: 4, skill_id: 1, proficiency_level: 5, years_experience: 6 }, // React (5)
      { user_id: 4, skill_id: 6, proficiency_level: 5, years_experience: 5 }, // TypeScript (5)
      { user_id: 4, skill_id: 5, proficiency_level: 4, years_experience: 4 }, // REST APIs (4)
      { user_id: 4, skill_id: 2, proficiency_level: 3, years_experience: 2 }, // Node.js (3)
      { user_id: 4, skill_id: 3, proficiency_level: 3, years_experience: 2 }, // Express (3)
      { user_id: 4, skill_id: 4, proficiency_level: 2, years_experience: 1 }, // MySQL (2)

      // Marcus Vance (Backend & DB Specialist)
      { user_id: 5, skill_id: 2, proficiency_level: 5, years_experience: 6 }, // Node.js (5)
      { user_id: 5, skill_id: 3, proficiency_level: 5, years_experience: 5 }, // Express (5)
      { user_id: 5, skill_id: 4, proficiency_level: 5, years_experience: 5 }, // MySQL (5)
      { user_id: 5, skill_id: 5, proficiency_level: 5, years_experience: 6 }, // REST APIs (5)
      { user_id: 5, skill_id: 7, proficiency_level: 4, years_experience: 4 }, // Docker (4)
      { user_id: 5, skill_id: 1, proficiency_level: 2, years_experience: 1 }, // React (2)

      // Priya Patel (Junior Developer)
      { user_id: 6, skill_id: 1, proficiency_level: 3, years_experience: 2 }, // React (3)
      { user_id: 6, skill_id: 2, proficiency_level: 2, years_experience: 1 }, // Node.js (2)
      { user_id: 6, skill_id: 3, proficiency_level: 2, years_experience: 1 }, // Express (2)
      { user_id: 6, skill_id: 4, proficiency_level: 2, years_experience: 1 }, // MySQL (2)
      { user_id: 6, skill_id: 5, proficiency_level: 3, years_experience: 2 }, // REST APIs (3)
      { user_id: 6, skill_id: 6, proficiency_level: 2, years_experience: 1 }, // TypeScript (2)

      // Sarah Chen (PM / Tech Lead)
      { user_id: 2, skill_id: 5, proficiency_level: 4, years_experience: 4 },
      { user_id: 2, skill_id: 1, proficiency_level: 3, years_experience: 3 },
      { user_id: 2, skill_id: 4, proficiency_level: 3, years_experience: 3 },

      // Alex Rivera (Admin / Enterprise Architect)
      { user_id: 1, skill_id: 2, proficiency_level: 5, years_experience: 7 },
      { user_id: 1, skill_id: 4, proficiency_level: 4, years_experience: 5 },
      { user_id: 1, skill_id: 5, proficiency_level: 5, years_experience: 7 }
    ];

    await UserSkill.bulkCreate(userSkillsData);
    console.log(`✔ Seeded ${userSkillsData.length} User Skills.`);

    // 6. Create 3 Projects
    const projectsData = [
      {
        id: 1,
        name: 'CloudSync Microservices Hub',
        description: 'Scalable cloud synchronization platform with multi-tenant sharding and real-time pub-sub streaming.',
        manager_id: 2, // Sarah Chen
        start_date: '2026-09-01',
        deadline: '2026-11-15',
        status: 'In Progress'
      },
      {
        id: 2,
        name: 'NextGen Mobile Banking Portal',
        description: 'PCI-compliant financial web gateway with biometric auth, real-time transaction ledger, and Stripe rails.',
        manager_id: 2, // Sarah Chen
        start_date: '2026-08-15',
        deadline: '2026-10-30',
        status: 'In Progress'
      },
      {
        id: 3,
        name: 'Enterprise AI Knowledge Core',
        description: 'Intelligent vector embeddings search engine, automated retrieval pipeline, and LLM agent orchestration.',
        manager_id: 1, // Alex Rivera
        start_date: '2026-09-10',
        deadline: '2026-12-20',
        status: 'Planning'
      }
    ];

    const projects = await Project.bulkCreate(projectsData);
    console.log(`✔ Seeded ${projects.length} Projects.`);

    // 7. Add Project Members
    const projectMembersData = [
      // Project 1
      { project_id: 1, user_id: 2, project_role: 'Project Manager' },
      { project_id: 1, user_id: 3, project_role: 'Lead Architect' },
      { project_id: 1, user_id: 4, project_role: 'Frontend Engineer' },
      { project_id: 1, user_id: 5, project_role: 'Backend Engineer' },
      { project_id: 1, user_id: 6, project_role: 'Junior Developer' },

      // Project 2
      { project_id: 2, user_id: 2, project_role: 'Project Manager' },
      { project_id: 2, user_id: 3, project_role: 'Fullstack Engineer' },
      { project_id: 2, user_id: 4, project_role: 'UI/UX Specialist' },
      { project_id: 2, user_id: 5, project_role: 'Security & Database Lead' },

      // Project 3
      { project_id: 3, user_id: 1, project_role: 'Executive Sponsor' },
      { project_id: 3, user_id: 3, project_role: 'AI Systems Architect' },
      { project_id: 3, user_id: 5, project_role: 'Data Pipeline Specialist' },
      { project_id: 3, user_id: 6, project_role: 'QA & Integration Engineer' }
    ];

    await ProjectMember.bulkCreate(projectMembersData);
    console.log(`✔ Seeded ${projectMembersData.length} Project Member memberships.`);

    // Helper dates
    const now = new Date();
    const daysFromNow = (d) => {
      const target = new Date(now);
      target.setDate(target.getDate() + d);
      return target.toISOString().split('T')[0];
    };

    // 8. Create 18 Tasks across the 3 projects
    // Workload Balance Targets:
    // David Kim (id: 3, cap: 40h): Tasks 4 (16h) + 12 (16h) = 32h active -> Available = 8h (triggers overload on 12h task)
    // Marcus Vance (id: 5, cap: 40h): Tasks 5 (12h) + 9 (8h) = 20h active -> Available = 20h (succeeds on 12h task)
    // Elena Rostova (id: 4, cap: 30h): Tasks 6 (10h) + 10 (6h) = 16h active -> Available = 14h
    // Priya Patel (id: 6, cap: 20h): Tasks 7 (8h) = 8h active -> Available = 12h
    const tasksData = [
      // ========================================================
      // Project 1: CloudSync Microservices Hub (Tasks 1 - 7)
      // 3-Task Dependency Chain: Task 1 -> Task 2 -> Task 3
      // ========================================================
      {
        id: 1,
        project_id: 1,
        title: 'Design Database Schema & Sharding Strategy',
        description: 'Architect multi-tenant schema partitioning with foreign key constraints and horizontal sharding keys.',
        assigned_to: 5, // Marcus
        estimated_hours: 12,
        priority: 'Critical',
        status: 'Blocked', // Has Blocker 1 (> 48h escalated)
        start_date: daysFromNow(-5),
        due_date: daysFromNow(2),
        created_by: 2
      },
      {
        id: 2,
        project_id: 1,
        title: 'Build Core Authentication & Tenant Middleware',
        description: 'Implement JWT validation, role-based claims verification, and tenant context propagation middleware.',
        assigned_to: null,
        estimated_hours: 10,
        priority: 'High',
        status: 'To Do', // Predecessor: Task 1
        start_date: daysFromNow(1),
        due_date: daysFromNow(6),
        created_by: 2
      },
      {
        id: 3,
        project_id: 1,
        title: 'Implement Multi-Tenant Billing REST Endpoints',
        description: 'Construct Stripe subscription webhook handlers, invoice generators, and license quota tracking APIs.',
        assigned_to: null,
        estimated_hours: 14,
        priority: 'High',
        status: 'To Do', // Predecessor: Task 2
        start_date: daysFromNow(5),
        due_date: daysFromNow(12),
        created_by: 2
      },
      {
        id: 4,
        project_id: 1,
        title: 'Construct Real-Time WebSocket Sync Engine',
        description: 'Develop bidirectional Socket.io gateway with heartbeat monitoring and offline event buffer synchronization.',
        assigned_to: 3, // David (16h)
        estimated_hours: 16,
        priority: 'Critical',
        status: 'In Progress',
        start_date: daysFromNow(-3),
        due_date: daysFromNow(3),
        created_by: 2
      },
      {
        id: 5,
        project_id: 1,
        title: 'Optimize Redis Cache Invalidation Pipeline',
        description: 'Setup Redis cluster sentinel with distributed pub/sub invalidation and LRU eviction policies.',
        assigned_to: 5, // Marcus (12h)
        estimated_hours: 12,
        priority: 'Medium',
        status: 'In Progress',
        start_date: daysFromNow(-2),
        due_date: daysFromNow(4),
        created_by: 2
      },
      {
        id: 6,
        project_id: 1,
        title: 'Design CloudSync Admin Analytics Dashboard',
        description: 'Build interactive Recharts telemetry visualizer with tenant throughput, request latency, and node health.',
        assigned_to: 4, // Elena (10h)
        estimated_hours: 10,
        priority: 'Medium',
        status: 'In Progress',
        start_date: daysFromNow(-1),
        due_date: daysFromNow(5),
        created_by: 2
      },
      {
        id: 7,
        project_id: 1,
        title: 'Setup Swagger OpenAPI Documentation Specs',
        description: 'Generate OpenAPI 3.0 YAML schemas with request body validations and response error codes.',
        assigned_to: 6, // Priya (8h)
        estimated_hours: 8,
        priority: 'Low',
        status: 'In Review',
        start_date: daysFromNow(-4),
        due_date: daysFromNow(1),
        created_by: 2
      },

      // ========================================================
      // Project 2: NextGen Mobile Banking Portal (Tasks 8 - 13)
      // ========================================================
      {
        id: 8,
        project_id: 2,
        title: 'Integrate Stripe Checkout Gateway & Webhooks',
        description: 'Handle 3D-Secure payment intents, webhook verification idempotency, and automated receipt dispatch.',
        assigned_to: 5, // Marcus (8h active)
        estimated_hours: 8,
        priority: 'Critical',
        status: 'Blocked', // Has Blocker 2 (30h active)
        start_date: daysFromNow(-2),
        due_date: daysFromNow(3),
        created_by: 2
      },
      {
        id: 9,
        project_id: 2,
        title: 'Implement KYC Biometric Verification Service',
        description: 'Integrate Onfido/Jumio document scan verification with encrypted image payload pipelines.',
        assigned_to: null,
        estimated_hours: 12,
        priority: 'High',
        status: 'To Do',
        start_date: daysFromNow(2),
        due_date: daysFromNow(7),
        created_by: 2
      },
      {
        id: 10,
        project_id: 2,
        title: 'Build Interactive Financial Ledger UI',
        description: 'Design dark-mode virtualized transaction grid with categorized spending breakdowns and CSV exports.',
        assigned_to: 4, // Elena (6h active)
        estimated_hours: 6,
        priority: 'Medium',
        status: 'In Progress',
        start_date: daysFromNow(-1),
        due_date: daysFromNow(4),
        created_by: 2
      },
      {
        id: 11,
        project_id: 2,
        title: 'Security Audit & OWASP Top 10 Penetration Tests',
        description: 'Run automated static code analysis, SQL injection mitigations, and cross-site scripting sanitization checks.',
        assigned_to: 3,
        estimated_hours: 8,
        priority: 'High',
        status: 'Completed',
        start_date: daysFromNow(-10),
        due_date: daysFromNow(-2),
        created_by: 2
      },
      {
        id: 12,
        project_id: 2,
        title: 'Develop Real-Time Fraud Anomaly Detection Filter',
        description: 'Deploy streaming heuristic filter to flag rapid geolocation hops and anomalous withdrawal velocity.',
        assigned_to: 3, // David (16h active)
        estimated_hours: 16,
        priority: 'Critical',
        status: 'In Progress',
        start_date: daysFromNow(-2),
        due_date: daysFromNow(5),
        created_by: 2
      },
      {
        id: 13,
        project_id: 2,
        title: 'Unit Test Coverage for Account Transfer API',
        description: 'Achieve 95% Jest test coverage across double-entry balance updates and race condition test suites.',
        assigned_to: 6,
        estimated_hours: 6,
        priority: 'Medium',
        status: 'Completed',
        start_date: daysFromNow(-8),
        due_date: daysFromNow(-1),
        created_by: 2
      },

      // ========================================================
      // Project 3: Enterprise AI Knowledge Core (Tasks 14 - 18)
      // ========================================================
      {
        id: 14,
        project_id: 3,
        title: 'Deploy Kubernetes Cluster Helm Charts',
        description: 'Configure multi-AZ EKS cluster with autoscaling node groups and ingress SSL termination.',
        assigned_to: 1, // Alex
        estimated_hours: 12,
        priority: 'Critical',
        status: 'Blocked', // Has Blocker 3 (6h active)
        start_date: daysFromNow(-1),
        due_date: daysFromNow(4),
        created_by: 1
      },
      {
        id: 15,
        project_id: 3,
        title: 'Implement Vector Indexing Pipeline (pgvector)',
        description: 'Batch chunk corporate knowledge documents, calculate OpenAI embeddings, and ingest to vector index.',
        assigned_to: null,
        estimated_hours: 14,
        priority: 'High',
        status: 'To Do',
        start_date: daysFromNow(3),
        due_date: daysFromNow(9),
        created_by: 1
      },
      {
        id: 16,
        project_id: 3,
        title: 'Build Conversational Chatbot Widget UI',
        description: 'Construct responsive chat modal with markdown streaming, syntax highlighting, and citations drawer.',
        assigned_to: 4,
        estimated_hours: 10,
        priority: 'Medium',
        status: 'Completed',
        start_date: daysFromNow(-12),
        due_date: daysFromNow(-3),
        created_by: 1
      },
      {
        id: 17,
        project_id: 3,
        title: 'Implement Prompt Guardrails & PII Masking',
        description: 'Regex and NLP sanitization to detect social security numbers, API keys, and sensitive employee data.',
        assigned_to: null,
        estimated_hours: 8,
        priority: 'High',
        status: 'To Do',
        start_date: daysFromNow(4),
        due_date: daysFromNow(10),
        created_by: 1
      },
      {
        id: 18,
        project_id: 3,
        title: 'Perform Latency Benchmarking on Vector Search',
        description: 'Benchmark cosine vs euclidean indexing speeds across 1,000,000 document vector queries.',
        assigned_to: 5,
        estimated_hours: 6,
        priority: 'Low',
        status: 'Completed',
        start_date: daysFromNow(-15),
        due_date: daysFromNow(-5),
        created_by: 1
      }
    ];

    const tasks = await Task.bulkCreate(tasksData);
    console.log(`✔ Seeded ${tasks.length} Tasks with varied statuses and priorities.`);

    // 9. Create Task Dependencies (including 3-Task Chain: 1 -> 2 -> 3)
    const dependenciesData = [
      // 3-Task Chain in Project 1:
      // Task 2 (Auth Middleware) depends on Task 1 (Database Schema)
      { task_id: 2, depends_on_task_id: 1 },
      // Task 3 (Billing Endpoints) depends on Task 2 (Auth Middleware)
      { task_id: 3, depends_on_task_id: 2 },

      // Other dependencies:
      // Task 9 depends on Task 8
      { task_id: 9, depends_on_task_id: 8 },
      // Task 15 depends on Task 14
      { task_id: 15, depends_on_task_id: 14 }
    ];

    await TaskDependency.bulkCreate(dependenciesData);
    console.log(`✔ Seeded ${dependenciesData.length} Task Dependencies (including 3-task chain Task 1 -> Task 2 -> Task 3).`);

    // 10. Assign Task Required Skills
    const taskSkillsData = [
      // Task 1: MySQL (4, Mandatory), REST APIs (4, Mandatory)
      { task_id: 1, skill_id: 4, minimum_proficiency: 4, is_mandatory: true },
      { task_id: 1, skill_id: 5, minimum_proficiency: 4, is_mandatory: true },

      // Task 2: Node.js (4, Mandatory), Express (4, Mandatory), REST APIs (4, Mandatory)
      { task_id: 2, skill_id: 2, minimum_proficiency: 4, is_mandatory: true },
      { task_id: 2, skill_id: 3, minimum_proficiency: 4, is_mandatory: true },
      { task_id: 2, skill_id: 5, minimum_proficiency: 4, is_mandatory: true },

      // Task 3: Node.js (4, Mandatory), MySQL (3, Optional), REST APIs (5, Mandatory)
      { task_id: 3, skill_id: 2, minimum_proficiency: 4, is_mandatory: true },
      { task_id: 3, skill_id: 4, minimum_proficiency: 3, is_mandatory: false },
      { task_id: 3, skill_id: 5, minimum_proficiency: 5, is_mandatory: true },

      // Task 4: Node.js (5, Mandatory), TypeScript (4, Optional), REST APIs (4, Mandatory)
      { task_id: 4, skill_id: 2, minimum_proficiency: 5, is_mandatory: true },
      { task_id: 4, skill_id: 6, minimum_proficiency: 4, is_mandatory: false },
      { task_id: 4, skill_id: 5, minimum_proficiency: 4, is_mandatory: true },

      // Task 6: React (4, Mandatory), TypeScript (3, Optional), REST APIs (3, Mandatory)
      { task_id: 6, skill_id: 1, minimum_proficiency: 4, is_mandatory: true },
      { task_id: 6, skill_id: 6, minimum_proficiency: 3, is_mandatory: false },
      { task_id: 6, skill_id: 5, minimum_proficiency: 3, is_mandatory: true },

      // Task 8: Node.js (4, Mandatory), REST APIs (5, Mandatory)
      { task_id: 8, skill_id: 2, minimum_proficiency: 4, is_mandatory: true },
      { task_id: 8, skill_id: 5, minimum_proficiency: 5, is_mandatory: true },

      // Task 15: Node.js (4, Mandatory), MySQL (4, Mandatory), Docker (3, Optional)
      { task_id: 15, skill_id: 2, minimum_proficiency: 4, is_mandatory: true },
      { task_id: 15, skill_id: 4, minimum_proficiency: 4, is_mandatory: true },
      { task_id: 15, skill_id: 7, minimum_proficiency: 3, is_mandatory: false }
    ];

    await TaskRequiredSkill.bulkCreate(taskSkillsData);
    console.log(`✔ Seeded ${taskSkillsData.length} Task Required Skills.`);

    // 11. Create Task Blockers with varied elapsed times
    // One > 48h (Escalated), one 24h-48h (Active / Notified), one < 24h (Active)
    const timeNow = Date.now();
    const hoursAgo = (h) => new Date(timeNow - h * 3600 * 1000);

    const blockersData = [
      // Blocker 1: Over 48 hours elapsed (52h ago) -> Status: escalated
      {
        id: 1,
        task_id: 1,
        reason: 'Awaiting Enterprise Cloud DBA approval for composite partitioning index on PostgreSQL/MySQL cluster.',
        blocked_at: hoursAgo(52),
        status: 'escalated',
        resolved_at: null,
        resolution_notes: null
      },
      // Blocker 2: Between 24h and 48h elapsed (30h ago) -> Status: active
      {
        id: 2,
        task_id: 8,
        reason: 'Pending Stripe KYC production sandbox webhook keys from financial compliance team.',
        blocked_at: hoursAgo(30),
        status: 'active',
        resolved_at: null,
        resolution_notes: null
      },
      // Blocker 3: Under 24 hours elapsed (6h ago) -> Status: active
      {
        id: 3,
        task_id: 14,
        reason: 'AWS IAM policy permission denied for EKS VPC CNI node driver provisioning.',
        blocked_at: hoursAgo(6),
        status: 'active',
        resolved_at: null,
        resolution_notes: null
      },
      // Blocker 4: Resolved Blocker
      {
        id: 4,
        task_id: 5,
        reason: 'Redis Sentinel sentinel.conf cluster configuration syntax error during failover test.',
        blocked_at: hoursAgo(18),
        status: 'resolved',
        resolved_at: hoursAgo(2),
        resolution_notes: 'Corrected quorum threshold to 2 nodes in sentinel configuration.'
      }
    ];

    await TaskBlocker.bulkCreate(blockersData);
    console.log(`✔ Seeded ${blockersData.length} Task Blockers (>48h escalated, 24-48h, <24h, and resolved).`);

    // 12. Create Escalation Events for Blocker 1
    const escalationEventsData = [
      {
        id: 1,
        blocker_id: 1,
        event_type: 'notified',
        created_at: hoursAgo(28)
      },
      {
        id: 2,
        blocker_id: 1,
        event_type: 'escalated',
        created_at: hoursAgo(4)
      },
      {
        id: 3,
        blocker_id: 2,
        event_type: 'notified',
        created_at: hoursAgo(6)
      }
    ];

    await EscalationEvent.bulkCreate(escalationEventsData);
    console.log(`✔ Seeded ${escalationEventsData.length} Escalation Events.`);

    // 13. Create Notifications
    const notificationsData = [
      {
        id: 1,
        user_id: 2, // Sarah Chen
        type: 'blocker_escalated',
        message: '🚨 CRITICAL ESCALATION: Blocker on "Design Database Schema & Sharding Strategy" has exceeded 48 hours without resolution.',
        related_id: 1,
        read: false,
        created_at: hoursAgo(4)
      },
      {
        id: 2,
        user_id: 2,
        type: 'blocker_warning',
        message: '⚠️ Blocker Alert: "Integrate Stripe Checkout Gateway & Webhooks" has been unresolved for over 24 hours.',
        related_id: 2,
        read: false,
        created_at: hoursAgo(6)
      },
      {
        id: 3,
        user_id: 3, // David Kim
        type: 'task_assigned',
        message: '🎯 Task Assigned: You were assigned "Construct Real-Time WebSocket Sync Engine" with estimated effort of 16 hours.',
        related_id: 1,
        read: true,
        created_at: hoursAgo(72)
      }
    ];

    await Notification.bulkCreate(notificationsData);
    console.log(`✔ Seeded ${notificationsData.length} System Notifications.`);

    // 14. Create 5-6 Decision Log Entries covering various types
    const decisionsData = [
      {
        id: 1,
        task_id: 1,
        decision_type: 'task_blocked',
        change_summary: 'Reported technical blocker on database sharding strategy',
        previous_value: { status: 'In Progress' },
        new_value: { status: 'Blocked', reason: 'Awaiting Enterprise Cloud DBA approval for composite partitioning index.' },
        reason: 'Database team security audit requirements prevent unapproved schema migration.',
        decided_by: 5, // Marcus
        decided_at: hoursAgo(52),
        next_action: 'Escalate ticket to Infrastructure Engineering Lead',
        next_owner_id: 2, // Sarah
        next_action_due_at: daysFromNow(1),
        handoff_status: 'pending'
      },
      {
        id: 2,
        task_id: 4,
        decision_type: 'architectural_decision',
        change_summary: 'Adopted Socket.io engine with Redis pub/sub adapter for cluster horizontal scaling',
        previous_value: { protocol: 'HTTP Long-Polling' },
        new_value: { protocol: 'WebSocket + Redis Adapter' },
        reason: 'WebSocket streaming reduces server bandwidth consumption by 65% under concurrent load.',
        decided_by: 3, // David
        decided_at: hoursAgo(40),
        next_action: 'Provision Redis pub-sub node in development VPC',
        next_owner_id: 5, // Marcus
        next_action_due_at: daysFromNow(2),
        handoff_status: 'accepted'
      },
      {
        id: 3,
        task_id: 5,
        decision_type: 'blocker_resolution',
        change_summary: 'Resolved Redis Sentinel configuration blocker',
        previous_value: { status: 'Blocked' },
        new_value: { status: 'In Progress', resolution_notes: 'Corrected quorum threshold to 2 nodes.' },
        reason: 'Quorum configuration fix applied and verified with automated failover test suite.',
        decided_by: 5, // Marcus
        decided_at: hoursAgo(2),
        next_action: 'Complete replication health check before merging PR',
        next_owner_id: 5,
        next_action_due_at: daysFromNow(2),
        handoff_status: 'completed'
      },
      {
        id: 4,
        task_id: 8,
        decision_type: 'reassignment',
        change_summary: 'Reassigned Stripe integration task to Marcus Vance for security compliance',
        previous_value: { assigned_to: 6 },
        new_value: { assigned_to: 5 },
        reason: 'Marcus holds PCI-DSS tokenization certification required for payment gateway review.',
        decided_by: 2, // Sarah
        decided_at: hoursAgo(32),
        next_action: 'Review Stripe webhook signature verification logic',
        next_owner_id: 5,
        next_action_due_at: daysFromNow(3),
        handoff_status: 'accepted'
      },
      {
        id: 5,
        task_id: 11,
        decision_type: 'deadline_change',
        change_summary: 'Shifted penetration test due date by +3 days for external vendor signoff',
        previous_value: { due_date: daysFromNow(-5) },
        new_value: { due_date: daysFromNow(-2) },
        reason: 'External audit agency requested additional window to test OAuth token refresh vectors.',
        decided_by: 2, // Sarah
        decided_at: hoursAgo(60),
        next_action: 'Compile final OWASP mitigation report for executive review',
        next_owner_id: 3,
        next_action_due_at: daysFromNow(-2),
        handoff_status: 'completed'
      },
      {
        id: 6,
        task_id: 12,
        decision_type: 'skill_based_assignment',
        change_summary: 'Smart recommendation assignment of Anomaly Detection Filter to David Kim',
        previous_value: { assigned_to: null },
        new_value: { assigned_to: 3, complexity_factor: 1.2, estimated_effort_hours: 16 },
        reason: 'David holds highest combined skill match (96%) and expertise in real-time streaming logic.',
        decided_by: 2, // Sarah
        decided_at: hoursAgo(24),
        next_action: 'Build heuristic rules for rapid geolocation hop filtering',
        next_owner_id: 3,
        next_action_due_at: daysFromNow(5),
        handoff_status: 'pending'
      }
    ];

    await TaskDecisionLog.bulkCreate(decisionsData);
    console.log(`✔ Seeded ${decisionsData.length} Immutable Decision & Handoff Logs.`);

    // 14. Seed Timesheet Periods and Work Log Entries (Current and Previous Month)
    const timesheetsData = [
      {
        id: 1,
        user_id: 3, // David Kim
        year: 2026,
        month: 9,
        status: 'Submitted',
        total_hours: 32.5,
        submitted_at: hoursAgo(12),
        submission_notes: 'Completed sprint 2 deliverables and latency optimizations.',
        rejection_reason: null
      },
      {
        id: 2,
        user_id: 4, // Marcus Vance
        year: 2026,
        month: 9,
        status: 'Approved',
        total_hours: 28.0,
        submitted_at: hoursAgo(48),
        reviewed_at: hoursAgo(24),
        reviewed_by: 2, // Sarah Chen (PM)
        submission_notes: 'AWS Lambda and message queue setup completed.'
      },
      {
        id: 3,
        user_id: 5, // Elena Rostova
        year: 2026,
        month: 9,
        status: 'Rejected',
        total_hours: 18.0,
        submitted_at: hoursAgo(36),
        reviewed_at: hoursAgo(10),
        reviewed_by: 2,
        rejection_reason: 'Please add task associations and detailed descriptions for Sept 22 work.'
      },
      {
        id: 4,
        user_id: 2, // Sarah Chen (PM)
        year: 2026,
        month: 9,
        status: 'Draft',
        total_hours: 14.0,
        submitted_at: null
      }
    ];

    await Timesheet.bulkCreate(timesheetsData);

    const timesheetEntriesData = [
      // David Kim (Timesheet 1)
      {
        id: 1,
        timesheet_id: 1,
        user_id: 3,
        project_id: 1,
        task_id: 1,
        work_date: '2026-09-22',
        work_description: 'Designed normalized schema and entity relationships for project execution telemetry.',
        work_category: 'Development',
        start_time: '09:00',
        end_time: '13:30',
        break_minutes: 30,
        hours_worked: 4.0,
        status: 'Submitted',
        remarks: 'Reviewed with architect'
      },
      {
        id: 2,
        timesheet_id: 1,
        user_id: 3,
        project_id: 1,
        task_id: 1,
        work_date: '2026-09-22',
        work_description: 'Implemented Sequelize migration scripts with foreign key cascades.',
        work_category: 'Development',
        start_time: '14:30',
        end_time: '18:30',
        break_minutes: 0,
        hours_worked: 4.0,
        status: 'Submitted',
        remarks: 'All migration tests passed'
      },
      {
        id: 3,
        timesheet_id: 1,
        user_id: 3,
        project_id: 1,
        task_id: 2,
        work_date: '2026-09-23',
        work_description: 'Integrated Redis cache layer for high-frequency dashboard telemetry queries.',
        work_category: 'Development',
        start_time: '09:30',
        end_time: '14:00',
        break_minutes: 30,
        hours_worked: 4.0,
        status: 'Submitted',
        remarks: null
      },
      {
        id: 4,
        timesheet_id: 1,
        user_id: 3,
        project_id: 1,
        task_id: 2,
        work_date: '2026-09-24',
        work_description: 'Conducted load testing under 10k simulated concurrent socket connections.',
        work_category: 'Testing',
        start_time: '10:00',
        end_time: '15:30',
        break_minutes: 30,
        hours_worked: 5.0,
        status: 'Submitted',
        remarks: 'P99 latency down to 22ms'
      },
      {
        id: 5,
        timesheet_id: 1,
        user_id: 3,
        project_id: 2,
        task_id: 5,
        work_date: '2026-09-25',
        work_description: 'Architectural sync with frontend engineering team on WebSocket payload schemas.',
        work_category: 'Meeting',
        start_time: '11:00',
        end_time: '13:00',
        break_minutes: 0,
        hours_worked: 2.0,
        status: 'Submitted',
        remarks: 'Action items documented in decision history'
      },
      {
        id: 6,
        timesheet_id: 1,
        user_id: 3,
        project_id: 2,
        task_id: 6,
        work_date: '2026-09-26',
        work_description: 'Fixed race condition in session token refresh and token revocation blacklist.',
        work_category: 'Bug Fixing',
        start_time: '09:00',
        end_time: '15:30',
        break_minutes: 30,
        hours_worked: 6.0,
        status: 'Submitted',
        remarks: 'Security patch verified'
      },
      {
        id: 7,
        timesheet_id: 1,
        user_id: 3,
        project_id: 1,
        task_id: 12,
        work_date: '2026-09-28',
        work_description: 'Implemented Timesheet module backend controllers, models, and Excel export API.',
        work_category: 'Development',
        start_time: '09:00',
        end_time: '17:00',
        break_minutes: 60,
        hours_worked: 7.5,
        status: 'Submitted',
        remarks: 'Connected to frontend client'
      },

      // Marcus Vance (Timesheet 2 - Approved)
      {
        id: 8,
        timesheet_id: 2,
        user_id: 4,
        project_id: 1,
        task_id: 2,
        work_date: '2026-09-20',
        work_description: 'Configured AWS ECS Fargate cluster with auto-scaling triggers.',
        work_category: 'Development',
        start_time: '09:00',
        end_time: '17:00',
        break_minutes: 60,
        hours_worked: 7.0,
        status: 'Approved',
        remarks: 'Terraform scripts committed'
      },
      {
        id: 9,
        timesheet_id: 2,
        user_id: 4,
        project_id: 1,
        task_id: 2,
        work_date: '2026-09-21',
        work_description: 'Set up CloudWatch alarms and synthetic canary monitoring.',
        work_category: 'Documentation',
        start_time: '09:00',
        end_time: '16:00',
        break_minutes: 60,
        hours_worked: 6.0,
        status: 'Approved',
        remarks: 'Runbook published to wiki'
      },
      {
        id: 10,
        timesheet_id: 2,
        user_id: 4,
        project_id: 1,
        task_id: 3,
        work_date: '2026-09-22',
        work_description: 'Code review of streaming anomaly filter pull request.',
        work_category: 'Code Review',
        start_time: '13:00',
        end_time: '16:00',
        break_minutes: 0,
        hours_worked: 3.0,
        status: 'Approved',
        remarks: 'Approved with minor suggestions'
      },
      {
        id: 11,
        timesheet_id: 2,
        user_id: 4,
        project_id: 1,
        task_id: 4,
        work_date: '2026-09-23',
        work_description: 'Automated CI/CD pipeline deployment to staging and production.',
        work_category: 'Development',
        start_time: '09:00',
        end_time: '18:00',
        break_minutes: 60,
        hours_worked: 8.0,
        status: 'Approved',
        remarks: 'Zero-downtime blue/green deployment'
      },
      {
        id: 12,
        timesheet_id: 2,
        user_id: 4,
        project_id: 2,
        task_id: 5,
        work_date: '2026-09-24',
        work_description: 'Investigated VPC peering throughput constraints with database cluster.',
        work_category: 'Research',
        start_time: '10:00',
        end_time: '14:30',
        break_minutes: 30,
        hours_worked: 4.0,
        status: 'Approved',
        remarks: 'Recommended Transit Gateway migration'
      },

      // Sarah Chen (Timesheet 4 - Draft)
      {
        id: 13,
        timesheet_id: 4,
        user_id: 2,
        project_id: 1,
        task_id: 1,
        work_date: '2026-09-25',
        work_description: 'Sprint planning and workload balancing analysis for upcoming milestones.',
        work_category: 'Meeting',
        start_time: '09:00',
        end_time: '14:00',
        break_minutes: 60,
        hours_worked: 4.0,
        status: 'Draft',
        remarks: 'Reassigned 2 overloaded tasks'
      },
      {
        id: 14,
        timesheet_id: 4,
        user_id: 2,
        project_id: 1,
        task_id: 3,
        work_date: '2026-09-26',
        work_description: 'Evaluated blocker escalation metrics and resolved gateway dependency roadblock.',
        work_category: 'Documentation',
        start_time: '10:00',
        end_time: '16:00',
        break_minutes: 60,
        hours_worked: 5.0,
        status: 'Draft',
        remarks: 'Escalation cleared'
      },
      {
        id: 15,
        timesheet_id: 4,
        user_id: 2,
        project_id: 2,
        task_id: 7,
        work_date: '2026-09-28',
        work_description: 'Timesheet module review and stakeholder sign-off on approval hierarchy.',
        work_category: 'Meeting',
        start_time: '13:00',
        end_time: '18:00',
        break_minutes: 0,
        hours_worked: 5.0,
        status: 'Draft',
        remarks: 'Approved MVP scope'
      }
    ];

    await TimesheetEntry.bulkCreate(timesheetEntriesData);

    const auditLogsData = [
      {
        id: 1,
        timesheet_id: 1,
        action: 'SUBMITTED',
        actor_id: 3,
        comments: 'Completed sprint 2 deliverables and latency optimizations.'
      },
      {
        id: 2,
        timesheet_id: 2,
        action: 'SUBMITTED',
        actor_id: 4,
        comments: 'AWS Lambda and message queue setup completed.'
      },
      {
        id: 3,
        timesheet_id: 2,
        action: 'APPROVED',
        actor_id: 2,
        comments: 'Verified all AWS deliverables and documentation.'
      },
      {
        id: 4,
        timesheet_id: 3,
        action: 'SUBMITTED',
        actor_id: 5,
        comments: 'Initial submission for Sept.'
      },
      {
        id: 5,
        timesheet_id: 3,
        action: 'REJECTED',
        actor_id: 2,
        comments: 'Please add task associations and detailed descriptions for Sept 22 work.'
      }
    ];

    await TimesheetAuditLog.bulkCreate(auditLogsData);
    console.log(`✔ Seeded ${timesheetsData.length} Timesheet Periods, ${timesheetEntriesData.length} Work Logs, and ${auditLogsData.length} Audit Trail Records.`);

    console.log('==============================================');
    console.log('🎉 TASKPILOT DATABASE SEED COMPLETED SUCCESSFULLY!');
    console.log('==============================================');
    console.log('Default Credentials:');
    console.log('  Admin:           alex@taskpilot.io  / password123');
    console.log('  Project Manager: sarah@taskpilot.io / password123');
    console.log('  Team Member 1:   david@taskpilot.io / password123 (Cap: 40h, Active: 32h, Avail: 8h)');
    console.log('  Team Member 2:   marcus@taskpilot.io/ password123 (Cap: 40h, Active: 20h, Avail: 20h)');
    console.log('  Team Member 3:   elena@taskpilot.io / password123 (Cap: 30h, Active: 16h, Avail: 14h)');
    console.log('  Team Member 4:   priya@taskpilot.io / password123 (Cap: 20h, Active: 8h,  Avail: 12h)');
    console.log('==============================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seed process:', error);
    process.exit(1);
  }
};

seedDatabase();
