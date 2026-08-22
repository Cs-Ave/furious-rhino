# Ideias futuras — banco de ideias e dados do FURIOUS RHINO

> **Isto não é um roadmap.** Nenhum item aqui está prometido para nenhuma versão.
> É um lugar de guardar (a) o que os dados reais dos jogadores já mostraram e
> (b) as ideias que nasceram dessa leitura, cada uma desenhada o bastante para
> ser **puxada sozinha** para a próxima versão intermediária quando o dono
> quiser.
>
> Documento **vivo e append-only**, fora do ciclo de versões — mesmo estatuto do
> [`QA-Registro.md`](QA-Registro.md). Os quatro guias numerados (`01`…`04`)
> descrevem o que **é**; este descreve o que **poderia ser**.

**Origem:** sessão de planejamento de 16/08/2026 (ver §7, Procedência).
**Última atualização:** 21/08/2026 — criação a partir do levantamento de 16/08; a **ideia A saiu na v1.8.4** no mesmo dia, e as **ideias B, C e D saíram juntas na v1.8.5**, também no mesmo dia.

---

## 1. Como usar este documento

**Estados de cada ideia:**

| | Significa |
|---|---|
| 💡 | ideia levantada, ainda sem desenho técnico |
| 📐 | desenhada — dá para estimar e começar |
| 🚧 | em obra numa versão |
| ✅ | entregue (com a versão anotada ao lado) |

**Regras de convivência:**

- **Ideia entregue sai daqui e vai para o `GAME_DESIGN.md`** — o design doc
  descreve o jogo que existe; aqui fica só a marca "✅ v1.x" com uma linha,
  para o histórico não sumir.
- **Nenhum item tem versão prometida.** Quem decide o que entra em cada release
  é o dono, item a item, olhando a tabela de custo × impacto (§6).
- **Ao alimentar**: acrescente no fim da seção temática, com data. Não reescreva
  a radiografia do §2 — ela é uma **fotografia datada**; medição nova entra como
  uma seção nova ao lado, para dar comparação.
- **Toda ideia daqui nasce obrigada às restrições do §6.** Elas não são
  negociáveis e já derrubaram implementação pronta no passado.

---

## 2. Radiografia dos dados — 2026-08-16

Levantada por um script de leitura pública (zero writes; sondas `claude-*`
filtradas). Os números abaixo estão **exatamente** como saíram; para reproduzir,
ver §3.

### 2.1 Totais (vitalícios, por aparelho)

- **51 jogadores** em `stats/` · **1.810 execuções** · **118 fugas** (7% das
  execuções) · **25,2 h** jogadas
- Ranking (`scores/`): 45 com apelido · recorde **5.185 m** (Ícaroo brabo)
- Dataset granular: **895 corridas** na janela de 50 de 45 jogadores
- Cobertura: 34/51 docs com `history.days` (17 legados pré-1.6.1 — a retenção
  diária é parcial)

### 2.2 Funil de distância

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

Corridas pós-portão: **61** (7% da janela) · mediana 1.224 m · p90 2.336 m ·
máx 5.185 m.

Top 5 `bestM`: 5.185 m (Ícaroo brabo) · 4.606 m (Thomas) · 3.304 m (Funku Pópi) ·
2.226 m (THÉO BEBE) · 2.098 m (Caio Lindão).

### 2.3 Aquisição × atividade

Novos jogadores por semana (1º registro visível — para legados a janela de 50
corta o passado):

| Semana de | Novos |
|---|---|
| 2026-07-27 | 1 |
| 2026-08-03 | 30 |
| 2026-08-10 | 15 |
| (sem data visível) | 5 |

Execuções por dia (últimos 14 dias com registro):

| Dia | Execuções |
|---|---|
| 2026-08-02 | 1 |
| 2026-08-04 | 20 |
| 2026-08-05 | 130 |
| 2026-08-06 | 9 |
| 2026-08-07 | 12 |
| 2026-08-08 | 6 |
| 2026-08-09 | 168 |
| 2026-08-10 | 144 |
| 2026-08-11 | 102 |
| 2026-08-12 | 95 |
| 2026-08-13 | 73 |
| 2026-08-14 | 39 |
| 2026-08-15 | 13 |
| 2026-08-16 | 34 |

