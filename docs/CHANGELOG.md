# Furious Rhino — Histórico de versões (CHANGELOG)

> O que mudou em cada versão, em linguagem simples. A entrada mais recente fica no topo.
> Mantido pelo comando `/atualizar-docs` a cada release.

---

## v1.8.10 — 23/08/2026 (versão atual)

**Tema: As Areias do Tempo — a estrada acaba, e o deserto engole.**

- **A fase do deserto** (2200–4700 m), em cinco etapas de 500 m: a **Estrada Engolida** (dunas comendo o asfalto, camelos em disparada, abutres), a **Miragem do Oásis** (água traiçoeira com crocodilos e najas), o **Sítio da Escavação** (múmias acordando, escaravelhos e o arqueiro de flechas), o **Vale dos Faraós** (paredes-pirâmide com hieróglifos, obeliscos que atiram FLECHAS, o Falcão de Hórus em zigue-zague) e a **Necrópole de Areia** (tempestade de areia, tudo junto).
- **DOIS combates**: no meio, **a Barreira da Escavação** (3650 m) — o Cerco, prometido desde a v1.8.5, finalmente vivo, reformado com sacos de areia e andaimes; no fim, **O FARAÓ DE BRONZE** (4700 m) — o defensor mais agressivo do jogo: 5 camadas abrindo pelo MEIO, a cadência mais curta de todas, o **Espelho de Rá** (o feixe de luz que varre até onde o tiro vai cair) e o **Mergulho de Hórus**. Vencer derruba a muralha de arenito e o modo infinito segue pelo deserto profundo até o fim do mundo.
- **Armadilhas novas**: areia movediça (pule por cima!), a flecheira (atravesse no ritmo do glifo) e o caixote de escavação (destrua na investida).
- **9 perseguidores novos** + elenco por etapa; nas etapas do deserto o tempo derrete: os 2500 m atravessam ~4 dias inteiros do ciclo de céu.
- **Medalhas**: o "Fura-Bloqueio" (dormia desde a v1.8.7) **acordou** apontando para a Barreira; entram Miragem do Oásis, Vale dos Faraós, Necrópole, "Atravessou o Deserto" e o "Quebra-Faraó" — 27 no total.
- O funil do `/?stats` agora mede até 4800 m com os marcos do deserto rotulados.
- Mudança nas regras do banco: o mapa de causas de morte aceita as duas novas (`cerco`/`farao`) — publicada antes desta versão ir ao ar.

## v1.8.9 — 23/08/2026

**Tema: a aba 🖼️ Sprites — o elenco inteiro do jogo na mão do criador.**

- **O estúdio ganhou a terceira aba: 🖼️ Sprites.** Um **catálogo vivo** de todos os personagens do jogo (as 38 espécies, os caçadores dos chefes, o rinoceronte com as skins e os ícones do painel), cada um **animado do jeito que anima na corrida**, com o lugar onde aparece, o tipo de movimento e um interruptor que mostra tudo no tamanho real do jogo.
- **Calibrar uma espécie virou coisa de tela**: velocidade, pulo, voo, tiro e a **caixa de colisão desenhada por cima do desenho** — salvar grava no jogo de verdade, **roda a bateria de testes e desfaz tudo sozinho se algo quebrar**. Um selo mostra quem foi ajustado e um botão devolve a espécie ao original. (O código de design continua intocado: os ajustes moram num arquivo próprio, aplicado por cima.)
- **Gerar um inimigo novo é o mesmo fluxo das skins**: folha de desenhos com 2 células, tamanho livre, prévia animada e a caixa de colisão **sugerida automaticamente** pelo desenho. O resultado cai num **estoque de "não atribuídos"** — dali, ou ele **substitui a arte de uma espécie existente** (com conferência de tamanho e tipo de animação), ou vira uma **espécie NOVA de ponta a ponta**: comportamento, colisão e em quais trechos do mundo ela aparece — com um resumo do que será gravado antes de confirmar e as mesmas proteções de sempre.
- Proteções que vêm de fábrica: a floresta segue sem voadores (regra de design), todo trecho do mundo mantém ao menos um inimigo terrestre, e a Brecha continua só com pombos — a bateria de testes reverte qualquer gravação que quebre isso.

