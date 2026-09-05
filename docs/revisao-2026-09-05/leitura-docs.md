# LENTE 3 — O que o design já sabe e já planejou (FURIOUS RHINO)

Fontes lidas na íntegra: `C:/Users/crist/MobileGame/GAME_DESIGN.md` (1165 l., cabeçalho ainda "v1.11.0"), `HANDOFF.md` (787 l., topo = v1.10.0 de 29/08), `docs/IDEIAS-FUTURAS.md` (1813 l.), `docs/QA-Registro.md` (177 l.), `docs/INVESTIGACOES.md` (593 l.), `docs/CHANGELOG.md` (topo v1.12.0). Complementares para fechar lacunas: `docs/04-referencia-tecnica.md` §12–13, `docs/03-arquitetura.md:191-211`, e a spec aprovada do programa em `C:/Users/crist/.claude/plans/vamos-iniciar-um-planejamento-mutable-toast.md` (fora do repo — citada pela memória como dona das "regras de aceite do cético / vetos de legibilidade").

---

## 1. O que os docs JÁ registram

### 1(a) Legibilidade / contraste — cidade e noite

**Regra permanente, repetida em 4 lugares:**
- `GAME_DESIGN.md:238` — "Regra permanente: **tint atmosférico jamais em elemento de gameplay**."
- `docs/04-referencia-tecnica.md:329` — "| Tint atmosférico | **Jamais** em elemento de gameplay (regra permanente de legibilidade) |"
- `docs/IDEIAS-FUTURAS.md:1159-1162` (armadilhas da ideia J) — "`fillGradientStyle` proibido (SwiftShader); reflexos/luzes = retângulos alpha; tiles de 640 px com emenda ±640; props acima de `FAR_BASE 336`; tint atmosférico jamais em textura de gameplay"
- Plano do programa Zoo `:40-42` — "**Legibilidade**: fresta clara sobre corpo escuro em toda família nova; tint atmosférico jamais em gameplay; hitboxes intocadas."

**O que escurece e quando (a noite é dramaturgia deliberada, não acidente):**
- `GAME_DESIGN.md:228-230` — "**Céu**: dia pleno, entardecer chegando junto com o portão (a fuga acontece no pôr do sol), noite no modo infinito — e a partir de 1450m ele **cicla** (um dia inteiro a cada 600m) em vez de saturar."
- `GAME_DESIGN.md:338-340` — "A narrativa é escrita com a luz que o jogo já tinha: a noite fecha aos 1450 m, o D2 amanhece com a cidade acordando, e a luta da Muralha acontece no escuro sob holofotes — zero mudança nas âncoras de céu."
- `docs/IDEIAS-FUTURAS.md:942-953` — aritmética conferida em `GameScene.js:1925-1941` (`skyPhase`): "D1 (1001–1400) na noite … D2 (1401–1800) amanhece — o primeiro amanhecer do ciclo cai aos 1450 m … D3 (1801–2200) escurece de novo — entardecer aos 1750, anoitecer em 1900–2050: **a luta contra a Muralha acontece no escuro, sob holofotes**; a Brecha (2050–2200) amanhece na saída. Dramaturgia completa de graça."
- `docs/03-arquitetura.md:205-207` — "o chão segue nos `atmoLayers` (escurece ao anoitecer). É o mesmo padrão que `bgFg`/`bgCars` já usavam."

**Proteções de leitura já decididas para o trecho escuro:**
- Clima roteirizado para não cegar o boss — `docs/IDEIAS-FUTURAS.md:1095-1098`: "`WEATHER_SCRIPT` estende de 8 para 11 faixas: 1600–1800 `chuva` (chuva do rush, legível), 1800–2000 **`limpo` roteirizado** — no corredor pré-boss a neblina sorteada de 34% de alpha por cima de holofotes e telegraphs seria ilegível —, 2000–2200 `limpo` (a Brecha)."
- Holofotes do parallax são atmosfera — `:977-979`: "skyline apagado com **feixes de holofote varrendo** (camada atmosférica, jamais gameplay) — eles são o *teaser* do boss".
- Telegraph diegético em vez de glow abstrato — `GAME_DESIGN.md:344-347`: "granada-de-luz cujo telegraph é o próprio holofote varrendo até a zona de pouso (diegético — lê-se a luz, não um glow abstrato)". Zig com telegraph: `IDEIAS-FUTURAS.md:1014` "**LED/detalhe pisca na inversão** = telegraph do zag"; Pipa `:1023` "rabiola gira no frame 2 (telegraph diegético)".
- Primeiro plano nunca esconde obstáculo — `GAME_DESIGN.md:235-237`: "**primeiro plano 1,5** (na frente do rino, restrito à faixa abaixo da linha do chão para nunca esconder obstáculo)".
- Spawn de voador vs banda de zig — `IDEIAS-FUTURAS.md:1155-1158`: "voadores de escolta/combo nascem em y FIXO 470 — toda banda de zig precisa CONTER o y de spawn … senão o 1º frame é um mergulho não telegrafado."
- Folga visual sempre a favor do jogador — `GAME_DESIGN.md:79-83` (dardo 42×15 "vermelho vivo e contorno preto — mas a **hitbox segue 24×8**") e `CHANGELOG.md:332` (v1.7.1: "a fresta-alvo sinalizada com **moldura dourada pulsante** — a versão anterior lia suave demais"). `QA-Registro.md:119`: "o glow pulsante na fresta é permanente (é a mira, não uma dica)".
- Métrica de leitura já prevista para a Muralha — `IDEIAS-FUTURAS.md:1360`: "dist. de `e` na morte (0–1 = problema de LEITURA do holofote; 3 = drama)".
- Skins e tint — `docs/04:303` "Cores claras/médias no corpo da forma normal (o tint de fúria multiplica branco→vermelho — skin escura fica ilegível)"; `:330` "cores escuras somem no flush".

