# Furious Rhino — Referência técnica

> Documentação da versão **1.9.12** · atualizada em 29/08/2026
> Para quem vai dar manutenção. Complementa (não substitui) `GAME_DESIGN.md` (o design e suas razões) e `HANDOFF.md` (estado da última sessão de trabalho e tabelas completas de parâmetros).

## 1. Estrutura de pastas

```
MobileGame/
├── index.html              # HUD, telas, modais e ~1300 linhas de CSS; carrega o Phaser
│                           #   via CDN condicionalmente (em /?stats ele nem é baixado)
├── sw.js                   # Service worker (PWA): network-first, lista ASSETS, versão CACHE
├── manifest.json           # Manifesto PWA: fullscreen, landscape, ícones
├── firestore.rules         # Security rules — versionadas aqui, publicadas À MÃO no console
├── package.json            # Versão + scripts npm (só devDependencies; runtime não tem build)
├── icon*.png / icon.svg    # Ícones do PWA (gerados por tools/make-icons.mjs)
├── GAME_DESIGN.md          # Documento de design com o porquê de cada decisão
├── HANDOFF.md              # Estado da última release + referência completa de parâmetros
├── docs/                   # Esta documentação
├── iniciar-estudio.bat     # Duplo-clique: sobe o servidor unificado e abre o /?setup
├── art/                    # 147 SVGs — a arte que o jogo carrega (fonte da verdade)
├── art2/                   # Propostas de arte aprovadas + preview (registro do fluxo
│                           #   "arte primeiro"; o jogo carrega SÓ o que foi copiado p/ art/)
│                           #   art2/skins/ = folhas-fonte das skins + CLIs do pipeline
├── gerador-de-sprites/     # Ferramenta dev: o SERVIDOR UNIFICADO do estúdio (v1.8.8 —
│                           #   API na :3210 + o jogo na :3000) que converte folhas raster
│                           #   (IA) em skins E sprites de inimigo, e grava a integração
│                           #   com portão de testes (integrate.mjs). output/enemies/ é o
│                           #   estoque de sprites não atribuídos. NUNCA entra no sw.js
├── js/
│   ├── game.js             # Entry point / roteador (?setup, ?stats, ?debug)
│   ├── firebase-config.js  # Credenciais públicas do Firebase (proteção real = rules)
│   ├── notify-config.js    # Defaults dos pushes ntfy (topic vazio = tudo desligado)
│   ├── scenes/             # BootScene (preload) e GameScene (o jogo inteiro)
│   ├── entities/           # Rhino, Animal, CrackedWall, Spike, TranqTower, TranqDart,
│   │                       #   Ramp, TimedHazard, HunterSniper (o atirador dos 5 chefes,
│   │                       #   paramétrico)
│   ├── systems/            # TextureFactory, SpawnManager, FurySystem, BossFight,
│   │                       #   AudioSystem, SkinSystem + SkinRegistry (DADOS, reescrito
│   │                       #   pelo /?setup), ScoreSystem, ChallengeSystem, NewsSystem,
│   │                       #   MedalSystem, LeaderboardSystem, StatsSystem, NotifySystem,
│   │                       #   ReassignSystem (recuperação de identidade, v1.9.0),
│   │                       #   TuningPanel
│   ├── utils/              # Constants (todo o tuning + o MERGE do SpriteParams no fim)
│   │                       #   e StorageManager (persistência local)
│   ├── stats/              # StatsDashboard, Charts, MyStats + RadiografiaCore (v1.8.7 —
│   │                       #   o agregador puro da radiografia, navegador E node)
│   ├── setup/              # SetupPage (moldura + aba Skins), SetupSprites (aba 🖼️,
│   │                       #   v1.8.9), SetupAnalytics (aba 📊, v1.8.7) e SetupReassign
│   │                       #   (aba 🆘 Recuperação, v1.9.0)
│   └── art/                # ArtManifest (mantido à mão), SpriteParams (DADOS de
│                           #   calibração, machine-owned pela aba Sprites) e SvgSprites
│                           #   (gerador aposentado)
├── tools/                  # Scripts Node: testes, digest, exportação de arte, limpeza
└── .github/workflows/
    └── daily-digest.yml    # Cron do resumo diário (23h UTC = 20h Brasília)
```

## 2. Dependências

**Runtime: nenhuma instalada.** Phaser 3.85.2 vem de CDN (jsDelivr); lil-gui (painel de debug) vem de CDN só com `?debug=1`; Firebase SDK 12.16.0 (`firebase-firestore-lite`) vem de CDN por import dinâmico, só quando ranking/telemetria são usados.

**Desenvolvimento (`devDependencies`):**

| Pacote | Uso |
|---|---|
| `playwright` | Testes e2e em Chromium (`e2e-ramp`, `e2e-stats`, `e2e-boss`, `e2e-boss2`, `e2e-boss3`, `e2e-special`, `e2e-skins`, `e2e-setup`) |
| `@resvg/resvg-js` | Rasterizar `icon.svg` → PNGs (`make-icons`) e SVGs enviados ao gerador de sprites |
| `potrace` | Vetorização raster→SVG do gerador de sprites (porta JS do potrace, v1.8) |
| `jimp` | Processamento raster do gerador de sprites (fixado em 0.14.0 — antes vinha só como dependência transitiva do potrace, o que era frágil) |
| `phaser` | Só para tipos/autocomplete no editor (o jogo usa o do CDN) |

## 3. Como rodar do zero

```bash
git clone https://github.com/Cs-Ave/furious-rhino.git
cd furious-rhino
python -m http.server 3000     # qualquer servidor estático serve
# abra http://localhost:3000
```

Para os testes e ferramentas (Node 18+):

```bash
npm install                     # só devDependencies
npm run test-stats              # 127 asserts, sem navegador — inclui a agregação da aba Chefes com corridas verbatim
npm run test-score              # 101 asserts da pontuação composta, sem navegador
npm run test-challenge          # 104 asserts da Arena de Desafios, sem navegador
npm run test-skins              # ~93 asserts das skins, sem navegador (nº varia com o registry)
npm run test-integrate          # 49 asserts da integração do /?setup, sem navegador
npm run test-sprites            # 31 asserts da camada de sprites (v1.8.9), sem navegador
npm run test-radiografia        # 62 asserts da radiografia (v1.8.7), sem navegador e SEM rede
npm run test-reassign           # 61 asserts da recuperação de identidade (v1.9.0), sem navegador
npm run test-crash              # 76 asserts: rede de proteção (v1.9.1) + faxina (v1.9.6) + SW do CASO 2 (v1.9.7)
npm run test-caixapreta         # 37 asserts da instrumentação do CASO 2 (v1.9.8→11), sem navegador
npm run test-fix-ranking        # 32 asserts da classificação do fix-ranking, sem navegador
npm run test-bossproof          # 29 asserts da PROVA DO CHEFE (v1.9.6), sem navegador e SEM rede
npm run test-e2e-crash          # 11 asserts e2e: injeta exceção REAL no update — exige servidor
npm run test-e2e-home           # 10 asserts e2e da home desacoplada (v1.9.3) — idem
npm run perf-home               # REGRESSÃO DE PERFORMANCE da home (4G + CPU 4x) — idem
npm run test-ramp               # 47 asserts em Chromium — exige o servidor acima no ar
npm run test-boss               # 18 asserts e2e da luta do portão — idem
npm run test-boss2              # 14 asserts e2e da Muralha (2000m) — idem
npm run test-boss3              # 10 asserts e2e do Guardião do Fim — idem
npm run test-special            # 25 asserts e2e da FÚRIA TOTAL, biomas e desabamento — idem
npm run test-e2e-deserto        # 14 asserts e2e das Areias do Tempo (v1.8.10) — idem
npm run test-e2e-skins          # 15 asserts e2e das skins — idem
npm run test-e2e-setup          # 28 asserts e2e do estúdio /?setup — idem (2 ramos: gerador no ar/parado)
npm run test-e2e-stats          # 72 asserts e2e da telemetria em Chromium — idem (7 abas com a chave)
npm run test-investiga          # 31 asserts dos 5 detectores (v1.9.4), sem navegador e SEM rede
npm run investiga               # passa os 5 detectores na produção (só leitura); --salvar grava o retrato datado
npm run radiografia             # análise de usabilidade completa contra a produção (só leitura)
npm run digest                  # monta o resumo diário SEM enviar
npm run sprite-gen              # sobe o SERVIDOR UNIFICADO: jogo na :3000 + gerador na :3210
```

