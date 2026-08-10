// Apaga UM jogador (nome ou id) das coleções `scores` e `stats`.
//   node tools/delete-player.mjs <nome-ou-id>          → só lista, nada é apagado
//   node tools/delete-player.mjs <nome-ou-id> --yes    → apaga de verdade
//
// Mesmo padrão de tools/cleanup-stats.mjs: `firestore.rules` tem
// `allow delete: if false` nas duas coleções — nem o jogo nem um script com
// a apiKey pública conseguem apagar nada, e é assim que deve ser. O Firebase
// CLI usa credenciais de ADMINISTRADOR e passa por cima das rules, então
// este script delega a ele.
//
// Pré-requisito (uma vez por máquina, abre o navegador):
//   npx firebase-tools login
//
// `stats/{playerId}` não tem campo de nome — só `scores/{playerId}.name`/
// `.nameLower` tem. O `playerId` (id do doc) é a única chave que liga as
// duas coleções, então: se o argumento parece um NOME, resolve para um id
// via `scores`; se parece um UUID (ou prefixo de UUID), usa direto como id.
// Em ambos os casos, apaga o doc correspondente nas DUAS coleções (só o que
// existir).
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--yes');
const query = process.argv.slice(2).find((a) => a !== '--yes');

if (!query) {
  console.log('Uso: node tools/delete-player.mjs <nome-ou-id> [--yes]');
  process.exitCode = 1;
} else {
  await main(query);
}

async function main(query) {
  const cfg = readFileSync(join(ROOT, 'js', 'firebase-config.js'), 'utf8');
  const KEY = cfg.match(/apiKey:\s*'([^']+)'/)[1];
  const PROJECT = cfg.match(/projectId:\s*'([^']+)'/)[1];

  // Mesma normalização de LeaderboardSystem.nameSlug (js/systems/LeaderboardSystem.js:39-46) —
  // duplicada aqui porque é módulo de navegador, este é script Node.
  const nameSlug = (name) => String(name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();

  // UUID (ou prefixo dele, como usamos à mão nesta sessão para "4d7aefd1"):
  // hex e traços, sem espaço — nomes de verdade têm 3-12 chars alfanuméricos
  // livres (rules de scores.name), então essa forma não colide
  const looksLikeId = /^[0-9a-f-]{6,40}$/i.test(query.trim());

  function decode(v) {
    if (v === null || v === undefined) return null;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('booleanValue' in v) return Boolean(v.booleanValue);
    if ('stringValue' in v) return v.stringValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('nullValue' in v) return null;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
    if ('mapValue' in v) {
      const out = {};
      for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = decode(val);
      return out;
    }
    return null;
  }

  async function fetchCollection(name) {
    const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${name}`;
    const out = [];
    let token = '';
    for (let page = 0; page < 40; page++) {
      const url = `${base}?pageSize=300&key=${KEY}${token ? `&pageToken=${token}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
      const data = await res.json();
      for (const doc of data.documents || []) {
        const id = doc.name.split('/').pop();
        const row = { id };
        for (const [k, v] of Object.entries(doc.fields || {})) row[k] = decode(v);
        out.push(row);
      }
      token = data.nextPageToken || '';
      if (!token) break;
    }
    return out;
  }

  async function docExists(collection, id) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}/${id}?key=${KEY}`;
    const res = await fetch(url);
    return res.ok;
  }

  let targetId;
  let label;

  if (looksLikeId) {
    // Prefixo de id: casa o primeiro doc de `stats` (universo mais amplo,
    // cobre jogadores sem apelido) cujo id começa com o que foi digitado
    const stats = await fetchCollection('stats');
    const matches = stats.filter((d) => d.id.startsWith(query.trim()));
    if (matches.length === 0) {
      console.log(`Nenhum doc em stats com id começando em "${query}".`);
      return;
    }
    if (matches.length > 1) {
      console.log(`${matches.length} ids batem com "${query}" — seja mais específico:`);
      for (const m of matches) console.log(`  ${m.id}`);
      return;
    }
    targetId = matches[0].id;
    label = `bestM=${matches[0].bestM ?? '?'}`;
  } else {
    const scores = await fetchCollection('scores');
    const slug = nameSlug(query);
    let matches = scores.filter((s) => nameSlug(s.nameLower || s.name) === slug);
    if (matches.length === 0) {
      // Sem casamento exato: sugere candidatos por substring, não apaga nada
      matches = scores.filter((s) => nameSlug(s.nameLower || s.name).includes(slug));
      if (matches.length === 0) {
        console.log(`Nenhum jogador em scores com nome "${query}".`);
        return;
      }
      console.log(`Nenhum nome exatamente igual a "${query}". Candidatos parecidos:`);
      for (const m of matches) console.log(`  ${m.name} (${m.score}m, id ${m.id})`);
      console.log('\nRode de novo com o nome exato, ou com o id.');
      return;
    }
    if (matches.length > 1) {
      console.log(`${matches.length} jogadores com o nome exato "${query}" (não deveria acontecer — rules impedem duplicidade, mas conferindo):`);
      for (const m of matches) console.log(`  ${m.name} (${m.score}m, id ${m.id})`);
      return;
    }
    targetId = matches[0].id;
    label = `${matches[0].name} (${matches[0].score}m)`;
  }

  const [inScores, inStats] = await Promise.all([
    docExists('scores', targetId),
    docExists('stats', targetId),
  ]);

  if (!inScores && !inStats) {
    console.log(`id ${targetId} não existe em nenhuma das duas coleções (já foi apagado?).`);
    return;
  }

  console.log(`Alvo: ${label} — id ${targetId}`);
  console.log(`  scores/${targetId}: ${inScores ? 'existe' : 'não existe'}`);
  console.log(`  stats/${targetId}:  ${inStats ? 'existe' : 'não existe'}`);

  if (!APPLY) {
    console.log('\nEnsaio — nada foi tocado. Rode com --yes para apagar de verdade.');
    return;
  }

  console.log('\napagando…');
  for (const [collection, exists] of [['scores', inScores], ['stats', inStats]]) {
    if (!exists) continue;
    try {
      execFileSync('npx', ['--yes', 'firebase-tools', 'firestore:delete',
        `${collection}/${targetId}`, '--project', PROJECT, '--force'],
      { stdio: 'pipe', shell: process.platform === 'win32' });
      console.log(`  ✔ ${collection}/${targetId}`);
    } catch (e) {
      const saida = String(e.stderr || e.stdout || e.message);
      console.log(`  ✖ ${collection}/${targetId} — ${saida.trim().split('\n').pop()}`);
    }
  }
}
