import { radiografia, decode } from '../stats/RadiografiaCore.js';
import { firebaseConfig } from '../firebase-config.js';

// Aba 📊 RADIOGRAFIA do /?setup — a análise de usabilidade rodando no
// navegador do dono, com o MESMO núcleo puro da CLI (npm run radiografia).
//
// 100% leitura: REST GET público paginado (idêntico ao da CLI, sondas
// `claude-*` filtradas), nada é gravado no Firestore. Não depende do
// servidor local do gerador de sprites — só de internet. Erro de rede vira
// aviso e botão de tentar de novo: telemetria é acessória, a página nunca
// quebra. O service worker dá bypass em googleapis.com, então o dado nunca
// vem de cache velho.
//
// Carregado sob demanda (import dinâmico no clique da aba) — o /?setup
// continua abrindo instantâneo para quem só quer mexer em skin.

// Última execução salva localmente (só um resumo compacto — o delta "o que
// mudou desde a última vez que olhei" nasce daqui, regra R-17 do núcleo)
const BASE_KEY = 'furious_rhino_radiografia_base';

// Mesmo helper do SetupPage (duplicado de propósito — cada página estática é
// autossuficiente). textContent sempre: nada de innerHTML com dado de fora.
function el(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

const SEV_ICONE = { critico: '🔴', atencao: '🟠', observar: '🟡', vitoria: '🟢', 'sem-amostra': '⚪' };
const SEV_CLASSE = { critico: 'su-err', atencao: 'su-warn', observar: 'su-warn', vitoria: 'su-ok', 'sem-amostra': 'su-muted' };

// REST GET paginado — mesmo laço, mesmo teto e mesmo filtro da CLI
// (tools/radiografia.mjs); o decode compartilhado garante shape idêntico.
async function fetchCollectionBrowser(name, onProgress) {
  const base = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}` +
    `/databases/(default)/documents/${name}`;
  const out = [];
  let token = '';
  for (let page = 0; page < 40; page++) {
    onProgress(`baixando ${name}… (pág. ${page + 1})`);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    let res;
    try {
      const url = `${base}?pageSize=300&key=${firebaseConfig.apiKey}${token ? `&pageToken=${token}` : ''}`;
      res = await fetch(url, { signal: ctl.signal });
    } finally {
      clearTimeout(timer);
    }
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
  return out;
}

function lerAnterior() {
  try {
    const raw = localStorage.getItem(BASE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return v && typeof v === 'object' ? v : null;
  } catch (e) {
    return null;
  }
}

function salvarBase(meta, metricas) {
  try {
    localStorage.setItem(BASE_KEY, JSON.stringify({
      atS: meta.geradoEmS,
      dia: meta.dia,
      jogadores: metricas.totais.jogadores,
      execucoes: metricas.totais.execucoes,
      fugas: metricas.totais.fugas,
    }));
  } catch (e) { /* localStorage cheio/bloqueado — o delta some, nada quebra */ }
}

export function mount(root) {
  const card = el('div', 'su-card');
  card.id = 'su-card-radiografia';
  card.append(el('h2', null, '📊 Radiografia viva'));
  card.append(el('p', 'su-muted',
    'A análise de usabilidade completa (a mesma do npm run radiografia): funil, retenção, '
    + 'curva de aprendizado, bosses, pontuação em campo, arena e o motor de insights. '
    + 'Só leitura pública — nada é gravado — e funciona sem o gerador local no ar.'));

  const row = el('div');
  row.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:10px 0';
  const btn = el('button', 'su-primary', '▶ Rodar análise');
  btn.id = 'su-radio-run';
  const status = el('span', 'su-muted', '');
  status.id = 'su-radio-status';
  row.append(btn, status);
  card.append(row);

  const out = el('div');
  out.id = 'su-radiografia-out';
  card.append(out);
  root.append(card);

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    out.textContent = '';
    try {
      const setStatus = (t) => { status.className = 'su-muted'; status.textContent = t; };
      const stats = await fetchCollectionBrowser('stats', setStatus);
      const scores = await fetchCollectionBrowser('scores', setStatus);
      const challenges = await fetchCollectionBrowser('challenges', setStatus);
      setStatus('agregando…');
      const nowS = Math.floor(Date.now() / 1000);
      const r = radiografia({ stats, scores, challenges }, {
        nowS, origem: 'setup-tab', anterior: lerAnterior(),
      });
      salvarBase(r.meta, r.metricas);
      render(out, r);
      setStatus(`pronto — ${r.meta.dia}`);
      status.className = 'su-ok';
    } catch (e) {
      status.className = 'su-err';
      status.textContent = `sem dados: ${e && e.message ? e.message : e} — confira a internet (ou um bloqueador de conteúdo) e tente de novo.`;
    } finally {
      btn.disabled = false;
      btn.textContent = '▶ Rodar de novo';
    }
  });
}

function render(out, { meta, metricas, insights, markdown }) {
  const M = metricas;
  const pct = (v) => `${Math.round((Number(v) || 0) * 100)}%`;

  const resumo = el('p');
  resumo.style.cssText = 'font-size:15px;line-height:1.6';
  resumo.append(el('b', null,
    `${M.totais.jogadores} jogadores · ${M.totais.execucoes} execuções · ${M.totais.fugas} fugas`));
  resumo.append(document.createElement('br'));
  resumo.append(`${M.totais.corridasJanela} corridas na janela · ${pct(M.retencao.retorno2oDia)} voltaram a um 2º dia · `
    + `${M.funil.bestM[2000]} aparelho(s) ≥ 2000 m · mediana pós-portão ${M.funil.posPortao.medianaM} m`);
  out.append(resumo);

  const h = el('h2', null, 'Insights automáticos');
  h.style.marginTop = '14px';
  out.append(h);
  for (const i of insights) {
    const p = el('p', SEV_CLASSE[i.sev] || 'su-muted');
    p.style.cssText = 'margin:6px 0;font-size:13px;line-height:1.5';
    const partes = [i.dado, i.problema, i.sugestao ? `Sugestão: ${i.sugestao}` : ''].filter(Boolean);
    p.append(el('b', null, `${SEV_ICONE[i.sev] || ''} [${i.id}] ${i.titulo} — `));
    p.append(partes.join(' '));
    out.append(p);
  }

  const det = document.createElement('details');
  det.style.marginTop = '14px';
  const sum = document.createElement('summary');
  sum.textContent = 'Relatório completo (markdown pronto para o IDEIAS-FUTURAS.md)';
  sum.style.cursor = 'pointer';
  det.append(sum);
  const pre = document.createElement('pre');
  pre.textContent = markdown;
  det.append(pre);
  out.append(det);

  const acoes = el('div');
  acoes.style.cssText = 'display:flex;gap:10px;margin-top:10px;flex-wrap:wrap';
  const copiar = el('button', null, '📋 copiar markdown');
  copiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      copiar.textContent = 'copiado ✓';
    } catch (e) {
      copiar.textContent = 'copie do relatório acima';
    }
    setTimeout(() => { copiar.textContent = '📋 copiar markdown'; }, 2000);
  });
  const baixar = el('button', null, '⬇ baixar JSON');
  baixar.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ meta, metricas, insights }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `radiografia-${meta.dia}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });
  acoes.append(copiar, baixar);
  out.append(acoes);
}
