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

  // Últimas 10 execuções ({t: epoch em segundos, m: metros}) — janela
  // deslizante local, espelhada no doc de stats p/ análise individual
  static RUNS_KEY = 'furious_rhino_runs';

  static getRuns() {
    try {
      const runs = JSON.parse(localStorage.getItem(this.RUNS_KEY));
      return Array.isArray(runs) ? runs : [];
    } catch (e) {
      return [];
    }
  }

  static addRun(meters) {
    const runs = this.getRuns();
    runs.push({ t: Math.floor(Date.now() / 1000), m: Math.floor(meters) });
    while (runs.length > 10) runs.shift();
    localStorage.setItem(this.RUNS_KEY, JSON.stringify(runs));
    return runs;
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
