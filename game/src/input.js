// Keyboard + mouse input. Arrows / WASD fly the plane, Shift/Ctrl work the throttle,
// Space confirms, P pauses, M mutes, R restarts, 1/2/3 pick a mission on the title screen.
// The mouse steers too: pointer left/right of centre banks, up/down pitches.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ShiftLeft: 'throttleUp', ShiftRight: 'throttleUp',
  ControlLeft: 'throttleDown', ControlRight: 'throttleDown',
  Enter: ACTION_CONFIRM, Space: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE, Escape: ACTION_PAUSE,
  KeyR: ACTION_RESTART, KeyM: ACTION_MUTE,
  Digit1: 'mission1', Digit2: 'mission2', Digit3: 'mission3',
};

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const pointer = { x: 0.5, y: 0.5, active: false, down: false };

  function onKeyDown(event) {
    const action = KEYMAP[event.code];
    if (!action) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
    if (!event.repeat) pressed.add(action);
    held.add(action);
  }
  function onKeyUp(event) {
    const action = KEYMAP[event.code];
    if (action) held.delete(action);
  }
  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width;
    pointer.y = (event.clientY - rect.top) / rect.height;
    pointer.active = true;
  }
  function onPointerDown(event) {
    onPointerMove(event);
    pointer.down = true;
    pressed.add('click');
  }
  function onPointerUp() { pointer.down = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);

  return {
    held,
    pointer,
    consume(action) {
      if (pressed.has(action)) { pressed.delete(action); return true; }
      return false;
    },
    clearPressed() { pressed.clear(); },
    axis() {
      let steer = 0;
      let pitch = 0;
      if (held.has('left')) steer -= 1;
      if (held.has('right')) steer += 1;
      if (held.has('up')) pitch += 1;
      if (held.has('down')) pitch -= 1;
      // Mouse steering blends in only when no keys are held, so keys always win.
      if (steer === 0 && pointer.active && !pointer.down) {
        const dx = pointer.x - 0.5;
        if (Math.abs(dx) > 0.08) steer = Math.max(-1, Math.min(1, dx * 3));
      }
      if (pitch === 0 && pointer.active && !pointer.down) {
        const dy = pointer.y - 0.5;
        if (Math.abs(dy) > 0.12) pitch = Math.max(-1, Math.min(1, -dy * 2.5));
      }
      let throttle = 0;
      if (held.has('throttleUp')) throttle += 1;
      if (held.has('throttleDown')) throttle -= 1;
      return { steer, pitch, throttle };
    },
  };
}
