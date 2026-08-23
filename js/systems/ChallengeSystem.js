import { Constants } from '../utils/Constants.js';
import { StorageManager } from '../utils/StorageManager.js';
import { ScoreSystem } from './ScoreSystem.js';
import { getDb } from './LeaderboardSystem.js';

// Arena de Desafios (v1.8.6) — desafios 1v1 e em grupo entre jogadores.
//
// A decisão central: o desafio é METADADO; o placar é DERIVADO. O doc
// challenges/{id} é escrito UMA vez pelo criador e o único update permitido
// pelas rules é o mapa `accepted` CRESCER (o aceite). O placar nunca é
// gravado em lugar nenhum: ele é recomputado no cliente lendo stats/{id} de
// cada participante ACEITO — o StatsSystem já espelha a janela de runs[]
// (com `t` em epoch-SEGUNDOS e os contadores de façanha) com leitura
// pública, e ScoreSystem.runBonus/total recomputam os pontos de qualquer
// corrida. ZERO write cruzado entre jogadores: sem autenticação, é o único
// desenho em que ninguém consegue corromper o resultado de outro.
//
// Molde do NewsSystem/LeaderboardSystem: classe estática, chaves próprias de
// localStorage, e NENHUM método de rede propaga erro — falhou, degrada para
// o cache e o jogo segue (regra 1 do projeto: acessório nunca quebra o
// núcleo). Timestamps do desafio em epoch SEGUNDOS (ints), casando com
// runs[].t sem conversão nenhuma.
const CACHE_KEY = 'furious_rhino_chal_cache';        // { at: ms, list: [ch] }
const SEEN_KEY = 'furious_rhino_chal_seen';          // { [id]: { at: ms, d?: 1 } }
const STANDINGS_KEY = 'furious_rhino_chal_standings'; // { [chId]: { at: ms, rows } }
const DIR_KEY = 'furious_rhino_chal_dir';            // { at: ms, list: [{id,name}] }
const DIR_TTL_MS = 10 * 60 * 1000; // diretório de adversários: 10 min basta
const SEEN_CAP = 60;       // convites lembrados (visto/recusado) — poda por idade
const STANDINGS_CAP = 12;  // placares cacheados — poda por idade
const ENDED_GRACE_S = 24 * 3600; // encerrados há < 24h ficam no cache (card de resultado)

export class ChallengeSystem {
  // ------------------------------------------------------------------ PURAS
  // (testáveis no node — tools/test-challenge.mjs; nowMs/nowS parametrizáveis)

  // A melhor corrida (em PONTOS) da janela [startS, endS] — bordas INCLUSAS
  // dos dois lados, porque `t` e a janela têm a mesma resolução (segundos) e
  // excluir a borda descartaria uma corrida legítima cravada no gongo.
  // Métrica em pts e não em metros (decisão do dono): uma corrida de 900m
  // cheia de combate PODE bater uma de 1000m sem nada — é a mesma régua do
  // ranking. Empate em pts: a mais ANTIGA vence (quem cravou primeiro fica).
  // Tolerante a dado de terceiros: runs não-lista, itens malformados.
  static bestInWindow(runs, startS, endS) {
    const list = Array.isArray(runs) ? runs : [];
    const s = Math.floor(Number(startS) || 0);
    const e = Math.floor(Number(endS) || 0);
    let best = null;
    for (const item of list) {
      const r = item && typeof item === 'object' ? item : {};
      const t = Math.floor(Number(r.t) || 0);
      if (t < s || t > e) continue;
      const m = Math.floor(Number(r.m) || 0);
      // MESMA conta do ranking: total = metros + bônus recomputado (runBonus
      // cobre w/r/o/a e as camadas b/e/l dos três bosses da v1.8.5)
      const pts = ScoreSystem.total(m, ScoreSystem.runBonus(r));
      if (!best || pts > best.pts || (pts === best.pts && t < best.t)) {
        best = { pts, m, t };
      }
    }
    return best;
  }

