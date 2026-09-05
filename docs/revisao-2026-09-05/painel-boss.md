# Feedback 2 — "boss fights todos parecidos": tese, Portão, Muralha, pacotes e métricas

Arquivos lidos (somente leitura): `C:/Users/crist/MobileGame/js/systems/BossFight.js`, `js/entities/HunterSniper.js`, `js/scenes/GameScene.js` (defs 93-264, `crossGate`/`defeatMuralha`/`defeatCerco`/`defeatFarao` 3369-3581, `HAZARD_SPOTS` 2818), `js/utils/Constants.js` (BOSS_*/CRACK_*/WEATHER_SCRIPT/física do rino), `js/entities/TimedHazard.js`, `js/entities/Rhino.js` (pulo/dash/knockback), `js/systems/TextureFactory.js` (`armoredPalette`, `generateArmoredVariant`, Contenção), `js/utils/StorageManager.js` (`RUN_COUNTERS`), `js/systems/MedalSystem.js`, `js/systems/AudioSystem.js` (nomes dos `play*`), `docs/IDEIAS-FUTURAS.md` §M.

## 0. Diagnóstico em uma frase

Os cinco chefes compartilham o esqueleto (correto — parametrizar, nunca copiar) **e também compartilham tudo o que o jogador percebe**: atirador no mesmo posto (`hunterOffsetX`/`hunterY` existem na def e nenhuma das cinco os preenche), mesma buzina (`playBossHorn` nos cinco), mesma dica (`how: 'INVISTA na fresta que brilha!'` idêntica nas cinco defs), mesmo glow, mesmo ciclo quebra-quique-volta (~1,3 s), nenhum ponto médio, e a variação real mora numa tabela de cadência — exatamente o "só mais rápido" que a doutrina M diz cruzar a linha. A pele muda; o verbo, a voz e a estrutura não. Tese: **uma classe, cinco defs, mas cada def com UM verbo examinado, UM ponto médio visível e UMA voz** — obtidos por ganchos genéricos no `BossFight` (nunca `if (def.id === ...)`).

Verificações de código que mudam o plano:
- `telegraphStyle` **não existe** (grep vazio em todo o repo): o despacho é `cfg.holo` + paridade do tiro. Está listado no dossiê como gancho; é código novo (pequeno).
- `hunterOffsetX`/`hunterY` existem e são estáticos; `muzzle()` deriva de `this.x/y`, então mover o atirador (tween) arrasta laser e balística sem código extra — o gancho mais barato de identidade do sistema.
- `generateArmoredVariant` abre bandas por `(layers, brokenCount)` **na ordem** — uma fresta que migra de altura quebra o contrato das texturas `${prefix}-${N}` (precisaria de variantes por contagem de alturas quebradas, ~12 texturas no Cerco). Por isso a forma recomendada do gancho "fresta que migra" é **fresta que FECHA por timer** (mesma altura, contrato intacto — ver Barreira).
- `defeatMuralha`/`defeatCerco`/`defeatFarao` são ~90% cópia (tombo do clone, 3 partículas, shake 320/0.014, addScore, 2 toasts): o helper `stageDefeat(prefix, anchorX, opts)` é dívida e pré-requisito do M3.
- O atirador e o alvo **não têm corpo físico**: a regra "escala visual é cara" (Arcade escala o body) não os alcança — escalar o Comandante para legibilidade noturna é grátis.
- `HAZARD_SPOTS` foram mantidos "longe das arenas" (comentário na tabela) por janela do pool de 4 e legibilidade — não é regra contra hazard de arena; é decisão de posição.

## 1. A tese: cinco chefes, cinco verbos

### 1.1 Ganchos genéricos (uma vez na classe, cinco conteúdos nas defs)

