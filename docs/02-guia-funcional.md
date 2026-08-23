# Furious Rhino — Guia funcional

> Documentação da versão **1.8.10** · atualizada em 23/08/2026
> Cada funcionalidade do jogo: o que faz, como o usuário interage e exemplos práticos. Termos técnicos vêm explicados entre parênteses na primeira vez.

## 1. Controles

| Ação | Celular | Computador | O que acontece |
|---|---|---|---|
| **Pular** | Toque na metade **esquerda** da tela | Seta **←** ou **Espaço** | Cada toque impulsiona para cima — pode encadear pulos no ar, sem limite (estilo "flappy"). **Segurar** o toque deixa o pulo até 60% mais alto (a força cresce ao longo de 2 segundos). |
| **Investir** | Toque na metade **direita** | Seta **→** ou **Enter** | Arrancada de 0,2 s a mais que o dobro da velocidade. Depois, 1 s de recarga. No ar, a investida vira um **voo horizontal** (a gravidade desliga durante ela). |
| **FÚRIA TOTAL** | Toque no **ícone de fogo** (quando ele pulsa, cheio) | **↓** ou **Shift** | O rinoceronte pega fogo, fica **invencível por ~6 s** e tudo o que colide explode — até o espinho, o único obstáculo que a investida normal não destrói. Ver item 5. |
| **Pausar** | Botão ⏸ no canto | `P` ou `ESC` | Congela tudo. Minimizar o navegador ou trocar de aba também pausa sozinho. O popup traz **▶️ Continuar** e **🏳️ Desistir da corrida** — desistir cancela a corrida **sem contar em nenhuma estatística** (nem como tentativa) e volta à tela inicial. |
| **Som** | Botão 🔇/🔊 | idem | Liga/desliga; a escolha fica salva no aparelho. |

Os botões de pausa e som ficam **logo abaixo** dos ícones de fúria e investida, acompanhando o tamanho da tela — sem sobrepor nada.

É possível pular e investir **ao mesmo tempo** (a tela aceita dois dedos).

**Exemplo prático:** uma parede com a rachadura no alto → segure o toque esquerdo para um pulo alto, e no auge toque à direita: a investida no ar vira um voo reto que atravessa a fresta.

## 2. Obstáculos e como vencê-los

| Obstáculo | Jeito certo | Se errar |
|---|---|---|
| **Parede rachada** | A rachadura fica em 1 de 3 alturas (chão, meio, alto). Alinhe-se com ela e **invista**. Ao quebrar, **todo o topo da parede (ou do prédio, na cidade) desaba para trás (contra o sentido da corrida) se esfarelando** — nada fica flutuando | Morte |
| **Espinhos** | **Pule.** A variante em pedestal exige pulo mais alto | Morte |
| **Animais e perseguidores** | **Invista** para atropelar (eles **saem voando para o alto, à frente**, girando e gritando) ou pule por cima | Encostar sem investir = morte |
| **Torre tranquilizante** | **Invista na base** para derrubar — e a investida **volta na hora**, sem recarga. Ou desvie dos dardos | Dardo = "TRANQUILIZADO! 💤" |
| **Dardo** | Pule, ou **estoure no chifre** durante uma investida | Morte (dormindo) |
| **Morro / trampolim** | Suba e desça por cima, ou **invista rasante na base** para destruí-lo inteiro | **Nunca mata** — é o obstáculo que ensina |
| **O caçador do portão** (1000 m) | A primeira batalha de chefe — ver item **4** | Tiro do rifle = morte (dormindo) |
| **O Cerco** (2000 m) | Barricada de 4 camadas com canhão de redes — item **4** | Rede = "CAPTURADO! 🕸️" |
| **O Caçador-Mor** (9995 m) | O chefe final, na última cerca do mundo — item **4** | Tiro = morte (dormindo) |

O morro tem uma variante especial, o **trampolim**: um penhasco cuja crista lança o rinoceronte longe — a sensação de voo é proposital, é a parte mais divertida do jogo, e por isso é a variante mais sorteada.

**O elenco de perseguidores muda com o cenário** (27 espécies no total): tratador com rede de captura e pavão nas jaulas; avestruz e águia no aviário; leão, zebra, girafa, hiena, búfalo e ave de rasante na savana; macaco, onça, cobra e lobo-guará saltador na floresta; jacaré, hipopótamo, capivara e tuiuiú no pântano; e na cidade, pedestres em pânico, executivo, motoboy, carro, viatura, drone, teco-teco e a camionete do caçador. Três jeitos de se mover: correndo no chão, saltando (macaco, zebra, lobo-guará) ou voando — inclusive os **rasantes**, que voam baixo, quase na altura do rinoceronte.

