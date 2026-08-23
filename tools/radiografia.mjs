// RADIOGRAFIA VIVA — a análise de usabilidade executável a qualquer momento.
//
//   npm run radiografia            → markdown no stdout (pronto para colar em
//                                    docs/IDEIAS-FUTURAS.md como seção datada)
//   npm run radiografia -- --json  → o objeto {meta, metricas, insights} cru
//
// Este script é o TITULAR da spec do §3 de docs/IDEIAS-FUTURAS.md (o
// tools/analyze-v2.mjs original foi apagado de propósito em 16/08; recriar
// não é mais necessário — está aqui, mantido e testado). Toda a inteligência
// mora em js/stats/RadiografiaCore.js (puro — a aba 📊 do /?setup usa o
// MESMO núcleo); esta casca só busca as coleções.
//
// Higiene inegociável: leitura pública via REST GET (a apiKey é pública por
// design; a proteção são as rules), ZERO writes, sondas `claude-*` filtradas.
// Molde de fetch idêntico ao tools/daily-digest.mjs — e a conferência do §3
// vale: os totais têm de bater com o `npm run digest` do mesmo momento.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { radiografia } from '../js/stats/RadiografiaCore.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function apiKey() {
  const src = readFileSync(join(ROOT, 'js', 'firebase-config.js'), 'utf8');
  const m = src.match(/apiKey:\s*'([^']+)'/);
  if (!m) throw new Error('apiKey não encontrada em js/firebase-config.js');
  return m[1];
}

function projectId() {
  const src = readFileSync(join(ROOT, 'js', 'firebase-config.js'), 'utf8');
  const m = src.match(/projectId:\s*'([^']+)'/);
  if (!m) throw new Error('projectId não encontrado em js/firebase-config.js');
  return m[1];
}

// REST GET paginado (300 × 40 páginas = teto de 12.000 docs por coleção — se
// um dia encostar, o aviso abaixo dispara em vez de truncar em silêncio).
// O decode vem do núcleo: mesmo shape no node e no navegador.
async function fetchCollection(name) {
  const { decode } = await import('../js/stats/RadiografiaCore.js');
  const base = `https://firestore.googleapis.com/v1/projects/${projectId()}` +
    `/databases/(default)/documents/${name}`;
  const out = [];
  let token = '';
  let pages = 0;
  for (; pages < 40; pages++) {
    const url = `${base}?pageSize=300&key=${apiKey()}${token ? `&pageToken=${token}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    const data = await res.json();
    for (const doc of data.documents || []) {
      const id = doc.name.split('/').pop();
      if (/^claude-/.test(id)) continue; // sondas de rules/e2e: nunca entram
      const row = { id };
      for (const [k, v] of Object.entries(doc.fields || {})) row[k] = decode(v);
      out.push(row);
    }
    token = data.nextPageToken || '';
    if (!token) break;
  }
  if (token) console.error(`⚠️ ${name}: teto de paginação atingido (${out.length} docs) — subir o limite no script.`);
  return out;
}

// Só executa quando chamado direto (o teste importa sem rodar)
if (process.argv[1] && process.argv[1].endsWith('radiografia.mjs')) {
  const [stats, scores, challenges] = await Promise.all([
    fetchCollection('stats'),
    fetchCollection('scores'),
    fetchCollection('challenges'),
  ]);
  const nowS = Math.floor(Date.now() / 1000);
  const r = radiografia({ stats, scores, challenges }, { nowS, origem: 'cli' });
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ meta: r.meta, metricas: r.metricas, insights: r.insights }, null, 2));
  } else {
    console.log(r.markdown);
    const c = r.meta.conferenciaDigest;
    console.error(`\n✔ conferência (vs npm run digest do mesmo momento): ${c.jogadores} jogadores · ${c.execucoes} execuções · ${c.fugas} fugas`);
  }
}