Dias distintos com corrida, por jogador (42 mensuráveis): **1 dia: 29 (69%)** ·
2–3 dias: 6 · 4–7 dias: 7 · 8+ dias: 0 → **31% voltaram ao menos um segundo dia**.

### 2.4 Curva de aprendizado (mediana de metros por nº da tentativa)

| Tentativa | Corridas | Mediana | p90 |
|---|---|---|---|
| 1–5 | 96 | 178 m | 607 m |
| 6–15 | 80 | 318 m | 632 m |
| 16–30 | 138 | 309 m | 715 m |
| 31–50 | 183 | 366 m | 815 m |
| 51–100 | 225 | 408 m | 960 m |
| 101+ | 173 | 480 m | 1.049 m |

### 2.5 Mecânicas por corrida (matéria-prima dos pesos de qualquer pontuação)

Média por corrida (e por 100 m, entre parênteses), por faixa de distância da
corrida:

| Faixa | n | paredes | rampas | torres | animais | pulos | investidas | inv. negadas |
|---|---|---|---|---|---|---|---|---|
| 0–200 m | 261 | 0,1 (0,1) | 0,1 (0,1) | 0 (0) | 0 (0) | 6,9 (5,9) | 1,6 (1,4) | 2 (1,7) |
| 200–500 m | 311 | 1,6 (0,5) | 0,3 (0,1) | 0,1 (0) | 0,1 (0) | 23,8 (7,2) | 5,1 (1,6) | 3,6 (1,2) |
| 500–1000 m | 262 | 4,2 (0,6) | 0,7 (0,1) | 0,2 (0) | 0,2 (0) | 64,9 (8,9) | 9,9 (1,4) | 6,4 (1) |
| 1000–2000 m | 51 | 7 (0,5) | 1,5 (0,1) | 0,5 (0) | 0,4 (0) | 158,5 (11) | 15,7 (1,2) | 6,5 (0,5) |
| 2000–∞ m | 10 | 22,6 (0,8) | 4,6 (0,2) | 0,5 (0) | 2,2 (0,1) | 687,9 (22,9) | 36,9 (1,3) | 9,2 (0,3) |

### 2.6 Precisão de investida (proxy: acertos ÷ investidas)

- Corridas com investida: **464/895 (52%)**
- Acertos/investida — p10: 8,3% · **mediana: 50%** · p90: 100%
- Atrito com o cooldown: **3.730 investidas negadas** vs 5.753 disparadas
  (**39% dos toques**)

### 2.7 Boss do portão (baseline para bosses novos)

- Lutas na janela: 48 · fugas na janela: 61 · mortes por causa `boss`: **6**
- Camadas quebradas (0/1/2/3): **5 / 1 / 1 / 41** · duração mediana da luta: **4 s**
- Fúria Total usada em 42 corridas da janela (letra `f`) · fúria negada na arena
  (`n`): **0 registros**

### 2.8 Skins em uso (letra `g`; ausente = default)

`default` 862 · `robot` 28 · `catisqui` 5 → **5 de 51 jogadores** já correram com
skin não-default.

### 2.9 Contexto da base

- Corridas com teclado (desktop): 24 (3%)
- Última versão vista por jogador: 1.7.2×22 · 1.5.0×12 · 1.3.1×4 · 1.8.2×3 ·
  1.7.1×3 · 1.8.0×2 · 1.8.1×2 · 1.7.0×1 · 1.8.3×1 · 1.6.0×1
- Corridas por sessão (docs com `history`): 4,6

### 2.10 Ressalvas de leitura (sem elas as tabelas mentem)

- `runs[]` é a **janela das últimas 50** por jogador: veterano tem passado
  truncado. Contagem exata por dia só vem de `history.days` — presente em 34/51
  docs.
- Os totais do §2.1 são vitalícios **por aparelho** (1 doc = 1 aparelho, não 1
  pessoa).
- A simulação do §5-A usa `escaped ≈ m ≥ 1000` e não enxerga corridas fora da
  janela.
- Cobertura pequena nas letras de boss/skin (`z` 48 · `b` 43 · `f` 42 · `g` 33 ·
  `q` 5 · `n` 0) — sempre citar o `n` ao concluir qualquer coisa daí.