Atalho do dono: **duplo-clique no `iniciar-estudio.bat`** (raiz) — sobe o servidor unificado e abre o `/?setup=0929` no endereço certo.

URLs especiais: `/?debug=1` (painel de tuning + `window.game` para os e2e — **e, desde a v1.9.6, ambiente de TESTE: nada gravado com ele ligado chega ao Firestore**, ver abaixo), `/?stats` (painel público), `/?stats=0929` (painel detalhado), `/?setup=0929` (o estúdio do dono, quatro abas: 🎨 Skins · 🖼️ Sprites · 📊 Radiografia · 🆘 Recuperação — a escrita exige o servidor no ar; radiografia e conferências só leem), `/?ntfy=test|off|on` (testar/silenciar pushes). **Diagnóstico (v1.9.8→11, ver [`03-arquitetura.md`](03-arquitetura.md) §8b):** `/?voo=1` (a caixa-preta — mostra o voo interrompido, o anterior e o último item em execução; neutraliza o resto do documento com `<plaintext>`, então funciona mesmo com a página quebrada), `/?safe=1` (para na home, sem Phaser nem texturas) e `/?canvas=1` (força `Phaser.CANVAS`). Os três são leitura local — nada é enviado.

## 4. Os quatro lugares da versão

**Toda release toca os quatro, e os quatro têm de bater:**

| Arquivo | Campo |
|---|---|
| `js/utils/Constants.js:4` | `VERSION: '1.8.5'` |
| `index.html` | `<span id="game-version">v1.8.5</span>` |
| `package.json` | `"version": "1.8.5"` |
| `sw.js:3` | `const CACHE = 'furious-rhino-v185'` |

## 5. Ritual de release (ordem não negociável)

1. **Publicar `firestore.rules`** no console do Firebase (Firestore → Regras → colar → Publicar) — **antes** do deploy. A ordem inversa faz o Firestore rejeitar os writes novos **em silêncio** (o jogo engole erros de rede por design).
2. Bump da versão nos **4 lugares** (§4). Arquivo `.js` novo? Entra em `ASSETS` do `sw.js`.
3. Rodar a bateria de testes (§3).
4. Commit + push na `main` (o GitHub Pages publica sozinho).
5. Tag + release (`gh release create vX.Y.Z`).
6. Esperar o Pages e fazer smoke em produção (versão na tela, zero erro no console, write aceito).
7. Atualizar `docs/` (rodar `/atualizar-docs`) e a memória do projeto.

## 6. Firestore

Projeto `furious-rhino`. Credenciais em `js/firebase-config.js` são **públicas por design** — a proteção real são as rules.

| Coleção | Leitura | Escrita |
|---|---|---|
| `scores/{playerId}` | pública | só campos `{name, nameLower, score, scoreAt, skin, updatedAt, scoreM}`; name 3–12 chars; **`score` int 1–20000 e só cresce — desde a v1.8.4 é o TOTAL (metros + bônus), não os metros**; `scoreM` (v1.8.4) opcional, int 1–10000, os metros da marca, com `score >= scoreM` e `score <= scoreM * 2` (o teto do bônus vira trava anti-abuso); sem `scoreM` o teto do `score` continua 10000 (é o cliente velho, cujo score AINDA são os metros); `scoreAt` (v1.8) opcional, timestamp `<= request.time` — o "quando a marca foi atingida"; `skin` (v1.8.1) opcional, string 1–24 — a skin usada ao cravar a marca (vitrine do pódio). Ambos regravados com o valor ANTIGO na troca de apelido (cópias locais `furious_rhino_best_sent_at`/`_skin`; sem elas os campos saem e a leitura cai nos fallbacks); delete proibido |
| `stats/{playerId}` | pública (é o que faz o painel funcionar) | 12 campos de topo no máximo; núcleos monotônicos (`attempts/playTimeS/wins/bestM` só crescem); `runs` ≤ 50; `deaths` ≤ 17 chaves (v1.8.5 somou `boss2`/`boss3`; v1.8.10 somou `cerco`/`farao`); `client` ≤ 10; `geo` ≤ 4; delete proibido |
| `config/notify`, `config/news` e `config/reassign` | pública | **proibida** — só o admin (o wildcard `config/{doc}` cobre todos). `config/news` (v1.8.1) = o Diário da Fuga: campo `items`, array de strings — cada string é um card na home, a 1ª sempre aparece; o jogo relê a cada 1h. `config/reassign` (v1.9.0) = as ordens de migração de identidade: campo `pairs`, mapa `{idNovo: idAntigo}` — o jogo só consulta se houver pedido 🆘 pendente no aparelho (cache 1h), e a escrita é da aba 🆘 do estúdio via servidor local (OAuth do login do `firebase-tools` — passa pelo IAM, não pelas rules) |
| `challenges/{id}` (v1.8.6) | pública | **create**: só a forma — 7 campos (`from, participants, names, startAt, endAt, accepted, createdAt`), participants 2–8, janela `endAt − startAt <= 604800` (7 dias), epochs em SEGUNDOS (casam com `runs[].t`), `createdAt == request.time`; **update**: o mapa `accepted` pode mudar (só CRESCER — `hasAll` das chaves antigas, ≤ 8; o aceite regrava o doc relido inteiro) OU, desde a v1.8.8, o campo `cancelledAt` pode ser gravado **uma única vez** (o criador encerrando o desafio antes do prazo); nada mais muda; delete proibido. Sem auth o aceite é falsificável: modelo de confiança assumido do jogo inteiro. O placar NÃO mora aqui — é derivado do `stats/` dos aceitos |

**A restrição que governa tudo:** o orçamento de avaliação das rules estoura com campos soltos — constatado que **19 campos de topo passavam e 20 falhavam**, negando writes legítimos em silêncio. Portanto: **nenhum campo novo de primeiro nível em `stats`**. Campo novo entra nos mapas existentes ou nos elementos de `runs[]` (forma livre).

**Apagar documentos** (`allow delete: if false`): só via Firebase CLI com credencial de admin.
- `node tools/cleanup-stats.mjs` (lista) / `--yes` (apaga; exige `npx firebase-tools login` uma vez). Remove sondas `claude-*`, docs de teste conhecidos e, desde a v1.7.2, **relata** (sem apagar sozinho) qualquer doc com a assinatura de tráfego automatizado: `attempts >= 50`, `playTimeS = 0` e `runs` vazio.
- `node tools/delete-player.mjs <nome-ou-id>` (v1.7.2): apaga **um** jogador específico nas duas coleções (`scores` + `stats`), buscando por apelido (normalizado como o `LeaderboardSystem.nameSlug`) ou por id/prefixo de id. Mesmo padrão dry-run / `--yes`.

**Identidade e apelido (v1.9.0):** a identidade é um UUID por aparelho, só em `localStorage` — desinstalar o PWA a perde (iOS particiona o storage; Android/WebAPK compartilha com o Chrome). A **unicidade de apelido é melhor-esforço no CLIENTE** (`checkName` varre `scores/` excluindo "o meu doc" pelo id) — as rules NÃO a impõem, e é por isso que o doc órfão de quem reinstalou **bloqueia o próprio dono do nome**. A recuperação é mediada: pedido 🆘 no jogo → aba 🆘 do `/?setup` autoriza (par em `config/reassign`) → o `ReassignSystem` adota o id antigo e restaura dos docs públicos. O merge **SOMA** os totais (local + servidor) — copiar violaria a monotonia e congelaria a telemetria em silêncio. Runbook completo: `QA-Registro.md` §🪪.

**Ambiente de TESTE nunca escreve por padrão** (v1.7.2, ampliado na v1.9.6 — ver [`03-arquitetura.md`](03-arquitetura.md) §6): fecha a causa raiz dos vazamentos de teste (antes, um contexto Playwright sem `playerId` de sonda minava um UUID real e escrevia em produção) **e, desde a v1.9.6, a porta do `?debug=1`** — o painel é público, tem teleporte de chefe e modo invencível, e um jogador real de produção pôs três marcas sem luta no ranking mundial por ali. `isLocalEnv()` passou a devolver `true` também para o parâmetro de debug; o opt-in continua o mesmo (`furious_rhino_allow_local_write`, exposto no painel como "📡 Escrita local"). ⚠️ **Efeito prático para quem desenvolve**: testar escrita em produção agora exige ligar esse interruptor.

