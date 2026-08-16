// Gera as skins da v1.8.0 a partir de art/rhino-run-{0,1,2}.svg.
//   node art2/skins/make-skins.mjs          → escreve em art2/skins/
//   node art2/skins/make-skins.mjs --apply  → também copia para art/
//
// Recolors (ouro/prata/bronze): substituição 1:1 de TODOS os tons de cinza
// pela paleta da skin (mesma luminância relativa), preservando contornos
// #14161a, narina #2a2c32 e brancos do olho. Ids de gradiente ganham sufixo
// único por skin (rb4→rb4g...) para nunca colidirem se algum dia forem
// inlined juntos.
//
// "Thanks for playing" (party): cores originais + chapéu de festa e
// língua-de-sogra; a língua desenrola em graus diferentes por frame (só
// adereços mudam além das pernas — cabeça/corpo idênticos aos originais).
//
// Regras invioláveis: viewBox 96×64, narina em (89,38) descoberta, paletas
// claras (o tint de fúria multiplica branco→vermelho — nada escuro).
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const ART = join(ROOT, 'art');
const APPLY = process.argv.includes('--apply');

// Paleta por skin: mapa cinza-original → tom equivalente. Ordem tanto faz —
// a troca é feita token a token (hex completos), nunca encadeada.
const PALETTES = {
  gold: {
    '#b9bec6': '#f2d060', '#848994': '#c49a26', // corpo (gradiente)
    '#b6bbc3': '#f6df8e', '#8b919b': '#d0ac3e', // cabeça (gradiente)
    '#efe8cc': '#fff6d6', '#d9d0ae': '#e9d692', // chifrão (gradiente)
    '#a6abb4': '#e3c05a', // pernas/cauda claras
    '#969ba5': '#d4a83c', // patas próximas
    '#7f848e': '#b98f2e', // patas distantes
    '#ddd6bc': '#fdf3cf', // dedos
    '#c6cad2': '#f9e9a8', // brilho do dorso
    '#7c818b': '#a8842c', // linhas de sombreado
    '#767b86': '#a07d28', // sombra da barriga
    '#8b909a': '#dcb84e', // orelha
    '#5f646e': '#8a6a1e', // miolo escuro da orelha
    '#6f747e': '#96762a', // miolo da orelha / linha da narina
    '#e2dabe': '#f7ecc4', // chifre traseiro
  },
  silver: { // branco-metálico FRIO de propósito: não pode confundir com o cinza default
    '#b9bec6': '#eef2f8', '#848994': '#a8b2c2',
    '#b6bbc3': '#f4f7fb', '#8b919b': '#b6c0cd',
    '#efe8cc': '#ffffff', '#d9d0ae': '#dfe6ef',
    '#a6abb4': '#dfe5ec',
    '#969ba5': '#cfd7e2',
    '#7f848e': '#b4bfcd',
    '#ddd6bc': '#f6f9fd',
    '#c6cad2': '#ffffff',
    '#7c818b': '#9aa6b6',
    '#767b86': '#93a0b0',
    '#8b909a': '#c6cfdb',
    '#5f646e': '#7e8a9b',
    '#6f747e': '#8d99a9',
    '#e2dabe': '#eef3f9',
  },
  bronze: { // a mais escura do trio — validada contra o flush vermelho da fúria
    '#b9bec6': '#d69a5e', '#848994': '#9a662e',
    '#b6bbc3': '#dda86e', '#8b919b': '#a5713a',
    '#efe8cc': '#f2ddba', '#d9d0ae': '#d3a978',
    '#a6abb4': '#c98d4e',
    '#969ba5': '#ba7f42',
    '#7f848e': '#a06a32',
    '#ddd6bc': '#f5e6c8',
    '#c6cad2': '#e8b57e',
    '#7c818b': '#8f5f2a',
    '#767b86': '#875a26',
    '#8b909a': '#c07f42',
    '#5f646e': '#6e4a1e',
    '#6f747e': '#7d5424',
    '#e2dabe': '#edd9b2',
  },
};
const GRAD_SUFFIX = { gold: 'g', silver: 's', bronze: 'b', party: 'p' };

