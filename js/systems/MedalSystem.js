import { StorageManager } from '../utils/StorageManager.js';

// Medalhas locais (localStorage, sem rede). Os critérios usam só o que o
// fim da corrida já conhece — distância, vitória, recorde — mais dois
// contadores baratos (paredes da corrida e animais acumulados).
export const MEDALS = [
  { id: 'first_run', emoji: '🐾', name: 'Primeira Fuga', desc: 'Complete sua primeira corrida', test: () => true },
  { id: 'dist_100', emoji: '🏃', name: 'Aquecimento', desc: 'Corra 100m', test: (s) => s.distance >= 100 },
  { id: 'dist_200', emoji: '🔥', name: 'Esquentando', desc: 'Corra 200m', test: (s) => s.distance >= 200 },
  { id: 'dist_300', emoji: '💨', name: 'Em Disparada', desc: 'Corra 300m', test: (s) => s.distance >= 300 },
  // v1.6: o portão passou de 800m para 1000m e os textos acompanharam. Os `id`
  // são preservados de propósito — a lista de medalhas é um Set de ids no
  // localStorage, então mexer neles apagaria conquistas já ganhas.
  { id: 'dist_400', emoji: '🌗', name: 'Na Savana', desc: 'Corra 400m', test: (s) => s.distance >= 400 },
  { id: 'dist_600', emoji: '🚀', name: 'Na Floresta', desc: 'Corra 600m', test: (s) => s.distance >= 600 },
  { id: 'escape', emoji: '🗽', name: 'Livre!', desc: 'Escape do zoológico (1000m)', test: (s) => s.won || s.escaped },
  // Deixou de duplicar a fuga: agora é o primeiro marco DENTRO da cidade
  { id: 'dist_1000', emoji: '🌠', name: 'Na Cidade', desc: 'Corra 1100m — 100m de cidade', test: (s) => s.distance >= 1100 },
  { id: 'dist_1200', emoji: '👑', name: 'Lenda do Zoológico', desc: 'Corra 1200m — a dificuldade máxima', test: (s) => s.distance >= 1200 },
  // A escada parava em 1200m, que 3,5% das corridas já alcançavam. O recorde
  // absoluto da v1.5 foi 1654m — daí os degraus novos.
  { id: 'dist_1600', emoji: '🛸', name: 'Fora de Órbita', desc: 'Corra 1600m', test: (s) => s.distance >= 1600 },
  { id: 'dist_2000', emoji: '🏆', name: 'Inalcançável', desc: 'Corra 2000m', test: (s) => s.distance >= 2000 },
  { id: 'walls_5', emoji: '🧱', name: 'Demolidor', desc: 'Quebre 5 paredes em uma corrida', test: (s) => s.wallsBroken >= 5 },
  { id: 'ramps_3', emoji: '🚜', name: 'Escavadeira', desc: 'Destrua 3 morros em uma corrida', test: (s) => s.rampsSmashed >= 3 },
  { id: 'towers_2', emoji: '⚡', name: 'Torre Abaixo', desc: 'Derrube 2 torres em uma corrida', test: (s) => s.towersDowned >= 2 },
  { id: 'animals_10', emoji: '🦁', name: 'Rolo Compressor', desc: 'Atropele 10 animais (no total)', test: (s) => s.animalsTotal >= 10 },
  { id: 'record_2x', emoji: '🎖️', name: 'Superação', desc: 'Bata seu próprio recorde', test: (s) => s.isNewRecord && s.hadPreviousRecord },
];

export class MedalSystem {
  // stats: { distance, won, isNewRecord, hadPreviousRecord, wallsBroken,
  //          rampsSmashed, towersDowned, animalsTotal }
  // Retorna as medalhas ganhas AGORA, já persistidas — "Jogar Novamente"
  // recarrega a página, então nada pode ficar só em memória.
  static evaluateRun(stats) {
    const owned = new Set(StorageManager.getMedals());
    const earned = MEDALS.filter((m) => !owned.has(m.id) && m.test(stats));
    if (earned.length) StorageManager.addMedals(earned.map((m) => m.id));
    return earned;
  }
}
