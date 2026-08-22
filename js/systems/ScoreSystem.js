import { Constants } from '../utils/Constants.js';

// v1.8.4: PONTUAÇÃO COMPOSTA. O `score` do ranking deixa de ser "metros" e
// passa a ser o TOTAL = metros + bônus por façanha; o campo novo (opcional)
// `scoreM` guarda os metros da marca.
//
// Por que assim, e não com um campo de versão: o bônus é SEMPRE >= 0, então
// todo documento antigo — e todo cliente velho ainda em cache, 1.3 a 1.5 —
// já grava um total válido de bônus zero. A presença de `scoreM` é a própria
// marca de versão. Retrocompatibilidade de graça: nada é migrado, ninguém
// some do ranking.
//
// Módulo PURO no espelho do MedalSystem/SkinSystem: sem Phaser, sem DOM, sem
// StorageManager — depende só de Constants. É o que deixa tools/test-score.mjs
// rodar no node e a fórmula ser recalibrada sem abrir o jogo.
//
// Divisão de trabalho da exibição (decisão do dono, §5-A das ideias):
// façanha FÍSICA fala em metros (fim de corrida, medalhas, skins, estacas);
// COMPETIÇÃO fala em pts (pódio, top 10, gap, push).
export class ScoreSystem {
  // Pontos de um evento pontuável. A tabela é MUTÁVEL (sliders do ?debug=1),
  // por isso a leitura é sempre feita aqui e nunca copiada para uma const.
  // Os 5 eventos de dentro da corrida (wall/ramp/tower/animal/bossLayer) são
  // os que o HUD soma ao vivo com os popups "+5"; os de fim de corrida
  // (escape/blitz/legend) saem do endBonus. Evento desconhecido vale 0 —
  // pontuar por engano é pior do que não pontuar.
  static pointsFor(evt) {
    const pts = Constants.SCORE_WEIGHTS[evt];
    return Number.isFinite(pts) ? Math.floor(pts) : 0;
  }

  // Bônus que só o FIM da corrida conhece.
  //   escaped — cruzou o portão (a façanha que separa o jogo em dois);
  //   blitz   — derrubou as 3 camadas do portão em <= SCORE_BLITZ_MAX_S:
  //             prêmio de EXECUÇÃO, não de sorte, por isso exige as 3
  //             camadas e um cronômetro > 0 (z ausente/zero = dado velho ou
  //             luta que não aconteceu, e nesse caso não paga);
  //   legend  — a marca máxima do jogo, paga uma vez só no fim.
  static endBonus({ escaped, bossLayers, bossFightS, legend } = {}) {
    const W = Constants.SCORE_WEIGHTS;
    let bonus = 0;
    if (escaped) bonus += W.escape;
    const layers = Number(bossLayers) || 0;
    const fightS = Number(bossFightS) || 0;
    if (layers >= 3 && fightS > 0 && fightS <= Constants.SCORE_BLITZ_MAX_S) bonus += W.blitz;
    if (legend) bonus += W.legend;
    return Math.floor(bonus);
  }

  // Total gravado no ranking. Duas travas, nesta ordem:
  //   1. teto do bônus (SCORE_BONUS_CAP × metros) — impede que uma corrida
  //      curta cheia de combate passe por cima de uma corrida longa; é o que
  //      mantém o Spearman metros × total em 0,993 (§5-A). Na simulação sobre
  //      as 895 corridas reais este teto nunca precisou agir: ele é rede.
  //   2. SCORE_MAX_TOTAL — mesmo teto das firestore.rules; passar disso é
  //      write NEGADO EM SILÊNCIO, então o clamp mora aqui também.
  // Metros <= 0 (morte na largada, dado corrompido) devolvem os próprios
  // metros: sem corrida não há façanha a premiar.
  static total(meters, bonus) {
    const m = Math.floor(Number(meters) || 0);
    if (m <= 0) return m;
    const capped = Math.min(Math.floor(Number(bonus) || 0), Math.floor(m * Constants.SCORE_BONUS_CAP));
    return Math.min(m + Math.max(capped, 0), Constants.SCORE_MAX_TOTAL);
  }