## v1.8.8 — 23/08/2026

**Tema: o estúdio virou um clique só — um servidor, um atalho, um painel de status.**

- **`iniciar-estudio.bat`**: um duplo-clique no atalho (na pasta do jogo) liga tudo — o servidor local passou a servir **o jogo e o gerador de uma vez** (e convive em paz com o jeito antigo de subir o jogo, se você preferir) — e abre o estúdio já no endereço certo. Acabou a confusão de "qual porta abro?".
- **Card "Servidores locais"** no topo do estúdio: uma linha para o jogo (quem está servindo a página e há quanto tempo) e uma para o gerador (endereço e porta), com o botão **⏻ Parar servidor** — e um aviso esperto quando parar derruba a própria página. A página antiga do gerador foi aposentada.
- **Encerrar desafio**: o criador de um desafio da Arena pode encerrá-lo antes do prazo (com confirmação). Os desafiados veem o aviso do cancelamento, e um desafio cancelado não convida, não pontua e não planta estaca. (Regras do banco atualizadas e publicadas para isso.)
- **A home se reorganiza sozinha**: com desafios ativos, os cards das disputas ocupam o lugar do box Campanha (até 3 empilhados) — sem disputa, a Campanha volta. O botão "Instalar o jogo" foi para a esquerda, na mesma linha dos demais.

## v1.8.7 — 22/08/2026

**Tema: Estado de Alerta — a cidade acorda, e ela não gostou de você.**

