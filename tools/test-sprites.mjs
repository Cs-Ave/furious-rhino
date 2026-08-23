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
// Overrides no-op = lixo acumulado do painel. AVISO, não falha (a UI evita
// gravá-los, mas um valor igual ao design não pode travar o portão)
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
  if (noop > 0) console.log(`⚠️  ${noop} override(s) no-op (valor igual ao design) — limpeza recomendada`);
  ok('2g. hitbox cabe no canvas (offX+bodyW ≤ w, offY+bodyH ≤ h)',
    Constants.ANIMAL_TYPES.every((t) => {
      const s = Constants.ANIMAL_SPECS[t];
      return s.offX + s.bodyW <= s.w && s.offY + s.bodyH <= s.h;
    }));
}
// Overrides: só espécies existentes e chaves da whitelist (pega tanto POST
// torto quanto edição manual do arquivo)
{
  const OK_SPECS = ['bodyW', 'bodyH', 'offX', 'offY', 'scale'];
  const OK_BEHAVIOR = ['speed', 'jumpV', 'jumpIntervalMs', 'bobVy', 'fly', 'zig', 'shoot', 'sentinel'];
  const problemas = [];
  for (const [t, o] of Object.entries(SPRITE_PARAMS.overrides || {})) {
    if (!Constants.ANIMAL_TYPES.includes(t)) problemas.push(`espécie desconhecida: ${t}`);
    for (const k of Object.keys((o && o.specs) || {})) {
      if (!OK_SPECS.includes(k)) problemas.push(`${t}.specs.${k} proibido em override`);
    }
    for (const k of Object.keys((o && o.behavior) || {})) {
      if (!OK_BEHAVIOR.includes(k)) problemas.push(`${t}.behavior.${k} proibido em override`);
    }
  }
  eq('2h. overrides: só espécies existentes e chaves permitidas', problemas, []);
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
  // v1.8.10: a entrada 'rodovia' foi SUBSTITUÍDA pelo deserto (Areias do
  // Tempo) — a última área é 'deserto' (infinita, elenco = união das etapas)
  const deserto = Constants.CITY_DISTRICTS.find((d) => d.key === 'deserto');
  eq('6d. área infinita do deserto existe e fecha a tabela',
    Boolean(deserto) && deserto.from === 189000 &&
    Constants.CITY_DISTRICTS[Constants.CITY_DISTRICTS.length - 1].key === 'deserto', true);
  eq('6e. deserto infinito tem elenco próprio (união das etapas, com terrestre)',
    Array.isArray(deserto.cast) && deserto.cast.length >= 10 &&
    deserto.cast.includes('camelo') && deserto.cast.includes('falcao'), true);
  const bandasRuins = Constants.ANIMAL_TYPES.filter((t) => {
    const band = (B[t].zig && B[t].zig.band) || B[t].fly;
    return band && !(band[0] < band[1] && band[0] >= 300 && band[1] <= 600);
  });
  eq('6f. toda banda fly/zig é [a<b] dentro de [300,600]', bandasRuins, []);
}

// ---------- 7. espécies criadas pela aba (SPRITE_NEW) ----------
{
  const falhas = [];
  for (const n of Constants.SPRITE_NEW) {
    const base = join(ROOT, 'art', `enemy-${n.id}.svg`);
    if (!existsSync(base)) { falhas.push(`${n.id}: sem enemy-${n.id}.svg`); continue; }
    const vb = readFileSync(base, 'utf8').match(/viewBox="0 0 (\d+) (\d+)"/);
    if (!vb || +vb[1] !== n.specs.w || +vb[2] !== n.specs.h) falhas.push(`${n.id}: viewBox ≠ specs.w/h`);
    if (n.anim && !existsSync(join(ROOT, 'art', `enemy-${n.id}-${n.anim.sufixo}.svg`))) {
      falhas.push(`${n.id}: falta o frame -${n.anim.sufixo}`);
    }
    if (n.specs.tex !== `enemy-${n.id}`) falhas.push(`${n.id}: tex ≠ enemy-${n.id}`);
    if (n.anim && n.anim.sufixo === 'air' && n.behavior.airTexture !== `enemy-${n.id}-air`) {
      falhas.push(`${n.id}: airTexture não derivado`);
    }
    if (n.anim && n.anim.fps && n.behavior.anim !== `${n.id}-run`) falhas.push(`${n.id}: anim não derivada`);
    if (n.specs.pair) falhas.push(`${n.id}: pair proibido em criada`);
  }
  eq('7. espécies criadas: arquivos, viewBox e derivações coerentes', falhas, []);
}

// ---------- 8. ART_MANIFEST w/h == viewBox (contrato que não existia) ----------
{
  const falhas = [];
  for (const [k, size] of Object.entries(ART_MANIFEST)) {
    const arq = join(ROOT, 'art', `${k}.svg`);
    if (!existsSync(arq)) continue; // já reprovado no 3
    const vb = readFileSync(arq, 'utf8').match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    if (!vb) { falhas.push(`${k}: sem viewBox parseável`); continue; }
    if (Math.round(+vb[1]) !== size.w || Math.round(+vb[2]) !== size.h) {
      falhas.push(`${k}: manifesto ${size.w}×${size.h} ≠ viewBox ${vb[1]}×${vb[2]}`);
    }
  }
  eq('8. ART_MANIFEST w/h == viewBox de cada SVG', falhas, []);
}

// ---------- resultado ----------
console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