**Vetos de legibilidade do programa Zoo (valem para as 3 releases)** — plano `:40-47`: "4 assinaturas PROIBIDAS em cenário novo: massa de tijolo âmbar, brilho especular de aço, ameias, banda-clara-sobre-escuro. Figurantes da espécie do elenco letal do bioma corrente JAMAIS em bg-near (flamingo no aviário e zebra na savana: vetados — só silhuetas dessaturadas no bg-far 0.15). Luz acesa só em cenário não-letal, paleta quente, nunca especular branco. Lianas/franjas terminam y≤380 (banda de voo é [410,565]). Partículas: depth −1.5, ≤900ms, cap global ~24, pool único." E `:155-157`: "testar contraste do violeta sobre o céu de crepúsculo ANTES de fechar — flash escuro sobre dusk derruba a leitura dos espinhos". Bug visual já diagnosticado `:29-31`: "**Torre pálida dos ~820m**: é o `glassTank` do bg-far-pantano (TextureFactory.js:2852/3145) — vidro 0x2b6a8a a 0.85 contra o crepúsculo lê como torre crua." `CHANGELOG.md:15` (v1.12.0): "A fresta continua clara sobre corpo escuro — a linguagem não muda."

**Lacuna registrável:** não existe em nenhum doc uma auditoria de contraste da CIDADE À NOITE (D1/D3 + Muralha). A "auditoria de custo/legibilidade" (`CHANGELOG.md:12`) cobriu só os 0–1000 m. As únicas defesas documentadas para o escuro são as quatro acima (tint nunca em gameplay, neblina removida pré-boss, fg abaixo do chão, telegraph diegético). O `QA-Registro.md` não tem nenhuma entrada sobre legibilidade.

### 1(b) Chefes — doutrina, críticas registradas, variações pendentes

**Doutrina explícita (ideia M, `docs/IDEIAS-FUTURAS.md:1301-1519`, 23/08, "📐 seis pacotes independentes (M1–M6)"):**
- Função do boss, 6 notas (`:1328-1353`): marco/memória espacial ("Não mexer"); exame pedagógico ("No portão, 79%/4 s não é exame, é formatura — e ESTÁ CERTO assim"); quebra de ritmo ("a única 'sala' do jogo"); **gerador de objetivo — "o furo estrutural"** ("quem morre no Faraó não ganha 'da próxima vez passo', ganha uma semana até a próxima aula — enrage de 30 s calibrado para veteranos que não existem"); **verbo único "no limite saudável"** ("o Faraó é o mais derivativo (identidade = aritmética + 2 padrões reskinados); o Guardião, o mais bem resolvido no papel … A próxima luta que for só 'mais rápida' cruza a linha"); prestígio/porta ("a Barreira é a única vitória muda … Regra a adotar: **toda vitória de boss encena a fase seguinte**").
- Veredito por boss (`:1357-1363`): Portão "Pedágio-ritual — e deve continuar sendo"; Muralha "Não estreou … mãos quietas ≥4 semanas; direção com n≥5, veredito com n≥15"; Barreira "Cega de nascença (sem cronômetro…)"; Faraó "Regime de existência"; Guardião "Existência, nunca taxa".
- Réguas (`:1365-1381`): decay 3:1 entre âncoras ("Hoje 1000→2000 é ~5:1"); mortes/chegadas "<5% = pedágio · **15–40% = saudável** · ≥70% = muro", bandas por boss (Portão 15–35 · Muralha 15–30 · Barreira 10–25 · Faraó 20–40); tempo de luta "mediana 10–25 s, ou 25–60% da janela de enrage; <8 s = pedágio"; END 10–35%.
- Pacotes (`:1383-1457`): **M1** verdade nos rótulos (XS, "quase-bug") — `ScoreSystem.js:139/:146` "Camadas do Cerco" na Muralha, `Constants.js:18` "Capturador", enrage da Barreira `45000` literal em `GameScene.js:149`; **M2** prestígio para a massa (XS–S) — blitz visível, medalha `gate_clean` (q=0), estacas de boss conhecido, fúria liberada na vitória em TODOS os bosses; **M3** vitórias e relógios (S) — "rede da rendição" na Barreira, enrage do Faraó ancorado na 1ª camada quebrada ("NÃO subir para 45 s seco"), `holo:true` na 3ª camada do Guardião + silhueta da última cerca ~9800 m, "**Vencer = encerrar a corrida permanece intocável**"; **M4** coerência do deserto profundo (XS carona) — hash de clima sem chuva pós-4800 m, medalhas `dist_5200/6000/7500/9000`; **M5** instrumentação (S) — gate de era nas chegadas, R-06/R-07 com mortes NA JANELA, painel Bosses, proxies de frustração; **M6** Replay do Confronto (M, "a aposta") — treino oferecido na morte por boss, "zero pontos, zero telemetria, zero medalha", estreia na Muralha com n≥15; fallback "eco da tentativa".
- Distribuição (`:1459-1474`): "**1 clímax fecha cada fase; fase ≥2000 m ganha miniboss no meio**"; "uma âncora a cada ~1000–1600 m"; "**Deserto profundo (4725→9995 m): NENHUM boss agora.** Gatilho … **≥5 aparelhos com bestM ≥5000 OU ≥10 corridas/janela ≥4700 m, em duas radiografias consecutivas.**"; "O metro de conteúdo mais rentável NÃO é âncora nova: é fazer a Muralha funcionar."
- Decisões tomadas (`:1476-1495`): portão segue pedágio-ritual; **checkpoint fora da mesa** ("metros SÃO pontos (Spearman 0,999)"); letra `i` não vai para segundos de boss; quiques dos 4 novos descartados (hoje já gravados via `qe/qu/qy/ql`, v1.9.5); "**NÃO rotacionar ordem/arsenal entre encontros — a ordem É a identidade** … forma barata: tabela `*_RIFLE_B` sorteada par/ímpar, nunca ordem nova."
- Em aberto para o dono (`:1505-1514`): aprovar M6 já ou esperar n≥15; enrage do Faraó (âncora vs 45 s nos 2 primeiros); nomes de medalhas; ordem sugerida **M1 → M2+M4 → M5 → M3 → M6**.

