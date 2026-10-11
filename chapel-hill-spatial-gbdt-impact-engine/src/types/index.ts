export type DistrictKey =
  | 'franklin-st'
  | 'booker-creek'
  | 'blue-hill'
  | 'bolin-creek'
  | 'northside'
  | 'homestead-rd';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DistrictInfo {
  id: DistrictKey;
  name: string;
  tagline: string;
  center: LatLng;
  zoom: number;
  zoningType: string;
  baselineNdvi: number; // Sentinel-2 NDVI 0-1
  baselineLstF: number; // Landsat-9 LST in °F
  viirsRadiance: number; // nW·cm-2·sr-1
  hydroDischargeCfs?: number; // USGS NWIS Booker Creek 02097000
  floodRiskLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
  surveySatisfactionPct: number; // 2026 Community Survey baseline
  description: string;
}

export type ProjectCategory =
  | 'stormwater-wetland'
  | 'complete-streets'
  | 'affordable-housing'
  | 'urban-canopy'
  | 'greenway-transit'
  | 'clean-energy-infra';

export interface ProposedProject {
  id: string;
  name: string;
  category: ProjectCategory;
  districtId: DistrictKey;
  location: LatLng;
  description: string;
  capitalCost: number; // in USD (against $22M CIP budget)
  femaBricEligible: boolean; // FEMA BRIC up to 75% cost-share
  ncdotGrantEligible: boolean; // NCDOT Complete Streets grant match
  
  // Design parameters / interventions
  treeCanopyAddedSqFt: number;
  natureRetentionAcres: number;
  protectedBikeLaneMiles: number;
  affordableUnitsCount: number;
  solarIlluminationLumens: number;
  
  // Status
  status: 'proposed' | 'approved' | 'in-progress' | 'simulated';
}

export interface GBDTFeatureVector {
  // Spatial coordinates & encodings
  lat: number;
  lng: number;
  fourier_sin_1: number;
  fourier_cos_1: number;
  fourier_sin_2: number;
  fourier_cos_2: number;
  rbf_dist_franklin: number;
  rbf_dist_booker_creek: number;
  rbf_dist_blue_hill: number;
  rbf_dist_bolin_creek: number;
  rbf_dist_northside: number;
  rbf_dist_homestead: number;
  spatial_lag_heat_index: number;
  spatial_lag_canopy_density: number;

  // Remote Sensing Indices
  sentinel2_ndvi: number;
  landsat9_lst_f: number;
  viirs_radiance: number;
  usgs_booker_gauge_dist_km: number;

  // Zoning & Municipal open data
  is_form_based_code: number;
  is_historic_conservation: number;
  is_watershed_subbasin: number;
  cip_capital_cost_m: number;
  fema_cost_share_ratio: number;

  // Intervention intensities
  intervention_tree_canopy_ratio: number;
  intervention_retention_volume: number;
  intervention_bike_miles: number;
  intervention_affordable_units: number;
}

export interface ModelPrediction {
  // Strategic Council Goals Alignment (0 - 100)
  strategicAlignmentScore: number;
  strategicGoals: {
    environmentalStewardship: number; // 0-100
    affordableHousing: number;
    connectedCommunityMobility: number;
    robustInfrastructure: number;
    fiscalPrudence: number;
  };

  // 2026 Community Survey Sentiment Shift (delta %)
  surveyImpact: {
    overallTownServicesDeltaPct: number; // e.g. +4.2%
    pedestrianBicycleSafetyDeltaPct: number; // e.g. +14.8%
    stormwaterManagementDeltaPct: number; // e.g. +18.5%
    housingAffordabilityDeltaPct: number; // e.g. +9.3%
    greenwayConnectivityDeltaPct: number; // e.g. +11.2%
    equityHistoricPreservationDeltaPct: number; // e.g. +8.1%
  };

  // Remote Sensing & Earth Observation Microclimate Shifts
  microclimate: {
    deltaNdvi: number; // Sentinel-2 NDVI change (+0.08)
    deltaLstF: number; // Landsat-9 LST cooling (°F, e.g. -4.8°F)
    stormwaterRunoffAttenuationMGal: number; // Stormwater volume detained
    viirsPedestrianSafetyIndex: number; // 0-100 nocturnal balance
  };

  // Equity & Vulnerability
  equityScore: number; // 0-100
  completeStreetsSafetyScore: number; // 0-100

  // Fiscal & CIP Analysis ($22.0M statutory ceiling)
  fiscal: {
    grossCost: number;
    femaBricMatchingGrant: number; // up to 75%
    ncdotMatchingGrant: number;
    netTownInvestment: number;
    cipCapUtilizationPct: number; // % of $22.0M
    isWithinCipCeiling: boolean;
  };

  // Model Explainability & SHAP values
  topContributors: {
    feature: string;
    label: string;
    shapValue: number; // positive or negative influence
    description: string;
  }[];
}

export interface TreeNode {
  id: string;
  feature?: string;
  featureLabel?: string;
  threshold?: number;
  unit?: string;
  gain?: number;
  left?: TreeNode;
  right?: TreeNode;
  leafValue?: number;
  sampleCount?: number;
}
