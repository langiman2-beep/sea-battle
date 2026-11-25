import { battery, getRocketLauncherPos } from "../entities/battery.js";
import { ships, sinkShip } from "../entities/ships.js";
import { downShahed } from "../entities/shaheds.js";
import { ammo, roundState } from "./round.js";
import { player, saveProgress } from "./storage.js";
import { playRocketSound, playExplosionSound } from "./sound.js";
import rocketSrc from "../assets/rocket.webp";

function loadSprite(src) {
  const ready = document.createElement("canvas");
  ready.width = 0;
  ready.height = 0;
  const img = new Image();
  img.onload = () => {
    ready.width = img.width;
    ready.height = img.height;
    const c = ready.getContext("2d");
    c.drawImage(img, 0, 0);
    const frame = c.getImageData(0, 0, ready.width, ready.height);
    const d = frame.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i],
        g = d[i + 1],
        b = d[i + 2];
      const x = (i / 4) % ready.width;
      const y = Math.floor(i / 4 / ready.width);
      const magenta = Math.min(r, b) - g;

      if (magenta > 18 || (x > ready.width * 0.88 && y > ready.height * 0.88)) {
        d[i + 3] = 0;
      } else if (magenta > 0) {
        d[i] = Math.min(r, g + 8);
        d[i + 2] = Math.min(b, g + 8);
      }
    }
    c.putImageData(frame, 0, 0);
  };
  img.src = src;
  return ready;
}

const rocketSprite = loadSprite(rocketSrc);

const rockets = [];
const explosions = [];
const callouts = [];
let cooldown = 0;
let airTargetsProvider = null;

export function bindAirTargets(fn) {
  airTargetsProvider = fn || null;
}

function triggerVibro(ms) {
  if (player.vibro && navigator.vibrate) {
    navigator.vibrate(ms);
  }
}

function syncMenuStats() {
  const el = document.getElementById("stat-ships");
  if (el) el.textContent = `${player.shipsSunk} / 15`;
}

export function fireRocket(w, h) {
  if (roundState.status !== "playing") return;
  if (battery.mode !== "rocket") return;
  if (cooldown > 0 || ammo.rockets <= 0) return;

  ammo.rockets -= 1;
  cooldown = 0.65;
  playRocketSound();

  const pos = getRocketLauncherPos(w, h);
  const startX = pos.x;
  const startY = pos.y - pos.size * 0.22;
  const targetX = battery.aimX * w;
  const targetY = battery.aimY * h;

  const isSeaTarget = targetY >= h * 0.46;
  const arcLift = isSeaTarget ? Math.min(w, h) * 0.22 : Math.min(w, h) * 0.04;

  const ctrlX = (startX + targetX) * 0.5 + (targetX - startX) * 0.1;
  const ctrlY = Math.min(startY, targetY) - arcLift;

  rockets.push({
    x: startX,
    y: startY,
    prevX: startX,
    prevY: startY,
    startX,
    startY,
    ctrlX,
    ctrlY,
    targetX,
    targetY,
    t: 0,
    duration: isSeaTarget ? 0.95 : 0.65,
    smoke: [],
  });
}

function quadPoint(p0, p1, p2, t) {
  const inv = 1 - t;
  return inv * inv * p0 + 2 * inv * t * p1 + t * t * p2;
}

