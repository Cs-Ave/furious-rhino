
> mobilegame@1.12.0 radiografia
> node tools/radiografia.mjs

## Radiografia dos dados — 2026-09-05

> Gerada por `tools/radiografia.mjs` / aba 📊 do `/?setup` (leitura pública,
> zero writes; sondas `claude-*` filtradas na busca). Baseline de comparação:
> a fotografia de 2026-08-16 (§2). Conferência: os totais abaixo usam as
> mesmas somas do `npm run digest` do dia.

### Resumo executivo

1. Base: **75 jogadores** (+24 vs 16/08) · **2.350 execuções** (+540) · **131 fugas** (+13) · 30,9 h.
2. Retenção: **57% um dia só** (era 69%) · 43% voltaram (era 31%) · 3,9 corridas/sessão.
3. Funil: **5 aparelhos ≥ 2000 m** (era 5) · mediana pós-portão **1.198 m** (era 1.224) · recorde 5.185 m.
4. 🟢 Retenção: jogadores de um dia só: 57% de um dia só — era 69% na baseline.
5. 🟠 Ritmo de jogo (últimos 7 dias vs 7 anteriores): 44 execuções nos últimos 7 dias vs 235 nos 7 anteriores (19%).

### Totais (vitalícios, por aparelho)

| | Agora | 16/08 | Δ |
|---|---|---|---|
| Jogadores (`stats/`) | 75 | 51 | +24 |
| Execuções | 2.350 | 1.810 | +540 |
| Fugas | 131 | 118 | +13 |
| Horas jogadas | 30,9 | 25,2 | — |
| Ranking (com apelido) | 66 | 45 | +21 |
| Corridas na janela | 1.164 | 895 | +269 |
| Docs com `history.days` | 56/75 | 34/51 | — |

Recorde do ranking: **5.185 m** (Ícaroo brabo, 5.185 pts) · maior `bestM`: 5.185 m.

### Funil de distância

| Marca | Jogadores (bestM ≥) | 16/08 | Corridas (m ≥) | 16/08 |
|---|---|---|---|---|
| 100 m | 64 | 46 | 951 | 785 |
| 200 m | 55 | 41 | 741 | 634 |
| 300 m | 46 | 34 | 549 | 490 |
| 500 m | 41 | 33 | 335 | 323 |
| 800 m | 25 | 22 | 134 | 129 |
| 1.000 m | 18 | 17 | 57 | 61 |
| 1.400 m | 8 | 7 | 20 | 23 |
| 2.000 m | 5 | 5 | 10 | 10 |
| 3.000 m | 4 | 3 | 4 | 3 |
| 5.000 m | 1 | 1 | 1 | 1 |
| 10.000 m | 0 | 0 | 0 | 0 |

Pós-portão: **57** corridas · mediana 1.198 m · p90 2.581 m · máx 5.185 m (16/08: 61 · 1.224 · 2.336 · 5.185).

Top 5 `bestM`: 5.185 m (Ícaroo brabo) · 4.606 m (Thomas) · 3.468 m (Caio Lindão) · 3.304 m (Funku Pópi) · 2.226 m (THÉO BEBE).

### Aquisição × atividade

| Semana de | Novos |
|---|---|
| 2026-07-27 | 1 |
| 2026-08-03 | 32 |
| 2026-08-10 | 18 |
| 2026-08-17 | 10 |
| 2026-08-24 | 8 |
| 2026-08-31 | 1 |
| (sem data visível) | 5 |

| Dia | Execuções | Jogadores |
|---|---|---|
| 2026-08-23 | 131 | 13 |
| 2026-08-24 | 4 | 3 |
| 2026-08-25 | 65 | 6 |
| 2026-08-26 | 4 | 2 |
| 2026-08-27 | 2 | 2 |
| 2026-08-28 | 8 | 5 |
| 2026-08-29 | 21 | 3 |
| 2026-08-30 | 30 | 5 |
| 2026-08-31 | 0 | 0 |
| 2026-09-01 | 0 | 0 |
| 2026-09-02 | 7 | 3 |
| 2026-09-03 | 0 | 0 |
| 2026-09-04 | 4 | 2 |
| 2026-09-05 | 3 | 2 |

### Retenção

Dias distintos com corrida (56 mensuráveis): **1 dia: 32 (57%)** · 2–3: 9 · 4–7: 10 · 8–14: 5 · 15+: 0 → **43% voltaram ao menos um segundo dia** (16/08: 31%). Corridas por sessão: 3,9 (16/08: 4,6).