## 7. Telemetria — formato dos dados

- 1 write **idempotente** por fim de corrida (`setDoc` sem merge, totais acumulados). Também na tela inicial e ao abrir `/?stats`.
- `runs[]` (últimas 50): `{t, m}` + opcionais `s` segundos, `c` causa, `k` teclado, `v` versão, `g` skin usada (v1.8, string ≤8, omitida na default) e 13 contadores de mecânica (`w` paredes, `r` rampas, `o` torres, `a` animais, `j` pulos, `d` investidas, `x` investidas negadas no cooldown, `p` pausas, `f` Fúrias Totais usadas, `n` ativações da fúria **negadas na arena do boss** (v1.8 — mede quem ainda tenta o truque antigo), `b` camadas do portão quebradas, `q` quiques na luta, `z` segundos de luta contra o boss — e, v1.8.5, `e` camadas do boss dos 2000 m (hoje a Muralha, herdeira da série) com `h` os segundos dessa luta, `l` camadas do Guardião; v1.8.10, `u` camadas da Barreira e `y` camadas do Faraó, **sem** letras de segundos — precedente do Guardião; v1.9.2, `i` a sonda do cronômetro `loopS` (segundos do relógio do MOTOR, lado a lado com `s` do relógio de parede — diagnostica loop congelado/acelerado; não pontua); `q` segue **exclusivo do portão**, para não poluir a baseline que calibrou a v1.8). Zero é omitido.
- Causas de morte: `wall/spike/animal/dart/tower/boss/boss2/boss3/cerco/farao/fall` — `boss` (v1.7) é o rifle do portão; `boss2`/`boss3` (v1.8.5) são a Muralha (slot dos 2000 m) e o Caçador-Mor; `cerco`/`farao` (v1.8.10) são a Barreira da Escavação e o Faraó de Bronze. 17 chaves no mapa `deaths` (as rules aceitam até 17 — bump publicado com a v1.8.10).
- `history` (localStorage e espelhado): `{clients, geos, versions}` podados pelo **menos usado**; `days` (60 dias) podado por **idade** — série temporal não pode ganhar buracos.
- Geo por IP no cliente (geojs.io → ipwho.is, timeout 4 s), TTL 12 h ok / 6 h falha; **falha preserva** a última cidade (`stale: true`) — um `setDoc` sem merge com campo ausente **apaga** o valor no servidor (bug real corrigido na v1.6.1).
- A fúria deixou de ser posicional na v1.7 (virou carga gastável): o contador `f` mede a **decisão de usar** o especial, que não está em nenhum outro campo.
- **O bônus da pontuação composta (v1.8.4) NÃO tem letra em `runs[]`** — e isso é decisão, não esquecimento: ele é recomputável de `w r o a b` + `c` + `m` + `z` por `ScoreSystem.runBonus(run)`, e o `v` já versiona a fórmula. Gravá-lo seria byte pago por informação derivada. A v1.8.5 gastou 3 letras (`e h l`), a v1.8.10 outras 2 (`u y`) e a v1.9.2 gastou a última (`i`, a sonda do cronômetro `loopS`). A recomputação cobre todos os chefes: camada de qualquer um vale o mesmo `bossLayer`, e as vitórias pagam `boss2` (`e >= 4`), `cerco` (`u >= 4`) e `farao` (`y >= 5`). `tools/test-score.mjs` tranca a igualdade "recomputado == somado ao vivo" com um assert dedicado — se ela quebrar, o painel passa a mentir.
- **O "alfabeto FECHADO" era mito, e a v1.9.5 o desfez com número na mão.** Até a v1.9.4 este documento afirmava que, esgotado o `i`, métrica nova só poderia ser recomputada. **Não era regra técnica**: as `firestore.rules` validam apenas `runs is list && size() <= 50` — a forma do elemento é livre — e nada no código pressupõe chave de 1 caractere (conferido). O custo real é em **bytes**, e como contador zero é omitido (`if (v > 0)` no `addRun`), medir foi possível: as 7 chaves novas da v1.9.5 custam **~136 bytes na base inteira** de 1.070 corridas. O maior documento de `stats` tem 5,8 KB contra o teto de 1 MB do Firestore.
- **As 7 chaves de 2 caracteres (v1.9.5)** seguem o padrão *prefixo do que é + letra do chefe*, em vez de esgotar criatividade: `zu`/`zy`/`zl` são segundos de luta (Barreira, Faraó, Caçador-Mor) e `qe`/`qu`/`qy`/`ql` são os quiques dos quatro chefes que não são o Portão (`q` segue **exclusivo** do portão — misturar poluiria a baseline de 48 lutas que calibrou a v1.8). Nenhuma pontua: o contrato do `ScoreSystem.runBonus` fica intacto. O dado já era calculado (o `fightMs` roda nos cinco chefes) e morria com a cena.
- **A restrição que continua de pé é OUTRA**: o 1º nível de `stats` está em **12/12** chaves (`hasOnly` fechada nas rules), `geo` em 4/4 e `deaths` em 17/17 — ali, sim, métrica nova exige mexer nas rules antes do deploy (regra 3 do ritual). O espaço livre hoje é 1 em `client` e 1 em `history`.
- Tudo passa por `safeTelemetry` no `GameScene` — erro nunca derruba o jogo.

Chaves completas de `localStorage`/`sessionStorage`: ver `js/utils/StorageManager.js` (todas prefixadas `furious_rhino_`).

## 8. Tuning de gameplay

Tudo em `js/utils/Constants.js` (deploy sempre necessário). Principais:

| Constante | Valor | Significado |
|---|---|---|
| `PIXELS_PER_METER` | 40 | 1 m = 40 px (1 ponto = 1 m) |
| `WIN_DISTANCE_PX` | 40000 | portão = 1000 m |
| `WORLD_END_PX` | 400000 | fim do mundo = 10.000 m ("LENDA"; limite de precisão do float32) |
| `FURY_FULL_DISTANCE_PX` | 36000 | fúria enche aos 900 m |
| `RUN_SPEED` | 300 | px/s base; ×(1 + fúria×0,5) → 450 no máximo |
| `JUMP_MIN_V / JUMP_MAX_V` | −540 / −880 | pulo por toque / segurando 2 s |
| `DASH_SPEED / DASH_ACTIVE_MS / DASH_COOLDOWN_MS` | 750 / 200 / 1000 | investida (ciclo de 1,2 s) |
| `DIFFICULTY_TIERS` | 6 tiers | pesos de spawn, vão mínimo, densidade de animais (par/escolta), cadência da torre — 1 tier = 200 m |
| `MIN_SAFE_GAP` | 540 | piso absoluto de vão = ciclo do dash × velocidade máxima |
| `ANIMAL_PACK_OFFSET_PX` | 300 | distância do 2º animal do par (v1.8) |
| `ANIMAL_KB_VX/VY_MIN/MAX` | 350..650 / −800..−500 | voo do animal atropelado: diagonal superior direita (v1.8) |
| `OPENING_SCRIPT` | 3 passos | abertura guiada (rampa 90 m → espinho 125 m → parede 160 m) — **só para estreante desde a v1.8.4** |
| `VETERAN_MIN_ATTEMPTS` | 3 | v1.8.4: a partir daqui o jogador pula a abertura-lição (mesma régua do `OPENING_HINT_MAX_ATTEMPTS`, então dica e roteiro somem juntos) |
| `VETERAN_OPENING_START_X` | 2400 | v1.8.4: onde a roleta começa para o veterano (60 m — cedo, mas não os 34 m pré-v1.6 que matavam 83 de 512 corridas) |
| `SCORE_WEIGHTS` | 8 pesos | v1.8.4: pontos por façanha — `wall` 5, `ramp` 5, `tower` 15, `animal` 3, `bossLayer` 25, `escape` 100, `blitz` 50, `legend` 400 |
| `SCORE_BLITZ_MAX_S / SCORE_BONUS_CAP / SCORE_MAX_TOTAL` | 20 / 1 / 20000 | v1.8.4: janela do blitz, teto do bônus (× metros) e teto do total (igual ao das rules) |
| `SPECIAL_DURATION_MS / SPEED_MULT / WARN_MS` | 6000 / 1,25 / 1500 | FÚRIA TOTAL: duração, boost e aviso de fim |
| `BOSS_ARENA_PX` | 1100 | a luta começa em WIN−1100 (~972 m); câmera trava |
| `BOSS_BLOCKS_FURY` | true | v1.8: dentro da arena a ATIVAÇÃO da fúria é negada (a carga segue enchendo); ligável/desligável no TuningPanel |
| `BOSS_KNOCKBACK_VX / VY / MS` | 3000 / −360 / 650 | quique: impulso (decai ~0,92/frame → ~600 px de recuo) e janela sem reescrita de velocidade |
| `BOSS_LAYER_COOLDOWN_MS` | 450 | 1 contato processado por vez (o rampage não zera as 3 camadas em 3 frames) |
| `BOSS_SHOT_SPEED / BOSS_RIFLE` | 800 / 3 padrões | rifle do caçador: velocidade e cadência/telegraph/rajada por camadas restantes (1500/1200/950 ms) |
| `BIOME_ANIMALS` | 6 elencos | quais espécies nascem em cada bioma (fora da cidade) |
| `CITY_DISTRICTS` | 5 áreas | v1.8.7: os distritos da cidade — `from/key/wallSkin/cast/weights/breach`; elenco e pesos POR ÁREA via `cityAreaFor(x)`; skin de parede via `skinFor(x,'wall')` |
| `BOSS_MURALHA / MURALHA_ENRAGE_MS` | 4 degraus / 45000 | v1.8.7: arsenal do boss dos 2000 m (flag nova `holo` = granada-de-luz com telegraph de holofote; `rasanteStyle:'k9'` na def) |
| `CERCO_NET / CERCO_LAYERS / CERCO_ANCHOR_PX` | 4 degraus / 146000 | v1.8.10: o Cerco VIVE — Barreira da Escavação (3650 m), paleta `escavacao`, letra `u`, causa `cerco` |
| `BOSS_FARAO / FARAO_LAYERS / FARAO_ANCHOR_PX / FARAO_ENRAGE_MS` | 5 degraus / 5 camadas / 188000 / 30000 | v1.8.10: o Faraó de Bronze — a tabela mais agressiva (700 ms no fim), `holo` (Espelho de Rá), `rasanteStyle:'falcao'`, letra `y`, causa `farao` |
| `CITY_DISTRICTS` (deserto) | +6 áreas | v1.8.10: duna/oasis/escavacao/vale/necropole + deserto infinito — campos novos `propSkin/ground/fg/cars/skyLife` por área |
| `CAUSE_LABELS` | 8 rótulos | fonte única dos nomes de desfecho (painel, resumo, pushes) |

