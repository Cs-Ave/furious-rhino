# FURIOUS RHINO — Documento de Design

> Estado atual do jogo (v1.6.0). Este documento descreve o que **é**, não o que
> se imaginou no começo — as decisões de v1.1 em diante estão registradas aqui
> com o motivo, e várias delas foram tomadas a partir dos dados reais de
> telemetria (ver "Decisões orientadas por dados" no fim).

## 🎮 Conceito

Um rinoceronte rabujento decide fugir do zoológico, investindo contra tudo em
linha reta. Auto-runner de ação para **web mobile em paisagem**, sessões curtas,
tom caótico e divertido.

- **Plataforma**: navegador (PWA instalável). 2/3 do público joga em celular.
- **Engine**: Phaser 3.85.2 via CDN, ES modules, **sem etapa de build**.
- **Física**: Arcade (AABB alinhado aos eixos — ver "Terreno" para as
  consequências disso).
- **Arte**: SVG para personagens (`art/`), procedural via `Graphics` para
  cenário e obstáculos (`TextureFactory`). Nenhum arquivo de áudio: todo o som
  é sintetizado em Web Audio (`AudioSystem`).

## 🦏 O rinoceronte

- Corre sozinho para a direita a `RUN_SPEED` 300 px/s, multiplicado por
  `1 + fúria × 0,5` — 450 px/s com a fúria cheia (36.000px = 900m, 90% do
  caminho até o portão).
- **Pulo (toque à esquerda, `←` ou `ESPAÇO`)**: cada toque impulsiona, sem
  limite de pulos (encadeável tipo flappy). **Segurar** aumenta a altura: a
  força vai de -540 a -880 em 2s. A queda tem gravidade extra (1400 + 700).
- **Investida (toque à direita, `→` ou `ENTER`)**: 200ms a 750 px/s, 1s de
  recarga. No ar,
  desliga a gravidade — voo horizontal puro. É a investida que **quebra parede,
  derruba torre, atropela animal, estoura dardo e destrói morro**.
- **Fúria**: cresce com a distância. Muda velocidade, tinge o rino de vermelho,
  solta fumaça pelas narinas e sobe a intensidade da música.

## 🧱 Obstáculos

| Tipo | Como se resolve | Mata? |
|---|---|---|
| **Parede rachada** | Investir **alinhado à fresta** (3 alturas: chão / meio / alto) | sim |
| **Espinhos** | Pular. Variante em pedestal também é letal no pedestal | sim |
| **Animais** | Atropelar na investida, ou pular | sim |
| **Torre tranquilizante** | Derrubar na investida, ou desviar dos dardos | sim |
| **Morro / trampolim** | Subir e descer, ou destruir na investida rasante | **não** |
| **Dardo** | Pular, ou estourar no chifre durante a investida | sim |

**Torre**: atira alternando tiro reto mirado em 360° e morteiro em arco, com
telegraph de 280ms. Derrubá-la **devolve a investida na hora** (sem recarga) —
é o que a transforma de pedágio em oportunidade.

**Morro / trampolim** (`Ramp`) — três variantes:
- `small` e `big`: sobe, platô, desce. O `big` ganha 150px de altura, mais que
  um toque de pulo, e do topo dá para pular muito mais longe.
- `jump`: penhasco. A crista dá um impulso de -520 e lança o rino ~265px à
  frente (bem mais com fúria). **É a variante mais comum** — 2/3 dos sorteios
  de rampa no primeiro trecho e 3/5 dali em diante (`Constants.RAMP_POOL`):
  a sensação de voo é o que o jogo tem de mais divertido.
- **Investida rasante na base destrói o morro inteiro** e abre passagem plana.
  Investir no meio da subida não destrói: só acelera a escalada e lança mais
  longe. **A rampa nunca mata** — é o obstáculo que ensina.

## 🏔️ Terreno — por que a rampa não é um corpo de colisão

Arcade Physics só conhece AABB alinhado ao eixo: **não existe colisão com
superfície inclinada**. Uma escada de corpos estáticos foi testada em projeto e
descartada — a separação zera o `velocityX`, o `FurySystem` o reescreve no frame
seguinte, e o rino fica tremendo parado na lateral do degrau. *Soft-lock é pior
que morte.*

