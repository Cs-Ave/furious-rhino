# Furious Rhino — Visão geral

> Documentação da versão **1.8.7** · atualizada em 21/08/2026
> Este documento é para quem **não é programador**. Sem jargão — e quando um termo técnico for inevitável, ele vem explicado entre parênteses.

## O que é

**Furious Rhino** é um jogo de celular (que também funciona no computador) sobre um rinoceronte rabugento que decide fugir do zoológico. Ele corre sozinho, sempre para a direita, e o seu trabalho é ajudá-lo a desviar ou destruir tudo o que aparece pela frente: paredes, espinhos, torres com dardos tranquilizantes e os outros animais do zoológico, que tentam (sem sucesso) ficar no caminho.

**Jogue agora:** https://cs-ave.github.io/furious-rhino/

Não precisa instalar nada: o jogo abre direto no navegador (Chrome, Safari etc.). Se quiser, dá para "instalar" como aplicativo — aí ele ganha ícone na tela inicial e funciona até sem internet.

## Como se joga (em 30 segundos)

A tela é dividida em duas metades, como dois botões gigantes:

| Toque na... | O rinoceronte... |
|---|---|
| Metade **esquerda** | **Pula.** Segure para pular mais alto; toque de novo no ar para pular de novo (como um passarinho batendo asas). |
| Metade **direita** | **Investe** — uma arrancada curta e furiosa que quebra paredes, derruba torres e arremessa animais para longe. |

No computador, as setas **←** e **→** fazem a mesma coisa.

Há ainda um terceiro botão que se ganha jogando: o **medidor de fúria** (ícone de fogo no canto). Quando ele enche, um toque nele solta a **FÚRIA TOTAL** — o rinoceronte pega fogo, fica invencível por alguns segundos e **tudo** o que encostar nele explode.

A regra de ouro: cada obstáculo tem um jeito certo de passar. Parede rachada se atravessa **investindo na altura certa da rachadura**. Espinho se **pula**. Animal se **atropela investindo** (ou se pula por cima). Errar o jeito é fim de jogo — é uma vida só, sem continuar.

## O objetivo

Correr **1000 metros** até o portão do zoológico e escapar. No caminho, o cenário muda (jaulas, aviário, savana, floresta, pântano) — e **cada ambiente tem seus próprios perseguidores**: tratadores com rede nas jaulas, hienas e búfalos na savana, jacarés no pântano. E eles vêm em peso: animais aparecem em dupla e escoltando os obstáculos — o zoológico inteiro está na sua cola. O dia vira entardecer, e a **fúria** do rinoceronte cresce — ele fica mais rápido, mais vermelho, e a música mais intensa.

Só que o portão não está mais escancarado: ele amanhece **blindado**, com um **caçador de rifle tranquilizante** no topo. É a batalha final do jogo — é preciso quebrar as três camadas da blindagem com investidas certeiras, desviando dos tiros, até o portão vir abaixo. Aí sim ele **explode em pedaços** com fogos e confete... e a corrida continua: começa o **modo infinito**, agora pela cidade (com carros, pedestres em pânico e até um teco-teco), à noite, para ver até onde você aguenta. E a cidade não desiste: aos **2000 metros** uma barricada de contenção com um **canhão de redes** bloqueia a avenida (**O Cerco**, o segundo chefe), e lá no **fim do mundo** (10.000 m) espera o **Caçador-Mor** — vencê-lo é o que transforma o rinoceronte em **LENDA**. O recorde de cada corrida fica salvo, e existe um **ranking mundial** — você escolhe um apelido e compete com todo mundo que joga.

## Uma analogia

Pense num daqueles jogos de "corrida sem fim" (como Subway Surfers ou o dinossauro do Chrome), mas em que o personagem não é fugitivo assustado — é um **trator com chifre**. Metade do jogo é desviar; a outra metade, mais divertida, é passar por cima.

## O que mais o projeto tem, além do jogo

Este projeto não é só o jogo — é também a "sala de controle" dele:

