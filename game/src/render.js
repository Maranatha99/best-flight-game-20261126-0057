// All canvas drawing for Garuda Sky Courier: sky, chase-view plane, lit instruments,
// HUD (altitude / speed / heading) and the title / pause / landed / crashed screens.
import { VIEW, MISSIONS, PLANE } from './config.js';
import { createProjector, drawGround, drawMountains, drawClouds, drawScenery, drawRings, drawRunway } from './terrain.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LANDED = 'landed';
export const SCREEN_CRASHED = 'crashed';

const { width: W, height: H, horizon } = VIEW;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const proj = createProjector();

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  fit();
  window.addEventListener('resize', fit);

  function drawSky(state) {
    const m = state.mission;
    const g = ctx.createLinearGradient(0, 0, 0, horizon + 40);
    g.addColorStop(0, m.skyTop);
    g.addColorStop(0.55, m.skyMid);
    g.addColorStop(1, m.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, horizon + 42);
    // Sun with a soft halo, drifting slowly with the route.
    const sunX = 1010 - (state.z % 4000) * 0.01;
    const sunY = 92;
    const halo = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 120);
    halo.addColorStop(0, 'rgba(255,248,200,0.95)');
    halo.addColorStop(0.25, 'rgba(255,230,150,0.45)');
    halo.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(sunX - 130, sunY - 130, 260, 260);
    ctx.fillStyle = m.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  // The courier plane, seen from behind and slightly above, banking with the turn.
  // pyOverride lets the title screen park the plane below its mission cards.
  function drawPlane(state, pyOverride) {
    const px = W / 2;
    const py = pyOverride ?? 545;
    const roll = state.bank;
    // Soft shadow on the ground far below.
    const shadow = proj.project(state.x, 0, state.z + 46, state.x, state.alt + 7, state.z);
    if (shadow && shadow.y < H) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(shadow.x, shadow.y, 34 * shadow.scale * 2.2, 7 * shadow.scale * 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(roll * 0.9);
    const s = 1.15;
    ctx.scale(s, s);
    // Wings: red-tipped, white with a gold stripe, like a Garuda livery.
    ctx.fillStyle = '#e8eef2';
    ctx.beginPath();
    ctx.moveTo(-14, 6);
    ctx.lineTo(-118, 26);
    ctx.lineTo(-118, 34);
    ctx.lineTo(-12, 16);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, 6);
    ctx.lineTo(118, 26);
    ctx.lineTo(118, 34);
    ctx.lineTo(12, 16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c8102e';
    ctx.fillRect(-118, 26, 22, 8);
    ctx.fillRect(96, 26, 22, 8);
    ctx.fillStyle = '#d4a017';
    ctx.fillRect(-118, 24, 118, 2);
    ctx.fillRect(0, 24, 118, 2);
    // Tail fin with the red-white flash.
    ctx.fillStyle = '#c8102e';
    ctx.beginPath();
    ctx.moveTo(-8, -34);
    ctx.lineTo(8, -34);
    ctx.lineTo(14, -2);
    ctx.lineTo(-14, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-8, -34);
    ctx.lineTo(8, -34);
    ctx.lineTo(11, -20);
    ctx.lineTo(-11, -20);
    ctx.closePath();
    ctx.fill();
    // Fuselage, nose up the screen, engines glowing.
    const body = ctx.createLinearGradient(0, -40, 0, 34);
    body.addColorStop(0, '#f4f7f9');
    body.addColorStop(0.6, '#dbe4ea');
    body.addColorStop(1, '#9fb0bc');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -46);
    ctx.quadraticCurveTo(13, -30, 13, 0);
    ctx.quadraticCurveTo(13, 26, 6, 36);
    ctx.lineTo(-6, 36);
    ctx.quadraticCurveTo(-13, 26, -13, 0);
    ctx.quadraticCurveTo(-13, -30, 0, -46);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#12395e';
    ctx.beginPath();
    ctx.ellipse(0, -30, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7ec8f2';
    ctx.beginPath();
    ctx.ellipse(0, -30, 5, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Red cheatline and Garuda wordmark.
    ctx.fillStyle = '#c8102e';
    ctx.fillRect(-12, -6, 24, 3);
    ctx.fillStyle = '#12395e';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GARUDA', 0, 12);
    // Engine glow, brighter with throttle.
    const glow = 0.35 + state.throttle * 0.65;
    ctx.fillStyle = `rgba(255,170,60,${glow})`;
    ctx.beginPath();
    ctx.ellipse(-9, 36, 4.5, 5 + state.throttle * 5, 0, 0, Math.PI * 2);
    ctx.ellipse(9, 36, 4.5, 5 + state.throttle * 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function gauge(x, y, r, label, value, min, max, unit, ticks) {
    ctx.save();
    ctx.translate(x, y);
    // Lit dial face.
    const face = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    face.addColorStop(0, '#2a3442');
    face.addColorStop(1, '#10161f');
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a6b7d';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#c8d4de';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= ticks; i += 1) {
      const a = (-225 + (270 * i) / ticks) * (Math.PI / 180);
      const inner = i % (ticks / 2) === 0 ? r * 0.72 : r * 0.82;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
      ctx.stroke();
    }
    const frac = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const angle = (-225 + 270 * frac) * (Math.PI / 180);
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * (r - 10), Math.sin(angle) * (r - 10));
    ctx.stroke();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8eef2';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(Math.round(value)), 0, r * 0.42);
    ctx.fillStyle = '#9fb0bc';
    ctx.font = '10px sans-serif';
    ctx.fillText(label, 0, r + 16);
    ctx.fillStyle = '#7c8b99';
    ctx.font = '9px sans-serif';
    ctx.fillText(unit, 0, r * 0.62);
    ctx.restore();
  }

  function artificialHorizon(x, y, r, state) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.rotate(-state.bank);
    const pitchPx = Math.max(-r, Math.min(r, state.pitch * r * 1.6));
    ctx.fillStyle = '#3f8fd2';
    ctx.fillRect(-r, -r + pitchPx, r * 2, r);
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(-r, pitchPx, r * 2, r);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, pitchPx);
    ctx.lineTo(r, pitchPx);
    ctx.stroke();
    ctx.rotate(state.bank);
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, 0);
    ctx.lineTo(-r * 0.18, 0);
    ctx.moveTo(r * 0.18, 0);
    ctx.lineTo(r * 0.55, 0);
    ctx.stroke();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#5a6b7d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#9fb0bc';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ATTITUDE', x, y + r + 16);
  }

  function compassTape(state) {
    const tapeY = 664;
    ctx.save();
    ctx.fillStyle = 'rgba(10,16,24,0.85)';
    ctx.fillRect(0, tapeY - 26, W, 52);
    ctx.strokeStyle = '#3a4a5a';
    ctx.beginPath();
    ctx.moveTo(0, tapeY - 26);
    ctx.lineTo(W, tapeY - 26);
    ctx.moveTo(0, tapeY + 26);
    ctx.lineTo(W, tapeY + 26);
    ctx.stroke();
    const headings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const hdg = ((state.heading % 360) + 360) % 360;
    const pxPerDeg = 5.2;
    for (let d = -36; d <= 36; d += 3) {
      const deg = Math.round((hdg + d + 360) % 360);
      const x = W / 2 + d * pxPerDeg;
      const major = deg % 30 === 0;
      ctx.strokeStyle = major ? '#e8eef2' : '#5a6b7d';
      ctx.lineWidth = major ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, tapeY - 14);
      ctx.lineTo(x, tapeY - (major ? 2 : 8));
      ctx.stroke();
      if (major) {
        ctx.fillStyle = '#e8eef2';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        const label = deg % 90 === 0 ? headings[Math.round(deg / 45) % 8] : String(deg).padStart(3, '0');
        ctx.fillText(label, x, tapeY + 16);
      }
    }
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.moveTo(W / 2, tapeY - 26);
    ctx.lineTo(W / 2 - 7, tapeY - 36);
    ctx.lineTo(W / 2 + 7, tapeY - 36);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawInstruments(state) {
    // Panel strip.
    const grad = ctx.createLinearGradient(0, 640, 0, H);
    grad.addColorStop(0, '#1a2230');
    grad.addColorStop(1, '#0b0f16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 640, W, 160);
    ctx.strokeStyle = '#3a4a5a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 640);
    ctx.lineTo(W, 640);
    ctx.stroke();
    artificialHorizon(120, 724, 52, state);
    gauge(260, 724, 52, 'ALTITUDE', state.alt * 10, 0, 3200, 'ft', 8);
    gauge(400, 724, 52, 'AIRSPEED', state.speed, 0, 280, 'kt', 8);
    gauge(540, 724, 52, 'HEADING', ((state.heading % 360) + 360) % 360, 0, 360, 'deg', 12);    // Fuel + throttle bars.
    bar(630, 690, 140, 14, state.fuel / 100, '#ffb020', 'FUEL');
    bar(630, 722, 140, 14, state.throttle, '#37b6ff', 'THROTTLE');
    bar(630, 754, 140, 14, state.ringsHit / Math.max(1, state.ringsTotal), '#7dff8a', `RING ${state.ringsHit}/${state.ringsTotal}`);
    // Mission card on the right (below the compass tape, which ends at y 690).
    ctx.fillStyle = '#e8eef2';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(state.mission.name, 870, 706);
    ctx.fillStyle = '#9fb0bc';
    ctx.font = '13px sans-serif';
    ctx.fillText(state.mission.subtitle, 870, 728);
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`SKOR ${state.score}`, 870, 766);
    ctx.fillStyle = '#9fb0bc';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Waktu ${formatTime(state.time)}`, W - 24, 766);
    compassTape(state);
  }

  function bar(x, y, w, h, frac, colour, label) {
    ctx.fillStyle = '#0b0f16';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = colour;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
    ctx.strokeStyle = '#5a6b7d';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#e8eef2';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x + w + 10, y + h - 2);
  }

  function formatTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function drawHud(state) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,16,24,0.78)';
    ctx.fillRect(0, 0, W, 64);
    ctx.strokeStyle = '#3a4a5a';
    ctx.beginPath();
    ctx.moveTo(0, 64);
    ctx.lineTo(W, 64);
    ctx.stroke();
    const hdg = Math.round(((state.heading % 360) + 360) % 360);
    hudCell(24, 'ALTITUDE', `${Math.round(state.alt * 10)} ft`, '#7ec8f2');
    hudCell(224, 'SPEED', `${Math.round(state.speed)} kt`, '#ffd23e');
    hudCell(424, 'HEADING', `${String(hdg).padStart(3, '0')}°`, '#7dff8a');
    hudCell(624, 'RING', `${state.ringsHit}/${state.ringsTotal}`, '#ffb020');
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8eef2';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`SKOR ${state.score}`, W - 24, 30);
    ctx.fillStyle = '#9fb0bc';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Waktu ${formatTime(state.time)}   •   Fuel ${Math.round(state.fuel)}%`, W - 24, 52);
    if (state.message && state.messageT > 0) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = 'rgba(10,16,24,0.7)';
      const tw = ctx.measureText(state.message).width;
      ctx.fillRect(W / 2 - tw / 2 - 16, 84, tw + 32, 40);
      ctx.fillStyle = '#ffd23e';
      ctx.fillText(state.message, W / 2, 112);
    }
    ctx.restore();
  }

  function hudCell(x, label, value, colour) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9fb0bc';
    ctx.font = '11px sans-serif';
    ctx.fillText(label, x, 22);
    ctx.fillStyle = colour;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(value, x, 52);
  }

  function drawWorld(state) {
    drawSky(state);
    drawClouds(ctx, proj, state);
    drawMountains(ctx, proj, state.mission, state);
    drawGround(ctx, proj, state.mission, state);
    drawScenery(ctx, proj, state);
    drawRunway(ctx, proj, state);
    drawRings(ctx, proj, state);
    drawPlane(state);
  }

  function drawTitle(state) {
    drawSky(state);
    drawMountains(ctx, proj, state.mission, state);
    drawGround(ctx, proj, state.mission, state);
    drawScenery(ctx, proj, state);
    drawRings(ctx, proj, state);
    // Dusk veil so the title reads over the scene.
    const veil = ctx.createLinearGradient(0, 0, 0, H);
    veil.addColorStop(0, 'rgba(8,14,26,0.55)');
    veil.addColorStop(0.55, 'rgba(8,14,26,0.25)');
    veil.addColorStop(1, 'rgba(8,14,26,0.72)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('✈  KURIR UDARA KEPULAUAN INDONESIA  ✈', W / 2, 118);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 84px sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 18;
    ctx.fillText('GARUDA SKY', W / 2, 210);
    ctx.fillText('COURIER', W / 2, 296);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#cfe3f2';
    ctx.font = '20px sans-serif';
    ctx.fillText('Terbang melewati ring di atas gunung, sawah, dan pantai —', W / 2, 340);
    ctx.fillText('lalu mendarat mulus di runway. Satu misi, satu pesawat, satu langit.', W / 2, 368);
    // Mission cards.
    MISSIONS.forEach((m, i) => {
      const x = 190 + i * 310;
      const y = 420;
      const selected = i === state.missionIndex;
      ctx.fillStyle = selected ? 'rgba(255,210,62,0.92)' : 'rgba(10,16,24,0.82)';
      ctx.fillRect(x, y, 280, 130);
      ctx.strokeStyle = selected ? '#ffd23e' : '#5a6b7d';
      ctx.lineWidth = selected ? 4 : 2;
      ctx.strokeRect(x, y, 280, 130);
      ctx.fillStyle = selected ? '#1a2230' : '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`${i + 1}. ${m.name}`, x + 140, y + 38);
      ctx.fillStyle = selected ? '#3a4a5a' : '#cfe3f2';
      ctx.font = '14px sans-serif';
      ctx.fillText(m.subtitle, x + 140, y + 66);
      ctx.fillStyle = selected ? '#8a5a00' : '#ffd23e';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`${m.rings.length} ring  •  runway  •  bahan bakar`, x + 140, y + 98);
    });
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Tekan 1 / 2 / 3 atau klik misi — lalu ENTER untuk terbang', W / 2, 668);
    ctx.fillStyle = '#cfe3f2';
    ctx.font = '15px sans-serif';
    ctx.fillText('← → belok   •   ↑ ↓ naik / turun   •   Shift gas   •   Ctrl rem udara   •   Mouse juga bisa   •   P jeda   •   M suara', W / 2, 700);
    if (state.best > 0) {
      ctx.fillStyle = '#ffd23e';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`Skor terbaik: ${state.best}`, W / 2, 732);
    }
    drawPlane(state, 600);
  }

  function drawPaused(state) {
    drawWorld(state);
    drawInstruments(state);
    drawHud(state);
    ctx.fillStyle = 'rgba(8,14,26,0.66)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('JEDA', W / 2, 360);
    ctx.fillStyle = '#cfe3f2';
    ctx.font = '20px sans-serif';
    ctx.fillText('Tekan P atau Enter untuk lanjut terbang  •  R untuk mulai dari awal', W / 2, 406);
  }

  function drawEnd(state, landed) {
    drawWorld(state);
    drawInstruments(state);
    drawHud(state);
    ctx.fillStyle = landed ? 'rgba(10,40,20,0.72)' : 'rgba(40,10,10,0.72)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = landed ? '#7dff8a' : '#ff8a7a';
    ctx.font = 'bold 58px sans-serif';
    ctx.fillText(landed ? 'MISI SELESAI!' : 'MISI GAGAL', W / 2, 240);
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px sans-serif';
    ctx.fillText(state.message || '', W / 2, 284);
    const rows = [
      ['Ring dilewati', `${state.ringsHit}/${state.ringsTotal}  (+${state.ringsHit * 100})`],
      ['Waktu terbang', formatTime(state.time)],
      ['Bahan bakar tersisa', `${Math.round(state.fuel)}%`],
      ['Misi', state.mission.name],
      ['SKOR AKHIR', String(state.score)],
    ];
    rows.forEach(([label, value], i) => {
      const y = 350 + i * 44;
      ctx.fillStyle = i === rows.length - 1 ? '#ffd23e' : '#cfe3f2';
      ctx.font = i === rows.length - 1 ? 'bold 30px sans-serif' : '20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, 420, y);
      ctx.textAlign = 'right';
      ctx.fillText(value, 860, y);
    });
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ENTER — terbang lagi   •   1/2/3 — ganti misi   •   R — menu utama', W / 2, 620);
  }

  function draw(state, screen, best) {
    ctx.clearRect(0, 0, W, H);
    if (screen === SCREEN_TITLE) drawTitle(state);
    else if (screen === SCREEN_PAUSED) drawPaused(state);
    else if (screen === SCREEN_LANDED) drawEnd(state, true);
    else if (screen === SCREEN_CRASHED) drawEnd(state, false);
    else {
      drawWorld(state);
      drawInstruments(state);
      drawHud(state);
    }
    if (best > 0 && screen === SCREEN_PLAY) {
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '12px sans-serif';
      ctx.fillText(`Terbaik: ${best}`, 24, 632);
    }
  }

  return { draw, fit };
}
