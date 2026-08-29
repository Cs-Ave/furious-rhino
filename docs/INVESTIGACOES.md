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

**25/08 — a cascata fechou em campo, e o pódio foi ajustado.** Primeira coleta
com a v1.9.4 no ar. `D3-vitoria-sem-chefe` e `D1-velocidade` **caíram a zero**;
`D5-arena-sem-quebra` caiu de 6 para 2. As duas que restam são de **v1.7.0 e
v1.7.2**, anteriores à cascata — pergunta separada, não resolvida por ela.

Com a causa corrigida, o ranking foi limpo (era a pendência aberta em 24/08). O
critério de velocidade **não** servia: a marca do `nikolinhasss` era 11 m/s, o
ritmo de qualquer jogador. O que denuncia é a **luta que não houve**:

| Jogador | Marca | Camadas de 21 | "Luta" Portão/Muralha | Melhor dia pré-cascata |
|---|---|---|---|---|
| kukur | 13.700 → **502** | **0** | 1 s / 1 s | 472 m (16/08, v1.8.1) |
| nikolinhasss | 12.977 → **559** | **0** | 2 s / 2 s | 612 m (22/08, v1.8.3) |

O corte é limpo na base inteira: **fora** da janela da cascata, 35 de 36
corridas que passaram dos 1.050 m derrubaram o portão; **dentro** dela, 0 de 5.
E as 5 pertencem a essas duas pessoas. A confirmação mais forte é o
`nikolinhasss`: mesmo aparelho, 23 corridas em 22/08 na v1.8.3 travando em
612 m, depois 72 corridas na v1.9.0 atravessando o mundo inteiro.

O `fix-ranking` ganhou a cascata como **segunda causa** (`ehCascata`), e com
ela três guardas que faltavam — as três valem para qualquer correção futura:

1. **Só entra quem tem corrida suja na janela.** A tentação era recalcular todo
   mundo e rebaixar quem não sustentasse o placar; seria errado, porque a
   janela guarda 50 corridas e 674 já rodaram para fora (lacuna **L1**). O
   Funku Pópi marcou 3.304 e a melhor que resta dele é de 1.997 — recalcular o
   rebaixaria sem que nada de errado tivesse acontecido. **Corrida suja é
   prova; ausência de corrida boa não é.**
2. **Nunca subir ninguém.** A restauração só desce.
3. **Sem corrida boa E com histórico rotacionado → revisão à mão, não o lixo.**
   Apagar aí seria punir por falta de prova.

Perda aceita e registrada: o `nikolinhasss` voltou para 544 m, não para os
612 m que o `history.days` guarda. Aquela corrida já rodou para fora da janela
— **nem o backup de 24/08 a tem**. É a lacuna **L1** cobrando na prática, e
inventar a corrida para recuperar 53 pontos seria pior que a perda.

Achado de passagem, com consequência de design: **ninguém jamais derrotou a
Muralha dos 2.000 m**. Ela chegou na v1.8.5 — exatamente quando a cascata
começou — e nunca esteve de pé. A v1.9.4 é a primeira versão em que ela
existe de verdade, e o mesmo vale para a Barreira, o Faraó e o Caçador-Mor.
A dificuldade do jogo subiu de degrau para todo mundo sem que nada nela mudasse.

Estado final da base: **1.065 corridas reais, zero sujas, zero sondas**.


**28/08 — a porta do `?debug=1`, e a faxina que o caso de 25/08 exigiu.** Ao
retomar, a leitura da produção mostrou três coisas: (1) um **jogador real**
(`cadaec9e`, "calça larga", 3º lugar com 3.992 pts) passou do portão três
vezes em v1.9.5 com zero camadas — não é regressão da v1.9.4: as outras
corridas dele provam a correção funcionando (morreu 3× nos 990 m com `b=2`,
lutou a Muralha com `e=2`). O caminho fecha no `isBypassed`, que exige a flag
`debug` — e ela vem de um lugar só, o **`?debug=1` da URL**, painel público
com teleporte de chefe. (2) A limpeza de 25/08 **durou um dia**: o `kukur`
jogou às 19:25 e o cliente regravou o `runs[]` por cima — a fonte da verdade
é o aparelho. (3) Os dois corrigidos ficaram **travados fora do ranking**: o
`bestSent` local continuou na marca antiga e o `shouldSubmit` exigia superá-la.