- Os primeiros **190 m são abertura roteirizada, sem animal nenhum** por design:
  qualquer medição curta de densidade sai distorcida. ⚠️ **Válido até a v1.8.3**
  — desde a v1.8.4 isso só vale para quem tem menos de 3 tentativas; veterano
  recebe a roleta cheia aos 60 m. Toda medição futura de densidade tem de
  separar os dois grupos, e os números acima são da era da abertura universal.

---

## 3. Como reproduzir a radiografia

O script que gerou o §2 (`tools/analyze-v2.mjs`) **foi apagado de propósito** ao
fim da sessão de 16/08 — não ficou lixo no repositório. Recriar leva minutos
seguindo esta especificação:

- **Acesso**: node puro, **REST GET público paginado**, sem SDK e sem
  credencial. Copiar `fetchCollection()` (`tools/daily-digest.mjs:59-82`) e
  `decode()` (`:42-57`); a apiKey sai de `js/firebase-config.js`. A leitura de
  `stats/` e `scores/` é pública por decisão do dono (`allow read: if true`) —
  ver também a memória "Ler a telemetria antes de projetar".
- **Higiene obrigatória**: filtrar ids `^claude-` (sondas de teste) e **zero
  writes** — o script é de leitura, ponto.
- **Volume**: as duas coleções inteiras cabem em ~896 KB / 1 página.
- **Métricas** (as do §2, além do que o painel `/?stats` já mostra): funil de
  `bestM` e de corridas por faixa; aquisição por semana via `firstSeenS`; série
  de execuções/dia e coortes de dias distintos; curva de aprendizado por nº da
  tentativa; distribuição de `w r o a j d x` por faixa; precisão proxy
  `(w+r+o+a)/d`; baseline do boss (`c=boss`, `z q b f`); modo infinito;
  skins (`g`); sessões, teclado e versões.
- **Saída**: markdown no stdout, pronto para colar aqui.
- **Conferência**: os totais têm de bater com o `npm run digest` do mesmo dia
  (em 16/08: 51 jogadores / 1.809–1.810 execuções / 118 fugas / recorde 5.185 m).
- ⚠️ Atenção: epoch em **segundos** em `t`, `firstSeenS` e `geo.at`.

---

## 4. O que os dados dizem (diagnóstico, separado das soluções)

1. **A retenção é o problema nº 1.** 69% dos jogadores mensuráveis jogaram **um
   único dia**; ninguém passou de 7 dias distintos. O jogo é bom o bastante para
   render 4,6 corridas por sessão, e não tem nenhum motivo declarado para voltar
   amanhã.
2. **A aquisição parou.** 30 novos na semana de 03/08, 15 na de 10/08 e a base
   praticamente estacionada (48 → 51). As execuções/dia caíram de 168 (09/08)
   para 34 (16/08). Todo crescimento veio de convite pessoal.
3. **Existe um deserto de 2.000 m a 10.000 m.** Depois do portão a dificuldade é
   **plana** (o tier 6 teta no portão) e não há **nenhum marco** até a LENDA.
   Só 10 corridas na janela passaram de 2.000 m, e 1 de 5.000 m. Quem venceu o
   boss não tem próximo objetivo.
4. **O portão virou pedágio, não clímax.** 41 das 48 lutas terminam com as 3
   camadas quebradas, mediana de **4 s** de luta e só 6 mortes. (A fúria já foi
   bloqueada na arena na v1.8 — o `n` = 0 diz que ninguém mais tenta o truque
   antigo, então o problema restante é de **desenho da luta**, não de exploit.)
5. **O cooldown da investida é o maior atrito da mecânica principal**: 39% dos
   toques de investida são negados. Não é necessariamente um defeito (o
   cooldown é o que dá peso à investida), mas é a única fricção que aparece em
   TODAS as faixas de distância.
6. **As skins quase não são tocadas**: 5 de 51 jogadores. Muito trabalho de
   sistema (registry, estúdio, desbloqueios) com pouquíssimo alcance — provável
   problema de **descoberta e de motivo**, não de conteúdo.
7. **A base roda versões velhas**: 12 jogadores ainda em 1.5.0 e 4 em 1.3.1.
   Qualquer mudança de contrato de dados tem de considerar clientes que **nunca
   vão atualizar**.