- **A cidade virou três distritos com personalidade** (1000–2200 m): o **Subúrbio Sonolento** (madrugada, comércio fechado, a cidade nem sabe quem você é), **o Despertar** (o dia amanhece junto com o pânico — telões "PROCURADO", drones de plantão) e a **Zona de Contenção** (holofotes varrendo o escuro: agora é uma operação para te parar). Cada um com prédios, cores, inimigos e armadilhas próprios — e portais físicos bem marcados: o **Viaduto do Centro** (1400 m), o **Checkpoint da Contenção** (1800 m) e o **Pórtico da Rodovia** (2200 m).
- **11 perseguidores novos** — do vira-lata e do gato de beco às tropas de escudo, passando pela **Pipa Cortante** (voa em zigue-zague), pela **camionete do capturador** e pelo **drone-sentinela** (os dois ATIRAM dardos, com aviso antes). Derrubar o drone-sentinela vale como torre. Os inimigos que já existiam foram redistribuídos: cada distrito tem o seu elenco.
- **Armadilhas de rua**: a caçamba de entulho (pule ou destrua na investida), o hidrante rompido (a coluna d'água liga e desliga — atravesse no ritmo) e o arco voltaico (elétrico, no ALTO — desta vez a resposta é NÃO pular).
- **Boss novo aos 2000 m: a MURALHA.** A cidade fechou o viaduto com viaturas empilhadas e um Comandante na torre de holofote. Quatro camadas que abrem **pelo alto** (tudo que os distritos ensinaram, cobrado de uma vez), granada-de-luz cujo aviso é o próprio holofote varrendo até onde ela vai cair, e um K9 rasante para quem fica parado. Vencer derruba a barricada e libera a **Brecha** — 200 m de volta olímpica com rampas e pombos, o amanhecer nascendo, até o Pórtico da Rodovia. *(O Cerco não sumiu: foi promovido a porteiro do deserto e volta mais adiante na estrada.)*
- **Medalhas dos distritos**: marcos novos em 1400/1800/2200 m, "Queda da Muralha", e os nomes antigos re-batizados no vocabulário da cidade.
- **O funil do painel `/?stats` agora mede a fase** (faixas até 2200 m com os marcos rotulados) — é a régua que dirá se a cidade segura os jogadores como foi desenhada para segurar.
- Por dentro: zero mudança nas regras do banco, zero dado novo por corrida — e o pool de dardos cresceu para a cidade inteira poder atirar sem tiro engolido.
- **📊 Radiografia viva** (também nesta versão): a análise de usabilidade que antes exigia recriar um script virou ferramenta permanente — a aba 📊 do estúdio (e o comando `npm run radiografia`) baixa os dados públicos, monta o relatório completo (funil, retenção, aprendizado, chefes, pontuação em campo, Arena) comparado com a fotografia de 16/08, e um **motor de diagnósticos automáticos** aponta o que melhorou e o que pede atenção — dizendo "amostra pequena demais" quando não há base para afirmar. Tudo só leitura; a primeira medição real saiu no mesmo dia (e foi ela que revelou que as versões novas ainda não tinham chegado aos jogadores).
- **Desafiar ficou mais fácil**: o botão abre o diretório completo de adversários (com busca), não só o top 10; e o painel `?debug=1` ganhou a pasta "Bosses" (cadências dos três chefes + atalho para cada arena).

## v1.8.6 — 22/08/2026

**Tema: a Arena de Desafios — chame um amigo (ou a turma toda) para uma disputa com prazo.**

- **Desafie quem quiser do top 10.** Cada linha do ranking ganhou uma espadinha ⚔️: marque um jogador (ou vários — até 7 de uma vez) e envie um desafio de **1, 3 ou 7 dias**. Vence quem fizer a **melhor corrida em pontos** dentro do prazo — dá para virar no último dia.
- **O desafiado decide.** Ao abrir o jogo, quem foi desafiado vê o convite ("⚔️ Fulano te desafiou! Topa?") e escolhe aceitar ou recusar. **Só quem aceita entra no placar** — ninguém é exposto numa disputa sem querer. Recusou? O convite some e não volta.
- **O placar mora na tela inicial**: um card mostra quem está no desafio, a melhor marca de cada um, a coroa 👑 em quem lidera e o tempo restante ("termina em 2d 14h"). Quando o desafio acaba, o resultado vira notícia no Diário da Fuga.
- **A provocação entra na pista**: os adversários do desafio viram estacas vermelhas na corrida, plantadas na distância da melhor corrida deles — ultrapassar solta o grito ("⚔️ VOCÊ PASSOU FULANO NO DESAFIO!"). Na largada, um aviso diz o número a bater.
- **Para desafiar é preciso ter apelido próprio** (quem ainda é "Anonimo_N" escolhe um na hora); ser desafiado não exige nada. Cada jogador mantém no máximo 3 desafios criados ao mesmo tempo.
- Por dentro: o desafio guarda só os metadados (quem, prazo, aceites) numa coleção nova do banco — **o placar é calculado a partir das corridas que o jogo já registrava**, sem nenhum dado novo por corrida. Regras do banco publicadas antes desta versão ir ao ar.

## v1.8.5 — 21/08/2026 

**Tema: o deserto depois do portão ganhou dois chefes — a fuga agora tem três batalhas.**

- **Boss novo aos 2000 m: "O Cerco".** A cidade barricou a avenida: uma barricada de contenção blindada em **4 camadas**, com o **Capturador** (um agente com canhão de redes) no topo. A ordem das frestas **não é mais de baixo para cima** (meio → chão → alto → meio) — é preciso ler o brilho dourado em vez de decorar a sequência do portão. O canhão atira em **leque** (3 dardos abertos) e tem o **rasante**, um tiro rente ao chão que pune quem fica parado esperando; o morteiro só entra na última camada. Se a luta passar de 45 segundos, a cadência sobe um degrau (nunca vira "muro de morte"). **Vencer não para a corrida**: a barricada explode, rende **+150 pontos** (além de +25 por camada) e a medalha 🕸️ **Fura-Bloqueio** — e a pista segue livre. Ser atingido pela rede dá o fim de jogo próprio "**CAPTURADO! 🕸️**".
- **Boss final aos 9995 m: o "Caçador-Mor"** (o Guardião do Fim). Na última cerca do mundo, um caçador imponente defende **5 camadas em vaivém** (chão → meio → alto → meio → chão) com o arsenal dos dois chefes anteriores misturado. **Vencê-lo é o novo jeito de virar LENDA**: a cutscene do fim do mundo é a festa da vitória, com a medalha 👑 **Lenda do Mundo** (e o bônus de 400 pontos da LENDA, que já existia). Antes, bastava chegar aos 10.000 m — agora o fim do mundo tem um guardião.
- **Por que ali:** os dados mostraram um **deserto entre 2000 m e 10.000 m** — depois do portão a dificuldade ficava plana e não havia nenhum marco até a LENDA (só 10 corridas na janela medida passaram de 2000 m). O Cerco fica a ~3 m da medalha "Inalcançável" (2000 m), que vira o prêmio natural da luta.
- **Por dentro** (invisível para o jogador): a luta de chefe virou um sistema **paramétrico** — os três chefes são o mesmo mecanismo com tabelas diferentes, o que evita a cópia de código que costuma criar travamentos. O funil de estatísticas ganhou as causas de morte "Capturador" e "Caçador-Mor", e a telemetria registra as camadas e a duração das lutas novas.
- Duas suítes de teste novas (`test-boss2`, 13 verificações; `test-boss3`, 10) garantem, entre outras coisas, que **vencer o Cerco não encerra a corrida** e que **vencer o Guardião dispara a LENDA**.

## v1.8.4 — 21/08/2026

**Tema: o ranking deixa de ser só distância — agora vale o que você derruba pelo caminho.**

- **Pontuação composta.** A corrida passa a valer **metros + pontos por façanha**: cada parede quebrada, morro destruído, torre derrubada, animal atropelado e camada do portão soma pontos, e escapar pelo portão, derrubar as 3 camadas em menos de 20 segundos ("blitz") e chegar ao fim do mundo valem bônus de fim de corrida. **O ranking mundial passa a ordenar pelo total**, e é ele que aparece no pódio e no top 10, com a distância ao lado ("1.234 pts · 987 m").
- **Ninguém foi recalculado.** As marcas antigas continuam exatamente como estavam — valem como total sem bônus. Quem jogar a versão nova vai passando por cima delas naturalmente, e quem ainda usa uma versão antiga do jogo continua enviando marca válida, sem sumir da lista.
- **Os pontos aparecem na hora**: um "+5" dourado sobe do obstáculo que você acabou de destruir e some. No alto da tela, a **Pontuação** ficou em destaque, com os metros logo abaixo em letra menor — a distância continua sendo a façanha física, e é ela que aparece na tela de fim de corrida, nas medalhas e nas estacas da pista.
- **A tela de fim mostra a conta**: quanto veio de distância, quanto veio de bônus, e de onde saiu cada ponto.
- **O degrau VOCÊ do pódio ganhou nome e marca**, no mesmo formato dos três primeiros — antes só tinha a seta, o rinoceronte e o botão de trocar de skin.
- **Quem já joga não atravessa mais 190 metros vazios.** A abertura guiada (morro → espinho → parede, sem nenhum bicho) era aplicada a todo mundo em toda corrida. Agora ela vale só para quem está aprendendo (menos de 3 tentativas): a partir daí a corrida começa povoada, com animais desde o começo — mais coisa para enfrentar e para pontuar.
- Mudança nas regras do banco de dados: um campo novo e opcional em `scores` (os metros da marca), publicado antes desta versão ir ao ar.

## v1.8.3 — 16/08/2026

**Tema: o ranking liga de verdade — e o dardo ficou impossível de não ver.**

- **Consertado o bug que impedia as skins de pódio de desbloquear.** A consulta que descobre a sua posição no mundo chamava uma função com o nome errado do banco de dados — e como falhas de rede são silenciosas por design, a posição **nunca chegava ao aparelho de nenhum jogador real** (descoberto quando o nº 3 do mundo não conseguiu vestir a skin de bronze). Com o conserto, a posição chega, as skins de pódio desbloqueiam sozinhas, o "Sua posição: #N" do ranking e o "Você é o #N do mundo" do convite de apelido passam a funcionar para todo mundo — na prática, a família inteira de recursos de posição ligando pela primeira vez.
- **O pódio da tela inicial estreou vestido**: os 3 primeiros do mundo receberam as skins dos seus degraus na vitrine (ajuste pontual do criador; daqui em diante cada recorde novo registra sozinho a skin usada).
- **O dardo tranquilizante está 50% maior e vermelho vivo** com contorno preto — era pequeno e difícil de ver. Só a imagem cresceu: a área de acerto continua exatamente a mesma (a folga visual é a favor do jogador). O dardo dourado do caçador do portão mantém a identidade.

## v1.8.2 — 16/08/2026

**Tema: retoques na casa nova — o convite de instalação no lugar certo.**

- **O botão de instalar saiu do meio da tela.** Para quem ainda não instalou o jogo como aplicativo, o convite aparecia num cartão solto no centro da tela inicial nova, atrapalhando o visual. Agora é uma pílula "📲 Instalar o jogo" ao lado do convite de amigos, acima do box Campanha. No iPhone (que não tem instalação de 1 toque), o botão abre a janelinha com o passo a passo — antes era um texto comprido solto na tela.
- **"Chamar galera" com a cara do WhatsApp**: o botão de convidar amigos ficou verde, com o símbolo do WhatsApp desenhado (em vetor, sem imagem baixada) — dá para saber de longe o que ele faz.
- **A skin "Catisquick's Rhino" saiu do ar** (removida pelo criador no estúdio de skins, junto com a arte do Rino Vulcão). A conquista "5 torres + caçador na mesma corrida" continua valendo na skin "Rhino do Catisquick". A bateria de testes ficou imune a remoções de skin (usa arte do núcleo do jogo nas verificações).

## v1.8.1 — 16/08/2026

**Tema: a casa nova do rinoceronte — a tela inicial virou uma vitrine que provoca a caça ao recorde.**

- **Pódio mundial ao vivo na tela inicial.** Os 3 primeiros do mundo aparecem em pedestais de ouro, prata e bronze — cada um representado pela **skin que usava quando cravou a marca** (o placar agora registra isso; marcas antigas mostram o rinoceronte original), com nome, distância e há quantos dias seguram **a posição**: se alguém novo toma o 1º lugar, o contador de quem caiu recomeça naquele dia. O pódio se atualiza sozinho (no máximo a cada 6 horas, para caber no plano gratuito do banco) e funciona offline com a última foto conhecida.
- **Você, a um degrau do bronze.** Um quarto pedestal tracejado mostra a SUA posição no mundo ao lado do 3º lugar, com uma seta dourada apontando, sua skin animada, o botão de trocar de skin e a provocação na lata: "faltam 303m p/ 🥉" (ou "defenda o seu posto!", para quem já está no pódio).
- **Diário da Fuga** — a área de notícias da tela inicial: o primeiro card é o aviso do criador (editado direto no console do banco, sem publicar código — é onde as novidades de cada versão são anunciadas); os demais contam o que aconteceu com você: skin desbloqueada (inclusive as concedidas na abertura do jogo, que antes não avisavam ninguém), entrada e queda do pódio, recorde batido. Cada acontecimento aparece uma única vez.
- **Box Campanha**: recorde, tentativas, fugas, "maior inimigo" e um minigráfico das últimas 10 corridas — com os botões de apelido e de estatísticas dentro dele. A faixa de medalhas saiu da tela inicial (elas seguem no "Minhas estatísticas").
- **Título em chamas** com fonte cartoon, labaredas e brasas animadas (sem internet, o título usa uma fonte parecida do aparelho — nada quebra), instruções de jogo em texto limpo e o "TOQUE PARA COMEÇAR" pulsando em dourado.
- Mudança nas regras do banco de dados: um campo novo e opcional em `scores` (a skin da marca), publicado antes desta versão ir ao ar.

## v1.8.0 — 15/08/2026

**Tema: o guarda-roupa do rinoceronte — skins com pódio vivo (e um estúdio para o criador fazer as suas), o chefe recupera os dentes e as paredes desabam de verdade.**

- **Skins!** O botão 🎨 na tela inicial abre o guarda-roupa com 7 aparências: o original, duas gratuitas (**Thanks for playing**, de chapéu de festa e língua-de-sogra, e o **Rino Robô** de latão com chifre de energia), três **exclusivas do pódio mundial** (Ouro, Prata e Bronze, cada uma com um medalhão numerado no peito — só quem está naquela posição do ranking pode vestir, e **perde a skin ao perder o posto**; ela volta sozinha se o posto voltar) e a **Catisquick's Rhino**, desenhada por um amigo do criador, que se conquista para sempre derrubando 5 torres E vencendo o caçador na mesma corrida — e cuja FÚRIA TOTAL vira o **Rino Vulcão**, um rinoceronte de magma. A escolha veste o rinoceronte na tela inicial e em toda corrida, sem mudar nada da jogabilidade.
- **O chefe recuperou os dentes.** Os dados mostraram que a FÚRIA TOTAL tinha anulado a luta do portão (120 camadas quebradas com apenas 8 mortes): ela quebrava camada sem mirar na fresta e deixava o rifle inofensivo. Agora **a fúria não pode ser ativada dentro da arena** (o medidor mostra um cadeado e continua enchendo — libera na saída, como fôlego para o modo infinito), e mesmo quem entra em chamas precisa acertar as 3 frestas na ordem.
- **Paredes e prédios desabam.** Ao quebrar uma parede (ou fachada de prédio, na cidade), todo o topo acima do buraco **tomba para trás se esfarelando** — antes ficava um pedaço flutuando no ar.
- **Estúdio de skins (`/?setup`)** — o criador agora faz uma skin nova **de ponta a ponta, sem programar**: solta a folha de desenhos gerada por IA, escolhe os quadros, ajusta a paleta, vê a prévia animada e configura como o jogador a conquista (grátis, pódio exato do ranking, façanha numa única corrida — metros, torres, vencer o caçador, escapar — ou totais de vida, como "jogue 100 corridas"). O texto do cadeado no guarda-roupa é gerado sozinho a partir da regra. Skins podem ser **editadas** depois e têm uma chave **"no jogo / fora do jogo"** (reversível — ninguém perde conquista); só a Furious Rhino original é intocável. Cada gravação roda a bateria de testes do jogo e **desfaz tudo se algo reprovar**; nada vai ao ar sem a publicação normal do jogo. (O motor por trás é o Gerador de Sprites, com fatiamento automático ou por grade, paleta amostrada das cores reais e detecção de folhas problemáticas — agora com folha de fúria própria opcional.)
- **O rinoceronte está 30% maior na tela** — em todas as skins. As skins vetorizadas são mais magras que o desenho original, e o protagonista tinha ficado menor que um leão. Só a imagem cresceu: a caixa de colisão continua exatamente a mesma, então nenhum pulo, vão ou luta ficou mais fácil ou difícil (as baterias de teste de rampa, chefe e especial provam). De quebra, dois retoques: o rinoceronte não infla mais de forma estranha nos pulinhos da festa da fuga, e as skins geradas por IA agora preenchem o quadro no mesmo porte da arte original.
- Tudo medido, como sempre: cada corrida registra a skin usada e as tentativas de ativar a fúria dentro da arena (para saber quantos ainda tentam o truque antigo).
- **O zoológico persegue de verdade.** O criador achou o cenário vazio — e os números confirmaram: a matemática do sorteio de obstáculos gerava só ~1,5 animal a cada 100 m. Agora animais podem vir **em dupla**, e paredes, espinhos e torres costumam aparecer **escoltados** por um animal logo atrás — o total de perseguidores **dobrou** (~3,2/100 m), sem trocar nenhum obstáculo letal por animal: a dificuldade dos obstáculos é a mesma, o zoológico é que ficou mais cheio. Tudo calibrável ao vivo pelo painel de ajustes (guia na referência técnica).
- **Atropelou, voou.** Animais atingidos pela investida agora saem voando **para a frente e para o alto** (antes voavam para trás), mais rápido e girando — combina com o sentido da carga do rinoceronte.
- **O topo da parede desaba para trás de verdade** — na direção contrária à corrida (antes tombava para a frente, junto com o rinoceronte).
- **Ranking com "há quantos dias"**: o TOP 10 mostra, ao lado da distância de cada jogador, há quantos dias aquela marca está de pé ("há 12d" / "hoje") — trocar de apelido não zera a contagem. Marcas antigas já aparecem com a data que o servidor conhecia. (Única mudança nas regras do banco de dados desta versão: um campo novo e opcional em `scores`.)
- **Desistir sem sujar as estatísticas**: o popup de pausa ganhou o botão "🏳️ Desistir da corrida" — cancela a corrida, devolve a tentativa contada e volta à tela inicial sem registrar nada.
- **Botões no lugar certo**: som e pausa desceram para logo abaixo dos ícones de fúria e investida, acompanhando o tamanho da tela — não cobrem mais nada.
- **Estúdio de skins v3**: o criador agora pode **remover de vez** qualquer skin, inclusive as originais (com aviso extra — a arte delas não tem cópia no gerador); só a Furious Rhino original é intocável. A bateria de testes ganhou uma rede de segurança específica para isso.

## v1.7.2 — 09/08/2026

**Tema: faxina no banco de dados — ambiente de teste isolado da produção.**

- **Testar o jogo em `localhost` (ou num IP da rede local) deixa de gravar dados de verdade no banco por padrão.** Antes, um teste automatizado que esquecesse um detalhe de configuração podia criar jogadores fantasmas em produção — já aconteceu duas vezes. Agora isso só acontece se o próprio teste pedir explicitamente.
- **Faxina**: 37 registros de teste e de jogadores que nunca escolheram apelido (a maioria com 1 tentativa e marca muito baixa) foram removidos do banco de produção.
- **Nova ferramenta de manutenção** para apagar um jogador específico (por nome ou por identificador) direto do banco, com conferência antes de apagar de verdade.
- A ferramenta de limpeza existente aprendeu a reconhecer o "cheiro" de tráfego automatizado (muitas tentativas registradas, zero tempo jogado) mesmo sem saber os identificadores de antemão — ela agora avisa, mesmo quando é um tipo de lixo novo que ninguém tinha visto antes.

## v1.7.1 — 09/08/2026

**Tema: a fuga virou uma batalha — o chefe do portão, a FÚRIA TOTAL e um zoológico inteiro de perseguidores novos.**

- **O portão dos 1000 m agora é um chefe.** Ele amanhece blindado do chão ao teto, com um **caçador de rifle tranquilizante** no topo. É preciso quebrar 3 camadas com investidas na fresta que brilha (chão → meio → alto, cada uma exigindo mais técnica), enquanto o caçador atira com aviso de **mira laser** — e atira cada vez mais rápido. Bater errado no portão não mata: o rinoceronte **ricocheteia** e a investida volta pronta junto com o controle. O tiro do rifle, esse sim, é morte na hora.
- **FÚRIA TOTAL, o especial do jogo:** com o medidor de fogo cheio (enche aos 900 m — bem na porta da luta), um toque nele transforma o rinoceronte numa bola de fogo invencível por ~6 segundos que **explode tudo** no caminho, até o espinho. Guardar a carga para o chefe é a jogada esperta: ela quebra camadas mesmo fora da fresta.
- **Cada cenário ganhou seus próprios perseguidores** (22 espécies novas, 27 no total): tratador com rede e pavão nas jaulas, avestruz e águia no aviário, hiena, búfalo e ave de rasante na savana, onça, cobra e lobo-guará na floresta, jacaré, hipopótamo, capivara e tuiuiú no pântano — e a cidade estreia elenco completo: pedestres em pânico, executivo, motoboy, carro, viatura, drone, teco-teco e a camionete do caçador.
- **Tudo isso é medido**: o painel ganhou a seção "A luta do portão" (quantos tentam, quantos escapam, quantos caem pelo rifle, quanto dura a luta) e o resumo do jogador mostra os especiais usados e as camadas quebradas — a régua de calibragem do chefe são dados, não achismo.
- Ajustes de campo da v1.7.1 (testados pelo criador): ricochete mais forte, rifle mais rápido, e a fresta-alvo sinalizada com **moldura dourada pulsante** — a versão anterior lia suave demais.

## v1.6.1 — 09/08/2026

**Tema: enxergar melhor quem joga — telemetria de comportamento, avisos no celular do criador e painel repaginado.**

- **O jogo agora registra COMO cada corrida foi jogada**, não só até onde: pulos, investidas (inclusive as negadas durante a recarga — uma medida de frustração), paredes quebradas, morros destruídos, torres derrubadas, animais atropelados e pausas. Isso permite responder perguntas como *"quem morre cedo é quem ainda não descobriu a investida?"* com dados em vez de chute.
- **Novo botão "📊 Minhas estatísticas"** na tela inicial: o jogador vê seu histórico, onde costuma morrer, dicas personalizadas e sua posição no mundo — tudo instantâneo e funcionando offline. Dá para compartilhar o resumo no WhatsApp.
- **Avisos automáticos para o criador** (via ntfy): quando alguém começa a jogar, um resumo quando a sessão termina, um alerta quando o recorde mundial cai — e um resumo diário às 20h que chega **até nos dias em que ninguém jogou**. Tudo configurável sem publicar código novo, e com silêncio noturno (0h–7h).
- **Painel `/?stats` repaginado**: seis abas com gráficos novos — histograma de onde os jogadores morrem, mapa de calor causa × distância, curva de aprendizado, retenção (quantos voltam depois de dias) e jogadores únicos × execuções por dia.
- **Localização sempre atual**: a cidade do jogador (aproximada, sem guardar IP) passa a ser revalidada a cada 12 horas, e uma falha na consulta não apaga mais a última cidade conhecida (era um bug).

## v1.6.0 — 08/08/2026

**Tema: o mundo ficou maior e mais vivo — morros, portão aos 1000 m e a cidade.**

- **Morros e trampolins**: obstáculo novo que nunca mata — dá para subir por cima, destruir com uma investida rasante, ou usar o trampolim para voar longe (a parte mais divertida do jogo).
- **O portão da fuga mudou de 800 m para 1000 m**, e cruzá-lo virou um espetáculo: o portão explode, sobem fogos e confete — e a corrida continua sem parar, no **modo infinito**.
- **Seis cenários temáticos** (jaulas, aviário, savana, floresta, pântano e a **cidade** à noite no modo infinito), com clima (chuva, neblina, tempestade com raios), entardecer no fim do percurso e troca de cenário celebrada na tela.
- **Abertura guiada**: os três primeiros obstáculos agora ensinam a jogar em ordem (morro → espinho → parede), com dicas nas primeiras corridas. Motivo: os dados mostravam que 16% das corridas morriam logo no primeiro obstáculo.
- **Marcas na pista**: estacas mostram onde fica o seu recorde, o rival logo acima e o líder mundial — ultrapassá-las provoca o jogador na tela.

## Versões anteriores (resumo)

- **v1.5.0** — Apelido único no ranking com convite não-bloqueante, painel `/?stats` com lista de jogadores e ficha individual, telemetria com memória (histórico de aparelhos, locais e versões).
- **v1.4.0** — Elenco de arte v2 validado (pássaros em 5 espécies), sprites nítidos em telas de alta densidade (rasterização 2×).
- **v1.3.x** — Primeiras estatísticas agregadas (`/?stats` com funil), invencibilidade de debug, painel de ajustes.
- **v1.0–1.2** — O jogo em si: rinoceronte, pulo e investida, paredes/espinhos/animais/torres, fúria, medalhas, ranking mundial, PWA instalável com jogo offline, arte e áudio 100% procedurais.

---

*Formato das entradas: `## vX.Y.Z — DD/MM/AAAA`, com tema em negrito e bullets em linguagem acessível (o "porquê" junto com o "o quê"). Detalhes técnicos de cada release ficam no `HANDOFF.md` e nas releases do GitHub.*