Coortes por semana do primeiro acesso (D1/D7/D30 em dias de calendário; D30 só para coortes de 30–60 dias — o `history.days` poda aos 60):

| Coorte (semana) | n | D1 | D7 | D30 |
|---|---|---|---|---|
| 2026-08-03 | 19 | 11% (2/19) | 63% (12/19) | 100% (8/8) |
| 2026-08-10 | 18 | 11% (2/18) | 22% (4/18) | ⚪ |
| 2026-08-17 | 10 | 20% (2/10) | 20% (2/10) | ⚪ |
| 2026-08-24 | 8 | 25% (2/8) | 29% (2/7) | ⚪ |
| 2026-08-31 | 1 | ⚪ | ⚪ | ⚪ |

⚪ = menos de 3 elegíveis na célula — existência sim, taxa não.

### Curva de aprendizado (mediana de metros por nº da tentativa)

Separada por ERA (§2.10): era A = abertura universal (≤ 1.8.3), era B = roleta cheia aos 60 m da 3ª tentativa (≥ 1.8.4). **Não comparar entre eras** além das tentativas 1–3.

| Tentativa | Era A: n / mediana / p90 | Era B: n / mediana / p90 |
|---|---|---|
| 1–5 | 95 / 157 m / 500 m | 32 / 188 m / 962 m |
| 6–15 | 60 / 245 m / 596 m | 46 / 181 m / 497 m |
| 16–30 | 71 / 360 m / 850 m | 35 / 168 m / 463 m |
| 31–50 | 85 / 417 m / 950 m | 11 / 57 m / 284 m |
| 51–100 | 258 / 327 m / 842 m | 84 / 58 m / 297 m |
| 101+ | 163 / 428 m / 987 m | 43 / 376 m / 854 m |

Onboarding comparável (tentativas 1–3, era B): n=24 · mediana 188 m · p90 880 m. Corridas de era indeterminada: 181.

### Mecânicas por corrida (média por corrida; por 100 m entre parênteses)

| Faixa | n | paredes | rampas | torres | animais | pulos | investidas | inv. negadas |
|---|---|---|---|---|---|---|---|---|
| 0–200 m | 423 | 0,2 (0,2) | 0,1 (0,1) | 0,0 (0,0) | 0,1 (0,1) | 6,6 (6,4) | 2,1 (2,0) | 2,1 (2,1) |
| 200–500 m | 406 | 2,0 (0,6) | 0,3 (0,1) | 0,1 (0,0) | 0,4 (0,1) | 27,3 (8,4) | 5,9 (1,8) | 3,7 (1,1) |
| 500–1000 m | 278 | 4,2 (0,6) | 0,6 (0,1) | 0,3 (0,0) | 0,4 (0,1) | 104,7 (14,9) | 10,0 (1,4) | 34,6 (4,9) |
| 1000–2000 m | 47 | 6,7 (0,5) | 1,2 (0,1) | 0,7 (0,1) | 0,7 (0,1) | 140,2 (11,0) | 14,1 (1,1) | 4,7 (0,4) |
| 2000+ m | 10 | 23,1 (0,7) | 4,7 (0,2) | 0,6 (0,0) | 2,3 (0,1) | 702,0 (22,6) | 38,8 (1,3) | 11,6 (0,4) |

### Precisão e atrito de investida

Corridas com investida: 718/1.164. Acertos/investida (PROXY — fúria e multi-quebra superestimam; a letra livre `i` é a correção definitiva): p10 0,0% · mediana 50,0% · p90 100,0% (16/08: mediana 50%).

Atrito do cooldown: **12.335 negadas** vs 7.073 disparadas (**64%** dos toques; 16/08: 39%). Pausas: 66 corridas com pausa (letra `p`, lida pela primeira vez).

### Bosses

**Portão (1000 m):** 51 lutas na janela · fugas na janela: 57 · camadas (0/1/2/3): 6 / 3 / 6 / 36 · mediana 4 s · mortes por `boss`: 20 (16/08: 48 lutas, 41 full, 4 s, 6 mortes).

**Boss dos 2000 m (letras `e`/`h`, lidas pela primeira vez):** 10 chegadas · camadas (0/1/2/3/4): 10 / 0 / 0 / 0 / 0 · mediana 0 s · mortes por `boss2`: 2.

**Guardião do Fim (letra `l`):** 0 corridas com camada quebrada · mortes: 0 · LENDAS: 0 — existência, nunca taxa (recorde 5.185 m).

Fúria Total usada em 39 corridas · fúria negada em arena (`n`): **3** (16/08: 0 — sempre citar).

