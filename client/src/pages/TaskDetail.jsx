import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskAPI, projectAPI, workloadAPI, decisionAPI, recommendationAPI, timesheetAPI } from '../services/api';
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
  Edit2,
  Trash2,
  Plus,
  X,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  Lock,
  ChevronRight,
  History,
  Check,
  UserCheck,
  Award
} from 'lucide-react';

const PRIORITY_CONFIG = {
  Low: 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]',
  Medium: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
  High: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
  Critical: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50'
};

const STATUS_CONFIG = {
  'To Do': 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]',
  'In Progress': 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50',
  Blocked: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50',
  'In Review': 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
  Completed: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
};

const DECISION_TYPE_STYLES = {
  requirement_change: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
  architectural_decision: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50',
  priority_rescoping: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
  reassignment: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/50',
  deadline_change: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/50',
  blocker_resolution: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
  task_blocked: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50',
  status_change: 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]',
  task_created: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/50',
  general_decision: 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]'
};

const HANDOFF_STATUS_STYLES = {
  pending: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
  accepted: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/50',
  completed: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
  cancelled: 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]'
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
  const [taskActuals, setTaskActuals] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'dependencies' | 'decisions' | 'timesheet'
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
      const [res, impactRes, decisionsRes, actualsRes] = await Promise.all([
        taskAPI.getTask(id),
        taskAPI.getTaskImpact(id).catch(() => ({ downstream_affected_count: 0, downstream_tasks: [] })),
        taskAPI.getTaskDecisions(id).catch(() => []),
        timesheetAPI.getTaskActuals(id).catch(() => null)
      ]);

      if (res.success) {
        setTask(res.data);
        setImpactData(impactRes);
        setDecisions(decisionsRes || []);
        if (actualsRes?.success) {
          setTaskActuals(actualsRes.data);
        }

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
        <div className="h-5 w-40 rounded bg-[#E5E7EB] dark:bg-[#30343A]" />
        <div className="h-44 rounded-lg bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A]" />
        <div className="h-80 rounded-lg bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A]" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-8 w-8 text-red-600 dark:text-red-400 mb-3" />
        <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">Task Not Found</h3>
        <p className="mt-1 text-xs text-red-700 dark:text-red-300">{error || 'This task does not exist.'}</p>
        <Link
          to="/tasks"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#4F46E5] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#4338CA] transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
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
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] dark:border-[#30343A] pb-4">
        <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#A1A1AA]">
          <Link to="/tasks" className="hover:text-[#202124] dark:hover:text-[#F3F4F6] transition flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Tasks</span>
          </Link>
          <span>/</span>
          {task.project && (
            <Link
              to={`/projects/${task.project.id}`}
              className="text-[#4F46E5] dark:text-[#818CF8] hover:underline transition font-medium"
            >
              {task.project.name}
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Recommend Assignee Action */}
          <button
            onClick={() => setIsRecommendModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 dark:border-indigo-800/40 bg-[#4F46E5] hover:bg-[#4338CA] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
            <span>Recommend Assignee</span>
          </button>

          {/* Record Decision & Handoff Action */}
          <button
            onClick={() => {
              setRecommendationAssignData(null);
              setDecisionInitialData(null);
              setIsRecordDecisionOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] px-3 py-1.5 text-xs font-medium text-[#202124] dark:text-[#F3F4F6] hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] transition shadow-xs"
          >
            <GitPullRequest className="h-3.5 w-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
            <span>Log Decision</span>
          </button>

          {task.status !== 'Blocked' && task.status !== 'Completed' && (
            <button
              onClick={() => setIsReportBlockerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              <span>Report Blocker</span>
            </button>
          )}

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] px-3 py-1.5 text-xs font-medium text-[#202124] dark:text-[#F3F4F6] hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] transition shadow-xs"
          >
            <Edit2 className="h-3.5 w-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
            <span>Edit</span>
          </button>

          <button
            onClick={handleDeleteTask}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Warning Banner (Predecessor Incomplete) */}
      {warning && (
        <div className="rounded-md border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-4 text-xs text-amber-800 dark:text-amber-200 space-y-2.5">
          <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs">Cannot Start Task: Unmet Dependencies</span>
          </div>
          <p className="text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed">{warning.message}</p>
          {warning.uncompletedPredecessors?.length > 0 && (
            <div className="rounded bg-white dark:bg-[#181A1D] p-3 border border-amber-200 dark:border-amber-500/20 space-y-1.5">
              <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                You must complete the following prerequisite tasks first:
              </span>
              <div className="space-y-1">
                {warning.uncompletedPredecessors.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/tasks/${p.id}`)}
                    className="flex items-center justify-between p-1.5 rounded bg-[#F1F3F5] dark:bg-[#25292E] border border-[#E5E7EB] dark:border-[#30343A] hover:border-[#4F46E5] cursor-pointer transition text-xs"
                  >
                    <span className="font-medium text-[#202124] dark:text-[#F3F4F6]">{p.title}</span>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Header Panel */}
      <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-5 md:p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {task.project && (
                <span className="rounded bg-[#F1F3F5] dark:bg-[#181A1D] px-2 py-0.5 text-[11px] font-medium text-[#4F46E5] dark:text-[#818CF8] border border-[#E5E7EB] dark:border-[#30343A]">
                  {task.project.name}
                </span>
              )}

              <span
                className={`rounded border px-2 py-0.5 text-[11px] font-medium ${
                  PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG['Medium']
                }`}
              >
                {task.priority} Priority
              </span>

              <span
                className={`rounded border px-2 py-0.5 text-[11px] font-medium ${
                  STATUS_CONFIG[task.status] || STATUS_CONFIG['To Do']
                }`}
              >
                {task.status}
              </span>

              {isOverdue && (
                <span className="flex items-center gap-1 rounded border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  OVERDUE ({task.due_date})
                </span>
              )}
            </div>

            <h1 className="text-xl font-bold tracking-tight text-[#202124] dark:text-[#F3F4F6] md:text-2xl">
              {task.title}
            </h1>

            <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed whitespace-pre-wrap max-w-2xl">
              {task.description || 'No additional technical notes or descriptions specified.'}
            </p>
          </div>

          {/* Quick Status Changers */}
          <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#181A1D] p-3 shrink-0 lg:w-56 space-y-1.5">
            <p className="text-[10px] font-medium text-[#6B7280] dark:text-[#A1A1AA] uppercase tracking-wider">
              Transition Status
            </p>
            <div className="grid grid-cols-1 gap-1">
              {['To Do', 'In Progress', 'Blocked', 'In Review', 'Completed'].map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`rounded py-1 px-2.5 text-xs font-medium text-left transition border ${
                    task.status === st
                      ? 'border-[#4F46E5] dark:border-[#818CF8] bg-[#4F46E5] text-white shadow-xs'
                      : 'border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#25292E] text-[#202124] dark:text-[#F3F4F6] hover:bg-[#F1F3F5] dark:hover:bg-[#30343A]'
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
      <div className="flex border-b border-[#E5E7EB] dark:border-[#30343A] gap-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-[#4F46E5] dark:border-[#818CF8] text-[#202124] dark:text-[#F3F4F6] font-semibold'
              : 'border-transparent text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6]'
          }`}
        >
          Overview & Workload Assignment
        </button>

        <button
          onClick={() => setActiveTab('dependencies')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === 'dependencies'
              ? 'border-[#4F46E5] dark:border-[#818CF8] text-[#202124] dark:text-[#F3F4F6] font-semibold'
              : 'border-transparent text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6]'
          }`}
        >
          <GitCommit className="h-3.5 w-3.5" />
          <span>Dependencies & Downstream Impact</span>
          <span className="rounded bg-[#F1F3F5] dark:bg-[#25292E] px-1.5 py-0.5 text-[10px] font-semibold text-[#6B7280] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#30343A]">
            {predecessors.length + dependents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('decisions')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === 'decisions'
              ? 'border-[#4F46E5] dark:border-[#818CF8] text-[#202124] dark:text-[#F3F4F6] font-semibold'
              : 'border-transparent text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6]'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Decision History & Handoffs</span>
          <span className="rounded bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-[#4F46E5] dark:text-[#818CF8] border border-indigo-200 dark:border-indigo-800/40">
            {decisions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('timesheet')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === 'timesheet'
              ? 'border-[#4F46E5] dark:border-[#818CF8] text-[#202124] dark:text-[#F3F4F6] font-semibold'
              : 'border-transparent text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6]'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Timesheet & Logged Hours</span>
          {taskActuals && (
            <span className="rounded bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              {taskActuals.total_actual_hours}h
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Assignee Card with Smart Reassignment */}
            <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">Assigned Team Member</p>
                <button
                  onClick={() => setIsRecommendModalOpen(true)}
                  className="text-[11px] font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/30 transition"
                >
                  <Sparkles className="h-3 w-3 text-cyan-600 dark:text-cyan-400" /> Recommend Best
                </button>
              </div>

              {task.assignee ? (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded bg-[#F1F3F5] dark:bg-[#25292E] border border-[#E5E7EB] dark:border-[#30343A] font-semibold text-xs text-[#4F46E5] dark:text-[#818CF8]">
                    {task.assignee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">{task.assignee.name}</p>
                    <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA] truncate">{task.assignee.email}</p>
                    <span className="inline-block mt-0.5 text-[10px] font-medium text-[#4F46E5] dark:text-[#818CF8] rounded bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 border border-indigo-200 dark:border-indigo-800/30">
                      {task.assignee.role} &bull; {task.assignee.weekly_capacity_hours}h limit
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-md bg-[#F1F3F5] dark:bg-[#181A1D] border border-dashed border-[#E5E7EB] dark:border-[#30343A] text-center">
                  <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mb-1.5">No team member assigned yet.</p>
                  <button
                    onClick={() => setIsRecommendModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Auto-match candidates
                  </button>
                </div>
              )}

              {/* Reassignment Dropdown */}
              <div className="pt-2.5 border-t border-[#E5E7EB] dark:border-[#30343A]">
                <label className="block text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA] mb-1">
                  Quick Reassign (Workload Balanced)
                </label>
                <select
                  value={task.assigned_to || ''}
                  onChange={(e) => handleAssignUser(e.target.value)}
                  className="w-full rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#181A1D] px-2.5 py-1.5 text-xs text-[#202124] dark:text-[#F3F4F6] outline-none focus:border-indigo-500"
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
            <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 space-y-2.5 shadow-sm">
              <p className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">Timeline & Scope</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
                  <span>Estimated Effort:</span>
                  <strong className="text-[#202124] dark:text-[#F3F4F6] font-semibold">{task.estimated_hours || 0} hours</strong>
                </div>
                <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
                  <span>Start Date:</span>
                  <span className="text-[#202124] dark:text-[#F3F4F6]">{task.start_date || 'Immediate'}</span>
                </div>
                <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
                  <span>Due Date:</span>
                  <span className={isOverdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-[#202124] dark:text-[#F3F4F6]'}>
                    {task.due_date || 'Open'}
                  </span>
                </div>
                {task.estimates && task.estimates.length > 0 && (
                  <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#30343A] text-[11px] text-[#6B7280] dark:text-[#A1A1AA] flex items-center justify-between">
                    <span>Model Estimate:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {task.estimates[task.estimates.length - 1].estimated_duration_days}d ({task.estimates[task.estimates.length - 1].available_hours_per_day}h/day)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Creator & History */}
            <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 space-y-2.5 shadow-sm">
              <p className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">Metadata & Provenance</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
                  <span>Created By:</span>
                  <span className="text-[#202124] dark:text-[#F3F4F6]">{task.creator?.name || 'Admin'}</span>
                </div>
                <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
                  <span>Created At:</span>
                  <span className="text-[#202124] dark:text-[#F3F4F6]">{new Date(task.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A1A1AA]">
                  <span>Last Modified:</span>
                  <span className="text-[#202124] dark:text-[#F3F4F6]">{new Date(task.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Required Skills Matrix Card */}
          <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 md:p-5 space-y-3.5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6] flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#4F46E5] dark:text-[#818CF8]" />
                  <span>Required Skills & Competencies</span>
                  <span className="rounded bg-[#F1F3F5] dark:bg-[#25292E] px-1.5 py-0.5 text-[10px] text-[#6B7280] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#30343A]">
                    {task.taskRequiredSkills?.length || 0}
                  </span>
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-0.5">
                  Prerequisites used by the recommendation engine to calculate skill match scores and adjust effort multipliers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRecommendModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-md shadow-sm transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                  <span>Find Match</span>
                </button>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#202124] dark:text-[#F3F4F6] bg-white dark:bg-[#25292E] hover:bg-[#F1F3F5] dark:hover:bg-[#30343A] rounded-md border border-[#E5E7EB] dark:border-[#30343A] transition"
                >
                  <Edit2 className="w-3 h-3 text-[#4F46E5] dark:text-[#818CF8]" />
                  <span>Edit Skills</span>
                </button>
              </div>
            </div>

            {(!task.taskRequiredSkills || task.taskRequiredSkills.length === 0) ? (
              <div className="rounded-md border border-dashed border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5]/40 dark:bg-[#181A1D]/40 p-6 text-center text-xs text-[#9CA3AF] dark:text-[#71717A]">
                <Award className="w-6 h-6 mx-auto mb-1 opacity-40 text-[#9CA3AF] dark:text-[#71717A]" />
                <p className="font-medium text-[#6B7280] dark:text-[#A1A1AA]">No required skills defined yet</p>
                <p className="mt-0.5 text-[#9CA3AF] dark:text-[#71717A]">Specify technology requirements and proficiency levels for accurate recommendations.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {task.taskRequiredSkills.map((req) => (
                  <div
                    key={req.id || req.skill_id}
                    className="p-3 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#181A1D] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-xs text-[#202124] dark:text-[#F3F4F6] block">
                        {req.skill?.name || `Skill #${req.skill_id}`}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        <span>Level {req.minimum_proficiency} / 5</span>
                      </div>
                    </div>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        req.is_mandatory
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50'
                          : 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border-[#E5E7EB] dark:border-[#30343A]'
                      }`}
                    >
                      {req.is_mandatory ? 'Mandatory' : 'Optional'}
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
        <div className="space-y-6">
          {/* Section 1: Predecessors */}
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6] flex items-center gap-2">
                  <span>Predecessors (Must Complete First)</span>
                  <span className="rounded bg-[#F1F3F5] dark:bg-[#25292E] px-1.5 py-0.5 text-[10px] text-[#6B7280] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#30343A]">
                    {predecessors.length}
                  </span>
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
                  This task cannot advance to "In Progress" until all predecessor tasks are marked Completed.
                </p>
              </div>

              <button
                onClick={() => setIsAddDepOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Predecessor</span>
              </button>
            </div>

            {/* Dependency Status Card */}
            {predecessors.length > 0 && (
              <div
                className={`rounded-md border p-2.5 text-xs flex items-center justify-between ${
                  allPredecessorsCompleted
                    ? 'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                    : 'border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {allPredecessorsCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
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
              <div className="rounded-md border border-dashed border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23]/40 p-6 text-center text-xs text-[#9CA3AF] dark:text-[#71717A]">
                No predecessor dependencies configured for this task.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {predecessors.map((p) => {
                  const isDone = p.status === 'Completed';
                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/tasks/${p.id}`)}
                      className={`flex items-center justify-between p-3 rounded-md border bg-white dark:bg-[#1C1F23] hover:border-[#D1D5DB] dark:hover:border-[#4B5563] cursor-pointer transition shadow-xs ${
                        isDone
                          ? 'border-[#E5E7EB] dark:border-[#30343A]'
                          : 'border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10'
                      }`}
                    >
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                              isDone
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
                            }`}
                          >
                            {p.status}
                          </span>
                          <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A]">{p.priority}</span>
                        </div>
                        <p className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6] truncate">{p.title}</p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveDependency(p.id);
                        }}
                        title="Remove dependency"
                        className="rounded p-1 text-[#9CA3AF] dark:text-[#71717A] hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition ml-2"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Direct Dependents */}
          <div className="space-y-3 pt-5 border-t border-[#E5E7EB] dark:border-[#30343A]">
            <div>
              <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6] flex items-center gap-2">
                <span>Direct Dependents (Waiting On This Task)</span>
                <span className="rounded bg-[#F1F3F5] dark:bg-[#25292E] px-1.5 py-0.5 text-[10px] text-[#6B7280] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#30343A]">
                  {dependents.length}
                </span>
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
                Downstream deliverables directly connected to this task.
              </p>
            </div>

            {dependents.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23]/40 p-6 text-center text-xs text-[#9CA3AF] dark:text-[#71717A]">
                No direct downstream tasks depend on this deliverable.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {dependents.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => navigate(`/tasks/${d.id}`)}
                    className="flex items-center justify-between p-3 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] hover:border-[#D1D5DB] dark:hover:border-[#4B5563] cursor-pointer transition shadow-xs"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA] border border-[#E5E7EB] dark:border-[#30343A]">
                        {d.status}
                      </span>
                      <p className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6] truncate">{d.title}</p>
                    </div>
                    <span className="text-xs text-[#4F46E5] dark:text-[#818CF8] flex items-center gap-0.5">
                      <span>View</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Full Downstream Impact Analysis */}
          <div className="space-y-3 pt-5 border-t border-[#E5E7EB] dark:border-[#30343A]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6] flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-[#4F46E5] dark:text-[#818CF8]" />
                  <span>Potentially affected downstream tasks:</span>
                  <span className="rounded bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-xs font-semibold text-[#4F46E5] dark:text-[#818CF8] border border-indigo-200 dark:border-indigo-800/40">
                    {impactData.downstream_affected_count}
                  </span>
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
                  Graph traversal of all incomplete downstream tasks impacted if this deliverable is delayed or blocked.
                </p>
              </div>
            </div>

            {impactData.downstream_tasks.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23]/40 p-6 text-center text-xs text-[#9CA3AF] dark:text-[#71717A]">
                No incomplete downstream deliverables affected by this task.
              </div>
            ) : (
              <div className="space-y-2">
                {impactData.downstream_tasks.map((dt) => (
                  <div
                    key={dt.id}
                    onClick={() => navigate(`/tasks/${dt.id}`)}
                    className="p-3 rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] hover:border-[#D1D5DB] dark:hover:border-[#4B5563] cursor-pointer transition space-y-2 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6] truncate">
                          {dt.title}
                        </span>
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA]">
                          {dt.status}
                        </span>
                      </div>

                      {/* Blocked Distinction Badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {dt.is_actively_blocked && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50">
                            <ShieldAlert className="w-3 h-3 text-red-600 dark:text-red-400" />
                            Actively Blocked
                          </span>
                        )}

                        {dt.is_dependency_blocked && !dt.is_actively_blocked && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                            <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Dependency-Blocked
                          </span>
                        )}

                        {!dt.is_actively_blocked && !dt.is_dependency_blocked && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                            Ready
                          </span>
                        )}
                      </div>
                    </div>

                    {dt.active_blocker_reason && (
                      <p className="text-[11px] text-red-700 dark:text-red-300 italic bg-red-50 dark:bg-red-950/20 p-1.5 rounded border border-red-200 dark:border-red-900/30">
                        Blocker: "{dt.active_blocker_reason}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-[#6B7280] dark:text-[#A1A1AA] pt-1 border-t border-[#E5E7EB] dark:border-[#30343A]">
                      <span>Assignee: <strong className="text-[#202124] dark:text-[#F3F4F6] font-normal">{dt.assignee?.name || 'Unassigned'}</strong></span>
                      <span>Effort: <strong className="text-[#202124] dark:text-[#F3F4F6] font-normal">{dt.estimated_hours || 0}h</strong></span>
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
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6] flex items-center gap-2">
                <History className="h-4 w-4 text-[#4F46E5] dark:text-[#818CF8]" />
                <span>Decision & Handoff Audit History</span>
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
                Append-only log of architectural choices, scope revisions, reassignments, and deliverable handoffs.
              </p>
            </div>

            <button
              onClick={() => setIsRecordDecisionOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#4F46E5] hover:bg-[#4338CA] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Record Decision</span>
            </button>
          </div>

          {decisions.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23]/40 p-10 text-center text-xs text-[#9CA3AF] dark:text-[#71717A]">
              <History className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-[#9CA3AF] dark:text-[#71717A]" />
              <p className="font-semibold text-[#6B7280] dark:text-[#A1A1AA]">No decision logs recorded yet</p>
              <p className="mt-0.5">Changes to scope, reassignments, and blocker resolutions will automatically appear here.</p>
            </div>
          ) : (
            <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E7EB] dark:before:bg-[#30343A]">
              {decisions.map((d) => {
                const canManageHandoff = d.next_owner_id === user?.id || user?.role === 'Admin' || user?.role === 'Project Manager';

                return (
                  <div key={d.id} className="relative group">
                    {/* Timeline Bullet */}
                    <div className="absolute -left-5 top-1.5 w-4 h-4 rounded-full bg-white dark:bg-[#181A1D] border-2 border-[#4F46E5] dark:border-[#818CF8] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5] dark:bg-[#818CF8]" />
                    </div>

                    {/* Card */}
                    <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 space-y-2.5 shadow-sm">
                      {/* Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                              DECISION_TYPE_STYLES[d.decision_type] || DECISION_TYPE_STYLES.general_decision
                            }`}
                          >
                            {d.decision_type.replace(/_/g, ' ')}
                          </span>

                          {d.handoff_status && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                HANDOFF_STATUS_STYLES[d.handoff_status] || HANDOFF_STATUS_STYLES.pending
                              }`}
                            >
                              Handoff: {d.handoff_status}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-[#9CA3AF] dark:text-[#71717A]">
                          <Clock className="w-3 h-3 text-[#9CA3AF] dark:text-[#71717A]" />
                          <span>{new Date(d.decided_at).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Summary */}
                      <h4 className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">{d.change_summary}</h4>

                      {/* Reason */}
                      {d.reason && (
                        <div className="rounded bg-[#F1F3F5] dark:bg-[#181A1D] p-2.5 border border-[#E5E7EB] dark:border-[#30343A] text-xs">
                          <span className="text-[10px] font-medium text-[#6B7280] dark:text-[#A1A1AA] block mb-0.5">
                            Rationale:
                          </span>
                          <p className="text-[#202124] dark:text-[#F3F4F6] italic">
                            "{d.reason}"
                          </p>
                        </div>
                      )}

                      {/* Next Action & Handoff Box */}
                      {(d.next_action || d.nextOwner) && (
                        <div className="rounded bg-indigo-50/60 dark:bg-indigo-950/20 p-3 border border-indigo-200 dark:border-indigo-900/40 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-[#4F46E5] dark:text-[#818CF8] flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Next Action & Assigned Handoff</span>
                            </span>
                            {d.next_action_due_at && (
                              <span className="text-[10px] text-amber-700 dark:text-amber-300">
                                Due: {d.next_action_due_at}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[#202124] dark:text-[#F3F4F6]">
                            {d.next_action || 'Review and take ownership'}
                          </p>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1.5 border-t border-indigo-200 dark:border-indigo-900/30 text-xs">
                            <span className="text-[#6B7280] dark:text-[#A1A1AA] text-[11px]">
                              Owner: <strong className="text-[#202124] dark:text-[#F3F4F6]">{d.nextOwner?.name || 'Unassigned'}</strong>
                            </span>

                            {/* Status Change Buttons */}
                            {canManageHandoff && d.handoff_status !== 'completed' && (
                              <div className="flex items-center gap-1.5">
                                {d.handoff_status === 'pending' && (
                                  <button
                                    onClick={() => handleHandoffStatusUpdate(d.id, 'accepted')}
                                    className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-[10px] font-medium text-white transition flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Accept</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleHandoffStatusUpdate(d.id, 'completed')}
                                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-[10px] font-medium text-white transition flex items-center gap-1"
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
                      <div className="flex items-center justify-between text-[10px] text-[#9CA3AF] dark:text-[#71717A] pt-1 border-t border-[#E5E7EB] dark:border-[#30343A]">
                        <span>Decided by: <strong className="text-[#6B7280] dark:text-[#A1A1AA]">{d.decider?.name || 'User'}</strong> ({d.decider?.role || 'Member'})</span>
                        <span>Entry #{d.id}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Timesheet & Logged Hours */}
      {activeTab === 'timesheet' && (
        <div className="space-y-5">
          {/* Summary Strip: Estimated vs Actual */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 shadow-xs">
              <span className="text-xs text-[#6B7280] dark:text-[#A1A1AA] font-medium">Estimated Effort</span>
              <p className="mt-1 text-2xl font-bold text-[#202124] dark:text-[#F3F4F6]">
                {task.estimated_hours || 0} <span className="text-xs font-normal text-[#6B7280] dark:text-[#A1A1AA]">hrs</span>
              </p>
              <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#71717A]">Planned capacity baseline</p>
            </div>

            <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 shadow-xs">
              <span className="text-xs text-[#6B7280] dark:text-[#A1A1AA] font-medium">Actual Logged Hours</span>
              <p className="mt-1 text-2xl font-bold text-[#4F46E5] dark:text-[#818CF8]">
                {taskActuals?.total_actual_hours || 0} <span className="text-xs font-normal text-[#6B7280] dark:text-[#A1A1AA]">hrs</span>
              </p>
              <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                {taskActuals?.approved_hours || 0} hrs approved by manager
              </p>
            </div>

            <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 shadow-xs">
              <span className="text-xs text-[#6B7280] dark:text-[#A1A1AA] font-medium">Variance & Burn</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span
                  className={`text-2xl font-bold ${
                    taskActuals?.is_over_estimate
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {taskActuals ? (taskActuals.variance_hours > 0 ? `+${taskActuals.variance_hours}` : `${taskActuals.variance_hours}`) : 0} hrs
                </span>
                <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A1A1AA]">
                  {taskActuals?.is_over_estimate ? 'Over Estimate' : 'Within Budget'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#71717A]">
                {task.estimated_hours > 0 && taskActuals
                  ? `${Math.round((taskActuals.total_actual_hours / task.estimated_hours) * 100)}% of estimate consumed`
                  : 'No estimate configured'}
              </p>
            </div>
          </div>

          {/* Contributors & History */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Contributors List */}
            <div className="rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 space-y-3 shadow-xs">
              <h3 className="text-xs font-bold text-[#202124] dark:text-[#F3F4F6] flex items-center gap-1.5">
                <User className="h-4 w-4 text-[#4F46E5] dark:text-[#818CF8]" />
                <span>Contributors on this Task</span>
              </h3>

              {!taskActuals || taskActuals.contributors.length === 0 ? (
                <p className="text-xs text-[#9CA3AF] dark:text-[#71717A] py-4 text-center">No time logged by team members yet.</p>
              ) : (
                <div className="space-y-2">
                  {taskActuals.contributors.map((c) => (
                    <div
                      key={c.user_id}
                      className="flex items-center justify-between p-2 rounded-md bg-[#F9FAFB] dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[#202124] dark:text-[#F3F4F6] block">{c.name}</span>
                        <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A]">{c.entries_count} logs recorded</span>
                      </div>
                      <span className="font-bold text-xs text-[#4F46E5] dark:text-[#818CF8]">
                        {c.hours} hrs
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Work Logs for this Task */}
            <div className="lg:col-span-2 rounded-lg border border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#202124] dark:text-[#F3F4F6] flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#4F46E5] dark:text-[#818CF8]" />
                  <span>Timesheet Logs ({taskActuals?.entries_count || 0})</span>
                </h3>
                <Link
                  to="/timesheet"
                  className="text-[11px] font-medium text-[#4F46E5] dark:text-[#818CF8] hover:underline"
                >
                  My Timesheet &rarr;
                </Link>
              </div>

              {!taskActuals || taskActuals.recent_entries.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#9CA3AF] dark:text-[#71717A] border border-dashed border-[#E5E7EB] dark:border-[#30343A] rounded-md">
                  No work logs recorded for this specific task.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] dark:border-[#30343A] text-[#6B7280] dark:text-[#A1A1AA] text-[11px]">
                        <th className="py-2 px-2.5 font-semibold">Date</th>
                        <th className="py-2 px-2.5 font-semibold">Member</th>
                        <th className="py-2 px-2.5 font-semibold">Category</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Hours</th>
                        <th className="py-2 px-2.5 font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#30343A] text-[11px]">
                      {taskActuals.recent_entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#25292E]">
                          <td className="py-2 px-2.5 whitespace-nowrap text-[#202124] dark:text-[#F3F4F6] font-medium">{entry.work_date}</td>
                          <td className="py-2 px-2.5 whitespace-nowrap text-[#6B7280] dark:text-[#A1A1AA]">{entry.employee?.name || 'Member'}</td>
                          <td className="py-2 px-2.5 whitespace-nowrap">
                            <span className="px-1.5 py-0.2 rounded bg-[#F1F3F5] dark:bg-[#25292E] text-[10px] text-[#4B5563] dark:text-[#D1D5DB] border border-[#E5E7EB] dark:border-[#30343A]">
                              {entry.work_category}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 whitespace-nowrap font-bold text-[#4F46E5] dark:text-[#818CF8] text-right">
                            {entry.hours_worked}h
                          </td>
                          <td className="py-2 px-2.5 text-[#4B5563] dark:text-[#D1D5DB] max-w-xs truncate">
                            {entry.work_description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
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
