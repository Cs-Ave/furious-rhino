# LENTE 2 — Os instrumentos de dados (leitura somente)

Arquivos lidos: `tools/radiografia.mjs` (casca) → `js/stats/RadiografiaCore.js` (núcleo, 1220 linhas), `tools/investiga.mjs`, `js/stats/StatsDashboard.js`, `js/utils/StorageManager.js`, `js/systems/StatsSystem.js` (montagem do doc), `js/systems/BossProof.js` (CHEFES), `firestore.rules`, `docs/IDEIAS-FUTURAS.md` (§2, 22/08, 29/08, Escola, §3, F, K, M), `GAME_DESIGN.md` §Streaks/§Radiografia, `HANDOFF.md`, `docs/CHANGELOG.md`, `docs/INVESTIGACOES.md`.

---

## 1. O dicionário COMPLETO de `runs[]` e o primeiro nível de `stats`

### 1a. Campos-base de cada elemento de `runs[]` — `StorageManager.addRun`, `js/utils/StorageManager.js:582-602`

```js
static addRun(meters, seconds = 0, cause = null, extra = null) {
    const runs = this.getRuns();
    const run = { t: Math.floor(Date.now() / 1000), m: Math.floor(meters) };
    if (seconds > 0) run.s = Math.min(7200, Math.floor(seconds));
    if (cause) run.c = String(cause).slice(0, 8);
    if (extra && typeof extra === 'object') {
      for (const [key, name] of Object.entries(this.RUN_COUNTERS)) {
        const v = Math.floor(Number(extra[name]) || 0);
        if (v > 0) run[key] = Math.min(9999, v);
      }
      if (extra.keyboard) run.k = 1; // separa desktop de verdade de mobile
      if (extra.version) run.v = String(extra.version).slice(0, 10);
      if (extra.skin && extra.skin !== 'default') run.g = String(extra.skin).slice(0, 8);
    }
    runs.push(run);
    while (runs.length > this.RUNS_WINDOW) runs.shift();   // RUNS_WINDOW = 50 (linha 439)
```

| Chave | Tipo | Significado | Observação |
|---|---|---|---|
| `t` | int | epoch em **segundos** do fim da corrida | sempre presente |
| `m` | int | metros (floor) | sempre presente |
| `s` | int | segundos de **relógio de parede** (cap 7200) | omitido se 0 |
| `c` | str ≤8 | desfecho: `wall` `spike` `animal` `dart` `tower` `boss` `boss2` `boss3` `fall` `cerco` `farao` `win` **e `crash`** (v1.9.5, `GameScene.js:442`: `StorageManager.addRun(metros, segundos, 'crash', { loopS, version })`) | rótulos em `Constants.CAUSE_LABELS` (`Constants.js:29-43`); `crash` NÃO tem rótulo lá |
| `k` | 1 | teclado (desktop) | omitido se toque |
| `v` | str ≤10 | versão do jogo da corrida | é o eixo de "era" |
| `g` | str ≤8 | skin usada, se ≠ `default` | |

### 1b. Contadores — `StorageManager.RUN_COUNTERS`, `StorageManager.js:443-506` (zero OMITIDO, cap 9999)

Copiado na íntegra (comentários do próprio arquivo):

```js
static RUN_COUNTERS = {
    w: 'wallsBroken',   // paredes trincadas quebradas
    r: 'rampsSmashed',  // rampas destruídas na investida
    o: 'towersDowned',  // torres derrubadas
    a: 'animalsHit',    // animais atropelados
    j: 'jumps',         // pulos
    d: 'dashes',        // investidas que SAÍRAM
    x: 'dashesWasted',  // investidas pedidas durante o cooldown (frustração)
    p: 'pauses',        // pausas (inclui trocar de aba)
    f: 'specialsUsed',  // ativações do especial FÚRIA TOTAL (v1.7)
    n: 'furyDeniedBoss', // ativações da fúria NEGADAS na arena do boss (v1.8)
    b: 'bossLayersBroken', // camadas do portão blindado quebradas (0-3, v1.7)
    q: 'bossBounces',   // quiques no portão (atrito com o loop da luta)
    z: 'bossFightS',    // segundos de luta contra o boss (0 = nem chegou lá)
    e: 'boss2LayersBroken', // camadas do boss dos 2000m quebradas (0-4; hoje a Muralha)
    h: 'boss2FightS',   // segundos de luta contra o boss dos 2000m
    l: 'boss3LayersBroken', // camadas do Guardião do Fim (9995m) quebradas (0-5)
    u: 'cercoLayersBroken', // camadas da Barreira da Escavação (3650m) quebradas (0-4)
    y: 'faraoLayersBroken', // camadas do Faraó de Bronze (4700m) quebradas (0-5)
    i: 'loopS',         // v1.9.2: segundos que o LOOP acredita ter rodado (vs `s` de parede)
    zu: 'cercoFightS',   // segundos de luta na Barreira da Escavação (3650m)   [v1.9.5]
    zy: 'faraoFightS',   // segundos de luta contra o Faraó de Bronze (4700m)   [v1.9.5]
    zl: 'boss3FightS',   // segundos de luta contra o Caçador-Mor (9995m)        [v1.9.5]
    qe: 'boss2Bounces',  // quiques na Muralha (2000m)                            [v1.9.5]
    qu: 'cercoBounces',  // quiques na Barreira (3650m)                           [v1.9.5]
    qy: 'faraoBounces',  // quiques no Faraó (4700m)                              [v1.9.5]
    ql: 'boss3Bounces',  // quiques no Caçador-Mor (9995m)                        [v1.9.5]
    fc: 'fatorCurva',    // v1.10: fator da curva do novato ×100 (1-99; ausente = veterano, f>=1)
    cj: 'chargedJumps',  // v1.10: pulos CARREGADOS (segurou >= CHARGED_JUMP_MIN_MS)
};
```

