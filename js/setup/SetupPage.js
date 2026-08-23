import { SkinSystem } from '../systems/SkinSystem.js';

// /?setup=0929 — ESTÚDIO DE SKINS do dono (v1.8.1). Página estática no molde
// do /?stats (sem Phaser, DOM puro, CSS no index.html sob #setup-page), mas o
// trabalho de verdade acontece no SERVIDOR LOCAL do gerador (localhost:3210):
// upload → fatiar → vetorizar → aplicar em art/ → registrar no SkinRegistry +
// sw.js — sem editar código à mão. Sem o servidor, a página só instrui como
// subi-lo; em produção ela existe, mas só faz algo no PC do dono (Chrome
// exige o header de Private Network Access, que o servidor manda).
//
// Mesma chave do painel detalhado (/?stats): SHA-256 comparado no cliente.
// Não é segurança de verdade — o que protege o jogo é o servidor local só
// existir na máquina do dono; a chave afasta curiosos da página publicada.
const SETUP_KEY_HASH = '58f80cb81ed4b05cedac165d4ab30fd9e307d17d0f142ca708dd999ab479b238';
const API = 'http://localhost:3210';

async function hasAccess() {
  const key = new URLSearchParams(location.search).get('setup');
  if (!key || !crypto.subtle) return false; // http em LAN não tem subtle
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
    const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    return hex === SETUP_KEY_HASH;
  } catch (e) {
    return false;
  }
}

