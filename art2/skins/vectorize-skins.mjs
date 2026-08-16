// Vetoriza frames de folhas raster (JPG/PNG → SVG 96×64 no rig do jogo).
// Wrapper fino do motor em gerador-de-sprites/lib.mjs; os configs FORMS
// ficam aqui como REGISTRO REPRODUTÍVEL das skins já aprovadas.
//   node art2/skins/vectorize-skins.mjs [forma]          → escreve em art2/skins/
//   node art2/skins/vectorize-skins.mjs [forma] --apply  → também copia p/ art/
// (A página do gerador — npm run sprite-gen — faz o mesmo interativamente.)
import Jimp from 'jimp';
import { writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vectorizeFrames } from '../../gerador-de-sprites/lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ART = join(HERE, '..', '..', 'art');
const APPLY = process.argv.includes('--apply');

// Ordem dos frames = a do galope (ping-pong 0-1-2-1 no jogo):
// estendido → apoio → recolhido. Paletas claras de propósito (o tint da
// fúria multiplica); formas de fúria só aparecem em rampage (sem tint).
const FORMS = {
  base: {
    out: 'rhino-catisquick-run',
    comment: 'FURIOUS RHINO v1.8.0 — Catisquick\'s Rhino, forma base (arte do Catisquick vetorizada)',
    frames: ['base-r3c1', 'base-r2c3', 'base-r2c2'],
    upscale: 2,
    palette: [
      ['#17181a', true],  // contorno / pupila / cauda
      ['#565a5e', false], // sombra funda (pernas distantes, barriga)
      ['#84898f', false], // sombreado
      ['#a4a9ae', false], // corpo
      ['#f0eee6', false], // chifres / cascos / olho
    ],
  },
  vulcao: {
    out: 'rhino-catisquick-fire-run',
    comment: 'FURIOUS RHINO v1.8.0 — Catisquick\'s Rhino, transformação "Rino Vulcão" (fúria)',
    frames: ['vulcao-run-12', 'vulcao-run-9', 'vulcao-run-2'],
    upscale: 3,
    palette: [
      ['#201a1d', true],  // contorno
      ['#2e2629', false], // sombra funda
      ['#453a3e', false], // corpo de magma
      ['#f08c1e', false], // lava / rachaduras
      ['#ffc355', false], // chifre / brilho da lava / olho
    ],
  },
  robot: { // Gemini 13/08 — rinoceronte robô steampunk (folha 2×3, linha 1)
    out: 'rhino-robot-run',
    comment: 'FURIOUS RHINO v1.8.0 — Rino Robô (folha Gemini vetorizada)',
    frames: ['robot-r1c1', 'robot-r1c2', 'robot-r1c3'],
    upscale: 1, // frames já vêm em ~890px
    palette: [
      ['#141414', true],  // contorno
      ['#c09048', false], // latão (corpo)
      ['#7c6130', false], // latão sombreado
      ['#f0d878', false], // latão claro (brilhos/rebites)
      ['#33363a', false], // metal escuro (pernas/focinho)
      ['#63666c', false], // metal médio
      ['#7a4f2c', false], // canos de cobre no dorso
      ['#4ee0f2', false], // chifre/olho de energia (ciano)
      ['#e8fbff', false], // brilho do chifre
    ],
  },
};

// Filtro opcional por forma na linha de comando (ex.: `... robot --apply`)
const only = process.argv.slice(2).find((a) => !a.startsWith('-') && FORMS[a]);
if (only) for (const k of Object.keys(FORMS)) if (k !== only) delete FORMS[k];

for (const [formName, form] of Object.entries(FORMS)) {
  const frames = [];
  for (const name of form.frames) {
    frames.push(await Jimp.read(join(HERE, 'frames', `${name}.png`)));
  }
  const { svgs } = await vectorizeFrames(frames, form.palette, {
    upscale: form.upscale,
    comment: form.comment,
  });
  svgs.forEach((svg, f) => {
    const file = `${form.out}-${f}.svg`;
    writeFileSync(join(HERE, file), svg);
    console.log(`${file}  ${(svg.length / 1024).toFixed(1)}KB (${formName})`);
    if (APPLY) copyFileSync(join(HERE, file), join(ART, file));
  });
}
console.log(APPLY ? 'copiado para art/' : 'só em art2/skins/ (rode com --apply para publicar)');
