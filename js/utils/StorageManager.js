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
