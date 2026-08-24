# FURIOUS RHINO — Documento de Design

> Estado atual do jogo (v1.9.3). Este documento descreve o que **é**, não o que
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
- **Fúria (v1.7: virou uma CARGA gastável)**: enche com a distância percorrida
  (a primeira aos 900m) e, cheia, pode ser **gasta** na **FÚRIA TOTAL** — ~6s de
  invencibilidade em que tudo que colide explode (até o espinho, que a
  investida normal não destrói) e a velocidade sobe mais 25%. Enquanto enche,
  muda velocidade, tinge o rino de vermelho, solta fumaça pelas narinas e sobe
  a intensidade da música. Decisão de design: a fúria posicional antiga era um
  bônus passivo; a carga transforma "quando gastar" numa escolha do jogador —
  e recomeça do zero após o uso, dando ritmo ao modo infinito.
- **Escala visual 1,30** (`RHINO_VISUAL_SCALE`, calibrada em campo pelo dono):
  só a IMAGEM cresce — a hitbox segue 76×54 de mundo com os pés no chão
  (compensação em `Rhino.applyVisualScale`). Motivo: as skins vetorizadas são
  mais magras que o desenho original e o protagonista tinha ficado menor que
  um leão; nenhum pulo/vão/luta mudou de dificuldade.

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

**Parede que desaba (v1.8)**: ao quebrar, todo o topo acima da fresta **tomba
para trás** (contra o sentido da corrida — pedido do dono; antes um pedaço
ficava flutuando) e se esfarela. Feedback visual puro: a colisão já acabou
quando o tombo começa.

**Animais em peso (v1.8.1, "denso sem facilitar")**: além da roleta, animais
podem vir **em dupla** (`animalPackChance`) e parede/espinho/torre podem nascer
**escoltados** por um animal na coreografia dos combos (`animalEscortChance`) —
os dois crescem por tier (~50%→80%). Motivo, medido em Monte Carlo com a roleta
real: a fatia do animal é a SOBRA dos pesos (22–33% nos tiers iniciais) e o
jogo gerava só **1,5 animal/100m**; o padrão atual entrega **~3,2/100m** com o
teto físico do sistema em ~4 — SEM trocar obstáculo letal por animal (a
proporção de mortes por parede/espinho não muda, só a cadência de encontros).
Atropelado, o animal **voa para a frente e para o alto** girando (v1.8.3;
combina com o sentido da carga — antes voava para trás).

**Dardo visível (v1.8.3)**: a arte cresceu 50% (42×15) com líquido e penacho
**vermelho vivo** e contorno preto — mas a **hitbox segue 24×8**: a folga
visual é perdão a favor do jogador, nunca contra. O dardo do caçador do portão
usa o MESMO sprite com tint dourado — por isso o corpo da seringa é claro (o
tint multiplica; partir do branco faz o dourado sair exato).

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

## 🛡️ O chefe do portão (v1.7) — e por que a fúria não resolve a luta

O portão dos 1000m amanhece **blindado em 3 camadas**, com um **caçador de
rifle tranquilizante** no topo. Vencer = investir na camada cuja fresta brilha,
na ordem chão → meio → alto (a última exige pulo duplo + investida NO AR — a
técnica-clímax do jogo). Errar o toque **não mata**: o rino ricocheteia com um
CLANG e a investida volta junto com o controle. O perigo é o rifle: mira laser
~0,4s antes de cada tiro, três padrões (reto / morteiro / rajada), cadência
que acelera a cada camada quebrada. O portão **não tem corpo físico** (mesma
família de decisão da rampa): banda de x + clamp posicional + janela de
knockback em que o `FurySystem` não reescreve `velocityX` — corpo sólido +
reescrita por frame é a receita do soft-lock.

**A fúria é BLOQUEADA dentro da arena (v1.8)** — decisão 100% orientada por
dados: a telemetria mostrou a luta anulada (120 camadas quebradas com apenas
8 mortes) porque a FÚRIA TOTAL, guardada para os 1000m, quebrava camada sem
alinhamento e ignorava o rifle. Agora o medidor mostra um cadeado na arena, a
carga **continua enchendo** e libera na queda do portão — vira o fôlego de
largada do modo infinito. Quem entra em chamas (ativou antes da arena) mantém
o fogo, mas **precisa alinhar as 3 frestas como todo mundo**. O contador
`runs[].n` mede quantos ainda tentam o truque antigo.

## 🛡️ A linhagem do Cerco e o Guardião do Fim (v1.8.5 → v1.8.10)

**O dado que motivou** (levantamento de 16/08, `docs/IDEIAS-FUTURAS.md` §4.3):
depois do portão existia um **deserto de 2.000 m a 10.000 m** — a dificuldade
teta no tier 6 e não havia nenhum marco até a LENDA. Só 10 corridas da janela
passaram de 2.000 m, e quem vencia o boss não tinha próximo objetivo.

**O Cerco — hoje a Barreira da Escavação (3.650 m).** Nasceu aos 2.000 m
(v1.8.5), cedeu o slot à Muralha quando a cidade ganhou arco (v1.8.7) e vive
desde a v1.8.10 como o **miniboss do meio do deserto**, com a mecânica
original intacta e paleta nova de sacos de areia e andaimes. O desenho, para
não ser o mesmo chefe do portão de novo: **4 camadas** em ordem **não
monótona** `mid → ground → high → mid` (obriga a ler o glow em vez de decorar
a sequência), o **Capturador** (canhão de redes) atirando em **leque** (3
dardos, ±12°), **rasante** anti-camping (tiro rente ao chão — pular é a
resposta, e pular é o que o camper não estava fazendo; o morteiro só entra na
última camada) e **enrage suave** aos 45 s (a cadência desce UM degrau —
nunca um muro de morte). **Vitória: a corrida CONTINUA** — a barricada
explode, +150 pts (peso `cerco`) além dos 25 por camada, medalha `boss2_win`
("Fura-Bloqueio" — o id é imutável e ficou DORMENTE de v1.8.7 a v1.8.9,
enquanto o Cerco esteve sem âncora). Derrota = causa `cerco`, título próprio
"CAPTURADO NA BARREIRA! 🕸️".

**O Guardião do Fim (9.995 m).** O Caçador-Mor na última cerca do mundo. A
arena saiu **de graça**: os 1.500 px sem spawn da chegada da LENDA já eram
exatamente isso. **5 camadas em palíndromo** `ground → mid → high → mid →
ground`, arsenal remixando os dois bosses anteriores. **Vencer dispara a
LENDA** (`legend = true; endGame(true)`) — a cutscene que já existia vira a
festa do chefe, com a medalha `legend_world` (o bônus de 400 pts da LENDA já
era o prêmio). O valor é aspiracional: ninguém chegou perto (recorde 5.185 m),
mas a marca máxima do jogo deixou de ser uma chegada e virou uma **vitória**.

