// Testes da lógica de integração do /?setup (gerador-de-sprites/integrate.mjs).
//   npm run test-integrate
// Node puro, funções de texto — NADA aqui escreve no repositório: os testes
// rodam sobre os arquivos reais lidos como string + entradas sintéticas.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LOCKED_IDS, BUILTIN_IDS, parseRegistry, renderRegistry, validateEntry, validateAccess,
  upsertSkin, removeSkin, patchSwAssets, stripSwArtLines,
} from '../gerador-de-sprites/integrate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
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
const throwsWith = (fn, needle) => {
  try { fn(); return `não lançou (esperava "${needle}")`; } catch (e) {
    return String(e.message).includes(needle) ? true : `mensagem errada: ${e.message}`;
  }
};

const registrySrc = readFileSync(join(ROOT, 'js', 'systems', 'SkinRegistry.js'), 'utf8');
const swSrc = readFileSync(join(ROOT, 'sw.js'), 'utf8');

// ---------- 1. Round-trip do registry real ----------
const skins = parseRegistry(registrySrc);
eq('locked ⊂ builtin (default é os dois)',
  LOCKED_IDS.every((id) => BUILTIN_IDS.includes(id)) && LOCKED_IDS.includes('default'), true);
// v3 (16/08): builtins são REMOVÍVEIS pelo /?setup (aconteceu: catisquick) —
// só o default é garantido no registry; nunca exigir a lista completa
eq('parse: o default está presente', skins.some((s) => s.id === 'default'), true);
eq('round-trip byte-idêntico (parse → render == original)',
  renderRegistry(skins) === registrySrc, true);
eq('parse rejeita arquivo sem o export', throwsWith(
  () => parseRegistry('const nada = 1;'), 'export const SKINS'), true);
eq('parse rejeita miolo não-JSON', throwsWith(
  () => parseRegistry("export const SKINS = [ { id: 'x' } ];"), 'JSON estrito'), true);

// ---------- 2. validateEntry / validateAccess ----------
const good = {
  id: 'lava', name: 'Rino de Lava', prefix: 'rhino-lava-run',
  access: { type: 'achievement', condition: { meters: 2000 } }, desc: 'quente',
};
eq('entrada válida passa', validateEntry(good), { ok: true, errors: [] });
eq('id com maiúscula reprova', validateEntry({ ...good, id: 'Lava', prefix: 'rhino-Lava-run' }).ok, false);
eq('id de original reprova na criação (não se recria uma builtin)',
  validateEntry({ ...good, id: 'gold', prefix: 'rhino-gold-run' }).ok, false);
eq('id de original passa em modo update (originais são editáveis)',
  validateEntry({ ...good, id: 'gold', prefix: 'rhino-gold-run' }, { updating: true }).ok, true);
eq('hidden: true passa, false reprova (visível = sem a chave)',
  [validateEntry({ ...good, hidden: true }).ok, validateEntry({ ...good, hidden: false }).ok],
  [true, false]);
eq('nome vazio reprova', validateEntry({ ...good, name: '  ' }).ok, false);
eq('prefix fora do padrão reprova', validateEntry({ ...good, prefix: 'rhino-outra-run' }).ok, false);
eq('firePrefix fora do padrão reprova',
  validateEntry({ ...good, firePrefix: 'rhino-lava-fogo' }).ok, false);
eq('firePrefix no padrão passa',
  validateEntry({ ...good, firePrefix: 'rhino-lava-fire-run' }).ok, true);
eq('access default passa', validateAccess({ type: 'default' }), []);
eq('rank 1-3 passa, 4 reprova',
  [validateAccess({ type: 'rank', rank: 3 }).length, validateAccess({ type: 'rank', rank: 4 }).length],
  [0, 1]);
eq('condition vazia reprova',
  validateAccess({ type: 'achievement', condition: {} }).length > 0, true);
eq('chave desconhecida reprova',
  validateAccess({ type: 'achievement', condition: { pulos: 5 } }).length > 0, true);
eq('chave de total em achievement reprova',
  validateAccess({ type: 'achievement', condition: { wins: 5 } }).length > 0, true);
eq('escaped: true passa, false reprova',
  [validateAccess({ type: 'achievement', condition: { escaped: true } }).length,
    validateAccess({ type: 'achievement', condition: { escaped: false } }).length],
  [0, 1]);
eq('total válido passa', validateAccess({ type: 'total', condition: { attempts: 100, animals: 500 } }), []);
eq('número não-inteiro reprova',
  validateAccess({ type: 'total', condition: { attempts: 1.5 } }).length > 0, true);
eq('tipo desconhecido reprova', validateAccess({ type: 'vip' }).length > 0, true);

// ---------- 3. upsert / remove ----------
const withLava = upsertSkin(registrySrc, good);
eq('upsert adiciona no fim', parseRegistry(withLava).at(-1).id, 'lava');
eq('upsert é update quando o id já existe (não duplica)',
  parseRegistry(upsertSkin(withLava, { ...good, name: 'Lava II' }))
    .filter((s) => s.id === 'lava').map((s) => s.name),
  ['Lava II']);
eq('upsert de skin idêntica é byte-idêntico (idempotente)',
  upsertSkin(withLava, good) === withLava, true);
