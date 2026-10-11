import React, { useState, useMemo } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  ProposedProject,
  DistrictInfo,
  LatLng,
  DistrictKey,
} from './types';
import {
  DISTRICTS,
  INITIAL_PROJECTS,
  CHAPEL_HILL_CENTER,
  CIP_BUDGET_CEILING,
} from './data/chapelHillData';
import { predictProjectImpact } from './ml/gbdtEngine';
import { QuotaBanner } from './components/QuotaBanner';
import { DistrictTelemetryBar } from './components/DistrictTelemetryBar';
import { InteractiveMapLayer } from './components/InteractiveMapLayer';
import { MapViewportController } from './components/MapViewportController';
import { ProjectSimulatorPanel } from './components/ProjectSimulatorPanel';
import { ModelExplainabilityDrawer } from './components/ModelExplainabilityDrawer';
import { SurveyFindingsReportView } from './components/SurveyFindingsReportView';
import { NewProjectModal } from './components/NewProjectModal';
import {
  Brain,
  FileText,
  PlusCircle,
  MapPin,
  Layers,
  Sparkles,
  ShieldCheck,
  Compass,
  DollarSign,
  Activity,
  Trees,
  Thermometer,
  Eye,
} from 'lucide-react';

const API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
  'AIzaSyD55igXn0olPUfgDj1-OTxBDALeaY_Ed5w';