**Decisões de recompensa (do dono):** medalhas + pontos, **sem** skins novas e
sem card no Diário. Telemetria em `runs[]`: `e`/`h` (camadas e segundos do
boss dos 2.000 m — série herdada pela Muralha) · `u` (camadas da Barreira) ·
`y` (camadas do Faraó) · `l` (camadas do Guardião); Barreira/Faraó/Guardião
não têm letra de segundos (decisão de orçamento), e `q` segue **exclusivo do
portão** para preservar a baseline de 48 lutas que calibrou a v1.8. A última
letra livre (`i`) foi gasta na v1.9.2 com a sonda do cronômetro (`loopS`) —
**o alfabeto de `runs[]` está fechado**: métrica nova só recomputada ou
dentro dos mapas existentes.

**A decisão estrutural — parametrizar, nunca copiar:** antes dos bosses novos,
o `BossFight` passou pelos refactors R1–R7 (ideia D): âncora, camadas, tabela
de tiro, texturas, contadores e callbacks de vitória viraram um objeto de
definição, e os cinco chefes são **5 instâncias da mesma classe** — com o
`e2e-boss` 16/16 preservado após cada passo e a arte do portão byte a byte
idêntica. Sem isso, B e C seriam cópia-e-cola do portão — o caminho mais
rápido para um soft-lock. A zona sem spawn foi unificada no mesmo passo
(`noSpawnZones()` como dados; a arena nova entrou com UMA entrada).

## 📊 Progressão

- **Distância + façanha (v1.8.4)**: 1 metro ainda vale 1 ponto, mas agora **não é só isso** — ver "Pontuação composta" abaixo. Recorde local (em metros E em pontos) + ranking mundial (Firestore).
- **Portão dos 1000m** = a fuga, agora uma **batalha de chefe** (acima). Vencer
  conta a vitória **sem parar a corrida** — o modo infinito começa na mesma
  passada: o portão **explode** (estilhaços, flash, tremor de câmera), sobem
  fogos e confete, e o cenário vira a **cidade**. Aos **2.000m** espera o
  Cerco e aos **9.995m** o Guardião do Fim (v1.8.5, acima). O fim físico do
  mundo é 10.000m ("LENDA") — hoje, atrás do chefe final.
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
- **O elenco de perseguidores muda com o bioma (v1.7)** — 27 espécies, cada
  trecho com as suas (`BIOME_ANIMALS` + `pickBiomeAnimal`): tratador e pavão
  nas jaulas, avestruz e águia no aviário, leão/zebra/hiena/búfalo na savana,
  macaco/onça/cobra/lobo-guará na floresta, jacaré/hipopótamo/capivara no
  pântano — e na cidade pedestres, carros, viatura, drone, teco-teco. Motivo:
  o inimigo é metade da identidade visual do trecho; o combo continua pedindo
  o MODO certo (terrestre atrás da parede, voador sobre o espinho), só o
  elenco troca de cenário.
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

## 🎭 Skins (v1.8) — privilégio dinâmico, não desbloqueio

O guarda-roupa (botão 🎨) veste o rino na home e em toda corrida **sem tocar
em nada da física** — é só aparência, e a escolha nunca é apagada. Quatro
formas de acesso, todas declarativas no `SkinRegistry.js`:

- **Grátis** · **Pódio exato** (rank 1/2/3) · **Façanha numa corrida**
  (`{meters, towersDowned, bossLayers, escaped}`, semântica E) · **Totais de
  vida** (`{attempts, wins, animals}`). O texto do cadeado é **gerado da
  regra** — desbloqueio novo se explica sozinho.
- **Pódio é privilégio, não conquista**: caiu do posto, a skin volta ao
  original SOZINHA (com aviso); recuperou, ela volta a vestir — a resolução é
  feita **na leitura** (`resolveEquipped`), nunca regravando a escolha. Cada
  degrau tem a sua: a skin do nº 1 só veste no nº 1.
- **Conquistas são retroativas**: o retro-scan das últimas 50 corridas concede
  o que já foi merecido no primeiro boot após a skin existir.
- **Fúria própria opcional** (`firePrefix`): skin com folha em chamas própria
  transforma no seu próprio "vulcão"; sem ela, o fogo compartilhado.
- **O estúdio `/?setup`** dá ao dono independência total: criar (folha de IA →
  frames → paleta → vetorização), editar, esconder (reversível) e remover
  skins **sem programar** — toda gravação roda a suíte-portão e faz rollback
  se reprovar. O elenco é VIVO por design; por isso **nenhum teste pode pinar
  valores do registry** (regra aprendida três vezes: test-skins, e2e-skins e
  test-integrate caíram um a um por fixar skins reais).

## 🏠 A tela inicial (v1.8.1) — uma vitrine que provoca o retorno

A home deixou de ser "título + botão" e virou o motor de retenção do jogo
(desenho fechado com o dono em 5 rodadas de mockup navegável antes de uma
linha de código):

- **Pódio mundial ao vivo** no centro: os 3 primeiros com **a skin que usavam
  ao cravar a marca** (campo `skin` em `scores/`; docs antigos mostram o rino
  original), nome, marca e **dias de POSSE DA POSIÇÃO** — aqui a contagem é
  em **cascata** (alguém toma o topo → o contador de quem caiu reinicia
  naquele dia). Cache local com TTL de 6h: 3 leituras por atualização cabem
  no plano gratuito, e offline vale a última foto.