Calibrar com dados, não no escuro: aba **Dificuldade** do painel (heatmap causa × distância). O `TuningPanel` (`?debug=1`) permite testar valores ao vivo e exportar um `.txt` com só o que mudou, no formato do `Constants.js`.

**Pesos da pontuação (v1.8.4)**: pasta **🏆 Pontuação** do `?debug=1`, um slider por peso. Como o peso é lido **no momento do evento**, mover o slider vale na mesma corrida — o próximo "+N" já sai com o valor novo. O exportador passou a incluir `SCORE_WEIGHTS` **e** `BOSS_RIFLE` (este tinha slider desde a v1.7 e nunca saía no `.txt` — a calibração se perdia ao recarregar). Régua para saber se um peso está sadio: na simulação sobre as 895 corridas reais o bônus ficou em **p95 ≈ 13,7% do total** e o Spearman metros × total em **0,993**; se o bônus passar de ~25% do total, a distância deixou de mandar no ranking.

### 8b. Como calibrar a densidade de inimigos (guia do dono)

Todos os controles ficam em `?debug=1` → **Tuning → Tiers → Tier N** (cada tier = um trecho de 200 m; o efeito é imediato, na própria corrida). O que cada um faz, em ordem de impacto:

| Slider | Efeito | Padrão (t1→t6) |
|---|---|---|
| **🐾 escolta (junto de obstáculo)** | Chance de parede/espinho/torre nascer com um animal logo atrás (terrestre atrás da parede, voador sobre o espinho). **O controle mais forte** — soma animal sem tirar obstáculo | 0.60 → 0.80 |
| **🐾 par de animais** | Chance de o animal sorteado vir em dupla (o 2º nasce 300 px à frente) | 0.50 → 0.75 |
| `wallW` / `spikeW` / `towerW` / `rampW` | Pesos da roleta de spawn. A fatia do animal é **a sobra** (`1 − soma`) — baixar qualquer peso dá mais animal, mas **facilita o jogo** (animal morre pro dash; parede mata) | ver `DIFFICULTY_TIERS` |
| `gapMin` / `gapRand` | Vão entre spawns — baixar deixa TUDO mais denso. Piso efetivo: 540 px (`MIN_SAFE_GAP` = ciclo do dash; abaixo disso o valor é ignorado) | 850→540 / 150→80 |
| `comboChance` | Frequência dos combos (parede+animal, espinho+pássaro — também somam animal) | 0 → 0.50 |
| `animalLeadPx` | Folga extra antes do animal (ele anda contra o fluxo) — baixar aproxima os encontros | 350 → 560 |

Referências de densidade (Monte Carlo com a roleta real): **v1.7 = 1,5 animais/100 m · padrão atual = 3,2 · teto do sistema ≈ 4,0** (tudo a 100%). Passar do teto exige mexer nos pesos (troca letalidade por bicho) — decisão de design, não de slider.

Coisas que **não** são slider:
- `POOL_SIZES.animals` (16): máximo de animais vivos ao mesmo tempo — lido só no boot; subir densidade muito além do padrão pede aumentá-lo no `Constants.js` (senão spawns somem em silêncio quando o pool enche).
- Os **primeiros 190 m são a abertura roteirizada** (rampa → espinho → parede, zero animais, de propósito) — **mas só para quem tem menos de 3 tentativas** (v1.8.4). Nenhuma calibração muda isso; o slider não alcança o roteiro.
  ⚠️ **Pegadinha de medição:** desde a v1.8.4 a densidade dos primeiros 200 m **depende de quem está jogando**. Estreante = trecho vazio por design; veterano = roleta cheia desde os 60 m (`VETERAN_OPENING_START_X`). Medir densidade sem separar os dois grupos compara laranja com maçã — e os números históricos de densidade (1,5 → 3,2 animais/100 m) foram levantados quando a abertura era universal.
- A **arena do boss** (WIN−1300 a WIN+1000) é zona livre — par e escolta respeitam.

Fluxo de trabalho: ajustar os sliders em campo → jogar → gostou? botão **exportar** do painel (gera `furious-rhino-tuning.txt` só com o que mudou, no formato do `Constants.js`) → colar os valores no `Constants.js` (ou mandar o arquivo para o assistente aplicar) → rodar `npm run test-ramp` + `test-boss` → release normal.

## 9. Service worker (`sw.js`)

- Estratégia **network-first** com `cache: 'no-cache'` (força revalidação HTTP — sem isso o cache do navegador misturava versões de JS).
- `ASSETS`: ~150 entradas explícitas (as barricadas dos chefes são procedurais e não têm arquivo). **Todo `.js` novo entra na lista E o `CACHE` sobe de versão** (`furious-rhino-v190`) — esquecer = `addAll` falha inteiro no install e o PWA instalado toma 404 (aconteceu com o `SetupSprites.js`, esquecido da v1.8.9 à v1.9.0).
- **Fonte do título** (v1.8.1): `fonts.googleapis.com` (o CSS) já cai no bypass `endsWith('googleapis.com')` — offline o título usa Impact (`font-display: swap`); o `.woff2` de `fonts.gstatic.com` entra no cache de runtime como o SDK do Firebase.
- Entre os marcadores `// @setup:skins —` e `// @setup:skins:fim` fica o **bloco gerenciado pelo estúdio /?setup**: os SVGs de skins criadas pelo dono são reescritos ali pelo servidor do gerador (`patchSwAssets`). As 7 skins originais ficam FORA do bloco, listadas à mão. **Não editar o miolo nem duplicar os marcadores** — o `test-skins` valida.
- Bypass (vai direto à rede, sem cache): não-GET e os hosts `*.googleapis.com`, `get.geojs.io`, `ipwho.is`, `ntfy.sh`. **Serviço externo novo precisa entrar nessa lista.**

## 10. Notificações — operação

Parâmetros completos e receitas: `HANDOFF.md` §4A/§4B. Resumo de operação:

- Camadas: `?ntfy=off` (aparelho) > doc `config/notify` (Firestore, cache de 1 h por navegador) > `js/notify-config.js` (versionado). Tópico atual: `furiousrhino-f8497207e3be` em `ntfy.sh`.
- Eventos (chaves do notify-config, todas desligáveis pelo doc): `onStart`, `onSessionEnd`, `onWorldRecord` e, v1.9.0, `onClaim` (pedido 🆘 de recuperação de apelido — traz o id novo + assinatura do aparelho) e `onReassignDone` (a migração completou — o sinal para concluir na aba 🆘).
- No doc do Firestore, **o tipo do campo importa** (`boolean`/`number`/`array`) — um `"true"` string é ignorado em silêncio.
- Resumo diário: `.github/workflows/daily-digest.yml`, cron `0 23 * * *`, secret `NTFY_TOPIC`. Testável pelo botão *Run workflow*. ⚠️ O GitHub desativa crons após 60 dias sem commits (avisa por e-mail).

## 11. Testes — o que cada um prova

| Suíte | Prova |
|---|---|
| `test-stats` (Node puro) | Agregação, contadores (inclusive `f/b/q/z` e a causa `boss`), consistência das camadas **contra as rules** (um teste falha se alguém criar campo de topo em `stats`; outros se `scoreAt`/`skin` sumirem da whitelist de `scores`), `LeaderboardSystem.holdDays` nas DUAS semânticas (por marca = lista; cascata = pódio), `buildDigest` |
| `test-score` (Node puro, v1.8.4) | A fórmula da pontuação composta: peso de cada evento, evento desconhecido valendo 0, blitz na BORDA dos 20 s, LENDA, o teto `bônus <= metros` agindo, o clamp em `SCORE_MAX_TOTAL`, `metersOf` nas três formas (`scoreM`/`m`/`score` cru) e os formatadores. O assert-chave é o **contrato de recomputação**: a soma feita ao vivo durante a corrida tem de bater exatamente com `runBonus(run)` |
| `e2e-deserto` (Chromium, v1.8.10) | As Areias do Tempo: as 5 áreas com famílias `-ruina`/`-piramide`/`-egito`, a Barreira (MID→GROUND→HIGH→MID, +150, letra `u`, silenciamento na intro) e o Faraó (5 camadas MID→HIGH→GROUND→MID→HIGH, +250, letra `y`, enrage 30 s, rasante `falcao`), causas/títulos próprios |
| `e2e-boss2` (Chromium, v1.8.7) | A MURALHA no slot dos 2000 m: 4 camadas abrindo NO ALTO (HIGH→GROUND→MID→HIGH), startFight SILENCIANDO torre viva na arena (`muzzleHostiles`), vitória sem encerrar a corrida (+250 ao vivo), causa `boss2` herdada com título próprio, enrage de 45 s |
| `test-challenge` (Node puro, v1.8.6) | A Arena de Desafios: `bestInWindow` (bordas EXATAS da janela, escolha por PONTOS e não metros, empate = mais antiga), countdown, `statusOf`/`leaderOf`, convites não vistos, guardas puras de criação e os asserts de texto das rules de `challenges`. **v1.9.6**: corrida que passou por um chefe sem derrubá-lo não vence desafio — o laço lê os DOIS lados (o `localStorage` do próprio jogador e o doc do servidor dos adversários) |
| `test-skins` (Node puro, v1.8) | É o **portão do /?setup** (roda a cada gravação da página, com rollback se reprovar). Lógica de acesso testada com **skins sintéticas** — rank exato, condições declarativas (`conditionMet`), totais, `hidden`, retro-scan, `requirementText`, `resolveEquipped` sem regravar — e o registry REAL só passa por checagens estruturais: ids/prefixos no padrão, JSON estrito, SVGs em `art/`, `ASSETS` e marcadores do `sw.js`. **Regra: nenhum assert pode "pinar" valores do registry** (o dono edita skins à vontade) |
| `test-integrate` (Node puro, v1.8) | A integração do estúdio como funções puras: round-trip byte-idêntico do `SkinRegistry.js`, upsert/remove (só o `default` intocável; originais também removem, com `stripSwArtLines` limpando as linhas manuscritas do `sw.js`), flag `hidden`, validação de entradas/condições, e o patch idempotente do bloco `@setup:skins` no `sw.js` (CACHE jamais tocado) |
| `e2e-ramp` (Chromium) | Trajetória frame a frame da travessia da rampa (o assert "nunca trava" protege contra regressão do soft-lock), trampolim, destruição, abertura guiada, portão/cidade, teclado, pausa (inclusive **desistir da corrida** sem contabilizar), par/escolta de animais, knockback para a direita, e (v1.8.1) a **home nova**: pódio do cache com cascata e fallback de skin, Diário com evento local, box Campanha, e o **contrato do toque em (640,650)** iniciando a corrida — zero erro de JS |
| `e2e-boss` (Chromium) | A luta do portão: quique sem morte e **retomada sozinha** (o assert que mataria a rota de corpo sólido), investida liberada na janela pós-quique, 3 quebras na ordem chão→meio→alto, vitória dispara o `crossGate`, morte pelo rifle com causa `boss` — e (v1.8) a fúria negada na arena com carga preservada, cadeado no medidor, rampage prévio que sobrevive mas **não quebra desalinhado**, e liberação pós-derrota |
| `test-sprites` (Node puro, v1.8.9) | O **portão da aba Sprites** (roda a cada gravação, com rollback): contrato do `SpriteParams.js` (miolo JSON estrito, ZERO imports — ciclo com o Constants mataria o boot), merge são (TYPES ≡ SPECS ≡ BEHAVIOR), whitelists dos overrides, paridade `art/` ↔ manifesto ↔ `sw.js` (inclusive o inverso: todo SVG do disco no ASSETS), **`w/h` do manifesto == `viewBox` de cada SVG** (contrato que não existia para ninguém), espécies criadas completas (arquivos + derivações `anim`/`airTexture`), marcadores `@setup:sprites` 1×, e os **invariantes de spawn** que os e2e congelam: todo elenco com ≥1 terrestre, floresta sem voador (o fallback `bird`), jaulas sem `pair`, Brecha só-pombo, bandas `fly/zig` dentro de [300,600] |
| `test-radiografia` (Node puro, v1.8.7) | A radiografia: fixture sintética cobrindo as 3 eras e TODAS as letras (incl. `e/h/l/g/v/p`), totais idênticos ao `buildDigest` (a conferência do banco de ideias virou assert), funil/curva calculados à mão, `flattenRuns ⊇ RUN_COUNTERS` (letra nova sem leitor = vermelho), recomputo de bônus == `ScoreSystem.runBonus`, **determinismo byte a byte** do markdown, e a higiene dos fetchers por text-assert (filtro `^claude-`, zero writes) |
| `e2e-boss3` (Chromium, v1.8.5) | O Guardião do Fim: arena dentro da zona da LENDA (zero spawn de graça), palíndromo **ground→mid→high→mid→ground**, fúria negada, **a 5ª camada dispara a LENDA** (`legend`/`won`/overlay com a linha do chefe no breakdown), morte com causa `boss3` |
| `e2e-special` (Chromium) | Sorteio de espécies por bioma, o ciclo completo da FÚRIA TOTAL (carga por distância, ativação sem virar dash, destruição do espinho, drenagem e reversão) e (v1.8) o desabamento do topo da parede: crop, tombo, autodestruição e pool limpo na reciclagem |
| `e2e-skins` (Chromium, v1.8) | Comportamento no navegador contra um **registry canônico injetado por interceptação de rede** (`context.route` + `serviceWorkers: 'block'` — o registry real do dono não pode derrubar a suíte): preview e sprite vestem a skin; destronado vira default **sem regravar a escolha**; hub sem iniciar corrida; persistência após reload; fúria com `firePrefix` próprio (o canônico usa arte do NÚCLEO — `rhino-run`/`rhino-fire-run` — porque qualquer skin real pode ser removida com a arte pelo /?setup); e a guarda da escala visual — **hitbox segue 76×54 com os pés no chão** para qualquer `RHINO_VISUAL_SCALE` |
| `e2e-setup` (Chromium) | O estúdio /?setup: sem chave/chave errada → restrito; chave certa → monta sem Phaser; as **quatro abas** (Skins montada no load com os 4 ids congelados; Sprites, Radiografia e 🆘 Recuperação preguiçosas — o catálogo monta ≥38 espécies dos módulos ES, o órfão é sinalizado, a aba 🆘 nasce com o Autorizar travado, e **nenhuma requisição espontânea** sai antes de um clique do dono: zero Firestore, zero POST à API local); card Servidores (linha do jogo verde, botão ⏻ presente — o e2e **nunca o clica**); preview do requisito ao vivo; nome de skin original barrado na digitação; lista com só o default travado (v3); dois ramos (gerador no ar/parado) |
| `test-reassign` (Node puro, v1.9.0) | A recuperação de identidade: o `mergeIdentity` puro (a INVARIANTE da monotonia — todo total restaurado ≥ servidor; deaths somados chave a chave; runs em ordem cronológica na janela de 50; history fundido com os tetos; `best_sent*` completos — sem eles o `rename`/`submit` falham em silêncio; medalhas = união + inferência honesta da janela), os 3 formatos do `scoreAt` (Timestamp/ISO/ms), e as guardas do fluxo: cooldown de 24 h só para pedido ENVIADO, gate do claim (sem pedido → zero consulta), par obsoleto/autopar ignorados, aviso de restauração 1× — tudo com o ntfy silenciado (zero push em teste) |
| `test-crash` (Node puro, v1.9.1; contrato revisto na v1.9.5, faxina na v1.9.6, SW na v1.9.7) | A rede de proteção: a guarda de plausibilidade contra os dados REAIS de produção, a costura que faz o tempo chegar até a guarda, a ordem do `endGame`, o `try/catch` do `update` com o early-return FORA dele, e o contrato do `crashToHome` — que **mudou de sentido na v1.9.5**: sessão quebrada agora **grava a corrida** com causa `crash`, e continua sem recorde, sem pódio, sem telemetria. **v1.9.6**: a faxina do aparelho (remove, preserva a legítima, **destrava o `bestSent`**, roda uma vez só) e os text-asserts que travam a viagem da prova do chefe até o submit **v1.9.7**: 8 text-asserts do CASO 2 travam o sw.js — corrente de socorro (ignoreSearch → shell → página de socorro), instalação tolerante com núcleo obrigatório, SWR da arte, network-first estrito de JS/HTML e o `storage.persist()` do boot |
| `test-caixapreta` (Node puro, v1.9.11) | A instrumentação que resolveu o CASO 2, travada por text-assert: os 20 marcos do voo (`v0-head`→`v15-update1`) nos três arquivos, o conta-giros (preload, os 34 geradores, os 10 blocos do `create` e os 3 sub-marcos do chão), o `<plaintext>` do viewer, o arquivamento do voo anterior, os modos `safe`/`canvas`, e o contrato de segurança do gravador (stubs inertes + todo storage em `try/catch` — ele roda antes de tudo e uma exceção levaria o jogo junto). **Por que existe**: um marco que some não quebra o jogo, quebra a próxima investigação — e só se descobre quando ela for necessária |
| `e2e-crash` (Chromium, v1.9.1) | Injeta uma exceção **real** no `update` (não chama o `crashToHome` na mão) e exige: o jogador VÊ o overlay com saída clicável, a tentativa volta de 41 para 40, a corrida **aparece** em `runs[]` com a causa `crash` (v1.9.5) e recorde e pódio seguem intactos. E 50 crashes seguidos devolvem UMA tentativa só (idempotência) |
| `test-fix-ranking` (Node puro, v1.9.2, ampliado na v1.9.5) | A classificação que decide QUEM perde a marca e QUEM tem a dele restaurada — com as corridas **verbatim** de produção como fixture. Duas causas independentes: o **cronômetro** (mentiu no tempo, distância real) e a **cascata dos chefes** (distância real, sem a luta). Prova que quem tem marca anterior é restaurado e não apagado, que a restauração **só desce**, que sem corrida suja ninguém é tocado (a janela de 50 rotaciona: recorde antigo some sem nada de errado ter acontecido) e que histórico rotacionado vai para revisão à mão em vez do lixo. **Duas fixtures guardam erros já cometidos**: a primeira versão inventou os contadores e dava 11.182 em vez dos 12.977 reais; a segunda chamava de `vitoriaHonesta` a corrida que a v1.9.4 provou ser a cascata |
| `test-bossproof` (Node puro, v1.9.6) | A PROVA DO CHEFE, com as corridas do caso real como fixture: as três que passaram do portão em v1.9.5 com zero camadas são reprovadas, e as do MESMO jogador em que ele lutou e morreu aos 990 m (`b=2`) são aprovadas — é o assert que garante que a régua não pune quem perdeu. Mais os limites: o `desde` de cada chefe (v1.7.0 sem `b` é absolvida, porque a letra ainda não era gravada), a margem de 50 m para quem morre na âncora, o Caçador-Mor em 9.995 m (passar por ele é CHEGAR aos 10.000), chefe fora do elenco e chefe sem contador — nenhum dos dois acusa ninguém |
| `test-investiga` (Node puro, v1.9.4) | Os 5 detectores da linha de investigação perene, sem rede: `D1-velocidade` (acima do teto físico de 35,16 m/s), `D2-sem-interacao`, `D3-vitoria-sem-chefe` (venceu sem quebrar uma das 21 camadas), `D4-relogios` (o `i` do loop contra o `s` de parede) e `D5-arena-sem-quebra`. Cada detector tem fixture de acerto E de falso-positivo — o `D5` nasceu acusando quem entra na arena e morre ali, que é jogo normal |
| `e2e-home` (Chromium, v1.9.3) | A home desacoplada: pódio 2·1·3, degrau VOCÊ, gap e campanha pintados **com o motor ainda carregando** (a suite segura os SVGs por 2,5 s de propósito), e o toque antecipado — toca, vé "preparando a fuga...", e a corrida começa SOZINHA contando UMA tentativa |
| `perf-home` (Chromium, v1.9.3) | **Regressão de performance.** Mede com 4G + CPU 4x e falha se a home voltar a esperar o motor. O critério é RELATIVO — a distância entre "página pronta" e "pódio na tela" — porque o número absoluto oscila com a rede (2.095 a 4.899 ms na mesma tarde) enquanto a espera fica estável (505/511/515 ms em três rodadas) |
| `e2e-stats` (Chromium) | Telemetria real no Firestore (sonda `claude-rules-check-01`), portão continuar/sair, LENDA, painel + chave, resiliência (telemetria quebrada não trava o jogo), e o assert final que compara a coleção antes/depois — **a suíte não suja a produção**. ⚠️ Os teleportes para além do portão usam `invincible = true` (senão o clamp do boss segura o rinoceronte na arena) |

