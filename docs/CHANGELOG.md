# Furious Rhino — Histórico de versões (CHANGELOG)

> O que mudou em cada versão, em linguagem simples. A entrada mais recente fica no topo.
> Mantido pelo comando `/atualizar-docs` a cada release.

---

## v1.11.0 — 30/08/2026 (versão atual) — 🔥 STREAKS

**Tema: a chama dos dias seguidos — convite, nunca bronca.**

- O histórico por dia existia há meses sem ninguém ler para isso. Agora ele vira a **sequência**: jogou em dias seguidos, a chama cresce. A regra é generosa — **ontem mantém a chama**: quem jogou ontem e ainda não jogou hoje vê um convite ("3 dias — vale mais um hoje?"), nunca uma cobrança. Chama apagada? A linha simplesmente some — zero culpa.
- **Três medalhas novas**: 🔥 Chama Acesa (3 dias), 🕯️ Semana em Chamas (7) e 🌋 Mês Incendiado (30) — avaliadas pelo MELHOR streak da vida, então nunca "descaem".
- A sequência aparece no box Campanha da tela inicial, e o estúdio de skins ganhou a chama como moeda: dá para criar uma skin que se desbloqueia com N dias seguidos.
- Tudo local ao aparelho — nada novo é enviado a lugar nenhum.

## v1.10.1 — 30/08/2026

**Tema: o congelamento não teleporta mais, e o retrato pausa de verdade.**

- Quando o aparelho engasga (ou o jogo fica coberto), o motor de física compensava o tempo perdido de uma vez — um engasgo de segundos virava um **teleporte** de centenas de metros, a suspeita central do caso da "distância que salta". Agora a compensação tem **teto**: o quadro atrasado vira um instante de câmera lenta, e o mundo nunca avança sem você ver.
- Girar o celular para o modo retrato mostrava o aviso de "gire o aparelho" — mas o jogo **continuava rodando às cegas por baixo**. Agora o retrato **pausa** (como trocar de aba), inclusive quando a corrida já começa com o aparelho em pé; a retomada é sua, no botão.
- A sonda dos dois relógios continua medindo tudo — se ainda houver saltos de distância depois desta versão, é uma causa nova, e as duas antigas estarão eliminadas por construção.

## v1.10.0 — 29/08/2026 — 🎓 A ESCOLA DO RINO

**Tema: o início do jogo volta a ensinar — dificuldade por competência, nunca por contagem.**

Os dados mostraram que o jogo tinha ficado quase impossível para quem chega: só 1 em cada 15 jogadores novos passava dos 1000 m (era 1 em 3), e a curva de aprendizado estava **invertida** — quanto mais a pessoa tentava, menos longe chegava, porque na 4ª corrida da vida o jogo a tratava como "veterana" e soltava a dificuldade cheia aos 60 m. Metade dos novatos morria sem nunca ter pulado.

- **A aula dura até você provar** — quem ainda não passou de 400 m na vida joga com a abertura-lição e as dicas; passou uma vez, graduou. (Quem ficou preso na fase antiga volta à escola nesta atualização — é o remédio.)
- **A dificuldade cresce com o seu recorde**: a densidade de perseguidores nos primeiros 600 m sobe suavemente do nível de estreia até o nível cheio conforme seu recorde vai de 0 a 800 m. **Quem tem recorde acima de 800 m joga exatamente o jogo de antes, sem tirar nem pôr** — é garantia de construção, não promessa.
- **A investida aprendeu a dizer "não"**: toque durante a recarga agora tem som, tremor do ícone e vibração (era silencioso — 64% dos toques eram negados sem nenhum aviso). E um toque nos últimos instantes da recarga **fica guardado e dispara sozinho** quando ela termina.
- **A escola ganhou as lições que faltavam**: o pulo CARREGADO (segurar para subir mais alto) — que o jogo cobrava e nunca ensinava — e a fresta do meio, com um par de espinhos que se vence com um único pulo carregado.
- **A morte virou aula**: a tela de fim mostra uma dica específica da causa (até 3 vezes por causa) e "faltaram X m para o seu recorde".
- **Marcos celebrados**: a primeira vez da vida além de 100/250/500/2300 m ganha fanfarra.
- Tudo com **botão de desligar** e telemetria própria (cada corrida registra o estágio da curva) — as leituras de 2 e 4 semanas dirão, com número, se o novato voltou a aprender. Revisado por painel adversarial de 4 lentes antes de sair.

