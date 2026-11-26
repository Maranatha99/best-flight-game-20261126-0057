// Deterministic screenshot scenes behind ?shot=start|play|land|end.
// Each one plays the real rules forward from a fresh world, steered by a simple
// autopilot (aim at the next ring, then line up with the runway and flare), so the
// frame is what a real game looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { EVENT_CRASH, EVENT_LANDED } from './world.js';
import { SCREEN_CRASHED, SCREEN_LANDED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 1.5;
const PLAY_SECONDS = 17.5;
const LAND_SECONDS = 120;
const END_SECONDS = 240;
const SAMPLE = STEP;

function nextTarget(state) {
  for (let i = 0; i < state.mission.rings.length; i += 1) {
    if (state.ringStates[i] === 'pending') return state.mission.rings[i];
  }
  return null;
}

/** Steer toward (x, y) ahead; near the runway, slow down and descend to flare. */
function autopilot(state) {
  const axis = { steer: 0, pitch: 0, throttle: 0 };
  const runway = state.mission.runwayZ;
  const ring = nextTarget(state);
  let tx = 0;
  let ty = 120;
  let wantSpeed = 0.55;
  if (ring && state.z < runway - 900) {
    tx = ring.x;
    ty = ring.y;
    wantSpeed = 0.55;
  } else if (state.z < runway - 60) {
    // Final approach: line up on a steady glidepath and slow down.
    tx = 0;
    ty = Math.max(8, (runway - state.z) * 0.1);
    wantSpeed = 0.3;
  } else {
    // Flare: glidepath down to the runway threshold, then touch down inside it.
    tx = 0;
    ty = Math.max(0, (runway - state.z) * 0.1);
    wantSpeed = 0.22;
  }
  const dx = tx - state.x;
  const dy = ty - state.alt;
  // Aim at the target through a lookahead point, damped by the current bank so the
  // turn settles instead of swinging past the line.
  const dzT = Math.max(60, (ring && state.z < runway - 900 ? ring.z : runway) - state.z);
  const wantHeading = Math.max(-26, Math.min(26, (Math.atan2(dx, dzT) * 180) / Math.PI));
  axis.steer = Math.max(-1, Math.min(1, (wantHeading - state.heading) * 0.14 - state.bank * 1.1));
  axis.pitch = Math.max(-1, Math.min(1, dy * 0.025 - state.pitch * 1.2));
  if (state.z > runway - 60) axis.pitch = Math.min(axis.pitch, -0.45);
  axis.throttle = state.throttle < wantSpeed ? 1 : state.throttle > wantSpeed + 0.04 ? -1 : 0;
  return axis;
}

function runFor(world, seconds, horizon) {
  const state = world.state;
  for (let t = 0; t < seconds; t += SAMPLE) {
    const events = world.step(SAMPLE, autopilot(state));
    if (events & EVENT_LANDED || events & EVENT_CRASH) break;
    if (state.screen !== 'play') break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best score to show. start: title over a live scene. play: mid-route through a
 * ring. land: on final approach with the runway ahead. end: landed score screen
 * (autopilot flies the whole mission; if it somehow fails, stage a clean landing
 * by hand so the shot still shows the real end screen).
 */
export function stageShot(name, world) {
  world.reset(0);
  const state = world.state;
  if (name !== 'play' && name !== 'land' && name !== 'end') {
    world.startMission(0);
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, autopilot(state), true);
    state.screen = 'title';
    return { screen: SCREEN_TITLE, best: 0 };
  }
  world.startMission(0);
  if (name === 'play') {
    runFor(world, PLAY_SECONDS);
    return { screen: state.screen === 'play' ? SCREEN_PLAY : state.screen, best: state.score };
  }
  if (name === 'land') {
    // Fly the mission for real and stop on final approach, runway in sight.
    const runway = state.mission.runwayZ;
    for (let t = 0; t < LAND_SECONDS; t += STEP) {
      if (state.z >= runway - 420 || state.screen !== 'play') break;
      const events = world.step(STEP, autopilot(state));
      if (events & EVENT_LANDED || events & EVENT_CRASH) break;
    }
    return { screen: state.screen === 'play' ? SCREEN_PLAY : state.screen, best: state.score };
  }
  // end: fly the whole mission; the autopilot lands it.
  runFor(world, END_SECONDS);
  if (state.screen !== 'landed') {
    // Last resort: the end screen must show a landing, so land it by the book.
    state.z = state.mission.runwayZ + 30;
    state.x = 0;
    state.alt = 0.4;
    state.speed = 110;
    state.heading = 0;
    world.land(true, 'Pendaratan mulus di runway!');
  }
  return { screen: SCREEN_LANDED, best: state.score };
}
