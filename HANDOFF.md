# Handoff — FURIOUS RHINO v1.8.0

**Data:** 14/08/2026 · **Status:** v1.8.0 COMPLETA na árvore de trabalho, **não commitada** · **Sessão anterior documentada:** v1.7.2

---

## 1. Estado atual

| | |
|---|---|
| Produção (v1.7.2) | https://cs-ave.github.io/furious-rhino/ — publicada pelo dono em 10/08 |
| Working tree | v1.8.0 inteira SEM commit: 13/08 (fúria no boss, desabamento, skins, gerador) + 14/08 (estúdio /?setup, skins editáveis + flag, rino +30% visual) |
| Último commit | `fbc5068` (v1.7.2) — topo de `origin/main` |
| Cache do SW (código local) | `furious-rhino-v180` |
| Rules do Firestore | **⚠️ MUDARAM em 15/08** (`scoreAt` opcional em `scores/`) — publicar no console ANTES do deploy (regra 3) |
| Docs | `docs/` sincronizada em 14/08 (`/atualizar-docs` rodado; entrada v1.8.0 do CHANGELOG emendada — a versão nunca foi lançada) |
| Registry de skins do dono | Além das 7 originais: **rhinoprata** (criada pelo dono no /?setup, visível); robot/silver/bronze/catisquick/prata estavam **hidden** por escolha dele — estado vivo, conferir `js/systems/SkinRegistry.js` |

**Suítes (todas verdes em 15/08):** `test-stats` **82** · `test-skins` 97 (nº varia com o registry) · `test-integrate` **49** · `e2e-ramp` **34** · `e2e-boss` 16 · `e2e-special` 25 · `e2e-skins` **15** · `e2e-setup` **17 (2 ramos)** · `e2e-stats` 69.

### 15/08 — Manutenção do /?setup: remover físico liberado para as originais (v3)
- Pedido do dono: o 🗑 em TODAS as linhas menos o default. `removeSkin`/`/api/skin/remove` agora barram só `LOCKED_IDS`; nova `stripSwArtLines` (integrate.mjs) apaga as linhas manuscritas da arte no sw (fora do bloco `@setup:skins` — sem isso o `cache.addAll` daria 404 e o PWA não instalaria); confirm extra na página avisa que a arte das originais não tem backup no `output/` do gerador. Rede de segurança nova no test-skins ("nenhuma sobra no ASSETS") é quem dispara o rollback se a limpeza falhar. Smoke reversível executado: remoção real da `party` pelo endpoint + restauração byte a byte, tudo verde.
### 15/08 — Três correções de jogo (pedidos do dono)
- **Desabamento tomba para a ESQUERDA**: `collapseWallTop` com `angle: Between(-96, -78)` (era positivo/+x); assert do e2e-special atualizado ("ângulo negativo crescendo").
- **Som/pausa abaixo dos ícones de fúria/dash**: `GameScene.alignHudButtons()` posiciona os botões DOM pelo retângulo real do canvas (Scale.FIT — CSS fixo não acompanha; re-alinha no evento `resize` do ScaleManager); `top:20px` do CSS virou fallback pré-boot.
- **"🏳️ Desistir da corrida" no popup de pausa**: cancela a run SEM contabilizar nada — não chama `endGame` (nada de runs[]/morte/playtime/telemetria), devolve a tentativa do `startRun` via novo `StorageManager.removeAttempt()` e dá `location.reload()` (mesmo caminho do "Jogar Novamente"). Modal usa `btn-row`/`btn-secondary`. e2e-ramp ganhou o assert 25 (31 no total).

