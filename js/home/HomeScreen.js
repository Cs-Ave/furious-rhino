// A TELA INICIAL — dona única da pintura da home.
//
// POR QUE ESTE MÓDULO EXISTE (v1.9.3): até a v1.9.2 tudo isto vivia dentro do
// GameScene.create(), que só roda depois de o Phaser baixar 150 SVGs. No
// celular a home ficava VAZIA por 4,6 segundos DEPOIS de a página estar
// pronta — o pódio aparecia aos 6.136 ms e o carregamento terminava aos
// 1.499 ms. E era espera à toa: a home é DOM + localStorage e não usa uma
// única textura do Phaser (o rino da abertura são 3 <img> com animação CSS;
// dos 150 SVGs a home referencia 4, direto por <img>).
//
// Agora o js/game.js pinta a home ANTES de instanciar o Phaser, e a cena só
// assume os botões e as atualizações de rede quando fica pronta.
//
// REGRA DESTE ARQUIVO: nada aqui pode tocar em Phaser — sem `this.add`,
// `this.time`, `this.tweens`, `this.physics`, `this.rhino`. Só `document`,
// localStorage e os sistemas puros. Se algo aqui precisar da cena, é sinal
// de que pertence ao GameScene, não a este módulo.
//
// Os métodos são ESTÁTICOS de propósito: dentro deles `this` é a própria
// classe, então as chamadas internas que vieram da cena (`this.
// paintChallenges`, `this.renderYouStep`...) seguem valendo sem adaptação.
import { Constants } from '../utils/Constants.js';
import { StorageManager } from '../utils/StorageManager.js';
import { LeaderboardSystem } from '../systems/LeaderboardSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { SkinSystem } from '../systems/SkinSystem.js';
import { NewsSystem } from '../systems/NewsSystem.js';
import { ChallengeSystem } from '../systems/ChallengeSystem.js';

export class HomeScreen {
  // Toque dado antes de o motor do jogo existir (ver armStart/ready)
  static toquePendente = false;
  static iniciarCorrida = null;

