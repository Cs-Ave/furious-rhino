# Furious Rhino — Guia funcional

> Documentação da versão **1.8.3** · atualizada em 16/08/2026
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
| **O caçador do portão** (1000 m) | A batalha final — ver item **4** | Tiro do rifle = morte (dormindo) |

O morro tem uma variante especial, o **trampolim**: um penhasco cuja crista lança o rinoceronte longe — a sensação de voo é proposital, é a parte mais divertida do jogo, e por isso é a variante mais sorteada.

**O elenco de perseguidores muda com o cenário** (27 espécies no total): tratador com rede de captura e pavão nas jaulas; avestruz e águia no aviário; leão, zebra, girafa, hiena, búfalo e ave de rasante na savana; macaco, onça, cobra e lobo-guará saltador na floresta; jacaré, hipopótamo, capivara e tuiuiú no pântano; e na cidade, pedestres em pânico, executivo, motoboy, carro, viatura, drone, teco-teco e a camionete do caçador. Três jeitos de se mover: correndo no chão, saltando (macaco, zebra, lobo-guará) ou voando — inclusive os **rasantes**, que voam baixo, quase na altura do rinoceronte.

## 3. Progressão da corrida

- **1 metro = 1 ponto.** A barra no topo mostra o progresso até o portão.
- **Fúria** (ícone de fogo que vai enchendo): é uma **carga** que cresce com a distância percorrida — a primeira enche aos 900 m. Enquanto enche, o rinoceronte acelera (de 300 até 450 pixels/segundo), fica avermelhado, solta fumaça pelas narinas — e a música ganha camadas de instrumentos. Cheia, ela pode ser **gasta** na FÚRIA TOTAL (item 5) e volta a encher correndo.
- **Dificuldade em 6 níveis**, um a cada 200 m: obstáculos mais frequentes, animais mais rápidos, dardos mais velozes, combinações de obstáculos ("combos") a partir dos 400 m.
- **O zoológico persegue de verdade**: animais podem vir **em dupla**, e paredes, espinhos e torres costumam aparecer **escoltados por um animal** logo atrás — a chance de ambos cresce nível a nível (de ~50% até ~80%). O total de perseguidores praticamente **dobrou** em relação às versões anteriores, sem trocar nenhum obstáculo letal por animal (a proporção de paredes/espinhos é a mesma — só o zoológico ficou mais cheio).
- **Abertura guiada:** nas 3 primeiras corridas da vida do jogador, os 3 primeiros obstáculos são fixos e didáticos — um morro aos 90 m (não mata), um espinho aos 125 m (ensina o pulo), uma parede aos 160 m (ensina a investida) — com dicas na tela.
- **O portão dos 1000 m:** virou uma **batalha de chefe** (item 4). Vencida a luta, o portão **explode** com fogos e confete, e a corrida **não para** — começa o **modo infinito** na cidade, à noite. O fim físico do mundo é 10.000 m, onde quem chega vira "**LENDA**".

## 4. A luta do portão (o chefe)

Perto dos 1000 m a câmera **trava na arena**, soa uma buzina grave e o portão aparece **blindado do chão ao teto**, com um **caçador de rifle tranquilizante** de pé na plataforma do topo. Três escudos (🛡️) acima do portão mostram quantas camadas faltam.

**Como vencer:** investir na camada cuja fresta **brilha com uma moldura dourada pulsante** — é a mira da luta. A ordem é fixa e sobe de dificuldade:

1. **Chão** — investida normal, correndo;
2. **Meio** — pulo + investida na altura certa;
3. **Alto** — pulo duplo + investida **no ar** (a investida aérea voa reto — é a técnica-clímax).

Encostar no portão do jeito errado (sem investir, ou investindo fora da fresta) **não mata**: o rinoceronte **ricocheteia** para trás com um CLANG metálico — e a investida está pronta de novo assim que ele retoma o controle. O perigo mora no rifle: uma **mira laser vermelha** avisa ~0,4 s antes de cada tiro (tiro reto, morteiro em arco que cai onde você está, ou rajada tripla), e a cadência **acelera a cada camada quebrada**. Tiro do rifle é morte na hora ("TRANQUILIZADO! 💤").

Dicas na tela ensinam a mecânica só nos **2 primeiros encontros** da vida do jogador. **A FÚRIA TOTAL não resolve mais a luta**: dentro da arena a ativação fica **bloqueada** (o medidor mostra um cadeado 🔒 e o toque avisa "a fúria não pega no portão"), e mesmo quem entra em chamas — ativou pouco antes da arena — precisa acertar as 3 frestas na ordem: o fogo dispensa a investida, mas **não dispensa mais o alinhamento** (os dados mostravam a luta anulada: 120 camadas quebradas com só 8 mortes). A carga continua enchendo normalmente e **libera assim que o portão cai** — vira o fôlego de largada do modo infinito. Derrubada a terceira camada, o caçador despenca do portão e a festa da fuga acontece. O chefe aparece em **toda** corrida que chega aos 1000 m.

## 5. FÚRIA TOTAL (o especial)