## v1.9.12 — 29/08/2026

**Tema: o painel ganha a aba 🛡️ Chefes — os dados novos finalmente têm onde aparecer.**

- Desde 25/08 os cinco chefes lutam de verdade e são medidos (tempos de luta, quiques, camadas) — mas esses dados só apareciam num relatório de terminal. A página pública `/?stats` ganhou a aba **🛡️ Chefes**: o funil de cada um (chegaram → lutaram → venceram, com a taxa), o tempo mediano de luta, os quiques e as mortes em arena — respeitando o filtro de período.
- De carona, o decodificador do painel passou a ler **todas** as informações de cada corrida (era cego para 14 delas) e a **fúria negada nas arenas** — coletada desde a v1.8 e nunca mostrada — ganhou seu gráfico.
- A régua é **a mesma do relatório de radiografia**, de propósito: dois instrumentos que divergem para a mesma base são piores que um. E a nota da aba lista as cegueiras honestas dos dados (informações que só existem a partir de certas versões).
- Nada do jogo em si mudou — o congelamento até a prova de campo da v1.9.11 continua valendo; a aba é uma página separada que o jogo nunca carrega.

## v1.9.11 — 29/08/2026

**Tema: o chão de 404.000 pixels — a correção que a caixa-preta apontou.**

- O crash dos iPhones/iPads novos (iOS 26) foi **caçado com instrumentação**, não com chute: três versões de caixa-preta (abaixo) estreitaram a morte até um bloco de código com nome — a criação do chão, um único elemento de **404.000 pixels de largura** cobrindo o mundo inteiro. No computador isso é seguro; no motor dos aparelhos Apple novos, mata o processo da página (e o iOS mostra "Um problema ocorreu repetidamente").
- **A correção**: o chão virou o mesmo padrão das outras camadas do cenário — uma faixa do tamanho da tela que acompanha a câmera, com o piso físico numa área invisível (pura matemática, nada chega ao desenho). Visual idêntico, jogo idêntico, 149 verificações automáticas passando.
- Se você viu a tela de "problema ocorreu repetidamente": atualize (o rodapé deve mostrar v1.9.11) e volte a jogar. Se acontecer de novo, abra `/?voo=1` e mande a foto — a caixa-preta diz exatamente onde parou.

## v1.9.8 → v1.9.10 — 28-29/08/2026

**Tema: a caixa-preta — três versões de instrumentação numa noite.**

- **v1.9.8**: o **gravador de voo** — cada etapa do carregamento grava um marco no aparelho; `/?voo=1` mostra a caixa-preta (mesmo com a página quebrada) e `/?safe=1` abre só a tela inicial, sem o motor.
- **v1.9.9**: os marcos entram no boot do motor (carregamento da arte, geração de texturas) + o **conta-giros**: cada arquivo e cada gerador anuncia a própria execução — no crash, fica registrado o item exato. E `/?canvas=1` passa a forçar o modo de desenho alternativo, para separar hipóteses.
- **v1.9.10**: o conta-giros entra nos 12 blocos da construção da cena — a resolução que nomeou o culpado.
- Tudo minúsculo e inerte para quem joga: são gravações locais no próprio aparelho, nada é enviado.

## v1.9.7 — 28/08/2026

**Tema: o jogo nunca mais responde com a página de erro do navegador.**

- **O relato**: um jogador tentava abrir o jogo e via a mensagem do navegador de **"não foi possível acessar a página"**. A investigação (CASO 2 do caderno de investigações) mostrou que já tinha acontecido antes — era a metade nunca explicada do relato do ben em 23/08 — e que a falha morava nos **dados guardados no aparelho** (o mecanismo de funcionamento offline), não no servidor: os 199 arquivos do jogo respondiam normalmente.
- **O que estava errado, em uma frase**: quando a internet falhava E a cópia offline do aparelho estava incompleta (o navegador pode apagá-la sozinho para liberar espaço), o mecanismo respondia com um erro seco — e ainda por cima **forçava uma conferência com o servidor a cada arquivo**, o que fazia uma conexão fraca falhar onde teria funcionado sem ele.
- **As correções**: sem rede, o jogo serve a cópia offline; sem rede E sem cópia, aparece uma **tela do próprio jogo** ("Sem conexão com o jogo", com botão de tentar de novo) — nunca mais o erro cru do navegador. A instalação da cópia offline ficou tolerante (um arquivo de arte que falhe não impede mais a atualização inteira), o jogo passou a **pedir ao navegador que não apague** seus dados para liberar espaço, e a arte passou a carregar **direto da cópia local** com atualização silenciosa por trás — o que também deixa o início da corrida mais rápido no celular (era metade do peso do carregamento).
- **Sinceridade sobre o alcance**: um aparelho que JÁ esteja travado nesse estado talvez não receba a correção sozinho — nesse caso, limpar os dados do site uma vez resolve (anote o apelido antes: a tela 🆘 de recuperação devolve a conta). A v1.9.7 protege todos os próximos.