| Gancho | Estado | Custo | Serve a |
|---|---|---|---|
| `def.midpoint = { layersLeft, sfx, toast, fx, texture? }` — disparado UMA vez em `breakLayer` quando `layersLeft() === midpoint.layersLeft` | novo | XS (~30 linhas) | os 5 (ponto médio visível) |
| `def.callSfx` — chamada de entrada por chefe (sons que já existem: `playBossHorn`, `playSirenShort`, `playKlaxon`, `playThunder`, `playAreaSting`) | novo | XS | os 5 (voz) |
| `def.hunterOffsetX/hunterY` — posto do atirador | **existe, nunca usado** | 0 | Barreira (posto baixo) |
| `def.extraHunters = [{ offsetX, y, rifle, texture, aimTexture, joinAtLayersLeft }]` — 2º `HunterSniper` com tabela própria, iterado em `update`/`defeat`/`standDown` | novo | S-M | Guardião |
| `def.shutter = { openMs, closedMs, telegraphMs }` — fresta fecha/abre por timer; `update()` exige `aligned && smash && shutterOpen` | novo | S | Barreira |
| `def.arenaHazard = { kind, dx, wakeAtLayersLeft }` + `TimedHazard.reset(x, kind, { dormant })`/`wake()` | novo | M | Faraó |
| Telegraph do leque = 3 linhas nos ângulos reais (±0.21 rad) em `drawLaser` quando `cfg.fan` | novo | XS | Muralha/Barreira/Faraó/Guardião (fairness) |
| Glow/moldura com contorno DUPLO (escuro 10 px sob âmbar 6 px) em `positionGlow` | novo | XS | os 5 (paleta clara `egito` e blecaute) |
| `def.showTimer` — cronômetro de mundo ao lado dos pips | novo | XS | Portão (blitz visível, M2) |
| Moldura fica BRANCA quando o rino está alinhado (`aligned` calculado por frame no `update`) | novo | XS | os 5 (ensino in-fight) |
| `def.hints.how` próprio por chefe | existe (texto) | 0 | os 5 |
| `currentConfig(layersLeft, fightMs)` com `enrageFrom: 'firstBreak'` | extensão | XS | Faraó (M3) |
| Textura `${prefix}-${N}` por camadas restantes | **existe** | flag de paleta | ponto médio "assado" (canil da Muralha, rede rasgada da Barreira) |

### 1.2 Síntese

| Chefe | Personalidade | Verbo examinado | Mecânica ÚNICA | Ponto médio visível | Telegraph próprio | A vitória encena |
|---|---|---|---|---|---|---|
| Portão 1000 m | O Caçador — o guarda do ritual | investida ALINHADA (a parede-com-fresta do zoo, chão→meio→alto = escalada de pulo) | nenhuma nova — é a formatura, de propósito | 1 camada restante: klaxon + farol vermelho + caçador em pose de mira permanente + moldura maior (cosmético) | laser vermelho (a língua-mãe do jogo) | a cidade: crossGate (existe) + carimbo de tempo + sirene ao longe 2 s depois |
| Muralha 2000 m | O Comandante — luz e cães | PULO NO TEMPO (ler o céu do D3): estar no ar quando o K9 passa, pousar fora da luz; abre no ALTO = pulo carregado + investida aérea | já está na tabela (holo diegético + K9 + abre no alto); o que falta é LER no escuro | 2 camadas restantes (onde a tabela já solta o K9): sirene + strobe + canil aberto na textura `muralha-gate-2` (cosmético) | holofote: cone + elipse âmbar no chão (existe) + holofote AMBIENTE azul-frio entre tiros | a Brecha (existe) |
| Barreira 3650 m | O Capturador — a armadilha que fecha | ESPERA E COMPROMISSO: pular o K9 e investir NO AR quando a fresta abrir (lição da flecheira: passar a banda na janela) | `shutter`: sacos deslizam sobre a fresta (fechada = quique; glow aceso = aberta) | 2 camadas restantes: "os escavadores acabaram" — a fresta PARA de fechar (alívio) e entra o morteiro (tabela já faz) — mudança de ritmo, não de dificuldade | rede: 3 linhas do leque + o glow "esquentando" 400 ms antes de abrir (pisca acelerando, língua da torre) | M3: a rede da rendição + 1ª pirâmide no parallax (hoje é a única vitória muda) |
| Faraó 4700 m | O Faraó de Bronze — o Espelho de Rá | CORRER POR BAIXO vs PULAR: o rifle força pulo; o Espelho proíbe pulo na janela errada (lição arco/flecheira) | `arenaHazard`: feixe horizontal entre dois obeliscos na faixa aérea (y 380-480), ciclo OFF/ON, plantado em anchor-520 — o quique passa POR BAIXO (ápice ~46 px), o pulo entra | 3 camadas restantes: "o Espelho desperta" — o hazard dormente ACENDE quando o Faraó é ferido (frase do M3), enrage ancorado na 1ª quebra | glifo do obelisco acendendo branco→ouro sem pisca (precedente da flecheira) | tempestade abre (existe) + o feixe morre num flash |
| Guardião 9995 m | O Caçador-Mor — o espelho do começo | TUDO, em palíndromo | `extraHunters`: no pico do palíndromo (3 restantes) o CAÇADOR DO ZOO volta (`boss-hunter`, `BOSS_RIFLE` — zero arte) num posto baixo: duas linhas de telegraph | a chegada do 2º atirador é o ponto médio | duas fontes de laser | LENDA (existe, intocável) |

