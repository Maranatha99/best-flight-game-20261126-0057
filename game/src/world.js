// Flight model, rings, runway landing, fuel and scoring for Garuda Sky Courier.
// Fixed 1/60 s steps; the plane flies forward along +z, banks to turn, pitches to
// climb or descend, and works the throttle. Deterministic for a given seed.
import { MISSIONS, PLANE, RING_RADIUS, RUNWAY, STEP } from './config.js';
import { createRandom } from './random.js';

export const EVENT_RING = 1;
export const EVENT_MISS = 2;
export const EVENT_LANDED = 4;
export const EVENT_CRASH = 8;
export const EVENT_FUEL = 16;

export function createWorld(seed) {
  const random = createRandom(seed);
  const state = freshState(0);

  function freshState(missionIndex) {
    const mission = MISSIONS[missionIndex];
    return {
      missionIndex,
      mission,
      screen: 'title',
      x: 0,
      alt: PLANE.cruiseAlt,
      z: 0,
      heading: 0, // degrees, 0 = straight down the route
      bank: 0, // radians, + = banking right
      pitch: 0, // radians, + = nose up
      speed: 120,
      throttle: 0.6,
      fuel: 100,
      score: 0,
      ringsHit: 0,
      ringsTotal: mission.rings.length,
      ringStates: mission.rings.map(() => 'pending'),
      time: 0,
      message: '',
      messageT: 0,
      landing: null, // {ok, reason} once the runway window is decided
      best: 0,
      muted: false,
      scenery: buildScenery(random, mission),
    };
  }

  // Roadside scenery: trees, houses, temple gates and clouds, fixed along the route.
  function buildScenery(rng, mission) {
    const items = [];
    const kinds = mission.id === 'bali' ? ['tree', 'tree', 'house', 'temple', 'tree']
      : mission.id === 'sumatera' ? ['tree', 'tree', 'tree', 'house', 'tree']
      : ['tree', 'house', 'tree', 'temple', 'house', 'tree'];
    for (let z = 220; z < mission.runwayZ + 200; z += rng.range(90, 170)) {
      const side = rng.next() < 0.5 ? -1 : 1;
      items.push({
        kind: rng.pick(kinds),
        x: side * rng.range(34, 105),
        z,
        h: rng.range(10, 26),
        s: rng.range(0.8, 1.3),
      });
    }
    const clouds = [];
    for (let i = 0; i < 26; i += 1) {
      clouds.push({
        x: rng.range(-260, 260),
        y: rng.range(190, 300),
        z: rng.range(200, 4800),
        s: rng.range(0.7, 1.9),
      });
    }
    return { items, clouds };
  }

  function reset(missionIndex) {
    const next = freshState(missionIndex ?? state.missionIndex);
    Object.keys(next).forEach((k) => { state[k] = next[k]; });
    state.screen = 'title';
  }

  function startMission(missionIndex) {
    reset(missionIndex);
    state.screen = 'play';
    state.message = `${state.mission.name} — terbang melewati ${state.ringsTotal} ring, lalu mendarat!`;
    state.messageT = 4;
  }

  function say(text, seconds) {
    state.message = text;
    state.messageT = seconds ?? 3;
  }

  function step(dt, axis) {
    if (state.screen !== 'play') return 0;
    let events = 0;
    const prevZ = state.z;

    // Bank and pitch ease toward the pilot's input; no input eases back to level.
    // Out of fuel the plane is forced into a glide: it can only descend.
    const targetBank = axis.steer * PLANE.maxBank;
    let targetPitch = axis.pitch * PLANE.maxPitch;
    if (state.fuel <= 0) targetPitch = Math.min(targetPitch, -0.18);
    state.bank += (targetBank - state.bank) * Math.min(1, dt * 4.5);
    state.pitch += (targetPitch - state.pitch) * Math.min(1, dt * 4.0);

    // Throttle moves the speed toward its target; drag keeps it honest.
    state.throttle = Math.max(0, Math.min(1, state.throttle + axis.throttle * dt * 0.5));
    const targetSpeed = PLANE.minSpeed + state.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 0.55);

    // Banking turns the nose; the heading steers the lateral position.
    state.heading += Math.tan(state.bank) * (state.speed / 420) * dt * 57.2958 * 0.9;
    state.heading = Math.max(-32, Math.min(32, state.heading));
    const headingRad = (state.heading * Math.PI) / 180;
    state.x += Math.sin(headingRad) * state.speed * dt;
    state.z += Math.cos(headingRad) * state.speed * dt;
    state.x = Math.max(-PLANE.lateralLimit, Math.min(PLANE.lateralLimit, state.x));

    // Pitch trades speed for altitude; climbing bleeds speed a little.
    const climb = Math.sin(state.pitch) * state.speed * 0.85;
    state.alt += climb * dt;
    if (state.pitch > 0.15) state.speed -= state.pitch * dt * 14;
    state.alt = Math.max(PLANE.minAlt, Math.min(PLANE.maxAlt, state.alt));

    // Fuel burns with throttle; empty tanks glide you down to the ground.
    state.fuel -= (0.16 + state.throttle * 0.34) * dt;
    if (state.fuel <= 0) {
      state.fuel = 0;
      state.throttle = 0;
      if (!state._fuelWarned) {
        state._fuelWarned = true;
        say('Bahan bakar habis! Meluncur darurat…', 4);
        events |= EVENT_FUEL;
      }
    }

    state.time += dt;
    if (state.messageT > 0) state.messageT -= dt;

    // Rings: crossing a ring's z decides hit or miss by the plane's offset.
    state.mission.rings.forEach((ring, i) => {
      if (state.ringStates[i] !== 'pending') return;
      if (prevZ < ring.z && state.z >= ring.z) {
        const dx = state.x - ring.x;
        const dy = state.alt - ring.y;
        if (Math.hypot(dx, dy) < RING_RADIUS) {
          state.ringStates[i] = 'hit';
          state.ringsHit += 1;
          state.score += 100;
          say(`RING ${state.ringsHit}/${state.ringsTotal}  +100`, 2);
          events |= EVENT_RING;
        } else {
          state.ringStates[i] = 'missed';
          say('Ring terlewat!', 2);
          events |= EVENT_MISS;
        }
      }
    });

    // Ground contact: a gentle touchdown inside the runway window lands the plane.
    const runway = state.mission.runwayZ;
    if (state.alt <= 0.5) {
      if (state.z >= runway - 30 && state.z <= runway + RUNWAY.length) {
        if (state.speed <= RUNWAY.landSpeed && Math.abs(state.x) <= RUNWAY.landX) {
          return land(true, 'Pendaratan mulus di runway!');
        }
        return crash(`Terlalu cepat untuk mendarat (${Math.round(state.speed)} kt)`);
      }
      return crash('Menabrak tanah!');
    }
    // Past the runway without landing: the sortie is over.
    if (state.z > runway + RUNWAY.length + 20 && !state.landing) {
      return crash('Runway terlewat — misi gagal.');
    }
    return events;
  }

  function land(ok, reason) {
    state.landing = { ok, reason };
    const timeBonus = Math.max(0, Math.round(600 - state.time * 2));
    const fuelBonus = Math.round(state.fuel * 2);
    state.score += 300 + timeBonus + fuelBonus;
    state.screen = 'landed';
    state.message = reason;
    return EVENT_LANDED;
  }

  function crash(reason) {
    state.landing = { ok: false, reason };
    state.screen = 'crashed';
    state.message = reason;
    return EVENT_CRASH;
  }

  return { state, reset, startMission, step, say, land, crash };
}