## v1.9.6 — 28/08/2026

**Tema: o painel de desenvolvimento para de escrever no placar de todo mundo.**

- **O que aconteceu**: o jogo tem um painel de ajustes que liga com `?debug=1` no endereço — ele existe para calibrar o jogo e traz, entre outras coisas, um botão que **pula para 50 metros antes de cada chefe** e um modo invencível. O endereço é público: basta escrever o parâmetro. Um jogador descobriu e três marcas feitas assim subiram ao **ranking mundial**, uma delas até o terceiro lugar.
- **A correção**: jogar com o painel ligado passou a contar como **ambiente de teste**, exatamente como já acontecia quando o jogo roda na máquina de quem o desenvolve. Nada do que é feito ali chega ao ranking mundial, aos desafios ou às estatísticas coletadas. Quem precisa mesmo gravar (o dono, testando de verdade) tem um interruptor no próprio painel — que já existia.
- **Uma segunda tranca, independente da primeira**: o jogo passou a conferir, na hora de enviar uma marca, se **todo chefe que ficou para trás foi realmente derrubado**. São 21 camadas no caminho até o fim do mundo; passar por uma arena sem quebrar nenhuma é impossível jogando. Vale para o ranking e para a Arena de Desafios. A conferência é deliberadamente cautelosa: chefe que não está no jogo naquela versão não cobra nada de ninguém, e na dúvida a marca passa.
- **A limpeza agora fica de pé**: em 25/08 o ranking foi corrigido no servidor, e no dia seguinte um dos jogadores voltou a jogar — o aparelho dele regravou o histórico antigo por cima e as marcas erradas voltaram. O aparelho é que manda. Agora a limpeza acontece **no próprio aparelho**, uma vez, ao abrir o jogo.
- **E destrava quem tinha sido corrigido**: os dois jogadores cuja marca foi desfeita em 25/08 tinham ficado **impedidos de pontuar** — o jogo só envia uma marca quando ela supera a anterior, e a anterior guardada no aparelho ainda era a errada. Eles teriam de bater um recorde que nunca foi deles. A marca de referência passou a ser recalculada do que sobrou.
- O recorde que aparece na tela do jogador **não é tocado** por nada disso: a corrida aconteceu, ele a viu. Quem precisa ficar limpo é o placar compartilhado.


## v1.9.5 — 24/08/2026

**Tema: os cinco chefes deixam de ser "um medido e quatro cegos".**