// Mesmo helper do StatsDashboard/MyStats (duplicado de propósito — cada
// página estática é autossuficiente). textContent: nada de innerHTML com
// dado que veio de fora.
function el(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

// ------------------------------------------------------------------ estado
let serverUp = false;
let gameByUnified = false; // quem serve esta página é o próprio gerador?
let sessionId = null;
let selection = [];
let lastB64 = null;
let currentVariant = 'run'; // 'run' | 'fire'
let generatedName = null;
let generated = { run: false, fire: false };
let editingId = null; // id em edição (desbloqueio/nome/desc/flag) ou null
// builtin = as 7 originais (id reservado para skin nova; remover pede uma
// confirmação extra); locked = só o default (nem editar, nem remover). Listas
// oficiais vêm do /api/skins; os fallbacks cobrem a crítica de nome antes de
// o servidor responder.
let builtinIds = [];
let lockedIds = [];
let polledOnce = false;

// Espelho do slug() do servidor (minúsculas, [a-z0-9-], sem "rhino-" à
// frente) — para criticar o nome ENQUANTO o dono digita, não só no fim
const slugLocal = (name) => String(name || '').toLowerCase()
  .replace(/[^a-z0-9-]/g, '').replace(/^rhino-+/, '').slice(0, 24);

const FALLBACK_BUILTIN = ['default', 'party', 'robot', 'gold', 'silver', 'bronze', 'catisquick'];
const isBuiltinId = (id) => (builtinIds.length ? builtinIds : FALLBACK_BUILTIN).includes(id);
const isLockedId = (id) => (lockedIds.length ? lockedIds : ['default']).includes(id);

async function post(route, body) {
  const r = await fetch(API + route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `erro ${r.status}`);
  return j;
}

const $ = (id) => document.getElementById(id);

export async function render() {
  const root = document.getElementById('setup-page');
  root.hidden = false;
  root.textContent = '';

  if (!(await hasAccess())) {
    root.append(el('h1', null, '🎨 Estúdio de skins'));
    root.append(el('p', 'su-muted', 'Acesso restrito — chame a página com a chave do painel detalhado.'));
    return;
  }

  // O h1 mantém "Estúdio de skins" (o e2e-setup assere esse texto no load);
  // a Radiografia mora numa ABA — v1.8.8, ideia K.
  root.append(el('h1', null, '🎨 Estúdio de skins'));

  const tabs = el('div', 'su-variant-tabs');
  tabs.id = 'su-tabs';
  const btnSkins = el('button', 'su-active', '🎨 Skins');
  btnSkins.id = 'su-tab-btn-skins';
  const btnRadio = el('button', null, '📊 Radiografia');
  btnRadio.id = 'su-tab-btn-radiografia';
  tabs.append(btnSkins, btnRadio);
  root.append(tabs);

  // Aba Skins montada POR PADRÃO: os ids que o e2e-setup exige no load
  // (su-server-text/su-drop/su-card-unlock/su-skin-list) continuam no DOM.
  const tabSkins = el('div');
  tabSkins.id = 'su-tab-skins';
  tabSkins.append(el('p', 'su-muted',
    'Folha de sprites → skin no jogo, de ponta a ponta e sem editar código. '
    + 'Tudo é gravado na árvore de trabalho do jogo no seu PC — nada vai ao ar sem a release.'));
  tabSkins.append(buildServerCard());
  tabSkins.append(buildSkinListCard());
  tabSkins.append(buildUploadCard());
  tabSkins.append(buildFramesCard());
  tabSkins.append(buildOptionsCard());
  tabSkins.append(buildResultCard());
  tabSkins.append(buildUnlockCard());
  root.append(tabSkins);

  // Aba Radiografia: vazia até o PRIMEIRO clique — o import dinâmico mantém
  // o /?setup abrindo instantâneo, e nenhuma rede é tocada antes do clique
  // (o e2e assere isso: análise só roda por vontade do dono).
  const tabRadio = el('div');
  tabRadio.id = 'su-tab-radiografia';
  tabRadio.hidden = true;
  root.append(tabRadio);

  let radioCarregada = false;
  const selecionar = (qual) => {
    tabSkins.hidden = qual !== 'skins';
    tabRadio.hidden = qual !== 'radiografia';
    btnSkins.classList.toggle('su-active', qual === 'skins');
    btnRadio.classList.toggle('su-active', qual === 'radiografia');
  };
  btnSkins.addEventListener('click', () => selecionar('skins'));
  btnRadio.addEventListener('click', async () => {
    selecionar('radiografia');
    if (radioCarregada) return;
    radioCarregada = true;
    try {
      const mod = await import('./SetupAnalytics.js');
      mod.mount(tabRadio);
    } catch (e) {
      radioCarregada = false; // próxima tentativa recarrega
      tabRadio.append(el('p', 'su-err', `Não deu para carregar a análise: ${e.message}`));
    }
  });

  pollStatus();
  setInterval(pollStatus, 2000);
}

// ------------------------------------------------------------ card: servidores
// v1.8.8: DUAS linhas de status — o JOGO (quem serve esta página: o estúdio
// unificado, o python, produção, ou o cache do PWA) e o GERADOR (:3210).
// A linha do gerador é contrato congelado do e2e-setup (#su-dot,
// #su-server-text com 'executando'/'parado' EXATOS, #su-uptime,
// #su-server-help hidden⇔no ar) — ids e strings intocados; o que é novo
// (linha do jogo, botão Parar) tem id novo.
function buildServerCard() {
  const card = el('div', 'su-card');
  card.append(el('h2', null, 'Servidores locais'));

  const rowGame = el('div');
  rowGame.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap';
  const gameDot = el('span', null, '⚪');
  gameDot.id = 'su-game-dot';
  gameDot.style.fontSize = '20px';
  const gameText = el('b', null, 'jogo: verificando…');
  gameText.id = 'su-game-text';
  const gameSrc = el('span', 'su-muted', '');
  gameSrc.id = 'su-game-src';
  rowGame.append(gameDot, gameText, gameSrc);

  const row = el('div');
  row.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:6px';
  const dot = el('span', null, '⚪');
  dot.id = 'su-dot';
  dot.style.fontSize = '20px';
  const text = el('b', null, 'verificando…');
  text.id = 'su-server-text';
  const uptime = el('span', 'su-muted', '');
  uptime.id = 'su-uptime';
  // ⏻ Parar: a página nunca pôde LIGAR o servidor (sandbox), mas desligar
  // pode — o /api/shutdown responde antes de morrer e o polling pinta o
  // resto sozinho. O aviso muda se quem serve esta página é o próprio
  // servidor que vai cair.
  const stopBtn = el('button', 'su-danger', '⏻ Parar servidor');
  stopBtn.id = 'su-btn-stop';
  stopBtn.hidden = true;
  stopBtn.addEventListener('click', async () => {
    const aviso = gameByUnified
      ? 'Parar o servidor? Isto derruba TAMBÉM quem serve esta página — as duas '
        + 'linhas ficam vermelhas e nada mais grava.\n\nPara voltar: duplo-clique '
        + 'em iniciar-estudio.bat (na pasta do jogo).'
      : 'Parar o gerador? (o jogo continua no ar — é outro servidor que o serve)';
    if (!confirm(aviso)) return;
    try {
      await fetch(API + '/api/shutdown', { method: 'POST' });
    } catch (e) { /* já caiu — o polling confirma */ }
  });
  row.append(dot, text, uptime, stopBtn);

  const help = el('div');
  help.id = 'su-server-help';
  help.hidden = true;
  const p1 = el('p', 'su-muted',
    'O navegador não pode iniciar programas — suba o servidor por um destes caminhos '
    + '(esta página detecta sozinha quando ele estiver no ar):');
  const p2 = el('p');
  p2.append('• Duplo-clique em ');
  p2.append(el('code', null, 'iniciar-estudio.bat'));
  p2.append(' (na pasta do jogo) — sobe tudo e abre este estúdio no endereço certo');
  p2.append(document.createElement('br'));
  p2.append('• Ou no terminal, na pasta do jogo: ');
  p2.append(el('code', null, 'npm run sprite-gen'));
  const copyBtn = el('button', null, 'copiar comando');
  copyBtn.style.marginLeft = '8px';
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('npm run sprite-gen');
      copyBtn.textContent = 'copiado ✓';
    } catch (e) {
      copyBtn.textContent = 'copie à mão';
    }
    setTimeout(() => { copyBtn.textContent = 'copiar comando'; }, 2000);
  });
  p2.append(copyBtn);
  help.append(p1, p2);
  card.append(rowGame, row, help);
  return card;
}

async function pollStatus() {
  let up = false;
  let uptimeS = null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(API + '/api/status', { signal: ctrl.signal });
    clearTimeout(t);
    uptimeS = (await r.json()).uptimeS;
    up = true;
  } catch (e) { /* parado */ }
  const wasUp = serverUp;
  serverUp = up;
  if ($('su-dot')) {
    $('su-dot').textContent = up ? '🟢' : '🔴';
    $('su-server-text').textContent = up ? 'executando' : 'parado';
    $('su-uptime').textContent = up && uptimeS != null
      ? `há ${Math.floor(uptimeS / 60)}min ${uptimeS % 60}s` : '';
    $('su-server-help').hidden = up;
    if ($('su-btn-stop')) $('su-btn-stop').hidden = !up;
  }
  await pollGameServer();
  // primeira medição ou transição de estado → a lista acompanha (sem isso,
  // servidor já parado no boot deixaria o "aguardando…" para sempre)
  if (up !== wasUp || !polledOnce) refreshSkinList();
  polledOnce = true;
}