Notas de semântica que o próprio código registra:
- `i` vs `s` (`StorageManager.js:467-475`): "i ≈ s → a distância saltou; i >> s → loop acelerado; i << s → o loop congelou".
- `q` "segue EXCLUSIVO do portão" (linhas 458-459 e 493-494) — baseline de 48 lutas da v1.8.
- Total: **28 contadores + 7 campos-base = 35 chaves possíveis** por corrida. O leitor espelhado é `RUN_LETTER_KEYS` (`RadiografiaCore.js:49-53`, 28 entradas) com `RUN_LETTER_DESC` (`:56-77`); o `test-radiografia` assere que a lista cobre TODAS as chaves de `RUN_COUNTERS` (comentário `:46-48`). O painel decodifica todas desde a v1.9.12 (`StatsDashboard.allRuns`, `:185-216`).

### 1c. Primeiro nível do doc `stats/{playerId}` — `StatsSystem.send()`, `js/systems/StatsSystem.js:192-234`; validado em `firestore.rules:97-130`

```js
const data = {
    attempts: StorageManager.getAttempts(),
    playTimeS: StorageManager.getPlayTimeS(),
    wins: StorageManager.getWins(),
    bestM: Math.min(StorageManager.getRecord(), 10000),
    deaths: StorageManager.getDeaths(), // {t1..t6, wall..tower..fall}
    runs: StorageManager.getRuns(), // últimas 50 execuções {t, m}
    history: StorageManager.getHistory(),
    standalone: Boolean(...display-mode: standalone/fullscreen || navigator.standalone...),
    gameVersion: Constants.VERSION,
    updatedAt: fs.serverTimestamp(),
};
// + data.client = {device, os, osVersion, browser, browserVersion, model, screen, lang, tz}  (linhas 215-224, "9 chaves de 10")
// + data.geo = {country, region?, city?, at?}  (linhas 228-234)
```

Rules (`firestore.rules:97-101`): `keys().hasOnly(['attempts','playTimeS','wins','bestM','deaths','runs','client','geo','history','standalone','gameVersion','updatedAt'])` e `hasAll(['attempts','playTimeS','wins','bestM','deaths','updatedAt'])`; `deaths.size() <= 17` (:110), `runs.size() <= 50` (:113), `history.size() <= 6` (:119), `client.size() <= 10` (:122), `geo.size() <= 4` (:125).

| Campo | Conteúdo |
|---|---|
| `deaths` (`StorageManager.getDeaths`, `:377-384`) | 17 chaves vitalícias: `t1..t6` (tier) + `wall spike animal dart tower boss boss2 boss3 fall cerco farao` (causa). Gravado em `GameScene.js:4020`: `if (!won) StorageManager.addDeath(Constants.getTierIndex(this.rhino.getSprite().x), cause || 'wall')`. |
| Tier | `Constants.getTierIndex(x) { return Math.min(5, Math.floor(x / 8000)); }` (`Constants.js:1079-1081`) → t1 0–200 m, t2 200–400, t3 400–600, t4 600–800, t5 800–1000, **t6 = TUDO ≥ 1000 m** (cidade, deserto e infinito num balde só). |
| `history` (`StorageManager.getHistory`, `:615-630`; caps `:613` `{ clients: 12, geos: 10, versions: 10, days: 60 }`) | `clients{assinatura: n}`, `geos{label: n}`, `versions{v: n}`, `days{'AAAA-MM-DD': { r: execuções, s: sessões, b: melhor marca }}` (60 dias, poda por idade), `firstSeenS`. |
| `bestM` | recorde em metros, cap 10000. |
| Legado v1.3.0 | docs achatados (`deathsT1`, `deathWall`, `device`, `country`…) — o painel ainda os lê (`StatsDashboard.aggregate`, `:1116-1122`). |