**Status parcial dos pacotes (cruzando docs):** M1 parcialmente entregue na v1.9.5 (`CHANGELOG.md:109-110`: MyStats mostra os cinco com nome certo; `cerco`/`farao` somados) — os itens `ScoreSystem.js:139/:146`, `Constants.js:18` e o `45000` literal NÃO aparecem como fechados em nenhum doc (não verificado no código nesta lente). M5(d) parcialmente entregue na v1.9.12 (`CHANGELOG.md:55-62`: aba 🛡️ Chefes com funil dos cinco, "nota com as cegueiras de era"). M2, M3, M4, M6: pendentes.

**Críticas/dados já registrados:** `IDEIAS-FUTURAS.md:542-545` "**O portão virou pedágio, não clímax.** 41 das 48 lutas terminam com as 3 camadas quebradas, mediana de **4 s**"; radiografia pós-cascata 29/08 `:388-400`: "Portão (1000 m) | 5 | 5 | **1** | 4 s … Taxa de vitória do portão: 1/5 (era ~66% na baseline v1.7) … se ficar nessa faixa com n maior, o portão pós-correção é um paredão — e a doutrina dos bosses (ideia M) tem seu primeiro dado real"; "a Muralha … segue **invicta na história do jogo**". Regra de método: `GAME_DESIGN.md:830-836` "**Código presente não é funcionalidade viva.**" (os 5 chefes ficaram atravessáveis v1.8.5→v1.9.3, `QA-Registro.md:126-158`).

**Inegociáveis de boss (contrato de qualquer variação):** `IDEIAS-FUTURAS.md:725-727` "quique sem soft-lock, arena sem spawn, fúria negada dentro da arena, 'a última camada NÃO chama `crossGate`' (no Cerco) / 'dispara a LENDA' (no Guardião)"; `:1069-1071` "**atiradores vivos são silenciados/despawnados no `startFight`**"; `:1742-1745` "**Barreira nunca é corpo físico** — clamp posicional, jamais de velocidade … Nada de pressão letal por trás; rampa fora de arena; `clearTint` obrigatório no pool de dardos"; `GAME_DESIGN.md:178-185` "**parametrizar, nunca copiar**: … os cinco chefes são **5 instâncias da mesma classe**"; `GAME_DESIGN.md:127-134` fúria bloqueada na arena (dado: "120 camadas quebradas com apenas 8 mortes"); `GAME_DESIGN.md:920-926` lista de chefes da prova vem do "**elenco real da cena** (`this.bossFights`), não de uma tabela paralela".

### 1(c) UI / overlays mobile — bugs conhecidos, decisões de layout, o que a home desacoplada mudou