### Pontuação composta em campo (v1.8.4)

Adoção: 19/66 docs do ranking com `scoreM` (marca cravada por cliente ≥ 1.8.4 — adoção baixa é esperada, a base é majoritariamente antiga).

Bônus recomputado na janela (`ScoreSystem.runBonus`, corridas v ≥ 1.7, n=770): mediana 4,5% · p95 13,5% (simulação de 16/08: mediana 0% · p95 13,7%; alvos: mediana 8–15% · p95 ≤ 25%). Spearman metros × total: 0,999 (alvo ≥ 0,9; simulado 0,993). Teto `bonus ≤ m` agiu em 0 corrida(s) (simulação: 0).

### Skins (letra `g`; ausente = default)

`robot` 141 · `party` 38 · `mecacolo` 27 · `rinorob` 17 · `catisqui` 5 · `bronze-2` 4 · `1-gold` 2 · `pratagra` 2 → **21 de 66 jogadores** com corrida de skin não-default (16/08: 5/51). No pódio (`scores.skin`): `mecacolor` 4 · `robot` 4 · `1-gold` 1 · `bronze-2` 1 · `pratagrande` 1 · `rinorob` 1.

### Arena de Desafios (v1.8.6, coleção `challenges`)

13 desafios (0 ativos, 13 expirados) · duração: 3d×10 · 1d×3 · tamanho: 2 part.×11 · 5 part.×1 · 8 part.×1.

Aceite: 6/22 convites (27%) — o criador nasce aceito e é descontado; **recusa não é gravada** (pode ser "nunca viu"). Latência mediana de aceite: 1,0 h (mede hábito de abrir o jogo, não interesse — a descoberta tem TTL de 1 h). Jogadores envolvidos: 20.

### Mortes (vitalícias, mapa `deaths`)

Por tier: t1 913 · t2 493 · t3 329 · t4 245 · t5 126 · t6 93.
Por causa: `wall` 1.231 · `animal` 384 · `spike` 257 · `dart` 249 · `tower` 52 · `boss` 20 · `fall` 4 · `boss2` 2 · `boss3` 0 · `cerco` 0 · `farao` 0.

### Contexto da base

Última versão vista: 1.5.0×11 · 1.12.0×10 · 1.7.2×10 · 1.9.5×10 · 1.8.3×9 · 1.9.0×7 · 1.3.1×4 · 1.7.1×3 · 1.9.11×2 · 1.10.0×1 · 1.6.0×1 · 1.7.0×1 · 1.8.10×1 · 1.8.11×1 · 1.9.1×1 · 1.9.10×1 · 1.9.3×1 · 1.9.7×1.
Aparelhos: mobile×47 · desktop×21 · tablet×7 · PWA instalado (standalone): 32 · corridas com teclado: 103.
Países: BR×71 · JP×2 · US×1 (geo tem TTL de 12 h e pode estar velho).
Ativos (por `updatedAt`): 12 nos últimos 7 dias · 67 nos últimos 30.

### Ressalvas de leitura (sem elas as tabelas mentem)

- `runs[]` é a **janela das últimas 50** por jogador (veterano tem passado truncado) e `history.days` poda aos 60 dias — deltas de métricas de janela podem ser só rotação.
- Totais vitalícios são **por aparelho** (1 doc = 1 aparelho, não 1 pessoa).
- Cobertura por letra (corridas com a letra > 0): `w` 574 · `r` 260 · `o` 90 · `a` 204 · `j` 709 · `d` 718 · `x` 449 · `p` 66 · `f` 39 · `n` 3 · `b` 45 · `q` 13 · `z` 51 · `e` 0 · `h` 0 · `l` 0 · `u` 0 · `y` 0 · `i` 146 · `zu` 0 · `zy` 0 · `zl` 0 · `qe` 0 · `qu` 0 · `qy` 0 · `ql` 0 · `fc` 13 · `cj` 17.
- Com ~75 jogadores, o IC95 de proporções por jogador é ≈ ±14 p.p.: deltas menores são SINAL, não prova. Por corrida (n≈1.164) o IC95 é ≈ ±3 p.p.
- NÃO concluir daqui: causalidade (curva de aprendizado mistura sobrevivência com aprendizado); comparações de densidade entre eras A/B; taxas sobre subgrupos com n < 15 (existência sim, taxa não); "retenção de pessoas" (é de aparelhos).
- Fora de escopo declarado: coleção `config/` (conteúdo editorial do dono — news/notify —, não telemetria de jogador).

### Insights automáticos (motor de regras, molde do §4)

