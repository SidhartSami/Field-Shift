/**
 * Region packs: calendar, economics and defaults.
 *
 * A region pack is the only thing that changes between Punjab and Iowa. The
 * simulation engine is identical. Calendars follow the regional crop calendar;
 * gross margins are editable defaults in local currency, expressed as a
 * P10 / P50 / P90 band rather than a point, because a point would be a lie.
 */

export const REGIONS = {
  'indo-gangetic': {
    name: 'Indo-Gangetic Plain',
    country: 'Pakistan',
    currency: 'PKR',
    currencyLabel: 'PKR',
    areaUnit: 'ha',
    waterCostPerM3: 2.0,
    waterCostLabel: 'Diesel pumping, PKR per m³',
    defaultIrrigationMm: 900,
    defaultSlopePct: 0.5,
    defaultAreaHa: 2.4,
    scaleAreaHa: 4200000,
    scaleAreaLabel: 'rice-wheat area of the Pakistani and Indian Punjab',
    seasons: [
      {
        id: 'kharif',
        label: 'Kharif',
        sub: 'summer monsoon',
        crops: [
          { id: 'rice', plantDay: 165, duration: 135, margin: [60000, 88000, 115000] },
          { id: 'cotton', plantDay: 135, duration: 180, margin: [70000, 105000, 145000] },
          { id: 'maize', plantDay: 160, duration: 100, margin: [55000, 78000, 98000] },
          { id: 'millet', plantDay: 170, duration: 85, margin: [22000, 36000, 52000] },
          { id: 'mung', plantDay: 165, duration: 70, margin: [28000, 44000, 62000] },
          { id: 'sorghum', plantDay: 165, duration: 110, margin: [24000, 40000, 58000] },
          { id: 'sesame', plantDay: 165, duration: 95, margin: [30000, 48000, 68000] },
          { id: 'groundnut', plantDay: 160, duration: 120, margin: [45000, 72000, 98000] },
        ],
      },
      {
        id: 'rabi',
        label: 'Rabi',
        sub: 'winter',
        crops: [
          { id: 'wheat', plantDay: 315, duration: 140, margin: [45000, 68000, 88000] },
          { id: 'chickpea', plantDay: 310, duration: 120, margin: [35000, 55000, 74000] },
          { id: 'mustard', plantDay: 300, duration: 130, margin: [40000, 62000, 82000] },
          { id: 'lentil', plantDay: 305, duration: 110, margin: [28000, 44000, 60000] },
          { id: 'barley', plantDay: 310, duration: 120, margin: [22000, 36000, 50000] },
          { id: 'berseem', plantDay: 300, duration: 150, margin: [30000, 52000, 72000] },
        ],
      },
    ],
    baseline: ['rice', 'wheat'],
    note: 'Canal command plus tubewell irrigation. Rice-wheat is the dominant system and the aquifer is declining.',
  },

  'us-corn-belt': {
    name: 'US Corn Belt',
    country: 'United States',
    currency: 'USD',
    currencyLabel: 'USD',
    areaUnit: 'ha',
    waterCostPerM3: 0.04,
    waterCostLabel: 'Energy and equipment, USD per m³',
    defaultIrrigationMm: 0,
    defaultSlopePct: 2.0,
    defaultAreaHa: 80,
    scaleAreaHa: 35000000,
    scaleAreaLabel: 'US Corn Belt maize-soybean area',
    seasons: [
      {
        id: 'summer',
        label: 'Summer',
        sub: 'rainfed',
        crops: [
          { id: 'maize', plantDay: 120, duration: 130, margin: [400, 720, 980] },
          { id: 'soybean', plantDay: 130, duration: 125, margin: [350, 640, 900] },
          { id: 'sorghum', plantDay: 135, duration: 115, margin: [250, 480, 700] },
          { id: 'oats', plantDay: 100, duration: 100, margin: [180, 340, 520] },
        ],
      },
      {
        id: 'winter',
        label: 'Winter',
        sub: 'fallow or cover',
        crops: [
          { id: 'fallow', plantDay: 300, duration: 120, margin: [0, 0, 0] },
          { id: 'alfalfa', plantDay: 300, duration: 120, margin: [300, 620, 950] },
        ],
      },
    ],
    baseline: ['maize', 'fallow'],
    note: 'Rainfed maize-soybean. The reference high-input system; included to show the engine is not Punjab-specific.',
  },

  'east-african-highlands': {
    name: 'East African Highlands',
    country: 'Kenya',
    currency: 'KES',
    currencyLabel: 'KES',
    areaUnit: 'ha',
    waterCostPerM3: 12,
    waterCostLabel: 'Manual and pump irrigation, KES per m³',
    defaultIrrigationMm: 0,
    defaultSlopePct: 4.0,
    defaultAreaHa: 0.8,
    scaleAreaHa: 1200000,
    scaleAreaLabel: 'Kenyan highland maize-bean area',
    seasons: [
      {
        id: 'longRains',
        label: 'Long rains',
        sub: 'March to June',
        crops: [
          { id: 'maize', plantDay: 75, duration: 120, margin: [30000, 52000, 78000] },
          { id: 'bean', plantDay: 80, duration: 90, margin: [22000, 40000, 60000] },
          { id: 'potato', plantDay: 70, duration: 110, margin: [80000, 140000, 200000] },
          { id: 'sorghum', plantDay: 78, duration: 110, margin: [18000, 34000, 52000] },
        ],
      },
      {
        id: 'shortRains',
        label: 'Short rains',
        sub: 'October to December',
        crops: [
          { id: 'bean', plantDay: 285, duration: 90, margin: [20000, 36000, 55000] },
          { id: 'maize', plantDay: 280, duration: 110, margin: [22000, 42000, 65000] },
          { id: 'potato', plantDay: 282, duration: 105, margin: [70000, 125000, 180000] },
          { id: 'fallow', plantDay: 285, duration: 90, margin: [0, 0, 0] },
        ],
      },
    ],
    baseline: ['maize', 'bean'],
    note: 'Smallholder maize-bean, bimodal rainfall, minimal external input. The hardest case for data availability.',
  },

  deccan: {
    name: 'Deccan Plateau',
    country: 'India',
    currency: 'INR',
    currencyLabel: 'INR',
    areaUnit: 'ha',
    waterCostPerM3: 3.5,
    waterCostLabel: 'Electric pump, INR per m³',
    defaultIrrigationMm: 0,
    defaultSlopePct: 3.0,
    defaultAreaHa: 1.6,
    scaleAreaHa: 11000000,
    scaleAreaLabel: 'Deccan cotton-soybean area',
    seasons: [
      {
        id: 'kharif',
        label: 'Kharif',
        sub: 'monsoon',
        crops: [
          { id: 'cotton', plantDay: 165, duration: 170, margin: [30000, 58000, 85000] },
          { id: 'soybean', plantDay: 170, duration: 100, margin: [20000, 38000, 58000] },
          { id: 'sorghum', plantDay: 170, duration: 110, margin: [12000, 26000, 42000] },
          { id: 'pigeonpea', plantDay: 165, duration: 170, margin: [25000, 48000, 72000] },
        ],
      },
      {
        id: 'rabi',
        label: 'Rabi',
        sub: 'residual moisture',
        crops: [
          { id: 'chickpea', plantDay: 300, duration: 110, margin: [20000, 40000, 62000] },
          { id: 'fallow', plantDay: 300, duration: 110, margin: [0, 0, 0] },
          { id: 'sorghum', plantDay: 295, duration: 115, margin: [10000, 24000, 40000] },
        ],
      },
    ],
    baseline: ['cotton', 'fallow'],
    note: 'Rainfed cotton-soybean on vertisols with high inter-annual rainfall variance.',
  },

  mekong: {
    name: 'Mekong Delta',
    country: 'Vietnam',
    currency: 'VND',
    currencyLabel: 'VND',
    areaUnit: 'ha',
    waterCostPerM3: 900,
    waterCostLabel: 'Pumping, VND per m³',
    defaultIrrigationMm: 300,
    defaultSlopePct: 0.2,
    defaultAreaHa: 1.2,
    scaleAreaHa: 1500000,
    scaleAreaLabel: 'Mekong Delta rice area',
    seasons: [
      {
        id: 'winterSpring',
        label: 'Winter-spring',
        sub: 'dry season rice',
        crops: [
          { id: 'rice', plantDay: 30, duration: 110, margin: [15000000, 24000000, 34000000] },
          { id: 'maize', plantDay: 40, duration: 100, margin: [12000000, 20000000, 29000000] },
          { id: 'sesame', plantDay: 45, duration: 90, margin: [10000000, 18000000, 27000000] },
        ],
      },
      {
        id: 'summerAutumn',
        label: 'Summer-autumn',
        sub: 'wet season',
        crops: [
          { id: 'rice', plantDay: 150, duration: 110, margin: [14000000, 22000000, 32000000] },
          { id: 'maize', plantDay: 155, duration: 100, margin: [11000000, 19000000, 28000000] },
          { id: 'soybean', plantDay: 150, duration: 95, margin: [10000000, 17000000, 26000000] },
        ],
      },
    ],
    baseline: ['rice', 'rice'],
    note: 'Double rice in the delta, with salinity intrusion and subsidence risk.',
  },
};

/** A fallow season: no crop, no water demand, no cover. */
export const FALLOW = {
  name: 'Fallow',
  local: 'Fallow',
  family: 'fallow',
  kcb: { ini: 0, mid: 0, end: 0 },
  stages: [1, 1, 1, 1],
  zr: 0.3,
  p: 0.5,
  tcrit: 99,
  heatWindow: [0.5, 0.6],
  nfix: 0,
  nremoval: 0,
  cover: 0.05,
  disease: [],
  source: 'Bare or volunteer fallow; no crop water demand is modelled.',
};

export function region(id) {
  const r = REGIONS[id];
  if (!r) throw new Error(`Unknown region: ${id}`);
  return r;
}

/** Every crop id that appears in a region pack, in season order. */
export function regionCrops(regionId) {
  const r = region(regionId);
  return r.seasons.map((s) => s.crops.map((c) => c.id));
}
