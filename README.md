# Garuda Sky Courier

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Maranatha99/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Maranatha99/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Entry for make.fun bounty **best-flight-game-20261126-0057** ("Make the best flight game",
$500 in USDC, 50 places paid). Use the referral code `s11m3687` on make.fun.

**Garuda Sky Courier** is an original 2D flight game: an Indonesian archipelago air
courier. Fly a red-and-white courier plane through glowing rings over recognisable
terrain — the Merapi volcano, terraced rice fields, Kuta beach, Lake Toba — then
bring it down for a smooth landing on the runway. Three named island missions
(Jawa, Bali, Sumatera), each with 8 rings and its own terrain, sky and scenery.

## How to play

Serve the game locally and open it in desktop Chrome:

```sh
node serve.ts
# open http://localhost:8080
```

- **← → / A D** — bank and turn
- **↑ ↓ / W S** — climb and descend
- **Shift** — throttle up, **Ctrl** — throttle down
- **Mouse** — steer by pointer position
- **P** — pause, **M** — mute, **R** — back to the menu, **1/2/3** — pick a mission
- **Enter** — start / continue

Fly through all 8 rings, watch your fuel, and land inside the runway window:
slow (≤ 175 kt), low and lined up. Rings are worth 100 points each; a smooth
landing adds 300 plus time and fuel bonuses. Touch the ground anywhere else and
the sortie is over.

## What is in the game

- Chase view over a pseudo-3D terrain: volcano with a smoke plume, terraced
  fields, beaches, jungle, a lake with a winding river, cities, temples and
  roadside houses — all drawn on canvas, no images, no network requests.
- A lit instrument panel: artificial horizon, altitude, airspeed and heading
  gauges, fuel / throttle / ring bars, and a compass tape — plus a HUD with
  altitude, speed, heading, rings, score, time and fuel.
- Engine hum and wind, synthesised live with Web Audio (no audio files).
- Deterministic: `?seed=N` fixes the scenery, and `?shot=start|play|land|end`
  stages a screenshot scene by playing the real rules with an autopilot.

## Layout

- `game/index.html` — the page; `game/src/main.js` — boot and game loop
- `game/src/config.js` — constants and the three named missions
- `game/src/world.js` — flight model, rings, landing, fuel, scoring
- `game/src/terrain.js` — pseudo-3D projection, ground, mountains, rings, runway
- `game/src/render.js` — sky, plane, instruments, HUD, screens
- `game/src/shots.js` — deterministic screenshot scenes (autopilot)
- `game/src/input.js` — keyboard + mouse; `game/src/audio.js` — Web Audio
- `game/src/random.js` — seeded random
- `main.ts` — the hand-in program (copies `game/` + `screenshots/`, writes the dossier)
- `vendor/makefun-game.ts` — the kit's library, unchanged
- `screenshots/` — 4 real renders of the game (start, ring run, final approach, landed)

Built with plain canvas 2D and the standard library only — no external libraries,
no build step, no network.