**O que NÃO existe no primeiro nível nem em lugar nenhum do doc:** mapa `bosses`; o contador de encontros com o portão `BOSS_SEEN_KEY` (`StorageManager.js:399-410`) é **local, nunca enviado**; `STREAK_BEST_KEY` (`:679`), medalhas (`MEDALS_KEY`), marcos (`MARCOS_KEY`) e contadores de dica (`DEATH_TIP_PREFIX`, `DASH_DENY_HINT_KEY`) também são só locais. A regra nº 2 do CLAUDE.md (nenhum campo novo de primeiro nível) empurra tudo para `runs[]`/mapas existentes.

---

## 2. O que a radiografia calcula — e o que NÃO consegue responder

### 2a. Casca e núcleo
- `tools/radiografia.mjs:42-66`: REST GET paginado (300 × 40 páginas = teto 12k docs/coleção, aviso em `:64`), filtro `/^claude-/` (`:56`), coleções `stats`, `scores`, `challenges` (`:70-74`), `radiografia({stats, scores, challenges}, { nowS, origem: 'cli' })` (`:76`). Stateless por contrato.
- `tools/investiga.mjs`: só `stats` → `flattenRuns` → 5 DETECTORES de integridade (`:36-72`: `D1-velocidade` (>35,16 m/s), `D2-sem-interacao` (m≥1000 e <0,5 pulo/100 m), `D3-vitoria-sem-chefe` (win com 0 camadas de 21), `D4-relogios` (|i−s|/s > 30%), `D5-arena-sem-quebra` (z>0, 0 camadas, m>1050)); snapshot em `tools/snapshots/investiga-AAAA-MM-DD.json` (`:25`, `:221-230`). **A pasta `tools/snapshots/` não existe no repositório** — nenhuma coleta foi gravada com `--salvar`, logo o diff (`:154-167`) nunca rodou. Nenhum detector é de usabilidade/UI.

### 2b. As 14 seções de `RadiografiaCore.radiografia()` (`RadiografiaCore.js:240-663`)

| # | Seção (linhas) | O que calcula | Corte |
|---|---|---|---|
| 1 | `totais` :260-274 | jogadores, execuções (Σ attempts), fugas (Σ wins), horas, ranking, recorde, maiorBestM, corridasJanela, docsComRuns, docsComHistory | vitalício por aparelho |
| 2 | `funil` :277-297 | `bestM ≥ marca` (jogadores) e `m ≥ marca` (corridas) nas `FUNIL_MARCAS = [100,200,300,500,800,1000,1400,2000,3000,5000,10000]` (:226); `posPortao` (n, mediana, p90, máx de `m ≥ 1000`); top5 bestM | **não tem 2200, 3650, 4700, 9995** |
| 3 | `aquisicao` :300-349 | novos/semana por `firstSeenS` (fallback min `t`); execuções e jogadores/dia nos últimos 14 dias (`history.days`, fallback janela contado); ritmo 7d vs 7d | |
| 4 | `retencao` :352-401 | distDias (1 / 2–3 / 4–7 / 8–14 / 15+), `umDiaSo`, `retorno2oDia`, corridas/sessão (Σr/Σs), coortes por semana de `firstSeenS` com D1/D7/D30 | só docs com `history.days` |
| 5 | `curva` :404-424 | mediana/p90 de `m` por faixa de tentativa (1–5 … 101+) separada por **era A (<1.8.4) / B (≥1.8.4)**; `onboarding13B` | **a única fronteira de era é 1.8.4** — não há corte em 1.10.0 nem 1.12.0 |
| 6 | `mecanicas` :427-440 | média e por-100 m de `w r o a j d x` nas faixas `[0,200) [200,500) [500,1000) [1000,2000) [2000,∞)` da distância FINAL da corrida | sem `c` (mortes) |
| 7 | `investida`/`pausas` :443-458 | precisão proxy `(w+r+o+a)/d` p10/mediana/p90; atrito `x/(d+x)`; corridas com `p` | |
| 8 | `bosses` :461-523 | ver 2c | |
| 9 | `pontuacao` :526-547 | adoção `scoreM`, bônus recomputado (`ScoreSystem.runBonus`), Spearman m×total, cap ativo | |
| 10 | `skins` :550-559 | corridas/jogadores com `g`, pódio `scores.skin` | |
| 11 | `desafios` :562-599 | criados/ativos/expirados, aceite, latência | |
| 12 | `mortes` :602-609 | `porTier` t1..t6 e `porCausa` (11 chaves, inclui `cerco`/`farao` desde v1.9.5) — **Σ do mapa vitalício `deaths`, sem distância** | |
| 13 | `base` :612-639 | versões (gameVersion), aparelhos (client.device), países, standalone, corridas com `k`, ativos 7d/30d por `updatedAt` | |
| 14 | `cobertura` :642-643 | corridas com cada letra > 0 (as 28) | |

Insights R-01…R-17 (`:675-984`): R-01/02 retenção, R-03 aquisição, R-04 ritmo, R-05 deserto pós-2000, **R-06 portão (b1)**, **R-07 boss 2000 m (b2)**, R-08/09 investida, R-10 skins, R-11 versões, R-12/13 pontuação, R-14 arena, **R-15 fúria negada (n)**, R-16 onboarding 1–3, R-17 Δ vs anterior. Baseline congelada `BASELINE_20260816` (`:209-223`).

