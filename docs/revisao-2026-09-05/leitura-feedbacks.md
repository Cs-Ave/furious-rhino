# LENTE 1 — os três feedbacks dos jogadores, rastreados no código

Base: `C:\Users\crist\MobileGame` (v1.12.0, `Constants.VERSION` em `js/utils/Constants.js:6`). Modo somente leitura; nada foi alterado.

---

## F1 — "Contraste da fase da cidade não está bom, cenário confunde com os inimigos"

### 1. O que a cidade É no código (hora, luz, clima, camadas)

**Hora do dia.** A cidade começa em `WIN_DISTANCE_PX: 40000` (1000 m) — `Constants.js:110`; `getBiomeIndex` clampa em `'cidade'` dali para sempre (`Constants.js:804-806`). O céu segue a curva narrativa em `Constants.js:987-989`:
```
SKY_DUSK_FROM: 32000,   // entardecer 800→1000m
SKY_DUSK_TO: 40000,
SKY_NIGHT_TO: 58000,    // noite fecha 1000→1450m
```
e cicla a cada 600 m a partir de 1450 m (`SKY_CYCLE_START_PX 58000`, `SKY_CYCLE_PX 24000`, `GameScene.skyPhase` `js/scenes/GameScene.js:2219-2235`). Na prática: Subúrbio (1000–1400 m) = anoitecendo (night 0→0,89); Despertar (1400–1800) = noite fechada → amanhecer → manhã → entardecer; Contenção (1800–2200) = entardecer → noite (1900–2050, a Muralha aos 2000 m luta no escuro — `docs/IDEIAS-FUTURAS.md:952`) → amanhecer.

**Luz (tint atmosférico).** `GameScene.updateAtmosphere` `:2249-2257`:
```
const light = 1 - 0.18 * dusk * (1 - night) - 0.45 * night;
const r = Math.round(255 * light);
const gch = Math.round(255 * (light * 0.97 + 0.03));
const bch = Math.round(255 * Math.min(1, light + 0.14 * night));
```
Noite plena → light 0,55 → tint ≈ `0x8c90b0`. Aplicado SÓ em `atmoLayers` (`:1766-1770`: bgClouds, bgMountains, bgFar A/B, bgNear A/B, bgCars, bgFg) + fog (`:1782`) + chão (`:2185` "o chão também escurece ao anoitecer") + pássaros do céu (`:2123`). Comentário `:1764-1765`: "Camadas que recebem o tint atmosférico — NUNCA elementos de gameplay". Regra cumprida: `Animal.js`, `CrackedWall.js`, `Rhino.js` não recebem tint (só `setTintFill` de telegraph).

**Clima.** `WEATHER_SCRIPT` `Constants.js:1003-1010`: 1000–1200 m `'tempestade'` (fog alpha 0,14 + chuva freq 18 + relâmpago branco alpha 0,4 em depth 50 por 140 ms — `GameScene.js:1809, 1815-1816, 1832-1833`), 1200–1400 limpo, **1400–1800 chuva** (o Despertar inteiro), 1800–2200 limpo. Fog em depth −17,6 e chuva −17,4 — atrás do plano de jogo, não velam inimigos, mas somam ruído na mesma faixa.

**Depths** (`GameScene.js:1721-1762, 1780-1799`): céus −20/−19,9/−19,8 · montanhas −19,7 · nuvens −19,5 · far −19/−18,9 · pássaros-céu −18,5 · **bgCars −18,4** · near −18/−17,9 · fog −17,6 · chuva −17,4 · portões/chefes −1 · rampas −0,5 · **inimigos, paredes, espinhos, torres, rino = 0 (default; nenhum `setDepth` em `Animal.js`/`CrackedWall.js`)** · bgFg +3 (só y 660–720) · flashes 50 · HUD 100+.

**Geometria das camadas na tela** (chão em `GROUND_TOP: 620`):
- bgFar: `tileSprite(640, 410, 1280, 420)` → y 200..620 (canvas y + 200; `FAR_BASE = 336` → tela 536)
- bgNear: `tileSprite(640, 490, 1280, 260)` → y 360..620 (canvas y + 360)
- **bgCars: `tileSprite(640, 550, 1280, 120)` → y 490..610** (`:1754-1755`), scroll 0,55 (`:3266`)
- chão: y 620..720

Ou seja: os 130 px acima da linha do chão (490–620) são compartilhados por near + tráfego + TODOS os inimigos terrestres + o fundo das bandas de voo (pombo `fly:[440,520]`, pipa `band:[400,545]`, dronezig `band:[370,555]` — `Constants.js:622-633`).

### 2. O elenco urbano e as cores dominantes (fills dos SVGs em `C:\Users\crist\MobileGame\art\`)

Elenco por distrito (`Constants.CITY_DISTRICTS` `:875-886`):
- **suburbio** `['person','suit','scooter','viralata','gatobeco','pombo','reporter']`
- **vidro** `['car','police','drone','reporter','pipa','helinews','camionete','k9']`
- **contencao** `['plane','pickup','camionete','k9','tropa','dronezig','dronesent']`
- **brecha** `['pombo']`

