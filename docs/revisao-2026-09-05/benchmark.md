# Benchmark — runners, chefes, legibilidade, UI mobile e retenção (05/09/2026)

> Pesquisa externa encomendada para a revisão geral de 05/09. Só busca — nada
> aqui foi inferido do nosso código. Algumas fontes primárias bloquearam o
> fetch (Fandom, Medium, HIG da Apple renderizada por JS); nesses casos vale o
> resumo de busca e está sinalizado **(via busca)**.
>
> Como ler: cada achado existe para responder a uma pergunta nossa. As
> conclusões que viraram decisão estão em `docs/IDEIAS-FUTURAS.md` §N.

---

## 1. Chefes: como outros jogos resolvem VARIEDADE

**1.1 Consenso: chefe = prova dos verbos ensinados, em 8 batidas.** Mike Stout
(Activision): "a boss is a test" e "a boss is a story"; o método começa por
*"make a list of the skills you want to test the player on"* — desenhar os
ataques primeiro, tematizar depois. Estrutura: build-up → reveal → "business
as usual" → escalada → **ponto médio visível** (transformação, falsa derrota)
→ "it's ON" → kill sequence → vitória com recompensa.
[Boss Battle Design and Structure](https://www.gamedeveloper.com/design/boss-battle-design-and-structure)

Itay Keren (GDC 2018, "Boss Up"): o chefe *"evaluates and breaks acquired
skills"* e pode *"break some of the rules of the game"* — com cuidado.
[Game Developer](https://www.gamedeveloper.com/design/video-boss-battle-design-fundamentals) ·
[GDC Vault](https://www.gdcvault.com/play/1024921/Boss-Up-Boss-Battle-Design)

**1.2 Telegraph é o que separa "difícil" de "injusto".** Stout: *"Before the
attack, we need a small delay… 'Okay, here I come'"*, em vários canais
(animação, VFX, som); a pergunta central é *"Can you avoid my damage?"*.
[Enemy Attacks and Telegraphing](https://www.gamedeveloper.com/design/enemy-attacks-and-telegraphing)
Números de referência: o jogador médio leva **>0,3 s** para perceber + decidir
+ apertar; para iniciantes ou telas cheias, telegraph de **até 3 s**.
[Bugnet](https://bugnet.io/blog/how-to-design-enemy-attack-telegraphs)
Kubodera (Death's Gambit): legibilidade = telegraph + expectativa, *"has the
largest impact on frustration"*; consistência visual entre chefes; **"Don't
compromise readability as a means to increase difficulty"**.
[Readability in ARPGs](https://www.gamedeveloper.com/game-platforms/designing-for-difficulty-readability-in-arpgs)

**1.3 Shovel Knight: cada chefe = uma personalidade = uma mecânica — e a arena
faz parte do chefe.** Mole Knight (cava/velocidade), King Knight (ataques
sequenciais simples, cedo no jogo), Plague Knight (reativo, explosões abrem
buracos no chão), Specter Knight (sem gravidade), Propeller Knight (exige
timing agressivo). Regra explícita: *"the theme of the world, the theme of the
character, and the personality of the character to match and be cohesive"*;
chefes ficam sempre visíveis e vulneráveis.
[Baz/Mole/King](https://www.gamedeveloper.com/design/how-yacht-club-games-created-shovel-knight-s-baz-mole-knight-and-king-knight-bosses) ·
[Specter/Plague/Propeller](https://www.gamedeveloper.com/design/how-yacht-club-games-created-shovel-knight-s-specter-knight-plague-knight-and-propeller-knight-bosses)

**1.4 Cuphead: variedade vem de fase visível + mudança de regra, não de mais
HP.** *"Every attack on every boss in the game is telegraphed"*; 3-4 fases com
transformação visível; a Ilha 2 combina verbos (*"two or more things at
once"*), a Ilha 3 muda a arena/regra (estágio vertical, sub-fases destrutíveis,
olhar que petrifica), e o final sintetiza sem surpresas.
[Epilogue Gaming](https://epiloguegaming.com/cupheads-boss-design/) ·
[GamingBolt](https://gamingbolt.com/ranking-all-40-cuphead-bosses)
Kirby (HAL, GDC 2023): *"approachable, yet deep"* e *"make Kirby the hero"* —
tolera inputs alguns frames adiantados/atrasados.
[Kirby at 30](https://www.gamedeveloper.com/marketing/kirby-at-30)

**1.5 Variedade barata: "manobras" modulares.** Psychonauts 2 montou chefes em
2 meses com um sistema de dados **telegraph → ataque → recuperação**
encadeáveis; templates reutilizados *"don't compromise uniqueness"*. Para um
dev só, é a arquitetura certa: uma tabela de padrões por chefe/fase.
[Game Developer](https://www.gamedeveloper.com/marketing/using-a-modular-system-of-maneuvers-to-design-i-psychonauts-2-i-s-boss-fights-in-a-hurry)

**1.6 Runners mobile.** *Sonic Dash* **(via busca)**: chefe disparado por mola
especial; Zazz tem 3 fases (atrás, 9 tiros a desviar → à frente, largando
estrelas em formações → mola + toque no tempo certo para golpear); Eggman usa
o mesmo esqueleto mas exige homing attack nos lançadores antes; recompensa =
bônus de pontos + item.
[Sonic Wiki](https://sonic.fandom.com/wiki/Zazz_(Sonic_Dash)) ·
[Sonic Dash Wiki](https://sonicd.fandom.com/wiki/Sonic_Dash)
**Lição direta para nós**: até a SEGA reusou o esqueleto e variou só o
*pré-requisito* — que é exatamente a queixa "todos parecidos".

*Jetpack Joyride* não tem chefe e compensa com missões em três escalas de
tempo (30 s–2 min, 2–10 min, 10–30+ min) e veículos como *pace breakers* /
empoderamento; *"just as easy to replay after death"*.
[Adrian Crook](https://adriancrook.com/design-breakdown-jetpack-joyride/) ·
[GDC Vault](https://www.gdcvault.com/play/1015527/Depth-in-Simplicity-The-Making)

*Rayman Jungle Run* organiza mundos por verbo (jump, hover, wall run, punch) e
seu "chefe" é uma **perseguição**: *"outrun a giant red monster"*.
[Shacknews](https://www.shacknews.com/article/78686/rayman-jungle-run-free-update-adds-20-levels) ·
[RayWiki](https://raymanpc.com/wiki/en/Rayman_Jungle_Run)

Subway Surfers e Temple Run não têm chefes; usam missões, desafios diários e
eventos (ver §4).

---

## 2. Legibilidade em cenas noturnas/urbanas

**2.1 Teste de valor (dessaturar).** Peter Angstadt: *"Take a screenshot,
desaturate it, and see if you can immediately and easily understand the
image"*; em DOTA 2 *"the ground uses darker grays than the heroes"*, que são
*"the brightest and highest areas of contrast"*; Limbo inverte (fundo claro,
ameaça escura) e funciona igual porque há **plano de valores**. *"If everything
is drawing attention, nothing will."*
[How to Reduce Visual Confusion](https://www.gamedeveloper.com/design/how-to-reduce-visual-confusion-in-your-game)

**2.2 Framework de 4 eixos.** Prioridade de silhueta; hierarquia de valor
(*"elements that players must read first get the highest value contrast"*);
**assinatura de movimento** por tipo de ameaça; e **reserva de matiz por
função** (ameaça / recompensa / perigo ambiental / estado do jogador) — o
decorativo nunca usa a cor reservada.
[Nextmars](https://www.nextmars.com/post/when-art-breaks-mechanics-2d-game-art-readability-framework)
80.lv: *"The eyes are guided to the point where the contrast of value is
high"*; teste de miniatura.
[80.lv](https://80.lv/articles/studying-character-art-silhouette-and-contrast)

**2.3 Referências que resolvem por contraste extremo.** *Canabalt*: cidade em
seis tons de cinza e o corredor de terno preto *"so that he would stand out"*
([Wikipedia](https://en.wikipedia.org/wiki/Canabalt)). *Vector*: silhuetas
pretas para foco em timing/trajetória
([Grokipedia](https://grokipedia.com/page/Vector_(video_game))). *Dead Cells*:
normal maps + toon shader para dar volume e silhueta sem pintar sombras frame
a frame; prioridade *"movement is love, movement is life"*
([Game Developer](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)).
*Alto's*: minimalismo com luz dinâmica por hora do dia
([80.lv](https://80.lv/articles/altos-adventure-a-game-with-style)); no ciclo
noturno o fundo vira silhueta escura e Alto/rochas ganham valor claro — mesma
regra de separação por valor.

**2.4 Telegraph legível = cor + gesto + som + indicador no chão**, com
consistência entre encontros e dano compatível com o perigo percebido
([Kubodera](https://www.gamedeveloper.com/game-platforms/designing-for-difficulty-readability-in-arpgs)).

---

## 3. UI mobile em paisagem

**3.1 Dimensões e safe areas.** iPhone 16 Pro: **402 × 874 CSS px** em paisagem
([Blisk](https://blisk.io/devices/details/iphone-16-pro) ·
[YesViz](https://yesviz.com/devices/iphone-16-pro/)). Insets em paisagem:
Dynamic Island 59–62 pt esq/dir, notch 47 pt, **21 pt embaixo** (home
indicator), 0 em cima — mas *"do not place interactive elements flush against
the top edge in landscape"*, reserve ~20 px
([guia PWA iPhone](https://gist.github.com/fozzedout/5e77925381991a9570151550992baf14)).
Área útil real ≈ 750 × 360 px. **Sem `viewport-fit=cover` o `env(safe-area-inset-*)`
é 0**; usar `padding-left: max(12px, env(safe-area-inset-left))`
([WebKit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)). O
modo responsivo do Chrome mostra insets 0 — só aparelho real pega o bug
([Polypane](https://polypane.app/blog/using-safe-area-inset-to-build-mobile-safe-layouts/)).

**3.2 `dvh`.** Acompanha a barra do navegador, mas *"does not update at 60fps"*
([web.dev](https://web.dev/blog/viewport-units)); em PWA standalone no iPhone,
*"100dvh reports wrong values on PWA cold start"* — o guia recomenda `100vh`
em html/body no modo standalone
([gist](https://gist.github.com/fozzedout/5e77925381991a9570151550992baf14)).
Material 3: altura "compact" (&lt;480 dp) cobre **99,78%** dos celulares em
paisagem; layouts de dois painéis *"are not practical"* — modais em coluna
única
([Android Developers](https://developer.android.com/develop/ui/views/layout/use-window-size-classes) ·
[M3](https://m3.material.io/foundations/layout/applying-layout/window-size-classes)).

**3.3 Game over: 1–2 toques até correr de novo.** Crossy Road: a única espera é
*"the 0.5-to-1 second loading time between player death and restart"*; retorno
*"within one or two button presses maximum"*
([Game Developer](https://www.gamedeveloper.com/design/what-design-lessons-can-we-learn-from-crossy-road-)).
Poki/Defold: *"continuous gameplay performs best"*, sensação de "one more try"
([Defold](https://defold.com/2026/06/02/Best-practices-when-building-for-the-web/)).
CTA primário 44–56 px, centro-baixo, alcance do polegar
([Striking Alchemy](https://strikingalchemy.com/article/10-mobile-cta-design-tips-for-better-conversions)).
Evidência experimental: texto **altamente positivo** na tela de game over
afetou retenção num runner; texto "morno" não teve efeito (n=20)
([tese Northeastern](https://www.semanticscholar.org/paper/Impact-of-textual-feedback-on-player-retention-in-Padte/3ba1c30b334592e488fa533b8feac12b4d32a6f2)).

**3.4 Leaderboard top 10.** *"Show top 10, show their position, show who's just
above them"* — a posição do próprio jogador com vizinhos acima/abaixo é o que
mantém *"the other 90%"* motivados
([Yu-kai Chou](https://yukaichou.com/advanced-gamification/how-to-design-effective-leaderboards-boosting-motivation-and-engagement/) ·
[UX Collective](https://uxdesign.cc/building-better-leaderboards-a5013d19cbd7)).
Pontuações com `font-variant-numeric: tabular-nums` para colunas alinhadas sem
fonte mono
([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric)).
Truncar nomes com reticências mantendo caminho para ler inteiro
([Phrase](https://phrase.com/blog/posts/best-practices-for-text-components-in-mobile-design/)).
Overflow rolável precisa de sinal: scroll shadows/fade nas bordas
([CSS-Tricks](https://css-tricks.com/modern-scroll-shadows-using-scroll-driven-animations/) ·
[Google modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/ui-atoms/scrollability-affordance-hints.md)).

---

## 4. Retenção em web games e runners pequenos

**4.1 Benchmarks.** GameAnalytics 2025 (11,6 mil jogos): Arcade **D1 ≈ 22%,
D7 ≈ 4,1–4,2%, D28 ≈ 1%**; sessão 3,2–3,4 min, 3,8–4,1 sessões/dia; top 25%:
D1 26–28%, D7 7–8%
([GameAnalytics](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks)).
Na web, *"strong games often achieve 10–15% Day 1"*, playtime 10+ min, C2P 80%+
([CrazyGames](https://docs.crazygames.com/resources/basic-launch-metrics/));
Poki: playtime 5+ min bom, 7–10 muito bom, C2P 65%+
([Defold/Poki](https://defold.com/2026/06/02/Best-practices-when-building-for-the-web/)).
*"Players who die or fail within those first minutes will not stick around"*
([IndieGameBusiness](https://indiegamebusiness.com/web-gaming-for-indie-developers/)).

**4.2 Objetivos rotativos, sem login.** Alto's Adventure: **180 metas, 3 por
vez**, sem ranking nem recompensa diária — retém por progressão e variação
procedural
([Game Developer](https://www.gamedeveloper.com/design/alto-s-adventure-case-study)).
Jetpack Joyride: 3 escalas de duração
([Adrian Crook](https://adriancrook.com/design-breakdown-jetpack-joyride/)).
Subway Surfers: missões de 3 tarefas com multiplicador; desafio diário
*"draws the player's attention to the levelboard"*; personagens temporários
fazem voltar *"just to see what has changed"*
([Game World Observer](https://gameworldobserver.com/2016/06/24/subway-surfers-gameplay-analysis)).

**4.3 "Só mais uma": near-miss e recorde visível DURANTE a corrida.** Near miss
ativa *"the same reward systems in the brain as actual gambling wins"* (Clark
2009); implicação: *"engineer more chances to almost win"* e mostrar o
progresso quase-completo
([Jamie Madigan](https://www.psychologyofgames.com/2016/09/the-near-miss-effect-and-game-rewards/);
ressalva: pouca pesquisa quando há skill). Subway Surfers mostra o placar dos
amigos **dentro da pista**: *"not some abstract board… this is a constant
reminder"*
([GWO](https://gameworldobserver.com/2016/06/24/subway-surfers-gameplay-analysis)).
Ghost do próprio recorde: correr contra si mesmo dobra esforço e aumenta
prazer/competência percebida
([Univ. of Bath](https://www.bath.ac.uk/announcements/self-isolating-get-fit-faster-with-multi-ghost-racing/)).

**4.4 Desafio diário com seed.** Spelunky: todos jogam o mesmo seed, uma
tentativa, ranking comparável, vídeos e conversa — *"the silent video game
innovation"*
([Mike Rose, Game Developer](https://www.gamedeveloper.com/design/the-understated-genius-of-the-i-spelunky-i-daily-challenge)).
Cabe em Firestore de orçamento fixo: **1 documento por dia**.

**4.5 Streaks e eventos.** Duolingo: usuários com streak 7+ retêm **2,4×**;
separar meta diária de streak deu **+3,3% D14**; streak freeze **+10%**
retenção longa
([Duolingo blog](https://blog.duolingo.com/improving-the-streak) ·
[DoF](https://duolingo.deconstructoroffun.com/mechanics/streaks)).
Temple Run 2: desafios diários, semanais e "global" (fim de semana, tempo
limitado) como metas de longo prazo
([Udonis](https://www.blog.udonis.co/mobile-marketing/mobile-games/temple-run-2) ·
[Wiki](https://templerun.fandom.com/wiki/Daily_Challenge)).
CrazyGames: *"save player progress: lost progress means lost players"*
([CrazyGames](https://docs.crazygames.com/resources/basic-launch-metrics/)).

---

## 5. Concorrentes web (Poki / CrazyGames): onboarding e game over

- **Sem menu, sem intro.** *"Skip the menu… skip splash screens, title screens,
  and level selects. Let them jump straight into the good part"*; carregar só
  menu/tutorial/1ª fase e o resto em background; *"a big share of all Poki
  gameplays are on mobile"*
  ([Poki easy access](https://developers.poki.com/guide/easy-access)).
  CrazyGames: *"land new users in gameplay immediately… a maximum of 1 click"*
  ([CrazyGames gameplay](https://docs.crazygames.com/requirements/gameplay/)).
- **10 segundos.** *"Players tend to move to another game if loading takes more
  than 10 seconds"*; tutoriais *"visual and intuitive rather than text-heavy"*;
  cutscenes puláveis; 16:9 escalando 640×360 / 836×470 / 1031×580
  ([Poki requirements](https://developers.poki.com/guide/requirements-quality)).
  *"Can the player start having fun within ten seconds?"*
  ([Defold/Poki](https://defold.com/2026/06/02/Best-practices-when-building-for-the-web/)).
- **Legível em DPR 1 a 800×450** e build ≤ 20 MB ideal
  ([CrazyGames technical](https://docs.crazygames.com/requirements/technical/) ·
  [quality](https://docs.crazygames.com/requirements/quality/)).
- **Game over dos líderes web** (Subway Surfers, Crossy Road, Temple Run 2):
  resultado + recorde + **1 botão grande** de repetir; extras abaixo/depois;
  retorno em ≤2 toques
  ([Game Developer/Crossy](https://www.gamedeveloper.com/design/what-design-lessons-can-we-learn-from-crossy-road-)).
- **Playtests gravados.** A Poki oferece vídeo de jogadores aleatórios com
  inputs e console para achar confusão nos primeiros segundos
  ([Poki blog](https://poki.com/blog/higher-success-rates-with-playtests));
  Poki tem 90 M jogadores/mês
  ([IndieGameBusiness](https://indiegamebusiness.com/web-gaming-for-indie-developers/)).

---

## 6. As 10 práticas que o FURIOUS RHINO ainda não fazia (05/09)

Ranqueadas por impacto ÷ custo pelo pesquisador. **A coluna "situação" foi
preenchida DEPOIS, pelo painel + cético** — várias mudaram de prioridade
quando cruzadas com os nossos números.

| # | Prática | Custo | Situação em 05/09 |
|---|---|---|---|
| 1 | Curva dos primeiros 1000 m + tolerância de input | P | **Já feito** (Escola do Rino v1.10, em medição até 26/09) |
| 2 | Marcador do recorde e do top 10 dentro da pista | P | Parcial (estacas de rival existem); "próxima medalha como estaca" → v1.13 |
| 3 | Cada chefe = um verbo, com ponto médio visível | M | Pacote P (cosmético) na v1.12.3; verbos por gatilho de audiência |
| 4 | Metas rotativas, 3 por vez, em 3 escalas | M | Banco com gatilho (MissionSystem) |
| 5 | Game over "quase lá" + texto positivo + 1 CTA | P | **Feito na v1.12.1** (layout); copy completa na v1.13 |
| 6 | Desafio diário com seed (1 tentativa) | M | Banco com gatilho (≥20 ativos/7d, e só pós-26/09) |
| 7 | Passe de legibilidade noite/cidade | P/M | **v1.12.3 "Farol"** |
| 8 | Ranking: top 10 + sua posição + vizinhos | P/M | **Feito na v1.12.1** (top 10 + sua posição); vizinhos no banco |
| 9 | Auditoria de safe areas e viewport | P | **Feito na v1.12.1** |
| 10 | Evento semanal por modificador | M | Fora do trimestre |

**Bônus de distribuição sugerido pelo pesquisador**: publicar no Poki/CrazyGames
daria playtests gravados grátis e tráfego que a base orgânica não gera.
**Vetado pelo cético neste trimestre** — partição de storage em iframe
(Safari) apagaria identidade/streak/`runs[]`, o SW/PWA perde sentido, i18n é
custo G e anúncios brigam com o "≤2 toques". Gatilho para reabrir: retorno ao
2º dia > 50% em duas leituras + toque→corrida ≤ 4 s a frio.
