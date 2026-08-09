import { Constants } from '../utils/Constants.js';
import { StorageManager } from '../utils/StorageManager.js';
import { notifyConfig } from '../notify-config.js';
import { StatsSystem } from './StatsSystem.js';
import { getDb } from './LeaderboardSystem.js';

// Push para o ADMINISTRADOR via ntfy (v1.6.1). Mesmo contrato de silêncio do
// resto da telemetria: nada aqui pode derrubar o jogo, nenhum erro propaga.
//
// Por que dá para publicar direto do navegador, sem backend: o ntfy aceita um
// JSON no endpoint RAIZ, e um POST com corpo string vira `Content-Type:
// text/plain` — uma *simple request*, que não dispara preflight CORS. Enviar
// headers próprios (Title, Tags) faria preflight; por isso tudo vai no corpo.
//
// O `sw.js` precisa ter o host na lista de bypass, senão o service worker
// tenta cachear o POST.
// Silenciador POR APARELHO. Ligado com `?ntfy=off` (e desligado com
// `?ntfy=on`), fica gravado. Serve para dois casos concretos:
//  - as suítes de e2e, que iniciam dezenas de corridas e encheriam o celular
//    do dono de "fulano começou a jogar" a cada execução;
//  - o próprio aparelho do dono, que não precisa se notificar jogando.
const OFF_KEY = 'furious_rhino_notify_off';
const CFG_KEY = 'furious_rhino_notify_cfg';
const CFG_TTL_MS = 60 * 60 * 1000; // config do Firestore revalidada de hora em hora
const SESSION_KEY = 'furious_rhino_notify_session';
const BUDGET_KEY = 'furious_rhino_notify_sent';
const WR_KEY = 'furious_rhino_notify_wr'; // último recorde mundial já anunciado

export class NotifySystem {
  static _cfg = null;
  static _timer = null;
  static _bound = false;

  // ---------------------------------------------------------------- config

