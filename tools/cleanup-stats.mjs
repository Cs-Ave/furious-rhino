// Remove documentos de TESTE da coleção `stats` de produção.
//   node tools/cleanup-stats.mjs           → só lista (nada é apagado)
//   node tools/cleanup-stats.mjs --yes     → apaga de verdade
//
// Por que existe: `firestore.rules` tem `allow delete: if false` na coleção
// `stats` — nem o jogo nem um script com a apiKey pública conseguem apagar
// nada, e é assim que deve ser. O Firebase CLI usa credenciais de
// ADMINISTRADOR e passa por cima das rules, então este script delega a ele.
//
// Pré-requisito (uma vez por máquina, abre o navegador):
//   npx firebase-tools login
//
// O que ele apaga:
//   1. Sondas de teste — qualquer doc com id `claude-*` (o painel e o resumo
//      diário já os filtram, mas eles poluem a lista no console).
//   2. A lista JUNK abaixo: 16 docs criados por engano em 08/08/2026 por
//      contextos de Playwright sem playerId de sonda. Antes de apagar, cada
//      um é RECONFERIDO contra a impressão digital — se o doc mudou (ou se o
//      id foi reciclado por um jogador real), ele é pulado com aviso.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--yes');

const cfg = readFileSync(join(ROOT, 'js', 'firebase-config.js'), 'utf8');
const KEY = cfg.match(/apiKey:\s*'([^']+)'/)[1];
const PROJECT = cfg.match(/projectId:\s*'([^']+)'/)[1];

// Docs falsos de 08/08/2026 — ver o comentário no topo
const JUNK = [
  '077d8659-bc50-4bd7-8168-10315bf89f61', '2a36e562-5fd3-4e69-84b1-ca81ea584845',
  '2eb332e5-1e92-4f1b-8a94-79a84c1c1e9a', '3a275316-e329-42b8-9c08-3d5ea6d2060b',
  '3f01e56e-e16e-4ae1-b950-32fc3b05ea1e', '54c98179-780b-4067-8093-a5cb17f9401e',
  '595c36e4-82fe-483a-9ef4-0b53db50d199', '5b90219a-3a04-4e19-8e55-2004286f59a9',
  '77b87ce5-25e9-484c-9e75-06b5a1fcf7eb', '81b606cb-ad0e-4b47-9995-7a173c9a083d',
  'ade693e6-0a64-4a66-9610-49e460394cc7', 'b33980cd-568e-477d-9f1a-2f598d835aac',
  'ceaec7d8-c916-4fb5-a6e0-f3418520a2ea', 'e6e9d363-55b1-442d-b45b-05c797cc4e31',
  'ee6e8059-c37a-4b0f-a18c-dfc708fa7f41', 'f5d6a449-c8d9-4ae8-a553-8fafe8bdfb33',
];
// Assinatura das sementes usadas nos testes daquele dia
const FINGERPRINT = [
  { attempts: 24, bestM: 1145 }, { attempts: 20, bestM: 1145 }, { attempts: 47, bestM: 812 },
];
const CREATED_BEFORE = '2026-08-09T12:00:00Z'; // nenhum doc novo pode entrar na lista

const dec = (v) => {
  if (!v) return null;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return Boolean(v.booleanValue);
  return undefined; // mapas/listas não interessam aqui
};

async function fetchStats() {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}` +
    '/databases/(default)/documents/stats';
  const out = [];
  let token = '';
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${base}?pageSize=300&key=${KEY}${token ? `&pageToken=${token}` : ''}`);
    if (!res.ok) throw new Error(`Firestore: HTTP ${res.status}`);
    const data = await res.json();
    for (const doc of data.documents || []) {
      const row = { id: doc.name.split('/').pop(), created: doc.createTime };
      for (const [k, v] of Object.entries(doc.fields || {})) row[k] = dec(v);
      out.push(row);
    }
    token = data.nextPageToken || '';
    if (!token) break;
  }
  return out;
}

const docs = await fetchStats();
const byId = new Map(docs.map((d) => [d.id, d]));
console.log(`coleção stats: ${docs.length} documentos\n`);

const apagar = [];
const pular = [];

for (const d of docs) {
  if (/^claude-/.test(d.id)) {
    apagar.push({ id: d.id, motivo: 'sonda de teste (claude-*)' });
  }
}

for (const id of JUNK) {
  const d = byId.get(id);
  if (!d) { pular.push({ id, motivo: 'já não existe' }); continue; }
  // Reconferência: o doc ainda é o que eu identifiquei?
  const bate = FINGERPRINT.some((f) => f.attempts === d.attempts && f.bestM === d.bestM);
  if (!bate) {
    pular.push({ id, motivo: `NÃO bate a assinatura (attempts=${d.attempts} bestM=${d.bestM})` });
    continue;
  }
  if (d.created >= CREATED_BEFORE) {
    pular.push({ id, motivo: `criado depois da janela (${d.created})` });
    continue;
  }
  apagar.push({ id, motivo: `teste 08/08 (attempts=${d.attempts} bestM=${d.bestM})` });
}

if (pular.length) {
  console.log('PULADOS (não serão tocados):');
  for (const p of pular) console.log(`  ${p.id} — ${p.motivo}`);
  console.log('');
}

// `process.exit` com socket de fetch ainda vivo derruba o libuv no Windows
// (Assertion failed em async.c) — encerrar por queda natural do fluxo.
if (!apagar.length) {
  console.log('Nada a apagar. 🎉');
} else if (!APPLY) {
  console.log(`A APAGAR (${apagar.length}):`);
  for (const a of apagar) console.log(`  stats/${a.id} — ${a.motivo}`);
  console.log('\nEnsaio — nada foi tocado. Para apagar de verdade:');
  console.log('  1) npx firebase-tools login      (uma vez por máquina)');
  console.log('  2) node tools/cleanup-stats.mjs --yes');
} else {
  console.log(`A APAGAR (${apagar.length}):`);
  for (const a of apagar) console.log(`  stats/${a.id} — ${a.motivo}`);
  console.log('\napagando…');
  let ok = 0;
  for (const a of apagar) {
    try {
      execFileSync('npx', ['--yes', 'firebase-tools', 'firestore:delete',
        `stats/${a.id}`, '--project', PROJECT, '--force'],
      { stdio: 'pipe', shell: process.platform === 'win32' });
      console.log(`  ✔ stats/${a.id}`);
      ok++;
    } catch (e) {
      const saida = String(e.stderr || e.stdout || e.message);
      console.log(`  ✖ stats/${a.id} — ${saida.trim().split('\n').pop()}`);
    }
  }
  console.log(`\n${ok}/${apagar.length} apagados.`);
  console.log('Confira em /?stats=0929 → aba Jogadores (o painel cacheia: use 🔄 Atualizar).');
}
