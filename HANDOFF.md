# Handoff — FURIOUS RHINO v1.8.1

**Data:** 16/08/2026 · **Status:** v1.8.1 **RELEASED em produção** (commit `3b57afe`, tag `v1.8.1`, smoke 8/8)

## 1. Estado atual

| | |
|---|---|
| Produção (v1.8.1) | https://cs-ave.github.io/furious-rhino/ — released 16/08 (smoke 8/8: versão, pódio real com dias de posse, Diário com config/news, write com `skin` aceito, sonda apagada, zero erro de JS) |
| Working tree | Limpa (só `.claude/`, `Anotacoes.txt`, `Art AI/` locais por decisão) |
| Último commit | `3b57afe` (v1.8.1) — topo de `origin/main`; tags `v1.8.0` e `v1.8.1` |
| Rules do Firestore | **Publicadas pelo dono em 16/08** (antes do push, ordem correta) — `skin` opcional em `scores/` |
| Doc `config/news` | **Criado em 16/08** (via script admin com o login do firebase-tools, rodado pelo dono com `!` — o classificador barrou o assistente, corretamente, por ler credencial): 2 itens no ar; o dono edita no console quando quiser (campo `items`, array de strings; o jogo relê a cada 1h) |
| Docs | `docs/` + CHANGELOG sincronizados com a v1.8.1 em 16/08 |
| Suítes (16/08, todas verdes) | `test-stats` **87** · `test-skins` 97 · `test-integrate` 49 · `e2e-ramp` **37** · `e2e-boss` 16 · `e2e-special` 25 · `e2e-skins` 15 · `e2e-setup` 17 · `e2e-stats` 69 |

## 2. O dia 15/08 em resumo

**Manhã (tudo DENTRO da v1.8.0, released):** /?setup v3 (remover físico das originais + `stripSwArtLines`); 3 correções (desabamento p/ esquerda, som/pausa sob os ícones via `alignHudButtons`, "🏳️ Desistir da corrida" sem contabilizar); densidade de animais em 3 rodadas (par → denso → **escolta**; 1,5→3,2 animais/100m, teto ~4; guia de calibração em docs/04 §8b); atropelado voa p/ cima-direita; ranking com "há X dias" (campo `scoreAt`, holdDays por marca); **release completa** (rules publicadas pelo dono → commit `e775625` → push → tag → GH Release → smoke 5/5 → sonda apagada). Detalhes: seção "Handoff anterior" abaixo.

**Tarde (v1.8.1, sem commit):** planejamento + **5 rodadas de mockup** com o dono (A/B/C → C1/C2/C3 → C2 refinado; processo mockup-first: HTML estático com a arte real via `file:///` + screenshot por rodada — funcionou muito bem) → implementação completa da home:

- **Pódio mundial na home** (2·1·3 + degrau VOCÊ tracejado na mesma linha de base): skins de quem cravou cada marca (campo novo **`skin`** em `scores/` — **RULES MUDARAM DE NOVO**, publicar no console antes do deploy; docs antigos caem no rino original), nome, marca e dias de **posse da posição (cascata)** — `holdDays(entries, now, {cascade:true})`; a lista do 🏆 segue por marca. `fetchPodium()` com cache `furious_rhino_podium` TTL 6h (3 reads; refresh pós-submit e o `fetchTop10` realimenta de graça).
- **Diário da Fuga** (`js/systems/NewsSystem.js`, novo — está no sw ASSETS): 1º card = `config/news` do console (doc com campo `items`, array de strings; 1 read/h, molde do NotifySystem; **o dono precisa criar o doc no console**), demais = eventos locais dedupe-por-chave em `furious_rhino_news` (skin desbloqueada — inclusive as do boot, que eram avisos órfãos; entrou/perdeu pódio via bootRank×fetchMyRank; recorde novo no submit).
- **Box Campanha**: recorde/tentativas/fugas/maior inimigo + minigráfico SVG das últimas 10 corridas + botões nome (#identity-btn) e Minhas estatísticas dentro; 📣 Chamar a galera alinhado ao "ver top 10 ›" (#ranking-btn reestilizado). **Faixa de medalhas REMOVIDA da home** (decisão do dono; seguem no Minhas estatísticas — `setupMedalStrip` apagado, `#medal-strip` fora do DOM).
- **Título em chamas** fonte Luckiest Guy (Google Fonts CDN + fallback Impact; `fonts.googleapis.com` já cai no bypass do sw, woff2 do gstatic entra no cache runtime); instruções de jogo em texto puro flanqueando o CTA pulsante; rodapés grandes ("Designed by Thomas Avelino" / v1.8.1).
- **Contrato de testes PRESERVADO** (asserts 26/26b/27 novos trancam): overlay inteiro clicável, ponto (640,650) livre, `.rhino-anim` = SÓ a skin do jogador (pódio usa `.podium-anim` — o updateRhinoPreview repintaria o pódio), ids mantidos.
- Versão **1.8.1 nos 4 lugares** (CACHE `furious-rhino-v181`); `NewsSystem.js` no ASSETS do sw.

## 3. Release v1.8.1 — ✅ FECHADA em 16/08

Ritual completo: rules publicadas pelo dono → `config/news` criado (2 avisos no ar) → docs/CHANGELOG sincronizados → 9 suítes verdes → commit `3b57afe` → push → tag `v1.8.1` → GitHub Release → smoke 8/8 em produção → sonda apagada. GitHub Release: https://github.com/Cs-Ave/furious-rhino/releases/tag/v1.8.1

### Opcionais / próximos
- Os 3 do pódio ainda aparecem com o rino original na vitrine — ganham a skin quando cravarem marca NOVA (por design; o doc antigo não tem o campo).
- Desc da Catisquick's Rhino (grátis com texto de façanha) e MecaSilver sem desc — ajustar pelo /?setup quando o dono quiser.
- Leitores de `runs[].g`/`runs[].n` no painel; calibração fina da densidade em campo (docs/04 §8b); `GAME_DESIGN.md` parado na v1.6.0 (agora 3 versões atrás — candidato à próxima sessão).

## 4. Como retomar

```bash
cd /c/Users/crist/MobileGame
git status                        # a v1.8.1 inteira está aqui, sem commit
python -m http.server 3000        # subir de novo (o da sessão de 15/08 foi encerrado)
# http://localhost:3000            → a home nova (pódio real com internet)
# http://localhost:3000/?debug=1   → painel de tuning (cobre o 2º lugar do pódio — é o overlay, não bug)
```

Mockups de referência do design aprovado: `scratchpad` da sessão de 15/08 (`mockup-home-v181-final.html` — temporário; a home real é a referência viva).

## 5. Armadilhas novas de 15/08 (tarde)

| Armadilha | Regra |
|---|---|
| `.rhino-anim` × pódio | `updateRhinoPreview` repinta TODO `.rhino-anim img` — o pódio usa `.podium-anim` de propósito; nunca reutilizar a classe do jogador |
| Contrato do toque | O ponto (640,650) em 1280×720 precisa seguir em área sem `stopPropagation` (asserts 26/27 do e2e-ramp trancam); todo botão novo na home = `stopPropagation` em pointerdown E click |
| `skin` × rename | `setDoc` sem merge: o rename regrava `skin` da cópia local `furious_rhino_best_sent_skin` (mesmo esquema do `scoreAt`) |
| Animação CSS × transform | Animação que anima `transform` (bob) atropela `scaleX(-1)` estático — flip via propriedade `scale` (aconteceu no mockup) |
| e2e-setup 15 vs 17 | O nº de asserts depende do ramo (gerador parado/no ar) — 15 não é regressão |

---

# Handoff anterior — FURIOUS RHINO v1.8.0

**Data:** 15/08/2026 · **Status:** v1.8.0 **RELEASED em produção** (commit `e775625`, tag `v1.8.0`, smoke 5/5) · **Sessão anterior documentada:** v1.7.2

---

## 1. Estado atual

| | |
|---|---|
| Produção (v1.8.0) | https://cs-ave.github.io/furious-rhino/ — **RELEASED 15/08** (push + tag + GitHub Release + smoke 5/5: versão, console limpo, coluna de dias, write com `scoreAt` aceito e sonda removida via `delete-player.mjs`) |
| Working tree | Limpa — só `.claude/`, `Anotacoes.txt` e `Art AI/` ficam locais (decisão do dono); `art2/`, `CLAUDE.md` e `HANDOFF.md` entraram no repo |
| Último commit | `e775625` (v1.8.0) — topo de `origin/main`, tag `v1.8.0` |
| Cache do SW | `furious-rhino-v180` |
| Rules do Firestore | **Publicadas no console em 15/08** (antes do push, ordem correta) — `scoreAt` opcional em `scores/` |
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

### Release v1.8.0 — ✅ FECHADA em 15/08
Tudo do checklist antigo foi feito: rules publicadas no console ANTES do push (dono), commit `e775625` (untracked conforme decidido: art2/ + CLAUDE.md + HANDOFF.md entraram; Anotacoes/.claude/Art AI ficaram), versão já batia nos 4 lugares, push + tag `v1.8.0` + GitHub Release + smoke 5/5 em produção (inclui write real com `scoreAt`, sonda apagada depois). Registry publicado **como estava** por decisão do dono — ciente de que a Catisquick's Rhino está grátis com a desc da façanha antiga e a MecaSilver sem desc (ajustável a qualquer hora pelo /?setup, é só dado). O push rearmou o cron do digest (desativaria ~09/10).

### Opcionais / próximos
- Catisquick's Rhino: desc anuncia façanha mas o acesso é grátis; MecaSilver sem desc — o dono ajusta pelo /?setup quando quiser.
- Leitores de `runs[].g` no painel (medir uso de skins) e de `runs[].n` (fúrias negadas na arena).
- Calibração fina da densidade em campo (guia: `docs/04-referencia-tecnica.md` §8b — exportar do ?debug=1 e fixar no Constants).
- Skin "color" (`gerador-de-sprites/output/color/`) aguardando decisão; skins novas agora saem 100% pelo /?setup.
- Mecânicas por espécie — adiadas.
- Calibrar t6 pós-release; `GAME_DESIGN.md` parado na v1.6.0.

---

## 6. Como retomar

```bash
cd /c/Users/crist/MobileGame
git status                     # limpa — v1.8.0 released (tag v1.8.0)

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