| SVG | Fills principais | Família |
|---|---|---|
| enemy-person | camisa `#2fb6a8→#1f8a80`, jeans `#4a6da0→#3f5f8a`, pele `#ffd9ae` | teal/azul — OK |
| enemy-suit | terno `#46536b→#333e52`, `#2c3648`, gravata `#d8302f` | **cinza-azul escuro** |
| enemy-scooter | `#e04a35→#b02a1a`, baú `#f6a832`, jaqueta `#4a7de0` | vermelho — OK |
| enemy-car | `#d9402f→#a82418`, vidros `#c7ccd5` | vermelho — OK |
| enemy-police | `#f4f4f6→#d8d9de`, faixa `#464c57` | branco — OK |
| enemy-drone | `#7d8494`, corpo `#4a4f5a→#31353e`, LED `#ff4545`, verde `#59d95c` | **cinza escuro** |
| enemy-plane | `#f0b73a→#d09018`, `#d3402e` | amarelo — OK |
| enemy-pickup / camionete (mesma arte, `tex:'enemy-pickup'` `Constants.js:432`) | `#7f8f42→#586430` oliva, colete `#d9c08a`, `#6a7180` | **oliva escuro** |
| enemy-viralata | `#a06a30`/`#c98b46`/`#e8c79a` | caramelo — OK |
| enemy-gatobeco | `#1c1c22` ×4, `#26262c`, olhos `#ffd24a` | **preto** |
| enemy-pombo | `#8a939f`/`#59616b`/`#aab2bc` | **cinza** (= `CITY.metal 0x8a939f`) |
| enemy-reporter | `#d6453c`, `#ffd24a`, saia `#26262c` | vermelho — OK |
| enemy-pipa | `#d6453c`/`#e8695c`, `#ffd24a`, `#4ad1ff` | vermelho — OK |
| enemy-helinews | `#26262c` ×5, `#2e4a6b` ×3, `#ff4a5e` | **azul-escuro/grafite** |
| enemy-k9 | `#2b2620` ×5, `#54402c`, colete `#7a2620` | **preto-marrom** |
| enemy-tropa | `#232c38`, `#333d49`, `#39444f`, escudo `#9ab4c8`, viseira `#4ad1ff` | **slate escuro** |
| enemy-dronezig | `#33363c` ×4, `#ff4a5e` ×4, `#101216` | **grafite + vermelho** |
| enemy-dronesent | `#33363c` ×4, `#4ad1ff` ×4, `#fff3c4`, `#101216` | **grafite + ciano** |

Contorno: todos usam stroke `#17171b`/`#14161a`; largura 1–2,4 nas pessoas/veículos (person 1.8/1.6/1, suit 1.2/1.6/1.8, car 2/1.6/2.4) e 3–6 nos bichos v1.8.7 (viralata 5.4, k9 6, tropa 6, gatobeco 5.6). Raster 2× e exibição a `(spec.scale || 1.5) / 2` (`Animal.js:46-47`) → traço de 1,6 px vira ~1,2 px no canvas 1280 e ~0,8 px CSS num iPhone de 874 px. **É contorno ESCURO — sobre fundo escuro não separa nada.** Não existe outline/glow/sombra em runtime: `Animal.js` só tem `setTintFill(0xffee88)` (telegraph de tiro, `:188`) e `setTintFill(0xffffff)` (flash do zig, `:124`).

### 3. Cruzamento — causas concretas

**(a) Inimigos cinza-azul-escuro sobre fundo cinza-azul tintado (a causa central).** Paleta do cenário urbano: `TextureFactory.CITY` `js/systems/TextureFactory.js:84-101` (`body 0x3f4a5e, slab 0x55617a, pillar 0x323c4c, metal 0x8a939f, metalDark 0x59616b`); prédios do far `cityBlock(... 0x54617a : 0x475369 ...)` `:3687` e `:3820`; lojas do near 'vidro' `0x39424f` `:3848`; skyline da contenção `0x222b38 : 0x1b2330` `:3876` ("blecaute tático"); sobrados do subúrbio `0x4a3a30 : 0x554238` `:3737`. Com o tint noturno (×0,55/0,565/0,69): `0x54617a` → ≈ `0x2e3754`; `0x39424f` → ≈ `0x1f2537`; `0x1b2330` → ≈ `0x0f1421`; calçada `0x9aa0a6` → ≈ `0x555a73`; asfalto do chão `0x3a4149` (`:2155`) → ≈ `0x202532`. Os inimigos NÃO tintados ficam em `#333e52` (suit), `#31353e` (drone), `#33363c` (dronezig/dronesent), `#232c38` (tropa), `#2b2620` (k9), `#1c1c22` (gato), `#2e4a6b` (heli), `#586430` (camionete) — mesma matiz, diferença de luminância pequena. Pior caso: **Contenção** (1800–2200 m, fundo blecaute + anoitecer 1900–2050): 4 dos 7 do elenco são escuros (k9, tropa, dronezig, dronesent) e o par tropa nasce sempre em dupla (`pair: true` `Constants.js:435`).

**(b) Figurantes humanoides na bg-near, na linha dos pés dos inimigos.** `pedestrian` `:3371-3377` (cabeça r9 + corpo 20×40 + pernas → canvas y 167..252 → tela 527..612, 60 px altos, cores `0x3a4152 / 0x6a4f7a / 0x2f5a6a`) desenhado em `makeNear('cidade')` `:3698-3700`; `runner` `:3716-3728` ("Silhueta FUGINDO… correndo para a direita", tela 530..610) ×5 em `makeNear('vidro')` `:3862-3866` (`0x232c38 / 0x2c2434 / 0x1f3038`). O `enemy-person` é 40×62 × 1,5 = 60×93 px de mundo, mesma anatomia (cabeça redonda + tronco + pernas), pés em 620. **Isso viola o veto que o próprio projeto escreveu para o zoo** (`C:\Users\crist\.claude\plans\vamos-iniciar-um-planejamento-mutable-toast.md:43-45`): "Figurantes da espécie do elenco letal do bioma corrente JAMAIS em bg-near (…) só silhuetas dessaturadas no bg-far 0.15". A cidade (v1.8.7) é anterior ao veto (v1.12) e tem pessoas no near enquanto person/suit/reporter/tropa são elenco letal.

