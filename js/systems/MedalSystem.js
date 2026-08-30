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
  // v1.8.7 — os distritos deram nome aos marcos: ids IMUTÁVEIS (Set no
  // localStorage), textos re-batizados no vocabulário da cidade. Entram os
  // marcos dos portais (1400/1800) e o fim da fase (2200).
  { id: 'dist_1200', emoji: '🌙', name: 'Sombra do Subúrbio', desc: 'Corra 1200m — fundo no Subúrbio Sonolento', test: (s) => s.distance >= 1200 },
  { id: 'dist_1400', emoji: '🚦', name: 'Viaduto do Centro', desc: 'Cruze o viaduto (1400m) — a cidade acorda', test: (s) => s.distance >= 1400 },
  { id: 'dist_1600', emoji: '📡', name: 'Manhã de Pânico', desc: 'Corra 1600m sob os telões do Despertar', test: (s) => s.distance >= 1600 },
  { id: 'dist_1800', emoji: '🚨', name: 'Zona de Contenção', desc: 'Passe o checkpoint (1800m) — a cidade te caça', test: (s) => s.distance >= 1800 },
  { id: 'dist_2000', emoji: '🏆', name: 'Inalcançável', desc: 'Corra 2000m — a Muralha à vista', test: (s) => s.distance >= 2000 },
  { id: 'dist_2200', emoji: '🛣️', name: 'Atravessou a Cidade', desc: 'Cruze o Pórtico da Rodovia (2200m)', test: (s) => s.distance >= 2200 },
  // v1.8.10 — As Areias do Tempo: o deserto fecha o buraco de medalhas que
  // ia de 2200m ate a LENDA. Marcos das etapas + os dois combates.
  { id: 'dist_2700', emoji: '🌴', name: 'Miragem do Oásis', desc: 'Corra 2700m — a água é traiçoeira', test: (s) => s.distance >= 2700 },
  { id: 'dist_3700', emoji: '🔺', name: 'Vale dos Faraós', desc: 'Passe a Barreira e entre no Vale (3700m)', test: (s) => s.distance >= 3700 },
  { id: 'dist_4200', emoji: '⚰️', name: 'Necrópole de Areia', desc: 'Corra 4200m — a tempestade te espera', test: (s) => s.distance >= 4200 },
  { id: 'dist_4700', emoji: '🏜️', name: 'Atravessou o Deserto', desc: 'Chegue à muralha do Faraó (4700m)', test: (s) => s.distance >= 4700 },
  { id: 'walls_5', emoji: '🧱', name: 'Demolidor', desc: 'Quebre 5 paredes em uma corrida', test: (s) => s.wallsBroken >= 5 },
  { id: 'ramps_3', emoji: '🚜', name: 'Escavadeira', desc: 'Destrua 3 morros em uma corrida', test: (s) => s.rampsSmashed >= 3 },
  { id: 'towers_2', emoji: '⚡', name: 'Torre Abaixo', desc: 'Derrube 2 torres em uma corrida', test: (s) => s.towersDowned >= 2 },
  { id: 'animals_10', emoji: '🦁', name: 'Rolo Compressor', desc: 'Atropele 10 animais (no total)', test: (s) => s.animalsTotal >= 10 },
  { id: 'record_2x', emoji: '🎖️', name: 'Superação', desc: 'Bata seu próprio recorde', test: (s) => s.isNewRecord && s.hadPreviousRecord },
  // v1.8.7 — a Muralha assumiu o slot dos 2000m (e o contador boss2Layers);
  // o Cerco foi realocado para o deserto e ainda não tem âncora, então a
  // medalha dele fica DORMENTE (test => false) até ele reabrir — conceder
  // Fura-Bloqueio por vencer a Muralha seria a medalha errada. Id imutável.
    // v1.8.10: a medalha dormente ACORDOU — o Cerco vive, reformado como a
  // Barreira da Escavação (3650m). Id imutável; desc/test re-batizados.
  { id: 'boss2_win', emoji: '🕸️', name: 'Fura-Bloqueio', desc: 'Derrube a Barreira da Escavação (3650m)', test: (s) => (s.cercoLayers || 0) >= 4 },
  { id: 'farao_win', emoji: '🏺', name: 'Quebra-Faraó', desc: 'Derrote o Faraó de Bronze (4700m)', test: (s) => (s.faraoLayers || 0) >= 5 },
  { id: 'city_boss_win', emoji: '🧱', name: 'Queda da Muralha', desc: 'Derrube a Operação Muralha (2000m)', test: (s) => (s.boss2Layers || 0) >= 4 },
  { id: 'legend_world', emoji: '👑', name: 'Lenda do Mundo', desc: 'Vença o Caçador-Mor no fim do mundo', test: (s) => Boolean(s.legend) },
  // v1.11 "Streaks" — a chama dos dias seguidos (ideia F do banco). Avaliadas
  // pelo MELHOR streak da vida: a medalha nunca "descai" com a chama apagada.
  { id: 'streak_3', emoji: '🔥', name: 'Chama Acesa', desc: 'Jogue 3 dias seguidos', test: (s) => (s.streakBest || 0) >= 3 },
  { id: 'streak_7', emoji: '🕯️', name: 'Semana em Chamas', desc: 'Jogue 7 dias seguidos', test: (s) => (s.streakBest || 0) >= 7 },
  { id: 'streak_30', emoji: '🌋', name: 'Mês Incendiado', desc: 'Jogue 30 dias seguidos', test: (s) => (s.streakBest || 0) >= 30 },
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
