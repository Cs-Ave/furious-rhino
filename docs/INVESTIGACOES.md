# Investigações — problemas em aberto do FURIOUS RHINO

> **Documento vivo e append-only.** Mesmo estatuto do
> [`QA-Registro.md`](QA-Registro.md), mas para o outro lado da moeda: o
> `QA-Registro` guarda dúvida **já respondida**; aqui fica o que ainda **não
> tem resposta**, com tudo que já se sabe e tudo que já foi descartado.
>
> **Por que existe:** as hipóteses mortas valem tanto quanto as vivas. Em
> 23-24/08/2026 sete caminhos foram testados e descartados nesta investigação —
> e sem registro, a próxima sessão os repetiria um por um.
>
> **Como alimentar:** rode `npm run investiga` e cole a saída como **entrada
> datada** na Linha do tempo do caso. Hipótese nova entra na tabela como 🔴 com
> a evidência que a sugeriu. Hipótese testada vira ✅ ou ❌ — e **❌ guarda o
> teste que a matou**. Nunca reescreva entrada antiga: correção entra como
> entrada nova, datada.

**Estados:** 🔴 aberta · 🟡 em teste · ✅ confirmada · ❌ descartada · 🏁 caso fechado

---

## CASO 1 — A distância que salta (aberto em 23/08/2026)

**Status: 🟡 parcialmente resolvido.** A causa da *cascata* foi encontrada e
corrigida na v1.9.4; o *salto de distância* que a dispara continua aberto.

### O sintoma

Corridas gravadas com distância impossível para o tempo: **10.000 m em 44 s**
(227 m/s), sendo a velocidade normal de campo 8–11 m/s e o teto físico do motor
**35,16 m/s** (`DASH_SPEED` × fúria 1,5 × especial 1,25 ÷ `PIXELS_PER_METER`).

Aconteceu com jogadores reais — não é trapaça. O primeiro relato veio do
**ben**, que avisou que "o jogo trava"; a investigação começou por aí.

### Linha do tempo

**23/08 — o falso começo.** 26 de 85 corridas da v1.9.0 acima do teto, contra
ZERO em ~820 corridas de todas as versões anteriores. Correlação perfeita com
**Chrome 150 / Linux / 1360×768**; o `kukur`, em Chrome 151 no mesmo Linux, sem
uma anomalia. A leitura da época — "a distância é real, o tempo é que mente" —
veio de um padrão do `nikolinhasss`: ele morria sempre no mesmo obstáculo dos
~57 m, ora com `s=7`, ora com `s=1`. **Essa leitura estava errada** (ver 24/08).

Defesas publicadas: guarda de plausibilidade (v1.9.1) e a sonda `i` (v1.9.2).

**24/08 — a sonda contradiz a hipótese.** Os 6 primeiros registros com a letra
`i` chegaram. Um deles:

```
kukur   m=10.000  s=44s  i=44s  →  227 m/s  'win'  v1.9.3
```

Os dois relógios **concordam**. Pela tabela de leitura, isso significa que o
cronômetro está certo e **a distância saltou** — o oposto do que se supunha.

**24/08 — o achado maior.** Varrendo a base inteira: **todas as 4 vitórias têm
ZERO das 21 camadas de chefe**. O contador funciona (43 corridas o gravaram). A
regressão tem data:

| Versão | Chegou a 1000 m | Entrou na arena (`z`) | Quebrou camada |
|---|---|---|---|
| v1.7.1–1.7.2 | 36 | 40 | **35** ✓ |
| v1.8.2–1.8.3 | 3 | 9 | **8** ✓ |
| v1.9.0 | 4 | 4 | **0** ✗ |
| v1.9.3 | 1 | **0** | **0** ✗ |

Última camada quebrada: **22/08 16:14, v1.8.3**. A v1.8.5 (21/08 22:22) trouxe
o `isBypassed`.

**24/08 — o sinal certo não era velocidade.** O topo do ranking:

| # | Jogador | m/s | camadas | pulos |
|---|---|---|---|---|
| 1 | kukur | 23 | **0** | **3** |
| 2 | nikolinhasss | 11 | **0** | **0** |
| 3 | Ícaroo brabo | 10 | 3 | **1.262** |
| 4 | Thomas | 10 | 3 | **1.391** |

