window.__frVoo && window.__frVoo('v6-module');
// /?stats: painel público de estatísticas — sem Phaser, sem cenas.
// O index.html só injeta o script do Phaser fora do modo stats, e as cenas
// referenciam window.Phaser na definição das classes — por isso o boot do
// jogo importa tudo dinamicamente, só quando o global existe.
if (new URLSearchParams(location.search).has('setup')) {
  // /?setup=0929: estúdio de skins do dono (upload → desbloqueio → aplicar).
  // Página estática como o /?stats — a escrita real acontece no servidor
  // local do gerador (localhost:3210); sem ele, a página só instrui.
  document.body.classList.add('setup-mode');
  import('./setup/SetupPage.js').then((m) => m.render());
} else if (new URLSearchParams(location.search).has('stats')) {
  document.body.classList.add('stats-mode');
  (async () => {
    // Espelha os totais DESTE aparelho antes de agregar: quem morre e vem
    // direto para cá não perde nada (o envio do fim de corrida morre se a
    // página navegar antes de completar)
    try {
      const [{ StatsSystem }, { StorageManager }] = await Promise.all([
        import('./systems/StatsSystem.js'),
        import('./utils/StorageManager.js'),
      ]);
      if (StorageManager.getAttempts() > 0) await StatsSystem.send();
    } catch (e) { /* offline — o painel mostra o que houver no servidor */ }
    (await import('./stats/StatsDashboard.js')).render();
  })();
} else {
  // v1.9.1: se o próprio boot falhar (import quebrado, arquivo antigo no
  // cache do SW, Phaser fora do ar), a promise do bootGame rejeita e NADA
  // acontece na tela — home congelada no vazio. Aqui a falha é certa e
  // conhecida, então derruba direto, sem os filtros do unhandledrejection.
  bootGame().catch((e) => derrubarSessao('boot: ' + descreverErro(e)));
}

// ==================== v1.9.1: REDE DE PROTEÇÃO GLOBAL ====================
// O bug que motivou tudo: os jogadores relataram "o jogo trava e não abre
// mais". Uma exceção QUALQUER dentro do update() mata o loop de rAF do
// Phaser — a tela congela para sempre, sem mensagem nenhuma, a corrida se
// perde e a tentativa já tinha sido contada no startRun. O projeto não tinha
// window.onerror, nem unhandledrejection, nem try/catch no update: zero rede.
// Divisão de trabalho: aqui ficam os handlers globais (este arquivo não tem
// referência à cena); quem encerra com dignidade é a GameScene.crashToHome,
// exposta como window.__frCrash no fim do create().

// IDEMPOTÊNCIA (crítica): um erro dentro do update dispara ~60 vezes por
// segundo. Sem esta flag de módulo, a rede agiria 60x/s. Ela age UMA vez e
// depois todo o resto é ignorado em silêncio.
let sessaoDerrubada = false;

function descreverErro(e) {
  try {
    if (!e) return 'erro desconhecido';
    return String(e.message || e.name || e);
  } catch (err) { return 'erro desconhecido'; }
}

function derrubarSessao(motivo) {
  if (sessaoDerrubada) return;
  sessaoDerrubada = true;
  try { console.error('[FURIOUS RHINO] sessão derrubada:', motivo); } catch (e) { /* console tampado */ }

  // Caminho nobre: a cena está de pé e sabe encerrar direito — devolve a
  // tentativa, NÃO grava recorde, NÃO envia ao pódio, NÃO grava a corrida.
  // Checagem de tipo porque a cena pode nem ter subido ainda (falha no boot).
  try {
    if (typeof window.__frCrash === 'function') {
      window.__frCrash(motivo);
      return;
    }
  } catch (e) { /* a cena morreu junto com o jogo — cai no plano B */ }

  // Plano B: overlay na unha. Falha antes da cena existir (ou cena inútil)
  // não pode deixar o jogador diante de uma tela morta sem explicação.
  try {
    const el = document.getElementById('crash-overlay');
    if (el) el.style.display = 'flex';
  } catch (e) { /* DOM indisponível: não há mais nada a fazer */ }
}

