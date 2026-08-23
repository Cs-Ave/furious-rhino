// Grupo de testes da camada de SPRITES (aba 🖼️ do /?setup + SpriteParams).
//   npm run test-sprites
// Sem navegador: valida o contrato SpriteParams (JSON estrito, zero
// imports), o merge no Constants, a paridade art/ ↔ ArtManifest ↔ sw.js,
// os marcadores do bloco gerenciado e a coerência das animações. É o
// PORTÃO das gravações da aba Sprites (writeAndValidateFiles roda esta
// suíte e reverte tudo se algo aqui reprovar) — por isso, como o
// test-skins, nenhum assert pode fixar valores das espécies reais: lógica
// com estrutura, nunca com números do tuning do dono.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const { Constants } = await import('../js/utils/Constants.js'); // JÁ mesclado
const { ART_MANIFEST } = await import('../js/art/ArtManifest.js');
const { SPRITE_PARAMS } = await import('../js/art/SpriteParams.js');

let pass = 0;
let fail = 0;
function eq(name, got, want) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) {
    pass++;
    console.log(`PASS  ${name}`);
  } else {
    fail++;
    console.log(`FAIL  ${name}\n      esperado ${w}\n      obtido   ${g}`);
  }
}
const ok = (name, cond, extra = '') => eq(`${name}${extra ? ' — ' + extra : ''}`, Boolean(cond), true);

// ---------- 1. SpriteParams: contrato do arquivo ----------
const spSrc = readFileSync(join(ROOT, 'js', 'art', 'SpriteParams.js'), 'utf8');
ok('1. SpriteParams sem NENHUM import (anti-ciclo com Constants)',
  !/^import /m.test(spSrc));
{
  // Âncora = a DECLARAÇÃO (o cabeçalho cita o nome e tem chaves de exemplo
  // em comentário — ancorar no nome cru fatiaria dentro do comentário)
  const marker = spSrc.indexOf('export const SPRITE_PARAMS =');
  const ini = spSrc.indexOf('{', marker);
  const fim = spSrc.lastIndexOf('}');
  let parsed = null;
  try { parsed = JSON.parse(spSrc.slice(ini, fim + 1)); } catch (e) { /* fail abaixo */ }
  ok('1b. miolo é JSON ESTRITO (round-trip textual do servidor)', parsed !== null);
  eq('1c. version', parsed && parsed.version, 1);
  ok('1d. shape {overrides, novas}', parsed
    && typeof parsed.overrides === 'object' && Array.isArray(parsed.novas));
  eq('1e. o import do módulo bate com o parse textual',
    JSON.stringify(SPRITE_PARAMS), JSON.stringify(parsed));
}
ok('1f. nada de código depois do objeto',
  spSrc.slice(spSrc.lastIndexOf('}')).trim() === '};');

// ---------- 2. Merge no Constants ----------
ok('2. SPRITE_BASE existe (clone pré-merge para a UI)',
  Constants.SPRITE_BASE && Constants.SPRITE_BASE.specs && Constants.SPRITE_BASE.behavior);
ok('2b. SPRITE_NEW é array', Array.isArray(Constants.SPRITE_NEW));
{
  const tipos = [...Constants.ANIMAL_TYPES].sort();
  eq('2c. ANIMAL_TYPES ≡ ANIMAL_SPECS (mesmo conjunto de ids)',
    tipos, Object.keys(Constants.ANIMAL_SPECS).sort());
  eq('2d. ANIMAL_TYPES ≡ ANIMAL_BEHAVIOR', tipos, Object.keys(Constants.ANIMAL_BEHAVIOR).sort());
  ok('2e. toda espécie tem speed numérico',
    tipos.every((t) => typeof Constants.ANIMAL_BEHAVIOR[t].speed === 'number'));
  ok('2f. fly e zig nunca coexistem numa espécie',
    tipos.every((t) => !(Constants.ANIMAL_BEHAVIOR[t].fly && Constants.ANIMAL_BEHAVIOR[t].zig)));
}
// Overrides no-op = lixo acumulado do painel (aviso que reprova de propósito:
// o servidor limpa antes de gravar)
{
  let noop = 0;
  for (const [t, o] of Object.entries(SPRITE_PARAMS.overrides || {})) {
    for (const [bloco, base] of [['specs', Constants.SPRITE_BASE.specs[t]],
      ['behavior', Constants.SPRITE_BASE.behavior[t]]]) {
      for (const [k, v] of Object.entries((o && o[bloco]) || {})) {
        if (base && JSON.stringify(base[k]) === JSON.stringify(v)) noop++;
      }
    }
  }
  eq('2g. nenhum override no-op (valor igual ao design)', noop, 0);
}

