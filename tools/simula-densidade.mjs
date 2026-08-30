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
  console.log('Monte Carlo da roleta — N=' + N + ' slots/tier — v1.10 Escola do Rino\n');
  console.log('tier   f=0 (estreia)   f=0.5 (rec 400m)   f=1 (veterano = jogo atual)');
  for (let idx = 0; idx < 3; idx++) {
    const x = idx * 8000 + 100;
    const linha = [0, 0.5, 1].map((f) => {
      const dd = densidade(Constants.tierEfetivo(x, f));
      return dd.por100m.toFixed(1) + '/100m';
    }).join('        ');
    console.log('t' + (idx + 1) + '     ' + linha);
  }
  console.log('\n(f = min(1, recorde/800); f=1 devolve o tier ATUAL por referência —');
  console.log(' o veterano joga o jogo de sempre, bit a bit. Alvo do piso: ~1,5-2,0/100m)');
}