---

## 5. Ideias levantadas

Cada bloco é autossuficiente: dá para puxar um sem ler os outros.

### A. Pontuação composta — o ranking deixa de ser só distância ✅ **v1.8.4**

> ✅ **ENTREGUE em 21/08/2026 (v1.8.4).** A explicação do que o jogo faz hoje
> mora no `GAME_DESIGN.md` (seção "Pontuação composta"); o como fazer está em
> `docs/04-referencia-tecnica.md` §6/§7/§8. O que ficou de fora e continua
> valendo como ideia: a **eficiência de investida** (até +50% dos pontos de
> combate × `min(1,(w+r+o+a)/d)`) — é a única parcela que o jogador não vê
> acontecendo, e por isso foi adiada para entrar já calibrada. Também nasceu
> junto, fora do plano original: a **abertura por veterania** (a lição dos 190 m
> só para quem tem menos de 3 tentativas).
> O texto abaixo fica como registro do desenho original.

**O dado que motiva.** A distância é a única coisa que conta hoje; a habilidade
(derrubar torre, mirar a investida, vencer o boss rápido) não vale nada no
ranking. §2.5 e §2.6 mostram que existe matéria-prima farta e já gravada.

**Arquitetura (a parte esperta).** `score` passa a ser o **TOTAL** e nasce o
campo opcional **`scoreM`** (os metros da marca). Leitura universal:
`m = doc.scoreM ?? doc.score`. Não precisa de campo de versão — a presença de
`scoreM` já marca. Como o bônus é **sempre ≥ 0**, todo doc antigo e todo cliente
velho (1.3–1.5, ainda ativos!) continua gravando um total válido com bônus zero:
**retrocompatibilidade de graça, ninguém some do ranking**.

**Fórmula-semente** (módulo puro novo, `js/systems/ScoreSystem.js`):
parede +5 · rampa +5 · torre +15 · animal +3 · camada de boss +25 ·
eficiência de investida = até **+50% dos pontos de combate** ×
`min(1, (w+r+o+a)/d)` · fuga +100 · blitz (3 camadas em ≤20 s) +50 · LENDA +400 ·
**teto `bonus ≤ m`**. Ficam **de fora** `j/p/x/n` (spam e frustração não pontuam)
e `f` (seria contagem dupla).

**Simulação sobre as 895 corridas reais** (feita em 16/08 — este é o número que
justifica a ideia):

- Bônus/total por corrida — mediana **0%** · p95 **13,7%** (alvos: mediana 8–15%,
  p95 ≤ 25%). O cap `bônus ≤ m` não precisou agir em nenhuma corrida.
- Por faixa (o bônus só existe onde há combate — a régua certa):
  0–200 m mediana 0% (p95 3,9%) · 200–500 m 2,3% (11,2%) · 500–1000 m 4,6%
  (12,2%) · 1000–2000 m **17,6%** (23,3%) · 2000+ 12,8% (15,9%).
- **Spearman metros × total: 0,993** (alvo ≥ 0,9) — a ordem geral do ranking
  não vira de cabeça para baixo.
- Top 10 na janela, antes (metros) × depois (total):

| # | Por metros | Por total (composição) |
|---|---|---|
| 1 | Ícaroo brabo — 5.185 m | Ícaroo brabo — **5.804 pts** (5.185 m + 619) |
| 2 | Thomas — 4.606 m | Thomas — **5.174 pts** (4.606 m + 568) |
| 3 | THÉO BEBE — 2.226 m | THÉO BEBE — **2.552 pts** (2.226 m + 326) |
| 4 | Caio Lindão — 2.098 m | Caio Lindão — **2.478 pts** (2.098 m + 380) |
| 5 | Funku Pópi — 1.997 m | Funku Pópi — **2.362 pts** (1.997 m + 365) |
| 6 | Teco-Pc — 1.533 m | Teco-Pc — **1.907 pts** (1.533 m + 374) |
| 7 | Ai Gugu — 1.522 m | Ai Gugu — **1.847 pts** (1.522 m + 325) |
| 8 | Parker — 1.274 m | Parker — **1.626 pts** (1.274 m + 352) |
| 9 | sla123batata — 1.224 m | Caio Neguin — **1.398 pts** (1.090 m + 308) |
| 10 | Sla — 1.198 m | SarjetA — **1.343 pts** (1.076 m + 267) |

