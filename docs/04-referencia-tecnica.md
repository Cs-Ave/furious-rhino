# Furious Rhino — Referência técnica

> Documentação da versão **1.8.3** · atualizada em 16/08/2026
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
├── art/                    # 95 SVGs — a arte que o jogo carrega (fonte da verdade)
├── art2/                   # Propostas de arte aprovadas + preview (registro do fluxo
│                           #   "arte primeiro"; o jogo carrega SÓ o que foi copiado p/ art/)
│                           #   art2/skins/ = folhas-fonte das skins + CLIs do pipeline
├── gerador-de-sprites/     # Ferramenta dev (v1.8): servidor local (:3210) que converte
│                           #   folhas raster (IA) em skins SVG e grava a integração no
│                           #   jogo (integrate.mjs) — a pasta NUNCA entra no sw.js
├── js/
│   ├── game.js             # Entry point / roteador (?setup, ?stats, ?debug)
│   ├── firebase-config.js  # Credenciais públicas do Firebase (proteção real = rules)
│   ├── notify-config.js    # Defaults dos pushes ntfy (topic vazio = tudo desligado)
│   ├── scenes/             # BootScene (preload) e GameScene (o jogo inteiro)
│   ├── entities/           # Rhino, Animal, CrackedWall, Spike, TranqTower, TranqDart,
│   │                       #   Ramp, HunterSniper (o caçador do boss)
│   ├── systems/            # TextureFactory, SpawnManager, FurySystem, BossFight,
│   │                       #   AudioSystem, SkinSystem + SkinRegistry (v1.8 — o registry
│   │                       #   é DADOS, reescrito pelo /?setup), MedalSystem,
│   │                       #   LeaderboardSystem, StatsSystem, NotifySystem, TuningPanel
│   ├── utils/              # Constants (todo o tuning) e StorageManager (persistência local)
│   ├── stats/              # StatsDashboard, Charts, MyStats (painel e resumo do jogador)
│   ├── setup/              # SetupPage (v1.8): o estúdio de skins do dono (/?setup=chave)
│   └── art/                # ArtManifest (gerado) e SvgSprites (gerador aposentado)
├── tools/                  # Scripts Node: testes, digest, exportação de arte, limpeza
└── .github/workflows/
    └── daily-digest.yml    # Cron do resumo diário (23h UTC = 20h Brasília)
```

## 2. Dependências

**Runtime: nenhuma instalada.** Phaser 3.85.2 vem de CDN (jsDelivr); lil-gui (painel de debug) vem de CDN só com `?debug=1`; Firebase SDK 12.16.0 (`firebase-firestore-lite`) vem de CDN por import dinâmico, só quando ranking/telemetria são usados.

**Desenvolvimento (`devDependencies`):**

| Pacote | Uso |
|---|---|
| `playwright` | Testes e2e em Chromium (`e2e-ramp`, `e2e-stats`, `e2e-boss`, `e2e-special`, `e2e-skins`, `e2e-setup`) |
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
npm run test-stats              # 76 asserts, sem navegador
npm run test-skins              # ~94 asserts das skins, sem navegador (nº varia com o registry)
npm run test-integrate          # 42 asserts da integração do /?setup, sem navegador
npm run test-ramp               # 30 asserts em Chromium — exige o servidor acima no ar
npm run test-boss               # 16 asserts e2e da luta do portão — idem
npm run test-special            # 25 asserts e2e da FÚRIA TOTAL, biomas e desabamento — idem
npm run test-e2e-skins          # 15 asserts e2e das skins — idem
npm run test-e2e-setup          # 17 asserts e2e do estúdio /?setup — idem (2 ramos: gerador no ar/parado)
npm run test-e2e-stats          # e2e da telemetria em Chromium — idem
npm run digest                  # monta o resumo diário SEM enviar
npm run sprite-gen              # sobe o servidor do gerador/estúdio em localhost:3210
```