### 2c. O que existe por chefe hoje (`RadiografiaCore.js:461-523`)

```js
const lutasB1 = runs.filter((r) => r.z > 0);                                                   // Portão: só quem tem cronômetro
const chegadasB2 = runs.filter((r) => r.m >= 2000 || r.e > 0 || r.h > 0 || r.c === 'boss2');
const chegadasBarreira = runs.filter((r) => r.m >= 3650 || r.u > 0 || r.zu > 0 || r.c === 'cerco');
const chegadasFarao = runs.filter((r) => r.m >= 4700 || r.y > 0 || r.zy > 0 || r.c === 'farao');
bosses = {
  b1: { lutas, dist(b 0..3), fullClear (b>=3), medianaS (z), mortes: somaDeaths('boss'), fugasJanela (c==='win'||m>=1000) },
  b2: { chegadas, dist(e 0..4), fullClear (e>=4), medianaS (h>0), mortes: somaDeaths('boss2') },
  barreira: { chegadas, dist(u 0..4), fullClear (u>=4), medianaS (zu>0), mortes: somaDeaths('cerco') },
  farao:    { chegadas, dist(y 0..5), fullClear (y>=5), medianaS (zy>0), mortes: somaDeaths('farao') },
  b3: { corridasComCamada (l>0), medianaS (zl>0), mortes: somaDeaths('boss3'), lendas (c==='win' && m>=10000) },
  furiaUsada (f>0), furiaNegada (Σ n),
};
```

### 2d. O que a radiografia NÃO responde hoje

**Legibilidade na cidade (1000–2200 m) — mortes por causa/tier na faixa:**
- Pelo mapa `deaths`: **impossível**. `t6` engloba tudo ≥ 1000 m (`getTierIndex` acima) e `porCausa` é vitalício sem distância. A cidade, o deserto e o infinito são um único balde.
- Por `runs[]`: o dado existe (`c` + `m` em cada corrida), mas **nenhuma seção do núcleo cruza causa × distância** — a seção 6 (`MEC_FAIXAS` tem `[1000,2000)`) só agrega mecânicas, a 12 só soma `deaths`. O parágrafo do 29/08 ("das 41 mortes em parede, mediana aos 171 m, p25 aos 79 m", `IDEIAS-FUTURAS.md:401-403`) foi conta avulsa, não seção do instrumento.
- No painel: o único cruzamento causa × faixa é o heatmap de `tabDifficulty` (`StatsDashboard.js:393-405`) com `bands = ['0–200','200–400','400–600','600–800','800–1000','1000m+']` e `causeKeys = ['wall','spike','animal','dart','tower','boss','boss2','boss3','fall']` — a cidade inteira cai em `1000m+` (`Math.min(bands.length-1, Math.floor(r.m/200))`) e `cerco`/`farao`/`crash` ficam fora do heatmap (embora `aggregate().causes` os some, `:1096,1143-1144`).
- Sem corte por distrito (1000–1400 viaduto / 1400–1800 / 1800–2000 / 2000–2200): o mais fino que existe é o funil de `bestM` em degraus de 200 m com rótulos `1400m 🚦`, `1800m 🚨`, `2000m 🧱`, `2200m 🛣️` (`StatsDashboard.js:1166-1186`) — conta **jogadores por recorde**, não corridas nem mortes.
- A ideia M já pedia "heatmap com causas `cerco`/`farao` e bandas cortadas nas âncoras (`1000–2000 / 2000–3650 / 3650–4700 / 4700+`)" (M5-d, `IDEIAS-FUTURAS.md:1437-1439`) — não feito.

