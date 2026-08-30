import { SPRITE_PARAMS } from '../art/SpriteParams.js';

export const Constants = {
  // Fonte única da versão para a telemetria (manter igual ao #game-version
  // do index.html e ao package.json a cada release)
  VERSION: '1.9.12',

  // Rótulo humano de cada desfecho de corrida. Fonte única para o painel, o
  // resumo do jogador e os pushes — os três diziam a mesma coisa com palavras
  // diferentes. As CHAVES são o contrato com StorageManager.getDeaths().
  CAUSE_LABELS: {
    wall: '🧱 Parede',
    spike: '🔺 Espinho',
    animal: '🦁 Animal',
    dart: '💉 Dardo',
    tower: '🏰 Torre',
    boss: '🎯 Caçador',
    boss2: '🕸️ Capturador',   // v1.8.5 — o canhão de redes do Cerco (2000m)
    boss3: '🏹 Caçador-Mor',  // v1.8.5 — o Guardião do Fim (9995m)
    fall: '🕳️ Anomalia de física',
    win: '🗽 Fuga',
    // v1.8.10 "As Areias do Tempo" — os dois combates do deserto
    cerco: '🕸️ Capturador da Barreira', // a Barreira da Escavação (3650m)
    farao: '🏺 Faraó de Bronze',        // o defensor da muralha (4700m)
  },

  // Game dimensions & scale
  GAME_WIDTH: 1280,
  GAME_HEIGHT: 720,
  PIXELS_PER_METER: 40,
  // Topo do corpo do chão. Era recalculado inline (GAME_HEIGHT - 100) no
  // spawn de espinho/animal, na torre e na cutscene — agora tem um nome só.
  GROUND_TOP: 620,
  // Sprites SVG rasterizados no dobro do viewBox e exibidos a 1/2 escala:
  // nitidez em telas de alta densidade. Hitboxes usam px de textura, então
  // todo setSize/setOffset/setCrop de textura SVG multiplica por este fator.
  ART_RASTER_SCALE: 2,
  // v1.8.1: escala VISUAL do rino (todas as skins) — as vetorizadas são mais
  // magras e o leão (ANIMAL_SCALE 1.5 = 105px) passava o protagonista. SÓ
  // aparência: a hitbox é compensada em Rhino.applyVisualScale e continua
  // 76×54 px de mundo (tuning de campo intacto). Calibrável ao vivo no
  // painel ?debug=1 (pasta Skins).
  RHINO_VISUAL_SCALE: 1.30,

  // Rhino physics
  RUN_SPEED: 300,
  JUMP_MIN_V: -540,
  JUMP_MAX_V: -880,
  JUMP_CHARGE_MS: 2000,
  FALL_EXTRA_GRAVITY: 700,
  DASH_SPEED: 750,
  DASH_ACTIVE_MS: 200,
  DASH_COOLDOWN_MS: 1000,

  // v1.9.1: TETO DE PLAUSIBILIDADE da velocidade média de uma corrida (m/s).
  // NÃO é um teto de física — é a última linha de defesa antes de uma marca
  // impossível subir ao ranking MUNDIAL (LeaderboardSystem.isPlausible).
  //
  // Por que existe: na v1.9.0, 26 das 85 corridas que chegaram ao ranking
  // tinham velocidade média fisicamente impossível — até 217 m/s — e todas
  // bateram no teto de 20.000 pts / 10.000 m, envenenando o pódio. Em ~820
  // corridas de TODAS as versões anteriores isso aconteceu ZERO vezes. Não é
  // trapaça: é um bug ainda não localizado, e quem foi afetado é jogador
  // legítimo. Enquanto a causa não aparece, o ranking se protege na borda.
  //
  // De onde vem o número: o teto FÍSICO absoluto do jogo é
  //   DASH_SPEED 750 × furyFactor 1,5 × SPECIAL_SPEED_MULT 1,25 / 40 px/m
  //   = 35,16 m/s
  // e ele exigiria dash 100% do tempo (o dash dura 200ms a cada 1000ms de
  // recarga) com rampage ligado — insustentável na prática: a velocidade
  // média REAL observada em produção fica entre 8 e 11 m/s. Os 40 m/s são
  // 35,16 arredondados PARA CIMA com folga deliberada: barrar um jogador
  // honesto é pior do que deixar passar uma marca suja.
  RUN_SANITY_MAX_MPS: 40,

  // Difficulty & distance
  // Portão da fuga aos 1000m (v1.6): 5 biomas de 200m cabem inteiros no
  // percurso, e a fuga volta a ser conquista rara — com os números da v1.5,
  // 8,6% das corridas chegavam a 800m e 3,5% a 1000m. Decisão deliberada.
  WIN_DISTANCE_PX: 40000,
  // Fim físico do mundo no modo infinito (10.000m; float32 preciso até aqui).
  // Chegar = "LENDA!". Bounds/câmera/chão derivam deste valor.
  WORLD_END_PX: 400000,
  // Fúria cheia aos 900m = 90% do caminho até o portão (era 700/800 = 87,5%).
  // Sem esse ajuste ela saturaria aos 70% e o rino chegaria ao portão com 300m
  // de velocidade máxima — apertando o MIN_SAFE_GAP e esticando o trampolim.
  FURY_FULL_DISTANCE_PX: 36000,
  // ------------------------------------------------- especial FÚRIA TOTAL
  // Com o medidor cheio, tocar no ícone (ou ↓/SHIFT) transforma o rino:
  // pega fogo, fica invencível e TUDO que colide explode, enquanto o medidor
  // drena até zero. A fúria deixou de ser posicional: vira uma CARGA que
  // acumula por distância percorrida (a primeira carga reproduz a curva
  // antiga: cheia após FURY_FULL_DISTANCE_PX de corrida) e é gasta no modo.
  SPECIAL_DURATION_MS: 6000,  // medidor cheio → zero (a duração do modo)
  SPECIAL_SPEED_MULT: 1.25,   // boost sobre a velocidade vigente durante o modo
  SPECIAL_WARN_MS: 1500,      // reta final: rino/ícone piscam avisando o fim

  // ------------------------------------------------- BOSS: portão-fortaleza
  // v1.7: o portão dos 1000m amanhece BLINDADO, com um caçador de rifle na
  // plataforma do topo. O rino quebra 3 camadas com investidas alinhadas às
  // frestas (ordem fixa chão → meio → alto, alturas de CRACK_HEIGHTS),
  // quicando para trás a cada contato — SEM corpo físico no portão: contato
  // por banda de x + clamp posicional (corpo sólido + FurySystem reescrevendo
  // velocityX todo frame = o soft-lock documentado das rampas).
  BOSS_ARENA_PX: 1100,           // luta começa em WIN-1100 (~972m); câmera trava
  // v1.8: dentro da arena a ATIVAÇÃO da fúria é negada (a carga segue
  // enchendo). Dados da v1.7.1: 120 camadas quebradas × 6 quiques × 8 mortes
  // — o rampage (cheio aos 900m, de propósito) anulava fresta E rifle e a
  // luta virou formalidade. Quem ativa ANTES da arena mantém o fogo, mas o
  // alinhamento à fresta voltou a ser obrigatório (BossFight.onContact).
  BOSS_BLOCKS_FURY: true,
  BOSS_GATE_FACE_HALF: 120,      // meia-largura do canvas do portão (banda de contato)
  BOSS_LAYERS: ['ground', 'mid', 'high'], // ordem FIXA de quebra das camadas
  BOSS_KNOCKBACK_VX: 3000,        // recuo do quique (decai ~0.92/frame → ~600px; tuning do dono na v1.7.1)
  BOSS_KNOCKBACK_VY: -360,       // arremesso vertical do quique
  BOSS_KNOCKBACK_MS: 650,        // janela em que o FurySystem NÃO reescreve velocityX
  BOSS_LAYER_COOLDOWN_MS: 450,   // 1 contato processado por vez (rampage não zera 3 em 3 frames)
  BOSS_SHOT_SPEED: 800,          // entre t3 (620) e t6 (700): quem chegou aqui já viu 540+
  // Padrões do rifle por camadas RESTANTES (objetos mutáveis: TuningPanel
  // pode ligar sliders aqui). burst = tiros retos em sequência (120ms);
  // mortar = alterna morteiro em arco caindo na zona de pouso do quique.
  BOSS_RIFLE: {
    3: { intervalMs: 1500, telegraphMs: 450, burst: 1, mortar: false },
    2: { intervalMs: 1200, telegraphMs: 400, burst: 2, mortar: true },
    1: { intervalMs: 950, telegraphMs: 350, burst: 3, mortar: true },
  },
  // Toasts de ensino só nos 2 primeiros encontros da vida (o glow pulsante
  // na fresta é permanente — é a mira, não uma dica)
  BOSS_HINT_MAX_ENCOUNTERS: 2,

  // ------------------------------------------- BOSS 2: a Muralha (2000m)
  // v1.8.7 "Estado de Alerta": o slot dos 2000m trocou de dono. BOSS2_*
  // passa a significar "o boss dos 2000m" — hoje, a Operação Muralha
  // (barricada de viaturas + torre de holofote com o Comandante no ninho).
  // A Muralha HERDA âncora, causa de morte (`boss2`) e pontos (boss2: 150 +
  // bossLayer/camada) — a série histórica do funil continua contínua.
  BOSS2_ANCHOR_PX: 80000,        // ~2000m: o segundo portal da fuga
  // Comprimento 4 OBRIGATÓRIO: ScoreSystem/MedalSystem amarram a vitória do
  // boss dos 2000m a BOSS2_LAYERS.length === 4. Abre no ALTO de propósito:
  // é o exame da lição do D3 (a Zona de Contenção ensina a ler o céu).
  BOSS2_LAYERS: ['high', 'ground', 'mid', 'high'],
  // Arsenal da cidade, por camadas RESTANTES (objetos mutáveis: TuningPanel
  // pode ligar sliders). burst = rajada de dardos; holo = granada-de-luz:
  // morteiro cujo telegraph é o próprio holofote varrendo até a zona de
  // pouso (diegético — o jogador lê a luz, não um glow abstrato); rasante =
  // K9 de choque cruzando a arena rente ao chão (anti-camping); fan = leque.
  // O despacho de `holo`/`rasante` vive no BossFight (agente B).
  BOSS_MURALHA: {
    4: { intervalMs: 1500, telegraphMs: 450, burst: 1 },
    3: { intervalMs: 1250, telegraphMs: 420, burst: 2, holo: true },
    2: { intervalMs: 1050, telegraphMs: 380, burst: 2, holo: true, rasante: true },
    1: { intervalMs: 900,  telegraphMs: 350, burst: 3, holo: true, fan: true, rasante: true },
  },
  // Enrage suave da Muralha (filosofia da casa: desce UM degrau de cadência,
  // nunca muro de morte).
  // (agente B) migra — depois um dos dois morre.
  MURALHA_ENRAGE_MS: 45000,

  // --------------------- O CERCO: a Barreira da Escavação (3650m, VIVO)
  // v1.8.10 "As Areias do Tempo": o wiring CHEGOU. Depois de duas versões
  // declaradas (precedente da casa: B e C na v1.8.4), o Cerco vira o
  // MINIBOSS do meio do deserto — a Barreira da Escavação, âncora
  // CERCO_ANCHOR_PX (146000px/3650m), fechando o Sítio da Escavação.
  // Mecânica 100% intacta; paleta nova `escavacao` e o Capturador reusa o
  // rig boss2-hunter (def no GameScene, agente C). Letra `u`
  // (cercoLayersBroken), causa própria `cerco`, +150 na vitória (u ≥ 4).
  // A medalha `boss2_win` ("Fura-Bloqueio") acorda re-batizada para cá.
  // 4 camadas fora da ordem "de baixo para cima": obriga a ler o glow em vez
  // de decorar a sequência do portão
  CERCO_LAYERS: ['mid', 'ground', 'high', 'mid'],
  // Canhão de redes do Cerco: leque e rasante (anti-camping) são o tema; o
  // morteiro entra SÓ na última camada, como estocada final.
  CERCO_NET: {
    4: { intervalMs: 1500, telegraphMs: 450, burst: 1, mortar: false, rasante: true },
    3: { intervalMs: 1250, telegraphMs: 420, burst: 2, mortar: false, rasante: true, fan: true },
    2: { intervalMs: 1050, telegraphMs: 380, burst: 2, mortar: false, rasante: true, fan: true },
    1: { intervalMs: 900, telegraphMs: 350, burst: 3, mortar: true, fan: true },
  },
  // Âncora da Barreira da Escavação: 3650m, no ANOITECER do ciclo de céu —
  // dramaturgia de graça, zero mudança nas âncoras do céu.
  CERCO_ANCHOR_PX: 146000,

  // ------------------------- O FARAÓ DE BRONZE (4700m) — v1.8.10
  // O defensor da muralha de arenito no fim da Necrópole: o exame MAIS
  // agressivo do jogo POR TABELA, não por HP — a tese "a cidade caçava; o
  // deserto engole" cobrada no último degrau antes do deserto profundo.
  FARAO_ANCHOR_PX: 188000,
  // 5 camadas (mais longa que qualquer luta) e abre no MEIO — a terceira
  // gramática de abertura (portão abre embaixo, Muralha no alto).
  FARAO_LAYERS: ['mid', 'high', 'ground', 'mid', 'high'],
  // Enrage aos 30s (vs 45 dos outros): quem chegou aos 4700m já provou que
  // sabe ler telegraph — aqui a régua é executar rápido.
  FARAO_ENRAGE_MS: 30000,
  // Arsenal por camadas RESTANTES (objetos mutáveis: TuningPanel pode ligar
  // sliders). Vocabulário 100% existente: burst = rajada; fan = leque;
  // holo = Espelho de Rá (o feixe de luz varrendo até a zona de pouso,
  // diegético como espelho solar — mesma mecânica da granada-de-luz da
  // Muralha); rasante = Mergulho de Hórus (projétil-falcão rente ao chão,
  // anti-camping; o estilo 'falcao' é despachado no wiring, agente B).
  // Sem mortar de propósito: o holo JÁ é o tiro em arco desta luta.
  // Cadência 1200→700ms — a mais curta do jogo (Guardião para em 850).
  BOSS_FARAO: {
    5: { intervalMs: 1200, telegraphMs: 420, burst: 1 },
    4: { intervalMs: 1050, telegraphMs: 400, burst: 2, holo: true },
    3: { intervalMs: 950,  telegraphMs: 380, burst: 3, fan: true, holo: true },
    2: { intervalMs: 820,  telegraphMs: 350, burst: 3, fan: true, holo: true, rasante: true },
    1: { intervalMs: 700,  telegraphMs: 320, burst: 3, fan: true, holo: true, rasante: true },
  },

  // ---------------------------------- BOSS 3: o Caçador-Mor (declarado)
  // Quase no fim do mundo (WORLD_END_PX): 5 camadas em vaivém e o remix dos
  // dois arsenais. O rasante só na última — quem chegou aqui já aprendeu a
  // pular o padrão, e é aí que a lição é cobrada.
  BOSS3_ANCHOR_PX: 399800,
  BOSS3_LAYERS: ['ground', 'mid', 'high', 'mid', 'ground'],
  BOSS3_RIFLE: {
    5: { intervalMs: 1400, telegraphMs: 420, burst: 1, mortar: false },
    4: { intervalMs: 1200, telegraphMs: 400, burst: 2, mortar: true },
    3: { intervalMs: 1050, telegraphMs: 380, burst: 2, mortar: true, fan: true },
    2: { intervalMs: 950, telegraphMs: 350, burst: 3, mortar: true, fan: true },
    1: { intervalMs: 850, telegraphMs: 320, burst: 3, mortar: true, fan: true, rasante: true },
  },

  // v1.8.4: PONTUAÇÃO COMPOSTA — `score` do ranking deixa de ser metros e
  // passa a ser metros + bônus por façanha (o campo novo `scoreM` guarda os
  // metros). Tabela MUTÁVEL de propósito: os sliders do ?debug=1 e o
  // calibrador podem reescrever os pesos sem tocar no ScoreSystem.
  //
  // De onde vieram os números: simulação sobre as 895 corridas REAIS da
  // janela de runs[] (16/08), registrada em docs/IDEIAS-FUTURAS.md §5-A.
  // O alvo era um bônus que premie habilidade sem inverter o ranking:
  // bônus/total com mediana 0% e **p95 ≈ 13,7%** (alvo p95 <= 25%) e
  // **Spearman metros × total = 0,993** (alvo >= 0,9) — ou seja, a ordem
  // geral continua sendo distância, o bônus só desempata quem luta.
  // Ficam de fora, de propósito, `j/p/x/n` (pulo/dash/dano: spam e
  // frustração não pontuam) e `f` (o especial já aparece no que ele quebra).
  SCORE_WEIGHTS: { wall: 5, ramp: 5, tower: 15, animal: 3, bossLayer: 25, escape: 100, blitz: 50, legend: 400,
    // v1.8.5: vitória do boss dos 2000m — camada de boss segue valendo
    // bossLayer em TODOS os bosses; o Guardião não tem bônus próprio porque
    // a vitória dele JÁ paga o legend (+400).
    boss2: 150,
    // v1.8.10: vitórias do deserto — Barreira (u ≥ 4) paga como a Muralha;
    // Faraó (y ≥ 5) paga mais que qualquer boss porque é o exame mais
    // agressivo do jogo (5 camadas, cadência 700ms, enrage 30s). O espelho
    // no runBonus/breakdown é do ScoreSystem (agente B).
    cerco: 150, farao: 250 },
  SCORE_BLITZ_MAX_S: 20,         // 3 camadas do portão em <= 20s = blitz
  SCORE_BONUS_CAP: 1,            // bônus <= metros × isto (na simulação nunca precisou agir)
  SCORE_MAX_TOTAL: 20000,        // mesmo teto das firestore.rules (score is int, 1..20000)

  // v1.8.6: ARENA DE DESAFIOS — desafios 1v1 e em grupo por janela de tempo.
  // O desafio é METADADO puro (doc challenges/{id} escrito 1× pelo criador);
  // o placar é DERIVADO no cliente das janelas de runs[] que o StatsSystem já
  // espelha em stats/{id} — zero write cruzado entre jogadores, o único
  // modelo seguro num jogo SEM autenticação.
  CHALLENGE_DURATIONS_D: [1, 3, 7],  // durações que o desafiante escolhe (dias)
  // 8 = mesmo teto das firestore.rules (participants/names/accepted <= 8):
  // runs[] guarda só 50 corridas, então grupo grande + janela longa já
  // começa a perder corridas da janela — 8 mantém o placar honesto.
  CHALLENGE_MAX_PARTICIPANTS: 8,
  // Teto de desafios ATIVOS criados por jogador, contado no CLIENTE (o cache
  // da própria query) — sem auth as rules não sabem quem cria; o teto existe
  // para conter spam de convite e reads do placar no plano gratuito.
  CHALLENGE_MAX_ACTIVE_CREATED: 3,
  CHALLENGE_CACHE_TTL_MS: 10 * 60 * 1000,      // lista de desafios: 1 query/10min por navegador
  // v1.8.12: enquanto EU espero alguém aceitar (ou entrar no placar), a lista
  // rele em 45s — sem isso o criador ficava até 1h vendo "aguardando fulano"
  // depois de o convidado JÁ ter aceitado (relato do dono: Fernanda x Teco).
  CHALLENGE_CACHE_TTL_PENDING_MS: 45 * 1000,
  CHALLENGE_STANDINGS_TTL_MS: 30 * 60 * 1000,  // stats dos aceitos: 1 getDoc por participante a cada 30min

  // v1.8.4: a abertura-lição (OPENING_SCRIPT) existe porque, antes da v1.6,
  // o primeiro obstáculo nascia aos 34m e 83 das 512 corridas medidas
  // morriam exatamente ali. Quem já passou dessa fase não precisa mais da
  // aula: com >= 3 tentativas o jogo pula o roteiro e solta a roleta já em
  // x=2400 (60m). A régua é a MESMA de OPENING_HINT_MAX_ATTEMPTS de
  // propósito — dica na tela e pista guiada somem juntas, no mesmo boot.
  VETERAN_MIN_ATTEMPTS: 3,
  VETERAN_OPENING_START_X: 2400,

  SPAWN_LOOKAHEAD_PX: 600,
  RECYCLE_MARGIN_PX: 200,
  // Piso absoluto de vão = ciclo do dash (1,2s) × velocidade máxima (450 px/s)
  MIN_SAFE_GAP: 540,

  // Gravity
  GRAVITY: 1400,

  // Wall crack heights (fraction of wall height, top-down).
  // Ground top sits at y=620; tuned to jump reach:
  // ground = no jump, mid = 1 jump, high = double jump.
  CRACK_HEIGHTS: {
    GROUND: 0.78,
    MID: 0.55,
    HIGH: 0.25
  },
  CRACK_BAND_HALF: 60,

  // Colors
  COLORS: {
    rhinoGray: 0x8b8b8b,
    rhinoGrayDark: 0x505050,
    redFury: 0xff4444,
    wallOrange: 0xff9944,
    wallOrangeDark: 0xe8863a,
    wallMortar: 0xb9682a,
    wallCrack: 0xaa6633,
    wallCrackLine: 0x5e3618,
    steelLight: 0xcfd4da,
    steelDark: 0x8d939c,
    steelBase: 0x55585e,
    skyTop: 0x7ec8f0,
    skyBottom: 0xd6edf9,
    grassGreen: 0x6aae3a,
    grassDark: 0x4e8c2a,
    dirtBrown: 0x9b7043,
    dirtDark: 0x7d5834,
    dirtLight: 0xb08454,
    silhouetteFar: 0x8fb8a8,
    silhouetteNear: 0x5e9857,
    fenceBrown: 0x7a5230,
  },

  // Rig do rino em px de MUNDO para LÓGICA (alinhamento de fresta usa
  // RHINO_H) — a escala visual muda só a exibição, nunca estes números
  RHINO_W: 96,
  RHINO_H: 64,
  SNOUT_OFFSET_X: 42,
  // Narina da arte v1.4 fica em (89,38) do canvas 96x64 -> ancora da fumaca
  SNOUT_OFFSET_Y: -26,

  // All animals rendered at 1.5x (Arcade scales bodies with the sprite,
  // so ANIMAL_SPECS stay in texture pixels)
  ANIMAL_SCALE: 1.5,

  // Per-species animal canvas + physics body (offsets in texture pixels)
  ANIMAL_SPECS: {
    lion:    { w: 70, h: 56, bodyW: 58, bodyH: 44, offX: 6,  offY: 10 },
    zebra:   { w: 76, h: 50, bodyW: 64, bodyH: 38, offX: 6,  offY: 10 },
    monkey:  { w: 48, h: 56, bodyW: 36, bodyH: 46, offX: 6,  offY: 8  },
    giraffe: { w: 60, h: 90, bodyW: 38, bodyH: 82, offX: 11, offY: 6  },
    // Canvas alargado na v1.4 para os bicões (tucano/arara): margens
    // simétricas (offX = (56-36)/2) para o flip não deslocar a hitbox;
    // bicos ficam FORA da colisão, como o chifre do rino
    bird:    { w: 56, h: 32, bodyW: 36, bodyH: 22, offX: 10, offY: 6  },

    // ------------------------------------------------ elenco v1.7 por bioma
    // tex: as texturas novas usam o prefixo enemy-* (Animal.setType resolve).
    // offX já vem ESPELHADO (w - offX_arte - bodyW): as hitboxes sugeridas
    // nos comentários-contrato dos SVGs são assimétricas (rede, bico, cauda
    // fora da colisão) e o sprite roda sempre com setFlipX(true) — o Arcade
    // NÃO espelha o offset do body junto com a textura.
    // scale: só quem foge do ANIMAL_SCALE padrão (veículos/voadores da cidade).
    zookeeper: { w: 48,  h: 68, bodyW: 32,  bodyH: 52, offX: 8,  offY: 14, tex: 'enemy-zookeeper' },
    peacock:   { w: 60,  h: 54, bodyW: 34,  bodyH: 46, offX: 4,  offY: 6,  tex: 'enemy-peacock' },
    ostrich:   { w: 64,  h: 80, bodyW: 42,  bodyH: 66, offX: 11, offY: 12, tex: 'enemy-ostrich' },
    eagle:     { w: 64,  h: 36, bodyW: 44,  bodyH: 18, offX: 8,  offY: 10, tex: 'enemy-eagle' },
    hyena:     { w: 66,  h: 46, bodyW: 56,  bodyH: 32, offX: 5,  offY: 12, tex: 'enemy-hyena' },
    buffalo:   { w: 86,  h: 56, bodyW: 72,  bodyH: 40, offX: 8,  offY: 14, tex: 'enemy-buffalo' },
    bluebird:  { w: 60,  h: 36, bodyW: 40,  bodyH: 16, offX: 4,  offY: 11, tex: 'enemy-bluebird' },
    jaguar:    { w: 80,  h: 46, bodyW: 64,  bodyH: 30, offX: 6,  offY: 14, tex: 'enemy-jaguar' },
    snake:     { w: 72,  h: 26, bodyW: 60,  bodyH: 14, offX: 4,  offY: 10, tex: 'enemy-snake' },
    manedwolf: { w: 76,  h: 62, bodyW: 56,  bodyH: 42, offX: 6,  offY: 14, tex: 'enemy-manedwolf' },
    croc:      { w: 92,  h: 38, bodyW: 84,  bodyH: 21, offX: 4,  offY: 15, tex: 'enemy-croc' },
    hippo:     { w: 88,  h: 58, bodyW: 74,  bodyH: 42, offX: 7,  offY: 14, tex: 'enemy-hippo' },
    capybara:  { w: 70,  h: 42, bodyW: 56,  bodyH: 30, offX: 5,  offY: 10, tex: 'enemy-capybara' },
    jabiru:    { w: 84,  h: 44, bodyW: 62,  bodyH: 22, offX: 8,  offY: 10, tex: 'enemy-jabiru' },
    person:    { w: 40,  h: 62, bodyW: 26,  bodyH: 50, offX: 7,  offY: 10, tex: 'enemy-person' },
    suit:      { w: 42,  h: 64, bodyW: 28,  bodyH: 52, offX: 7,  offY: 10, tex: 'enemy-suit' },
    scooter:   { w: 96,  h: 58, bodyW: 84,  bodyH: 40, offX: 6,  offY: 16, tex: 'enemy-scooter', scale: 1.25 },
    car:       { w: 108, h: 46, bodyW: 96,  bodyH: 32, offX: 6,  offY: 12, tex: 'enemy-car',     scale: 1.25 },
    police:    { w: 108, h: 48, bodyW: 96,  bodyH: 30, offX: 6,  offY: 16, tex: 'enemy-police',  scale: 1.25 },
    drone:     { w: 56,  h: 36, bodyW: 40,  bodyH: 18, offX: 8,  offY: 11, tex: 'enemy-drone',   scale: 1.4 },
    plane:     { w: 120, h: 42, bodyW: 88,  bodyH: 24, offX: 16, offY: 11, tex: 'enemy-plane',   scale: 1.1 },
    pickup:    { w: 132, h: 56, bodyW: 122, bodyH: 34, offX: 5,  offY: 20, tex: 'enemy-pickup',  scale: 1.25 },

    // ------------------------------- elenco v1.8.7 por DISTRITO da cidade
    // (ideia J do IDEIAS-FUTURAS). Mesmas regras da leva v1.7: offX já vem
    // ESPELHADO (w - offX_arte - bodyW), bicos/microfones/rabiolas FORA da
    // colisão. `pair: true` (tropa) = SpawnManager spawna o segundo a
    // +ANIMAL_PACK_OFFSET_PX, sempre.
    viralata:  { w: 62,  h: 42, bodyW: 50,  bodyH: 28, offX: 6,  offY: 12, tex: 'enemy-viralata' },
    gatobeco:  { w: 52,  h: 40, bodyW: 40,  bodyH: 28, offX: 6,  offY: 10, tex: 'enemy-gatobeco' },
    pombo:     { w: 48,  h: 34, bodyW: 32,  bodyH: 20, offX: 8,  offY: 8,  tex: 'enemy-pombo' },
    // Microfone estendido fica FORA da hitbox (offX assimétrico, como a rede
    // do zookeeper)
    reporter:  { w: 44,  h: 64, bodyW: 28,  bodyH: 52, offX: 8,  offY: 10, tex: 'enemy-reporter' },
    // Losango + rabiola: só o losango colide (rabiola é enfeite/telegraph)
    pipa:      { w: 56,  h: 56, bodyW: 36,  bodyH: 36, offX: 10, offY: 6,  tex: 'enemy-pipa' },
    helinews:  { w: 110, h: 48, bodyW: 84,  bodyH: 28, offX: 14, offY: 12, tex: 'enemy-helinews', scale: 1.2 },
    // v1: ZERO SVG novo — reusa a arte do enemy-pickup em escala maior
    // (paga o débito "mecânica própria da camionete" declarado na v1.7)
    camionete: { w: 132, h: 56, bodyW: 122, bodyH: 34, offX: 5,  offY: 20, tex: 'enemy-pickup',  scale: 1.25 },
    k9:        { w: 64,  h: 46, bodyW: 52,  bodyH: 34, offX: 6,  offY: 10, tex: 'enemy-k9' },
    // Hitbox 34×56 do design (escudo alto e estreito); nasce SEMPRE em par
    tropa:     { w: 48,  h: 68, bodyW: 34,  bodyH: 56, offX: 7,  offY: 10, tex: 'enemy-tropa', pair: true },
    // Recolors do drone-base (mesma silhueta, paleta preto/vermelho)
    dronezig:  { w: 56,  h: 36, bodyW: 40,  bodyH: 18, offX: 8,  offY: 11, tex: 'enemy-dronezig', scale: 1.4 },
    dronesent: { w: 60,  h: 44, bodyW: 42,  bodyH: 24, offX: 9,  offY: 8,  tex: 'enemy-dronesent', scale: 1.4 },

    // ---------------- elenco v1.8.10 do DESERTO (As Areias do Tempo)
    // Mesmas regras das levas v1.7/v1.8.7: offX já vem ESPELHADO
    // (w - offX_arte - bodyW); pescoço/bico/arco/capelo FORA da colisão.
    // Corcova e pescoço do camelo fora da hitbox (como o chifre do rino)
    camelo:      { w: 90, h: 78, bodyW: 68, bodyH: 56, offX: 8,  offY: 20, tex: 'enemy-camelo' },
    // Envergadura larga, corpo estreito — asas são enfeite, como no eagle
    abutre:      { w: 66, h: 40, bodyW: 44, bodyH: 22, offX: 10, offY: 10, tex: 'enemy-abutre' },
    // Recolor do snake: capelo ERGUIDO no visual, hitbox BAIXA como a da
    // cobra — o corpo rasteiro é o que colide, o capelo é telegraph
    naja:        { w: 64, h: 46, bodyW: 50, bodyH: 16, offX: 6,  offY: 26, tex: 'enemy-naja' },
    // Recolor do bird em voo: pescoço e pernas esticados fora da colisão
    flamingo:    { w: 78, h: 40, bodyW: 54, bodyH: 18, offX: 10, offY: 12, tex: 'enemy-flamingo' },
    // Hitbox 34×58 do design (alta e estreita, molde da tropa); nasce
    // SEMPRE em par — múmias saem da tumba de dois em dois
    mumia:       { w: 46, h: 66, bodyW: 34, bodyH: 58, offX: 6,  offY: 6,  tex: 'enemy-mumia', pair: true },
    // Hitbox 40×24 do design: pequeno e rasteiro, pulinho curto resolve
    escaravelho: { w: 52, h: 32, bodyW: 40, bodyH: 24, offX: 6,  offY: 6,  tex: 'enemy-escaravelho' },
    // Saltador magro (molde do k9): focinho fora da colisão
    chacal:      { w: 68, h: 46, bodyW: 54, bodyH: 32, offX: 6,  offY: 12, tex: 'enemy-chacal' },
    // Zig do céu do Vale: silhueta de falcão, asas fora da colisão
    falcao:      { w: 62, h: 36, bodyW: 42, bodyH: 18, offX: 8,  offY: 10, tex: 'enemy-falcao' },
    // Arco estendido FORA da hitbox (offX assimétrico, como a rede do
    // zookeeper e o microfone do reporter)
    arqueiro:    { w: 52, h: 64, bodyW: 28, bodyH: 52, offX: 8,  offY: 10, tex: 'enemy-arqueiro' },
  },

  // 5 espécies visuais de pássaro (mesma hitbox/behavior de 'bird');
  // Animal.setType sorteia uma a cada spawn
  BIRD_SPECIES: ['macaw', 'owl', 'cockatiel', 'toucan', 'jay'],

  // HUD
  HUD_MARGIN: 20,
  FURY_BAR_WIDTH: 200,
  FURY_BAR_HEIGHT: 12,
  DASH_ICON_SIZE: 60,

  // Object pool sizes (dimensionados para o teto de dificuldade do
  // modo infinito: combos a 50% + torres a 22% da roleta)
  POOL_SIZES: {
    crackedWalls: 8,
    spikes: 8,
    // v1.8.7: 16→20 — a Tropa de Escudos nasce SEMPRE em par (spec.pair) por
    // cima do animalPackChance/escolta que já existiam; sem folga o
    // spawnAnimal devolve silêncio com o pool cheio e a densidade some
    animals: 20,
    towers: 4,
    // v1.8.7: 16→24 — o pool é COMPARTILHADO por torres t6 (520ms), os
    // atiradores novos (camionete, drone-sentinela) e os bosses; fireDart
    // falha EM SILÊNCIO com pool lotado (o risco nº 1 da ideia J)
    darts: 24,
    // Janela viva: 200 (reciclagem) + 1280 (tela) + 600 (lookahead) + 540
    // (span máx) ≈ 2620px; com span+gap ≈ 1080 por rampa, 3 bastariam
    ramps: 4,
  },

  // ------------------------------------------------------------------ rampas
  // A rampa é TERRENO, não corpo de colisão: Arcade só tem AABB alinhado aos
  // eixos, e uma escada de corpos estáticos trava o rino na lateral do degrau
  // (a separação zera velocityX e o FurySystem a reescreve todo frame — o
  // resultado é ele tremendo parado, sem morrer e sem avançar). Em vez disso a
  // rampa expõe surfaceY(x) e a cena encaixa o body nela uma vez por frame.
  //
  // asc = rampa de subida, rise = altura ganha, top = platô, desc = descida.
  // desc: 0 = penhasco (trampolim): a crista lança o rino no ar.
  RAMP_VARIANTS: {
    small: { asc: 200, rise: 90,  top: 80,  desc: 140 },
    big:   { asc: 260, rise: 150, top: 100, desc: 180 },
    // launchV: impulso ao deixar a crista. Sem ele o penhasco daria só ~106px
    // de voo (queda de 130px a 2100px/s²) — pouco para se chamar trampolim.
    // -520 dá ~0,83s no ar: ~265m/s de corrida base, bem mais com fúria.
    jump:  { asc: 240, rise: 130, top: 60,  desc: 0, launchV: -520 },
  },

  // Sorteio da variante DENTRO do peso de rampa (os pesos dos tiers não
  // mudam). O trampolim é a variante que mais rende — a sensação de voo é o
  // que o jogo tem de mais divertido — então ele domina: 2/3 no primeiro
  // trecho e 3/5 dali em diante. Antes ele era 1/3 e só entrava no tier 3,
  // o que dava ~4% da roleta: raro demais para ser lembrado.
  // O morro grande (150px de subida) fica fora do primeiro trecho.
  RAMP_POOL: {
    early: ['jump', 'jump', 'small'],                // tier 1
    full: ['jump', 'jump', 'jump', 'small', 'big'],  // tier 2+
  },
  // Saia enterrada no chão: sem ela a base da textura mostra a costura
  RAMP_SKIRT: 24,
  // Tolerância de "grudar" na descida. A 450px/s a queda por frame no desc do
  // morro grande é 6,2px; no dash a 1125px/s, 15,6px — 26 cobre os dois com
  // folga, e o penhasco (desc 0) não gruda em nada.
  RAMP_STICK_PX: 26,
  // Só destrói entrando RASANTE: dash no meio da subida não quebra, só acelera
  RAMP_SMASH_MAX_H: 32,
  // Vão mínimo DEPOIS da rampa, medido da borda direita. O trampolim com
  // impulso fica ~0,83s no ar: 265px correndo, ~375px já com fúria cheia.
  // 900 garante que o pouso nunca cai em cima do próximo obstáculo.
  RAMP_EXIT_GAP: 900,

  // Todas as espécies spawnáveis (o sorteio real é por bioma, ver
  // BIOME_ANIMALS; esta lista serve ao pool e ao TuningPanel)
  ANIMAL_TYPES: [
    'lion', 'zebra', 'monkey', 'giraffe', 'bird',
    'zookeeper', 'peacock', 'ostrich', 'eagle', 'hyena', 'buffalo',
    'bluebird', 'jaguar', 'snake', 'manedwolf', 'croc', 'hippo',
    'capybara', 'jabiru', 'person', 'suit', 'scooter', 'car', 'police',
    'drone', 'plane', 'pickup',
    // v1.8.7 — elenco dos distritos da cidade (ideia J)
    'viralata', 'gatobeco', 'pombo', 'reporter', 'pipa', 'helinews',
    'camionete', 'k9', 'tropa', 'dronezig', 'dronesent',
    // v1.8.10 — elenco do deserto (As Areias do Tempo, ideia L)
    'camelo', 'abutre', 'naja', 'flamingo', 'mumia', 'escaravelho',
    'chacal', 'falcao', 'arqueiro',
  ],

  // v1.7: cada bioma tem elenco próprio (antes as mesmas 5 espécies
  // apareciam do zoo à cidade). O sorteio de espécie em SpawnManager.
  // spawnAnimal consulta esta tabela via getBiomeIndex(x).
  BIOME_ANIMALS: {
    jaulas:   ['zookeeper', 'peacock'],
    aviario:  ['bird', 'ostrich', 'eagle'],
    savana:   ['lion', 'zebra', 'giraffe', 'hyena', 'buffalo', 'bluebird'],
    floresta: ['monkey', 'jaguar', 'snake', 'manedwolf'],
    pantano:  ['croc', 'hippo', 'capybara', 'jabiru'],
    cidade:   ['person', 'suit', 'scooter', 'car', 'police', 'drone', 'plane', 'pickup'],
  },

  // Comportamento por espécie: todos avançam contra o rino (velocidade para
  // a esquerda, em px/s). jumpV negativo = impulso do pulo; airTexture = pose
  // congelada no ar. Sub-objetos mutáveis lidos por frame em Animal.preUpdate
  // — o TuningPanel liga sliders direto aqui (efeito ao vivo).
  ANIMAL_BEHAVIOR: {
    lion:    { speed: 160, anim: 'lion-run' },
    giraffe: { speed: 130, anim: 'giraffe-run' },
    monkey:  { speed: 120, jumpV: -380, jumpIntervalMs: 250, airTexture: 'animal-monkey-air' },
    zebra:   { speed: 110, jumpV: -760, jumpIntervalMs: 450, airTexture: 'animal-zebra-air' },
    // anim do pássaro é por espécie (bird-<sp>-flap), resolvida no setType
    bird:    { speed: 180, bobVy: 60 },

    // ---------------------------------------------------- elenco v1.7
    // fly: [yMin, yMax] — faixa de voo no spawn E flag de voador (sem
    // gravidade + ondulação bobVy, como o pássaro). Veículos são "animais"
    // rápidos por ora; mecânicas próprias (dardo da camionete, mergulho da
    // águia, bando de hienas) ficam para a fase calibrada com dados.
    zookeeper: { speed: 100, anim: 'zookeeper-run' },
    peacock:   { speed: 130, anim: 'peacock-run' },
    ostrich:   { speed: 190, anim: 'ostrich-run' },
    eagle:     { speed: 180, bobVy: 55, fly: [420, 520], anim: 'eagle-run' },
    hyena:     { speed: 150, anim: 'hyena-run' },
    buffalo:   { speed: 140, anim: 'buffalo-run' },
    // rasante: voa BAIXO, quase na altura do rino — pulo mal cronometrado bate
    bluebird:  { speed: 210, bobVy: 40, fly: [500, 565], anim: 'bluebird-run' },
    jaguar:    { speed: 170, anim: 'jaguar-run' },
    snake:     { speed: 80,  anim: 'snake-run' },
    manedwolf: { speed: 140, jumpV: -700, jumpIntervalMs: 500, airTexture: 'enemy-manedwolf-air' },
    croc:      { speed: 100, anim: 'croc-run' },
    hippo:     { speed: 120, anim: 'hippo-run' },
    capybara:  { speed: 110, anim: 'capybara-run' },
    jabiru:    { speed: 170, bobVy: 50, fly: [470, 550], anim: 'jabiru-run' },
    person:    { speed: 130, anim: 'person-run' },
    suit:      { speed: 150, anim: 'suit-run' },
    scooter:   { speed: 230, anim: 'scooter-run' },
    car:       { speed: 260, anim: 'car-run' },
    police:    { speed: 240, anim: 'police-run' },
    drone:     { speed: 160, bobVy: 45, fly: [400, 490], anim: 'drone-run' },
    plane:     { speed: 290, bobVy: 30, fly: [330, 410], anim: 'plane-run' },
    pickup:    { speed: 210, anim: 'pickup-run' },

    // ------------------------------- elenco v1.8.7 por DISTRITO (ideia J)
    // Chaves NOVAS de behavior:
    //   zig: { vy, band: [minY, maxY] } — onda triangular: vy constante com
    //     flip quando y sai da banda (clamp); o frame -alt pisca no flip
    //     (telegraph diegético do zag). Zig também vale como flag de voador.
    //   shoot: { ... , tex: 'arrow-projectile' } — atirador (Animal.updateShoot reusa fireDart):
    //     range: [min,max] px do rino (só terrestre; aimed dispensa),
    //     telegraphMs (setTintFill, molde da TranqTower), dartSpeed,
    //     intervalMs (cadência; sem ele = 1 tiro por janela de range),
    //     cap (máx. de exemplares do MESMO tipo atirando em tela),
    //     aimed (tiro mirado no corpo do rino; sem ele, reto horizontal).
    //   sentinel (dronesent): derrubado conta como TORRE (+15, letra `o` de
    //     towersDowned — NUNCA `t`) e devolve o dash — handler na cena
    //     (agente B/C); aqui é só a flag.
    viralata:  { speed: 170, anim: 'viralata-run' },
    gatobeco:  { speed: 140, jumpV: -700, jumpIntervalMs: 450, airTexture: 'enemy-gatobeco-air' },
    // D1 alivia: voa ALTO ([440,520]) — o rasante não entra no subúrbio
    pombo:     { speed: 170, bobVy: 50, fly: [440, 520], anim: 'pombo-run' },
    reporter:  { speed: 150, anim: 'reporter-run' },
    // Zig-zag: sem anim — a rabiola girando (frame -alt) é o telegraph
    pipa:      { speed: 170, zig: { vy: 260, band: [400, 545] } },
    helinews:  { speed: 280, bobVy: 25, fly: [320, 400], anim: 'helinews-run' },
    // 1 dardo quando o rino entra na janela [700,900]px; farol pisca 280ms;
    // dartSpeed 620 = t6−80; cap 1 = nunca duas camionetes atirando juntas
    camionete: { speed: 210, anim: 'pickup-run',
      shoot: { range: [700, 900], telegraphMs: 280, dartSpeed: 620, cap: 1 } },
    k9:        { speed: 150, jumpV: -760, jumpIntervalMs: 400, airTexture: 'enemy-k9-air' },
    tropa:     { speed: 90,  anim: 'tropa-run' },
    dronezig:  { speed: 200, zig: { vy: 300, band: [370, 555] } },
    // Paira (bob curto) e atira mirado a cada 1400ms com laser de 320ms
    dronesent: { speed: 140, bobVy: 20, fly: [360, 430], sentinel: true,
      shoot: { intervalMs: 1400, telegraphMs: 320, dartSpeed: 700, aimed: true } },

    // ---------------- elenco v1.8.10 do DESERTO (As Areias do Tempo)
    // Camelo em disparada: o "scooter" do deserto, rasteiro rápido
    camelo:      { speed: 200, anim: 'camelo-run' },
    // Circula alto com bob largo (40): a silhueta que anuncia a etapa 1
    abutre:      { speed: 160, bobVy: 40, fly: [420, 520], anim: 'abutre-run' },
    // Lenta como a cobra (85 vs 80): o perigo é não VER, não desviar
    naja:        { speed: 85,  anim: 'naja-run' },
    // Voa numa faixa BAIXA ([460,540]): pressiona o pulo no chão traiçoeiro
    flamingo:    { speed: 150, bobVy: 50, fly: [460, 540], anim: 'flamingo-run' },
    // Par obrigatório (spec.pair): lenta, mas nunca vem sozinha
    mumia:       { speed: 80,  anim: 'mumia-run' },
    // O rasteiro mais rápido do deserto: pequeno, baixo e veloz
    escaravelho: { speed: 210, anim: 'escaravelho-run' },
    // Saltador do Vale (molde do k9: −760/400ms; 420ms = pulos mais espaçados)
    chacal:      { speed: 150, jumpV: -760, jumpIntervalMs: 420, airTexture: 'enemy-chacal-air' },
    // Falcão de Hórus: zig SEM anim — o frame -alt piscando no flip é o
    // telegraph do zag (mesmo contrato de pipa/dronezig)
    falcao:      { speed: 190, zig: { vy: 280, band: [380, 545] } },
    // ATIRADOR terrestre (molde da camionete): 1 flecha quando o rino entra
    // em [650,880]px; telegraph de 300ms (o -alt = arco tenso); dartSpeed
    // 640 entre a camionete (620) e o t6 (700); cap 1 = nunca dois arqueiros
    // atirando juntos. Sem anim: o -alt é telegraph, não passada.
    arqueiro:    { speed: 140,
      shoot: { range: [650, 880], telegraphMs: 300, dartSpeed: 640, cap: 1 } },
  },

  // Animações de 2 frames do elenco (enemy-<tipo> → enemy-<tipo>-<sufixo>).
  // Morava dentro do BootScene.createAnimations; subiu para cá na v1.8.9
  // para a aba 🖼️ Sprites (que roda SEM Phaser) e o test-sprites lerem o
  // fps sem regex. O sufixo diz o tipo de movimento (run-1 passada, flap
  // asa, alt parte móvel). Ficam FORA por design: os saltadores de -air
  // (zebra/monkey/manedwolf/gatobeco/k9 — trocam textura por estado) e
  // pipa/dronezig (o -alt deles é telegraph de zig, não frame de corrida).
  ENEMY_ANIMS: [
    ['zookeeper', 'run-1', 8], ['peacock', 'run-1', 8], ['ostrich', 'run-1', 10],
    ['hyena', 'run-1', 10], ['buffalo', 'run-1', 8], ['jaguar', 'run-1', 10],
    ['hippo', 'run-1', 8], ['capybara', 'run-1', 8], ['person', 'run-1', 8],
    ['suit', 'run-1', 8],
    ['eagle', 'flap', 8], ['bluebird', 'flap', 8], ['jabiru', 'flap', 8],
    ['snake', 'alt', 4], ['croc', 'alt', 4], ['car', 'alt', 8],
    ['police', 'alt', 4], ['plane', 'alt', 10], ['drone', 'alt', 8],
    ['pickup', 'alt', 6], ['scooter', 'alt', 8],
    ['viralata', 'run-1', 10], ['pombo', 'flap', 8], ['reporter', 'run-1', 8],
    ['helinews', 'alt', 10], ['tropa', 'run-1', 6], ['dronesent', 'alt', 8],
    // v1.8.10 — deserto. Ficam FORA por design: falcao (o -alt dele é
    // telegraph de zig, não frame de corrida — contrato de pipa/dronezig) e
    // chacal (usa -air como textura de pulo por estado, sem anim, como o k9)
    ['camelo', 'run-1', 10], ['abutre', 'flap', 7], ['naja', 'alt', 4],
    ['flamingo', 'flap', 7], ['mumia', 'run-1', 5], ['escaravelho', 'run-1', 12],
    ['arqueiro', 'alt', 6],
  ],

  // 6 tiers de dificuldade, um a cada 200m (8000px de mundo). Objetos
  // mutáveis lidos a cada spawn/frame — o TuningPanel liga sliders direto
  // aqui. wallW/spikeW/towerW/rampW: frações da roleta de spawn (sobra =
  // animal). animalLeadPx: animais andam contra o fluxo, o vão antes deles
  // encolhe até o encontro — espaço extra no spawn compensa.
  //
  // v1.6: a parede cedeu peso para a rampa E para a torre. Os dados de 512
  // corridas da v1.5 mostraram parede = 68% de todas as mortes e torre = 1%
  // (ela nem existia no t1, onde acontecem 55% das mortes). A fatia do animal
  // ficou praticamente igual; quem pagou a conta foi a parede.
  // t1 também ficou mais generoso no gap: 43% das corridas morriam antes dos
  // 200m e metade dos estreantes não passava do primeiro obstáculo.
  // v1.8 (15/08): animalPackChance — quando a roleta sorteia animal, chance
  // de nascer um SEGUNDO logo à frente (ANIMAL_PACK_OFFSET_PX). Pedido do
  // dono: mais bicho em tela; calibrável por tier no ?debug=1.
  // Preset "denso sem facilitar" (15/08, 2ª rodada): gapMin −15% até o piso
  // de 540 (ciclo do dash — MIN_SAFE_GAP clampa abaixo disso) + par mais
  // frequente. Os PESOS ficaram — a proporção de obstáculos letais é a mesma,
  // só a cadência de encontros subiu.
  // animalEscortChance (3ª rodada): a roleta sozinha tem teto baixo de bicho
  // (fatia do animal = a sobra dos pesos, 22–33% nos tiers iniciais) — a
  // escolta faz um animal nascer JUNTO de parede/espinho/torre, na coreografia
  // dos combos, sem substituir nada. Monte Carlo (4000 corridas simuladas):
  // v1.7 = 1,5 animais/100m; este preset = 3,2; teto com tudo a 100% = ~4,0
  // (o limite é o nº de slots — passar disso exige mexer nos PESOS, o que
  // facilita o jogo, ou nos gaps abaixo do piso do dash, não recomendado).
  DIFFICULTY_TIERS: [
    { gapMin: 850,  gapRand: 150, animalSpeedMult: 1.0,  animalLeadPx: 350, wallW: 0.42, spikeW: 0.20, towerW: 0.06, rampW: 0.10, comboChance: 0,    animalPackChance: 0.50, animalEscortChance: 0.60, towerIntervalMs: 1200, dartSpeed: 460 },
    { gapMin: 650,  gapRand: 140, animalSpeedMult: 1.15, animalLeadPx: 400, wallW: 0.33, spikeW: 0.15, towerW: 0.12, rampW: 0.10, comboChance: 0.15, animalPackChance: 0.55, animalEscortChance: 0.65, towerIntervalMs: 1000, dartSpeed: 460 },
    { gapMin: 550,  gapRand: 120, animalSpeedMult: 1.35, animalLeadPx: 450, wallW: 0.24, spikeW: 0.14, towerW: 0.17, rampW: 0.12, comboChance: 0.25, animalPackChance: 0.60, animalEscortChance: 0.70, towerIntervalMs: 800,  dartSpeed: 540 },
    { gapMin: 540,  gapRand: 100, animalSpeedMult: 1.6,  animalLeadPx: 500, wallW: 0.18, spikeW: 0.12, towerW: 0.20, rampW: 0.12, comboChance: 0.35, animalPackChance: 0.65, animalEscortChance: 0.75, towerIntervalMs: 650,  dartSpeed: 620 },
    // Modo infinito (pós-portão). t6 é o TETO — justo mas implacável:
    // dardo 700 = fechamento 1150px/s → ~0,73s de reação + telegraph;
    // gapMin 540 = piso do ciclo do dash (1,2s × 450px/s), nunca abaixo.
    { gapMin: 540,  gapRand: 90,  animalSpeedMult: 1.8,  animalLeadPx: 520, wallW: 0.14, spikeW: 0.12, towerW: 0.22, rampW: 0.14, comboChance: 0.42, animalPackChance: 0.70, animalEscortChance: 0.80, towerIntervalMs: 580,  dartSpeed: 660 },
    { gapMin: 540,  gapRand: 80,  animalSpeedMult: 2.0,  animalLeadPx: 560, wallW: 0.12, spikeW: 0.12, towerW: 0.24, rampW: 0.14, comboChance: 0.50, animalPackChance: 0.75, animalEscortChance: 0.80, towerIntervalMs: 520,  dartSpeed: 700 },
  ],

  // Distância do segundo animal do par (à frente do primeiro)
  ANIMAL_PACK_OFFSET_PX: 300,

  // Knockback do animal atropelado: diagonal superior DIREITA (v1.8, 15/08 —
  // era esquerda e mais lento; a rotação continua a mesma no Animal.knockback)
  ANIMAL_KB_VX_MIN: 350,
  ANIMAL_KB_VX_MAX: 650,
  ANIMAL_KB_VY_MIN: -800,
  ANIMAL_KB_VY_MAX: -500,

  // Abertura guiada: os 3 primeiros obstáculos são FIXOS e em ordem de lição.
  // Antes da v1.6 o primeiro obstáculo nascia em x=1480 (34m, 4,3s de corrida)
  // e em 55% dos casos era uma parede — que exige dash E altura certa ao mesmo
  // tempo. 83 das 512 corridas medidas terminaram exatamente em 34m, e a
  // mediana da PRIMEIRA corrida de cada jogador era 34m.
  // A rampa abre a sequência de propósito: é o obstáculo que não mata.
  OPENING_SCRIPT: [
    { x: 3600, kind: 'ramp',  variant: 'small',  hint: 'Suba o morro! 🏔️' },
    { x: 5000, kind: 'spike', variant: 'ground', hint: 'Toque à ESQUERDA para pular ⬅️' },
    { x: 6400, kind: 'wall',  variant: 'ground', hint: 'Toque à DIREITA para investir ➡️' },
  ],
  // A roleta assume a partir daqui (190m) — 1200px depois da parede do script
  OPENING_END_X: 7600,
  // Dicas na tela só nas 3 primeiras corridas da vida do jogador
  OPENING_HINT_MAX_ATTEMPTS: 3,

  // 1º disparo da torre ao entrar em cena: só o tempo do telegraph —
  // "atira imediatamente quando entra na tela"
  TOWER_FIRST_SHOT_MS: 300,

  // Biomas do cenário, um a cada 200m: os 5 primeiros cobrem exatamente o
  // percurso até o portão (1000m) e a CIDADE é o 6º, entrando na fuga.
  // As texturas são `bg-far-<nome>` / `bg-near-<nome>` (TextureFactory).
  BIOMES: ['jaulas', 'aviario', 'savana', 'floresta', 'pantano', 'cidade'],

  // Nome do setor anunciado na travessia do arco (ver switchBiome)
  BIOME_LABELS: {
    jaulas: '🦁 ALA DAS JAULAS',
    aviario: '🦜 VIVEIRO DAS AVES',
    savana: '🦓 SAVANA',
    floresta: '🌴 FLORESTA TROPICAL',
    pantano: '🐊 PÂNTANO',
    cidade: '🌆 A CIDADE',
  },

  // Clampado no último bioma: a cidade começa exatamente no portão (x=40000)
  // e vale para sempre no modo infinito.
  getBiomeIndex(x) {
    return Math.min(this.BIOMES.length - 1, Math.floor(x / 8000));
  },

  // ------------------------------------ v1.8.7: distritos da cidade (ideia J)
  // A cidade deixa de ser um skin infinito e vira um arco em 3 distritos
  // (dorme → acorda → caça) + Brecha + rodovia. O dado que motiva (§4.3 do
  // IDEIAS-FUTURAS): das 61 corridas pós-portão da janela, a mediana morre
  // aos 1.224m — DENTRO do 1º distrito; só 3% passam de 1.400m. O conteúdo
  // novo é gasto exatamente onde os jogadores reais estão.
  // NADA aqui toca getBiomeIndex/getTierIndex/weatherFor — a régua de 8000px
  // continua mandando em tier e clima; esta tabela é consultada só por
  // visual (skins/portais) e spawn (elenco/pesos).
  //   from     — x de mundo onde a área começa (a última com from <= x vence)
  //   wallSkin — família de textura da PAREDE quebrável (só ela: espinho/
  //              torre/rampa seguem na família -city, ver skinFor)
  //   cast     — elenco de animais da área; null = elenco legado da cidade
  //   weights  — override de pesos da roleta por cima do tier (ex.: D1
  //              towerW 0.24→0.16 — a sobra vira rasteiro: mesma pressão,
  //              leitura mais baixa e honesta, onde a mediana de 1.224m morre)
  //   breach   — true = só rampa-trampolim + pombo (a volta olímpica)
  CITY_DISTRICTS: [
    { from: 40000, key: 'suburbio',  label: '🌙 SUBÚRBIO SONOLENTO', wallSkin: '-suburbio',
      cast: ['person', 'suit', 'scooter', 'viralata', 'gatobeco', 'pombo', 'reporter'],
      weights: { towerW: 0.16 }, breach: false },
    { from: 56000, key: 'vidro',     label: '📡 O DESPERTAR', wallSkin: '-vidro',
      cast: ['car', 'police', 'drone', 'reporter', 'pipa', 'helinews', 'camionete', 'k9'],
      weights: {}, breach: false },
    { from: 72000, key: 'contencao', label: '🚨 ZONA DE CONTENÇÃO', wallSkin: '-contencao',
      cast: ['plane', 'pickup', 'camionete', 'k9', 'tropa', 'dronezig', 'dronesent'],
      weights: {}, breach: false },
    { from: 81000, key: 'brecha',    label: '🌅 A BRECHA', wallSkin: '-contencao',
      cast: ['pombo'], weights: {}, breach: true },

    // ------------- v1.8.10 "AS AREIAS DO TEMPO" (ideia L): o deserto em 5
    // etapas de 500m (2200–4700m) + o infinito, no slot da antiga `rodovia`.
    // A tese: *a cidade caçava; o deserto engole* — a mediana pós-portão
    // morre aos 1.224m (§4.3 do IDEIAS-FUTURAS) e o funil afunila rápido,
    // então a 1ª etapa é respiro pós-Muralha e a pressão escala etapa a
    // etapa até o exame mais agressivo do jogo (Faraó, 4700m).
    // Campos NOVOS por área (opcionais, lidos por switchArea/skinFor):
    //   propSkin — família de espinho/torre/rampa (antes hard-coded -city)
    //   ground/fg — texturas de chão e primeiro plano do trecho
    //   cars: false — some o tráfego de fundo (não há carros na areia)
    //   skyLife — fauna do céu de fundo ('deserto' = abutres ao longe)
    { from: 88000,  key: 'duna',      label: '🐫 ESTRADA ENGOLIDA', wallSkin: '-ruina', propSkin: '-egito',
      ground: 'ground-desert', fg: 'bg-fg-desert', cars: false, skyLife: 'deserto',
      // Respiro pós-boss: towerW 0.24 (t6) → 0.10 — a sobra vira rasteiro,
      // leitura baixa e honesta na chegada ao bioma novo
      cast: ['camelo', 'abutre', 'naja', 'ostrich', 'snake'],
      weights: { towerW: 0.10 }, breach: false },
    { from: 108000, key: 'oasis',     label: '🌴 MIRAGEM DO OÁSIS', wallSkin: '-ruina', propSkin: '-egito',
      ground: 'ground-desert', fg: 'bg-fg-desert', cars: false, skyLife: 'deserto',
      // Chão traiçoeiro é o tema: menos torre (0.08), MAIS parede (0.20 vs
      // 0.12 do t6) — a leitura fica rente à água
      cast: ['croc', 'naja', 'flamingo', 'abutre', 'capybara'],
      weights: { towerW: 0.08, wallW: 0.20 }, breach: false },
    { from: 128000, key: 'escavacao', label: '⛏️ SÍTIO DA ESCAVAÇÃO', wallSkin: '-ruina', propSkin: '-egito',
      ground: 'ground-desert', fg: 'bg-fg-desert', cars: false, skyLife: 'deserto',
      // Pesos do t6 puros daqui em diante: o funil já filtrou quem chegou
      cast: ['mumia', 'escaravelho', 'arqueiro', 'person', 'abutre'],
      weights: {}, breach: false },
    { from: 148000, key: 'vale',      label: '🔺 VALE DOS FARAÓS', wallSkin: '-piramide', propSkin: '-egito',
      ground: 'ground-desert', fg: 'bg-fg-desert', cars: false, skyLife: 'deserto',
      cast: ['chacal', 'falcao', 'arqueiro', 'escaravelho', 'mumia'],
      weights: {}, breach: false },
    { from: 168000, key: 'necropole', label: '⚰️ NECRÓPOLE DE AREIA', wallSkin: '-piramide', propSkin: '-egito',
      ground: 'ground-desert', fg: 'bg-fg-desert', cars: false, skyLife: 'deserto',
      // O exame: teto real do jogo, tudo junto, na tempestade de areia
      cast: ['mumia', 'chacal', 'falcao', 'arqueiro', 'escaravelho', 'naja'],
      weights: {}, breach: false },
    // O DESERTO PROFUNDO (pós-Faraó, infinito até o Guardião do Fim):
    // elenco = a UNIÃO das 5 etapas — depois da muralha, o deserto inteiro
    { from: 189000, key: 'deserto',   label: null, wallSkin: '-piramide', propSkin: '-egito',
      ground: 'ground-desert', fg: 'bg-fg-desert', cars: false, skyLife: 'deserto',
      cast: ['camelo', 'abutre', 'naja', 'ostrich', 'snake', 'croc', 'flamingo',
        'capybara', 'mumia', 'escaravelho', 'arqueiro', 'person', 'chacal', 'falcao'],
      weights: {}, breach: false },
  ],

  // Índice da área da cidade para um x de mundo: −1 antes do portão, senão a
  // última entrada de CITY_DISTRICTS com from <= x. Puro — visual e spawn
  // consultam sem efeito colateral.
  getCityAreaIndex(x) {
    if (x < this.WIN_DISTANCE_PX) return -1;
    let idx = -1;
    for (let i = 0; i < this.CITY_DISTRICTS.length; i++) {
      if (this.CITY_DISTRICTS[i].from <= x) idx = i;
    }
    return idx;
  },

  // A área da cidade que contém x, ou null (antes do portão)
  cityAreaFor(x) {
    const i = this.getCityAreaIndex(x);
    return i < 0 ? null : this.CITY_DISTRICTS[i];
  },

  // Família de skin de um obstáculo na posição x. Fora da cidade '' (zoo);
  // dentro, a PAREDE tem família por distrito (wallSkin) e todo o resto
  // (espinho/torre/rampa) usa o propSkin da área — v1.8.10: era '-city'
  // hard-coded, o que vestiria espinho/torre/rampa do deserto de concreto
  // urbano; áreas sem propSkin (as 4 da cidade + Brecha) caem no -city.
  skinFor(x, kind = 'wall') {
    const area = this.cityAreaFor(x);
    if (!area) return '';
    return kind === 'wall' ? area.wallSkin : (area.propSkin || '-city');
  },

  // y de spawn de um voador de escolta/combo. O y histórico é 470 (fixo);
  // um tipo cuja banda de voo/zig NÃO contém 470 nasceria fora dela e o 1º
  // frame seria um mergulho não-telegrafado — nesse caso, o centro da banda.
  flyerSpawnY(type) {
    const b = this.ANIMAL_BEHAVIOR[type] || {};
    const band = b.fly || (b.zig && b.zig.band) ||
      (type === 'bird' ? [410, 520] : null);
    if (!band) return 470;
    return band[0] <= 470 && 470 <= band[1] ? 470 : (band[0] + band[1]) / 2;
  },

  // ------------------------------------------------------------ céu e clima
  // Até 1450m o céu segue a curva narrativa: dia pleno, entardecer chegando
  // junto com o portão (a fuga acontece no pôr do sol) e noite no modo
  // infinito. Dali em diante ele CICLA em vez de saturar — na v1.5 a noite
  // fechava e nunca mais mudava, justo onde os melhores jogadores estão.
  SKY_CYCLE_START_PX: 58000, // 1450m
  SKY_CYCLE_PX: 24000,       // um dia inteiro a cada 600m
  // Âncoras da curva narrativa (px): entardecer 800→1000m, noite 1000→1450m
  SKY_DUSK_FROM: 32000,
  SKY_DUSK_TO: 40000,
  SKY_NIGHT_TO: 58000,

  // Clima por faixa de 200m. As 8 primeiras faixas (0–1600m) são
  // ROTEIRIZADAS, não sorteadas — sorteando, a tempestade só cairia por volta
  // dos 2000m, ACIMA do recorde mundial (1654m): ninguém veria o efeito mais
  // caro do jogo. Os 400m iniciais ficam limpos porque é onde 43% das
  // corridas terminam e quem está aprendendo precisa de leitura limpa.
  // v1.6: cada clima casa com o bioma da faixa.
  WEATHER_SCRIPT: [
    'limpo',      //    0–200m  jaulas — aprendizado
    'limpo',      //  200–400m  aviário
    'chuva',      //  400–600m  savana (39% das corridas veem)
    'neblina',    //  600–800m  floresta tropical — a neblina é o tema
    'limpo',      //  800–1000m pântano: reta do portão, leitura limpa
    'tempestade', // 1000–1200m cidade — o show, logo depois da fuga
    'limpo',      // 1200–1400m
    'chuva',      // 1400–1600m
    // v1.8.7 (ideia J): 8→11 faixas — o roteiro cobre os distritos inteiros
    'chuva',      // 1600–1800m  chuva do rush no Despertar (legível)
    'limpo',      // 1800–2000m  corredor pré-boss: neblina sorteada (34% de
                  //             alpha) seria ilegível sobre holofote/telegraph
    'limpo',      // 2000–2200m  a Brecha — a volta olímpica amanhece limpa
    // v1.8.10 (ideia L): 11→24 faixas — o roteiro cobre o deserto INTEIRO
    // (2200–4800m). Deserto SEM chuva, por clima e por tese; a neblina aqui
    // é MIRAGEM/POEIRA e a tempestade é DE AREIA (leitura visual do agente
    // C, mesma mecânica). Roteirizado porque o hash pós-roteiro sorteava
    // tempestade em cima do Cerco (3650m) — telegraph ilegível na luta.
    'limpo',      // 2200–2400m  duna — chegada ao bioma novo, leitura limpa
    'limpo',      // 2400–2600m  duna
    'limpo',      // 2600–2800m  duna/oásis
    'neblina',    // 2800–3000m  oásis — a MIRAGEM (neblina rebatizada)
    'limpo',      // 3000–3200m  oásis
    'neblina',    // 3200–3400m  escavação — poeira do sítio
    'limpo',      // 3400–3600m  corredor limpo pré-Cerco
    'limpo',      // 3600–3800m  a BARREIRA (3650m) luta em céu limpo
    'limpo',      // 3800–4000m  vale — respiro pós-miniboss
    'tempestade', // 4000–4200m  vale — a tempestade de areia arma
    'tempestade', // 4200–4400m  necrópole — o exame, tudo junto
    'limpo',      // 4400–4600m  corredor limpo pré-Faraó
    'limpo',      // 4600–4800m  o FARAÓ (4700m) luta em céu limpo
  ],
  // Teto de alpha da neblina: acima disto ela começa a esconder obstáculo
  FOG_MAX_ALPHA: 0.34,

  // Determinístico: mesma corrida → mesmo clima no mesmo trecho, nunca
  // sorteado por frame. Depois do roteiro, 40% limpo / 26% chuva /
  // 20% neblina / 14% tempestade por hash da faixa.
  weatherFor(x) {
    const band = Math.floor(x / 8000);
    if (band < this.WEATHER_SCRIPT.length) return this.WEATHER_SCRIPT[band];
    // Mix inteiro (finalizador estilo murmur): o Knuth puro tem os dígitos
    // baixos mal distribuídos e concentrava tudo em "limpo"
    let h = Math.imul(band + 1, 2654435761);
    h ^= h >>> 15; h = Math.imul(h, 2246822519);
    h ^= h >>> 13; h = Math.imul(h, 3266489917);
    h = (h ^ (h >>> 16)) >>> 0;
    const v = h % 100;
    if (v < 40) return 'limpo';
    if (v < 66) return 'chuva';
    if (v < 86) return 'neblina';
    return 'tempestade';
  },

  // Tier vigente para uma posição x do mundo (0–5; t6 = teto, clampado)
  getTierIndex(x) {
    return Math.min(5, Math.floor(x / 8000));
  },

  getTierFor(x) {
    return this.DIFFICULTY_TIERS[this.getTierIndex(x)];
  },

  // Estado por frame: GameScene.update escreve a partir da posição do rino;
  // Animal.preUpdate lê — animais já em tela aceleram na troca de tier
  TIER_STATE: { animalSpeedMult: 1 },
};

