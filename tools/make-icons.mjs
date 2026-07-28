// Gera os ícones PNG do PWA a partir do icon.svg da raiz:
//   npm run make-icons
//
//   apple-touch-icon.png   180×180  quadrado (o iOS arredonda os cantos sozinho;
//                                   cantos pré-arredondados viram "orelhas" pretas)
//   icon-192.png           192×192  icon.svg original
//   icon-512.png           512×512  icon.svg original
//   icon-maskable-512.png  512×512  fundo cheio + conteúdo a 80% (safe zone maskable)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'icon.svg'), 'utf8');
const square = svg.replace('rx="10"', 'rx="0"');

const png = (source, size) =>
  new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();

writeFileSync(join(root, 'apple-touch-icon.png'), png(square, 180));
writeFileSync(join(root, 'icon-192.png'), png(svg, 192));
writeFileSync(join(root, 'icon-512.png'), png(svg, 512));

// Maskable: o launcher recorta até ~10% de cada borda, então o desenho
// fica a 80% do tamanho, centralizado sobre o fundo azul cheio
const inner = square.replace(/<svg[^>]*>/, '').replace('</svg>', '');
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" fill="#7ec8f0"/>
  <svg x="51.2" y="51.2" width="409.6" height="409.6" viewBox="0 0 60 60">${inner}</svg>
</svg>`;
writeFileSync(join(root, 'icon-maskable-512.png'), png(maskable, 512));

console.log('Gerados: apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png');