- **HUD acompanha o canvas, não o CSS** — `HANDOFF.md:662`: "`GameScene.alignHudButtons()` posiciona os botões DOM pelo retângulo real do canvas (Scale.FIT — CSS fixo não acompanha; re-alinha no evento `resize` do ScaleManager); `top:20px` do CSS virou fallback pré-boot." (`CHANGELOG.md:312` "som e pausa desceram para logo abaixo dos ícones de fúria e investida … não cobrem mais nada").
- **HUD de pontuação** — `GAME_DESIGN.md:396-399`: "Pontuação em destaque (22px) com os metros discretos abaixo; `+N` dourado sobe do próprio obstáculo (ancorado no mundo, não na tela) e some em 700ms."
- **Retrato (bug histórico, fechado v1.10.1)** — `INVESTIGACOES.md:175` H3: "o `#rotate-overlay` é 100% CSS, sem `scene.pause()` — em pé, **o jogo continua rodando por baixo**, às cegas"; `:246-249`: "virar para o retrato agora PAUSA de verdade … e **largar já em pé também pausa** — a lacuna que o teste revelou: o listener de orientação só dispara na mudança, e o started nasce numa graça de 150 ms." Portão humano fechado pelo dono (`:234-237`).
- **Contrato do toque da home (trancado por 5 suítes)** — `docs/04:341`: "O ponto (640,650) em 1280×720 precisa ficar em área SEM `stopPropagation` … todo botão novo na tela inicial = `stopPropagation` em pointerdown E click". `GAME_DESIGN.md:291-292`: "o overlay inteiro inicia a corrida ao toque, e todo botão isola o toque".
- **Home desacoplada (v1.9.3) — o que mudou** — `GAME_DESIGN.md:755-786`: "a home ficava **4,6 segundos vazia** … a tela inicial é DOM + `localStorage` … Um módulo só (`HomeScreen`) virou o **dono único da pintura**, chamado antes de o Phaser existir. O pódio passou a aparecer ~0,6 s … **guardar o toque**: o texto vira 'preparando a fuga…' … a corrida **começa sozinha** quando o motor fica pronto … O pódio … Agora são 5 minutos." Regra derivada `docs/04:319`: "`js/home/HomeScreen.js` não pode tocar em Phaser … Um `this.add`/`this.time`/`this.rhino` ali quebra o boot inteiro." Lição `:318`: "**Todo cache precisa ser invalidado NO EVENTO que muda o dado dele.**"
- **Layout da home** — `HANDOFF.md:572-573` (v1.8.2): "`#install-hint` saiu do meio da tela … virou pílula laranja na headrow da Campanha … iOS: a pílula abre o `#pwa-modal` com o passo a passo"; `CHANGELOG.md:221` (v1.8.8): "com desafios ativos, os cards das disputas ocupam o lugar do box Campanha (até 3 empilhados) — sem disputa, a Campanha volta. O botão 'Instalar o jogo' foi para a esquerda"; `HANDOFF.md:468-470`: popup de convite `#challenge-invite-modal` "(1 por boot, adiado se o PWA abrir; recusa é só local)"; `HANDOFF.md:621`: "`/?debug=1` → painel de tuning (cobre o 2º lugar do pódio — é o overlay, não bug)".
- **Armadilhas de CSS/DOM** — `HANDOFF.md:630-634`: "`.rhino-anim` × pódio: `updateRhinoPreview` repinta TODO `.rhino-anim img` — o pódio usa `.podium-anim`"; "Animação CSS × transform: Animação que anima `transform` (bob) atropela `scaleX(-1)` estático — flip via propriedade `scale`".
- **Overlays de falha** — `GAME_DESIGN.md:678-719` (v1.9.1/1.9.5): overlay "😵 O jogo travou" com tentativa devolvida; "**A honestidade da mensagem é parte do design** … 'não valeu pontos e a tentativa voltou'"; "um erro de rede … jamais pode mostrar 'o jogo travou'". `CHANGELOG.md:87` (v1.9.7): página de socorro do próprio SW "Sem conexão com o jogo" — "nunca mais o erro cru do navegador".
- **Fila de toasts (v1.12.0)** — `CHANGELOG.md:21`: "label de bioma, dica da Escola e marco de distância (as três vozes que colidiam na foto da linha de base) não se atropelam mais no mesmo y — a dica nunca espera (é a variável medida), o marco espera a tela desocupar. Vozes raras sem prioridade (fúria cheia, torre derrubada) seguem como antes." Spec no plano `:117-120`: "dica … nunca atrasa >0,5s; label de bioma … dono do y150 na travessia; dica simultânea desce p/ y210".
- **Feedback tátil da negação do dash** — `GAME_DESIGN.md:1051-1056`: som + tremor + `vibrate(25)` + buffer 180 ms; "**o buffer decide primeiro; toque honrado não é atrito**".
- **Pausa / desistir / convite de nome** — `GAME_DESIGN.md:593-603`: "🏳️ Desistir da corrida — cancela a run sem contar NADA"; convite de apelido "no máximo 1 vez a cada 3 corridas … Nunca bloqueia"; "a aba escondida pausa sozinha".
- **Limitações de plataforma registradas** — `IDEIAS-FUTURAS.md:1272-1274`: "em `http://` de LAN o `/?setup` nem abre (`crypto.subtle`, limitação herdada)"; bloqueadores de conteúdo derrubam `/?stats` e a aba. iOS: CASO 2 (crash WebKit 26 × TileSprite 404.000 px, corrigido v1.9.11) e congelamentos de 1–3 s em iPad (D4, ainda medidos).
- **Lacuna:** o `QA-Registro.md` não tem NENHUMA entrada sobre overlay/HUD/mobile (grep vazio); tudo acima vive espalhado em HANDOFF/GAME_DESIGN/04.

---

## 2. Banco de ideias — tabela resumida (custo / status / decisão)

