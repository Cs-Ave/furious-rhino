// E2E num navegador real (Playwright/Chromium):
//   node tools/e2e-stats.mjs   (requer o jogo servido em localhost:3000)
// Cobre: telemetria (escrita real no Firestore com o playerId de sonda
// 'claude-rules-check-01' — não cria poluição nova), portão dos 1000m
// (continuar E sair) e a página /?stats (filtro, recorde, funil dinâmico).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = 'http://localhost:3000';
// Marca de início, para o assert final saber o que a suíte criou (bloco 7)
const startedAt = new Date().toISOString();
// Chave do modo detalhado do painel (o código guarda só o SHA-256 dela —
// ver STATS_KEY_HASH em js/stats/StatsDashboard.js)
const STATS_KEY = '0929';
const results = [];
const ok = (name, cond, extra = '') =>
  results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);

const browser = await chromium.launch();

// ⚠️ TODO contexto criado aqui PRECISA nascer com um playerId de sonda.
// A tela inicial dispara `StatsSystem.send()` sempre que `attempts > 0`, e um
// contexto sem esta semente grava um doc de verdade na coleção de PRODUÇÃO
// (aconteceu: 16 docs falsos criados numa tarde). Ids `claude-*` são filtrados
// pelo painel e pelo resumo diário — os aleatórios, não.
const PROBE_ID = 'claude-rules-check-01';
async function probeContext(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...opts });
  await ctx.addInitScript((id) => {
    localStorage.setItem('furious_rhino_player_id', id);
    // A suíte inicia dezenas de corridas: sem isto, cada uma vira um push de
    // "fulano começou a jogar" no celular do dono
    localStorage.setItem('furious_rhino_notify_off', '1');
  }, PROBE_ID);
  return ctx;
}

const context = await probeContext();

// Totais locais MAIORES que os do doc-sonda: as regras exigem monotonia e
// o doc acumula a cada execução da suíte — sementes fixas quebrariam na
// rodada seguinte. Derivar do relógio garante crescimento entre rodadas.
await context.addInitScript(() => {
  const base = Math.floor(Date.now() / 1000) - 1753000000; // cresce 1/s
  // record gigante → bestM trava no teto (10000) em toda rodada: monotonia
  // garantida no servidor e nenhuma corrida do teste gera "novo recorde"
  localStorage.setItem('furious_rhino_record', String(base));
  localStorage.setItem('furious_rhino_attempts', String(base));
  localStorage.setItem('furious_rhino_playtime_s', String(base));
  localStorage.setItem('furious_rhino_wins', String(base));
  localStorage.setItem('furious_rhino_deaths', JSON.stringify(
    { t1: 2, t2: 2, t3: 1, t4: 0, t5: 1, t6: 0, wall: 1, spike: 1, animal: 1, dart: 1, tower: 2, fall: 0 }
  ));
  localStorage.setItem('furious_rhino_geo', JSON.stringify(
    { ok: true, country: 'BR', region: 'Rio de Janeiro', city: 'Rio de Janeiro', fetchedAt: Date.now() }
  ));
});

async function newGamePage() {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  return { page, errors };
}

// v1.5.0: o alerta de instalação abre sobre a tela inicial e, enquanto
// houver modal aberto, nenhum toque inicia a corrida (guarda `modal-open`)
async function startGame(page) {
  const pwa = page.locator('#pwa-modal');
  if (await pwa.isVisible().catch(() => false)) {
    await page.click('#pwa-skip');
    await page.waitForTimeout(200);
  }
  await page.locator('#start-screen').click({ position: { x: 640, y: 650 } });
  await page.waitForTimeout(800);
}
const fatal = (errors) => errors.filter((e) => !/net::|Failed to load resource|ERR_/.test(e));

