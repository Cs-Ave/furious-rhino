import { Constants } from '../utils/Constants.js';
import { StorageManager } from '../utils/StorageManager.js';
import { LeaderboardSystem, getDb } from './LeaderboardSystem.js';

// Telemetria anônima: espelha os TOTAIS locais em 1 doc stats/{playerId}
// a cada fim de corrida. Mesmo contrato de silêncio do LeaderboardSystem —
// nenhum erro propaga; offline/adblock/rules rejeitando = jogo segue normal.
// v1.6.1: 30 dias deixavam quem viajou com a cidade velha por um mês. 12h dá
// no máximo 1 requisição por sessão longa, e ela roda na tela inicial (o fim
// de corrida sempre acerta o cache).
const GEO_TTL_OK_MS = 12 * 3600 * 1000; // sucesso: revalida em 12h
const GEO_TTL_FAIL_MS = 6 * 3600 * 1000; //  falha: tenta de novo em 6h

// Provedores de geo por IP sem chave e com CORS aberto, em ordem.
// O IP é usado pelo provedor para responder e NUNCA é armazenado.
const GEO_PROVIDERS = ['https://get.geojs.io/v1/ip/geo.json', 'https://ipwho.is/'];

export class StatsSystem {
  // País/região/cidade aproximados, cacheados em localStorage.
  // Ambos os provedores devolvem `country` = nome COMPLETO ("Brazil");
  // as rules aceitam só o código (≤3 chars) — normalizar é obrigatório.
  // `fetchedAt` = última TENTATIVA (governa o backoff); `measuredAt` = quando
  // a cidade foi de fato resolvida (governa a idade mostrada no painel). Numa
  // entrada antiga, sem `measuredAt`, um vale pelo outro.
  static async getGeo() {
    const cached = StorageManager.getGeo();
    const now = Date.now();
    const ttl = (cached && cached.ok && !cached.stale) ? GEO_TTL_OK_MS : GEO_TTL_FAIL_MS;
    if (cached && cached.fetchedAt && now - cached.fetchedAt < ttl) {
      return cached.ok ? cached : null;
    }

    for (const url of GEO_PROVIDERS) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) continue;
        const data = await res.json();
        const country = String(data.country_code || '').slice(0, 3);
        if (!country) continue;
        const geo = {
          ok: true,
          country,
          region: String(data.region || '').slice(0, 40),
          city: String(data.city || '').slice(0, 40),
          fetchedAt: now,
          measuredAt: now,
        };
        StorageManager.setGeo(geo);
        return geo;
      } catch (e) { /* timeout/bloqueado — tenta o próximo provedor */ }
    }

    // Revalidação falhou. Se havia uma localização boa, ela CONTINUA valendo:
    // devolver null aqui APAGAVA o campo `geo` do documento inteiro, porque o
    // setDoc do send() é destrutivo (sem merge). Só `fetchedAt` anda, para o
    // backoff funcionar — a cidade e a idade dela ficam.
    if (cached && cached.ok && cached.country) {
      const stale = {
        ...cached,
        stale: true,
        measuredAt: cached.measuredAt || cached.fetchedAt || now,
        fetchedAt: now,
      };
      StorageManager.setGeo(stale);
      return stale;
    }

    StorageManager.setGeo({ ok: false, fetchedAt: now });
    return null;
  }

  // Revalidação disparada na tela inicial (fire-and-forget). Tira a rede do
  // caminho do fim de corrida: quando o send() roda, o cache já está quente.
  static refreshGeo() {
    return this.getGeo().catch(() => null);
  }

  // Perfil do aparelho, derivado na hora do envio (sem rede, sem storage).
  // Best-effort: UA parsing envelhece — campos ausentes são simplesmente
  // omitidos do doc (as rules os tratam como opcionais).
  static async buildDeviceInfo() {
    const ua = navigator.userAgent || '';
    const info = { gameVersion: Constants.VERSION };
    let m;

    // iPad moderno finge macOS no UA; o toque o entrega
    const iPad = /iPad/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    info.device = iPad || /Tablet/i.test(ua) ? 'tablet'
      : /Mobi|iPhone|Android/i.test(ua) ? 'mobile' : 'desktop';

    if ((m = ua.match(/iPhone OS (\d+[_.\d]*)/)) || (m = ua.match(/CPU OS (\d+[_.\d]*)/))) {
      info.os = 'iOS';
      info.osVersion = m[1].replace(/_/g, '.');
    } else if (iPad) {
      info.os = 'iPadOS';
      if ((m = ua.match(/Version\/([\d.]+)/))) info.osVersion = m[1];
    } else if ((m = ua.match(/Android ([\d.]+)/))) {
      info.os = 'Android';
      info.osVersion = m[1];
    } else if ((m = ua.match(/Windows NT ([\d.]+)/))) {
      info.os = 'Windows';
      info.osVersion = { '10.0': '10/11', '6.3': '8.1', '6.1': '7' }[m[1]] || m[1];
    } else if ((m = ua.match(/Mac OS X (\d+[_.\d]*)/))) {
      info.os = 'macOS';
      info.osVersion = m[1].replace(/_/g, '.');
    } else if (/Linux/.test(ua)) {
      info.os = 'Linux';
    }

    if ((m = ua.match(/Edg\/([\d.]+)/))) info.browser = 'Edge';
    else if ((m = ua.match(/SamsungBrowser\/([\d.]+)/))) info.browser = 'Samsung';
    else if ((m = ua.match(/OPR\/([\d.]+)/))) info.browser = 'Opera';
    else if ((m = ua.match(/Firefox\/([\d.]+)/))) info.browser = 'Firefox';
    else if ((m = ua.match(/Chrome\/([\d.]+)/))) info.browser = 'Chrome';
    else if (/Safari\//.test(ua) && (m = ua.match(/Version\/([\d.]+)/))) info.browser = 'Safari';
    if (info.browser && m) info.browserVersion = m[1].split('.')[0];

    // Chromium: o UA congelou (Android sempre "10", Windows sempre "10");
    // userAgentData dá a versão real e o modelo do aparelho Android.
    // Modelo de iPhone não existe em lugar nenhum — limitação do Safari.
    try {
      if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        const h = await navigator.userAgentData.getHighEntropyValues(['platformVersion', 'model']);
        if (h.platformVersion) {
          if (info.os === 'Windows') {
            info.osVersion = parseInt(h.platformVersion, 10) >= 13 ? '11' : '10';
          } else if (info.os === 'Android') {
            info.osVersion = h.platformVersion.split('.')[0];
          }
        }
        if (h.model) info.model = String(h.model).slice(0, 24);
      }
    } catch (e) { /* sem refinamento — o parse do UA fica valendo */ }

    const dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100;
    info.screen = `${screen.width}x${screen.height}@${dpr}`.slice(0, 20);
    info.lang = String(navigator.language || '').slice(0, 12);
    // Fuso do aparelho (v1.6.1): não custa rede e nunca erra. Serve de
    // conferência cruzada do geo por IP — VPN aparece como divergência
    // entre `tz` e `geo.country`.
    try {
      info.tz = String(Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 40);
    } catch (e) { /* ambiente sem Intl completo — campo simplesmente não vai */ }

    return info;
  }

  // Assinatura curta do aparelho e do local — chaves dos contadores de
  // `history` (o painel mostra exatamente estas strings)
  static clientSignature(device) {
    const os = [device.os, device.osVersion].filter(Boolean).join(' ');
    return [device.device, os, device.browser].filter(Boolean).join(' · ').slice(0, 60);
  }

  static geoLabel(geo) {
    if (!geo || !geo.country) return '';
    const place = geo.city ? (geo.region ? `${geo.city} (${geo.region})` : geo.city) : '';
    return (place ? `${place} · ${geo.country}` : geo.country).slice(0, 60);
  }

  // Chamada UMA vez por corrida encerrada (o `send` roda várias vezes por
  // sessão — acumular nele inflaria os contadores). Sem rede própria: o geo
  // vem do cache de 30 dias.
  static async recordRun(meters = 0) {
    try {
      const [geo, device] = await Promise.all([this.getGeo(), this.buildDeviceInfo()]);
      StorageManager.addHistory({
        clientSig: this.clientSignature(device),
        geoLabel: this.geoLabel(geo),
        version: Constants.VERSION,
        meters, // alimenta o `b` (melhor marca) do dia em history.days
      });
      return true;
    } catch (e) {
      return false; // histórico é acessório: nunca atrapalha o fim de corrida
    }
  }

  // 1 write idempotente por fim de corrida com os totais acumulados.
  // Corridas abandonadas entram no envio seguinte (os totais capturam tudo).
  static async send() {
    if (!LeaderboardSystem.isConfigured()) return false;
    try {
      const [geo, device] = await Promise.all([this.getGeo(), this.buildDeviceInfo()]);
      const { fs, db } = await getDb();

      // Estrutura ANINHADA (deaths/client/geo como mapas): campos soltos
      // demais estouram o orçamento de avaliação das rules do Firestore e
      // o write é negado — ver comentário em firestore.rules
      const data = {
        attempts: StorageManager.getAttempts(),
        playTimeS: StorageManager.getPlayTimeS(),
        wins: StorageManager.getWins(),
        bestM: Math.min(StorageManager.getRecord(), 10000),
        deaths: StorageManager.getDeaths(), // {t1..t6, wall..tower..fall}
        runs: StorageManager.getRuns(), // últimas 50 execuções {t, m}
        // Histórico acumulado (v1.5.0): aparelhos, locais e versões que este
        // jogador já usou + primeiro acesso. UM mapa por causa do orçamento
        // de avaliação das rules — ver comentário em firestore.rules
        history: StorageManager.getHistory(),
        standalone: Boolean(
          window.matchMedia('(display-mode: standalone)').matches ||
          window.matchMedia('(display-mode: fullscreen)').matches ||
          navigator.standalone === true
        ),
        gameVersion: Constants.VERSION,
        updatedAt: fs.serverTimestamp(),
      };

      // Strings opcionais só entram não-vazias (`undefined` faria o setDoc
      // lançar antes mesmo da rede); mapas vazios ficam de fora
      // 9 chaves de 10 permitidas pelas rules (client.size() <= 10)
      const client = {};
      for (const [key, value] of Object.entries({
        device: device.device, os: device.os, osVersion: device.osVersion,
        browser: device.browser, browserVersion: device.browserVersion,
        model: device.model, screen: device.screen, lang: device.lang,
        tz: device.tz,
      })) {
        if (typeof value === 'string' && value) client[key] = value;
      }
      if (Object.keys(client).length) data.client = client;

      // 4 chaves de 4. `at` (epoch da medição) é o que deixa o painel dizer a
      // IDADE da localização em vez de mostrar uma cidade de idade desconhecida
      if (geo && geo.country) {
        data.geo = { country: geo.country };
        if (geo.region) data.geo.region = geo.region;
        if (geo.city) data.geo.city = geo.city;
        const at = geo.measuredAt || geo.fetchedAt;
        if (at) data.geo.at = Math.floor(at / 1000);
      }

      const playerId = StorageManager.getOrCreatePlayerId();
      await fs.setDoc(fs.doc(db, 'stats', playerId), data);
      return true;
    } catch (e) {
      return false; // offline ou regra rejeitou — tenta na próxima corrida
    }
  }
}