// v1.8.8: status de QUEM SERVE ESTA PÁGINA. O probe é HEAD de propósito —
// o service worker ignora requisição não-GET (vai direto à rede e NUNCA
// entra no Cache Storage; com GET, um 200 seria cache.put e depois um falso
// "no ar" com tudo morto). Classificação: /api/status responde ok = é o
// estúdio unificado; responde não-ok (404) = outro servidor estático
// (python); exceção = fora do ar (esta página veio do cache do PWA).
async function pollGameServer() {
  if (!$('su-game-dot')) return;
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!isLocal) {
    gameByUnified = false;
    $('su-game-dot').textContent = '🟢';
    $('su-game-text').textContent = 'jogo no ar';
    $('su-game-src').textContent = `${location.host} · produção`;
    return;
  }
  let alive = false;
  let unified = false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(`${location.origin}/api/status`, {
      method: 'HEAD', cache: 'no-store', signal: ctrl.signal,
    });
    clearTimeout(t);
    alive = true;
    unified = r.ok;
  } catch (e) { /* fora do ar */ }
  gameByUnified = unified;
  $('su-game-dot').textContent = alive ? '🟢' : '🔴';
  $('su-game-text').textContent = alive ? 'jogo no ar' : 'jogo fora do ar';
  $('su-game-src').textContent = alive
    ? `${location.host} · ${unified ? 'servido pelo estúdio unificado' : 'outro servidor (ex.: python)'}`
    : 'esta página veio do cache do PWA — suba um servidor para gravar';
}

function guardServer() {
  if (!serverUp) {
    alert('O servidor local está parado — suba-o pelo painel no topo da página.');
    return false;
  }
  return true;
}

// -------------------------------------------------------- card: skins atuais
function buildSkinListCard() {
  const card = el('div', 'su-card');
  card.append(el('h2', null, 'Skins no jogo'));
  const list = el('div', 'su-skin-list');
  list.id = 'su-skin-list';
  list.append(el('p', 'su-muted', 'Aguardando o servidor para listar…'));
  card.append(list);
  return card;
}

function accessLabel(skin) {
  const a = skin.access || {};
  if (a.type === 'default') return 'Grátis para todo mundo';
  if (a.type === 'rank') return `Pódio — só o nº ${a.rank} do mundo`;
  // requirementText só usa access/desc — serve para dados vindos da API
  return SkinSystem.requirementText(skin);
}

async function refreshSkinList() {
  const list = $('su-skin-list');
  if (!list) return;
  if (!serverUp) {
    list.textContent = '';
    list.append(el('p', 'su-muted', 'Servidor parado — a lista aparece quando ele subir.'));
    return;
  }
  let data;
  try {
    data = await (await fetch(API + '/api/skins')).json();
  } catch (e) {
    return;
  }
  builtinIds = data.builtinIds || FALLBACK_BUILTIN;
  lockedIds = data.lockedIds || ['default'];
  list.textContent = '';
  for (const skin of data.skins) {
    const row = el('div', 'su-skin-row');
    row.dataset.skinId = skin.id; // seletor estável p/ e2e (nomes colidem)
    const img = document.createElement('img');
    img.alt = skin.name;
    img.src = `art/${skin.pending || !skin.prefix ? 'rhino-run-0' : `${skin.prefix}-0`}.svg`;
    const name = el('b', null, skin.name + (skin.firePrefix ? ' 🔥' : ''));
    const info = el('span', 'su-muted',
      `${accessLabel(skin)}${skin.pending ? ' · em produção' : ''}`);
    // a flag do dono, sempre à vista: skin escondida continua na lista da
    // página (para poder voltar), mas some do hub do jogo
    const state = el('span', skin.hidden ? 'su-warn' : 'su-ok',
      skin.hidden ? '🚫 fora do jogo' : '✅ no jogo');
    row.append(img, name, info, state);
    if (isLockedId(skin.id)) {
      row.append(el('span', 'su-muted', '🔏 original — o fallback do jogo'));
    } else {
      const toggle = el('button', null, skin.hidden ? '✅ Pôr no jogo' : '🚫 Tirar do jogo');
      toggle.addEventListener('click', () => toggleHidden(skin, toggle));
      const edit = el('button', null, '✏️ Editar');
      edit.addEventListener('click', () => startEdit(skin));
      const del = el('button', 'su-danger', '🗑 Remover');
      del.addEventListener('click', () => removeSkinFlow(skin));
      row.append(toggle, edit, del);
    }
    list.append(row);
  }
}

// Toggle direto na linha: mesma gravação validada do editar (registry + suíte
// + rollback), só que num clique
async function toggleHidden(skin, btn) {
  if (!guardServer()) return;
  btn.disabled = true;
  btn.textContent = '⏳ gravando…';
  try {
    await post('/api/skin/update', { id: skin.id, hidden: !skin.hidden });
  } catch (e) {
    alert(`❌ ${e.message}`);
  }
  refreshSkinList();
}