## 3. Progressão da corrida

- **1 metro = 1 ponto — e, desde a v1.8.4, o que você destrói também pontua.** Cada parede quebrada vale +5, morro +5, torre +15, animal atropelado +3, camada de **qualquer chefe** +25; escapar pelo portão dá +100, derrubar as 3 camadas dele em menos de 20 segundos dá +50, **derrubar a barricada do Cerco dá +150** e chegar ao fim do mundo, +400. O ponto aparece subindo do próprio obstáculo no instante em que você o destrói. O bônus nunca passa do total de metros da corrida, então **correr longe continua sendo o que mais importa**.
- No alto da tela, a **Pontuação** fica em destaque e os **metros** logo abaixo, menores. A tela de fim de corrida mostra a conta completa: quanto veio da distância e de onde saiu cada ponto de bônus.
- **Marcas antigas não foram recalculadas**: quem já tinha recorde continua com ele (valendo como pontuação sem bônus), e vai sendo ultrapassado conforme as pessoas jogam a versão nova.
- A barra no topo mostra o progresso até o portão.
- **Fúria** (ícone de fogo que vai enchendo): é uma **carga** que cresce com a distância percorrida — a primeira enche aos 900 m. Enquanto enche, o rinoceronte acelera (de 300 até 450 pixels/segundo), fica avermelhado, solta fumaça pelas narinas — e a música ganha camadas de instrumentos. Cheia, ela pode ser **gasta** na FÚRIA TOTAL (item 5) e volta a encher correndo.
- **Dificuldade em 6 níveis**, um a cada 200 m: obstáculos mais frequentes, animais mais rápidos, dardos mais velozes, combinações de obstáculos ("combos") a partir dos 400 m.
- **O zoológico persegue de verdade**: animais podem vir **em dupla**, e paredes, espinhos e torres costumam aparecer **escoltados por um animal** logo atrás — a chance de ambos cresce nível a nível (de ~50% até ~80%). O total de perseguidores praticamente **dobrou** em relação às versões anteriores, sem trocar nenhum obstáculo letal por animal (a proporção de paredes/espinhos é a mesma — só o zoológico ficou mais cheio).
- **Abertura guiada:** nas 3 primeiras corridas da vida do jogador, os 3 primeiros obstáculos são fixos e didáticos — um morro aos 90 m (não mata), um espinho aos 125 m (ensina o pulo), uma parede aos 160 m (ensina a investida) — com dicas na tela.
- **O portão dos 1000 m:** virou uma **batalha de chefe** (item 4). Vencida a luta, o portão **explode** com fogos e confete, e a corrida **não para** — começa o **modo infinito** na cidade, à noite.
- **O modo infinito tem dois marcos próprios (v1.8.5):** aos **2000 m** a cidade barrica a avenida (**O Cerco**, o segundo chefe) e aos **9995 m**, na última cerca do mundo, espera o **Caçador-Mor** — vencê-lo é o que faz o jogador virar "**LENDA**" no fim físico do mundo (10.000 m). Os dois estão no item 4.

## 4. As batalhas de chefe

A fuga tem **três** batalhas, todas com a mesma gramática: um alvo blindado em camadas, um atirador no topo, a fresta que brilha como mira, o ricochete que nunca mata (o perigo mora nos tiros) e a **FÚRIA TOTAL bloqueada dentro da arena** (cadeado 🔒 no medidor; a carga continua enchendo e libera na vitória). O que muda de uma para outra é o número e a **ordem** das camadas, o arsenal do atirador e o prêmio.

### 4a. A luta do portão (1000 m)

Perto dos 1000 m a câmera **trava na arena**, soa uma buzina grave e o portão aparece **blindado do chão ao teto**, com um **caçador de rifle tranquilizante** de pé na plataforma do topo. Três escudos (🛡️) acima do portão mostram quantas camadas faltam.

**Como vencer:** investir na camada cuja fresta **brilha com uma moldura dourada pulsante** — é a mira da luta. A ordem é fixa e sobe de dificuldade:

1. **Chão** — investida normal, correndo;
2. **Meio** — pulo + investida na altura certa;
3. **Alto** — pulo duplo + investida **no ar** (a investida aérea voa reto — é a técnica-clímax).