  // Mesma doutrina do safeTelemetry da cena: a home é ACESSÓRIA do jogo e um
  // erro de pintura nunca pode derrubar o boot.
  static safeTelemetry(fn) {
    try {
      const r = fn();
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch (e) { /* acessório */ }
  }

  // Mostra a posição no degrau VOCÊ (ou o convite, para quem não tem rank)
  static showRank(rank) {
    const has = rank > 0;
    if (has) document.getElementById('start-rank-pos').textContent = rank;
    document.getElementById('start-rank').hidden = !has;
    document.getElementById('you-norank').hidden = has;
    this.updatePodiumGap(rank);
  }

  // "💀 Maior inimigo" do box Campanha: a causa de morte mais comum
  static topCauseLabel() {
    const deaths = StorageManager.getDeaths();
    let best = null;
    for (const [key, n] of Object.entries(deaths)) {
      if (/^t\d$/.test(key) || key === 'win') continue;
      if (n > 0 && (!best || n > best.n)) best = { key, n };
    }
    return best ? (Constants.CAUSE_LABELS[best.key] || best.key) : '—';
  }

  // Minigráfico SVG das últimas 10 corridas (barra dourada = a melhor;
  // linha tracejada = o recorde). Sem corridas: o gráfico se esconde.
  static renderStartChart() {
    const svg = document.getElementById('start-chart');
    const label = document.getElementById('start-chart-label');
    const runs = StorageManager.getRuns().filter(Boolean).slice(-10);
    const values = runs.map((r) => Number(r.m) || 0);
    if (!values.length) {
      svg.style.display = 'none';
      label.style.display = 'none';
      return;
    }
    const NS = 'http://www.w3.org/2000/svg';
    const max = Math.max(...values, StorageManager.getRecord(), 1);
    const shape = (tag, attrs) => {
      const el = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      svg.appendChild(el);
    };
    svg.textContent = '';
    shape('line', { class: 'axis', x1: 0, y1: 62, x2: 300, y2: 62 });
    const recordY = 62 - (StorageManager.getRecord() / max) * 55;
    shape('line', { class: 'goal', x1: 0, y1: recordY, x2: 300, y2: recordY });
    const bestIdx = values.indexOf(Math.max(...values));
    const slot = 300 / Math.max(values.length, 1);
    values.forEach((v, i) => {
      const h = Math.max(2, (v / max) * 55);
      shape('rect', {
        class: `bar${i === bestIdx ? ' best' : ''}`,
        x: (i * slot + 3).toFixed(1), y: (62 - h).toFixed(1),
        width: Math.max(4, slot - 6).toFixed(1), height: h.toFixed(1),
      });
    });
  }

  // O pódio mundial (2·1·3) a partir do cache — skins de quem cravou cada
  // marca (docs antigos: rino original) e dias de POSSE DA POSIÇÃO (cascata).
  static renderPodium() {
    const box = document.getElementById('podium-steps');
    const cached = StorageManager.getPodium();
    const entries = cached ? cached.entries : null;
    // v1.8.4: o degrau VOCÊ também tem nome, marca e posse (antes do return
    // do pódio vazio — a sua marca não depende do cache mundial)
    this.renderYouStep();
    box.textContent = '';
    if (!entries || !entries.length) {
      const p = document.createElement('div');
      p.className = 'podium-empty';
      p.textContent = navigator.onLine === false
        ? 'O pódio aparece quando houver internet.'
        : 'Escapem do zoológico — o pódio espera pelos 3 primeiros!';
      box.appendChild(p);
      return;
    }
    const days = LeaderboardSystem.holdDays(entries, Date.now(), { cascade: true });
    const medals = ['👑', '🥈', '🥉'];
    const classes = ['first', 'second', 'third'];
    // ordem visual 2 · 1 · 3 (índices 1, 0, 2 do top 3)
    for (const i of [1, 0, 2].filter((n) => n < entries.length)) {
      const e = entries[i];
      const step = document.createElement('div');
      step.className = `step ${classes[i]}`;
      if (i === 0) {
        const glow = document.createElement('div');
        glow.className = 'glow';
        step.appendChild(glow);
      }
      const anim = document.createElement('div');
      anim.className = 'podium-anim';
      const skin = SkinSystem.get(e.skin || 'default');
      for (let f = 0; f < 3; f++) {
        const img = document.createElement('img');
        img.className = `f${f}`;
        img.alt = '';
        img.src = `art/${SkinSystem.textureKey(skin, f)}.svg`;
        anim.appendChild(img);
      }
      step.appendChild(anim);
      const medal = document.createElement('div');
      medal.className = 'medal';
      medal.textContent = medals[i];
      const name = document.createElement('div');
      name.className = 'pname';
      name.textContent = e.name; // textContent: nome vem de terceiros
      const score = document.createElement('div');
      score.className = 'pscore';
      score.textContent = ScoreSystem.fmtScore(e); // pontos · metros (v1.8.4)
      const hold = document.createElement('div');
      hold.className = 'pdays';
      const d = days[i];
      hold.textContent = d === null ? '' : d === 0 ? 'desde hoje'
        : i === 0 ? `no trono há ${d}d` : `no posto há ${d}d`;
      const base = document.createElement('div');
      base.className = 'base';
      base.textContent = i + 1;
      step.append(medal, name, score, hold, base);
      box.appendChild(step);
    }
    this.updatePodiumGap(StorageManager.getLastRank());
  }

  // v1.8.4: o degrau VOCÊ ganhou as mesmas três linhas dos degraus 1·2·3 —
  // nome, marca (pontos · metros) e há quanto tempo ela está no ar.
  static renderYouStep() {
    const nameEl = document.getElementById('you-name');
    const scoreEl = document.getElementById('you-score');
    const daysEl = document.getElementById('you-days');
    if (!nameEl || !scoreEl || !daysEl) return;

    const name = StorageManager.getPlayerName();
    nameEl.textContent = name || 'escolha seu apelido'; // textContent: nome livre
    nameEl.style.opacity = name ? '' : '0.55';

    const meters = StorageManager.getRecord();
    scoreEl.textContent = meters > 0
      ? ScoreSystem.fmtScore({ score: StorageManager.getRecordPts(), m: meters })
      : 'sem marca';

    const sinceMs = StorageManager.getBestSentAt();
    const d = sinceMs ? LeaderboardSystem.holdDays([{ sinceMs }])[0] : null;
    daysEl.textContent = d === null ? '' : d === 0 ? 'desde hoje' : `sua marca há ${d}d`;
  }

  // A provocação sob o degrau VOCÊ: quanto falta para o pódio (ou a defesa).
  // v1.8.4: a comparação é em PONTOS — o ranking mundial passou a ser deles.
  static updatePodiumGap(rank) {
    const el = document.getElementById('podium-gap');
    const cached = StorageManager.getPodium();
    const third = cached && cached.entries[2] ? cached.entries[2].score : 0;
    const recordPts = StorageManager.getRecordPts();
    if (rank > 0 && rank <= 3) {
      el.textContent = '🛡️ defenda o seu posto!';
    } else if (third > recordPts) {
      el.textContent = `faltam ${third - recordPts + 1} pts p/ 🥉`;
    } else {
      el.textContent = '';
    }
  }

  // O card da home: pinta do cache SÍNCRONO na hora e dispara o refresh
  // fire-and-forget (padrão do pódio) — se vier novidade, repinta.
  static renderChallenges() {
    const box = document.getElementById('challenge-card');
    if (!box) return;
    try { this.paintChallenges(box); } catch (e) { box.hidden = true; }
    this.safeTelemetry(() => ChallengeSystem.refresh().then(() => {
      try { this.paintChallenges(box); } catch (e) { /* acessório */ }
    }));
  }

  static paintChallenges(box) {
    const myId = StorageManager.getOrCreatePlayerId();
    const nowS = Math.floor(Date.now() / 1000);
    const cached = ChallengeSystem.cached();
    const list = (cached && cached.list) || [];
    const mine = list.filter((ch) => {
      const st = ChallengeSystem.statusOf(ch, myId);
      return st === 'creator' || st === 'accepted';
    });
    // v1.8.7-fix4: cancelado vira AVISO para o desafiado (até dispensar ou o
    // prazo vencer); para o próprio criador ele some na hora
    const cancelled = mine.filter((ch) => ChallengeSystem.isCancelled(ch)
      && nowS < ch.endAt
      && !(ch.from && String(ch.from.id) === myId)
      && !ChallengeSystem.isDismissed(ch.id));
    // Encerrados há <24h viram card de RESULTADO; depois somem sozinhos
    const ended = mine.filter((ch) => !ChallengeSystem.isCancelled(ch)
      && nowS >= ch.endAt && nowS - ch.endAt < 24 * 3600);
    const active = mine.filter((ch) => ChallengeSystem.isActive(ch, nowS));
    const show = [...active, ...cancelled, ...ended];

    box.textContent = '';
    box.hidden = show.length === 0;
    // v1.8.7-fix4 (pedido do dono): com desafios na tela, o box Campanha sai
    // de cena e os cards ocupam o lugar dele, um abaixo do outro (máx 3)
    const camp = document.querySelector('.camp-card');
    if (camp) camp.style.display = show.length ? 'none' : '';
    if (!show.length) return;
    const MAX = 3;
    for (const ch of show.slice(0, MAX)) {
      box.appendChild(this.buildChallengeCard(ch, myId, nowS >= ch.endAt));
    }
    if (show.length > MAX) {
      const more = document.createElement('div');
      more.className = 'chal-more';
      more.textContent = `+${show.length - MAX} desafios`;
      box.appendChild(more);
    }
  }

  static buildChallengeCard(ch, myId, ended) {
    const card = document.createElement('div');
    card.className = 'chal-card';
    const head = document.createElement('div');
    head.className = 'chal-head';
    const title = document.createElement('b');
    title.textContent = ch.from && ch.from.id === myId
      ? '⚔️ seu desafio'
      : `⚔️ Desafio de ${(ch.from && ch.from.name) || '?'}`; // textContent
    const cd = document.createElement('span');
    cd.className = 'chal-count';
    cd.textContent = ChallengeSystem.countdownText(ch.endAt, Date.now());
    head.append(title, cd);

    // v1.8.7-fix4: desafio CANCELADO — o card é o próprio aviso; toque
    // dispensa (ou ele morre sozinho no endAt original). Nada de placar.
    if (ChallengeSystem.isCancelled(ch)) {
      card.classList.add('cancelled');
      title.textContent = `❌ ${(ch.from && ch.from.name) || '?'} cancelou o desafio`;
      cd.textContent = 'toque para dispensar';
      card.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ChallengeSystem.dismissLocal(ch.id);
        this.renderChallenges();
      });
      card.append(head);
      return card;
    }

