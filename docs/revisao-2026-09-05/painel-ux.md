# Feedback 3 — overlays em paisagem curta (game over, top 10 e auditoria)

Legenda de custo: **P** = CSS/HTML + até ~5 linhas de JS (≤ 2 h, sem risco de jogo) · **M** = JS com teste (meio dia a 1 dia) · **G** = dias, risco de soft-lock/regressão.

## 0. O que confirmei no código (além do dossiê)

| Fato | Onde |
|---|---|
| `#game-over`: `max-height: 88vh`, `overflow-y: auto`, `padding 22px 30px`, `min-width 280`, sem `@media`, botões `margin-top: 20px`. Quatro `<p>` reservam ar mesmo vazios: `.attempt-line` 16px, `#online-status` 18, `#medal-message` 18, `#share-status` 18 (+ margens). | `index.html:215-273`, `:1619-1649` |
| DOM do game over: 9 `<p>` em sequência + `.btn-row` com `onclick="location.reload()"` inline. | `index.html:2465-2484` |
| `#game-win`: `padding 40`, **sem** `max-height`/`overflow` — em 402px o conteúdo (~495px) fica cortado dos dois lados e os botões inalcançáveis. Só a LENDA cai aqui (4 vitalícias) — latente, mas real. | `index.html:276-323` |
| `.modal`: `85vh`, `min-width 320`, sem safe-area, sem `@media`; só `.modal-wide` compacta (e o bloco está ANTES da regra `.modal`, o que importa para a cascata — ver §3). | `:1482-1520`, `:1349-1384` |
| Top 10: `li` flex `space-between gap 24`; nome sem `nowrap/ellipsis`; `.rank-right` é `nowrap`. Com `min-width 320` e padding 34×2 sobram 252px de conteúdo; o bloco da direita ("1.234 pts · 987 m · há 12d ⚔️") tem ~220px → o nome quebra em 2 linhas (é a foto). O `"1. Nome"` sai num span só; `há Xd` é opcional; ⚔️ só para os outros → colunas não alinham. | `:1532-1568`, `GameScene.js:1002-1039` |
| `showEndOverlay` faz `style.display = 'block'` e `e2e-stats.mjs:322` **assere `display === 'block'`** → a caixa nova não pode depender de `display:flex` no próprio `#game-over`. | `GameScene.js:4126`, `tools/e2e-stats.mjs:318-322` |
| `e2e-deserto.mjs:268` lê `#game-over h1` e `e2e-boss*.mjs` leem `#game-over-title` → o `<h1 id="game-over-title">` tem de continuar existindo. | tools |
| Botão de pausa (z 250) e `.touch-guides` continuam visíveis por cima/à volta do game over (`body.started`); `pauseGame` já ignora o toque (`gameOver` guard) — só ruído visual. | `index.html:1699-1723`, `GameScene.js:2691` |
| Fluxo de reinício: botão → `location.reload()` → home pinta do cache antes do motor → `HomeScreen.armStart` (pointerdown no `#start-screen`, guarda `modal-open`) → `startRun` com `audio.init()` **dentro do gesto**. PWA modal 1×/aba (sessionStorage), convite de desafio 1×/boot (adia se há modal aberto). | `HomeScreen.js:458-487`, `GameScene.js:577, 701-745, 1325-1342, 1655-1684` |
| Viewport real: no Safari paisagem a barra de endereço fica no topo e, com `body{overflow:hidden}`, nunca some → ~350-360px úteis num 874×402; só o PWA standalone dá os 402. Android Chrome num 800×360: ~304px com a barra. O mínimo 640×360 não é teórico — **640×304 é o pior caso**. | `index.html:93-104` |
| runs[]: as 26 letras de 1 char estão tomadas; 2 chars já são convenção (`zu zy zl qe qu qy ql fc cj`); as rules só validam `runs is list && size() <= 50` → letra nova **não mexe em rules**. `test-radiografia` exige a letra em `RUN_LETTER_KEYS`. | `StorageManager.js:443-506`, `RadiografiaCore.js:49-77`, `firestore.rules:113` |

---

## 1. GAME OVER redesenhado (874×402 e 640×360/304)

### 1.1 Hierarquia — o que fica acima da dobra
Ordem fixa, de cima para baixo. A regra: **tudo que chega por rede/assíncrono (ranking enviado, share, tentativa) mora na região que rola, para o CTA nunca se mover**.