A rampa é **terreno**: expõe `surfaceY(x)` e a `GameScene` encaixa o `body` do
rino (e dos animais terrestres) nessa superfície uma vez por frame, em
`updateTerrain()`, **antes** de `rhino.update()`. Consequências:

- `Rhino.js` não sabe que rampas existem — lê `blocked.down` como sempre.
- Não há tunelamento: é *clamp* posicional por X, não colisão varrida. A 60, 30
  ou 15 fps o pé cai exatamente na superfície.
- A superfície começa e termina em y=620, então o collider do chão único
  (404.000px) e o resolvedor manual nunca brigam.

## 📊 Progressão

- **1 metro = 1 ponto**. Recorde local + ranking mundial (Firestore).
- **Portão dos 1000m** = a fuga. Cruzar conta a vitória **sem parar a corrida** —
  o modo infinito começa na mesma passada. Ao cruzar, o portão **explode**
  (estilhaços, flash, tremor de câmera), sobem fogos e confete, e o cenário vira
  a **cidade**. O fim físico do mundo é 10.000m ("LENDA").
- **6 tiers de dificuldade**, um a cada 200m. Cada tier tem sua roleta de spawn
  (parede / espinho / torre / rampa; a sobra é animal), vão mínimo, velocidade
  dos animais, cadência e velocidade dos dardos.
- **Abertura roteirizada** (`OPENING_SCRIPT`): os 3 primeiros obstáculos são
  fixos e em ordem de lição — rampa aos 90m (não mata), espinho aos 125m (um
  pulo), parede aos 160m (a investida) — com dica na tela nas 3 primeiras
  corridas da vida do jogador. A roleta só assume aos 190m.

## 🎨 Cenário

- **6 biomas**: jaulas → aviário → savana → floresta tropical → pântano (um a
  cada 200m, cobrindo o percurso até o portão) e **cidade** no modo infinito.
  A troca é um **acontecimento**: um arco de setor atravessa a tela, a luz
  estoura, o nome do setor aparece e o crossfade roda em 500ms.
- **Na cidade TODO obstáculo troca de material** (mesma mecânica, mesmas
  hitboxes — só grafismo): chão vira asfalto, entra uma faixa de **tráfego**
  com scroll próprio, a **parede vira fachada de prédio** com coroamento
  (Empire State / Chrysler / torre de relógio, um por altura de fresta), o
  **pedestal do espinho** vira concreto com faixa de perigo, a **rampa** vira
  concreto e asfalto com pichação, e a **torre** vira poste de vigilância com
  caixa d'água. O padrão é o `setSkin` do `CrackedWall`, replicado nas quatro
  entidades e decidido por posição no `SpawnManager`.
- A **população do céu** muda com o bioma: enxame de aves no aviário, quase
  nada no pântano, pombos na cidade.
- **Céu**: dia pleno, entardecer chegando junto com o portão (a fuga acontece no
  pôr do sol), noite no modo infinito — e a partir de 1450m ele **cicla** (um dia
  inteiro a cada 600m) em vez de saturar.
- **Clima**: limpo / chuva / neblina / tempestade com raios e trovão. As 8
  primeiras faixas são roteirizadas e casam com o bioma (neblina na floresta,
  tempestade na cidade logo após a fuga); dali em diante é sorteado por hash da
  faixa (determinístico).
- **Parallax**: nuvens 0,05 · montanhas 0,06 · fundo 0,15 · médio 0,4 ·
  **primeiro plano 1,5** (na frente do rino, restrito à faixa abaixo da linha do
  chão para nunca esconder obstáculo).
- Regra permanente: **tint atmosférico jamais em elemento de gameplay**.

## 🏁 Engajamento

- **Marcas na pista**: estacas com nome e distância do **seu recorde**, do
  **rival imediatamente acima de você no ranking** e do **líder mundial**.
  Ultrapassar cada uma provoca o jogador na tela. Lidas de cache local — a
  corrida nunca espera a rede.