- 🟠 **[R-04] Ritmo de jogo (últimos 7 dias vs 7 anteriores)** — 44 execuções nos últimos 7 dias vs 235 nos 7 anteriores (19%). A base ativa esfriou à metade — atenção à janela de 50: parte pode ser rotação, o history.days aqui é contagem exata. **Sugestão:** Se não houver release recente para reengajar, é o momento de puxar uma ideia de retenção (E/F).
- 🟠 **[R-05] O deserto depois dos 2000 m** — 10 corridas (0,9%) passaram dos 2000 m; mediana pós-portão 1.198 m (baseline 1.224 m). O deserto do §4.3 segue intacto: quem vence o portão não tem próximo objetivo alcançável. **Sugestão:** As ideias J (cidade em 3 distritos) e H (funil fino no /?stats) atacam exatamente isto.
- 🟠 **[R-08] Atrito do cooldown da investida** — 12.335 investidas negadas vs 7.073 disparadas (64%; baseline 39%). A única fricção presente em TODAS as faixas de distância (§4.5) — não é defeito por si (o cooldown dá peso à investida), mas subiu. **Sugestão:** Antes de mexer no cooldown, medir a precisão exata (a letra livre `i` é a correção definitiva do proxy).
- 🟠 **[R-14] Arena de Desafios (v1.8.6)** — 13 desafios, aceite 27% (recusa não é gravada: parte pode ser "nunca viu"). A arena está morna — o motivo social de voltar amanhã não está circulando. **Sugestão:** Dar visibilidade ao botão ⚔️ do top 10; a ideia G (desafio por link) seria a porta de entrada.
- 🟠 **[R-15] Fúria negada na arena de boss (letra n)** — 3 ativações de fúria negadas dentro de arena (baseline: 0). Jogadores voltaram a tentar o truque antigo de estourar a fúria no boss. **Sugestão:** Se crescer, reforçar o feedback visual de "fúria bloqueada aqui".
- 🟡 **[R-11] Versões velhas na base** — 39 de 75 aparelhos (52%) na última visita rodavam < 1.8.4 (gravam score sem scoreM); 16 ainda < 1.6.1 (sem letras). Clientes que talvez nunca atualizem (§4.7): qualquer mudança de contrato de dados tem de continuar aceitando a forma velha. **Sugestão:** Manter a regra da casa: retrocompatibilidade sem migração (versão corrente: 1.12.0).
- 🟢 **[R-01] Retenção: jogadores de um dia só** — 57% de um dia só — era 69% na baseline. O problema nº 1 do levantamento cedeu (queda além de qualquer ajuste fino). **Sugestão:** Identificar o que mudou desde 16/08 (v1.8.4–1.8.6) e dobrar a aposta.
- 🟢 **[R-02] Retorno ao segundo dia** — 43% voltaram ao menos um segundo dia (baseline 31%; Δ +12 p.p.). Movimento na direção certa — mas com n≈50 é sinal, não prova (IC95 ±14 p.p.). **Sugestão:** Cruzar com a data das releases; repetir a leitura em 2 semanas antes de reagir.
- 🟢 **[R-03] Aquisição de jogadores novos** — 8 novos na última semana cheia (2026-08-24). A aquisição, parada desde §4.2, voltou a respirar. **Sugestão:** Descobrir a origem (convite? desafio por link G?) e alimentar o canal.
- 🟢 **[R-10] Adoção de skins** — 21 de 66 jogadores com corrida de skin não-default (32%; baseline ≈10%). A adoção dobrou desde a baseline. **Sugestão:** Manter a esteira de skins de façanha.
- 🟢 **[R-12] Pontuação composta em campo** — Bônus/total: mediana 4,5% · p95 13,5% (alvos: mediana 8–15%, p95 ≤ 25%) · Spearman 0,999. O campo confirmou a simulação de 16/08 no p95. Nota crônica: a mediana simulada já nascera em 0%, fora do alvo 8–15% — o bônus só existe onde há combate. **Sugestão:** A parcela adiada (eficiência de investida, §5-A) é o caminho registrado para subir a mediana com segurança.
- ⚪ **[R-07] Boss dos 2000 m (letras e/h)** — n=10 (mínimo 15) — sem base para afirmar; o motivo do silêncio fica registrado.
- ⚪ **[R-16] Onboarding (tentativas 1–3, era ≥1.8.4)** — n=24 (mínimo 40) — sem base para afirmar; o motivo do silêncio fica registrado.

*Gerado em 2026-09-05 · script v1.0.0 · jogo v1.12.0 · origem: cli.*

