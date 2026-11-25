import { battery } from "../entities/battery.js";
import { shaheds, downShahed } from "../entities/shaheds.js";
import { checkGullShot } from "../entities/gulls.js";
import { ammo, roundState } from "./round.js";
import { player, saveProgress } from "./storage.js";
import { playAASound, playExplosionSound } from "./sound.js";

const SHELLS_PER_BURST = 6;
const shells = [];
const bursts = [];
const explosions = [];
const callouts = [];
let cooldown = 0;

function triggerVibro(ms) {
  if (player.vibro && navigator.vibrate) {
    navigator.vibrate(ms);
  }
}

function syncMenuStats() {
  const el = document.getElementById("stat-shaheds");
  if (el) el.textContent = String(player.shahedsDown || 0);
}

export function fireAA(w, h) {
  if (roundState.status !== "playing") return;
  if (battery.mode !== "aa") return;
  if (cooldown > 0 || ammo.aaShells <= 0) return;

  const count = Math.min(SHELLS_PER_BURST, ammo.aaShells);
  ammo.aaShells -= count;
  cooldown = 0.85;

  const gx = w * 0.59;
  const gy = h * 0.83 - Math.min(w, h) * 0.28 * 0.15;
  const targetX = battery.aimX * w;
  const targetY = battery.aimY * h;

  for (let i = 0; i < count; i++) {
    bursts.push({
      delay: i * 0.09,
      gx,
      gy,
      targetX: targetX + (Math.random() - 0.5) * 26,
      targetY: targetY + (Math.random() - 0.5) * 22,
    });
  }
}

function spawnShell(b, w, h) {
  playAASound();
  const dx = b.targetX - b.gx;
  const dy = b.targetY - b.gy;
  const dist = Math.hypot(dx, dy) || 1;
  // Снаряды зенитки медленнее — приходится брать упреждение по курсу шахеда
  const speed = Math.min(w, h) * 0.52;

  shells.push({
    x: b.gx,
    y: b.gy,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    trail: [],
    life: 3.6,
  });
}

export function updateAA(dt, w, h) {
  if (roundState.status !== "playing") return;
  if (cooldown > 0) cooldown -= dt;

  for (let i = bursts.length - 1; i >= 0; i--) {
    bursts[i].delay -= dt;
    if (bursts[i].delay <= 0) {
      spawnShell(bursts[i], w, h);
      bursts.splice(i, 1);
    }
  }

  for (let i = shells.length - 1; i >= 0; i--) {
    const sh = shells[i];
    sh.life -= dt;
    sh.trail.push({ x: sh.x, y: sh.y });
    if (sh.trail.length > 7) sh.trail.shift();

    sh.x += sh.vx * dt;
    sh.y += sh.vy * dt;

    let hitShahed = null;
    const hitRadius = Math.min(w, h) * 0.032;
    for (let j = 0; j < shaheds.length; j++) {
      const d = shaheds[j];
      if (d.falling) continue;
      const dx = d.x * w;
      const dy = d.y * h;
      if (Math.hypot(sh.x - dx, sh.y - dy) < hitRadius) {
        hitShahed = d;
        break;
      }
    }

    if (hitShahed) {
      const ex = hitShahed.x * w;
      const ey = hitShahed.y * h;
      downShahed(hitShahed);
      shells.splice(i, 1);
      playExplosionSound();

      explosions.push({
        x: ex,
        y: ey,
        r: 5,
        maxR: Math.min(w, h) * 0.08,
        alpha: 1,
      });
      callouts.push({
        text: "Збито падлюку!",
        x: ex,
        y: ey - 18,
        alpha: 1,
        vy: -26,
      });

      player.shahedsDown = (player.shahedsDown || 0) + 1;
      saveProgress();
      syncMenuStats();
      triggerVibro(110);
      continue;
    }

    if (checkGullShot(sh.x, sh.y, w, h)) {
      shells.splice(i, 1);
      continue;
    }

    if (
      sh.x < -30 ||
      sh.x > w + 30 ||
      sh.y < -30 ||
      sh.y > h + 30 ||
      sh.life <= 0
    ) {
      shells.splice(i, 1);
    }
  }

  for (let i = explosions.length - 1; i >= 0; i--) {
    const e = explosions[i];
    e.r += (e.maxR - e.r) * Math.min(1, dt * 12);
    e.alpha -= dt * 2.1;
    if (e.alpha <= 0) explosions.splice(i, 1);
  }

  for (let i = callouts.length - 1; i >= 0; i--) {
    const c = callouts[i];
    c.y += c.vy * dt;
    c.alpha -= dt * 0.65;
    if (c.alpha <= 0) callouts.splice(i, 1);
  }
}

export function drawAA(ctx, w, h) {
  shells.forEach((sh) => {
    sh.trail.forEach((pt, idx) => {
      const ratio = (idx + 1) / sh.trail.length;
      ctx.fillStyle = `rgba(253, 224, 71, ${ratio * 0.42})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 0.7 + ratio * 1.1, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(sh.x, sh.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  });

  explosions.forEach((e) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, e.alpha);
    const grad = ctx.createRadialGradient(e.x, e.y, 1, e.x, e.y, e.r);
    grad.addColorStop(0, "#fffbeb");
    grad.addColorStop(0.45, "#fb923c");
    grad.addColorStop(1, "rgba(127, 29, 29, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  callouts.forEach((c) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, c.alpha);
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeText(c.text, c.x, c.y);
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(c.text, c.x, c.y);
    ctx.restore();
  });
}
