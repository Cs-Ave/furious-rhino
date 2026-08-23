import { StorageManager } from '../utils/StorageManager.js';
import { NewsSystem } from './NewsSystem.js';
import { NotifySystem } from './NotifySystem.js';
import { LeaderboardSystem, getDb } from './LeaderboardSystem.js';

// Recuperação de identidade (v1.9.0) — o caso "Teco": desinstalar o PWA
// apaga o localStorage e o aparelho renasce com outro UUID; o doc antigo em
// `scores/` vira um órfão que BLOQUEIA o próprio dono do apelido (checkName
// exclui "meu doc" pelo id). Sem login não há como provar posse — a
// recuperação é MEDIADA pelo administrador:
//
//   1. o jogador toca 🆘 no erro de apelido → push ntfy ao dono (id novo +
//      assinatura do aparelho) + marca local que ARMA a consulta;
//   2. o dono confere e grava o par {idNovo: idAntigo} no doc
//      `config/reassign` (write: if false para clientes — só admin escreve;
//      leitura é pública, como todo config/*);
//   3. este módulo, no boot da tela inicial, encontra o próprio id no mapa,
//      baixa os docs públicos antigos e ADOTA a identidade localmente.
//
// Contrato de silêncio da casa: nada aqui derruba o jogo; erro de rede =
// nada acontece e o cache segue valendo.
//
// ⚠️ A invariante que não pode quebrar: as rules de `stats` exigem MONOTONIA
// (attempts/playTimeS/wins/bestM só crescem) e negam o write EM SILÊNCIO.
// Por isso o merge SOMA os totais (local + servidor) em vez de copiar —
// somado é sempre >= servidor, e o próximo StatsSystem.send() passa.

const CLAIM_KEY = 'furious_rhino_claim';            // {slug, at} — pedido pendente (arma a consulta)
const DONE_KEY = 'furious_rhino_reassigned_from';   // {from, to, name, at, announced} — migração feita
const CFG_KEY = 'furious_rhino_reassign_cfg';       // {at, pairs} — cache do config/reassign (TTL 1h)
const CFG_TTL_MS = 60 * 60 * 1000;                  // mesmo TTL do config/news e do config/notify
const RESEND_COOLDOWN_MS = 24 * 60 * 60 * 1000;     // anti-spam: mesmo slug, 1 pedido por dia
const CLAIM_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;  // pedido esquecido: para de consultar após 30d

// Espelho de leitura das condições do MedalSystem que dá para INFERIR de um
// runs[] restaurado (ids imutáveis — §6.6 do banco de ideias). O que não
// está aqui (record_2x, sequência de recordes) se perdeu de verdade e o
// jogador reconquista jogando. Piso honesto, nunca teto.
const MEDAL_DIST = [
  [100, 'dist_100'], [200, 'dist_200'], [300, 'dist_300'], [400, 'dist_400'],
  [600, 'dist_600'], [1100, 'dist_1000'], [1200, 'dist_1200'], [1400, 'dist_1400'],
  [1600, 'dist_1600'], [1800, 'dist_1800'], [2000, 'dist_2000'], [2200, 'dist_2200'],
  [2700, 'dist_2700'], [3700, 'dist_3700'], [4200, 'dist_4200'], [4700, 'dist_4700'],
];

export class ReassignSystem {
  // ------------------------------------------------------------ o pedido 🆘

  static getClaim() {
    try {
      const c = JSON.parse(localStorage.getItem(CLAIM_KEY));
      return c && typeof c === 'object' && c.at ? c : null;
    } catch (e) {
      return null;
    }
  }

  // Chamado pelo botão do modal de apelido. Grava a marca (é ELA que arma a
  // consulta ao config/reassign — quem nunca pediu nada não gasta 1 read) e
  // avisa o administrador. Devolve:
  //   'sent'   — pedido enviado ao admin;
  //   'saved'  — push falhou (offline/adblock), mas a marca ficou: o admin
  //              pode autorizar por outro canal e a restauração acontece;
  //   'again'  — mesmo apelido pedido há <24h; não reenvia.
  static async requestClaim(name) {
    const slug = LeaderboardSystem.nameSlug(name);
    const last = this.getClaim();
    // O cooldown só vale para pedido que CHEGOU (sent) — um push que falhou
    // por falta de rede não pode trancar a re-tentativa por 24h
    if (last && last.slug === slug && last.sent && Date.now() - last.at < RESEND_COOLDOWN_MS) return 'again';
    try {
      localStorage.setItem(CLAIM_KEY, JSON.stringify({ slug, at: Date.now() }));
      // Pedido novo: fura o TTL do cache na próxima consulta
      localStorage.removeItem(CFG_KEY);
    } catch (e) { /* sem storage: o push ainda vale */ }
    const ok = await NotifySystem.identityClaim({ name });
    if (ok) {
      try {
        localStorage.setItem(CLAIM_KEY, JSON.stringify({ slug, at: Date.now(), sent: 1 }));
      } catch (e) { /* ok */ }
    }
    return ok ? 'sent' : 'saved';
  }

