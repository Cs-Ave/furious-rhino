// INTEGRAÇÃO DE SKINS — lógica pura da página /?setup (texto entra, texto
// sai; zero I/O). O server.mjs é quem lê/escreve arquivos e chama isto;
// tools/test-integrate.mjs testa isto direto, sem tocar no repositório.
//
// Dois alvos de escrita no jogo, os dois deste módulo:
//   js/systems/SkinRegistry.js — reescrito INTEIRO (arquivo 100% de dados;
//     round-trip por texto, nunca import(): o cache de módulo do node
//     devolveria uma versão velha após a primeira leitura)
//   sw.js — só o miolo entre os marcadores @setup:skins (as skins originais
//     ficam FORA do bloco, listadas à mão como sempre)

// Dois níveis de proteção (v3, pedido do dono em 15/08):
//   LOCKED  — só o default: é o fallback de TODO o jogo (skin escondida,
//             removida ou destronada cai nele) — não edita, não esconde,
//             não remove.
//   BUILTIN — as 7 da v1.8.0: os SVGs delas são manuscritos no sw.js (fora
//             do bloco @setup:skins), então o remover físico também precisa
//             apagar essas linhas (stripSwArtLines — o patch do bloco não as
//             alcança); o id não pode ser reutilizado por skin nova. No
//             resto, iguais às criadas: editáveis, escondíveis e removíveis
//             (menos o default).
export const LOCKED_IDS = ['default'];
export const BUILTIN_IDS = ['default', 'party', 'robot', 'gold', 'silver', 'bronze', 'catisquick'];

// Chaves aceitas em access.condition, por tipo (contrato com o SkinSystem)
export const ACHIEVEMENT_KEYS = ['meters', 'towersDowned', 'bossLayers', 'escaped'];
export const TOTAL_KEYS = ['attempts', 'wins', 'animals'];

// Cabeçalho fixo do SkinRegistry.js. REGRA: nenhum '[' antes do array — o
// parse (aqui e no test-skins) fatia do primeiro '[' ao último ']'.
// `pending` = arte não pronta (célula "em produção"); `hidden` = tirada do
// jogo pelo dono via /?setup (some do hub; reversível).
const REGISTRY_HEADER = `// ATENÇÃO: arquivo de DADOS, gerado e reescrito pela página /?setup (via
// gerador-de-sprites/server.mjs). Dá para editar à mão, mas a próxima
// gravação da página reformata tudo — o miolo é JSON ESTRITO de propósito
// (o servidor faz o round-trip por texto, sem import()).
//
// Cada entrada: { id, name, prefix, firePrefix?, access, desc, pending?, hidden? }
// access:
//   { "type": "default" }                            — grátis
//   { "type": "rank", "rank": N }                    — pódio (rank EXATO)
//   { "type": "achievement", "condition": { ... } }  — façanha numa corrida
//       chaves: meters, towersDowned, bossLayers, escaped (AND; número = "≥ N")
//   { "type": "total", "condition": { ... } }        — totais de vida
//       chaves: attempts, wins, animals (AND; número = "≥ N")
// A lógica (desbloqueio, textura, anim) vive no SkinSystem, que importa e
// re-exporta esta lista — ninguém mais importa daqui.
`;

// ---------------------------------------------------------------- registry

export function parseRegistry(src) {
  const marker = 'export const SKINS =';
  const at = src.indexOf(marker);
  if (at < 0) throw new Error('SkinRegistry.js sem "export const SKINS =" — arquivo corrompido?');
  const start = src.indexOf('[', at);
  const end = src.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('SkinRegistry.js sem o array de skins');
  let skins;
  try {
    skins = JSON.parse(src.slice(start, end + 1));
  } catch (e) {
    throw new Error(`o miolo do SkinRegistry.js não é JSON estrito: ${e.message}`);
  }
  if (!Array.isArray(skins) || !skins.length) throw new Error('registry vazio');
  return skins;
}

