import React, { useState, useEffect } from 'react';
import { taskAPI } from '../services/api';
import {
  Sparkles,
  Award,
  ChevronDown,
  ChevronUp,
  Check,
  Sliders,
  UserCheck,
  X,
  Briefcase
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-[#30343A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/30 flex items-center justify-center text-[#4F46E5] dark:text-[#818CF8]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#202124] dark:text-[#F3F4F6]">Smart Workload & Skill Recommender</h3>
                <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/30 text-[#4F46E5] dark:text-[#818CF8] text-[10px] font-medium">
                  Engine
                </span>
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
                Ranked by skill match (60%), available capacity (25%), and experience (15%)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6] p-1 rounded-md hover:bg-[#F1F3F5] dark:hover:bg-[#25292E] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Complexity Slider Panel */}
          <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#181A1D]/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
                <span>Task Complexity Adjustment</span>
              </span>
              <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">
                Scale effort multiplier based on technical uncertainty or architecture risk
              </p>
            </div>

            <div className="flex items-center gap-2.5">
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
                className="w-32 accent-[#4F46E5] cursor-pointer"
              />
              <span className="px-2 py-0.5 rounded bg-white dark:bg-[#1C1F23] border border-[#E5E7EB] dark:border-[#30343A] text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] min-w-[44px] text-center">
                {complexityFactor.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* Candidate List Grid */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">Evaluating member skills and capacity balances...</p>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="py-10 text-center text-[#9CA3AF] dark:text-[#71717A] border border-dashed border-[#E5E7EB] dark:border-[#30343A] rounded-md">
              <Award className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
              <p className="text-xs font-semibold text-[#6B7280] dark:text-[#A1A1AA]">No eligible project members found</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recommendations.map((cand, idx) => {
                const isSelected = selectedCandidate?.user_id === cand.user_id;
                const isExpanded = expandedCandidateId === cand.user_id;

                return (
                  <div
                    key={cand.user_id}
                    onClick={() => handleSelectCandidate(cand)}
                    className={`rounded-md border transition-all cursor-pointer overflow-hidden shadow-xs ${
                      isSelected
                        ? 'border-[#4F46E5] dark:border-[#818CF8] bg-indigo-50/40 dark:bg-[#1C1F23]'
                        : 'border-[#E5E7EB] dark:border-[#30343A] bg-white dark:bg-[#1C1F23] hover:border-[#D1D5DB] dark:hover:border-[#4B5563]'
                    }`}
                  >
                    <div className="p-3.5 space-y-2.5">
                      {/* Top Candidate Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                          {/* Rank Badge */}
                          <div
                            className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                              idx === 0
                                ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-400'
                                : 'bg-[#F1F3F5] dark:bg-[#25292E] text-[#6B7280] dark:text-[#A1A1AA]'
                            }`}
                          >
                            #{idx + 1}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">{cand.user.name}</span>
                              <span className="text-[10px] text-[#6B7280] dark:text-[#A1A1AA] bg-[#F1F3F5] dark:bg-[#181A1D] px-1.5 py-0.5 rounded border border-[#E5E7EB] dark:border-[#30343A]">
                                {cand.user.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">{cand.user.email}</p>
                          </div>
                        </div>

                        {/* Total Score & Selection Radio */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="flex items-baseline justify-end gap-1">
                              <span className="text-base font-bold text-[#202124] dark:text-[#F3F4F6]">{cand.total_score}</span>
                              <span className="text-[11px] text-[#4F46E5] dark:text-[#818CF8] font-medium">/ 100</span>
                            </div>
                            <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A]">Suitability</span>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                              isSelected
                                ? 'bg-[#4F46E5] border-[#4F46E5] text-white'
                                : 'border-[#D1D5DB] dark:border-[#4B5563] bg-white dark:bg-[#181A1D] text-transparent'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                          </div>
                        </div>
                      </div>

                      {/* Score Metrics Breakdown Pills */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#30343A] text-center">
                        <div className="bg-[#F1F3F5] dark:bg-[#181A1D] p-1.5 rounded border border-[#E5E7EB] dark:border-[#30343A]">
                          <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A] block">Skill Match (60%)</span>
                          <span className="text-xs font-semibold text-[#4F46E5] dark:text-[#818CF8]">{cand.skill_match_score}%</span>
                        </div>
                        <div className="bg-[#F1F3F5] dark:bg-[#181A1D] p-1.5 rounded border border-[#E5E7EB] dark:border-[#30343A]">
                          <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A] block">Capacity (25%)</span>
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{cand.capacity_score}% ({cand.user.available_capacity}h)</span>
                        </div>
                        <div className="bg-[#F1F3F5] dark:bg-[#181A1D] p-1.5 rounded border border-[#E5E7EB] dark:border-[#30343A]">
                          <span className="text-[10px] text-[#9CA3AF] dark:text-[#71717A] block">Experience (15%)</span>
                          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{cand.experience_score}%</span>
                        </div>
                      </div>

                      {/* Skills Tags Summary */}
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {cand.matched_skills.map((s) => (
                          <span
                            key={s.skill_id}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                              s.meets_requirement
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
                            }`}
                          >
                            {s.name} (Lvl {s.user_proficiency}/{s.required_proficiency})
                          </span>
                        ))}
                        {cand.missing_skills.map((s) => (
                          <span
                            key={s.skill_id}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40"
                          >
                            Missing: {s.name} {s.is_mandatory && '(Mandatory)'}
                          </span>
                        ))}
                      </div>

                      {/* Expandable Explanation Button */}
                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCandidateId(isExpanded ? null : cand.user_id);
                          }}
                          className="text-[11px] text-[#4F46E5] dark:text-[#818CF8] hover:underline font-medium flex items-center gap-1 transition"
                        >
                          <span>{isExpanded ? 'Hide explanation' : 'Why is this candidate suggested?'}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Expandable Explanation Drawer */}
                      {isExpanded && (
                        <div className="rounded bg-[#F1F3F5] dark:bg-[#181A1D] p-3 border border-[#E5E7EB] dark:border-[#30343A] space-y-1.5 text-xs text-[#202124] dark:text-[#F3F4F6]">
                          <p className="font-semibold text-[#202124] dark:text-[#F3F4F6]">Scoring Formula Breakdown:</p>
                          <ul className="list-disc list-inside space-y-1 text-[#6B7280] dark:text-[#A1A1AA] text-[11px]">
                            <li>
                              <strong>Skill Match ({cand.skill_match_score}%):</strong> {cand.matched_skills.length} matched skills, {cand.missing_skills.length} missing. Adjustment factor: <strong className="text-[#202124] dark:text-[#F3F4F6]">{cand.skill_adjustment_factor}x</strong>.
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
            <div className="rounded-md border border-[#E5E7EB] dark:border-[#30343A] bg-[#F1F3F5] dark:bg-[#181A1D] p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-[#4F46E5] dark:text-[#818CF8]" />
                  <h4 className="text-xs font-semibold text-[#202124] dark:text-[#F3F4F6]">
                    Estimate for {selectedCandidate.user.name}
                  </h4>
                </div>
                <span className="text-[11px] text-[#4F46E5] dark:text-[#818CF8] font-medium">
                  Multiplier: {(calculatedEstimate.skill_adjustment_factor * calculatedEstimate.complexity_factor).toFixed(2)}x
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="bg-white dark:bg-[#25292E] p-2.5 rounded border border-[#E5E7EB] dark:border-[#30343A]">
                  <span className="text-[10px] text-[#6B7280] dark:text-[#A1A1AA] block mb-1">Baseline Hours</span>
                  <input
                    type="number"
                    value={customBaseline}
                    onChange={(e) => setCustomBaseline(e.target.value)}
                    className="w-full text-center bg-[#F1F3F5] dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded py-0.5 text-xs font-semibold text-[#202124] dark:text-[#F3F4F6] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="bg-white dark:bg-[#25292E] p-2.5 rounded border border-[#E5E7EB] dark:border-[#30343A]">
                  <span className="text-[10px] text-[#6B7280] dark:text-[#A1A1AA] block mb-1">Adjusted Effort</span>
                  <span className="text-xs font-semibold text-[#4F46E5] dark:text-[#818CF8]">
                    {calculatedEstimate.adjusted_effort_hours}h
                  </span>
                </div>

                <div className="bg-white dark:bg-[#25292E] p-2.5 rounded border border-[#E5E7EB] dark:border-[#30343A]">
                  <span className="text-[10px] text-[#6B7280] dark:text-[#A1A1AA] block mb-1">Avail Hours/Day</span>
                  <input
                    type="number"
                    value={customDailyHours}
                    onChange={(e) => setCustomDailyHours(e.target.value)}
                    className="w-full text-center bg-[#F1F3F5] dark:bg-[#181A1D] border border-[#E5E7EB] dark:border-[#30343A] rounded py-0.5 text-xs font-semibold text-[#202124] dark:text-[#F3F4F6] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="bg-white dark:bg-[#25292E] p-2.5 rounded border border-[#E5E7EB] dark:border-[#30343A]">
                  <span className="text-[10px] text-[#6B7280] dark:text-[#A1A1AA] block mb-1">Estimated Duration</span>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {calculatedEstimate.estimated_duration_days} Days
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#E5E7EB] dark:border-[#30343A] flex items-center justify-between bg-[#F1F3F5] dark:bg-[#181A1D] shrink-0">
          <div className="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            {selectedCandidate ? (
              <span>Selected: <strong className="text-[#202124] dark:text-[#F3F4F6]">{selectedCandidate.user.name}</strong> ({calculatedEstimate?.adjusted_effort_hours || 0}h)</span>
            ) : (
              <span>Select a candidate to confirm assignment</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#202124] dark:hover:text-[#F3F4F6] rounded-md hover:bg-white dark:hover:bg-[#25292E] border border-transparent hover:border-[#E5E7EB] dark:hover:border-[#30343A] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedCandidate}
              onClick={handleConfirm}
              className="px-4 py-2 text-xs font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 rounded-md transition flex items-center gap-1.5 shadow-sm"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Select & Log Decision</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendAssigneeModal;
