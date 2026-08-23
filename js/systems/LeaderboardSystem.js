import { firebaseConfig } from '../firebase-config.js';
import { Constants } from '../utils/Constants.js';
import { StorageManager } from '../utils/StorageManager.js';
import { SkinSystem } from './SkinSystem.js';
import { ScoreSystem } from './ScoreSystem.js';

// Placar online global (Firebase Firestore). Todo o Firebase vive aqui,
// carregado por import dinâmico SÓ quando o jogador abre o ranking ou
// envia um score — zero custo no load do jogo e zero quebra offline.
// Nenhum método propaga erro de rede: falhou, o jogo segue normal.
const SDK = 'https://www.gstatic.com/firebasejs/12.16.0';
// v1.8.4: `score` deixou de ser metros e passou a ser o TOTAL (metros +
// bônus), então o teto subiu de 10000 para 20000 — mesmo número das
// firestore.rules (`score is int && score >= 1 && score <= 20000`) e do
// Constants.SCORE_MAX_TOTAL. Os METROS continuam limitados a 10000: são o
// fim FÍSICO do mundo (WORLD_END_PX 400000 / PIXELS_PER_METER 40), e nenhum
// bônus pode empurrar essa grandeza. Dois campos, dois tetos.
const MAX_SCORE = 20000; // teto do TOTAL (score) — igual às rules
const MAX_M = 10000;     // teto dos METROS (scoreM) — fim físico do mundo

