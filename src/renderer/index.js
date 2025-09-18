document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('status');
  const list = document.getElementById('games');

  const candidates = [
    '../resources/games.json',
    '../../resources/games.json',
    'resources/games.json'
  ];

  async function loadJson(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res.json();
  }

  async function readCatalog() {
    for (const p of candidates) {
      try {
        const data = await loadJson(p);
        console.log('[catalog] ok from', p, data);
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.warn('[catalog] fail', p, e);
      }
    }
    throw new Error('games.json not found in candidates');
  }

  function render(games) {
    list.innerHTML = '';
    if (!games.length) {
      list.innerHTML = '<p>Каталог пуст</p>';
      return;
    }

    for (const g of games) {
      const row = document.createElement('div');
      row.className = 'game-row';

      const title = document.createElement('div');
      title.className = 'game-title';
      title.textContent = g.title || g.id || 'Игра';

      const run = document.createElement('button');
      run.textContent = 'Запустить';
      run.onclick = async () => {
        if (!window.api?.runGame) return alert('API не инициализировалось');
        const payload = { exePath: g.exePath, cwd: g.cwd || undefined, args: Array.isArray(g.args) ? g.args : [] };
        const res = await window.api.runGame(payload);
        if (!res?.ok) alert('Ошибка запуска: ' + (res?.error || 'unknown'));
      };

      const open = document.createElement('button');
      open.textContent = 'Открыть папку';
      open.onclick = async () => {
        if (!window.api?.openFolder) return alert('API не инициализировалось');
        const dir = g.cwd || (g.exePath ? g.exePath.replace(/\\[^\\]+$/, '') : '');
        const res = await window.api.openFolder(dir);
        if (!res?.ok) alert('Ошибка открытия: ' + (res?.error || 'unknown'));
      };

      const btns = document.createElement('div');
      btns.className = 'game-actions';
      btns.append(run, open);

      row.append(title, btns);
      list.append(row);
    }
  }

  (async () => {
    status.textContent = 'Загружаем игры…';
    try {
      const games = await readCatalog();
      status.textContent = '';
      render(games);
    } catch (e) {
      console.error(e);
      status.innerHTML = 'Не удалось прочитать каталог. Проверьте <code>resources/games.json</code>.';
    }
  })();
});