A v1.9.6 fechou as três: `?debug=1` virou ambiente de teste (o
`allowsRemoteWrite` recusa, com o opt-in que já existia no painel); a **prova
do chefe** virou guarda de submit e de desafio (módulo puro `BossProof.js`,
lista montada do elenco REAL da cena); e a **faxina roda no aparelho**, no
boot, recomputando o `bestSent` — é ela que destrava os dois. 1.039 asserts.

A faxina do SERVIDOR (`fix-ranking --yes`) fica para DEPOIS do deploy da
v1.9.6 — antes dele, o próximo boot do jogador desfaz de novo. O ensaio de
28/08: `calça larga` 3.992 → 1.119 (decisão do dono pendente — jogador real
usando parâmetro público não é a mesma coisa que bug nosso), 3 corridas saem
do `827596b5`, 3 do `cadaec9e`, 1 do `ff79ba36`, e a sonda
`claude-rules-check-01` (de outra sessão? conferir antes).

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

- ~~**O ranking não foi limpo.**~~ ✅ **feito em 25/08** — ver a entrada da
  Linha do tempo. `kukur` e `nikolinhasss` voltaram à melhor marca legítima
  deles; a base ficou com zero corridas sujas.
- ~~**O `D2`/`D3` ainda não são guarda de submit**~~ ✅ **o `D3` virou guarda na
  v1.9.6** (28/08): a PROVA DO CHEFE (`js/systems/BossProof.js`) roda no
  `shouldSubmit`/`submit` e no `bestInWindow` dos desafios — marca que passou
  por chefe sem derrubá-lo nem sobe. O **`D2` (interação por metro) fica DE
  PROPÓSITO como detector**: pulos por metro variam demais entre jogadores
  legítimos para barrar submit sem risco de punir inocente — a régua da casa
  é "na dúvida, aceita", e o D2 continua no relatório para apontar o que a
  guarda dura não pode afirmar.
- **Sobraram 2 acendidas no `D5`**, de v1.7.0 e v1.7.2, **anteriores** à
  cascata: alguém passou da arena do Portão sem quebrar camada numa versão em
  que os chefes funcionavam. Amostra pequena e antiga, mas é a única anomalia
  de chefe que a v1.9.4 **não** explica.
- **A perda por rotação virou concreta** (lacuna **L1**): a corrida de 612 m do
  `nikolinhasss` existe no `history.days` e não existe em lugar nenhum onde dê
  para pontuá-la. Enquanto a janela for de 50, toda correção futura vai
  restaurar por baixo do que o jogador realmente fez.

### Próximo passo

A cascata fechou (`D3` = 0 em 25/08) e o pódio foi ajustado. O que sobra é o
**salto de distância puro** — H2 (catch-up sem `maxSubSteps`) e H3 (retrato
sem `scene.pause()`) —, agora sem o ruído que a cascata produzia.

A instrumentação da v1.9.5 é o que muda o jogo aqui: a corrida que trava
passou a ser **gravada** com causa `crash` e com os dois relógios (`s` de
parede e `i` de loop). Antes ela apagava a própria evidência. Basta um novo
travamento em campo para ler `i` contra `s` e separar H2 de H3 de uma vez:

- `i` ≈ `s` com metragem alta → **a distância saltou** (H2, catch-up).
- `i` << `s` → **o loop congelou** e o relógio de parede seguiu (H3, retrato).

Rodar `npm run investiga --salvar` a cada coleta para ter o diff.

---

## CASO 2 — "Não consegue acessar a página" (aberto em 28/08/2026)