| Ideia | Custo | Status | Nota-chave (fonte) |
|---|---|---|---|
| A Pontuação composta | M–G | ✅ v1.8.4 | Sobrou como ideia: **eficiência de investida** (`IDEIAS:566-570`) |
| B Boss "O Cerco" | G | ✅ v1.8.5 → vive como Barreira 3650 m (v1.8.10) | Sem skin/card no Diário (decisão do dono, `:651-655`) |
| C Guardião do Fim | M | ✅ v1.8.5 | Skin `{legend:true}` ficou de fora (`:683-688`) |
| D Refactors R1–R7 BossFight | M | ✅ v1.8.5 | Pré-requisito; e2e-boss 16/16 por passo |
| E Campanha e capítulos | M | 📐 pendente | `MissionSystem` reusa `conditionMet`; `config/missions` editável no console; "Sem diárias automáticas" (`:732-754`) |
| F Streaks | XS | ✅ v1.11.0 | "convite, nunca bronca"; `§7` ainda lista F como pendente (linha 1757 não riscada — inconsistência de doc) |
| G Desafio por link | M | 💡📐 pendente | "**única alavanca de aquisição**"; sanitização estrita da URL; ghost fora; porta de entrada da Arena (`:766-785`) |
| H Faixas do funil | XS | ✅ v1.8.7 | — |
| I Arena de Desafios | M–G | ✅ v1.8.6 | Fora: **revanche a um toque** (`:805`) |
| J Estado de Alerta | G | ✅ v1.8.7 | Metas: mediana pós-portão ≥1.500 m; ≥1.400 m 3→6%; ≥2.000 m 1→3%; mortes boss2 > 6 |
| K Radiografia viva | M | ✅ v1.8.7 | Em aberto: gráficos ricos na aba, unificar `decode` ×4, letra `i`, arquivar `--json` (`:1279-1287`) |
| L Areias do Tempo | — | ✅ v1.8.10 | Alfabeto de `runs[]` fechado |
| M Doutrina dos bosses | XS–M por pacote | 📐 6 pacotes | M1/M5 parciais (v1.9.5/1.9.12); M2/M3/M4/M6 pendentes; ordem M1→M2+M4→M5→M3→M6 |
| Escola do Rino | — | ✅ v1.10.0 | Leituras pré-registradas **12/09 e 26/09 por `v`** (`:414-492`) |
| Programa Zoo v1 "As Gêmeas e o Ritual" | ~20 chaves | ✅ v1.12.0 (30/08) | única mudança de spawn: zona de respeito dos arcos |
| Programa Zoo v2 "Mata e Água" | ~12–15 chaves | 📐 aprovada | plano `:127-157` |
| Programa Zoo v3 "Jornada" | 0–6 chaves | 📐 aprovada | plano `:159-175` |

**Descartadas com motivo (`IDEIAS:1521-1530`):** Ghost ("série temporal por corrida, coleção nova e mudança de rules"); aba de missões no `/?setup`; **3º boss aos 3000 m** só com o gatilho da doutrina M; push a jogadores; missões diárias automáticas. **Vetos do programa Zoo (plano `:177-183`):** "figurantes do elenco letal em bg-near, hit-stop, moedas/colecionáveis, variação de clima/céu por seed, regenerar backdrop por corrida, panfleto animado no fg da abertura"; "vitrine viva com setCrop (veto permanente)". **Banco ainda NÃO transcrito para o IDEIAS-FUTURAS** (o plano manda fazê-lo na atualização de docs): "muro em 3 estágios com sub-áreas do pântano, variantes de bg-far por seed, poças pulsantes, insígnias por ala, fita de HUD, micro-celebração das lições (reavaliar pós-26/09) … 5 torres de dardo por bioma". 💡 guardada: "o deserto profundo ganha rosto" (mesmo gatilho do 3º boss, `:1470-1471`).

Pendências pequenas fora da tabela (`IDEIAS:1789-1792`, `HANDOFF:607-610`): calibração fina da densidade em campo (`docs/04 §8b`), descrições de skin (Catisquick/MecaSilver) pelo `/?setup`, skin "color" aguardando decisão, mecânicas por espécie adiadas.

---

## 3. Dívidas técnicas abertas e casos de investigação

**Dívidas técnicas (`IDEIAS-FUTURAS.md:1777-1784`, fila própria):**
1. **Causa raiz do cronômetro / salto** — 🟡 em andamento. H2/H3 mitigadas na v1.10.1 (`INVESTIGACOES.md:233-257`): "`PHYSICS_MAX_DELTA_MS: 50` clampa o delta … um quadro de 3 s move o rino ≤ 30 px, não ~900"; retrato pausa. "Se um salto de distância aparecer numa corrida ≥ v1.10.1, é uma TERCEIRA causa".
2. **#2 Preload de 150 SVGs (1ª visita)** — custo M. `:1780`: "a CORRIDA começa em ~6 s no celular. **O impacto caiu pela metade em 28/08**: o SWR da v1.9.7 serve a arte do cache da 2ª visita em diante — resta o peso da PRIMEIRA". Desenho sugerido `:1582-1586`: essencial (7 arquivos) + resto em segundo plano; cuidado: "`BootScene.createAnimations()` registra anims … **por nome de textura** — mover arte sem mover o registro da anim quebra em silêncio".
3. ~~SW revalida tudo~~ ✅ v1.9.7.
4. **#4 `document.write` do Phaser** — XS não testado. `:1605-1614`: "**para o parser** … 797 → 1.306 ms; numa rede pior chegou a 3.592 ms … **Um `<script defer>` clássico manteria a ordem garantida sem bloquear o parser** … Não testado." Também suspeito listado no C2-H4 (`INVESTIGACOES:384`: "o `document.write` de 1,2 MB do Phaser?").
5. ~~/atualizar-docs~~ ✅ em 28/08 — **porém reaberta de fato**: `GAME_DESIGN.md:3` diz "v1.11.0", `HANDOFF.md:1` para em v1.10.0, e o banco do plano não foi transcrito — v1.10.1/v1.11/v1.12 só existem no CHANGELOG.
6. ~~`/?debug=1` sem chave~~ ✅ v1.9.6 ("**Dívida de segurança nunca é só higiene**").