**(c) Tráfego de fundo = veículos inimigos.** `generateCars` `:4344-4384`: carros `96*s` px com carroceria `0xe4573f` (vermelho), `0x3f7ad6` (azul), `0xf2c14e`, `0x5aa469`, `0xd8d8d8` (branco), `0x8a5fc0` + ônibus laranja, vidros `0x9ad7ef`, faróis `0xffe9a8`; ocupam tela y ≈ 520–590 e rolam a 0,55 do scroll. Ligados nos 3 distritos + Brecha: `applyAreaEnvironment` `GameScene.js:2417` `const carsOn = city && !(area && area.cars === false)` — só o deserto declara `cars: false` (`Constants.js:900`). O `enemy-car` (108×46 × 1,25 = 135×57, vermelho `#d9402f`), `police` (branco) e `scooter` (vermelho) ocupam y 562–620 e vêm a 230–260 px/s contra o rino a 300 px/s. Resultado: carros vermelho/branco de tamanho parecido, no mesmo sentido aparente, em duas profundidades a 30 px de distância vertical. O tint noturno escurece mas não dessatura.

**(d) Acentos vermelho/ciano compartilhados entre cenário e inimigo.** Contenção far: janelas de emergência `0xff4a5e` `:3882`; near: strobe `0xff4a5e` + `0x4ad1ff` `:3942-3945`; Despertar far: telão "PROCURADO" `0xff4a5e`/`0x4ad1ff` `:3828-3835`; near: LED das lojas `0x4ad1ff` `:3857`; parede quebrável `-vidro` `ledA: 0xff4a5e, ledB: 0x4ad1ff` `:127`. Inimigos: dronezig `#ff4a5e`, dronesent `#4ad1ff` (o SVG diz: "HOLOFOTE VENTRAL aceso (a luz que procura o rino; o laser-telegraph do tiro)"), tropa `#4ad1ff`, pipa `#4ad1ff`. O telegraph diegético do sentinela é da mesma cor do letreiro atrás dele.

**(e) Faixa de perigo amarelo/preto em obstáculo letal E em prop decorativo.** `spike-tower-city` `:1255-1264` (`0xf2c14e`/`0x23272c`, canvas y 74–90 → tela ≈ 574–590, "a leitura mais urbana que existe, e de quebra reforça 'não encoste aqui'") vs. barreiras jersey do near 'contencao' `:3905-3918` (tarja `0xffd24a`/`0x1f2531` em y 210–222 → tela 570–582, 3 exemplares) e cones `0xf27b3c` `:3921-3931`; a parede `-contencao` também tem `hazardA/hazardB` `:138`. Mesma tarja, mesma altura, um mata e o outro é enfeite.

**(f) Postes.** `tranq-tower-city` `:1969-2018` (poste treliçado `K.metalDark 0x59616b`, caixa `K.metal 0x8a939f`, corpo `K.body 0x3f4a5e`; 84×120 sem escala — `TranqTower.js:12` só `setOrigin(0.5, 0)`) vs. `streetLamp` `0x555b62` `:3352-3360` (tela 420..598), orelhão `0x8a939f` `:3795`, banca `0x4a5058` `:3778`. A torre que atira é um poste cinza entre postes cinza.

**(g) Secundários.** Pombo inimigo (`#8a939f`) voa em 440–520 sobre fachadas cinza; `TimedHazard` (caçamba/hidrante/arco em `HAZARD_SPOTS` 46000–77000, `GameScene.js:2818-2825`) é "ARQUITETURA do distrito" que mata (`:276-277`; `cause 'wall'/'spike'` `TimedHazard.js:35-53`) — não li as texturas, fica como candidato. Pássaros do céu da cidade (`SKY_LIFE.cidade` `:2102`, scale 0,2, y 60–260) são pequenos e longe da faixa — improvável.

### 4. O que o design já diz sobre legibilidade
- `GAME_DESIGN.md:238` — "Regra permanente: **tint atmosférico jamais em elemento de gameplay**." (cumprida)
- `GAME_DESIGN.md:79-83` — lição do dardo: "a arte cresceu 50% (42×15) com líquido e penacho **vermelho vivo** e contorno preto — mas a **hitbox segue 24×8**: a folga visual é perdão a favor do jogador, nunca contra." Precedente de resolver legibilidade na ARTE sem tocar hitbox.
- `GAME_DESIGN.md:235-237` — parallax 0,05/0,06/0,15/0,4/1,5; fg "restrito à faixa abaixo da linha do chão para nunca esconder obstáculo".
- `GAME_DESIGN.md:218-225` — "o inimigo é metade da identidade visual do trecho".
- `TextureFactory.js:79-83` — a regra de paleta da cidade foi pensada para a PAREDE: "o corpo da fachada é um passo MAIS ESCURO que o skyline… o concreto escuro faz a banda âmbar da fresta saltar aos olhos". Nada equivalente foi escrito para os inimigos móveis.
- Plano v1.12 `:40-47` — vetos: "fresta clara sobre corpo escuro… tint atmosférico jamais em gameplay… Figurantes da espécie do elenco letal JAMAIS em bg-near… Luz acesa só em cenário não-letal, paleta quente, nunca especular branco… Lianas/franjas terminam y≤380 (banda de voo é [410,565])".
- Lição em memória (v1.6.0): "no cenário, altura importa mais que desenho" — `FAR_BASE`.