Regras de higiene dos testes (v1.7.2): rodando em `localhost`, o jogo **não escreve no Firestore por padrão** (`StorageManager.allowsRemoteWrite()`) — isso já protege qualquer suíte, mesmo uma que esqueça de semear algo. `e2e-stats` é a única que precisa validar a escrita real contra as rules, então semeia o opt-in (`furious_rhino_allow_local_write = '1'`) junto com o `player_id` de sonda `claude-*`; as outras três não semeiam o opt-in e por isso nunca gravam, ainda que também usem ids `claude-*` por convenção. Todo contexto nasce também com `furious_rhino_notify_off = '1'` (senão cada rodada dispararia pushes).

## 12. Arte — pipeline e regras

- Fonte da verdade: `art/*.svg` (editável em Inkscape/Boxy SVG). `js/art/ArtManifest.js` é mantido **à mão** desde a v1.7 (nasceu gerado por `export-art`, mas as entradas novas entram manualmente). **Exceção: os frames de skin NÃO estão no manifesto** — o `BootScene` os deriva do `SkinRegistry` (rig fixo 96×64), para o /?setup não ter que editar o manifesto.
- ⚠️ **Nunca rodar `export-art -- --force`**: sobrescreveria a arte retocada à mão com o gerador aposentado (`SvgSprites.js`, mantido só como histórico).
- `BootScene` rasteriza a 2× (`ART_RASTER_SCALE`) e exibe a `RHINO_VISUAL_SCALE`/2 no rino (1.30 — só aparência; o body é compensado em `Rhino.applyVisualScale` e segue 76×54 px de mundo) e 1/2 no resto. Slider "📏 escala visual" no painel `?debug=1` calibra ao vivo.
- Regra dos frames: entre frames de animação **só os membros mudam** — origem e hitbox nunca deslocam. Nos sprites da v1.7 as hitboxes são **assimétricas** (rede, bico, cauda fora da colisão) e o `offX` do `ANIMAL_SPECS` já vem **espelhado** — o Arcade não espelha o offset do corpo junto com o `setFlipX`.
- Ícones do PWA: `npm run make-icons` regenera os 4 PNGs a partir de `icon.svg`.
- `art2/` = o ateliê do fluxo "arte primeiro": propostas + `preview-biomes.html` (cards animados, comparação com o elenco em jogo, faixa em escala real). O que o dono aprova é copiado para `art/` e entra no manifesto/sw.js; a pasta fica como registro. O portão blindado do boss é procedural (`TextureFactory.generateGateArmored`, 3 estados) — precisa casar com o `zoo-gate`/`zoo-gate-broken` que substitui.
- **Skins do rinoceronte (v1.8)**: mesmo rig obrigatório — viewBox 96×64, pés na base, narina em (89,38), 3 frames de corrida (ciclo 0-1-2-1); a hitbox vive no construtor do `Rhino` e não muda com a textura. Cores claras/médias no corpo da forma normal (o tint de fúria multiplica branco→vermelho — skin escura fica ilegível). Origens: recolors geradas por `art2/skins/make-skins.mjs` (pódio com medalhão numerado e a "Thanks for playing"); folhas raster (do amigo do dono ou de IA) vetorizadas pelo **gerador de sprites**.
- **Estúdio de skins** (`/?setup=0929`, com o servidor `npm run sprite-gen` no ar — ou duplo-clique em **`iniciar-estudio.bat`** na raiz, que desde a v1.8.8 sobe o servidor UNIFICADO — jogo na `:3000` + gerador na `:3210` — e abre o estúdio direto): o fluxo completo do dono, sem editar código — folha (JPG/PNG/SVG) → fatiamento automático ou grade fixa → 3 frames na ordem do galope → paleta k-means (editável, 1 contorno) → gerar (encaixe em 95×63 do canvas; aba 🔥 opcional para fúria própria) → preview animado + onion-skin → formulário de desbloqueio (grátis / pódio 1-3 / conquista numa corrida / totais de vida, com preview do texto do cadeado) → **Aplicar** copia os SVGs para `art/`, reescreve `SkinRegistry.js` e o bloco do `sw.js`, roda `test-skins` e **reverte tudo se reprovar**. A lista de skins existentes permite editar, alternar a flag "no jogo/fora do jogo" e remover (só as criadas). O servidor assume a porta de instâncias antigas ao subir e manda o header de Private Network Access (Chrome exige para a página em produção falar com localhost). Se a `:3000` já estiver ocupada (python), ele avisa e segue só na `:3210` — os dois modos convivem. A página antiga do gerador foi aposentada na v1.8.8 (histórico no git); o card "Servidores locais" do `/?setup` mostra jogo + gerador e tem o botão ⏻ Parar. Receita da folha no card de upload: fundo branco puro, células separadas, **nada atravessando os vãos**, cel-shading chapado, corpos idênticos entre poses, ≥2000 px de largura. **Publicação continua manual**: nada do estúdio faz git/bump — a skin vai ao ar na release seguinte.
- **Aba 🖼️ Sprites** (v1.8.9): a gestão dos sprites do jogo. **Calibração** vive em `js/art/SpriteParams.js` (JSON estrito, machine-owned; `overrides` por espécie com merge raso — `null` apaga, sub-objetos `fly/zig/shoot` substituem inteiro; `w/h/tex/anim/pair` proibidos em override) mesclado pelo `Constants` no load — **reescrever o `Constants.js` pelo servidor é proibido** (os comentários são a memória de design; `SPRITE_BASE` guarda o pré-merge para a UI mostrar o diff). **Espécie nova** = entrada em `novas` (specs completos + behavior + `anim {sufixo,fps}` + `casts`) + SVGs em `art/` + bloco `@setup:sprites` no `sw.js` — o `BootScene` a carrega via `Constants.SPRITE_NEW`, fora do manifesto. **Gerador de inimigo**: 1-2 frames, alvo livre (16..160×16..120), `masterIdx 0`, hitbox sugerida medida do bbox (o `offX` sai já espelhado: `offX = w − offX_arte − bodyW`); o resultado fica em `gerador-de-sprites/output/enemies/<id>/` + `index.json` até a atribuição. Toda gravação = `writeAndValidateFiles` (snapshot de bytes → escreve → `test-sprites` + `test-skins` em processos novos → rollback total no vermelho). Restrições de design: `pair` proibido em espécie criada, voador proibido na floresta, Brecha/rodovia protegidas — as mesmas que os e2e congelam.

