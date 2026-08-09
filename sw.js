// Network-first service worker: always serves fresh files while online
// (essential during development), falls back to cache for offline play.
const CACHE = 'furious-rhino-v171';
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
  './art/boss-hunter-aim.svg',
  './js/systems/TextureFactory.js',
  './js/systems/SpawnManager.js',
  './js/systems/FurySystem.js',
  './js/systems/BossFight.js',
  './js/systems/AudioSystem.js',
  './js/systems/TuningPanel.js',
  './js/systems/LeaderboardSystem.js',
  './js/systems/MedalSystem.js',
  './js/systems/StatsSystem.js',
  './js/systems/NotifySystem.js',
  './js/stats/StatsDashboard.js',
  './js/stats/Charts.js',
  './js/stats/MyStats.js',
  './js/scenes/BootScene.js',
  './js/scenes/GameScene.js',
  './js/entities/Rhino.js',
  './js/entities/CrackedWall.js',
  './js/entities/Spike.js',
  './js/entities/Animal.js',
  './js/entities/TranqTower.js',
  './js/entities/TranqDart.js',
  './js/entities/HunterSniper.js',
  './js/entities/Ramp.js',
  'https://cdn.jsdelivr.net/npm/phaser@3.85.2/dist/phaser.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

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

  e.respondWith(
    // cache: 'no-cache' força revalidação no servidor (304 é barato): sem
    // isso, o cache HTTP do navegador pode servir JS/arte antigos por baixo
    // do network-first e misturar versões (visto na validação da v1.4.0)
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        // keep the offline cache fresh with every successful fetch
        if (res.ok && (e.request.url.startsWith(self.location.origin) || res.type === 'cors')) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