**Status: 🔴 aberto.** Relato de campo: ao tentar iniciar o jogo, o jogador vê
uma mensagem de **"não foi possível acessar a página"** — erro do NAVEGADOR,
anterior a qualquer código nosso. Este caso é, por definição, **invisível na
telemetria**: a página que não carrega não grava nada. Toda a evidência abaixo
é indireta — e mesmo assim conta uma história consistente.

### A evidência

**1. O precedente que nunca foi explicado — e agora tem desfecho.** Em 23/08 o
**ben** relatou o mesmo sintoma ("não consegue abrir mais o jogo"), logo após o
travamento que abriu o CASO 1. A metade do "travou" foi corrigida (v1.9.1); a
metade do "não abre mais" ficou sem explicação. Agora dá para fechá-la: o ben
**nunca mais apareceu com a identidade dele** — e dois dias depois surgiu o
`calça larga` (`cadaec9e`, 25/08 19:28) com fingerprint quase idêntico:

| | ben (backup 24/08) | calça larga |
|---|---|---|
| Cidade | Americana-SP | Americana-SP |
| Aparelho | desktop Linux | desktop Linux |
| Tela | **1360x768@1** | **1360x768@1** |
| Idioma | **en-US** (raríssimo no BR) | **en-US** |
| Chrome | 150 | 151 (2 dias depois — auto-update) |

Conclusão com alta confiança: o ben "consertou" o acesso **apagando os dados do
site** (novo UUID = localStorage zerado). Ou seja: **a falha morava nos dados
locais do site (service worker/cache), não no servidor** — limpar resolveu.

**2. O suspeito atual: Palito** (`18a80027`, iPad · Safari 26 · iPadOS 26.6,
35 tentativas). A última sessão dele (25/08 18:16-18:18) tem **todas as corridas
com o loop congelando 1-3 s** (`i` < `s` em 8 de 8 — é o D4 do `investiga`
acendendo). Em **26/08 12:42 ele ABRIU o jogo** (o `updatedAt` do boot prova que
a página ainda carregava) **e não jogou nenhuma corrida**. Silêncio desde então.
O relato de "não acessa" chegou em 28/08. Perfil compatível; não confirmado.

**3. O servidor está ÍNTEGRO agora** (28/08): os **199 arquivos** do `ASSETS`
do `sw.js` respondem 200 em produção, versão v1.9.6 propagada. A falha não é
arquivo faltando nem Pages fora do ar — é estado do cliente ou rede instável.

**4. O mesmo padrão em três jogadores**: ben (23/08, travou → sumiu → voltou
resetado), nikolinhasss (24/08 00:27, corrida com `i=7/s=14` → última atividade
00:29) e Palito (25/08, congelamentos → sumiu). **Os três pararam de jogar
minutos depois de um congelamento registrado.**

### O mecanismo no código (confirmado por leitura, não por reprodução)

O `fetch` handler do `sw.js` tem quatro fragilidades que convergem exatamente
para "página inacessível":

| # | Mecanismo | Efeito |
|---|---|---|
| M1 | `catch(() => caches.match(e.request))` devolve `undefined` quando o cache não tem o item — e `respondWith(undefined)` é **erro de rede garantido**. Não há `ignoreSearch`, nem fallback de navegação para `./index.html` | Qualquer miss vira a página de erro do navegador |
| M2 | `fetch(req, { cache: 'no-cache' })` **força revalidação no servidor em toda requisição**. Em rede instável, a revalidação falha onde o navegador sozinho teria servido do cache HTTP | **Com o SW, a conexão ruim fica PIOR do que sem SW** — e o fallback é o M1 |
| M3 | `install` faz `addAll` **atômico de 199 arquivos** (incl. CDN do Phaser): um único fracasso e o SW novo nunca instala; o cliente fica preso no SW velho, cujo `cache.put` do fetch **mistura arquivos novos no cache velho** (precedente documentado: v1.4.0) | Clientes presos em versão velha com cache híbrido |
| M4 | Nunca pedimos `navigator.storage.persist()` | O navegador pode **despejar o cache inteiro** sob pressão de espaço — Safari/iPadOS é o mais agressivo (e apaga TUDO após 7 dias sem uso fora de PWA instalado) |

