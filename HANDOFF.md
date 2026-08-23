# Handoff — FURIOUS RHINO v1.8.7

**Data:** 22/08/2026 · **Status:** v1.8.4→v1.8.6 **commitadas local** (sem push) · **v1.8.7 PRONTA no working tree, sem commit** · produção segue na **v1.8.3**

## 0. v1.8.7 — Estado de Alerta (working tree, sem commit)

Ideias **J** (cidade em 3 distritos) e **H** (funil) entregues juntas. Rules NÃO mudam
nesta versão (zero campo, zero coleção — ritual sem console).

- **Motor**: `CITY_DISTRICTS` + `getCityAreaIndex/cityAreaFor/skinFor(x, kind)` —
  parede tem família por distrito (`-suburbio/-vidro/-contencao`; espinho/torre/rampa
  seguem `-city`); roleta com override de pesos por área; Brecha (2025–2200 m) = só
  rampas jump + pombos; portais com ±300 px sem spawn (SEM anchor — evita sombra de
  combo); `WEATHER_SCRIPT` 8→11 faixas; `flyerSpawnY` (banda do zig contém o y de
  spawn — mata o mergulho não-telegrafado).
- **Elenco**: 11 novos (padrões `zig` com telegraph no flip e `shoot` com cap e
  telegraph de tint; tropa em `pair`; dronesent `sentinel` = conta torre e devolve
  dash); 22 SVGs novos + anims no BootScene; legado redistribuído por distrito.
  `POOL_SIZES`: darts 16→24, animals 16→20.
- **A MURALHA (2000 m)**: def nova no slot do boss2 (camadas HIGH→GROUND→MID→HIGH,
  `BOSS_MURALHA` com flag `holo` — telegraph de holofote com elipse de pouso —,
  `rasanteStyle:'k9'`, enrage 45 s); `startFight` chama `muzzleHostiles` (torres e
  atiradores vivos na arena são silenciados — inegociável novo); vitória
  `defeatMuralha` (colapso p/ esquerda, holofotes apagando); herda causa `boss2` e
  letras `e`/`h`. **Cerco realocado**: `CERCO_NET/CERCO_LAYERS` declaradas SEM wiring,
  gatilho = funil com massa pós-2000; medalha `boss2_win` DORMENTE (test=>false).
- **Hazards**: `TimedHazard` (caçamba/hidrante/arco), pool de 4 na cena, spots
  determinísticos (caçambas 1150/1250/1350 m; hidrantes 1500/1650; arcos 1850/1925).
- **Consertos de integração**: `this.on` do TimedHazard sombreava `EventEmitter.on`
  (renomeado `phaseOn`); `CrackedWall.setSkin` normalizava família nova para `''`
  (lista `WALL_SKINS` — as 4 entidades não tinham dono na partição, lição);
  `BOSS2_ENRAGE_MS` morto (fica `MURALHA_ENRAGE_MS`); anims novas no BootScene.
- **Funil (ideia H)**: teto mínimo 2200 com marcos rotulados (viaduto/checkpoint/
  Muralha/rodovia) — a régua das metas da fase.
- **Medalhas**: 22 no total — re-batismos + `dist_1400/1800/2200` + `city_boss_win`.
- Versão **1.8.7 nos 4 lugares** · `CACHE furious-rhino-v187` · TimedHazard + 22 SVGs
  no ASSETS · TuningPanel com pastas "Boss 2 (Muralha)" e "Distritos da cidade" nas
  DUAS listas.
- **Suítes (22/08, todas verdes — TREZE)**: test-stats **101** · test-score 83 ·
  test-challenge 68 · test-skins 93 · test-integrate 49 · e2e-ramp **42** ·
  e2e-boss 16 · e2e-boss2 **14** (Muralha) · e2e-boss3 10 · e2e-special **25**
  (famílias por distrito) · e2e-skins 15 · e2e-setup 17 · e2e-stats 69.
- Metas da fase (medir ~4 semanas pós-release, no funil novo): mediana pós-portão
  ≥1.500 m · ≥1.400 m: 3%→6% · ≥2.000 m: 1%→3% · mortes `boss2` > 6.