async function removeSkinFlow(skin) {
  if (!guardServer()) return;
  if (!confirm(`Remover a skin "${skin.name}" do jogo?\n\nIsso apaga os SVGs de art/ e tira a skin do registry e do sw.js. `
    + 'O material do gerador (output/) fica guardado.')) return;
  // original: a arte não tem cópia no output/ do gerador — apagar é para
  // sempre (fora um git checkout). A alternativa reversível fica no aviso.
  if (isBuiltinId(skin.id) && !confirm(`⚠️ "${skin.name}" é uma skin ORIGINAL do jogo — a arte dela não tem backup no gerador. `
    + 'Se a ideia é só tirar do ar, prefira "🚫 Tirar do jogo" (reversível).\n\nRemover de vez mesmo assim?')) return;
  try {
    const r = await post('/api/skin/remove', { id: skin.id });
    alert(`✅ "${skin.name}" removida (${r.deleted.length} arquivos de arte apagados). `
      + 'Lembre: a mudança só vai ao ar na próxima release.');
    refreshSkinList();
  } catch (e) {
    alert(`❌ ${e.message}`);
  }
}

// ------------------------------------------------------------- card: upload
function buildUploadCard() {
  const card = el('div', 'su-card');
  card.append(el('h2', null, '1 · Nova skin — a folha de sprites'));

  const tabs = el('div', 'su-variant-tabs');
  const tabRun = el('button', 'su-active', '🏃 Corrida (obrigatória)');
  tabRun.id = 'su-tab-run';
  const tabFire = el('button', null, '🔥 Fúria própria (opcional)');
  tabFire.id = 'su-tab-fire';
  tabRun.addEventListener('click', () => setVariant('run'));
  tabFire.addEventListener('click', () => setVariant('fire'));
  tabs.append(tabRun, tabFire);
  const variantHint = el('p', 'su-muted',
    'Gere primeiro a corrida. Se a skin tiver transformação própria no rampage '
    + '(como o Rino Vulcão do Catisquick), troque para "Fúria" e repita o fluxo com a folha em chamas — '
    + 'sem folha própria, a fúria usa a arte compartilhada do jogo.');
  variantHint.id = 'su-variant-hint';

  const drop = el('div', 'su-drop');
  drop.id = 'su-drop';
  const b = el('p');
  b.append(el('b', null, 'Solte a folha aqui'), ' (JPG, PNG ou SVG) ou clique para escolher');
  drop.append(b);
  drop.append(el('p', 'su-muted',
    'Receita do prompt (o que dá certo): 3+ células em linha, fundo branco puro, margens largas e '
    + 'NADA atravessando os vãos entre células — sem rastros, brilhos ou partículas; cel-shading chapado '
    + '(máx. 5 cores + contorno grosso), sem degradê; rinoceronte de perfil virado para a DIREITA, '
    + 'corpo idêntico entre poses — só as pernas mudam. Baixe na resolução máxima (≥2000px).'));
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'image/*';
  file.hidden = true;
  file.id = 'su-file';
  drop.append(file);
  drop.addEventListener('click', () => { if (guardServer()) file.click(); });
  drop.addEventListener('dragover', (ev) => { ev.preventDefault(); drop.classList.add('su-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('su-over'));
  drop.addEventListener('drop', (ev) => {
    ev.preventDefault();
    drop.classList.remove('su-over');
    if (guardServer() && ev.dataTransfer.files[0]) handleFile(ev.dataTransfer.files[0]);
  });
  file.addEventListener('change', () => { if (file.files[0]) handleFile(file.files[0]); });

  card.append(tabs, variantHint, drop);
  return card;
}

function setVariant(v) {
  if (v === 'fire' && !generated.run) {
    alert('Gere a variante de corrida primeiro — a fúria é um extra da mesma skin.');
    return;
  }
  currentVariant = v;
  $('su-tab-run').classList.toggle('su-active', v === 'run');
  $('su-tab-fire').classList.toggle('su-active', v === 'fire');
  // fúria herda o nome da corrida gerada; o campo trava para não divergir
  const nameInput = $('su-name');
  if (nameInput) nameInput.disabled = v === 'fire';
}

function handleFile(fileObj) {
  status('Fatiando a folha…');
  const reader = new FileReader();
  reader.onload = () => {
    lastB64 = String(reader.result).split(',')[1];
    sliceNow(null);
  };
  reader.readAsDataURL(fileObj);
}

async function sliceNow(grid) {
  try {
    const r = await post('/api/slice', { imageBase64: lastB64, grid });
    sessionId = r.sessionId;
    selection = [];
    renderFrames(r.frames);
    renderPalette(r.suggestedPalette, r.suggestedOutline);
    $('su-card-frames').hidden = false;
    $('su-card-options').hidden = false;
    $('su-card-result').hidden = true;
    status(`${r.frames.length} frames ${grid ? 'na grade fixa' : 'detectados'} — escolha 3 na ordem do galope.`
      + (!grid && r.frames.length < 3 ? ' Poucos frames? Use a grade fixa.' : ''),
      r.frames.length >= 3 ? 'su-ok' : 'su-err');
  } catch (e) {
    status(e.message, 'su-err');
  }
}

// ------------------------------------------------------------- card: frames
function buildFramesCard() {
  const card = el('div', 'su-card');
  card.id = 'su-card-frames';
  card.hidden = true;
  card.append(el('h2', null, '2 · Escolha 3 frames na ordem do galope'));
  const p = el('p', 'su-muted');
  p.append('Clique na sequência: ', el('b', null, '① estendida'), ' (pernas lançadas) → ',
    el('b', null, '② apoio'), ' (pata fincada) → ', el('b', null, '③ recolhida'),
    ' (pernas sob o corpo). Clique de novo para desfazer.');
  card.append(p);
  const gridRow = el('p');
  gridRow.append(el('span', 'su-muted', 'Fatiou errado? Refatie em grade fixa: '));
  const rows = document.createElement('input');
  rows.type = 'number';
  rows.min = 1; rows.max = 6; rows.value = 2; rows.id = 'su-grid-rows';
  rows.style.width = '58px';
  const cols = document.createElement('input');
  cols.type = 'number';
  cols.min = 1; cols.max = 8; cols.value = 3; cols.id = 'su-grid-cols';
  cols.style.width = '58px';
  const regrid = el('button', null, 'Refatiar em grade');
  regrid.addEventListener('click', () => {
    if (!guardServer() || !lastB64) return;
    status('Refatiando em grade…');
    sliceNow({ rows: Number(rows.value) || 2, cols: Number(cols.value) || 3 });
  });
  gridRow.append(rows, ' linhas × ', cols, ' colunas ', regrid);
  card.append(gridRow);
  const frames = el('div', 'su-frames');
  frames.id = 'su-frames';
  card.append(frames);
  return card;
}

function renderFrames(frames) {
  const box = $('su-frames');
  box.textContent = '';
  for (const f of frames) {
    const div = el('div', 'su-frame');
    div.dataset.index = f.index;
    const img = document.createElement('img');
    img.src = 'data:image/png;base64,' + f.png;
    img.alt = 'frame ' + f.index;
    div.append(img);
    div.addEventListener('click', () => toggleFrame(div));
    box.append(div);
  }
}

function toggleFrame(div) {
  const idx = Number(div.dataset.index);
  const pos = selection.indexOf(idx);
  if (pos >= 0) selection.splice(pos, 1);
  else if (selection.length < 3) selection.push(idx);
  document.querySelectorAll('#setup-page .su-frame').forEach((frame) => {
    const i = selection.indexOf(Number(frame.dataset.index));
    frame.classList.toggle('su-sel', i >= 0);
    frame.querySelector('.su-badge')?.remove();
    if (i >= 0) {
      const badge = el('span', 'su-badge', ['①', '②', '③'][i]);
      frame.append(badge);
    }
  });
}

// ----------------------------------------------------- card: paleta + gerar
function buildOptionsCard() {
  const card = el('div', 'su-card');
  card.id = 'su-card-options';
  card.hidden = true;
  card.append(el('h2', null, '3 · Paleta e nome'));
  const palette = el('div', 'su-palette');
  palette.id = 'su-palette';
  card.append(palette);
  const addRow = el('p');
  const addBtn = el('button', null, '+ cor');
  addBtn.addEventListener('click', () => addSwatch('#888888', false));
  addRow.append(addBtn, ' ', el('span', 'su-muted',
    'Paleta amostrada da folha — ajuste as cores e marque qual é o contorno.'));
  card.append(addRow);

  const nameRow = el('p');
  const nameLabel = el('label', null, 'Nome da skin (id): ');
  const name = document.createElement('input');
  name.type = 'text';
  name.id = 'su-name';
  name.placeholder = 'ex.: lava';
  name.maxLength = 24;
  nameLabel.append(name);
  name.addEventListener('input', checkName);
  const nameHint = el('span', 'su-muted', ' minúsculas/números/hífen; até 8 caracteres aparece inteiro na telemetria');
  nameHint.id = 'su-name-hint';
  const masterLabel = el('label');
  const master = document.createElement('input');
  master.type = 'checkbox';
  master.checked = true;
  master.id = 'su-master';
  masterLabel.append(master, ' corpo-mestre (recomendado: corpo 100% estável)');
  masterLabel.style.marginLeft = '14px';
  nameRow.append(nameLabel, nameHint, document.createElement('br'), masterLabel);
  card.append(nameRow);

  const genRow = el('p');
  const gen = el('button', 'su-primary', '⚙️ Gerar sprite');
  gen.id = 'su-generate';
  gen.addEventListener('click', generate);
  const line = el('span', null, '');
  line.id = 'su-status';
  line.style.marginLeft = '10px';
  genRow.append(gen, line);
  card.append(genRow);
  return card;
}

function renderPalette(hexes, outline) {
  const box = $('su-palette');
  box.textContent = '';
  hexes.forEach((hex) => addSwatch(hex, hex === outline));
}

function addSwatch(hex, isOutline) {
  const sw = el('div', 'su-swatch');
  const color = document.createElement('input');
  color.type = 'color';
  color.value = hex;
  const label = el('label');
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'su-outline';
  radio.checked = isOutline;
  label.append(radio, ' contorno');
  const rm = el('button', null, '×');
  rm.title = 'remover';
  rm.style.padding = '2px 8px';
  rm.addEventListener('click', () => sw.remove());
  sw.append(color, label, rm);
  $('su-palette').append(sw);
}

// Crítica ao vivo do nome: id protegido é beco sem saída lá na frente (o
// /api/integrate recusa) — melhor gritar aqui, com sugestão de saída
function checkName() {
  const hint = $('su-name-hint');
  if (!hint) return true;
  const id = slugLocal($('su-name').value);
  if (id && isBuiltinId(id)) {
    hint.textContent = ` ⛔ "${id}" é uma skin original do jogo — use outro nome (ex.: "${id}-2")`;
    hint.className = 'su-err';
    return false;
  }
  hint.textContent = ' minúsculas/números/hífen; até 8 caracteres aparece inteiro na telemetria';
  hint.className = 'su-muted';
  return true;
}

async function generate() {
  if (!guardServer()) return;
  if (selection.length !== 3) return status('Escolha exatamente 3 frames (①②③).', 'su-err');
  if (currentVariant === 'run' && !checkName()) {
    const id = slugLocal($('su-name').value);
    return status(`"${id}" é uma skin original do jogo — escolha outro nome antes de gerar (ex.: "${id}-2").`, 'su-err');
  }
  const palette = [...document.querySelectorAll('#setup-page .su-swatch')].map((sw) => ({
    hex: sw.querySelector('input[type=color]').value,
    outline: sw.querySelector('input[type=radio]').checked,
  }));
  // a fúria é da MESMA skin: herda o nome travado da corrida
  const name = currentVariant === 'fire' ? generatedName : $('su-name').value.trim();
  status(`Vetorizando a variante ${currentVariant === 'fire' ? 'de fúria' : 'de corrida'} (~20s — potrace por camada)…`);
  $('su-generate').disabled = true;
  try {
    const r = await post('/api/generate', {
      sessionId, frameIndexes: selection, palette, name,
      variant: currentVariant,
      masterBody: $('su-master').checked,
    });
    if (currentVariant === 'run') {
      // nome definitivo (o slug do servidor pode limpar caracteres)
      if (generatedName !== r.name) generated = { run: false, fire: false };
      generatedName = r.name;
      $('su-name').value = r.name;
    }
    generated[currentVariant] = true;
    showResult(r);
    status('Sprite gerado! Confira o animado e o onion-skin.', 'su-ok');
  } catch (e) {
    status(e.message, 'su-err');
  }
  $('su-generate').disabled = false;
}

// ------------------------------------------------------------ card: resultado
function buildResultCard() {
  const card = el('div', 'su-card');
  card.id = 'su-card-result';
  card.hidden = true;
  card.append(el('h2', null, '4 · Resultado'));
  const row = el('div', 'su-result-row');
  const colA = el('div');
  colA.append(el('p', 'su-muted', 'Animado (12fps, ciclo 0-1-2-1)'));
  const anim = el('div', 'su-anim');
  anim.id = 'su-anim';
  colA.append(anim);
  const colB = el('div');
  colB.append(el('p', 'su-muted', 'Onion-skin (corpo nítido = certo)'));
  const onion = el('div', 'su-anim su-onion');
  onion.id = 'su-onion';
  colB.append(onion);
  row.append(colA, colB);
  card.append(row);
  const warn = el('p', 'su-warn', '');
  warn.id = 'su-warn';
  const meta = el('p', 'su-muted', '');
  meta.id = 'su-meta';
  const variants = el('p', null, '');
  variants.id = 'su-variants';
  card.append(warn, meta, variants);
  return card;
}

function showResult(r) {
  // os SVGs vêm do NOSSO servidor local (vetorização própria) — injetar
  // markup aqui é o preview funcionar; nada disso vem de terceiros
  $('su-anim').innerHTML = r.svgs.map((s, f) => `<div class="su-fr su-fr${f}">${s}</div>`).join('');
  $('su-onion').innerHTML = r.svgs.map((s) => `<div class="su-fr">${s}</div>`).join('');
  $('su-warn').textContent = (r.warnings || []).join(' ');
  $('su-meta').textContent =
    `output/${r.name}/ · ${r.sizesKb.join(' / ')} KB · upscale ${r.upscale}×`
    + (r.diagnostics ? ` · corpo-mestre ${r.diagnostics.masterBodyUsed ? 'ligado' : 'desligado'}` : '');
  const v = $('su-variants');
  v.textContent = `Variantes geradas: corrida ${generated.run ? '✓' : '—'} · fúria ${generated.fire ? '✓' : '—'}`;
  $('su-card-result').hidden = false;
  $('su-card-unlock').hidden = false;
  $('su-card-result').scrollIntoView({ behavior: 'smooth' });
}

// -------------------------------------------------- card: desbloqueio+aplicar
function buildUnlockCard() {
  const card = el('div', 'su-card');
  card.id = 'su-card-unlock';
  card.hidden = true;
  card.append(el('h2', null, '5 · Como o jogador ganha essa skin?'));

  const dnRow = el('p');
  const dnLabel = el('label', null, 'Nome de exibição: ');
  const dn = document.createElement('input');
  dn.type = 'text';
  dn.id = 'su-display-name';
  dn.maxLength = 40;
  dn.placeholder = 'ex.: Rino de Lava';
  dn.size = 28;
  dnLabel.append(dn);
  dnRow.append(dnLabel);
  const descRow = el('p');
  const descLabel = el('label', null, 'Descrição (vitrine no hub): ');
  const desc = document.createElement('input');
  desc.type = 'text';
  desc.id = 'su-desc';
  desc.maxLength = 120;
  desc.placeholder = 'ex.: 🌋 Forjado no vulcão.';
  desc.size = 44;
  descLabel.append(desc);
  descRow.append(descLabel);
  // flag "no jogo / fora do jogo" — só faz sentido para skin que JÁ existe,
  // então a linha aparece no modo edição (na criação a skin nasce visível)
  const visRow = el('p');
  visRow.id = 'su-visible-row';
  visRow.hidden = true;
  const visLabel = el('label');
  const vis = document.createElement('input');
  vis.type = 'checkbox';
  vis.id = 'su-visible';
  vis.checked = true;
  visLabel.append(vis, ' visível no jogo (desmarcada = some do hub; reversível, ninguém perde a conquista)');
  visRow.append(visLabel);
  card.append(dnRow, descRow, visRow);

  // ---- tipos de desbloqueio
  const mkRadio = (value, labelText) => {
    const wrap = el('div', 'su-unlock-opt');
    const label = el('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'su-access';
    radio.value = value;
    radio.addEventListener('change', updateUnlockForm);
    label.append(radio, ` ${labelText}`);
    wrap.append(label);
    return { wrap, radio };
  };
  const mkNum = (id, labelText, max = 999999) => {
    const label = el('label');
    const input = document.createElement('input');
    input.type = 'number';
    input.id = id;
    input.min = 0;
    input.max = max;
    input.placeholder = '—';
    input.addEventListener('input', updateUnlockForm);
    label.append(`${labelText} `, input);
    return label;
  };
  const mkCheck = (id, labelText) => {
    const label = el('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.addEventListener('change', updateUnlockForm);
    label.append(input, ` ${labelText}`);
    return label;
  };

  const free = mkRadio('default', '🎁 Grátis — disponível para todo mundo');
  free.radio.checked = true;

  const rank = mkRadio('rank', '🏆 Pódio — exclusiva de uma posição EXATA do ranking mundial');
  const rankFields = el('div', 'su-unlock-fields');
  const rankSel = document.createElement('select');
  rankSel.id = 'su-rank';
  rankSel.style.cssText = 'font:inherit;background:#262c3a;color:#fff;border:1px solid #4a5468;border-radius:8px;padding:7px 10px';
  for (const [v, t] of [[1, '🥇 1º lugar'], [2, '🥈 2º lugar'], [3, '🥉 3º lugar']]) {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = t;
    rankSel.append(opt);
  }
  rankSel.addEventListener('change', updateUnlockForm);
  rankFields.append(rankSel, el('span', 'su-muted', 'perdeu a posição → a skin volta ao default sozinha (e retorna com o pódio)'));
  rank.wrap.append(rankFields);

  const ach = mkRadio('achievement', '🎯 Conquista — façanha em UMA corrida (permanente; preencha só o que valer)');
  const achFields = el('div', 'su-unlock-fields');
  achFields.append(
    mkNum('su-c-meters', 'correr (m):'),
    mkNum('su-c-towers', 'derrubar torres:', 99),
    mkCheck('su-c-boss', 'vencer o caçador do portão'),
    mkCheck('su-c-escaped', 'escapar do zoológico (1000m)'),
  );
  ach.wrap.append(achFields);

  const total = mkRadio('total', '📈 Totais de vida — soma de todas as corridas (permanente; preencha só o que valer)');
  const totalFields = el('div', 'su-unlock-fields');
  totalFields.append(
    mkNum('su-t-attempts', 'corridas jogadas:'),
    mkNum('su-t-wins', 'fugas completas:'),
    mkNum('su-t-animals', 'animais atropelados:'),
  );
  total.wrap.append(totalFields);

  card.append(free.wrap, rank.wrap, ach.wrap, total.wrap);

  const preview = el('p');
  preview.append(el('b', null, 'No hub o jogador vê: '));
  const prevText = el('span', 'su-ok', '');
  prevText.id = 'su-req-preview';
  preview.append(prevText);
  card.append(preview);

  const warn = el('p', 'su-warn', '');
  warn.id = 'su-unlock-warn';
  card.append(warn);

  const applyRow = el('p');
  const apply = el('button', 'su-primary', '📥 Aplicar no jogo');
  apply.id = 'su-apply';
  apply.addEventListener('click', applyFlow);
  const cancel = el('button', null, 'Cancelar edição');
  cancel.id = 'su-cancel-edit';
  cancel.hidden = true;
  cancel.style.marginLeft = '10px';
  cancel.addEventListener('click', () => resetUnlockCard());
  applyRow.append(apply, cancel);
  card.append(applyRow);

  const out = el('pre', null, '');
  out.id = 'su-apply-out';
  out.hidden = true;
  card.append(out);

  const release = el('div', 'su-release-box');
  release.id = 'su-release-box';
  release.hidden = true;
  release.textContent = '📦 A skin está na árvore de trabalho do jogo — o site ao vivo ainda não a conhece. '
    + 'Para publicar, feche uma release como sempre: commit, push, tag e smoke '
    + '(ritual em docs/04-referencia-tecnica.md §5 — inclui o bump de versão/CACHE). '
    + 'Esta página NÃO mexe em git nem em versão.';
  card.append(release);

  setTimeout(updateUnlockForm, 0);
  return card;
}

function accessFromForm() {
  const type = document.querySelector('#setup-page input[name=su-access]:checked')?.value || 'default';
  if (type === 'default') return { type: 'default' };
  if (type === 'rank') return { type: 'rank', rank: Number($('su-rank').value) };
  const num = (id) => Math.floor(Number($(id).value) || 0);
  if (type === 'achievement') {
    const condition = {};
    if (num('su-c-meters') > 0) condition.meters = num('su-c-meters');
    if (num('su-c-towers') > 0) condition.towersDowned = num('su-c-towers');
    if ($('su-c-boss').checked) condition.bossLayers = 3;
    if ($('su-c-escaped').checked) condition.escaped = true;
    return { type: 'achievement', condition };
  }
  const condition = {};
  if (num('su-t-attempts') > 0) condition.attempts = num('su-t-attempts');
  if (num('su-t-wins') > 0) condition.wins = num('su-t-wins');
  if (num('su-t-animals') > 0) condition.animals = num('su-t-animals');
  return { type: 'total', condition };
}

function updateUnlockForm() {
  const access = accessFromForm();
  const prev = $('su-req-preview');
  if (!prev) return;
  if (access.type === 'default') prev.textContent = 'Grátis — "toque para vestir".';
  else if (access.type === 'rank') prev.textContent = `🔒 só do nº ${access.rank} do mundo`;
  else if (!Object.keys(access.condition || {}).length) {
    prev.textContent = '⚠️ preencha pelo menos um critério';
    prev.className = 'su-err';
    return;
  } else {
    prev.textContent = `🔒 ${SkinSystem.requirementText({ access, desc: '' })}`;
  }
  prev.className = 'su-ok';
  const name = editingId || generatedName || '';
  $('su-unlock-warn').textContent = name.length > 8
    ? `ℹ️ id "${name}" tem ${name.length} caracteres — na telemetria ele aparece truncado ("${name.slice(0, 8)}").`
    : '';
}

async function applyFlow() {
  if (!guardServer()) return;
  const access = accessFromForm();
  if ((access.type === 'achievement' || access.type === 'total')
      && !Object.keys(access.condition).length) {
    return alert('Preencha pelo menos um critério da condição.');
  }
  const displayName = $('su-display-name').value.trim();
  if (!displayName) return alert('Dê um nome de exibição à skin.');
  const desc = $('su-desc').value.trim();
  const out = $('su-apply-out');
  const btn = $('su-apply');
  btn.disabled = true;
  out.hidden = false;
  out.textContent = '⏳ Gravando e validando (roda a suíte de testes do jogo)…';
  try {
    if (editingId) {
      const r = await post('/api/skin/update', {
        id: editingId, displayName, desc, access,
        hidden: !$('su-visible').checked,
      });
      out.textContent = `✅ "${displayName}" atualizada no registry.\n\n`
        + `Validação: ${lastLine(r.testOutput)}`;
    } else {
      if (!generated.run) throw new Error('gere a variante de corrida antes de aplicar');
      const applied = await post('/api/apply', { name: generatedName, fire: generated.fire });
      const r = await post('/api/integrate', {
        name: generatedName, displayName, desc, access, hasFire: generated.fire,
      });
      out.textContent = [
        `✅ Skin "${displayName}" no jogo!`,
        '',
        `• Arte copiada: ${applied.copied.join(', ')}`,
        '• Registrada em js/systems/SkinRegistry.js',
        '• SVGs listados no bloco do sw.js (cache offline)',
        ...(r.warnings || []).map((w) => `• ${w}`),
        '',
        `Validação: ${lastLine(r.testOutput)}`,
        '',
        `Teste agora: abra o jogo com ?debug=1 → pasta "Skins" do painel veste a "${generatedName}" sem persistir.`,
      ].join('\n');
    }
    $('su-release-box').hidden = false;
    refreshSkinList();
    if (!editingId) resetWizard();
    else resetUnlockCard();
  } catch (e) {
    out.textContent = `❌ ${e.message}\n\nNada foi alterado no jogo (a gravação é tudo-ou-nada com rollback).`;
  }
  btn.disabled = false;
}

const lastLine = (s) => (s || '').trim().split('\n').at(-1) || '';

function startEdit(skin) {
  editingId = skin.id;
  $('su-card-unlock').hidden = false;
  $('su-cancel-edit').hidden = false;
  $('su-apply').textContent = `💾 Salvar "${skin.id}"`;
  $('su-display-name').value = skin.name || '';
  $('su-desc').value = skin.desc || '';
  $('su-visible-row').hidden = false;
  $('su-visible').checked = !skin.hidden;
  const a = skin.access || { type: 'default' };
  const radio = document.querySelector(`#setup-page input[name=su-access][value="${a.type}"]`);
  if (radio) radio.checked = true;
  if (a.type === 'rank') $('su-rank').value = a.rank;
  const c = a.condition || {};
  $('su-c-meters').value = c.meters || '';
  $('su-c-towers').value = c.towersDowned || '';
  $('su-c-boss').checked = (c.bossLayers || 0) >= 3;
  $('su-c-escaped').checked = Boolean(c.escaped);
  $('su-t-attempts').value = c.attempts || '';
  $('su-t-wins').value = c.wins || '';
  $('su-t-animals').value = c.animals || '';
  updateUnlockForm();
  $('su-card-unlock').scrollIntoView({ behavior: 'smooth' });
}

// NÃO esconde o card: o resultado/lembrete de release ficam visíveis
function resetUnlockCard() {
  editingId = null;
  $('su-cancel-edit').hidden = true;
  $('su-apply').textContent = '📥 Aplicar no jogo';
  $('su-visible-row').hidden = true;
  $('su-visible').checked = true;
}

function resetWizard() {
  sessionId = null;
  selection = [];
  lastB64 = null;
  generatedName = null;
  generated = { run: false, fire: false };
  setVariantSafe('run');
  $('su-card-frames').hidden = true;
  $('su-card-options').hidden = true;
  $('su-card-result').hidden = true;
  $('su-name').value = '';
  $('su-name').disabled = false;
  checkName();
  $('su-display-name').value = '';
  $('su-desc').value = '';
}

// setVariant sem o guard de "corrida primeiro" (uso interno do reset)
function setVariantSafe(v) {
  currentVariant = v;
  $('su-tab-run').classList.toggle('su-active', v === 'run');
  $('su-tab-fire').classList.toggle('su-active', v === 'fire');
}

function status(msg, cls) {
  const line = $('su-status');
  if (!line) return;
  line.textContent = msg;
  line.className = cls || '';
}
