import { player, saveProgress, resetProgress } from "../systems/storage.js";
import { startSurfSound, updateSoundSettings } from "../systems/sound.js";

export function initMenu() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <style>
      .burger-btn {
        position: fixed; top: 16px; right: 16px; z-index: 20;
        width: 48px; height: 48px; border-radius: 10px;
        background: rgba(15, 23, 32, 0.8); color: #f8fafc;
        border: 1px solid rgba(148, 163, 184, 0.4); font-size: 24px; cursor: pointer;
      }
      .menu-panel {
        position: fixed; top: 74px; right: 16px; width: 270px; z-index: 20;
        background: rgba(15, 23, 32, 0.94); color: #e2e8f0;
        border: 1px solid rgba(148, 163, 184, 0.4); border-radius: 12px;
        padding: 16px; display: none; flex-direction: column; gap: 12px;
      }
      .menu-panel.open { display: flex; }
      .menu-panel label { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
      .menu-input {
        width: 100%; box-sizing: border-box; padding: 8px; margin-top: 4px; border-radius: 6px;
        border: 1px solid #475569; background: #1e293b; color: #fff; font-size: 15px;
      }
      .menu-stat { font-size: 13px; color: #94a3b8; border-bottom: 1px solid #334155; padding-bottom: 10px; line-height: 1.6; }
      .menu-stat b { color: #f59e0b; }
      .menu-reset-btn {
        margin-top: 4px; padding: 10px; border-radius: 8px;
        background: rgba(185, 28, 28, 0.25); color: #fca5a5;
        border: 1px solid rgba(239, 68, 68, 0.55); font-size: 14px;
        font-weight: bold; cursor: pointer;
      }
      .menu-reset-btn:hover { background: rgba(185, 28, 28, 0.45); }
      .menu-brand {
        text-align: center; font-size: 11px; letter-spacing: 2px;
        color: #64748b; border-top: 1px solid #334155; padding-top: 10px;
        margin-top: 2px; text-transform: uppercase;
      }
      .confirm-modal {
        position: fixed; inset: 0; z-index: 40; display: none;
        align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.78);
      }
      .confirm-modal.show { display: flex; }
      .confirm-card {
        max-width: 380px; width: 90%; background: #0f172a; border: 2px solid #f59e0b;
        border-radius: 14px; padding: 22px; text-align: center; color: #f8fafc;
      }
      .confirm-card h3 { margin: 0 0 10px; color: #fbbf24; font-size: 20px; }
      .confirm-card p { margin: 0 0 18px; font-size: 15px; color: #cbd5e1; line-height: 1.45; }
      .confirm-actions { display: flex; gap: 10px; justify-content: center; }
      .confirm-yes {
        padding: 10px 18px; border-radius: 8px; border: 1px solid #fca5a5;
        background: #b91c1c; color: #fff; font-size: 14px; font-weight: bold; cursor: pointer;
      }
      .confirm-no {
        padding: 10px 18px; border-radius: 8px; border: 1px solid #64748b;
        background: #1e293b; color: #e2e8f0; font-size: 14px; font-weight: bold; cursor: pointer;
      }
    </style>

    <button id="burger-btn" class="burger-btn">☰</button>
    <div id="menu-panel" class="menu-panel">
      <div>
        <span style="font-size:13px; color:#94a3b8;">Позивний бійця:</span>
        <input id="inp-name" class="menu-input" type="text" maxlength="16" value="${player.name}" />
      </div>
      <div class="menu-stat">
        Рівень: <b>${player.level} (${player.rank})</b><br>
        Знищено кораблів: <b id="stat-ships">${player.shipsSunk} / 15</b><br>
        Збито шахедів: <b id="stat-shaheds">${player.shahedsDown || 0}</b>
      </div>
      <label><span>🌊 Звуки фону</span><input id="chk-bg" type="checkbox" ${player.bgSound ? "checked" : ""} /></label>
      <label><span>🎵 Музика</span><input id="chk-music" type="checkbox" ${player.music ? "checked" : ""} /></label>
      <label><span>📳 Вібро при влучанні</span><input id="chk-vibro" type="checkbox" ${player.vibro ? "checked" : ""} /></label>
      <button id="btn-new-game" class="menu-reset-btn">🔄 Нова гра</button>
      <div class="menu-brand">by Langust Lab</div>
    </div>

    <div id="reset-modal" class="confirm-modal">
      <div class="confirm-card">
        <h3>⚠️ Нова гра</h3>
        <p>Усі результати будуть обнулені. Ти впевнений?</p>
        <div class="confirm-actions">
          <button id="btn-reset-yes" class="confirm-yes">Так, обнулити</button>
          <button id="btn-reset-no" class="confirm-no">Скасувати</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  const panel = document.getElementById("menu-panel");
  const resetModal = document.getElementById("reset-modal");

  document.getElementById("burger-btn").addEventListener("click", () => {
    panel.classList.toggle("open");
  });

  document.getElementById("inp-name").addEventListener("input", (e) => {
    player.name = e.target.value.trim() || "Боєць";
    saveProgress();
  });

  document.getElementById("chk-bg").addEventListener("change", (e) => {
    player.bgSound = e.target.checked;
    saveProgress();
    startSurfSound();
    updateSoundSettings();
  });

  document.getElementById("chk-music").addEventListener("change", (e) => {
    player.music = e.target.checked;
    saveProgress();
    startSurfSound();
    updateSoundSettings();
  });

  document.getElementById("chk-vibro").addEventListener("change", (e) => {
    player.vibro = e.target.checked;
    if (player.vibro) navigator.vibrate?.(50);
    saveProgress();
  });

  document.getElementById("btn-new-game").addEventListener("click", () => {
    panel.classList.remove("open");
    resetModal.classList.add("show");
  });

  document.getElementById("btn-reset-no").addEventListener("click", () => {
    resetModal.classList.remove("show");
  });

  document.getElementById("btn-reset-yes").addEventListener("click", () => {
    resetProgress();
    window.location.reload();
  });
}
