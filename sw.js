// Network-first service worker: always serves fresh files while online
// (essential during development), falls back to cache for offline play.
const CACHE = 'furious-rhino-v197';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './js/game.js',
  './js/firebase-config.js',
  './js/notify-config.js',
  './js/utils/Constants.js',
  './js/utils/StorageManager.js',
  './js/art/ArtManifest.js',
  './js/art/SpriteParams.js',
  './art/rhino-run-0.svg',
  './art/rhino-run-1.svg',
  './art/rhino-run-2.svg',
  './art/rhino-face-full.svg',
  './art/rhino-face-empty.svg',
  './art/fury-fire-full.svg',
  './art/fury-fire-empty.svg',
  './art/animal-lion.svg',
  './art/animal-lion-run-1.svg',
  './art/animal-zebra.svg',
  './art/animal-zebra-air.svg',
  './art/animal-monkey.svg',
  './art/animal-monkey-air.svg',
  './art/animal-giraffe.svg',
  './art/animal-giraffe-run-1.svg',
  './art/animal-bird-macaw.svg',
  './art/animal-bird-macaw-flap.svg',
  './art/animal-bird-owl.svg',
  './art/animal-bird-owl-flap.svg',
  './art/animal-bird-cockatiel.svg',
  './art/animal-bird-cockatiel-flap.svg',
  './art/animal-bird-toucan.svg',
  './art/animal-bird-toucan-flap.svg',
  './art/animal-bird-jay.svg',
  './art/animal-bird-jay-flap.svg',
  './art/rhino-fire-run-0.svg',
  './art/rhino-fire-run-1.svg',
  './art/rhino-fire-run-2.svg',
  './art/rhino-party-run-0.svg',
  './art/rhino-party-run-1.svg',
  './art/rhino-party-run-2.svg',
  './art/rhino-gold-run-0.svg',
  './art/rhino-gold-run-1.svg',
  './art/rhino-gold-run-2.svg',
  './art/rhino-bronze-run-0.svg',
  './art/rhino-bronze-run-1.svg',
  './art/rhino-bronze-run-2.svg',
  // @setup:skins — bloco gerado pela página /?setup (não editar à mão)
  './art/rhino-pratagrande-run-0.svg',
  './art/rhino-pratagrande-run-1.svg',
  './art/rhino-pratagrande-run-2.svg',
  './art/rhino-1-gold-run-0.svg',
  './art/rhino-1-gold-run-1.svg',
  './art/rhino-1-gold-run-2.svg',
  './art/rhino-bronze-2-run-0.svg',
  './art/rhino-bronze-2-run-1.svg',
  './art/rhino-bronze-2-run-2.svg',
  './art/rhino-catisquicksrhino-run-0.svg',
  './art/rhino-catisquicksrhino-run-1.svg',
  './art/rhino-catisquicksrhino-run-2.svg',
  './art/rhino-mecacolor-run-0.svg',
  './art/rhino-mecacolor-run-1.svg',
  './art/rhino-mecacolor-run-2.svg',
  './art/rhino-rinorob-run-0.svg',
  './art/rhino-rinorob-run-1.svg',
  './art/rhino-rinorob-run-2.svg',
  // @setup:skins:fim
  './art/enemy-zookeeper.svg',
  './art/enemy-zookeeper-run-1.svg',
  './art/enemy-peacock.svg',
  './art/enemy-peacock-run-1.svg',
  './art/enemy-ostrich.svg',
  './art/enemy-ostrich-run-1.svg',
  './art/enemy-eagle.svg',
  './art/enemy-eagle-flap.svg',
  './art/enemy-hyena.svg',
  './art/enemy-hyena-run-1.svg',
  './art/enemy-buffalo.svg',
  './art/enemy-buffalo-run-1.svg',
  './art/enemy-jaguar.svg',
  './art/enemy-jaguar-run-1.svg',
  './art/enemy-snake.svg',
  './art/enemy-snake-alt.svg',
  './art/enemy-croc.svg',
  './art/enemy-croc-alt.svg',
  './art/enemy-hippo.svg',
  './art/enemy-hippo-run-1.svg',
  './art/enemy-manedwolf.svg',
  './art/enemy-manedwolf-air.svg',
  './art/enemy-bluebird.svg',
  './art/enemy-bluebird-flap.svg',
  './art/enemy-jabiru.svg',
  './art/enemy-jabiru-flap.svg',
  './art/enemy-capybara.svg',
  './art/enemy-capybara-run-1.svg',
  './art/enemy-car.svg',
  './art/enemy-car-alt.svg',
  './art/enemy-police.svg',
  './art/enemy-police-alt.svg',
  './art/enemy-person.svg',
  './art/enemy-person-run-1.svg',
  './art/enemy-suit.svg',
  './art/enemy-suit-run-1.svg',
  './art/enemy-plane.svg',
  './art/enemy-plane-alt.svg',
  './art/enemy-drone.svg',
  './art/enemy-drone-alt.svg',
  './art/enemy-pickup.svg',
  './art/enemy-pickup-alt.svg',
  './art/enemy-scooter.svg',
  './art/enemy-scooter-alt.svg',
  './art/boss-hunter.svg',
  // v1.8.7 — elenco dos distritos + Comandante da Muralha
  // v1.8.10 — elenco do deserto + Faraó de Bronze
  './art/enemy-abutre-flap.svg',
  './art/enemy-abutre.svg',
  './art/enemy-arqueiro-alt.svg',
  './art/enemy-arqueiro.svg',
  './art/enemy-camelo-run-1.svg',
  './art/enemy-camelo.svg',
  './art/enemy-chacal-air.svg',
  './art/enemy-chacal.svg',
  './art/enemy-escaravelho-run-1.svg',
  './art/enemy-escaravelho.svg',
  './art/enemy-falcao-alt.svg',
  './art/enemy-falcao.svg',
  './art/enemy-flamingo-flap.svg',
  './art/enemy-flamingo.svg',
  './art/enemy-mumia-run-1.svg',
  './art/enemy-mumia.svg',
  './art/enemy-naja-alt.svg',
  './art/enemy-naja.svg',
  './art/farao-hunter-aim.svg',
  './art/farao-hunter.svg',
  './art/enemy-dronesent-alt.svg',
  './art/enemy-dronesent.svg',
  './art/enemy-dronezig-alt.svg',
  './art/enemy-dronezig.svg',
  './art/enemy-gatobeco-air.svg',
  './art/enemy-gatobeco.svg',
  './art/enemy-helinews-alt.svg',
  './art/enemy-helinews.svg',
  './art/enemy-k9-air.svg',
  './art/enemy-k9.svg',
  './art/enemy-pipa-alt.svg',
  './art/enemy-pipa.svg',
  './art/enemy-pombo-flap.svg',
  './art/enemy-pombo.svg',
  './art/enemy-reporter-run-1.svg',
  './art/enemy-reporter.svg',
  './art/enemy-tropa-run-1.svg',
  './art/enemy-tropa.svg',
  './art/enemy-viralata-run-1.svg',
  './art/enemy-viralata.svg',
  './art/muralha-hunter-aim.svg',
  // @setup:sprites — bloco gerado pela aba Sprites do /?setup (não editar à mão)
  // @setup:sprites:fim
  './art/muralha-hunter.svg',
  './art/boss-hunter-aim.svg',
  './art/boss2-hunter.svg',
  './art/boss2-hunter-aim.svg',
  './art/boss3-hunter.svg',
  './art/boss3-hunter-aim.svg',
  './js/systems/TextureFactory.js',
  './js/systems/SpawnManager.js',
  './js/systems/FurySystem.js',
  './js/systems/BossFight.js',
  './js/systems/BossProof.js',
  './js/systems/SkinSystem.js',
  './js/systems/SkinRegistry.js',
  './js/systems/NewsSystem.js',
  './js/systems/AudioSystem.js',
  './js/systems/TuningPanel.js',
  './js/systems/LeaderboardSystem.js',
  './js/systems/ScoreSystem.js',
  './js/systems/ChallengeSystem.js',
  './js/systems/MedalSystem.js',
  './js/systems/StatsSystem.js',
  './js/systems/NotifySystem.js',
  './js/systems/ReassignSystem.js',
  './js/setup/SetupPage.js',
  './js/setup/SetupAnalytics.js',
  // v1.9.0: SetupSprites entrou aqui de carona — faltava desde a v1.8.9
  // (lapso da regra 4 do CLAUDE.md; a aba só funciona com o estúdio no ar,
  // mas o módulo precisa estar no cache para o /?setup abrir offline inteiro)
  './js/setup/SetupSprites.js',
  './js/setup/SetupReassign.js',
  './js/stats/StatsDashboard.js',
  './js/stats/Charts.js',
  './js/stats/MyStats.js',
  './js/stats/RadiografiaCore.js',
  './js/scenes/BootScene.js',
  './js/scenes/GameScene.js',
  './js/home/HomeScreen.js',
  './js/entities/Rhino.js',
  './js/entities/CrackedWall.js',
  './js/entities/Spike.js',
  './js/entities/Animal.js',
  './js/entities/TranqTower.js',
  './js/entities/TranqDart.js',
  './js/entities/HunterSniper.js',
  './js/entities/Ramp.js',
  './js/entities/TimedHazard.js',
  'https://cdn.jsdelivr.net/npm/phaser@3.85.2/dist/phaser.min.js',
];