  // --------------------------------------------------- a ordem do admin

  // Baixa o mapa {idNovo: idAntigo} do doc config/reassign, com cache de 1h
  // (mesmo desenho do NewsSystem.refresh). `force` fura o TTL (?restore=1).
  static async fetchPairs(force = false) {
    if (!force) {
      try {
        const raw = JSON.parse(localStorage.getItem(CFG_KEY));
        if (raw && Date.now() - raw.at < CFG_TTL_MS) return raw.pairs || {};
      } catch (e) { /* cache corrompido: segue para a rede */ }
    }
    try {
      const { fs, db } = await getDb();
      const snap = await fs.getDoc(fs.doc(db, 'config', 'reassign'));
      const data = snap && snap.exists && snap.exists() ? snap.data() : {};
      const pairs = data.pairs && typeof data.pairs === 'object' ? data.pairs : {};
      try {
        localStorage.setItem(CFG_KEY, JSON.stringify({ at: Date.now(), pairs }));
      } catch (e) { /* quota cheia: seguir sem cache é aceitável */ }
      return pairs;
    } catch (e) {
      return null; // offline: nada a fazer nesta sessão
    }
  }

  // Boot da tela inicial. Só age se houver pedido pendente (ou ?restore=1,
  // o override manual para atendimento assistido). Encontrou o próprio id
  // no mapa → migra e recarrega a página (o migrateFromRuns das skins, a
  // linha de identidade e o pódio releem tudo do estado novo).
  static async maybeRestore() {
    const claim = this.getClaim();
    // typeof: o módulo também roda no node (suíte test-reassign), sem location
    const force = typeof location !== 'undefined'
      && new URLSearchParams(location.search).get('restore') === '1';
    if (!claim && !force) return false;
    if (claim && Date.now() - claim.at > CLAIM_MAX_AGE_MS) {
      try { localStorage.removeItem(CLAIM_KEY); } catch (e) { /* ok */ }
      if (!force) return false;
    }

    const myId = StorageManager.getOrCreatePlayerId();
    const pairs = await this.fetchPairs(force);
    const oldId = pairs && pairs[myId];
    if (!oldId || typeof oldId !== 'string' || oldId === myId) return false;

    try {
      const { fs, db } = await getDb();
      const [scSnap, stSnap] = await Promise.all([
        fs.getDoc(fs.doc(db, 'scores', oldId)),
        fs.getDoc(fs.doc(db, 'stats', oldId)),
      ]);
      const oldScores = scSnap && scSnap.exists() ? scSnap.data() : null;
      const oldStats = stSnap && stSnap.exists() ? stSnap.data() : null;
      if (!oldScores && !oldStats) return false; // par apontando para o nada

      const plan = ReassignSystem.mergeIdentity(this.snapshotLocal(), oldScores, oldStats, Date.now());
      for (const [k, v] of Object.entries(plan.set)) localStorage.setItem(k, v);
      for (const k of plan.remove) localStorage.removeItem(k);
      localStorage.setItem('furious_rhino_player_id', oldId);

      const name = (oldScores && oldScores.name) || StorageManager.getPlayerName() || '';
      localStorage.setItem(DONE_KEY, JSON.stringify({ from: myId, to: oldId, name, at: Date.now() }));
      localStorage.removeItem(CLAIM_KEY);
      localStorage.removeItem(CFG_KEY);
      // Card no Diário da Fuga (a chave deduplica para sempre)
      NewsSystem.push(`reassign:${oldId}`, `👤 Identidade restaurada${name ? ` — bem-vindo de volta, ${name}!` : '!'}`, 'gold');
      location.reload();
      return true;
    } catch (e) {
      return false; // rede/regra: tenta de novo no próximo boot (cache TTL)
    }
  }