- **Ranking mundial** — placar público com o recorde de cada jogador, por apelido — e há quantos dias cada marca está de pé. Desde a v1.8.4 o placar é de **pontos**: a distância continua valendo 1 ponto por metro, mas cada obstáculo destruído pelo caminho soma um extra (e a distância aparece do lado, como "1.234 pts · 987 m"). A tela inicial mostra um **pódio ao vivo** com os 3 primeiros do mundo (cada um com a aparência de rinoceronte que usava ao cravar a marca) e o seu lugar logo ao lado, a um degrau do bronze.
- **Diário da Fuga** — a área de notícias da tela inicial: avisos do criador (novidades de cada versão) e acontecimentos do jogador (skin nova, entrou ou caiu do pódio, recorde batido).
- **Estatísticas do jogador** — um botão "📊 Minhas estatísticas" mostra seu histórico: onde você costuma morrer, quantas vezes fugiu, suas medalhas.
- **Medalhas** — 19 conquistas, de "Primeira Fuga" a "Lenda do Mundo" (vencer o chefe do fim do mundo).
- **Skins** — um guarda-roupa de aparências para o rinoceronte (botão 🎨): gratuitas, por conquista difícil e **exclusivas do pódio do ranking** — só quem está naquele degrau do topo do mundo veste a skin do degrau, e a perde se perder o posto. O elenco muda com o tempo (o criador cria e troca skins pelo estúdio).
- **Estúdio de skins** — uma página especial (`/?setup`, protegida por chave) onde o criador transforma folhas de desenhos geradas por IA em skins prontas e decide **como cada uma é conquistada** (grátis, pódio do ranking, façanha numa corrida ou totais de vida) — tudo sem programar; a skin entra no jogo na publicação seguinte.
- **Painel do criador** — uma página especial (`/?stats`) com gráficos sobre todos os jogadores: quantos jogam por dia, onde o jogo está difícil demais, quem volta a jogar. É com esses dados que o jogo é ajustado a cada versão — várias decisões de design vieram de olhar para eles.
- **Avisos no celular do criador** — quando alguém começa a jogar, quando termina uma sessão e quando o recorde mundial cai, o criador recebe uma notificação. Todo dia às 20h chega um resumo automático.

## Curiosidades técnicas (versão para leigos)

- **O jogo inteiro é "desenhado por código".** Não existe nenhum arquivo de imagem de cenário nem nenhum arquivo de som: os personagens são desenhos vetoriais (SVG — um formato de imagem descrito por linhas e curvas, que nunca fica serrilhado), o cenário é desenhado ao vivo pelo programa, e toda a música e efeitos são **sintetizados** na hora, como um tecladinho eletrônico embutido no navegador.
- **Não existe servidor próprio.** O jogo é hospedado de graça no GitHub Pages (serviço que publica sites direto de um repositório de código) e usa o Firebase (serviço do Google com um banco de dados na nuvem) no plano gratuito para o ranking e as estatísticas.
- **Privacidade:** o jogo não pede cadastro, não guarda IP e identifica cada aparelho só por um código aleatório. A localização aproximada (país/cidade) é usada apenas nas estatísticas agregadas.

## Quem faz o quê

| Papel | Como interage |
|---|---|
| **Jogador** | Abre o site e joga. Opcionalmente escolhe apelido e entra no ranking. |
| **Criador/administrador** | Acompanha o painel `/?stats`, recebe notificações, ajusta o jogo a cada versão com base nos dados. |
| **Desenvolvedor** | Mexe no código. Comece por [`03-arquitetura.md`](03-arquitetura.md) e [`04-referencia-tecnica.md`](04-referencia-tecnica.md). |

## Onde ler mais

- [`02-guia-funcional.md`](02-guia-funcional.md) — cada funcionalidade explicada em detalhe, com exemplos de uso.
- [`03-arquitetura.md`](03-arquitetura.md) — como o projeto é organizado por dentro (nível intermediário).
- [`04-referencia-tecnica.md`](04-referencia-tecnica.md) — referência completa para manutenção.
- [`CHANGELOG.md`](CHANGELOG.md) — o que mudou em cada versão, em linguagem simples.
- [`QA-Registro.md`](QA-Registro.md) — Q&A vivo: dúvidas pontuais do criador, respondidas e registradas com data.