**Chefes:**
- **Encontros**: para o Portão a radiografia só conta `z > 0` (lutas), não "chegou aos 1000 m" (isso vira `fugasJanela`, que mistura `win` com `m ≥ 1000`); para Muralha/Barreira/Faraó conta "chegadas" pela regra de 4 ramos; para o Caçador-Mor **não há chegadas**, só `l > 0`. Sem **gate de era por `v`** (M5-a, `:1428-1430`): cliente velho que passou dos 2000 m sem a letra `e` vira "chegada com 0 camadas" e deflaciona o full-clear — a própria `notaChefes()` do painel admite ("corrida mais antiga conta chegada e nunca vitória, deflacionando a Taxa", `StatsDashboard.js:1022`).
- **Vitórias**: `fullClear` (b≥3, e≥4, u≥4, y≥5) e `lendas` — existem.
- **Tempo de luta**: `medianaS` por chefe existe (z/h/zu/zy/zl), mas Barreira/Faraó/Caçador-Mor só desde a v1.9.5 (25/08).
- **Qual chefe mata mais**: `mortes` por causa existe (vitalício). Mas mortes/chegadas mistura **vitalício (`deaths`) com janela (`runs`)** — a ideia M5-b registra que por isso "a R-06 já se calou PARA SEMPRE (12÷48 = 25% > 0,15)" (`:1431-1434`). O painel usa o outro critério (mortes na janela, `c === causa`), e os dois instrumentos divergem de propósito (nota `:1022`).
- **Quantos jogadores VIRAM cada chefe: não é calculado em lugar nenhum.** A radiografia conta corridas (`chegadas`), o painel conta corridas (`chegaram`); o `id` está na linha achatada (`flattenRuns`, `:184`) mas ninguém faz `new Set(ids).size`. O único proxy é `funil.bestM` em 1000/2000/3000/5000/10000 (não nas âncoras 3650/4700/9995) e, no painel, os degraus `3600m 🕸️ (a Barreira)` / `4600m 🏺 (o Faraó)` por `bestM` (50 m antes da âncora, jogadores por recorde).
- **O markdown não imprime Barreira nem Faraó**: `buildMarkdown` "### Bosses" (`RadiografiaCore.js:1128-1143`) escreve só Portão (`b1`), "Boss dos 2000 m" (`b2`) e "Guardião do Fim" (`b3`) — `metricas.bosses.barreira/farao` só saem no `--json`. Também não há regra de insight para Barreira/Faraó/Caçador-Mor (só R-06 b1, R-07 b2, R-15 n); as métricas `b_muralha/b_cerco/b_farao` + regras clonando a R-07 (M5-c, `:1434-1436`) não existem.
- **Quiques** (`q qe qu qy ql`): a radiografia não os imprime (só na linha de cobertura); o painel soma por chefe.
- **Distribuição de camadas NA MORTE** (o "proxy de drama" da decisão 4 da ideia M, `:1489-1491`): `dist` é sobre todas as chegadas, não condicionada a `c === causa`.
- **Proxies de frustração** (rage-quit, re-tentativa na sessão, latência pós-morte — M5-e, `:1440-1443`): não implementados; `t`/`s`/`c` bastariam.
- `BOSS_SEEN_KEY` (encontros por aparelho) nunca sobe.

**UI mobile: nada.** Os únicos sinais adjacentes a interface são `k` (teclado), `p` (pausas — "inclui trocar de aba"; desde v1.10.1 o retrato também pausa, então `p` mistura aba/retrato/pausa manual), `client.{device, os, osVersion, browser, browserVersion, model, screen, lang, tz}` e `standalone`. Não há evento de toque em botão, navegação de menu, orientação, toast visto, tempo em menus, taxa de "Jogar Novamente", nem coleção de eventos: o jogo escreve só em `scores`, `stats`, `challenges` (grep `collection(db,`/`doc(db,` em `js/`; `config` é só leitura editorial). O painel `tabAudience` (`StatsDashboard.js:606-641`) mostra dispositivo/SO/navegador/modelo/resolução/país/cidade/fuso/versão — perfil do aparelho, não uso da UI.

**Escola do Rino (bônus para a leitura de 26/09):** nenhuma das 5 métricas pré-registradas está implementada no núcleo. Não há "% de novatos passando 400 m em ≤10 tentativas", "vidas com `j=0` nas 5 primeiras corridas" nem "distribuição de corridas sem `fc`"; a negação do dash em 0–200 m é derivável da tabela de mecânicas (`x/(d+x)` da faixa `0–200`), e a curva por era só corta em 1.8.4 (`flattenRuns`, `:190-198`) — a leitura "por `v`" (≥1.10.0, e ≥1.12.0 pelas zonas de respeito) terá de ser conta avulsa sobre o `--json`/`flattenRuns`. `fc`/`cj` aparecem só na cobertura (`:1202`).

---

## 3. Métricas pré-registradas para 12/09 e 26/09

**Escola do Rino** — `docs/IDEIAS-FUTURAS.md:480-488`, copiada exata:

```
### Métricas pré-registradas (leitura em 2 e 4 semanas, por `v` de corrida)

| Métrica | Hoje | Alvo |
|---|---|---|
| % novatos passando de 400 m em ≤10 tentativas (PRIMÁRIA) | ~? (baseline por `v`) | subir claramente |
| Curva: mediana tent. 16-30 ≥ mediana 1-5 | invertida (126 < 188) | desinvertida |
| Negação do dash na faixa 0-200 m | ~51% | < 30% |
| Vidas com `j=0` nas 5 primeiras corridas | 47% | < 20% |
| GUARDA-CORPO: corridas sem `fc` (veteranos) | — | distribuição INALTERADA |
```

Datas: `IDEIAS-FUTURAS.md:421-422` — "**As métricas pré-registradas abaixo valem — leituras em 12/09 e 26/09, por `v` de corrida.**"; `HANDOFF.md:33` — "**Leituras pré-registradas: 12/09 e 26/09, por `v`.**"; `HANDOFF.md:15` aponta para o §Escola. Corte adicional: `docs/CHANGELOG.md:20` (v1.12.0) — "⚠️ Única mudança que toca spawn: **a leitura da Escola do Rino de 26/09 deve cortar por `v` da corrida** (≥ 1.12.0 tem as zonas)". Ressalva do cético registrada em `:449-451`: "era de código se mede pelo `v` da corrida, nunca por firstSeen (43/73 aparelhos rodam versões velhas)".