URLs especiais: `/?debug=1` (painel de tuning + `window.game` para os e2e), `/?stats` (painel público), `/?stats=0929` (painel detalhado), `/?setup=0929` (estúdio de skins do dono — a escrita exige o `sprite-gen` no ar), `/?ntfy=test|off|on` (testar/silenciar pushes).

## 4. Os quatro lugares da versão

**Toda release toca os quatro, e os quatro têm de bater:**

| Arquivo | Campo |
|---|---|
| `js/utils/Constants.js:4` | `VERSION: '1.8.3'` |
| `index.html` | `<span id="game-version">v1.8.3</span>` |
| `package.json` | `"version": "1.8.3"` |
| `sw.js:3` | `const CACHE = 'furious-rhino-v183'` |

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
| `scores/{playerId}` | pública | só campos `{name, nameLower, score, scoreAt, skin, updatedAt}`; name 3–12 chars; score int 1–10000 e **só cresce**; `scoreAt` (v1.8) opcional, timestamp `<= request.time` — o "quando a marca foi atingida"; `skin` (v1.8.1) opcional, string 1–24 — a skin usada ao cravar a marca (vitrine do pódio). Ambos regravados com o valor ANTIGO na troca de apelido (cópias locais `furious_rhino_best_sent_at`/`_skin`; sem elas os campos saem e a leitura cai nos fallbacks); delete proibido |
| `stats/{playerId}` | pública (é o que faz o painel funcionar) | 12 campos de topo no máximo; núcleos monotônicos (`attempts/playTimeS/wins/bestM` só crescem); `runs` ≤ 50; `deaths` ≤ 14 chaves; `client` ≤ 10; `geo` ≤ 4; delete proibido |
| `config/notify` e `config/news` | pública | **proibida** — só o console (o wildcard `config/{doc}` cobre os dois). `config/news` (v1.8.1) = o Diário da Fuga: campo `items`, array de strings — cada string é um card na home, a 1ª sempre aparece; o jogo relê a cada 1h |

**A restrição que governa tudo:** o orçamento de avaliação das rules estoura com campos soltos — constatado que **19 campos de topo passavam e 20 falhavam**, negando writes legítimos em silêncio. Portanto: **nenhum campo novo de primeiro nível em `stats`**. Campo novo entra nos mapas existentes ou nos elementos de `runs[]` (forma livre).

**Apagar documentos** (`allow delete: if false`): só via Firebase CLI com credencial de admin.
- `node tools/cleanup-stats.mjs` (lista) / `--yes` (apaga; exige `npx firebase-tools login` uma vez). Remove sondas `claude-*`, docs de teste conhecidos e, desde a v1.7.2, **relata** (sem apagar sozinho) qualquer doc com a assinatura de tráfego automatizado: `attempts >= 50`, `playTimeS = 0` e `runs` vazio.
- `node tools/delete-player.mjs <nome-ou-id>` (v1.7.2): apaga **um** jogador específico nas duas coleções (`scores` + `stats`), buscando por apelido (normalizado como o `LeaderboardSystem.nameSlug`) ou por id/prefixo de id. Mesmo padrão dry-run / `--yes`.

**Ambiente local nunca escreve por padrão** (v1.7.2, ver [`03-arquitetura.md`](03-arquitetura.md) §6): fecha a causa raiz dos vazamentos de teste — antes, um contexto Playwright sem `playerId` de sonda minava um UUID real e escrevia em produção.

## 7. Telemetria — formato dos dados

