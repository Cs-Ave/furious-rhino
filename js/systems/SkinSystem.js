import { StorageManager } from '../utils/StorageManager.js';
import { Constants } from '../utils/Constants.js';
import { SKINS } from './SkinRegistry.js';

// v1.8.0: skins do rinoceronte — lógica de acesso, no espelho do MedalSystem:
// módulo puro (só depende do StorageManager) para os testes node rodarem sem
// navegador. O REGISTRY vive em SkinRegistry.js (dados puros, reescrito pela
// página /?setup); este módulo o re-exporta para os consumidores antigos.
//
// Quatro tipos de acesso:
//   default     — sempre disponível (a "Thanks for playing" é grátis de
//                 propósito: é o presente do jogo para quem joga);
//   rank        — skins de PÓDIO: só o jogador NAQUELA posição do ranking
//                 global veste (rank exato — cada degrau tem a sua). Acesso
//                 DINÂMICO, resolvido na leitura contra o cache last_rank:
//                 caiu de posição, a skin volta ao default sozinha; subiu de
//                 volta, ela reaparece (a seleção nunca é apagada). Tudo é
//                 client-side e offline-first: honestidade razoável, não
//                 segurança.
//   achievement — façanha numa ÚNICA corrida (condition declarativa, AND).
//                 Desbloqueio PERMANENTE em furious_rhino_skins.
//   total       — totais de vida (corridas, fugas, animais). Também vira
//                 permanente ao atingir: totais nunca decrescem, e gravar
//                 unifica o toast/idempotência com as conquistas.
//
// `prefix: null` = usa as texturas/anim legadas 'rhino-run-*' (zero risco
// para o caminho default). `pending: true` = arte ainda não entregue: a
// célula aparece no hub como "em produção" e nunca equipa.
export { SKINS };

// A fuga em runs[] antigos não tem flag própria: deriva de c==='win' ou de
// ter passado da linha do portão (mesma conta do StatsDashboard)
const GATE_M = Constants.WIN_DISTANCE_PX / Constants.PIXELS_PER_METER;

// O que cada chave de condition significa e onde buscar o valor:
//   achievement (dados de UMA corrida): meters, towersDowned, bossLayers,
//     escaped (booleano — cruzou o portão)
//   total (agregados de vida): attempts, wins, animals
export class SkinSystem {
  static get(id) {
    return SKINS.find((s) => s.id === id) || SKINS[0];
  }

  // Condição declarativa: TODAS as chaves precisam passar (AND). Número =
  // "pelo menos N"; booleano (escaped) = exige true. Chave desconhecida no
  // condition nunca passa — melhor uma skin impossível (o dono percebe na
  // hora no /?setup) do que uma liberada por engano.
  static conditionMet(condition, data) {
    const entries = Object.entries(condition || {});
    if (!entries.length) return false;
    return entries.every(([key, want]) => {
      const got = data ? data[key] : undefined;
      if (typeof want === 'boolean') return Boolean(got) === want;
      return (Number(got) || 0) >= Number(want);
    });
  }

  static totalsData() {
    return {
      attempts: StorageManager.getAttempts(),
      wins: StorageManager.getWins(),
      animals: StorageManager.getAnimalsTotal(),
      // v1.11: a chama como moeda de skin ({streakBest: 7} no /?setup)
      streakBest: StorageManager.getStreakBest(),
    };
  }

  static isUnlocked(skin) {
    switch (skin.access.type) {
      case 'default': return true;
      // rank 0 = nunca ranqueado = bloqueado
      case 'rank': return StorageManager.getLastRank() === skin.access.rank;
      case 'achievement': return StorageManager.getSkins().includes(skin.id);
      // A gravação em furious_rhino_skins é a fonte; a checagem ao vivo é
      // rede de segurança (ex.: evaluateTotals ainda não rodou neste boot)
      case 'total':
        return StorageManager.getSkins().includes(skin.id)
          || this.conditionMet(skin.access.condition, this.totalsData());
      default: return false;
    }
  }

  // "Em produção" (pending: sem arte) e "fora do jogo" (hidden: tirada do
  // ar pelo dono no /?setup) nunca equipam, mesmo desbloqueadas — quem
  // estiver vestindo cai no default via resolveEquipped, sem perder a
  // escolha (a flag é reversível e a skin volta sozinha)
  static isEquippable(skin) {
    return this.isUnlocked(skin) && !skin.pending && !skin.hidden;
  }

  // A skin EFETIVA da sessão. Se a escolhida ficou inacessível (perdeu o
  // pódio, id corrompido ou removida pelo /?setup), devolve o default SEM
  // regravar a escolha — é o que faz a skin de pódio voltar sozinha quando
  // o rank volta.
  static resolveEquipped() {
    const chosen = this.get(StorageManager.getSelectedSkin());
    return this.isEquippable(chosen) ? chosen : SKINS[0];
  }

  static runAnimKey(skin) {
    return skin.prefix || 'rhino-run';
  }

