// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, landed and crashed.
//
// ?seed=N fixes the scenery. ?shot=start|play|land|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_CRASH, EVENT_LANDED, EVENT_RING } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_CRASHED, SCREEN_LANDED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function announce(text) {
  status.textContent = text;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Test hook: playtest and screenshots read the live state through this.
  window.__garuda = {
    get screen() { return screen; },
    get state() { return world.state; },
    get best() { return best; },
    startMission(i) { world.startMission(i); screen = SCREEN_PLAY; },
  };

  function setScreen(next) {
    screen = next;
    world.state.screen = next;
    announce(next === SCREEN_TITLE ? 'Garuda Sky Courier — menu utama' : next);
  }

  function finishFlight() {
    const landed = world.state.screen === SCREEN_LANDED;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    setScreen(landed ? SCREEN_LANDED : SCREEN_CRASHED);
  }

  function onConfirm() {
    audio.start();
    if (screen === SCREEN_TITLE) {
      world.startMission(world.state.missionIndex);
      setScreen(SCREEN_PLAY);
    } else if (screen === SCREEN_PAUSED) {
      setScreen(SCREEN_PLAY);
    } else if (screen === SCREEN_LANDED || screen === SCREEN_CRASHED) {
      world.startMission(world.state.missionIndex);
      setScreen(SCREEN_PLAY);
    }
  }

  function frame(now) {
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;

    if (input.consume(ACTION_MUTE)) {
      world.state.muted = !world.state.muted;
      announce(world.state.muted ? 'Suara mati' : 'Suara hidup');
    }
    if (input.consume(ACTION_RESTART)) {
      world.reset(0);
      setScreen(SCREEN_TITLE);
    }
    if (input.consume(ACTION_PAUSE)) {
      if (screen === SCREEN_PLAY) setScreen(SCREEN_PAUSED);
      else if (screen === SCREEN_PAUSED) setScreen(SCREEN_PLAY);
    }
    if (input.consume(ACTION_CONFIRM)) onConfirm();
    if (screen === SCREEN_TITLE) {
      if (input.consume('mission1')) { world.reset(0); }
      if (input.consume('mission2')) { world.reset(1); }
      if (input.consume('mission3')) { world.reset(2); }
      if (input.consume('click')) {
        const p = input.pointer;
        const idx = Math.floor((p.x * 1280 - 190) / 310);
        if (p.y * 800 >= 420 && p.y * 800 <= 550 && idx >= 0 && idx < 3) world.reset(idx);
        else onConfirm();
      }
    }

    if (screen === SCREEN_PLAY) {
      accumulator += dt;
      while (accumulator >= STEP) {
        const events = world.step(STEP, input.axis());
        accumulator -= STEP;
        if (events & EVENT_RING) audio.ring();
        if (events & EVENT_LANDED) { audio.land(); finishFlight(); break; }
        if (events & EVENT_CRASH) { audio.crash(); finishFlight(); break; }
      }
      audio.update(world.state.muted ? 0 : world.state.throttle, world.state.speed, true);
    } else {
      audio.update(0, 0, false);
    }

    renderer.draw(world.state, screen, best);
    requestAnimationFrame(frame);
  }

  announce('Garuda Sky Courier — menu utama');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