### 5. Alavancas que já existem
1. **`cars: false` por distrito** — campo já lido em `applyAreaEnvironment` (`GameScene.js:2417-2421`); ou alpha-alvo do tween (0,35 em vez de 1). Custo: 1 chave por entrada de `CITY_DISTRICTS`.
2. **`AREA_BACKDROP`** (`GameScene.js:2376-2383`) aponta cada distrito para um par far/near; editar `makeNear('cidade'/'vidro')` removendo `pedestrian`/`runner` (ou movê-los ao far com alpha 0,15, como o plano manda) é local.
3. **Fórmula de luz** (`:2249-2252`): coeficientes 0,18/0,45 e o +0,14 azul — dá para escurecer MAIS o fundo à noite (separa os inimigos não tintados) ou tirar o `ground` de `atmoLayers` na cidade (`:2185`).
4. **`cast` por distrito** (`Constants.js:876-884`): trocar espécies escuras (suit, gatobeco, k9, tropa, dronezig, dronesent, helinews, camionete) por claras onde o céu é noite; o `SPRITE_PARAMS` do estúdio só sobrescreve specs/behavior (`Constants.js:1124-1132`), cor é o SVG (editável à mão; **nunca `export-art --force`**, `CLAUDE.md` regra 7).
5. **Contorno/rim claro**: não existe em runtime. Phaser 3.85 tem `preFX.addGlow()`/`postFX` (WebGL apenas; o jogo tem modo Canvas `?canvas=1` `index.html:55` → sem FX lá). Caminho 100% compatível: halo/stroke externo claro no próprio SVG (ex.: `#f6f4ef` 1,5–2 px a 0,5–0,7), mesma trilha do dardo v1.8.3.
6. **Flash de entrada** reaproveitando `setTintFill`: precedente do `zigFlashUntil` 120 ms (`Animal.js:121-124`) — um piscar branco ao entrar na tela.
7. **Escala visual** `ANIMAL_SPECS.scale` (`Constants.js:409-414, 429-438`) — cara: o Arcade escala o body com o sprite (`Animal.js:52-55`); só o rino tem `RHINO_VISUAL_SCALE` com compensação de hitbox (`Constants.js:57-61`).
8. **Clima**: `WEATHER_SCRIPT` 1000–1200 `'tempestade'` e 1400–1800 `'chuva'` (`Constants.js:1003-1008`) — 1 string cada; a mediana pós-portão morre aos 1.224 m (`Constants.js:861-862`), dentro da tempestade.
9. **Tarja de perigo**: reservar amarelo/preto SÓ para o letal (tirar das jersey `:3912-3915` e da `-contencao` `:138`) segue a regra da própria casa "luz acesa só em cenário não-letal".
10. **Cores de acento**: vermelho `0xff4a5e`/ciano `0x4ad1ff` reservados para inimigo/telegraph; cenário em âmbar (já é a cor do subúrbio/`winOn`).

---

## F2 — "Boss fights todos muito parecidos, sempre sendo o chefe da muralha"

### 1. Onde vivem
`js/systems/BossFight.js` (1 classe, 340 linhas) + `js/entities/HunterSniper.js` (o atirador) + 5 `def` montadas em `GameScene.create` `js/scenes/GameScene.js:93-264` + tabelas em `Constants.js:128-252` + texturas `TextureFactory.generateArmoredSet/armoredPalette` `:1457-1592`. `BossProof.CHEFES` `js/systems/BossProof.js:37-43` deriva os 5 de Constants. Comentário de `BossFight.js:17-18`: "A `def` (…) diz TUDO que muda de um boss para outro — nada de constante do portão hard-coded aqui dentro". `GAME_DESIGN.md:178-185`: "os cinco chefes são **5 instâncias da mesma classe**".

### 2. Tabela de parâmetros por instância

| campo | Portão `'gate'` (`:100-133`) | Muralha `'muralha'` (`:141-165`) | Barreira `'cerco'` (`:174-198`) | Faraó `'farao'` (`:205-227`) | Caçador-Mor `'guardiao'` (`:234-259`) |
|---|---|---|---|---|---|
| anchorX | 40000 (1000 m) | 80000 (2000 m) | 146000 (3650 m) | 188000 (4700 m) | 399800 (9995 m) |
| layers | `['ground','mid','high']` | `['high','ground','mid','high']` | `['mid','ground','high','mid']` | `['mid','high','ground','mid','high']` | `['ground','mid','high','mid','ground']` |
| rifle (camadas restantes → intervalMs/telegraphMs/burst + flags) | `BOSS_RIFLE` 3:1500/450/1 · 2:1200/400/2 mortar · 1:950/350/3 mortar | `BOSS_MURALHA` 4:1500/450/1 · 3:1250/420/2 holo · 2:1050/380/2 holo rasante · 1:900/350/3 holo fan rasante | `CERCO_NET` 4:1500/450/1 rasante · 3:1250/420/2 rasante fan · 2:1050/380/2 rasante fan · 1:900/350/3 mortar fan | `BOSS_FARAO` 5:1200/420/1 · 4:1050/400/2 holo · 3:950/380/3 fan holo · 2:820/350/3 fan holo rasante · 1:700/320/3 fan holo rasante | `BOSS3_RIFLE` 5:1400/420/1 · 4:1200/400/2 mortar · 3:1050/380/2 mortar fan · 2:950/350/3 mortar fan · 1:850/320/3 mortar fan rasante |
| arenaPx | `BOSS_ARENA_PX` 1100 | 1100 | 1100 | 1100 | 1100 |
| gateFaceHalf | 120 | 120 | 120 | 120 | 120 |
| camLockOffsetPx | 1040 | 1040 | 1040 | 1040 | 1040 |
| texturePrefix / paleta | `zoo-gate-armored` / steel | `muralha-gate` / muralha (viaturas azuis + holofote) | `cerco-gate` / escavacao (sacos + rede) | `farao-gate` / egito (arenito/ouro/lápis) | `boss3-gate` / dark |
| hunterTexture | `boss-hunter` | `muralha-hunter` | `boss2-hunter` (**reuso**, `:182`) | `farao-hunter` | `boss3-hunter` |
| posição do atirador | `ax + 58, y 96` (default `BossFight.js:59-61`; nenhuma def sobrescreve `hunterOffsetX`/`hunterY`) | idem | idem | idem | idem |
| enrageMs | 0 | `MURALHA_ENRAGE_MS` 45000 | 45000 literal | `FARAO_ENRAGE_MS` 30000 | 0 |
| rasanteStyle | — (dardo) | `'k9'` | `'k9'` | `'falcao'` | — (dardo) |
| deathCause / título | `boss` / TRANQUILIZADO | `boss2` / DETIDO NA MURALHA | `cerco` / CAPTURADO NA BARREIRA | `farao` / DETIDO PELO FARAÓ | `boss3` / TRANQUILIZADO (`:3914-3920`) |
| hints.how | `'💥 INVISTA na fresta que brilha!'` | **idêntico** | **idêntico** | **idêntico** | **idêntico** |
| onDefeat | `crossGate()` (fogos, confete, 2 toasts, skin) | `defeatMuralha()` (tombo + 3 flashes `0xfff3c4`) | `defeatCerco()` (tombo + 2 toasts, **sem flash**) | `defeatFarao()` (tombo + 3 véus `0xe8c98a`) | `legend = true; endGame(true)` (cutscene LENDA) |
| pontos | bossLayer 25/cam. + escape 100 (+blitz 50) | +150 `boss2` | +150 `cerco` | +250 `farao` | legend 400 |