### 1.3 Por chefe — mapeamento aos ganchos e estimativas

**Portão.** Verbo: o do zoo. Nada mecânico muda (BOSS_RIFLE/BOSS_LAYERS/knockback intocados). Ganchos: `midpoint{layersLeft:1, sfx:'klaxon', fx:'beacon'}` (XS), `showTimer` (XS), moldura branca alinhada (XS), `callSfx:'horn'` (o de sempre), `hints.how` já correto. Vitória: `crossGate` + carimbo "BLITZ 3,8 s — sua melhor" (M2, S: melhor local = mín. `z` com `b>=3` em `runs[]`) + `playSirenShort` 2 s após a fanfarra (XS). Detalhe em §2.

**Muralha.** Verbo e mecânica já existem na tabela; o problema é F1. Ganchos: `callSfx:'siren'`, `midpoint{layersLeft:2, sfx:'siren', fx:'strobe', toast:'K9 solto'}`, flag `kennelOpen` na paleta `muralha` (que já tem `cars`/`searchlight`) desenhada quando `brokenCount>=2` (S), holofote ambiente (Graphics por frame só em `state==='fight'`, cone 0xcfe3ff alpha ≤0.08 = a mesma cor dos feixes assados do far — reserva o ÂMBAR só para o aviso letal; S). Legibilidade em §3.

**Barreira.** Ganchos: `hunterOffsetX: 96, hunterY: ~360` (o Capturador agacha no andaime atrás dos sacos — silhueta própria com o MESMO rig `boss2-hunter`, resolvendo o "reusa o rig" sem arte; precisa de uma plataforma desenhada na paleta `escavacao`, S) — tiros mais rasos, morteiro mais curto (`fireMortar` resolve o tempo de queda sozinho), o K9 sai rente ao chão de verdade. `shutter{openMs:1400, closedMs:1000, telegraphMs:400}` mutável (sliders): overlay de sacos = `scene.add.rectangle` na banda (152×120, cor `sand`), glow apagado = fechada; investida alinhada em fechada = `bounce(1)` + `playClang` + toast "Espere a fresta ABRIR!" nos encontros com dica (S). `midpoint{layersLeft:2}` desliga o shutter e toca klaxon. Leque telegráfico de 3 linhas (XS). `enrageMs` vira constante + slider (M1). Vitória = M3 + `stageDefeat` extraído (S). Ciclo do quique ~2-2,5 s vs janela de 1,4 s aberta: dá uma tentativa por ciclo se lida; quem chega fechada espera no ar (o K9 pune ficar no chão desde a camada 4 — `rasante:true` já está lá) — o combo pulo + investida aérea (`wasAirborneDash`, gravidade off 200 ms) é o verbo.