self.addEventListener('install', (e) => {
  // v1.9.7: instalação TOLERANTE. O `addAll` atômico com ~200 arquivos era a
  // fragilidade M3 do CASO 2 (INVESTIGACOES.md): UM arquivo falhando — rede
  // móvel, CDN do Phaser, janela de propagação do deploy — e o SW novo nunca
  // instalava. O cliente ficava preso no SW velho, cujo `put` do fetch ia
  // misturando arquivos novos no cache velho (o precedente da v1.4.0).
  // Agora cada arquivo é tentado por si: arte que falhar entra depois, pelo
  // próprio fetch handler (SWR abaixo). Só o NÚCLEO (HTML/JS/CDN — sem ele o
  // fallback offline não boota) continua obrigatório: núcleo incompleto ainda
  // derruba a instalação, porque um cache que não boota é pior do que
  // permanecer no SW anterior, que pelo menos funcionava.
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await Promise.allSettled(ASSETS.map((a) => c.add(a)));
    const nucleo = ASSETS.filter((a) => !a.startsWith('./art/'));
    const urls = new Set((await c.keys()).map((r) => r.url));
    const faltando = nucleo.filter((a) => !urls.has(new URL(a, self.location.href).href));
    if (faltando.length) throw new Error('nucleo incompleto: ' + faltando.join(' '));
  }));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// v1.9.7: a página de SOCORRO — quando nada respondeu (a rede caiu E o cache