### 3. O que é IGUAL (estrutura)
- **Alvo**: canvas 240×620 do chão ao teto, "não existe 'por cima'" (`BossFight.js:161-163`; `TextureFactory.js:1441-1443`); as bandas usam as MESMAS frações `CRACK_HEIGHTS` da parede comum (`BossFight.layerBounds :95-103`; `TextureFactory.js:1600-1609`). `TextureFactory.js:1479-1481`: "os bosses seguintes reusam a mesma estrutura (pilares, bandas, plataforma, canvas 240x620) trocando só a pele e a ordem de quebra".
- **HP = camadas**; quebra só com `smash && aligned` (`:169-178`); erro = `bounce(1)` + clang + flash; acerto = `bounce(0.6)` (`:292`); knockback fixo `BOSS_KNOCKBACK_VX/VY/MS 3000/-360/650` para os 5 (`:298-304`); `BOSS_LAYER_COOLDOWN_MS 450`; sem corpo físico (clamp `:164`).
- **Mira/HUD**: glow 152×120 ADD + moldura 6 px `0xffd24a` pulsando 380 ms (`:65-77, 257-264`); pips 🛡️ (`:83-86`) — iguais nos 5.
- **Câmera/arena**: `stopFollow` + tween para `anchorX − 1040` (`:211-219`); luta começa a `anchorX − 1100`; `muzzleHostiles(anchorX−1500, +500)` silencia TUDO (`:227-229`) → arena sempre vazia.
- **Atirador**: mesma máquina cooldown→telegraph→tiro (`HunterSniper.js:83-142`), `BOSS_SHOT_SPEED 800` para todos (`Constants.js:148`), laser vermelho piscando (`:144-154`) ou cone holo (`:162-183`), regra do alternado "holo > mortar > rasante; ímpar = rajada" (`:110-129`). O rasante é "O MESMO dardo, reskinado" (`:264`).
- **Áudio**: `playBossHorn` único (`AudioSystem.js:416`), `playBreak`/`playFanfare`/`playSqueal` nos 5.
- **Vitória**: `createExplosion(gx, GT−110)` + 3× `createBreakParticles` + `shake(320, 0.014)` copiados literalmente em `crossGate :3392-3396`, `defeatMuralha :3457-3461`, `defeatCerco :3513-3517`, `defeatFarao :3553-3557`; tombo `angle −96..−78 / 900 ms` nos três do meio.
- **Derrota**: sempre "dardo tranquilizante" (`playTranqSleep :4132-4136`); só o título muda.
- Até os rótulos confundem: `ScoreSystem.js:139` `add('🕸️ Camadas do Cerco', boss2Layers…)` e `:146` `'🕸️ Cerco vencido'` na vitória da MURALHA; `Constants.js:36` `boss2: '🕸️ Capturador'` (apontado como M1 em `IDEIAS-FUTURAS.md:1385-1394`).

### 4. O que é DIFERENTE
- Pele do portão (`armoredPalette` `:1512-1592`: steel/muralha/escavacao/egito/dark + floreios `cars/searchlight`, `sandbags/net`, `glyphs/torch`).
- Sprite do atirador (4 artes + 1 reuso; todos rig 64×72 — `ArtManifest.js:84-90, 114-115, 138-139`).
- Quantidade/ordem de camadas (3/4/4/5/5) — "a repetição é o que faz a luta durar mais sem aumentar a altura da cerca" (`TextureFactory.js:1454-1456`).
- Tabela de ms e combinação das 5 flags (`burst/mortar/holo/fan/rasante`); enrage 0/45/45/30/0; textura do rasante.
- Festa (portão fogos; Muralha/Faraó flashes; Barreira só toasts; Guardião cutscene).

### 5. Mecânica ÚNICA por chefe
- **Portão**: ordem monotônica chão→meio→alto; único com blitz (`SCORE_BLITZ_MAX_S 20`); único que troca o mundo (cidade). Bloqueio da fúria na arena (`BOSS_BLOCKS_FURY`) vale para a lista toda, não é dele.
- **Muralha**: estreia o `holo` (telegraph = cone + elipse no chão, `HunterSniper.js:162-183`), rasante K9, abre no alto. O holo foi reaproveitado pelo Faraó, deixou de ser único.
- **Barreira**: rasante desde a 1ª camada e mortar só na última; a "rede" é só textura (`TextureFactory.js:1631-1640` "só textura — o perigo real são as redes disparadas pelo rifle"). Nada mecanicamente próprio.
- **Faraó**: 5 camadas, cadência 700 ms, enrage 30 s, rasante-falcão. `Constants.js:230`: "Sem mortar de propósito: o holo JÁ é o tiro em arco". Identidade = aritmética (`IDEIAS-FUTURAS.md:1346`: "o Faraó é o mais derivativo (identidade = aritmética + 2 padrões reskinados)").
- **Guardião**: palíndromo + mortar/fan/rasante, sem holo; vencer = LENDA.

