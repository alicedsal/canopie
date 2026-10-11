import React, { useState, useMemo } from 'react';
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  MapMouseEvent,
} from '@vis.gl/react-google-maps';
import { LatLng, ProposedProject, DistrictInfo } from '../types';
import {
  extractSpatialFeatures,
  predictProjectImpact,
} from '../ml/gbdtEngine';
import {
  Trees,
  Thermometer,
  Moon,
  Droplets,
  Zap,
  ShieldCheck,
  PlusCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface InteractiveMapLayerProps {
  projects: ProposedProject[];
  selectedProject: ProposedProject | null;
  onSelectProject: (project: ProposedProject) => void;
  onDeployAtLocation: (loc: LatLng) => void;
  mapType: 'hybrid' | 'satellite' | 'roadmap';
  onMapTypeChange: (type: 'hybrid' | 'satellite' | 'roadmap') => void;
}

export const InteractiveMapLayer: React.FC<InteractiveMapLayerProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  onDeployAtLocation,
  mapType,
  onMapTypeChange,
}) => {
  // Free click state anywhere on the canvas
  const [clickedCoord, setClickedCoord] = useState<LatLng | null>(null);

  // Selected marker for InfoWindow
  const [activeMarkerProject, setActiveMarkerProject] =
    useState<ProposedProject | null>(null);

  // Handle click on the map canvas
  const handleMapClick = (e: MapMouseEvent) => {
    if (!e.detail.latLng) return;
    setClickedCoord({
      lat: e.detail.latLng.lat,
      lng: e.detail.latLng.lng,
    });
    // Deselect project marker window if clicking empty ground
    setActiveMarkerProject(null);
  };

  // Compute on-the-fly remote sensing & spatial predictions for clicked point
  const clickedAnalysis = useMemo(() => {
    if (!clickedCoord) return null;
    const features = extractSpatialFeatures(clickedCoord);

    // Run hypothetical GBDT impact prediction for standard nature-based project here
    const hypotheticalProject: ProposedProject = {
      id: 'hypothetical',
      name: 'Simulated Intervention',
      category: 'stormwater-wetland',
      districtId: 'booker-creek',
      location: clickedCoord,
      description: 'Hypothetical spatial intervention',
      capitalCost: 2_500_000,
      femaBricEligible: true,
      ncdotGrantEligible: true,
      treeCanopyAddedSqFt: 50_000,
      natureRetentionAcres: 2.0,
      protectedBikeLaneMiles: 1.5,
      affordableUnitsCount: 12,
      solarIlluminationLumens: 15_000,
      status: 'simulated',
    };

    const prediction = predictProjectImpact(hypotheticalProject, clickedCoord);

    return {
      features,
      prediction,
    };
  }, [clickedCoord]);

  // Color mapper by project category
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'stormwater-wetland':
        return {
          bg: 'bg-cyan-500',
          border: 'border-cyan-300',
          ring: 'ring-cyan-500/40',
          text: 'text-cyan-400',
        };
      case 'complete-streets':
        return {
          bg: 'bg-amber-500',
          border: 'border-amber-300',
          ring: 'ring-amber-500/40',
          text: 'text-amber-400',
        };
      case 'affordable-housing':
        return {
          bg: 'bg-emerald-500',
          border: 'border-emerald-300',
          ring: 'ring-emerald-500/40',
          text: 'text-emerald-400',
        };
      case 'urban-canopy':
        return {
          bg: 'bg-lime-500',
          border: 'border-lime-300',
          ring: 'ring-lime-500/40',
          text: 'text-lime-400',
        };
      case 'greenway-transit':
        return {
          bg: 'bg-teal-500',
          border: 'border-teal-300',
          ring: 'ring-teal-500/40',
          text: 'text-teal-400',
        };
      default:
        return {
          bg: 'bg-indigo-500',
          border: 'border-indigo-300',
          ring: 'ring-indigo-500/40',
          text: 'text-indigo-400',
        };
    }
  };

  return (
    <div className="relative w-full h-full min-h-[460px]">
      {/* Map Type Switcher Floating Controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-2xl">
        {(['hybrid', 'satellite', 'roadmap'] as const).map((type) => (
          <button
            key={type}
            onClick={() => onMapTypeChange(type)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all duration-200 ${
              mapType === type
                ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Map canvas */}
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={{ lat: 35.9132, lng: -79.0558 }}
        defaultZoom={14}
        mapTypeId={mapType}
        gestureHandling="greedy"
        disableDefaultUI={false}
        onClick={handleMapClick}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        className="w-full h-full"
      >
        {/* Render Advanced Markers for each project */}
        {projects.map((proj) => {
          const colors = getCategoryColor(proj.category);
          const isSelected = selectedProject?.id === proj.id;
          const prediction = predictProjectImpact(proj);

          return (
            <AdvancedMarker
              key={proj.id}
              position={proj.location}
              onClick={() => {
                setActiveMarkerProject(proj);
                onSelectProject(proj);
                setClickedCoord(null);
              }}
              title={proj.name}
            >
              <div
                className={`group relative flex items-center justify-center cursor-pointer transition-transform duration-300 ${
                  isSelected ? 'scale-125 z-30' : 'hover:scale-110'
                }`}
              >
                {/* Outer animated halo ring */}
                <div
                  className={`absolute -inset-2 rounded-full ${colors.bg} opacity-30 animate-ping`}
                />

                {/* Pulse badge marker container */}
                <div
                  className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-2xl border-2 ${colors.border} ${
                    isSelected ? 'bg-slate-950 text-white' : 'bg-slate-900/95 text-slate-200'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${colors.bg} shrink-0`} />
                  <span className="text-[11px] font-bold tracking-tight whitespace-nowrap">
                    {proj.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                    {prediction.strategicAlignmentScore}
                  </span>
                </div>
              </div>
            </AdvancedMarker>
          );
        })}

        {/* Project Marker InfoWindow */}
        {activeMarkerProject && (
          <InfoWindow
            position={activeMarkerProject.location}
            onCloseClick={() => setActiveMarkerProject(null)}
          >
            <div className="p-3 max-w-xs text-slate-900 font-sans">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-emerald-300">
                  {activeMarkerProject.category.replace('-', ' ')}
                </span>
                {activeMarkerProject.femaBricEligible && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    FEMA 75%
                  </span>
                )}
              </div>

              <h4 className="font-bold text-sm text-slate-900 leading-snug mb-1">
                {activeMarkerProject.name}
              </h4>
              <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                {activeMarkerProject.description}
              </p>

              {/* GBDT Prediction snapshot */}
              {(() => {
                const pred = predictProjectImpact(activeMarkerProject);
                return (
                  <div className="bg-slate-100 rounded-lg p-2 mb-2 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-700">Strategic Alignment:</span>
                      <span className="font-bold text-emerald-700 font-mono">
                        {pred.strategicAlignmentScore}/100
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600">Landsat-9 Cooling:</span>
                      <span className="font-mono text-cyan-700 font-medium">
                        {pred.microclimate.deltaLstF}°F
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-600">Net Town Cost:</span>
                      <span className="font-mono text-slate-800 font-bold">
                        ${(pred.fiscal.netTownInvestment / 1_000_000).toFixed(2)}M
                      </span>
                    </div>
                  </div>
                );
              })()}

              <button
                onClick={() => {
                  onSelectProject(activeMarkerProject);
                  setActiveMarkerProject(null);
                }}
                className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Inspect in GBDT Simulator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </InfoWindow>
        )}

        {/* Free Map Click InfoWindow (On-The-Fly Estimated NDVI, LST & Spatial Inference) */}
        {clickedCoord && clickedAnalysis && (
          <InfoWindow
            position={clickedCoord}
            onCloseClick={() => setClickedCoord(null)}
          >
            <div className="p-3 max-w-sm text-slate-900 font-sans">
              <div className="flex items-center justify-between border-b pb-1.5 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>On-the-Fly Satellite & GBDT Telemetry</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {clickedCoord.lat.toFixed(4)}, {clickedCoord.lng.toFixed(4)}
                </span>
              </div>

              {/* Remote sensing observations */}
              <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                    <Trees className="w-3 h-3 text-emerald-600" />
                    <span>Sentinel-2 NDVI</span>
                  </div>
                  <div className="font-mono text-sm font-bold text-emerald-950 mt-0.5">
                    {clickedAnalysis.features.sentinel2_ndvi.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-emerald-700">Canopy Density</div>
                </div>

                <div className="bg-amber-50 p-2 rounded border border-amber-200">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                    <Thermometer className="w-3 h-3 text-amber-600" />
                    <span>Landsat-9 LST</span>
                  </div>
                  <div className="font-mono text-sm font-bold text-amber-950 mt-0.5">
                    {clickedAnalysis.features.landsat9_lst_f.toFixed(1)}°F
                  </div>
                  <div className="text-[10px] text-amber-700">Thermal Infrared</div>
                </div>

                <div className="bg-indigo-50 p-2 rounded border border-indigo-200">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-800">
                    <Moon className="w-3 h-3 text-indigo-600" />
                    <span>VIIRS Radiance</span>
                  </div>
                  <div className="font-mono text-sm font-bold text-indigo-950 mt-0.5">
                    {clickedAnalysis.features.viirs_radiance.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-indigo-700">nW·cm⁻²·sr⁻¹</div>
                </div>

                <div className="bg-blue-50 p-2 rounded border border-blue-200">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-800">
                    <Droplets className="w-3 h-3 text-blue-600" />
                    <span>Booker Creek Gauge</span>
                  </div>
                  <div className="font-mono text-sm font-bold text-blue-950 mt-0.5">
                    {clickedAnalysis.features.usgs_booker_gauge_dist_km.toFixed(2)} km
                  </div>
                  <div className="text-[10px] text-blue-700">USGS 02097000</div>
                </div>
              </div>

              {/* Instant GBDT Hypothetical Impact Preview */}
              <div className="bg-slate-100 p-2 rounded border border-slate-200 mb-2 text-xs">
                <div className="flex justify-between items-center font-semibold text-slate-800 mb-1">
                  <span>GBDT Spatial Suitability:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {clickedAnalysis.prediction.strategicAlignmentScore}/100
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 flex justify-between">
                  <span>Est. Survey Satisfaction Shift:</span>
                  <span className="font-mono text-emerald-600 font-semibold">
                    +{clickedAnalysis.prediction.surveyImpact.overallTownServicesDeltaPct}%
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  onDeployAtLocation(clickedCoord);
                  setClickedCoord(null);
                }}
                className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Simulate New Project At This Location</span>
              </button>
            </div>
          </InfoWindow>
        )}
      </Map>
    </div>
  );
};
