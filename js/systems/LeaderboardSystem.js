import { firebaseConfig } from '../firebase-config.js';
import { StorageManager } from '../utils/StorageManager.js';
import { SkinSystem } from './SkinSystem.js';

// Placar online global (Firebase Firestore). Todo o Firebase vive aqui,
// carregado por import dinâmico SÓ quando o jogador abre o ranking ou
// envia um score — zero custo no load do jogo e zero quebra offline.
// Nenhum método propaga erro de rede: falhou, o jogo segue normal.
const SDK = 'https://www.gstatic.com/firebasejs/12.16.0';
const MAX_SCORE = 10000; // WORLD_END_PX 400000 / PIXELS_PER_METER 40 (modo infinito)

let dbPromise = null;

// Exportado: StatsSystem e o painel /?stats compartilham a mesma conexão
export function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const [{ initializeApp }, fs] = await Promise.all([
        import(SDK + '/firebase-app.js'),
        import(SDK + '/firebase-firestore-lite.js'),
      ]);
      return { fs, db: fs.getFirestore(initializeApp(firebaseConfig)) };
    })().catch((e) => {
      dbPromise = null; // permite tentar de novo na próxima chamada
      throw e;
    });
  }
  return dbPromise;
}

export class LeaderboardSystem {
  static isConfigured() {
    return Boolean(firebaseConfig.projectId);
  }

  static shouldSubmit(meters) {
    return this.isConfigured() && meters >= 1 && meters > StorageManager.getBestSent();
  }