O `nikolinhasss` a **11 m/s** passa em qualquer teto de velocidade. **Interação
por metro** é que separa. A restauração dele na v1.9.2 usou o critério errado —
registrado aqui como erro, não corrigido no ranking (ver Pendências).

**24/08 — a auditoria de telemetria mudou o que este caso enxerga.** Ao
conferir se tudo estava sendo coletado (ver LACUNAS, abaixo), apareceu que **a
corrida que TRAVA não era gravada em lugar nenhum**: o `crashToHome` não
chamava `addRun` — decisão da v1.9.1, onde "não pontuar" virou "não registrar"
por acidente. Ou seja, **a corrida anômala apagava a própria evidência**, e
todo travamento relatado pelo ben saiu da amostra. Corrigido na v1.9.5: a
corrida entra com causa `crash` e os dois relógios (`s` e `i`), sem pontuar.

Também apareceu que **3 dos 5 chefes não tinham cronômetro** e que os quiques
de 4 deles eram descartados — instrumentação que a v1.9.5 ligou. Para este
caso, isso significa que a próxima coleta pode distinguir "lutou e perdeu" de
"passou direto" em todas as arenas, não só no Portão.

### Hipóteses

| # | Hipótese | Estado | Evidência |
|---|---|---|---|
| **H1** | **A cascata**: o gatilho legado dos 1000 m roda no `update` normal e dispara `crossGate()` sem luta; daí o `isBypassed` de cada chefe vê "já estou além da âncora" e todos se rendem | ✅ **confirmada** e **corrigida na v1.9.4** | Código (`GameScene.js:3022` + os 5 `isBypassed`) · 4/4 vitórias com 0 camadas · a data bate com a v1.8.5 · **reproduzida em teste**: pôr o rino além do gatilho deixou os 5 chefes `defeated` com 0 camadas |
| **H2** | **Catch-up sem limite**: o `fixedStep` do Arcade tem `while (_elapsed >= msPerFrame) step()` **sem `maxSubSteps`** — um delta grande vira N passos num frame | 🔴 aberta | É o candidato do *salto*. A janela entre a face do portão e o gatilho é de **120 px**: um único frame de **85 ms** a atravessa. Tentativa de reproduzir chamando `world.update` na mão **não** moveu o sprite (o `postUpdate` não roda fora do ciclo) — falta um caminho de teste |
| **H3** | **Retrato**: o `#rotate-overlay` é 100% CSS, sem `scene.pause()` — em pé, **o jogo continua rodando por baixo**, às cegas | 🔴 aberta | O `kukur` estava em **485×1076 (retrato)** na corrida de 44 s; nas anteriores, `1076×485` (paisagem). É o único estado em que o loop avança sem o jogador ver nem controlar |
| **H4** | **Janela de 150 ms** no `startRun`: a física roda e o `update()` da cena faz early-return | 🟡 em teste | Magnitude parece pequena (~45 px), mas é a única dessincronia estrutural conhecida entre os dois relógios |

### ❌ Descartadas por teste (não repetir)

| Hipótese | Como morreu |
|---|---|
| Congelar o JS por 20 s durante a corrida | Reproduzido: a metragem **congela junto** (25 m → 25 m em 42 s) |
| `requestAnimationFrame` sem vsync | Substituído por `setTimeout`: velocidade seguiu normal (8 m/s) |
| CPU 4× e 8× mais lenta | A física avança por **tempo**, não por frame: m/s variou 1,02× |
| 3 minutos parados na home antes de correr | `physics.pause()` **não** acumula `_elapsed` (`World.update` retorna antes) |
| 10 ciclos rápidos de morre-reinicia | 10/10 corridas normais (55-57 m, 7-8 s) |
| Exceção dentro do `update()` | **Mata o loop inteiro** — congela metragem e jogo juntos, e nada é gravado |
| Contador de camadas quebrado | O contador **funciona**: 43 corridas o gravaram |

### Instrumentos no ar

