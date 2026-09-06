// Aplica o RIM DA CIDADE nos SVGs do elenco urbano (v1.12.3 "Farol").
//
//   node tools/aplicar-rim.mjs           → aplica (idempotente)
//   node tools/aplicar-rim.mjs --check   → só confere, não escreve (para teste)
//
// POR QUE. O contorno de todo sprite é `#17171b` — preto. De dia isso separa
// o bicho do fundo claro; à noite, com o cenário tintado para L* ~33-36,
// contorno preto sobre fundo escuro não separa nada: a medição de 05/09 deu
// contraste de borda 2,32-2,77 nas 19 espécies da cidade (aceite: 3,0).
//
// A CORREÇÃO. Um halo CLARO por fora da silhueta, desenhado ATRÁS do
// conteúdo: `feMorphology dilate` engorda o alfa, `feFlood` pinta esse
// excedente de branco-frio e o `feMerge` põe o original por cima intacto.
// Nada de geometria muda, o canvas não cresce e a HITBOX é a mesma — é o
// precedente do dardo da v1.8.3 ("a folga visual é perdão a favor do
// jogador, nunca contra").
//
// NÃO É o `export-art` (regra 7 do CLAUDE.md): não regenera arte nenhuma,
// só insere um bloco no arquivo existente e sai se ele já estiver lá.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART = join(ROOT, 'art');
const CHECK = process.argv.includes('--check');

// As 18 texturas do elenco urbano (`camionete` usa a arte de `pickup`).
//
// O RAIO É CALIBRADO, não escolhido: a primeira rodada usou 2 (terrestres) e
// 1,6 (voadores) e o `e2e-legibilidade` mostrou seis espécies ainda abaixo do
// aceite — todas de corpo escuro ou silhueta fina, onde o halo fino se perde
// dentro do próprio contorno preto. Essas seis subiram para 2,6-2,8. O
// engorda visual é sempre A FAVOR do jogador (ele desvia de um bicho que
// parece maior do que a hitbox), que é a mesma regra do dardo da v1.8.3.
export const RIM_TEXTURAS = [
  { base: 'enemy-person', raio: 2.8 },
  { base: 'enemy-suit', raio: 3.4 },
  { base: 'enemy-scooter', raio: 2 },
  { base: 'enemy-viralata', raio: 2 },
  { base: 'enemy-gatobeco', raio: 2 },
  { base: 'enemy-reporter', raio: 2 },
  { base: 'enemy-car', raio: 2.8 },
  { base: 'enemy-police', raio: 2 },
  { base: 'enemy-pickup', raio: 2 },
  { base: 'enemy-k9', raio: 2 },
  { base: 'enemy-tropa', raio: 2 },
  { base: 'enemy-pombo', raio: 2.4 },
  { base: 'enemy-drone', raio: 2.4 },
  { base: 'enemy-dronezig', raio: 2.4 },
  { base: 'enemy-dronesent', raio: 1.6 },
  { base: 'enemy-pipa', raio: 1.6 },
  { base: 'enemy-helinews', raio: 1.6 },
  { base: 'enemy-plane', raio: 1.6 },
  // v1.12.3 — o ATIRADOR DA MURALHA entra na mesma conta. Ele não é do
  // elenco de spawn (não passa pelo e2e-legibilidade, que mede espécies),
  // mas luta no mesmo lugar e na mesma hora: de pé no deck do viaduto, à
  // noite, silhueta escura contra céu escuro. Os dois quadros — parado e
  // mirando — são a única coisa que diz de onde o tiro vem.
  { base: 'muralha-hunter', raio: 2.6 },
];

export const RIM_COR = '#e6eef7';
export const RIM_ALFA = '0.85';

const blocoFiltro = (raio) => `  <!-- v1.12.3 "Farol": halo claro por fora da silhueta. O contorno preto
       dos sprites some contra a cidade noturna (contraste de borda medido:
       2,3-2,8 · aceite 3,0). Desenhado ATRÁS do conteúdo — a arte original
       passa intacta pelo feMerge, e a hitbox não muda. -->
  <filter id="rim" x="-14%" y="-14%" width="128%" height="128%">
    <feMorphology in="SourceAlpha" operator="dilate" radius="${raio}" result="rimD"/>
    <feFlood flood-color="${RIM_COR}" flood-opacity="${RIM_ALFA}"/>
    <feComposite in2="rimD" operator="in" result="rimC"/>
    <feMerge><feMergeNode in="rimC"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
`;

