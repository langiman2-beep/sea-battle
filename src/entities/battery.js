import aaBaseSrc from "../assets/aa-base.webp";
import aaBarrelsSrc from "../assets/aa-barrels.webp";
import torpBaseSrc from "../assets/torp-base.webp";
import torpTubesSrc from "../assets/torp-tubes.webp";
import rocketLauncherSrc from "../assets/rocket-launcher.webp";

function loadSprite(src) {
  const ready = document.createElement("canvas");
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

const aaBase = loadSprite(aaBaseSrc);
const aaBarrels = loadSprite(aaBarrelsSrc);
const torpBase = loadSprite(torpBaseSrc);
const torpTubes = loadSprite(torpTubesSrc);
const rocketLauncher = loadSprite(rocketLauncherSrc);

export const battery = { mode: "torpedo", aimX: 0.5, aimY: 0.55 };

const MODE_COLORS = {
  torpedo: { stroke: "#38bdf8", glow: "rgba(56, 189, 248, 0.55)" },
  aa: { stroke: "#f59e0b", glow: "rgba(245, 158, 11, 0.55)" },
  rocket: { stroke: "#ef4444", glow: "rgba(239, 68, 68, 0.6)" },
};

export function setMode(newMode) {
  battery.mode = newMode;
  if (newMode === "torpedo") {
    battery.aimY = 0.55;
  } else if (newMode === "aa") {
    battery.aimY = 0.25;
  } else {
    battery.aimY = 0.38;
  }
}

export function moveAim(dx, dy, dt) {
  const speed = 0.55;
  battery.aimX = Math.max(0.05, Math.min(0.95, battery.aimX + dx * speed * dt));

  let minY = 0.47;
  let maxY = 0.65;
  if (battery.mode === "aa") {
    minY = 0.06;
    maxY = 0.46;
  } else if (battery.mode === "rocket") {
    minY = 0.08;
    maxY = 0.65;
  }

  battery.aimY = Math.max(minY, Math.min(maxY, battery.aimY + dy * speed * dt));
}

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

export function getTorpedoAngle(w, h) {
  const bx = w * 0.41;
  const by = h * 0.83 - Math.min(w, h) * 0.28 * 0.14;
  const tx = battery.aimX * w;
  const ty = battery.aimY * h;
  const rawT = Math.atan2(ty - by, tx - bx) + Math.PI / 2;
  return clamp(rawT, -1.45, 1.45);
}

export function getRocketLauncherPos(w, h) {
  const size = Math.min(w, h) * 0.25;
  return {
    x: w * 0.76,
    y: h * 0.84,
    size,
  };
}

// Определяем, нажал ли игрок пальцем прямо на одно из трёх орудий на берегу
export function pickBatteryWeapon(px, py, w, h) {
  const size = Math.min(w, h) * 0.28;
  const rPos = getRocketLauncherPos(w, h);

  const candidates = [
    { mode: "torpedo", x: w * 0.41, y: h * 0.82, r: size * 0.48 },
    { mode: "aa", x: w * 0.59, y: h * 0.82, r: size * 0.48 },
    { mode: "rocket", x: rPos.x, y: rPos.y, r: rPos.size * 0.52 },
  ];

  let bestMode = null;
  let bestDist = Infinity;

  for (const c of candidates) {
    const dist = Math.hypot(px - c.x, py - c.y);
    if (dist <= c.r && dist < bestDist) {
      bestDist = dist;
      bestMode = c.mode;
    }
  }

  return bestMode;
}

function drawActiveHalo(ctx, x, y, rx, ry, color, pulse) {
  ctx.save();
  ctx.translate(x, y);

  const grad = ctx.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx * 1.25);
  grad.addColorStop(0, color.glow);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 1.25, ry * 1.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color.stroke;
  ctx.globalAlpha = 0.55 + pulse * 0.4;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(
    0,
    0,
    rx * (1 + pulse * 0.05),
    ry * (1 + pulse * 0.05),
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  ctx.restore();
}

export function drawBattery(ctx, w, h) {
  const tx = battery.aimX * w;
  const ty = battery.aimY * h;
  const size = Math.min(w, h) * 0.28;
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.005);

  // 1. Торпедный аппарат
  const bx = w * 0.41,
    by = h * 0.83;
  const torpActive = battery.mode === "torpedo";
  if (torpBase.width && torpTubes.width) {
    const tAngle = torpActive ? getTorpedoAngle(w, h) : 0;

    if (torpActive) {
      drawActiveHalo(
        ctx,
        bx,
        by + size * 0.36,
        size * 0.48,
        size * 0.14,
        MODE_COLORS.torpedo,
        pulse,
      );
    }

    ctx.save();
    ctx.translate(bx, by - size * 0.14);
    ctx.rotate(tAngle);
    if (torpActive) {
      ctx.shadowColor = MODE_COLORS.torpedo.stroke;
      ctx.shadowBlur = 10 + pulse * 8;
    }
    const tSize = size * 0.9;
    ctx.drawImage(torpTubes, -tSize / 2, -tSize * 0.78, tSize, tSize);
    ctx.restore();

    ctx.save();
    ctx.translate(bx, by);
    ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
    ctx.beginPath();
    ctx.ellipse(0, size * 0.36, size * 0.44, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    if (torpActive) {
      ctx.shadowColor = MODE_COLORS.torpedo.stroke;
      ctx.shadowBlur = 8 + pulse * 6;
    }
    ctx.drawImage(torpBase, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  // 2. Зенитка
  const gx = w * 0.59,
    gy = h * 0.83;
  const aaActive = battery.mode === "aa";
  if (aaBase.width && aaBarrels.width) {
    const rawG = Math.atan2(ty - (gy - size * 0.15), tx - gx) + Math.PI / 2;
    const gAngle = aaActive ? clamp(rawG, -1.1, 1.1) : 0;

    if (aaActive) {
      drawActiveHalo(
        ctx,
        gx,
        gy + size * 0.34,
        size * 0.46,
        size * 0.14,
        MODE_COLORS.aa,
        pulse,
      );
    }

    ctx.save();
    ctx.translate(gx, gy - size * 0.15);
    ctx.rotate(gAngle);
    if (aaActive) {
      ctx.shadowColor = MODE_COLORS.aa.stroke;
      ctx.shadowBlur = 10 + pulse * 8;
    }
    const bSize = size * 0.92;
    ctx.drawImage(aaBarrels, -bSize / 2, -bSize * 0.84, bSize, bSize);
    ctx.restore();

    ctx.save();
    ctx.translate(gx, gy);
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.ellipse(0, size * 0.34, size * 0.42, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    if (aaActive) {
      ctx.shadowColor = MODE_COLORS.aa.stroke;
      ctx.shadowBlur = 8 + pulse * 6;
    }
    ctx.drawImage(aaBase, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  // 3. Ракетная установка
  const rPos = getRocketLauncherPos(w, h);
  const rocketActive = battery.mode === "rocket";
  if (rocketLauncher.width) {
    if (rocketActive) {
      drawActiveHalo(
        ctx,
        rPos.x,
        rPos.y + rPos.size * 0.34,
        rPos.size * 0.46,
        rPos.size * 0.14,
        MODE_COLORS.rocket,
        pulse,
      );
    }

    ctx.save();
    ctx.translate(rPos.x, rPos.y);
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.ellipse(
      0,
      rPos.size * 0.34,
      rPos.size * 0.42,
      rPos.size * 0.12,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    if (rocketActive) {
      ctx.shadowColor = MODE_COLORS.rocket.stroke;
      ctx.shadowBlur = 10 + pulse * 8;
    }
    ctx.drawImage(
      rocketLauncher,
      -rPos.size / 2,
      -rPos.size / 2,
      rPos.size,
      rPos.size,
    );
    ctx.restore();
  }

  // Прицел в цвет активного орудия
  const aimColor = MODE_COLORS[battery.mode]?.stroke || "#38bdf8";
  ctx.save();
  ctx.strokeStyle = aimColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(tx, ty, 20, 0, Math.PI * 2);
  ctx.moveTo(tx - 28, ty);
  ctx.lineTo(tx + 28, ty);
  ctx.moveTo(tx, ty - 28);
  ctx.lineTo(tx, ty + 28);
  ctx.stroke();
  ctx.restore();
}