**Faraó.** Ganchos: `arenaHazard{kind:'espelho', dx:-520, wakeAtLayersLeft:3}` — `TimedHazard.KINDS.espelho = { tex, texOn, cause:'farao', bodyW:140, bodyH:100, bodyTop:380, offMs:1100, onMs:500, telegraphMs:350 }` (a causa `farao` já existe nas rules — sem chave nova); `dormant` no reset + `wake()` chamado pelo `midpoint`; spawn pelo `HAZARD_SPOTS` normal (o lookahead cam+1880 o planta antes da trava; reciclagem `x < camX-300` nunca dispara com a câmera travada); o boss acha o hazard por `scene.hazards.find(h => h.active && h.kind==='espelho')` (M, ~2 dias + caso no `e2e-boss.mjs`). Aritmética: rino em pé ocupa y 566-620; quique ápice 46 px → topo em ~520 (40 px abaixo do feixe); pulo mínimo (104 px) já entra. `enrageFrom:'firstBreak'` (XS, decisão M3 recomendada — não subir para 45 s). Telegraph = rampa de tint branco→ouro (precedente flecheira; hazard não é elenco, a regra "tint jamais em gameplay" não é ferida). Vitória: `defeatFarao` + `hz.deactivate()` com flash.

**Guardião.** Só existência (audiência zero). M3 como escrito (`holo:true` na 3ª camada + silhueta a partir de ~9800 m). `extraHunters` fica na gaveta até o primeiro `l>0` — mas o custo é S-M e o efeito narrativo (o caçador do zoo volta na última cerca) fecha a história com zero arte nova.

Verificar antes de codar (inferências minhas, não lidas): `SpawnManager.muzzleHostiles` não alcança `scene.hazards` (array próprio, fora do SpawnManager) — é o comportamento desejado para o Espelho; a textura `k9-projectile` existe ou cai no tint 0x9db4ff (mesma matiz do fundo azul — ilegível à noite).

## 2. O Portão como CLÍMAX sem virar muro

Clímax é **densidade de batidas por segundo, não segundos**. Um nocaute de 4 s com 8 batidas é clímax; 25 s com 2 batidas é fila. O pedágio-ritual (79%/4 s = 3 investidas limpas, zero quique — o ciclo de ~1,3 s × 3) continua sendo a prova; o que muda é a cerimônia em volta e o OBJETIVO interno.

**As 8 batidas, mapeadas ao que existe e ao que falta:**
1. Aproximação (940-972 m): o Portão entra na tela junto com a trava — hoje "aparece". A coreografia dos 950 m da v1.13 já aprovada é o lugar da batida (buzina ao longe, feixe do portão no far) — não reinventar; alinhar.
2. Chamada: buzina + trava de câmera (existem) + placa do encontro em mundo: "Portão — 7ª vez · melhor 4 s" (`getEncounters()` existe; melhor = `runs[]` local). Marcos 5/10/25/50 celebrados. Variação entre encontros sem tocar em nada mecânico.
3. Leitura: 900 ms de respiro (existe) + moldura BRANCA quando alinhado — o ensino para os 21% que morrem, dentro da luta, sem toast.
4. Quebra 1: explosão + "+25" (existem) + `cam.shake(120, 0.006)` (a câmera travada aceita shake) + pip vira estilhaço 300 ms antes de apagar (é `text` emoji: `setText`).
5. Quebra 2 = PONTO MÉDIO: `playKlaxon`, farol vermelho piscando no deck (Graphics), caçador fica na textura de mira, moldura da última fresta cresce 1,2×, toast "ÚLTIMA — NO ALTO!" só nos encontros com dica.
6. Última fresta: a do alto — o verbo mais difícil do zoo (pulo carregado/encadeado + investida) fecha a luta POR CONSTRUÇÃO; hoje a escalada chão→meio→alto é invisível porque nada a sublinha.
7. Vitória: `crossGate` (explosão, flash, confete, fogos, "Você escapou", "Modo infinito", skin — tudo existe) + cronômetro congela + "Blitz 3,8 s — sua melhor!".
8. Próxima fase: `playSirenShort` 2 s depois — "a cidade vem atrás" — o Portão passa a apontar para a Muralha.

