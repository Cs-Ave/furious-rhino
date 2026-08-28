import { Constants } from '../utils/Constants.js';

// A PROVA DO CHEFE (v1.9.6) — o invariante mais simples que este jogo tem:
// **não se passa por um chefe que não foi derrubado.**
//
// Módulo PURO de propósito (só depende de Constants): roda no node, sem
// Phaser e sem localStorage, e por isso pode ser usado nos três lugares onde
// a mesma pergunta aparece — o envio ao ranking mundial, a Arena de Desafios
// e a faxina do `tools/fix-ranking.mjs`. Antes da v1.9.6 a regra existia
// duplicada só na ferramenta, o que a deixava de fora justamente do caminho
// que importa: o do jogo em execução.
//
// POR QUE ISTO EXISTE. Da v1.8.5 à v1.9.3 uma cascata deixou os cinco chefes
// atravessáveis: dava para cruzar os 10.000 m sem derrubar uma das 21 camadas.
// A v1.9.4 fechou a cascata — mas fechar o buraco é uma coisa, e ter um
// contrato que percebe o próximo buraco é outra. Esta é a rede.
//
// A REGRA DA CASA CONTINUA VALENDO: "na dúvida, aceita". Toda decisão aqui é
// pelo lado de deixar passar. Barrar um inocente é pior do que deixar subir
// uma marca suja, que ainda dá para limpar depois.

// Folga para não acusar quem morreu EM CIMA da âncora: a face do alvo e o
// ponto onde ele é considerado ultrapassado não são o mesmo pixel.
const MARGEM_M = 50;

const PPM = Constants.PIXELS_PER_METER;
const FIM_M = Constants.WORLD_END_PX / PPM;

// Os cinco chefes como eles aparecem numa corrida GRAVADA (`runs[]`).
// Derivado de Constants, nunca literal: se um chefe mudar de lugar ou ganhar
// camada, a régua acompanha sozinha.
//
// `desde` é a versão a partir da qual aquela letra REALMENTE era gravada — é
// o que impede acusar corrida velha por um dado que ainda não existia. O
// Portão é `1.7.1` e não `1.7.0` por evidência: as duas corridas de v1.7.0 da
// base passaram dos 1.050 m sem `b`, porque a letra ainda não era escrita.
export const CHEFES = [
  { nome: 'Portão', m: Constants.WIN_DISTANCE_PX / PPM, chave: 'b', exigidas: Constants.BOSS_LAYERS.length, desde: '1.7.1' },
  { nome: 'Muralha', m: Constants.BOSS2_ANCHOR_PX / PPM, chave: 'e', exigidas: Constants.BOSS2_LAYERS.length, desde: '1.8.5' },
  { nome: 'Barreira', m: Constants.CERCO_ANCHOR_PX / PPM, chave: 'u', exigidas: Constants.CERCO_LAYERS.length, desde: '1.8.10' },
  { nome: 'Faraó', m: Constants.FARAO_ANCHOR_PX / PPM, chave: 'y', exigidas: Constants.FARAO_LAYERS.length, desde: '1.8.10' },
  { nome: 'Caçador-Mor', m: Constants.BOSS3_ANCHOR_PX / PPM, chave: 'l', exigidas: Constants.BOSS3_LAYERS.length, desde: '1.8.5' },
];

const vPartes = (v) => String(v || '').split('.').map((n) => Number(n) || 0);

// Compara versões campo a campo (1.8.10 > 1.8.9 — comparação de string erraria)
export function vCmp(a, b) {
  const [x, y] = [vPartes(a), vPartes(b)];
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  return 0;
}

// ---------------------------------------------------------------- A REGRA
// `chefes` é uma lista de { m: metros da âncora, exigidas, quebradas }.
// Devolve true quando ALGUM chefe ficou para trás com camada faltando.
//
// Quem monta a lista é quem sabe o contexto: a corrida ao vivo monta do
// elenco REAL da cena (chefesDaCena) e a corrida gravada monta da versão
// dela (chefesDaCorrida). A regra não conhece nem chefe nem versão — é só o
// invariante, e é por isso que ela não envelhece.
export function passouSemLutar(metros, chefes) {
  const m = Math.floor(Number(metros) || 0);
  if (!Number.isFinite(m) || m <= 0) return false; // sem distância, nada a julgar
  const lista = Array.isArray(chefes) ? chefes : [];
  return lista.some((c) => {
    if (!c || typeof c !== 'object') return false;
    const exigidas = Math.floor(Number(c.exigidas) || 0);
    const ancora = Number(c.m);
    // Chefe sem camadas declaradas ou sem âncora: não há o que exigir dele.
    if (exigidas <= 0 || !Number.isFinite(ancora) || ancora <= 0) return false;
    // O Caçador-Mor mora em 9.995 m: sem o `min` o limiar cairia FORA do
    // mundo (10.045 m) e ele nunca seria cobrado. Lá, passar é chegar ao fim.
    const linha = Math.min(ancora + MARGEM_M, FIM_M);
    if (m < linha) return false; // nem chegou lá — nada a provar
    return Math.floor(Number(c.quebradas) || 0) < exigidas;
  });
}

// ------------------------------------------------- A CORRIDA JÁ GRAVADA
// Monta a lista a partir de um elemento de `runs[]`. Consciente da versão.
export function chefesDaCorrida(run) {
  const o = run && typeof run === 'object' ? run : {};
  const v = String(o.v || '');
  // SEM VERSÃO NÃO HÁ ACUSAÇÃO. Os clientes pré-v1.7 nem gravavam camada, e
  // ausência de dado jamais é prova — seria condenar por silêncio.
  if (!v) return [];
  return CHEFES
    .filter((c) => vCmp(v, c.desde) >= 0) // este chefe já existia nessa versão?
    .map((c) => ({
      nome: c.nome, m: c.m, exigidas: c.exigidas,
      quebradas: Math.floor(Number(o[c.chave]) || 0),
    }));
}

export function ehCascata(run) {
  const o = run && typeof run === 'object' ? run : {};
  return passouSemLutar(o.m, chefesDaCorrida(o));
}

// ------------------------------------------------- A CORRIDA EM ANDAMENTO
// Monta a lista do elenco REAL da cena — não de uma tabela paralela. É o que
// impede a guarda de envelhecer: se um chefe sair do elenco (precedente real:
// o Cerco ficou declarado sem luta da v1.8.5 à v1.8.9), ele some da régua
// sozinho e ninguém é barrado por um chefe que não estava lá.
//
// `cena` é de onde saem os contadores da corrida (`def.layersProp`).
export function chefesDaCena(bossFights, cena) {
  const lista = Array.isArray(bossFights) ? bossFights : [];
  const c = cena || {};
  return lista.reduce((acc, f) => {
    const def = f && f.def;
    // SEM CONTADOR, SEM ACUSAÇÃO — mesma prudência do "sem versão" acima. Um
    // chefe cujo `layersProp` não exista nunca somaria camada, e cobrar dele
    // barraria todo mundo que passasse pela âncora.
    if (!def || !def.layersProp || !Array.isArray(def.layers)) return acc;
    const ancora = Number(def.anchorX);
    if (!Number.isFinite(ancora)) return acc;
    acc.push({
      nome: def.id || '?',
      m: ancora / PPM,
      exigidas: def.layers.length,
      quebradas: Math.floor(Number(c[def.layersProp]) || 0),
    });
    return acc;
  }, []);
}