---

# Handoff anterior — FURIOUS RHINO v1.8.6

**Data:** 22/08/2026 · **Status:** v1.8.4 + v1.8.5 **commitadas local** (`8575e97`, `8f43c97` + docs `455bc15`, tags criadas, SEM push) · v1.8.6 **PRONTA no working tree, sem commit** · produção segue na **v1.8.3**

> 🚦 **Fluxo de release com 3 portões (regra do dono, 22/08): commit local → testes
> locais dele → publicar produção — cada avanço só com confirmação EXPLÍCITA.**
> Estamos aguardando: portão 1 da v1.8.6 (commit) e portões 2–3 de TUDO (1.8.4→1.8.6).

## 0. v1.8.6 — Arena de Desafios (working tree, sem commit)

Desafios 1v1 e em grupo entre cadastrados. Decisões do dono: melhor corrida em
**pontos** na janela · duração 1/3/7 dias (escolha do desafiante) · **só aceites
entram no placar** · criar exige apelido próprio · teto de 3 desafios criados.

- **Arquitetura**: o desafio é METADADO (coleção nova `challenges/` — doc escrito 1×
  pelo criador; único update possível = mapa `accepted` crescer, trancado por
  `diff().affectedKeys()` nas rules); o **placar é DERIVADO** lendo o `stats/` público
  dos aceitos e recomputando a melhor corrida da janela com `ScoreSystem.runBonus`.
  Zero write cruzado entre jogadores; zero letra nova em `runs[]`. Sem auth o aceite é
  falsificável — modelo de confiança assumido (igual ao resto do jogo).
- **Módulo novo** `js/systems/ChallengeSystem.js` (puras testáveis + rede com caches:
  `chal_cache` TTL 1h via array-contains, `chal_standings` TTL 30min, `chal_seen`
  local). Constantes `CHALLENGE_*` no Constants.
- **UI**: ⚔️ por linha do top 10 (seleção múltipla → barra "Desafiar (N)") + botão
  `#challenge-new` na home · modal de criação (chips + pílulas 1d/3d/7d) · popup de
  convite `#challenge-invite-modal` (1 por boot, adiado se o PWA abrir; recusa é só
  local) · card `#challenge-card` na coluna da Campanha (countdown, 👑 no líder,
  "aguardando fulano"; encerrado <24h vira resultado + `NewsSystem.push('chal:'+id)`).
- **Na corrida**: estacas VERMELHAS dos adversários na marca da melhor corrida deles
  (só `standingsCached` — zero rede na corrida) + toast na largada "⚔️ a bater: X pts
  de Fulano". Nuance no código: estaca marca ONDE (metros), quem decide é PONTOS.
- **Consertos de integração**: `test-integrate` estava 43/6 desde os commits da
  v1.8.5 — causa: `sw.js` com CRLF no working tree (checkout do Windows) × comparação
  de linha exata do `stripSwArtLines`; arquivo normalizado E função blindada contra
  `\r` (gerador-de-sprites/integrate.mjs, comentado).
- Versão **1.8.6 nos 4 lugares** · `CACHE furious-rhino-v186` · `ChallengeSystem.js`
  no ASSETS · script `test-challenge` no package.json.
- **Suítes (22/08, todas verdes — agora TREZE)**: test-challenge **68** (nova) ·
  test-stats **100** · test-score 83 · test-skins 93 · test-integrate **49** ·
  e2e-ramp **42** (asserts novos 26d/26e/26f do card+convite) · e2e-boss 16 ·
  e2e-boss2 13 · e2e-boss3 10 · e2e-special 25 · e2e-skins 15 · e2e-setup 17 ·
  e2e-stats 69.

### ⛔ Para publicar a v1.8.6 (portão 3, no futuro)
1. **Publicar `firestore.rules` no console ANTES do push** — bloco novo `challenges`
   (as rules da v1.8.4 o dono já publicou em 21/08; o bloco challenges é NOVO e sem
   ele todo create/aceite falha em silêncio).
2. Push + tag + GH Release + smoke: criar desafio real entre dois aparelhos, aceite,
   card com placar, estaca na pista.