## 13. Armadilhas conhecidas (leia antes de mexer)

| Armadilha | Regra |
|---|---|
| Orçamento das rules | Nunca campo de topo novo em `stats` (19 passavam, 20 falhavam — negação silenciosa) |
| Teste sujando produção | Desde a v1.7.2, ambiente local não escreve por padrão (§6/§11) — só com opt-in explícito. Ainda assim, todo contexto Playwright com `player_id` `claude-*` e `notify_off = '1'` |
| `setDoc` sem merge é destrutivo | Campo opcional ausente **apaga** o valor no servidor |
| Arcade Physics não tem rampa | Rampa é terreno (`surfaceY(x)` + `updateTerrain()`), nunca corpo estático |
| Corpo sólido + reescrita de velocidade = soft-lock | O portão do boss NÃO tem corpo: banda de x + clamp posicional + janela de knockback em que o `FurySystem` não reescreve `velocityX` (mesma família da armadilha das rampas) |
| Exceção no `update` mata o loop | Uma falha qualquer dentro do `update` **congela o jogo para sempre** (o rAF não é reagendado) — e a metragem congela junto. Desde a v1.9.1 o corpo do `update` vive num `try/catch` que chama `crashToHome`; o early-return fica FORA do try (é o caminho mais quente). Rede global de `error`/`unhandledrejection` no `js/game.js` |
| Rede global x erro de rede | O `unhandledrejection` **não pode** derrubar a sessão por Firestore offline (viola a regra 1 da casa). Dois portões em série: só age com a corrida em andamento E só para erros de PROGRAMAÇÃO que não casem com assinatura de rede |
| Cache sem dono que o invalide | **A armadilha que causou três bugs seguidos (v1.9.1—v1.9.3).** Todo cache precisa ser invalidado NO EVENTO que muda o dado dele. Os três bugs de "a tela não atualiza" foram o mesmo erro em lugares diferentes: dado novo gravado, tela nunca repintada |
| `js/home/HomeScreen.js` não pode tocar em Phaser | Ele é pintado ANTES de o motor existir. Um `this.add`/`this.time`/`this.rhino` ali quebra o boot inteiro. Se algo precisa da cena, pertence ao `GameScene` |
| Contar frames em `runs[]` satura | `addRun` limita todo contador a **9999**. 15 min a 60 fps são ~54.000 frames — contar frames destruiria o sinal. Por isso a letra `i` grava SEGUNDOS do loop (teto de 7200 cabe) |
| Sonda apontada para produção grava de verdade | O `allowsRemoteWrite` cobre **só localhost**. Um Playwright apontado para `cs-ave.github.io` escreve no Firestore real — em 23/08 isso sujou 10 documentos. Sonda contra produção SEMPRE com prefixo `claude-` |
| Rules impedem DIMINUIR uma marca | `scores` exige `score >= resource.data.score` no update, e `stats` idem para `attempts`/`playTimeS`/`wins`/`bestM`. Para corrigir dado para MENOS: **apagar (admin) e recriar** — o `allow create` não tem a cláusula. É o que o `tools/fix-ranking.mjs` faz |
| O clamp do boss vale para QUALQUER x além da face | Teleporte de debug/teste para depois do portão exige `invincible = true`, senão o rinoceronte é devolvido para a arena |
| `fillGradientStyle` no SwiftShader | Não renderiza em screenshot headless — usar `fillVerticalGradient` (faixas) |
| `fillRect` com largura negativa | Corrompe o batch WebGL e apaga o resto da textura em silêncio |
| Tiles de 640 px | Formas na borda precisam de cópia ±640 para emendar |
| `preserveAspectRatio: 'none'` em SVG | Deforma (donut vira elipse) — usar `xMidYMid meet` + `maxWidth` |
| Altura no cenário de fundo | Props desenhados abaixo de `FAR_BASE = 336` somem atrás da camada `bg-near` |
| Tint atmosférico | **Jamais** em elemento de gameplay (regra permanente de legibilidade) |
| Skin × tint da fúria | O tint multiplicativo (branco→vermelho) é reaplicado todo frame pelo `FurySystem` — skin não pode depender de tint próprio, e cores escuras somem no flush |
| Folha de IA com corpos diferentes | O corpo-mestre do gerador pressupõe corpos idênticos entre os frames; corpos divergentes (IoU < 0,80) produzem cortes — o gerador detecta e cai para frames inteiros com aviso |
| Download "watermarked" do Gemini | Vem em ~1024 px (3× menos que o original) e mata a qualidade do traço; SVG "auto-trace" de conversor é o raster pequeno disfarçado — **baixar sempre o original em alta resolução** |
| Suítes-portão × registry do dono | `test-skins` e `e2e-skins` rodam a cada gravação do /?setup — **nenhum assert pode fixar valores das skins reais** (o dono edita/esconde/cria à vontade). Lógica = skins sintéticas; comportamento = registry canônico injetado por rota; registry real = só estrutura |
| Escala do sprite × body do Arcade | `setScale` multiplica tamanho **e offset** do body — ampliar o rino sem compensar muda toda a colisão, e dividir o offset ingenuamente por k enterra os pés `64(k−1)` px no chão. A fórmula correta vive em `Rhino.applyVisualScale`; o e2e-skins tranca o body em 76×54 |
| `curl -d` no Git Bash × UTF-8 | O shell mutila emoji/acentos no corpo JSON (desc virou `??`) — testar payloads acentuados dos endpoints com `fetch` do node, nunca com curl |
| O dono usa o /?setup em paralelo | O registry/art podem mudar **durante** uma sessão de desenvolvimento (já aconteceu: skin integrada minutos depois de uma checagem) — reler `/api/skins`/o registry antes de mexer em `art/` ou assumir estado |
| Remover skin original ≠ remover criada | A arte das originais é manuscrita no `sw.js` FORA do bloco `@setup:skins` — a remoção física precisa do `stripSwArtLines`, senão o `cache.addAll` pede SVG apagado e o PWA não instala. Rede de segurança: o assert "nenhuma sobra no ASSETS" do `test-skins` dispara o rollback |
| `scoreAt` × troca de apelido | O `rename` reescreve o doc inteiro (`setDoc` sem merge): sem regravar o `scoreAt` com o valor antigo (cópia local `best_sent_at`), a troca de apelido zeraria o "há X dias" do jogador no top 10 |
| `POOL_SIZES` é boot-only | Sliders de densidade não adiantam se o pool encher — `spawnAnimal` retorna em silêncio sem vaga. Subiu densidade? Confira o pool (hoje 16) |
| `.rhino-anim` × pódio da home | `updateRhinoPreview` repinta TODO `.rhino-anim img` — o pódio usa `.podium-anim` de propósito; nunca reutilizar a classe do jogador |
| Contrato do toque da home | O ponto (640,650) em 1280×720 precisa ficar em área SEM `stopPropagation` (5 suítes clicam ali para iniciar); todo botão novo na tela inicial = `stopPropagation` em pointerdown E click |
| `skin`/`scoreAt` × rename | `setDoc` sem merge: a troca de apelido regrava os dois campos das cópias locais (`furious_rhino_best_sent_at`/`_skin`) — esquecê-los apagaria a vitrine/contador do jogador |
| SDK firestore-LITE ≠ completo | O lite exporta `getCount`, NÃO `getCountFromServer` — a chamada errada falhou EM SILÊNCIO (catch por design) por meses: rank nunca chegava e skins de pódio nunca desbloqueavam em produção. Agregações passam por `LeaderboardSystem.countQuery` (fallback duplo). Função nova do SDK? Testar no navegador contra o build do CDN, não confiar na doc do SDK completo |
| Animação CSS × transform | Keyframe que anima `transform` atropela um `scaleX(-1)` estático no mesmo elemento — flip com a propriedade `scale`, que compõe separada |
| `hasOnly` das rules × campo novo | A whitelist de `scores` é fechada: **campo novo não previsto = write NEGADO EM SILÊNCIO** (o `submit` engole o erro por design). Pior, até a v1.8.4 nenhum teste conferia a whitelist COMPLETA — só a presença de duas strings soltas. Hoje o `test-stats` extrai o `hasOnly` por regex e compara a lista inteira; **campo novo no doc = rule publicada ANTES do deploy, sempre** |
| `score` ≠ metros (v1.8.4) | `scores/{id}.score` virou o TOTAL; os metros moram em `scoreM` (ausente = doc antigo, em que score AINDA são os metros). Toda leitura passa por `ScoreSystem.metersOf(entry)` — usar `score` como distância replanta a estaca do rival no lugar errado da pista e quebra a comparação do recorde mundial no `NotifySystem` |
| `git checkout` × CRLF × testes byte a byte | Com autocrlf, restaurar um arquivo via `git checkout` o regrava com **CRLF** — e os asserts byte-idênticos (`test-integrate`, round-trips do registry/SpriteParams) quebram EM SILÊNCIO no casamento de linhas (aconteceu 2× em 22-23/08). Depois de qualquer checkout de arquivo com contrato byte-estável, normalizar para LF |
| Probe do card Servidores é HEAD, nunca GET | O status "jogo no ar" testa `location.origin + '/api/status'` com **HEAD**: o service worker ignora não-GET e o probe vai direto à rede. Com GET, um 200 entraria no Cache Storage (`cache.put`) e depois serviria um falso "no ar" com tudo morto |
| Letra nova em `runs[]` sem leitor | `RUN_COUNTERS` é a fonte; a radiografia (`flattenRuns`) e a aba Sprites precisam conhecê-la. O `test-radiografia` FALHA se nascer letra fora do `flattenRuns` — é proteção, não burocracia: a razão de existir das ferramentas é não deixar dado sem leitor |
| SpriteParams com import | O `Constants` importa o `SpriteParams` — um import DENTRO dele fecharia ciclo e **mataria o boot do jogo inteiro**. O `test-sprites` proíbe por regex (`^import`), e o header do arquivo grita |
| Restaurar identidade × monotonia de `stats` | O merge da recuperação **SOMA** os totais (local + servidor), nunca copia: um total restaurado menor que o do servidor faz TODO `StatsSystem.send()` seguinte ser negado **em silêncio** e o doc congela para sempre. O `test-reassign` tranca a invariante |
| Configstore do firebase-tools no Windows | O login (`npx firebase-tools login`) fica em `%USERPROFILE%\.config\configstore\firebase-tools.json` (padrão XDG) — **não** em `%APPDATA%\configstore`. O resolvedor do servidor tenta os dois; um caminho fixo errado dá "login não encontrado" com o login feito |
| Prompt `!` × barras invertidas | O shell do prompt `!` consome `\` de caminhos Windows (`C:\a\b` vira `C:ab`) — passar caminhos para o dono sempre com barras normais (`C:/a/b`), que o node aceita. Bônus: o Node 24 no Windows solta um `Assertion failed (libuv, async.c)` inofensivo ao encerrar processos que usaram `fetch` — o que confirma sucesso é a saída do script, não o exit limpo |
| Rebatismo em massa × PowerShell | Trocar strings em muitos arquivos com `Set-Content`/`Out-File` grava BOM/CRLF e quebra os byte-asserts — fazer a substituição com um script node (`readFileSync`/`writeFileSync` preservam bytes e fins de linha) |

## 14. Manutenção da documentação

Esta pasta `docs/` é mantida pelo comando **`/atualizar-docs`** (definido em `.claude/commands/atualizar-docs.md`): a cada release, ele compara o código com a última versão documentada via git, atualiza os arquivos e registra a mudança no [`CHANGELOG.md`](CHANGELOG.md).

Além dos quatro guias versionados por release, a pasta tem dois documentos **fora do ciclo de versões**, ambos append-only e com entradas datadas:

- [`QA-Registro.md`](QA-Registro.md) — o **Q&A vivo** de dúvidas pontuais do dono: dúvida respondida numa sessão vira entrada lá ("responda e registre no Q&A").
- [`IDEIAS-FUTURAS.md`](IDEIAS-FUTURAS.md) — o **banco de ideias e dados**: a radiografia datada da telemetria real (com a especificação de como reproduzi-la) e as ideias já desenhadas mas não implementadas, cada uma puxável sozinha para uma versão futura. Ideia entregue sai de lá e a explicação migra para o `GAME_DESIGN.md`.
