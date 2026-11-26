// Pseudo-3D chase-view projection: world points (x, y, z) onto the canvas, plus the
// ground bands, mountains, clouds, roadside scenery, rings and runway that make the
// terrain recognisable. The camera sits just behind and above the plane.
import { VIEW, TERRAIN_COLOURS, RING_COLOURS, RUNWAY } from './config.js';

export function createProjector() {
  const { width, height, horizon, focal, groundHalf } = VIEW;
  const cx = width / 2;
  return {
    cx,
    project(x, y, z, camX, camY, camZ) {
      const dz = z - camZ;
      if (dz < 4) return null;
      const scale = focal / dz;
      return {
        x: cx + (x - camX) * scale,
        y: horizon + (camY - y) * scale,
        scale,
        dz,
      };
    },
    groundY(z, camY, camZ) {
      const dz = z - camZ;
      if (dz < 4) return null;
      return horizon + (camY * focal) / dz;
    },
  };
}

/** Terrain kind active at route distance z. */
export function terrainAt(mission, z) {
  for (const seg of mission.segments) {
    if (z >= seg.from && z < seg.to) return seg.kind;
  }
  return mission.segments[mission.segments.length - 1].kind;
}

/** Paint the ground plane as perspective bands, far to near, with a river strip. */
export function drawGround(ctx, proj, mission, state) {
  const camX = state.x;
  const camY = state.alt + 7;
  const camZ = state.z;
  const far = camZ + 2600;
  // Depth slices grow with distance so near bands stay chunky and far ones dense.
  const slices = [];
  let z = camZ + 12;
  let step = 14;
  while (z < far) {
    slices.push(z);
    z += step;
    step *= 1.14;
  }
  slices.push(far);
  for (let i = slices.length - 1; i > 0; i -= 1) {
    const zNear = slices[i - 1];
    const zFar = slices[i];
    const yNear = proj.groundY(zNear, camY, camZ);
    const yFar = proj.groundY(zFar, camY, camZ);
    if (yNear === null || yFar === null) continue;
    if (yNear - yFar < 0.4 && i < slices.length - 2) continue;
    const kind = terrainAt(mission, (zNear + zFar) / 2);
    const [c1, c2] = TERRAIN_COLOURS[kind];
    const band = Math.floor((zNear + zFar) / 2 / 120) % 2 === 0;
    // The ground widens with distance so its edges always stay off-screen.
    const halfNear = 60 + 1.3 * (zNear - camZ);
    const halfFar = 60 + 1.3 * (zFar - camZ);
    const pL1 = proj.project(-halfNear, 0, zNear, camX, camY, camZ);
    const pR1 = proj.project(halfNear, 0, zNear, camX, camY, camZ);
    const pL2 = proj.project(-halfFar, 0, zFar, camX, camY, camZ);
    const pR2 = proj.project(halfFar, 0, zFar, camX, camY, camZ);
    if (!pL1 || !pR1 || !pL2 || !pR2) continue;
    ctx.fillStyle = band ? c1 : c2;
    ctx.beginPath();
    ctx.moveTo(pL1.x, pL1.y);
    ctx.lineTo(pR1.x, pR1.y);
    ctx.lineTo(pR2.x, pR2.y);
    ctx.lineTo(pL2.x, pL2.y);
    ctx.closePath();
    ctx.fill();
    // Terraced fields get a wavy contour line across the band.
    if (kind === 'terraces') {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const midY = (pL1.y + pL2.y) / 2;
      const amp = Math.max(1, (pL1.y - pL2.y) * 0.3);
      for (let k = 0; k <= 8; k += 1) {
        const fx = k / 8;
        const x = pL1.x + (pR1.x - pL1.x) * fx;
        const y = midY + Math.sin(fx * 9 + zNear * 0.05) * amp;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // A river winds through lake and jungle stretches.
    if (kind === 'lake' || kind === 'jungle') {
      const rx = Math.sin(((zNear + zFar) / 2) / 500) * 55 - 20;
      const qL1 = proj.project(rx - 9, 0, zNear, camX, camY, camZ);
      const qR1 = proj.project(rx + 9, 0, zNear, camX, camY, camZ);
      const qL2 = proj.project(rx - 9, 0, zFar, camX, camY, camZ);
      const qR2 = proj.project(rx + 9, 0, zFar, camX, camY, camZ);
      if (qL1 && qR1 && qL2 && qR2) {
        ctx.fillStyle = '#4aa8dd';
        ctx.beginPath();
        ctx.moveTo(qL1.x, qL1.y);
        ctx.lineTo(qR1.x, qR1.y);
        ctx.lineTo(qR2.x, qR2.y);
        ctx.lineTo(qL2.x, qL2.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

/** Distant mountain / volcano silhouettes with parallax against the horizon. */
export function drawMountains(ctx, proj, mission, state) {
  const camX = state.x;
  const camY = state.alt + 7;
  const camZ = state.z;
  const peaks = [
    { ...mission.volcano, volcano: true },
    { ...mission.mountain, volcano: false },
    { x: mission.volcano.x + 190, z: mission.volcano.z + 700, height: mission.volcano.height * 0.6, width: 260, volcano: false },
  ];
  for (const peak of peaks) {
    const base = proj.project(peak.x, 0, peak.z, camX, camY, camZ);
    const top = proj.project(peak.x, peak.height, peak.z, camX, camY, camZ);
    const left = proj.project(peak.x - peak.width / 2, 0, peak.z, camX, camY, camZ);
    const right = proj.project(peak.x + peak.width / 2, 0, peak.z, camX, camY, camZ);
    if (!base || !top || !left || !right) continue;
    if (top.y > VIEW.horizon + 4) continue;
    const grad = ctx.createLinearGradient(0, top.y, 0, base.y);
    if (peak.volcano) {
      grad.addColorStop(0, '#5b4a63');
      grad.addColorStop(0.55, '#6e5a52');
      grad.addColorStop(1, '#4a3f3a');
    } else {
      grad.addColorStop(0, '#4f6b8a');
      grad.addColorStop(1, '#3a4f63');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(top.x - 8 * top.scale, top.y + 6 * top.scale);
    ctx.lineTo(top.x + 8 * top.scale, top.y + 6 * top.scale);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.fill();
    // Snow / crater cap and a lazy smoke plume on the volcano.
    if (peak.volcano) {
      ctx.fillStyle = '#e8e4da';
      ctx.beginPath();
      ctx.moveTo(top.x - 8 * top.scale, top.y + 6 * top.scale);
      ctx.lineTo(top.x, top.y - 2 * top.scale);
      ctx.lineTo(top.x + 8 * top.scale, top.y + 6 * top.scale);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(235,230,225,0.55)';
      for (let i = 0; i < 3; i += 1) {
        const s = (10 + i * 7) * top.scale;
        ctx.beginPath();
        ctx.ellipse(top.x + i * 14 * top.scale - 8 * top.scale, top.y - (14 + i * 16) * top.scale, s, s * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(240,244,248,0.85)';
      ctx.beginPath();
      ctx.moveTo(top.x - 10 * top.scale, top.y + 8 * top.scale);
      ctx.lineTo(top.x, top.y - 2 * top.scale);
      ctx.lineTo(top.x + 10 * top.scale, top.y + 8 * top.scale);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** Clouds drift with the route; drawn before the plane so they sit in the sky. */
export function drawClouds(ctx, proj, state) {
  const camX = state.x * 0.35;
  const camY = state.alt + 7;
  const camZ = state.z;
  for (const cloud of state.scenery.clouds) {
    const p = proj.project(cloud.x, cloud.y, cloud.z, camX, camY, camZ);
    if (!p || p.y > VIEW.horizon) continue;
    // A cloud right beside the camera would fill the sky: skip near ones.
    if (p.scale > 0.9) continue;
    const s = cloud.s * p.scale * 22;
    if (s < 2) continue;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s, s * 0.42, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x - s * 0.7, p.y + s * 0.08, s * 0.62, s * 0.34, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + s * 0.7, p.y + s * 0.08, s * 0.62, s * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Trees, houses and temple gates beside the route, far to near. */
export function drawScenery(ctx, proj, state) {
  const camX = state.x;
  const camY = state.alt + 7;
  const camZ = state.z;
  const items = state.scenery.items.filter((it) => it.z > camZ + 8 && it.z < camZ + 1400);
  items.sort((a, b) => b.z - a.z);
  for (const item of items) {
    const p = proj.project(item.x, 0, item.z, camX, camY, camZ);
    if (!p) continue;
    const h = item.h * item.s * p.scale;
    if (h < 1.5) continue;
    if (item.kind === 'tree') {
      ctx.fillStyle = '#6b4a2f';
      ctx.fillRect(p.x - h * 0.06, p.y - h * 0.3, h * 0.12, h * 0.3);
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - h);
      ctx.lineTo(p.x - h * 0.42, p.y - h * 0.28);
      ctx.lineTo(p.x + h * 0.42, p.y - h * 0.28);
      ctx.closePath();
      ctx.fill();
    } else if (item.kind === 'house') {
      ctx.fillStyle = '#f2e6c9';
      ctx.fillRect(p.x - h * 0.4, p.y - h * 0.55, h * 0.8, h * 0.55);
      ctx.fillStyle = '#b3402e';
      ctx.beginPath();
      ctx.moveTo(p.x - h * 0.48, p.y - h * 0.55);
      ctx.lineTo(p.x, p.y - h);
      ctx.lineTo(p.x + h * 0.48, p.y - h * 0.55);
      ctx.closePath();
      ctx.fill();
    } else if (item.kind === 'temple') {
      ctx.fillStyle = '#8a7a5c';
      ctx.fillRect(p.x - h * 0.42, p.y - h * 0.8, h * 0.14, h * 0.8);
      ctx.fillRect(p.x + h * 0.28, p.y - h * 0.8, h * 0.14, h * 0.8);
      ctx.fillStyle = '#5d4a2a';
      ctx.beginPath();
      ctx.moveTo(p.x - h * 0.55, p.y - h * 0.8);
      ctx.lineTo(p.x, p.y - h * 1.15);
      ctx.lineTo(p.x + h * 0.55, p.y - h * 0.8);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** Target rings: glowing hoops the pilot flies through, far to near. */
export function drawRings(ctx, proj, state) {
  const camX = state.x;
  const camY = state.alt + 7;
  const camZ = state.z;
  const rings = state.mission.rings
    .map((ring, i) => ({ ring, status: state.ringStates[i], i }))
    .filter(({ ring }) => ring.z > camZ + 6 && ring.z < camZ + 2400)
    .sort((a, b) => b.ring.z - a.ring.z);
  for (const { ring, status } of rings) {
    const p = proj.project(ring.x, ring.y, ring.z, camX, camY, camZ);
    if (!p) continue;
    const r = 15 * p.scale;
    if (r < 2) continue;
    const colour = status === 'hit' ? '#7dff8a' : status === 'missed' ? '#8a8f96' : RING_COLOURS[0];
    ctx.save();
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.strokeStyle = colour;
    ctx.shadowColor = colour;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r * 1.05, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 0.86, r * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Chevron pointing through the ring.
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + r * 0.45);
    ctx.lineTo(p.x - r * 0.22, p.y + r * 0.12);
    ctx.lineTo(p.x + r * 0.22, p.y + r * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** The runway: asphalt strip with centreline, threshold stripes and edge lights. */
export function drawRunway(ctx, proj, state) {
  const camX = state.x;
  const camY = state.alt + 7;
  const camZ = state.z;
  const rz = state.mission.runwayZ;
  if (rz > camZ + 2400 || rz + RUNWAY.length < camZ) return;
  const slices = [];
  let z = Math.max(rz, camZ + 10);
  while (z <= rz + RUNWAY.length) {
    slices.push(z);
    z += 12;
  }
  slices.push(rz + RUNWAY.length);
  for (let i = slices.length - 1; i > 0; i -= 1) {
    const zNear = slices[i - 1];
    const zFar = slices[i];
    const pL1 = proj.project(-RUNWAY.width / 2, 0, zNear, camX, camY, camZ);
    const pR1 = proj.project(RUNWAY.width / 2, 0, zNear, camX, camY, camZ);
    const pL2 = proj.project(-RUNWAY.width / 2, 0, zFar, camX, camY, camZ);
    const pR2 = proj.project(RUNWAY.width / 2, 0, zFar, camX, camY, camZ);
    if (!pL1 || !pR1 || !pL2 || !pR2) continue;
    ctx.fillStyle = '#3a3d42';
    ctx.beginPath();
    ctx.moveTo(pL1.x, pL1.y);
    ctx.lineTo(pR1.x, pR1.y);
    ctx.lineTo(pR2.x, pR2.y);
    ctx.lineTo(pL2.x, pL2.y);
    ctx.closePath();
    ctx.fill();
    // Centreline dash every other slice.
    if (Math.floor(zNear / 24) % 2 === 0) {
      const cL1 = proj.project(-0.7, 0.05, zNear, camX, camY, camZ);
      const cR1 = proj.project(0.7, 0.05, zNear, camX, camY, camZ);
      const cL2 = proj.project(-0.7, 0.05, zFar, camX, camY, camZ);
      const cR2 = proj.project(0.7, 0.05, zFar, camX, camY, camZ);
      if (cL1 && cR1 && cL2 && cR2) {
        ctx.fillStyle = '#f5f5f0';
        ctx.beginPath();
        ctx.moveTo(cL1.x, cL1.y);
        ctx.lineTo(cR1.x, cR1.y);
        ctx.lineTo(cR2.x, cR2.y);
        ctx.lineTo(cL2.x, cL2.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  // Threshold stripes at the runway start.
  const t = proj.project(0, 0, rz, camX, camY, camZ);
  if (t && t.scale > 0.02) {
    ctx.fillStyle = '#f5f5f0';
    for (let k = -2; k <= 2; k += 1) {
      const s1 = proj.project(k * 3 - 1.1, 0.05, rz, camX, camY, camZ);
      const s2 = proj.project(k * 3 + 1.1, 0.05, rz, camX, camY, camZ);
      const s3 = proj.project(k * 3 + 1.1, 0.05, rz + 14, camX, camY, camZ);
      const s4 = proj.project(k * 3 - 1.1, 0.05, rz + 14, camX, camY, camZ);
      if (!s1 || !s2 || !s3 || !s4) continue;
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.lineTo(s3.x, s3.y);
      ctx.lineTo(s4.x, s4.y);
      ctx.closePath();
      ctx.fill();
    }
  }
  // A small terminal building and windsock beside the runway.
  const b = proj.project(26, 0, rz + 40, camX, camY, camZ);
  if (b && b.scale > 0.03) {
    const h = 16 * b.scale;
    ctx.fillStyle = '#dfe6ea';
    ctx.fillRect(b.x - h * 0.9, b.y - h * 0.7, h * 1.8, h * 0.7);
    ctx.fillStyle = '#2b6cb0';
    ctx.fillRect(b.x - h * 0.9, b.y - h * 0.7, h * 1.8, h * 0.18);
    ctx.fillStyle = '#e2574c';
    ctx.fillRect(b.x, b.y - h * 1.5, h * 0.06, h * 0.8);
    ctx.beginPath();
    ctx.moveTo(b.x + h * 0.06, b.y - h * 1.5);
    ctx.lineTo(b.x + h * 0.5, b.y - h * 1.38);
    ctx.lineTo(b.x + h * 0.06, b.y - h * 1.26);
    ctx.closePath();
    ctx.fill();
  }
}