3. `e2e-stats` NÃO prova as rules do challenges (não escreve nessa coleção) — a prova
   é o smoke.

---

# Handoff anterior — FURIOUS RHINO v1.8.4

**Data:** 21/08/2026 · **Status:** v1.8.4 **PRONTA e testada localmente — NÃO publicada** *(nota de 22/08: v1.8.4 e v1.8.5 foram commitadas local pela sessão dos bosses — `8575e97` e `8f43c97` — com as pendências de teste fechadas: test-stats 99+/0)*

## 0. v1.8.4 — pontuação composta (o que fazer para publicar)

> ⛔ **BLOQUEIO DE RELEASE:** publicar `firestore.rules` no console do Firebase
> **ANTES** do push. A whitelist de `scores` ganhou `scoreM` e o teto do `score`
> subiu para 20000 — com as rules velhas no ar, **todo envio de recorde da v1.8.4
> é negado em silêncio** (o `submit` engole o erro por design).

- **O ranking deixa de ser só distância**: `score` virou o TOTAL (metros + bônus por
  façanha) e nasceu o campo opcional **`scoreM`** com os metros. Doc antigo (sem
  `scoreM`) já é um total válido de bônus zero — **nada foi migrado, ninguém saiu do
  ranking**, e clientes 1.5.0 seguem gravando como sempre.
- Pesos em `Constants.SCORE_WEIGHTS` (parede 5 · morro 5 · torre 15 · animal 3 ·
  camada 25 · fuga 100 · blitz 50 · LENDA 400), teto `bônus ≤ metros`, tudo com
  slider na pasta **🏆 Pontuação** do `?debug=1` — e o exportador agora inclui
  `SCORE_WEIGHTS` **e** `BOSS_RIFLE` (este nunca era exportado desde a v1.7).
- Módulo novo `js/systems/ScoreSystem.js` (puro, testável no node) — **no `ASSETS`
  do `sw.js`**, `CACHE` em `furious-rhino-v184`.
- **Nenhuma letra nova em `runs[]`**: o bônus é recomputável de `w r o a b` + `c` +
  `z`, e o `test-score` tranca a igualdade "ao vivo == recomputado". As 6 letras
  livres seguem reservadas para os bosses futuros.
- **HUD**: Pontuação em destaque (22px) com os metros discretos abaixo; `+N` dourado
  sobe do próprio obstáculo (ancorado no mundo, não na tela) e some em 700ms.
  Tela de fim mostra a conta inteira; distância continua em metros ali.
- **Degrau VOCÊ** do pódio ganhou nome, marca (`2.500 pts · 987 m`) e "sua marca há
  Nd", reusando as classes dos outros três degraus (zero CSS novo).
- **Abertura por veterania**: os 3 obstáculos-lição e os 190 m sem bicho passaram a
  valer só para `attempts < 3` (mesma régua das dicas). Veterano pega a roleta aos
  60 m — medido no teste: 1º obstáculo aos 55 m e **29 animais dentro dos 200 m**.
- **Fallback que salva a base inteira no dia do deploy**: `getRecordPts()` cai para
  `getRecord()` quando a chave nova não existe (o total da era antiga ERA os metros).
  Sem ele, a home pedia "faltam 3001 pts" a quem faltava 501 — pego pelo e2e.
- Suítes (todas verdes em 21/08): `test-stats` **94** · `test-score` **71** (nova) ·
  `test-skins` 93 · `test-integrate` 49 · `e2e-ramp` **39** · `e2e-boss` 16 ·
  `e2e-special` 25 · `e2e-skins` 15 · `e2e-setup` 15 · `e2e-stats` 69.
- ⚠️ `e2e-stats` **não** exercita o write de `scores/` (só `stats/`), então ele passar
  NÃO prova que as rules novas estão publicadas. A prova é o smoke em produção.