  // Recomputa o bônus de um item de runs[] (contadores de 1 letra:
  // m metros · c causa · w paredes · r rampas · o torres · a animais ·
  // b camadas do portão · z segundos de luta).
  //
  // ⚠️ CONTRATO: esta função tem de devolver EXATAMENTE o mesmo número que a
  // soma feita ao vivo durante a corrida (pointsFor por evento + endBonus).
  // É essa igualdade que dispensa gravar o bônus dentro de runs[] — e o
  // byte-budget de runs[] é lei aqui (regra 2 do CLAUDE.md: campo novo de
  // primeiro nível em stats derruba o orçamento das rules).
  // tools/test-score.mjs guarda essa igualdade com um assert dedicado.
  //
  // A fuga não tem letra própria em runs[]: deriva de c==='win' ou de ter
  // passado da linha do portão (mesma conta do SkinSystem/StatsDashboard).
  static runBonus(run) {
    const r = run || {};
    const m = Number(r.m) || 0;
    const won = r.c === 'win';
    // Derivados, nunca literais: se o portão ou o fim do mundo mudarem de
    // lugar, a recomputação acompanha sozinha (WIN_DISTANCE_PX = 1000m,
    // WORLD_END_PX = 10000m hoje).
    const gateM = Constants.WIN_DISTANCE_PX / Constants.PIXELS_PER_METER;
    const worldM = Constants.WORLD_END_PX / Constants.PIXELS_PER_METER;
    const combat = (Number(r.w) || 0) * this.pointsFor('wall')
      + (Number(r.r) || 0) * this.pointsFor('ramp')
      + (Number(r.o) || 0) * this.pointsFor('tower')
      + (Number(r.a) || 0) * this.pointsFor('animal')
      + (Number(r.b) || 0) * this.pointsFor('bossLayer');
    return combat + this.endBonus({
      escaped: won || m >= gateM,
      bossLayers: Number(r.b) || 0,
      bossFightS: Number(r.z) || 0,
      legend: won && m >= worldM,
    });
  }

  // Detalhamento para a tela de fim de corrida. `lines` é só o BÔNUS (os
  // metros aparecem sozinhos na tela, como façanha física) e traz apenas o
  // que pontuou — linha "×0 = 0 pts" é ruído. `bonus` é a soma das linhas
  // ANTES do teto; `total` já é o número que vai para o ranking (com teto e
  // clamp aplicados), então total - meters pode ser menor que bonus quando o
  // teto age — e é justamente isso que a tela deve mostrar.
  // `blitz` aqui já chega resolvido (booleano): quem chama é a cena, que tem
  // o cronômetro da luta; o endBonus é quem sabe a regra a partir dos
  // segundos brutos.
  static breakdown({
    meters = 0, walls = 0, ramps = 0, towers = 0, animals = 0,
    bossLayers = 0, escaped = false, blitz = false, legend = false,
  } = {}) {
    const lines = [];
    const add = (label, count, evt) => {
      const n = Number(count) || 0;
      if (n > 0) lines.push({ label: `${label} ×${n}`, pts: n * this.pointsFor(evt) });
    };
    add('🧱 Paredes', walls, 'wall');
    add('🏔️ Morros', ramps, 'ramp');
    add('🏰 Torres', towers, 'tower');
    add('🦁 Animais', animals, 'animal');
    add('🎯 Camadas do portão', bossLayers, 'bossLayer');
    const W = Constants.SCORE_WEIGHTS;
    if (escaped) lines.push({ label: '🗽 Fuga', pts: Math.floor(W.escape) });
    if (blitz) lines.push({ label: '⚡ Blitz', pts: Math.floor(W.blitz) });
    if (legend) lines.push({ label: '👑 LENDA', pts: Math.floor(W.legend) });
    const bonus = lines.reduce((sum, l) => sum + l.pts, 0);
    return { lines, bonus, total: this.total(meters, bonus) };
  }

  // Separador de milhar pt-BR feito à mão de propósito: toLocaleString
  // depende do ICU do ambiente (node sem full-icu e alguns WebViews devolvem
  // "1234"), e este texto vai para o pódio.
  static fmtPts(n) {
    return `${this.fmtNum(n)} pts`;
  }

  // O separador sozinho — os metros do "1.234 pts · 987 m" usam o MESMO, senão
  // a linha sai com dois padrões de número lado a lado ("5.804 pts · 5185 m").
  static fmtNum(n) {
    const v = Math.floor(Number(n) || 0);
    return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // Formato do pódio/top 10: "1.234 pts · 987 m".
  // Quando os dois números são IGUAIS (marca antiga, sem scoreM, ou corrida
  // sem nenhum bônus) mostra só "987 pts": repetir o mesmo número dos dois
  // lados do ponto do meio parece bug para o jogador, e essa é a leitura mais
  // comum da base — a maioria dos documentos ainda é pré-1.8.4.
  static fmtScore(entry) {
    const e = entry || {};
    const score = Math.floor(Number(e.score) || 0);
    const meters = Math.floor(Number(this.metersOf(e)) || 0);
    if (meters === score) return this.fmtPts(score);
    return `${this.fmtPts(score)} · ${this.fmtNum(meters)} m`;
  }

  // Leitura UNIVERSAL dos metros de uma entrada, em ordem de confiança:
  //   scoreM — ranking v1.8.4 (metros explícitos);
  //   m      — cópia local / item de runs[];
  //   score  — documento antigo, em que o score AINDA ERA os metros.
  // É essa cadeia que faz estacas da pista, funil e medalhas continuarem
  // falando em metros sem migração nenhuma no Firestore.
  static metersOf(entry) {
    const e = entry || {};
    return e.scoreM ?? e.m ?? e.score;
  }
}