1. **Kicker** (o `<h1>` atual, encolhido para 12px caixa-alta): causa · ala. Hoje: "💉 DARDO"; com a v1.14: "💉 DARDO · SUBÚRBIO". Os títulos de chefe ("DETIDO NA MURALHA", "TRANQUILIZADO") continuam — são identidade.
2. **Headline**: o número. `1.198 m` a 34px + `🏆 1.540 pts` ao lado (15px). O "GAME OVER" some: não informa nada e é a única palavra negativa da tela.
3. **Barra das alas** (slot v1.14, `hidden` até lá): trilho de 6px no vocabulário do `#progress-track`, 5 segmentos, pino VOCÊ + placa REC.
4. **Delta** (1 linha, amarela, o `#record-message` de hoje): a frase positiva — ver copy em 1.5.
5. **Dica** (`#death-tip`, máx. 2 linhas) e **medalha/skin** (só quando existe — `:empty` esconde).
6. ┈ dobra ┈ **Extras** (rolam, com fade): detalhamento de pontos em linha única, "Enviado ao ranking", tentativa nº, status do share.
7. **Rodapé fixo**: `▶ JOGAR DE NOVO` grande (52px, ocupa a largura) + `📤` quadrado 52×52 (ícone só, `aria-label`).

### 1.2 Wireframes

```
874×402 (standalone) — caixa 560 × ≤369, centrada; Safari com barra: ≤336
┌──────────────────────────────────────────────────────────┐
│ 💉 DARDO · SUBÚRBIO                        Tentativa 41  │ kicker 12px
│                                                          │
│         1.198 m        🏆 1.540 pts                      │ 34px / 15px
│   ZOO ✓ [▓▓▓▓▓▓░░░░ Subúrbio │ Despertar │ Contenção ]   │ barra 6px + rótulos 10px (v1.14)
│   ⭐ Faltaram só 27 m para o seu recorde (1.225 m)        │ delta 14px amarelo
│   💡 O clarão da torre avisa o tiro: pule no clarão,     │ dica 13px, ≤2 linhas
│      ou invista NA torre.                                │
│ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ extras (rolam · fade) ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│   1.198 m + 342 de bônus · Paredes +40 · Rampas +30 ·…   │ 12.5px, 70% opacidade
│   🌍 Enviado ao ranking mundial!                          │
│ ┌────────────────────────────────────────────┐ ┌──────┐  │
│ │           ▶  JOGAR DE NOVO                 │ │  📤  │  │ 52px, rodapé fixo + safe-area
│ └────────────────────────────────────────────┘ └──────┘  │
└──────────────────────────────────────────────────────────┘

640×304 (Chrome Android com barra; pior caso) — caixa 560 × ≤280
┌────────────────────────────────────────────────────┐
│ 💉 DARDO · SUBÚRBIO                                │ 11px
│        1.198 m     🏆 1.540 pts                    │ 24px
│  [▓▓▓▓▓░░░░░░░░░░░]                                │ 6px
│  ⭐ Faltaram só 27 m para o recorde                │ 13px
│  💡 dica em 12px, 2 linhas                         │
│ ┈ extras: 1 linha visível + fade ┈                 │
│ [        ▶ JOGAR DE NOVO (44px)        ] [📤]      │
└────────────────────────────────────────────────────┘
```
Orçamento medido: hero (kicker 16 + headline 38 + barra 25 + delta 22 + dica 38 + medalha 21) ≈ 160-174px; rodapé 68px → **≈ 242px sempre visíveis**; sobram 127px (402 standalone), ~94px (Safari com barra) e ~40px (640×304) para os extras — nesses dois últimos o fade é o sinal de rolagem.

### 1.3 DOM final (acomoda a v1.14; IDs preservados — o JS não muda) — **P**
```html
<div id="game-over" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
  <div class="go-body">
    <div class="go-hero">
      <h1 id="game-over-title" class="go-kicker">GAME OVER</h1>            <!-- v1.14: "💉 Dardo · Subúrbio" -->
      <div class="go-headline">
        <span><span class="final-score" id="final-score">0</span> m</span>
        <span id="final-points" class="final-points"></span>               <!-- JS passa a escrever só "🏆 1.540 pts" -->
      </div>
      <div id="go-track" class="go-track" hidden></div>                     <!-- v1.14: barra das 5 alas -->
      <p id="record-message"></p>                                            <!-- slot do DELTA (1 frase, prioridade em 1.5) -->
      <p id="gate-escape-message"></p>
      <p id="death-tip"></p>
      <p id="medal-message"></p>
    </div>
    <div class="go-extra">
      <p id="final-breakdown" class="final-breakdown"></p>
      <p id="online-status"></p>
      <p id="attempt-message" class="attempt-line"></p>
      <p id="share-status"></p>
    </div>
    <div class="btn-row go-actions">
      <button id="restart-btn" class="btn-primary" type="button">▶ JOGAR DE NOVO</button>
      <button id="share-btn" class="btn-share" type="button" aria-label="Compartilhar">📤</button>
    </div>
  </div>
</div>
```
`#game-win` recebe a MESMA estrutura com os ids `win-*` (mata o bug latente da LENDA de graça). O `.go-body` é quem vira coluna flex — o `#game-over` continua `display:block` (e2e-stats fica verde).

