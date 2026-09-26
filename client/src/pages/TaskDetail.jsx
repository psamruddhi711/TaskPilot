import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskAPI, projectAPI, workloadAPI, decisionAPI, recommendationAPI } from '../services/api';
import { TaskModal } from '../components/TaskModal';
import { OverloadConfirmModal } from '../components/OverloadConfirmModal';
import ReportBlockerModal from '../components/ReportBlockerModal';
import RecordDecisionModal from '../components/RecordDecisionModal';
import RecommendAssigneeModal from '../components/RecommendAssigneeModal';
import {
  CheckSquare,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  AlertCircle,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  Shield,
  Edit2,
  Trash2,
  Plus,
  X,
  Layers,
  Sparkles,
  Link as LinkIcon,
  UserPlus,
  ShieldAlert,
  ArrowUpRight,
  Lock,
  ChevronRight,
  History,
  Check,
  UserCheck,
  Zap,
  Award,
  Sliders
} from 'lucide-react';

const PRIORITY_CONFIG = {
  Low: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  Medium: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  High: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Critical: 'bg-rose-500/20 text-rose-400 border-rose-500/40'
};

const STATUS_CONFIG = {
  'To Do': 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  'In Progress': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  Blocked: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  'In Review': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
};

const DECISION_TYPE_STYLES = {
  requirement_change: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  architectural_decision: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  priority_rescoping: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  reassignment: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  deadline_change: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  blocker_resolution: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  task_blocked: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  status_change: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  task_created: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  general_decision: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
};

const HANDOFF_STATUS_STYLES = {
  pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  accepted: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
};