A sequência que produz o sintoma: cache despejado ou incompleto (M3/M4) →
jogador abre com rede fraca → revalidação forçada falha (M2) → fallback perde
(M1) → **"não foi possível acessar a página"**. E dois deploys em 4 dias
(25 e 28/08) multiplicam o M3: cada release força o re-download dos 199.

### O que falta para confirmar (perguntar a quem relatou)

1. **Qual aparelho?** (se iPad/Safari, o Palito vira confirmação)
2. **A mensagem exata** — é a página de erro do navegador ou o overlay "😵 O
   jogo travou"? (o segundo é outro caso, já coberto pela v1.9.1)
3. **Instalado como app ou pelo navegador?**
4. **Com internet funcionando em outros sites?**
5. O teste que decide: **limpar os dados do site resolve?** (No ben, resolveu —
   ao custo da identidade. Se resolver de novo, M1-M4 está confirmado e o
   jogador deve ANTES anotar o apelido para o 🆘 do `/?setup` recuperar.)

### Hipóteses

| # | Hipótese | Estado | Evidência |
|---|---|---|---|
| **C2-H1** | O quarteto M1-M4 do `sw.js`: cache incompleto/despejado + rede fraca + revalidação forçada + fallback que devolve `undefined` | 🟡 principal | Mecanismo confirmado no código; o reset do ben resolvendo aponta para dados locais; servidor íntegro |
| **C2-H2** | SW/cache em estado quebrado específico do Safari/iPadOS 26 (o processo do SW trava e toda navegação expira) | 🔴 aberta | Palito e benicio são os únicos iOS/iPadOS recentes; iPadOS 26.6 é novíssimo; irreproduzível daqui |
| **C2-H3** | Transiente de deploy (CDN do Pages propagando entre 25 e 28/08) | 🔴 aberta, improvável como causa única | Explicaria um episódio, não o padrão ben→Palito de 5 dias |

### 28/08 (noite) — a foto muda o caso: é CRASH-LOOP do WebKit, não rede

O dono reproduziu **no próprio iPhone 17 (iOS 26)** e mandou a captura: a
mensagem real é **"Um problema ocorreu repetidamente em .../index.html"** — a
tela do Safari para quando **o processo da página morre várias vezes seguidas**
(quase sempre memória/jetsam, às vezes bug do próprio WebKit). A paráfrase
"não conseguiu acessar a página" nos levou primeiro à face de rede; a v1.9.7
fica de pé pelos méritos próprios, mas **não corrige esta face**.

Os experimentos do dono, no aparelho que reproduz:

| Teste | Resultado | O que elimina |
|---|---|---|
| Aba privada (sem SW, sem dados) | **crasha igual** | ❌ estado local (SW/cache/localStorage) |
| Chrome iOS (mesmo motor, outro app) | **crasha igual** | ❌ o Safari-app; sobra o WebKit |
| O que aparece antes de morrer | **nada — nem o pódio** | a morte é nos PRIMEIROS instantes (a home é DOM+localStorage e pinta em ~0,5 s) |
| Caixa-preta do iOS | um `JetsamEvent` de 26/08, maior processo = Ajustes | inconclusivo — é de outro dia; o arquivo certo seria `WebContent-2026-08-28-*` |

A correlação de campo agora tem três pontos: **benicio (iOS 18.7) joga normal
· Palito (iPadOS 26.6) congela 1-3 s por corrida e some · o dono (iOS 26)
crash-loop antes da home**. O fator comum é o **WebKit 26**, não o aparelho
(iPhone 17 é topo de linha). Congelamento e morte por memória são o mesmo
filme em momentos diferentes.