Mudanças de JS que acompanham (todas **P**): `GameScene.js:3896-3899` — `final-points` recebe só `🏆 ${fmtPts(total)}` e a frase "1.198 m + 342 de bônus" vira o 1º item do breakdown, que passa a `join(' · ')` em vez de `'\n'`; `:3943-3947` — o "Faltaram Xm" sai do `#death-tip` e vai para o `#record-message` (slot do delta); `restart-btn` ganha listener (`pointerdown` stopPropagation + `click` → grava telemetria §5 → `location.reload()`) no lugar do `onclick` inline; `showEndOverlay` adiciona `body.ended` (esconde `.touch-guides` e `#pause-btn`).

### 1.4 CSS concreto — **P** (colocar no FIM do `<style>`, depois de `:1812`, pelo mesmo motivo do `#crash-overlay`)
```css
/* ===== Fim de corrida (game over + vitória): uma caixa só ===== */
#game-over, #game-win {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  z-index: 450;                       /* acima do #rotate-overlay (400): legível em retrato; abaixo dos .modal (500) */
  display: none;                      /* showEndOverlay segue com display:block */
  width: min(560px, calc(100vw - 2 * max(16px, env(safe-area-inset-left, 0px), env(safe-area-inset-right, 0px))));
  min-width: 0;
  max-height: calc(100vh - 24px);                                                   /* fallback */
  max-height: calc(100dvh - 12px - max(12px, env(safe-area-inset-bottom, 0px)));
  padding: 0; overflow: hidden;       /* quem rola é .go-extra */
  background: rgba(0, 0, 0, .95); border-radius: 12px; color: #fff; text-align: center;
}
@media (display-mode: standalone) {   /* dvh falha no cold start do PWA: vh é confiável aqui */
  #game-over, #game-win { max-height: calc(100vh - 12px - max(12px, env(safe-area-inset-bottom, 0px))); }
}
.go-body   { display: flex; flex-direction: column; max-height: inherit; }
.go-hero   { flex: 0 0 auto; padding: 14px 22px 6px; }
.go-extra  { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
             padding: 0 22px 18px;
             -webkit-mask-image: linear-gradient(#000 calc(100% - 18px), transparent);
                     mask-image: linear-gradient(#000 calc(100% - 18px), transparent); }
.go-actions { flex: 0 0 auto; display: flex; gap: 10px; margin: 0;
              padding: 8px 22px max(12px, env(safe-area-inset-bottom, 0px)); background: rgba(0, 0, 0, .95); }
#game-over p, #game-win p { min-height: 0; margin: 3px 0; font-size: 14px; }
#game-over p:empty, #game-win p:empty { display: none; }        /* recupera os ~80px de ar */
.go-kicker { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #ff8a8a; margin: 0; }
.go-headline { display: flex; align-items: baseline; justify-content: center; gap: 14px; margin: 2px 0 4px; }
.go-headline .final-score  { font-size: 34px; font-weight: 900; color: #fff; }
.go-headline .final-points { font-size: 15px; font-weight: 700; color: #ffd700; margin: 0; }
.go-track { height: 6px; border-radius: 3px; background: rgba(255,255,255,.15); margin: 4px 8px 16px; position: relative; }
.go-track[hidden] { display: none; }
#record-message { color: #ffd166; font-weight: 700; }
#death-tip { color: rgba(255, 255, 255, .85); font-size: 13px; line-height: 1.35; max-height: 2.7em; overflow: hidden; margin: 4px auto 0; }
.final-breakdown { font-size: 12.5px; line-height: 1.4; opacity: .7; white-space: normal; }
.btn-primary { flex: 1 1 auto; min-height: 52px; margin: 0; padding: 0 16px; font-size: 18px; font-weight: 900;
               letter-spacing: 1px; background: #4ecdc4; color: #06312d; border: 0; border-radius: 10px; }
#game-over .btn-share, #game-win .btn-share { flex: 0 0 52px; min-height: 52px; margin: 0; padding: 0; font-size: 22px; border-radius: 10px; }

@media (max-height: 500px) {          /* molde do #crash-overlay */
  .go-hero { padding: 10px 16px 4px; }
  .go-extra { padding: 0 16px 16px; }
  .go-actions { padding: 6px 16px max(10px, env(safe-area-inset-bottom, 0px)); }
  .go-kicker { font-size: 11px; letter-spacing: 1.5px; }
  .go-headline .final-score { font-size: 28px; }
  #game-over p, #game-win p { margin: 2px 0; font-size: 13px; }
  .btn-primary { min-height: 46px; font-size: 16px; }
  #game-over .btn-share, #game-win .btn-share { flex-basis: 46px; min-height: 46px; }
}
@media (max-height: 360px) {          /* 640×304-360: Chrome com barra / SE */
  .go-headline .final-score { font-size: 24px; }
  #game-over p, #game-win p { font-size: 12px; }
  #death-tip { font-size: 12px; }
  .btn-primary { min-height: 44px; font-size: 15px; }
  #game-over .btn-share, #game-win .btn-share { flex-basis: 44px; min-height: 44px; }
}
```
Notas: `touch-action:none` do body não bloqueia a rolagem dentro de `.go-extra` (o gesto é resolvido no container que rola — já rola hoje). O `padding-bottom: 18px` dentro de `.go-extra` garante que a última linha sai de baixo do fade quando rolada até o fim. Remover as regras antigas de `#game-over`/`#game-win` (`:215-323`) e os `min-height` de `:1619-1649`.