**Streaks (F, v1.11.0)** — a única métrica pré-registrada está em `GAME_DESIGN.md:1088-1089`:

> Métrica-alvo (leitura junto com as da Escola, 12/09 e 26/09): os 59% de jogadores de um-dia-só — a alavanca F foi desenhada exatamente para eles.

A ideia F (`IDEIAS-FUTURAS.md:756-764`) só diz "**Impacto** médio-alto (ataca direto os 69% de um dia só)". Não há telemetria de streak: `GAME_DESIGN.md:1085-1086` "Tudo local, zero Firestore: o streak é derivável do `history.days` que já sobe — nenhuma chave nova, nenhum rules bump"; `CHANGELOG.md:31` "Tudo local ao aparelho — nada novo é enviado a lugar nenhum". Ou seja: adoção/comprimento de streak não é mensurável no servidor (`getStreak`, `StorageManager.js:664-677`, roda só no cliente); o efeito só se lê pela retenção da radiografia (R-01 `umDiaSo`, R-02 `retorno2oDia`, coortes D1/D7, `distDias`) — mas `history.days` existe desde a v1.6.1, então o streak é **recomputável offline** a partir do doc por qualquer script (a regra "ontem mantém a chama" está em `:664-677`). Proxy indireto: skins `{streakBest:N}` via `g` e `scores.skin`; medalhas `streak_3/7/30` são locais.

---

## 4. As últimas radiografias documentadas — números-chave

### 16/08 (§2, `IDEIAS-FUTURAS.md:53-189`; congelada em `BASELINE_20260816`)

- `:61-66`: "**51 jogadores** em `stats/` · **1.810 execuções** · **118 fugas** (7% das execuções) · **25,2 h** jogadas · Ranking (`scores/`): 45 com apelido · recorde **5.185 m** (Ícaroo brabo) · **895 corridas** na janela de 50 de 45 jogadores · 34/51 docs com `history.days`"

```
| Marca | Jogadores (bestM ≥) | Corridas (m ≥) |
|---|---|---|
| 100 m | 46 (92%) | 785 (88%) |
| 200 m | 41 (82%) | 634 (71%) |
| 300 m | 34 (68%) | 490 (55%) |
| 500 m | 33 (66%) | 323 (36%) |
| 800 m | 22 (44%) | 129 (14%) |
| 1.000 m 🗽 | 17 (34%) | 61 (7%) |
| 1.400 m | 7 (14%) | 23 (3%) |
| 2.000 m | 5 (10%) | 10 (1%) |
| 3.000 m | 3 (6%) | 3 (0%) |
| 5.000 m | 1 (2%) | 1 (0%) |
| 10.000 m | 0 (0%) | 0 (0%) |
```
- `:84-85`: "Corridas pós-portão: **61** (7% da janela) · mediana 1.224 m · p90 2.336 m · máx 5.185 m."
- `:121-122`: "Dias distintos com corrida, por jogador (42 mensuráveis): **1 dia: 29 (69%)** · 2–3 dias: 6 · 4–7 dias: 7 · 8+ dias: 0 → **31% voltaram ao menos um segundo dia**." Corridas por sessão 4,6 (`:172`).
- §2.7 Boss do portão (`:157-160`): "Lutas na janela: 48 · fugas na janela: 61 · mortes por causa `boss`: **6** · Camadas quebradas (0/1/2/3): **5 / 1 / 1 / 41** · duração mediana da luta: **4 s** · Fúria Total usada em 42 corridas · fúria negada na arena (`n`): **0 registros**"
- "% que viu cada chefe": só via `bestM ≥` acima (1000 m 17 = 34%; 2000 m 5 = 10%).

### 22/08 (`IDEIAS-FUTURAS.md:193-377`, jogo v1.8.7)

Resumo executivo (`:202-206`): "**58 jogadores** (+7) · **1.996 execuções** (+186) · **120 fugas** (+2) · 27,4 h · **61% um dia só** (era 69%) · 39% voltaram · 4,3 corridas/sessão · **5 aparelhos ≥ 2000 m** · mediana pós-portão **1.240 m** · 🟠 201 execuções nos últimos 7 dias vs 638 nos 7 anteriores (32%)."