**Objetivo interno (M2, sem tocar na pontuação):** o cronômetro de mundo durante a luta e o recorde pessoal. Não inventar tiers de tempo: `gate_clean` (`q = 0`) JÁ é o ritual perfeito (4 s = 3 investidas sem quique); blitz (≤20 s, +50) fica como está — com mediana 4 s todo full-clear é blitz, por isso o objetivo visível é "sua melhor", não o limiar.

**RIFLE_B par/ímpar: não agora.** (a) Variar o rifle é variar a prova, e a prova é pedágio por decisão; (b) congelamento até 26/09; (c) a doutrina reservou o B para re-encontros em massa NA MURALHA. Condição de reabertura: depois de M2, se ≥50% dos full-clears estiverem ≤6 s e o feedback seguir "é sempre igual", B para o Portão com regras — mesma ordem, mesmos 3 tipos (reto/rajada/morteiro), só a FRASE muda (ex.: morteiro nos ímpares, telegraph 500 constante), sorteio por paridade de encontro, letra `rb:1` para separar leituras.

**Guard-rails "sem virar muro":** full-clear ≥75% na janela, mediana `z` 3-6 s, `n` (fúria negada) estável. Fora do Portão: hit-stop/câmera lenta (mexe no contrato do quique — `knockbackMsLeft` conta por delta no `Rhino.update`), cutscene de entrada (o runner não para), shutter, hazard, escala do rino, qualquer edição em `BOSS_RIFLE`/`BOSS_LAYERS`/`BOSS_KNOCKBACK_*`.

## 3. A Muralha: o que muda AGORA e o que espera

**Fato que muda o cálculo:** cobertura ZERO com letra (`e`/`h` só de clientes velhos) — **não existe baseline a contaminar**. O momento mais barato de corrigir legibilidade é ANTES da primeira luta real; depois de n≥15, qualquer mudança reinicia a contagem. Recomendação: legibilidade entra na mesma versão do pacote F1 (contraste da cidade) e a contagem da Muralha começa nessa versão (gate de era, M5a, `run.v >=` ela). "Mãos quietas" vale para tabela, enrage, ordem e mecânica — tudo o que altera `h`/`e`/`qe`.