> ⚠️ **Estado da árvore em 21/08, 20:45 — DUAS frentes convivendo sem commit.**
> Além da v1.8.4 descrita acima (minhas suítes verdes: `test-score` 72,
> `e2e-ramp` 39/39, `e2e-boss` 16, `e2e-special` 25, `e2e-skins` 15,
> `e2e-setup` 15, `e2e-stats` 69, `test-skins` 93, `test-integrate` 49), a
> árvore recebeu de uma **sessão paralela** a base da v1.8.5 (bosses "O Cerco"
> e "Guardião do Fim"): `BOSS2_*`/`BOSS3_*` no Constants, causas `boss2`/`boss3`
> e as letras `e`/`h`/`l` em `runs[]`, medalha `boss2_win`, `ScoreSystem`
> pontuando as camadas dos três bosses, `FurySystem`/`HunterSniper`/`BossFight`
> mexidos, e `deaths.size() <= 15` na rule publicada.
> **`test-stats` está 92 PASS / 2 FAIL por causa dessa frente**, não da v1.8.4:
> (1) o mapa `deaths` passou a emitir `boss2`/`boss3` e o assert espera as 7
> causas antigas; (2) `CAUSE_LABELS` já tem os dois rótulos e a lista de causas
> do storage ainda não. Fechar essas duas pontas é o que devolve a suíte ao verde.

**Ordem para publicar:** rules no console → `git commit` + push → tag `v1.8.4` →
GitHub Release → smoke (pódio e top 10 em `pts · m`, marca antiga convivendo com
marca nova, `+N` aparecendo na corrida, rank/skin de pódio ainda funcionando) →
apagar sonda se alguma tiver escrito.

---

# Handoff anterior — FURIOUS RHINO v1.8.3

**Data:** 16/08/2026 (docs fechados em 21/08) · **Status:** v1.8.3 **RELEASED em produção** (commit `3e49000`, tag `v1.8.3`, smoke 5/5) — dia com TRÊS releases (v1.8.1 manhã, v1.8.2 e v1.8.3 tarde)