**Lacunas de telemetria (`INVESTIGACOES.md:530-561`):** L1 rotação da janela de 50 ("**674 já saíram de alcance** … Alto: mexe nas rules … e cresce o doc de todo mundo"); L3 `client.lang`/`browserVersion` órfãos; L5 zero indistinguível de ausente; L6 `x` conta também toques com dash ativo ("mudaria a série histórica"); L7 encontros por chefe nunca enviados (1º nível de `stats` 12/12); L8 sem `sendBeacon`/`keepalive`; L9 `days[].b` sem leitor; L10 precisão de investida é proxy (a letra `i` foi gasta na sonda). L2 e L4 ✅ v1.9.12. Orçamento (`:547-555`): `stats` 12/12, `client` 9/10, `deaths` 17/17, `history` 5/6, `geo` 4/4, `runs[]` 50/50 — chaves por corrida livres com custo em bytes.

**CASO 1 — distância que salta (`INVESTIGACOES.md:22-273`):** 🟡 parcialmente resolvido. H1 cascata ✅ v1.9.4; H2 catch-up e H3 retrato mitigadas v1.10.1; H4 "janela de 150 ms no `startRun`" 🟡 em teste; **2 acendidas no `D5` (v1.7.0 e v1.7.2) sem explicação**; `D2` fica como detector de propósito; custódia: `tools/backup-ranking-2026-08-24.json` "**Não apagar sem o caso estar fechado.**"

**CASO 2 — "não acessa a página" (`:277-519`):** 🟡 correção em campo aguardando prova. Diagnóstico: "**WebKit 26 × TileSprite gigante**" (`cena:chao`, v1.9.11). Prova = "o dono jogando alguns dias sem ver o disjuntor" (`HANDOFF:83-86`); "A caixa-preta fica DE PLANTÃO em produção". Achados que ficam: "**ZERO corridas com causa `crash` em toda a era v1.9.4+** … as mortes reais são **do processo** (jetsam/WebKit) … só a **caixa-preta** vê" (`:484-491`); 4 aparelhos WebKit 26 com congelamento `i << s`; "Cliente JÁ quebrado talvez não receba isto sozinho" (`HANDOFF:130-133`). v1.9.7 (SW) fica de pé por mérito próprio mas "**não corrige esta face**" (`:364-365`).

**Pendências do HANDOFF v1.10 (`:35-43`):** prova de campo v1.9.11; pacote do CASO 1 (entregue v1.10.1 segundo CHANGELOG); aviso permanente "**Outra sessão trabalha neste repositório — conferir dono de arquivo antes de commitar; nunca `git add -A`**".

---

## 4. Decisões "sagradas" que qualquer revisão geral deve respeitar

**Arquitetura / dados (`GAME_DESIGN.md:660-676`, `CLAUDE.md`, `IDEIAS §6:1716-1745`, `docs/04 §13`):**
- "**Telemetria e ranking são acessórios.** Um erro de rede … **não pode derrubar o jogo** (`safeTelemetry`)." — e o `unhandledrejection` "só age com a corrida em andamento **e** só para erros de programação que não tenham assinatura de rede" (`GAME_DESIGN:715-719`).
- "**Orçamento das rules do Firestore.** … (19 campos passavam, 20 falhavam). Campos novos entram **dentro dos mapas existentes**"; 1º nível de `stats` "12/12 chaves com `hasOnly` fechada" (`:863-865`); publicação de rules "**uma só**"; "**Ordem de release**: rules publicadas no console **ANTES** do deploy … Sempre."
- Versão em 4 lugares; "todo `.js` novo entra em `ASSETS` **e** o `CACHE` sobe de versão"; "Nunca rodar `export-art -- --force`".
- "**Clientes velhos existem e não vão atualizar** … nenhuma mudança de contrato pode fazê-los sumir do ranking ou gravar lixo" — retrocompatibilidade sem migração (`scoreM` ausente = doc antigo; "Ninguém foi recalculado").
- Alfabeto de `runs[]`: "**o alfabeto de `runs[]` está fechado**: métrica nova só recomputada ou dentro dos mapas existentes" (`:174-176`); chaves de 2 chars são legítimas com custo em bytes (`:849-859`); "`q` segue **exclusivo** do Portão"; "**O bônus por corrida NÃO ganha letra**"; "letra nova em `RUN_COUNTERS` sem leitor no núcleo = `test-radiografia` vermelho" (`IDEIAS:1275-1277`).
- Ambiente de teste não grava (localhost/LAN/`?debug=1`); opt-in `furious_rhino_allow_local_write`; "Sonda contra produção SEMPRE com prefixo `claude-`"; `notify_off`.
- "**Medalhas são append-only** e os ids são imutáveis" (textos mutáveis); "`u ≥ 4`/`y ≥ 5` são contrato do `runBonus` — nunca reciclar semântica de letra".
- "**A fonte da verdade é o aparelho.** … Qualquer faxina que só toque o Firestore é enxugar gelo" (`:942-944`); "Baixar uma marca no servidor sem baixar a referência no aparelho **tranca o jogador fora**".
- "**NA DÚVIDA, ACEITA**" (`:736-747`): "Barrar um inocente é muito pior do que deixar passar"; correção "**Nunca subir ninguém** … só desce"; "**Corrida suja é prova; ausência de corrida boa não é.**"; prova do chefe lê o elenco real da cena.
- "**Falha do jogo não pune o jogador**" (tentativa devolvida); "sessão quebrada NÃO PONTUA — mas … é REGISTRADA"; "A corrida é salva ANTES de subir ao ranking"; mensagem honesta.
- Recuperação de identidade "**MEDIADA, nunca automática**"; "O merge SOMA os totais … nunca copia".
- "**Todo cache precisa de um dono que o invalide no evento que muda o dado dele.**"
- "`js/home/HomeScreen.js` não pode tocar em Phaser"; contrato do toque (640,650) + `stopPropagation` em todo botão novo.
- "**O `Constants.js` é sagrado.** … nenhum servidor o reescreve" (`:504-510`); nunca pinar valores do registry de skins em teste; `SpriteParams` sem `import`.

