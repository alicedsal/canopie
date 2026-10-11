import { DistrictInfo, ProposedProject } from '../types';

export const CHAPEL_HILL_CENTER = {
  lat: 35.9132,
  lng: -79.0558,
};

export const CIP_BUDGET_CEILING = 22_000_000; // Town statutory $22.0M CIP budget ceiling

export const DISTRICTS: DistrictInfo[] = [
  {
    id: 'franklin-st',
    name: 'Franklin Street Downtown Core',
    tagline: 'Historic Commercial & Multimodal Corridor',
    center: { lat: 35.9132, lng: -79.0558 },
    zoom: 16,
    zoningType: 'Town Center (TC-1 / TC-2)',
    baselineNdvi: 0.28,
    baselineLstF: 92.4,
    viirsRadiance: 42.5,
    floodRiskLevel: 'Low',
    surveySatisfactionPct: 76,
    description:
      'High pedestrian foot traffic corridor connecting UNC campus with downtown businesses. Priority for NCDOT Complete Streets protected bike lanes, pedestrian safety, and outdoor public realm activation.',
  },
  {
    id: 'booker-creek',
    name: 'Booker Creek Hydrological Basin',
    tagline: 'USGS Gauge 02097000 Flash Flood & Stormwater Corridor',
    center: { lat: 35.9392, lng: -79.0285 },
    zoom: 15,
    zoningType: 'Watershed Protection & Mixed Residential (R-1)',
    baselineNdvi: 0.62,
    baselineLstF: 79.2,
    viirsRadiance: 4.8,
    hydroDischargeCfs: 48.6, // USGS 02097000 realtime stream discharge (cfs)
    floodRiskLevel: 'Severe',
    surveySatisfactionPct: 54,
    description:
      'Critical stormwater bottleneck subject to flash flooding. Stream Gauge 02097000 monitors discharge. FEMA BRIC nature-based stormwater wetlands and detention ponds can claim up to 75% federal match.',
  },
  {
    id: 'blue-hill',
    name: 'Blue Hill Form-Based Code District',
    tagline: 'US 15-501 Gateway Urban Heat Island Zone',
    center: { lat: 35.9324, lng: -79.0182 },
    zoom: 15,
    zoningType: 'Form-Based Code (FBC Walkable Mixed-Use)',
    baselineNdvi: 0.19,
    baselineLstF: 96.8,
    viirsRadiance: 38.2,
    floodRiskLevel: 'High',
    surveySatisfactionPct: 62,
    description:
      'High-impervious surface commercial transition zone along Fordham Blvd. Characterized by severe Landsat-9 heat island anomalies and Booker Creek stormwater runoff. Form-Based Code mandates green canopies and pedestrian-scale development.',
  },
  {
    id: 'bolin-creek',
    name: 'Bolin Creek Greenway & Riparian Corridor',
    tagline: 'Ecological Spine & Non-Motorized Highway',
    center: { lat: 35.927, lng: -79.0435 },
    zoom: 15,
    zoningType: 'Resource Conservation District (RCD)',
    baselineNdvi: 0.76,
    baselineLstF: 74.8,
    viirsRadiance: 2.1,
    floodRiskLevel: 'Moderate',
    surveySatisfactionPct: 88,
    description:
      'High-canopy ecological buffer along Bolin Creek. 84% of residents in the 2026 Community Survey prioritize greenway extensions and pedestrian path continuity connecting schools and transit nodes.',
  },
  {
    id: 'northside',
    name: 'Northside Historic Neighborhood',
    tagline: 'Historically Black Community & Equity Priority',
    center: { lat: 35.9185, lng: -79.062 },
    zoom: 16,
    zoningType: 'Neighborhood Conservation District (NCD-1)',
    baselineNdvi: 0.44,
    baselineLstF: 86.5,
    viirsRadiance: 14.3,
    floodRiskLevel: 'Moderate',
    surveySatisfactionPct: 59,
    description:
      'Historic African American neighborhood adjacent to campus experiencing intense gentrification pressure. Primary target for Town Council Affordable Housing Land Trust and anti-displacement stormwater infill.',
  },
  {
    id: 'homestead-rd',
    name: 'Homestead Road Multimodal Corridor',
    tagline: 'North Chapel Hill Complete Streets & Aquatics Hub',
    center: { lat: 35.9525, lng: -79.056 },
    zoom: 15,
    zoningType: 'Community Commercial & Institutional (OI-2)',
    baselineNdvi: 0.58,
    baselineLstF: 81.3,
    viirsRadiance: 12.8,
    floodRiskLevel: 'Low',
    surveySatisfactionPct: 71,
    description:
      'Growing northern sector hosting Chapel Hill Community Center Park, aquatics, and middle schools. Key focus for continuous multi-use paths, Vision Zero traffic calming, and solar pedestrian illumination.',
  },
];

