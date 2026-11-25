import { drawEnvironment, drawRain } from "./systems/environment.js";
import { battery, drawBattery, moveAim } from "./entities/battery.js";
import { ships, updateShips, drawShips } from "./entities/ships.js";
import {
  shaheds,
  updateShaheds,
  drawShaheds,
  getShaheds,
} from "./entities/shaheds.js";
import { updateGulls, drawGulls, drawGullCallouts } from "./entities/gulls.js";
import {
  fireTorpedo,
  updateTorpedoes,
  drawTorpedoes,
} from "./systems/torpedoes.js";
import {
  fireRocket,
  updateRockets,
  drawRockets,
  bindAirTargets,
} from "./systems/rockets.js";
import { fireAA, updateAA, drawAA } from "./systems/aa.js";
import { ammo, updateRoundTimer, startNextRound } from "./systems/round.js";
import {
  initControls,
  bindFireHandlers,
  bindNextRoundHandler,
  input,
  updateAmmoHud,
  gameState,
  showHud,
} from "./ui/controls.js";
import { initMenu } from "./ui/menu.js";
import { showIntro } from "./ui/intro.js";
import { startSurfSound } from "./systems/sound.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const splash = document.getElementById("splash");

function syncCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  const targetW = Math.max(1, Math.round(rect.width || window.innerWidth));
  const targetH = Math.max(1, Math.round(rect.height || window.innerHeight));
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
}

window.addEventListener("resize", syncCanvasSize);
window.addEventListener("orientationchange", syncCanvasSize);
syncCanvasSize();

initControls();
bindAirTargets(getShaheds);
bindFireHandlers({
  torpedo: () => fireTorpedo(canvas.width, canvas.height),
  aa: () => fireAA(canvas.width, canvas.height),
  rocket: () => fireRocket(canvas.width, canvas.height),
});
bindNextRoundHandler(() => {
  ships.length = 0;
  shaheds.length = 0;
  startNextRound();
  gameState.paused = false;
});
initMenu();
window.addEventListener("pointerdown", startSurfSound, { once: true });

const SCOPE_META = {
  torpedo: {
    title: "🚀 ТОРПЕДНИЙ АПАРАТ",
    color: "#38bdf8",
    getAmmo: () => ammo.torpedoes,
  },
  aa: {
    title: "💥 ЗЕНІТНА ГАРМАТА",
    color: "#f59e0b",
    getAmmo: () => ammo.aaShells,
  },
  rocket: {
    title: "🎯 РАКЕТНА УСТАНОВКА",
    color: "#ef4444",
    getAmmo: () => ammo.rockets,
  },
};

function drawWorld(w, h, timeSec, battleTime) {
  drawEnvironment(ctx, w, h, timeSec);
  drawShips(ctx, w, h, battleTime);
  drawShaheds(ctx, w, h);
  drawGulls(ctx, w, h, timeSec);
  drawTorpedoes(ctx, w, h);
  drawRockets(ctx, w, h);
  drawAA(ctx, w, h);
  drawRain(ctx, w, h, timeSec);
}

function drawPeriscopeOverlay(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.46;
  const meta = SCOPE_META[battery.mode] || SCOPE_META.torpedo;

  ctx.save();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = "rgba(12, 42, 34, 0.12)";
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  const lensVig = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
  lensVig.addColorStop(0, "rgba(0, 0, 0, 0)");
  lensVig.addColorStop(1, "rgba(0, 0, 0, 0.72)");
  ctx.fillStyle = lensVig;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  ctx.strokeStyle = "rgba(226, 232, 240, 0.78)";
  ctx.lineWidth = 1.4;
  const gap = Math.max(14, r * 0.09);
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx - gap, cy);
  ctx.moveTo(cx + gap, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy - gap);
  ctx.moveTo(cx, cy + gap);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();

  const step = r * 0.14;
  ctx.beginPath();
  for (let i = 1; i <= 4; i++) {
    const tick = i % 2 === 0 ? 9 : 5;
    ctx.moveTo(cx - step * i, cy - tick);
    ctx.lineTo(cx - step * i, cy + tick);
    ctx.moveTo(cx + step * i, cy - tick);
    ctx.lineTo(cx + step * i, cy + tick);
    ctx.moveTo(cx - tick, cy - step * i);
    ctx.lineTo(cx + tick, cy - step * i);
    ctx.moveTo(cx - tick, cy + step * i);
    ctx.lineTo(cx + tick, cy + step * i);
  }
  ctx.stroke();

  ctx.strokeStyle = meta.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, gap, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = meta.color;
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();

  const badgeFont = Math.max(11, Math.min(14, Math.round(r * 0.085)));
  const badgeText = `${meta.title}  •  БК: ${meta.getAmmo()}`;
  ctx.font = `bold ${badgeFont}px sans-serif`;
  const textW = ctx.measureText(badgeText).width;
  const padX = Math.max(10, Math.round(badgeFont * 0.9));
  const bw = Math.min(r * 1.65, textW + padX * 2);
  const bh = Math.round(badgeFont * 1.9);
  const bx = cx - bw / 2;
  const by = cy - r + Math.max(14, r * 0.14);

  ctx.fillStyle = "rgba(9, 14, 22, 0.84)";
  ctx.strokeStyle = meta.color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = meta.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, cx, by + bh / 2 + 1, bw - 10);

  const subFont = Math.max(10, Math.min(12, Math.round(r * 0.072)));
  ctx.font = `bold ${subFont}px monospace`;
  ctx.fillStyle = "rgba(226, 232, 240, 0.82)";
  ctx.fillText(
    gameState.paused ? "ПАУЗА  •  ПЕРИСКОП x2.6" : "ПЕРИСКОП  x2.6",
    cx,
    cy + r - Math.max(14, r * 0.11),
  );

  ctx.restore();

  ctx.fillStyle = "rgba(2, 6, 12, 0.95)";
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill("evenodd");

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

let last = 0;
let battleTime = 0;

function loop(ms) {
  syncCanvasSize();

  const dt = Math.min((ms - last) / 1000, 0.05);
  last = ms;
  const timeSec = ms / 1000;
  const w = canvas.width;
  const h = canvas.height;

  if (gameState.ready) {
    updateGulls(dt);
    const aimDt = gameState.scope ? dt * 0.42 : dt;
    moveAim(input.dx, input.dy, aimDt);

    if (!gameState.paused) {
      battleTime += dt;
      updateRoundTimer(dt);
      updateShips(dt);
      updateShaheds(dt);
      updateTorpedoes(dt, w, h);
      updateRockets(dt, w, h);
      updateAA(dt, w, h);
    }
  }

  updateAmmoHud();

  if (gameState.scope) {
    const zoom = 2.6;
    const ax = battery.aimX * w;
    const ay = battery.aimY * h;

    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-ax, -ay);
    drawWorld(w, h, timeSec, battleTime);
    ctx.restore();

    drawPeriscopeOverlay(w, h);
  } else {
    drawWorld(w, h, timeSec, battleTime);
    drawBattery(ctx, w, h);
  }

  drawGullCallouts(ctx, w, h, gameState.scope);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function finishSplash() {
  const openBriefing = () => {
    showIntro(() => {
      startSurfSound();
      showHud();
    });
  };

  if (splash) {
    splash.style.opacity = "0";
    setTimeout(() => {
      splash.remove();
      openBriefing();
    }, 500);
  } else {
    openBriefing();
  }
}

const startWhenReady = () => setTimeout(finishSplash, 1500);
if (document.readyState === "complete") {
  startWhenReady();
} else {
  window.addEventListener("load", startWhenReady, { once: true });
}
