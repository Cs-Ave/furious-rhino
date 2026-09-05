# Passe de legibilidade — CIDADE (1000–2200 m) e noite · Feedback 1

Tudo abaixo foi verificado em código (`GameScene.updateAtmosphere`, `TextureFactory` far/near/ground/cars, `art/enemy-*.svg`, `Animal.setType`, `BootScene.preload`) e medido em L\* (CIELAB, 0 = preto, 100 = branco) e em razão de contraste WCAG (Y+0,05)/(Y+0,05). Nada aqui toca spawn, pesos, física ou densidade — respeita o congelamento até 26/09.

---

## 0. Diagnóstico em números (por que "o cenário confunde com inimigo")

**A luz.** `light = 1 − 0,18·dusk·(1−night) − 0,45·night`; tint = (light, 0,97·light+0,03, light+0,14·night). Em noite plena o tint é **#8c90b0** (L\* 60) e MULTIPLICA far/near/cars/fg/chão. Inimigos não recebem tint (regra), mas nasceram já na mesma matiz e no mesmo valor do fundo tintado:

| Par (noite plena) | L\* inimigo | L\* fundo | ΔL\* | Razão WCAG | Leitura |
|---|---|---|---|---|---|
| suit `#333e52` vs skyline `0x54617a`×tint = `#2e3754` | 26 | 23 | 3 | **1,09** | invisível |
| dronezig `#1c1e23` vs skyline contenção `#131827` | 11 | 9 | 3 | **1,06** | invisível |
| tropa `#232c38` vs far contenção `#131827` | 18 | 9 | 9 | 1,25 | ruim |
| k9 manto `#2b2620` vs far contenção | 16 | 9 | 7 | 1,18 | ruim |
| gatobeco `#1c1c22` vs banca (1400 m) `#2a2f3e` | 11 | 20 | 9 | 1,28 | ruim |
| helinews `#2e4a6b` vs skyline vidro | 31 | 23 | 7 | 1,29 | ruim |
| **contorno `#17171b` vs far contenção** | 8 | 9 | **1** | **1,01** | o contorno some por completo |
| pickup `#586430` vs asfalto `#202532` | 40 | 15 | 26 | 2,40 | limítrofe |
| police `#c7ccd5` vs asfalto | 82 | 15 | 67 | 9,5 | referência do que funciona |

Régua de referência: WCAG 1.4.11 (elemento gráfico) exige **≥ 3:1**. Quatro espécies do elenco noturno estão em 1,0–1,3. Na mediana de morte (1198 m, night 0,44, tint `#b3b5c3`) o quadro é o mesmo: suit 26 vs casa do subúrbio 21 → ΔL\* 5.

**Quando é noite, por distrito** (skyPhase): Subúrbio 1000→1400 m escurece de 0 a 0,89; **o ponto mais escuro da cidade inteira é o INÍCIO do Despertar (1450 m, night 1,0)**, que amanhece até 1600 m e fica claro (com chuva) até 1800; Contenção entardece 1800–1900, anoitece até 1,0 exatamente na Brecha (2050 m) e amanhece até 2200. Os testes têm de rodar nesses pontos, não em "1000 m".

**Descoberta de código.** Os 3 pedestres de `makeNear('cidade')` (cor `0x3a4152` ≈ terno do suit) **nunca renderizam**: `switchBiome(5)` chama `startBiomeFade('cidade')` e, no MESMO update, `switchArea(0)` mata o tween e troca a camada B para `suburbio` (zero frames na tela); a chave `rodovia` do `AREA_BACKDROP` não existe mais em `CITY_DISTRICTS`. Os figurantes reais são os **5 `runner()` de `makeNear('vidro')`** — pintados com `0x232c38`, `0x2c2434`, `0x1f3038`: `0x232c38` é literalmente a cor do corpo da tropa.