// Todos os quadros de uma textura (base, -run-1, -alt, -air, -flap…)
function quadrosDe(base) {
  return readdirSync(ART)
    .filter((f) => f.endsWith('.svg') && (f === `${base}.svg` || f.startsWith(`${base}-`)))
    // `enemy-drone` não pode arrastar `enemy-dronezig`/`enemy-dronesent`
    .filter((f) => !RIM_TEXTURAS.some((t) => t.base !== base && (f === `${t.base}.svg` || f.startsWith(`${t.base}-`))))
    .sort();
}

export function aplicarEm(texto, raio) {
  if (texto.includes('id="rim"')) {
    // Já tem o filtro: a única coisa que pode mudar é o RAIO. A calibração
    // é empírica (mede-se, ajusta-se, mede-se de novo com o
    // e2e-legibilidade), e reaplicar o bloco inteiro duplicaria o <g>.
    const atual = /radius="([\d.]+)"/.exec(texto);
    if (atual && Number(atual[1]) !== raio) {
      return {
        texto: texto.replace(/(<feMorphology[^>]*radius=")[\d.]+(")/, `$1${raio}$2`),
        mudou: true,
        motivo: `raio ${atual[1]} → ${raio}`,
      };
    }
    return { texto, mudou: false, motivo: 'já tem' };
  }

  const fimSvg = texto.lastIndexOf('</svg>');
  if (fimSvg < 0) return { texto, mudou: false, motivo: 'sem </svg>' };

  // O conteúdo desenhável começa depois do último </defs> (quando existe) ou
  // logo após a tag <svg …> de abertura.
  const fimDefs = texto.lastIndexOf('</defs>');
  let inicio;
  let comDefs;
  if (fimDefs >= 0 && fimDefs < fimSvg) {
    inicio = fimDefs + '</defs>'.length;
    comDefs = true;
  } else {
    const m = /<svg[^>]*>/.exec(texto);
    if (!m) return { texto, mudou: false, motivo: 'sem <svg>' };
    inicio = m.index + m[0].length;
    comDefs = false;
  }

  const cabeca = texto.slice(0, inicio);
  const corpo = texto.slice(inicio, fimSvg);
  const cauda = texto.slice(fimSvg);

  const filtro = blocoFiltro(raio);
  const cabecaNova = comDefs
    ? cabeca.replace(/<\/defs>\s*$/, `${filtro}  </defs>`)
    : `${cabeca}\n  <defs>\n${filtro}  </defs>`;

  return {
    texto: `${cabecaNova}\n  <g filter="url(#rim)">${corpo}</g>\n${cauda}`,
    mudou: true,
    motivo: comDefs ? 'defs existente' : 'defs criado',
  };
}

// Só executa quando chamado direto (o teste importa as funções puras)
const invocado = process.argv[1] || '';
if (invocado && invocado.replace(/\\/g, '/').endsWith('aplicar-rim.mjs')) {
  let tocados = 0;
  let jaTinha = 0;
  const faltando = [];
  for (const { base, raio } of RIM_TEXTURAS) {
    const quadros = quadrosDe(base);
    if (!quadros.length) { faltando.push(base); continue; }
    for (const nome of quadros) {
      const caminho = join(ART, nome);
      const antes = readFileSync(caminho, 'utf8');
      const r = aplicarEm(antes, raio);
      if (!r.mudou) { jaTinha++; continue; }
      if (!CHECK) writeFileSync(caminho, r.texto);
      tocados++;
      console.log(`  ${CHECK ? 'faltaria' : 'rim em'} ${nome}  (raio ${raio}, ${r.motivo})`);
    }
  }
  if (faltando.length) console.error(`⚠️ sem arquivo: ${faltando.join(', ')}`);
  console.log(`\n${tocados} arquivo(s) ${CHECK ? 'sem rim' : 'com rim aplicado'} · ${jaTinha} já tinha(m).`);
  if (CHECK && tocados > 0) process.exitCode = 1;
}