Com o medidor de fogo **cheio** (ele pulsa e a tela avisa), toque nele — ou **↓**/**Shift** no teclado — para transformar o rinoceronte:

- Ele **pega fogo** (sprite próprio, em chamas) e fica **invencível por ~6 segundos**;
- **Tudo o que colide explode**: paredes (mesmo fora da fresta), torres, animais, dardos, morros rasantes e **até o espinho**, que nenhuma investida normal destrói;
- Corre **25% mais rápido** por cima da velocidade de fúria cheia;
- O medidor **drena** com o tempo; na reta final o rinoceronte pisca avisando que o fogo vai apagar.

Depois de gasto, o medidor volta a encher com a distância (~900 m por carga). A invencibilidade cobre colisões — cair num buraco continua valendo o de sempre. **Na arena do chefe a ativação é bloqueada** (ver item 4); o aviso de "fúria cheia" que ficou devendo dispara na saída do portão. Skins criadas no estúdio podem ter uma **transformação de fúria própria** (uma arte em chamas exclusiva) em vez do fogo padrão.

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
- **Ranking mundial**: a lista completa abre no botão **"ver top 10 ›"** ao lado do pódio. Para entrar, o jogador escolhe um **apelido único** (3–12 caracteres — o jogo confere se já existe; acentos e maiúsculas não diferenciam: "Thómas" e "thomas" são o mesmo apelido). Ao lado da distância de cada um aparece **há quantos dias aquela marca está de pé** ("há 12d", ou "hoje" para marca do dia) — trocar de apelido não zera a contagem nem troca a skin da vitrine.
- Quem prefere **"Ficar anônimo"** recebe um nome automático (`Anonimo_7`). O jogo volta a convidar para escolher um nome de verdade **no momento de orgulho** — logo depois de o score subir no ranking ("🏆 Você é o #7 do mundo!") — no máximo 1 vez a cada 3 corridas, e nunca de forma bloqueante.
- **Marcas na pista**: durante a corrida, estacas mostram onde fica **o seu recorde** (🏅), o **rival logo acima de você** no ranking (⚔️) e o **líder mundial** (👑). Ultrapassar cada uma provoca o jogador na tela.
- **Convite por WhatsApp**: botão para chamar amigos, com link direto do jogo.

## 8. Medalhas

17 conquistas salvas no aparelho (não dependem de internet). Desde a v1.8.1 elas são vistas dentro de **"📊 Minhas estatísticas"** (a faixa de ícones saiu da tela inicial para dar lugar ao pódio). Exemplos:

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

### O estúdio de skins (`/?setup` — só para o criador)

Página especial (mesma chave do painel detalhado) onde o criador faz uma skin nova **de ponta a ponta, sem programar**: solta a folha de desenhos (gerada por IA), escolhe os 3 quadros do galope, ajusta a paleta, vê a prévia animada, dá nome e descrição e **configura como o jogador ganha a skin** — as opções são:

- 🎁 **Grátis** — disponível para todo mundo;
- 🏆 **Pódio** — exclusiva de uma posição exata do ranking (1º, 2º ou 3º), com a mesma dinâmica de "perdeu o posto, perdeu a skin";
- 🎯 **Conquista numa corrida** — combinação de critérios que precisam sair na MESMA corrida: correr X metros, derrubar Y torres, vencer o caçador do portão, escapar do zoológico. O texto do cadeado no guarda-roupa é gerado sozinho a partir da regra;
- 📈 **Totais de vida** — soma de todas as corridas: jogar X corridas, completar Y fugas, atropelar Z animais.

Depois de criada, a skin pode ser **editada** (nome, descrição, regra de desbloqueio) e tem uma chave **"no jogo / fora do jogo"**: desligada, a skin some do guarda-roupa na hora — reversível, ninguém perde a conquista, e quem a estava vestindo volta ao rinoceronte original até ela voltar. **Qualquer skin pode ser removida de vez** — inclusive as originais, com um aviso extra lembrando que a arte delas não tem cópia no gerador; a única intocável é a Furious Rhino original, o "plano B" de todas as outras.

Um detalhe importante: a página funciona no computador do criador (ela conversa com um programa local que grava os arquivos do jogo) e **nada vai ao ar sozinho** — a skin nova só chega aos jogadores na próxima publicação do jogo. Cada gravação roda a bateria de testes automaticamente e **desfaz tudo se algo reprovar**, então o jogo nunca fica quebrado no meio do caminho.

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
| 🦏 **Visão geral** | Jogadores, execuções, fugas, tempo total; jogadores únicos × execuções por dia; **funil** de quantos chegam a cada trecho de 200 m; melhor marca dia a dia |
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

Abrir o jogo com `/?debug=1` liga um painel de ajustes ao vivo (física do rinoceronte, dificuldade por nível — incluindo **os pesos do sorteio de obstáculos e a densidade de animais** (dupla e escolta, ver o guia de calibração no [`04-referencia-tecnica.md`](04-referencia-tecnica.md)) —, velocidade e **força do voo do atropelo** dos animais, duração/boost da Fúria Total, quique e rifle do chefe — inclusive ligar/desligar o **bloqueio da fúria na arena**), além de: ver as caixas de colisão, invencibilidade, avançar quadro a quadro, teleportar para os 600 m, para o portão ou **direto para a arena do chefe**, **encher a fúria na hora**, **vestir qualquer skin sem desbloqueio** e **ajustar a escala visual do rinoceronte ao vivo** (pasta "Skins" — só naquela sessão, nada fica salvo) e **exportar os ajustes** num arquivo pronto para colar no código.
