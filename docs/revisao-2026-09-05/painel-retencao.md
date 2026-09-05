# Atratividade do FURIOUS RHINO — parecer de retenção e aquisição (05/09/2026)

Base: dossiê + leitura do código em `C:/Users/crist/MobileGame` (somente leitura). Onde o parecer depende de um fato do código, o arquivo está citado; onde é estimativa, está dito.

## 0. Resumo executivo

1. O jogo tem seis sistemas de "volta amanhã" (streak, skins, arena, ranking/estacas, medalhas, Diário) e **nenhum deles cria um compromisso**: todos são vistos só dentro do app, nada muda de um dia para o outro, e a próxima meta alcançável não fica à vista. A coorte de lançamento reteve 63% no D7 porque o retentor era o **grupo de WhatsApp do dono**, não o produto; as coortes seguintes (link encaminhado, sem âncora social) caem para 20-29%.
2. A única alavanca de aquisição ("Chamar galera") manda um texto com a URL crua, sem atribuição, sem loop de volta — e no iPhone o botão de compartilhar do game over está **fora da tela** (Feedback 3). A aquisição secou porque o convite depende do orgulho de quem convida, e 57% morrem cedo demais para ter orgulho.
3. Ordem recomendada (impacto ÷ custo): **(c) desafio por link** → **(d)+(e) próxima meta sempre à vista + game over "quase lá"** → **(i) reengajar os 55 aparelhos que esfriaram** → **(b) Pista do Dia por semente** (só depois da leitura de 26/09) → **(a) metas 3×3 / Campanha** (com o veto "sem diárias automáticas" caindo pela metade) → skins alcançáveis (carona) → (f) eventos (baixo) → (g) Poki/CrazyGames (só como playtest agora; distribuição depois do D1 melhorar). **(h) push: veto mantido**, com argumento.
4. Tudo cabe sem campo novo de 1º nível em `stats`, sem coleção nova e com no máximo **uma** publicação de rules opcional (variante B do diário). Os dados de leitura já existem no servidor (`history.days`, `runs[]`), então cada alavanca nasce com métrica pré-registrada e corte por `v`.
5. Sequenciamento importa mais que a lista: (c) vem primeiro porque **alimenta o n** de todas as outras leituras. Com 1 novo/semana, nenhuma métrica por coorte fecha em menos de 2 meses.

---

## 1. Diagnóstico honesto

### 1.1 O que existe hoje para trazer alguém de volta — e por que não segura

| Sistema | Gatilho de retorno | Recompensa | Onde é visto | Por que não segura (fato verificado) |
|---|---|---|---|---|
| **Streak** (v1.11) | nenhum externo; a pílula só aparece se você já abriu o app | medalhas `streak_3/7/30` (só no modal de medalhas) | box Campanha da home (`HomeScreen.paintCampanha`) | A skin `{streakBest:7}` prometida no desenho F **não existe no `SkinRegistry.js`** — o gancho está no `SkinSystem.totalsData`, mas nenhuma skin o usa. A chama paga só com uma medalha invisível. Copy "convite, nunca bronca" está certo; falta o motivo de voltar (nada de novo amanhã). |
| **Skins** | façanha ou pódio | 10 skins: 4 grátis (default, party, mecacolor, rinorob), 5 de pódio (rank 1-3, 2 ocultas), **1 de façanha** (`towersDowned 5 + bossLayers 3` — inalcançável para a massa de 300-800 m) | modal Skins | Os 32% de adoção são gente experimentando as grátis. **Não existe escada**: nada entre "grátis" e "top 3 do mundo". Zero skin alcançável por um jogador de 500 m. |
| **Arena 1v1** (v1.8.6) | convite de outro jogador — que só chega quando o desafiado abre o app | vencer o desafio (card no Diário) | card na home + estacas | Exige apelido próprio, um parceiro ativo na mesma janela e aceite dentro do app (sem push = latência de dias). Com 12 ativos/7d o pool é minúsculo; em 23/08 os 6 desafios de produção estavam todos cancelados (`ChallengeSystem.normalize`, comentário v1.8.13). 27% de aceite em n pequeno = "morna" é o veredito certo. É ferramenta de um núcleo ativo que ainda não existe. |
| **Ranking / estacas** | nenhum | posição + estaca do rival acima + líder | pódio da home; `createTrackMarks` (recorde, rival acima, líder, desafios) | Estacas só olham **para cima** (quem está à frente); não existe "quem está te alcançando" nem "amigos" fixos. O líder (5.185 m) é irrelevante para quem morre aos 300 m. |
| **Medalhas** (30) | nenhum | carimbo no game over | modal de medalhas | Ganhas em silêncio; a **próxima** medalha nunca é mostrada como alvo. |
| **Marcos** (`MARCOS_M` 100/250/500/2300) | nenhum | toast na primeira vez | na pista | Celebram o passado, não anunciam o futuro. |
| **Diário da Fuga** | nenhum | notícias locais + `config/news` do dono | home | O canal remoto existe e é a única voz do dono no produto — mas só fala com quem já voltou. |

