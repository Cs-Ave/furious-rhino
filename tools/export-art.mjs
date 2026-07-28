// Exporta as texturas SVG do jogo para arquivos editáveis em art/.
//
//   npm run export-art            → grava só os arquivos que não existem
//   npm run export-art -- --force → sobrescreve TUDO (apaga edições manuais!)
//
// Sempre regenera js/art/ArtManifest.js (dado derivado, nunca editar à mão).
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SVG_TEXTURES } from '../js/art/SvgSprites.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const artDir = join(root, 'art');
const force = process.argv.includes('--force');

mkdirSync(artDir, { recursive: true });

let written = 0;
let skipped = 0;
for (const [key, def] of Object.entries(SVG_TEXTURES)) {
  const file = join(artDir, `${key}.svg`);
  if (existsSync(file) && !force) {
    skipped++;
    continue;
  }
  writeFileSync(file, def.svg.trim() + '\n');
  written++;
}

const manifestEntries = Object.entries(SVG_TEXTURES)
  .map(([key, def]) => `  '${key}': { w: ${def.w}, h: ${def.h} },`)
  .join('\n');
const manifest = `// GERADO por tools/export-art.mjs — não editar à mão.
// Dimensões de rasterização dos arquivos art/*.svg (1:1 com o viewBox).
export const ART_MANIFEST = {
${manifestEntries}
};
`;
writeFileSync(join(root, 'js', 'art', 'ArtManifest.js'), manifest);

console.log(`art/: ${written} gravado(s), ${skipped} preservado(s)${force ? ' (--force)' : ''}`);
console.log('js/art/ArtManifest.js regenerado.');