**Física / colisão / soft-lock:**
- "**Rampas são terreno, não corpo de física**"; portão/barreira "**não tem corpo físico** … banda de x + clamp posicional + janela de knockback"; "*Soft-lock é pior que morte.*"; "Nada de pressão letal por trás; rampa fora de arena".
- "**Contrato binário intacto: sem HP, contato mata, dash mata em 1 toque**" (`GAME_DESIGN:357-359`; `IDEIAS:1010-1012`).
- Hitbox intocada sempre — folga visual "é perdão a favor do jogador, nunca contra" (dardo 24×8; `RHINO_VISUAL_SCALE` 1,30 com body 76×54).
- Guarda de ferramenta pergunta pela ferramenta (`debug`/`invincible`); "**Teste que só roda em debug não prova nada sobre a partida real.**"

**Visual / legibilidade / render:**
- "**Zero build, zero asset binário**" (SVG/procedural, Web Audio, glifo do WhatsApp inline, "zero MP3"); no programa Zoo "zero SVG novo (cenário é 100% TextureFactory)".
- Fresta clara sobre corpo escuro, 3 alturas, glow permanente = mira; "Espinho de aço e dardo ficam idênticos (vocabulário letal aprendido)"; torre: "seteira (36,70) e bandeirinha veterinária intocadas (contratuais)".
- Tint atmosférico jamais em gameplay; fg abaixo da linha do chão; figurantes letais jamais em bg-near; lianas y≤380.
- WebGL: "`fillGradientStyle` não renderiza no SwiftShader — usar `fillVerticalGradient`"; "`fillRect` com largura negativa corrompe o batch"; "Tiles de 640px precisam emendar" (±640); props acima de `FAR_BASE 336`; "**padrão do chão fino preso à câmera mantido**" (anti-WebKit 26: "Geometria do tamanho do mundo é uma aposta em cada motor novo").
- "**delta de boot medido no celular do dono é critério de aceite de cada release** (portão 2)".

**Gameplay / progressão:**
- Fúria BLOQUEADA em toda arena (dado v1.8); inegociáveis de boss (item 1b); "Vencer = encerrar a corrida permanece intocável" no Guardião; "NÃO rotacionar ordem/arsenal".
- "**Checkpoint segue fora da mesa**: metros SÃO pontos"; treino (M6) "zero pontos, zero telemetria, zero medalha"; "Desistir … sem contar NADA".
- "façanha FÍSICA fala em metros … COMPETIÇÃO fala em pontos"; "**Teto `bônus ≤ metros`**"; duas semânticas de "há quantos dias" (pódio cascata / lista idade da marca).
- **Escola do Rino congelada até as leituras**: "zero mudança em densidade/pesos/física. Única exceção aprovada pelo dono: a zona de respeito (v1)"; "Pesos LETAIS intocados"; `f ≥ 1` devolve a **referência** do tier "bit-idêntico"; toda leitura corta por `v` da corrida.
- Copy: "**convite, nunca bronca**" (streaks); "Nunca bloqueia" (apelido, PWA).
- "3º boss aos 3000 m" / deserto profundo: só com o gatilho quantificado; "a ordem É a identidade".
- v1.14: "**RNG próprio e isolado do stream de spawn (inegociável)**" para o DecorDirector.

**Processo:** "**Validação local do dono antes de qualquer publicação**"; 3 portões com confirmação explícita; "a regressão de release roda todas — sempre"; sessão paralela no repo (conferir dono de arquivo; nunca `git add -A`); "Texto acentuado: sempre Edit/Write, nunca pipeline de texto do PowerShell".

---

## 5. Estado da v1.12 e do programa v1.13/v1.14 (para não reinventar o aprovado)