  // Pós-reload: devolve {name} UMA vez para a tela dar as boas-vindas, e
  // avisa o admin que a migração completou (é o sinal para limpar o par e
  // apagar os docs órfãos do id provisório).
  static consumeRestoredNotice() {
    try {
      const done = JSON.parse(localStorage.getItem(DONE_KEY));
      if (!done || done.announced) return null;
      done.announced = 1;
      localStorage.setItem(DONE_KEY, JSON.stringify(done));
      NotifySystem.reassignDone(done).catch(() => {});
      return { name: done.name || '' };
    } catch (e) {
      return null;
    }
  }

  // Retrato dos valores locais que o merge precisa comparar/somar
  static snapshotLocal() {
    const num = (k) => parseInt(localStorage.getItem(k), 10) || 0;
    return {
      record: StorageManager.getRecord(),
      recordPts: num('furious_rhino_record_pts'), // cru: getRecordPts tem fallback p/ metros
      attempts: StorageManager.getAttempts(),
      playtimeS: StorageManager.getPlayTimeS(),
      wins: StorageManager.getWins(),
      animalsTotal: StorageManager.getAnimalsTotal(),
      deaths: StorageManager.getDeaths(),
      runs: StorageManager.getRuns(),
      history: StorageManager.getHistory(),
      geo: StorageManager.getGeo(),
      medals: StorageManager.getMedals(),
    };
  }

  // ------------------------------------------------------------- o merge

