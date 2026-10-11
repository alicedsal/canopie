import React, { useState } from 'react';
import { ProposedProject, ProjectCategory, DistrictKey, LatLng } from '../types';
import { DISTRICTS } from '../data/chapelHillData';
import {
  PlusCircle,
  X,
  Compass,
  DollarSign,
  TreePine,
  Droplets,
  Bike,
  Home,
  ShieldCheck,
} from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (project: ProposedProject) => void;
  initialLocation?: LatLng | null;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onAddProject,
  initialLocation,
}) => {
  const [name, setName] = useState('New Chapel Hill Capital Initiative');
  const [category, setCategory] = useState<ProjectCategory>('stormwater-wetland');
  const [districtId, setDistrictId] = useState<DistrictKey>('booker-creek');
  const [description, setDescription] = useState(
    'Targeted capital project designed to enhance community resilience, multimodal safety, and environmental stewardship.'
  );
  const [capitalCost, setCapitalCost] = useState(2_800_000);
  const [femaBricEligible, setFemaBricEligible] = useState(true);
  const [ncdotGrantEligible, setNcdotGrantEligible] = useState(false);
  const [treeCanopyAddedSqFt, setTreeCanopyAddedSqFt] = useState(45_000);
  const [natureRetentionAcres, setNatureRetentionAcres] = useState(2.2);
  const [protectedBikeLaneMiles, setProtectedBikeLaneMiles] = useState(1.4);
  const [affordableUnitsCount, setAffordableUnitsCount] = useState(12);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenDistrict = DISTRICTS.find((d) => d.id === districtId)!;
    const location = initialLocation || chosenDistrict.center;

    const newProject: ProposedProject = {
      id: `proj-${Date.now()}`,
      name,
      category,
      districtId,
      location,
      description,
      capitalCost,
      femaBricEligible,
      ncdotGrantEligible,
      treeCanopyAddedSqFt,
      natureRetentionAcres,
      protectedBikeLaneMiles,
      affordableUnitsCount,
      solarIlluminationLumens: 16_000,
      status: 'simulated',
    };

    onAddProject(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Deploy New Capital Project for GBDT Prediction
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          <div>
            <label className="block text-slate-200 font-semibold mb-1">
              Project Title
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-200 font-semibold mb-1">
                Intervention Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProjectCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="stormwater-wetland">Stormwater Retention Wetland</option>
                <option value="complete-streets">Complete Streets & Bike Lanes</option>
                <option value="affordable-housing">Affordable Housing Infill</option>
                <option value="urban-canopy">Urban Tree Canopy & Cooling</option>
                <option value="greenway-transit">Greenway Multi-Use Connector</option>
                <option value="clean-energy-infra">Clean Energy & Resilient Infra</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-200 font-semibold mb-1">
                Target District
              </label>
              <select
                value={districtId}
                onChange={(e) => setDistrictId(e.target.value as DistrictKey)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                {DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-200 font-semibold mb-1">
              Project Brief & Rationale
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-slate-200 font-semibold mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Capital Cost ($)
              </label>
              <input
                type="number"
                min="100000"
                step="50000"
                value={capitalCost}
                onChange={(e) => setCapitalCost(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-emerald-300 font-semibold"
              />
            </div>

            <div className="flex flex-col justify-end gap-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={femaBricEligible}
                  onChange={(e) => setFemaBricEligible(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                <span className="text-[11px] text-slate-300">FEMA BRIC (75% match)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ncdotGrantEligible}
                  onChange={(e) => setNcdotGrantEligible(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                <span className="text-[11px] text-slate-300">NCDOT Complete (50% match)</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-slate-300 text-[11px] mb-1">
                Canopy Added (Sq Ft)
              </label>
              <input
                type="number"
                value={treeCanopyAddedSqFt}
                onChange={(e) => setTreeCanopyAddedSqFt(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-[11px] mb-1">
                Stormwater Retention (Acres)
              </label>
              <input
                type="number"
                step="0.1"
                value={natureRetentionAcres}
                onChange={(e) => setNatureRetentionAcres(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-[11px] mb-1">
                Protected Bike Lanes (Miles)
              </label>
              <input
                type="number"
                step="0.1"
                value={protectedBikeLaneMiles}
                onChange={(e) => setProtectedBikeLaneMiles(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-[11px] mb-1">
                Affordable Housing Units
              </label>
              <input
                type="number"
                value={affordableUnitsCount}
                onChange={(e) => setAffordableUnitsCount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 font-mono"
              />
            </div>
          </div>

          <div className="p-3 border-t border-slate-800 flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Simulate in GBDT Model</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
