// Limpeza de desafios de SONDA na coleção challenges/ (delete é proibido nas
// rules — só a credencial de admin do firebase-tools passa por cima).
//
//   node tools/cleanup-challenges.mjs          → lista o que apagaria (dry-run)
//   node tools/cleanup-challenges.mjs --yes    → apaga de verdade
//   (exige `npx firebase-tools login` — uma vez por máquina)
//
// Critério: doc cujo from.id OU algum participante começa com "claude-" —
// desafio criado por sonda de teste nunca é dado real. Mesmo padrão do
// cleanup-stats.mjs. Nunca toca em desafio de gente de verdade.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = readFileSync(join(ROOT, 'js', 'firebase-config.js'), 'utf8');
const KEY = cfg.match(/apiKey: '([^']+)'/)[1];
const PROJECT = cfg.match(/projectId: '([^']+)'/)[1];
const YES = process.argv.includes('--yes');

const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/challenges?key=${KEY}&pageSize=300`;
const res = await fetch(url);
const body = await res.json();
const docs = body.documents || [];

const isProbe = (d) => {
  const f = d.fields || {};
  const fromId = f.from?.mapValue?.fields?.id?.stringValue || '';
  const parts = (f.participants?.arrayValue?.values || []).map((v) => v.stringValue || '');
  return /^claude-/.test(fromId) || parts.some((p) => /^claude-/.test(p));
};

const doomed = docs.filter(isProbe);
console.log(`challenges/: ${docs.length} doc(s), ${doomed.length} de sonda claude-*`);
for (const d of doomed) {
  const id = d.name.split('/').pop();
  const from = d.fields?.from?.mapValue?.fields?.name?.stringValue || '?';
  console.log(`  ${id}  (de: ${from})`);
  if (YES) {
    execFileSync('npx', ['--yes', 'firebase-tools', 'firestore:delete',
      `challenges/${id}`, '--project', PROJECT, '--force'], { stdio: 'inherit', shell: true });
  }
}
if (!YES && doomed.length) console.log('\nDry-run. Para apagar: node tools/cleanup-challenges.mjs --yes');
if (!doomed.length) console.log('Nada a apagar.');