// v1.9.1: REGRA DA CASA Nº 1 — "telemetria e ranking são acessórios". O
// Firestore fora do ar, o celular no elevador ou uma regra negada JAMAIS
// podem mostrar "o jogo travou". Uma promise rejeitada não diz de onde veio,
// então reconhecemos a assinatura de rede: DOMException (fetch/abort), os
// campos `code`/`status` que só erros de servidor (Firebase/HTTP) carregam, e
// o texto das mensagens de rede dos três navegadores ("Failed to fetch" no
// Chrome, "Load failed" no Safari, "NetworkError..." no Firefox).
const ASSINATURA_DE_REDE =
  /fetch|network|offline|firestore|firebase|permission|denied|abort|timeout|load failed|quota|storage|xhr|cors|service ?worker/i;

function pareceErroDeRede(reason) {
  try {
    if (!reason) return true;                       // sem motivo = sem prova
    if (typeof DOMException !== 'undefined' && reason instanceof DOMException) return true;
    if (reason.code !== undefined || reason.status !== undefined) return true;
    return ASSINATURA_DE_REDE.test(String(reason.message || reason.name || reason));
  } catch (e) {
    return true; // nem inspecionar deu certo: na dúvida, não derruba
  }
}

// Só um erro de PROGRAMAÇÃO derruba a sessão: variável indefinida, método que
// não existe, índice fora de faixa — o que de fato mata o update(). Qualquer
// outra coisa (string solta, Error genérico, DOMException, undefined) fica de
// fora: não dá para atribuir ao jogo com segurança, e um alarme falso ("o
// jogo travou" com o jogo rodando) é MUITO pior do que um silêncio a mais.
function ehBugDeVerdade(reason) {
  const bug = reason instanceof TypeError || reason instanceof ReferenceError
    || reason instanceof RangeError || reason instanceof SyntaxError;
  return bug && !pareceErroDeRede(reason);
}

function instalarRedeDeProtecao() {
  // Erro SÍNCRONO solto — exatamente o caso do update() que congelava a tela.
  window.addEventListener('error', (ev) => {
    // Falha de RECURSO (um .svg da arte que não carregou) não é bug de jogo.
    // Esses eventos não borbulham, então só chegariam aqui com captura — mas
    // a guarda é barata e a home tem uma dúzia de <img> de arte.
    if (ev && ev.target && ev.target !== window) return;
    derrubarSessao(descreverErro(ev && (ev.error || ev)));
  });

  // Promise rejeitada sem catch. Aqui somos DELIBERADAMENTE conservadores:
  // portão 1 — só com a corrida em andamento (body.started, que o startRun
  // marca). Todo o assíncrono acessório (pódio, notícias, desafios, stats,
  // geo) roda na HOME; derrubar a home por uma promise de rede seria trocar
  // um jogo perfeitamente vivo por um alarme falso.
  // portão 2 — só com assinatura de bug de código, nunca de rede.
  window.addEventListener('unhandledrejection', (ev) => {
    try {
      if (!document.body.classList.contains('started')) return;
      if (!ehBugDeVerdade(ev && ev.reason)) return;
      derrubarSessao('promise: ' + descreverErro(ev && ev.reason));
    } catch (e) { /* o handler jamais pode ser a origem de um erro novo */ }
  });
}

