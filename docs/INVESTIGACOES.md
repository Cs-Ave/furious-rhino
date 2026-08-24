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