  // Texto do card: 'termina em 2d 14h' | 'termina em 5h' | 'termina em 12min'
  // | 'encerrado'. Abaixo de 1 minuto arredonda para '1min' — mostrar '0min'
  // num desafio ainda ativo pareceria bug.
  static countdownText(endAtS, nowMs = Date.now()) {
    const diffS = Math.floor(Number(endAtS) || 0) - Math.floor(nowMs / 1000);
    if (diffS <= 0) return 'encerrado';
    const h = Math.floor(diffS / 3600);
    if (h >= 24) return `termina em ${Math.floor(h / 24)}d ${h % 24}h`;
    if (h >= 1) return `termina em ${h}h`;
    return `termina em ${Math.max(1, Math.floor(diffS / 60))}min`;
  }

  // startAt <= now < endAt. Fim EXCLUSIVO de propósito: no segundo endAt o
  // desafio já encerrou (o countdownText diz 'encerrado' no mesmo instante),
  // mas uma corrida cravada em t == endAt ainda conta no bestInWindow — o
  // desafio dura [startAt, endAt] inteiro, fechado dos dois lados.
  // v1.8.7-fix4: desafio cancelado pelo criador — o doc fica (delete é
  // proibido), o ESTADO muda. Cancelado nunca é ativo, nunca convida, nunca
  // pontua; o card vira aviso até o desafiado dispensar ou o prazo vencer.
  static isCancelled(ch) {
    return Number(ch && ch.cancelledAt) > 0;
  }

  static isActive(ch, nowS = Math.floor(Date.now() / 1000)) {
    const c = ch || {};
    const s = Math.floor(Number(c.startAt) || 0);
    const e = Math.floor(Number(c.endAt) || 0);
    return !this.isCancelled(ch) && (s > 0 && s <= nowS && nowS < e);
  }

  // Papel do jogador num desafio: 'creator' | 'accepted' | 'invited' | 'out'.
  // O criador nasce aceito (o doc já grava accepted[criador]), mas o rótulo
  // 'creator' vence — a UI trata o dono diferente (sem botão de aceitar).
  static statusOf(ch, myId) {
    const c = ch || {};
    const id = String(myId || '');
    if (!id) return 'out';
    const from = c.from && typeof c.from === 'object' ? c.from : {};
    if (String(from.id || '') === id) return 'creator';
    const accepted = c.accepted && typeof c.accepted === 'object' ? c.accepted : {};
    if (id in accepted) return 'accepted';
    const parts = Array.isArray(c.participants) ? c.participants : [];
    if (parts.some((p) => String(p) === id)) return 'invited';
    return 'out';
  }

  // A linha líder de um standings (pts máx) ou null. Linha sem `best` (aceito
  // que ainda não correu na janela) não lidera; empate: a corrida mais ANTIGA
  // vence — mesma regra de desempate do bestInWindow, senão o líder mudaria
  // conforme a ordem das linhas.
  static leaderOf(rows) {
    const list = Array.isArray(rows) ? rows : [];
    let leader = null;
    for (const row of list) {
      if (!row || !row.best || !Number.isFinite(Number(row.best.pts))) continue;
      if (!leader || row.best.pts > leader.best.pts
        || (row.best.pts === leader.best.pts && row.best.t < leader.best.t)) {
        leader = row;
      }
    }
    return leader;
  }

  // Guardas locais do create, como função PURA (o create a chama com o estado
  // real; o teste a chama direto). Devolve a `reason` ou null se está tudo ok.
  // Ordem deliberada: 'name' antes de 'cap' antes de 'invalid' — o primeiro
  // problema que o jogador consegue resolver é o que a UI deve mostrar.
  static validateCreate({ myId, myName, isAuto, participants, days, activeCreated } = {}) {
    // Criar desafio exige apelido PRÓPRIO (não Anonimo_N): o nome do criador
    // viaja no doc e é o que os convidados leem — desafio de anônimo não
    // convida ninguém. Ser desafiado NÃO exige nada.
    if (!myName || isAuto) return 'name';
    if ((Number(activeCreated) || 0) >= Constants.CHALLENGE_MAX_ACTIVE_CREATED) return 'cap';
    const list = Array.isArray(participants) ? participants : [];
    if (!list.some((p) => String(p) === String(myId))) return 'invalid';
    if (list.length < 2 || list.length > Constants.CHALLENGE_MAX_PARTICIPANTS) return 'invalid';
    if (!Constants.CHALLENGE_DURATIONS_D.includes(Math.floor(Number(days) || 0))) return 'invalid';
    return null;
  }