**A sonda `i`** (v1.9.2) — segundos medidos pelo LOOP, ao lado do `s` de parede.
Num jogo saudável os dois quase coincidem (medido: 16 s × 15 s).

| Leitura | Diagnóstico |
|---|---|
| `i ≈ s` | cronômetro certo → a **distância** saltou |
| `i >> s` | o jogo rodou **acelerado** |
| `i << s` | o loop **congelou** enquanto o relógio andava |

**Os detectores** (`tools/investiga.mjs`, `npm run investiga`) — varrem a base
inteira a cada coleta e guardam snapshot datado para o diff da próxima.

### Custódia da evidência

- `tools/backup-ranking-2026-08-24.json` — 29 docs de `scores` + 32 de `stats`
  originais, **a única cópia das 25 corridas do incidente**. Fora do
  versionamento. **Não apagar sem o caso estar fechado.**
- `tools/snapshots/investiga-AAAA-MM-DD.json` — os contadores de cada coleta.

### Pendências deste caso

- **O ranking não foi limpo.** Os dois primeiros lugares vieram de corridas com
  zero camadas. Decisão do dono (24/08): esperar a causa estar corrigida —
  limpar antes seria só para reencher depois. Com a v1.9.4 no ar, dá para
  reavaliar.
- **O `D2`/`D3` ainda não são guarda de submit**, só detector de relatório. Se
  o salto reaparecer, a marca sobe ao ranking se estiver abaixo de 40 m/s.

### Próximo passo

Rodar `npm run investiga --salvar` depois de a v1.9.4 estar em campo alguns
dias. Se `D3-vitoria-sem-chefe` cair a zero, a cascata está fechada e o que
sobrar é o salto puro (H2/H3) — com muito menos ruído para caçar.

---

## LACUNAS DE TELEMETRIA — auditoria de 24/08/2026

> Não é um caso investigativo: é o **mapa do que não se consegue medir hoje**,
> levantado cruzando o código com 1.070 corridas reais. Serve para não
> descobrir a mesma cegueira duas vezes, e para saber de antemão quais
> perguntas os dados **não** conseguem responder.
>
> O que a auditoria achou e **já foi corrigido** está no fim, para o histórico.

### O que ainda não dá para medir

| # | Lacuna | Por quê | Custo de resolver |
|---|---|---|---|
| L1 | **A rotação da janela de 50** | `runs[]` guarda 50 corridas por jogador. **674 já saíram de alcance**, e 7 jogadores ativos estão perdendo histórico agora. Um detector que "melhora" pode ser só corrida velha caindo da janela | Alto: mexe nas rules (`runs.size() <= 50`) e cresce o doc de todo mundo |
| L2 | **O painel `/?stats` é cego para 7 letras** (`p e h l u y i`) | O `allRuns()` (`StatsDashboard.js:183-202`) só copia 17 chaves. Os 4 chefes que não são o Portão e a sonda do cronômetro **não existem** em nenhuma aba agregada — só na radiografia | Baixo: acrescentar as chaves ao decodificador |
| L3 | **`client.lang` e `client.browserVersion` são 100% órfãos** | Gravados em TODO envio, nunca lidos por ninguém. Consomem 2 das 10 chaves de `client` — e sobra só 1 | Baixo para remover, mas mexe em dado histórico |
| L4 | **`n` é decodificado no painel e nunca usado** | `StatsDashboard.js:196` copia e nenhum cálculo consome. Decode morto | Trivial |
| L5 | **Zero é indistinguível de ausente** | `addRun` omite contador zero (`if (v > 0)`). Para as letras de chefe, "chegou e não quebrou nada" e "nunca chegou" gravam a mesma coisa: nada. Só dá para separar cruzando com `m` — ou com os cronômetros, quando existem | Estrutural: mudaria o byte-budget da janela inteira |
| L6 | **`x` mede mais do que promete** | O comentário diz "investidas pedidas durante o cooldown", mas `Rhino.js:130` testa `dashState !== 'idle'` — conta também os toques com o dash **ativo**. Em mobile, toque é rajada: boa parte de `x` é ruído, não frustração | Baixo, mas **mudaria a série histórica** |
| L7 | **Encontros por chefe nunca são enviados** | `furious_rhino_muralha_seen` e afins existem em `localStorage` e só servem de gatilho de dica. Saber "quantas vezes este jogador já encontrou o Faraó" é dado que **já está no aparelho** | Médio: o 1º nível de `stats` está lotado (12/12) |
| L8 | **Sem `sendBeacon`/`keepalive`** | O envio de telemetria é fire-and-forget e morre se o jogador recarregar (o "Jogar Novamente" é `location.reload()`). A cura é sempre "no próximo boot" — que só acontece se ele voltar | Médio |
| L9 | **`days[].s` tem um leitor só; `days[].b` nenhum na radiografia** | `s` (sessões) só alimenta o denominador de `corridasPorSessao`; `b` (melhor do dia) só aparece no digest e na ficha individual | Trivial |
| L10 | **Precisão de investida é proxy** | Não há contador de acertos: usa-se `(w+r+o+a)/d`, que fúria e multi-quebra superestimam. A letra que resolveria isso (`i`) foi gasta na sonda do cronômetro | Precisaria de chave nova |