**AGORA (zero mudança de timing, geometria, hitbox ou tabela):**
1. Laser: linha dupla — 4 px escura (0x17171b) sob 2 px vermelha. Hoje 2 px 0xff3b30 alpha 0,35-0,75 sobre a Contenção (~#0f1421) some no ciclo fraco do pisca (e ~0,8 px CSS no iPhone).
2. Holo: elipse 150×26 com contorno duplo (escuro 5 px + âmbar 3 px); os alphas do cone (pico 0,18) e a curva de pulso ficam iguais nos 5 — é contraste, não intensidade.
3. K9: rim claro na textura (SVG à mão é permitido; precedente do dardo v1.8.3 — hitbox intocada). O fallback tint 0x9db4ff é a matiz do fundo.
4. Comandante: rim claro no SVG `muralha-hunter`/`-aim` e, se preciso, `setScale` 1,15 — sem corpo, escala grátis.
5. Glow/moldura com contorno escuro (genérico dos 5).
6. Holofote AMBIENTE varrendo durante a luta (só encenação; azul-frio como os feixes assados; o âmbar fica reservado ao letal — reserva de matiz por função).
7. `callSfx: 'siren'`; `hints.how`: "A fresta abre no ALTO — pule e invista!" (ensina o que a Contenção ensinou).
8. Ponto médio COSMÉTICO em 2 restantes (a tabela já solta o K9 ali): sirene + strobe (precedente dos flashes do `defeatMuralha`) + canil aberto em `muralha-gate-2`. Limite honesto: se o dono entender que "encenar o K9" muda a leitura, fica para depois; meu voto é que telegraph de fase é fairness, não tuning.
9. F1 geral (elenco escuro, bg-cars off na Contenção, figurantes fora do near) ajuda a APROXIMAÇÃO 1800-1972 m — a arena em si já é vazia (`muzzleHostiles`).

**ESPERA n≥15 (com letra e gate de era):** `BOSS_MURALHA`, `MURALHA_ENRAGE_MS`, `BOSS2_LAYERS`, shutter/hazard, holofote com função de jogo, `*_RIFLE_B`, escola/replay (M6). Leitura que decide: mediana `h` (<10 s outro pedágio; >45 s enrage virou teto; saudável 15-35 s), distribuição de `e` na morte (0-1 = leitura do holofote falhou; 3 = drama).

## 4. Sequenciamento — P/M/G sobre M1 → M2+M4 → M5 → M3 → M6

**P — "Ritual e rótulos" (M1 + M2 + legibilidade + caronas XS de M4).** Freeze-safe: nada de densidade/pesos/física/spawn. Entra: M1 inteiro (rótulos "Cerco" na Muralha, `MyStats` somando `u`/`y`, enrage da Barreira em constante + slider, `RadiografiaCore` iterando `cerco`/`farao`); `hints.how` por chefe; `callSfx`; `midpoint` genérico usado só cosmeticamente (Portão 1 restante, Muralha 2 restantes); moldura branca alinhada; `showTimer` + carimbo de melhor tempo + `gate_clean` + estacas de boss conhecido (M2); sirene pós-Portão; contorno duplo do glow; legibilidade noturna (laser/holo/K9/Comandante); holofote ambiente; M4 clima pós-4800 sem chuva + escada `dist_5200/6000/7500/9000`. Novo em relação à doutrina: `midpoint`, `callSfx`, alinhamento branco, cronômetro, legibilidade de boss como parte de F1. Custo total S-M. Calendário: junto do F1; se o dono preferir zero releases durante a medição da Escola, 26/09 vira a data de P (as leituras são por `v` de qualquer forma).

**M5 — Instrumentação (S), ANTES de M.** Gate de era nas chegadas; R-06/R-07 com mortes NA JANELA; `b_muralha/b_cerco/b_farao`; painel "Bosses" no `/?stats`; proxies de frustração de `t/s/c`. Sem isso, o shutter e o Espelho estreiam cegos — a janela de 50 corridas apaga as primeiras lutas.

**M — "Cada chefe, um verbo" (M3 + mecânicas do deserto), após 26/09.** Barreira: posto baixo (gancho existente), `shutter`, leque de 3 linhas, `midpoint` que desliga o shutter, vitória da rendição + `stageDefeat` extraído. Faraó: `arenaHazard` Espelho dormente que acorda em 3 restantes, `enrageFrom:'firstBreak'`. Guardião: `holo` na 3ª + silhueta 9800 m. Toca só ≥3650 m (audiência ≤4 aparelhos — dado de existência, sem contaminação de leitura em curso). Custo M (~1 semana de um dev com e2e).

**G — "A aposta".** M6 Replay do Confronto (estreia na Muralha com n≥15); mudanças MECÂNICAS na Muralha só pós-veredito; `extraHunters` do Guardião quando `l>0` aparecer ou o gatilho do deserto profundo (≥5 aparelhos bestM≥5000) disparar; `RIFLE_B` só sob a condição de §2.

**NÃO fazer:** HP no rino; checkpoint; rotacionar ordem/arsenal entre encontros; camada que se refaz (HP regenerando a 10 km sem checkpoint = crueldade); 3º chefe no deserto profundo sem gatilho; endurecer o Portão; shutter/hazard no Portão ou na Muralha; "só mais rápido" em qualquer tabela; hit-stop/câmera lenta; cutscene que pausa o runner; escalar entidades COM corpo; barreira com corpo físico; spawn de roleta na arena; tint em hostis; causa de morte nova sem rules (o Espelho mata como `farao`); campo novo de 1º nível em `stats`; nada do tamanho do mundo no WebGL (overlays sempre 1280×720 com `scrollFactor 0`, precedente dos flashes). Duas interpretações a decidir pelo dono: "dash mata em 1 toque" — leio como "a camada não tem HP" (uma investida alinhada E no tempo quebra); se a leitura for "toda investida alinhada quebra", o shutter viola. "Arena sem spawn" — leio como "sem roleta"; o Espelho é arquitetura de posse do chefe, determinística e telegrafada.

## 5. Métricas de sucesso por chefe

Letras existentes (`RUN_COUNTERS`): Portão `b/q/z` + causa `boss` + `n`; Muralha `e/h/qe` + `boss2`; Barreira `u/zu/qu` + `cerco`; Faraó `y/zy/qy` + `farao`; Guardião `l/zl/ql` + `boss3`. As rules não validam chaves de `runs[]` (só `size() <= 50`), então letra nova de 1-2 chars não exige rules — apenas a convenção da casa.

| Chefe | Chegadas (com gate de era) | Régua mortes/chegadas | Régua tempo | Proxy de drama | Novo |
|---|---|---|---|---|---|
| Portão | `z>0 ∨ b>0 ∨ causa boss` | 15-35% (hoje pedágio ~5% — manter) | mediana `z` 3-6 s (NÃO subir) | `q` (quique) ; sucesso de P = full-clear ≥75% mantido, `gate_clean` ≥40% dos full-clears, dispersão p25-p75 de `z` estreitando (jogador otimizando) | nada; blitz/clean/melhor = recomputo |
| Muralha | `h>0 ∨ e>0 ∨ boss2`, `v ≥` versão de P | 15-30% | `h` 15-35 s (25-60% do enrage 45 s) | `e` na morte: sucesso da legibilidade = mortes com `e=0` ≤40% das mortes `boss2` (limiar proposto, não doutrina) | nada; veredito só n≥15 |
| Barreira | `zu>0 ∨ u>0 ∨ cerco` | 10-25% | `zu` 15-30 s | quiques por camada `qu/u` entre 1 e 4 no full-clear; shutter saudável = quiques em fresta FECHADA ≤50% dos quiques | letra `qs` (quiques na fresta fechada; só grava >0) |
| Faraó | `zy>0 ∨ y>0 ∨ farao` | 20-40% | `zy` 15-35 s (25-60% de 30 s a partir da 1ª quebra) | mortes pelo Espelho ≤30% das mortes `farao` (acima disso o hazard, não o Faraó, é o carrasco — retunar ciclo) | letra `ye:1` (morte pelo feixe; causa segue `farao` — funil contínuo) |
| Guardião | `zl>0 ∨ l>0 ∨ boss3` | sem banda | — | existência: 1º `l>0`, 1º `zl` | nada |

Comuns aos 5 (recomputo em `runs[]`): END no boss = mortes ÷ (mortes + full) 10-35%; respiro pós-vitória = % que passa o chefe e morre nos 200 m seguintes ≈ 0 (`m` × camadas); decay entre âncoras 3:1. "Lê como clímax" não tem telemetria (zero eventos de UI — M5e): a verificação é o playtest do dono + os jogadores que mandaram o feedback, e o guard-rail numérico é "o pedágio continuou pedágio". As 5 métricas pré-registradas de 12/09 e 26/09 são da Escola/Streaks — não misturar com estas.