### 6. Por que o jogador sente "sempre o chefe da muralha"
1. Os 5 SÃO literalmente uma muralha 240×620 com bandas nas mesmas 3 alturas, mesmo glow amarelo, mesmos pips, mesma câmera travada à esquerda do alvo, mesmo atirador no mesmo ponto, mesma buzina e a mesma frase `'💥 INVISTA na fresta que brilha!'`. O que muda é pele + nome.
2. Verbo único (alinhar altura + investir, quicar, repetir) — o próprio doc reconhece o limite: `IDEIAS-FUTURAS.md:1343-1349` "vira monotonia quando colapsa em 'o mesmo, mais rápido'… A próxima luta que for só 'mais rápida' cruza a linha".
3. O arsenal é um dicionário de 5 flags; a variação entre chefes é uma coluna de ms — "mais rápido" não lê como "diferente".
4. O chefe não se move, não tem fases visíveis, a arena é o mesmo corredor de 1100 px (`muzzleHostiles` esvazia tudo).
5. O feedback de dano é idêntico (explosão + partículas + pip apaga + `setTexture(prefix-N)`).
6. Dados: quase ninguém passa do portão — `IDEIAS-FUTURAS.md:388-391` (29/08): Portão 5 chegadas/5 lutas/1 vitória; "Muralha em diante 0 / 0 / 0"; `:396` "a Muralha… segue invicta na história do jogo". Provavelmente o jogador viu o Portão N vezes (que já é uma "muralha" de aço com faixa) e talvez a Muralha 1×; e o Portão **nunca varia entre encontros** (mesma ordem, sem enrage, dicas só nos 2 primeiros — `BOSS_HINT_MAX_ENCOUNTERS 2`).

### 7. Ganchos existentes para variar sem reescrever
1. **`def.hunterOffsetX / hunterY`** já são lidos (`BossFight.js:59-61`) e nenhum chefe usa: mover o atirador (no chão, mais alto, mais perto) muda toda a geometria dos tiros a custo zero.
2. **Tabela `rifle` por camadas restantes + flags booleanas**: o dispatcher é o `if/else` de `HunterSniper.js:115-129`; uma flag nova (ex.: `sweep` — holo varrendo a arena em vez de mirar; `dual` — duas bocas) é local e continua nos sliders do `?debug=1` (tabelas mutáveis, `Constants.js:149-150`).
3. **`layers` com alturas repetidas + `positionGlow()`** (`:250-265`): um chefe cuja fresta MIGRA por tempo (não por quebra) é reposicionar `layerIdx`/glow por timer — a "dupla blindagem" visual já suporta banda meio-quebrada (`TextureFactory.js:1606-1615`).
4. **`enrageMs` + `currentConfig(layersLeft, fightMs)`** (`HunterSniper.js:73-80`): hoje 1 degrau; indexar por fase de tempo é uma função pequena. M3 do IDEIAS já pede "enrage ancorado na 1ª camada" para o Faraó (`:1410-1414`).
5. **`RASANTE_TEX/RASANTE_TINT`** (`HunterSniper.js:31-32`) — mapa extensível (`holoStyle`, `burstStyle`) para projéteis por chefe.
6. **`onDefeat`/`hints`/`isBypassed`** já por def — os `defeat*` são cópias; extrair helper e dar a cada chefe a encenação da fase seguinte (`IDEIAS-FUTURAS.md:1350-1353` "toda vitória de boss encena a fase seguinte"; Barreira é "a única vitória muda").
7. **`arenaPx`, `camLockOffsetPx`, `gateFaceHalf`** por def — arena mais curta/câmera diferente = 1 número.
8. **`TimedHazard` pool** (`GameScene.js:278-283`, `HAZARD_SPOTS :2818-2840`): uma armadilha temporizada (hidrante/arco/flecheira) plantada em `anchorX − 600` é 1 linha de tabela — hoje os spots ficam de propósito "longe das arenas" (`:2826-2827`), decisão consciente a rever.
9. **`muzzleHostiles`** (`BossFight.js:227-229`) — deixar UM atirador de distrito vivo (dronesent) na arena do Faraó muda o jogo; contraria a "INEGOCIÁVEL da v1.8.7" (`:221-226`), então é decisão de design, não de código.
10. **Telegraph por estilo**: `drawLaser` vs `drawHoloTelegraph` — um `def.telegraphStyle` é local no `HunterSniper`.
11. **Texturas paramétricas** (`armoredPalette` flags) — visual já pronto para variar.
12. **Doutrina M1–M6** já desenhada em `docs/IDEIAS-FUTURAS.md:1383-1456` (M2 blitz visível/estacas de boss conhecido; M3 vitória da Barreira, Faraó enrage na 1ª camada, Guardião com `holo` na 3ª; M6 "Replay do Confronto"). Réguas em `:1365-1381` (mortes/chegadas 15–40%, tempo de luta 10–25 s).

---

## F3 — "Pop-ups maiores que a tela no celular (game over no iPhone 17 Pro: botões embaixo, precisa rolar) e pódio mundial top 10 com nome desalinhado dos pontos"