**Hotfix alternativo, zero DOM (se quiser publicar antes da v1.13) — P, 12 linhas:** manter a estrutura atual e só (a) `#game-over p:empty{display:none}` + `min-height:0`; (b) `.btn-row{position:sticky;bottom:0;background:rgba(0,0,0,.95);padding:8px 0 max(4px,env(safe-area-inset-bottom))}` (o rodapé gruda embaixo da caixa que rola — o botão nunca sai da tela); (c) o bloco `@media (max-height:500px)` acima aplicado a `#game-over h1/p/button`. Resolve a foto do iPhone; não dá a hierarquia nem os slots da v1.14.

### 1.5 Copy positiva (benchmark: texto muito positivo retém) — **P**, tudo em `GameScene.js:3913-3948` + `Constants.CAUSE_LABELS`
Kicker por causa: reutilizar `CAUSE_LABELS` ("🧱 Parede", "💉 Dardo", "🦁 Animal"...) no lugar do "GAME OVER"; chefes mantêm o título próprio. Com a v1.14: `${CAUSE_LABELS[cause]} · ${ALA}`.

Slot do delta — **uma** frase, primeira que casar:
1. Novo recorde: `🎉 NOVO RECORDE! +27 m sobre os 1.171 m de antes`
2. Perto do recorde (`rec − d ≤ max(30 m, 10 %)`): `⭐ Faltaram só 27 m para o seu recorde (1.225 m)`
2b. Entre as 3 melhores das últimas 50 (`getRuns()` local, sem rede): `⭐ Sua 2ª melhor corrida — o recorde é 1.225 m`
3. v1.14, marco à frente: `🌿 A Floresta começa 27 m depois de onde você caiu`
4. Senão (fato neutro-positivo): `⭐ Recorde: 1.225 m · 🌍 #12 do mundo` (rank do `getLastRank`)

CTA: `▶ JOGAR DE NOVO` (alternativa com voz do jogo: `🦏 FUGIR DE NOVO`). Extras: `🌍 Enviado ao ranking mundial!` fica; `Tentativa nº 41` vira texto discreto. A dica (`💡`) continua sendo a única linha "professoral" — e some após 3× por causa, como hoje.

### 1.6 Reconciliação com a v1.14 "Jornada"
A v1.14 planeja "Você caiu na SAVANA — 473m + barra das 5 alas + faltaram 27m para a Floresta" (plano `mutable-toast.md:168-169`). No layout final ela **só preenche slots**: kicker recebe a ala, `#go-track` deixa de ser `hidden`, e "faltaram 27m para a Floresta" entra na prioridade 3 do delta. Nenhuma mudança de layout depois. Por isso a caixa nova deve sair **antes** da v1.14 (junto da v1.13 ou num v1.12.x) — e a barra deve nascer parametrizada (`segmentos[{label, from, to}]`, pino VOCÊ, placa REC), porque depois dos 1000 m ela mostra os 3 distritos com um chip "ZOO ✓" — as fronteiras vêm da tabela de biomas que a v1.14 já vai criar. Custo da barra em altura: 25px (cabe nos orçamentos acima).