export const INITIAL_PROJECTS: ProposedProject[] = [
  {
    id: 'proj-booker-bric',
    name: 'Booker Creek Nature-Based Stormwater Wetland & Retention Park',
    category: 'stormwater-wetland',
    districtId: 'booker-creek',
    location: { lat: 35.9392, lng: -79.0285 },
    description:
      'Engineered 4.2-acre riparian bioretention wetland and overflow cascade upstream of USGS Gauge 02097000. Eliminates 100-yr flash flood crests and detains 3.8M gallons of urban runoff.',
    capitalCost: 4_850_000,
    femaBricEligible: true, // Up to 75% FEMA cost share ($3.637M)
    ncdotGrantEligible: false,
    treeCanopyAddedSqFt: 65_000,
    natureRetentionAcres: 4.2,
    protectedBikeLaneMiles: 0.8,
    affordableUnitsCount: 0,
    solarIlluminationLumens: 8_500,
    status: 'proposed',
  },
  {
    id: 'proj-franklin-complete',
    name: 'Franklin St Complete Streets & Protected Micro-Mobility Boulevard',
    category: 'complete-streets',
    districtId: 'franklin-st',
    location: { lat: 35.9132, lng: -79.0558 },
    description:
      'Reconfigures vehicular travel lanes into grade-separated two-way cycle tracks with permeable curb extensions, street trees, and NCDOT Vision Zero intersection daylighting from Columbia St to Boundary St.',
    capitalCost: 3_200_000,
    femaBricEligible: false,
    ncdotGrantEligible: true, // 50% NCDOT Complete Streets match
    treeCanopyAddedSqFt: 38_000,
    natureRetentionAcres: 0.9,
    protectedBikeLaneMiles: 2.4,
    affordableUnitsCount: 0,
    solarIlluminationLumens: 32_000,
    status: 'approved',
  },
  {
    id: 'proj-northside-housing',
    name: 'Northside Community Land Trust Eco-Affordable Infill',
    category: 'affordable-housing',
    districtId: 'northside',
    location: { lat: 35.9185, lng: -79.062 },
    description:
      '38 permanently affordable, net-zero workforce housing units partnered with Marian Cheek Jackson Center. Includes subterranean cisterns to prevent historic stormwater erosion and preserves mature oak canopy.',
    capitalCost: 6_400_000,
    femaBricEligible: false,
    ncdotGrantEligible: false,
    treeCanopyAddedSqFt: 18_000,
    natureRetentionAcres: 1.1,
    protectedBikeLaneMiles: 0.5,
    affordableUnitsCount: 38,
    solarIlluminationLumens: 14_000,
    status: 'proposed',
  },
  {
    id: 'proj-bluehill-cooling',
    name: 'Blue Hill Form-Based Code Urban Tree Canopy & Heat Island Mitigation',
    category: 'urban-canopy',
    districtId: 'blue-hill',
    location: { lat: 35.9324, lng: -79.0182 },
    description:
      'Targeted retrofitting of 8 acres of surface parking lots along US 15-501 into bioswale-lined transit boulevards with high-albedo cool pavements and 450 native canopy trees, slashing Landsat-9 LST by 6.2°F.',
    capitalCost: 2_950_000,
    femaBricEligible: true,
    ncdotGrantEligible: true,
    treeCanopyAddedSqFt: 140_000,
    natureRetentionAcres: 2.6,
    protectedBikeLaneMiles: 1.2,
    affordableUnitsCount: 16,
    solarIlluminationLumens: 22_000,
    status: 'in-progress',
  },
  {
    id: 'proj-homestead-greenway',
    name: 'Homestead-to-Bolin Creek Multi-Use Connector & Solar Safety Trail',
    category: 'greenway-transit',
    districtId: 'homestead-rd',
    location: { lat: 35.9525, lng: -79.056 },
    description:
      'A 12-ft wide paved greenway spine linking Homestead Park to Bolin Creek trail network with dark-sky compliant, pedestrian-activated solar LED bollards and native pollinator stormwater meadow buffers.',
    capitalCost: 2_400_000,
    femaBricEligible: true,
    ncdotGrantEligible: true,
    treeCanopyAddedSqFt: 52_000,
    natureRetentionAcres: 1.8,
    protectedBikeLaneMiles: 3.1,
    affordableUnitsCount: 0,
    solarIlluminationLumens: 18_000,
    status: 'proposed',
  },
];