### 1. Base do viewport (`C:\Users\crist\MobileGame\index.html`)
- `:5` `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">`
- `:93-104` body `height: 100vh; height: 100dvh; overflow: hidden; touch-action: none`
- `:78-79` PWA `apple-mobile-web-app-capable` + `black-translucent`
- Phaser `Scale.FIT + CENTER_BOTH` (`js/game.js:203-204`); todos os overlays são DOM `position: fixed`, independentes do canvas.
- `env(safe-area-inset-*)` só em `.touch-guides` (`:328`), `#start-screen` padding-left (`:360`) e `.start-footer` (`:1269, 1402, 1412, 1416`). **Nenhum modal usa.**
- Media queries existentes: `(max-height: 500px)` `:1262-1384` → home, HUD `#ui/.score` e `.modal-wide/#mystats`; `(max-height: 500px)` `:1807-1812` → só `#crash-overlay`; `(orientation: portrait)` `:1827`; `(max-height: 380px)` `:2415`; `(max-height: 340px)` `:2433`; `(max-width: 560px)` `:2437` `.bar-row`. **Nenhuma toca `#game-over`, `#game-win`, `.modal` (não-wide), `#ranking-list`, `#nickname/#pause/#pwa`.**

### 2. `#game-over` — a causa
CSS `:215-273`:
```
#game-over { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  padding: 22px 30px; ... min-width: 280px; max-height: 88vh; overflow-y: auto; }
#game-over h1 { font-size: 26px; margin-bottom: 10px; }
#game-over p { font-size: 15px; margin: 5px 0; }
#game-over .final-score { font-size: 20px; }
#game-over button { margin-top: 20px; padding: 12px 30px; font-size: 16px; }
```
Markup `:2465-2484`: h1 → p Distância → `#final-points` (20 px bold) → `#final-breakdown` (13 px, line-height 1.5, `white-space: pre-line` `:1661-1668`; 1 linha por evento pontuado: `ScoreSystem.breakdown` `js/systems/ScoreSystem.js:123-151` → `GameScene.js:3898-3899` `detail.lines.map(...).join('\n')` — 4 a 7 linhas numa corrida boa) → `#attempt-message` (`.attempt-line min-height: 16px` `:1619-1623`) → `#gate-escape-message` (**`min-height: 18px` mesmo vazio** `:164-168`) → `#record-message` → `#death-tip` (14 px, `max-width: 520px`, dica + "Faltaram Xm para o seu recorde." `GameScene.js:3937-3947` — 2 linhas) → `#online-status` (min-height 18 `:1629-1634`) → `#medal-message` (min-height 18 `:1636-1641`) → `#share-status` (min-height 18 + margin 4 `:1643-1649`) → `.btn-row` (margin-top 8) com 2 botões (`margin-top: 20px; padding 12px 30px`).

Estimativa de altura: 44 (padding) + ~40 (h1) + ~29 + ~30 + 19,5·N + 8 + 21 + 23 + 23 + 22–44 + 23 + 23 + 26 + 8 + 64 (botões) ≈ **376 px + 19,5·N** (N = linhas do breakdown) → 455 px com N=4. Teto no iPhone 17 Pro em paisagem: 0,88 × 402 = **354 px**. Logo o overlay rola SEMPRE nessa tela, mesmo sem breakdown, e os botões (últimos do fluxo) ficam abaixo da dobra. Não é `overflow: hidden` (seria pior); é excesso de altura em px fixos + 4 `<p>` com `min-height` reservando ~80 px de ar mesmo vazios + **ausência de qualquer compactação `@media` para `#game-over`** (o `(max-height:500px)` compacta a home e o `.modal-wide` `:1347-1383`, e o crash-overlay `:1802-1812` — "tudo encolhe para o botão 'Voltar ao início' NUNCA ficar fora da tela" — mas não o fim de corrida).

Agravante iOS Safari (não-PWA): `88vh` usa o viewport GRANDE (barra recolhida); em paisagem com a barra de abas visível a área útil é menor que 100vh, e um box centrado no layout viewport pode ficar com o topo atrás da barra — a rolagem interna não recupera isso. Só o `body` tem `dvh` (`:98`); o modal não. Provável, não medido.

`#pause-btn/#mute-btn` (`:1699-1723`, z 250) continuam por cima do `#game-over` (z 200).

### 3. `#game-win` — bug latente
`:276-289`: `padding: 40px; min-width: 300px` e **sem `max-height`/`overflow`** → se não couber, corta sem rolagem. Usado só na LENDA: `showEndOverlay` `GameScene.js:4126-4128` `document.getElementById(this.won ? 'game-win' : 'game-over').style.display = 'block'`.

### 4. `.modal` genérico (`:1482-1520`)
`position: fixed` centrado; `padding: 26px 34px; min-width: 320px; max-width: 90vw; max-height: 85vh; overflow-y: auto` → teto de 342 px no iPhone → também rola. Usado por `#ranking-modal`, `#nickname-modal`, `#challenge-create-modal`, `#challenge-invite-modal`, `#mystats-modal` (+`.modal-wide`), `#medals-modal` (**markup morto** — nenhum JS referencia `medals-modal/medals-list`), `#skins-modal` (+`.modal-wide`), `#pwa-modal`, `#pause-modal`. `openModal/closeModal` = `display: block` + `body.modal-open` (`GameScene.js:797-805`).