- Quem mais se move (≥2 posições): SarjetA ↑6 · Caio Neguin ↑5 · Anonimo_9950 ↑2 ·
  Batataexpeg2 ↑2 · Miguel justi ↓2 · sla123batata ↓2 · Motta2012 ↓2 · Sla ↓2 ·
  67 aura 卍 ↓2 · @Elis.AVE ↓3.

**Rules** (uma publicação só, aceitando forma velha **e** nova): whitelist
+`scoreM`; teto 20000; `(('scoreM' in data) || score <= 10000)`; `scoreM` 1..10000;
`score >= scoreM`; `score <= scoreM*2`.

**Migração**: `best_sent` local vira TOTAL + chave nova
`furious_rhino_best_sent_m` (mesmo padrão do `bestSentAt`); estacas da pista leem
`entry.m ?? entry.score`; `stats/bestM` **continua em metros**; o push de recorde
deixa de comparar por igualdade exata com metros; o rename reinjeta `scoreM` da
cópia local (`setDoc` sem merge apagaria).

**Exibição**: façanha física = **metros** (telas de fim, medalhas, skins,
estacas, funil); competição = **pts** (pódio, top 10 no formato
"1.234 pts · 987 m", gap, push). Tela de fim ganha o detalhamento do bônus e o
HUD mostra o total ao vivo com popups "+5".

**Custo** M–G · **Impacto** alto (dá teto novo ao jogador veterano sem mexer no
level design) · **Depende de** nada · **Quebra**: `test-stats` (asserts de texto
das rules), `e2e-ramp:718-725` e `:400-407`, `e2e-stats:49-51/:214` — e pede
teste novo do ScoreSystem + um calibrador (`tools/calibrate-score.mjs`).

**Decisões que ficaram em aberto** (com a recomendação da época): aceitar que
marcas antigas sejam superadas naturalmente (**sim** — reset suave e
meritocrático); HUD com total ao vivo (**sim**); fração-alvo do bônus ~12%;
mostrar metros junto no top 10 (**sim**); Fúria não pontua; convite e Diário
passam a falar em total (**sim**).

### B. Boss "O Cerco" (~2.000 m) ✅ **v1.8.5**

> ✅ **ENTREGUE em 21/08/2026 (v1.8.5)**, junto com C e D. Âncora cravada em
> **2.000 m fixo** (80.000 px) por decisão do dono, sem esperar a ideia H.
> Desvios do desenho original, também decisão do dono: a recompensa é
> **medalha (`boss2_win`) + pontos** (4 camadas × 25 + vitória 150 pts,
> letra `e` de camadas e `h` de segundos no `runs[]`) — a skin de façanha
> `{boss2Layers:4}` e o card no Diário **ficaram de fora**. A explicação do
> que o jogo faz hoje mora no `GAME_DESIGN.md`; o texto abaixo fica como
> registro do desenho original.

Barricada de contenção urbana com um **Capturador** (canhão de redes) no topo.
Ancorado em 80.000 px, a face do clamp cai a ~3 m da medalha "Inalcançável" —
a medalha vira a recompensa da luta **de graça**.

**Por que ali**: §2.2 mostra o paredão — 10 corridas passaram de 2.000 m. É o
começo do deserto (§4.3) e a fronteira natural do próximo objetivo.

**Variações sobre a espinha do portão** (para não ser o mesmo chefe de novo):
4 camadas em ordem **não monótona** `[mid, ground, high, mid]`; tiro em **leque**;
**rasante anti-camping** no chão (morteiro só na última camada); **enrage suave**
aos 45 s (a cadência desce um degrau — nunca um muro de morte); tabela própria
`BOSS2_NET` mutável pelos sliders do `?debug=1`.

**Vitória**: a corrida **CONTINUA** (explosão + medalha `boss2_win` + skin de
façanha `{boss2Layers:4}` + card no Diário). **Derrota**: causa `boss2`, com
título próprio.

**Custo** G · **Impacto** alto · **Depende de** D (refactors) e, idealmente, de H
(o funil novo confirma a âncora: massa de mortes em 1.400–2.000 m confirma
2.000 m; mediana pós-fuga < 1.600 m puxa para 1.800 m; folga > 2.200 m empurra
para 2.400 m).