---

## 2. TOP 10 — grid, tabular-nums, ellipsis, posição + vizinhos

### 2.1 Wireframe (caixa 560 × ≤357 em 874×402)
```
┌ 🏆 TOP 10 MUNDIAL ─────────────────────────────────────────┐
│  1. Alfa                        9.000 pts · 8.000 m   há 3d  ⚔️ │
│  2. Beta                        7.000 pts · 6.000 m    hoje  ⚔️ │
│  …                                                           │  ← rola (fade embaixo)
│ 10. Nome-muito-longo…           1.100 pts · 1.020 m  há 12d  ⚔️ │
│ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│ 23. Rival                       1.020 pts · 900 m            ⚔️ │
│ 24. VOCÊ                          987 pts · 870 m            🦏 │  ← .me, sticky
│ 25. Abaixo                        950 pts · 900 m            ⚔️ │
│ [ Fechar ]                                  [⚔️ Desafiar (2)]  │  rodapé fixo
└──────────────────────────────────────────────────────────────┘
      ^2.4ch  ^minmax(0,1fr) ellipsis   ^auto, direita  ^4.5ch  ^34px
```

### 2.2 CSS — **P**
```css
#ranking-modal { width: min(560px, calc(100vw - 32px)); }          /* largura fixa: o flex nunca mais espreme o nome */
#ranking-list { max-height: calc(100dvh - 24px - 150px); overflow-y: auto; overscroll-behavior: contain;
  -webkit-mask-image: linear-gradient(#000 calc(100% - 16px), transparent); mask-image: linear-gradient(#000 calc(100% - 16px), transparent); }
#ranking-list li {
  display: grid;
  grid-template-columns: 2.4ch minmax(0, 1fr) max-content 4.5ch 34px;   /* # · nome · pts·m · dias · ⚔️ */
  grid-template-areas: "rank name score days sword";
  column-gap: 10px; align-items: baseline;
  padding: 3px 8px; font-size: 15px; font-variant-numeric: tabular-nums;
}
#ranking-list .rank-pos  { grid-area: rank; text-align: right; color: rgba(255,255,255,.55); }
#ranking-list .rank-name { grid-area: name; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#ranking-list .rank-right { display: contents; }                      /* os filhos viram células do grid do li */
#ranking-list .rank-score { grid-area: score; text-align: right; white-space: nowrap; }
#ranking-list .rank-days  { grid-area: days; text-align: right; }
#ranking-list .challenge-btn { grid-area: sword; justify-self: end; margin: 0; }
#ranking-list li.me { position: sticky; top: 0; bottom: 0; z-index: 1; background: #2b2508; }   /* fica visível esteja acima ou abaixo da janela */
#ranking-list li.me::after { content: '🦏'; grid-area: sword; justify-self: end; font-size: 13px; opacity: .8; }  /* placeholder na coluna da espada */
#ranking-list li.rank-gap { display: block; text-align: center; color: rgba(255,255,255,.4); padding: 0; line-height: 12px; }
#ranking-me:empty, #ranking-status:empty { display: none; }
@media (max-height: 500px) {
  #ranking-list li { font-size: 14px; padding: 2px 8px; }
  #ranking-modal h2 { font-size: 18px; margin-bottom: 6px; }
}
```
Fundo do `.me` sticky opaco de propósito (o `rgba(255,204,0,.15)` atual deixaria as linhas passarem por baixo).

### 2.3 JS mínimo (`openRanking`, `GameScene.js:1002-1039`) — **P**
Separar `"${i+1}."` num `span.rank-pos` e o nome num `span.rank-name`; dar `class="rank-score"` ao span da pontuação; **sempre** anexar o `span.rank-days` (vazio quando `days[i] === null`) — com `grid-area` explícita, célula ausente não desalinha, mas o span presente mantém a semântica. O `li.me` não recebe botão; o `::after` cobre a coluna.

**Sua posição + vizinhos** — **M** (rede) / **P** (só o "me"): quando `myRank > 10`, anexar ao mesmo `<ol>` um `li.rank-gap` ("···") e até 3 linhas: acima = `StorageManager.getRivals().rival` (já buscado na home por `fetchRivals`, `LeaderboardSystem.js:366-411`), eu = `myRank` + `myBest` (locais), abaixo = **1 consulta nova** espelhada (`where('score','<',best) orderBy('score','desc') limit(2)`, mesmo campo → sem índice composto), guardada no mesmo cache `rivals` (localStorage; zero rules). Detalhe que muda o custo: o `pick()` de `fetchRivals` **descarta `d.id`** — sem o id a espadinha do vizinho não funciona (`toggleChallengeSel` exige id) → incluir `id: d.id` no cache. Ranks dos vizinhos = `myRank ± 1` (empate → prefixo "≈"). Offline: só a linha "VOCÊ" com `getLastRank`.