### 15/08 — Densidade de animais + dias no pódio + knockback p/ direita
- **Densidade de animais (3 rodadas até o dono aprovar)**: (a) `animalPackChance` — segundo animal quando a roleta sorteia animal (`ANIMAL_PACK_OFFSET_PX` 300); (b) preset "denso sem facilitar" — gapMin −15% até o piso 540 do dash; (c) **`animalEscortChance`** — animal nasce JUNTO de parede/espinho/torre na coreografia dos combos (`SpawnManager.maybeEscort`: +280 terrestre/+220 voador y470/+300 any, span somado ao nextSpawnX, guardas de arena/LENDA). Padrão final: pack 0.50→0.75, escolta 0.60→0.80, `POOL_SIZES.animals` 8→**16**. **Monte Carlo** (scratchpad, 4000 corridas): v1.7 = 1,5 animais/100m → padrão atual = **3,2** → teto do sistema ~4,0 com tudo a 100% (passar disso = mexer nos pesos, que facilita). Browser: 8→17 spawns no mesmo percurso de 60s. Pasta Tiers do ?debug=1 tem TODOS os controles (pesos da roleta, gapRand, 🐾 par, 🐾 escolta) — chave de tier nova entra sozinha no exportador. Obs.: os primeiros 190m são a abertura roteirizada, SEM animais por design.
- **Knockback do atropelo virou diagonal superior DIREITA e mais rápido**: `ANIMAL_KB_VX/VY_MIN/MAX` em Constants (350..650, −800..−500), rotação inalterada; sliders na pasta Animais + `ROOT_KEYS` do export.
- **Top 10 com "há X dias" segurando a posição**: campo novo **`scoreAt`** (opcional) em `scores/` — decisão do dono, preservando marcas antigas (fallback `updatedAt`). `submit` grava `scoreAt: serverTimestamp` + cópia local `furious_rhino_best_sent_at`; `rename` regrava via `Timestamp.fromMillis` (setDoc sem merge apagaria). `LeaderboardSystem.holdDays` (pura, testada no node): **idade da PRÓPRIA marca** (v2 — a regra original "por posição" reiniciava todo mundo abaixo de uma entrada nova, a coluna inteira convergia para a mesma data, e o dono trocou pela leitura por marca ao ver o efeito em produção). UI: `.rank-right`/`.rank-days` no `#ranking-list` ("há Nd" / "hoje"). Smoke com dados reais: 10/10 linhas, valores distintos (2d/4d/3d...).

- O registry mudou de novo pelo dono (pós-handoff de 14/08): `prata`/`rhinoprata` removidas; criadas **MecaGold** (rank 1), **MecaSilver** (rank 2, desc vazia), **MecaBronze** (rank 3) e **Rhino do Catisquick** (façanha 5 torres + 3 camadas); gold/silver/bronze originais `hidden`; **catisquick virou `access: default` mas a desc ainda fala da façanha** — conferir com o dono antes da release.

---

## 2. O que entrou na v1.8.0

### 13/08 (sessões anteriores)
Fúria bloqueada na arena do boss (`BOSS_BLOCKS_FURY`, contador `runs[].n`); desabamento de paredes/prédios; sistema de skins (7 originais, hub 🎨, pódio dinâmico, Catisquick com Rino Vulcão, `runs[].g`); Gerador de Sprites (`:3210`).

### 14/08 — Estúdio de skins `/?setup=0929` (independência total do dono)
- **Registry data-driven**: `js/systems/SkinRegistry.js` (JSON estrito, machine-owned — o servidor reescreve por TEXTO, nunca `import()`); `SkinSystem` importa e re-exporta.
- **Condições declarativas**: `access.condition` com AND — achievement `{meters, towersDowned, bossLayers, escaped}` / novo tipo **total** `{attempts, wins, animals}`; `conditionMet` + `requirementText` (copy pt-BR do cadeado gerada da regra); Catisquick virou `{towersDowned:5, bossLayers:3}` sem mudança de comportamento; retro-scan genérico.
- **Servidor** (`gerador-de-sprites/`): `integrate.mjs` (funções puras: parse/render/upsert/remove/patchSw/validate); endpoints `GET /api/skins`, `POST /api/integrate`, `/api/skin/update`, `/api/skin/remove` — **toda gravação roda test-skins e faz rollback**; `generate` com `variant:'fire'`; header PNA; `jimp` fixado no package.json.
- **Página** `js/setup/SetupPage.js` (gate = mesma chave/hash do stats): wizard completo + lista com **✏️ editar**, toggle **✅ no jogo / 🚫 fora do jogo** e 🗑 remover.
- **Proteções em 2 níveis** (v3 em 15/08): `LOCKED_IDS` = só `default` (nem edita, nem remove — é o fallback universal); `BUILTIN_IDS` = as 7 (arte manuscrita no sw FORA do bloco `@setup:skins`, id não reutilizável; no resto iguais às criadas — **desde 15/08 também removíveis**, com `stripSwArtLines` limpando as linhas manuscritas do sw + confirm extra na página; rede de segurança nova no test-skins: ASSETS apontando para arte inexistente reprova → rollback).
- **Flag `hidden`** no registry: some do hub, `isEquippable` false (equipada → default sem regravar), evaluate*/retro-scan pulam; reversível.
- **sw.js**: bloco gerenciado entre `// @setup:skins —` e `// @setup:skins:fim` (só skins criadas; CACHE jamais tocado pela ferramenta).