// ---------- 1. Tela de início dispara o reenvio e o Firestore aceita ----------
{
  // Listener de rede ANTES do goto — a escrita pode sair nos primeiros ms
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const writes = [];
  page.on('response', async (res) => {
    if (res.url().includes('firestore.googleapis.com') && res.request().method() === 'POST') {
      let body = '';
      if (!res.ok()) { try { body = (await res.text()).slice(0, 200); } catch (e) { /* stream */ } }
      writes.push({ status: res.status(), body });
    }
  });
  await page.goto(`${BASE}/?debug=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000); // SDK dinâmico + reenvio da tela de início

  ok('reenvio na tela de início disparou', writes.length > 0,
    writes.map((w) => `${w.status}${w.body ? ' ' + w.body : ''}`).join(' | ') || 'NENHUMA escrita');
  ok('Firestore aceitou a escrita (200)', writes.some((w) => w.status === 200));
  ok('sem erros de JS na tela de início', fatal(errors).length === 0, fatal(errors).slice(0, 2).join(' | '));
  await page.close();
}

// ---------- 2. Portão dos 1000m: cruzamento DIRETO (sem parada) ----------
{
  const { page, errors } = await newGamePage();
  await startGame(page);
  await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    s.rhino.getSprite().body.reset(39600, 500);
  });

  // v1.4: sem modal — o rino cruza o portão e o endless começa na passada
  let crossed = true;
  try {
    await page.waitForFunction(() => {
      const s = window.game.scene.keys.GameScene;
      return s.gateReached;
    }, { timeout: 6000 });
  } catch (e) { crossed = false; }
  ok('portão: cruzou os 1000m', crossed);

  // Checagem RÁPIDA: antes de o rino alcançar os obstáculos do t5
  // (spawns retomam em WIN+1000) — esperar demais deixa ele morrer sozinho
  const state = await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    return {
      noModal: document.getElementById('gate-modal') === null,
      running: !s.physics.world.isPaused && !s.gameOver,
      escaped: s.escaped === true,
      infinity: document.getElementById('progress-infinity').offsetParent !== null,
      x: Math.round(s.rhino.getSprite().x),
    };
  });
  ok('portão: modal de escolha não existe mais', state.noModal);
  ok('portão: corrida segue sem pausa ao cruzar', state.running, `x=${state.x}`);
  ok('portão: fuga registrada no cruzamento', state.escaped);
  ok('portão: selo ∞ apareceu na barra', state.infinity);

  // O corte do spawn é uma janela avaliada quando a câmera alcança a região:
  // esperar (poucos frames) em vez de fotografar o exato frame do cruzamento
  let spawnOk = true;
  try {
    await page.waitForFunction(() => {
      const s = window.game.scene.keys.GameScene;
      return s.spawnManager.nextSpawnX >= 41000;
    }, { timeout: 4000 });
  } catch (e) { spawnOk = false; }
  ok('portão: spawn retomou no modo infinito (nextSpawnX >= 41000)', spawnOk);

  // Morte no modo infinito → tier t6 (teto) + reconhecimento da fuga
  await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    s.rhino.getSprite().body.reset(41500, 500);
    s.endGame(false, 'spike');
  });
  await page.waitForTimeout(800);
  const deaths = await page.evaluate(() => localStorage.getItem('furious_rhino_deaths'));
  // Sem a parada do modal, o rino pode morrer sozinho antes da morte forçada
  // (endGame tem guard de reentrada) — exigir apenas t6 >= 1
  ok('portão: morte no infinito registrada em t6', /"t6":[1-9]/.test(deaths || ''), deaths || '');
  const escapeMsg = await page.locator('#gate-escape-message').textContent();
  ok('portão: game over reconhece a fuga', /escapou/.test(escapeMsg), escapeMsg);
  ok('sem erros de JS (cruzamento)', fatal(errors).length === 0, fatal(errors).slice(0, 2).join(' | '));
  await page.close();
}

// ---------- 3. Fim do mundo (10.000m): LENDA com cutscene ----------
{
  const { page, errors } = await newGamePage();
  await startGame(page);
  await page.evaluate(() => {
    const s = window.game.scene.keys.GameScene;
    s.rhino.getSprite().body.reset(399500, 500);
  });

  // 1º frame cruza o portão (sem parar); no frame seguinte bate no fim do
  // mundo e a vitória formal (cutscene) dispara
  let legendOk = true;
  try {
    await page.waitForFunction(() => {
      const s = window.game.scene.keys.GameScene;
      return s.legend && s.won;
    }, { timeout: 6000 });
  } catch (e) { legendOk = false; }
  ok('lenda: fim do mundo encerra com vitória', legendOk);

  const banner = await page.evaluate(() => {
    const el = document.getElementById('victory-banner');
    return { shown: !el.hidden, text: el.textContent };
  });
  ok('lenda: banner da cutscene é LENDA', banner.shown && /LENDA/.test(banner.text), banner.text);

  let winOk = true;
  try {
    await page.waitForSelector('#game-win', { state: 'visible', timeout: 8000 });
  } catch (e) { winOk = false; }
  ok('lenda: overlay de vitória após a cutscene', winOk);
  if (winOk) {
    const dist = await page.locator('#win-final-score').textContent();
    ok('lenda: distância ~10000m', parseInt(dist, 10) >= 9980, `${dist}m`);
  }
  ok('sem erros de JS (lenda)', fatal(errors).length === 0, fatal(errors).slice(0, 2).join(' | '));
  await page.close();
}

// ---------- 4. Página /?stats: filtro, recorde e funil dinâmico ----------
{
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?stats`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const body = await page.locator('#stats-page').textContent();
  ok('painel: renderizou dados', /Visão geral/.test(body), body.slice(0, 60));
  ok('painel: card de recorde com nome', /recorde —/.test(body));
  ok('painel: funil com degrau do portão (1000m)', /1000m 🗽/.test(body));

  // v1.6.1: o rolo único virou abas. Sem chave são 5 (sem "Jogadores").
  const tabs = page.locator('.stats-tabs button');
  ok('painel: 5 abas no modo público', await tabs.count() === 5, `${await tabs.count()}`);
  ok('painel: sem chave não expõe a aba Jogadores',
    !(await page.locator('.stats-tabs').textContent()).includes('Jogadores'));

  // O gráfico pedido na v1.6.1 fica na Visão geral
  ok('painel: gráfico de jogadores/dia × execuções/dia',
    /Jogadores únicos × execuções por dia/.test(body));
  ok('painel: desenha SVG de verdade', await page.locator('.stats-content svg').count() > 0);

  // Conteúdo que MUDOU de aba: causas e tiers agora vivem em "Dificuldade"
  await tabs.nth(1).click();
  await page.waitForTimeout(600);
  const dif = await page.locator('.stats-content').textContent();
  ok('aba Dificuldade: categoria Torre', /Torre/.test(dif));
  ok('aba Dificuldade: tiers do modo infinito', /Tier 5/.test(dif) && /Tier 6/.test(dif));
  ok('aba Dificuldade: histograma de mortes', /Onde as corridas terminam/.test(dif));
  ok('aba Dificuldade: heatmap causa × distância', /Causa × faixa de distância/.test(dif));

  // O filtro de período re-renderiza sem quebrar
  await page.locator('.stats-period button').nth(2).click(); // 7 dias
  await page.waitForTimeout(600);
  ok('painel: filtro de período aplica',
    await page.locator('.stats-period button.on').first().textContent() === '7 dias');

  // Todas as abas renderizam com dado real
  for (let i = 0; i < 5; i++) {
    await tabs.nth(i).click();
    await page.waitForTimeout(500);
    const text = await page.locator('.stats-content').textContent();
    ok(`aba ${i + 1} renderiza conteúdo`, text.length > 120, `${text.length} chars`);
  }

  ok('painel: sem chave não expõe a lista de jogadores',
    await page.locator('.players-table').count() === 0);
  ok('sem erros de JS no /?stats', errors.filter((e) => !/net::|ERR_/.test(e)).length === 0,
    errors.slice(0, 2).join(' | '));
  await page.close();
}

// ---------- 4b. Resiliência: telemetria quebrada NÃO trava o jogo ----------
// Cenário real da v1.5.0: cache do navegador servindo módulos antigos (sem
// as funções novas) — o TypeError acontecia dentro do endGame e o jogo
// congelava sem overlay. Telemetria e ranking são acessórios.
{
  const { page, errors } = await newGamePage();
  await page.evaluate(async () => {
    const a = await import('./js/systems/StatsSystem.js');
    delete a.StatsSystem.recordRun;
    const l = await import('./js/systems/LeaderboardSystem.js');
    delete l.LeaderboardSystem.checkName;   // v1.5.0
    delete l.LeaderboardSystem.isNameTaken;
    delete l.LeaderboardSystem.rename;
  });
  await page.click('#pwa-skip');

  await page.click('#identity-btn');
  await page.waitForTimeout(300);
  await page.fill('#nickname-input', 'CacheVelho');
  await page.click('#nickname-save');
  // Espera a condição (a consulta real leva ~1-3s) em vez de um tempo fixo
  let closed = true;
  try {
    await page.waitForFunction(
      () => !document.body.classList.contains('modal-open'), { timeout: 8000 });
  } catch (e) { closed = false; }
  const saved = await page.evaluate(() => ({
    name: localStorage.getItem('furious_rhino_player_name'),
    warn: document.getElementById('invite-status').textContent,
  }));
  ok('resiliência: salvar apelido não prende o modal',
    closed && saved.name === 'CacheVelho', saved.name || 'sem nome');
  ok('resiliência: avisa que não deu para conferir o apelido',
    /não deu para conferir/.test(saved.warn), saved.warn || '(sem aviso)');

  await startGame(page);
  await page.evaluate(() => { window.game.scene.keys.GameScene.endGame(false, 'wall'); });
  await page.waitForTimeout(1200);
  const over = await page.evaluate(() =>
    getComputedStyle(document.getElementById('game-over')).display);
  ok('resiliência: game over aparece mesmo com telemetria quebrada', over === 'block', over);
  ok('sem erros de JS (resiliência)', fatal(errors).length === 0, fatal(errors).slice(0, 2).join(' | '));
  await page.close();
}

// ---------- 5. Painel detalhado (/?stats=<chave>): lista + ficha ----------
{
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?stats=${STATS_KEY}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // v1.6.1: com a chave aparece a 6ª aba, e a lista mora dentro dela
  const tabs = page.locator('.stats-tabs button');
  ok('detalhado: 6ª aba "Jogadores" liberada pela chave', await tabs.count() === 6);
  await tabs.nth(5).click();
  await page.waitForTimeout(600);

  const rows = page.locator('.players-table tbody tr');
  ok('detalhado: tabela de jogadores renderizou', await rows.count() > 0, `${await rows.count()} linhas`);
  ok('detalhado: campo de busca presente', await page.locator('#stats-search').count() === 1);

  // Ordenação: clicar em "Recorde" inverte a ordem (padrão é desc)
  const firstBefore = await rows.first().textContent();
  await page.locator('.players-table th').nth(1).click();
  await page.waitForTimeout(300);
  const firstAfter = await rows.first().textContent();
  ok('detalhado: ordenar por coluna reordena', firstBefore !== firstAfter);

  // Busca por um apelido inexistente esvazia a tabela
  await page.fill('#stats-search', 'zzz-nao-existe-zzz');
  await page.waitForTimeout(300);
  const emptyMsg = await page.locator('.players-table tbody').textContent();
  ok('detalhado: busca filtra a tabela', /Nenhum jogador/.test(emptyMsg), emptyMsg.slice(0, 40));
  await page.fill('#stats-search', '');
  await page.waitForTimeout(300);

  // Ficha individual
  await rows.first().click();
  await page.waitForTimeout(600);
  const ficha = await page.locator('#stats-page').textContent();
  ok('ficha: evolução das execuções', /Evolução das últimas execuções/.test(ficha));
  ok('ficha: aparelhos usados', /Aparelhos usados/.test(ficha));
  ok('ficha: mortes por etapa e causa', /Mortes por etapa/.test(ficha) && /Mortes por causa/.test(ficha));
  ok('ficha: botão de voltar presente', await page.locator('.stats-back').count() === 1);
  await page.click('.stats-back');
  await page.waitForTimeout(500);
  ok('ficha: voltar reconstrói a lista', await page.locator('.players-table').count() === 1);
  ok('sem erros de JS no painel detalhado', errors.filter((e) => !/net::|ERR_/.test(e)).length === 0,
    errors.slice(0, 2).join(' | '));
  await page.close();
}

// ---------- 6. Resumo do jogador + compartilhamento (v1.6.1) ----------
// Contexto PRÓPRIO, sem a semente de totais: ela reescreve record e attempts
// a cada carga de página e apagaria os valores deste bloco no reload. O
// playerId de sonda continua valendo (probeContext) — sem ele este bloco
// gravaria um doc real na produção a cada execução da suíte.
{
  const ctx = await probeContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: 'networkidle' });

  // Semeia um histórico local para o modal ter o que mostrar
  await page.evaluate(() => {
    sessionStorage.setItem('furious_rhino_pwa_prompted', '1'); // some com o modal do PWA
    const now = Math.floor(Date.now() / 1000);
    const runs = [];
    for (let i = 0; i < 20; i++) {
      runs.push({
        t: now - (20 - i) * 3600, m: 80 + i * 55, s: 20 + i,
        c: ['wall', 'spike', 'animal', 'dart'][i % 4],
        w: i % 3, r: i % 2, o: i % 5 === 0 ? 1 : 0, a: i % 4,
        j: 20 + i, d: Math.max(0, i - 2), x: i % 6, k: 1, v: '1.6.1',
      });
    }
    localStorage.setItem('furious_rhino_runs', JSON.stringify(runs));
    localStorage.setItem('furious_rhino_record', '1145');
    localStorage.setItem('furious_rhino_attempts', '20');
    localStorage.setItem('furious_rhino_wins', '2');
    localStorage.setItem('furious_rhino_playtime_s', '1830');
    localStorage.setItem('furious_rhino_medals', JSON.stringify(['first_run', 'escape']));
    localStorage.setItem('furious_rhino_deaths', JSON.stringify({
      t1: 4, t2: 6, t3: 5, t4: 3, t5: 2, t6: 1,
      wall: 9, spike: 5, animal: 3, dart: 2, tower: 1, fall: 1,
    }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  await page.click('#mystats-btn');
  await page.waitForTimeout(900);
  ok('meu resumo: modal abre', await page.isVisible('#mystats-modal'));
  const body = await page.textContent('#mystats-body');
  ok('meu resumo: recorde', /1145m/.test(body));
  ok('meu resumo: onde você morre', /Onde você morre/.test(body));
  ok('meu resumo: mecânicas da v1.6.1', /Suas mecânicas/.test(body));
  ok('meu resumo: medalhas', /Medalhas: 2\//.test(body));
  ok('meu resumo: desenha a evolução em SVG',
    await page.locator('#mystats-body svg').count() > 0);

  // Texto de compartilhamento em markdown do WhatsApp
  const share = await page.evaluate(async () => {
    const mod = await import('/js/stats/MyStats.js');
    return { perfil: mod.shareText(null), corrida: mod.shareText({ distance: 1145, escaped: true }) };
  });
  ok('compartilhar: perfil em negrito do WhatsApp', /\*1145m\*/.test(share.perfil));
  ok('compartilhar: perfil cita as execuções', /20 execuções/.test(share.perfil));
  ok('compartilhar: corrida conta a fuga', /ESCAPEI/.test(share.corrida));

  await page.click('#mystats-close');
  await page.waitForTimeout(300);
  ok('meu resumo: modal fecha', !(await page.isVisible('#mystats-modal')));

  // Notificações: as três travas que impedem um push indevido.
  // ⚠️ NENHUM assert aqui pode publicar de verdade — o tópico do repositório
  // é o do dono, e um teste que toca o celular dele a cada execução é um bug.
  const notify = await page.evaluate(async () => {
    const { NotifySystem } = await import('/js/systems/NotifySystem.js');
    const cfg = await NotifySystem.config();
    const semSilencio = { ...cfg };

    // 1. aparelho silenciado (é o estado desta suíte, via addInitScript)
    const silenciado = NotifySystem.isSilenced();
    const bloqueadoPorAparelho = await NotifySystem.post('onStart', { title: 'x', message: 'y' });

    // 2. tópico vazio bloqueia mesmo com o aparelho liberado
    NotifySystem.setSilenced(false);
    NotifySystem._cfg = { ...semSilencio, topic: '' };
    const bloqueadoPorTopico = await NotifySystem.post('onStart', { title: 'x', message: 'y' });

    // 3. evento desligado na config bloqueia
    NotifySystem._cfg = { ...semSilencio, topic: 'nunca-usado', onStart: false };
    const bloqueadoPorEvento = await NotifySystem.post('onStart', { title: 'x', message: 'y' });

    NotifySystem.setSilenced(true); // devolve a suíte ao estado seguro
    NotifySystem._cfg = semSilencio;
    return {
      silenciado, bloqueadoPorAparelho, bloqueadoPorTopico, bloqueadoPorEvento,
      quietMeiaNoite: NotifySystem.isQuiet({ quietHours: [0, 24] }),
      quietDesligado: NotifySystem.isQuiet({ quietHours: [0, 0] }),
    };
  });
  ok('ntfy: a suíte roda com o aparelho silenciado', notify.silenciado === true);
  ok('ntfy: aparelho silenciado não publica', notify.bloqueadoPorAparelho === false);
  ok('ntfy: tópico vazio não publica', notify.bloqueadoPorTopico === false);
  ok('ntfy: evento desligado não publica', notify.bloqueadoPorEvento === false);
  ok('ntfy: faixa de silêncio funciona', notify.quietMeiaNoite === true);
  ok('ntfy: faixa [0,0] desliga o silêncio', notify.quietDesligado === false);

  ok('sem erros de JS no resumo do jogador',
    errors.filter((e) => !/net::|ERR_/.test(e)).length === 0, errors.slice(0, 2).join(' | '));
  await ctx.close();
}

// ---------- 7. A suíte NÃO pode sujar a produção ----------
// Regressão de verdade: um contexto sem o playerId de sonda gravou 16 docs
// falsos na coleção `stats` numa tarde, e ninguém percebeu até os números do
// painel pularem. Este assert compara o antes e o depois.
{
  const key = readFileSync(new URL('../js/firebase-config.js', import.meta.url), 'utf8')
    .match(/apiKey:\s*'([^']+)'/)[1];
  const url = 'https://firestore.googleapis.com/v1/projects/furious-rhino' +
    `/databases/(default)/documents/stats?pageSize=300&key=${key}`;
  let novos = [];
  try {
    let token = '';
    const ids = [];
    for (let i = 0; i < 40; i++) {
      const res = await fetch(url + (token ? `&pageToken=${token}` : ''));
      const data = await res.json();
      for (const doc of data.documents || []) {
        ids.push({ id: doc.name.split('/').pop(), created: doc.createTime });
      }
      token = data.nextPageToken || '';
      if (!token) break;
    }
    novos = ids.filter((d) => d.created >= startedAt && !/^claude-/.test(d.id));
  } catch (e) {
    novos = null; // offline: não dá para afirmar nada
  }
  ok('a suíte não criou doc de produção em stats',
    novos === null || novos.length === 0,
    novos === null ? '(sem rede — não verificado)' : novos.map((d) => d.id).join(', '));
}

await browser.close();
console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