### C. Boss "Guardião do Fim" (~9.995 m) ✅ **v1.8.5**

> ✅ **ENTREGUE em 21/08/2026 (v1.8.5)**. Como desenhado: 5 camadas em
> palíndromo, arena de graça nos 1.500 px da LENDA, vencer dispara a LENDA.
> Desvio (decisão do dono): recompensa = **medalha (`legend_world`) +
> pontos** (5 × 25 + o `legend` de 400 que já existia; letra `l` no
> `runs[]`) — a skin exclusiva `{legend:true}` **ficou de fora**, e com ela
> o anúncio aspiracional no guarda-roupa. O texto abaixo fica como registro.

O Caçador-Mor na última cerca do mundo. **A arena sai de graça**: os 1.500 px sem
spawn da LENDA já são exatamente isso. 5 camadas em palíndromo
`[ground, mid, high, mid, ground]`, arsenal remixando os dois bosses anteriores.
**Vencer dispara a LENDA** (`legend = true; endGame(true)`) — a cutscene existente
vira a festa do chefe. Skin exclusiva `{legend:true}` + medalha `legend_world`.

**O valor é aspiracional**: ninguém chegou perto (§2.2, recorde 5.185 m). A skin
bloqueada no guarda-roupa e a vitrine do pódio **anunciam o desafio para todos**,
inclusive para quem nunca vai vê-lo.

**Custo** M (menor que B — a arena e a cutscene já existem) · **Impacto** médio
(alcance pequeno, valor simbólico grande) · **Depende de** D.

### D. Refactors R1–R7 do `BossFight.js` ✅ **v1.8.5** — pré-requisito de B e C

> ✅ **ENTREGUE em 21/08/2026 (v1.8.5)**, todos os 7 passos, com `e2e-boss`
> 16/16 preservado (e os `zoo-gate-armored-*` byte a byte idênticos na
> prova do R7). O `BossFight`/`HunterSniper` viraram paramétricos por
> objeto de definição; a zona sem spawn é unificada (`inNoSpawnZone`);
> nasceram as suítes `e2e-boss2`/`e2e-boss3`. O texto abaixo fica como
> registro.

Comportamento **idêntico**, `e2e-boss` 16/16 após **cada** passo:

| | O quê |
|---|---|
| R1 | `anchorX` substitui as 10 ocorrências de `WIN_DISTANCE_PX` |
| R2 | camadas paramétricas (pips e texturas derivados do array — hoje `[3,2,1]` está fixo no `TextureFactory.js:610`) |
| R3 | tabela de tiro por parâmetro (o portão passa a receber a MESMA referência `BOSS_RIFLE`; sliders seguem vivos) |
| R4 | callbacks `onDefeat` / `bypass` |
| R5 | fúria por lista (`bossFights[]`, mantendo o alias `scene.bossFight`) |
| R6 | **zona sem spawn unificada** `inNoSpawnZone(x)` — substitui 4 cópias da janela + 3 guardas da LENDA no `SpawnManager`. **O mais delicado**: usar o `e2e-ramp` inteiro como rede |
| R7 | arte paramétrica (`generateArmoredSet(prefix, layers)`) |

Depois vêm C1 (Cerco), C2 (Guardião) e as suítes novas `e2e-boss2`/`e2e-boss3`,
espelhando os asserts do `e2e-boss`. Inegociáveis em qualquer boss novo: quique
sem soft-lock, arena sem spawn, fúria negada dentro da arena, "a última camada
NÃO chama `crossGate`" (no Cerco) / "dispara a LENDA" (no Guardião).

**Custo** M · **Impacto** nenhum sozinho (é infraestrutura) · **Sem ele**, B e C
viram cópia-e-cola do portão — o caminho mais rápido para um bug de soft-lock.

### E. Campanha e capítulos 📐

Bloco "Objetivos" dentro do box Campanha da home: capítulo corrente + missão da
semana + pílula de streak.

