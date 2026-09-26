import React, { useState, useEffect } from 'react';
import { taskAPI } from '../services/api';
import {
  Sparkles,
  Award,
  Clock,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Sliders,
  UserCheck,
  X,
  Zap,
  Info
} from 'lucide-react';

export const RecommendAssigneeModal = ({ isOpen, task, onClose, onAssignCandidate }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [complexityFactor, setComplexityFactor] = useState(1.0);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [expandedCandidateId, setExpandedCandidateId] = useState(null);

  // Simulation inputs
  const [customBaseline, setCustomBaseline] = useState(8.0);
  const [customDailyHours, setCustomDailyHours] = useState(8.0);
  const [calculatedEstimate, setCalculatedEstimate] = useState(null);

  const fetchRecommendations = async (complexity = 1.0) => {
    if (!task) return;
    try {
      setLoading(true);
      const res = await taskAPI.computeRecommendations(task.id, complexity);
      const list = res.recommendations || [];
      setRecommendations(list);
      if (list.length > 0 && !selectedCandidate) {
        setSelectedCandidate(list[0]);
        setCustomBaseline(parseFloat(task.estimated_hours) || 8.0);
        setCustomDailyHours(list[0].available_hours_per_day || 8.0);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && task) {
      setCustomBaseline(parseFloat(task.estimated_hours) || 8.0);
      fetchRecommendations(complexityFactor);
    }
  }, [isOpen, task]);

  // Recalculate preview when candidate, complexity, or custom hours change
  useEffect(() => {
    if (selectedCandidate) {
      const base = parseFloat(customBaseline) || 8.0;
      const complexity = parseFloat(complexityFactor) || 1.0;
      const skillFactor = selectedCandidate.skill_adjustment_factor || 1.0;
      const adjustedEffort = Math.round((base * skillFactor * complexity) * 10) / 10;
      const dailyHours = parseFloat(customDailyHours) || 8.0;
      const durationDays = Math.round((adjustedEffort / dailyHours) * 10) / 10;

      setCalculatedEstimate({
        baseline_hours: base,
        skill_adjustment_factor: skillFactor,
        complexity_factor: complexity,
        adjusted_effort_hours: adjustedEffort,
        available_hours_per_day: dailyHours,
        estimated_duration_days: durationDays
      });
    }
  }, [selectedCandidate, complexityFactor, customBaseline, customDailyHours]);

  if (!isOpen || !task) return null;

  const handleSelectCandidate = (candidate) => {
    setSelectedCandidate(candidate);
    setCustomDailyHours(candidate.available_hours_per_day || 8.0);
  };

  const handleConfirm = () => {
    if (!selectedCandidate) return;
    onAssignCandidate({
      user_id: selectedCandidate.user_id,
      user_name: selectedCandidate.user.name,
      baseline_hours: calculatedEstimate?.baseline_hours || customBaseline,
      adjusted_effort_hours: calculatedEstimate?.adjusted_effort_hours || selectedCandidate.estimated_effort_hours,
      available_hours_per_day: calculatedEstimate?.available_hours_per_day || customDailyHours,
      estimated_duration_days: calculatedEstimate?.estimated_duration_days || selectedCandidate.estimated_duration_days,
      complexity_factor: complexityFactor
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Smart Workload & Skill Recommender</h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                  AI Optimization
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ranked suitability based on skill match (60%), available capacity (25%), and task experience (15%)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Complexity Slider Panel */}
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Task Complexity Adjustment</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Scale effort multiplier based on technical uncertainty or architecture risk
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={complexityFactor}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setComplexityFactor(val);
                }}
                className="w-36 accent-indigo-500 cursor-pointer"
              />
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-indigo-300 min-w-[50px] text-center">
                {complexityFactor.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* Candidate List Grid */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Evaluating member skills and capacity balances...</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">No eligible project members found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((cand, idx) => {
                const isSelected = selectedCandidate?.user_id === cand.user_id;
                const isExpanded = expandedCandidateId === cand.user_id;

                return (
                  <div
                    key={cand.user_id}
                    onClick={() => handleSelectCandidate(cand)}
                    className={`rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'border-indigo-500 bg-slate-900 shadow-xl shadow-indigo-950/50 ring-1 ring-indigo-500/50'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="p-4 sm:p-5 space-y-3">
                      {/* Top Candidate Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          {/* Rank Badge */}
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              idx === 0
                                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                                : idx === 1
                                ? 'bg-slate-700/50 text-slate-200'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            #{idx + 1}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{cand.user.name}</span>
                              <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                {cand.user.role}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">{cand.user.email}</p>
                          </div>
                        </div>

                        {/* Total Score & Selection Radio */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-baseline justify-end gap-1">
                              <span className="text-xl font-extrabold text-white">{cand.total_score}</span>
                              <span className="text-xs text-indigo-400 font-semibold">/ 100</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">Suitability Score</span>
                          </div>

                          <div
                            className={`w-6 h-6 rounded-full border flex items-center justify-center transition ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'border-slate-700 bg-slate-950 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>

                      {/* Score Metrics Breakdown Pills */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 block">Skill Match (60%)</span>
                          <span className="text-xs font-bold text-indigo-300">{cand.skill_match_score}%</span>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 block">Available Cap (25%)</span>
                          <span className="text-xs font-bold text-emerald-300">{cand.capacity_score}% ({cand.user.available_capacity}h)</span>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                          <span className="text-[10px] text-slate-400 block">Experience (15%)</span>
                          <span className="text-xs font-bold text-amber-300">{cand.experience_score}%</span>
                        </div>
                      </div>

                      {/* Skills Tags Summary */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {cand.matched_skills.map((s) => (
                          <span
                            key={s.skill_id}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 ${
                              s.meets_requirement
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            }`}
                          >
                            <span>{s.name} (Lvl {s.user_proficiency}/{s.required_proficiency})</span>
                          </span>
                        ))}
                        {cand.missing_skills.map((s) => (
                          <span
                            key={s.skill_id}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20"
                          >
                            Missing: {s.name} {s.is_mandatory && '(Mandatory)'}
                          </span>
                        ))}
                      </div>

                      {/* Expandable Why Suggested Button */}
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCandidateId(isExpanded ? null : cand.user_id);
                          }}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition"
                        >
                          <span>{isExpanded ? 'Hide explanation' : 'Why is this candidate suggested?'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Expandable Explanation Drawer */}
                      {isExpanded && (
                        <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-2 text-xs text-slate-300 animate-fadeIn">
                          <p className="font-semibold text-white">Scoring & Estimation Formula Breakdown:</p>
                          <ul className="list-disc list-inside space-y-1 text-slate-400">
                            <li>
                              <strong>Skill Match ({cand.skill_match_score}%):</strong> {cand.matched_skills.length} matched skills, {cand.missing_skills.length} missing. Adjustment factor: <strong className="text-white">{cand.skill_adjustment_factor}x</strong>.
                            </li>
                            <li>
                              <strong>Available Capacity ({cand.capacity_score}%):</strong> {cand.user.available_capacity}h remaining out of {cand.user.weekly_capacity_hours}h weekly limit ({cand.user.assigned_workload}h assigned).
                            </li>
                            <li>
                              <strong>Domain Experience ({cand.experience_score}%):</strong> Calculated from completed deliverables sharing target skill matrix.
                            </li>
                            <li>
                              <strong>Effort & Duration:</strong> Adjusted effort = {cand.estimated_effort_hours}h at {cand.available_hours_per_day}h/day &rarr; ~{cand.estimated_duration_days} work days.
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Candidate Estimate Simulation Card */}
          {selectedCandidate && calculatedEstimate && (
            <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-slate-900 to-slate-900 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-sm font-bold text-white">
                    Assignment Estimate for {selectedCandidate.user.name}
                  </h4>
                </div>
                <span className="text-xs text-indigo-300 font-semibold">
                  Multiplier: {(calculatedEstimate.skill_adjustment_factor * calculatedEstimate.complexity_factor).toFixed(2)}x
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Baseline Hours</span>
                  <input
                    type="number"
                    value={customBaseline}
                    onChange={(e) => setCustomBaseline(e.target.value)}
                    className="w-full text-center bg-slate-900 border border-slate-700 rounded py-0.5 text-xs font-bold text-white"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Adjusted Effort</span>
                  <span className="text-sm font-extrabold text-indigo-300">
                    {calculatedEstimate.adjusted_effort_hours}h
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Avail Hours/Day</span>
                  <input
                    type="number"
                    value={customDailyHours}
                    onChange={(e) => setCustomDailyHours(e.target.value)}
                    className="w-full text-center bg-slate-900 border border-slate-700 rounded py-0.5 text-xs font-bold text-white"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block mb-1">Estimated Duration</span>
                  <span className="text-sm font-extrabold text-emerald-400">
                    {calculatedEstimate.estimated_duration_days} Days
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="text-xs text-slate-400">
            {selectedCandidate ? (
              <span>Selected: <strong className="text-white">{selectedCandidate.user.name}</strong> ({calculatedEstimate?.adjusted_effort_hours || 0}h)</span>
            ) : (
              <span>Select a candidate to confirm assignment</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedCandidate}
              onClick={handleConfirm}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl shadow-lg shadow-indigo-950 flex items-center gap-2 transition"
            >
              <UserCheck className="w-4 h-4" />
              <span>Select Candidate & Proceed to Decision</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendAssigneeModal;