  // Defaults do arquivo + sobreposição do doc `config/notify` (cacheada 1h).
  // A leitura NUNCA bloqueia: se o Firestore não responder, valem os defaults.
  // Aparelho silenciado? Checado ANTES de tudo — nem a config do Firestore
  // consegue reativar, é decisão local.
  static isSilenced() {
    try {
      return localStorage.getItem(OFF_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  static setSilenced(on) {
    try {
      if (on) localStorage.setItem(OFF_KEY, '1');
      else localStorage.removeItem(OFF_KEY);
    } catch (e) { /* sem storage: segue o padrão */ }
  }

  static async config() {
    if (this._cfg) return this._cfg;

    let override = null;
    try {
      const raw = JSON.parse(localStorage.getItem(CFG_KEY));
      if (raw && typeof raw === 'object' && Date.now() - raw.at < CFG_TTL_MS) {
        override = raw.data;
      }
    } catch (e) { /* cache corrompido — busca de novo */ }

    if (override === null) {
      override = await this.fetchOverride();
      try {
        localStorage.setItem(CFG_KEY, JSON.stringify({ at: Date.now(), data: override }));
      } catch (e) { /* quota cheia: seguir sem cache é aceitável */ }
    }

    // Só chaves conhecidas entram — um doc com lixo não injeta campo nenhum
    const cfg = { ...notifyConfig };
    if (override && typeof override === 'object') {
      for (const key of Object.keys(notifyConfig)) {
        if (key in override && override[key] !== null) cfg[key] = override[key];
      }
    }
    this._cfg = cfg;
    return cfg;
  }

  static async fetchOverride() {
    try {
      const { fs, db } = await getDb();
      const snap = await fs.getDoc(fs.doc(db, 'config', 'notify'));
      return (snap && snap.exists && snap.exists()) ? snap.data() : {};
    } catch (e) {
      return {}; // offline, doc inexistente ou rules negando: defaults valem
    }
  }

  // ---------------------------------------------------------------- guardas

  // Hora em America/Sao_Paulo: a faixa de silêncio é a do DONO do jogo, não a
  // do relógio de quem está jogando
  static hourBR() {
    try {
      return parseInt(new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false,
      }).format(new Date()), 10);
    } catch (e) {
      return new Date().getHours();
    }
  }

  static isQuiet(cfg) {
    const range = Array.isArray(cfg.quietHours) ? cfg.quietHours : [];
    const [from, to] = [Number(range[0]), Number(range[1])];
    if (!isFinite(from) || !isFinite(to) || from === to) return false;
    const h = this.hourBR();
    return from < to ? (h >= from && h < to) : (h >= from || h < to);
  }

  // Teto por aba aberta — trava contra um laço acidental virar 500 pushes
  static spend(cfg) {
    let sent = 0;
    try {
      sent = parseInt(sessionStorage.getItem(BUDGET_KEY), 10) || 0;
    } catch (e) {
      return true; // sem sessionStorage não dá para contar; deixa passar
    }
    if (sent >= Number(cfg.maxPerSession || 4)) return false;
    try { sessionStorage.setItem(BUDGET_KEY, String(sent + 1)); } catch (e) { /* ok */ }
    return true;
  }

  // ---------------------------------------------------------------- envio

  static async post(kind, { title, message, tags, priority }, { beacon = false } = {}) {
    try {
      if (this.isSilenced()) return false; // trava por aparelho (?ntfy=off)
      if (beacon && !this._cfg) return false; // ver flushSession
      const cfg = beacon ? this._cfg : await this.config();
      if (!cfg.enabled || !cfg.topic) return false;
      if (kind && cfg[kind] === false) return false;
      if (this.isQuiet(cfg)) return false;
      if (!this.spend(cfg)) return false;

      const url = `${String(cfg.server || 'https://ntfy.sh').replace(/\/+$/, '')}/`;
      const body = JSON.stringify({
        topic: String(cfg.topic),
        title: String(title || 'FURIOUS RHINO').slice(0, 120),
        message: String(message || '').slice(0, 900),
        tags: Array.isArray(tags) ? tags : undefined,
        priority: priority || undefined,
      });

      // Saindo da página: só o sendBeacon sobrevive. O Blob text/plain mantém
      // a requisição simples (o beacon não aceita preflight).
      if (beacon && navigator.sendBeacon) {
        return navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }));
      }
      await fetch(url, { method: 'POST', body, keepalive: true });
      return true;
    } catch (e) {
      return false; // ntfy fora do ar, bloqueado por adblock, offline…
    }
  }

  // ------------------------------------------------------- estado da sessão

  static readSession() {
    const empty = { runs: 0, best: 0, escaped: false, causes: {}, sentRuns: 0 };
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      return (s && typeof s === 'object') ? { ...empty, ...s } : empty;
    } catch (e) {
      return empty;
    }
  }

  static writeSession(s) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { /* ok */ }
  }

  // Assinatura curta de quem está jogando, respeitando includeName/includePlace
  static async who(cfg) {
    const name = cfg.includeName !== false
      ? (StorageManager.getPlayerName() || 'Anônimo')
      : 'Um jogador';
    let place = '';
    if (cfg.includePlace !== false) {
      // Cache local apenas: nunca vale segurar um push esperando rede
      const geo = StorageManager.getGeo();
      if (geo && geo.ok) place = StatsSystem.geoLabel(geo);
    }
    return { name, place };
  }

  static fmtDuration(s) {
    const t = Math.max(0, Math.round(s));
    if (t < 60) return `${t}s`;
    if (t < 3600) return `${Math.floor(t / 60)}min`;
    return `${Math.floor(t / 3600)}h ${Math.floor((t % 3600) / 60)}min`;
  }

  // ---------------------------------------------------------------- eventos

  // 1× por aba, na primeira corrida. Também arma o resumo da sessão.
  static async sessionStarted() {
    if (this.isSilenced()) return false; // nem arma o timer do resumo
    const cfg = await this.config();
    if (!cfg.enabled || !cfg.topic) return false;

    this.bindLifecycle();
    const minutes = Number(cfg.sessionSummaryAfterMin || 0);
    if (minutes > 0 && !this._timer) {
      this._timer = setTimeout(() => this.flushSession('tempo'), minutes * 60 * 1000);
    }

    const { name, place } = await this.who(cfg);
    const record = StorageManager.getRecord();
    const attempts = StorageManager.getAttempts();
    const lines = [
      place || 'local desconhecido',
      `Recorde: ${record}m · ${attempts} execuç${attempts === 1 ? 'ão' : 'ões'} na vida`,
    ];
    return this.post('onStart', {
      title: `🎮 ${name} começou a jogar`,
      message: lines.join('\n'),
      tags: ['video_game'],
    });
  }

  // Uma chamada por corrida encerrada — só acumula, não envia
  static noteRun({ meters = 0, cause = null, escaped = false } = {}) {
    try {
      const s = this.readSession();
      s.runs++;
      s.best = Math.max(s.best, Math.floor(meters));
      if (escaped) s.escaped = true;
      const key = cause || 'wall';
      s.causes[key] = (s.causes[key] || 0) + 1;
      this.writeSession(s);
    } catch (e) { /* acessório */ }
  }

  // Resumo da sessão. Reenvia só se houve corrida NOVA desde o último — assim
  // alternar de aba várias vezes não gera uma enxurrada de resumos iguais.
  static async flushSession(reason = 'saída', { beacon = false } = {}) {
    try {
      // Saindo da página não dá para esperar rede NEM promessa de config: se
      // a config ainda não foi resolvida, é porque o `sessionStarted` nunca
      // rodou — ou seja, não havia tópico configurado. Nada a enviar.
      if (beacon && !this._cfg) return false;
      const cfg = beacon ? this._cfg : await this.config();
      if (!cfg.enabled || !cfg.topic || cfg.onSessionEnd === false) return false;

      const s = this.readSession();
      if (s.runs === 0 || s.runs <= s.sentRuns) return false;
      if (s.best < Number(cfg.minMetersToNotify || 0)) return false;

      const startedAt = StorageManager.getSessionStartedAt();
      const dur = startedAt ? this.fmtDuration((Date.now() - startedAt) / 1000) : '—';
      const { name, place } = await this.who(cfg);

      const causes = Object.entries(s.causes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `${Constants.CAUSE_LABELS[k] || k} ×${v}`)
        .join(' · ');

      const lines = [
        `${dur} · ${s.runs} execuç${s.runs === 1 ? 'ão' : 'ões'}`,
        `Melhor: ${s.best}m${s.escaped ? ' 🗽 escapou!' : ''}`,
      ];
      if (causes) lines.push(causes);
      if (place) lines.push(place);

      // Marca ANTES de enviar: com o sendBeacon a página pode morrer no meio,
      // e um resumo perdido é melhor que dois resumos iguais
      s.sentRuns = s.runs;
      this.writeSession(s);

      return this.post('onSessionEnd', {
        title: `📊 ${name} — sessão encerrada (${reason})`,
        message: lines.join('\n'),
        tags: ['bar_chart'],
      }, { beacon });
    } catch (e) {
      return false;
    }
  }

  // Chamada depois de o score ser aceito pelo servidor. Confirma o recorde
  // com uma consulta ao topo real — o cache de rivais pode estar velho e um
  // falso "RECORDE MUNDIAL" seria pior que nenhum.
  static async maybeWorldRecord(meters) {
    try {
      const cfg = await this.config();
      if (!cfg.enabled || !cfg.topic || cfg.onWorldRecord === false) return false;

      const { fs, db } = await getDb();
      const snap = await fs.getDocs(fs.query(
        fs.collection(db, 'scores'), fs.orderBy('score', 'desc'), fs.limit(2)
      ));
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const top = rows[0];
      const myId = StorageManager.getOrCreatePlayerId();
      if (!top || top.id !== myId || Number(top.score) !== Math.floor(meters)) return false;

      // Não repetir o mesmo recorde (o send roda mais de uma vez por sessão)
      const already = parseInt(localStorage.getItem(WR_KEY), 10) || 0;
      if (already >= Math.floor(meters)) return false;
      localStorage.setItem(WR_KEY, String(Math.floor(meters)));

      const { name, place } = await this.who(cfg);
      const prev = rows[1];
      const lines = [`${name} — ${Math.floor(meters)}m`];
      if (prev) lines.push(`anterior: ${Number(prev.score) || 0}m (${String(prev.name || '???')})`);
      if (place) lines.push(place);

      return this.post('onWorldRecord', {
        title: '🏆 NOVO RECORDE MUNDIAL',
        message: lines.join('\n'),
        tags: ['trophy'],
        priority: 4,
      });
    } catch (e) {
      return false;
    }
  }

  // -------------------------------------------------------------- lifecycle

  // `pagehide` é o fechamento de verdade; `visibilitychange` é o que dispara
  // de fato no celular (trocar de app). Os dois mandam por beacon, e o guarda
  // de `sentRuns` impede duplicata.
  static bindLifecycle() {
    if (this._bound) return;
    this._bound = true;
    const flush = (reason) => { this.flushSession(reason, { beacon: true }); };
    window.addEventListener('pagehide', () => flush('saiu'));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) flush('minimizou');
    });
  }

  // ------------------------------------------------------------------ teste
  // `?ntfy=test`: manda um exemplo de cada tipo com dados sintéticos, sem
  // precisar jogar nem esperar o cron.
  static async selfTest() {
    const cfg = await this.config();
    if (!cfg.topic) {
      console.warn('[ntfy] topic vazio em js/notify-config.js — nada a enviar');
      return false;
    }
    try { sessionStorage.setItem(BUDGET_KEY, '0'); } catch (e) { /* ok */ }
    const before = cfg.quietHours;
    cfg.quietHours = [0, 0]; // teste ignora a faixa de silêncio

    await this.post('onStart', {
      title: '🎮 [teste] Fulano começou a jogar',
      message: 'São Paulo (SP) · BR\nRecorde: 812m · 47 execuções na vida',
      tags: ['video_game'],
    });
    await this.post('onSessionEnd', {
      title: '📊 [teste] Fulano — sessão encerrada',
      message: '17min · 12 execuções\nMelhor: 940m\n🧱 Parede ×7 · 🔺 Espinho ×3',
      tags: ['bar_chart'],
    });
    await this.post('onWorldRecord', {
      title: '🏆 [teste] NOVO RECORDE MUNDIAL',
      message: 'Fulano — 1720m\nanterior: 1654m (Thomas)\nSão Paulo (SP) · BR',
      tags: ['trophy'],
      priority: 4,
    });

    cfg.quietHours = before;
    console.log('[ntfy] 3 mensagens de teste enviadas para', cfg.topic);
    return true;
  }
}
