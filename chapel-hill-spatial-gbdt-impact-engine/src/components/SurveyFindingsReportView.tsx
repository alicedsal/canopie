import React from 'react';
import {
  SURVEY_2026_BENCHMARKS,
  COUNCIL_STRATEGIC_GOALS,
} from '../data/chapelHillData';
import {
  FileText,
  ExternalLink,
  Target,
  Users,
  Compass,
  CheckCircle2,
  AlertCircle,
  X,
  TrendingUp,
  Award,
} from 'lucide-react';

interface SurveyFindingsReportViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SurveyFindingsReportView: React.FC<SurveyFindingsReportViewProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Town Policy & Community Survey Calibration</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Chapel Hill Official Open Data
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ground truth objective functions optimizing the Spatially Aware GBDT model
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Part 1: 2026 Community Survey Findings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>2026 Community Survey Findings Report (June 29, 2026)</span>
              </h3>
              <a
                href={SURVEY_2026_BENCHMARKS.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
              >
                <span>Official PDF</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-slate-400 text-xs">
              Sample size of {SURVEY_2026_BENCHMARKS.sampleSize} scientifically sampled Chapel Hill residents with a {SURVEY_2026_BENCHMARKS.confidenceInterval} margin of error. The GBDT model loss function is penalized whenever a capital project fails to address the town's highest-dissatisfaction priorities.
            </p>

            <div className="space-y-2.5">
              {SURVEY_2026_BENCHMARKS.keyFindings.map((finding) => (
                <div
                  key={finding.domain}
                  className="bg-slate-950/60 p-3 rounded-xl border border-slate-800"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs">
                      {finding.domain}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {finding.importanceRank}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] mb-1.5">
                    <span className="text-emerald-400 font-semibold font-mono">
                      Satisfied: {finding.satisfactionPct}%
                    </span>
                    <span className="text-rose-400 font-semibold font-mono">
                      Dissatisfied: {finding.dissatisfactionPct}%
                    </span>
                  </div>

                  <p className="text-slate-400 text-[11px]">
                    {finding.finding}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Part 2: Council Strategic Retreat Goals */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>Town Council Retreat Strategic Goals & Objectives</span>
              </h3>
              <a
                href="https://www.chapelhillnc.gov/files/assets/town/v/1/bmd/documents/budgets/22-23-budget-development/march-16-council-retreat-strategic-goals-and-objectives-status-report.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
              >
                <span>Council Status Report</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {COUNCIL_STRATEGIC_GOALS.map((goal) => (
                <div
                  key={goal.goal}
                  className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-white text-xs">
                      {goal.goal}
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-400">
                      Weight: {(goal.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {goal.target}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
