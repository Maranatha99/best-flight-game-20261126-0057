// Garuda Sky Courier — shared constants and the three named island missions.
// One mission = a route of rings over recognisable terrain, then a runway landing.
export const VIEW = { width: 1280, height: 800, horizon: 330, focal: 540, groundHalf: 150 };
export const STEP = 1 / 60;
export const BEST_KEY = 'garuda-sky-courier-best';
export const PLANE = {
  cruiseAlt: 120,
  minAlt: 0,
  maxAlt: 320,
  minSpeed: 55,
  maxSpeed: 265,
  maxBank: 0.62,
  maxPitch: 0.42,
  lateralLimit: 58,
};
export const RING_RADIUS = 15;
export const RUNWAY = { width: 18, length: 150, landAlt: 9, landSpeed: 175, landX: 17 };

// A terrain segment paints one stretch of the ground plane (z in metres along the route).
// kind: terraces | volcano | beach | city | jungle | lake | fields
export const MISSIONS = [
  {
    id: 'jawa',
    name: 'Rute Jawa',
    subtitle: 'Merapi — Sawah Terasering — Yogyakarta',
    skyTop: '#1d3a6e', skyMid: '#7fb2e0', skyLow: '#ffd9a0', sun: '#fff3c4',
    segments: [
      { from: 0, to: 900, kind: 'terraces' },
      { from: 900, to: 1900, kind: 'volcano' },
      { from: 1900, to: 2900, kind: 'fields' },
      { from: 2900, to: 3900, kind: 'city' },
      { from: 3900, to: 4600, kind: 'terraces' },
    ],
    rings: [
      { x: -18, y: 120, z: 500 }, { x: 22, y: 150, z: 1000 }, { x: -8, y: 190, z: 1500 },
      { x: 28, y: 160, z: 2100 }, { x: -26, y: 130, z: 2600 }, { x: 10, y: 170, z: 3100 },
      { x: -14, y: 120, z: 3600 }, { x: 4, y: 90, z: 4100 },
    ],
    runwayZ: 4600,
    volcano: { x: -70, z: 1400, height: 260, width: 340 },
    mountain: { x: 95, z: 2300, height: 190, width: 300 },
  },
  {
    id: 'bali',
    name: 'Rute Bali',
    subtitle: 'Pantai Kuta — Pura Uluwatu — Ubud',
    skyTop: '#155e7a', skyMid: '#6fc3dd', skyLow: '#ffe9b8', sun: '#fff8d0',
    segments: [
      { from: 0, to: 800, kind: 'beach' },
      { from: 800, to: 1800, kind: 'terraces' },
      { from: 1800, to: 2800, kind: 'jungle' },
      { from: 2800, to: 3800, kind: 'city' },
      { from: 3800, to: 4500, kind: 'beach' },
    ],
    rings: [
      { x: 20, y: 110, z: 450 }, { x: -22, y: 140, z: 950 }, { x: 8, y: 180, z: 1450 },
      { x: -28, y: 150, z: 2000 }, { x: 24, y: 120, z: 2500 }, { x: -10, y: 165, z: 3000 },
      { x: 16, y: 110, z: 3500 }, { x: 0, y: 85, z: 4000 },
    ],
    runwayZ: 4500,
    volcano: { x: 80, z: 1200, height: 210, width: 300 },
    mountain: { x: -95, z: 2600, height: 170, width: 280 },
  },
  {
    id: 'sumatera',
    name: 'Rute Sumatera',
    subtitle: 'Danau Toba — Hutan Hujan — Medan',
    skyTop: '#1b4a6b', skyMid: '#79aedd', skyLow: '#ffe3a8', sun: '#fff3c4',
    segments: [
      { from: 0, to: 1000, kind: 'jungle' },
      { from: 1000, to: 2000, kind: 'lake' },
      { from: 2000, to: 3000, kind: 'volcano' },
      { from: 3000, to: 3800, kind: 'fields' },
      { from: 3800, to: 4500, kind: 'jungle' },
    ],
    rings: [
      { x: -20, y: 130, z: 500 }, { x: 24, y: 110, z: 1000 }, { x: -6, y: 170, z: 1550 },
      { x: 26, y: 190, z: 2100 }, { x: -24, y: 140, z: 2650 }, { x: 12, y: 120, z: 3150 },
      { x: -16, y: 160, z: 3650 }, { x: 2, y: 90, z: 4050 },
    ],
    runwayZ: 4500,
    volcano: { x: -85, z: 2500, height: 240, width: 320 },
    mountain: { x: 90, z: 1400, height: 180, width: 290 },
  },
];

// Ground colours per terrain kind: [near, far] pairs alternate by band for depth.
export const TERRAIN_COLOURS = {
  terraces: ['#5da244', '#4c8f3a'],
  volcano: ['#6b5a52', '#5d4f48'],
  beach: ['#e8d194', '#dfc47e'],
  city: ['#8d8578', '#7d7568'],
  jungle: ['#2f7a3d', '#276b33'],
  lake: ['#3f8fc4', '#3783b8'],
  fields: ['#7fae4e', '#6f9f42'],
};

export const RING_COLOURS = ['#ffd23e', '#ff9f1c'];