  // Chave de comparação de apelidos: sem acento, sem caixa, sem espaço
  // duplicado. "Thomas" = "thomas" = "Thómas ". Gravada em `nameLower`
  // para a consulta de duplicidade usar índice de campo único.
  static nameSlug(name) {
    return String(name || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // marcas de acento
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // 'taken' | 'free' | 'unknown'. O 'unknown' (rede caída, regra do
  // servidor, módulo antigo em cache) é DIFERENTE de 'free': o jogo salva
  // o apelido mesmo assim, mas avisa que não deu para conferir — falhar em
  // silêncio faz parecer que o nome estava livre.
  static async checkName(name) {
    const slug = this.nameSlug(name);
    if (!slug) return 'free';
    try {
      const { fs, db } = await getDb();
      const snap = await fs.getDocs(fs.collection(db, 'scores'));
      const myId = StorageManager.getOrCreatePlayerId();
      const taken = snap.docs.some((d) => {
        if (d.id === myId) return false;
        const data = d.data();
        return this.nameSlug(data.nameLower || data.name) === slug;
      });
      return taken ? 'taken' : 'free';
    } catch (e) {
      return 'unknown';
    }
  }

  // true = apelido em uso por OUTRO aparelho. Erro de rede devolve false:
  // ficar offline não pode impedir o jogador de escolher um nome.
  //
  // Varre a coleção e compara pelo SLUG do `name` — e não por uma query em
  // `nameLower` — porque os docs anteriores à v1.5.0 não têm esse campo e
  // ficariam invisíveis (a base real tinha 13 jogadores, nenhum com
  // nameLower, e um "Teco" duplicado). O ranking é pequeno e a checagem só
  // roda quando alguém troca de apelido; se um dia crescer, `nameLower` já
  // está sendo gravado e basta trocar por query indexada.
  //
  // ⚠️ Melhor esforço: sem transação no firestore-lite, e o doc em `scores`
  // só nasce quando o jogador pontua — dois aparelhos podem colidir.
  static async isNameTaken(name) {
    const slug = this.nameSlug(name);
    if (!slug) return false;
    try {
      const { fs, db } = await getDb();
      const snap = await fs.getDocs(fs.collection(db, 'scores'));
      const myId = StorageManager.getOrCreatePlayerId();
      return snap.docs.some((d) => {
        if (d.id === myId) return false;
        const data = d.data();
        return this.nameSlug(data.nameLower || data.name) === slug;
      });
    } catch (e) {
      return false;
    }
  }

  // Envia o melhor score do jogador (1 doc por aparelho; o servidor só
  // aceita update se o score for maior ou igual). Retorna true em sucesso.
  static async submit(meters) {
    const name = StorageManager.getPlayerName();
    if (!name) return false;
    if (!StorageManager.allowsRemoteWrite()) return false;
    try {
      const { fs, db } = await getDb();
      const playerId = StorageManager.getOrCreatePlayerId();
      // v1.8.1: a skin EFETIVA no momento da marca — vitrine do pódio
      const skinId = SkinSystem.resolveEquipped().id;
      await fs.setDoc(fs.doc(db, 'scores', playerId), {
        name,
        nameLower: this.nameSlug(name),
        score: Math.min(Math.floor(meters), MAX_SCORE),
        // v1.8: quando ESTA marca foi atingida — o "há X dias" do top 10.
        // Cópia local em bestSentAt para o rename preservar o valor (setDoc
        // sem merge apagaria o campo); mesma dança para a skin.
        scoreAt: fs.serverTimestamp(),
        skin: skinId,
        updatedAt: fs.serverTimestamp(),
      });
      StorageManager.setBestSent(meters);
      StorageManager.setBestSentAt(Date.now());
      StorageManager.setBestSentSkin(skinId);
      this.fetchPodium(true); // fire-and-forget: o pódio pode ter mudado
      this.fetchMyRank(); // fire-and-forget: atualiza o cache da posição
      return true;
    } catch (e) {
      return false; // offline ou regra rejeitou — tenta de novo na próxima corrida
    }
  }

  // Troca o apelido de quem JÁ está no ranking, mantendo o score (as rules
  // aceitam update com score igual). O slug antigo deixa de existir na
  // coleção — é assim que o nome anterior fica livre para outra pessoa.
  static async rename(name) {
    const best = StorageManager.getBestSent();
    if (!name || best < 1) return false;
    if (!StorageManager.allowsRemoteWrite()) return false;
    try {
      const { fs, db } = await getDb();
      const playerId = StorageManager.getOrCreatePlayerId();
      // Preserva scoreAt e skin da marca (a troca de apelido não pode
      // reiniciar o "há X dias" nem trocar a vitrine do pódio). Sem cópia
      // local (marca pré-v1.8), os campos ficam de fora e a leitura cai nos
      // fallbacks — consistente com docs velhos.
      const bestAt = StorageManager.getBestSentAt();
      const bestSkin = StorageManager.getBestSentSkin();
      await fs.setDoc(fs.doc(db, 'scores', playerId), {
        name,
        nameLower: this.nameSlug(name),
        score: Math.min(Math.floor(best), MAX_SCORE),
        ...(bestAt ? { scoreAt: fs.Timestamp.fromMillis(bestAt) } : {}),
        ...(bestSkin ? { skin: bestSkin } : {}),
        updatedAt: fs.serverTimestamp(),
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  // Nome automático para quem prefere não se identificar: Anonimo_N, com
  // N = total de jogadores no ranking + 1 (sem transação no firestore-lite —
  // colisão rara de N é aceitável). Offline: sufixo aleatório de 4 dígitos.
  // 'Anonimo_9999' = 12 chars = teto do name nas rules; acima, encurta.
  static async anonymousName() {
    try {
      const { fs, db } = await getDb();
      const snap = await fs.getCountFromServer(fs.collection(db, 'scores'));
      const n = snap.data().count + 1;
      return n <= 9999 ? `Anonimo_${n}` : `Anon_${n}`;
    } catch (e) {
      return `Anonimo_${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }

  // Quem provocar na pista: o LÍDER do mundo e o RIVAL imediatamente acima de
  // você no ranking. Duas leituras de 1 doc cada, disparadas fire-and-forget
  // na tela inicial; o resultado fica em localStorage e é ele que a corrida
  // lê. Offline ou com o Firestore fora do ar, simplesmente aparecem menos
  // marcas — ranking é acessório e nunca derruba o jogo.
  //
  // A consulta do rival usa where + orderBy no MESMO campo (`score`), o que
  // não exige índice composto no Firestore.
  static async fetchRivals() {
    try {
      const { fs, db } = await getDb();
      const scores = fs.collection(db, 'scores');
      const myId = StorageManager.getOrCreatePlayerId();
      const best = StorageManager.getBestSent();

      const [topSnap, rivalSnap] = await Promise.all([
        fs.getDocs(fs.query(scores, fs.orderBy('score', 'desc'), fs.limit(2))),
        best > 0
          ? fs.getDocs(fs.query(scores, fs.where('score', '>', best), fs.orderBy('score', 'asc'), fs.limit(2)))
          : Promise.resolve({ docs: [] }),
      ]);

      // limit(2) nas duas: o primeiro resultado pode ser o próprio jogador
      const pick = (snap) => {
        for (const d of snap.docs) {
          if (d.id === myId) continue;
          return { name: String(d.data().name || '???'), score: Number(d.data().score) || 0 };
        }
        return null;
      };

      const data = { leader: pick(topSnap), rival: pick(rivalSnap), at: Date.now() };
      // Você é o líder: não há ninguém acima, e a marca 👑 seria a sua própria
      if (data.leader && data.rival && data.rival.score >= data.leader.score) data.rival = null;
      StorageManager.setRivals(data);
      return data;
    } catch (e) {
      return null; // rede/regra: a corrida segue com as marcas que já tinha
    }
  }

  // Posição = quantos scores maiores + 1 (1 leitura agregada). Cacheia em
  // localStorage para a tela de início mostrar sem custo de rede.
  static async fetchMyRank() {
    try {
      const { fs, db } = await getDb();
      const countSnap = await fs.getCountFromServer(
        fs.query(fs.collection(db, 'scores'), fs.where('score', '>', StorageManager.getBestSent()))
      );
      const rank = countSnap.data().count + 1;
      StorageManager.setLastRank(rank);
      return rank;
    } catch (e) {
      return null; // sem posição exata — o ranking mostra só o melhor score
    }
  }

  // Decodifica um doc de scores no formato das entries da UI
  static entryFromDoc(d) {
    const data = d.data();
    const ts = data.scoreAt || data.updatedAt;
    return {
      id: d.id,
      name: String(data.name || '???'),
      score: Number(data.score) || 0,
      sinceMs: ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null,
      // v1.8.1: skin usada na marca (docs antigos: sem campo → rino original)
      skin: typeof data.skin === 'string' ? data.skin : null,
    };
  }

  // Retorna { entries: [{id, name, score, sinceMs, skin}], myRank, myBest }
  // ou null em falha. sinceMs = quando a marca foi atingida (scoreAt; docs
  // pré-v1.8 caem no updatedAt) — matéria-prima do holdDays.
  static async fetchTop10() {
    try {
      const { fs, db } = await getDb();
      const scores = fs.collection(db, 'scores');
      const snap = await fs.getDocs(
        fs.query(scores, fs.orderBy('score', 'desc'), fs.limit(10))
      );
      const entries = snap.docs.map((d) => this.entryFromDoc(d));
      // Os 3 primeiros saem de graça daqui — realimenta o cache do pódio
      if (entries.length) StorageManager.setPodium(entries.slice(0, 3));

      const myBest = StorageManager.getBestSent();
      const myRank = myBest > 0 ? await this.fetchMyRank() : null;
      return { entries, myRank, myBest };
    } catch (e) {
      return null;
    }
  }

  // Top 3 para o pódio da tela inicial. Cache com TTL de 6h (3 reads por
  // atualização — plano gratuito agradece); `force` fura o TTL (pós-submit).
  // Devolve as entries (do cache ou da rede) ou null se nunca houve nada.
  static PODIUM_TTL_MS = 6 * 60 * 60 * 1000;

  static async fetchPodium(force = false) {
    const cached = StorageManager.getPodium();
    if (!force && cached && Date.now() - cached.at < this.PODIUM_TTL_MS) {
      return cached.entries;
    }
    try {
      const { fs, db } = await getDb();
      const snap = await fs.getDocs(
        fs.query(fs.collection(db, 'scores'), fs.orderBy('score', 'desc'), fs.limit(3))
      );
      const entries = snap.docs.map((d) => this.entryFromDoc(d));
      StorageManager.setPodium(entries);
      return entries;
    } catch (e) {
      return cached ? cached.entries : null; // offline: o cache velho vale
    }
  }

  // "Há quantos dias": duas leituras, cada uma no seu lugar (decisão do dono):
  // — padrão (lista do 🏆): idade da PRÓPRIA marca de cada um;
  // — { cascade: true } (pódio da tela inicial): posse da POSIÇÃO — começa
  //   no mais recente entre a própria marca e as marcas de quem está acima
  //   (alguém te ultrapassa → teu contador reinicia na data da ultrapassagem).
  // Puro e testável no node. Dias em data LOCAL (mesmo recorte do
  // StorageManager.dayKey); entrada sem timestamp devolve null (e no modo
  // cascata não propaga para os de baixo).
  static holdDays(entries, nowMs = Date.now(), { cascade = false } = {}) {
    const dayStart = (ms) => new Date(new Date(ms).setHours(0, 0, 0, 0)).getTime();
    const today = dayStart(nowMs);
    let latestAbove = -Infinity;
    return entries.map((e) => {
      if (!e.sinceMs) return null;
      const heldSince = cascade ? Math.max(e.sinceMs, latestAbove) : e.sinceMs;
      latestAbove = Math.max(latestAbove, e.sinceMs);
      return Math.max(0, Math.round((today - dayStart(heldSince)) / 86400000));
    });
  }
}
