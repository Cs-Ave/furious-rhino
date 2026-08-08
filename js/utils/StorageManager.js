export class StorageManager {
  static RECORD_KEY = 'furious_rhino_record';

  static getRecord() {
    const stored = localStorage.getItem(this.RECORD_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static saveRecord(meters) {
    const current = this.getRecord();
    const newRecord = Math.max(current, meters);
    localStorage.setItem(this.RECORD_KEY, newRecord.toString());
    return newRecord;
  }

  static isNewRecord(meters) {
    return meters > this.getRecord();
  }

  static MUTE_KEY = 'furious_rhino_muted';

  static getMuted() {
    return localStorage.getItem(this.MUTE_KEY) === '1';
  }

  static setMuted(muted) {
    localStorage.setItem(this.MUTE_KEY, muted ? '1' : '0');
  }

  // --- Identidade do placar online (sem login: id aleatório por aparelho) ---
  static PLAYER_ID_KEY = 'furious_rhino_player_id';
  static PLAYER_NAME_KEY = 'furious_rhino_player_name';
  static BEST_SENT_KEY = 'furious_rhino_best_sent';

  static getOrCreatePlayerId() {
    let id = localStorage.getItem(this.PLAYER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(this.PLAYER_ID_KEY, id);
    }
    return id;
  }

  static getPlayerName() {
    return localStorage.getItem(this.PLAYER_NAME_KEY) || '';
  }

  static setPlayerName(name) {
    localStorage.setItem(this.PLAYER_NAME_KEY, name);
  }

  // Último score aceito pelo servidor — evita reenviar scores menores
  static getBestSent() {
    const stored = localStorage.getItem(this.BEST_SENT_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static setBestSent(meters) {
    localStorage.setItem(this.BEST_SENT_KEY, meters.toString());
  }

  // --- Medalhas e contadores acumulados (v1.2.1) ---
  static MEDALS_KEY = 'furious_rhino_medals';
  static ANIMALS_TOTAL_KEY = 'furious_rhino_animals_total';
  static LAST_RANK_KEY = 'furious_rhino_last_rank';

  static getMedals() {
    try {
      return JSON.parse(localStorage.getItem(this.MEDALS_KEY)) || [];
    } catch (e) {
      return []; // JSON corrompido — recomeça sem travar o jogo
    }
  }

  static addMedals(ids) {
    const merged = [...new Set([...this.getMedals(), ...ids])];
    localStorage.setItem(this.MEDALS_KEY, JSON.stringify(merged));
  }

  // Total de animais atropelados somando todas as corridas
  static getAnimalsTotal() {
    const stored = localStorage.getItem(this.ANIMALS_TOTAL_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static addAnimalsHit(count) {
    const total = this.getAnimalsTotal() + count;
    localStorage.setItem(this.ANIMALS_TOTAL_KEY, total.toString());
    return total;
  }

  // --- Nome automático (v1.6.0) ---
  // "Ficar anônimo" gravava Anonimo_N como nome DEFINITIVO do aparelho, e
  // como o modal só abria com o nome vazio, o jogo nunca mais perguntava:
  // uma escolha feita na primeira morte valia para sempre. Esta marca deixa
  // o jogo voltar a convidar — nos momentos de orgulho, e nunca bloqueando.
  static NAME_AUTO_KEY = 'furious_rhino_name_is_auto';
  static NAME_ASKED_KEY = 'furious_rhino_name_asked_at';

  static isNameAuto() {
    return localStorage.getItem(this.NAME_AUTO_KEY) === '1';
  }

  static setNameAuto(on) {
    if (on) localStorage.setItem(this.NAME_AUTO_KEY, '1');
    else localStorage.removeItem(this.NAME_AUTO_KEY);
  }

  // Nº da tentativa em que o convite foi feito pela última vez
  static getNameAskedAt() {
    return parseInt(localStorage.getItem(this.NAME_ASKED_KEY), 10) || 0;
  }

  static setNameAskedAt(n) {
    localStorage.setItem(this.NAME_ASKED_KEY, String(n));
  }

  // --- Marcas na pista (v1.6.0) ---
  // Quem está logo acima de você no ranking e quem lidera o mundo, cacheados
  // para as estacas serem plantadas SEM rede no início da corrida. O jogo
  // nunca espera essa consulta: sem cache, aparecem menos marcas.
  static RIVALS_KEY = 'furious_rhino_rivals';

  static getRivals() {
    try {
      const r = JSON.parse(localStorage.getItem(this.RIVALS_KEY));
      return r && typeof r === 'object' ? r : {};
    } catch (e) {
      return {};
    }
  }

  static setRivals(data) {
    try {
      localStorage.setItem(this.RIVALS_KEY, JSON.stringify(data));
    } catch (e) { /* quota cheia: seguir sem cache é aceitável */ }
  }

  // --- Telemetria local (v1.3.0): totais acumulados por aparelho ---
  // Persistidos NA HORA do evento: "Jogar Novamente" recarrega a página,
  // então nada pode ficar só em memória.
  static ATTEMPTS_KEY = 'furious_rhino_attempts';
  static PLAYTIME_KEY = 'furious_rhino_playtime_s';
  static WINS_KEY = 'furious_rhino_wins';
  static DEATHS_KEY = 'furious_rhino_deaths';
  static GEO_KEY = 'furious_rhino_geo';

  static getAttempts() {
    const stored = localStorage.getItem(this.ATTEMPTS_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static addAttempt() {
    const total = this.getAttempts() + 1;
    localStorage.setItem(this.ATTEMPTS_KEY, total.toString());
    return total;
  }

  static getPlayTimeS() {
    const stored = localStorage.getItem(this.PLAYTIME_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static addPlayTimeS(seconds) {
    const total = this.getPlayTimeS() + seconds;
    localStorage.setItem(this.PLAYTIME_KEY, total.toString());
    return total;
  }

  static getWins() {
    const stored = localStorage.getItem(this.WINS_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static addWin() {
    const total = this.getWins() + 1;
    localStorage.setItem(this.WINS_KEY, total.toString());
    return total;
  }

  // Mortes por tier (t1..t6; t5/t6 = modo infinito) e por causa
  // (wall/spike/animal/dart/tower/fall)
  static getDeaths() {
    const empty = { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0, t6: 0, wall: 0, spike: 0, animal: 0, dart: 0, tower: 0, fall: 0 };
    try {
      return { ...empty, ...(JSON.parse(localStorage.getItem(this.DEATHS_KEY)) || {}) };
    } catch (e) {
      return empty; // JSON corrompido — recomeça sem travar o jogo
    }
  }

  static addDeath(tierIdx, cause) {
    const deaths = this.getDeaths();
    const tierKey = `t${tierIdx + 1}`;
    if (tierKey in deaths) deaths[tierKey]++;
    if (cause in deaths) deaths[cause]++;
    localStorage.setItem(this.DEATHS_KEY, JSON.stringify(deaths));
    return deaths;
  }

  static getGeo() {
    try {
      return JSON.parse(localStorage.getItem(this.GEO_KEY));
    } catch (e) {
      return null;
    }
  }

  static setGeo(geo) {
    localStorage.setItem(this.GEO_KEY, JSON.stringify(geo));
  }

  // Últimas RUNS_WINDOW execuções — janela deslizante local, espelhada no doc
  // de stats p/ análise individual (a ficha do painel desenha a evolução daqui)
  //
  // v1.6: cada item passou de {t, m} para {t, m, s, c} — segundos da corrida e
  // causa do fim ('wall'|'spike'|'animal'|'dart'|'tower'|'fall'|'win'). Sai de
  // graça: a regra do Firestore só valida `runs is list && size() <= 50`, a
  // FORMA do elemento é livre. Com essas duas letras a mais dá para ler
  // duração por corrida, causa correlacionada com distância e curva de
  // aprendizado individual — toda a análise que orientou a v1.6 foi feita sem.
  static RUNS_KEY = 'furious_rhino_runs';
  static RUNS_WINDOW = 50; // teto das rules: runs.size() <= 50

  static getRuns() {
    try {
      const runs = JSON.parse(localStorage.getItem(this.RUNS_KEY));
      return Array.isArray(runs) ? runs : [];
    } catch (e) {
      return [];
    }
  }

  static addRun(meters, seconds = 0, cause = null) {
    const runs = this.getRuns();
    const run = { t: Math.floor(Date.now() / 1000), m: Math.floor(meters) };
    if (seconds > 0) run.s = Math.min(7200, Math.floor(seconds));
    if (cause) run.c = String(cause).slice(0, 8);
    runs.push(run);
    while (runs.length > this.RUNS_WINDOW) runs.shift();
    localStorage.setItem(this.RUNS_KEY, JSON.stringify(runs));
    return runs;
  }

  // --- Histórico acumulado do jogador (v1.5.0) ---
  // O doc de stats guardava só o ÚLTIMO aparelho/local (sobrescrito a cada
  // envio). Aqui os aparelhos, locais e versões viram contadores que só
  // crescem, com o primeiro acesso preservado. Vai para o servidor como UM
  // mapa (`history`) — as rules validam o mapa inteiro numa cláusula, e não
  // campo a campo (orçamento de avaliação do Firestore).
  static HISTORY_KEY = 'furious_rhino_history';
  static HISTORY_CAPS = { clients: 12, geos: 10, versions: 10 };

  static getHistory() {
    const empty = { clients: {}, geos: {}, versions: {}, firstSeenS: 0 };
    try {
      const h = JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || {};
      return {
        clients: (h.clients && typeof h.clients === 'object') ? h.clients : {},
        geos: (h.geos && typeof h.geos === 'object') ? h.geos : {},
        versions: (h.versions && typeof h.versions === 'object') ? h.versions : {},
        firstSeenS: typeof h.firstSeenS === 'number' && h.firstSeenS > 0 ? h.firstSeenS : 0,
      };
    } catch (e) {
      return empty; // JSON corrompido — recomeça sem travar o jogo
    }
  }

  // Uma chamada por fim de corrida. Rótulos vazios são ignorados (geo pode
  // não ter respondido ainda).
  static addHistory({ clientSig, geoLabel, version } = {}) {
    const h = this.getHistory();
    const bump = (bucket, key, cap) => {
      if (!key) return;
      bucket[key] = (Number(bucket[key]) || 0) + 1;
      // Teto aplicado no CLIENTE (as rules não contam chaves internas):
      // ao estourar, a assinatura menos usada sai
      const keys = Object.keys(bucket);
      if (keys.length > cap) {
        const least = keys.reduce((a, b) => (bucket[a] <= bucket[b] ? a : b));
        delete bucket[least];
      }
    };
    bump(h.clients, clientSig, this.HISTORY_CAPS.clients);
    bump(h.geos, geoLabel, this.HISTORY_CAPS.geos);
    bump(h.versions, version, this.HISTORY_CAPS.versions);
    if (!h.firstSeenS) h.firstSeenS = Math.floor(Date.now() / 1000);
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(h));
    return h;
  }

  // Última posição vista no ranking online — cacheada para a tela de
  // início mostrar sem nenhum custo de rede
  static getLastRank() {
    const stored = localStorage.getItem(this.LAST_RANK_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static setLastRank(rank) {
    localStorage.setItem(this.LAST_RANK_KEY, rank.toString());
  }
}