// v2: originais EDITÁVEIS (menos o default). Alvo DINÂMICO — a regra
// aprendida QUATRO vezes: nunca pinar skin real do registry (a 4ª foi a
// 'silver', fixada aqui e removida de verdade pelo dono em 22/08, durante a
// integração da v1.8.6). Qualquer skin não-default viva serve de cobaia.
const cobaia = skins.find((s) => s.id !== 'default');
const cobaiaEdited = parseRegistry(upsertSkin(registrySrc, { ...cobaia, desc: 'editada!' }))
  .find((s) => s.id === cobaia.id);
eq('upsert edita uma skin existente (só o default é intocável)', cobaiaEdited.desc, 'editada!');
eq('upsert do default lança', throwsWith(
  () => upsertSkin(registrySrc, { ...skins[0], desc: 'hack' }), 'fallback'), true);
// parte de uma base SEM a flag: o dono pode ter escondido a cobaia no registry real
const cobaiaBase = { ...cobaia };
delete cobaiaBase.hidden;
eq('hidden sobrevive ao round-trip (true grava, false = chave ausente)',
  [parseRegistry(upsertSkin(registrySrc, { ...cobaiaBase, hidden: true })).find((s) => s.id === cobaia.id).hidden,
    'hidden' in parseRegistry(upsertSkin(registrySrc, cobaiaBase)).find((s) => s.id === cobaia.id)],
  [true, false]);
eq('remove tira a skin', parseRegistry(removeSkin(withLava, 'lava')).map((s) => s.id),
  skins.map((s) => s.id));
// v3 (15/08): original também remove — só o default (LOCKED) é intocável.
// Alvo DINÂMICO: o dono pode ter removido qualquer builtin de verdade
// (nunca pinar o registry); sem nenhuma viva, o assert é vacuamente verde.
const builtinViva = BUILTIN_IDS.find((id) => id !== 'default' && skins.some((s) => s.id === id));
eq('remove de original FUNCIONA (v3 — só o default é intocável)',
  builtinViva ? parseRegistry(removeSkin(registrySrc, builtinViva)).some((s) => s.id === builtinViva) : false,
  false);
eq('remove do default lança', throwsWith(() => removeSkin(registrySrc, 'default'), 'fallback'), true);
eq('remove de inexistente lança', throwsWith(() => removeSkin(registrySrc, 'fantasma'), 'não está'), true);

// ---------- 3b. stripSwArtLines (linhas manuscritas das builtin no sw) ----------
const stripped = stripSwArtLines(swSrc, ['rhino-party-run']);
eq('strip apaga as 3 linhas manuscritas do prefixo',
  [0, 1, 2].filter((f) => stripped.includes(`'./art/rhino-party-run-${f}.svg'`)), []);
eq('strip só tira essas 3 linhas (resto do sw intacto)',
  swSrc.split('\n').length - stripped.split('\n').length, 3);
eq('strip com fúria própria apaga as 6 linhas',
  ((s) => [0, 1, 2].filter((f) => s.includes(`rhino-catisquick-run-${f}.svg`)
    || s.includes(`rhino-catisquick-fire-run-${f}.svg`)))(
    stripSwArtLines(swSrc, ['rhino-catisquick-run', 'rhino-catisquick-fire-run'])), []);
eq('strip de prefixo ausente é no-op byte-idêntico',
  stripSwArtLines(swSrc, ['rhino-fantasma-run']) === swSrc, true);
eq('strip é idempotente', stripSwArtLines(stripped, ['rhino-party-run']) === stripped, true);
eq('strip ignora firePrefix nulo', stripSwArtLines(swSrc, ['rhino-fantasma-run', undefined]) === swSrc, true);

// ---------- 4. patchSwAssets ----------
eq('só builtin → miolo vazio, sw byte-idêntico',
  patchSwAssets(swSrc, skins) === swSrc, true);
eq('builtin editada/escondida segue FORA do bloco (arte é manuscrita no sw)',
  patchSwAssets(swSrc, skins.map((s) => (s.id === 'silver' ? { ...s, hidden: true } : s))) === swSrc,
  true);
eq('skin nova hidden FICA no bloco (arte existe; flag é só exibição)',
  patchSwAssets(swSrc, [...skins, { ...good, hidden: true }])
    .includes(`  './art/rhino-lava-run-0.svg',`), true);
const lavaFire = { ...good, firePrefix: 'rhino-lava-fire-run' };
const swWithLava = patchSwAssets(swSrc, [...skins, lavaFire]);
eq('skin nova com fúria = 6 linhas no bloco',
  [0, 1, 2].every((f) => swWithLava.includes(`  './art/rhino-lava-run-${f}.svg',`)
    && swWithLava.includes(`  './art/rhino-lava-fire-run-${f}.svg',`)), true);
eq('patch 2x é idempotente', patchSwAssets(swWithLava, [...skins, lavaFire]) === swWithLava, true);
eq('remover do registry limpa o bloco', patchSwAssets(swWithLava, skins) === swSrc, true);
eq('pending fica fora do sw (SVGs ainda não existem)',
  patchSwAssets(swSrc, [...skins, { ...lavaFire, pending: true }]) === swSrc, true);
eq('CACHE não é tocado pelo patch',
  swWithLava.match(/const CACHE = '[^']+'/)[0] === swSrc.match(/const CACHE = '[^']+'/)[0], true);
eq('sw sem marcadores lança', throwsWith(
  () => patchSwAssets("const ASSETS = ['./x'];", '@setup:skins'), '@setup:skins'), true);
eq('marcador duplicado lança', throwsWith(
  () => patchSwAssets(`${swSrc}\n// @setup:skins — de novo`, ''), 'duplicados'), true);

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