export default function App() {
  // State
  const [projects, setProjects] = useState<ProposedProject[]>(INITIAL_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    INITIAL_PROJECTS[0].id
  );
  const [selectedDistrictId, setSelectedDistrictId] =
    useState<DistrictKey>('booker-creek');

  // Camera viewport target
  const [targetViewport, setTargetViewport] = useState<{
    location: LatLng;
    zoom: number;
  }>({
    location: DISTRICTS.find((d) => d.id === 'booker-creek')!.center,
    zoom: 15,
  });

  // Map type
  const [mapType, setMapType] = useState<'hybrid' | 'satellite' | 'roadmap'>(
    'hybrid'
  );

  // Modals
  const [isExplainabilityOpen, setIsExplainabilityOpen] = useState(false);
  const [isSurveyReportOpen, setIsSurveyReportOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [deployLocation, setDeployLocation] = useState<LatLng | null>(null);

  // Currently selected project
  const currentProject = useMemo(() => {
    return (
      projects.find((p) => p.id === selectedProjectId) ||
      projects[0] ||
      INITIAL_PROJECTS[0]
    );
  }, [projects, selectedProjectId]);

  // Current project GBDT prediction
  const currentPrediction = useMemo(() => {
    return predictProjectImpact(currentProject);
  }, [currentProject]);

  // Selected district info
  const currentDistrict = useMemo(() => {
    return (
      DISTRICTS.find((d) => d.id === selectedDistrictId) || DISTRICTS[0]
    );
  }, [selectedDistrictId]);

  // District Selection Handler
  const handleSelectDistrict = (district: DistrictInfo) => {
    setSelectedDistrictId(district.id);
    setTargetViewport({
      location: district.center,
      zoom: district.zoom,
    });
  };

  // Project Selection Handler
  const handleSelectProject = (project: ProposedProject) => {
    setSelectedProjectId(project.id);
    setSelectedDistrictId(project.districtId);
    setTargetViewport({
      location: project.location,
      zoom: 16,
    });
  };

  // Project Parameter Update Handler (from what-if sliders)
  const handleUpdateProject = (updated: ProposedProject) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  // Reset Project to initial defaults
  const handleResetProject = () => {
    const original = INITIAL_PROJECTS.find((p) => p.id === currentProject.id);
    if (original) {
      handleUpdateProject({ ...original });
    }
  };

  // Delete Project
  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => {
      const remaining = prev.filter((p) => p.id !== projectId);
      if (selectedProjectId === projectId && remaining.length > 0) {
        setSelectedProjectId(remaining[0].id);
      }
      return remaining;
    });
  };

  // Add New Project
  const handleAddProject = (newProj: ProposedProject) => {
    setProjects((prev) => [newProj, ...prev]);
    setSelectedProjectId(newProj.id);
    setSelectedDistrictId(newProj.districtId);
    setTargetViewport({
      location: newProj.location,
      zoom: 16,
    });
  };

  // Click on map to deploy
  const handleDeployAtLocation = (loc: LatLng) => {
    setDeployLocation(loc);
    setIsNewProjectModalOpen(true);
  };

  // Total Portfolio CIP Net Outlay
  const totalCipUtilization = useMemo(() => {
    let totalNet = 0;
    for (const p of projects) {
      const pred = predictProjectImpact(p);
      totalNet += pred.fiscal.netTownInvestment;
    }
    return {
      totalNet,
      pctOfCap: +((totalNet / CIP_BUDGET_CEILING) * 100).toFixed(1),
    };
  }, [projects]);

  return (
    <APIProvider apiKey={API_KEY}>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
        {/* Quota Defense Banner (Listening to gmp-quota-exceeded) */}
        <QuotaBanner />

        {/* Top Navbar */}
        <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight">
                  Chapel Hill Spatial GBDT Impact Engine
                </h1>
                <span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                  LightGBM / XGBoost + Spatial Encodings
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                Copernicus Sentinel-2 &bull; Landsat-9 TIRS-2 &bull; VIIRS DNB &bull; USGS 02097000 &bull; $22.0M CIP Cap
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExplainabilityOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow-sm"
              title="Inspect SHAP values and tree splits"
            >
              <Brain className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Model Explainability</span>
            </button>

            <button
              onClick={() => setIsSurveyReportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow-sm"
              title="View 2026 Community Survey Findings & Strategic Goals"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">2026 Survey & Goals</span>
            </button>

            <button
              onClick={() => {
                setDeployLocation(null);
                setIsNewProjectModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Deploy Project</span>
            </button>
          </div>
        </header>

        {/* District Telemetry Selector Bar */}
        <DistrictTelemetryBar
          selectedDistrictId={selectedDistrictId}
          onSelectDistrict={handleSelectDistrict}
        />

        {/* Main Split-Screen Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Left: Google Maps Interactive Viewport */}
          <div className="flex-1 relative h-1/2 lg:h-full bg-slate-950 overflow-hidden flex flex-col">
            <InteractiveMapLayer
              projects={projects}
              selectedProject={currentProject}
              onSelectProject={handleSelectProject}
              onDeployAtLocation={handleDeployAtLocation}
              mapType={mapType}
              onMapTypeChange={setMapType}
            />

            {/* Viewport Camera Controller */}
            <MapViewportController
              targetLocation={targetViewport.location}
              targetZoom={targetViewport.zoom}
            />

            {/* Floating Live Telemetry Overlay Card */}
            <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-xl max-w-sm shadow-2xl text-xs space-y-1.5 hidden md:block">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  {currentDistrict.name}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {currentDistrict.zoningType.split('(')[0]}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                {currentDistrict.description}
              </p>

              <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] font-mono border-t border-slate-800">
                <div className="bg-slate-950/60 p-1.5 rounded">
                  <span className="text-slate-500 block">NDVI (B8/B4)</span>
                  <span className="text-emerald-400 font-bold">
                    {(currentDistrict.baselineNdvi * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="bg-slate-950/60 p-1.5 rounded">
                  <span className="text-slate-500 block">LST (B10)</span>
                  <span className="text-amber-400 font-bold">
                    {currentDistrict.baselineLstF.toFixed(0)}°F
                  </span>
                </div>
                <div className="bg-slate-950/60 p-1.5 rounded">
                  <span className="text-slate-500 block">Survey Sat.</span>
                  <span className="text-cyan-400 font-bold">
                    {currentDistrict.surveySatisfactionPct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: GBDT What-If Simulator & Policy Outcome Panel */}
          <div className="w-full lg:w-[460px] xl:w-[500px] h-1/2 lg:h-full shrink-0">
            <ProjectSimulatorPanel
              project={currentProject}
              projects={projects}
              onSelectProject={handleSelectProject}
              onDeleteProject={handleDeleteProject}
              prediction={currentPrediction}
              onUpdateProject={handleUpdateProject}
              onResetProject={handleResetProject}
            />
          </div>
        </div>

        {/* Explainability Drawer */}
        <ModelExplainabilityDrawer
          prediction={currentPrediction}
          isOpen={isExplainabilityOpen}
          onClose={() => setIsExplainabilityOpen(false)}
        />

        {/* Survey & Goals Modal */}
        <SurveyFindingsReportView
          isOpen={isSurveyReportOpen}
          onClose={() => setIsSurveyReportOpen(false)}
        />

        {/* New Project Creator Modal */}
        <NewProjectModal
          isOpen={isNewProjectModalOpen}
          onClose={() => setIsNewProjectModalOpen(false)}
          onAddProject={handleAddProject}
          initialLocation={deployLocation}
        />
      </div>
    </APIProvider>
  );
}