  // Decodifica um doc de challenges com tolerância total — o dado vem de
  // TERCEIROS (qualquer cliente pode ter escrito) e um doc malformado não
  // pode derrubar a lista inteira. createdAt fica de fora do cache: só as
  // rules o consomem.
  static normalize(id, data) {
    const d = data && typeof data === 'object' ? data : {};
    const from = d.from && typeof d.from === 'object' ? d.from : {};
    const names = {};
    if (d.names && typeof d.names === 'object') {
      for (const [k, v] of Object.entries(d.names)) {
        if (typeof v === 'string' && v) names[String(k)] = v.slice(0, 12);
      }
    }
    const accepted = {};
    if (d.accepted && typeof d.accepted === 'object') {
      for (const [k, v] of Object.entries(d.accepted)) {
        accepted[String(k)] = Math.floor(Number(v) || 0);
      }
    }
    return {
      id: String(id || ''),
      from: { id: String(from.id || ''), name: String(from.name || '???').slice(0, 12) },
      participants: Array.isArray(d.participants) ? d.participants.map(String) : [],
      names,
      startAt: Math.floor(Number(d.startAt) || 0),
      endAt: Math.floor(Number(d.endAt) || 0),
      accepted,
    };
  }

  // ------------------------------------------------------- ESTADO / REDE
  // (todas engolem erro e degradam para cache; NUNCA lançam)

