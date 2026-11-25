import shipSrc from "../assets/ship.webp";
import transportSrc from "../assets/transport.webp";
import { registerMiss, roundState } from "../systems/round.js";

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

const shipSprite = loadSprite(shipSrc);
const transportSprite = loadSprite(transportSrc);

const LANES = [
  { y: 0.482, scale: 0.52, speed: 0.008 }, // дальняя линия у самого горизонта
  { y: 0.535, scale: 1.0, speed: 0.011 }, // средняя линия
  { y: 0.595, scale: 1.45, speed: 0.014 }, // ближняя линия
];

export const ships = [];
let spawnTimer = 2.0;

function spawnShip() {
  const lane = LANES[Math.floor(Math.random() * LANES.length)];
  const dir = Math.random() > 0.5 ? 1 : -1;
  const isTransport = roundState.round >= 3 && Math.random() < 0.55;

  ships.push({
    type: isTransport ? "transport" : "warship",
    x: dir === 1 ? -0.11 : 1.11,
    y: lane.y,
    scale: isTransport ? lane.scale * 1.24 : lane.scale,
    speed: isTransport ? lane.speed * 0.86 : lane.speed,
    dir,
    phase: Math.random() * Math.PI * 2,
    sinking: false,
    sinkTime: 0,
    sinkProgress: 0,
    hitFlash: 0,
    smokeTimer: 0,
    smoke: [],
  });
}

export function sinkShip(ship) {
  if (!ship || ship.sinking) return;
  ship.sinking = true;
  ship.sinkTime = 0;
  ship.sinkProgress = 0;
  ship.hitFlash = 1.0;
  ship.smokeTimer = 0;
}

export function updateShips(dt) {
  if (roundState.status !== "playing") return;

  const aliveCount = ships.filter((s) => !s.sinking).length;
  spawnTimer -= dt;
  if (spawnTimer <= 0 && aliveCount < 1) {
    spawnShip();
    spawnTimer = 8.5 + Math.random() * 4.0;
  }

  for (let i = ships.length - 1; i >= 0; i--) {
    const s = ships[i];

    if (s.sinking) {
      s.sinkTime += dt;
      s.speed *= Math.max(0, 1 - dt * 1.4);
      s.x += s.speed * s.dir * dt;

      if (s.hitFlash > 0) {
        s.hitFlash = Math.max(0, s.hitFlash - dt * 2.1);
      }

      if (s.sinkTime >= 0.35 && s.sinkProgress < 0.82) {
        s.smokeTimer -= dt;
        if (s.smokeTimer <= 0) {
          s.smokeTimer = 0.11;
          s.smoke.push({
            ox: (Math.random() - 0.5) * 0.22,
            oy: -0.16 + s.sinkProgress * 0.22,
            vy: -16 - Math.random() * 14,
            vx: (Math.random() - 0.5) * 8 + 4,
            r: 3.5 + Math.random() * 4,
            alpha: 0.72,
            fire: Math.random() < 0.25 && s.sinkProgress < 0.35,
          });
        }
      }

      if (s.sinkTime >= 1.8) {
        s.sinkProgress = Math.min(1, s.sinkProgress + dt * 0.125);
      }

      for (let k = s.smoke.length - 1; k >= 0; k--) {
        const p = s.smoke[k];
        p.ox += (p.vx * dt) / 100;
        p.oy += (p.vy * dt) / 100;
        p.r += dt * 7;
        p.alpha -= dt * 0.45;
        if (p.alpha <= 0) s.smoke.splice(k, 1);
      }

      if (s.sinkProgress >= 1 && s.smoke.length === 0) {
        ships.splice(i, 1);
      }
      continue;
    }

    s.x += s.speed * s.dir * dt;
    if ((s.dir === 1 && s.x > 1.13) || (s.dir === -1 && s.x < -0.13)) {
      ships.splice(i, 1);
      registerMiss();
    }
  }
}

export function drawShips(ctx, w, h, time) {
  const sorted = [...ships].sort((a, b) => a.y - b.y);
  const baseW = Math.min(w, h) * 0.34;

  sorted.forEach((s) => {
    const sprite =
      s.type === "transport" && transportSprite.width
        ? transportSprite
        : shipSprite;
    if (!sprite.width) return;

    const sw = Math.round(baseW * s.scale);
    const sh = Math.round(sw * (sprite.height / sprite.width));
    const sx = Math.round(s.x * w);
    const bob =
      s.sinking && s.sinkTime >= 1.8
        ? Math.sin(time * 1.5 + s.phase) * (1 - s.sinkProgress)
        : Math.sin(time * 2.0 + s.phase) * (1.2 + s.scale * 0.7);
    const sy = Math.round(s.y * h + bob);

    ctx.save();
    ctx.translate(sx, sy);

    const shadowAlpha = s.sinking
      ? Math.max(0, 1 - s.sinkProgress) * 0.42
      : 0.42;
    if (shadowAlpha > 0.01) {
      ctx.fillStyle = `rgba(0, 15, 30, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(0, 2, sw * 0.44, sh * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!s.sinking) {
      ctx.save();
      ctx.scale(s.dir, 1);
      ctx.drawImage(sprite, -sw / 2, -sh * 0.68, sw, sh);
      ctx.restore();
    } else if (s.sinkProgress < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-sw, -sh * 2.2, sw * 2, sh * 2.2 + sh * 0.06);
      ctx.clip();

      const sinkOffset = s.sinkProgress * sh * 0.92;
      const tilt = s.sinkProgress * 0.14;

      ctx.translate(0, sinkOffset);
      ctx.scale(s.dir, 1);
      ctx.rotate(tilt);
      ctx.drawImage(sprite, -sw / 2, -sh * 0.68, sw, sh);
      ctx.restore();

      if (s.sinkProgress > 0.02) {
        const foamAlpha = Math.sin(s.sinkProgress * Math.PI) * 0.62;
        ctx.fillStyle = `rgba(226, 232, 240, ${foamAlpha})`;
        ctx.beginPath();
        ctx.ellipse(
          0,
          3,
          sw * (0.44 - s.sinkProgress * 0.18),
          sh * 0.055,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    if (s.hitFlash > 0) {
      ctx.save();
      ctx.globalAlpha = s.hitFlash;
      const fr = sw * 0.14 * (1.2 - s.hitFlash * 0.35);
      const grad = ctx.createRadialGradient(
        0,
        -sh * 0.16,
        1,
        0,
        -sh * 0.16,
        fr,
      );
      grad.addColorStop(0, "#fecaca");
      grad.addColorStop(0.35, "#ef4444");
      grad.addColorStop(0.75, "rgba(185, 28, 28, 0.7)");
      grad.addColorStop(1, "rgba(127, 29, 29, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -sh * 0.16, fr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (s.smoke.length) {
      s.smoke.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.fire ? "#dc2626" : "#1f2937";
        ctx.beginPath();
        ctx.arc(p.ox * sw, p.oy * sh, p.r * s.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    ctx.restore();
  });
}