**v1.12.0 — 30/08/2026 — "O ZOO QUE FICA PARA TRÁS (parte 1 de 3)"** (`CHANGELOG.md:8-22`, publicada em produção, commit `1f79fb8` segundo a memória): chão próprio por ala (concreto+faixa amarela / piso claro+penas / laterita+capim); paredes `-aviario` (treliça) e `-savana` (taipa), jaulas mantêm tijolo âmbar; portais "Portão do Viveiro" e "Porteira do Safári" com vitrine do próximo bioma e "o fundo novo agora **aparece ANTES do arco**"; flash na cor do destino, revoada aos 200 m, manada aos 400 m; narrativa ambiental (cadeado, jaulas abertas, Domo rasgado, cerca arrebentada, baobá); torre de dardo = "torre de vigia do tratador (mesma silhueta, mesma seteira)"; savana sem montanhas nevadas; **zona de respeito nos arcos [−450, +250] com guarda de vão ocupado** — "⚠️ Única mudança que toca spawn: **a leitura da Escola do Rino de 26/09 deve cortar por `v` da corrida**"; de brinde, "parceiros de combo que … nasciam DENTRO das zonas dos portais da cidade ou das arenas de boss deixam de nascer; e as rampas silenciam também na aproximação da zona"; fila de toasts; "+20 texturas procedurais … zero SVG novo … Dificuldade, física, elencos, clima e céu **intocados** (Monte Carlo bit-idêntico: 1,4/2,3/3,2 por tier)".

**Regras de aceite do programa (valem para v1.13 e v1.14, plano `:34-58`):** máquina `ZOO_ALAS` estendendo `CITY_DISTRICTS`, "NADA toca `getBiomeIndex`/`getTierIndex`/`weatherFor`; céu, clima, elencos, posições de arcos/biomas/portão intocados"; vetos de legibilidade (item 1a); "máx. 12 chaves de parede por release"; delta de boot no celular do dono como critério; zero campo novo no Firestore.

**v1.13.0 "Mata e Água" (~12–15 chaves, plano `:127-157`, aprovada, próxima):** `propSkin: '-mato'` para savana/floresta/pântano (`spike-tower-mato`, `tranq-tower-mato` com bandeirinha mantida, `ramp-*-mato`; "verificar antes se rampas `''` têm paridade de rubble"); portais `arch-floresta` "Túnel de Dossel" (lianas y≤380) e `arch-pantano` "Ponte do Brejo" com lampiões; `ground-floresta`, `ground-pantano` (poças ESTÁTICAS), fg floresta/pântano, `bg-mountains-pantano`; "**Sem parede nova nesta release** (`-floresta` CORTADA … `-pantano` adiada para v3 condicionada ao boot)"; conserto do `glassTank`; muro exterior fininho no bg-far; placas "SAÍDA →"; cerca-barômetro estados 4-5; coreografias 600/800/~950 m; **BIOME_FEEL** (`onDash`/`onLand`/`onSmash`, "Cap 6–8 partículas/burst; `feelBurst` suprimido enquanto o emitter de clima roteirizado estiver ativo"); flashes verde-mata e violeta ("testar contraste do violeta sobre o céu de crepúsculo ANTES").

**v1.14.0 "Jornada" (0–6 chaves, `:159-175`):** parede `-pantano` "SOMENTE se o delta de boot da v2 aprovar"; **DecorDirector** (arquivo novo → ASSETS + bump; RNG isolado; "metade do decor por seed diário"); label "ALA 2/5 — VIVEIRO DAS AVES"; **morte com contexto** ("Você caiu na SAVANA — 473m" + barra das 5 alas; "Sem screenshot do canvas"); **marcador de recorde como PLACA** ("não bandeirinha — vocabulário da torre"); stings por bioma via synth; "Ajustes guiados pelos dados pós-26/09".

**Verificação por release (`:185-207`):** dossiê fotográfico comparativo (10 capturas), delta de boot via `/?voo=1`, bateria completa + asserts novos (chaves por ala congeladas, `WALL_SKINS`, `skinFor`, zona de respeito em N corridas simuladas, fila de toasts), Monte Carlo inalterado por construção, jogar nas fronteiras via teleporte, 3 portões.

**Calendário que trava qualquer revisão geral:** leituras da Escola do Rino em **12/09 e 26/09** (hoje 05/09) — nada de densidade/pesos/física antes disso; métricas pré-registradas em `IDEIAS-FUTURAS.md:480-488` (primária: "% novatos passando de 400 m em ≤10 tentativas"; negação do dash 0–200 m ~51% → <30%; vidas com `j=0` 47% → <20%; guarda-corpo: veteranos "distribuição INALTERADA"); streaks medidos junto (`GAME_DESIGN:1088-1090`). Julgamento da Muralha exige n≥15 (~6–8 semanas de funil).

**Inconsistências de doc encontradas (a revisão geral deve tratá-las como pendência de `/atualizar-docs`, não reinventar):** `GAME_DESIGN.md:3` "v1.11.0" (sem seção do programa Zoo); `HANDOFF.md` topo v1.10.0 (v1.10.1/1.11/1.12 sem handoff); `IDEIAS-FUTURAS.md:1757` ainda lista F como pendente e o "banco" do plano não foi transcrito; `CHANGELOG.md:12` é hoje a única descrição do programa dentro do repo (a spec completa vive no arquivo de plano fora do git).