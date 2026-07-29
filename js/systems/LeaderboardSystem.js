import { firebaseConfig } from '../firebase-config.js';
import { StorageManager } from '../utils/StorageManager.js';

// Placar online global (Firebase Firestore). Todo o Firebase vive aqui,
// carregado por import dinâmico SÓ quando o jogador abre o ranking ou
// envia um score — zero custo no load do jogo e zero quebra offline.
// Nenhum método propaga erro de rede: falhou, o jogo segue normal.
const SDK = 'https://www.gstatic.com/firebasejs/12.16.0';
const MAX_SCORE = 400; // WIN_DISTANCE_PX 16000 / PIXELS_PER_METER 40

let dbPromise = null;

function getDb() {
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

  // Envia o melhor score do jogador (1 doc por aparelho; o servidor só
  // aceita update se o score for maior). Retorna true em sucesso.
  static async submit(meters) {
    const name = StorageManager.getPlayerName();
    if (!name) return false;
    try {
      const { fs, db } = await getDb();
      const playerId = StorageManager.getOrCreatePlayerId();
      await fs.setDoc(fs.doc(db, 'scores', playerId), {
        name,
        score: Math.min(Math.floor(meters), MAX_SCORE),
        updatedAt: fs.serverTimestamp(),
      });
      StorageManager.setBestSent(meters);
      this.fetchMyRank(); // fire-and-forget: atualiza o cache da posição
      return true;
    } catch (e) {
      return false; // offline ou regra rejeitou — tenta de novo na próxima corrida
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

  // Retorna { entries: [{id, name, score}], myRank, myBest } ou null em falha.
  static async fetchTop10() {
    try {
      const { fs, db } = await getDb();
      const scores = fs.collection(db, 'scores');
      const snap = await fs.getDocs(
        fs.query(scores, fs.orderBy('score', 'desc'), fs.limit(10))
      );
      const entries = snap.docs.map((d) => ({
        id: d.id,
        name: String(d.data().name || '???'),
        score: Number(d.data().score) || 0,
      }));

      const myBest = StorageManager.getBestSent();
      const myRank = myBest > 0 ? await this.fetchMyRank() : null;
      return { entries, myRank, myBest };
    } catch (e) {
      return null;
    }
  }
}
