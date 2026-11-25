export function showIntro(onComplete) {
  const wrap = document.createElement("div");
  wrap.className = "intro-overlay";
  wrap.innerHTML = `
    <style>
      .intro-overlay {
        position: fixed;
        inset: 0;
        z-index: 45;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 14px;
        background: rgba(5, 11, 22, 0.84);
        backdrop-filter: blur(4px);
      }
      .intro-card {
        width: 100%;
        max-width: 560px;
        max-height: 92dvh;
        display: flex;
        flex-direction: column;
        background: linear-gradient(165deg, #0f172a 0%, #172554 100%);
        border: 2px solid #38bdf8;
        border-radius: 16px;
        padding: 18px 20px;
        color: #f1f5f9;
        box-shadow: 0 0 34px rgba(56, 189, 248, 0.28);
      }
      .intro-badge {
        align-self: center;
        padding: 4px 12px;
        margin-bottom: 8px;
        border-radius: 999px;
        background: rgba(56, 189, 248, 0.16);
        border: 1px solid #38bdf8;
        color: #7dd3fc;
        font-size: 12px;
        font-weight: bold;
        letter-spacing: 1px;
        flex-shrink: 0;
      }
      .intro-title {
        margin: 0 0 10px;
        text-align: center;
        color: #fbbf24;
        font-size: 21px;
        flex-shrink: 0;
      }
      .intro-scroll {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
        padding: 10px 12px;
        margin-bottom: 12px;
        border-radius: 10px;
        background: rgba(2, 6, 23, 0.52);
        border: 1px solid rgba(148, 163, 184, 0.25);
        font-size: 15px;
        line-height: 1.5;
        color: #e2e8f0;
      }
      .intro-scroll p {
        margin: 0 0 10px;
      }
      .intro-scroll p:last-child {
        margin-bottom: 0;
      }
      .intro-scroll b {
        color: #fde047;
      }
      .intro-scroll ul {
        margin: 0;
        padding-left: 18px;
      }
      .intro-scroll li {
        margin-bottom: 8px;
      }
      .intro-scroll li:last-child {
        margin-bottom: 0;
      }
      .intro-scroll::-webkit-scrollbar {
        width: 6px;
      }
      .intro-scroll::-webkit-scrollbar-thumb {
        background: rgba(56, 189, 248, 0.5);
        border-radius: 999px;
      }
      .intro-tabs {
        display: flex;
        gap: 8px;
        justify-content: center;
        flex-wrap: wrap;
        margin-bottom: 10px;
        flex-shrink: 0;
      }
      .intro-actions {
        display: flex;
        gap: 10px;
        justify-content: center;
        flex-wrap: wrap;
        flex-shrink: 0;
      }
      .intro-btn {
        padding: 11px 22px;
        border-radius: 10px;
        font-size: 15px;
        font-weight: bold;
        cursor: pointer;
        border: 1px solid transparent;
        transition: transform 0.1s ease;
      }
      .intro-btn:active {
        transform: scale(0.97);
      }
      .intro-btn.primary {
        background: #10b981;
        border-color: #6ee7b7;
        color: #022c22;
      }
      .intro-btn.tab {
        background: #1e293b;
        border-color: #64748b;
        color: #e2e8f0;
        padding: 9px 15px;
        font-size: 14px;
      }
      .intro-btn.tab.active {
        background: rgba(56, 189, 248, 0.25);
        border-color: #38bdf8;
        color: #f8fafc;
      }
      .intro-btn.skip {
        background: rgba(185, 28, 28, 0.28);
        border-color: #f87171;
        color: #fecaca;
        padding: 9px 15px;
        font-size: 14px;
      }

      @media (max-height: 460px) {
        .intro-card {
          padding: 12px 14px;
        }
        .intro-title {
          font-size: 17px;
          margin-bottom: 6px;
        }
        .intro-scroll {
          font-size: 13px;
          line-height: 1.42;
          padding: 8px 10px;
          margin-bottom: 8px;
        }
        .intro-btn {
          padding: 8px 16px;
          font-size: 13px;
        }
      }
    </style>
    <div id="intro-card" class="intro-card"></div>
  `;
  document.body.appendChild(wrap);

  const card = wrap.querySelector("#intro-card");

  function finish() {
    wrap.remove();
    if (onComplete) onComplete();
  }

  function renderBriefing() {
    card.innerHTML = `
      <div class="intro-badge">⚓ БОЙОВИЙ НАКАЗ</div>
      <h2 class="intro-title">Боєць, місто під твоїм захистом!</h2>
      <div class="intro-scroll">
        <p>Ворог підходить з моря і заходить із неба. Людей на позиціях зараз не вистачає, тому керувати всією береговою батареєю доведеться саме тобі.</p>
        <p>🚀 <b>Торпедний апарат</b> — бий по ворожих кораблях та військових транспортах у морі. Торпеда йде по воді не миттєво, тому враховуй швидкість цілі й бери випередження.</p>
        <p>💥 <b>Зенітна гармата</b> — прикривай небо від «шахедів» та іншої нечисті. Снаряди летять чергою — розраховуй траєкторію наперед. І головне — не стріляй по мирних чайках!</p>
        <p>🎯 <b>Ракетна установка</b> — твій козир на крайній випадок. Ракета влучає точно в ціль і на воді, і в повітрі, але їх дуже мало — бережи на критичний момент.</p>
        <p>Не пропусти ворога до берега. Протримайся до кінця раунду — тримаємо стрій!</p>
      </div>
      <div class="intro-actions">
        <button id="intro-next" class="intro-btn primary">Далі ➡</button>
      </div>
    `;

    card.querySelector("#intro-next").addEventListener("click", () => {
      renderGuide(null);
    });
  }

  function renderGuide(selected) {
    let bodyHtml = `
      <p style="text-align:center; padding: 14px 4px; color:#cbd5e1;">
        Обери, з чого ти граєш, щоб швидко глянути керування — або тисни <b>«Пропустити»</b>, якщо вже все знаєш.
      </p>
    `;

    if (selected === "pc") {
      bodyHtml = `
        <ul>
          <li><b>Наведення прицілу:</b> стрілки на клавіатурі або клавіші <b>W, A, S, D</b>.</li>
          <li><b>Вогонь:</b> клавіша <b>Пробіл</b> або <b>ліва кнопка миші (ЛКМ)</b> по полю.</li>
          <li><b>Приціл / Збільшення (🔍):</b> <b>права кнопка миші (ПКМ)</b>, клавіші <b>Z / E</b> або кнопка з лупою.</li>
          <li><b>Зміна зброї:</b> клавіші <b>1</b> (Торпеди), <b>2</b> (Зенітка), <b>3</b> (Ракети) або велика кнопка вибору в правому куті.</li>
          <li><b>Додатково:</b> пауза <b>⏸</b> зліва, повний екран <b>⛶</b> зверху біля таймера.</li>
        </ul>
      `;
    } else if (selected === "mobile") {
      bodyHtml = `
        <ul>
          <li><b>Екран:</b> поверни телефон горизонтально. Зверху біля таймера є кнопка <b>⛶</b> для повного екрана.</li>
          <li><b>Наведення прицілу:</b> плавно <b>водіть пальцем по екрану</b> або користуйся стрілками зліва внизу.</li>
          <li><b>Вогонь:</b> велика кругла червона кнопка <b>🔥 ВОГОНЬ</b> справа внизу.</li>
          <li><b>Приціл / Збільшення (🔍):</b> кнопка з лупою над кнопкою вогню — допомагає знімати далекі кораблі біля горизонту.</li>
          <li><b>Зміна зброї:</b> натискай <b>безпосередньо на потрібне орудіє на березі</b> (торпеди, зенітку чи ракетницю) або на велику кнопку вибору в правому куті.</li>
        </ul>
      `;
    }

    card.innerHTML = `
      <div class="intro-badge">🎮 ІНСТРУКЦІЯ</div>
      <h2 class="intro-title">Як керувати батареєю</h2>
      <div class="intro-tabs">
        <button id="guide-pc" class="intro-btn tab ${selected === "pc" ? "active" : ""}">💻 Для ПК</button>
        <button id="guide-mobile" class="intro-btn tab ${selected === "mobile" ? "active" : ""}">📱 Для телефону</button>
        <button id="guide-skip" class="intro-btn skip">⏭ Пропустити</button>
      </div>
      <div class="intro-scroll">${bodyHtml}</div>
      <div class="intro-actions">
        ${
          selected
            ? `<button id="guide-start" class="intro-btn primary">🔥 У БІЙ!</button>`
            : ""
        }
      </div>
    `;

    card
      .querySelector("#guide-pc")
      .addEventListener("click", () => renderGuide("pc"));
    card
      .querySelector("#guide-mobile")
      .addEventListener("click", () => renderGuide("mobile"));
    card.querySelector("#guide-skip").addEventListener("click", finish);

    const startBtn = card.querySelector("#guide-start");
    if (startBtn) startBtn.addEventListener("click", finish);
  }

  renderBriefing();
}