### O orçamento hoje

| Onde | Teto das rules | Em uso | Livre |
|---|---|---|---|
| 1º nível de `stats` | 12 (`hasOnly`, fechada) | 12 | **0** |
| `client` | 10 | 9 (2 delas órfãs — ver L3) | **1** |
| `deaths` | 17 | 17 | **0** (bump é barato, já feito 2×) |
| `history` | 6 | 5 | **1** |
| `geo` | 4 | 4 | **0** |
| `runs[]` — nº de corridas | 50 | 50 | **0** (ver L1) |
| `runs[]` — chaves por corrida | **as rules não validam** | 26 letras + 7 de 2 chars | livre, com custo em bytes |

**A descoberta que destravou a v1.9.5:** o "orçamento de letras" nunca foi
regra técnica. As rules só exigem `runs is list && size() <= 50` — a forma do
elemento é livre, e nada no código assume chave de 1 caractere. O custo real é
em **bytes**, e como contador zero é omitido, 7 chaves novas custaram ~136
bytes na base inteira.

### Sobre a base de dados (contexto para qualquer leitura)

- **35% das corridas não têm `s`/`c`/`v`** — são de **14 clientes presos em
  v1.5.0–v1.7.2**, todos **inativos há 17+ dias**. É legado, não problema
  ativo, mas qualquer média sobre a base inteira mistura os dois regimes.
- **1 doc = 1 aparelho, não 1 pessoa.** Retenção medida aqui é de aparelhos.
- A corrida do **"Desistir"** é descartada por design (`removeAttempt` +
  reload, sem `endGame`) — quem pausa e desiste nunca aparece na amostra, e é
  justamente o perfil que o contador de pausas (`p`) queria medir.

### ✅ O que a auditoria achou e a v1.9.5 corrigiu

Fica registrado para não se procurar de novo:

- **3 dos 5 chefes não tinham cronômetro** (Barreira, Faraó, Caçador-Mor) — e o
  `fightMs` já era calculado nos cinco, morrendo com a cena. → `zu`/`zy`/`zl`.
- **Os quiques de 4 chefes eram write-only** — contados 60×/s e descartados no
  `endGame`. → `qe`/`qu`/`qy`/`ql`.
- **A corrida que trava não era gravada** — "não pontuar" virou "não registrar"
  por acidente na v1.9.1, e a corrida anômala apagava a própria evidência.
  → gravada com causa `crash`, ainda sem pontuar.
- **`history.days` podia divergir para sempre** — o `recordRun` (incremento,
  não recuperável) ficava 180 linhas depois do `addRun`, com 14
  `getElementById` desprotegidos no meio. → os dois andam juntos.
- **`deaths.cerco`/`farao` gravados desde a v1.8.10 e nunca somados** no
  relatório. → incluídos no loop de causas.
- **Barreira e Faraó sem métrica na radiografia** (pulava de `b2` para `b3`).
- **Rótulo trocado**: `e` era chamado de "Cerco" no `MyStats` e no comentário
  do `endGame` — é a **Muralha**. E o `MyStats` não somava `u`/`y`.

---