Encostar no portão do jeito errado (sem investir, ou investindo fora da fresta) **não mata**: o rinoceronte **ricocheteia** para trás com um CLANG metálico — e a investida está pronta de novo assim que ele retoma o controle. O perigo mora no rifle: uma **mira laser vermelha** avisa ~0,4 s antes de cada tiro (tiro reto, morteiro em arco que cai onde você está, ou rajada tripla), e a cadência **acelera a cada camada quebrada**. Tiro do rifle é morte na hora ("TRANQUILIZADO! 💤").

Dicas na tela ensinam a mecânica só nos **2 primeiros encontros** da vida do jogador. **A FÚRIA TOTAL não resolve mais a luta**: dentro da arena a ativação fica **bloqueada** (o medidor mostra um cadeado 🔒 e o toque avisa "a fúria não pega no portão"), e mesmo quem entra em chamas — ativou pouco antes da arena — precisa acertar as 3 frestas na ordem: o fogo dispensa a investida, mas **não dispensa mais o alinhamento** (os dados mostravam a luta anulada: 120 camadas quebradas com só 8 mortes). A carga continua enchendo normalmente e **libera assim que o portão cai** — vira o fôlego de largada do modo infinito. Derrubada a terceira camada, o caçador despenca do portão e a festa da fuga acontece. O chefe aparece em **toda** corrida que chega aos 1000 m.

### 4b. O Cerco (2000 m) — a cidade contra-ataca

Mil metros depois da fuga, a cidade **barrica a avenida**: uma estrutura de contenção urbana (concreto e tarjas amarelas de perigo) em **4 camadas**, com o **Capturador** — um agente de intervenção com **canhão de redes** — no topo. As diferenças em relação ao portão:

- A ordem das frestas **não é de baixo para cima**: é **meio → chão → alto → meio**. Decorar a sequência do portão não ajuda — é preciso **ler o brilho dourado**. (A camada do meio é dupla: a primeira quebra a amassa, a segunda a abre de vez.)
- O canhão atira em **leque** (3 dardos abertos ao mesmo tempo) e tem o **rasante** — um tiro reto rente ao chão que atinge quem fica **parado esperando** o padrão passar; pular é a resposta. O morteiro em arco só entra na última camada, como estocada final.
- **Se a luta passar de 45 segundos**, a cadência de tiro sobe um degrau — pressão a mais, nunca um "muro de morte".

**Vencer NÃO para a corrida**: a barricada explode, o Capturador despenca, sobem **+150 pontos** (além dos +25 de cada camada), a medalha 🕸️ **Fura-Bloqueio** fica garantida para o fim da corrida — e a pista segue livre ("🏆 2000m LIVRES!"). A face da barricada fica a ~3 m da marca dos 2000 m, então a medalha "Inalcançável" costuma cair junto. Ser atingido pela rede dá o fim de jogo próprio: "**CAPTURADO! 🕸️**" (o rinoceronte também adormece — ninguém morre neste jogo).

### 4c. O Caçador-Mor (9995 m) — o Guardião do Fim

Na **última cerca do mundo**, a poucos metros da linha da LENDA, espera o chefe final: um caçador imponente de casacão escuro e rifle ornamentado, defendendo **5 camadas em vaivém** — **chão → meio → alto → meio → chão** — com o arsenal dos dois chefes anteriores misturado (retos, morteiros, leques e, na última camada, o rasante). A arena são os próprios 1500 pixels livres da chegada: nenhum obstáculo nasce ali.

**Vencer é virar LENDA**: derrubada a quinta camada, dispara a cutscene do fim do mundo — o banner "🏆 LENDA!", os fogos, o confete — com a medalha 👑 **Lenda do Mundo** e o bônus de +400 pontos da LENDA. Antes da v1.8.5, bastava alcançar os 10.000 m; agora o fim do mundo tem um guardião, e a marca máxima do jogo é uma **vitória**, não uma chegada.

## 5. FÚRIA TOTAL (o especial)

