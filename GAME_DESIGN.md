# FURIOUS RHINO — Documento de Design

> Estado atual do jogo (v1.8.6). Este documento descreve o que **é**, não o que
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

## 🏙️ Os bosses do deserto (v1.8.5) — O Cerco e o Guardião do Fim

**O dado que motivou** (levantamento de 16/08, `docs/IDEIAS-FUTURAS.md` §4.3):
depois do portão existia um **deserto de 2.000 m a 10.000 m** — a dificuldade
teta no tier 6 e não havia nenhum marco até a LENDA. Só 10 corridas da janela
passaram de 2.000 m, e quem vencia o boss não tinha próximo objetivo.

**O Cerco (2.000 m).** Barricada de contenção urbana em **4 camadas**, com o
**Capturador** (canhão de redes) no topo. Ancorado em 80.000 px de propósito: a
face do clamp cai a ~3 m da medalha "Inalcançável" — a medalha vira a recompensa
da luta **de graça**. Para não ser o mesmo chefe de novo: ordem **não monótona**
`mid → ground → high → mid` (obriga a ler o glow em vez de decorar a sequência),
tiro em **leque** (3 dardos, ±12°), **rasante** anti-camping (tiro rente ao chão
— pular é a resposta, e pular é o que o camper não estava fazendo; o morteiro
só entra na última camada) e **enrage suave** aos 45 s (a cadência desce UM
degrau — nunca um muro de morte). **Vitória: a corrida CONTINUA** — a barricada
explode, +150 pts (peso `boss2`) além dos 25 por camada, medalha `boss2_win`.
Derrota = causa `boss2`, título próprio "CAPTURADO! 🕸️".

**O Guardião do Fim (9.995 m).** O Caçador-Mor na última cerca do mundo. A
arena saiu **de graça**: os 1.500 px sem spawn da chegada da LENDA já eram
exatamente isso. **5 camadas em palíndromo** `ground → mid → high → mid →
ground`, arsenal remixando os dois bosses anteriores. **Vencer dispara a
LENDA** (`legend = true; endGame(true)`) — a cutscene que já existia vira a
festa do chefe, com a medalha `legend_world` (o bônus de 400 pts da LENDA já
era o prêmio). O valor é aspiracional: ninguém chegou perto (recorde 5.185 m),
mas a marca máxima do jogo deixou de ser uma chegada e virou uma **vitória**.

**Decisões de recompensa (do dono):** medalhas + pontos, **sem** skins novas e
sem card no Diário. Telemetria: letras `e` (camadas do Cerco) · `h` (segundos
do Cerco) · `l` (camadas do Guardião) em `runs[]`; `q` segue **exclusivo do
portão** para preservar a baseline de 48 lutas que calibrou a v1.8. Restam 3
letras livres (`i u y`).

**A decisão estrutural — parametrizar, nunca copiar:** antes dos bosses novos,
o `BossFight` passou pelos refactors R1–R7 (ideia D): âncora, camadas, tabela
de tiro, texturas, contadores e callbacks de vitória viraram um objeto de
definição, e os três chefes são **3 instâncias da mesma classe** — com o
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

- **Como funciona**: um jogador marca outros no top 10 (⚔️ em cada linha) e
  envia um desafio de 1, 3 ou 7 dias. Vence a **melhor corrida em pontos**
  dentro da janela — a régua da pontuação composta, imune a farm por volume e
  virável até o último dia. Só quem ACEITA entra no placar (o convite chega
  num popup ao abrir o jogo); criar exige apelido próprio, ser desafiado não;
  máximo de 3 desafios criados ativos por jogador.
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

## 🧪 Testes

Treze suítes (detalhe por suíte em `docs/04-referencia-tecnica.md` §11); números
de 21/08/2026 — os que dependem do registry de skins variam com ele:

| Comando | Asserts | Foco |
|---|---|---|
| `npm run test-stats` | 99 | Telemetria/agregação, `holdDays` nas duas semânticas, consistência contra as rules (inclusive as letras `e/h/l` e as causas `boss2`/`boss3`), digest — sem navegador |
| `npm run test-score` | 83 | A fórmula da pontuação composta: pesos, blitz na borda, teto do bônus, formatadores — e o contrato de recomputação (ao vivo == recomputado de `runs[]`), agora cobrindo camadas e vitória dos bosses novos |
| `npm run test-challenge` | 68 | A Arena: melhor corrida na janela (bordas, empates, pontos ≠ metros), countdown, status, guardas de criação e o texto das rules do `challenges` |
| `npm run test-skins` | ~93 | Portão do /?setup (roda a cada gravação, com rollback): lógica de acesso com skins sintéticas + estrutura do registry real |
| `npm run test-integrate` | 49 | A integração do estúdio como funções puras (round-trip, upsert/remove, patch do sw) |
| `npm run test-ramp` | 39 | Rampa/trampolim, abertura guiada, teclado, pausa + desistir, par/escolta, knockback, a home nova e o contrato do toque |
| `npm run test-boss` | 16 | A luta do portão: quique, ordem das camadas, fúria negada na arena, causa `boss` |
| `npm run test-boss2` | 13 | O Cerco: ordem não monótona, leque/rasante/enrage — e **a 4ª camada NÃO encerra a corrida** |
| `npm run test-boss3` | 10 | O Guardião: palíndromo de 5 camadas — e **a 5ª camada dispara a LENDA** |
| `npm run test-special` | 25 | Bioma dos animais, ciclo completo da FÚRIA TOTAL, desabamento |
| `npm run test-e2e-skins` | 15 | Comportamento das skins no navegador contra registry canônico injetado (arte do núcleo — imune a remoções do dono) |
| `npm run test-e2e-setup` | 15–17 | O estúdio /?setup (nº varia com o servidor do gerador no ar ou não) |
| `npm run test-e2e-stats` | 69 | Telemetria REAL no Firestore com sonda `claude-*`; prova que a suíte não suja produção |
| `npm run digest` | — | Monta o resumo diário contra produção **sem enviar** |

Os e2e exigem o jogo servido em `localhost:3000` (`python -m http.server 3000`).
Regra aprendida a ferro: **a regressão de release roda todas — sempre** (um
subconjunto deixou passar um teste quebrado na v1.8.2).
