export class StorageManager {
  // ------------------------------------------------- as DUAS naturezas de recorde
  // v1.8.4: a pontuação virou COMPOSTA (metros + bônus por façanha), e desde
  // então o jogo guarda duas marcas que NÃO se substituem:
  //
  //   `record`     = METROS. É a façanha FÍSICA — "até onde eu cheguei". É ela
  //                  que decide medalha, desbloqueio de skin, o degrau do
  //                  portão dos 1000m e a posição das estacas na pista (uma
  //                  estaca só faz sentido plantada no metro onde o rival
  //                  morreu). Nunca pode ser trocada por pontos.
  //   `record_pts` = PONTOS (metros + bônus). É a COMPETIÇÃO — o número que o
  //                  ranking ordena e que o jogador compara com os outros.
  //
  // As duas convivem: um jogador pode cravar recorde de pontos sem bater o de
  // metros (lutou melhor no mesmo trecho) e vice-versa. Chave nova, zero
  // migração — quem só tem `record` continua com os metros intactos.
  static RECORD_KEY = 'furious_rhino_record';

  static getRecord() {
    const stored = localStorage.getItem(this.RECORD_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static saveRecord(meters) {
    const current = this.getRecord();
    const newRecord = Math.max(current, meters);
    localStorage.setItem(this.RECORD_KEY, newRecord.toString());
    return newRecord;
  }

  static isNewRecord(meters) {
    return meters > this.getRecord();
  }

  // v1.8.4: recorde em PONTOS (total = metros + bônus). Espelha exatamente a
  // API do recorde de metros acima — quem já lia getRecord()/isNewRecord()
  // não muda de forma, só de unidade. Aparelho antigo: chave ausente = 0, e a
  // primeira corrida da v1.8.4 já a cria com o total daquela corrida (nada é
  // convertido nem inferido a partir de `record`, que é outra grandeza).
  static RECORD_PTS_KEY = 'furious_rhino_record_pts';

  // Fallback para o recorde em METROS quando a chave nova ainda não existe:
  // quem já jogava antes da v1.8.4 tem `record` e nenhum `record_pts`, e
  // naquela era o total ERA os metros — devolver 0 faria o jogo tratar um
  // veterano como estreante no primeiro boot (a provocação do pódio pedia a
  // marca inteira do bronze em vez da diferença). Mesma ideia do
  // getBestSentM(), na direção contrária.
  static getRecordPts() {
    const stored = localStorage.getItem(this.RECORD_PTS_KEY);
    if (stored) return parseInt(stored, 10);
    return this.getRecord();
  }

  static saveRecordPts(total) {
    const current = this.getRecordPts();
    const newRecord = Math.max(current, Math.floor(total) || 0);
    localStorage.setItem(this.RECORD_PTS_KEY, newRecord.toString());
    return newRecord;
  }

  static isNewRecordPts(total) {
    return total > this.getRecordPts();
  }

  static MUTE_KEY = 'furious_rhino_muted';

  static getMuted() {
    return localStorage.getItem(this.MUTE_KEY) === '1';
  }

  static setMuted(muted) {
    localStorage.setItem(this.MUTE_KEY, muted ? '1' : '0');
  }

  // --- Identidade do placar online (sem login: id aleatório por aparelho) ---
  static PLAYER_ID_KEY = 'furious_rhino_player_id';
  static PLAYER_NAME_KEY = 'furious_rhino_player_name';
  static BEST_SENT_KEY = 'furious_rhino_best_sent';
  static ALLOW_LOCAL_WRITE_KEY = 'furious_rhino_allow_local_write';

  static getOrCreatePlayerId() {
    let id = localStorage.getItem(this.PLAYER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(this.PLAYER_ID_KEY, id);
    }
    return id;
  }

  // Localhost/IP de rede local = ambiente de teste/desenvolvimento — nunca é
  // um jogador de verdade (o jogo só é servido publicamente pelo GitHub
  // Pages). Existe para fechar o vazamento que já aconteceu duas vezes: um
  // contexto de teste sem playerId de sonda mina um UUID real e polui a
  // telemetria de produção.
  //
  // v1.9.6: `?debug=1` entra na MESMA categoria, e por um caso real. O painel
  // de tuning é público — basta o parâmetro na URL — e traz o botão "Pular p/
  // 50 m antes" de cada arena e o modo invencível. Em 25-26/08 um jogador de
  // produção passou do portão três vezes com ZERO camadas e essas marcas
  // subiram ao ranking mundial, porque o allowsRemoteWrite só olhava o
  // hostname. Ferramenta de desenvolvimento não pode escrever no placar de
  // todo mundo — e o opt-in para quando o dono precisa de verdade já existe
  // ("📡 Escrita local" no próprio painel), então nada de fluxo novo.
  static isLocalEnv() {
    try {
      if (new URLSearchParams(location.search).get('debug') === '1') return true;
    } catch (e) { /* sem URL utilizável: cai no teste de hostname abaixo */ }
    const h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
    return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
  }

  // Fora do ambiente local, sempre permite. Dentro dele, só escreve se um
  // teste pedir explicitamente (localStorage semeado ANTES da página
  // carregar, via addInitScript do Playwright) — seguro por padrão: um
  // teste que esquecer de semear qualquer coisa simplesmente não escreve
  // nada, em vez de criar um doc real não rastreado.
  static allowsRemoteWrite() {
    return !this.isLocalEnv() || localStorage.getItem(this.ALLOW_LOCAL_WRITE_KEY) === '1';
  }

  static getPlayerName() {
    return localStorage.getItem(this.PLAYER_NAME_KEY) || '';
  }

  static setPlayerName(name) {
    localStorage.setItem(this.PLAYER_NAME_KEY, name);
  }

  // Último score aceito pelo servidor — evita reenviar scores menores.
  //
  // v1.8.4: passou a significar "melhor TOTAL enviado" (pontos), porque é
  // isso que o campo `score` do doc guarda agora. E migra SOZINHO: até a
  // v1.8.3 o total ERA os metros (bônus zero), então o número já gravado aqui
  // continua sendo o total correto daquele doc. Nenhuma conversão, nenhuma
  // chave apagada — só a unidade do que já estava lá passou a ter nome novo.
  //
  // ⚠️ É esta a marca comparada em shouldSubmit/fetchRivals/fetchMyRank, que
  // conversam com o campo `score` do servidor. Comparar metros com um doc que
  // guarda total quebraria rank, rivais e as skins de pódio em silêncio.
  static getBestSent() {
    const stored = localStorage.getItem(this.BEST_SENT_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static setBestSent(total) {
    localStorage.setItem(this.BEST_SENT_KEY, total.toString());
  }

  // v1.8.4: os METROS da marca acima — cópia local do campo `scoreM` do doc.
  // Mesmo papel do best_sent_at e do best_sent_skin: o rename faz setDoc SEM
  // merge, e sem reinjetar este valor a troca de apelido apagaria os metros
  // da marca (a estaca do rival voltaria a ser plantada na posição errada).
  //
  // O fallback para a chave VELHA é o que dispensa migração: num aparelho
  // pré-v1.8.4 o total gravado era os metros, então best_sent responde a
  // pergunta "quantos metros tinha aquela marca?" com exatidão. Doc antigo
  // sem `scoreM` segue a mesma regra do lado do servidor (score = total = m).
  static BEST_SENT_M_KEY = 'furious_rhino_best_sent_m';

  static getBestSentM() {
    const stored = localStorage.getItem(this.BEST_SENT_M_KEY);
    if (stored !== null) return parseInt(stored, 10) || 0;
    return this.getBestSent();
  }

  static setBestSentM(meters) {
    localStorage.setItem(this.BEST_SENT_M_KEY, Math.floor(meters).toString());
  }

  // v1.8: QUANDO a marca acima foi enviada (ms epoch) — o rename regrava o
  // scoreAt do doc com este valor (setDoc sem merge apagaria o campo e a
  // troca de apelido reiniciaria o "há X dias" do top 10)
  static BEST_SENT_AT_KEY = 'furious_rhino_best_sent_at';

  static getBestSentAt() {
    const stored = localStorage.getItem(this.BEST_SENT_AT_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static setBestSentAt(ms) {
    localStorage.setItem(this.BEST_SENT_AT_KEY, ms.toString());
  }

  // v1.8.1: a SKIN usada quando a marca foi cravada — vitrine do pódio.
  // Mesmo papel do best_sent_at: o rename regrava o campo no doc.
  static BEST_SENT_SKIN_KEY = 'furious_rhino_best_sent_skin';

  static getBestSentSkin() {
    return localStorage.getItem(this.BEST_SENT_SKIN_KEY) || '';
  }

  static setBestSentSkin(id) {
    localStorage.setItem(this.BEST_SENT_SKIN_KEY, String(id));
  }

  // v1.8.1: cache do pódio (top 3) da tela inicial — {at: ms, entries: [...]}.
  // Diferente do rivals, o `at` É lido: TTL de 6h no LeaderboardSystem.
  static PODIUM_KEY = 'furious_rhino_podium';

  static getPodium() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.PODIUM_KEY));
      return raw && Array.isArray(raw.entries) ? raw : null;
    } catch (e) {
      return null;
    }
  }

  static setPodium(entries) {
    localStorage.setItem(this.PODIUM_KEY, JSON.stringify({ at: Date.now(), entries }));
  }

  // --- Medalhas e contadores acumulados (v1.2.1) ---
  static MEDALS_KEY = 'furious_rhino_medals';
  static ANIMALS_TOTAL_KEY = 'furious_rhino_animals_total';
  static LAST_RANK_KEY = 'furious_rhino_last_rank';

  static getMedals() {
    try {
      return JSON.parse(localStorage.getItem(this.MEDALS_KEY)) || [];
    } catch (e) {
      return []; // JSON corrompido — recomeça sem travar o jogo
    }
  }

  static addMedals(ids) {
    const merged = [...new Set([...this.getMedals(), ...ids])];
    localStorage.setItem(this.MEDALS_KEY, JSON.stringify(merged));
  }

  // --- Skins (v1.8.0) ---
  // SKIN_KEY = a escolhida (id); SKINS_KEY = desbloqueios PERMANENTES (só
  // conquistas — as skins de pódio ouro/prata/bronze não entram aqui: o
  // acesso delas é dinâmico, resolvido na leitura contra o last_rank).
  static SKIN_KEY = 'furious_rhino_skin';
  static SKINS_KEY = 'furious_rhino_skins';

  static getSelectedSkin() {
    return localStorage.getItem(this.SKIN_KEY) || 'default';
  }

  static setSelectedSkin(id) {
    localStorage.setItem(this.SKIN_KEY, String(id));
  }

  static getSkins() {
    try {
      const list = JSON.parse(localStorage.getItem(this.SKINS_KEY));
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return []; // JSON corrompido — recomeça sem travar o jogo
    }
  }

  static addSkins(ids) {
    const merged = [...new Set([...this.getSkins(), ...ids])];
    localStorage.setItem(this.SKINS_KEY, JSON.stringify(merged));
  }

  // Total de animais atropelados somando todas as corridas
  static getAnimalsTotal() {
    const stored = localStorage.getItem(this.ANIMALS_TOTAL_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static addAnimalsHit(count) {
    const total = this.getAnimalsTotal() + count;
    localStorage.setItem(this.ANIMALS_TOTAL_KEY, total.toString());
    return total;
  }

  // --- Nome automático (v1.6.0) ---
  // "Ficar anônimo" gravava Anonimo_N como nome DEFINITIVO do aparelho, e
  // como o modal só abria com o nome vazio, o jogo nunca mais perguntava:
  // uma escolha feita na primeira morte valia para sempre. Esta marca deixa
  // o jogo voltar a convidar — nos momentos de orgulho, e nunca bloqueando.
  static NAME_AUTO_KEY = 'furious_rhino_name_is_auto';
  static NAME_ASKED_KEY = 'furious_rhino_name_asked_at';

  static isNameAuto() {
    return localStorage.getItem(this.NAME_AUTO_KEY) === '1';
  }

  static setNameAuto(on) {
    if (on) localStorage.setItem(this.NAME_AUTO_KEY, '1');
    else localStorage.removeItem(this.NAME_AUTO_KEY);
  }

  // Nº da tentativa em que o convite foi feito pela última vez
  static getNameAskedAt() {
    return parseInt(localStorage.getItem(this.NAME_ASKED_KEY), 10) || 0;
  }

  static setNameAskedAt(n) {
    localStorage.setItem(this.NAME_ASKED_KEY, String(n));
  }

  // --- Marcas na pista (v1.6.0) ---
  // Quem está logo acima de você no ranking e quem lidera o mundo, cacheados
  // para as estacas serem plantadas SEM rede no início da corrida. O jogo
  // nunca espera essa consulta: sem cache, aparecem menos marcas.
  static RIVALS_KEY = 'furious_rhino_rivals';

  static getRivals() {
    try {
      const r = JSON.parse(localStorage.getItem(this.RIVALS_KEY));
      return r && typeof r === 'object' ? r : {};
    } catch (e) {
      return {};
    }
  }

  static setRivals(data) {
    try {
      localStorage.setItem(this.RIVALS_KEY, JSON.stringify(data));
    } catch (e) { /* quota cheia: seguir sem cache é aceitável */ }
  }

  // --- Telemetria local (v1.3.0): totais acumulados por aparelho ---
  // Persistidos NA HORA do evento: "Jogar Novamente" recarrega a página,
  // então nada pode ficar só em memória.
  static ATTEMPTS_KEY = 'furious_rhino_attempts';
  static PLAYTIME_KEY = 'furious_rhino_playtime_s';
  static WINS_KEY = 'furious_rhino_wins';
  static DEATHS_KEY = 'furious_rhino_deaths';
  static GEO_KEY = 'furious_rhino_geo';

  static getAttempts() {
    const stored = localStorage.getItem(this.ATTEMPTS_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static addAttempt() {
    const total = this.getAttempts() + 1;
    localStorage.setItem(this.ATTEMPTS_KEY, total.toString());
    return total;
  }

  // Desfaz o addAttempt do início da corrida quando o jogador DESISTE pelo
  // popup de pausa — a run cancelada não conta em nada (o endGame nem roda).
  static removeAttempt() {
    const total = Math.max(0, this.getAttempts() - 1);
    localStorage.setItem(this.ATTEMPTS_KEY, total.toString());
    return total;
  }

  static getPlayTimeS() {
    const stored = localStorage.getItem(this.PLAYTIME_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static addPlayTimeS(seconds) {
    const total = this.getPlayTimeS() + seconds;
    localStorage.setItem(this.PLAYTIME_KEY, total.toString());
    return total;
  }

  static getWins() {
    const stored = localStorage.getItem(this.WINS_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static addWin() {
    const total = this.getWins() + 1;
    localStorage.setItem(this.WINS_KEY, total.toString());
    return total;
  }

  // Mortes por tier (t1..t6; t5/t6 = modo infinito) e por causa
  // (wall/spike/animal/dart/tower/boss/fall). 'boss' (v1.7) = rifle do
  // caçador do portão; 'boss2'/'boss3' (v1.8.5) = boss dos 2000m e
  // Caçador-Mor do fim do mundo; 'cerco'/'farao' (v1.8.10) = Barreira da
  // Escavação (3650m) e Faraó de Bronze (4700m) — 17 chaves; as rules
  // aceitam até 17 (bump do agente B, REPUBLICADO no console antes do
  // deploy, senão o write é negado em silêncio).
  static getDeaths() {
    const empty = { t1: 0, t2: 0, t3: 0, t4: 0, t5: 0, t6: 0, wall: 0, spike: 0, animal: 0, dart: 0, tower: 0, boss: 0, boss2: 0, boss3: 0, fall: 0, cerco: 0, farao: 0 };
    try {
      return { ...empty, ...(JSON.parse(localStorage.getItem(this.DEATHS_KEY)) || {}) };
    } catch (e) {
      return empty; // JSON corrompido — recomeça sem travar o jogo
    }
  }

  static addDeath(tierIdx, cause) {
    const deaths = this.getDeaths();
    const tierKey = `t${tierIdx + 1}`;
    if (tierKey in deaths) deaths[tierKey]++;
    if (cause in deaths) deaths[cause]++;
    localStorage.setItem(this.DEATHS_KEY, JSON.stringify(deaths));
    return deaths;
  }

  // Encontros com o boss do portão (v1.7): os toasts de ensino só saem nos
  // primeiros BOSS_HINT_MAX_ENCOUNTERS da vida (padrão das dicas da abertura,
  // que usam getAttempts — aqui precisa de contador próprio porque chegar ao
  // boss é raro e as 3 primeiras corridas nunca o veriam)
  static BOSS_SEEN_KEY = 'furious_rhino_boss_seen';

  static getBossEncounters() {
    const stored = localStorage.getItem(this.BOSS_SEEN_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static addBossEncounter() {
    const total = this.getBossEncounters() + 1;
    localStorage.setItem(this.BOSS_SEEN_KEY, total.toString());
    return total;
  }

  static getGeo() {
    try {
      return JSON.parse(localStorage.getItem(this.GEO_KEY));
    } catch (e) {
      return null;
    }
  }

  static setGeo(geo) {
    localStorage.setItem(this.GEO_KEY, JSON.stringify(geo));
  }

  // Últimas RUNS_WINDOW execuções — janela deslizante local, espelhada no doc
  // de stats p/ análise individual (a ficha do painel desenha a evolução daqui)
  //
  // v1.6: cada item passou de {t, m} para {t, m, s, c} — segundos da corrida e
  // causa do fim ('wall'|'spike'|'animal'|'dart'|'tower'|'fall'|'win'). Sai de
  // graça: a regra do Firestore só valida `runs is list && size() <= 50`, a
  // FORMA do elemento é livre. Com essas duas letras a mais dá para ler
  // duração por corrida, causa correlacionada com distância e curva de
  // aprendizado individual — toda a análise que orientou a v1.6 foi feita sem.
  //
  // v1.6.1: entram as MECÂNICAS. Os contadores já existiam no GameScene para
  // julgar medalha e eram jogados fora no fim da corrida. Com eles cruzados
  // com `m` e `c` dá para responder a pergunta que a v1.6 respondeu no chute:
  // quem morre cedo é quem não descobriu a investida?
  static RUNS_KEY = 'furious_rhino_runs';
  static RUNS_WINDOW = 50; // teto das rules: runs.size() <= 50

  // Contadores inteiros da corrida. Zero é OMITIDO — a janela inteira vai no
  // doc a cada envio, então cada chave a menos conta.
  static RUN_COUNTERS = {
    w: 'wallsBroken',   // paredes trincadas quebradas
    r: 'rampsSmashed',  // rampas destruídas na investida
    o: 'towersDowned',  // torres derrubadas
    a: 'animalsHit',    // animais atropelados
    j: 'jumps',         // pulos
    d: 'dashes',        // investidas que SAÍRAM
    x: 'dashesWasted',  // investidas pedidas durante o cooldown (frustração)
    p: 'pauses',        // pausas (inclui trocar de aba)
    f: 'specialsUsed',  // ativações do especial FÚRIA TOTAL (v1.7)
    n: 'furyDeniedBoss', // ativações da fúria NEGADAS na arena do boss (v1.8)
    b: 'bossLayersBroken', // camadas do portão blindado quebradas (0-3, v1.7)
    q: 'bossBounces',   // quiques no portão (atrito com o loop da luta)
    z: 'bossFightS',    // segundos de luta contra o boss (0 = nem chegou lá)
    // v1.8.5 — os bosses do deserto (orçamento de letras: sobram i u y).
    // `q` segue EXCLUSIVO do portão: misturar quiques dos três poluiria a
    // baseline de 48 lutas que calibrou a v1.8.
    e: 'boss2LayersBroken', // camadas do boss dos 2000m quebradas (0-4; hoje a Muralha)
    h: 'boss2FightS',   // segundos de luta contra o boss dos 2000m
    l: 'boss3LayersBroken', // camadas do Guardião do Fim (9995m) quebradas (0-5)
    // v1.8.10 "As Areias do Tempo" — os dois combates do deserto (orçamento
    // de letras: sobra só `i`). Sem letras de segundos, precedente do boss3.
    u: 'cercoLayersBroken', // camadas da Barreira da Escavação (3650m) quebradas (0-4)
    y: 'faraoLayersBroken', // camadas do Faraó de Bronze (4700m) quebradas (0-5)
    // v1.9.2 — a ÚLTIMA letra livre, gasta de propósito: `i` é quanto tempo o
    // LOOP do jogo acredita ter rodado (soma dos deltas), para comparar com o
    // `s`, que é relógio de parede. Em agosto/26 um bug gravou 26 de 85
    // corridas da v1.9.0 com tempo muito menor que o real (10.000 m em 47 s)
    // e não havia como saber se o jogo acelerou ou se o cronômetro mentiu.
    // Com os dois relógios lado a lado: i ≈ s → a distância saltou;
    // i >> s → loop acelerado; i << s → o loop congelou. Não pontua (o
    // runBonus não a lê), então o contrato da pontuação segue intacto.
    i: 'loopS',
    // v1.9.5 — O ALFABETO DE 1 LETRA ACABOU no `i`, e estas 7 chaves o rompem
    // de propósito. O motivo registrado para não coletá-las era "orçamento de
    // letras", mas o custo foi MEDIDO: contador zero é omitido logo abaixo
    // (`if (v > 0)`) e luta nesses chefes é rara — na base inteira de 1.070
    // corridas, as 7 chaves custariam ~136 bytes. O maior doc de stats tem
    // 5,8 KB contra o limite de 1 MB do Firestore, e as rules NÃO validam as
    // chaves de runs[] (só `runs is list && size() <= 50`): o alfabeto curto
    // sempre foi convenção nossa, não regra técnica.
    //
    // O que elas destravam: até aqui, dos 5 chefes só o PORTÃO era medível.
    // A auditoria de 24/08 mostrou 7 chegadas na Barreira, 6 no Faraó e 4 no
    // Caçador-Mor — todas cegas, sem forma de distinguir "lutou 40 s e
    // perdeu" de "passou direto". O dado já era calculado (o `fightMs` roda
    // nos 5) e morria com a cena.
    zu: 'cercoFightS',   // segundos de luta na Barreira da Escavação (3650m)
    zy: 'faraoFightS',   // segundos de luta contra o Faraó de Bronze (4700m)
    zl: 'boss3FightS',   // segundos de luta contra o Caçador-Mor (9995m)
    // Quiques: `q` segue EXCLUSIVO do portão (a baseline de 48 lutas que
    // calibrou a v1.8 não pode ser poluída), e cada chefe novo ganha o seu.
    qe: 'boss2Bounces',  // quiques na Muralha (2000m)
    qu: 'cercoBounces',  // quiques na Barreira (3650m)
    qy: 'faraoBounces',  // quiques no Faraó (4700m)
    ql: 'boss3Bounces',  // quiques no Caçador-Mor (9995m)
  };

  // Até a v1.6.1 a fúria não entrava aqui por ser posicional (contida no
  // `m`). A v1.7 a transformou em recurso gastável — o `f` mede a decisão
  // de usar, que não está em nenhum outro campo.

  static getRuns() {
    try {
      const runs = JSON.parse(localStorage.getItem(this.RUNS_KEY));
      return Array.isArray(runs) ? runs : [];
    } catch (e) {
      return [];
    }
  }

  // v1.9.6: escrita direta da janela. Existe para a faxina do
  // LeaderboardSystem.purgeUnprovenLocal — o `addRun` só sabe ACRESCENTAR,
  // e a limpeza precisa REMOVER. Recorta no teto da janela pelo mesmo
  // motivo do addRun: as rules recusam `runs.size() > 50`.
  static setRuns(runs) {
    const lista = (Array.isArray(runs) ? runs : []).slice(-this.RUNS_WINDOW);
    localStorage.setItem(this.RUNS_KEY, JSON.stringify(lista));
    return lista;
  }

  // Marca de que a faxina da v1.9.6 já rodou NESTE aparelho. Guardada com o
  // número da versão no nome de propósito: uma faxina futura será outra
  // chave, e esta continua contando o que aconteceu.
  static PURGE_KEY = 'furious_rhino_purge_v196';

  static purgeDone() {
    try { return localStorage.getItem(this.PURGE_KEY) === '1'; } catch (e) { return true; }
  }

  static setPurgeDone() {
    try { localStorage.setItem(this.PURGE_KEY, '1'); } catch (e) { /* modo privado: roda de novo, sem dano */ }
  }

  static addRun(meters, seconds = 0, cause = null, extra = null) {
    const runs = this.getRuns();
    const run = { t: Math.floor(Date.now() / 1000), m: Math.floor(meters) };
    if (seconds > 0) run.s = Math.min(7200, Math.floor(seconds));
    if (cause) run.c = String(cause).slice(0, 8);
    if (extra && typeof extra === 'object') {
      for (const [key, name] of Object.entries(this.RUN_COUNTERS)) {
        const v = Math.floor(Number(extra[name]) || 0);
        if (v > 0) run[key] = Math.min(9999, v);
      }
      if (extra.keyboard) run.k = 1; // separa desktop de verdade de mobile
      if (extra.version) run.v = String(extra.version).slice(0, 10);
      // v1.8: skin usada na corrida — default é omitido (byte-budget: a
      // janela inteira viaja a cada envio)
      if (extra.skin && extra.skin !== 'default') run.g = String(extra.skin).slice(0, 8);
    }
    runs.push(run);
    while (runs.length > this.RUNS_WINDOW) runs.shift();
    localStorage.setItem(this.RUNS_KEY, JSON.stringify(runs));
    return runs;
  }

  // --- Histórico acumulado do jogador (v1.5.0) ---
  // O doc de stats guardava só o ÚLTIMO aparelho/local (sobrescrito a cada
  // envio). Aqui os aparelhos, locais e versões viram contadores que só
  // crescem, com o primeiro acesso preservado. Vai para o servidor como UM
  // mapa (`history`) — as rules validam o mapa inteiro numa cláusula, e não
  // campo a campo (orçamento de avaliação do Firestore).
  static HISTORY_KEY = 'furious_rhino_history';
  // `days` guarda 60 dias: cobre a retenção de 30d com folga e mantém o mapa
  // pequeno (60 × ~35 bytes ≈ 2 KB no doc)
  static HISTORY_CAPS = { clients: 12, geos: 10, versions: 10, days: 60 };

  static getHistory() {
    const empty = { clients: {}, geos: {}, versions: {}, days: {}, firstSeenS: 0 };
    try {
      const h = JSON.parse(localStorage.getItem(this.HISTORY_KEY)) || {};
      return {
        clients: (h.clients && typeof h.clients === 'object') ? h.clients : {},
        geos: (h.geos && typeof h.geos === 'object') ? h.geos : {},
        versions: (h.versions && typeof h.versions === 'object') ? h.versions : {},
        // v1.6.1: { 'AAAA-MM-DD': { r: execuções, s: sessões, b: melhor marca } }
        days: (h.days && typeof h.days === 'object') ? h.days : {},
        firstSeenS: typeof h.firstSeenS === 'number' && h.firstSeenS > 0 ? h.firstSeenS : 0,
      };
    } catch (e) {
      return empty; // JSON corrompido — recomeça sem travar o jogo
    }
  }

  // Data LOCAL do jogador (não UTC): é o "dia" que ele viveu, e é o mesmo
  // recorte que o resumo diário usa. O painel agrega por essa string.
  static dayKey(ms = Date.now()) {
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // Acumula no dia corrente e poda por IDADE — ao contrário dos outros
  // baldes, que podam pelo menos usado: em série temporal o mais velho é
  // que tem de sair, senão o gráfico ganha buracos no meio.
  static bumpDay(h, { runs = 0, sessions = 0, meters = 0 } = {}) {
    const key = this.dayKey();
    const day = (h.days[key] && typeof h.days[key] === 'object') ? h.days[key] : {};
    if (runs) day.r = (Number(day.r) || 0) + runs;
    if (sessions) day.s = (Number(day.s) || 0) + sessions;
    const m = Math.floor(meters);
    if (m > (Number(day.b) || 0)) day.b = m;
    h.days[key] = day;
    const keys = Object.keys(h.days).sort();
    while (keys.length > this.HISTORY_CAPS.days) delete h.days[keys.shift()];
  }

  // Uma chamada por fim de corrida. Rótulos vazios são ignorados (geo pode
  // não ter respondido ainda).
  static addHistory({ clientSig, geoLabel, version, meters = 0 } = {}) {
    const h = this.getHistory();
    const bump = (bucket, key, cap) => {
      if (!key) return;
      bucket[key] = (Number(bucket[key]) || 0) + 1;
      // Teto aplicado no CLIENTE (as rules não contam chaves internas):
      // ao estourar, a assinatura menos usada sai
      const keys = Object.keys(bucket);
      if (keys.length > cap) {
        const least = keys.reduce((a, b) => (bucket[a] <= bucket[b] ? a : b));
        delete bucket[least];
      }
    };
    bump(h.clients, clientSig, this.HISTORY_CAPS.clients);
    bump(h.geos, geoLabel, this.HISTORY_CAPS.geos);
    bump(h.versions, version, this.HISTORY_CAPS.versions);
    this.bumpDay(h, { runs: 1, meters });
    if (!h.firstSeenS) h.firstSeenS = Math.floor(Date.now() / 1000);
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(h));
    return h;
  }

  // --- Sessão (v1.6.1) ---
  // Uma sessão = uma aba aberta. O "Jogar Novamente" recarrega a página, e o
  // sessionStorage SOBREVIVE ao reload — é exatamente a semântica desejada:
  // 12 corridas seguidas contam 1 sessão, não 12.
  static SESSION_KEY = 'furious_rhino_session_at';

  // true só na PRIMEIRA chamada da aba; já contabiliza a sessão no dia.
  // Usado pelo push de "jogador começou a jogar" e pelo gráfico diário.
  static beginSession() {
    try {
      if (sessionStorage.getItem(this.SESSION_KEY)) return false;
      sessionStorage.setItem(this.SESSION_KEY, String(Date.now()));
    } catch (e) {
      return false; // sem sessionStorage: melhor não contar do que inflar
    }
    const h = this.getHistory();
    this.bumpDay(h, { sessions: 1 });
    if (!h.firstSeenS) h.firstSeenS = Math.floor(Date.now() / 1000);
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(h));
    return true;
  }

  static getSessionStartedAt() {
    try {
      return parseInt(sessionStorage.getItem(this.SESSION_KEY), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  // Última posição vista no ranking online — cacheada para a tela de
  // início mostrar sem nenhum custo de rede
  static getLastRank() {
    const stored = localStorage.getItem(this.LAST_RANK_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  static setLastRank(rank) {
    localStorage.setItem(this.LAST_RANK_KEY, rank.toString());
  }
}