### 2.4 Altura em 342px (85vh de 402) — hoje vs. proposto
Hoje: padding 52 + h2 42 + 10 linhas × 26 = 260 + `#ranking-me` 32 + status 32 + botão 54 = **≈ 472px → só ~7 linhas visíveis, rola sem sinal**. Proposto (compactado): padding 24 + h2 24 + 10 × 22 = 220 + rodapé 42 = **≈ 314px → as 10 linhas cabem sem rolar** em 402 (standalone) e no Safari com barra (~336 úteis). Com o bloco "eu + vizinhos" (+78px) ou em 640×304 (≈ 8,4 linhas úteis), a lista rola dentro de si com fade + `.me` sticky.

---

## 3. Auditoria dos demais overlays em 402px (e no pior caso 304px)

Regra de cascata primeiro: **qualquer compactação de `.modal` tem de vir DEPOIS de `:1482`** (mesma especificidade → a última vence). Se for para dentro do `@media` de `:1262`, a `.modal{padding}` de `:1488` a anula. Bloco genérico — **P**, no fim da folha:
```css
.modal { max-width: min(92vw, calc(100vw - 2 * max(12px, env(safe-area-inset-left, 0px), env(safe-area-inset-right, 0px))));
         max-height: calc(100vh - 24px); max-height: calc(100dvh - 12px - max(12px, env(safe-area-inset-bottom, 0px))); }
@media (display-mode: standalone) { .modal { max-height: calc(100vh - 12px - max(12px, env(safe-area-inset-bottom, 0px))); } }
@media (max-height: 500px) {
  .modal { padding: 12px 16px; }
  .modal h2 { font-size: 18px; margin-bottom: 6px; }
  .modal p { font-size: 14px; margin: 4px 0; }
  .modal button { margin-top: 8px; padding: 9px 18px; font-size: 14px; }
  .modal .btn-row, .modal > button:last-child { position: sticky; bottom: 0; background: rgba(0,0,0,.95); padding-top: 6px; }
}
```

| Overlay (z) | Cabe em 402 (85vh = 342)? | Em 304 (258)? | Correção | Custo |
|---|---|---|---|---|
| `.modal` genérico (500) | depende do conteúdo; sem safe-area, sem compactação | idem | bloco acima | P |
| `#game-win` (200) | **Não** — ~495px sem `max-height`/overflow: cortado dos dois lados, botões inalcançáveis (LENDA) | não | mesma caixa do §1 | P |
| `#nickname-modal` | Sim (~250px) | Sim | Com o **teclado** em paisagem (iOS: ~150-200px visíveis) o "Salvar"/"Agora não" some atrás do teclado; Enter já salva. Ancorar no topo em telas baixas (`top:8px; transform:translateX(-50%)`) e, com `visualViewport.height < 260`, esconder `#nickname-sub`. Abre por cima do game over 1×/3 corridas (`:1384-1389`) — aceitável, mas garantir que "Agora não" fica visível | M |
| `#pause-modal` | Sim (~232px) | Sim | Achado: em retrato o `#pause-modal` (500) fica ACIMA do `#rotate-overlay` (400) e "Continuar" **retoma a corrida às cegas** (`resumeGame` não olha orientação). `@media (orientation:portrait){ #pause-resume{display:none} #pause-modal::after{content:'Gire o celular para continuar'} }` | P |
| `#pwa-modal` | Sim (~277px) | **Não** (258) | compactação genérica + `#pwa-modal p{font-size:13.5px}` em ≤500 | P |
| `#challenge-create-modal` | **Não** (~540px: diretório `max-height:200px` + chips + busca + pílulas + botões) | não | `@media(max-height:500px){ #challenge-directory{max-height:96px} #challenge-players{margin:6px 0} }` + rodapé sticky do bloco genérico | P |
| `#challenge-invite-modal` | Sim (~212px) | Sim | só o genérico | P |
| `#mystats-modal .modal-wide` | rola por desenho (já compacta ≤500) | rola | botões só no fim → rodapé sticky + fade (`#mystats-body` como região que rola) | P |
| `#skins-modal .modal-wide` | **Não** (células 150px min, img 125×83 → 3 linhas ≈ 430px + h2 + status + botão) | não | ≤500: `.skin-cell img{width:96px;height:64px}` `#skins-grid{grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:6px}` → 2 linhas ≈ 200px; "Fechar" sticky | P |
| `#medals-modal` | **Não** (30 × ~34px ≈ 1.020px) | não | `#medals-list{columns:2;column-gap:16px}` em ≥ 700px de largura + "Fechar" sticky + fade | P |
| `#start-screen` (300) | compacta ≤500 (v1.8.10-fix2); `overflow:hidden` → em 304-330px o `.home-bottom` (CTA) pode ser **cortado em silêncio** | risco | tirar screenshot 640×304/640×360 (checklist); se cortar: `@media(max-height:330px){ .home-diario{display:none} }`. Safe-area só à ESQUERDA (`:360`) → com a ilha à direita o `#challenge-new`/versão ficam sob ela: `padding-right: calc(28px + env(safe-area-inset-right,0px))` | P |
| `#rotate-overlay` (400) | — | — | Em retrato esconde o game over (200): quem gira para ler/compartilhar perde a tela. Game over/win a **z 450** (é DOM, cabe em retrato por largura). Modais (500) acima do rotate: PWA/convite no boot em retrato são usáveis — ok; o caso ruim é o da pausa (linha acima) | P |
| `#crash-overlay` (900) | Sim (compactado ≤500) | Sim | nada; só `max-height` com dvh/safe-area por consistência | P |
| HUD durante o fim (`.touch-guides`, `#pause-btn` z 250) | visíveis em volta/por cima do game over | idem | `body.ended .touch-guides, body.ended #pause-btn{display:none}` (o `showEndOverlay` põe a classe) | P |