- **Medalhas** locais (sem rede), de "Primeira Fuga" a "Inalcançável" (2000m),
  incluindo Escavadeira (3 morros destruídos) e Torre Abaixo (2 torres).
- **Ranking mundial** com apelido único, **convite por WhatsApp** e alerta de
  instalação do PWA (nunca bloqueante).
- **Nome próprio**: quem escolhe "Ficar anônimo" recebe um `Anonimo_N` e fica
  marcado como nome automático. O jogo volta a convidar **no momento do
  orgulho** — logo depois de o score subir no ranking — com o texto dizendo o
  que está em jogo ("🏆 Você é o #7 do mundo!"), no máximo 1 vez a cada 3
  corridas. A recusa vira "Agora não" e não regrava nada. Nunca bloqueia.
- **Pausa**: botão no HUD e `P`/`ESC`; a aba escondida pausa sozinha. O tempo
  parado é descontado da telemetria (`runS` é relógio de parede).

## 📡 Telemetria, visibilidade e notificações (v1.6.1)

Três públicos, três canais — e **nenhum campo novo de primeiro nível** no
Firestore (regra de arquitetura nº 2 abaixo).

### O que é medido

| Onde | Campos | Por que ali |
|---|---|---|
| `runs[]` (últimas 50) | `t, m, s, c` + `w` paredes, `r` rampas, `o` torres, `a` animais, `j` pulos, `d` investidas, `x` investidas negadas no cooldown, `p` pausas, `k` teclado, `v` versão | As rules validam só `is list && size() <= 50` — a FORMA do elemento é livre. Sai de graça. |
| `history.days` | `{'AAAA-MM-DD': {r, s, b}}`, 60 dias, poda por idade | Contagem exata de execuções/sessões/melhor marca por dia. `runs[]` só guarda 50 e falsearia dias muito ativos. |
| `client.tz` | fuso do aparelho | Conferência cruzada do geo por IP: VPN aparece como divergência. |
| `geo.at` | epoch da medição | Deixa o painel dizer a IDADE da localização. |

Fúria ficou **de fora de propósito**: ela é posicional
(`Rhino.getFuryRatio = x / FURY_FULL_DISTANCE_PX`), então já está contida no
`m` — gravá-la seria redundância paga em bytes.

**Cidade sempre atual.** O TTL do geo caiu de 30 dias para 12h, a revalidação
roda na tela inicial (fire-and-forget, tirando a rede do fim de corrida) e uma
falha de revalidação passa a **preservar** a última cidade conhecida — antes o
`setDoc` sem merge apagava o campo `geo` inteiro. No painel, a coluna *Local*
mostra a **última** cidade; a mais frequente virou a seção "de onde já jogou".

### Quem vê o quê

- **Jogador** — botão `📊 Minhas estatísticas` na tela inicial. Tudo do
  `localStorage`: abre instantâneo e funciona offline. A comparação mundial usa
  o rank e os rivais que o jogo já cacheia, então também é de graça.
  Compartilhamento em markdown do WhatsApp, com `wa.me` como caminho de
  desktop (onde não existe `navigator.share`).
- **Administrador, ao vivo** — pushes no ntfy: início de sessão (1× por aba),
  resumo quando a sessão encerra e recorde mundial (confirmado com uma consulta
  nova ao topo, nunca por cache). Publicação direta do navegador: JSON no
  endpoint raiz, que mantém a requisição *simple* e evita preflight CORS.
- **Administrador, diário** — `tools/daily-digest.mjs` num cron do GitHub
  Actions. Dispara **mesmo nos dias sem jogadores**, que é justamente a
  informação mais importante.

Parâmetros em `js/notify-config.js` (defaults versionados) sobrepostos pelo doc
`config/notify` do Firestore, editável no console sem deploy. **`topic` nasce
vazio**: sem tópico o sistema inteiro fica desligado, e quem clonar o
repositório não passa a notificar ninguém.

### O painel `/?stats`