Os fios que amarram tudo:

- **Nada acontece fora do app.** Zero canal outbound (push vetado, sem e-mail, sem grupo no produto). O único outbound é o WhatsApp do dono, à mão.
- **Nada muda amanhã.** Mesma pista, mesmos pesos, mesmas metas. Não há compromisso ("hoje tem X").
- **A próxima meta não está à vista.** O game over diz "faltaram X m para o seu recorde" (`GameScene.js:3945`), mas para quem está longe do recorde não há alvo intermediário — e o alvo social (passar alguém) não aparece na morte.
- **Cada tentativa custa um reload + 2 toques.** "Jogar Novamente" é `location.reload()` (`index.html:2481`), que volta para a **home**, e a corrida só começa com um toque no `#start-screen` (`HomeScreen.armStart`). Na 1ª visita a corrida nasce ~6 s depois (dívida #2 do preload). 3,9 corridas/sessão é o que esse atrito permite.
- **O CTA de compartilhar está abaixo da dobra no iPhone** (Feedback 3). A única alavanca de aquisição do jogo é fisicamente inacessível no aparelho mais comum da base sem rolar.
- **Coorte 03/08 (D7 63%) vs. seguintes (20-29%)**: a de lançamento é o círculo do dono (obrigação social + novidade + grupo onde ele posta). As seguintes chegam por link encaminhado, sem âncora. Hipóteses rivais que o dossiê já registra e que contaminam as coortes recentes: crash-loop iOS (25-28/08) e a curva invertida pré-Escola. Não atribuir a queda a "conteúdo" antes de 26/09.

### 1.2 Como alguém novo chega hoje

- `shareInvite()` (`GameScene.js:661`): texto de WhatsApp com o recorde ("Duvido você passar disso") + `location.origin + location.pathname`. **Sem parâmetro de origem, sem alvo para o amigo, sem loop de volta.** Quem abre vê a home padrão — o desafio do texto se perde na porta.
- Preview do link: `og:image` = `icon-512.png` (o ícone), descrição genérica. É a "página de loja" do jogo e não mostra gameplay.
- Não existe atribuição: a radiografia conta "novos por semana" mas não sabe de onde vieram (R-03 pergunta isso explicitamente).
- Convite depende de orgulho: quem morre aos 34-171 m (mediana da parede) não convida ninguém.

---

## 2. Alavancas ranqueadas (impacto ÷ custo)

| # | Alavanca | Custo | Impacto | Por que nesta posição |
|---|---|---|---|---|
| 1 | **(c) Desafio por link** (ideia G, spec pronta) | M | aquisição + reengajamento + **atribuição** | Única alavanca de aquisição; alimenta o n de tudo o mais; fecha o loop A→B→A que o convite atual não fecha. |
| 2 | **(d)+(e) Próxima meta sempre à vista + game over "quase lá"** | S | profundidade de sessão, retorno 2º dia | Ataca o momento de maior atenção (a morte) com dado que já está no aparelho. Pré-requisito: o CTA acima da dobra (Feedback 3). |
| 3 | **(i) Reengajar os 67 ativos/30d** | XS + 0 código | retorno dos 55 que esfriaram | "Novidades desde a sua última visita" (local) + 1 broadcast com link-desafio (usa a #1) + "alguém passou você" (dado já buscado no boot). |
| 4 | **(b) Pista do Dia por semente** | S-M | compromisso diário + share estilo Wordle | Só depois de 26/09 (congelamento) e com tag `dy` nas corridas. Zero doc, zero write: a semente é a data. |
| 5 | **(a) Metas rotativas 3×3 / Campanha** (MissionSystem) | M | D7 (motivo declarado para voltar) | Reusa `conditionMet`/`requirementText`/`runs[]`. O veto "sem diárias automáticas" cai para metas pessoais geradas; fica para conteúdo editorial diário. |
| 6 | **Skins alcançáveis (escada)** | XS código + arte do dono | adoção/objetivo para a massa | Entradas no registry (`meters 300/600`, `escaped`, `streakBest 3`) — o retro-scan concede na hora a quem já fez ("já tenho progresso"). |
| 7 | **(f) Eventos semanais por modificador** | S cada | baixo com 12 ativos | Só cosmético até 26/09; modificador de gameplay quebra igualdade do ranking e fragmenta a telemetria. 1/mês no máximo. |
| — | **(h) Push / ntfy** | M-G | negativo agora | Veto mantido (argumento na seção 2.8). |
| 8 | **(g) Poki/CrazyGames** | G | grande, **depois** | Agora só como playtest gravado. Distribuir com D1 fraco enterra o jogo no portal; e há 3 bombas de escala no código (seção 4). |

### 2.1 (c) Desafio por link — a porta de entrada

**Mecânica** (spec G + ajustes):
- URL `/?desafio=<m>&de=<nome>` no share. Quem abre vê na home um banner "Thomas te desafiou: passe 987 m" com **um** CTA "ACEITAR E CORRER" (1 toque = corrida; a home já dispara a corrida por `pointerdown`).
- Na pista, estaca do amigo em `m × 40 px` via `createTrackMarks().add()` (`GameScene.js:1851` — anticolisão de 90 px já existe) com provocação ao passar ("VOCÊ PASSOU THOMAS!").
- No game over: passou → botão "Devolver o desafio" (share com a minha marca e `de=<meu apelido>`; sem apelido, abre o `#nickname-modal` que já existe — é aqui que o visitante vira jogador com doc em `scores` e, por consequência, desafiável na Arena). Não passou → a linha de morte diz "faltaram 42 m para passar Thomas" (mesma linha do `death-tip`).
- Persistência local do desafio (`{m, de, at}`) por 7 dias ou até ser batido — sobrevive ao reload do "Jogar Novamente".
- **Diferença da Arena**: sem doc, sem apelido, sem parceiro online, funciona para quem nunca jogou. G é aquisição; a Arena continua sendo entre cadastrados.

**Telemetria sem rules**: `history.src = 'link'` no primeiro boot de aparelho novo — as rules permitem `history.size() <= 6` e o cliente usa 5 (`clients/geos/versions/days/firstSeenS`, `StorageManager.getHistory`): **há exatamente uma vaga**. Corridas sob desafio de link ganham a chave `dl: 1` em `runs[]` (chaves de 2 letras já são prática da casa: `zu zy zl qe qu qy ql fc cj`; as rules só validam `runs is list && size <= 50`). O `test-radiografia` exige leitor para toda chave nova em `RUN_COUNTERS` — incluir no núcleo.

**Sanitização** (entrada hostil): `desafio` inteiro clamp 1..10000; `de` 3-12 chars, whitelist `[\p{L}\p{N} _.-]`, sem URL, sempre `textContent`, fallback "um amigo"; o banner **nunca** é um link. Qualquer coisa fora do padrão = ignora silenciosamente e abre a home normal.

**Restrições**: nada de doc no Firestore (o desafio vive na URL e no aparelho); og tags são estáticas no GitHub Pages — o preview não personaliza (aceitar). Extra XS que vale de carona: `og:image` 1200×630 com um frame de gameplay gerado da arte SVG pelo mesmo caminho do `make-icons` (os PNGs de ícone já são artefato gerado, não asset binário de gameplay).

### 2.2 (d) Recorde/vizinhos dentro da pista — o que falta

Existe: estaca do recorde, do rival imediatamente acima (por pontos, plantada em metros), do líder e dos adversários de desafio (`GameScene.js:1881-1916`). Falta:

1. **Próxima medalha como estaca.** As medalhas de distância (`MedalSystem.js`: 100/200/300/400/600/1100/1200/1400/1600/1800/2000/2200/2700/…) são uma escada pronta: plantar a **próxima não conquistada** ("Na Savana — 400 m"). Para a massa há sempre um alvo a 100-300 m. Zero dado novo.
2. **Quem está te alcançando.** `fetchRivals` busca 2 acima + top 2 (`LeaderboardSystem.js:378-382`); falta 1 consulta `score < best, desc, limit 2` (1 leitura) para o "perseguidor": mostrado na home ("Fulano está 30 m atrás de você") e no game over sem recorde. Motivação defensiva é a que o Subway Surfers usa com amigos.
3. **Near-miss social na morte.** `rivals.rival.m` já está no localStorage — "faltaram 42 m para passar FULANO" custa uma linha ao lado do "faltaram X m para o seu recorde".
4. **Rivais fixos (opcional, S).** Deixar fixar até 3 nomes do top 10/diretório como "seus rivais" (ids em localStorage; 3 leituras por boot com TTL 30 min, molde do `standings`). É o "amigos na pista" sem sistema de amizade.

Nuance mantida: o rival é escolhido por **pontos** e a estaca plantada em **metros** (Spearman 0,999 torna raro o caso invertido) — não mexer.

### 2.3 (e) Game over "quase lá" positivo

A v1.14 "Jornada" já planeja a morte com contexto ("Você caiu na SAVANA — 473 m", barra das 5 alas, "faltaram 27 m para a Floresta"). O que somar, sem duplicar:

- **Uma linha, um número, um verbo.** Escolher o alvo **mais próximo** entre: recorde, próxima medalha, rival, desafio de link, pista do dia. Não empilhar 4 linhas (o modal já transborda no iPhone).
- **Hierarquia do modal** (benchmark): resultado + linha "quase lá" + **um** CTA grande acima da dobra; compartilhar visível como secundário (é a alavanca de aquisição — hoje está abaixo da dobra); detalhes (breakdown, medalhas) abaixo com fade de rolagem. Isso é o conserto do Feedback 3 desenhado para retenção, não só para caber.
- **Dois toques → um.** "CORRER DE NOVO" grava `sessionStorage.autoStart = 1` antes do reload; a home, ao pintar, marca `toquePendente` (`HomeScreen.armStart` já tem o mecanismo) e a corrida nasce sozinha quando a cena chega. "Voltar ao início" continua existindo. Custo XS, sem tocar na cena. Reinício sem reload (`scene.restart`) fica como dívida futura: o `GameScene` carrega estado demais e o risco de soft-lock não paga agora. **Medir antes**: latência morte→largada = `t_next − (t + s)` de `runs[]` (é o proxy M5(e) da doutrina dos bosses).
- Copy: positivo e concreto ("quase: 27 m para a Floresta"), nunca "você morreu". Título "GAME OVER" → "QUASE!" quando o alvo mais próximo estava a ≤10%.

### 2.4 (i) Reengajar os 67 ativos/30d

55 aparelhos jogaram nos últimos 30 dias mas não nos últimos 7. Eles são o círculo do dono — o único canal é o WhatsApp dele. Três peças:

1. **"Novidades desde a sua última visita" (XS, local).** Guardar `furious_rhino_last_version`; no boot, se difere de `Constants.VERSION`, empurrar no Diário (`NewsSystem.push`, dedupe por chave) um card por versão pulada, a partir de uma tabela `CHANGELOG_CARDS` em código ("O zoológico foi redesenhado", "A Escola do Rino", "Streaks"). Sem rede. O `config/news` remoto continua para avisos vivos — o dono deveria escrever um a cada release (zero código).
2. **"Alguém passou você" (XS).** `fetchMyRank` roda no boot; comparar com o `LAST_RANK` cacheado: caiu → card "você caiu para #9" + atalho para o top 10; subiu → card dourado. Dado já pago.
3. **Broadcast (0 código, depende da #1).** Uma mensagem no grupo com link-desafio do dono (`?desafio=<recorde>&de=Thomas`). É o experimento: mede-se pelo `history.src` e por dia novo em `history.days` nos 7 dias seguintes.

Nota honesta: com n=55 isso mede existência e direção (IC ±13 p.p.), não taxa.

### 2.5 (b) Pista do Dia por semente

**O que custa semear (verificado):** a roleta de spawn é `Math.random` em 15 pontos do `SpawnManager.js` (linhas 274, 278, 285, 293, 297, 302, 320, 337, 344, 356, 377, 417, 448, 482, 525) + `Phaser.Math.Between` na altura do voador (`:505`) + `Animal.js:79` (`zigDir`, gameplay) e `:76` (`bobPhase`, cosmético). Todo o resto é cosmético (trovão, pássaros de fundo, partículas, fumaça, áudio). O clima **já é determinístico** por faixa (`Constants.weatherFor` usa hash). Implementação: `rng` injetado no construtor do `SpawnManager` (mulberry32 semeado por `hash(dayKey)`), `this.rng()` nos 16 pontos, `scene.spawnRng` para o `Animal`; **default = `Math.random`** → corridas normais bit-idênticas (nenhuma violação do congelamento fora do modo diário). Bônus: `?seed=` torna os e2e reproduzíveis. RNG isolado do futuro DecorDirector (v1.14) — já é doutrina da casa.

**Determinismo, com honestidade:** a ordem de spawn é por x (determinística), mas (1) esgotamento de pool (`getFirst(false)` nulo) depende da velocidade do jogador e (2) `tierEfetivo(fNovato)` muda os **pesos** por jogador: mesma semente = mesma pista só para `bestM ≥ 800` (f = 1; 25 aparelhos). Decisão recomendada: manter a curva pessoal (não jogar o novato na parede que a Escola acabou de tirar) e dizer "mesma sorte, sua dificuldade"; comparação exata entre veteranos.

**Interação com a Escola/tiers e o congelamento:** a semente não muda distribuição nem pesos, mas concentra a amostra de um dia num sorteio só — um dia "fácil" contamina a leitura por `v`. Por isso: construir agora, **publicar depois da leitura de 26/09**, e toda corrida diária leva `dy: <nº do dia>` em `runs[]` para ser filtrável.

**UX (variante A, zero write):** card na home "PISTA DO DIA #41 — sua melhor hoje: 612 m"; game over com share estilo Wordle ("RHINO #41 · 612 m · 3 tentativas · [causas] · link `?dia=41&de=Nome`" — o parâmetro só abre o card; a semente é sempre a data local, ninguém escolhe um dia fácil por URL). O placar é o grupo de WhatsApp. Opcional barato: "hoje no top 10" lendo `stats` dos 10 do pódio (10 leituras, TTL 30 min) e filtrando `runs[]` por `dy`.

**Variante B (só se a A pegar):** mapa opcional `d: {k: 'AAAA-MM-DD', m}` em `scores` (whitelist `hasOnly` ganha 1 chave; ~3 cláusulas — o bloco `scores` é enxuto, longe do teto que estourou em `stats`) + índice composto `d.k + d.m` → placar diário real em 10 leituras. Uma publicação de rules, retrocompatível.

Corridas diárias contam para o ranking mundial (mesmas distribuições; o "dia fácil" é igual para todos). Risco aceito: recorde batido em dia fácil.

### 2.6 (a) Metas rotativas 3-por-vez em 3 escalas — e o veto das diárias

**O veto "sem diárias automáticas" misturou duas coisas.** O motivo registrado ("base de 51 não sustenta a esteira; vira lista vazia") vale para **conteúdo editorial diário** que o dono teria de produzir — esse veto fica. Não vale para **metas pessoais geradas** de uma escada determinística: nunca ficam vazias, não expiram, não cobram. Recomendação: o veto cai para metas automáticas **sem prazo**; a cadência diária vem da semente (b), não das metas. Isso preserva a doutrina "convite, nunca bronca".

**As 3 escalas (dados que `runs[]`/totais já têm):**
- *Nesta corrida* (single-run, `conditionMet` sobre os contadores): "quebre 3 paredes" (`w`), "derrube 1 torre" (`o`), "5 pulos carregados" (`cj`), "chegue a {0,9 × recorde} m", "passe {rival}".
- *Esta semana* (janela de 7 dias de `runs[].t` + `history.days`): "acumule 3.000 m", "3 dias com corrida", "10 animais".
- *Arco/capítulo* (`MissionRegistry.js` no molde do `SkinRegistry`, geografia atual): Zoo → Cidade (Muralha) → Deserto (Barreira/Faraó) → Fim. O retro-scan marca "A Fuga" feita para os 131 fugitivos no primeiro boot.

**Mecânica:** escada fixa por escala, indexada pelo estado do jogador; concluiu → próxima; "trocar" 1×/dia opcional. Sem moeda: recompensa = medalha de capítulo (append-only), card no Diário, linha de share, e opcionalmente uma skin por capítulo se o dono gerar arte no `/?setup`. Superfícies: box Campanha (já tem o lugar e a pílula de streak) + 1 linha no game over ("meta: 2/3 paredes"). Missão da semana editorial via `config/missions` continua possível (as rules já leem `config/*`), mas **opcional** — nunca obrigatória.

**Telemetria:** `ms: <n>` (metas concluídas na corrida) em `runs[]`; progresso de capítulo derivável de `bestM`. Custo M (MissionSystem ~150 linhas + registry + 2 superfícies + testes).

### 2.7 (f) Eventos semanais por modificador — baixa prioridade

- Até 26/09 só **cosmético**: doc `config/event` (`{weather, from, to, title}`, leitura já permitida) sobrepondo o `WEATHER_SCRIPT` visualmente — "semana da tempestade". Zero spawn.
- Modificadores de gameplay (sem torres, fúria 2×) exigem tag `ev` em `runs[]`, exclusão do ranking mundial (igualdade do ranking é contrato) e fragmentam a leitura — com 12 ativos, não há n para ler nada.
- Meta coletiva ("a comunidade derrubou 312 torres") = dono cola o número no `config/news` a partir do `/?stats`. Zero código.
- Verdict: 1 evento/mês, depois de (b) mostrar stickiness. Medida: corridas/aparelho na semana do evento vs. as 2 anteriores (`history.days`, n ≥ 15 ativos).

### 2.8 (h) Notificações — veto mantido, com argumento

- **ntfy** exige o app ntfy + assinar um tópico; para o público casual BR é atrito fatal, e tópico público é spamável por qualquer um.
- **Web Push** exige guardar a subscription (coleção nova + rules), um remetente com chave VAPID (o cron do `daily-digest.yml` é o molde, mas hoje ele só **lê** — a apiKey é pública e não há credencial de escrita), permissão explícita, e no iOS só com PWA instalado (32 aparelhos). Custo M-G para 12 ativos.
- O argumento de produto: push não conserta um jogo ao qual as pessoas não voltam — acelera a desinstalação. O streak do Duolingo funciona porque o streak já importa. Aqui ainda não importa.
- Reabrir só quando (b) mostrar que há algo diário a anunciar e houver ≥30 PWAs opt-in. Até lá, o canal é o grupo de WhatsApp, e nunca uma mensagem de "sua chama vai apagar".

### 2.9 (g) Poki / CrazyGames — o que muda no jogo e o risco

O que muda (a conferir nos guidelines vigentes de cada portal):
1. **Hospedagem e origem**: os portais hospedam os arquivos num iframe do domínio deles → SW/PWA/`install-hint` perdem sentido (esconder quando `window.top !== window`); **localStorage em iframe cross-site pode ser particionado/bloqueado** (Safari) → identidade (UUID), streak e `runs[]` em risco; o `StorageManager` já engole erros, mas o jogo precisa de um modo "sem memória" honesto. CrazyGames tem módulo de usuário no SDK; Poki não.
2. **Dependências**: Phaser via jsdelivr → vendorar `phaser.min.js` (texto, não binário; zero build preservado).
3. **SDK**: init, `gameLoadingFinished`, `gameplayStart/Stop` na largada/morte, `commercialBreak` no game over (a monetização é deles e conflita com "≤2 toques até correr de novo" — o portal dita a frequência). Rewarded ads: não — contrato binário, nada a vender/reviver.
4. **Políticas**: sem links externos (rodapé `/?stats`, "Chamar galera", share) → esconder quando embutido; sem cadastro forçado; **inglês no mínimo** — i18n de centenas de strings, inclusive texto dentro dos SVGs ("PROCURADO", "PADARIA"): custo G por si só.
5. **Firestore**: backend externo costuma ser aceito, mas as rules públicas viram superfície global (poluição do ranking já aconteceu com `?debug`); a restrição de referrer da apiKey (Identity Toolkit) precisa dos origins novos; e as **três varreduras de coleção inteira** (`checkName` em `LeaderboardSystem.js:198`, `fetchDirectory` em `ChallengeSystem.js:218`, `/?stats`) viram O(N²) — com 2 mil jogadores, cada apelido novo lê 2 mil docs.
6. **Carga**: a corrida nasce ~6 s após o toque na 1ª visita (dívida #2) — no portal toda visita tem cara de primeira; o split do preload vira bloqueador.

**Risco**: semanas de trabalho de um dev; rejeição na revisão; e, o pior, o portal mede D1/playtime no período de teste — com 57% um-dia-só o jogo é enterrado, e a chance não volta fácil.

**Recomendação**: não distribuir agora. Usar o **playtest gravado** (cópia com `?embed=1` escondendo links/PWA) para ver primeiras sessões reais — informa diretamente os Feedbacks 1 e 3 de graça. Distribuir quando o retorno ao 2º dia passar de ~50% por duas leituras e as três varreduras estiverem trocadas (query por `nameLower` + diretório = top 50).

### 2.10 Skins alcançáveis (carona de (a))

Entradas no `SkinRegistry.js` que o `SkinSystem` já entende: `{meters: 300}` (46 aparelhos ganham no retro-scan = "já tenho progresso"), `{meters: 600}`, `{escaped: true}`, `{streakBest: 3}` (o gancho existe, a skin não). Código XS; arte pelo `/?setup` do dono. A radiografia mostrou adoção dobrando quando entrou skin nova (R-10) — é o dado mais barato de repetir.

---

## 3. Métricas, n mínimo, prazo e corte por `v`

Regra da casa: métrica, n e data escritos **antes** do deploy; leitura por `v` da corrida, nunca por `firstSeen`; as leituras de 12/09 e 26/09 da Escola cortam por `v ≥ 1.12.0` e, se (b) já estiver no ar, excluem `dy`.

| Alavanca | Métrica primária | Fonte (já existe?) | n mínimo | Leitura | Por `v` |
|---|---|---|---|---|---|
| (c) link | novos/semana com `history.src='link'`; % dos novos com src | `history.src` (novo, sem rules) + radiografia | 20 aberturas de link (existência); 30 novos/coorte para D1 | 2 e 4 semanas após o 1º broadcast | só clientes ≥ v(c) gravam src; corridas `dl` |
| (d)+(e) | corridas/sessão; % sessões ≥5 corridas; latência morte→largada | `history.days` (r/s exatos, servidor); `runs[].t/s` | ≥100 sessões pós-release (~3 sem. no ritmo atual; 1 sem. se (c) render) | 3 semanas | sessões cujo 1º run tem `v` ≥ release |
| (i) | % dos 55 lapsos com dia novo em ≤7 dias após o broadcast | `history.days` | n=55 (direção, ±13 p.p.) | 1 semana | `gameVersion` da última visita |
| (b) diário | stickiness (dias com corrida por aparelho ativo/semana); retorno 2º dia; aparelhos com streak ≥3 | `history.days`, `runs[].dy` | 4 semanas de dados; ≥15 ativos/semana | leitura em 4 sem. (após 26/09 + 4) | corridas `dy` vs. sem `dy`, mesma `v` |
| (a) metas | conclusões/corrida (`ms`); D7 por coorte | `runs[].ms`; coortes por `firstSeenS` | ≥30 novos/coorte (só fecha com (c)) | 6-8 semanas | `v` ≥ release |
| skins | adoção (`g`) | já medida (R-10) | — | próxima radiografia | — |
| (f) | corridas/aparelho na semana vs. 2 anteriores | `history.days` | ≥15 ativos | 1 semana por evento | — |
| (g) | métricas do portal (D1, playtime) | externo | — | período de teste do portal | — |

Honestidade estatística: com ~60 aparelhos o IC95 de proporção por jogador é ±14 p.p. (a radiografia já imprime isso). Nada aqui prova causalidade; é antes/depois pré-registrado com hipóteses rivais anotadas (crash iOS, Escola, v1.13/1.14).

---

## 4. Riscos

**Firestore gratuito** (plano Spark: ~50 mil leituras e ~20 mil escritas/dia — conferir no console, os tetos mudam). Estimativa do consumo atual por sessão: boot ≈ 8-12 leituras (pódio 3 c/ TTL 5 min, rank 1 count, rivais 4, news 1/h, notify 1/h, desafios 1 query/10 min) + por corrida ≈ 1-2 escritas (`stats` sempre, `scores` se melhorou) + refresh de desafios. Com 12 ativos/7d: **< 200 leituras/dia** — folga enorme. As alavancas acima somam: (c) 0, (d) +1-3 leituras/boot, (i) 0, (b)-A +10/30 min por visualização, (a) 0. Continua < 5 mil/dia a 50 DAU. **As bombas são as varreduras de coleção inteira** (`checkName`, `fetchDirectory`, `/?stats`): custo = N docs por chamada, quadrático com a base. Irrelevante hoje, letal num portal.

**Rules com 1º nível fechado**: `stats` 12/12 chaves — nada novo lá. Vagas verificadas: `history` tem 1 chave livre (5/6) → `src`; elementos de `runs[]` são livres (`dl`, `dy`, `ms`); `scores` aceita 1 mapa opcional se a variante B do diário entrar (uma publicação, antes do deploy). Todo leitor novo entra no `RadiografiaCore` ou o `test-radiografia` fica vermelho.

**Abuso**: link público — parâmetros sanitizados, sem write, banner nunca clicável; o pior caso é `de=` com nome ofensivo (whitelist de caracteres + 12 chars). Semente — derivada da data, `?dia=` não escolhe semente; repetir a pista do dia é o desenho. Ranking — escrita pública sem auth é condição pré-existente (`RUN_SANITY_MAX_MPS`, `purgeUnprovenLocal`, `ehCascata` são as defesas); um portal multiplica o problema.

**Tempo do dev**: v1.13 e v1.14 já aprovadas, Feedbacks 1-3 na fila, congelamento até 26/09. Fatias sugeridas, cada uma publicável sozinha: **A** (c)+(e)-CTA+(i) = M, sem tocar em spawn (cabe antes de 26/09); **B** (d) estacas + skins = XS-S; **C** (b) após 26/09 = S-M; **D** (a) = M. (g) fica fora do trimestre.

**Contaminação das leituras pré-registradas**: (b) só depois de 26/09 e com `dy`; (c)/(d)/(e)/(i) não tocam spawn/física.

---

## 5. Vetos (o que não fazer, e por quê)

- **Loja, moedas, login.** Moeda pressiona para vender investida/vida — quebra o contrato binário (sem HP, contato mata, dash mata em 1 toque). Login mata "≤1 clique até jogar" e reabre a arquitetura (rules sem `request.auth`, identidade = UUID; o fluxo de recuperação "Teco" já cobre o caso real).
- **Ghost / replay do recorde.** Série temporal por corrida = coleção nova + rules + storage; a estaca do amigo entrega 80% do valor por 0% do custo.
- **Push a jogadores.** Mantido (2.8).
- **Missões diárias editoriais que expiram.** Mantido — lista vazia e bronca. Metas pessoais geradas sem prazo: liberado.
- **Modificador de gameplay em evento antes de 26/09**, ou qualquer evento que grave no ranking mundial sem tag.
- **Campo de 1º nível em `stats`** por qualquer motivo.
- **Modal a cada morte** (lição do `#pwa-modal`: 1× por sessão).
- **Distribuir em portal antes do D1 melhorar** — e antes de trocar as varreduras de coleção.
- **Reabrir decisões já tomadas**: rotação de bosses, checkpoint, 3º boss sem gatilho, mãos quietas na Muralha.

## Fontes no código (verificadas nesta leitura)

- `C:/Users/crist/MobileGame/js/home/HomeScreen.js` (paintCampanha, armStart, pílula de streak)
- `C:/Users/crist/MobileGame/js/utils/StorageManager.js` (RUN_COUNTERS com chaves de 2 letras, getHistory com 5 chaves, getStreak, addRun)
- `C:/Users/crist/MobileGame/js/systems/SkinSystem.js` e `SkinRegistry.js` (conditionMet, 1 skin de façanha, sem skin de streak)
- `C:/Users/crist/MobileGame/js/systems/SpawnManager.js` (15 `Math.random` + 1 `Phaser.Math.Between`), `js/entities/Animal.js:76-79`
- `C:/Users/crist/MobileGame/js/scenes/GameScene.js` (createTrackMarks 1843-1918; death-tip 3935-3948; shareInvite 661)
- `C:/Users/crist/MobileGame/js/systems/LeaderboardSystem.js` (fetchRivals 366-411, fetchMyRank 421, checkName 193-198)
- `C:/Users/crist/MobileGame/js/systems/ChallengeSystem.js` (standings derivado, fetchDirectory 213-232)
- `C:/Users/crist/MobileGame/js/systems/NewsSystem.js` (config/news + eventos locais)
- `C:/Users/crist/MobileGame/firestore.rules` (history.size() <= 6, runs livre, config read:true)
- `C:/Users/crist/MobileGame/index.html:2481` ("Jogar Novamente" = `location.reload()`), og tags 71-75
- `C:/Users/crist/MobileGame/docs/IDEIAS-FUTURAS.md` (ideias E/G, descartes, doutrina M, §6)
- `C:/Users/crist/MobileGame/.github/workflows/daily-digest.yml` + `tools/daily-digest.mjs` (cron só de leitura)