```
| | Agora | 16/08 | Δ |
|---|---|---|---|
| Jogadores (`stats/`) | 58 | 51 | +7 |
| Execuções | 1.996 | 1.810 | +186 |
| Fugas | 120 | 118 | +2 |
| Horas jogadas | 27,4 | 25,2 | — |
| Ranking (com apelido) | 51 | 45 | +6 |
| Corridas na janela | 981 | 895 | +86 |
| Docs com `history.days` | 38/58 | 34/51 | — |

| Marca | Jogadores (bestM ≥) | 16/08 | Corridas (m ≥) | 16/08 |
|---|---|---|---|---|
| 100 m | 53 | 46 | 873 | 785 |
| 200 m | 45 | 41 | 673 | 634 |
| 300 m | 39 | 34 | 500 | 490 |
| 500 m | 36 | 33 | 319 | 323 |
| 800 m | 23 | 22 | 128 | 129 |
| 1.000 m | 17 | 17 | 56 | 61 |
| 1.400 m | 7 | 7 | 23 | 23 |
| 2.000 m | 5 | 5 | 11 | 10 |
| 3.000 m | 4 | 3 | 4 | 3 |
| 5.000 m | 1 | 1 | 1 | 1 |
| 10.000 m | 0 | 0 | 0 | 0 |
```
- `:238`: "Pós-portão: **56** corridas · mediana 1.240 m · p90 2.589 m · máx 5.185 m (16/08: 61 · 1.224 · 2.336 · 5.185)."
- Retenção `:273`: "(38 mensuráveis): **1 dia: 23 (61%)** · 2–3: 4 · 4–7: 7 · 8–14: 4 · 15+: 0 → **39% voltaram ao menos um segundo dia** (16/08: 31%). Corridas por sessão: 4,3 (16/08: 4,6)."

```
| Coorte (semana) | n | D1 | D7 | D30 |
|---|---|---|---|---|
| 2026-08-03 | 17 | 12% (2/17) | 71% (12/17) | ⚪ |
| 2026-08-10 | 17 | 12% (2/17) | 15% (2/13) | ⚪ |
| 2026-08-17 | 4 | 33% (1/3) | ⚪ | ⚪ |
```
- Bosses `:318-324`: "**Portão (1000 m):** 47 lutas na janela · fugas na janela: 56 · camadas (0/1/2/3): 5 / 1 / 3 / 38 · mediana 4 s · mortes por `boss`: 12 (16/08: 48 lutas, 41 full, 4 s, 6 mortes). **Boss dos 2000 m:** 11 chegadas · camadas (0/1/2/3/4): 11 / 0 / 0 / 0 / 0 · mediana 0 s · mortes por `boss2`: 0. **Guardião do Fim:** 0 corridas com camada · mortes: 0 · LENDAS: 0. Fúria Total usada em 40 corridas · fúria negada em arena (`n`): **2**."
- Mortes `:342-343`: "Por tier: t1 743 · t2 427 · t3 295 · t4 230 · t5 114 · t6 82. Por causa: `wall` 1.094 · `animal` 299 · `dart` 227 · `spike` 225 · `tower` 34 · `boss` 12 · `boss2` 0 · `boss3` 0 · `fall` 0."
- Cobertura `:356`: "`w` 467 · `r` 225 · `o` 61 · `a` 114 · `j` 535 · `d` 543 · `x` 353 · `p` 67 · `f` 40 · `n` 2 · `b` 42 · `q` 8 · `z` 47 · `e` 0 · `h` 0 · `l` 0."
- Achado operacional (R-11, `:367`): "58 de 58 aparelhos (100%) na última visita rodavam < 1.8.4".

### 23/08 (citada na ideia M, `IDEIAS-FUTURAS.md:1315-1326` — não colada como seção)

"59 aparelhos; ~93% das corridas vivem em 0–1000 m (1 boss) e **1,1% acima de 2000 m — para onde existem TRÊS bosses** … Funil por âncora: 1000 m → 18 jogadores · 2000 m → 5 · 3000 m → 4 · 5000 m → 1 · 10.000 m → 0. Portão: 48 lutas na janela, 38 full-clear (79%), mediana **4 s** … Boss dos 2000 m: 11 chegadas, TODAS com 0 camadas e 0 mortes — **clientes pré-Muralha** … a retenção melhorada (56% um-dia-só vs 69%) não é crédito de bosses que ninguém enfrentou".

### 29/08 PÓS-CASCATA (`IDEIAS-FUTURAS.md:381-411`)

"> 86 corridas em v1.9.4+ (25→29/08), sondas filtradas. Amostra PEQUENA"

```
| Chefe | Chegaram | Lutaram | Venceram | Luta média |
|---|---|---|---|---|
| Portão (1000 m) | 5 | 5 | **1** | 4 s |
| Muralha em diante | 0 | 0 | 0 | — |
```
- "**Taxa de vitória do portão: 1/5** (era ~66% na baseline v1.7, 43/65)."; "o Caio Lindão derrubou o portão em **10 s de luta com 2 quiques** (28/08, v1.9.5)"; "**A parede mata cedo**: das 41 mortes em parede, mediana aos **171 m**, p25 aos 79 m"; "62 corridas em 25/08 → **4** em 26/08 → 2 em 27/08 … → 10 em 29/08, **todas já em v1.9.11**"; "Congelamentos (i << s) em DOIS iPads".
- Aqui "Chegaram" são **corridas**, não jogadores; nenhuma radiografia jamais publicou "% de jogadores que viu cada chefe" além do funil de `bestM`.