export const SURVEY_2026_BENCHMARKS = {
  title: '2026 Town of Chapel Hill Community Survey Findings Report (June 2026)',
  sourceUrl: 'https://www.chapelhillnc.gov/files/assets/town/v/1/communications/documents/2026chapelhill_findingsreport_062926.pdf',
  sampleSize: 1_284,
  confidenceInterval: '95% (± 2.7%)',
  keyFindings: [
    {
      domain: 'Housing Affordability & Variety',
      satisfactionPct: 29,
      dissatisfactionPct: 61,
      importanceRank: '#1 Priority for Town Investment',
      finding: '78% of residents cite affordable housing as the greatest challenge facing Chapel Hill, with workforce and low-income infill receiving highest consensus.',
    },
    {
      domain: 'Pedestrian & Bicycle Safety',
      satisfactionPct: 52,
      dissatisfactionPct: 37,
      importanceRank: '#2 Priority for Town Investment',
      finding: '68% of residents request physically protected bike lanes and safer crosswalks along major arterial corridors (Franklin St, MLK Jr Blvd, Fordham Blvd).',
    },
    {
      domain: 'Stormwater & Flood Mitigation',
      satisfactionPct: 61,
      dissatisfactionPct: 26,
      importanceRank: '#3 Priority for Town Investment',
      finding: 'Booker Creek and Bolin Creek basin neighborhoods report strong urgency for nature-based stormwater retention over traditional grey concrete piping.',
    },
    {
      domain: 'Greenways, Parks & Open Space',
      satisfactionPct: 84,
      dissatisfactionPct: 9,
      importanceRank: '#1 Quality of Life Asset',
      finding: '84% of residents actively utilize town greenways and support bridging missing segments between northern neighborhoods and downtown.',
    },
    {
      domain: 'Overall Town Services & Governance',
      satisfactionPct: 78,
      dissatisfactionPct: 11,
      importanceRank: 'Overall Baseline',
      finding: 'Residents express high satisfaction with town emergency services, public transit (Chapel Hill Transit fare-free system), and library operations.',
    },
  ],
};

export const COUNCIL_STRATEGIC_GOALS = [
  {
    goal: 'Environmental Stewardship & Climate Action',
    target: 'Town Climate Action Plan: 100% municipal clean energy & nature-based stormwater retention to counter extreme precipitation events.',
    weight: 0.25,
  },
  {
    goal: 'Affordable Housing & Diversity',
    target: 'Construct or preserve 400+ permanently affordable housing units, leveraging town-owned parcels and Northside Land Trust.',
    weight: 0.25,
  },
  {
    goal: 'Connected Community & Multimodal Mobility',
    target: 'Vision Zero safety targets, continuous bike/ped networks, and seamless Chapel Hill Transit integration.',
    weight: 0.20,
  },
  {
    goal: 'Robust Infrastructure & Stormwater Resilience',
    target: 'Upgrade Booker and Bolin Creek basins to handle 100-year storm events; maximize FEMA BRIC grant cost-sharing.',
    weight: 0.15,
  },
  {
    goal: 'Fiscal Responsibility & Economic Vitality',
    target: 'Strictly respect statutory $22.0M CIP budget ceiling, optimize debt capacity, and stimulate Form-Based Code commercial corridors.',
    weight: 0.15,
  },
];