// ------------------------------------------------------- aba 🖼️ Sprites
// Calibração do dono POR CIMA dos valores de design (js/art/SpriteParams.js,
// gravado pela aba Sprites do /?setup com portão de teste e rollback).
// REESCREVER este arquivo pelo servidor é PROIBIDO — os comentários acima
// são a memória de design do projeto; o dado do dono vive no SpriteParams.
// ⚠️ Consequência assumida: chave com override ativo torna a edição manual
// do valor correspondente AQUI silenciosamente inócua — a aba mostra o
// badge "override" e o test-sprites avisa overrides no-op.
//
// SPRITE_BASE = clone PRÉ-merge (a UI distingue design × override por ele).
// O merge MUTA os objetos existentes (nunca substitui referências —
// TuningPanel, e2e e TIER_STATE seguram referências vivas).
Constants.SPRITE_BASE = JSON.parse(JSON.stringify({
  specs: Constants.ANIMAL_SPECS, behavior: Constants.ANIMAL_BEHAVIOR,
}));
// 1º as espécies criadas pela aba (entram nas 5 tabelas como se fossem de
// design) — ANTES dos overrides, para que um ajuste salvo numa espécie
// criada também se aplique
Constants.SPRITE_NEW = SPRITE_PARAMS.novas || [];
for (const n of Constants.SPRITE_NEW) {
  Constants.ANIMAL_SPECS[n.id] = JSON.parse(JSON.stringify(n.specs));
  Constants.ANIMAL_BEHAVIOR[n.id] = JSON.parse(JSON.stringify(n.behavior));
  Constants.ANIMAL_TYPES.push(n.id);
  for (const b of (n.casts && n.casts.biomas) || []) {
    if (Constants.BIOME_ANIMALS[b]) Constants.BIOME_ANIMALS[b].push(n.id);
  }
  for (const d of (n.casts && n.casts.distritos) || []) {
    const area = Constants.CITY_DISTRICTS.find((x) => x.key === d);
    if (area && area.cast) area.cast.push(n.id);
  }
}
// 2º os overrides (calibração por cima do design E das criadas)
for (const [type, o] of Object.entries(SPRITE_PARAMS.overrides || {})) {
  for (const [src, dst] of [[o.specs, Constants.ANIMAL_SPECS[type]],
    [o.behavior, Constants.ANIMAL_BEHAVIOR[type]]]) {
    if (!src || !dst) continue;
    for (const [k, v] of Object.entries(src)) {
      if (v === null) delete dst[k];
      else dst[k] = v;
    }
  }
}