  // Anim do rampage: skins sem fúria própria "pegam fogo" com a arte
  // compartilhada (em chamas, a skin apaga — decisão de design da v1.8)
  static fireAnimKey(skin) {
    return skin.firePrefix || 'rhino-fire-run';
  }

  static textureKey(skin, frame) {
    return `${skin.prefix || 'rhino-run'}-${frame}`;
  }

  // Fim (ou portão) de corrida: concede as conquistas cuja façanha saiu
  // AGORA. Idempotente — devolve só o que é novo (para o toast).
  // data: { meters, towersDowned, bossLayers, escaped }
  static evaluateRun(data = {}) {
    const owned = StorageManager.getSkins();
    const earned = SKINS.filter((s) => s.access.type === 'achievement'
      && !s.hidden // fora do jogo não concede (nem toast); ao voltar, o retro-scan cobre
      && !owned.includes(s.id)
      && this.conditionMet(s.access.condition, data));
    if (earned.length) StorageManager.addSkins(earned.map((s) => s.id));
    return earned;
  }

  // Totais de vida (corridas/fugas/animais): avaliado no boot e no fim de
  // corrida, DEPOIS de os contadores acumularem. Mesmo contrato do
  // evaluateRun: grava e devolve só o que é novo.
  static evaluateTotals() {
    const owned = StorageManager.getSkins();
    const totals = this.totalsData();
    const earned = SKINS.filter((s) => s.access.type === 'total'
      && !s.hidden
      && !owned.includes(s.id)
      && this.conditionMet(s.access.condition, totals));
    if (earned.length) StorageManager.addSkins(earned.map((s) => s.id));
    return earned;
  }

  // Retroativo (1× por boot): quem já fez a façanha nas últimas 50 corridas
  // ganha a conquista no primeiro boot após a skin existir. Mapeia os
  // contadores de 1 letra de runs[] para as chaves de condition.
  // v1.8.1: mesmo contrato dos outros avaliadores — devolve o que é novo
  // (vira notícia no Diário da Fuga da tela inicial).
  static migrateFromRuns() {
    const owned = StorageManager.getSkins();
    const targets = SKINS.filter(
      (s) => s.access.type === 'achievement' && !s.hidden && !owned.includes(s.id)
    );
    if (!targets.length) return [];
    const runsData = StorageManager.getRuns().filter(Boolean).map((r) => ({
      meters: Number(r.m) || 0,
      towersDowned: Number(r.o) || 0,
      bossLayers: Number(r.b) || 0,
      escaped: r.c === 'win' || (Number(r.m) || 0) >= GATE_M,
    }));
    const earned = targets.filter(
      (s) => runsData.some((data) => this.conditionMet(s.access.condition, data))
    );
    if (earned.length) StorageManager.addSkins(earned.map((s) => s.id));
    return earned;
  }

  // Copy pt-BR do cadeado no hub, gerada da condition — é o que faz o
  // desbloqueio configurado no /?setup se explicar sozinho. Vocabulário no
  // espelho das medalhas ("Corra 100m", "Derrube 2 torres", "Atropele 10
  // animais"). Fallback: desc da skin.
  static requirementText(skin) {
    const cond = skin.access.condition || {};
    const parts = [];
    if (skin.access.type === 'achievement') {
      if (cond.meters) parts.push(`corra ${cond.meters}m`);
      if (cond.towersDowned) {
        parts.push(`derrube ${cond.towersDowned} torre${cond.towersDowned > 1 ? 's' : ''}`);
      }
      if (cond.bossLayers) {
        // 3 camadas = o portão cai = o caçador perde; menos que isso é só
        // arranhão na blindagem
        parts.push(cond.bossLayers >= 3
          ? 'vença o caçador do portão'
          : `quebre ${cond.bossLayers} camada${cond.bossLayers > 1 ? 's' : ''} do portão`);
      }
      if (cond.escaped) parts.push('escape do zoológico');
      if (!parts.length) return skin.desc || '';
      const joined = parts.length > 1
        ? `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}` : parts[0];
      const suffix = parts.length > 1 ? ' na mesma corrida.' : ' em uma corrida.';
      return joined.charAt(0).toUpperCase() + joined.slice(1) + suffix;
    }
    if (skin.access.type === 'total') {
      if (cond.streakBest) parts.push(`jogue ${cond.streakBest} dias seguidos`);
      if (cond.attempts) parts.push(`jogue ${cond.attempts} corrida${cond.attempts > 1 ? 's' : ''}`);
      if (cond.wins) parts.push(`complete ${cond.wins} fuga${cond.wins > 1 ? 's' : ''}`);
      if (cond.animals) parts.push(`atropele ${cond.animals} anima${cond.animals > 1 ? 'is' : 'l'}`);
      if (!parts.length) return skin.desc || '';
      const joined = parts.length > 1
        ? `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}` : parts[0];
      return joined.charAt(0).toUpperCase() + joined.slice(1) + ' no total.';
    }
    return skin.desc || '';
  }
}