**bg-cars.** Tile em y=550, carros desenhados nas linhas 30–98 → tela 520–588; veículos-inimigos ocupam 548–620 e humanos de chão chegam a y=518 (tropa 68×1,5). Não existe faixa de y livre: a separação tem de ser por valor/croma/velocidade, não por posição.

---

## 1. Hierarquia de valor — a régua numérica

Regra única: **quanto mais perto de matar, mais contraste**. Valores medidos NA TELA à noite (após tint), em L\*:

| Camada | Faixa L\* à noite | Croma máx. | Observação |
|---|---|---|---|
| 0 Céu | 5–25 | livre | já cumpre (`#0a0e2a`→`#2c3a6e`) |
| 1 Far (skyline/casas) | 8–24 | ≤ 35 % | comprimido e dessaturado (Alto's) |
| 2 Near (calçada/mobiliário) | 10–32 | ≤ 35 % | pontos de luz (lâmpada, vitrine) até L\* 55 se ≤ 8 % da área; **nada com L\* ≥ 60 na faixa y 500–620** exceto ponto de luz |
| 3 Chão | asfalto 12–18, meio-fio ≤ 40, faixa ≤ 46 | ≤ 20 % | sem amarelo |
| 4 Tráfego (bg-cars) | 20–40 | ≤ 45 % | alpha por distrito |
| 5 Letal estático (parede/espinho/torre) | corpo livre; **≥ 1 elemento-assinatura L\* ≥ 75** | — | já cumpre: espinho `#cfd4da` L\* 85, tarja `#f2c14e` L\* 80, fresta L\* 67–69 |
| 6 Inimigo | **silhueta com ΔL\* ≥ 30 vs fundo local (razão ≥ 3:1)** via rim L\* ≥ 80; corpo L\* ≥ 30 preferencial | livre | o rim garante a régua em qualquer fundo |
| 7 Telegraph / projétil | L\* ≥ 90 + matiz reservada | — | já cumpre: flash `#ffee88` L\* 94, dardo branco L\* 100 |

### Como aplicar nas alavancas existentes

**Fórmula de luz (`GameScene.updateAtmosphere`)** — custo P, efeito global (zoo ao entardecer e noite do deserto também). Manter 0,18 e 0,45; **baixar o empurrão azul 0,14 → 0,08**: tint noturno `#8c90b0` → `#8c90a1`. Motivo: o +0,14 azul empurra todo o fundo para a matiz aço-azulada dos inimigos (skyline noturno hoje com 45 % de saturação). Opcional (só se o rim não bastar em algum ponto): 0,45 → 0,50 (fundo −2 L\*). Não recomendo "noite quente/sódio" agora: mudaria a noite do deserto sem dado.

**Paletas far/near (`TextureFactory.generateBackgrounds`)** — custo P. Dessaturar só o FAR (~40 % menos croma), deixar `CITY`/`FACADES` das paredes intactas (a parede ganha separação do horizonte de graça; "mesmo material" continua lendo pelo valor e pela estrutura).

**TABELA DE CORES — fundos, chão, tráfego (atual → proposto)**

| Elemento | Onde | Atual | L\* noite | Proposto | L\* noite | Motivo |
|---|---|---|---|---|---|---|
| Skyline A (cidade/vidro) | `makeFar('cidade'/'vidro')`, `cityBlock` | `0x54617a` | 23 (sat 45 %) | `0x525a68` | ≈21 (sat ≈30 %) | tirar a matiz do suit/tropa do fundo |
| Skyline B | idem | `0x475369` | 20 | `0x464d5b` | ≈18 | idem |
| Faixa de asfalto do far | `makeFar` (3 distritos) | `0x2f3b4d` | 13 | `0x2c333f` | ≈12 | neutro |
| Casas do subúrbio | `makeFar('suburbio')` | `0x554238` / `0x4a3a30` | 16 / 14 | manter | — | já quentes e escuras (separam do aço-azul) |
| Zinco dos telhados | idem | `0x77808a` | 31 | `0x6a7178` | ≈27 | faixa clara na altura de voo do pombo |
| Skyline da contenção | `makeFar('contencao')` | `0x222b38` / `0x1b2330` | 9 / 6 | manter | — | é o blecaute; o rim resolve |
| Janelas de emergência | idem | `0xff4a5e` @0,5 | — | `0xb0503c` @0,4 | 25 | vermelho puro sai do cenário (§3) |
| Calçada (todos os near) | `sidewalk()` | `0x9aa0a6` / `0x7f858b` | 39 / 32 | manter | — | é o "backplate" claro dos pés; ajuda |
| **Meio-fio pintado** | `sidewalk()` (5 px, y tela 592–597, em TODOS os distritos) | `0xf2c14e` | 47 | `0xcfd4da` @0,6 (ou remover) | ≈45 | amarelo é do letal; corre na linha dos pés dos inimigos |
| Lojas do Despertar | `makeNear('vidro')` | `0x39424f` | 15 | manter | — | plano uniforme, ok |
| Vitrines | idem | `0x9ad7ef` @0,45 + `0xffe9a8` @0,3 | — | manter | — | vitrine acesa atrás de inimigo escuro AJUDA (silhueta) |
| Banca (corpo / porta) | `makeNear('suburbio')` | `0x4a5058` / `0x39404a` | 19 / 14 | `0x3a3f46` / `0x2e333a` | ≈15 / ≈11 | caixa cinza na altura do pedestal do espinho (§5) |
| Jersey (corpo) | `makeNear('contencao')` | `0x6e7681` | 29 | `0x5e666f` | ≈25 | dentro da faixa do near |
| Cones | idem | `0xf27b3c` | 37 | `0xb8602e` | ≈28 | laranja não é reservado, mas sai da faixa de rim |
| Asfalto | `ground-city` | `0x3a4149` | 15 | manter | — | ok |
| Meio-fio do chão | `ground-city` | `0x9aa0a6` | 39 | manter | — | ok (abaixo dos pés) |
| **Faixa tracejada** | `ground-city` | `0xe8d98a` | 51 | `0xb9bec6` | 46 | tira o amarelo-creme do chão |
| bg-cars vermelho | `generateCars` | `0xe4573f` | 31 (sat 65) | `0x7a4a48` | 20 | mesma família do enemy-car |
| bg-cars azul | idem | `0x3f7ad6` | 31 (sat 77) | `0x3f5a86` | 22 | — |
| **bg-cars amarelo** | idem | `0xf2c14e` | 47 | `0x8a8a80` | 33 | amarelo reservado |
| bg-cars verde | idem | `0x5aa469` | 36 | `0x4a7a5a` | 27 | — |
| bg-cars branco | idem | `0xd8d8d8` | 52 | `0x9aa0a8` | 39 | teto L\* 40 da camada |
| bg-cars ônibus | idem | `0xf2a33c` | 42 | `0xa8864a` | 33 | — |
| bg-cars faróis | idem | `0xffe9a8` | — | manter | — | os únicos pontos de luz; são a "vida" da camada |

**bg-cars — alpha por distrito** (P): campo opcional novo `carsAlpha` em `CITY_DISTRICTS`, lido em `applyAreaEnvironment` (`alpha: carsOn ? (area.carsAlpha ?? 1) : 0`) — visual apenas, molde exato do `cars:false`. Subúrbio **0,45** (o próprio doc de design pedia "bg-cars quase vazio"), Despertar 1 (está escondido atrás das lojas de qualquer jeito — o "engarrafado" nunca apareceu; fora de escopo), Contenção **0,6**. Não usar `cars:false` no Subúrbio: perde a identidade e não é ele o pior distrito.

**Relâmpago** (`createWeather`, P, clima não está congelado): `this.lightning` branco 0,4 em **depth 50 (acima do gameplay)** — por 140 ms o contraste inteiro colapsa, justo na tempestade dos 1000–1200 m. Mudar para **alpha 0,28 e depth −17,3** (atrás do plano de jogo, à frente da neblina): rino e inimigos viram silhuetas contra o clarão — legibilidade sobe em vez de cair. Chuva (opcional): `raindrop` `0xbcd8f0` alpha 0,55→0,40 — os riscos são mais claros que o rim proposto.

**Faixa de luz rasante na Contenção** (opcional, P, só D3): em `makeNear('contencao')`, antes dos props, `fillStyle(0xcfe3ff, 0.10); fillRect(0, 150, 640, 82)` + `0.06` em 120–150 — a poeira baixa iluminada pelos holofotes; sobe o far de L\* 6–9 para ≈18 atrás dos corpos. Tematicamente certo, mas secundário ao rim.

---

## 2. Os inimigos — regra única "RIM DA CIDADE" + retoque por espécie

**Regra reutilizável (uma só, para as 20 espécies da cidade):** todo SVG de espécie urbana ganha um **halo claro externo** de raio 2 unidades do viewBox (1,6 nos voadores), cor **`#e6eef7` a 0,85**, desenhado ATRÁS de tudo. Edição à mão, 4 linhas por arquivo, sem mexer em geometria, canvas ou `ANIMAL_SPECS` — hitbox intocada (precedente do dardo v1.8.3, aqui nem o canvas cresce):

```svg
<defs>
  <filter id="rim" x="-12%" y="-12%" width="124%" height="124%">
    <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="d"/>
    <feFlood flood-color="#e6eef7" flood-opacity="0.85"/>
    <feComposite in2="d" operator="in" result="rim"/>
    <feMerge><feMergeNode in="rim"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>
<g filter="url(#rim)"> ...conteúdo existente inalterado... </g>
```

Aritmética do traço: `ART_RASTER_SCALE` 2 e exibição a 1,5/2 → 1 unidade = 2 px de raster = 1,5 px de jogo = **0,84 px CSS no iPhone 17 Pro (874×402, FIT 0,558) = 2,5 px físicos**. Raio 2 → anel ≈ 1,7 px CSS (≈ 5 px físicos); o contorno atual de 1,2–2,2 unidades dá 1,0–1,8 px CSS e, sendo `#17171b` (L\* 8), tem razão 1,01 contra a contenção — por isso não separa nada. Resultado medido do rim: **`#cad2df` sobre skyline noturno (ΔL\* 61, razão 7,8); `#c6ced8` sobre contenção (ΔL\* 74, razão 11,1)**; de dia, sobre calçada, 2,8 — aí é o corpo escuro que separa (ΔL\* ≈ 40).

Detalhes de execução:
- Vale para os frames-par também (`-run-1`, `-alt`, `-air`, `-flap`): 18 espécies × 2 = **36 arquivos** (`person, suit, scooter, viralata, gatobeco, pombo, reporter, car, police, drone, pipa, helinews, pickup, k9, plane, tropa, dronezig, dronesent`). É mecânico; um script idempotente de inserção do bloco (não é `export-art`) serve, ou à mão em 1 h.
- O que cai fora do viewBox é cortado (hélices na borda, cabine da pickup): aceitável.
- `setTintFill(0xffee88)` do telegraph pinta a silhueta INTEIRA, rim incluído — o flash de tiro fica maior de graça.
- Risco a validar no portão 2 (celular do dono): filtro SVG dentro de `<img>` (é como `load.svg` rasteriza). Chrome/Safari/Firefox suportam `feMorphology` em `<img>`; se algum aparelho ignorar o filtro, o fallback é o **traço duplicado** (mesmos paths do corpo repetidos atrás com `stroke="#e6eef7" stroke-width="6" stroke-linejoin="round"`) — custo M. `@resvg/resvg-js` (já é devDependency) rasteriza com filtro e permite um assert em `test-sprites` ("há pixels claros no anel da silhueta").
- Não fazer **flash branco de entrada**: no vocabulário do jogo, flash = "tiro vem" (torre, camionete, sentinela, zig). Diluir isso custaria mais do que rende.
- Não fazer escala visual (Arcade escala o body) nem Phaser FX glow (só WebGL; há `?canvas=1`).

**TABELA POR ESPÉCIE (corpo, secundário ao rim; hitbox intocada)**

| Espécie (distrito) | Cor de corpo atual → proposta | L\* | Detalhe | Rim |
|---|---|---|---|---|
| suit (D1) | terno `#333e52`/`#46536b` → **`#4d5a75`/`#5f6d8a`** | 26→38 | gravata `#d8302f` mantém (vermelho = inimigo) | 2,0 |
| drone (D2) | corpo `#31353e`→**`#5a6170`**, stops +0x20 | 22→41 | barriga `#7d8494` mantém; LED `#ff4545`→`#ff4a5e` (unificar) | 1,6 |
| dronezig (D3) | corpo `#1c1e23` **mantém** (identidade preto/vermelho) | 11 | listra vermelha stroke 2,2→3,0; LED ventral r 1,6→2,2; `-alt` mantém o estouro | 1,6 |
| dronesent (D3) | corpo `#22262d`→**`#2e343d`** | 15→21 | feixe `#fff3c4` opacity 0,35→0,5; ciano mantém (é a mira) | 1,6 |
| tropa (D3, em dupla) | agente `#232c38`→**`#3d4a5c`**; **escudo `#9ab4c8` opacity 0,55→0,80** | 18→31; escudo ≈68 sobre contenção | o escudo vira o plano claro ("o escudo domina a leitura"); faixa TROPA `#1f2531` + letras brancas mantêm | 2,0 |
| k9 (D2–D3) | corpo `#54402c`→**`#6e5638`**; manto `#2b2620`→**`#46382a`**; colete `#7a2620`→**`#b8322a`** | 29→38 / 16→25 / 28→42 | colete vermelho vivo = ameaça; "K9" branco mantém | 2,0 |
| gatobeco (D1) | corpo `#1c1c22`→**`#2c2c36`** | 11→18 | continua "preto" ao lado do rim; olhos `#ffd24a` mantêm (assinatura "olhos no escuro") | 2,0 |
| helinews (D2) | casco `#2e4a6b`→**`#3f6a99`**; cauda `#26262c`→**`#3a3f4a`** | 31→44 | bolha de vidro clara já ajuda; luz vermelha mantém | 1,6 |
| camionete/pickup (D2–D3, MESMO SVG) | carroceria `#586430`/`#7f8f42`→**`#7a8a44`/`#9aa85a`** | 40→55 | farol (telegraph) mantém | 2,0 |
| scooter (D1) | chassi `#3a3e46`→`#4d525c` | 26→33 | corpo vermelho já passa | 2,0 |
| person, reporter, viralata, pombo, pipa, car, police, plane | sem retoque de corpo | — | uniformidade da regra | rim só |

Sobre o (a) do dossiê — "Contenção: 4 de 7 escuros, tropa em dupla": resolve-se pelo rim + escudo claro, **não** trocando o elenco por distrito (elenco = spawn = congelado).

---

## 3. Reserva de matiz

Regra: **vermelho `#ff4a5e` e ciano `#4ad1ff` puros só no que se MOVE contra você ou ATIRA** (inimigos, torre de dardo, dardo, telegraph, boss). **Amarelo/preto só no que MATA por contato estático** (espinho, tarja da parede `-contencao`, muralha). **Amarelo-claro `#ffee88` = flash de telegraph** (já é). Cenário fica com cinzas frios, âmbar quente das janelas/lâmpadas (`#ffb066`, `#ffe9a8`, `#ffd98a`) e "cores-poeira". Flashes de área (300 ms) são eventos, mantêm.

| Elemento decorativo | Onde | Atual | Proposto | L\* noite |
|---|---|---|---|---|
| Telão PROCURADO (silhueta + tarja) | `makeFar('vidro')` `telao()` | `0xff4a5e` | **`0xb86068`** (rosa-tijolo) | 29 |
| Telão (legenda) | idem | `0x4ad1ff` | **`0x6f9fb5`** (ciano-poeira) | 37 |
| Letreiro LED das lojas (a cada 80 px!) | `makeNear('vidro')` | `0x4ad1ff` @0,9 | **`0xffd9a0`** @0,7 (âmbar de loja) | 53 |
| Janelas de emergência | `makeFar('contencao')` | `0xff4a5e` @0,5 | `0xb0503c` @0,4 | 25 |
| **Strobe vermelho/ciano na base do holofote** | `makeNear('contencao')` | `0xff4a5e` + `0x4ad1ff` | **remover**; 1 luz-piloto `0xffd9a0` | 53 |
| **Tarja das jersey** | `makeNear('contencao')` `jersey()` | `0xffd24a`/`0x1f2531` | **`0xcfd4da`/`0x59616b`** (faixa refletiva branca) | 51 |
| Meio-fio pintado | `sidewalk()` | `0xf2c14e` | `0xcfd4da` @0,6 ou remover | 45 |
| Faixa tracejada | `ground-city` | `0xe8d98a` | `0xb9bec6` | 46 |
| Toldo da banca | `makeNear('suburbio')` | `0xd6453c` | `0x7a4f52` | 21 |
| Concha do orelhão | idem | `0x3f7ad6` | `0x35507a` | 19 |
| LEDs dos pilares, faixa de telão, antena (mid), heliponto (high) da parede `-vidro` | `FACADES['-vidro'].ledA/ledB` (1 par de valores cobre tudo) | `0xff4a5e`/`0x4ad1ff` | **`0xb86068`/`0x6f9fb5`** | 29 / 37 |
| Mastro de alerta (high) da parede `-contencao` | `drawContencaoCrown` | `0xff4a5e` (+halo) | `0xb86068` | 29 |
| Luzinha da antena do subúrbio | `drawSuburbioCrown` | `0xff6b5e` | `0xb86068` | — |
| bg-cars vermelho/amarelo | `generateCars` | ver §1 | ver §1 | — |
| **MANTÉM (donos da matiz)** | espinho `spike-tower-city` `0xf2c14e`/`0x23272c`; tarja de base da parede `-contencao` (mata por contato); lâmpada da torre `0xff5a4a`→`#ff4a5e` (unificar; ela atira); dardo `#ff2b2b`; drones/k9/pipa/reporter/car; ciano do dronesent/tropa/helinews; rebites/strobe da Muralha (boss); `AREA_FLASH` | | | |

---

## 4. Figurantes e tráfego

- **`makeNear('cidade')` (3 `pedestrian`)**: arte morta (nunca renderiza, §0). Remover as 3 linhas por higiene — ou deixar; custo zero.
- **`makeNear('vidro')` (5 `runner`)**: **remover**. Estão na linha dos pés (tela 538–610), com anatomia e cor do `enemy-person`/tropa, violando o veto escrito em `TextureFactory:3395` ("narrativa por OBJETOS, nunca por perseguidores"). Substituir pelo **rastro da debandada**: bolsa caída, jornais no chão, lixeira tombada (`trashCan` rotacionada), um sapato, placa "FECHADO" pendurada, vitrine rachada — tudo L\* ≤ 30 à noite, sem matiz reservada. Conta a mesma história ("todo mundo acabou de correr") sem uma silhueta humana no plano dos inimigos. Se o dono fizer questão da multidão: só no FAR (`bg-far-vidro`), a 60 % do tamanho, na cor do skyline +6 L\* (`0x5f6b85` sobre `0x525a68`), linhas 380–404 — scroll 0,15, minúscula e ΔL\* ≤ 6 contra o chão do far. Recomendo remover.
- **bg-cars**: manter (identidade), com paleta dessaturada (§1), teto L\* 40, alpha por distrito (0,45 / 1 / 0,6), faróis intactos, **y inalterado** (não há faixa livre; a separação vem de valor + croma + velocidade — 0,55 do scroll já os faz andar diferente de tudo que ameaça).

---

## 5. Torre-poste e spike-tower vs mobiliário

Princípio: **letal ganha 1 assinatura clara; mobiliário perde toda assinatura** — a silhueta aprendida não muda (mesmo canvas, mesma seteira em (36,70), mesma fileira de espinhos em (10,0)).

**`tranq-tower-city`** (é atirador → família vermelho/branco): caixa d'água `K.metal 0x8a939f` → **`0xb9c2d1`** (L\* 78) com **duas cintas `#ff4a5e`** de 3 px (as cintas `metalDark` de y 26/40 viram vermelhas); seteira: interior `0x1a1d21` ganha brasa **`0x6e1420`** e filete `0xcfd4da` de 1 px em volta (lê como "boca de tiro"); lâmpada `0xff5a4a` → `#ff4a5e` + halo `0.25` r 9 (molde do mastro); poste treliçado permanece escuro. O telegraph (`setTintFill #ffee88`) já existe.

**Mobiliário (near)**: `streetLamp` poste `0x555b62` → **`0x3d434a`** (noite L\* 15; a luz `#ffe9a8` quente fica — distinta da lâmpada vermelha da torre); `orelhao` poste `0x8a939f` → `0x59616b`, concha → `0x35507a`; `banca` → §1/§3 (sem vermelho, corpo mais escuro, nenhuma faixa horizontal clara).

**`spike-tower-city`**: mantém a tarja (dona do amarelo/preto); acrescentar **filete `0xcfd4da` de 2 px** na tampa de aço (y 54) para a fileira de espinhos recortar contra o fundo escuro. Depois do §3, a ÚNICA caixa amarelo/preta na linha dos pés é letal (jersey perdeu a tarja; banca perdeu o toldo).

Sobre DART 27 % em 1000–1400 m: os dados não separam "não viu a torre" de "não viu o dardo"; o dardo já passou por passe de legibilidade (v1.8.3) e a torre não — prioridade na torre. KPI de releitura: participação de `dart` na faixa 1000–1400 por versão.

---

## 6. Verificação

**Modo cinza (debug)** — P, zero linhas de gameplay. No `TuningPanel`, pasta Debug (ao lado de `Hitboxes`): checkbox "Modo cinza (valor)" → `scene.game.canvas.style.filter = on ? 'grayscale(1)' : ''` (opção "cinza + contraste": `grayscale(1) contrast(1.4)`); `?debug=1&cinza=1` liga no boot (`game.js` lê o parâmetro como faz com `debug`). Filtro CSS no canvas é do compositor: funciona em WebGL e em `?canvas=1`. Precedente no próprio `index.html` (`filter: grayscale(1)` em 1093/1238).

**Critério numérico de aceite (por espécie × ponto de teste):**
1. Screenshot A (sprite visível) e B (mesmo frame, `sprite.setVisible(false)`; cena pausada — o render continua, como o painel documenta). Máscara M = |A−B| > 8/255 em qualquer canal.
2. Borda E = M − erode(M, 4 px); anel de fundo F = dilate(M, 8 px) − dilate(M, 2 px).
3. Y = luminância relativa WCAG. **Contraste de borda = max( razão(P90 Y de E, Ȳ de F), razão(Ȳ de F, P10 Y de E) )** — a borda passa se tiver um componente claro (rim, noite) OU escuro (contorno, dia) contra o fundo.
4. **ACEITE: borda ≥ 3,0 (WCAG 1.4.11) E |L\*(E) − L\*(F)| ≥ 30**; corpo |L\*(M) − L\*(F)| ≥ 15 informativo; frame de telegraph (`-alt` ou `setTintFill(0xffee88)`) ≥ 4,5.
5. Fundo: histograma de L\* da faixa y 480–620 sem sprites — **P95 ≤ 45 à noite**.
Baseline hoje (calculado): suit 1,09 · dronezig 1,06 · contorno 1,01. Meta com rim: 7–11.

**Receita Playwright** (`tools/e2e-legibilidade.mjs`, molde `e2e-boss.mjs`; `jimp` 0.14 já é devDependency para decodificar PNG): boot `?debug=1`, `player_id claude-*`, `notify_off`, clique (640,650); `evaluate`: `s = window.game.scene.keys.GameScene; s.invincible = true` (o clamp do boss exige, doc §13); desativar grupos; `s.spawnManager.nextSpawnX = 1e9`; `body.reset(X, 620)` + `cameras.main.setScroll(X−440, 0)`; esperar 1200 ms (crossfade 500 ms + tint); `s.setWeather('limpo')` e depois `'tempestade'` como pior caso; `s.spawnManager.spawnAnimal(X+520, tipo, Constants.flyerSpawnY(tipo))`; 2 frames; `s.scene.pause()`; A; achar o sprite em `getAnimalsGroup().getChildren()` por `animalType`; `setVisible(false)`; B. **Pontos de teste:** D1 x=55800 (1395 m, night 0,88, clima limpo) · **D2 x=58000 (1450 m, night 1,0 — o mais escuro da cidade, chuva)** · D2-dia x=66000 (1650 m) · **D3 x=82000 (2050 m, Brecha, backdrop contenção, night 1,0)**. Saída no formato PASS/FAIL das outras suítes + PNGs em `tools/snapshots/legibilidade-<v>/` (o dono olha — portão 2). Rodar ANTES de mexer (baseline) e depois de cada pacote.

---

## 7. Custo e congelamento

| Item | Arquivos | Custo | Toca spawn/física? |
|---|---|---|---|
| Rim nos 36 SVGs (regra única) | `art/enemy-*.svg` | P (mecânico) / M se precisar do fallback de traço duplicado | não |
| Retoque de corpo (9 espécies) | idem | M (soma de P) | não |
| Reserva de matiz (~14 fills) | `TextureFactory` (far/near/ground/cars/FACADES/crowns) | P | não |
| Figurantes (remover 5 runners + rastro de objetos) | `makeNear('vidro')` | P | não |
| bg-cars paleta + `carsAlpha` | `generateCars`, `CITY_DISTRICTS`, `applyAreaEnvironment` | P (campo visual opcional, molde do `cars:false`) | não |
| Fórmula (azul 0,14→0,08) | `updateAtmosphere` | P, global: 1 print do zoo ao entardecer + 1 do deserto à noite | não |
| Skyline dessaturado | `makeFar` ×3 + `cityBlock` | P | não |
| Torre + mobiliário + filete do espinho | `generateTranqTowerCity`, `generateSpikeTowerCity`, helpers do near | P–M | não |
| Relâmpago atrás do gameplay (+ chuva opcional) | `createWeather` | P (clima não está congelado) | não |
| Haze D3 (opcional) | `makeNear('contencao')` | P | não |
| Modo cinza + suíte Playwright | `TuningPanel`, `game.js`, `tools/` | M | não (debug) |
| **Não fazer**: flash de entrada (dilui "flash = tiro"), escala visual, FX glow WebGL, mover bg-cars em y, trocar elenco por distrito (é spawn) | | | |

**Ordem sugerida:** L1 (1 dia) = suíte + modo cinza + baseline → rim nos 36 SVGs → medir. L2 (1 dia) = reserva de matiz + figurantes + bg-cars + torre/mobiliário + relâmpago. L3 (½ dia, condicional) = retoques de corpo + fórmula, só onde L1+L2 não passarem no critério. Sai como versão própria (v1.12.x, 4 lugares + `sw.js`) para o corte de 26/09 por versão separar "antes/depois da legibilidade" sem contaminar as leituras pré-registradas da Escola/Streaks; nenhuma letra nova em `runs[]` — o KPI é o corte causa×faixa já feito à mão (dart/animal em 1000–1400 m e a mediana pós-portão de 1198 m).