// v1.9.1: zona CEGA do filtro de plausibilidade (ver isPlausible). Corrida
// curta NUNCA é julgada: o playTime viaja em segundos INTEIROS, e o
// arredondamento infla a média o suficiente para condenar um inocente.
const SANITY_MIN_S = 2;    // <= 2s gravados: não se julga (ver a conta abaixo)
const SANITY_MIN_M = 300;  // < 300m: não se julga (ver a conta abaixo)

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

  // v1.8.4: recebe o TOTAL em pontos, não os metros. getBestSent() também é
  // o total (ver StorageManager) — total × total, mesma unidade dos dois
  // lados. Enviar só quando MELHORA o total é o que casa com a regra do
  // servidor, que compara o campo `score` do doc.
  // v1.9.1: `meters`/`seconds` são OPCIONAIS e só existem para adiantar o
  // veredito de isPlausible (o submit checa de novo, é ele a linha de
  // defesa). Com os defaults 0 o comportamento é EXATAMENTE o de antes:
  // meters 0 cai na regra "nada a barrar" e isPlausible devolve true.
  static shouldSubmit(total, meters = 0, seconds = 0) {
    return this.isConfigured() && total >= 1 && total > StorageManager.getBestSent()
      && this.isPlausible(meters, seconds);
  }

  // v1.9.1: ÚLTIMA LINHA DE DEFESA do ranking mundial. Puro e testável no
  // node: devolve false só quando a velocidade média da corrida é
  // fisicamente impossível (> Constants.RUN_SANITY_MAX_MPS = 40 m/s).
  //
  // Motivo: na v1.9.0, 26 das 85 corridas que chegaram ao ranking tinham
  // média impossível — até 217 m/s —, todas cravando o teto de 20.000 pts /
  // 10.000 m e envenenando o pódio. Em ~820 corridas das versões anteriores,
  // ZERO. O bug ainda não foi localizado e quem foi afetado é jogador
  // legítimo: por isso a função é DELIBERADAMENTE frouxa. A regra da casa
  // aqui é uma só — NA DÚVIDA, ACEITA. Barrar um inocente é pior do que
  // deixar passar uma marca suja, que a gente ainda consegue limpar depois.
  static isPlausible(meters, seconds) {
    const s = Number(seconds);
    const m = Number(meters);
    // Sem tempo confiável não há o que julgar (ausente, 0, negativo, NaN,
    // Infinity, string boba). É também o caminho da RETROCOMPATIBILIDADE:
    // quem chama submit() sem o parâmetro novo cai aqui e passa.
    if (!Number.isFinite(s) || s <= 0) return true;
    // Sem distância não há média nenhuma para condenar.
    if (!Number.isFinite(m) || m <= 0) return true;

    // ------------------------------------------------ a zona cega e a conta
    // O playTime é gravado em segundos INTEIROS: uma corrida de 1,4s vira
    // "1s" e a média sai inflada em até (s+1)/s. Em s=1 isso é 2× (t pode
    // chegar perto de 2s); em s=2, 1,5×. Se um desses fosse julgado, uma
    // corrida real a 20 m/s (já acima do observado, mas abaixo do teto
    // físico de 35,16) apareceria como 40 e seria barrada — inocente preso.
    //
    // Por que 300m e não 200m: o filtro só pode disparar quando a média
    // MEDIDA passa de 40, ou seja s < m/40. A velocidade REAL mínima capaz
    // de disparar o filtro é m/(s+1) (pior caso do arredondamento):
    //   limiar 200m → mínimo em s=5, m=201: 200/6 = 33,3 m/s
    //                 (ABAIXO do teto físico de 35,16 — janela de erro)
    //   limiar 300m → mínimo em s=8, m=321: 320/9 = 35,6 m/s
    //                 (ACIMA do teto físico — impossível por construção)
    // Com 300m, toda corrida barrada teria de ter sustentado mais que o teto
    // absoluto do jogo, mesmo com o arredondamento jogando contra ela. E o
    // que a zona cega deixa passar é inofensivo: as corridas do bug bateram
    // nos 10.000m, e nada abaixo de 300m chega perto do pódio.
    if (m < SANITY_MIN_M || s <= SANITY_MIN_S) return true;

    return m / s <= Constants.RUN_SANITY_MAX_MPS;
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
  //
  // v1.8.4: dois números viajam. `score` = TOTAL (o que ordena o ranking) e
  // `scoreM` = METROS da mesma corrida (o que planta a estaca na pista e
  // alimenta os textos "· 987 m"). Doc antigo não tem `scoreM` e continua
  // válido: para ele total == metros, e a leitura universal
  // (ScoreSystem.metersOf) resolve com `scoreM ?? score`. Nada é migrado.
  //
  // v1.9.1: entra `seconds` (duração da corrida, o mesmo playTime em segundos
  // inteiros da telemetria) com default 0 — chamador antigo continua válido e
  // com 0 o filtro aceita, como antes. É a guarda contra o bug da v1.9.0
  // (26/85 corridas com média impossível, até 217 m/s, todas no teto).
  static async submit(total, meters, seconds = 0) {
    const name = StorageManager.getPlayerName();
    if (!name) return false;
    if (!StorageManager.allowsRemoteWrite()) return false;
    // Marca impossível não sobe ao ranking mundial. Fica só no aparelho: o
    // bestSent local NÃO é tocado, então quando o bug for corrigido a
    // próxima corrida honesta do jogador ainda consegue subir.
    if (!this.isPlausible(meters, seconds)) return false;
    try {
      const { fs, db } = await getDb();
      const playerId = StorageManager.getOrCreatePlayerId();
      // v1.8.1: a skin EFETIVA no momento da marca — vitrine do pódio
      const skinId = SkinSystem.resolveEquipped().id;
      await fs.setDoc(fs.doc(db, 'scores', playerId), {
        name,
        nameLower: this.nameSlug(name),
        score: Math.min(Math.floor(total), MAX_SCORE),
        // v1.8.4: metros da marca, teto próprio. Cópia local em bestSentM
        // pelo mesmo motivo do scoreAt/skin abaixo (o rename regrava o doc).
        scoreM: Math.min(Math.floor(meters), MAX_M),
        // v1.8: quando ESTA marca foi atingida — o "há X dias" do top 10.
        // Cópia local em bestSentAt para o rename preservar o valor (setDoc
        // sem merge apagaria o campo); mesma dança para a skin.
        scoreAt: fs.serverTimestamp(),
        skin: skinId,
        updatedAt: fs.serverTimestamp(),
      });
      StorageManager.setBestSent(total);
      StorageManager.setBestSentM(meters);
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
      // v1.8.4: os METROS entram na mesma dança. `best` acima é o TOTAL
      // (getBestSent), e sem reinjetar o scoreM a troca de apelido apagaria
      // os metros da marca — o doc viraria "total sem metros" e a leitura
      // cairia no fallback `scoreM ?? score`, plantando a estaca do rival na
      // posição do TOTAL (adiante do metro onde ele realmente morreu).
      const bestM = StorageManager.getBestSentM();
      await fs.setDoc(fs.doc(db, 'scores', playerId), {
        name,
        nameLower: this.nameSlug(name),
        score: Math.min(Math.floor(best), MAX_SCORE),
        ...(bestM ? { scoreM: Math.min(Math.floor(bestM), MAX_M) } : {}),
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
  // v1.8.3: o SDK firestore-LITE exporta a agregação como `getCount` —
  // `getCountFromServer` é só do SDK completo. A chamada errada fazia
  // fetchMyRank/anonymousName falharem EM SILÊNCIO (catch por design) desde
  // sempre em produção: last_rank nunca chegava e as skins de pódio nunca
  // desbloqueavam para jogadores reais (descoberto quando o Thomas, #3 de
  // verdade, não conseguiu vestir a MecaBronze). O fallback duplo protege
  // contra o SDK renomear de novo.
  static countQuery(fs, q) {
    return (fs.getCount || fs.getCountFromServer)(q);
  }

  static async anonymousName() {
    try {
      const { fs, db } = await getDb();
      const snap = await this.countQuery(fs, fs.collection(db, 'scores'));
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
      // ⚠️ v1.8.4: getBestSent() é o TOTAL, e o campo `score` do servidor
      // também — a comparação abaixo continua homogênea SEM mudar de linha.
      // Trocar por metros aqui devolveria "rivais" que na verdade estão
      // atrás no ranking (foi essa classe de erro silencioso que derrubou o
      // last_rank e as skins de pódio na v1.8.3).
      const best = StorageManager.getBestSent();

      const [topSnap, rivalSnap] = await Promise.all([
        fs.getDocs(fs.query(scores, fs.orderBy('score', 'desc'), fs.limit(2))),
        best > 0
          ? fs.getDocs(fs.query(scores, fs.where('score', '>', best), fs.orderBy('score', 'asc'), fs.limit(2)))
          : Promise.resolve({ docs: [] }),
      ]);

      // limit(2) nas duas: o primeiro resultado pode ser o próprio jogador
      // v1.8.4: `score` (total) E `m` (metros) viajam juntos. Quem provoca
      // é o total — é o número que aparece na placa e o que o jogador
      // precisa bater; ONDE a estaca é fincada é o metro. Confundir os dois
      // plantaria a marca do rival adiante do ponto em que ele morreu.
      const pick = (snap) => {
        for (const d of snap.docs) {
          if (d.id === myId) continue;
          const data = d.data();
          return {
            name: String(data.name || '???'),
            score: Number(data.score) || 0,
            m: Number(ScoreSystem.metersOf(data)) || 0,
          };
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
  //
  // ⚠️ v1.8.4: a comparação é TOTAL contra TOTAL — `score` no servidor,
  // getBestSent() aqui. Não trocar por metros: o rank alimenta o
  // last_rank, e o SkinSystem.resolveEquipped lê o last_rank para liberar
  // as skins de pódio (ouro/prata/bronze). Um rank errado não dá erro
  // nenhum — só some com a skin do jogador, exatamente o bug da v1.8.3.
  static async fetchMyRank() {
    try {
      const { fs, db } = await getDb();
      const countSnap = await this.countQuery(fs,
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
      // v1.8.4: `score` continua sendo o TOTAL (é ele que ordena a lista);
      // `m` são os metros da marca, resolvidos por scoreM ?? score — docs
      // pré-v1.8.4 não têm scoreM e para eles total == metros.
      m: Number(ScoreSystem.metersOf(data)) || 0,
      sinceMs: ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null,
      // v1.8.1: skin usada na marca (docs antigos: sem campo → rino original)
      skin: typeof data.skin === 'string' ? data.skin : null,
    };
  }

  // Retorna { entries: [{id, name, score, m, sinceMs, skin}], myRank, myBest }
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

      // v1.8.4: myBest é o TOTAL enviado — mesma unidade do `score` das
      // entries, que é o que a lista do 🏆 compara e destaca
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
