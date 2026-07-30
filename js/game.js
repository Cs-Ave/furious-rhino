// /?stats: painel público de estatísticas — sem Phaser, sem cenas.
// O index.html só injeta o script do Phaser fora do modo stats, e as cenas
// referenciam window.Phaser na definição das classes — por isso o boot do
// jogo importa tudo dinamicamente, só quando o global existe.
if (new URLSearchParams(location.search).has('stats')) {
  document.body.classList.add('stats-mode');
  import('./stats/StatsDashboard.js').then((m) => m.render());
} else {
  bootGame();
}

async function bootGame() {
  const [{ Constants }, { BootScene }, { GameScene }] = await Promise.all([
    import('./utils/Constants.js'),
    import('./scenes/BootScene.js'),
    import('./scenes/GameScene.js'),
  ]);

  const config = {
    type: Phaser.AUTO,
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

  // ?debug=1 liga o painel de tuning + hitboxes (ver TuningPanel.js)
  game.registry.set('debug', new URLSearchParams(location.search).get('debug') === '1');

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
