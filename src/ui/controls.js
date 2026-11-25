import { battery, setMode } from "../entities/battery.js";
import { ammo, roundState } from "../systems/round.js";
import { player } from "../systems/storage.js";
import { setShahedBuzz } from "../systems/sound.js";

export const input = { dx: 0, dy: 0 };
export const gameState = { paused: false, scope: false, ready: false };

const fireHandlers = {
  torpedo: null,
  aa: null,
  rocket: null,
};

let nextRoundHandler = null;
let winModalShown = false;

export function bindFireHandlers({ torpedo, aa, rocket }) {
  fireHandlers.torpedo = torpedo || null;
  fireHandlers.aa = aa || null;
  fireHandlers.rocket = rocket || null;
}

export function bindNextRoundHandler(fn) {
  nextRoundHandler = fn || null;
}

export function showHud() {
  gameState.ready = true;
  document.body.classList.add("game-ready");
}

function triggerFire() {
  if (!gameState.ready || gameState.paused || roundState.status !== "playing") {
    return;
  }
  const fn = fireHandlers[battery.mode];
  if (fn) fn();
  updateAmmoHud();
}

export function toggleScope() {
  if (!gameState.ready) return;
  gameState.scope = !gameState.scope;
  const scopeBtn = document.getElementById("btn-scope");
  if (scopeBtn) {
    scopeBtn.classList.toggle("active", gameState.scope);
  }
}