// foi despejado), o jogador via a página de erro do NAVEGADOR: "não foi
// possível acessar a página", o sintoma do CASO 2. Esta resposta é gerada
// aqui dentro, sem depender de cache nenhum, e dá o botão de tentar de novo.
const OFFLINE_HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FURIOUS RHINO — sem conexão</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#7ec8f0;display:flex;
align-items:center;justify-content:center;height:100vh;text-align:center}
.c{background:#fff;border-radius:16px;padding:32px 24px;max-width:320px;
box-shadow:0 8px 24px rgba(0,0,0,.2)}h1{font-size:48px;margin:0}p{color:#333;line-height:1.5}
button{font-size:18px;padding:12px 28px;border:0;border-radius:10px;background:#e8541e;
color:#fff;font-weight:700}</style></head><body><div class="c"><h1>🦏</h1>
<p><b>Sem conexão com o jogo.</b><br>Confira a internet e tente de novo.</p>
<button onclick="location.reload()">Tentar de novo</button></div></body></html>`;

self.addEventListener('fetch', (e) => {
  // Chamadas de dados do Firestore (googleapis.com), consultas de geo-IP,
  // pushes do ntfy e requests não-GET vão direto à rede, sem passar pelo
  // cache (o SDK em gstatic.com continua cacheável — bom para offline). Sem
  // o bypass do geo, a cláusula `res.type === 'cors'` abaixo congelaria a
  // localização.
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' ||
      url.hostname.endsWith('googleapis.com') ||
      url.hostname === 'get.geojs.io' ||
      url.hostname === 'ipwho.is' ||
      url.hostname === 'ntfy.sh' ||
      url.hostname.endsWith('.ntfy.sh')) return;

  // v1.9.7 — ARTE: cache-first com revalidação em segundo plano (SWR). A arte
  // muda raramente, e misturá-la entre versões é cosmético — um sprite antigo
  // por uma sessão. JS/HTML seguem network-first estrito logo abaixo, porque
  // misturá-LOS foi o desastre da v1.4.0. Este ramo é também a dívida técnica
  // nº 3 da radiografia de 24/08: revalidar ~150 SVGs a cada sessão era
  // metade do preload lento no celular.
  if (url.origin === self.location.origin && url.pathname.includes('/art/')) {
    e.respondWith(
      caches.match(e.request).then((hit) => {
        const rede = fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        });
        // Com cache: responde NA HORA e atualiza por trás (falha da
        // revalidação é ruído). Sem cache: é a rede ou nada, como antes.
        if (hit) { rede.catch(() => {}); return hit; }
        return rede;
      })
    );
    return;
  }

  e.respondWith(
    // cache: 'no-cache' força revalidação no servidor (304 é barato): sem
    // isso, o cache HTTP do navegador pode servir JS antigo por baixo do
    // network-first e misturar versões (visto na validação da v1.4.0)
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        // keep the offline cache fresh with every successful fetch
        if (res.ok && (e.request.url.startsWith(self.location.origin) || res.type === 'cors')) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      // v1.9.7 — a CORRENTE DE SOCORRO do CASO 2, do específico ao genérico.
      // Antes era um só `caches.match(e.request)`: um miss devolvia
      // `undefined`, e `respondWith(undefined)` é erro de rede GARANTIDO — o
      // service worker transformava conexão ruim em página de erro.
      //   1. o próprio recurso, ignorando a query (`/?stats` era miss seco);
      //   2. navegação sem cache do recurso → o shell do jogo;
      //   3. navegação sem cache NENHUM → a página de socorro, nunca o erro
      //      cru do navegador. Subrecurso sem cache segue falhando (sinal
      //      certo para a rede de proteção da página agir).
      .catch(async () => {
        const exato = await caches.match(e.request, { ignoreSearch: true });
        if (exato) return exato;
        if (e.request.mode === 'navigate') {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
          return new Response(OFFLINE_HTML,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
        return undefined;
      })
  );
});
