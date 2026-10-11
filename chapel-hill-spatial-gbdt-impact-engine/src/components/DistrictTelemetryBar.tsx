import React from 'react';
import { DistrictInfo, DistrictKey } from '../types';
import { DISTRICTS } from '../data/chapelHillData';
import {
  Compass,
  Thermometer,
  Trees,
  Droplets,
  Layers,
  Sparkles,
} from 'lucide-react';

interface DistrictTelemetryBarProps {
  selectedDistrictId: DistrictKey;
  onSelectDistrict: (district: DistrictInfo) => void;
}

export const DistrictTelemetryBar: React.FC<DistrictTelemetryBarProps> = ({
  selectedDistrictId,
  onSelectDistrict,
}) => {
  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-3 py-2 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max">
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider border-r border-slate-700/60 pr-3">
          <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
          <span>Districts:</span>
        </div>

        {DISTRICTS.map((district) => {
          const isSelected = selectedDistrictId === district.id;

          return (
            <button
              key={district.id}
              onClick={() => onSelectDistrict(district)}
              className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                isSelected
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 shadow-sm shadow-emerald-500/10'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600 hover:text-white'
              }`}
            >
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-100 group-hover:text-emerald-300 transition-colors">
                    {district.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({district.name.split(' ').slice(1, 3).join(' ')})
                  </span>
                </div>

                {/* Telemetry pill */}
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                  <span className="flex items-center gap-0.5 font-mono text-emerald-400">
                    <Trees className="w-2.5 h-2.5" />
                    {(district.baselineNdvi * 100).toFixed(0)}% NDVI
                  </span>
                  <span className="flex items-center gap-0.5 font-mono text-amber-400">
                    <Thermometer className="w-2.5 h-2.5" />
                    {district.baselineLstF.toFixed(0)}°F LST
                  </span>
                  {district.floodRiskLevel === 'Severe' && (
                    <span className="flex items-center gap-0.5 font-mono text-red-400 font-semibold">
                      <Droplets className="w-2.5 h-2.5" />
                      Flood Zone
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