---

## 4. ≤ 2 toques até correr de novo

**Fluxo atual:** morte → (600 ms se dardo) overlay → toque 1 "Jogar Novamente" → `location.reload()` (1-3 s com SW quente; ~6 s na 1ª visita — dívida #2; + 0,8-3,6 s do `document.write` do Phaser — dívida #4) → home pinta do cache → toque 2 em qualquer ponto do `#start-screen` (guardado se o motor ainda não subiu, v1.9.3) → corrida. Interstícios possíveis entre os dois toques: `#pwa-modal` (1×/aba) e `#challenge-invite-modal` (1×/boot enquanto houver convite não visto) → 3 toques nesses casos.

**Veredito:** já são 2 toques; **o atrito é o tempo morto e a descontinuidade visual do reload, não a contagem**. Um fluxo de 1 toque via reload é impossível: `audio.init()` precisa rodar dentro do gesto (`startRun:1672-1674`) e o reload mata o gesto.

**Proposto:**
- **P — "modo re-jogo" no boot:** o botão grava `sessionStorage.fr_replay = {at, src}` antes do reload; no boot, se `fr_replay` tem < 60 s: `maybeShowChallengeInvite` adia (já adia com `modal-open`; acrescentar a condição, sem `markSeen`), e o `.start-cta` nasce pulsando com "TOQUE PARA CORRER DE NOVO". Garante 2 toques sempre.
- **M — dívida #4:** testar `<script defer>` para o Phaser (corta 0,8-3,6 s entre os toques). Separado, tem teste próprio.
- **G — reinício na cena (1 toque, zero tempo morto):** `scene.restart()` sem reload. É o norte, mas o reload é o caminho limpo documentado (persist-early, `pause-quit`, overlays DOM, contadores `run*`). Só entra com gatilho de dado: se `rt` (§5) mostrar que o reload é onde a sessão morre.

**Contrato do toque:** o game over não vive dentro do `#start-screen`, então (640,650) não é afetado; mesmo assim `#restart-btn`/`#share-btn` seguem a regra da casa (`pointerdown` stopPropagation + `click`), como `pause-quit`. Qualquer elemento novo na **home** (ex.: chip "última corrida") fica fora da faixa inferior central (y≈650/720 = linha do `.start-cta`), que os e2e clicam.

---

## 5. Telemetria de UI mínima — 2 chaves de 2 chars em runs[] — **P**
Nada de coleção nova, nada de campo de 1º nível, rules intactas (só validam `runs is list && size() <= 50`). Entram em `RUN_COUNTERS` (`StorageManager.js:443`) e em `RUN_LETTER_KEYS`/`RUN_LETTER_DESC` (`RadiografiaCore.js:49/56` — o `test-radiografia` exige). Zero é omitido (`if (v > 0)`), então só custam bytes quando existem.

- **`rs`** = como ESTA corrida começou, bitmask sobre o game over anterior: 1 = veio do botão JOGAR DE NOVO · 2 = tocou compartilhar antes · 4 = rolou os extras (`.go-extra` scrollTop > 0). Ausente = home fria (aba nova/ícone/desistência).
- **`rt`** = segundos entre o fim da corrida anterior e a largada desta (cap 9999; só quando `rs & 1`).

Mecânica: o botão grava `sessionStorage.fr_replay = {at: Date.now(), bits}`; `startRun` consome e guarda em `this.replayInfo`; `endGame` passa `restartSource`/`replayLatencyS` no `extra` do `addRun` (`StorageManager.js:582-602`). Leitura por `v` (a corrida já se autodescreve), como as 5 métricas pré-registradas — conta avulsa por REST. Métricas: R1 taxa de re-jogo (`rs&1` / corridas), R2 mediana de `rt` (meta: cair — menos rolagem, menos interstício), R3 `rs&4` (se < 10 % rolam, o que está abaixo da dobra é lixo; se > 50 %, a dobra está errada), R4 `rs&2` (share). Congelamento até 26/09 não é tocado (zero densidade/física/spawn).

---

## 6. Checklist de teste

**Playwright — `tools/e2e-overlays.mjs` (novo, entra no `package.json`) — M.** Contextos: `874×402 DPR3 hasTouch` (17 Pro standalone), `874×360` (17 Pro Safari com barra), `812×375` (X/11), `640×360`, `640×304` (Chrome com barra), `1280×720`, `1024×768`. Semear `player_id claude-*`, `notify_off=1`, `pwa_prompted=1`, `record=1225`. Com `?debug=1` (`window.game`): `startGame` → `scene.endGame(false, 'dart')` (dica longa + "faltaram"), depois variantes: `'wall'` com medalha semeada, recorde novo, `escaped` (linha 🗽), `'boss2'` (título de chefe), `endGame(true)` com `legend` (game-win). Asserts por viewport: `#restart-btn` bounding box inteira dentro do viewport e ≥ 44px de altura; `.go-hero` sem overflow; `document.documentElement.scrollWidth === innerWidth`; `#game-over` `display === 'block'` (mantém o e2e-stats); top 10 com 10 entradas semeadas (nome de 12 chars + "1.234 pts · 987 m · há 12d"): cada `li` com `offsetHeight ≤ 26` e `rank-score.getBoundingClientRect().right` igual em todas as linhas (±1px); com `myRank = 24` a `li.me` intersecta o viewport logo ao abrir; modais restantes abertos um a um com o botão de fechar visível. Screenshot por viewport para o dono. Safe-area não é emulável (`env()` não se sobrescreve) → cobrir com viewports reduzidos (874×381) e no aparelho.

**Só o aparelho prova:** ilha dinâmica (paisagem: 59px à esquerda OU à direita — girar para os dois lados), barra do Safari (viewport ~360 e não some com `overflow:hidden`), standalone (cold start com `dvh` → o `@media (display-mode: standalone)` com `vh`), faixa do indicador home (21px: o CTA não pode encostar — o `max(12px, env())` é isso), teclado em paisagem sobre o `#nickname-modal`, volta da folha de compartilhar (`#share-status` aparece nos extras sem mover o CTA), girar para retrato com o game over aberto (z 450), rolagem por toque dentro de `.go-extra`/`#ranking-list` com `touch-action:none` no body, e `?canvas=1` (nada muda — é DOM).

**Ritual:** mudou `index.html` → bump do `CACHE` no `sw.js` + versão nos 4 lugares, senão o PWA instalado (32 aparelhos) segue com o CSS velho; validação local do dono (desktop + celular via IP) antes dos 3 portões.

---

## 7. Ordem sugerida e custo total
1. **Lote A (P, ~meio dia, pode ir num v1.12.x ou junto da v1.13):** caixa nova do game over/win + copy do delta + `body.ended` + bloco genérico `.modal` + grid do top 10 + correções P da tabela (pausa em retrato, skins/medalhas/desafio compactos, safe-area direita da home) + telemetria `rs`/`rt` + `e2e-overlays`.
2. **Lote B (M, 1 dia):** vizinhos no top 10 (consulta "abaixo" + `id` no cache), modo re-jogo no boot, `#nickname` com teclado.
3. **v1.14** só preenche os slots (kicker com ala, `#go-track`, prioridade 3 do delta).
4. **G, gated por dado:** reinício na cena se `rt` acusar o reload; `<script defer>` como teste separado.