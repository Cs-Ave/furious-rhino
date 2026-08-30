// Monte Carlo da densidade de spawn — a régua da "Escola do Rino" (v1.10).
//
//   node tools/simula-densidade.mjs
//
// POR QUE EXISTE. A decisão de 16/08 ("denso sem facilitar") foi tomada com um
// Monte Carlo sobre a roleta real — e a de 29/08 (o plano da Escola do Rino,
// ver IDEIAS-FUTURAS) precisa do MESMO instrumento: primeiro para fotografar o
// "antes" (este arquivo, hoje), depois para provar que o lerp do novato
// devolve a densidade da era A no piso e é BIT-IDÊNTICO ao atual no teto.
//
// A roleta aqui é um ESPELHO da do SpawnManager.spawnObstacles (roll único:
// parede → espinho → torre → rampa → SOBRA = animal; par por animalPackChance;
// escolta por animalEscortChance quando sai parede/espinho/torre). Se a
// original mudar, este espelho mente — o test-stats tranca os números-chave
// para o desvio aparecer.
import { Constants } from '../js/utils/Constants.js';

const N = 200000; // slots simulados por tier — variância desprezível

// Um slot da roleta: devolve { animais, gapPx } — quantos animais o slot
// produz (0-2+) e quanto de pista consome.
export function simulaSlot(tier, rng = Math.random) {
  const roll = rng();
  let animais = 0;
  const { wallW, spikeW, towerW } = tier;
  const rampW = tier.rampW; // no espelho a rampa sempre "cabe"
  if (roll < wallW + spikeW + towerW) {
    // obstáculo letal — pode vir escoltado
    if (rng() < tier.animalEscortChance) animais += 1;
  } else if (roll < wallW + spikeW + towerW + rampW) {
    // rampa: nunca escolta
  } else {
    // a SOBRA: animal — pode vir em par
    animais += 1;
    if (rng() < tier.animalPackChance) animais += 1;
  }
  const gapPx = tier.gapMin + rng() * tier.gapRand;
  return { animais, gapPx };
}

// Densidade média: animais por SLOT e por 100 m (2ª casa estável com N=200k)
export function densidade(tier, n = N, rng = Math.random) {
  let animais = 0;
  let px = 0;
  for (let i = 0; i < n; i++) {
    const s = simulaSlot(tier, rng);
    animais += s.animais;
    px += s.gapPx;
  }
  return {
    porSlot: animais / n,
    por100m: (animais / (px / Constants.PIXELS_PER_METER)) * 100,
  };
}

// Só imprime quando chamado direto (o test-stats importa as funções puras)
const invocado = process.argv[1] || '';
if (invocado && import.meta.url === `file:///${invocado.replace(/\\/g, '/')}`) {
  console.log('Monte Carlo da roleta — N=' + N + ' slots/tier\n');
  console.log('tier  faixa       animais/slot  animais/100m');
  Constants.DIFFICULTY_TIERS.slice(0, 3).forEach((t, i) => {
    const d = densidade(t);
    console.log(`t${i + 1}    ${String(i * 200) + '-' + String((i + 1) * 200) + 'm'}     `
      + d.porSlot.toFixed(2).padStart(8) + '     ' + d.por100m.toFixed(1).padStart(8));
  });
  console.log('\n(1,5/100m era a densidade da era A; 3,2 foi a medição do preset de 16/08;');
  console.log(' o alvo do piso novato da Escola do Rino é ~1,8-2,0 — ver o plano no IDEIAS-FUTURAS)');
}