    const rowsBox = document.createElement('div');
    rowsBox.className = 'chal-rows';
    rowsBox.textContent = '…'; // o placar chega quando standings resolver
    card.append(head, rowsBox);

    // v1.8.7-fix4: o CRIADOR pode encerrar o desafio ativo — dois toques
    // (o segundo confirma) para não cancelar por engano
    if (!ended && ch.from && ch.from.id === myId) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'chal-del';
      del.textContent = '🗑 Encerrar';
      let armado = 0;
      del.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      del.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        if (Date.now() - armado > 3000) {
          armado = Date.now();
          del.textContent = 'confirmar?';
          setTimeout(() => { del.textContent = '🗑 Encerrar'; }, 3000);
          return;
        }
        del.disabled = true;
        const r = await ChallengeSystem.cancel(ch.id);
        if (r.ok) {
          let msg = '🗑 Desafio encerrado.';
          if (r.ghost) msg = '🗑 Esse desafio já não existia — removido da lista.';
          // v1.8.13: encerrado antes (por este ou outro aparelho meu) não é
          // erro de rede — era o que a mensagem dizia
          else if (r.already) msg = '🗑 Esse desafio já estava encerrado.';
          this.showHomeToast(msg);
          this.renderChallenges();
        } else {
          del.disabled = false;
          del.textContent = '🗑 Encerrar';
          this.showHomeToast(r.reason === 'local'
            ? 'Ambiente local não encerra desafios — ligue "📡 Escrita local" no ?debug=1.'
            : 'Não deu para encerrar — confira a internet (e se as rules novas foram publicadas).');
        }
      });
      card.append(del);
    }

    // standings tem TTL de 30min e nunca lança — mas o card já está no ar
    this.safeTelemetry(() => ChallengeSystem.standings(ch).then((rows) => {
      this.paintChallengeRows(card, rowsBox, ch, rows || [], myId, ended);
    }));
    return card;
  }

  static paintChallengeRows(card, rowsBox, ch, rows, myId, ended) {
    rowsBox.textContent = '';
    const leader = ChallengeSystem.leaderOf(rows);

    // Encerrado: o card vira resultado — e o veredito vai para o Diário
    // (NewsSystem.push deduplica pela chave 'chal:'+id sozinho)
    if (ended && rows.length) {
      const verdict = document.createElement('div');
      verdict.className = 'chal-result';
      const won = leader && leader.id === myId;
      verdict.textContent = won
        ? '🏆 Você venceu!'
        : leader ? `😤 ${leader.name} venceu` : '🤝 Ninguém correu — deu empate';
      card.insertBefore(verdict, rowsBox);
      const news = won ? '🏆 Você VENCEU um desafio da arena!'
        : leader ? `⚔️ Desafio encerrado: ${leader.name} venceu.`
          : '⚔️ Desafio encerrado sem corridas.';
      if (NewsSystem.push(`chal:${ch.id}`, news, 'gold')) {
        NewsSystem.renderInto(document.getElementById('news-list'));
      }
    }

    // As rows do standings SÓ têm quem aceitou (contrato do ChallengeSystem)
    for (const row of rows) {
      const line = document.createElement('div');
      line.className = 'chal-row';
      if (row.id === myId) line.classList.add('me');
      const left = document.createElement('span');
      const right = document.createElement('span');
      right.className = 'chal-pts';
      const crown = leader && leader.id === row.id && row.best ? '👑 ' : '';
      left.textContent = crown + row.name; // textContent: nome de terceiros
      right.textContent = row.best
        ? ScoreSystem.fmtPts(row.best.pts)
        : 'ainda não correu';
      line.append(left, right);
      rowsBox.appendChild(line);
    }

    // Convidados que ainda não responderam: participants fora do accepted
    const accepted = (ch.accepted && typeof ch.accepted === 'object') ? ch.accepted : {};
    for (const pid of ch.participants || []) {
      if (pid in accepted) continue;
      const line = document.createElement('div');
      line.className = 'chal-row waiting';
      const left = document.createElement('span');
      const name = (ch.names && ch.names[pid]) || '???';
      left.textContent = `aguardando ${name}`; // textContent
      line.appendChild(left);
      rowsBox.appendChild(line);
    }
  }

  // Toast DOM da home: o showToast do Phaser fica ATRÁS do overlay inicial.
  static showHomeToast(msg) {
    const t = document.createElement('div');
    t.className = 'home-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2700);
  }

  // ---------------------------------------------------------------- API

  // A home inteira, só de localStorage: zero rede, zero Phaser. É esta que o
  // js/game.js chama antes de o motor existir.
  static paintFromCache() {
    this.safeTelemetry(() => this.paintCampanha());
    this.safeTelemetry(() => this.renderPodium());
    this.safeTelemetry(() => this.showRank(StorageManager.getLastRank()));
    this.safeTelemetry(() => NewsSystem.renderInto(document.getElementById('news-list')));
    this.safeTelemetry(() => this.paintChallengesFromCache());
    try { performance.mark('home-pintada'); } catch (e) { /* sem timeline */ }
  }

  // Repintura completa — para quando chega dado NOVO da rede. Até a v1.9.2
  // três caminhos atualizavam o cache e não repintavam nada: o submit do fim
  // de corrida, o rank revalidado no boot e o modal do top 10. O jogador via
  // a posição antiga até recarregar a página.
  static repaint() {
    this.safeTelemetry(() => this.paintCampanha());
    this.safeTelemetry(() => this.renderPodium());
    this.safeTelemetry(() => this.showRank(StorageManager.getLastRank()));
  }

  // O box Campanha: recorde, tentativas, fugas, maior inimigo e o minigráfico
  static paintCampanha() {
    const rec = document.getElementById('start-record');
    const att = document.getElementById('start-attempts');
    const wins = document.getElementById('start-wins');
    const cause = document.getElementById('start-cause');
    if (rec) rec.textContent = StorageManager.getRecord();
    if (att) att.textContent = StorageManager.getAttempts();
    if (wins) wins.textContent = StorageManager.getWins();
    if (cause) cause.textContent = this.topCauseLabel();
    // v1.11 "Streaks": a pílula da chama. COPY SEMPRE CONVITE, NUNCA BRONCA —
    // chama apagada = linha some (zero culpa); ontem sem hoje = convite.
    const streakWrap = document.getElementById('start-streak-wrap');
    const streakEl = document.getElementById('start-streak');
    if (streakWrap && streakEl) {
      const n = StorageManager.getStreak();
      if (n <= 0) streakWrap.hidden = true;
      else {
        streakWrap.hidden = false;
        const jogouHoje = Boolean(StorageManager.getHistory().days[StorageManager.dayKey()]);
        streakEl.textContent = jogouHoje
          ? (n === 1 ? '1 dia — volte amanhã e faça 2!' : `${n} dias seguidos!`)
          : (n === 1 ? 'ontem contou — jogue hoje e faça 2!' : `${n} dias — vale mais um hoje?`);
      }
    }
    this.renderStartChart();
  }

  // Desafios SEM rede: o renderChallenges normal dispara um refresh, que no
  // caminho crítico do boot seria latência. A cena chama o completo ao subir.
  static paintChallengesFromCache() {
    const box = document.getElementById('challenge-card');
    if (!box) return;
    try { this.paintChallenges(box); } catch (e) { box.hidden = true; }
  }

  // O toque para começar, registrado ANTES de o motor existir. Se o jogador
  // toca numa home já pintada com o Phaser ainda carregando, o toque é
  // GUARDADO e a corrida começa sozinha quando a cena chega — ninguém toca
  // no vazio nem precisa tocar duas vezes.
  static armStart(iniciar) {
    const overlay = document.getElementById('start-screen');
    if (!overlay) return;
    if (typeof iniciar === 'function') this.iniciarCorrida = iniciar;
    const disparar = (ev) => {
      if (ev && (ev.key === 'p' || ev.key === 'P' || ev.key === 'Escape')) return;
      if (document.body.classList.contains('modal-open')) return;
      if (this.iniciarCorrida) {
        overlay.removeEventListener('pointerdown', disparar);
        window.removeEventListener('keydown', disparar);
        this.iniciarCorrida();
        return;
      }
      this.toquePendente = true;
      const cta = document.querySelector('.start-cta');
      if (cta) cta.textContent = 'preparando a fuga...';
    };
    overlay.addEventListener('pointerdown', disparar);
    window.addEventListener('keydown', disparar);
  }

  // A cena ficou pronta: assume o início da corrida e, se o jogador já tinha
  // tocado, começa AGORA. O `startTriggered` do startRun protege contra
  // partida dupla se o toque pendente cruzar com um toque real.
  static ready(iniciar) {
    if (typeof iniciar === 'function') this.iniciarCorrida = iniciar;
    if (!this.toquePendente) return;
    this.toquePendente = false;
    this.iniciarCorrida();
  }
}