// ---------- 3. Paridade art/ ↔ manifesto ↔ sw.js ----------
const swSrc = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const swArt = new Set([...swSrc.matchAll(/'\.\/(art\/[^']+\.svg)'/g)].map((m) => m[1]));
const diskArt = readdirSync(join(ROOT, 'art')).filter((f) => f.endsWith('.svg'));
{
  const semArquivo = Object.keys(ART_MANIFEST)
    .filter((k) => !existsSync(join(ROOT, 'art', `${k}.svg`)));
  eq('3. toda chave do ArtManifest tem SVG em disco', semArquivo, []);
  const foraDoSw = diskArt.filter((f) => !swArt.has(`art/${f}`));
  eq('3b. todo SVG de art/ está no ASSETS do sw (cache offline completo)', foraDoSw, []);
}
ok('3c. ./js/art/SpriteParams.js está no ASSETS do sw',
  swSrc.includes("'./js/art/SpriteParams.js',"));

// ---------- 4. Bloco gerenciado @setup:sprites ----------
{
  const ini = swSrc.match(/^.*@setup:sprites —.*$/gm) || [];
  const fim = swSrc.match(/^.*@setup:sprites:fim.*$/gm) || [];
  eq('4. marcador de início exatamente 1×', ini.length, 1);
  eq('4b. marcador de fim exatamente 1×', fim.length, 1);
  // Miolo == derivação de SPRITE_NEW (byte a byte, tolerante a \r)
  const inicio = swSrc.indexOf(ini[0]) + ini[0].length;
  const miolo = swSrc.slice(inicio, swSrc.indexOf(fim[0]))
    .split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim());
  const esperado = [];
  for (const n of Constants.SPRITE_NEW) {
    esperado.push(`  './art/enemy-${n.id}.svg',`);
    if (n.anim) esperado.push(`  './art/enemy-${n.id}-${n.anim.sufixo}.svg',`);
  }
  eq('4c. miolo do bloco == derivação de SPRITE_NEW', miolo, esperado);
}

// ---------- 5. Coerência de animações e texturas (pós-merge) ----------
{
  const falhas = [];
  for (const [type, suffix] of Constants.ENEMY_ANIMS) {
    if (!existsSync(join(ROOT, 'art', `enemy-${type}.svg`))) falhas.push(`enemy-${type}`);
    if (!existsSync(join(ROOT, 'art', `enemy-${type}-${suffix}.svg`))) falhas.push(`enemy-${type}-${suffix}`);
  }
  eq('5. todo par de ENEMY_ANIMS existe em art/', falhas, []);
}
{
  const falhas = [];
  for (const t of Constants.ANIMAL_TYPES) {
    const b = Constants.ANIMAL_BEHAVIOR[t];
    const spec = Constants.ANIMAL_SPECS[t];
    if (spec.tex && !existsSync(join(ROOT, 'art', `${spec.tex}.svg`))) falhas.push(`${t}: tex ${spec.tex}`);
    if (b.airTexture && !existsSync(join(ROOT, 'art', `${b.airTexture}.svg`))) falhas.push(`${t}: air ${b.airTexture}`);
  }
  eq('5b. todo tex/airTexture aponta arquivo existente', falhas, []);
}
{
  // Toda anim declarada em behavior resolve para um par conhecido
  const animaveis = new Set([
    ...Constants.ENEMY_ANIMS.map(([t]) => `${t}-run`),
    ...Constants.SPRITE_NEW.filter((n) => n.anim && n.anim.fps).map((n) => `${n.id}-run`),
    'lion-run', 'giraffe-run', // hardcoded no BootScene
  ]);
  const orfas = Constants.ANIMAL_TYPES
    .filter((t) => t !== 'bird') // bird resolve por espécie de pássaro
    .map((t) => Constants.ANIMAL_BEHAVIOR[t].anim)
    .filter((a) => a && !animaveis.has(a));
  eq('5c. toda behavior.anim tem par de frames resolvível', orfas, []);
}

// ---------- 6. Invariantes de spawn (réplica do isFly do SpawnManager) ----------
{
  const B = Constants.ANIMAL_BEHAVIOR;
  const isFly = (t) => t === 'bird' || !!B[t].fly || !!B[t].zig;
  const elencos = { ...Constants.BIOME_ANIMALS };
  for (const d of Constants.CITY_DISTRICTS) {
    if (Array.isArray(d.cast)) elencos[`distrito:${d.key}`] = d.cast;
  }
  const semTerrestre = Object.entries(elencos)
    .filter(([nome, cast]) => nome !== 'distrito:brecha' && !cast.some((t) => !isFly(t)))
    .map(([nome]) => nome);
  eq('6. todo elenco (menos a Brecha) mantém ≥1 terrestre', semTerrestre, []);
  ok('6b. floresta sem voador próprio (congela o fallback `bird` do e2e-special)',
    !Constants.BIOME_ANIMALS.floresta.some(isFly));
  ok('6c. jaulas sem espécie `pair` (congela o par=4 do e2e-ramp)',
    !Constants.BIOME_ANIMALS.jaulas.some((t) => Constants.ANIMAL_SPECS[t].pair));
  const brecha = Constants.CITY_DISTRICTS.find((d) => d.key === 'brecha');
  const rodovia = Constants.CITY_DISTRICTS.find((d) => d.key === 'rodovia');
  eq('6d. Brecha continua só-pombo (design da volta olímpica)',
    brecha && brecha.cast, ['pombo']);
  eq('6e. rodovia continua cast null (elenco legado)', rodovia && rodovia.cast, null);
  const bandasRuins = Constants.ANIMAL_TYPES.filter((t) => {
    const band = (B[t].zig && B[t].zig.band) || B[t].fly;
    return band && !(band[0] < band[1] && band[0] >= 300 && band[1] <= 600);
  });
  eq('6f. toda banda fly/zig é [a<b] dentro de [300,600]', bandasRuins, []);
}

// ---------- resultado ----------
console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