- **O degrau VOCÊ**: um 4º pedestal tracejado na mesma linha do bronze, com
  seta animada, sua skin, o botão de trocar e a provocação na lata ("faltam
  303m p/ 🥉" / "defenda o seu posto!"). É a tese da tela: o jogador precisa
  se ver **a um passo** do pódio.
- **Duas semânticas de "há quantos dias", cada uma no seu lugar** (decisão do
  dono após ver o efeito real): o PÓDIO mede posse da posição (cascata); a
  LISTA do top 10 mede a idade da marca — porque a cascata na lista fazia
  "todos há 2d" sempre que alguém novo entrava no topo.
- **Diário da Fuga**: 1º card = aviso do dono (doc `config/news`, editável no
  console sem deploy); os demais são eventos do próprio jogador (skin
  desbloqueada, entrou/perdeu o pódio, recorde), cada um mostrado UMA vez.
- **Box Campanha**: recorde, tentativas, fugas, "maior inimigo" e o
  minigráfico das últimas 10 corridas — os números do jogador saíram da faixa
  de rodapé e viraram um painel de identidade.
- O contrato técnico da tela não mudou: o overlay inteiro inicia a corrida ao
  toque, e todo botão isola o toque (`stopPropagation`) — trancado por teste.

## 🏜️ As Areias do Tempo (v1.8.10) — o deserto em cinco etapas

*A cidade caçava; o deserto engole.* Depois do Pórtico da Rodovia a estrada
acaba de verdade: cinco etapas de 500 m (2200–4700 m) na mesma máquina de
áreas da cidade, com fachada, elenco, armadilha e clima próprios — e DOIS
combates. O nome se paga na aritmética do céu: os 2500 m atravessam ~4 dias
inteiros de ciclo; o tempo derrete na travessia.

- **E1 Estrada Engolida** (dunas, camelo, abutre, naja; areia movediça — a
  primeira armadilha em que a resposta é pular POR CIMA) → **E2 Miragem do
  Oásis** (croc e naja com arte reaproveitada, flamingo) → **E3 Sítio da
  Escavação** (múmias em par, escaravelho, o arqueiro de FLECHAS — e o
  caixote esmagável) → **E4 Vale dos Faraós** (paredes-pirâmide, obeliscos-
  torre cuspindo flechas, Falcão de Hórus em zig, a flecheira no ritmo do
  glifo) → **E5 Necrópole** (tempestade de areia, o exame, corredor limpo
  pré-boss).
- **A Barreira da Escavação (3650 m)**: o Cerco declarado na v1.8.5 e
  realocado na v1.8.7 FINALMENTE vive — mecânica intacta (4 camadas
  MID→GROUND→HIGH→MID, canhão de redes), paleta nova de sacos de areia e
  andaime. Miniboss no meio da fase: vitória +150, causa própria `cerco`,
  letra `u`.
- **O FARAÓ DE BRONZE (4700 m)** — o defensor mais agressivo do jogo, por
  TABELA e não por HP: 5 camadas MID→HIGH→GROUND→MID→HIGH (a terceira
  gramática de abertura), cadência 1200→700 ms (a mais curta), rajada tripla
  em leque cedo, **Espelho de Rá** (o telegraph de holofote vira feixe solar
  varrendo até a zona de pouso) e **Mergulho de Hórus** (rasante com projétil-
  falcão), enrage aos 30 s. Vitória +250, causa `farao`, letra `y`. Depois, o
  deserto profundo infinito até o Guardião do Fim (intocado).
- **Pontuação**: as letras `u`/`y` fecham o alfabeto de `runs[]` (sobra só
  `i`); o contrato "ao vivo == recomputado" segue trancado; as flechas usam o
  MESMO pool de dardos com textura própria (restaurada no reuso).

## 🏙️ Estado de Alerta (v1.8.7) — a cidade em três distritos

A cidade era um skin infinito: depois do portão, dificuldade plana e nenhum
marco — e é ali que os jogadores estão (mediana pós-portão morria aos 1.224 m).
Agora ela é um antagonista com arco: **dorme, acorda, caça**.

- **Três distritos de 400 m**, cada um com fachada, paleta, parallax, elenco e
  armadilha próprios — e uma banda de leitura para ensinar: D1 (Subúrbio
  Sonolento, 1001–1400 m) ensina o CHÃO (rasteiros, puladores, caçamba);
  D2 (o Despertar, 1401–1800 m) a MEIA ALTURA (Pipa em zig-zag, camionete
  atiradora, hidrante); D3 (Zona de Contenção, 1801–2200 m) o CÉU (drones,
  atirador voador, arco voltaico — a armadilha anti-pulo que inverte o reflexo
  treinado por 1800 m). A narrativa é escrita com a luz que o jogo já tinha:
  a noite fecha aos 1450 m, o D2 amanhece com a cidade acordando, e a luta da
  Muralha acontece no escuro sob holofotes — zero mudança nas âncoras de céu.
- **Portais físicos** (Viaduto 1400 · Checkpoint 1800 · Pórtico da Rodovia
  2200) com flash colorido, sting próprio e ±300 px sem spawn — a gramática de
  transição do zoológico, amplificada.
- **A MURALHA (2000 m)**: barricada de viaturas + Comandante na torre de
  holofote. Quatro camadas abrindo NO ALTO (o exame da lição do D3), granada-
  de-luz cujo telegraph é o próprio holofote varrendo até a zona de pouso
  (diegético — lê-se a luz, não um glow abstrato), K9 rasante anti-camping e
  enrage suave aos 45 s. O startFight SILENCIA atiradores vivos na arena —
  regra nova de boss, aprendida no desenho. Vitória abre a **Brecha**
  (2000–2200: só rampas e pombos, o amanhecer, a volta olímpica) até o
  Pórtico. A Muralha herda a série de dados do slot dos 2000 m (causa `boss2`,
  letras `e`/`h`) — o funil continua contínuo.
- **O Cerco foi realocado** — e entregue na v1.8.10 como a **Barreira da
  Escavação (3650 m)**, o miniboss do meio do deserto; a medalha
  "Fura-Bloqueio" acordou apontando para ela (id imutável).
- **Curva por distrito sem tocar o tier global**: os distritos só modulam
  PESOS da roleta (D1 alivia torre e devolve a sobra ao rasteiro — mesma
  pressão, leitura mais honesta onde a mediana morria). Contrato binário
  intacto: sem HP, contato mata, dash mata em 1 toque.
- **Metas registradas** (medidas pelo funil novo): mediana pós-portão
  1.224 → ≥1.500 m; corridas ≥1.400 m de 3% → 6%; chegada aos 2.000 m de
  1% → 3%; a Muralha NÃO pode ser outro pedágio de 4 s.

## 🏆 Pontuação composta (v1.8.4) — o ranking deixa de ser só distância

Até a v1.8.3, `score` **era** a distância: quem corria 1.000 m tinha 1.000 no
ranking, e derrubar torre, atropelar animal ou vencer o chefe não valia nada.
A telemetria mostrou que a matéria-prima estava gravada há meses sem uso (os
contadores `w r o a b` de `runs[]`), e que o efeito seria maior justamente onde
há combate: nas corridas de 1.000–2.000 m o bônus simulado dá **mediana de
17,6%** do total.

- **O que pontua**: parede +5 · morro +5 · torre +15 · animal +3 · camada do
  portão +25 · fuga +100 · blitz (as 3 camadas em ≤20 s) +50 · LENDA +400 —
  tudo em `Constants.SCORE_WEIGHTS`, com slider ao vivo no `?debug=1`. Ficam
  de fora pulo, pausa e investida negada (medem spam e frustração, não
  façanha) e a Fúria Total (seria contagem dupla com o que ela destrói).
- **Teto `bônus ≤ metros`**: uma corrida curta cheia de combate nunca passa por
  cima de uma corrida longa. É o que mantém a correlação entre metros e total
  em 0,993 — o ranking muda de régua sem virar outro jogo. Na simulação sobre
  895 corridas reais o teto nunca precisou agir: ele é rede, não regra ativa.
- **Duas grandezas, dois lugares**: façanha FÍSICA fala em metros (tela de fim,
  medalhas, requisitos de skin, estacas da pista, funil do painel);
  COMPETIÇÃO fala em pontos (pódio, top 10, provocação, push de recorde).
  O ranking mostra os dois: `1.234 pts · 987 m`.
- **Ninguém foi recalculado.** No Firestore, `score` virou o total e nasceu o
  campo opcional `scoreM` com os metros. Como o bônus é sempre ≥ 0, **todo
  documento antigo já é um total válido de bônus zero** — e a ausência de
  `scoreM` é a própria marca de versão, sem campo de versão nenhum. Clientes
  velhos (ainda há gente na 1.5.0) seguem gravando como sempre. A marca antiga
  vai sendo superada naturalmente: reset suave, meritocrático, decidido assim
  de propósito.
- **O bônus não ganhou letra em `runs[]`**: é recomputável dos contadores que
  já existem, e o orçamento de letras livres (6) está reservado para os bosses
  do futuro. Um teste tranca a igualdade "recomputado == somado ao vivo".
- **O jogador vê o ponto acontecer**: cada façanha solta um `+N` dourado que
  sobe do próprio obstáculo e some, o HUD mostra a Pontuação em destaque com
  os metros discretos embaixo, e a tela de fim abre a conta inteira (de onde
  veio cada ponto).

## 🚪 A abertura agora depende de quem está jogando (v1.8.4)

Os 3 obstáculos-lição (rampa aos 90 m → espinho aos 125 m → parede aos 160 m,
sem nenhum animal até os 190 m) existiam por um dado duro: antes da v1.6, 83
de 512 corridas morriam exatamente aos 34 m. Mas eles eram aplicados a TODO
mundo, em TODA corrida — o veterano atravessava 190 m vazios por tentativa, e
com a pontuação nova seriam 190 m sem nada para pontuar.

Agora a abertura-lição vale só para **quem tem menos de 3 tentativas** — a
mesma régua que já desligava as dicas na tela, então lição e dica acendem e
apagam juntas. Para o veterano, a roleta normal assume aos 60 m, com par e
escolta de animais desde o começo. É a primeira vez que o jogo trata estreante
e veterano de formas diferentes.

## ⚔️ Arena de Desafios (v1.8.6) — competição com prazo e com nome

O ranking provoca, mas não convoca: 69% dos jogadores jogavam um único dia
(radiografia de 16/08) porque nada os chamava de volta AMANHÃ. A Arena é a
resposta: um desafio direto, com prazo e com gente conhecida.

- **Como funciona**: o botão Desafiar abre o **diretório completo de
  adversários** (a coleção `scores/` inteira, ordem alfabética, busca por
  slug sem acento — o top 10 com as ⚔️ segue como atalho) e envia um desafio
  de 1, 3 ou 7 dias para até 7 marcados. Vence a **melhor corrida em pontos**
  dentro da janela — a régua da pontuação composta, imune a farm por volume e
  virável até o último dia. Só quem ACEITA entra no placar (o convite chega
  num popup ao abrir o jogo); criar exige apelido próprio, ser desafiado não;
  o teto de 3 disputas simultâneas conta **envolvimentos** (criou OU aceitou).
- **Encerrar antes do prazo é do criador** (v1.8.8): o botão grava
  `cancelledAt` no doc **uma única vez** (cláusula própria nas rules — o
  update continua aceitando só isso ou o aceite crescer). Cancelado nunca é
  ativo: não convida, não pontua, não planta estaca; os desafiados veem o
  aviso e o dispensam localmente. Na home, os cards de desafio ocupam o lugar
  do box Campanha enquanto existirem (máx. 3 empilhados) — sem disputa, a
  Campanha volta.
- **A decisão de arquitetura que sustenta tudo: o desafio é metadado, o
  placar é derivado.** O doc em `challenges/` guarda quem/prazo/aceites,
  escrito uma vez pelo criador (o único update permitido é o mapa de aceites
  crescer — trancado nas rules pelo `diff().affectedKeys()`). O placar é
  computado por quem olha: lê-se o `stats/` público de cada aceito e
  recomputa-se a melhor corrida da janela com o `ScoreSystem` — as corridas
  já viajavam com timestamp desde a v1.6.1. **Zero write cruzado entre
  jogadores**, que é exatamente a operação que um jogo sem login não sabe
  proteger; **zero letra nova** em `runs[]`.
- **Confiança assumida**: sem autenticação, um aceite é tecnicamente
  falsificável — mesmo modelo do resto do jogo (qualquer cliente já pode
  gravar qualquer score que passe na forma). Jogo entre amigos, decidido de
  olhos abertos.
- **A provocação vai até a pista**: os adversários viram estacas vermelhas na
  distância da melhor corrida deles (o sistema de estacas de rival já
  existia), com grito ao ultrapassar e o alvo em pontos anunciado na largada.
  Nuance de honestidade: a estaca marca ONDE o rival chegou (metros); quem
  decide é PONTOS — o toast diz o número que vale.
- **Custo de rede**: 1 query por hora para descobrir convites, 1 leitura por
  participante (cache de 30 min) para o placar — cabe no plano gratuito, e a
  corrida nunca espera a rede (as estacas leem só o cache).

## 📡 Radiografia viva (v1.8.7) — a análise que deixou de ser um evento

A radiografia de 16/08 nasceu de um script apagado de propósito, com uma
receita de recriação no banco de ideias — atrito que fazia a análise não
acontecer. A decisão: **a análise vira ferramenta titular e mantida**, com
três princípios de design:

- **Um núcleo puro, dois invólucros.** `RadiografiaCore` recebe as coleções
  decodificadas e devolve métricas + insights + markdown, sem fetch nem DOM —
  o MESMO código roda na aba 📊 do estúdio e no `npm run radiografia`.
  Determinismo é contrato: mesma base → mesmo relatório byte a byte (o diff
  entre duas medições mede só a mudança do DADO).
- **O motor de insights fala como o diagnóstico do banco de ideias**: regras
  determinísticas com gatilho numérico, **amostra mínima** (abaixo dela sai
  "⚪ amostra insuficiente" — nunca silêncio, nunca afirmação sem base) e
  severidade; cada texto aponta a ideia do banco que ataca o problema. A
  fotografia de 16/08 vive **congelada** no núcleo como baseline — todo
  relatório nasce com a coluna Δ. Rigor assumido: com ~50 jogadores o IC95 de
  uma proporção é ±14 p.p. — os textos dizem "sinal, não prova".
- **Zero writes, por construção**: leitura pública via REST, sondas
  `claude-*` filtradas na busca, e o teste tranca por text-assert que os
  fetchers não têm POST. A primeira medição real (22/08) já pagou a
  ferramenta: revelou que 100% da base rodava < 1.8.4 — o deploy estava
  pendente desde a v1.8.4 e nenhum outro painel teria mostrado isso.

## 🛠️ Estúdio unificado (v1.8.8) — um duplo-clique, um servidor

A dor registrada na QA: "a tela fala em 3000, o atalho abre 3210 — qual é o
procedimento?". A restrição física: **página web não inicia processo local**
(sandbox do navegador) — nenhum botão de "ligar servidor" é possível com tudo
morto. A resposta inverteu o problema: o servidor do gerador passou a servir
**o jogo inteiro** e a escutar nas duas portas (cede a 3000 ao python do dono
com aviso — os dois modos convivem); o `iniciar-estudio.bat` da raiz sobe
tudo e abre o `/?setup` no endereço certo. O card **Servidores locais**
mostra as duas linhas de status e ganhou o ⏻ Parar (desligar a página pode;
ligar, nunca — e o aviso muda quando parar derruba a própria página). Duas
regras de projeto nasceram aqui: o probe do status do jogo é **HEAD, nunca
GET** (um GET entraria no cache do service worker e daria falso "no ar"), e
**jogar sempre pela :3000** — localStorage e service worker são por ORIGEM;
jogar na :3210 criaria uma segunda identidade do zero.

## 🖼️ Aba Sprites (v1.8.9) — o elenco inteiro na mão do dono

O catálogo, a calibração e a criação de inimigos saíram do código e viraram
tela — com quatro decisões de design que sustentam tudo:

- **O `Constants.js` é sagrado.** Seus ~300 comentários são a memória de
  design do projeto; nenhum servidor o reescreve. A calibração do dono vive
  num arquivo de DADOS próprio (`SpriteParams.js`, JSON estrito, machine-
  owned) **mesclado por cima no load** — `overrides` por espécie (valor
  `null` apaga; `w/h/tex/anim/pair` proibidos) e `novas` (espécies criadas
  pela aba, completas). `SPRITE_BASE` guarda o pré-merge: a UI sempre mostra
  o diff "design × ajuste do dono", e um override no-op vira aviso.
- **Toda gravação é tudo-ou-nada.** Snapshot dos bytes → escreve → roda o
  portão (`test-sprites` + `test-skins`, cada um num processo novo que
  enxerga o merge fresco) → rollback total se reprovar. O mesmo desenho do
  estúdio de skins, generalizado para N arquivos.
- **As flags que mudam a CLASSIFICAÇÃO de spawn são as perigosas.** `fly` e
  `zig` transformam a espécie em voadora em três pontos do motor; `pair`
  recursa o spawn. Por isso: confirmação explícita na UI, validação no
  endpoint e os **invariantes dos e2e replicados no portão** (todo elenco
  mantém ≥1 terrestre; a floresta segue sem voador — é o fallback `bird` que
  o e2e-special congela; jaulas sem par; Brecha só-pombo). `pair` é proibido
  em espécie criada, decisão de v1, não limitação.
- **O rig do rinoceronte virou o default de um motor paramétrico.** As 7
  constantes de geometria do vetorizador (96/64, encaixe 95×63, piso das
  pernas, janela da cabeça, frame-mestre) viraram parâmetros com os valores
  históricos como default — skins byte-compatíveis, e inimigos de qualquer
  tamanho no mesmo pipeline. A hitbox sugerida sai medida da máscara, com o
  `offX` já espelhado (`w − offX_arte − bodyW`) — automatiza o comentário
  que a arte manuscrita carregava à mão.

## 🪪 Recuperação de identidade (v1.9.0) — o caso Teco

**O dado que motivou:** caso real de produção. O jogo não tem login — a
identidade é um UUID por aparelho, só em `localStorage` — e o dono reinstalou
o PWA no celular: o aparelho renasceu com outro id e o doc órfão do próprio
"Teco" (1.907 pts, 6º lugar) passou a **bloquear o dono do apelido** ("já
está em uso"): o `checkName` exclui "o meu doc" pelo id, e com o id novo o
doc antigo vira "de outra pessoa". Sem caminho de volta, o custo era perder a
marca, o histórico e o nome.

**A decisão central — recuperação MEDIADA, nunca automática.** Sem
autenticação não existe prova de posse: qualquer automatismo ("clique aqui
para retomar o nome") seria um sequestro de conta de um clique. O desenho
divide a confiança em três: o **jogador pede** (botão 🆘 no erro de apelido —
o pedido chega ao dono via ntfy com o id novo e a **assinatura do
aparelho/local**, e arma o aparelho para consultar a ordem), o **dono
confere e autoriza** (aba 🆘 do estúdio compara os aparelhos/locais das duas
vidas — o antifraude é humano, e o custo disso é aceitável num jogo de
dezenas de jogadores), e o **jogo se restaura sozinho** (o par
`{idNovo: idAntigo}` vive no doc `config/reassign`, que os clientes só LEEM;
a escrita é do servidor local do estúdio, com a credencial do dono).

**As decisões de implementação e seus porquês:**

- **Consulta "armada", não polling universal**: só o aparelho com pedido 🆘
  pendente consulta o `config/reassign` (cache de 1h) — os outros 99% dos
  jogadores não gastam nenhum read. O plano gratuito agradece.
- **O merge SOMA os totais** (local + servidor), nunca copia: as rules de
  `stats` exigem monotonia e negam write **em silêncio** — um total
  restaurado menor congelaria a telemetria do jogador para sempre. A mesma
  regra dos e2e desde a v1.7.2, agora em produção.
- **`best_sent*` restaurados por inteiro** (score/metros/scoreAt/skin):
  são os contratos do `rename`/`submit` — sem eles a troca de apelido
  apagaria a marca e o "há X dias" do ranking.
- **Medalhas: perda parcial honesta.** Não existem no servidor; o merge
  re-infere as que a janela de 50 corridas comprova (distância, mecânicas,
  camadas de chefe) e assume a perda do resto (ex.: "Superação") — melhor
  uma perda declarada que uma restauração inventada. As skins de conquista
  voltam de graça pelo retro-scan que já existia.
- **A letra `i` NÃO foi gasta** com nada disso: o fluxo inteiro funciona sem
  telemetria nova (a marca do pedido é local; a confirmação é um push).
- **O mapa público não cria risco novo**: sem auth, qualquer cliente já pode
  adotar qualquer id hoje — o modelo de confiança assumido do jogo inteiro.
  A mediação humana é o filtro, não a criptografia.

**Runbook operacional**: `docs/QA-Registro.md` §🪪 (primeira entrada do tema
identidade). Suíte: `test-reassign` (61 asserts) tranca a invariante da
monotonia e as guardas do fluxo.

## 🏁 Engajamento

- **Marcas na pista**: estacas com nome e distância do **seu recorde**, do
  **rival imediatamente acima de você no ranking** e do **líder mundial**.
  Ultrapassar cada uma provoca o jogador na tela. Lidas de cache local — a
  corrida nunca espera a rede.
- **Medalhas** locais (sem rede), de "Primeira Fuga" a "Inalcançável" (2000m),
  incluindo Escavadeira (3 morros destruídos) e Torre Abaixo (2 torres) —
  visíveis dentro do "Minhas estatísticas" (a faixa de ícones saiu da home
  na v1.8.1 para dar lugar ao pódio).
- **Ranking mundial** com apelido único e **"há quantos dias" ao lado de cada
  marca** (v1.8) — a idade do feito é metade da provocação. **Convite por
  WhatsApp** (botão verde com o glifo do app) e **instalação do PWA como
  pílula** ao lado dele (no iPhone, abre o passo a passo; nunca bloqueante).
- **Desistir sem sujar os números (v1.8)**: o popup de pausa tem "🏳️ Desistir
  da corrida" — cancela a run sem contar NADA (nem a tentativa). Motivo: uma
  corrida abandonada de propósito não é dado de dificuldade; contá-la
  poluiria o funil.
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
| `runs[]` (últimas 50) | `t, m, s, c` + `w` paredes, `r` rampas, `o` torres, `a` animais, `j` pulos, `d` investidas, `x` investidas negadas no cooldown, `p` pausas, `k` teclado, `v` versão, e (v1.7–v1.8) `f` Fúrias Totais usadas, `n` fúrias negadas na arena do boss, `b` camadas do portão, `q` quiques, `z` segundos de luta, `g` skin usada | As rules validam só `is list && size() <= 50` — a FORMA do elemento é livre. Sai de graça. |
| `history.days` | `{'AAAA-MM-DD': {r, s, b}}`, 60 dias, poda por idade | Contagem exata de execuções/sessões/melhor marca por dia. `runs[]` só guarda 50 e falsearia dias muito ativos. |
| `client.tz` | fuso do aparelho | Conferência cruzada do geo por IP: VPN aparece como divergência. |
| `geo.at` | epoch da medição | Deixa o painel dizer a IDADE da localização. |

A fúria era posicional até a v1.6 e por isso ficava fora da telemetria (estava
contida no `m`). Na v1.7 ela virou carga gastável e ganhou o contador `f` —
que mede a **decisão de usar** o especial, informação que não existe em nenhum
outro campo. O `n` (fúrias negadas na arena) mede quantos ainda tentam o
truque antigo contra o boss.

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

## 🛡️ Uma sessão quebrada não pontua (v1.9.1) — e por que a ordem do fim de corrida mudou

Um jogador avisou que "o jogo trava". Era verdade e era pior do que parecia:
**qualquer exceção dentro do `update` matava o loop de animação** — o jogo
congelava na tela para sempre, sem mensagem, sem salvar a corrida, e com a
tentativa já debitada. O projeto não tinha `window.onerror`, não tinha
`unhandledrejection` e não tinha `try/catch` no `update`. Zero rede.

As três decisões de design que saíram disso:

- **Falha do jogo não pune o jogador.** O `crashToHome` devolve a tentativa que
  o `startRun` já contou. Perder a corrida por um bug nosso já é ruim; perder a
  tentativa junto seria cobrar pelo erro.
- **Uma sessão quebrada NÃO PONTUA.** Nada de recorde, nada de pódio, nada de
  run gravada, nada de telemetria. Uma partida que não terminou direito não é
  uma partida — e um número vindo dela contaminaria o ranking de todo mundo.
- **A corrida é salva ANTES de subir ao ranking.** O `endGame` gravava o recorde
  local e enviava ao ranking mundial ~110 linhas *antes* de consolidar a corrida
  em `runs[]`, sem `try/catch` no meio. Uma exceção ali deixava uma marca no
  ranking **sem corrida por trás**. Invertida a ordem, o pior caso passou a ser
  uma corrida salva que não subiu — o inverso do estrago.

**A honestidade da mensagem é parte do design.** O overlay diz que a corrida não
foi salva e que a tentativa voltou. A alternativa — sumir com o problema — faria
o jogador achar que o recorde dele foi roubado.

**Onde a rede global NÃO age:** um erro de rede (Firestore offline) jamais pode
mostrar "o jogo travou", porque violaria a regra nº 1 da casa — telemetria e
ranking são acessórios. Por isso o `unhandledrejection` só age com a corrida em
andamento **e** só para erros de programação que não tenham assinatura de rede.
O viés é deliberado: é melhor ficar mudo num caso raro do que mentir num comum.

---

## 🚦 A guarda de plausibilidade (v1.9.1) — na dúvida, aceita

Um bug (ainda não localizado) fez corridas serem gravadas com tempo muito menor
que o real — 10.000 m aparecendo como 47 s. Vinte e duas dessas marcas foram
parar no topo do ranking, empatadas no teto de pontos.

A defesa é uma pergunta só: **essa velocidade média é fisicamente possível?**

O teto absoluto do motor é **35,16 m/s** (`DASH_SPEED` × fúria 1,5 × especial
1,25 ÷ `PIXELS_PER_METER`) — os três simultâneos, o que ninguém sustenta. Em
campo, todas as versões sadias mostram 8–11 m/s. O limite ficou em **40 m/s**,
acima do teto, de propósito.

**A regra que orienta o desenho é "NA DÚVIDA, ACEITA":**

- sem tempo confiável (ausente, zero, negativo, `NaN`) → **aceita**;
- corrida curta → **aceita**. O tempo é gravado em segundos inteiros, então uma
  partida de 1,4 s vira "1 s" e infla a média medida em até 2×. O limiar ficou
  em **300 m** e não em 200 porque com 200 existiria uma janela real (`s=5`,
  `m=201` → 33,3 m/s reais) em que o arredondamento barraria um jogador
  legítimo. Com 300, barrar exige ter sustentado **35,67 m/s reais** — acima do
  teto do motor.

Barrar um inocente é muito pior do que deixar passar um número estranho: o
número estranho a gente limpa depois, a confiança do jogador não.

**A guarda contém, não cura.** Enquanto a causa raiz não aparecer, o jogador
afetado ainda perde a corrida dele — só que em silêncio, em vez de envenenar o
pódio de todos.

---

## 🏠 A tela inicial não espera o jogo carregar (v1.9.3)

Medido no celular: a home ficava **4,6 segundos vazia depois de a página já
estar pronta**. A causa não era peso nem internet — era ordem. Todo o conteúdo
da home era montado dentro do `GameScene.create()`, que só roda depois de o
Phaser baixar **150 arquivos de arte**. Dos quais a home usa **quatro**, e por
`<img>` HTML, sem passar pelo motor.

**A decisão:** a tela inicial é DOM + `localStorage` e não tem por que depender
do motor de jogo. Um módulo só (`HomeScreen`) virou o **dono único da pintura**,
chamado antes de o Phaser existir. O pódio passou a aparecer ~0,6 s depois da
página, em vez de 4,6 s.

**O efeito colateral que virou decisão de design:** com a tela pronta antes do
jogo, abre-se uma janela em que dá para tocar sem dar para jogar. Três saídas
eram possíveis — ignorar o toque (o jogador toca no vazio), desabilitar o botão
(a tela inteira pronta atrás de um botão apagado), ou **guardar o toque**.
Escolhemos guardar: o texto vira "preparando a fuga…", o rino ao lado já está
animado, e a corrida **começa sozinha** quando o motor fica pronto. O jogador
nunca toca no vazio nem precisa tocar duas vezes.

**O pódio voltou a ser atualizável.** Era relido a cada **6 horas** — a queixa
do dono ("a posição demora demais para atualizar") vinha daí. A economia era
ilusória: é 1 consulta de 3 documentos, num boot que já faz outras cinco sem
limite nenhum. Pior, criava uma assimetria visível: a sua posição vinha fresca
ao lado de degraus de ontem. Agora são 5 minutos.

**A lição que atravessou três versões seguidas (v1.9.1 → v1.9.3):** *todo cache
precisa de um dono que o invalide no evento que muda o dado dele.* Os três bugs
de "a tela não atualiza" desta linhagem foram o mesmo erro em lugares
diferentes — dado novo gravado, tela nunca repintada.

---

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

## 📈 Decisões orientadas por dados (v1.7 → v1.8.4)

| O que os dados (ou o campo) mostraram | O que mudou |
|---|---|
| **A FÚRIA TOTAL anulava o chefe: 120 camadas quebradas com só 8 mortes** — guardada para os 1000m, quebrava camada sem alinhamento e ignorava o rifle. | Ativação **bloqueada dentro da arena** (cadeado no medidor, carga preservada e liberada na queda do portão); quem entra em chamas precisa alinhar as 3 frestas como todo mundo. `runs[].n` mede quem ainda tenta. |
| O dono achava o jogo vazio de animais; **Monte Carlo da roleta real: 1,5 animal/100m**, porque a fatia do animal é a SOBRA dos pesos (22–33% nos tiers iniciais) e o teto do sistema é ~4/100m. Smokes curtos de navegador tinham variância demais para medir (um A/B de 60s deu 8×8). | Preset "denso sem facilitar": par de animais + **escolta** junto de parede/espinho/torre (~3,2/100m), SEM trocar obstáculo letal por animal. Sliders por tier no ?debug=1 + guia de calibração na referência técnica. |
| Com a cascata na lista do top 10, **"todos há 2d"**: qualquer entrada nova no topo comprimia a coluna inteira para a mesma data — parecia bug. | Duas semânticas, cada uma no seu lugar: **lista = idade da marca** (diferencia os jogadores); **pódio da home = posse da posição** (cascata — mede o reinado, como o dono especificou). |
| **O rank NUNCA tinha funcionado em produção**: o SDK firestore-lite exporta `getCount`, o código chamava `getCountFromServer` (só do SDK completo) e a falha era silenciosa por design. Descoberto no PRIMEIRO pedido real de skin de pódio (o #3 não conseguia a MecaBronze). | `countQuery` com fallback duplo; lição registrada: função "nova" de SDK se testa contra o build real do CDN (`typeof fs.X` no navegador), não contra a doc do SDK completo. As features de posição (skins de pódio, "Sua posição #N", convite com rank) ligaram de verdade na v1.8.3. |
| Os primeiros **190m são a abertura roteirizada, sem animal nenhum** — quem morre cedo "não vê bicho", e qualquer medição curta de densidade sai distorcida. | Mantido de propósito (onboarding vale mais); registrado como pegadinha de medição no guia de calibração. |
| A marca nova do dono (4606m) subiu sozinha com `skin=robot` na vitrine — **pipeline da vitrine validado em campo** no primeiro recorde pós-v1.8.1. | Confirmou o desenho "a vitrine registra a skin da MARCA" (e a troca de apelido preserva, via cópia local). |

| A habilidade não valia nada: o ranking media só distância, enquanto os contadores de parede/torre/animal/camada dormiam em `runs[]` há meses. Simulação sobre as **895 corridas reais**: bônus com p95 de 13,7% do total e Spearman metros × total de **0,993** — dá para premiar façanha sem virar outro jogo. | **Pontuação composta** (v1.8.4): `score` vira metros + bônus, `scoreM` guarda os metros, teto `bônus ≤ metros`. Nada foi recalculado — doc antigo é total de bônus zero, e a ausência de `scoreM` é a marca de versão. |
| A abertura roteirizada nasceu de um dado real (83 de 512 corridas morriam aos 34 m antes da v1.6), mas era aplicada a todo mundo: **os primeiros 190 m não geravam um único animal**, em toda tentativa, para todo jogador — inclusive quem já tinha 500 corridas. | A lição passou a valer só abaixo de 3 tentativas (a régua que já desligava as dicas). Veterano recebe a roleta aos 60 m, com par e escolta. Efeito medido em teste: 1º obstáculo aos 55 m e **29 animais dentro dos 200 m**, contra zero. |
| **O deserto de 2.000–10.000 m**: dificuldade plana pós-portão e nenhum marco até a LENDA — só 10 corridas da janela passaram de 2.000 m, e o funil mostrou a massa de mortes parando antes (§2.2 das IDEIAS-FUTURAS). O portão, único chefe, tinha virado pedágio (41 de 48 lutas vencidas, mediana de 4 s). | **Dois bosses novos (v1.8.5)**: O Cerco aos 2.000 m (âncora colada na medalha "Inalcançável") e o Guardião do Fim aos 9.995 m (a LENDA vira vitória, não chegada). Variações deliberadas sobre a espinha do portão — ordem não monótona, leque, rasante, enrage suave — para exigir leitura, não memória. |

| O boss do portão virou pedágio (41/48 lutas full-clear, mediana de 4 s) e o deserto pós-portão não tinha um único marco — 51 das 61 corridas pós-portão morriam antes dos 1.400 m. | **Estado de Alerta** (v1.8.7): a cidade em 3 distritos com curva pedagógica (chão → meia altura → céu), a MURALHA aos 2000 m abrindo pelo alto, e o funil do painel medindo as metas da fase. |

| O deserto pós-2200 m era um infinito sem rosto (backdrop urbano genérico, t6 plano, zero marco até a LENDA) — e o Cerco realocado esperava âncora desde a v1.8.7. | **As Areias do Tempo** (v1.8.10): 5 etapas com curva própria, o Cerco vivo como miniboss aos 3650 m e o Faraó de Bronze aos 4700 m — o funil agora mede até 4800 m. |

## 🧪 Testes

Vinte e uma suítes (detalhe por suíte em `docs/04-referencia-tecnica.md` §11);
números de 24/08/2026 — os que dependem do registry de skins variam com ele:

| Comando | Asserts | Foco |
|---|---|---|
| `npm run test-stats` | 108 | Telemetria/agregação, `holdDays` nas duas semânticas, consistência contra as rules (inclusive as letras `e/h/l/u/y/i` e as causas dos cinco chefes), digest — sem navegador |
| `npm run test-score` | 101 | A fórmula da pontuação composta: pesos, blitz na borda, teto do bônus, formatadores — e o contrato de recomputação (ao vivo == recomputado de `runs[]`), cobrindo camadas e vitória de todos os chefes |
| `npm run test-challenge` | 101 | A Arena: melhor corrida na janela (bordas, empates, pontos ≠ metros), countdown, status, guardas de criação, o texto das rules do `challenges`, o **cancelamento** (`cancelledAt` gravado 1×, sobrevivendo ao normalize) e os TTLs adaptativos do cache |
| `npm run test-reassign` | 61 | A recuperação de identidade: o merge puro (a invariante da monotonia — totais restaurados ≥ servidor), janela de runs, fusão do history, medalhas inferidas e as guardas do fluxo 🆘 (cooldown, gate, idempotência) |
| `npm run test-skins` | ~93 | Portão do /?setup (roda a cada gravação, com rollback): lógica de acesso com skins sintéticas + estrutura do registry real |
| `npm run test-integrate` | 49 | A integração do estúdio como funções puras (round-trip, upsert/remove, patch dos blocos gerenciados do sw) |
| `npm run test-sprites` | 31 | O **portão da aba Sprites**: contrato do SpriteParams, merge no Constants, paridade art/↔manifesto↔sw, w/h==viewBox, invariantes de spawn (elencos com terrestre, floresta sem voador, jaulas sem par) |
| `npm run test-radiografia` | 62 | A radiografia: fixture sintética das 3 eras, conferência com o digest, `flattenRuns ⊇ RUN_COUNTERS`, determinismo byte a byte, zero writes por text-assert |
| `npm run test-crash` | 54 | A rede de proteção (v1.9.1): a guarda de plausibilidade contra os dados REAIS de produção (barra 200 e 213 m/s, **aceita** as vitórias honestas de 23 e 11 m/s), a costura que faz o tempo chegar até a guarda, a ordem do `endGame` e a regra de ouro — sessão quebrada não grava recorde, não envia ao pódio, não grava run |
| `npm run test-fix-ranking` | 24 | A classificação que decide quem perde a marca e quem tem a dele restaurada, com as corridas **verbatim** de produção como fixture |
| `npm run test-e2e-crash` | 10 | Injeta uma exceção **real** no `update` e exige: overlay visível com saída, tentativa devolvida, nada gravado — e 50 crashes seguidos devolvendo UMA tentativa só |
| `npm run test-e2e-home` | 10 | A home desacoplada (v1.9.3): pintada com o motor ainda carregando (a suíte segura os SVGs de propósito) e o toque antecipado iniciando a corrida sozinho |
| `npm run perf-home` | — | **Regressão de performance** da tela inicial (4G + CPU 4x). Critério RELATIVO: a distância entre "página pronta" e "pódio na tela" — o absoluto oscila com a rede, a espera não |
| `npm run test-ramp` | 47 | Rampa/trampolim, abertura guiada, teclado, pausa + desistir, par/escolta, knockback, a home nova (cards de desafio no lugar da Campanha) e o contrato do toque |
| `npm run test-boss` | 16 | A luta do portão: quique, ordem das camadas, fúria negada na arena, causa `boss` |
| `npm run test-boss2` | 14 | A Muralha (2000 m): 4 camadas abrindo NO ALTO, atirador vivo silenciado no início da luta, vitória sem encerrar a corrida, causa `boss2` |
| `npm run test-boss3` | 10 | O Guardião: palíndromo de 5 camadas — e **a 5ª camada dispara a LENDA** |
| `npm run test-e2e-deserto` | — | As Areias do Tempo no navegador: as 5 etapas com as famílias de fachada, a Barreira (letra `u`, +150) e o Faraó (5 camadas, letra `y`, +250, enrage 30 s), causas/títulos próprios |
| `npm run test-special` | 25 | Bioma dos animais, ciclo completo da FÚRIA TOTAL, desabamento |
| `npm run test-e2e-skins` | 15 | Comportamento das skins no navegador contra registry canônico injetado (arte do núcleo — imune a remoções do dono) |
| `npm run test-e2e-setup` | 30 | O estúdio /?setup: gate, as quatro abas (catálogo ≥38 espécies; a 🆘 nasce com o Autorizar travado; zero requisição espontânea), card Servidores (nº varia com o gerador no ar ou não) |
| `npm run test-e2e-stats` | 69 | Telemetria REAL no Firestore com sonda `claude-*`; prova que a suíte não suja produção |
| `npm run radiografia` / `digest` | — | Análise de usabilidade completa / resumo diário — contra produção, **sem escrever nada** |

Os e2e exigem o jogo servido em `localhost:3000` — `python -m http.server 3000`
**ou** o servidor unificado do estúdio (`npm run sprite-gen`).
Regra aprendida a ferro: **a regressão de release roda todas — sempre** (um
subconjunto deixou passar um teste quebrado na v1.8.2).