function formatTimer(sec) {
  const s = Math.ceil(sec);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

function getModeLabel(mode) {
  if (mode === "aa") return "💥 ЗЕНІТКА";
  if (mode === "rocket") return "🎯 РАКЕТИ";
  return "🚀 ТОРПЕДИ";
}

function launchNextRound(modal) {
  modal.classList.remove("show");
  winModalShown = false;
  if (nextRoundHandler) {
    nextRoundHandler();
  } else {
    window.location.reload();
  }
  updateAmmoHud();
}

function renderWinStep(step) {
  const modal = document.getElementById("win-modal");
  const card = document.getElementById("win-card");
  if (!modal || !card) return;

  const nextRoundNum = player.currentRound || roundState.round + 1;

  modal.classList.add("show");
  card.classList.remove("alert-mode");

  if (step === 1) {
    card.innerHTML = `
      <div class="win-badge">🏆 ПЕРЕМОГА!</div>
      <h2>Молодець, ти захистив місто!</h2>
      <p>Новий наказ від командира: іти спати й набиратися сил.</p>
      <div class="win-actions">
        <button id="win-btn-ok1" class="win-btn primary">Ок</button>
      </div>
    `;
    document
      .getElementById("win-btn-ok1")
      .addEventListener("click", () => renderWinStep(2));
  } else if (step === 2) {
    card.innerHTML = `
      <div class="win-badge">📡 ШТАБ ОБОРОНИ</div>
      <h2>Далі будеш продовжувати?</h2>
      <p>Море поки тихе, але чергування можна не здавати.</p>
      <div class="win-actions">
        <button id="win-btn-yes" class="win-btn primary">Ок</button>
        <button id="win-btn-rest" class="win-btn secondary">Відпочити</button>
      </div>
    `;
    document
      .getElementById("win-btn-yes")
      .addEventListener("click", () => renderWinStep(3));
    document
      .getElementById("win-btn-rest")
      .addEventListener("click", () => renderWinStep(4));
  } else if (step === 3) {
    card.classList.add("alert-mode");
    card.innerHTML = `
      <div class="win-badge alert">🚨 ТРИВОГА!</div>
      <h2>Боєць! Відпочинок скасовується!</h2>
      <p>Новий напад на місто, треба захистити його — на бойовий пост, вперед!</p>
      <div class="win-actions">
        <button id="win-btn-go" class="win-btn danger">🔥 ВПЕРЕД! (Раунд ${nextRoundNum})</button>
      </div>
    `;
    document
      .getElementById("win-btn-go")
      .addEventListener("click", () => launchNextRound(modal));
  } else if (step === 4) {
    card.innerHTML = `
      <div class="win-badge">🌙 ВІДБІЙ</div>
      <h2>Заслужений відпочинок, боєць!</h2>
      <p>Прогрес збережено. Раунд ${nextRoundNum} уже чекає — повертайся, як наберешся сил.</p>
      <div class="win-actions">
        <button id="win-btn-back" class="win-btn primary">🔄 На пост (Раунд ${nextRoundNum})</button>
      </div>
    `;
    document
      .getElementById("win-btn-back")
      .addEventListener("click", () => launchNextRound(modal));
  }
}

export function updateAmmoHud() {
  const roundEl = document.getElementById("hud-round");
  if (roundEl) roundEl.textContent = String(roundState.round);

  const torpEl = document.getElementById("hud-torps");
  if (torpEl) torpEl.textContent = ammo.torpedoes;

  const shellsEl = document.getElementById("hud-shells");
  if (shellsEl) shellsEl.textContent = ammo.aaShells;

  const rocketsEl = document.getElementById("hud-rockets");
  if (rocketsEl) rocketsEl.textContent = ammo.rockets;

  const timeEl = document.getElementById("hud-timer");
  if (timeEl) timeEl.textContent = formatTimer(roundState.timeLeft);

  const missBadge = document.getElementById("hud-miss-badge");
  const missNum = document.getElementById("hud-miss-num");
  if (missBadge && missNum) {
    if (roundState.missed > 0) {
      missBadge.classList.add("show");
      missNum.textContent = String(roundState.missed);
    } else {
      missBadge.classList.remove("show");
    }
  }

  const failBox = document.getElementById("fail-modal");
  if (failBox) {
    failBox.classList.toggle("show", roundState.status === "lost");
  }

  if (roundState.status === "playing") {
    winModalShown = false;
  } else if (roundState.status === "won" && !winModalShown) {
    winModalShown = true;
    renderWinStep(1);
  }
}

export function initControls() {
  const hud = document.createElement("div");
  hud.className = "hud-layer";
  hud.innerHTML = `
    <style>
      body:not(.game-ready) .hud-layer,
      body:not(.game-ready) .burger-btn {
        opacity: 0;
        pointer-events: none;
      }
      .hud-layer {
        transition: opacity 0.35s ease;
      }
      .hud-timer-top {
        position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 15;
        background: rgba(15, 23, 32, 0.56); color: #f8fafc;
        border: 1px solid rgba(148, 163, 184, 0.28); border-radius: 10px;
        padding: 6px 14px; font-size: 15px; font-weight: bold;
        backdrop-filter: blur(3px); pointer-events: none; white-space: nowrap;
      }
      .hud-round-tag { color: #fbbf24; margin-right: 8px; }
      .hud-ammo-col {
        position: fixed; top: 56px; left: 16px; z-index: 15;
        display: flex; flex-direction: column; gap: 6px; pointer-events: none;
      }
      .hud-chip {
        background: rgba(15, 23, 32, 0.36); color: #f8fafc;
        border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 8px;
        padding: 6px 10px; font-size: 13px; font-weight: bold;
        backdrop-filter: blur(2px);
      }
      .hud-chip span { color: #38bdf8; }
      .hud-miss-badge {
        position: fixed; top: 68px; right: 16px; z-index: 15;
        display: none; align-items: center; justify-content: center;
        width: 38px; height: 38px; border-radius: 50%;
        background: rgba(220, 38, 38, 0.92); border: 2px solid #fca5a5;
        color: #fff; font-size: 16px; font-weight: bold;
        box-shadow: 0 0 12px rgba(239, 68, 68, 0.65);
        pointer-events: none;
      }
      .hud-miss-badge.show { display: flex; }
      .hud-pad {
        position: fixed; left: 20px; bottom: 20px; display: grid;
        grid-template-columns: repeat(3, 52px); gap: 6px; z-index: 20;
      }
      .hud-btn {
        height: 52px; background: rgba(15, 23, 32, 0.78); color: #e2e8f0;
        border: 1px solid rgba(148, 163, 184, 0.4); border-radius: 10px;
        font-size: 20px; cursor: pointer; user-select: none; touch-action: none;
      }
      .hud-btn:active { background: rgba(245, 158, 11, 0.5); }
      .hud-pause-center {
        position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%);
        display: flex; gap: 8px; z-index: 16;
      }
      .pause-icon-btn {
        width: 54px; height: 52px; font-size: 20px; font-weight: bold;
      }
      .hud-right {
        position: fixed; right: 20px; bottom: 20px;
        display: flex; align-items: flex-end; gap: 10px; z-index: 16;
      }
      .fire-stack {
        display: flex; flex-direction: column; align-items: stretch; gap: 10px;
      }
      .scope-icon-btn {
        height: 50px; font-size: 21px; font-weight: bold;
        background: rgba(15, 23, 32, 0.42);
        border: 1px solid rgba(148, 163, 184, 0.38);
        backdrop-filter: blur(4px);
      }
      .scope-icon-btn.active {
        background: rgba(16, 185, 129, 0.34);
        border-color: #34d399;
        box-shadow: 0 0 12px rgba(52, 211, 153, 0.55);
      }
      .mode-btn { padding: 14px 16px; font-size: 13px; font-weight: bold; }
      .fire-btn {
        padding: 14px 20px; font-size: 15px; font-weight: bold;
        background: rgba(185, 28, 28, 0.88); border-color: #f87171; color: #fff;
      }
      .fire-btn:active { background: #dc2626; }
      .fail-modal,
      .win-modal {
        position: fixed; inset: 0; z-index: 35; display: none;
        align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.78);
      }
      .fail-modal.show,
      .win-modal.show { display: flex; }
      .fail-card {
        max-width: 420px; width: 90%; background: #450a0a; border: 2px solid #ef4444;
        border-radius: 14px; padding: 24px; text-align: center; color: #fef2f2;
      }
      .fail-card h2 { margin: 0 0 12px; color: #fca5a5; font-size: 22px; }
      .fail-card p { margin: 0 0 18px; font-size: 16px; line-height: 1.4; }
      .fail-btn {
        padding: 12px 24px; border-radius: 8px; border: 1px solid #fca5a5;
        background: #991b1b; color: #fff; font-size: 15px; font-weight: bold; cursor: pointer;
      }
      .win-card {
        max-width: 440px; width: 90%;
        background: linear-gradient(160deg, #064e3b 0%, #0f172a 100%);
        border: 2px solid #34d399; border-radius: 16px;
        padding: 26px 24px; text-align: center; color: #ecfdf5;
        box-shadow: 0 0 32px rgba(16, 185, 129, 0.45);
      }
      .win-card.alert-mode {
        background: linear-gradient(160deg, #7c2d12 0%, #1e1b4b 100%);
        border-color: #fbbf24;
        box-shadow: 0 0 36px rgba(245, 158, 11, 0.55);
      }
      .win-badge {
        display: inline-block; padding: 5px 14px; margin-bottom: 12px;
        border-radius: 999px; background: rgba(52, 211, 153, 0.2);
        border: 1px solid #34d399; color: #6ee7b7;
        font-size: 13px; font-weight: bold; letter-spacing: 1px;
      }
      .win-badge.alert {
        background: rgba(245, 158, 11, 0.25);
        border-color: #fbbf24; color: #fde047;
      }
      .win-card h2 { margin: 0 0 12px; color: #fde047; font-size: 24px; }
      .win-card p { margin: 0 0 20px; font-size: 16px; line-height: 1.45; color: #f1f5f9; }
      .win-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
      .win-btn {
        padding: 12px 26px; border-radius: 10px; font-size: 15px;
        font-weight: bold; cursor: pointer; border: 1px solid transparent;
      }
      .win-btn.primary {
        background: #10b981; border-color: #6ee7b7; color: #022c22;
      }
      .win-btn.secondary {
        background: #1e293b; border-color: #64748b; color: #e2e8f0;
      }
      .win-btn.danger {
        background: #dc2626; border-color: #fca5a5; color: #fff;
      }
    </style>

    <div class="hud-timer-top">
      <span class="hud-round-tag">Раунд <span id="hud-round">${roundState.round}</span></span>
      ⏱ <span id="hud-timer">${formatTimer(roundState.timeLeft)}</span>
    </div>

    <div class="hud-ammo-col">
      <div class="hud-chip">🚀 Торпеди: <span id="hud-torps">${ammo.torpedoes}</span></div>
      <div class="hud-chip">💥 Снаряди: <span id="hud-shells">${ammo.aaShells}</span></div>
      <div class="hud-chip">🎯 Ракети: <span id="hud-rockets">${ammo.rockets}</span></div>
    </div>

    <div id="hud-miss-badge" class="hud-miss-badge"><span id="hud-miss-num">0</span></div>

    <div class="hud-pad">
      <div></div><button class="hud-btn" data-dir="up">▲</button><div></div>
      <button class="hud-btn" data-dir="left">◀</button>
      <button class="hud-btn" data-dir="down">▼</button>
      <button class="hud-btn" data-dir="right">▶</button>
    </div>

    <div class="hud-pause-center">
      <button id="btn-pause" class="hud-btn pause-icon-btn" title="Пауза">⏸</button>
    </div>

    <div class="hud-right">
      <button id="btn-mode" class="hud-btn mode-btn">${getModeLabel(battery.mode)}</button>
      <div class="fire-stack">
        <button id="btn-scope" class="hud-btn scope-icon-btn" title="Перископ / Приціл">🔭</button>
        <button id="btn-fire" class="hud-btn fire-btn">🔥 ВОГОНЬ</button>
      </div>
    </div>

    <div id="fail-modal" class="fail-modal">
      <div class="fail-card">
        <h2>ПРОВАЛ ОБОРОНИ</h2>
        <p>Боєць, ти все проґавив і не захистив місто!</p>
        <button id="btn-reload" class="fail-btn">🔄 СПРОБУВАТИ ЩЕ</button>
      </div>
    </div>

    <div id="win-modal" class="win-modal">
      <div id="win-card" class="win-card"></div>
    </div>
  `;
  document.body.appendChild(hud);

  const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  hud.querySelectorAll("[data-dir]").forEach((btn) => {
    const [dx, dy] = dirs[btn.dataset.dir];
    const start = (e) => {
      e.preventDefault();
      input.dx = dx;
      input.dy = dy;
    };
    const stop = () => {
      input.dx = 0;
      input.dy = 0;
    };
    btn.addEventListener("mousedown", start);
    btn.addEventListener("touchstart", start);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchend", stop);
  });

  const pauseBtn = document.getElementById("btn-pause");
  pauseBtn.addEventListener("click", () => {
    gameState.paused = !gameState.paused;
    pauseBtn.textContent = gameState.paused ? "▶" : "⏸";
    if (gameState.paused) setShahedBuzz(false);
  });

  document.getElementById("btn-scope").addEventListener("click", () => {
    toggleScope();
  });

  const modeBtn = document.getElementById("btn-mode");
  function switchMode(next) {
    setMode(next);
    modeBtn.textContent = getModeLabel(next);
  }

  modeBtn.addEventListener("click", () => {
    const order = ["torpedo", "aa", "rocket"];
    const idx = order.indexOf(battery.mode);
    switchMode(order[(idx + 1) % order.length]);
  });

  document.getElementById("btn-fire").addEventListener("click", triggerFire);

  document.getElementById("btn-reload").addEventListener("click", () => {
    window.location.reload();
  });

  window.addEventListener("mousedown", (e) => {
    if (!e.target || e.target.id !== "game") return;
    if (e.button === 0) triggerFire();
    if (e.button === 2) toggleScope();
  });

  window.addEventListener("contextmenu", (e) => {
    if (e.target && e.target.id === "game") e.preventDefault();
  });

  window.addEventListener("keydown", (e) => {
    if (e.target && e.target.tagName === "INPUT") return;

    if (e.code === "ArrowUp" || e.code === "KeyW") input.dy = -1;
    if (e.code === "ArrowDown" || e.code === "KeyS") input.dy = 1;
    if (e.code === "ArrowLeft" || e.code === "KeyA") input.dx = -1;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.dx = 1;

    if (e.code === "Space") {
      e.preventDefault();
      triggerFire();
    }
    if (e.code === "KeyZ" || e.code === "KeyE") toggleScope();
    if (e.code === "Digit1") switchMode("torpedo");
    if (e.code === "Digit2") switchMode("aa");
    if (e.code === "Digit3") switchMode("rocket");
  });

  window.addEventListener("keyup", (e) => {
    if (["ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(e.code)) input.dy = 0;
    if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(e.code))
      input.dx = 0;
  });
}