### v1.8.3 (16/08, fim de tarde) — o rank liga de verdade + dardo visível
- **BUG HISTÓRICO consertado**: o SDK firestore-LITE exporta `getCount`, não `getCountFromServer` — o `fetchMyRank`/`anonymousName` falhavam EM SILÊNCIO desde sempre (catch por design): `last_rank` nunca chegava a jogador real, skins de pódio nunca desbloqueavam, "Sua posição #N" nunca aparecia. Descoberto quando o Thomas (#3 real, primeiro a reivindicar pódio) não conseguiu a MecaBronze. Fix: `LeaderboardSystem.countQuery` com fallback duplo. Smoke prod provou: sonda 3002m → rank 4 (Thomas subiu p/ #2 com 4606m no meio do processo!).
- **Vitrine do pódio**: backfill admin pontual (dono, via `!` — script no scratchpad, mesmo esquema do config/news): Ícaroo→1-gold, Thomas→pratagrande (sobrescreveu o robot genuíno por escolha dele), Funku→bronze-2. Recordes novos mantêm o campo sozinhos (a marca 4606 do Thomas veio com skin=robot ANTES do backfill — pipeline v1.8.1 confirmado em produção).
- **Dardo tranquilizante**: 42×15 (+50%), líquido/penacho vermelho vivo + contorno preto; corpo claro preserva o tint dourado do boss; **hitbox intocada** (24×8 no TranqDart, offset 9,3).
- **test-integrate deixou de pinar o registry** (a remoção real da catisquick derrubou 2 asserts — mesmo pecado já corrigido no test-skins/e2e-skins): "builtins presentes" virou "default presente", e o alvo de remoção é dinâmico (`BUILTIN_IDS.find(viva)`).
- Suítes: test-stats 87 · test-skins 93 · test-integrate 49 · e2e-ramp 37 · boss 16 · special 25 · e2e-skins 15 · e2e-setup 17 · e2e-stats 69 — todas verdes.

### v1.8.2 (16/08, tarde) — RELEASED (`a29f3af`, smoke 6/6); v1.8.1 de manhã (`3b57afe`, smoke 8/8)

### v1.8.2 (16/08, tarde) — bugfix da home + remoção de skin
- **`#install-hint` saiu do meio da tela** (só aparecia p/ quem não instalou o PWA — passou batido no smoke da v1.8.1): virou pílula laranja na headrow da Campanha, ao lado do convite. Android = prompt nativo direto; **iOS melhorou**: a pílula abre o `#pwa-modal` com o passo a passo (antes era texto solto). `.share-icon` desescopado (o ícone do modal iOS estava sem estilo).
- **`#invite-btn`**: "Chamar galera", **verde WhatsApp (#25D366)** com glifo SVG inline (zero binário).
- **Dono removeu a "Catisquick's Rhino" via /?setup DURANTE a release** (armadilha conhecida — detectado pelo test-skins 97→93 e e2e-skins vermelho): remoção confirmada como intencional e embarcada. **e2e-skins ficou imune a remoções**: o registry canônico agora usa arte do NÚCLEO (`rhino-run`/`rhino-fire-run`) no lugar de arte de skin real.
- ⚠️ **Lição de encoding**: `Get-Content -Raw | -replace | Set-Content` no PowerShell 5.1 SEM `-Encoding` nos DOIS lados corrompeu os docs (UTF-8 lido como ANSI e regravado) — recuperado via `git show HEAD:arquivo > arquivo` no Bash (byte-fiel) + reedição. **Texto acentuado: sempre Edit/Write, nunca pipeline de texto do PowerShell.**
- Bump v1.8.2 nos 4 lugares; rules NÃO mudaram; suítes verdes (test-skins agora 93 — nº acompanha o registry).

## 1. Estado atual

| | |
|---|---|
| Produção (v1.8.3) | https://cs-ave.github.io/furious-rhino/ — released 16/08 (smoke 5/5: rank de verdade via `getCount`, vitrine do pódio com as skins do backfill, dardo 50% maior, sonda apagada, zero erro de JS) |
| Working tree | Limpa (só `.claude/`, `Anotacoes.txt`, `Art AI/` locais por decisão) |
| Último commit | `3e49000` (v1.8.3) é a release; por cima só commits de documentação — topo de `origin/main`; tags `v1.8.0`…`v1.8.3` |
| Rules do Firestore | **Publicadas pelo dono em 16/08** (antes do push, ordem correta) — `skin` opcional em `scores/` |
| Doc `config/news` | **Criado em 16/08** (via script admin com o login do firebase-tools, rodado pelo dono com `!` — o classificador barrou o assistente, corretamente, por ler credencial): 2 itens no ar; o dono edita no console quando quiser (campo `items`, array de strings; o jogo relê a cada 1h) |
| Docs | `docs/` + CHANGELOG sincronizados com a v1.8.3 em 16/08; **`GAME_DESIGN.md` saiu da v1.6.0 e foi para a v1.8.3 em 21/08** (fúria-carga + FÚRIA TOTAL, escala visual 1,30, parede que desaba, par/escolta de animais, dardo 42×15, seções novas do chefe do portão, das skins e da home v1.8.1, telemetria `f/n/b/q/z/g`, decisões por dados v1.7→v1.8.3 e as 9 suítes) |
| Suítes (16/08, todas verdes) | `test-stats` **87** · `test-skins` **93** · `test-integrate` 49 · `e2e-ramp` **37** · `e2e-boss` 16 · `e2e-special` 25 · `e2e-skins` 15 · `e2e-setup` 17 · `e2e-stats` 69 |

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
- Leitores de `runs[].g`/`runs[].n` no painel; calibração fina da densidade em campo (docs/04 §8b).
- **Frentes maiores agora moram em [`docs/IDEIAS-FUTURAS.md`](docs/IDEIAS-FUTURAS.md)** (criado em 21/08): a radiografia dos dados de 16/08 + as ideias desenhadas (pontuação composta, bosses "O Cerco" e "Guardião do Fim", campanha/capítulos, streaks, desafio por link, faixas novas no funil), cada uma puxável sozinha. **Nenhuma tem versão prometida** — a "v2.0" foi arquivada de propósito pelo dono.
- ~~`GAME_DESIGN.md` parado na v1.6.0~~ — **fechado em 21/08**: sincronizado com a v1.8.3 (ver a linha *Docs* da tabela de estado).

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
