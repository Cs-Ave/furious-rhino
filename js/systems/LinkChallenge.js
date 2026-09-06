import { StorageManager } from '../utils/StorageManager.js';
import { ScoreSystem } from './ScoreSystem.js';

// DESAFIO POR LINK (v1.12.4) — o link de aquisição.
//
// A leitura de 05/09 mostrou o gargalo: a retenção melhorou, a ENTRADA secou
// (1 jogador novo por semana). A base é um círculo de conhecidos que parou
// de convidar — e convidar custava explicar. Este módulo faz do convite um
// toque: quem compartilha manda `/?desafio=<m>&de=<nome>`; quem abre vê
// "Fulano correu 1.198 m. Passa?", corre com a marca do amigo fincada na
// pista e, se passar, DEVOLVE o desafio com a própria marca. É o loop
// A → B → A, sem conta, sem servidor.
//
// O que ele NÃO é: a Arena de Desafios (ChallengeSystem), que vive em
// Firestore (`challenges/{id}`), mede PONTOS e tem prazo. Este é URL pura,
// mede METROS e não grava um byte fora do aparelho. Vocabulário separado de
// propósito (🎯/metros aqui, ⚔️/pontos lá) para as duas coisas nunca se
// confundirem na tela.
//
// A URL é entrada hostil. Tudo que vem dela passa por aqui, e só por aqui:
// `m` vira inteiro em 1..10000 ou o desafio não existe; `de` vira um nome de
// 3-12 caracteres de letra/dígito/espaço/_ . - (unicode, NFC) ou cai em
// "um amigo". Quem renderiza usa textContent — nunca innerHTML — e o banner
// nunca é um <a>. Zero Phaser, zero DOM no import: o test-stats importa
// isto no node.
//
// Exige ao menos UM caractere de letra/dígito: "..." e "___" passam no
// conjunto mas não são nome de ninguém.
const NOME_RE = /^(?=.*[\p{L}\p{N}])[\p{L}\p{N} _.\-]{3,12}$/u;

export class LinkChallenge {
  static MAX_M = 10000;
  static NOME_FALLBACK = 'um amigo';

  // ------------------------------------------------------------------ PURAS
  // (sem localStorage, sem URL — o test-stats cobre cada uma no node)

  // NFC antes de medir: "João" decomposto tem 5 code points e o mesmo nome
  // composto tem 4 — o limite de 12 tem de contar o que a pessoa vê.
  static sanitizeNome(raw) {
    const s = String(raw ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
    return NOME_RE.test(s) ? s : '';
  }

  // Só dígitos: "1e3", "1198.7", "-5" e "NaN" não são metros. Acima do teto
  // clampa (um recorde de 99999 vira 10000 — o mundo acaba aos 10000 m).
  static clampMetros(raw) {
    const s = String(raw ?? '').trim();
    if (!/^\d{1,7}$/.test(s)) return 0;
    return Math.min(this.MAX_M, parseInt(s, 10));
  }

  // `search` é o location.search cru ("?desafio=1198&de=Thomas"). Sem metros
  // válidos não há desafio — nem com nome perfeito. Nome inválido não
  // invalida o desafio: vira "um amigo".
  static parseDesafio(search) {
    let p;
    try {
      p = new URLSearchParams(search || '');
    } catch (e) {
      return null;
    }
    const m = this.clampMetros(p.get('desafio'));
    if (!m) return null;
    return { m, de: this.sanitizeNome(p.get('de')) || this.NOME_FALLBACK };
  }

  // O link que sai daqui. `base` sem metros válidos volta intacto (quem não
  // tem recorde ainda compartilha o jogo, não um desafio); nome inválido é
  // omitido (o outro lado lê "um amigo").
  static linkPara(base, m, de) {
    const mm = this.clampMetros(m);
    if (!mm) return base;
    const q = new URLSearchParams();
    q.set('desafio', String(mm));
    const nome = this.sanitizeNome(de);
    if (nome) q.set('de', nome);
    return `${base}${base.includes('?') ? '&' : '?'}${q.toString()}`;
  }

  static textoBanner({ m, de }) {
    return `${de} correu ${ScoreSystem.fmtNum(m)} m. Passa?`;
  }

  // Mensagem de quem PASSOU a marca e devolve o desafio. `de` é quem mandou
  // o link; `meuM` é a marca de quem responde.
  static textoDevolver({ de, meuM }) {
    const quem = de && de !== this.NOME_FALLBACK ? `${de}, passei` : 'Passei';
    return `🦏 ${quem} a sua marca: ${ScoreSystem.fmtNum(meuM)} m no FURIOUS RHINO. Devolvo o desafio — passa?`;
  }

  // ------------------------------------------------------------ COM EFEITO

  // Lê a URL UMA vez no boot, guarda o desafio e APAGA `desafio`/`de` da
  // barra de endereço (só esses dois: `?debug=1` e `?ntfy=` sobrevivem).
  // Sem o replaceState, o `location.reload()` do JOGAR DE NOVO re-semearia
  // o mesmo desafio a cada reinício — inclusive depois de batido.
  // Devolve o que leu (ou null); nada aqui lança: URL é acessório.
  static consumeUrl() {
    let lido = null;
    try {
      const loc = globalThis.location;
      if (!loc) return null;
      lido = this.parseDesafio(loc.search);
      if (lido) StorageManager.setDesafio(lido);
      const q = new URLSearchParams(loc.search);
      if (q.has('desafio') || q.has('de')) {
        q.delete('desafio');
        q.delete('de');
        const resto = q.toString();
        const url = `${loc.pathname}${resto ? `?${resto}` : ''}${loc.hash || ''}`;
        const h = globalThis.history;
        if (h && typeof h.replaceState === 'function') h.replaceState(h.state, '', url);
      }
    } catch (e) { /* URL inválida ou history bloqueado: sem desafio, sem drama */ }
    return lido;
  }

  // O desafio vigente, já REVALIDADO: o storage garante a forma e a
  // validade (7 dias); aqui o conteúdo passa pelos mesmos filtros da URL —
  // localStorage editado à mão não injeta nome nem metros.
  static ativo() {
    const d = StorageManager.getDesafio();
    if (!d) return null;
    const m = this.clampMetros(d.m);
    if (!m) return null;
    return { m, de: this.sanitizeNome(d.de) || this.NOME_FALLBACK, at: d.at };
  }

  static limpar() {
    StorageManager.clearDesafio();
  }
}