- 1 write **idempotente** por fim de corrida (`setDoc` sem merge, totais acumulados). Também na tela inicial e ao abrir `/?stats`.
- `runs[]` (últimas 50): `{t, m}` + opcionais `s` segundos, `c` causa, `k` teclado, `v` versão, `g` skin usada (v1.8, string ≤8, omitida na default) e 13 contadores de mecânica (`w` paredes, `r` rampas, `o` torres, `a` animais, `j` pulos, `d` investidas, `x` investidas negadas no cooldown, `p` pausas, `f` Fúrias Totais usadas, `n` ativações da fúria **negadas na arena do boss** (v1.8 — mede quem ainda tenta o truque antigo), `b` camadas do portão quebradas, `q` quiques na luta, `z` segundos de luta contra o boss). Zero é omitido.
- Causas de morte: `wall/spike/animal/dart/tower/boss/fall` — `boss` (v1.7) é o rifle do caçador, 13ª chave do mapa `deaths` (as rules aceitam até 14).
- `history` (localStorage e espelhado): `{clients, geos, versions}` podados pelo **menos usado**; `days` (60 dias) podado por **idade** — série temporal não pode ganhar buracos.
- Geo por IP no cliente (geojs.io → ipwho.is, timeout 4 s), TTL 12 h ok / 6 h falha; **falha preserva** a última cidade (`stale: true`) — um `setDoc` sem merge com campo ausente **apaga** o valor no servidor (bug real corrigido na v1.6.1).
- A fúria deixou de ser posicional na v1.7 (virou carga gastável): o contador `f` mede a **decisão de usar** o especial, que não está em nenhum outro campo.
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
| `OPENING_SCRIPT` | 3 passos | abertura guiada (rampa 90 m → espinho 125 m → parede 160 m) |
| `SPECIAL_DURATION_MS / SPEED_MULT / WARN_MS` | 6000 / 1,25 / 1500 | FÚRIA TOTAL: duração, boost e aviso de fim |
| `BOSS_ARENA_PX` | 1100 | a luta começa em WIN−1100 (~972 m); câmera trava |
| `BOSS_BLOCKS_FURY` | true | v1.8: dentro da arena a ATIVAÇÃO da fúria é negada (a carga segue enchendo); ligável/desligável no TuningPanel |
| `BOSS_KNOCKBACK_VX / VY / MS` | 3000 / −360 / 650 | quique: impulso (decai ~0,92/frame → ~600 px de recuo) e janela sem reescrita de velocidade |
| `BOSS_LAYER_COOLDOWN_MS` | 450 | 1 contato processado por vez (o rampage não zera as 3 camadas em 3 frames) |
| `BOSS_SHOT_SPEED / BOSS_RIFLE` | 800 / 3 padrões | rifle do caçador: velocidade e cadência/telegraph/rajada por camadas restantes (1500/1200/950 ms) |
| `BIOME_ANIMALS` | 6 elencos | quais das 27 espécies nascem em cada bioma |
| `CAUSE_LABELS` | 8 rótulos | fonte única dos nomes de desfecho (painel, resumo, pushes) |

Calibrar com dados, não no escuro: aba **Dificuldade** do painel (heatmap causa × distância). O `TuningPanel` (`?debug=1`) permite testar valores ao vivo e exportar um `.txt` com só o que mudou, no formato do `Constants.js`.

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
- Os **primeiros 190 m são a abertura roteirizada** (rampa → espinho → parede, zero animais, de propósito) — nenhuma calibração muda isso; quem morre cedo vê pouco bicho por design.
- A **arena do boss** (WIN−1300 a WIN+1000) é zona livre — par e escolta respeitam.

Fluxo de trabalho: ajustar os sliders em campo → jogar → gostou? botão **exportar** do painel (gera `furious-rhino-tuning.txt` só com o que mudou, no formato do `Constants.js`) → colar os valores no `Constants.js` (ou mandar o arquivo para o assistente aplicar) → rodar `npm run test-ramp` + `test-boss` → release normal.

## 9. Service worker (`sw.js`)

- Estratégia **network-first** com `cache: 'no-cache'` (força revalidação HTTP — sem isso o cache do navegador misturava versões de JS).
- `ASSETS`: ~135 entradas explícitas (v1.8.1 somou `NewsSystem.js`). **Todo `.js` novo entra na lista E o `CACHE` sobe de versão** (`furious-rhino-v181`) — esquecer = `addAll` falha inteiro no install e o PWA instalado toma 404.
- **Fonte do título** (v1.8.1): `fonts.googleapis.com` (o CSS) já cai no bypass `endsWith('googleapis.com')` — offline o título usa Impact (`font-display: swap`); o `.woff2` de `fonts.gstatic.com` entra no cache de runtime como o SDK do Firebase.
- Entre os marcadores `// @setup:skins —` e `// @setup:skins:fim` fica o **bloco gerenciado pelo estúdio /?setup**: os SVGs de skins criadas pelo dono são reescritos ali pelo servidor do gerador (`patchSwAssets`). As 7 skins originais ficam FORA do bloco, listadas à mão. **Não editar o miolo nem duplicar os marcadores** — o `test-skins` valida.
- Bypass (vai direto à rede, sem cache): não-GET e os hosts `*.googleapis.com`, `get.geojs.io`, `ipwho.is`, `ntfy.sh`. **Serviço externo novo precisa entrar nessa lista.**