### Investiga (única coleta registrada) — `docs/INVESTIGACOES.md:97-100`
"**25/08** … Primeira coleta com a v1.9.4 no ar. `D3-vitoria-sem-chefe` e `D1-velocidade` **caíram a zero**; `D5-arena-sem-quebra` caiu de 6 para 2." (sem snapshot em disco).

---

## 5. Como o `/?stats` mostra chefes (aba 🛡️ Chefes, v1.9.12)

`TABS` (`StatsDashboard.js:51-59`): Visão geral, Dificuldade, Engajamento, Mecânicas, **Chefes** (`tabBosses`), Público, Jogadores (só com chave). Filtro de período (tudo/30/7 dias) recorta `runs[]` por `t` (`allRuns`, `:185-216`).

Régua (`:972-978`), casada com `CHEFES` de `BossProof.js:37-43` (âncoras derivadas de `Constants`: `WIN_DISTANCE_PX 40000`, `BOSS2_ANCHOR_PX 80000`, `CERCO_ANCHOR_PX 146000`, `FARAO_ANCHOR_PX 188000`, `BOSS3_ANCHOR_PX 399800`, `PIXELS_PER_METER 40`):

```js
const REGUA_CHEFES = {
  b: { luta: 'z',  quique: 'q',  causa: 'boss'  },   // Portão      1000 m · 3 camadas (BOSS_LAYERS)
  e: { luta: 'h',  quique: 'qe', causa: 'boss2' },   // Muralha     2000 m · 4 (BOSS2_LAYERS)
  u: { luta: 'zu', quique: 'qu', causa: 'cerco' },   // Barreira    3650 m · 4 (CERCO_LAYERS)
  y: { luta: 'zy', quique: 'qy', causa: 'farao' },   // Faraó       4700 m · 5 (FARAO_LAYERS)
  l: { luta: 'zl', quique: 'ql', causa: 'boss3' },   // Caçador-Mor 9995 m · 5 (BOSS3_LAYERS)
};
```

`aggregateBosses(runsArr)` (`:983-1014`), por chefe:

```js
const chegou = runsArr.filter((r) => r.m >= c.m || r[c.chave] > 0 || r[rg.luta] > 0 || r.c === rg.causa);
const lutas = chegou.filter((r) => r[rg.luta] > 0);
return {
  chegaram: chegou.length,
  lutaram: lutas.length,
  venceram: chegou.filter((r) => r[c.chave] >= c.exigidas).length,
  medianaLutaS: mediana(lutas.map((r) => r[rg.luta])),
  quiques: chegou.reduce((a, r) => a + r[rg.quique], 0),
  mortes: chegou.filter((r) => r.c === rg.causa).length,
};
// + furiaUsada (f>0), furiaNegada (Σ n)
```

O que a aba desenha (`tabBosses`, `:1025-1086`):
- 4 cartões: `lutas travadas` (Σ lutaram), `chefes derrubados` (Σ venceram), `mortes em arena` (Σ mortes), `fúrias negadas na arena` (Σ n).
- Tabela `.bosses-table`, colunas: **Chefe** (`nome (m)`), **Chegaram**, **Lutaram**, **Venceram**, **Taxa** (`venceram/chegaram` em %, "—" se 0 chegadas), **Luta mediana** (`s`, "—" se 0), **Quiques**, **Mortes** (corridas da janela com `c === causa`).
- Gráfico de barras "A fúria e as arenas": corridas com Fúria Total × ativações negadas em arena.
- Nota (`:1085`): "Chegada = cruzou a âncora, quebrou camada, marcou cronômetro ou morreu pela causa do chefe (a régua da radiografia). Dados por corrida — janela das últimas 50 por jogador … Os cronômetros da Barreira, do Faraó e do Caçador-Mor existem desde a v1.9.5: lutas anteriores a 25/08 são invisíveis para a coluna de tempo."
- A Visão geral também recebe `notaChefes()` (`:329`, texto em `:1020-1023`) e o funil de `bestM` com marcos de chefe (`:1166-1180`: `2000m 🧱 (a Muralha)`, `3600m 🕸️ (a Barreira)`, `4600m 🏺 (o Faraó)`).

Limitações visíveis no código: não há **jogadores distintos por chefe**; não há **gate de era por `v`** (chegadas de clientes velhos entram com 0 camadas); `Mortes` é de janela (a radiografia usa `deaths` vitalício — divergência assumida); a distribuição de camadas por chefe (que a radiografia tem no JSON) não aparece na aba. Sobrevive ainda um segundo bloco do portão na aba Mecânicas (`:577-596`) com régua diferente — `fights = z>0 || b>0 || q>0`, vitória `b>=3`, mortes `c==='boss'`, **média** (não mediana) de `z` e `q` — ou seja, o painel tem duas contas do Portão que não batem entre si nem com a radiografia.