  // Cache síncrono da lista — é o que a tela pinta no boot, sem rede.
  // ------------------------------------------- diretório de adversários
  // v1.8.7: "quem eu posso desafiar" deixou de ser o top 10 — é a coleção
  // scores/ inteira (todo mundo que já pontuou com apelido), em ordem
  // alfabética. 1 leitura de coleção a cada 10 min, no molde do checkName
  // (que já baixa a coleção inteira para conferir apelido). Busca aproximada
  // = slug sem acento/caixa, resolvida no cliente.
  static dirSlug(name) {
    return String(name || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }

  static directoryCached() {
    try {
      const raw = JSON.parse(localStorage.getItem(DIR_KEY));
      return raw && Array.isArray(raw.list) ? raw : null;
    } catch (e) {
      return null;
    }
  }

  static async fetchDirectory(force = false) {
    const cached = this.directoryCached();
    if (!force && cached && Date.now() - cached.at < DIR_TTL_MS) return cached.list;
    try {
      const { fs, db } = await getDb();
      const snap = await fs.getDocs(fs.collection(db, 'scores'));
      const myId = StorageManager.getOrCreatePlayerId();
      const list = snap.docs
        .filter((d) => !/^claude-/.test(d.id) && d.id !== myId)
        .map((d) => ({ id: d.id, name: String(d.data().name || '').slice(0, 12) }))
        .filter((e) => e.name.length >= 3)
        .sort((a, b) => this.dirSlug(a.name).localeCompare(this.dirSlug(b.name)));
      try {
        localStorage.setItem(DIR_KEY, JSON.stringify({ at: Date.now(), list }));
      } catch (e) { /* sem cache é aceitável */ }
      return list;
    } catch (e) {
      return cached ? cached.list : []; // rede falhou: o cache velho ainda serve
    }
  }

  static cached() {
    try {
      const raw = JSON.parse(localStorage.getItem(CACHE_KEY));
      return raw && typeof raw === 'object' && Array.isArray(raw.list) ? raw : null;
    } catch (e) {
      return null;
    }
  }

  static saveCache(list, at = Date.now()) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at, list }));
    } catch (e) { /* quota cheia: seguir sem cache é aceitável */ }
  }

  // Meus desafios (query participants array-contains meuId), TTL de 1h.
  // SEM orderBy de propósito: array-contains + orderBy exigiria índice
  // composto; a lista é minúscula e ordenar/filtrar no cliente sai de graça.
  // Guarda ativos + encerrados há < 24h (o card de "resultado" precisa do
  // desafio recém-encerrado). LEITURA nunca é bloqueada por allowsRemoteWrite
  // — o guard de localhost vale só para writes (create/accept).
  static async refresh() {
    const cached = this.cached();
    if (cached && Date.now() - cached.at < Constants.CHALLENGE_CACHE_TTL_MS) {
      return cached.list;
    }
    try {
      const { fs, db } = await getDb();
      const myId = StorageManager.getOrCreatePlayerId();
      const snap = await fs.getDocs(fs.query(
        fs.collection(db, 'challenges'),
        fs.where('participants', 'array-contains', myId)
      ));
      const nowS = Math.floor(Date.now() / 1000);
      const list = snap.docs
        .map((d) => this.normalize(d.id, d.data()))
        .filter((ch) => ch.endAt + ENDED_GRACE_S > nowS);
      this.saveCache(list);
      return list;
    } catch (e) {
      return cached ? cached.list : []; // offline/regra: o cache velho vale
    }
  }

  // v1.8.7-fix4: o teto de 3 vale para desafios ATIVOS em que estou DENTRO
  // (criador ou aceito) — é o mesmo limite do que a home mostra empilhado.
  // Sem auth as rules não impõem teto; ele é honrado no cliente.
  static activeCreatedCount(nowS = Math.floor(Date.now() / 1000)) {
    const cached = this.cached();
    const myId = StorageManager.getOrCreatePlayerId();
    return ((cached && cached.list) || []).filter((ch) => {
      if (!ch || !this.isActive(ch, nowS)) return false;
      const st = this.statusOf(ch, myId);
      return st === 'creator' || st === 'accepted';
    }).length;
  }

  // v1.8.7-fix4: cancela um desafio MEU — regrava o doc relido com
  // cancelledAt (as rules só deixam esse campo mudar, uma vez). Vale para
  // todos os competidores na próxima leitura de cada um (TTL 1h do cache).
  // -> { ok: true } | { ok: false, reason: 'notmine'|'local'|'offline' }
  static async cancel(id) {
    try {
      const myId = StorageManager.getOrCreatePlayerId();
      const cached = this.cached();
      const ch = ((cached && cached.list) || []).find((c) => c && c.id === id);
      if (!ch || !ch.from || String(ch.from.id) !== myId) return { ok: false, reason: 'notmine' };
      if (!StorageManager.allowsRemoteWrite()) return { ok: false, reason: 'local' };
      const { fs, db } = await getDb();
      const snap = await fs.getDoc(fs.doc(db, 'challenges', id));
      if (!snap.exists()) {
        // v1.8.10-fix: doc que NÃO existe não é "sem internet" — é um
        // FANTASMA do cache (desafio de teste apagado pelo admin, TTL de 1h
        // ainda segurando). Já encerrado por definição: limpa do cache e a
        // UI segue sem drama. (Aconteceu de verdade: o cleanup-challenges de
        // 22/08 apagou docs que o cache do dono ainda mostrava.)
        const lista = ((cached && cached.list) || []).filter((c) => c && c.id !== id);
        this.saveCache(lista, cached ? cached.at : Date.now());
        return { ok: true, ghost: true };
      }
      const data = snap.data();
      await fs.setDoc(fs.doc(db, 'challenges', id), {
        ...data,
        cancelledAt: Math.floor(Date.now() / 1000),
      });
      // espelha no cache local na hora (o dono não espera o TTL)
      ch.cancelledAt = Math.floor(Date.now() / 1000);
      this.saveCache((cached && cached.list) || [], cached ? cached.at : Date.now());
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'offline' }; // rede/regra (rules antigas?)
    }
  }

  // Cria o desafio: 1 setDoc, id = crypto.randomUUID() (36 chars — dentro do
  // 16..40 das rules). O criador já nasce em `accepted` (quem desafia está
  // dentro por definição). Guardas locais ANTES de qualquer rede — cada
  // reason vira uma mensagem específica na UI.
  // -> { ok: true, id } | { ok: false, reason: 'name'|'cap'|'local'|'offline'|'invalid' }
  static async create({ participants, names, days } = {}) {
    try {
      const myId = StorageManager.getOrCreatePlayerId();
      const myName = StorageManager.getPlayerName();
      const nowS = Math.floor(Date.now() / 1000);
      // Criador SEMPRE dentro, sem duplicatas — a lista final é a validada
      const list = [...new Set([myId, ...(Array.isArray(participants) ? participants.map(String) : [])])];
      const reason = this.validateCreate({
        myId,
        myName,
        isAuto: StorageManager.isNameAuto(),
        participants: list,
        days,
        activeCreated: this.activeCreatedCount(nowS),
      });
      if (reason) return { ok: false, reason };
      // v1.8.7-fix2: bloqueio de AMBIENTE (localhost sem opt-in) tem razão
      // própria — "sem conexão" era mentira e confundia o teste local. O
      // opt-in é o mesmo dos e2e (furious_rhino_allow_local_write), ligável
      // no ?debug=1.
      if (!StorageManager.allowsRemoteWrite()) return { ok: false, reason: 'local' };

      // `names` para render sem read extra: só apelidos de quem participa,
      // no teto de 12 chars do ranking; o meu entra sempre por cima
      const nm = {};
      if (names && typeof names === 'object') {
        for (const [k, v] of Object.entries(names)) {
          if (list.includes(String(k)) && typeof v === 'string' && v) {
            nm[String(k)] = v.slice(0, 12);
          }
        }
      }
      nm[myId] = String(myName).slice(0, 12);

      const { fs, db } = await getDb();
      const id = crypto.randomUUID();
      const doc = {
        from: { id: myId, name: nm[myId] },
        participants: list,
        names: nm,
        startAt: nowS,
        endAt: nowS + Math.floor(Number(days)) * 86400,
        accepted: { [myId]: nowS }, // o criador nasce aceito
        createdAt: fs.serverTimestamp(),
      };
      await fs.setDoc(fs.doc(db, 'challenges', id), doc);

      // Entra no cache na hora (o teto de ativos e a lista da UI enxergam o
      // desafio novo sem refetch); o `at` antigo fica — criar não revalida
      // os desafios dos OUTROS
      const cached = this.cached();
      const nextList = ((cached && cached.list) || []).concat([this.normalize(id, doc)]);
      this.saveCache(nextList, cached ? cached.at : Date.now());
      return { ok: true, id };
    } catch (e) {
      return { ok: false, reason: 'offline' }; // rede/regra — nada gravado
    }
  }

  // Aceita um convite: relê o doc e o regrava INTEIRO com a minha entrada
  // acrescida em `accepted`. setDoc SEM merge de propósito — as rules exigem
  // que o diff().affectedKeys() toque SÓ 'accepted', então todos os outros
  // campos têm de bater byte a byte com o resource.data, e regravar o doc
  // relido é exatamente isso (Timestamp de createdAt viaja de volta intacto).
  static async accept(id) {
    try {
      if (!StorageManager.allowsRemoteWrite()) return false;
      const { fs, db } = await getDb();
      const ref = fs.doc(db, 'challenges', String(id));
      const snap = await fs.getDoc(ref);
      if (!snap.exists()) return false;
      const data = snap.data();
      const ch = this.normalize(snap.id, data);
      const myId = StorageManager.getOrCreatePlayerId();
      const nowS = Math.floor(Date.now() / 1000);
      if (!ch.participants.includes(myId)) return false; // não fui convidado
      if (!this.isActive(ch, nowS)) return false;        // expirado não aceita
      if (ch.accepted[myId]) return true;                // idempotente

      await fs.setDoc(ref, {
        ...data,
        accepted: { ...(data.accepted && typeof data.accepted === 'object' ? data.accepted : {}), [myId]: nowS },
      });

      // Espelha no cache local (a UI troca 'invited' -> 'accepted' na hora)
      const cached = this.cached();
      if (cached) {
        const list = cached.list.map((c) => (c && c.id === ch.id
          ? { ...c, accepted: { ...c.accepted, [myId]: nowS } }
          : c));
        this.saveCache(list, cached.at);
      }
      this.markSeen(ch.id);
      return true;
    } catch (e) {
      return false; // offline ou regra rejeitou (ex.: corrida de aceites)
    }
  }

  // -------------------------------------------------- visto/recusado (LOCAL)
  // Recusar é SÓ local: o doc não guarda recusa nenhuma — ninguém fica
  // exposto como "fulano recusou", e as rules nem permitiriam (o update só
  // deixa `accepted` crescer). O convite simplesmente some deste aparelho.
  static seenMap() {
    try {
      const raw = JSON.parse(localStorage.getItem(SEEN_KEY));
      return raw && typeof raw === 'object' ? raw : {};
    } catch (e) {
      return {};
    }
  }

  static saveSeen(map) {
    try {
      const keys = Object.keys(map);
      if (keys.length > SEEN_CAP) {
        // Poda por IDADE: o convite mais antigo já expirou faz tempo
        keys.sort((a, b) => (Number(map[a] && map[a].at) || 0) - (Number(map[b] && map[b].at) || 0));
        while (keys.length > SEEN_CAP) delete map[keys.shift()];
      }
      localStorage.setItem(SEEN_KEY, JSON.stringify(map));
    } catch (e) { /* quota cheia: no pior caso o convite reaparece */ }
  }

  static markSeenAs(id, flag) {
    try {
      const map = this.seenMap();
      map[id] = { at: Date.now(), d: flag };
      localStorage.setItem(SEEN_KEY, JSON.stringify(map));
    } catch (e) { /* sem espaço: aceitável */ }
  }

  static markSeen(id) {
    const map = this.seenMap();
    const key = String(id || '');
    if (!key) return;
    map[key] = { ...(map[key] || {}), at: Date.now() };
    this.saveSeen(map);
  }

  // O desafiado toca no card cancelado para dispensar o aviso (d:2). Sem
  // toque, o aviso morre sozinho no endAt original do desafio.
  static dismissLocal(id) {
    this.markSeenAs(id, 2);
  }

  static isDismissed(id) {
    const map = this.seenMap();
    return !!(map[id] && map[id].d === 2);
  }

  static declineLocal(id) {
    const map = this.seenMap();
    const key = String(id || '');
    if (!key) return;
    map[key] = { at: Date.now(), d: 1 };
    this.saveSeen(map);
  }

  // Convites que merecem badge: ativos + sou participante + não aceitei +
  // nunca vistos/recusados. Só cache, síncrono — roda no boot da tela.
  // (cancelado não convida — filtrado abaixo via isActive, que já o exclui)
  static unseenInvites(nowS = Math.floor(Date.now() / 1000)) {
    const cached = this.cached();
    if (!cached) return [];
    const myId = StorageManager.getOrCreatePlayerId();
    const seen = this.seenMap();
    return cached.list.filter((ch) => ch
      && this.isActive(ch, nowS)
      && this.statusOf(ch, myId) === 'invited'
      && !seen[String(ch.id)]);
  }

  // ------------------------------------------------------------- standings
  static standingsEntry(chId) {
    try {
      const raw = JSON.parse(localStorage.getItem(STANDINGS_KEY));
      const entry = raw && typeof raw === 'object' ? raw[String(chId)] : null;
      return entry && Array.isArray(entry.rows) ? entry : null;
    } catch (e) {
      return null;
    }
  }

  static saveStandings(chId, rows) {
    try {
      let map;
      try {
        map = JSON.parse(localStorage.getItem(STANDINGS_KEY)) || {};
      } catch (e) {
        map = {};
      }
      if (!map || typeof map !== 'object') map = {};
      map[String(chId)] = { at: Date.now(), rows };
      const keys = Object.keys(map);
      if (keys.length > STANDINGS_CAP) {
        keys.sort((a, b) => (Number(map[a] && map[a].at) || 0) - (Number(map[b] && map[b].at) || 0));
        while (keys.length > STANDINGS_CAP) delete map[keys.shift()];
      }
      localStorage.setItem(STANDINGS_KEY, JSON.stringify(map));
    } catch (e) { /* quota cheia: standings volta a ser recomputado */ }
  }

  // v1.8.10-fix3 (BUG DE PRODUÇÃO): a MINHA linha do placar nunca pode
  // depender de rede nem de cache — as minhas corridas estão aqui do lado, no
  // localStorage, sempre frescas. Sem isto o jogador criava o desafio (placar
  // salvo com "ainda não correu"), jogava 15 corridas em 9 minutos e a home
  // continuava servindo o cache de 30 min: o próprio placar NUNCA mudava.
  static withMyFreshBest(rows, ch) {
    if (!Array.isArray(rows) || !ch) return rows;
    const myId = StorageManager.getOrCreatePlayerId();
    if (!rows.some((r) => r && r.id === myId)) return rows;
    const startS = Math.floor(Number(ch.startAt) || 0);
    const endS = Math.floor(Number(ch.endAt) || 0);
    const meu = this.bestInWindow(StorageManager.getRuns(), startS, endS);
    const out = rows.map((r) => (r && r.id === myId ? { ...r, best: meu || r.best } : r));
    // a ordem é por pontos: reordena com a marca nova (mesma regra do sort
    // do standings — sem marca vai para o fim; empate, corrida mais antiga)
    return out.sort((a, b) => {
      const pa = a.best ? a.best.pts : -1;
      const pb = b.best ? b.best.pts : -1;
      if (pb !== pa) return pb - pa;
      return (a.best ? a.best.t : 0) - (b.best ? b.best.t : 0);
    });
  }

  // Esquece o placar cacheado (de um desafio ou de todos) — chamado no fim de
  // CADA corrida: sem isso a marca dos ADVERSÁRIOS só apareceria 30 min
  // depois, e a minha dependeria da sorte do TTL.
  static invalidateStandings(chId = null) {
    try {
      if (!chId) {
        localStorage.removeItem(STANDINGS_KEY);
        return;
      }
      const map = JSON.parse(localStorage.getItem(STANDINGS_KEY)) || {};
      delete map[String(chId)];
      localStorage.setItem(STANDINGS_KEY, JSON.stringify(map));
    } catch (e) { /* sem cache é o estado seguro: recomputa */ }
  }

  // Placar cacheado, síncrono — é o que a corrida/estacas leem, para NUNCA
  // esperarem rede. Devolve as rows (ordenadas) ou null se nunca computado.
  // Passando o `ch`, a minha linha vem do localStorage (sempre atual).
  static standingsCached(chId, ch = null) {
    const entry = this.standingsEntry(chId);
    if (!entry) return null;
    return ch ? this.withMyFreshBest(entry.rows, ch) : entry.rows;
  }

  // O placar DERIVADO: lê stats/{id} de cada ACEITO (getDoc 1 a 1 — a query
  // 'in' do Firestore limita a 10 e complica o cache; com <= 8 participantes
  // o custo é o mesmo) e computa a melhor corrida de cada um na janela.
  // TTL de 30min por desafio: no pior caso, 8 reads a cada meia hora.
  // -> [{ id, name, accepted, best }] ordenado por pts desc (sem marca no fim)
  static async standings(ch) {
    const c = ch || {};
    const chId = String(c.id || '');
    const entry = this.standingsEntry(chId);
    if (entry && Date.now() - entry.at < Constants.CHALLENGE_STANDINGS_TTL_MS) {
      // cache vale para os ADVERSÁRIOS; a minha linha é sempre recalculada
      return this.withMyFreshBest(entry.rows, c);
    }
    const accepted = c.accepted && typeof c.accepted === 'object' ? c.accepted : {};
    const names = c.names && typeof c.names === 'object' ? c.names : {};
    const startS = Math.floor(Number(c.startAt) || 0);
    const endS = Math.floor(Number(c.endAt) || 0);
    try {
      const { fs, db } = await getDb();
      const rows = [];
      for (const id of Object.keys(accepted)) {
        let best = null;
        try {
          const snap = await fs.getDoc(fs.doc(db, 'stats', id));
          if (snap.exists()) best = this.bestInWindow(snap.data().runs, startS, endS);
        } catch (e) { /* stats deste participante fora do ar: linha sem marca */ }
        rows.push({
          id: String(id),
          name: String(names[id] || '???').slice(0, 12),
          accepted: Math.floor(Number(accepted[id]) || 0),
          best,
        });
      }
      // pts desc; sem marca vai para o fim; empate: corrida mais antiga na
      // frente (mesma regra do leaderOf)
      rows.sort((a, b) => {
        const pa = a.best ? a.best.pts : -1;
        const pb = b.best ? b.best.pts : -1;
        if (pb !== pa) return pb - pa;
        return (a.best ? a.best.t : 0) - (b.best ? b.best.t : 0);
      });
      this.saveStandings(chId, rows);
      return this.withMyFreshBest(rows, c);
    } catch (e) {
      // offline: o placar velho vale — mas a MINHA linha ainda é local
      return entry ? this.withMyFreshBest(entry.rows, c) : [];
    }
  }
}