- **A auditoria que motivou a versão**: conferindo se tudo estava sendo coletado, apareceu que **dos cinco chefes só o Caçador do Portão era medível**. O tempo de luta já era calculado nos cinco e **morria com a partida** em três deles (a Barreira, o Faraó e o Caçador-Mor); os quiques de quatro eram contados sessenta vezes por segundo e jogados fora no fim. Não havia como distinguir "lutou quarenta segundos e perdeu" de "passou direto".
- **O que passou a ser guardado**: tempo de luta da Barreira, do Faraó e do Caçador-Mor, e os quiques de cada um dos quatro chefes que não são o Portão. Nada disso pontua — a fórmula do ranking continua exatamente a mesma.
- **A corrida que trava voltou a existir**: até aqui, quando o jogo congelava, a partida **não era registrada em lugar nenhum**. Foi um efeito colateral da v1.9.1: "não pontuar" virou "não registrar" sem querer, e justamente a corrida anômala — a que a investigação precisa ver — apagava a própria evidência. Agora ela é gravada com a causa `travamento` e com os dois relógios, **continuando sem valer pontos**. O aviso na tela ficou mais preciso: em vez de "esta corrida não foi salva", agora diz **"esta corrida não valeu pontos e a tentativa foi devolvida"** — porque salva ela passou a ser.
- **"Minhas estatísticas" mostrava três chefes de cinco**: as camadas da Barreira e do Faraó nunca apareciam, e a linha da Muralha estava rotulada como "Cerco" desde que a Muralha herdou o slot dos 2000 m na v1.8.7. Os cinco agora aparecem com o nome certo.
- **Duas causas de morte eram gravadas e nunca somadas** no relatório de análise (`cerco` e `farao`, desde a v1.8.10) — entraram na conta.
- **O histórico por dia não pode mais divergir**: o registro da corrida e o do dia ficavam a 180 linhas de distância um do outro, com catorze acessos à tela desprotegidos no meio. Se qualquer um falhasse, a corrida entrava no histórico recente e **nunca** na contagem do dia — e essa é irrecuperável. Os dois passaram a andar juntos.
- **Logo depois (25/08)**: com a causa da versão anterior corrigida, o ranking mundial foi limpo. Duas marcas de 10.000 metros que vinham da falha dos chefes saíram do topo, e cada jogador **voltou à melhor marca legítima dele** — ninguém foi apagado. O novo pódio: Ícaroo brabo (5.185), Thomas (4.606) e Caio Lindão (3.468).

## v1.9.4 — 24/08/2026

**Tema: os cinco chefes voltam a existir.**

- **O problema, e ele era grande**: desde a v1.8.5 dava para **atravessar o jogo inteiro sem lutar contra nenhum chefe**. São vinte e uma camadas no caminho — e as quatro vitórias registradas na base tinham derrubado **zero**. A última camada quebrada por alguém foi em 22/08.
- **Como acontecia**: existia um gatilho antigo que declarava a fuga pela simples **posição** do rinoceronte na linha dos 1000 metros. Ele deveria valer só no modo de teste, mas rodava na partida normal. A janela entre a face do portão e essa linha é de 120 pixels — **um único quadro travado de 85 milissegundos a atravessa**. Bastava isso: a fuga contava sem luta, e daí cada chefe seguinte olhava para a própria âncora, via o rinoceronte já do outro lado e se rendia. Em cascata, até o fim do mundo.
- **A correção**: quem decide a fuga é a queda da terceira camada do Caçador do Portão, como sempre esteve documentado. O atalho por posição passou a exigir o modo de teste explicitamente, nos cinco chefes.
- **Consequência que vale saber**: a Muralha, a Barreira da Escavação, o Faraó de Bronze e o Caçador-Mor **nunca estiveram realmente de pé**. Os três primeiros chegaram entre a v1.8.5 e a v1.8.10, exatamente na janela da falha. Esta é a primeira versão em que os cinco existem de verdade — o jogo ficou mais difícil sem que nada neles tenha mudado.
- **Uma linha de investigação que não se perde**: nasceram o `docs/INVESTIGACOES.md` (documento vivo onde cada hipótese descartada guarda **o teste que a matou**, para ninguém repetir caminho morto) e o `npm run investiga`, que passa cinco detectores sobre as corridas de produção e grava um retrato datado para comparar com a coleta seguinte.


## v1.9.3 — 24/08/2026

**Tema: a tela inicial deixou de esperar o jogo carregar.**

- **O problema, medido**: no celular a tela inicial ficava **4,6 segundos vazia depois de a página já estar pronta**. Não era internet lenta nem peso: era ordem. Todo o conteúdo da home (pódio, recorde, gráfico, Diário, desafios) só era montado depois que o motor do jogo terminava de baixar **150 arquivos de arte** — dos quais a tela inicial usa **quatro**.
- **O que mudou**: a tela inicial agora é pintada **antes** do motor, com os dados que já estão guardados no aparelho. O pódio aparece em cerca de meio segundo depois da página, em vez de quatro segundos e meio.
- **Tocar cedo não se perde mais**: como a tela fica pronta antes do jogo, dá para tocar antes de ser possível jogar. Nesse caso o texto vira **"preparando a fuga…"** e a corrida **começa sozinha** assim que o motor fica pronto — sem precisar tocar de novo, e sem gastar duas tentativas.
- **A sua posição no ranking volta a mudar no mesmo dia**: o pódio era relido **a cada 6 horas** e três situações atualizavam o dado sem repintar a tela (o envio do fim da corrida, a revalidação da posição ao abrir o jogo, e o modal do Top 10). Agora o pódio é relido a cada 5 minutos e as três situações repintam.
- De carona: duas ferramentas novas de verificação — `npm run perf-home` (mede a tela inicial com internet e aparelho de celular simulados, e falha se alguém voltar a pendurá-la no motor) e `npm run test-e2e-home` (10 verificações, incluindo o toque antecipado).