export const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [impactData, setImpactData] = useState({ downstream_affected_count: 0, downstream_tasks: [] });
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'dependencies' | 'decisions'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState(null);

  // Modals & Overload
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportBlockerOpen, setIsReportBlockerOpen] = useState(false);
  const [isRecordDecisionOpen, setIsRecordDecisionOpen] = useState(false);
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [recommendationAssignData, setRecommendationAssignData] = useState(null);
  const [decisionInitialData, setDecisionInitialData] = useState(null);
  const [isAddDepOpen, setIsAddDepOpen] = useState(false);
  const [selectedDepId, setSelectedDepId] = useState('');
  const [depLoading, setDepLoading] = useState(false);

  const [isOverloadModalOpen, setIsOverloadModalOpen] = useState(false);
  const [pendingAssigneeId, setPendingAssigneeId] = useState(null);
  const [overloadPayload, setOverloadPayload] = useState(null);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const [res, impactRes, decisionsRes] = await Promise.all([
        taskAPI.getTask(id),
        taskAPI.getTaskImpact(id).catch(() => ({ downstream_affected_count: 0, downstream_tasks: [] })),
        taskAPI.getTaskDecisions(id).catch(() => [])
      ]);

      if (res.success) {
        setTask(res.data);
        setImpactData(impactRes);
        setDecisions(decisionsRes || []);

        if (res.data.project_id) {
          const [projTasksRes, sugRes, membersRes] = await Promise.all([
            projectAPI.getProjectTasks(res.data.project_id),
            workloadAPI.getSuggestions(res.data.project_id, id),
            projectAPI.getProjectMembers(res.data.project_id).catch(() => ({ data: [] }))
          ]);
          if (projTasksRes.success) {
            setProjectTasks(projTasksRes.data.filter((t) => t.id !== parseInt(id, 10)));
          }
          if (sugRes.success) {
            setSuggestions(sugRes.data.suggestions || []);
          }
          if (membersRes.data) {
            setProjectMembers(membersRes.data);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load task details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'Blocked') {
      setIsReportBlockerOpen(true);
      return;
    }

    try {
      setWarning(null);
      await taskAPI.updateTaskStatus(id, newStatus);
      fetchTaskDetails();
    } catch (err) {
      if (err.code === 'DEPENDENCY_BLOCK') {
        setWarning({
          message: err.message,
          uncompletedPredecessors: err.uncompletedPredecessors || []
        });
      } else {
        alert(err.message || 'Failed to update status.');
      }
    }
  };

  const handleAssignUser = async (userId, confirmedOverride = false) => {
    try {
      setPendingAssigneeId(userId);
      await taskAPI.assignTask(id, userId ? parseInt(userId, 10) : null, confirmedOverride);
      setIsOverloadModalOpen(false);
      setPendingAssigneeId(null);
      fetchTaskDetails();
    } catch (err) {
      if (err.code === 'OVERLOAD_WARNING' || err.status === 409) {
        setOverloadPayload(err.data || {
          user_name: 'Selected Member',
          weekly_capacity_hours: 40,
          current_assigned_hours: 0,
          task_estimated_hours: task.estimated_hours || 0,
          projected_hours: task.estimated_hours || 0,
          excess_hours: task.estimated_hours || 0,
          projected_utilization: 100
        });
        setIsOverloadModalOpen(true);
      } else {
        alert(err.message || 'Failed to update assignee.');
      }
    }
  };

  const handleCandidateSelected = (candidateData) => {
    setIsRecommendModalOpen(false);
    setRecommendationAssignData(candidateData);
    setDecisionInitialData({
      decision_type: 'reassignment',
      change_summary: `Smart recommendation assignment to ${candidateData.user_name} (${candidateData.adjusted_effort_hours}h effort, ${candidateData.estimated_duration_days}d est.)`,
      reason: `Assigned based on skill proficiency match and capacity optimization model (Complexity x${candidateData.complexity_factor || 1.0}).`,
      next_action: `Review technical specs, required skills, and begin execution`,
      next_owner_id: candidateData.user_id,
      next_action_due_at: task.due_date || ''
    });
    setIsRecordDecisionOpen(true);
  };

  const handleCustomDecisionSubmit = async (decisionPayload) => {
    if (recommendationAssignData) {
      await executeRecommendationAssignment(recommendationAssignData, decisionPayload, false);
    } else {
      const res = await taskAPI.createTaskDecision(task.id, decisionPayload);
      if (res.decision) {
        setDecisions((prev) => [res.decision, ...prev]);
      }
    }
  };

  const executeRecommendationAssignment = async (assignData, decisionPayload, confirmedOverride = false) => {
    try {
      const payload = {
        user_id: assignData.user_id,
        baseline_hours: assignData.baseline_hours,
        adjusted_effort_hours: assignData.adjusted_effort_hours,
        available_hours_per_day: assignData.available_hours_per_day,
        estimated_duration_days: assignData.estimated_duration_days,
        complexity_factor: assignData.complexity_factor,
        reason: decisionPayload.reason,
        next_action: decisionPayload.next_action,
        next_action_due_at: decisionPayload.next_action_due_at,
        confirmed_override: confirmedOverride
      };

      await recommendationAPI.assignTask(task.id, payload);
      setRecommendationAssignData(null);
      setDecisionInitialData(null);
      setIsOverloadModalOpen(false);
      fetchTaskDetails();
    } catch (err) {
      if (err.code === 'OVERLOAD_WARNING' || err.status === 409) {
        setOverloadPayload(err.data || {
          user_name: assignData.user_name || 'Selected Candidate',
          weekly_capacity_hours: 40,
          current_assigned_hours: 0,
          task_estimated_hours: assignData.adjusted_effort_hours,
          projected_hours: assignData.adjusted_effort_hours,
          excess_hours: assignData.adjusted_effort_hours,
          projected_utilization: 100
        });
        setPendingAssigneeId(assignData.user_id);
        setIsOverloadModalOpen(true);
      } else {
        alert(err.message || 'Failed to complete assignment.');
      }
    }
  };

  const handleAddDependency = async (e) => {
    e.preventDefault();
    if (!selectedDepId) return;

    setDepLoading(true);
    try {
      await taskAPI.addDependency(id, parseInt(selectedDepId, 10));
      setIsAddDepOpen(false);
      setSelectedDepId('');
      fetchTaskDetails();
    } catch (err) {
      alert(err.message || 'Failed to add dependency');
    } finally {
      setDepLoading(false);
    }
  };

  const handleRemoveDependency = async (depTaskId) => {
    if (!window.confirm('Remove this task dependency?')) return;
    try {
      await taskAPI.removeDependency(id, depTaskId);
      fetchTaskDetails();
    } catch (err) {
      alert(err.message || 'Failed to remove dependency');
    }
  };

  const handleHandoffStatusUpdate = async (decisionId, newStatus) => {
    try {
      await decisionAPI.updateHandoffStatus(decisionId, newStatus);
      setDecisions((prev) =>
        prev.map((d) => (d.id === decisionId ? { ...d, handoff_status: newStatus } : d))
      );
    } catch (err) {
      alert(err.message || 'Failed to update handoff status');
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm(`Permanently delete task "${task.title}"?`)) return;
    try {
      await taskAPI.deleteTask(id);
      navigate('/tasks');
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-48 rounded bg-slate-800" />
        <div className="h-48 rounded-2xl bg-slate-900/60 border border-slate-800" />
        <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-rose-400 mb-3" />
        <h3 className="text-base font-bold text-white">Task Not Found</h3>
        <p className="mt-1 text-xs text-rose-300">{error || 'This task does not exist.'}</p>
        <Link
          to="/tasks"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Task Roster</span>
        </Link>
      </div>
    );
  }

  const isOverdue = task.isOverdue;
  const predecessors = task.predecessors || [];
  const dependents = task.dependents || [];
  const incompletePredecessors = predecessors.filter((p) => p.status !== 'Completed');
  const allPredecessorsCompleted = predecessors.length > 0 && incompletePredecessors.length === 0;

  const existingPredecessorIds = predecessors.map((p) => p.id);
  const eligibleDepCandidates = projectTasks.filter(
    (t) => !existingPredecessorIds.includes(t.id)
  );

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link to="/tasks" className="hover:text-white transition flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Tasks</span>
          </Link>
          <span>/</span>
          {task.project && (
            <Link
              to={`/projects/${task.project.id}`}
              className="text-indigo-400 hover:text-indigo-300 transition font-medium"
            >
              {task.project.name}
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Recommend Assignee Action */}
          <button
            onClick={() => setIsRecommendModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-600 to-indigo-700 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-950/40 hover:from-indigo-500 hover:to-indigo-600 transition"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            <span>Recommend Assignee</span>
          </button>

          {/* Record Decision & Handoff Action */}
          <button
            onClick={() => {
              setRecommendationAssignData(null);
              setDecisionInitialData(null);
              setIsRecordDecisionOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-600/10 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/20 transition"
          >
            <GitPullRequest className="h-3.5 w-3.5 text-indigo-400" />
            <span>Log Decision & Handoff</span>
          </button>

          {task.status !== 'Blocked' && task.status !== 'Completed' && (
            <button
              onClick={() => setIsReportBlockerOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
              <span>Report Blocker</span>
            </button>
          )}

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <Edit2 className="h-3.5 w-3.5 text-indigo-400" />
            <span>Edit Task</span>
          </button>

          <button
            onClick={handleDeleteTask}
            className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Warning Banner (Predecessor Incomplete) */}
      {warning && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-xs text-amber-200 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2.5 font-bold text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">Cannot Start Task: Unmet Dependencies</span>
          </div>
          <p className="text-slate-300 leading-relaxed">{warning.message}</p>
          {warning.uncompletedPredecessors?.length > 0 && (
            <div className="rounded-xl bg-slate-950/80 p-3.5 border border-amber-500/20 space-y-2">
              <span className="text-[11px] font-semibold text-amber-300">
                You must complete the following prerequisite tasks first:
              </span>
              <div className="space-y-1.5">
                {warning.uncompletedPredecessors.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/tasks/${p.id}`)}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/40 cursor-pointer transition"
                  >
                    <span className="font-semibold text-white">{p.title}</span>
                    <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6 md:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {task.project && (
                <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-semibold text-indigo-400 border border-slate-800">
                  {task.project.name}
                </span>
              )}

              <span
                className={`rounded-md border px-2.5 py-1 text-xs font-bold ${
                  PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG['Medium']
                }`}
              >
                {task.priority} Priority
              </span>

              <span
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                  STATUS_CONFIG[task.status] || STATUS_CONFIG['To Do']
                }`}
              >
                {task.status}
              </span>

              {isOverdue && (
                <span className="flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  OVERDUE (Due {task.due_date})
                </span>
              )}
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              {task.title}
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {task.description || 'No additional technical notes or descriptions specified.'}
            </p>
          </div>

          {/* Quick Status Changers */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 shrink-0 lg:w-64 space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Transition Status
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {['To Do', 'In Progress', 'Blocked', 'In Review', 'Completed'].map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`rounded-lg py-1.5 px-3 text-xs font-semibold text-left transition border ${
                    task.status === st
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {st} {task.status === st && '✓'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview & Workload Assignment
        </button>

        <button
          onClick={() => setActiveTab('dependencies')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'dependencies'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitCommit className="h-4 w-4" />
          <span>Dependencies & Downstream Impact</span>
          <span className="rounded-full bg-slate-800 px-2 py-0.2 text-xs font-semibold text-slate-300 border border-slate-700">
            {predecessors.length + dependents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('decisions')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'decisions'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Decision History & Handoffs</span>
          <span className="rounded-full bg-indigo-950 px-2 py-0.2 text-xs font-semibold text-indigo-400 border border-indigo-800/60">
            {decisions.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Assignee Card with Smart Reassignment */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400">Assigned Team Member</p>
                <button
                  onClick={() => setIsRecommendModalOpen(true)}
                  className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20 transition"
                >
                  <Sparkles className="h-3 w-3 text-cyan-400" /> Recommend Best
                </button>
              </div>

              {task.assignee ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-md">
                    {task.assignee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white">{task.assignee.name}</p>
                    <p className="text-xs text-slate-400">{task.assignee.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-medium text-indigo-400 rounded bg-indigo-500/10 px-1.5 py-0.2 border border-indigo-500/20">
                      {task.assignee.role} &bull; {task.assignee.weekly_capacity_hours}h limit
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center">
                  <p className="text-xs text-slate-400 mb-2">No team member assigned yet.</p>
                  <button
                    onClick={() => setIsRecommendModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Auto-match candidates
                  </button>
                </div>
              )}

              {/* Reassignment Dropdown */}
              <div className="pt-3 border-t border-slate-800">
                <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                  Quick Reassign (Workload Balanced)
                </label>
                <select
                  value={task.assigned_to || ''}
                  onChange={(e) => handleAssignUser(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="">-- Unassign --</option>
                  {suggestions.map((s) => (
                    <option key={s.user_id} value={s.user_id}>
                      {s.name} ({s.available_capacity}h free{s.is_overloaded ? ' - OVERLOAD' : ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timeline & Estimates */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-3">
              <p className="text-xs font-semibold text-slate-400">Timeline & Scope</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Estimated Effort:</span>
                  <strong className="text-white font-bold">{task.estimated_hours || 0} hours</strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Start Date:</span>
                  <span>{task.start_date || 'Immediate'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Due Date:</span>
                  <span className={isOverdue ? 'font-bold text-rose-400' : 'text-slate-200'}>
                    {task.due_date || 'Open'}
                  </span>
                </div>
                {task.estimates && task.estimates.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Latest Model Estimate:</span>
                    <span className="text-emerald-400 font-semibold">
                      {task.estimates[task.estimates.length - 1].estimated_duration_days} days ({task.estimates[task.estimates.length - 1].available_hours_per_day}h/day)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Creator & History */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-3">
              <p className="text-xs font-semibold text-slate-400">Metadata & Provenance</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Created By:</span>
                  <span className="text-slate-200">{task.creator?.name || 'Admin'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Created At:</span>
                  <span>{new Date(task.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Last Modified:</span>
                  <span>{new Date(task.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Required Skills Matrix Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-400" />
                  <span>Required Skills & Competencies</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    {task.taskRequiredSkills?.length || 0}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Prerequisites used by the recommendation engine to calculate skill match scores and adjust effort multipliers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRecommendModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Find Best Match</span>
                </button>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition"
                >
                  <Edit2 className="w-3 h-3 text-indigo-400" />
                  <span>Edit Skills</span>
                </button>
              </div>
            </div>

            {(!task.taskRequiredSkills || task.taskRequiredSkills.length === 0) ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center text-xs text-slate-500">
                <Award className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                <p className="font-semibold text-slate-400">No required skills defined yet</p>
                <p className="mt-0.5">Click "Edit Skills" to specify technology requirements and proficiency levels for accurate recommendations.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {task.taskRequiredSkills.map((req) => (
                  <div
                    key={req.id || req.skill_id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-xs text-white block">
                        {req.skill?.name || `Skill #${req.skill_id}`}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-amber-400 mt-1">
                        <span>★</span>
                        <span>Level {req.minimum_proficiency} / 5</span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        req.is_mandatory
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {req.is_mandatory ? 'Mandatory' : 'Nice to have'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Dependencies & Downstream Impact */}
      {activeTab === 'dependencies' && (
        <div className="space-y-8">
          {/* Section 1: Predecessors */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Predecessors (Must Complete First)</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    {predecessors.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  This task cannot advance to "In Progress" until all predecessor tasks are marked Completed.
                </p>
              </div>

              <button
                onClick={() => setIsAddDepOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Add Predecessor</span>
              </button>
            </div>

            {/* Dependency Status Card */}
            {predecessors.length > 0 && (
              <div
                className={`rounded-xl border p-3 text-xs flex items-center justify-between ${
                  allPredecessorsCompleted
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {allPredecessorsCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                  <span>
                    {allPredecessorsCompleted
                      ? 'All prerequisites satisfied — Task is ready to start.'
                      : `${incompletePredecessors.length} prerequisite task(s) currently blocking execution.`}
                  </span>
                </div>
              </div>
            )}

            {/* Predecessors List */}
            {predecessors.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-xs text-slate-500">
                No predecessor dependencies configured for this task.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {predecessors.map((p) => {
                  const isDone = p.status === 'Completed';
                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/tasks/${p.id}`)}
                      className={`flex items-center justify-between p-4 rounded-xl border bg-slate-900/60 hover:bg-slate-900/90 cursor-pointer transition ${
                        isDone
                          ? 'border-emerald-500/30'
                          : 'border-amber-500/40 bg-amber-950/10'
                      }`}
                    >
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                              isDone
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {p.status}
                          </span>
                          <span className="text-[10px] text-slate-500">{p.priority}</span>
                        </div>
                        <p className="text-xs font-bold text-white truncate">{p.title}</p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveDependency(p.id);
                        }}
                        title="Remove dependency"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Direct Dependents */}
          <div className="space-y-4 pt-6 border-t border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Direct Dependents (Waiting On This Task)</span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {dependents.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Downstream deliverables directly connected to this task.
              </p>
            </div>

            {dependents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-xs text-slate-500">
                No direct downstream tasks depend on this deliverable.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {dependents.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => navigate(`/tasks/${d.id}`)}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900/90 cursor-pointer transition"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {d.status}
                      </span>
                      <p className="text-xs font-bold text-white truncate">{d.title}</p>
                    </div>
                    <span className="text-xs text-indigo-400 flex items-center gap-1">
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Full Downstream Impact Analysis */}
          <div className="space-y-4 pt-6 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-indigo-400" />
                  <span>Potentially affected downstream tasks:</span>
                  <span className="rounded-full bg-indigo-600/20 px-2.5 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/30">
                    {impactData.downstream_affected_count}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Full BFS graph traversal of all incomplete downstream tasks impacted if this deliverable is delayed or blocked.
                </p>
              </div>
            </div>

            {impactData.downstream_tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center text-xs text-slate-500">
                No incomplete downstream deliverables affected by this task.
              </div>
            ) : (
              <div className="space-y-3">
                {impactData.downstream_tasks.map((dt) => (
                  <div
                    key={dt.id}
                    onClick={() => navigate(`/tasks/${dt.id}`)}
                    className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 cursor-pointer transition space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="text-xs font-bold text-white truncate">
                          {dt.title}
                        </span>
                        <span className="rounded px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-300">
                          {dt.status}
                        </span>
                      </div>

                      {/* Blocked Distinction Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {dt.is_actively_blocked && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            <ShieldAlert className="w-3 h-3 text-rose-400" />
                            Actively Blocked (Impediment Logged)
                          </span>
                        )}

                        {dt.is_dependency_blocked && !dt.is_actively_blocked && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <Lock className="w-3 h-3 text-amber-400" />
                            Dependency-Blocked (Waiting on Predecessors)
                          </span>
                        )}

                        {!dt.is_actively_blocked && !dt.is_dependency_blocked && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Ready / In Flow
                          </span>
                        )}
                      </div>
                    </div>

                    {dt.active_blocker_reason && (
                      <p className="text-[11px] text-rose-300/90 italic bg-rose-950/30 p-2 rounded border border-rose-900/40">
                        Blocker: "{dt.active_blocker_reason}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>Assignee: <strong className="text-slate-300">{dt.assignee?.name || 'Unassigned'}</strong></span>
                      <span>Effort: <strong className="text-slate-300">{dt.estimated_hours || 0}h</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Decision History & Handoffs */}
      {activeTab === 'decisions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-400" />
                <span>Decision & Handoff Audit History</span>
              </h3>
              <p className="text-xs text-slate-400">
                Append-only log of architectural choices, scope revisions, reassignments, and deliverable handoffs.
              </p>
            </div>

            <button
              onClick={() => setIsRecordDecisionOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Record Decision</span>
            </button>
          </div>

          {decisions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center text-xs text-slate-500">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-semibold text-slate-400">No decision logs recorded yet</p>
              <p className="mt-1">Changes to scope, reassignments, and blocker resolutions will automatically appear here.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
              {decisions.map((d) => {
                const canManageHandoff = d.next_owner_id === user?.id || user?.role === 'Admin' || user?.role === 'Project Manager';

                return (
                  <div key={d.id} className="relative group">
                    {/* Timeline Bullet */}
                    <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    </div>

                    {/* Card */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3 shadow-lg hover:border-slate-700 transition">
                      {/* Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${
                              DECISION_TYPE_STYLES[d.decision_type] || DECISION_TYPE_STYLES.general_decision
                            }`}
                          >
                            {d.decision_type.replace(/_/g, ' ')}
                          </span>

                          {d.handoff_status && (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                                HANDOFF_STATUS_STYLES[d.handoff_status] || HANDOFF_STATUS_STYLES.pending
                              }`}
                            >
                              Handoff: {d.handoff_status}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{new Date(d.decided_at).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Summary */}
                      <h4 className="text-sm font-bold text-white">{d.change_summary}</h4>

                      {/* Reason */}
                      {d.reason && (
                        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/80 text-xs">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                            Decision Rationale / Context:
                          </span>
                          <p className="text-slate-200 leading-relaxed italic">
                            "{d.reason}"
                          </p>
                        </div>
                      )}

                      {/* Next Action & Handoff Box */}
                      {(d.next_action || d.nextOwner) && (
                        <div className="rounded-xl bg-indigo-950/30 p-3.5 border border-indigo-900/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Next Action & Assigned Handoff</span>
                            </span>
                            {d.next_action_due_at && (
                              <span className="text-[11px] text-amber-300 font-medium">
                                Due: {d.next_action_due_at}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-100 font-medium">
                            {d.next_action || 'Review and take ownership'}
                          </p>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-indigo-900/40 text-xs">
                            <span className="text-slate-400">
                              Assigned Owner: <strong className="text-white">{d.nextOwner?.name || 'Unassigned'}</strong>
                            </span>

                            {/* Status Change Buttons */}
                            {canManageHandoff && d.handoff_status !== 'completed' && (
                              <div className="flex items-center gap-1.5">
                                {d.handoff_status === 'pending' && (
                                  <button
                                    onClick={() => handleHandoffStatusUpdate(d.id, 'accepted')}
                                    className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-[11px] font-semibold text-white transition flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Accept</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleHandoffStatusUpdate(d.id, 'completed')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-semibold text-white transition flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Mark Done</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Footer Metadata */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                        <span>Decided by: <strong className="text-slate-300">{d.decider?.name || 'User'}</strong> ({d.decider?.role || 'Member'})</span>
                        <span className="text-slate-500">Entry ID: #{d.id}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Task Modal for Editing */}
      <TaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchTaskDetails}
        initialData={task}
        defaultProjectId={task.project_id}
      />

      {/* Report Blocker Modal */}
      {isReportBlockerOpen && (
        <ReportBlockerModal
          isOpen={isReportBlockerOpen}
          task={task}
          onClose={() => setIsReportBlockerOpen(false)}
          onBlockerCreated={() => {
            fetchTaskDetails();
          }}
        />
      )}

      {/* Recommend Assignee Modal */}
      {isRecommendModalOpen && (
        <RecommendAssigneeModal
          isOpen={isRecommendModalOpen}
          task={task}
          onClose={() => setIsRecommendModalOpen(false)}
          onAssignCandidate={handleCandidateSelected}
        />
      )}

      {/* Record Decision Modal */}
      {isRecordDecisionOpen && (
        <RecordDecisionModal
          isOpen={isRecordDecisionOpen}
          task={task}
          members={projectMembers}
          initialData={decisionInitialData}
          onCustomSubmit={recommendationAssignData ? handleCustomDecisionSubmit : null}
          onClose={() => {
            setIsRecordDecisionOpen(false);
            setRecommendationAssignData(null);
            setDecisionInitialData(null);
          }}
          onDecisionCreated={() => {
            fetchTaskDetails();
          }}
        />
      )}

      {/* Overload Confirmation Modal */}
      <OverloadConfirmModal
        isOpen={isOverloadModalOpen}
        onClose={() => {
          setIsOverloadModalOpen(false);
          setPendingAssigneeId(null);
        }}
        onConfirm={() => {
          if (recommendationAssignData && decisionInitialData) {
            executeRecommendationAssignment(recommendationAssignData, decisionInitialData, true);
          } else if (pendingAssigneeId) {
            handleAssignUser(pendingAssigneeId, true);
          }
        }}
        overloadData={overloadPayload}
      />
    </div>
  );
};