### 14/08 — Tamanho do rino
- Gerador: encaixe do sprite subiu de 94×54 para **95×63** do canvas (skins geradas no porte da arte original); prata/rhinoprata retroajustadas por wrapper `@setup:zoom` (também nos `output/` — re-apply não regride).
- **`RHINO_VISUAL_SCALE: 1.30`** (calibrado em campo pelo dono via slider novo no ?debug=1): só visual — `Rhino.applyVisualScale(k)` compensa o body (`setSize(76*S/k, 54*S/k)`, `setOffset((48k−40)*S/k, (64k−54)*S/k)`) → hitbox segue **76×54 de mundo, pés no chão** (assert 1b2 no e2e-skins tranca isso). `onWallHit` usa `RHINO_H` (não `displayHeight`); fumaça da narina e wind streaks × escala; squash&stretch da vitória virou relativo (**bug pré-existente corrigido**: inflava o rino ~2.2×). Espelhos HTML ×1.3 (`.rhino-anim` 187×125 / 140×94, `.skin-cell img` 125×83).

---

## 3. Decisões do dono (14/08)

| Tema | Decisão |
|---|---|
| Publicação do /?setup | Ferramenta grava na árvore; **release manual** (sem git/bump automático) |
| Onde roda | Só no PC com o servidor local (`sprite-gen`); sem token GitHub |
| Originais | TODAS editáveis menos o default; remover físico bloqueado — a flag "fora do jogo" é o caminho (reversível) |
| Flag na lista | Badge + botão de alternar na própria linha |
| Tamanho do rino | Pediu +40% → explicado que o teto sem cortar é encher o canvas; escolheu +15% e depois calibrou para **1.30** no slider |

---

## 4. ⭐ Parâmetros novos de 14/08

| Parâmetro | Valor | Onde |
|---|---|---|
| `RHINO_VISUAL_SCALE` | **1.30** | `Constants.js`; slider "📏 escala visual" na pasta Skins do ?debug=1 |
| Encaixe do gerador | 95×63 | `gerador-de-sprites/lib.mjs` (const `s = Math.min(...)`) |
| `LOCKED_IDS` / `BUILTIN_IDS` | `['default']` / as 7 | `gerador-de-sprites/integrate.mjs` |
| `hidden` (registry) | boolean (true grava; visível = sem a chave) | `SkinRegistry.js`; toggle no /?setup |
| Chave do /?setup | `0929` (mesmo hash SHA-256 do stats) | `js/setup/SetupPage.js` |

Letras livres em `RUN_COUNTERS`: `e h i l u y` (inalterado).

### ⭐ Parâmetros novos de 15/08

| Parâmetro | Valor | Onde |
|---|---|---|
| `animalPackChance` (por tier) | 0.50→0.75 | `DIFFICULTY_TIERS`; slider "🐾 par de animais" |
| `animalEscortChance` (por tier) | 0.60→0.80 | `DIFFICULTY_TIERS`; slider "🐾 escolta" |
| `ANIMAL_PACK_OFFSET_PX` | 300 | Constants raiz |
| `ANIMAL_KB_VX_MIN/MAX` | 350 / 650 | Constants raiz; sliders pasta Animais |
| `ANIMAL_KB_VY_MIN/MAX` | −800 / −500 | Constants raiz; sliders pasta Animais |
| `POOL_SIZES.animals` | 16 (era 8) | Constants (boot-only, sem slider) |
| `gapMin` (t1..t4) | 850/650/550/540 | `DIFFICULTY_TIERS` (−15% até o piso 540) |
| `scoreAt` (scores/) | timestamp opcional | `firestore.rules` + `LeaderboardSystem` |
| `furious_rhino_best_sent_at` | ms epoch local | `StorageManager` (preserva scoreAt no rename) |
| Guia de calibração de densidade | — | `docs/04-referencia-tecnica.md` §8b |