// Medalhão de pódio no peito (v1.8): disco na tonalidade escura do metal +
// número da posição em traço claro. Dígitos desenhados como path (zero
// fonte — SVG carregado como <img> não pode depender de fonte externa).
// Posição (54.5, 31) = ombro/peito do corpo, que é idêntico nos 3 frames.
const DIGIT_PATHS = {
  1: 'M -1.8 -3.2 L 0.9 -5.6 L 0.9 5.6 M -2.4 5.6 L 4 5.6',
  2: 'M -3.2 -3 Q -3.2 -6 0 -6 Q 3.2 -6 3.2 -3.2 Q 3.2 -1.4 0.8 0.8 L -3.2 5.6 L 3.6 5.6',
  3: 'M -2.8 -4.4 Q 0.2 -6.6 2.4 -4.4 Q 3.8 -2.8 0.8 -0.8 Q 4.2 0.6 2.8 3.4 Q 1 6.2 -3 4.4',
};
const BADGES = {
  gold: { n: 1, disc: '#a87c1a', digit: '#fff6d6' },
  silver: { n: 2, disc: '#7f8b9c', digit: '#ffffff' },
  bronze: { n: 3, disc: '#6e4517', digit: '#f5e6c8' },
};

function badgeSvg(skin) {
  const b = BADGES[skin];
  if (!b) return '';
  return `
    <!-- v1.8: medalhão de pódio no peito (posição ${b.n}) -->
    <circle cx="54.5" cy="31" r="8.5" fill="${b.disc}" stroke="#14161a" stroke-width="1.8"/>
    <path d="M 48.6 28.2 Q 50.2 25 53.6 24.1" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.45"/>
    <path d="${DIGIT_PATHS[b.n]}" transform="translate(54.5 31.4)" fill="none" stroke="${b.digit}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function recolor(svg, skin) {
  const pal = PALETTES[skin];
  // Troca token a token: um regex único sobre hexes completos evita qualquer
  // substituição encadeada (ex.: #efe8cc→#ffffff nunca arrasta os brancos)
  let out = svg.replace(/#[0-9a-f]{6}/gi, (hex) => pal[hex.toLowerCase()] || hex);
  out = renameGradients(out, skin);
  // Medalhão entra DEPOIS da troca de cores (as cores dele são fixas)
  const badge = badgeSvg(skin);
  if (badge) out = out.replace('  </g>', `${badge}\n  </g>`);
  return out.replace(
    '<!-- FURIOUS RHINO',
    `<!-- FURIOUS RHINO — skin "${skin}" (v1.8.0), recolor 1:1 do rino base.\n       Gerada por art2/skins/make-skins.mjs; retoques manuais são bem-vindos.\n       Original:`
  );
}

function renameGradients(svg, skin) {
  const s = GRAD_SUFFIX[skin];
  return svg
    .replaceAll('id="rb4"', `id="rb4${s}"`).replaceAll('url(#rb4)', `url(#rb4${s})`)
    .replaceAll('id="rh4"', `id="rh4${s}"`).replaceAll('url(#rh4)', `url(#rh4${s})`)
    .replaceAll('id="rho4"', `id="rho4${s}"`).replaceAll('url(#rho4)', `url(#rho4${s})`);
}

// ---- "Thanks for playing": chapéu de festa + língua-de-sogra -------------
// Chapéu: cone listrado inclinado sobre o topo da cabeça (72..84 × 0.8..11),
// entre as orelhas e o chifrão — não cobre o olho (76.5,25) nem chega perto
// da narina (89,38). Pompom no ápice.
const HAT = `
    <!-- v1.8 party: chapéu de festa (inclinado para trás) -->
    <path d="M73 10.6 L83.6 8.4 L76.2 1.6 Z" fill="#ff5a79" stroke="#14161a" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M74.6 7.8 L81.4 6.4 L79 4.2 L75.8 4.9 Z" fill="#ffd23f" stroke="none"/>
    <path d="M73 10.6 Q78.4 11.8 83.6 8.4" fill="none" stroke="#14161a" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="76.2" cy="1.8" r="1.7" fill="#5ad1ff" stroke="#14161a" stroke-width="1.1"/>`;

// Língua-de-sogra saindo do canto da boca (~80,45), no vão livre sob a
// cabeça (y 46..53). Um grau de desenrolar por frame: recolhida → média →
// esticada com a ponta erguendo (ciclo 0-1-2-1 = sopro indo e voltando).
const BLOWERS = [
  `
    <!-- v1.8 party: língua-de-sogra (meio sopro) -->
    <path d="M80 45.4 Q85 47.4 89 48.2" fill="none" stroke="#14161a" stroke-width="5.2" stroke-linecap="round"/>
    <path d="M80 45.4 Q85 47.4 89 48.2" fill="none" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>
    <circle cx="90.6" cy="48.4" r="2.6" fill="#ff5a79" stroke="#14161a" stroke-width="1.4"/>
    <circle cx="90.6" cy="48.4" r="1" fill="#ffd23f"/>`,
  `
    <!-- v1.8 party: língua-de-sogra (sopro cheio, ponta erguendo) -->
    <path d="M80 45.4 Q86 47.8 91 47 Q93.4 46.4 94 44.6" fill="none" stroke="#14161a" stroke-width="5" stroke-linecap="round"/>
    <path d="M80 45.4 Q86 47.8 91 47 Q93.4 46.4 94 44.6" fill="none" stroke="#ffd23f" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M83.5 46.6 L84.3 48.9 M87.5 47.3 L87.9 49.6" stroke="#ff5a79" stroke-width="1.6" stroke-linecap="round"/>`,
  `
    <!-- v1.8 party: língua-de-sogra (recolhida) -->
    <path d="M80 45.4 Q83 46.6 85 47" fill="none" stroke="#14161a" stroke-width="5.2" stroke-linecap="round"/>
    <path d="M80 45.4 Q83 46.6 85 47" fill="none" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>
    <circle cx="87" cy="47.2" r="3" fill="#ff5a79" stroke="#14161a" stroke-width="1.4"/>
    <circle cx="87" cy="47.2" r="1.3" fill="#ffd23f"/>`,
];

function partyfy(svg, frame) {
  let out = renameGradients(svg, 'party'); // cores originais, ids próprios
  out = out.replace('  </g>', `${HAT}${BLOWERS[frame]}\n  </g>`);
  return out.replace(
    '<!-- FURIOUS RHINO',
    `<!-- FURIOUS RHINO — skin "Thanks for playing" (v1.8.0): rino original +\n       chapéu de festa e língua-de-sogra (desenrola por frame). Gerada por\n       art2/skins/make-skins.mjs. Original:`
  );
}

mkdirSync(HERE, { recursive: true });
const written = [];
for (let f = 0; f < 3; f++) {
  const base = readFileSync(join(ART, `rhino-run-${f}.svg`), 'utf8');
  for (const skin of ['gold', 'silver', 'bronze']) {
    const name = `rhino-${skin}-run-${f}.svg`;
    writeFileSync(join(HERE, name), recolor(base, skin));
    written.push(name);
  }
  const pname = `rhino-party-run-${f}.svg`;
  writeFileSync(join(HERE, pname), partyfy(base, f));
  written.push(pname);
}

if (APPLY) {
  for (const name of written) copyFileSync(join(HERE, name), join(ART, name));
}
console.log(`${written.length} SVGs gerados em art2/skins/${APPLY ? ' e copiados para art/' : ''}`);
console.log(written.join('\n'));