// Uma skin por bloco, uma chave por linha, access/condition compactos numa
// linha só — legível no diff e byte-estável (mesma entrada → mesmo texto,
// sempre; é o que torna o "aplicar de novo" um no-op verificável).
function renderSkin(s) {
  const lines = [];
  const push = (k, v) => lines.push(`    ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  push('id', s.id);
  push('name', s.name);
  push('prefix', s.prefix === undefined ? null : s.prefix);
  if (s.firePrefix) push('firePrefix', s.firePrefix);
  push('access', s.access);
  push('desc', s.desc || '');
  if (s.pending) push('pending', true);
  if (s.hidden) push('hidden', true);
  return `  {\n${lines.join(',\n')}\n  }`;
}

export function renderRegistry(skins) {
  return `${REGISTRY_HEADER}export const SKINS = [\n${skins.map(renderSkin).join(',\n')}\n];\n`;
}

// -------------------------------------------------------------- validação

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,23}$/;

export function validateEntry(entry, { updating = false } = {}) {
  const errors = [];
  const e = entry || {};
  if (!SLUG_RE.test(e.id || '')) {
    errors.push('id inválido — minúsculas, números e hífen, até 24 caracteres');
  } else if (!updating && BUILTIN_IDS.includes(e.id)) {
    errors.push(`"${e.id}" é uma skin original do jogo — escolha outro id`);
  }
  if (e.hidden !== undefined && e.hidden !== true) {
    errors.push('hidden só pode ser true (visível = sem a chave)');
  }
  if (typeof e.name !== 'string' || !e.name.trim() || e.name.trim().length > 40) {
    errors.push('nome de exibição obrigatório (até 40 caracteres)');
  }
  if (e.desc !== undefined && (typeof e.desc !== 'string' || e.desc.length > 120)) {
    errors.push('desc é texto de até 120 caracteres');
  }
  const wantPrefix = `rhino-${e.id}-run`;
  if (e.prefix !== wantPrefix) errors.push(`prefix deve ser "${wantPrefix}"`);
  if (e.firePrefix !== undefined && e.firePrefix !== `rhino-${e.id}-fire-run`) {
    errors.push(`firePrefix deve ser "rhino-${e.id}-fire-run"`);
  }
  errors.push(...validateAccess(e.access));
  return { ok: !errors.length, errors };
}

export function validateAccess(access) {
  const a = access || {};
  const intIn = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  if (a.type === 'default') return [];
  if (a.type === 'rank') {
    return intIn(a.rank, 1, 3) ? [] : ['rank precisa ser 1, 2 ou 3'];
  }
  if (a.type === 'achievement' || a.type === 'total') {
    const allowed = a.type === 'achievement' ? ACHIEVEMENT_KEYS : TOTAL_KEYS;
    const cond = a.condition;
    if (!cond || typeof cond !== 'object' || !Object.keys(cond).length) {
      return ['a condição precisa de pelo menos um critério'];
    }
    const errors = [];
    for (const [key, val] of Object.entries(cond)) {
      if (!allowed.includes(key)) {
        errors.push(`critério desconhecido "${key}" (aceitos: ${allowed.join(', ')})`);
      } else if (key === 'escaped') {
        if (val !== true) errors.push('escaped só pode ser true');
      } else if (!intIn(val, 1, 999999)) {
        errors.push(`"${key}" precisa ser um inteiro entre 1 e 999999`);
      }
    }
    return errors;
  }
  return ['tipo de acesso desconhecido — use default, rank, achievement ou total'];
}

// ------------------------------------------------------- upsert / remove

export function upsertSkin(registrySrc, entry) {
  const skins = parseRegistry(registrySrc);
  const at = skins.findIndex((s) => s.id === entry.id);
  if (at >= 0) {
    if (LOCKED_IDS.includes(entry.id)) {
      throw new Error(`"${entry.id}" é o fallback do jogo — não se edita`);
    }
    skins[at] = entry;
  } else {
    skins.push(entry);
  }
  return renderRegistry(skins);
}

export function removeSkin(registrySrc, id) {
  if (LOCKED_IDS.includes(id)) {
    throw new Error(`"${id}" é o fallback do jogo — não se remove`);
  }
  const skins = parseRegistry(registrySrc);
  const at = skins.findIndex((s) => s.id === id);
  if (at < 0) throw new Error(`skin "${id}" não está no registry`);
  skins.splice(at, 1);
  return renderRegistry(skins);
}

// ------------------------------------------------------------------ sw.js

// Apaga do ASSETS as linhas de arte de um prefixo (frames 0-2), ONDE quer que
// estejam — é o que alcança as linhas manuscritas das builtin, fora do bloco
// @setup:skins (o patchSwAssets só reescreve o miolo do bloco). Sem isto, a
// remoção física de uma original deixaria o cache.addAll pedindo SVG que não
// existe e a instalação do PWA quebraria. Idempotente: prefixo ausente = no-op.
export function stripSwArtLines(swSrc, prefixes) {
  const doomed = new Set();
  for (const prefix of prefixes.filter(Boolean)) {
    for (const f of [0, 1, 2]) doomed.add(`  './art/${prefix}-${f}.svg',`);
  }
  // Comparação tolerante a \r: no Windows, um checkout com autocrlf pode
  // regravar o sw.js com CRLF e a comparação exata deixaria de casar EM
  // SILÊNCIO (aconteceu em 22/08 — test-integrate 43/6 até normalizar o
  // arquivo). O \r é preservado na saída: só o casamento o ignora.
  return swSrc.split('\n').filter((line) => !doomed.has(line.replace(/\r$/, ''))).join('\n');
}

const SW_START = '// @setup:skins —';
const SW_END = '// @setup:skins:fim';

// Reescreve SÓ o miolo entre os marcadores com os SVGs das skins criadas
// pela página (as builtin são manuscritas fora do bloco; pending não tem
// arte; hidden FICA no cache — a arte existe e a flag é reversível).
// Idempotente: mesmo registry → mesmo sw.js, byte a byte. NUNCA mexe no
// CACHE — o bump é ritual da release, não da ferramenta.
export function patchSwAssets(swSrc, skins) {
  const count = (s, needle) => s.split(needle).length - 1;
  if (count(swSrc, SW_START) !== 1 || count(swSrc, SW_END) !== 1) {
    throw new Error('marcadores @setup:skins ausentes ou duplicados no sw.js');
  }
  const startLineEnd = swSrc.indexOf('\n', swSrc.indexOf(SW_START));
  const endIdx = swSrc.indexOf(SW_END);
  const endLineStart = swSrc.lastIndexOf('\n', endIdx) + 1;
  if (endLineStart <= startLineEnd) throw new Error('marcadores @setup:skins fora de ordem no sw.js');
  const lines = [];
  for (const s of skins) {
    if (BUILTIN_IDS.includes(s.id) || s.pending || !s.prefix) continue;
    for (const prefix of [s.prefix, s.firePrefix].filter(Boolean)) {
      for (const f of [0, 1, 2]) lines.push(`  './art/${prefix}-${f}.svg',`);
    }
  }
  const middle = lines.length ? `${lines.join('\n')}\n` : '';
  return swSrc.slice(0, startLineEnd + 1) + middle + swSrc.slice(endLineStart);
}

// ==================================================== aba 🖼️ Sprites (v1.8.9)
// Round-trip textual do js/art/SpriteParams.js — mesmo racional do registry:
// JSON estrito, header fixo reimpresso, byte-estável ("salvar de novo" é
// no-op verificável). O header abaixo TEM de bater com o do arquivo real
// (o test-sprites confere o round-trip inteiro).

const SPRITE_PARAMS_HEADER = `// ATENÇÃO: arquivo de DADOS, gerado e reescrito pela aba 🖼️ Sprites do
// /?setup (via gerador-de-sprites/server.mjs). O miolo é JSON ESTRITO — o
// servidor faz o round-trip por TEXTO (sem import(): o cache de módulo do
// node devolveria versão velha), fatiando do primeiro '{' após a declaração
// (a linha do export) até o último '}' do arquivo.
//
// REGRAS (tools/test-sprites.mjs as vigia; violar = gravação revertida):
//  - NENHUM import aqui (o Constants importa este arquivo — ciclo mata o boot);
//  - nada de código depois do objeto;
//  - "overrides": { "especie": { "specs": {...}, "behavior": {...} } } —
//    merge raso por chave; sub-objetos (zig/shoot/fly) substituem INTEIRO;
//    valor null APAGA a chave; w/h/tex/anim/pair proibidos aqui;
//  - "novas": espécies criadas pela aba — specs completos + behavior +
//    "anim" ({"sufixo","fps"} | {"sufixo":"air"} | null) +
//    "casts" ({"biomas":[...], "distritos":[...]}).
`;

// Ordem canônica das chaves (diff estável entre gravações)
const SPRITE_SPEC_ORDER = ['w', 'h', 'bodyW', 'bodyH', 'offX', 'offY', 'tex', 'scale', 'pair'];
const SPRITE_BEHAVIOR_ORDER = ['speed', 'anim', 'jumpV', 'jumpIntervalMs', 'airTexture', 'bobVy', 'fly', 'zig', 'shoot', 'sentinel'];
// O que um OVERRIDE pode tocar (novas usam as ordens completas acima)
export const SPRITE_OVERRIDE_SPECS = ['bodyW', 'bodyH', 'offX', 'offY', 'scale'];
export const SPRITE_OVERRIDE_BEHAVIOR = ['speed', 'jumpV', 'jumpIntervalMs', 'bobVy', 'fly', 'zig', 'shoot', 'sentinel'];

const ordenado = (obj, ordem) => {
  const out = {};
  for (const k of ordem) if (obj[k] !== undefined) out[k] = obj[k]; // null SOBREVIVE (= apagar)
  return out;
};

export function parseSpriteParams(src) {
  const marker = 'export const SPRITE_PARAMS =';
  const at = src.indexOf(marker);
  if (at < 0) throw new Error('SpriteParams.js sem "export const SPRITE_PARAMS =" — arquivo corrompido?');
  const start = src.indexOf('{', at);
  const end = src.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('SpriteParams.js sem o objeto de parâmetros');
  let params;
  try {
    params = JSON.parse(src.slice(start, end + 1));
  } catch (e) {
    throw new Error(`o miolo do SpriteParams.js não é JSON estrito: ${e.message}`);
  }
  if (params.version !== 1) throw new Error(`SpriteParams.js com version ${params.version} (esperado 1)`);
  return { version: 1, overrides: params.overrides || {}, novas: params.novas || [] };
}

export function renderSpriteParams(p) {
  const out = { version: 1, overrides: {}, novas: [] };
  for (const t of Object.keys(p.overrides || {}).sort()) {
    const o = p.overrides[t] || {};
    const bloco = {};
    if (o.specs && Object.keys(o.specs).length) bloco.specs = ordenado(o.specs, SPRITE_SPEC_ORDER);
    if (o.behavior && Object.keys(o.behavior).length) bloco.behavior = ordenado(o.behavior, SPRITE_BEHAVIOR_ORDER);
    if (Object.keys(bloco).length) out.overrides[t] = bloco;
  }
  for (const n of p.novas || []) {
    out.novas.push({
      id: n.id,
      specs: ordenado(n.specs || {}, SPRITE_SPEC_ORDER),
      behavior: ordenado(n.behavior || {}, SPRITE_BEHAVIOR_ORDER),
      anim: n.anim ? ordenado(n.anim, ['sufixo', 'fps']) : null,
      casts: {
        biomas: [...((n.casts && n.casts.biomas) || [])],
        distritos: [...((n.casts && n.casts.distritos) || [])],
      },
    });
  }
  return `${SPRITE_PARAMS_HEADER}export const SPRITE_PARAMS = ${JSON.stringify(out, null, 2)};\n`;
}

// Validação de FORMA/faixa de um override (a coerência profunda — bandas no
// resultado, bioma sem terrestre, pares — é do portão test-sprites, que roda
// num processo NOVO e enxerga o merge fresco; aqui é o 400 amigável)
const NUM_RANGES = {
  specs: { bodyW: [8, 200], bodyH: [8, 160], offX: [0, 160], offY: [0, 120], scale: [0.5, 2] },
  behavior: { speed: [10, 600], jumpV: [-1200, -100], jumpIntervalMs: [100, 3000], bobVy: [0, 120] },
};
const numOk = (v, [a, b]) => typeof v === 'number' && isFinite(v) && v >= a && v <= b;
const bandOk = (v) => Array.isArray(v) && v.length === 2 && numOk(v[0], [300, 600])
  && numOk(v[1], [300, 600]) && v[0] < v[1];

export function validateSpriteOverride({ specs, behavior } = {}) {
  const errors = [];
  for (const [k, v] of Object.entries(specs || {})) {
    if (!SPRITE_OVERRIDE_SPECS.includes(k)) errors.push(`specs.${k} não é editável por override`);
    else if (v === null) errors.push(`specs.${k} não aceita null (hitbox sempre existe)`);
    else if (!numOk(v, NUM_RANGES.specs[k])) errors.push(`specs.${k} fora da faixa ${NUM_RANGES.specs[k].join('..')}`);
  }
  for (const [k, v] of Object.entries(behavior || {})) {
    if (!SPRITE_OVERRIDE_BEHAVIOR.includes(k)) { errors.push(`behavior.${k} não é editável por override`); continue; }
    if (v === null) { if (k === 'speed') errors.push('speed não aceita null'); continue; }
    if (k in NUM_RANGES.behavior) {
      if (!numOk(v, NUM_RANGES.behavior[k])) errors.push(`behavior.${k} fora da faixa ${NUM_RANGES.behavior[k].join('..')}`);
    } else if (k === 'fly') {
      if (!bandOk(v)) errors.push('fly deve ser [yMin,yMax] com 300 ≤ a < b ≤ 600');
    } else if (k === 'zig') {
      if (!v || !numOk(v.vy, [50, 600]) || !bandOk(v.band)) errors.push('zig deve ser {vy 50..600, band [300..600, a<b]}');
    } else if (k === 'shoot') {
      if (!v || !numOk(v.telegraphMs, [150, 2000]) || !numOk(v.dartSpeed, [100, 1200])) {
        errors.push('shoot exige telegraphMs 150..2000 e dartSpeed 100..1200');
      } else {
        if (v.range !== undefined && !(Array.isArray(v.range) && v.range.length === 2
          && numOk(v.range[0], [200, 1500]) && numOk(v.range[1], [200, 1500]) && v.range[0] < v.range[1])) {
          errors.push('shoot.range deve ser [min,max] em 200..1500');
        }
        if (v.intervalMs !== undefined && !numOk(v.intervalMs, [300, 5000])) errors.push('shoot.intervalMs 300..5000');
        if (v.cap !== undefined && !numOk(v.cap, [1, 5])) errors.push('shoot.cap 1..5');
        if (v.aimed !== undefined && typeof v.aimed !== 'boolean') errors.push('shoot.aimed é booleano');
      }
    } else if (k === 'sentinel' && typeof v !== 'boolean') {
      errors.push('sentinel é booleano');
    }
  }
  if (behavior && behavior.fly && behavior.zig) errors.push('fly e zig não podem coexistir');
  return errors;
}