  // PURA (testável no node): decide o que escrever no localStorage a partir
  // do retrato local + docs públicos antigos. Devolve {set: {chave: string},
  // remove: [chave]} — quem chama aplica. Regras:
  //  - totais (attempts/playtime/wins/deaths) SOMAM — monotonia das rules;
  //  - máximos (record/record_pts/animals) ficam com o maior lado;
  //  - best_sent* copiam o doc de scores (sem eles o rename() recusa e o
  //    submit() de qualquer corrida menor é negado em silêncio);
  //  - runs concatena em ordem cronológica na janela de 50; history funde
  //    respeitando os tetos do cliente; medalhas = união + inferência.
  static mergeIdentity(local, oldScores, oldStats, nowMs = 0) {
    const set = {};
    const remove = [];
    const sc = oldScores || null;
    const st = oldStats || null;

    // ---- apelido + marca enviada (só se o doc de scores existe)
    if (sc && sc.name) {
      set['furious_rhino_player_name'] = String(sc.name);
      remove.push('furious_rhino_name_is_auto'); // nome escolhido de verdade
      const score = Math.floor(Number(sc.score)) || 0;
      if (score > 0) {
        set['furious_rhino_best_sent'] = String(score);
        const m = Math.floor(Number(sc.scoreM)) || score; // doc antigo: total == metros
        set['furious_rhino_best_sent_m'] = String(m);
        const atMs = ReassignSystem.toMillis(sc.scoreAt);
        if (atMs > 0) set['furious_rhino_best_sent_at'] = String(atMs);
        if (sc.skin) set['furious_rhino_best_sent_skin'] = String(sc.skin);
      }
    }

    // ---- máximos
    const bestM = Math.max(Number(local.record) || 0, (st && Number(st.bestM)) || 0,
      (sc && Math.floor(Number(sc.scoreM))) || 0);
    if (bestM > 0) set['furious_rhino_record'] = String(bestM);
    const bestPts = Math.max(Number(local.recordPts) || 0, (sc && Math.floor(Number(sc.score))) || 0);
    if (bestPts > 0) set['furious_rhino_record_pts'] = String(bestPts);

    // ---- totais: SOMA (>= servidor sempre — a invariante da monotonia)
    const sum = (a, b) => (Number(a) || 0) + (Number(b) || 0);
    set['furious_rhino_attempts'] = String(sum(local.attempts, st && st.attempts));
    set['furious_rhino_playtime_s'] = String(sum(local.playtimeS, st && st.playTimeS));
    set['furious_rhino_wins'] = String(sum(local.wins, st && st.wins));

    const deaths = { ...(local.deaths || {}) };
    if (st && st.deaths && typeof st.deaths === 'object') {
      for (const [k, v] of Object.entries(st.deaths)) deaths[k] = sum(deaths[k], v);
    }
    set['furious_rhino_deaths'] = JSON.stringify(deaths);

    // ---- runs: cronológico, janela de 50 (o teto das rules)
    const runs = [...((st && Array.isArray(st.runs)) ? st.runs : []), ...(local.runs || [])]
      .filter((r) => r && typeof r === 'object')
      .sort((a, b) => (Number(a.t) || 0) - (Number(b.t) || 0))
      .slice(-50);
    set['furious_rhino_runs'] = JSON.stringify(runs);

    // ---- history: contadores somados; days fundidos (r/s somam, b = max);
    //      firstSeenS = o mais antigo. Tetos do cliente reaplicados.
    const hl = local.history || {};
    const hs = (st && st.history && typeof st.history === 'object') ? st.history : {};
    const mergeBucket = (a = {}, b = {}, cap = 12) => {
      const out = { ...a };
      for (const [k, v] of Object.entries(b)) out[k] = sum(out[k], v);
      const keys = Object.keys(out);
      while (keys.length > cap) { // estourou: sai o menos usado
        const least = keys.reduce((x, y) => (out[x] <= out[y] ? x : y));
        delete out[least];
        keys.splice(keys.indexOf(least), 1);
      }
      return out;
    };
    const days = {};
    for (const k of new Set([...Object.keys(hl.days || {}), ...Object.keys(hs.days || {})])) {
      const A = (hl.days || {})[k] || {};
      const B = (hs.days || {})[k] || {};
      const d = {};
      if (A.r || B.r) d.r = sum(A.r, B.r);
      if (A.s || B.s) d.s = sum(A.s, B.s);
      const b = Math.max(Number(A.b) || 0, Number(B.b) || 0);
      if (b) d.b = b;
      days[k] = d;
    }
    const dayKeys = Object.keys(days).sort();
    while (dayKeys.length > 60) delete days[dayKeys.shift()]; // poda por idade
    const firsts = [hl.firstSeenS, hs.firstSeenS].map(Number).filter((x) => x > 0);
    set['furious_rhino_history'] = JSON.stringify({
      clients: mergeBucket(hl.clients, hs.clients, 12),
      geos: mergeBucket(hl.geos, hs.geos, 10),
      versions: mergeBucket(hl.versions, hs.versions, 10),
      days,
      firstSeenS: firsts.length ? Math.min(...firsts) : 0,
    });

    // ---- geo: só se o aparelho ainda não resolveu o dele
    if (!local.geo && st && st.geo && st.geo.country) {
      set['furious_rhino_geo'] = JSON.stringify({
        ok: true,
        country: String(st.geo.country),
        region: String(st.geo.region || ''),
        city: String(st.geo.city || ''),
        fetchedAt: nowMs,
        measuredAt: (Number(st.geo.at) || 0) * 1000 || nowMs,
      });
    }

    // ---- animais: piso honesto (só a janela de runs sobreviveu no servidor)
    const animals = Math.max(Number(local.animalsTotal) || 0,
      runs.reduce((a, r) => a + (Number(r.a) || 0), 0));
    if (animals > 0) set['furious_rhino_animals_total'] = String(animals);

    // ---- medalhas: união + inferência da janela (as skins de conquista
    //      voltam sozinhas via SkinSystem.migrateFromRuns no boot seguinte)
    const meds = new Set(local.medals || []);
    const totalAttempts = sum(local.attempts, st && st.attempts);
    if (totalAttempts > 0) meds.add('first_run');
    if (sum(local.wins, st && st.wins) > 0) meds.add('escape');
    for (const r of runs) {
      const m = Number(r.m) || 0;
      for (const [dist, id] of MEDAL_DIST) { if (m >= dist) meds.add(id); }
      if (r.c === 'win' || m >= 1000) meds.add('escape');
      if ((Number(r.w) || 0) >= 5) meds.add('walls_5');
      if ((Number(r.r) || 0) >= 3) meds.add('ramps_3');
      if ((Number(r.o) || 0) >= 2) meds.add('towers_2');
      if ((Number(r.e) || 0) >= 4) meds.add('city_boss_win'); // Muralha (2000m)
      if ((Number(r.u) || 0) >= 4) meds.add('boss2_win');     // Barreira (3650m)
      if ((Number(r.y) || 0) >= 5) meds.add('farao_win');     // Faraó (4700m)
      if ((Number(r.l) || 0) >= 5) meds.add('legend_world');  // Guardião (9995m)
    }
    if (animals >= 10) meds.add('animals_10');
    set['furious_rhino_medals'] = JSON.stringify([...meds]);

    return { set, remove };
  }

  // scoreAt chega em três formatos conforme o caminho: Timestamp do SDK
  // (toMillis), ISO string (REST) ou número já em ms (cópia local)
  static toMillis(v) {
    if (!v) return 0;
    if (typeof v === 'object' && typeof v.toMillis === 'function') {
      try { return v.toMillis(); } catch (e) { return 0; }
    }
    if (typeof v === 'string') return Date.parse(v) || 0;
    return Number(v) || 0;
  }
}