## v1.9.2 — 24/08/2026

**Tema: instrumento para caçar o bug do cronômetro, e o ranking devolvido aos donos.**

- **O bug**: algumas corridas foram gravadas com um tempo muito menor que o real — uma partida de 10.000 metros aparecendo como 47 segundos. A **distância era verdadeira**; quem mentia era o cronômetro. Vinte e duas dessas marcas foram parar no topo do ranking mundial, empatadas no teto de pontos.
- **O instrumento**: cada corrida passou a gravar também **quanto tempo o jogo acredita ter rodado**, ao lado do tempo de relógio. Os dois lado a lado dizem o que aconteceu: se batem, foi a distância que saltou; se o do jogo é maior, a partida rodou acelerada; se é menor, o jogo congelou. Num jogo saudável os dois praticamente coincidem.
- **A limpeza, com a regra que importa**: quem tinha uma marca legítima anterior **não foi apagado — teve a marca de volta**. Seis jogadores foram restaurados, incluindo um cuja vitória verdadeira (10.000 metros em 15 minutos) o teria levado ao segundo lugar por mérito, e que um apagamento cego teria destruído. As dezesseis contas que nunca tiveram uma corrida possível saíram, e as corridas impossíveis foram removidas do histórico — elas também venciam qualquer desafio automaticamente.
- **⚠️ Correção registrada em 25/08/2026**: a frase acima, sobre a "vitória verdadeira"
  de 10.000 metros em 15 minutos, **estava errada**. Aquela corrida não foi mérito — foi a
  falha dos chefes corrigida na v1.9.4, e o jogador atravessou o mundo sem derrubar nenhuma
  das vinte e uma camadas. O erro foi de critério: julgou-se pela **velocidade** (11 metros
  por segundo, o ritmo de qualquer jogador), quando o que denunciava era a **luta que não
  houve**. A marca foi desfeita em 25/08 e o jogador voltou à melhor corrida legítima dele.
  O resto desta entrada continua valendo: a regra de restaurar em vez de apagar estava certa,
  e foi ela que preservou as marcas anteriores dos dois envolvidos quando o erro foi desfeito.
- Toda a operação guardou uma **cópia de segurança completa** antes de tocar em qualquer coisa.

## v1.9.1 — 23/08/2026

**Tema: o jogo não trava mais em silêncio — e marca impossível não sobe ao ranking.**

- **O caso que motivou**: um jogador avisou que "o jogo trava". Comprovado: uma falha qualquer durante a partida **congelava a tela para sempre**, sem mensagem nenhuma, sem salvar a corrida — e ainda consumindo a tentativa. O jogador ficava olhando uma tela morta sem saber o que fazer.
- **A rede de proteção**: agora qualquer falha durante a partida encerra a sessão com dignidade — aparece a tela **"😵 O jogo travou"**, explicando honestamente que a corrida não foi salva, com um botão para voltar ao início. E **a tentativa é devolvida**: ninguém é punido por um problema nosso.
- **Sessão quebrada não pontua**: uma partida interrompida por falha não grava recorde, não sobe ao ranking e não conta no histórico.
- **A ordem do fim de corrida foi invertida**: a corrida passou a ser salva no aparelho **antes** de qualquer coisa subir ao ranking mundial. Assim, o pior caso de uma falha no meio é uma corrida salva que não subiu — e não uma marca no ranking sem corrida por trás.
- **Marca impossível não sobe mais**: o jogo agora confere se a velocidade média da corrida é fisicamente possível antes de enviá-la ao ranking. O limite tem folga deliberada sobre o máximo que o motor consegue produzir, para nunca barrar um jogador legítimo — inclusive quem joga muito bem.

## v1.9.0 — 23/08/2026