**Reaproveitamento quase total**: `MissionSystem.js` novo usando
`SkinSystem.conditionMet` e `requirementText` (já são genéricos); capítulos fixos
em `MissionRegistry.js` no molde do `SkinRegistry`; **missão da semana via doc
`config/missions`** — as rules **já** permitem `read` em `config/*`, então o dono
edita no console como faz com o `news`, cache TTL 1 h no molde do `NewsSystem`.
Estado local-first (`furious_rhino_missions`), progresso **derivado das últimas 50
corridas**: zero rastreamento novo.

**Capítulos propostos, desenhados para preencher o deserto**: A Fuga (o
retro-scan já marca como feito para os 118 fugitivos — "já tenho progresso" no
primeiro boot) → O Cerco → A Cidade é Sua (2.500 / 3.000 / 4.000 m) → Rumo ao Fim
(5.000 / 7.500 m) → LENDA.

**Sem diárias automáticas**: uma base de 51 não sustenta esteira de missão
diária; a semanal editada à mão dá a cadência sem criar obrigação.

**Custo** M · **Impacto** alto na retenção (§4.1) · **Depende de** nada (B e C
enriquecem, mas não bloqueiam).

### F. Streaks 📐

`history.days` existe há meses e ninguém lê para isso. Streak corrente calculado
no cliente (regra do "ontem mantém a chama"), melhor streak persistido local,
pílula no box Campanha, medalhas `streak_3/7/30` e skin `{streakBest:7}` (tipo
"total de vida"). **Copy sempre convite, nunca bronca.**

**Custo** XS · **Impacto** médio-alto (ataca direto os 69% de um dia só) ·
**Depende de** nada. É a melhor relação custo/benefício da lista junto com H.

### G. Desafio por link 💡📐

`/?desafio=1234&de=Nome` no share do WhatsApp: quem abre vê um banner na home e
uma **bandeira na pista em `m × 40 px`** — a marca do amigo aparece no chão,
como as estacas de recorde. O "devolvi o desafio" fecha o loop A→B→A.

**Por que importa**: é a **única alavanca de aquisição** de todo o levantamento
(§4.2). Todo o resto melhora quem já joga.

**Sanitização estrita** (é entrada de URL, tratada como hostil): clamp 1..10000,
nome de 3 a 12 caracteres, sempre via `textContent`.

**Custo** M · **Impacto** alto e diferente de todos os outros · **Depende de**
nada. O "ghost" (fantasma da corrida do amigo) ficou **fora**: exigiria série
temporal, coleção nova e mudança de rules.

### H. Faixas novas no funil do `/?stats` 📐 — a mais barata da lista

Hoje o funil do painel termina em "1000m+" (`StatsDashboard.js:362` e `:533`).
Parametrizar as faixas e acrescentar 1.400 / 2.000 / 3.000 / 5.000 m.

**Por que primeiro**: é deploy isolado, sem rules, sem dado novo — e é o que
**decide a âncora do Cerco** com número real em vez de palpite. Também dá
visibilidade permanente ao deserto do §4.3.

**Custo** XS · **Impacto** indireto, mas destrava B · **Depende de** nada.

### Descartadas / adiadas (com o motivo, para não voltarem por engano)

| Ideia | Por que não |
|---|---|
| **Ghost** (fantasma do amigo na pista) | Exigiria série temporal por corrida, coleção nova e mudança de rules — caro demais para o valor |
| **Aba de missões no `/?setup`** | O console do Firebase já cobre a edição do `config/missions` |
| **3º boss aos 3.000 m** | Só com dado que justifique (gatilho: massa de corridas na faixa depois do Cerco) |
| **Push a jogadores** | O ntfy é canal do administrador; notificar jogador é outra natureza de produto |
| **Missões diárias automáticas** | Base de 51 não sustenta a esteira; vira lista vazia |

---

## 6. Restrições que qualquer ideia daqui respeita

1. **Orçamento de letras livres em `runs[]`.** Livres na v1.8.4: 6 (`e h i l u y`);
   a **v1.8.5 gastou 3** (`e` camadas do Cerco · `h` segundos do Cerco ·
   `l` camadas do Guardião) — **restam 3** (`i u y`), exatamente as que E, F e
   G pediriam, sem reserva nenhuma. O texto original: As
   ideias acima pedem **7** e colidiam em `e` e `u`. Reconciliação sugerida:
   `e` camadas do Cerco · `h` segundos do Cerco · `l` camadas do Guardião ·
   `y` missões concluídas · `u` corrida vinda de desafio · `i` acertos em
   investida (precisão exata). **O bônus por corrida NÃO ganha letra** — é
   determinístico e recomputável dos contadores existentes, e o `run.v` já
   versiona a fórmula. Sobra **zero** de reserva; a alternativa registrada é
   sacrificar o `h` (o atrito do Cerco é inferível de `e` + funil).