## 10. Notificações — operação

Parâmetros completos e receitas: `HANDOFF.md` §4A/§4B. Resumo de operação:

- Camadas: `?ntfy=off` (aparelho) > doc `config/notify` (Firestore, cache de 1 h por navegador) > `js/notify-config.js` (versionado). Tópico atual: `furiousrhino-f8497207e3be` em `ntfy.sh`.
- No doc do Firestore, **o tipo do campo importa** (`boolean`/`number`/`array`) — um `"true"` string é ignorado em silêncio.
- Resumo diário: `.github/workflows/daily-digest.yml`, cron `0 23 * * *`, secret `NTFY_TOPIC`. Testável pelo botão *Run workflow*. ⚠️ O GitHub desativa crons após 60 dias sem commits (avisa por e-mail).

## 11. Testes — o que cada um prova

| Suíte | Prova |
|---|---|
| `test-stats` (Node puro) | Agregação, contadores (inclusive `f/b/q/z` e a causa `boss`), consistência das camadas **contra as rules** (um teste falha se alguém criar campo de topo em `stats`; outros se `scoreAt`/`skin` sumirem da whitelist de `scores`), `LeaderboardSystem.holdDays` nas DUAS semânticas (por marca = lista; cascata = pódio), `buildDigest` |
| `test-skins` (Node puro, v1.8) | É o **portão do /?setup** (roda a cada gravação da página, com rollback se reprovar). Lógica de acesso testada com **skins sintéticas** — rank exato, condições declarativas (`conditionMet`), totais, `hidden`, retro-scan, `requirementText`, `resolveEquipped` sem regravar — e o registry REAL só passa por checagens estruturais: ids/prefixos no padrão, JSON estrito, SVGs em `art/`, `ASSETS` e marcadores do `sw.js`. **Regra: nenhum assert pode "pinar" valores do registry** (o dono edita skins à vontade) |
| `test-integrate` (Node puro, v1.8) | A integração do estúdio como funções puras: round-trip byte-idêntico do `SkinRegistry.js`, upsert/remove (só o `default` intocável; originais também removem, com `stripSwArtLines` limpando as linhas manuscritas do `sw.js`), flag `hidden`, validação de entradas/condições, e o patch idempotente do bloco `@setup:skins` no `sw.js` (CACHE jamais tocado) |
| `e2e-ramp` (Chromium) | Trajetória frame a frame da travessia da rampa (o assert "nunca trava" protege contra regressão do soft-lock), trampolim, destruição, abertura guiada, portão/cidade, teclado, pausa (inclusive **desistir da corrida** sem contabilizar), par/escolta de animais, knockback para a direita, e (v1.8.1) a **home nova**: pódio do cache com cascata e fallback de skin, Diário com evento local, box Campanha, e o **contrato do toque em (640,650)** iniciando a corrida — zero erro de JS |
| `e2e-boss` (Chromium) | A luta do portão: quique sem morte e **retomada sozinha** (o assert que mataria a rota de corpo sólido), investida liberada na janela pós-quique, 3 quebras na ordem chão→meio→alto, vitória dispara o `crossGate`, morte pelo rifle com causa `boss` — e (v1.8) a fúria negada na arena com carga preservada, cadeado no medidor, rampage prévio que sobrevive mas **não quebra desalinhado**, e liberação pós-derrota |
| `e2e-special` (Chromium) | Sorteio de espécies por bioma, o ciclo completo da FÚRIA TOTAL (carga por distância, ativação sem virar dash, destruição do espinho, drenagem e reversão) e (v1.8) o desabamento do topo da parede: crop, tombo, autodestruição e pool limpo na reciclagem |
| `e2e-skins` (Chromium, v1.8) | Comportamento no navegador contra um **registry canônico injetado por interceptação de rede** (`context.route` + `serviceWorkers: 'block'` — o registry real do dono não pode derrubar a suíte): preview e sprite vestem a skin; destronado vira default **sem regravar a escolha**; hub sem iniciar corrida; persistência após reload; fúria com `firePrefix` próprio (o canônico usa arte do NÚCLEO — `rhino-run`/`rhino-fire-run` — porque qualquer skin real pode ser removida com a arte pelo /?setup); e a guarda da escala visual — **hitbox segue 76×54 com os pés no chão** para qualquer `RHINO_VISUAL_SCALE` |
| `e2e-setup` (Chromium, v1.8) | O estúdio /?setup: sem chave/chave errada → restrito; chave certa → monta sem Phaser; preview do requisito gerado ao vivo; nome de skin original barrado na digitação; lista com só o default travado e toggle + ✏️ + 🗑 em todas as outras (v3); dois ramos (servidor do gerador no ar/parado) |
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
- **Estúdio de skins** (`/?setup=0929`, com o servidor `npm run sprite-gen` no ar em `localhost:3210` — ou duplo-clique em `gerador-de-sprites/iniciar-gerador.bat`): o fluxo completo do dono, sem editar código — folha (JPG/PNG/SVG) → fatiamento automático ou grade fixa → 3 frames na ordem do galope → paleta k-means (editável, 1 contorno) → gerar (encaixe em 95×63 do canvas; aba 🔥 opcional para fúria própria) → preview animado + onion-skin → formulário de desbloqueio (grátis / pódio 1-3 / conquista numa corrida / totais de vida, com preview do texto do cadeado) → **Aplicar** copia os SVGs para `art/`, reescreve `SkinRegistry.js` e o bloco do `sw.js`, roda `test-skins` e **reverte tudo se reprovar**. A lista de skins existentes permite editar, alternar a flag "no jogo/fora do jogo" e remover (só as criadas). O servidor assume a porta de instâncias antigas ao subir e manda o header de Private Network Access (Chrome exige para a página em produção falar com localhost). A página antiga do gerador (`:3210/`) continua existindo com o fluxo de snippets. Receita da folha no card de upload: fundo branco puro, células separadas, **nada atravessando os vãos**, cel-shading chapado, corpos idênticos entre poses, ≥2000 px de largura. **Publicação continua manual**: nada do estúdio faz git/bump — a skin vai ao ar na release seguinte.

