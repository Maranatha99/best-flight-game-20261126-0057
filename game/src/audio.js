// Web Audio engine hum + wind, synthesised live — no audio files.
// Starts only after the first user gesture (browser autoplay rule); every call is
// guarded so a headless run without audio still plays the game.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let windGain = null;
  let windFilter = null;
  let started = false;

  function start() {
    if (started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 62;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'square';
      engineOsc2.frequency.value = 31;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      engineOsc.connect(lp);
      engineOsc2.connect(lp);
      lp.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      engineOsc2.start();

      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 700;
      windFilter.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0.0;
      noise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ctx.destination);
      noise.start();
      started = true;
    } catch {
      ctx = null;
    }
  }

  function update(throttle, speed, flying) {
    if (!ctx || !started) return;
    try {
      const t = ctx.currentTime;
      const target = flying ? 0.045 + throttle * 0.05 : 0.0;
      engineGain.gain.setTargetAtTime(target, t, 0.15);
      engineOsc.frequency.setTargetAtTime(58 + throttle * 70 + speed * 0.12, t, 0.1);
      engineOsc2.frequency.setTargetAtTime(29 + throttle * 35 + speed * 0.06, t, 0.1);
      windGain.gain.setTargetAtTime(flying ? 0.012 + speed * 0.00016 : 0.0, t, 0.2);
      windFilter.frequency.setTargetAtTime(500 + speed * 4, t, 0.2);
    } catch {
      // Audio is decoration; never let it break the game.
    }
  }

  function blip(freq, dur, type, vol) {
    if (!ctx || !started) return;
    try {
      const osc = ctx.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // Ignore.
    }
  }

  return {
    start,
    update,
    ring() { blip(880, 0.18, 'sine', 0.16); setTimeout(() => blip(1318, 0.25, 'sine', 0.14), 90); },
    land() { blip(523, 0.2, 'triangle', 0.16); setTimeout(() => blip(784, 0.3, 'triangle', 0.16), 140); },
    crash() { blip(110, 0.5, 'sawtooth', 0.18); },
  };
}
