const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const GAMES_ORDER = ['fivem', 'samp', 'crmp', 'arma3'];

async function init() {
  const v = await window.api.getVersion();
  $('#version').textContent = `v${v}`;

  $('#discordLink').addEventListener('click', () => window.api.openDiscord());
  $('#btnSettings').addEventListener('click', openSettings);

  await renderGames();
}

async function renderGames() {
  const list = await window.api.loadCatalog();
  const wrap = $('#games');
  wrap.innerHTML = '';

  const sorted = list.sort((a, b) =>
    GAMES_ORDER.indexOf(a.id) - GAMES_ORDER.indexOf(b.id)
  );

  for (const g of sorted) {
    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
      <div class="card-title">${g.name}</div>
      <div class="row gap">
        <button class="btn primary" data-run="${g.id}">Запустить</button>
        <button class="btn" data-open="${g.id}">Открыть папку</button>
      </div>
    `;

    card.addEventListener('click', async (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.dataset.run) {
        const ok = await window.api.runGame(t.dataset.run);
        if (!ok) toast('Путь к игре не задан. Откройте ⚙️ Настройки.');
      } else if (t.dataset.open) {
        const ok = await window.api.openFolder(t.dataset.open);
        if (!ok) toast('Путь не задан.');
      }
    });

    wrap.appendChild(card);
  }
}

/** -------- Settings dialog -------- */
async function openSettings() {
  const dlg = $('#dlgSettings');
  const cfg = await window.api.getConfig();
  $('#path_fivem').value = cfg.paths?.fivem || '';
  $('#path_samp').value  = cfg.paths?.samp  || '';
  $('#path_crmp').value  = cfg.paths?.crmp  || '';
  $('#path_arma3').value = cfg.paths?.arma3 || '';
  $('#theme').value = cfg.theme || 'dark';

  // Обзор…
  $$('button[data-pick]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = btn.dataset.pick;
      const p = await window.api.pickExe();
      if (p) $(`#path_${id}`).value = p;
    }, { once: true });
  });

  // Автопоиск
  $('#btnAuto').addEventListener('click', async (e) => {
    e.preventDefault();
    const found = await window.api.autodetect();
    if (found.fivem && !$('#path_fivem').value) $('#path_fivem').value = found.fivem;
    if (found.samp  && !$('#path_samp').value)  $('#path_samp').value  = found.samp;
    if (found.crmp  && !$('#path_crmp').value)  $('#path_crmp').value  = found.crmp;
    if (found.arma3 && !$('#path_arma3').value) $('#path_arma3').value = found.arma3;
    toast('Автопоиск завершён.');
  }, { once: true });

  // Сохранить
  $('#btnSave').addEventListener('click', async (e) => {
    e.preventDefault();
    const paths = {
      fivem: nonEmpty($('#path_fivem').value),
      samp:  nonEmpty($('#path_samp').value),
      crmp:  nonEmpty($('#path_crmp').value),
      arma3: nonEmpty($('#path_arma3').value),
    };
    await window.api.setConfig({ theme: $('#theme').value, paths });
    dlg.close();
    applyTheme($('#theme').value);
    toast('Сохранено.');
  }, { once: true });

  dlg.addEventListener('close', () => dlg.classList.remove('show'), { once: true });
  dlg.showModal();
  dlg.classList.add('show');
}

function nonEmpty(s) { return s && s.trim() ? s.trim() : undefined; }

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme || 'dark';
}

function toast(text) {
  let t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); t.remove(); }, 2500);
}

// Применить тему при запуске
window.api.getConfig().then(cfg => applyTheme(cfg.theme));

init().catch(console.error);