---

## 5. Pendências

### Para fechar a release
| Item | Contexto |
|---|---|
| **Commit da v1.8.0** | Decidir untracked: sugestão — `docs/`, `gerador-de-sprites/`, `js/setup/`, `js/systems/Skin*`, `tools/*` novos, `art/*` SIM; `Anotacoes.txt`, `.claude/`, `Art AI/` NÃO; `art2/` a critério (registro histórico). Rules NÃO mudam |
| **Bump de versão** | 4 lugares (`Constants.VERSION`, `#game-version`, `package.json`, `sw.js CACHE`) — código ainda diz 1.8.0/v180, docs acompanham |
| **Push + tag + GitHub Release + smoke** | Ritual em `docs/04-referencia-tecnica.md` §5. Push também rearma o cron do digest (desativa ~09/10 sem commit) |
| **Revisar o registry antes de publicar** | O dono deixou robot/silver/bronze/catisquick/prata `hidden` testando — conferir se é o estado desejado para produção |

### Opcionais / próximos
- Leitores de `runs[].g` no painel (medir uso de skins).
- Skin "color" (`gerador-de-sprites/output/color/`) aguardando decisão; skins novas agora saem 100% pelo /?setup.
- Mecânicas por espécie — adiadas.
- Calibrar t6 pós-release; `GAME_DESIGN.md` parado na v1.6.0.

---

## 6. Como retomar

```bash
cd /c/Users/crist/MobileGame
git status                     # a v1.8.0 inteira está aqui, sem commit

python -m http.server 3000     # servir o jogo (e2e dependem disso)
npm run sprite-gen             # servidor do gerador/estúdio (:3210)
# http://localhost:3000/?setup=0929  → o estúdio de skins
# http://localhost:3000/?debug=1    → pasta Skins: vestir qualquer skin + escala visual
```

---

## 7. Armadilhas novas de 14/08 (além das anteriores, que continuam valendo)

| Armadilha | Regra |
|---|---|
| Suítes-portão × registry | test-skins/e2e-skins rodam a cada gravação do /?setup — NUNCA pinar valores das skins reais (lógica = sintéticas; e2e = registry canônico injetado por `context.route` + `serviceWorkers:'block'`) |
| Arcade body × scale | `setScale` multiplica tamanho E offset do body; a compensação correta vive em `Rhino.applyVisualScale` (dividir offset por k enterra os pés) |
| `curl -d` no Git Bash | Mutila UTF-8 (emoji/º) no corpo JSON — testar payloads acentuados com fetch do node |
| Dono usa o /?setup em paralelo | Registry/art mudam DURANTE a sessão (aconteceu: skin integrada minutos após uma checagem) — reler `/api/skins` antes de mexer em `art/` |
| Marcadores `@setup:skins` no sw | 1× cada, nunca editar o miolo à mão; originais ficam FORA do bloco |
| Registry hidden round-trip | `hidden:false` REMOVE a chave (nunca grava false) — mantém o arquivo byte-estável |

---

## 8. Arquivos que nasceram em 14/08

| Arquivo | Papel |
|---|---|
| `js/systems/SkinRegistry.js` | DADOS das skins (runtime, no sw.js) — reescrito pelo /?setup |
| `js/setup/SetupPage.js` | O estúdio (runtime, no sw.js) |
| `gerador-de-sprites/integrate.mjs` | Integração como funções puras de texto (dev-only) |
| `tools/test-integrate.mjs` | 42 asserts da integração |
| `tools/e2e-setup.mjs` | 17 asserts do estúdio (2 ramos) |
| `art/rhino-prata-run-*` / `art/rhino-rhinoprata-run-*` | Skins criadas pelo dono no estúdio (com zoom retroativo) |