### 5. Top 10 — o desalinhamento
Markup `:2621-2631`; CSS `:1532-1560`:
```
#ranking-list li { display: flex; justify-content: space-between; gap: 24px; padding: 4px 10px; font-size: 16px; }
.rank-right { display: flex; align-items: baseline; gap: 8px; white-space: nowrap; }
```
Pintura `GameScene.openRanking` `js/scenes/GameScene.js:1002-1039`:
```
name.textContent = `${i + 1}. ${entry.name}`;
right.className = 'rank-right';
score.textContent = ScoreSystem.fmtScore(entry);   // "1.234 pts · 987 m" OU "987 pts"
if (days[i] !== null) { hold.className = 'rank-days'; hold.textContent = days[i] === 0 ? 'hoje' : `há ${days[i]}d`; right.append(hold); }
if (entry.id && entry.id !== myId) { chBtn.className = 'challenge-btn'; chBtn.textContent = '⚔️'; ... right.append(chBtn); }
li.append(name, right);
```
Causas:
- Cada `li` é um flex INDEPENDENTE com `space-between` — **não há coluna compartilhada**: o x onde começa "pts" é decidido linha a linha pela largura do bloco direito.
- O bloco direito tem largura VARIÁVEL: `fmtScore` (`ScoreSystem.js:180-186`) devolve `"987 pts"` quando pts == m e `"1.234 pts · 987 m"` caso contrário; `.rank-days` ("hoje"/"há 12d") é opcional; o ⚔️ existe só para os OUTROS (a linha `.me` não tem, e fica mais à direita que as vizinhas).
- O nome (`span` sem `white-space: nowrap`, sem `max-width`, sem `text-overflow`) pode quebrar em 2 linhas: com `min-width: 320px` − 68 de padding = 252 px úteis, "10. NomeDeDoze" + 24 de gap + "1.234 pts · 987 m há 3d ⚔️" não cabe; `align-items` default (stretch) + `baseline` só dentro do `.rank-right` → nome em duas linhas com pontos alinhados ao topo. O pódio da home TEM truncamento (`.step .pname { white-space: nowrap; max-width: 150px; overflow: hidden; text-overflow: ellipsis }` `:490`, e 100 px em `:1291`); o top 10 não.
- Altura: h2 (24 + 14) + 10 li × ~27 = 270 + `#ranking-me` + `#ranking-status` + `#challenge-bar` + botão (14 + 40) ≈ 480 px > 342 → rola no celular.

### 6. Lista completa dos overlays/modais e a estratégia de layout de cada um

| Overlay | CSS | Estratégia | z |
|---|---|---|---|
| `#ui` HUD | `:118-125` fixed top-left; compacta em ≤500 px (`:1275-1277`) | px fixos + media | 100 |
| `.touch-guides` | `:325-336` fixed bottom + safe-area; pointer-events none | — | auto |
| `#start-screen` (home) | `:348-368` fixed inset 0; flex column; grid 2 colunas; `overflow: hidden`; 3 media de altura (500/380/340) escondendo partes | encolher e esconder | 300 |
| `#game-over` | `:215-273` fixed centrado; `max-height 88vh; overflow-y auto`; sem media | rolar | 200 |
| `#game-win` | `:276-289` fixed centrado; **sem limite/overflow** | nenhuma | 200 |
| `.modal` (9 usos) | `:1482-1520` fixed centrado; `85vh; overflow auto; max-width 90vw`; sem media (só `.modal-wide` compacta `:1349-1383`) | rolar | 500 |
| `#mystats-modal`/`#skins-modal` | `.modal-wide` `min-width: min(560px, 92vw)` `:1038-1041`; grade de skins 150 px/img 125×83 `:1198-1223` | rolar + compacta em ≤500 | 500 |
| `#victory-banner` | `:1683-1697` fixed top 30 %, `clamp(44px,10vw,92px)`, pointer-events none | — | 180 |
| `#rotate-overlay` | `:1814-1829` fixed inset 0, flex, só em portrait; **acima do game-over (200), abaixo dos .modal (500)** — em retrato o game-over some atrás do "Gire o celular", mas ranking/pausa ficam por cima; `docs/INVESTIGACOES.md:175` (H3): em retrato "o jogo continua rodando por baixo" | — | 400 |
| `#crash-overlay` | `:1744-1812` fixed inset 0 flex; card `max-height 88vh; overflow auto` + media ≤500 compacta | rolar + compactar (o único fim de corrida com compactação) | 900 |
| `.home-toast` | `:936-958` fixed top 14 %, nowrap | — | 700 |
| `#install-hint` | `:1432-1438` absolute; top alinhado por JS | — | 2 |
| `#pause-btn`/`#mute-btn` | `:1699-1723` fixed top-right; reposicionados por `alignHudButtons` | — | 250 |
| Toasts Phaser (`showToast`) | coordenadas do canvas (escalam com FIT) | — | canvas |
| `#stats-page`/`#setup-page` | `body.stats-mode/setup-mode` rolável (`:2075-2089`, `:1835-1849`) | página | — |
| TuningPanel (lil-gui, `?debug=1`) | top 140 px (`:129`) | — | — |

### 7. Alavancas (precedentes já no arquivo)
- Bloco `@media (max-height: 500px)` para `#game-over`, `#game-win` e `.modal` — molde exato do `#crash-overlay` (`:1807-1812`) e do `.modal-wide` (`:1347-1383`, "Celular em paisagem: 390px de altura… compactar faz caber o dobro").
- `#game-over p:empty { display: none }` (ou `min-height: 0`) — devolve ~80 px dos 4 `<p>` reservados.
- `max-height: min(88vh, 88dvh)` / `calc(100dvh - 24px)` no modal (o body já usa `dvh` `:98`); `#game-win` herdar `max-height/overflow` do `#game-over`.
- Botões: `margin-top: 8px`, ou `.btn-row` sticky no rodapé do box para ficarem sempre visíveis.
- Top 10: `li { display: grid; grid-template-columns: minmax(0,1fr) auto auto }` (ou `<table>`), nome com `min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis` (mesmo padrão de `.step .pname`), `font-variant-numeric: tabular-nums`, e um placeholder invisível do ⚔️ na linha `.me` para a coluna não pular.