export function updateRockets(dt, w, h) {
  if (roundState.status !== "playing") return;
  if (cooldown > 0) cooldown -= dt;

  const airTargets = airTargetsProvider ? airTargetsProvider() : [];

  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.prevX = r.x;
    r.prevY = r.y;

    r.t += dt / r.duration;
    const progress = Math.min(1, r.t);

    r.x = quadPoint(r.startX, r.ctrlX, r.targetX, progress);
    r.y = quadPoint(r.startY, r.ctrlY, r.targetY, progress);

    r.smoke.push({ x: r.x, y: r.y });
    if (r.smoke.length > 24) r.smoke.shift();

    let hitShip = null;
    const baseW = Math.min(w, h) * 0.34;
    for (let j = 0; j < ships.length; j++) {
      const s = ships[j];
      if (s.sinking) continue;
      const sw = baseW * s.scale;
      const sh = sw * 0.42;
      const sx = s.x * w;
      const sy = s.y * h - sh * 0.25;

      if (Math.abs(r.x - sx) < sw * 0.45 && Math.abs(r.y - sy) < sh * 0.55) {
        hitShip = s;
        break;
      }
    }

    if (hitShip) {
      const ex = hitShip.x * w;
      const ey = hitShip.y * h - 10;
      sinkShip(hitShip);
      rockets.splice(i, 1);
      playExplosionSound();

      explosions.push({
        x: ex,
        y: ey,
        r: 8,
        maxR: Math.min(w, h) * 0.11,
        alpha: 1,
      });
      callouts.push({
        text: "Мінус падлюка!",
        x: ex,
        y: ey - 28,
        alpha: 1,
        vy: -24,
      });

      player.shipsSunk += 1;
      if (player.shipsSunk >= 15 && player.level === 1) {
        player.level = 2;
        player.rank = "Канонір";
      }
      saveProgress();
      syncMenuStats();
      triggerVibro(160);
      continue;
    }

    let hitAir = null;
    for (let k = 0; k < airTargets.length; k++) {
      const a = airTargets[k];
      if (a.falling) continue;
      const ax = a.x * w;
      const ay = a.y * h;
      if (Math.hypot(r.x - ax, r.y - ay) < Math.min(w, h) * 0.065) {
        hitAir = a;
        break;
      }
    }

    if (hitAir) {
      const ex = hitAir.x * w;
      const ey = hitAir.y * h;
      downShahed(hitAir);
      rockets.splice(i, 1);
      playExplosionSound();

      explosions.push({
        x: ex,
        y: ey,
        r: 10,
        maxR: Math.min(w, h) * 0.15,
        alpha: 1,
      });
      callouts.push({
        text: "Збито падлюку!",
        x: ex,
        y: ey - 20,
        alpha: 1,
        vy: -28,
      });
      player.shahedsDown = (player.shahedsDown || 0) + 1;
      saveProgress();
      const shEl = document.getElementById("stat-shaheds");
      if (shEl) shEl.textContent = String(player.shahedsDown);
      triggerVibro(140);
      continue;
    }

    if (progress >= 1) {
      playExplosionSound();
      explosions.push({
        x: r.x,
        y: r.y,
        r: 6,
        maxR: Math.min(w, h) * 0.08,
        alpha: 0.85,
      });
      rockets.splice(i, 1);
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
    c.alpha -= dt * 0.55;
    if (c.alpha <= 0) callouts.splice(i, 1);
  }
}

export function drawRockets(ctx, w, h) {
  rockets.forEach((r) => {
    r.smoke.forEach((pt, idx) => {
      const ratio = (idx + 1) / r.smoke.length;
      ctx.fillStyle = `rgba(226, 232, 240, ${ratio * 0.34})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2 + ratio * 5, 0, Math.PI * 2);
      ctx.fill();
    });

    const angle = Math.atan2(r.y - r.prevY, r.x - r.prevX);
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(angle);
    if (rocketSprite.width) {
      const rw = 54;
      const rh = rw * (rocketSprite.height / rocketSprite.width);
      ctx.drawImage(rocketSprite, -rw / 2, -rh / 2, rw, rh);
    } else {
      ctx.fillStyle = "#334155";
      ctx.fillRect(-12, -3.5, 18, 7);
    }
    ctx.restore();
  });

  explosions.forEach((e) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, e.alpha);
    const grad = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, e.r);
    grad.addColorStop(0, "#fffbeb");
    grad.addColorStop(0.45, "#f97316");
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
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeText(c.text, c.x, c.y);
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(c.text, c.x, c.y);
    ctx.restore();
  });
}