Seis abas (Visão geral, Dificuldade, Engajamento, Mecânicas, Público,
Jogadores), gráficos em SVG desenhados à mão (`js/stats/Charts.js`, zero
dependência) e filtro de período. Os cruzamentos que antes exigiam exportar os
dados agora estão na tela: histograma das distâncias de morte, heatmap
causa × faixa de distância, curva de aprendizado, retenção D1–D30 e
**jogadores únicos/dia × execuções/dia**.

## 🔒 Regras de arquitetura (não negociáveis)

1. **Telemetria e ranking são acessórios.** Um erro de rede, de regra do
   servidor ou de módulo velho em cache **não pode derrubar o jogo**
   (`safeTelemetry`).
2. **Orçamento das rules do Firestore.** Dezenas de cláusulas sobre campos
   soltos estouram o orçamento de avaliação e passam a negar writes legítimos
   (constatado: 19 campos passavam, 20 falhavam). Campos novos entram **dentro
   dos mapas existentes**, validados como um mapa só.
3. **Service worker**: todo arquivo `.js` novo entra em `ASSETS` **e** o `CACHE`
   sobe de versão. Esquecer = 404 para quem tem o PWA instalado.
4. **`fillGradientStyle` não renderiza no SwiftShader** (screenshots headless
   dos testes) — usar `fillVerticalGradient` (faixas interpoladas).
5. **`fillRect` com largura negativa corrompe o batch WebGL** do `Graphics` e
   apaga, em silêncio, o resto da textura.
6. **Tiles de 640px precisam emendar**: formas nas bordas ganham cópia ±640.
7. **Validação local do dono antes de qualquer publicação.**

## 📈 Decisões orientadas por dados (v1.6)

Leitura de 48 jogadores, 981 tentativas, 512 corridas e 945 mortes da v1.5:

| O que os dados mostraram | O que mudou |
|---|---|
| **83 de 512 corridas (16%) terminavam em 34m** — o primeiro obstáculo, fixo em x=1480, era parede em 55% dos casos. A mediana da 1ª corrida de cada jogador era 34m. | Abertura roteirizada: primeiro obstáculo aos 90m e é uma rampa, que não mata. |
| **Parede = 68% de todas as mortes.** | `wallW` caiu de 0,55→0,42 (t1) e 0,26→0,12 (t6), cedendo para rampa e torre. |
| **Torre = 1% das mortes**, porque `towerW` era **0 no t1** — onde acontecem 55% das mortes — e derrubá-la não pagava nada. | Torre no t1, peso maior em todos os tiers, e derrubá-la devolve a investida na hora. |
| **91% das corridas nunca passam dos 800m**; o fundo congelava exatamente aí. | Céu cíclico depois de 1300m, clima, arcos de setor e primeiro plano. |
| **Recorde mundial 1654m**, num mundo de 10.000m. | Medalhas de 1600m e 2000m; clima roteirizado para a tempestade cair aos 1000m. |
| A torre não existia no t1 e derrubá-la não pagava nada. | Torre no t1 e a investida volta na hora ao derrubá-la. |
| Os 5 biomas eram variações da mesma cena e o cenário congelava após a fuga. | 6 biomas com tema forte, portão movido para 1000m (5 trechos de 200m cabem inteiros) e a cidade no modo infinito. |
| A análise só foi possível pelas 50 últimas corridas de cada jogador — mas sem duração nem causa. | `runs[]` passou a gravar `{t, m, s, c}` (segundos e desfecho), sem tocar nas rules. |

## 🧪 Testes

| Comando | O que cobre |
|---|---|
| `npm run test-stats` | 69 asserts de telemetria/agregação e do resumo diário, sem navegador |
| `npm run test-e2e-stats` | 66 asserts em Chromium: telemetria real, portão, as 6 abas do painel, resumo do jogador, compartilhamento e os padrões do ntfy |
| `npm run digest` | Monta o resumo diário contra os dados de produção **sem enviar** |
| `npm run test-ramp` | 30 asserts em Chromium: travessia da rampa, trampolim, destruição, animais no morro, 20fps, abertura guiada, marcas na pista, explosão do portão, paredes-prédio, teclas de PC, pausa, convite do apelido e os skins de cidade de todos os obstáculos |

Os dois e2e exigem o jogo servido em `localhost:3000` (`python -m http.server 3000`).
