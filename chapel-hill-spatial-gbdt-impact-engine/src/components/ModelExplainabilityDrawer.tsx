import React, { useState } from 'react';
import { ModelPrediction, TreeNode } from '../types';
import { getExplainableDecisionTree } from '../ml/gbdtEngine';
import {
  GitBranch,
  BarChart3,
  Brain,
  Info,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles,
  CheckCircle,
  HelpCircle,
  X,
} from 'lucide-react';

interface ModelExplainabilityDrawerProps {
  prediction: ModelPrediction;
  isOpen: boolean;
  onClose: () => void;
}

export const ModelExplainabilityDrawer: React.FC<ModelExplainabilityDrawerProps> = ({
  prediction,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'shap' | 'tree' | 'math'>('shap');
  const treeRoot = getExplainableDecisionTree();

  if (!isOpen) return null;

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: TreeNode, depth = 0) => {
    const isLeaf = node.leafValue !== undefined;

    return (
      <div
        key={node.id}
        className={`my-1 text-xs font-mono transition-all duration-200 ${
          depth > 0 ? 'ml-4 pl-3 border-l-2 border-slate-700/60' : ''
        }`}
      >
        {isLeaf ? (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-bold">Leaf Output:</span>
            <span className="text-white font-extrabold text-sm">
              +{node.leafValue?.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-400">
              (n={node.sampleCount} parcel samples)
            </span>
          </div>
        ) : (
          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/70 text-slate-200 mb-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                <span>{node.featureLabel}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                Gain: {node.gain}
              </span>
            </div>

            <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-2">
              <span className="text-amber-300 font-semibold">
                Split Condition: &le; {node.threshold} {node.unit}
              </span>
              <span className="text-slate-500 text-[10px]">
                ({node.sampleCount} records)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-700/50">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
                  &rarr; True (Pass Threshold)
                </span>
                {node.left && renderTreeNode(node.left, depth + 1)}
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-0.5">
                  &rarr; False (Exceeds Threshold)
                </span>
                {node.right && renderTreeNode(node.right, depth + 1)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>GBDT Model Architecture & Explainability</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  XGBoost/LightGBM + Spatial Encodings
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Interactive SHAP feature attribution, Tree split visualization, and spatial formulation
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4">
          <button
            onClick={() => setActiveTab('shap')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'shap'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>SHAP Feature Importance</span>
          </button>

          <button
            onClick={() => setActiveTab('tree')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'tree'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Decision Tree Split Inspector</span>
          </button>

          <button
            onClick={() => setActiveTab('math')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'math'
                ? 'border-emerald-500 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Spatial Encodings & Math</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'shap' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-white">TreeSHAP Local Attribution:</span>{' '}
                Shows how each spatial feature, satellite index, and municipal constraint contributed toward the project's Strategic Alignment Score of{' '}
                <span className="text-emerald-400 font-bold font-mono">
                  {prediction.strategicAlignmentScore}/100
                </span>
                .
              </div>

              <div className="space-y-3">
                {prediction.topContributors.map((c, i) => (
                  <div
                    key={c.feature}
                    className="bg-slate-800/40 border border-slate-700/60 p-3 rounded-xl"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 text-[10px]">
                          #{i + 1}
                        </span>
                        <span className="font-bold text-white">{c.label}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          ({c.feature})
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold text-xs ${
                          c.shapValue >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {c.shapValue >= 0 ? '+' : ''}
                        {c.shapValue} SHAP
                      </span>
                    </div>

                    <div className="w-full bg-slate-900 rounded-full h-2 mb-1.5">
                      <div
                        className={`h-2 rounded-full ${
                          c.shapValue >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.abs(c.shapValue) * 220)}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-400">{c.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tree' && (
            <div className="space-y-3">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                <span className="font-bold text-white">Gradient Boosted Tree Architecture:</span>{' '}
                Ensemble of depth-4 regression trees with second-order gradient updates. Below is the primary environmental resilience tree partitioning parcels by USGS Stream Gauge proximity, nature retention volume, and remote sensing thermal baselines.
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 overflow-x-auto">
                {renderTreeNode(treeRoot)}
              </div>
            </div>
          )}

          {activeTab === 'math' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Spatial Coordinate Positional Encodings
                </h3>
                <p>
                  Standard tree models fail on raw coordinates because axis-aligned orthogonal splits create blocky grid artifacts. We formulate multi-scale Fourier features to learn continuous spatial manifolds:
                </p>
                <div className="bg-slate-900 p-3 rounded-lg font-mono text-[11px] text-cyan-300 border border-slate-800">
                  &gamma;(&Delta;lat, &Delta;lng) = [ sin(2&pi;&omega;&Delta;lat), cos(2&pi;&omega;&Delta;lat), sin(4&pi;&omega;&Delta;lat), cos(4&pi;&omega;&Delta;lng) ]
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Radial Basis Function (RBF) Anchor Kernels
                </h3>
                <p>
                  Distances to critical Chapel Hill geographic nodes (Booker Creek Gauge 02097000, Franklin St Commercial Core, Northside Conservation District, Blue Hill Form-Based Code zone, Bolin Creek Corridor) are encoded via Gaussian RBF kernels:
                </p>
                <div className="bg-slate-900 p-3 rounded-lg font-mono text-[11px] text-cyan-300 border border-slate-800">
                  K(x, c_i) = exp( - ||x - c_i||&sup2; / (2 &sigma;&sup2;) ) with bandwidth &sigma; = 1,200m
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  Multi-Spectral Remote Sensing Alignment
                </h3>
                <p>
                  Remote sensing APIs are continuously merged into the gradient boosted feature vector:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li>
                    <strong className="text-emerald-300">Copernicus Sentinel-2 MSI:</strong> Band 4 (Red 665nm) and Band 8 (NIR 842nm) compute normalized difference vegetation canopy density: (B8 - B4) / (B8 + B4).
                  </li>
                  <li>
                    <strong className="text-amber-300">USGS Landsat-9 TIRS-2:</strong> Band 10 Thermal Infrared calibrates Land Surface Temperature ($LST$ in &deg;F), exposing urban heat islands along US 15-501.
                  </li>
                  <li>
                    <strong className="text-indigo-300">NOAA/NASA VIIRS DNB:</strong> Nocturnal radiance flux evaluates pedestrian illumination safety without causing light pollution in dark-sky corridors.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