2. **Orçamento das rules do Firestore.** 19 campos passavam, 20 falhavam — e o
   write negado é **silencioso**. Campo novo entra dentro dos mapas existentes.
   A publicação de rules de qualquer combinação dessas ideias deve ser **uma
   só**, consolidando: whitelist + `scoreM`, teto 20000, aritmética do bônus e
   `deaths.size() <= 15` (13 das 14 causas já estão em uso; o bump é
   retrocompatível e custa zero de orçamento).
3. **Ordem de release**: rules publicadas no console **ANTES** do deploy do
   código. Sempre.
4. **`sw.js`**: todo `.js` novo entra em `ASSETS` **e** o `CACHE` sobe de versão.
5. **Clientes velhos existem e não vão atualizar** (§2.9): nenhuma mudança de
   contrato pode fazê-los sumir do ranking ou gravar lixo.
6. **Medalhas são append-only** e os ids são imutáveis (`boss2_win`,
   `legend_world`, capítulos, `streak_3/7/30`).
7. **Barreira nunca é corpo físico** — clamp posicional, jamais de velocidade
   (soft-lock é pior que morte). Nada de pressão letal por trás; rampa fora de
   arena; `clearTint` obrigatório no pool de dardos (precedente do `TranqDart`);
   fúria segue bloqueada em arena nova.

---

## 7. Custo × impacto — a ordem sugerida de puxada

Se as ideias fossem saindo uma por versão intermediária, esta é a ordem que o
levantamento recomendou (barato e destravante primeiro):

| Ordem | Ideia | Custo | Impacto |
|---|---|---|---|
| 1 | **H** — faixas do funil no `/?stats` | XS | ainda vale: agora mede o Cerco em campo |
| 2 | **F** — streaks | XS | retenção |
| ~~3~~ | ~~**D** — refactors do BossFight~~ | — | ✅ **entregue na v1.8.5** |
| ~~4~~ | ~~**B** — boss "O Cerco"~~ | — | ✅ **entregue na v1.8.5** |
| 5 | **E** — capítulos e campanha | M | retenção |
| 6 | **G** — desafio por link | M | **aquisição** |
| ~~7~~ | ~~**A** — pontuação composta~~ | — | ✅ **entregue na v1.8.4** |
| ~~8~~ | ~~**C** — boss "Guardião do Fim"~~ | — | ✅ **entregue na v1.8.5** |

Nada obriga a essa ordem — A e G são independentes de tudo e podem furar a fila
a qualquer momento.

Vale lembrar as pendências pequenas que continuam abertas fora desta lista
(estão no `HANDOFF.md`): leitores de `runs[].g` / `runs[].n` no painel,
calibração fina da densidade de animais em campo (`04-referencia-tecnica.md` §8b)
e as descrições de skin a ajustar pelo `/?setup`.

---

## 8. Procedência

Tudo neste documento veio da sessão de planejamento de **16/08/2026**
("Rhino-Plan2.0"), que desenhou uma release grande chamada "v2.0" a partir de
uma análise dos dados reais. Naquele dia:

- O plano foi aprovado **por engano** e o dono interrompeu a execução: **a
  release grande foi arquivada de propósito**.
- Tudo que tinha sido criado no repositório foi removido (o `tools/analyze-v2.mjs`
  foi apagado depois de rodar; o `docs/PLANO-V2.md` nunca chegou a existir).
- A análise foi **100% leitura** — zero writes no Firestore em toda a sessão.
- O registro sobreviveu apenas no arquivo de plano
  `C:\Users\crist\.claude\plans\ler-o-hand-off-resilient-cookie.md`, fora do git.

Em **21/08/2026** o dono decidiu trazer o levantamento para o repositório
**desamarrado de qualquer versão** — daí este documento: o valor está nos dados
e nas ideias, não no rótulo "v2.0", que fica oficialmente aposentado.
