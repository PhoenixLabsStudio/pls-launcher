const statusEl = document.getElementById('status');
const listEl = document.getElementById('games');
const discordLink = document.getElementById('discord');

const updBar = document.getElementById('updater');
const updText = document.getElementById('updater-text');
const updBtn  = document.getElementById('updater-btn');

discordLink.addEventListener('click', (e) => {
  e.preventDefault();
  window.api.openUrl('https://discord.com/app');
});

function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') n.className = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.substring(2).toLowerCase(), v);
    else n.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    if (typeof c === 'string') n.appendChild(document.createTextNode(c));
    else n.appendChild(c);
  }
  return n;
}

function renderGames(games) {
  listEl.innerHTML = '';
  for (const g of games) {
    const row = el(
      'div',
      { className: 'game' },
      el('span', { className: 'title' }, g.name ?? g.id ?? 'Game'),
      el(
        'div',
        { className: 'actions' },
        el(
          'button',
          {
            className: 'btn',
            onClick: async () => {
              const res = await window.api.launchGame({
                exePath: g.exePath,
                args: g.args || [],
                workDir: g.workDir || g.openDir,
              });
              if (res?.ok !== true) alert(res?.error || 'Ошибка запуска');
            },
          },
          'Запустить',
        ),
        el(
          'button',
          {
            className: 'btn secondary',
            onClick: async () => {
              const res = await window.api.openFolder(g.openDir || g.workDir || '');
              if (res?.ok !== true) alert(res?.error || 'Не удалось открыть папку');
            },
          },
          'Открыть папку',
        ),
      ),
    );
    listEl.appendChild(row);
  }
}

// === Обновления UI ===
let downloaded = false;
updBtn.addEventListener('click', async () => {
  if (downloaded) {
    await window.api.installUpdate();
  } else {
    updText.textContent = 'Проверяем обновления…';
    await window.api.checkForUpdates();
  }
});

window.api.onUpdate((evt) => {
  if (evt.type === 'status' && evt.payload?.state === 'checking') {
    updBar.style.display = 'flex';
    updText.textContent = 'Проверяем обновления…';
    updBtn.textContent = 'Ок';
  }
  if (evt.type === 'available') {
    updBar.style.display = 'flex';
    updText.textContent = `Доступна новая версия. Скачиваем…`;
    updBtn.textContent = 'Скрыть';
  }
  if (evt.type === 'not-available') {
    updBar.style.display = 'none';
  }
  if (evt.type === 'progress') {
    updBar.style.display = 'flex';
    const p = Math.floor(evt.payload?.percent || 0);
    updText.textContent = `Скачивание обновления: ${p}%`;
    updBtn.textContent = 'Фон';
  }
  if (evt.type === 'downloaded') {
    updBar.style.display = 'flex';
    downloaded = true;
    updText.textContent = `Обновление скачано. Установить сейчас?`;
    updBtn.textContent = 'Установить';
  }
  if (evt.type === 'error') {
    updBar.style.display = 'flex';
    updText.textContent = `Ошибка обновления: ${evt.payload?.message || 'unknown'}`;
    updBtn.textContent = 'Закрыть';
  }
});

// === Загрузка каталога ===
(async () => {
  statusEl.textContent = 'Загружаем игры…';
  const res = await window.api.getGames();

  if (Array.isArray(res)) {
    if (res.length === 0) {
      statusEl.textContent = 'Каталог пуст';
    } else {
      statusEl.remove();
      renderGames(res);
    }
    return;
  }

  if (res?.error) {
    statusEl.textContent = 'Каталог не найден';
    console.error(res.error);
  } else if (Array.isArray(res?.items) && res.items.length) {
    statusEl.remove();
    renderGames(res.items);
  } else {
    statusEl.textContent = 'Каталог пуст';
  }
})();