import shahedSrc from "../assets/shahed.webp";
import { registerMiss, roundState } from "../systems/round.js";
import { setShahedBuzz } from "../systems/sound.js";

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

const shahedSprite = loadSprite(shahedSrc);

export const shaheds = [];
const splashes = [];
let spawnTimer = 4.0;

export function getShaheds() {
  return shaheds;
}

export function downShahed(d) {
  if (!d || d.falling) return;
  d.falling = true;
  d.splashed = false;
  d.vx = d.speed * d.dir * 0.85;
  d.vy = 0.05;
  d.hitFlash = 1.0;
  d.smokeTimer = 0;
  d.smoke = [];
}

function spawnShahed() {
  const dir = Math.random() > 0.5 ? 1 : -1;
  const baseY = 0.14 + Math.random() * 0.18;

  shaheds.push({
    x: dir === 1 ? -0.08 : 1.08,
    y: baseY,
    baseY,
    speed: 0.022,
    dir,
    wobblePhase: Math.random() * Math.PI * 2,
    falling: false,
    splashed: false,
    vx: 0,
    vy: 0,
    hitFlash: 0,
    smokeTimer: 0,
    smoke: [],
  });
}

export function updateShaheds(dt) {
  if (roundState.status !== "playing") {
    setShahedBuzz(false);
    return;
  }

  const aliveCount = shaheds.filter((d) => !d.falling).length;
  setShahedBuzz(aliveCount > 0);

  spawnTimer -= dt;
  if (spawnTimer <= 0 && aliveCount < 1) {
    spawnShahed();
    spawnTimer = 9.0 + Math.random() * 4.0;
  }

  for (let i = shaheds.length - 1; i >= 0; i--) {
    const d = shaheds[i];

    if (d.falling) {
      if (d.hitFlash > 0) d.hitFlash = Math.max(0, d.hitFlash - dt * 3.5);

      if (!d.splashed) {
        d.vy += 0.24 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;

        d.smokeTimer -= dt;
        if (d.smokeTimer <= 0) {
          d.smokeTimer = 0.035;
          d.smoke.push({
            x: d.x,
            y: d.y,
            r: 3 + Math.random() * 4,
            alpha: 0.78,
            fire: Math.random() < 0.45,
          });
        }

        if (d.y >= 0.56) {
          d.splashed = true;
          splashes.push({
            x: d.x,
            y: 0.56,
            r: 4,
            maxR: 38,
            alpha: 0.9,
          });
        }
      }

      for (let k = d.smoke.length - 1; k >= 0; k--) {
        const p = d.smoke[k];
        p.y -= dt * 0.015;
        p.r += dt * 10;
        p.alpha -= dt * 0.95;
        if (p.alpha <= 0) d.smoke.splice(k, 1);
      }

      if (d.splashed && d.smoke.length === 0) {
        shaheds.splice(i, 1);
      }
      continue;
    }

    d.x += d.speed * d.dir * dt;
    d.wobblePhase += dt * 1.4;
    d.y = d.baseY + Math.sin(d.wobblePhase) * 0.008;

    if ((d.dir === 1 && d.x > 1.1) || (d.dir === -1 && d.x < -0.1)) {
      shaheds.splice(i, 1);
      registerMiss();
    }
  }

  for (let i = splashes.length - 1; i >= 0; i--) {
    const sp = splashes[i];
    sp.r += (sp.maxR - sp.r) * Math.min(1, dt * 7);
    sp.alpha -= dt * 1.1;
    if (sp.alpha <= 0) splashes.splice(i, 1);
  }
}

export function drawShaheds(ctx, w, h) {
  if (!shahedSprite.width) return;

  const sw = Math.round(Math.min(w, h) * 0.13);
  const sh = Math.round(sw * (shahedSprite.height / shahedSprite.width));

  shaheds.forEach((d) => {
    if (d.smoke && d.smoke.length) {
      d.smoke.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.fire ? "#f97316" : "#1e293b";
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    if (d.splashed) return;

    const sx = Math.round(d.x * w);
    const sy = Math.round(d.y * h);

    ctx.save();
    ctx.translate(sx, sy);
    if (d.dir === 1) ctx.scale(-1, 1);

    if (d.falling) {
      const diveAngle = Math.atan2(d.vy, Math.max(0.01, Math.abs(d.vx)));
      ctx.rotate(-diveAngle);
    }

    ctx.drawImage(shahedSprite, -sw / 2, -sh / 2, sw, sh);

    if (d.hitFlash > 0) {
      ctx.globalAlpha = d.hitFlash;
      const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, sw * 0.35);
      grad.addColorStop(0, "#fffbeb");
      grad.addColorStop(0.5, "#ef4444");
      grad.addColorStop(1, "rgba(239, 68, 68, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, sw * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  });

  splashes.forEach((sp) => {
    const x = sp.x * w;
    const y = sp.y * h;
    ctx.save();
    ctx.globalAlpha = Math.max(0, sp.alpha);
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(x - sp.r * 0.35, y);
    ctx.quadraticCurveTo(x, y - sp.r * 1.15, x + sp.r * 0.35, y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(226, 232, 240, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, sp.r * 0.9, sp.r * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}
