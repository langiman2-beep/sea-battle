import { battery, getTorpedoAngle } from "../entities/battery.js";
import { ships, sinkShip } from "../entities/ships.js";
import { ammo, roundState } from "./round.js";
import { player, saveProgress } from "./storage.js";
import { playTorpedoSound, playExplosionSound } from "./sound.js";
import torpedoSrc from "../assets/torpedo.webp";

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

const torpedoSprite = loadSprite(torpedoSrc);

const torpedoes = [];
const explosions = [];
const callouts = [];
let cooldown = 0;

function triggerVibro(ms) {
  if (player.vibro && navigator.vibrate) {
    navigator.vibrate(ms);
  }
}

function syncMenuStats() {
  const el = document.getElementById("stat-ships");
  if (el) el.textContent = `${player.shipsSunk} / 15`;
}

export function fireTorpedo(w, h) {
  if (roundState.status !== "playing") return;
  if (battery.mode !== "torpedo") return;
  if (cooldown > 0 || ammo.torpedoes <= 0) return;

  ammo.torpedoes -= 1;
  cooldown = 0.85;
  playTorpedoSound();

  const startX = w * 0.41;
  const startY = h * 0.77;
  const tubeAngle = getTorpedoAngle(w, h);
  const dirX = Math.sin(tubeAngle);
  const dirY = -Math.cos(tubeAngle);
  // Ещё медленнее — теперь реально надо высчитывать курс и упреждение
  const speed = Math.min(w, h) * 0.062;

  torpedoes.push({
    x: startX,
    y: startY,
    vx: dirX * speed,
    vy: dirY * speed,
    trail: [],
    life: 24.0,
  });
}

export function updateTorpedoes(dt, w, h) {
  if (roundState.status !== "playing") return;
  if (cooldown > 0) cooldown -= dt;

  const horizonY = h * 0.464;

  for (let i = torpedoes.length - 1; i >= 0; i--) {
    const t = torpedoes[i];
    t.life -= dt;
    t.trail.push({ x: t.x, y: t.y });
    if (t.trail.length > 40) t.trail.shift();

    t.x += t.vx * dt;
    t.y += t.vy * dt;

    let hitShip = null;
    const baseW = Math.min(w, h) * 0.34;
    for (let j = 0; j < ships.length; j++) {
      const s = ships[j];
      if (s.sinking) continue;
      const sw = baseW * s.scale;
      const sh = sw * 0.42;
      const sx = s.x * w;
      // Центр зоны попадания — строго по борту у ватерлинии
      const sy = s.y * h - sh * 0.1;

      if (Math.abs(t.x - sx) < sw * 0.3 && Math.abs(t.y - sy) < sh * 0.28) {
        hitShip = s;
        break;
      }
    }

    if (hitShip) {
      const ex = hitShip.x * w;
      const ey = hitShip.y * h - 6;
      sinkShip(hitShip);
      torpedoes.splice(i, 1);
      playExplosionSound();

      explosions.push({
        x: ex,
        y: ey,
        r: 6,
        maxR: Math.min(w, h) * 0.09,
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
      triggerVibro(140);
      continue;
    }

    // Исчезает ровно на линии горизонта и не лезет в небо
    const outOfBounds =
      t.x < -40 || t.x > w + 40 || t.y <= horizonY || t.y > h + 40;
    if (outOfBounds || t.life <= 0) {
      torpedoes.splice(i, 1);
    }
  }

  for (let i = explosions.length - 1; i >= 0; i--) {
    const e = explosions[i];
    e.r += (e.maxR - e.r) * Math.min(1, dt * 12);
    e.alpha -= dt * 2.2;
    if (e.alpha <= 0) explosions.splice(i, 1);
  }

  for (let i = callouts.length - 1; i >= 0; i--) {
    const c = callouts[i];
    c.y += c.vy * dt;
    c.alpha -= dt * 0.55;
    if (c.alpha <= 0) callouts.splice(i, 1);
  }
}

export function drawTorpedoes(ctx, w, h) {
  const horizonY = Math.floor(h * 0.46);
  const seaSpan = Math.max(1, h * 0.77 - horizonY);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizonY, w, h - horizonY);
  ctx.clip();

  torpedoes.forEach((t) => {
    const rawDepth = Math.max(0, Math.min(1, (t.y - horizonY) / seaSpan));
    // Крупнее на всём пути: от 0.68 у горизонта до 1.12 у берега
    const depth = 0.68 + rawDepth * 0.44;
    const angle = Math.atan2(t.vy, t.vx);
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    t.trail.forEach((pt, idx) => {
      const ratio = (idx + 1) / t.trail.length;
      const jitter =
        Math.sin(idx * 2.3 + t.life * 14) * (1.2 + ratio * 3.0) * depth;
      ctx.fillStyle = `rgba(226, 232, 240, ${ratio * 0.38})`;
      ctx.beginPath();
      ctx.arc(
        pt.x + perpX * jitter,
        pt.y + perpY * jitter,
        (1.2 + ratio * 4.0) * depth,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });

    ctx.save();
    ctx.strokeStyle = "rgba(226, 232, 240, 0.44)";
    ctx.lineWidth = Math.max(1.2, 1.8 * depth);
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.moveTo(t.x + dirX * 14 * depth, t.y + dirY * 14 * depth);
      ctx.quadraticCurveTo(
        t.x - dirX * 8 * depth + perpX * side * 11 * depth,
        t.y - dirY * 8 * depth + perpY * side * 11 * depth,
        t.x - dirX * 26 * depth + perpX * side * 22 * depth,
        t.y - dirY * 26 * depth + perpY * side * 22 * depth,
      );
      ctx.stroke();
    });
    ctx.restore();

    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(angle);
    if (torpedoSprite.width) {
      const tw = 64 * depth;
      const th = tw * (torpedoSprite.height / torpedoSprite.width);
      ctx.drawImage(torpedoSprite, -tw / 2, -th / 2, tw, th);
    } else {
      ctx.fillStyle = "#18202c";
      ctx.fillRect(-20 * depth, -4 * depth, 40 * depth, 8 * depth);
    }
    ctx.restore();
  });

  ctx.restore();

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