async function bootGame() {
  // v1.9.1: a rede é instalada AQUI, primeira linha do boot do jogo, e não no
  // topo do arquivo, por duas razões: (a) /?stats e /?setup são páginas
  // estáticas sem cena e sem corrida — um overlay dizendo "o jogo travou" em
  // cima do painel de estatísticas seria mentira; (b) estando antes do await
  // dos imports, ela já cobre falhas do próprio carregamento das cenas.
  instalarRedeDeProtecao();

  // v1.9.6: A FAXINA DO APARELHO, antes de qualquer coisa que LEIA o
  // `runs[]`. Ela roda aqui, e não no create() da cena, porque a home é
  // pintada logo abaixo e os cards da Arena de Desafios já leem a janela
  // local — se a faxina viesse depois, o primeiro placar do dia ainda sairia
  // com a corrida errada. É idempotente (marca própria no localStorage) e
  // acessória: se falhar, o jogo segue e ela tenta no próximo boot.
  try {
    const { LeaderboardSystem } = await import('./systems/LeaderboardSystem.js');
    LeaderboardSystem.purgeUnprovenLocal();
  } catch (e) { /* faxina é acessório — nunca segura o boot */ }

  // v1.9.7 (CASO 2, M4): pede ao navegador para NÃO despejar o armazenamento
  // deste site sob pressão de espaço. Cache despejado era metade da receita do
  // "não foi possível acessar a página" — a outra metade era o sw.js devolver
  // undefined no miss. Fire-and-forget: cada navegador decide sozinho (PWA
  // instalado quase sempre ganha), e uma recusa não muda nada do que já era.
  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
  } catch (e) { /* indiferente — proteção extra, não requisito */ }

  // v1.9.3: A HOME VEM PRIMEIRO. Até a v1.9.2 a tela inicial só era pintada
  // dentro do GameScene.create(), ou seja, depois de o Phaser baixar 150
  // SVGs — no celular isso deixava a tela vazia por 4,6 s DEPOIS de a página
  // estar pronta. A home é DOM + localStorage e não usa nenhuma textura do
  // Phaser, então não há motivo para ela esperar o motor.
  //
  // Este import é leve de propósito (nada de Phaser.Scene na cadeia dele) e
  // vem ANTES do Promise.all das cenas — que é o await caro.
  const { HomeScreen } = await import('./home/HomeScreen.js');
  HomeScreen.paintFromCache();
  // O toque também é armado agora: quem tocar antes de o motor ficar pronto
  // tem o toque GUARDADO, e a corrida começa sozinha quando a cena chega.
  HomeScreen.armStart();
  window.__frVoo && window.__frVoo('v7-home');

  // v1.9.8 (CASO 2): MODO SEGURO — /?safe=1 para na home, sem Phaser e sem
  // as 150 texturas. Bisseção de crash: se o seguro abre e o normal morre,
  // o assassino está do motor para baixo; se nem o seguro abre, está no
  // HTML/CSS/boot — e a caixa-preta (/?voo=1) diz em qual marco.
  if (window.__frSafe) {
    try { document.getElementById('game-version').textContent += ' · MODO SEGURO'; } catch (e) { /* opcional */ }
    return;
  }

  const [{ Constants }, { BootScene }, { GameScene }] = await Promise.all([
    import('./utils/Constants.js'),
    import('./scenes/BootScene.js'),
    import('./scenes/GameScene.js'),
  ]);

  const config = {
    // v1.9.9 (CASO 2): /?canvas=1 força o renderer CANVAS — o teste que
    // separa "WebGL do WebKit 26 morrendo" de "qualquer outra coisa".
    type: window.__frCanvas ? Phaser.CANVAS : Phaser.AUTO,
    parent: 'game-container',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: Constants.GAME_WIDTH,
      height: Constants.GAME_HEIGHT,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: Constants.GRAVITY },
        debug: false,
      },
    },
    scene: [BootScene, GameScene],
    input: {
      activePointers: 2,
    },
  };

  const game = new Phaser.Game(config);
  window.__frVoo && window.__frVoo('v8-engine');

  // ?debug=1 liga o painel de tuning + hitboxes (ver TuningPanel.js)
  const debugOn = new URLSearchParams(location.search).get('debug') === '1';
  game.registry.set('debug', debugOn);
  if (debugOn) window.game = game; // acesso pelo console/testes automatizados

  // iOS Safari: o viewport é recalculado com atraso ao girar o aparelho;
  // força o Scale Manager a se re-medir depois da rotação
  window.addEventListener('orientationchange', () => {
    setTimeout(() => game.scale.refresh(), 300);
  });
}

// Offline play: register the service worker (secure contexts only —
// on a LAN IP over http the SW simply won't register, game still works)
if ('serviceWorker' in navigator &&
    (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
