import { StorageManager } from '../utils/StorageManager.js';

// Medalhas locais (localStorage, sem rede). Os critérios usam só o que o
// fim da corrida já conhece — distância, vitória, recorde — mais dois
// contadores baratos (paredes da corrida e animais acumulados).
export const MEDALS = [
  { id: 'first_run', emoji: '🐾', name: 'Primeira Fuga', desc: 'Complete sua primeira corrida', test: () => true },
  { id: 'dist_100', emoji: '🏃', name: 'Aquecimento', desc: 'Corra 100m', test: (s) => s.distance >= 100 },
  { id: 'dist_200', emoji: '🔥', name: 'Esquentando', desc: 'Corra 200m', test: (s) => s.distance >= 200 },
  { id: 'dist_300', emoji: '💨', name: 'Em Disparada', desc: 'Corra 300m', test: (s) => s.distance >= 300 },
  { id: 'dist_400', emoji: '🌗', name: 'Meio Caminho', desc: 'Corra 400m', test: (s) => s.distance >= 400 },
  { id: 'dist_600', emoji: '🚀', name: 'Reta Final', desc: 'Corra 600m', test: (s) => s.distance >= 600 },
  { id: 'escape', emoji: '🗽', name: 'Livre!', desc: 'Escape do zoológico (800m)', test: (s) => s.won || s.escaped },
  { id: 'walls_5', emoji: '🧱', name: 'Demolidor', desc: 'Quebre 5 paredes em uma corrida', test: (s) => s.wallsBroken >= 5 },
  { id: 'animals_10', emoji: '🦁', name: 'Rolo Compressor', desc: 'Atropele 10 animais (no total)', test: (s) => s.animalsTotal >= 10 },
  { id: 'record_2x', emoji: '🎖️', name: 'Superação', desc: 'Bata seu próprio recorde', test: (s) => s.isNewRecord && s.hadPreviousRecord },
];

export class MedalSystem {
  // stats: { distance, won, isNewRecord, hadPreviousRecord, wallsBroken, animalsTotal }
  // Retorna as medalhas ganhas AGORA, já persistidas — "Jogar Novamente"
  // recarrega a página, então nada pode ficar só em memória.
  static evaluateRun(stats) {
    const owned = new Set(StorageManager.getMedals());
    const earned = MEDALS.filter((m) => !owned.has(m.id) && m.test(stats));
    if (earned.length) StorageManager.addMedals(earned.map((m) => m.id));
    return earned;
  }
}