Com o medidor de fogo **cheio** (ele pulsa e a tela avisa), toque nele — ou **↓**/**Shift** no teclado — para transformar o rinoceronte:

- Ele **pega fogo** (sprite próprio, em chamas) e fica **invencível por ~6 segundos**;
- **Tudo o que colide explode**: paredes (mesmo fora da fresta), torres, animais, dardos, morros rasantes e **até o espinho**, que nenhuma investida normal destrói;
- Corre **25% mais rápido** por cima da velocidade de fúria cheia;
- O medidor **drena** com o tempo; na reta final o rinoceronte pisca avisando que o fogo vai apagar.

Depois de gasto, o medidor volta a encher com a distância (~900 m por carga). A invencibilidade cobre colisões — cair num buraco continua valendo o de sempre. **Nas arenas dos três chefes a ativação é bloqueada** (ver item 4); o aviso de "fúria cheia" que ficou devendo dispara na saída da luta. Skins criadas no estúdio podem ter uma **transformação de fúria própria** (uma arte em chamas exclusiva) em vez do fogo padrão.

## 6. Cenário vivo

- **6 biomas** (ambientes), um a cada 200 m: jaulas → aviário → savana → floresta tropical → pântano → **cidade** (no modo infinito). A troca é um acontecimento: um arco atravessa a tela com o nome do setor.
- Na cidade, **todo obstáculo muda de visual** (mesmas mecânicas): a parede vira fachada de prédio, a torre vira poste de vigilância, o chão vira asfalto com tráfego ao fundo.
- **Céu**: dia pleno → entardecer chegando junto com o portão (a fuga acontece no pôr do sol) → noite. Depois de ~1450 m ele passa a ciclar: um dia inteiro a cada 600 m.
- **Clima**: limpo, chuva, neblina ou tempestade com raios e trovão. Os 8 primeiros trechos são roteirizados (neblina na floresta, tempestade logo após a fuga); dali em diante é sorteado de forma determinística (o mesmo trecho tem sempre o mesmo clima).

## 7. A tela inicial, recordes, ranking e apelido

**A tela inicial virou a vitrine do jogo (v1.8.1)**, desenhada para provocar o retorno e a caça ao recorde:

- **Título em chamas** — "FURIOUS RHINO" em fonte cartoon com labaredas e brasas animadas (a fonte vem da internet; sem conexão, o jogo usa uma parecida do próprio aparelho — nada quebra).
- **Pódio mundial ao vivo** — os 3 primeiros do ranking em pedestais de ouro/prata/bronze, cada um representado pela **skin que usava quando cravou a marca** (marcas antigas, de antes da v1.8.1, aparecem com o rinoceronte original), com nome, distância e **há quantos dias segura a posição** ("no trono há 12d"). Aqui a contagem é da **posição**: se alguém novo assume o 1º lugar, os contadores de quem caiu recomeçam naquele dia (efeito cascata) — diferente da lista completa do top 10, que mede a idade de cada marca. O pódio se atualiza sozinho (no máximo a cada 6 horas, para poupar o banco de dados) e funciona offline com a última foto conhecida.
- **O degrau VOCÊ** — um quarto pedestal tracejado ao lado do 3º lugar, com uma seta dourada apontando: sua skin animada, sua posição no mundo, o botão **🎨 Trocar skin** e a provocação de quantos metros faltam para o pódio (ou "🛡️ defenda o seu posto!", para quem já está lá).
- **Box Campanha** — recorde, tentativas, fugas, "maior inimigo" (a causa de morte mais comum) e um **minigráfico das últimas 10 corridas** (barra dourada = a melhor; linha tracejada = o recorde), com os botões de apelido e "Minhas estatísticas completas".
- **Diário da Fuga** — a área de notícias: o primeiro card é o **aviso do criador** (editado no console do Firebase, sem publicar código — é onde as novidades de cada versão são anunciadas); os demais são acontecimentos do próprio jogador: skin desbloqueada, **entrou no pódio**, **perdeu o pódio**, recorde novo. Cada acontecimento aparece uma única vez.
- As instruções de jogo (pulo/investida) ficam em texto ao lado do **TOQUE PARA COMEÇAR** pulsante — e tocar em qualquer lugar livre da tela continua iniciando a corrida.

Os registros e o ranking:

- **Recorde local**: fica salvo no aparelho e aparece no box Campanha.
- **As Areias do Tempo (v1.8.10)**: depois da cidade, o deserto (2200–4700 m) em cinco etapas — dunas, oásis, escavação, Vale dos Faraós e necrópole — com armadilhas novas (areia movediça, flecheira, caixote), flechas de arqueiros e obeliscos, e DOIS chefes: a Barreira da Escavação (3650 m, o Cerco reformado) e o **Faraó de Bronze** (4700 m, o mais agressivo do jogo — 5 camadas, Espelho de Rá e Mergulho de Hórus). Vencer libera o deserto infinito até o fim do mundo.
- **Estado de Alerta (v1.8.7)**: a cidade (1000–2200 m) tem três distritos — Subúrbio Sonolento, o Despertar e a Zona de Contenção — com inimigos, armadilhas e visual próprios, portais marcados em 1400/1800/2200 m, o boss **Muralha** aos 2000 m (4 camadas abrindo pelo alto) e a **Brecha** como saída triunfal. O Cerco foi realocado para o deserto (volta numa versão futura).
- **Arena de Desafios (v1.8.6)**: o botão **Desafiar** abre o **diretório completo de adversários** (todo mundo do ranking, em ordem alfabética, com busca que ignora acentos) — toque no nome para marcar um ou vários (até 7) e envie um desafio de 1, 3 ou 7 dias; vence a melhor corrida em pontos dentro do prazo. As espadinhas ⚔️ do top 10 seguem como atalho. O desafiado recebe o convite ao abrir o jogo e só entra no placar se aceitar. Os cards dos desafios ocupam o lugar do box Campanha na tela inicial enquanto houver disputa (até 3 empilhados — sem desafios, a Campanha volta): participantes, melhor marca de cada um, 👑 no líder e o tempo restante; na corrida, os adversários aparecem como estacas vermelhas na pista. **O criador pode encerrar um desafio antes do prazo** (botão Encerrar, com confirmação) — os desafiados veem o aviso "Fulano cancelou o desafio" e um desafio cancelado não convida, não pontua e não planta estaca. Para desafiar é preciso ter apelido próprio; o limite de 3 disputas simultâneas conta as que você criou **ou** aceitou.
- **Ranking mundial** (em pontos desde a v1.8.4, com a distância ao lado): a lista completa abre no botão **"ver top 10 ›"** ao lado do pódio. Para entrar, o jogador escolhe um **apelido único** (3–12 caracteres — o jogo confere se já existe; acentos e maiúsculas não diferenciam: "Thómas" e "thomas" são o mesmo apelido). Ao lado da distância de cada um aparece **há quantos dias aquela marca está de pé** ("há 12d", ou "hoje" para marca do dia) — trocar de apelido não zera a contagem nem troca a skin da vitrine.
- Quem prefere **"Ficar anônimo"** recebe um nome automático (`Anonimo_7`). O jogo volta a convidar para escolher um nome de verdade **no momento de orgulho** — logo depois de o score subir no ranking ("🏆 Você é o #7 do mundo!") — no máximo 1 vez a cada 3 corridas, e nunca de forma bloqueante.
- **Marcas na pista**: durante a corrida, estacas mostram onde fica **o seu recorde** (🏅), o **rival logo acima de você** no ranking (⚔️) e o **líder mundial** (👑). Ultrapassar cada uma provoca o jogador na tela.
- **Convite por WhatsApp**: botão para chamar amigos, com link direto do jogo.

## 8. Medalhas

19 conquistas salvas no aparelho (não dependem de internet). Desde a v1.8.1 elas são vistas dentro de **"📊 Minhas estatísticas"** (a faixa de ícones saiu da tela inicial para dar lugar ao pódio). Exemplos:

| Medalha | Como ganhar |
|---|---|
| 🐾 Primeira corrida | Jogar 1 vez |
| 🗽 Livre! | Cruzar o portão dos 1000 m |
| 🧱 Demolidor | Quebrar 5 paredes numa corrida |
| 🚜 Escavadeira | Destruir 3 morros numa corrida |
| ⚡ Torre Abaixo | Derrubar 2 torres numa corrida |
| 🦁 Rolo Compressor | Atropelar 10 animais (total da vida) |
| 🎖️ Superação | Dobrar o próprio recorde |
| 🏆 Inalcançável | Chegar a 2000 m |
| 🕸️ Fura-Bloqueio | Derrubar a barricada do Cerco (2000 m) |
| 👑 Lenda do Mundo | Vencer o Caçador-Mor no fim do mundo |

## 9. Skins (a aparência do rinoceronte)

O botão **🎨 Skins** na tela inicial abre o guarda-roupa. A skin escolhida veste o rinoceronte na tela inicial (o preview animado troca na hora) e em toda corrida, sem mudar **nada** da física ou das colisões — é só aparência. A escolha fica salva no aparelho. Desde a v1.8.0 o rinoceronte também é exibido **30% maior** em todas as skins (a caixa de colisão continua exatamente a mesma — só a imagem cresceu, para o protagonista não ficar menor que um leão).

O elenco é **vivo** — o criador cria, edita e tira skins do ar pelo **estúdio de skins** (ver abaixo), então esta tabela é um retrato do lançamento da v1.8.0 (as skins de Ouro/Prata/Bronze originais existem, mas estão fora do ar no momento):

| Skin | Como conseguir |
|---|---|
| **Furious Rhino** | O original — sempre disponível |
| 🎉 **Thanks for playing** | Grátis para todos: o rinoceronte de chapéu de festa e língua-de-sogra |
| 🤖 **Rino Robô** | Grátis para todos: latão, vapor e chifre de energia |
| 🥇 **MecaGold** | **Exclusiva de quem está em 1º no ranking mundial** |
| 🥈 **MecaSilver** | Exclusiva do 2º do mundo |
| 🥉 **MecaBronze** | Exclusiva do 3º do mundo |
| 😎 **Rhino do Catisquick** | Conquista permanente: **derrubar 5 torres E vencer o caçador na mesma corrida** |

As skins de pódio são um **privilégio dinâmico**, não um desbloqueio: caiu de posição, a skin volta ao original sozinha (com um aviso explicando); recuperou o pódio, ela volta a vestir sem precisar reescolher — a escolha nunca é apagada. O jogo revalida a posição ao abrir e ao entrar no guarda-roupa. Cada degrau tem a sua skin: a do nº 1 só veste no nº 1, e a do nº 2 só no nº 2.

As conquistas são **retroativas**: quem já tinha feito a façanha nas últimas 50 corridas ganha a skin no primeiro jogo após a atualização. Conquistas novas criadas no estúdio seguem a mesma regra — o jogo revê o histórico recente e concede o que já foi merecido.

### O estúdio de skins (`/?setup`, aba 🎨 — só para o criador)

A página `/?setup` é o **estúdio do dono**, com três abas: 🎨 Skins (esta seção), 🖼️ Sprites e 📊 Radiografia (as duas últimas na **seção 15**). Na aba Skins o criador faz uma skin nova **de ponta a ponta, sem programar**: solta a folha de desenhos (gerada por IA), escolhe os 3 quadros do galope, ajusta a paleta, vê a prévia animada, dá nome e descrição e **configura como o jogador ganha a skin** — as opções são:

- 🎁 **Grátis** — disponível para todo mundo;
- 🏆 **Pódio** — exclusiva de uma posição exata do ranking (1º, 2º ou 3º), com a mesma dinâmica de "perdeu o posto, perdeu a skin";
- 🎯 **Conquista numa corrida** — combinação de critérios que precisam sair na MESMA corrida: correr X metros, derrubar Y torres, vencer o caçador do portão, escapar do zoológico. O texto do cadeado no guarda-roupa é gerado sozinho a partir da regra;
- 📈 **Totais de vida** — soma de todas as corridas: jogar X corridas, completar Y fugas, atropelar Z animais.

Depois de criada, a skin pode ser **editada** (nome, descrição, regra de desbloqueio) e tem uma chave **"no jogo / fora do jogo"**: desligada, a skin some do guarda-roupa na hora — reversível, ninguém perde a conquista, e quem a estava vestindo volta ao rinoceronte original até ela voltar. **Qualquer skin pode ser removida de vez** — inclusive as originais, com um aviso extra lembrando que a arte delas não tem cópia no gerador; a única intocável é a Furious Rhino original, o "plano B" de todas as outras.

Um detalhe importante: a página funciona no computador do criador (ela conversa com um programa local que grava os arquivos do jogo) e **nada vai ao ar sozinho** — a skin nova só chega aos jogadores na próxima publicação do jogo. Cada gravação roda a bateria de testes automaticamente e **desfaz tudo se algo reprovar**, então o jogo nunca fica quebrado no meio do caminho.

**Subir o estúdio é um duplo-clique** (desde a v1.8.8): o `iniciar-estudio.bat`, na pasta do jogo, liga o **servidor unificado** (que serve o jogo E o gerador de uma vez) e já abre a página no endereço certo. O card **"Servidores locais"** no topo mostra as duas linhas de status — o jogo (quem está servindo a página, com tempo no ar) e o estúdio (endereço e porta) — e tem o botão **⏻ Parar servidor** (com aviso quando parar derruba a própria página). Se o servidor estiver parado, a página explica os caminhos para subi-lo.

## 10. "📊 Minhas estatísticas" (para o jogador)

Botão na tela inicial. Abre **na hora e funciona offline** (lê tudo do próprio aparelho): recorde, número de corridas e fugas, tempo jogado, um minigráfico das últimas corridas, "onde você morre" (por causa), dicas personalizadas (ex.: *"você ainda não usou a INVESTIDA"*), medalhas e sua posição no ranking. Dá para **compartilhar** o resumo formatado no WhatsApp.

## 11. Instalação como aplicativo (PWA)

O jogo é um **PWA** (Progressive Web App — site que se comporta como aplicativo instalado). Uma vez por sessão, um convite não-bloqueante aparece:

- **Android/Chrome**: um botão instala direto.
- **iPhone/iPad**: instruções do "Compartilhar → Adicionar à Tela de Início".

Instalado, o jogo abre em tela cheia, na horizontal, e **funciona sem internet** (só o ranking precisa de rede).

## 12. Painel `/?stats` (para o administrador)

Página pública de estatísticas agregadas: `https://cs-ave.github.io/furious-rhino/?stats`. Seis abas:

| Aba | O que mostra |
|---|---|
| 🦏 **Visão geral** | Jogadores, execuções, fugas, tempo total; jogadores únicos × execuções por dia; **funil** de quantos chegam a cada marco — inclusive os da cidade, até 2200 m, com os nomes dos distritos; melhor marca dia a dia |
| 💀 **Dificuldade** | Histograma de onde os jogadores morrem; mapa de calor causa × distância; **curva de aprendizado** (o jogador melhora com a prática?) |
| 📈 **Engajamento** | Retenção (quantos voltam depois de 1, 7, 30 dias); horários de jogo; duração das corridas; quem abandona × quem é fiel |
| 💨 **Mecânicas** | Quem usa a investida (e a Fúria Total) e se isso melhora o desempenho; atrito com a recarga; **"A luta do portão"** (tentativas contra o chefe, taxa de fuga, mortes pelo rifle, duração e quiques médios); teclado × toque |
| 🌍 **Público** | Aparelhos, sistemas, navegadores, países e cidades (aproximados), versões do jogo |
| 👥 **Jogadores** | Lista pesquisável com ficha individual de cada jogador — **só com a chave** |

As duas últimas visões detalhadas exigem uma **chave numérica** (`/?stats=0929`) — não é segurança de verdade, só afasta curiosos; os dados já são anônimos.

**Exemplo real de uso:** os dados mostraram que 16% das corridas morriam aos 34 m, no primeiro obstáculo. Resultado: nasceu a abertura guiada (item 3), e a mediana da primeira corrida melhorou. Todas as decisões desse tipo estão registradas no `GAME_DESIGN.md`.

## 13. Notificações do administrador (ntfy)

O criador recebe *pushes* (notificações no celular) via **ntfy** (serviço gratuito de notificações por tópico):

- **🎮 Início de sessão** — "fulano começou a jogar" (1 vez por aba), com local e recorde.
- **📋 Resumo da sessão** — ao fechar o jogo ou após 15 min: duração, corridas, melhor marca, principais causas de morte.
- **🏆 Recorde mundial** — quando alguém passa o líder (confirmado no servidor, nunca por dado velho).
- **📊 Resumo diário** — todo dia às 20h (Brasília), por um robô automático (GitHub Actions — serviço que executa tarefas agendadas no repositório): compara hoje × ontem e **dispara até nos dias sem jogadores** (que é justamente a informação mais importante).

Controles úteis (parâmetros na seção D do `HANDOFF.md` e em [`04-referencia-tecnica.md`](04-referencia-tecnica.md)):

| Quero... | Como |
|---|---|
| Testar os pushes sem jogar | Abrir o jogo com `/?ntfy=test` |
| Não receber push das minhas próprias partidas | Abrir `/?ntfy=off` no meu aparelho (`/?ntfy=on` reativa) |
| Mudar limiares sem publicar código | Editar o documento `config/notify` no console do Firebase |
| Silêncio noturno | Já ativo das 0h às 7h (horário de Brasília) |

## 14. Modo debug (para desenvolvimento)

Abrir o jogo com `/?debug=1` liga um painel de ajustes ao vivo (física do rinoceronte, dificuldade por nível — incluindo **os pesos do sorteio de obstáculos e a densidade de animais** (dupla e escolta, ver o guia de calibração no [`04-referencia-tecnica.md`](04-referencia-tecnica.md)) —, velocidade e **força do voo do atropelo** dos animais, e duração/boost da Fúria Total). Os chefes têm uma **pasta própria "Bosses"** com Portão, Muralha e Guardião: sliders de cadência camada a camada, tempo do enrage, o liga/desliga do **bloqueio da fúria na arena** e um botão **"Pular p/ 50 m antes"** de cada arena. Além disso: ver as caixas de colisão, invencibilidade, avançar quadro a quadro, teleportar para os 600 m ou para o portão, **encher a fúria na hora**, **vestir qualquer skin sem desbloqueio**, **ajustar a escala visual do rinoceronte ao vivo** (pasta "Skins" — só naquela sessão, nada fica salvo), um toggle de **"Escrita local (Firestore)"** para testes com gravação real, e **exportar os ajustes** num arquivo pronto para colar no código. O painel tem barra de rolagem permanente (o menu é longo).

## 15. As outras abas do estúdio (`/?setup` — só para o criador)

Além da aba 🎨 Skins (seção 9), o estúdio tem duas abas novas:

### 🖼️ Sprites (v1.8.9) — a gestão de todos os desenhos do jogo

- **📚 Catálogo**: todos os personagens do jogo (as 38 espécies de animais/inimigos, os 4 caçadores dos chefes, o rinoceronte com as skins e os ícones do painel), cada um **animado do jeito que anima no jogo** (mesma velocidade de quadros), com o **local onde aparece** (bioma, distrito da cidade, chefe...), o tipo de movimento (voa, pula, atira, zigue-zague) e um interruptor "tamanho de jogo" que mostra tudo na escala real da corrida. O cenário (paredes, rampas, fundos) fica fora — é desenhado por código, não por arquivos.
- **✏️ Parâmetros por espécie**: cada espécie expande num editor — velocidade, pulo, voo, tiro e a **caixa de colisão desenhada por cima do desenho** (arrastando os números, o retângulo se move na hora). **Salvar grava no jogo de verdade** (num arquivo de calibração separado — o código de design fica intocado), **roda a bateria de testes e desfaz tudo se algo reprovar**. Um selo "● N ajustes" marca quem foi calibrado; **Reverter** devolve a espécie ao original. Mudanças valem no próximo F5 do jogo — e só chegam aos jogadores na próxima publicação, como sempre.
- **⚙️ Gerar inimigo**: o mesmo fluxo do gerador de skins, adaptado — folha de desenhos com **2 células** (o corpo igual nas duas; só a peça móvel muda: pernas, asa ou hélice), tamanho livre, tipo do segundo quadro e arquétipo. O resultado mostra a prévia animada e a **caixa de colisão sugerida** (medida automaticamente do desenho) e cai em...
- **📥 Não atribuídos**: o estoque dos sprites gerados que ainda **não estão no jogo**. Dali, cada um pode ser **excluído** ou **atribuído** de duas formas: **substituir a arte de uma espécie existente** (o vira-lata ganha um visual novo, por exemplo — o estúdio confere se o tamanho e o tipo de animação batem) ou **criar uma espécie NOVA de ponta a ponta**: comportamento por arquétipo, caixa de colisão e a escolha de **em quais biomas/distritos** ela aparece — com um resumo do que será gravado antes de confirmar, e as mesmas proteções (bateria de testes + desfazer tudo).

### 📊 Radiografia (v1.8.7) — a análise de usabilidade sob demanda

Um botão **▶ Rodar análise** baixa os dados públicos do jogo (mesmos do painel `/?stats`) e monta a **radiografia completa**: funil de distância, retenção, curva de aprendizado, uso das mecânicas, os três chefes, a pontuação composta em campo, skins e a Arena — cada número comparado com a **fotografia de 16/08/2026** (a linha de base congelada). No fim, um **motor de insights** transforma os números em diagnósticos automáticos com cor de severidade (🔴🟠🟡🟢 — e ⚪ quando a amostra é pequena demais para afirmar qualquer coisa). Dá para **copiar o relatório inteiro** (pronto para colar no banco de ideias) e **baixar os dados** em arquivo. A mesma análise roda no terminal com `npm run radiografia`. Tudo é **só leitura** — a análise nunca grava nada no banco.
