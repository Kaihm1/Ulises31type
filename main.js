import { Game } from "./game.js?v=2";
import { sound } from "./audio.js";
import { sprites } from "./sprites.js?v=2";

sprites.init();

const canvas = document.getElementById("game");
const btnStage1 = document.getElementById("btn-stage1");
const btnStage2 = document.getElementById("btn-stage2");
const btnMute = document.getElementById("btn-mute");
const btnPause = document.getElementById("btn-pause");
const btnRestart = document.getElementById("btn-restart");
const padBadge = document.getElementById("pad-status");
const musicFileInput = document.getElementById("music-file");
const musicLabel = musicFileInput?.closest(".music-upload");

// Si existe assets/music/theme.mp3 en la carpeta del juego, cargarlo automáticamente
fetch("assets/music/theme.mp3", { method: "HEAD" })
  .then((res) => {
    if (res.ok) {
      sound.loadCustomTrack("assets/music/theme.mp3", "theme.mp3");
      if (musicLabel) musicLabel.classList.add("loaded");
    }
  })
  .catch(() => {});

if (musicFileInput) {
  musicFileInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sound.loadCustomTrack(file, file.name);
    if (musicLabel) {
      musicLabel.classList.add("loaded");
      musicLabel.childNodes[0].textContent = "MP3: OK ";
    }
  });
}

const game = new Game(canvas);
const keys = new Set();

// Estado táctil para móvil y tablet
const touchState = {
  left: false,
  right: false,
  up: false,
  down: false,
  fire: false,
  autofire: false,
  stickPointerId: null,
};

const stickZone = document.getElementById("touch-stick-zone");
const stickKnob = document.getElementById("stick-knob");
const tbtnFire = document.getElementById("tbtn-fire");
const tbtnPod = document.getElementById("tbtn-pod");
const tbtnSplit = document.getElementById("tbtn-split");
const tbtnAuto = document.getElementById("tbtn-auto");

function updateStickFromPointer(e) {
  if (!stickZone || !stickKnob) return;
  const rect = stickZone.getBoundingClientRect();
  const cx = rect.left + rect.width * 0.5;
  const cy = rect.top + rect.height * 0.5;
  const maxR = 38;
  let dx = e.clientX - cx;
  let dy = e.clientY - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > maxR) {
    dx = (dx / dist) * maxR;
    dy = (dy / dist) * maxR;
  }
  stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;

  const dead = 10;
  touchState.left = dx < -dead;
  touchState.right = dx > dead;
  touchState.up = dy < -dead;
  touchState.down = dy > dead;
}

function resetStick() {
  touchState.stickPointerId = null;
  touchState.left = false;
  touchState.right = false;
  touchState.up = false;
  touchState.down = false;
  if (stickKnob) stickKnob.style.transform = "translate(0px, 0px)";
}

if (stickZone) {
  stickZone.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    touchState.stickPointerId = e.pointerId;
    stickZone.setPointerCapture(e.pointerId);
    updateStickFromPointer(e);
  });
  stickZone.addEventListener("pointermove", (e) => {
    if (e.pointerId === touchState.stickPointerId) {
      e.preventDefault();
      updateStickFromPointer(e);
    }
  });
  stickZone.addEventListener("pointerup", (e) => {
    if (e.pointerId === touchState.stickPointerId) resetStick();
  });
  stickZone.addEventListener("pointercancel", (e) => {
    if (e.pointerId === touchState.stickPointerId) resetStick();
  });
}

if (tbtnFire) {
  tbtnFire.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (game.state === "stageclear") {
      game.startNextStage();
      return;
    }
    if (game.state === "title" || game.state === "gameover" || game.state === "victory") {
      game.startNewGame(1);
      return;
    }
    touchState.fire = true;
    tbtnFire.classList.add("active");
  });
  const releaseFire = (e) => {
    e.preventDefault();
    touchState.fire = false;
    tbtnFire.classList.remove("active");
  };
  tbtnFire.addEventListener("pointerup", releaseFire);
  tbtnFire.addEventListener("pointercancel", releaseFire);
}

if (tbtnPod) {
  tbtnPod.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    game.onPodAction();
  });
}

if (tbtnSplit) {
  tbtnSplit.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    game.onSplitAction();
  });
}

if (tbtnAuto) {
  tbtnAuto.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    touchState.autofire = !touchState.autofire;
    tbtnAuto.classList.toggle("active", touchState.autofire);
  });
}

// Tocar directamente la pantalla para empezar / avanzar en móvil
canvas.addEventListener("pointerdown", () => {
  if (game.state === "stageclear") {
    game.startNextStage();
  } else if (game.state === "title" || game.state === "gameover" || game.state === "victory") {
    game.startNewGame(1);
  }
});

// Estado previo de botones del mando para detectar pulsaciones únicas (flancos)
const prevPadButtons = {
  pod: false,
  split: false,
  start: false,
  fire: false,
};

function getActiveGamepad() {
  if (!navigator.getGamepads) return null;
  const pads = navigator.getGamepads();
  for (const p of pads) {
    if (p && p.connected) return p;
  }
  return null;
}

