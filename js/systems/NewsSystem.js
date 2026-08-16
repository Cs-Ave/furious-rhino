// Diário da Fuga (v1.8.1) — o feed de notícias da tela inicial.
// Três fontes, nesta ordem de prioridade na renderização:
//   1. o PRIMEIRO aviso do dono (doc `config/news` no console do Firebase —
//      as rules de config/{doc} já permitem leitura pública; é onde as
//      novidades de cada versão são anunciadas SEM release);
//   2. eventos locais do próprio jogador (skin desbloqueada, entrou/perdeu
//      o pódio, recorde novo), persistidos em localStorage;
//   3. os demais avisos do dono, se sobrar vaga.
// Nada aqui derruba o jogo: rede falhou → cache velho ou lista vazia
// (regra 1 do projeto — acessórios nunca quebram o núcleo).
//
// Formato do doc config/news (editado no console): campo `items`, array de
// strings. Cada string é um card; a primeira é sempre exibida.
import { getDb } from './LeaderboardSystem.js';

const LOCAL_KEY = 'furious_rhino_news';        // [{k, t, x, c}] — key, ms, texto, cor
const REMOTE_KEY = 'furious_rhino_news_cfg';   // {at, items: [string]}
const REMOTE_TTL_MS = 60 * 60 * 1000;          // mesmo TTL do config/notify
const LOCAL_CAP = 10;

export class NewsSystem {
  // Evento local. `key` deduplica para sempre (ex.: 'skin:catisquick' não
  // vira notícia duas vezes); cor: 'gold' conquista, 'red' alerta, '' info.
  static push(key, text, color = '') {
    const items = this.localItems();
    if (items.some((i) => i.k === key)) return false;
    items.unshift({ k: key, t: Date.now(), x: String(text).slice(0, 140), c: color });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items.slice(0, LOCAL_CAP)));
    return true;
  }

  static localItems() {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_KEY));
      return Array.isArray(raw) ? raw.filter((i) => i && i.x) : [];
    } catch (e) {
      return [];
    }
  }

  static remoteItems() {
    try {
      const raw = JSON.parse(localStorage.getItem(REMOTE_KEY));
      return raw && Array.isArray(raw.items) ? raw.items.filter((s) => typeof s === 'string' && s) : [];
    } catch (e) {
      return [];
    }
  }

  // Busca o config/news se o cache venceu (1 read/h por navegador).
  // Devolve true se o conteúdo mudou (a tela re-renderiza).
  static async refresh() {
    try {
      const raw = JSON.parse(localStorage.getItem(REMOTE_KEY));
      if (raw && Date.now() - raw.at < REMOTE_TTL_MS) return false;
    } catch (e) { /* cache corrompido: segue para a rede */ }
    const before = JSON.stringify(this.remoteItems());
    try {
      const { fs, db } = await getDb();
      const snap = await fs.getDoc(fs.doc(db, 'config', 'news'));
      const data = snap.exists() ? snap.data() : {};
      const items = Array.isArray(data.items)
        ? data.items.filter((s) => typeof s === 'string' && s).slice(0, 6)
        : [];
      localStorage.setItem(REMOTE_KEY, JSON.stringify({ at: Date.now(), items }));
      return JSON.stringify(items) !== before;
    } catch (e) {
      return false; // offline/regra: o cache (ou o vazio) segue valendo
    }
  }

  // O feed renderizável, só de cache (síncrono — o boot pinta na hora):
  // [1º aviso do dono] + eventos locais + demais avisos, até `limit`.
  static feed(limit = 3) {
    const remote = this.remoteItems().map((x) => ({ x, c: '', remote: true }));
    const locals = this.localItems();
    const out = [];
    if (remote.length) out.push(remote[0]);
    for (const i of locals) { if (out.length < limit) out.push(i); }
    for (const r of remote.slice(1)) { if (out.length < limit) out.push(r); }
    return out.slice(0, limit);
  }

  // "hoje" / "ontem" / dd/mm — rótulo curto do card
  static dayLabel(ms) {
    if (!ms) return '';
    const dayStart = (x) => new Date(new Date(x).setHours(0, 0, 0, 0)).getTime();
    const diff = Math.round((dayStart(Date.now()) - dayStart(ms)) / 86400000);
    if (diff <= 0) return 'hoje';
    if (diff === 1) return 'ontem';
    const d = new Date(ms);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  // Monta os cards dentro do container (a tela chama no boot e após refresh)
  static renderInto(el, limit = 3) {
    if (!el) return;
    el.textContent = '';
    const items = this.feed(limit);
    for (const item of items) {
      const card = document.createElement('div');
      card.className = `news-item${item.c ? ` ${item.c}` : ''}${item.remote ? ' remote' : ''}`;
      const text = document.createElement('span');
      text.textContent = item.x; // textContent: o doc remoto é conteúdo, nunca HTML
      card.appendChild(text);
      if (item.t) {
        const when = document.createElement('small');
        when.textContent = this.dayLabel(item.t);
        card.appendChild(when);
      }
      el.appendChild(card);
    }
    el.parentElement?.classList.toggle('empty', items.length === 0);
  }
}
