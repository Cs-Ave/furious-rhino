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
  return swSrc.split('\n').filter((line) => !doomed.has(line)).join('\n');
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
