import { decode } from '../stats/RadiografiaCore.js';
import { firebaseConfig } from '../firebase-config.js';

// Aba 🆘 RECUPERAÇÃO do /?setup (v1.9.0) — o atendimento do caso "Teco":
// o jogador reinstalou o PWA, perdeu o player_id e o próprio doc órfão
// bloqueia o apelido dele. O push 🆘 do jogo traz o ID NOVO; aqui o dono
// confere a reivindicação (assinatura de aparelho/local dos dois lados,
// leitura pública) e AUTORIZA — o servidor local (:3210) grava o par
// {idNovo: idAntigo} no doc config/reassign com a credencial do
// firebase-tools, e o aparelho do jogador se restaura sozinho no próximo
// boot. "Concluído" limpa o par e apaga os docs órfãos do id provisório.
//
// Leituras: REST público (como a Radiografia). Escritas: SÓ via servidor
// local — sem ele no ar, a aba é somente-leitura e avisa.
//
// Carregada sob demanda (import dinâmico no clique da aba).

const API = 'http://localhost:3210';

// Mesmo helper do SetupPage (duplicado de propósito — cada página estática é
// autossuficiente). textContent sempre: nada de innerHTML com dado de fora.
function el(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

// Mesma normalização de LeaderboardSystem.nameSlug — duplicada porque esta
// aba não deve arrastar os módulos do jogo (SkinSystem etc.) para o setup
const nameSlug = (name) => String(name || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}` +
  '/databases/(default)/documents';

async function fetchDoc(collection, id) {
  const res = await fetch(`${FS_BASE}/${collection}/${encodeURIComponent(id)}?key=${firebaseConfig.apiKey}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${collection}/${id}: HTTP ${res.status}`);
  const data = await res.json();
  const row = { id };
  for (const [k, v] of Object.entries(data.fields || {})) row[k] = decode(v);
  return row;
}

// Varre `scores` atrás do slug (mesma lógica do checkName do jogo: docs
// pré-v1.5 não têm nameLower, então compara pelo slug do name)
async function findScoreByNick(nick) {
  const alvo = nameSlug(nick);
  if (!alvo) return null;
  let token = '';
  for (let page = 0; page < 40; page++) {
    const url = `${FS_BASE.replace(/\/documents$/, '')}/documents/scores?pageSize=300&key=${firebaseConfig.apiKey}${token ? `&pageToken=${token}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`scores: HTTP ${res.status}`);
    const data = await res.json();
    for (const doc of data.documents || []) {
      const id = doc.name.split('/').pop();
      const row = { id };
      for (const [k, v] of Object.entries(doc.fields || {})) row[k] = decode(v);
      if (nameSlug(row.nameLower || row.name) === alvo) return row;
    }
    token = data.nextPageToken || '';
    if (!token) break;
  }
  return null;
}

const diasAtras = (iso) => {
  const ms = Date.parse(iso || '') || 0;
  return ms ? Math.max(0, Math.floor((Date.now() - ms) / 86400000)) : null;
};

const resumoHistory = (stats) => {
  const h = (stats && stats.history) || {};
  const lista = (b) => Object.keys(b || {}).slice(0, 3).join(' | ') || '—';
  return `aparelhos: ${lista(h.clients)} · locais: ${lista(h.geos)}`;
};

let statusLine = null;
function status(msg, cls = 'su-muted') {
  if (!statusLine) return;
  statusLine.textContent = msg;
  statusLine.className = cls;
}

async function api(pathname, options) {
  const res = await fetch(`${API}${pathname}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export function mount(root) {
  const card = el('div', 'su-card');
  card.id = 'su-card-reassign';
  card.append(el('h2', null, '🆘 Recuperação de identidade'));
  card.append(el('p', 'su-muted',
    'O jogador reinstalou o PWA, o aparelho renasceu com outro id e o doc antigo bloqueia o '
    + 'apelido dele. O push 🆘 traz o ID NOVO; confira a reivindicação abaixo e autorize — o '
    + 'jogo do jogador se restaura sozinho no próximo boot (ou em até 1h). '
    + 'Leituras são públicas; autorizar exige o estúdio no ar (iniciar-estudio.bat).'));

  // ---- formulário do atendimento
  const form = el('div');
  form.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin:10px 0';
  const nickInput = el('input');
  nickInput.id = 'su-re-nick';
  nickInput.placeholder = 'Apelido reivindicado (ex.: Teco)';
  nickInput.maxLength = 12;
  const novoInput = el('input');
  novoInput.id = 'su-re-novo';
  novoInput.placeholder = 'ID NOVO do aparelho (veio no push 🆘)';
  const row = el('div');
  row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
  const checkBtn = el('button', 'su-primary', '🔎 Conferir');
  checkBtn.id = 'su-re-check';
  const authBtn = el('button', 'su-primary', '✅ Autorizar reassign');
  authBtn.id = 'su-re-auth';
  authBtn.disabled = true;
  row.append(checkBtn, authBtn);
  statusLine = el('p', 'su-muted', '');
  statusLine.id = 'su-re-status';
  const out = el('div');
  out.id = 'su-re-out';
  form.append(nickInput, novoInput, row, statusLine, out);
  card.append(form);
  root.append(card);

  // ---- pares pendentes
  const cardPend = el('div', 'su-card');
  cardPend.append(el('h2', null, 'Pares pendentes no config/reassign'));
  cardPend.append(el('p', 'su-muted',
    'Cada par fica no ar até você concluir. O jogador confirma com o push "✅ Identidade '
    + 'restaurada" — aí o Concluído limpa o par e apaga os docs órfãos do id provisório.'));
  const pendList = el('div');
  pendList.id = 'su-re-pending';
  cardPend.append(pendList);
  root.append(cardPend);

  let conferido = null; // {idNovo, idAntigo, nome} — habilita o Autorizar

  const renderPending = (pairs, adminReady) => {
    pendList.textContent = '';
    const entries = Object.entries(pairs || {});
    if (!entries.length) {
      pendList.append(el('p', 'su-muted', 'Nenhum par pendente.'));
    }
    for (const [idNovo, idAntigo] of entries) {
      const linha = el('div');
      linha.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:6px 0';
      linha.append(el('code', null, `${idNovo.slice(0, 8)}… → ${idAntigo.slice(0, 8)}…`));
      const done = el('button', null, '✔ Concluído (limpar par + apagar órfãos)');
      done.addEventListener('click', async () => {
        if (!window.confirm(`Concluir o reassign de ${idNovo.slice(0, 8)}…?\n`
          + 'O par sai do config/reassign e os docs órfãos do id provisório são APAGADOS.')) return;
        done.disabled = true;
        try {
          const r = await api('/api/reassign/complete', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idNovo, deleteOrphans: true }),
          });
          status(`✔ Par concluído. Órfãos apagados: stats=${r.deleted.stats} scores=${r.deleted.scores}`, 'su-ok');
          renderPending(r.pairs, adminReady);
        } catch (e) {
          done.disabled = false;
          status(`Concluir falhou: ${e.message}`, 'su-err');
        }
      });
      linha.append(done);
      pendList.append(linha);
    }
  };

  const refreshPending = async () => {
    try {
      const r = await api('/api/reassign/state');
      renderPending(r.pairs, r.adminReady);
      if (!r.adminReady) {
        status('⚠️ Estúdio no ar, mas sem login do firebase-tools — rode: npx firebase-tools login', 'su-warn');
      }
    } catch (e) {
      pendList.textContent = '';
      pendList.append(el('p', 'su-warn',
        '⚠️ Estúdio parado — leituras funcionam, mas autorizar/concluir precisam do '
        + 'servidor local (iniciar-estudio.bat na raiz do projeto).'));
    }
  };

  checkBtn.addEventListener('click', async () => {
    const nick = nickInput.value.trim();
    const idNovo = novoInput.value.trim();
    out.textContent = '';
    conferido = null;
    authBtn.disabled = true;
    if (!nick) { status('Digite o apelido reivindicado.', 'su-err'); return; }
    checkBtn.disabled = true;
    status('Procurando o doc antigo…');
    try {
      const sc = await findScoreByNick(nick);
      if (!sc) {
        status(`Nenhum doc em scores com o apelido "${nick}" — nada a recuperar por nome.`, 'su-err');
        return;
      }
      status('Cruzando com stats…');
      const [stAntigo, stNovo] = await Promise.all([
        fetchDoc('stats', sc.id),
        idNovo ? fetchDoc('stats', idNovo) : Promise.resolve(null),
      ]);
      const dias = diasAtras(sc.scoreAt);
      const bloco = el('div');
      bloco.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin:8px 0';
      bloco.append(el('p', 'su-ok',
        `Doc antigo: "${sc.name}" · ${sc.score} pts (${sc.scoreM || sc.score} m)`
        + `${dias === null ? '' : ` · marca há ${dias}d`} · id ${sc.id.slice(0, 8)}…`));
      bloco.append(el('p', 'su-muted', `Vida antiga — ${resumoHistory(stAntigo)}`));
      if (idNovo) {
        bloco.append(stNovo
          ? el('p', 'su-muted', `Aparelho novo — ${resumoHistory(stNovo)} · ${stNovo.attempts || 0} execuções`)
          : el('p', 'su-warn', 'Aparelho novo ainda sem doc em stats (normal se acabou de reinstalar).'));
        bloco.append(el('p', 'su-muted',
          'Confira se aparelho/local batem com a vida antiga antes de autorizar — o antifraude é você.'));
        conferido = { idNovo, idAntigo: sc.id, nome: sc.name };
        authBtn.disabled = false;
        status('Conferência pronta — revise e autorize.', 'su-ok');
      } else {
        status('Doc antigo encontrado. Preencha o ID NOVO (veio no push 🆘) para autorizar.', 'su-warn');
      }
      out.append(bloco);
    } catch (e) {
      status(`Conferência falhou: ${e.message}`, 'su-err');
    } finally {
      checkBtn.disabled = false;
    }
  });

  authBtn.addEventListener('click', async () => {
    if (!conferido) return;
    if (!window.confirm(`Autorizar a migração?\n\n${conferido.idNovo}\n↓ adota ↓\n${conferido.idAntigo} ("${conferido.nome}")`)) return;
    authBtn.disabled = true;
    status('Gravando o par no config/reassign…');
    try {
      const r = await api('/api/reassign/authorize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idNovo: conferido.idNovo, idAntigo: conferido.idAntigo }),
      });
      status(`✅ Autorizado — "${conferido.nome}" se restaura no próximo boot do aparelho (ou em até 1h).`, 'su-ok');
      renderPending(r.pairs, true);
      conferido = null;
    } catch (e) {
      authBtn.disabled = false;
      status(`Autorizar falhou: ${e.message}`, 'su-err');
    }
  });

  refreshPending();
}