**Tema: recuperação de identidade — ninguém mais perde o apelido ao reinstalar o app.**

- **O caso que motivou**: quem desinstala e reinstala o aplicativo perde a "identidade" do aparelho (o jogo não tem login — cada aparelho tem um crachá interno sorteado no primeiro acesso, guardado só nele). O registro antigo continua no ranking e, pior, **bloqueia o próprio dono de re-registrar o apelido** ("já está em uso"). Aconteceu de verdade com o Teco.
- **O caminho novo, no jogo**: no erro de apelido em uso apareceu o botão **"🆘 Este apelido era meu (reinstalei o app)"**. Ele avisa o criador (com os dados do aparelho para conferência) e deixa o jogo de prontidão. Quando o criador autoriza, **o jogo restaura tudo sozinho** no próximo boot: apelido, marca do ranking (com o "há X dias" intacto), recorde, totais e histórico. As aparências conquistadas voltam; **medalhas voltam só em parte** (não existem no servidor — as que as últimas 50 corridas comprovam são devolvidas, o resto se reconquista jogando).
- **O caminho novo, para o criador**: o estúdio (`/?setup`) ganhou a **quarta aba, 🆘 Recuperação** — confere a reivindicação (o registro antigo + os aparelhos/locais dos dois lados), autoriza com um clique e, ao final, limpa os registros provisórios. A autorização é sempre uma decisão humana: sem login, é o criador quem confirma que o pedido é legítimo.
- **A versão pulou de 1.8.13 para 1.9.0** para casar com o anúncio do Diário da Fuga ("v1.9: novas fases, chefes e sistema de pontuação…") — é a mesma onda de novidades das versões 1.8.4–1.8.13, agora com nome de gente grande.
- De carona: a aba Sprites voltou a funcionar offline no aplicativo instalado (um arquivo dela faltava na lista do cache desde a v1.8.9), e a suíte nova `test-reassign` (61 verificações) tranca a matemática da restauração — em especial a regra de que os totais restaurados nunca podem ser menores que os do servidor (senão a telemetria congelaria em silêncio).

## v1.8.13 — 23/08/2026

**Correção: encerrar um desafio agora encerra de verdade (o card não ressuscita).**

- O cancelamento **era gravado certo no servidor**, mas o tradutor que lê os desafios de volta descartava justamente o campo "cancelado em" — então o desafio sumia do painel do criador e **voltava** quando o cache vencia, e **nunca chegava como cancelado** ao desafiado. Tentar encerrar de novo era negado pelas regras (o campo só pode ser gravado uma vez) e o jogo culpava a internet ("confira a conexão") com a internet ótima.
- Efeito colateral resolvido: desafio cancelado **contava no limite de 3 disputas ativas** — na prática, todos os 6 desafios do banco estavam cancelados e ainda bloqueavam a criação de novos.
- Agora o campo sobrevive à leitura, encerrar um desafio já encerrado responde "já estava encerrado" (sem acusar a internet), e os desafios-fantasma somem sozinhos na próxima releitura de cada aparelho.

## v1.8.12 — 23/08/2026

**Correção: o aceite do desafio aparece na hora para quem convidou.**

- O aceite era gravado no servidor imediatamente, mas o navegador de quem convidou só relia a lista **1 hora depois** — o card ficava preso em "aguardando fulano" com o dado já atualizado do outro lado (relato real: Fernanda-PC × Teco).
- Agora a lista se atualiza **ao fim de cada corrida e sempre que você volta para o jogo** (o gesto natural de quem está esperando o aceite), e o intervalo automático caiu para 45 segundos enquanto houver convite pendente (10 minutos quando todo mundo já entrou).

## v1.8.11 — 23/08/2026

**Correção: o placar do desafio ficava preso em "ainda não correu".**

- **O seu placar não atualizava depois de você jogar.** O card do desafio guardava o resultado por 30 minutos e não era renovado quando a corrida acabava — quem criava um desafio e ia jogar em seguida via "ainda não correu" o tempo todo, mesmo tendo corrido. Agora **a sua marca é lida direto das suas corridas**, sempre atual, e o placar se reordena na hora; a marca dos adversários também passa a aparecer já na próxima visita à tela inicial, em vez de esperar a meia hora.

## v1.8.10 — 23/08/2026

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