## 13. Armadilhas conhecidas (leia antes de mexer)

| Armadilha | Regra |
|---|---|
| Orçamento das rules | Nunca campo de topo novo em `stats` (19 passavam, 20 falhavam — negação silenciosa) |
| Teste sujando produção | Desde a v1.7.2, ambiente local não escreve por padrão (§6/§11) — só com opt-in explícito. Ainda assim, todo contexto Playwright com `player_id` `claude-*` e `notify_off = '1'` |
| `setDoc` sem merge é destrutivo | Campo opcional ausente **apaga** o valor no servidor |
| Arcade Physics não tem rampa | Rampa é terreno (`surfaceY(x)` + `updateTerrain()`), nunca corpo estático |
| Corpo sólido + reescrita de velocidade = soft-lock | O portão do boss NÃO tem corpo: banda de x + clamp posicional + janela de knockback em que o `FurySystem` não reescreve `velocityX` (mesma família da armadilha das rampas) |
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

## 14. Manutenção da documentação

Esta pasta `docs/` é mantida pelo comando **`/atualizar-docs`** (definido em `.claude/commands/atualizar-docs.md`): a cada release, ele compara o código com a última versão documentada via git, atualiza os arquivos e registra a mudança no [`CHANGELOG.md`](CHANGELOG.md).