| # | Hipótese (fase crash-loop) | Estado | Evidência |
|---|---|---|---|
| **C2-H4** | WebKit 26 morre com algo dos NOSSOS primeiros instantes (CSS de 2.400 linhas? SVG da home? o `document.write` de 1,2 MB do Phaser? o boot WebGL?) | 🟡 principal | privada+Chrome crasham; antes do pódio; iOS 18.7 imune |
| C2-H5 | Memória: jetsam por pico na carga (texturas/WebGL) | 🔴 aberta | precisa do `WebContent-*.ips` de hoje, ou da caixa-preta abaixo |

### O instrumento (v1.9.8) — GRAVADOR DE VOO + MODO SEGURO

Sem console no iPhone e com a morte antes de qualquer telemetria, a saída foi
a mesma filosofia da sonda `i`: **fazer a própria página deixar rastro**.

- **Gravador**: primeiro script da página; cada etapa do carregamento grava um
  marco síncrono no `localStorage` (`v0-head → v1-css → v2-body → v3-dom →
  v4-phaser-pre → v5-phaser-pos → v6-module → v7-home → v8-engine`). O voo que
  não chega ao `v8` fica guardado como interrompido.
- **`/?voo=1`**: mostra a caixa-preta e neutraliza TODO o resto do documento
  com um `<plaintext>` escrito no parse — se o assassino mora no nosso CSS, o
  viewer sobrevive mesmo assim. (O `window.stop()` foi testado e removido: ele
  impedia o `DOMContentLoaded`, e o `<plaintext>` sozinho basta.)
- **`/?safe=1`**: para na home, sem Phaser e sem as ~150 texturas (rodapé
  marca "MODO SEGURO"). Bisseção instantânea: safe abre e o normal morre =
  o assassino está do motor para baixo; nem o safe abre = HTML/CSS/boot, e o
  voo diz o marco exato.

**Roteiro para o aparelho que reproduz**: abrir o jogo normal e deixar morrer
(2-3×) → abrir `/?voo=1` e fotografar → abrir `/?safe=1` e dizer se a home
aparece. O último marco do voo interrompido aponta o assassino: parou em
`v0`/`v1` = CSS/fontes; `v4` = o Phaser (download/parse de 1,2 MB); `v5`/`v6`
= boot do módulo; `v7` = motor WebGL subindo.

---

### A correção (v1.9.7) — implementada em 28/08, aguardando release

Endurecer o `sw.js` nos quatro pontos, sem mudar a filosofia network-first:
fallback de navegação (`ignoreSearch` + `./index.html` como última carta),
install tolerante (`allSettled` — o cache é só fallback, parcial é melhor que
nenhum), pedir `storage.persist()` uma vez, e repensar o `no-cache` (mantê-lo
para HTML/JS e soltá-lo para arte, ou aceitar o cache HTTP como primeiro
fallback). Detalhe relevante: **mudar o `sw.js` é a única correção que um
cliente já quebrado talvez nem receba** — se o SW dele não atualiza, a saída é
o jogador limpar os dados uma vez (e recuperar o apelido pelo 🆘).


---


**28/08, implementada e provada em sonda funcional** (Playwright + SW real no
localhost): instalação tolerante com núcleo obrigatório (199/199 no cache),
`ignoreSearch` (o `/?stats` offline carregou), navegação sem cache do recurso
caindo no shell, e o cenário exato do sintoma — **offline com cache apagado —
servindo a página de socorro** ("Sem conexão com o jogo" + Tentar de novo) em
vez do erro do navegador. De carona, a arte virou cache-first com revalidação
em segundo plano — a dívida técnica nº 3 da radiografia (revalidar ~150 SVGs
por sessão era metade do preload lento). 8 text-asserts no `test-crash` (M1a,
M1b, M1c, M3a, M3b, SWR, network-first estrito de JS/HTML, M4) trancam cada
ponto. Bateria completa: 1.047 asserts, zero FAIL.

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