function updateGamepadStatus(pad) {
  if (!padBadge) return;
  if (pad) {
    padBadge.textContent = "MANDO: ON";
    padBadge.classList.add("connected");
  } else {
    padBadge.textContent = "MANDO: OFF";
    padBadge.classList.remove("connected");
  }
}

window.addEventListener("gamepadconnected", (e) => {
  updateGamepadStatus(e.gamepad);
});

window.addEventListener("gamepaddisconnected", () => {
  updateGamepadStatus(getActiveGamepad());
});

function pollGamepadEvents(pad) {
  if (!pad) {
    prevPadButtons.pod = false;
    prevPadButtons.start = false;
    prevPadButtons.fire = false;
    return;
  }

  const b = pad.buttons;
  const isPressed = (idx) => Boolean(b[idx] && b[idx].pressed);

  const podDown = isPressed(1) || isPressed(5); // B/Círculo o RB/R1
  const splitDown = isPressed(3) || isPressed(4); // Y/Triángulo o LB/L1
  const startDown = isPressed(9); // Start/Options
  const fireDown = isPressed(0); // A/Cruz

  if (podDown && !prevPadButtons.pod) {
    game.onPodAction();
  }

  if (splitDown && !prevPadButtons.split) {
    game.onSplitAction();
  }

  if (startDown && !prevPadButtons.start) {
    if (game.state === "stageclear") {
      game.startNextStage();
    } else if (game.state === "title" || game.state === "gameover" || game.state === "victory") {
      game.startNewGame(1);
    } else {
      game.togglePause();
    }
  }

  if (fireDown && !prevPadButtons.fire) {
    if (game.state === "stageclear") {
      game.startNextStage();
    } else if (game.state === "title" || game.state === "gameover" || game.state === "victory") {
      game.startNewGame(1);
    }
  }

  prevPadButtons.pod = podDown;
  prevPadButtons.split = splitDown;
  prevPadButtons.start = startDown;
  prevPadButtons.fire = fireDown;
}

function buildInput(pad) {
  let left = keys.has("ArrowLeft") || keys.has("KeyA") || touchState.left;
  let right = keys.has("ArrowRight") || keys.has("KeyD") || touchState.right;
  let up = keys.has("ArrowUp") || keys.has("KeyW") || touchState.up;
  let down = keys.has("ArrowDown") || keys.has("KeyS") || touchState.down;
  let fire = keys.has("KeyZ") || keys.has("Space") || keys.has("KeyJ") || touchState.fire;
  let autofire = keys.has("KeyC") || touchState.autofire;

  if (pad) {
    const b = pad.buttons;
    const isPressed = (idx) => Boolean(b[idx] && b[idx].pressed);
    const deadzone = 0.25;
    const ax = pad.axes[0] ?? 0;
    const ay = pad.axes[1] ?? 0;

    if (ax < -deadzone || isPressed(14)) left = true;
    if (ax > deadzone || isPressed(15)) right = true;
    if (ay < -deadzone || isPressed(12)) up = true;
    if (ay > deadzone || isPressed(13)) down = true;

    if (isPressed(0)) fire = true; // A / Cruz
    if (isPressed(2) || isPressed(7)) autofire = true; // X / Cuadrado o RT
  }

  return { left, right, up, down, fire, autofire };
}

function toggleMute() {
  const next = !sound.muted;
  sound.setMuted(next);
  btnMute.textContent = next ? "AUDIO: OFF" : "AUDIO: ON";
  if (!next && game.state === "playing") {
    sound.startBgm();
  }
}

window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
    e.preventDefault();
  }

  if (e.repeat) return;
  keys.add(e.code);

  if (e.code === "Enter" || e.code === "Space") {
    if (game.state === "stageclear") {
      game.startNextStage();
      return;
    }
    if (game.state === "title" || game.state === "gameover" || game.state === "victory") {
      game.startNewGame(1);
      return;
    }
  }

  if (e.code === "Digit1") {
    game.startNewGame(1);
  } else if (e.code === "Digit2") {
    game.startNewGame(2);
  } else if (e.code === "KeyV" || e.code === "KeyE") {
    game.onSplitAction();
  } else if (e.code === "KeyX" || e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "KeyK") {
    game.onPodAction();
  } else if (e.code === "KeyP" || e.code === "Escape") {
    game.togglePause();
  } else if (e.code === "KeyM") {
    toggleMute();
  } else if (e.code === "KeyR") {
    game.startNewGame(game.level.stage);
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

window.addEventListener("blur", () => {
  keys.clear();
  sound.stopCharge();
});

btnStage1?.addEventListener("click", () => {
  game.startNewGame(1);
});

btnStage2?.addEventListener("click", () => {
  game.startNewGame(2);
});

btnMute.addEventListener("click", () => {
  toggleMute();
  canvas.focus?.();
});

btnPause.addEventListener("click", () => {
  game.togglePause();
});

btnRestart.addEventListener("click", () => {
  game.startNewGame(game.level.stage);
});

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  const pad = getActiveGamepad();
  updateGamepadStatus(pad);
  pollGamepadEvents(pad);

  game.update(dt, buildInput(pad));
  game.draw();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
