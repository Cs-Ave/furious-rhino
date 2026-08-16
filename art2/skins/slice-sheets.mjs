// Fatia folhas de sprites em frames individuais (PNG). Wrapper fino do
// motor em gerador-de-sprites/lib.mjs — adicione a folha nova em SHEETS.
//   node art2/skins/slice-sheets.mjs
// (A página do gerador — npm run sprite-gen — faz o mesmo sem editar nada.)
import Jimp from 'jimp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sliceSheet } from '../../gerador-de-sprites/lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'frames');
mkdirSync(OUT, { recursive: true });

const SHEETS = [
  // ['Catisquick.jpg', 'base'],
  // ['Catisquick-transformation.jpg', 'vulcao'],
  ['robot-sheet.jpg', 'robot'], // Gemini, 13/08: rinoceronte robô (2×3)
];

for (const [file, tag] of SHEETS) {
  const img = await Jimp.read(join(HERE, file));
  const frames = await sliceSheet(img);
  // Nomeia por linha/coluna aproximada (r1c1...) na ordem detectada
  let row = 0;
  let col = 0;
  let lastY = -1;
  for (const f of frames) {
    if (f.y !== lastY) { row++; col = 0; lastY = f.y; }
    col++;
    const name = `${tag}-r${row}c${col}.png`;
    await f.jimp.writeAsync(join(OUT, name));
    console.log(`${name}  ${f.w}x${f.h}  @(${f.x},${f.y})`);
  }
}
