import { battery, setMode, moveAim } from "../entities/battery.js";
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

async function toggleFullscreen() {
  const docEl = document.documentElement;
  const isFull = document.fullscreenElement || document.webkitFullscreenElement;

  try {
    if (!isFull) {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  } catch {
    // На iOS Safari системный fullscreen для div может быть ограничен — молча игнорируем
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
        position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 15;
        background: rgba(15, 23, 32, 0.56); color: #f8fafc;
        border: 1px solid rgba(148, 163, 184, 0.28); border-radius: 10px;
        padding: 6px 14px; font-size: 15px; font-weight: bold;
        backdrop-filter: blur(3px); pointer-events: none; white-space: nowrap;
      }
      .hud-round-tag { color: #fbbf24; margin-right: 8px; }
      .hud-ammo-col {
        position: fixed; top: 52px; left: 12px; z-index: 15;
        display: flex; flex-direction: column; gap: 5px; pointer-events: none;
      }
      .hud-chip {
        background: rgba(15, 23, 32, 0.42); color: #f8fafc;
        border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 8px;
        padding: 5px 9px; font-size: 13px; font-weight: bold;
        backdrop-filter: blur(2px); white-space: nowrap;
      }
      .hud-chip span { color: #38bdf8; }
      .hud-miss-badge {
        position: fixed; top: 68px; right: 14px; z-index: 15;
        display: none; align-items: center; justify-content: center;
        width: 36px; height: 36px; border-radius: 50%;
        background: rgba(220, 38, 38, 0.92); border: 2px solid #fca5a5;
        color: #fff; font-size: 15px; font-weight: bold;
        box-shadow: 0 0 12px rgba(239, 68, 68, 0.65);
        pointer-events: none;
      }
      .hud-miss-badge.show { display: flex; }
      .hud-pad {
        position: fixed; left: 16px; bottom: 16px; display: grid;
        grid-template-columns: repeat(3, 50px); gap: 5px; z-index: 20;
      }
      .hud-btn {
        height: 50px; background: rgba(15, 23, 32, 0.78); color: #e2e8f0;
        border: 1px solid rgba(148, 163, 184, 0.4); border-radius: 10px;
        font-size: 19px; cursor: pointer; user-select: none; touch-action: none;
      }
      .hud-btn:active { background: rgba(245, 158, 11, 0.5); }
      .hud-pause-center {
        position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%);
        display: flex; gap: 8px; z-index: 16;
      }
      .pause-icon-btn,
      .full-icon-btn {
        width: 50px; height: 50px; font-size: 19px; font-weight: bold;
      }
      .hud-right {
        position: fixed; right: 16px; bottom: 16px;
        display: flex; align-items: flex-end; gap: 8px; z-index: 16;
      }
      .fire-stack {
        display: flex; flex-direction: column; align-items: stretch; gap: 8px;
      }
      .scope-icon-btn {
        height: 48px; font-size: 20px; font-weight: bold;
        background: rgba(15, 23, 32, 0.45);
        border: 1px solid rgba(148, 163, 184, 0.38);
        backdrop-filter: blur(4px);
      }
      .scope-icon-btn.active {
        background: rgba(16, 185, 129, 0.34);
        border-color: #34d399;
        box-shadow: 0 0 12px rgba(52, 211, 153, 0.55);
      }
      .mode-btn { padding: 12px 14px; font-size: 13px; font-weight: bold; white-space: nowrap; }
      .fire-btn {
        padding: 12px 18px; font-size: 15px; font-weight: bold;
        background: rgba(185, 28, 28, 0.88); border-color: #f87171; color: #fff;
        white-space: nowrap;
      }
      .fire-btn:active { background: #dc2626; }

      /* Компактная адаптация для мобильных экранов */
      @media (max-width: 920px), (max-height: 520px) {
        .hud-timer-top {
          top: 8px;
          padding: 4px 10px;
          font-size: 13px;
        }
        .hud-ammo-col {
          top: 8px;
          left: 10px;
          flex-direction: row;
          gap: 4px;
        }
        .hud-chip {
          padding: 4px 7px;
          font-size: 11px;
        }
        .hud-chip .chip-lbl {
          display: none;
        }
        .hud-pad {
          left: 10px;
          bottom: 10px;
          grid-template-columns: repeat(3, 42px);
          gap: 4px;
        }
        .hud-btn {
          height: 42px;
          font-size: 16px;
          border-radius: 8px;
        }
        .hud-pause-center {
          bottom: 10px;
          gap: 6px;
        }
        .pause-icon-btn,
        .full-icon-btn {
          width: 42px;
          height: 42px;
          font-size: 16px;
        }
        .hud-right {
          right: 10px;
          bottom: 10px;
          gap: 6px;
        }
        .fire-stack {
          gap: 6px;
        }
        .scope-icon-btn {
          height: 40px;
          font-size: 18px;
        }
        .mode-btn {
          padding: 10px 10px;
          font-size: 12px;
        }
        .fire-btn {
          padding: 10px 12px;
          font-size: 13px;
        }
      }

      /* Подсказка повернуть телефон горизонтально */
      .rotate-overlay {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        text-align: center;
        background: rgba(7, 13, 23, 0.92);
        color: #f8fafc;
      }
      @media (orientation: portrait) and (max-width: 650px) {
        .rotate-overlay:not(.dismissed) {
          display: flex;
        }
        .hud-pause-center {
          bottom: 106px;
        }
      }
      .rotate-icon {
        font-size: 52px;
        margin-bottom: 12px;
      }
      .rotate-overlay h3 {
        margin: 0 0 8px;
        color: #fbbf24;
        font-size: 20px;
      }
      .rotate-overlay p {
        margin: 0 0 18px;
        color: #cbd5e1;
        font-size: 14px;
        max-width: 300px;
        line-height: 1.4;
      }
      .rotate-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
      }
      .rotate-btn {
        padding: 11px 18px;
        border-radius: 10px;
        border: 1px solid #34d399;
        background: #10b981;
        color: #022c22;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
      }
      .rotate-skip {
        padding: 11px 16px;
        border-radius: 10px;
        border: 1px solid #475569;
        background: #1e293b;
        color: #cbd5e1;
        font-size: 13px;
        cursor: pointer;
      }

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
      <div class="hud-chip">🚀 <span class="chip-lbl">Торпеди: </span><span id="hud-torps">${ammo.torpedoes}</span></div>
      <div class="hud-chip">💥 <span class="chip-lbl">Снаряди: </span><span id="hud-shells">${ammo.aaShells}</span></div>
      <div class="hud-chip">🎯 <span class="chip-lbl">Ракети: </span><span id="hud-rockets">${ammo.rockets}</span></div>
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
      <button id="btn-fullscreen" class="hud-btn full-icon-btn" title="На весь екран">⛶</button>
    </div>

    <div class="hud-right">
      <button id="btn-mode" class="hud-btn mode-btn">${getModeLabel(battery.mode)}</button>
      <div class="fire-stack">
        <button id="btn-scope" class="hud-btn scope-icon-btn" title="Перископ / Приціл">🔭</button>
        <button id="btn-fire" class="hud-btn fire-btn">🔥 ВОГОНЬ</button>
      </div>
    </div>

    <div id="rotate-overlay" class="rotate-overlay">
      <div class="rotate-icon">📱🔄</div>
      <h3>Поверни телефон горизонтально</h3>
      <p>Так видно всю берегову батарею, море й небо без тісняви.</p>
      <div class="rotate-actions">
        <button id="btn-rotate-full" class="rotate-btn">⛶ На весь екран</button>
        <button id="btn-rotate-skip" class="rotate-skip">Грати так</button>
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
    btn.addEventListener("pointerdown", start);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  });

  // Плавная наводка пальцем по экрану на телефоне (без случайных выстрелов)
  let touchAimId = null;
  let lastTouchX = 0;
  let lastTouchY = 0;

  window.addEventListener("pointerdown", (e) => {
    if (!e.target || e.target.id !== "game") return;
    if (e.pointerType === "mouse") {
      if (e.button === 0) triggerFire();
      if (e.button === 2) toggleScope();
    } else if (touchAimId === null) {
      touchAimId = e.pointerId;
      lastTouchX = e.clientX;
      lastTouchY = e.clientY;
    }
  });

  window.addEventListener("pointermove", (e) => {
    if (e.pointerId !== touchAimId || !gameState.ready) return;
    const sens = gameState.scope ? 0.55 : 1.15;
    const dxNorm = ((e.clientX - lastTouchX) / window.innerWidth) * sens;
    const dyNorm = ((e.clientY - lastTouchY) / window.innerHeight) * sens;
    lastTouchX = e.clientX;
    lastTouchY = e.clientY;

    battery.aimX += dxNorm;
    battery.aimY += dyNorm;
    moveAim(0, 0, 0);
  });

  const endTouchAim = (e) => {
    if (e.pointerId === touchAimId) touchAimId = null;
  };
  window.addEventListener("pointerup", endTouchAim);
  window.addEventListener("pointercancel", endTouchAim);

  const pauseBtn = document.getElementById("btn-pause");
  pauseBtn.addEventListener("click", () => {
    gameState.paused = !gameState.paused;
    pauseBtn.textContent = gameState.paused ? "▶" : "⏸";
    if (gameState.paused) setShahedBuzz(false);
  });

  document
    .getElementById("btn-fullscreen")
    .addEventListener("click", toggleFullscreen);

  const rotateOverlay = document.getElementById("rotate-overlay");
  document.getElementById("btn-rotate-full").addEventListener("click", () => {
    toggleFullscreen();
    rotateOverlay.classList.add("dismissed");
  });
  document.getElementById("btn-rotate-skip").addEventListener("click", () => {
    rotateOverlay.classList.add("dismissed");
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
