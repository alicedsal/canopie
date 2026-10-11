import React from 'react';
import { ProposedProject, ModelPrediction, ProjectCategory } from '../types';
import { CIP_BUDGET_CEILING } from '../data/chapelHillData';
import {
  Sliders,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  TreePine,
  Droplets,
  Bike,
  Home,
  Sun,
  Activity,
  Award,
  Sparkles,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface ProjectSimulatorPanelProps {
  project: ProposedProject;
  projects?: ProposedProject[];
  onSelectProject?: (project: ProposedProject) => void;
  onDeleteProject?: (projectId: string) => void;
  prediction: ModelPrediction;
  onUpdateProject: (updated: ProposedProject) => void;
  onResetProject: () => void;
}

export const ProjectSimulatorPanel: React.FC<ProjectSimulatorPanelProps> = ({
  project,
  projects,
  onSelectProject,
  onDeleteProject,
  prediction,
  onUpdateProject,
  onResetProject,
}) => {
  const handleChange = <K extends keyof ProposedProject>(
    field: K,
    value: ProposedProject[K]
  ) => {
    onUpdateProject({
      ...project,
      [field]: value,
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 60) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    if (score >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 border-l border-slate-800 text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            GBDT Scenario Simulator
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onResetProject}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
              title="Reset parameters"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
            {onDeleteProject && projects && projects.length > 1 && (
              <button
                onClick={() => onDeleteProject(project.id)}
                className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
                title="Remove this project"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>

        {/* Project Switcher Dropdown */}
        {projects && projects.length > 1 && onSelectProject && (
          <div className="mb-2">
            <select
              value={project.id}
              onChange={(e) => {
                const found = projects.find((p) => p.id === e.target.value);
                if (found) onSelectProject(found);
              }}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <h2 className="text-sm font-bold text-white tracking-tight line-clamp-1">
          {project.name}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
          {project.description}
        </p>

        {/* Primary Prediction Scorecard */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center ${getScoreColor(prediction.strategicAlignmentScore)}`}>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
              Council Alignment
            </span>
            <span className="text-xl font-extrabold font-mono mt-0.5">
              {prediction.strategicAlignmentScore}
              <span className="text-xs font-normal opacity-70">/100</span>
            </span>
          </div>

          <div className="p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 flex flex-col items-center justify-center text-center text-cyan-300">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
              Survey Sentiment
            </span>
            <span className="text-xl font-extrabold font-mono mt-0.5">
              +{prediction.surveyImpact.overallTownServicesDeltaPct}%
            </span>
          </div>

          <div className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 flex flex-col items-center justify-center text-center text-purple-300">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
              Landsat-9 Cooling
            </span>
            <span className="text-xl font-extrabold font-mono mt-0.5">
              {prediction.microclimate.deltaLstF}°F
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Intervention Tuning Sliders */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Design & Policy Interventions
            </h3>
          </div>

          <div className="space-y-3.5 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
            {/* Capital Cost */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Capital Cost ($USD)
                </span>
                <span className="font-mono text-emerald-300 font-bold">
                  ${(project.capitalCost / 1_000_000).toFixed(2)}M
                </span>
              </div>
              <input
                type="range"
                min="500000"
                max="10000000"
                step="250000"
                value={project.capitalCost}
                onChange={(e) => handleChange('capitalCost', Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 rounded-lg h-1.5 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>$0.5M</span>
                <span>$22M CIP statutory cap</span>
                <span>$10M</span>
              </div>
            </div>

            {/* Grant Eligibility Checkboxes */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
              <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={project.femaBricEligible}
                  onChange={(e) => handleChange('femaBricEligible', e.target.checked)}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 accent-emerald-500 w-3.5 h-3.5"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-white text-[11px]">FEMA BRIC (75%)</span>
                  <span className="text-[10px] text-slate-400">Nature-based grant</span>
                </div>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700">
                <input
                  type="checkbox"
                  checked={project.ncdotGrantEligible}
                  onChange={(e) => handleChange('ncdotGrantEligible', e.target.checked)}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 accent-emerald-500 w-3.5 h-3.5"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-white text-[11px]">NCDOT Complete (50%)</span>
                  <span className="text-[10px] text-slate-400">State safety match</span>
                </div>
              </label>
            </div>

            {/* Canopy Added */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <TreePine className="w-3.5 h-3.5 text-lime-400" />
                  Tree Canopy Area (Sq Ft)
                </span>
                <span className="font-mono text-lime-300 font-bold">
                  {project.treeCanopyAddedSqFt.toLocaleString()} sq ft
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="200000"
                step="5000"
                value={project.treeCanopyAddedSqFt}
                onChange={(e) => handleChange('treeCanopyAddedSqFt', Number(e.target.value))}
                className="w-full accent-lime-500 bg-slate-800 rounded-lg h-1.5 cursor-pointer"
              />
            </div>

            {/* Nature Retention Acres */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                  Stormwater Wetland Retention (Acres)
                </span>
                <span className="font-mono text-cyan-300 font-bold">
                  {project.natureRetentionAcres} acres
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="6"
                step="0.2"
                value={project.natureRetentionAcres}
                onChange={(e) => handleChange('natureRetentionAcres', Number(e.target.value))}
                className="w-full accent-cyan-500 bg-slate-800 rounded-lg h-1.5 cursor-pointer"
              />
            </div>

            {/* Protected Bike Lanes */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Bike className="w-3.5 h-3.5 text-amber-400" />
                  Protected Bike Lane Network (Miles)
                </span>
                <span className="font-mono text-amber-300 font-bold">
                  {project.protectedBikeLaneMiles} mi
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.2"
                value={project.protectedBikeLaneMiles}
                onChange={(e) => handleChange('protectedBikeLaneMiles', Number(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 rounded-lg h-1.5 cursor-pointer"
              />
            </div>

            {/* Affordable Housing Units */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-emerald-400" />
                  Affordable Housing Units
                </span>
                <span className="font-mono text-emerald-300 font-bold">
                  {project.affordableUnitsCount} units
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="2"
                value={project.affordableUnitsCount}
                onChange={(e) => handleChange('affordableUnitsCount', Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 rounded-lg h-1.5 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Council Strategic Objectives Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              Council Strategic Goals
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Retreat Objectives</span>
          </div>

          <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 text-xs">
            {/* Environmental Stewardship */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Environmental Stewardship</span>
                <span className="font-mono font-bold text-emerald-400">
                  {prediction.strategicGoals.environmentalStewardship}/100
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${prediction.strategicGoals.environmentalStewardship}%` }}
                />
              </div>
            </div>

            {/* Affordable Housing */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Affordable Housing & Equity</span>
                <span className="font-mono font-bold text-teal-400">
                  {prediction.strategicGoals.affordableHousing}/100
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div
                  className="bg-teal-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${prediction.strategicGoals.affordableHousing}%` }}
                />
              </div>
            </div>

            {/* Connected Community */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Connected Multimodal Mobility</span>
                <span className="font-mono font-bold text-amber-400">
                  {prediction.strategicGoals.connectedCommunityMobility}/100
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${prediction.strategicGoals.connectedCommunityMobility}%` }}
                />
              </div>
            </div>

            {/* Robust Infrastructure */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Stormwater & Infrastructure Resilience</span>
                <span className="font-mono font-bold text-cyan-400">
                  {prediction.strategicGoals.robustInfrastructure}/100
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div
                  className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${prediction.strategicGoals.robustInfrastructure}%` }}
                />
              </div>
            </div>

            {/* Fiscal Prudence */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Fiscal Responsibility & CIP Cap</span>
                <span className="font-mono font-bold text-indigo-400">
                  {prediction.strategicGoals.fiscalPrudence}/100
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${prediction.strategicGoals.fiscalPrudence}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2026 Community Survey Findings Shifts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              2026 Community Survey Shift
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">June 2026 Findings</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Pedestrian/Bike Safety</span>
              <span className="text-sm font-bold font-mono text-emerald-400">
                +{prediction.surveyImpact.pedestrianBicycleSafetyDeltaPct}%
              </span>
              <span className="text-[9px] text-slate-500 block">Dissatisfaction was 37%</span>
            </div>

            <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Housing Affordability</span>
              <span className={`text-sm font-bold font-mono ${prediction.surveyImpact.housingAffordabilityDeltaPct >= 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                {prediction.surveyImpact.housingAffordabilityDeltaPct > 0 ? '+' : ''}
                {prediction.surveyImpact.housingAffordabilityDeltaPct}%
              </span>
              <span className="text-[9px] text-slate-500 block">#1 Town Priority (78%)</span>
            </div>

            <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Stormwater & Flood</span>
              <span className="text-sm font-bold font-mono text-cyan-400">
                +{prediction.surveyImpact.stormwaterManagementDeltaPct}%
              </span>
              <span className="text-[9px] text-slate-500 block">Booker/Bolin Basin</span>
            </div>

            <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Greenway Continuity</span>
              <span className="text-sm font-bold font-mono text-teal-400">
                +{prediction.surveyImpact.greenwayConnectivityDeltaPct}%
              </span>
              <span className="text-[9px] text-slate-500 block">84% asset satisfaction</span>
            </div>
          </div>
        </div>

        {/* Fiscal & CIP Ceiling Meter */}
        <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Statutory CIP $22.0M Cap
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              {prediction.fiscal.cipCapUtilizationPct}%
            </span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                prediction.fiscal.cipCapUtilizationPct > 35
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, prediction.fiscal.cipCapUtilizationPct)}%` }}
            />
          </div>

          <div className="space-y-1 text-[11px] text-slate-400">
            <div className="flex justify-between">
              <span>Gross Project Capital:</span>
              <span className="font-mono text-slate-200">
                ${(prediction.fiscal.grossCost / 1_000_000).toFixed(2)}M
              </span>
            </div>
            {prediction.fiscal.femaBricMatchingGrant > 0 && (
              <div className="flex justify-between text-blue-400">
                <span>FEMA BRIC 75% Match:</span>
                <span className="font-mono">
                  -${(prediction.fiscal.femaBricMatchingGrant / 1_000_000).toFixed(2)}M
                </span>
              </div>
            )}
            {prediction.fiscal.ncdotMatchingGrant > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>NCDOT Complete 50% Match:</span>
                <span className="font-mono">
                  -${(prediction.fiscal.ncdotMatchingGrant / 1_000_000).toFixed(2)}M
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-100 border-t border-slate-800 pt-1">
              <span>Net Municipal CIP Outlay:</span>
              <span className="font-mono text-emerald-300">
                ${(prediction.fiscal.netTownInvestment / 1_000_000).toFixed(2)}M
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
