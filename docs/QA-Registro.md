# Furious Rhino — Q&A · Registro de dúvidas

> **Documento vivo.** Cada dúvida pontual do criador vira uma entrada datada, com a resposta em dois níveis: primeiro em linguagem simples, depois o detalhe técnico. As entradas mais novas ficam no topo do seu tema; nada aqui é apagado — se uma resposta mudar com uma versão nova, a entrada ganha uma correção datada.
>
> **Como usar:** ao tirar uma dúvida numa sessão de trabalho, peça "responda e registre no Q&A". Formato de cada entrada: **data · pergunta · resposta curta · como funciona por dentro**.

---

## 🗄️ Firestore — regras e console

### 22/08/2026 — O que eu faço com as "rules no console"? Passo a passo

**Resposta curta:** copiar o arquivo `firestore.rules` inteiro do projeto e colar no editor de Regras do console do Firebase, apertando **Publicar** — sempre **ANTES** do push da versão. É um copiar-e-colar de um arquivo só, e leva um minuto.

**Como funciona por dentro (o passo a passo):**

1. **Quando**: antes do push de qualquer versão que mudou o `firestore.rules` (regra 3 do CLAUDE.md). Pode ser feito a qualquer momento — as regras novas são sempre desenhadas para serem retrocompatíveis com a versão que está no ar, então publicar cedo nunca quebra produção.
2. **Copiar o arquivo**: na caixa de mensagem da sessão, digite `! cat firestore.rules | clip.exe` — o conteúdo inteiro vai para a área de transferência. (Ou abra `C:\Users\crist\MobileGame\firestore.rules` no editor e Ctrl+A / Ctrl+C.)
3. **Abrir o console** (link salvo no Anotacoes.txt): `https://console.firebase.google.com/project/furious-rhino/firestore/databases/-default-/security/rules` — login da conta dona do projeto.
4. **Substituir TUDO**: no editor de regras, Ctrl+A e colar por cima. ⚠️ O console guarda UM documento de regras só — nunca cole apenas o bloco novo, sempre o arquivo inteiro (o arquivo do repositório é a fonte da verdade e já contém tudo).
5. **Publicar**: botão "Publicar" no topo do editor. Vale em ~1 minuto. O console guarda o histórico de versões das regras — dá para voltar atrás por lá se precisar.
6. **Conferir**: o assistente consegue verificar de fora se a parte de LEITURA entrou no ar (uma consulta REST pública à coleção nova responde 200 em vez de 403). A parte de ESCRITA só se prova no smoke em produção — os testes locais não cobrem, porque o `e2e-stats` não escreve nas coleções novas.

**Por que essa ordem é inegociável:** o jogo engole erros de rede por design (telemetria/ranking são acessórios — regra 1). Se o código novo for ao ar antes das regras, cada escrita nova é **negada em silêncio**: nenhum erro na tela, nenhum aviso — só dado que não chega. Foi assim que nasceu a regra, e é por isso que o ritual de release começa pelas rules.

---

## 🎨 Skins e sprites

### 16/08/2026 — Por que o script das skins do pódio precisou ser rodado por MIM, com `!`, em vez de o assistente rodar?

**Resposta curta:** porque foi uma escrita de **administrador** no banco de dados — um poder que fica guardado na SUA máquina, na SUA conta. O assistente prepara o script, mas quem aperta o gatilho de admin é você.

**Como funciona por dentro:** as regras do Firestore bloqueiam de propósito qualquer escrita "fora do contrato" vinda do jogo (é o que impede um jogador malicioso de adulterar o placar). Para passar por cima delas — criar o doc `config/news`, preencher a vitrine do pódio — é preciso a credencial de administrador, que vive no login do `firebase-tools` desta máquina (o mesmo usado pelo `delete-player.mjs`). O ambiente do assistente tem um classificador de segurança que **bloqueia, corretamente, qualquer comando dele que leia credenciais** — então o fluxo combinado é: o assistente escreve o script no scratchpad e explica o que ele faz; você revisa e executa com `!` na caixa de mensagem (o `!` roda o comando no seu terminal e a saída aparece na conversa). O script nunca imprime tokens.

### 16/08/2026 — Criei um sprite novo na tela `/?setup`. Qual é o processo para ele chegar em PRODUÇÃO?

**Resposta curta:** o estúdio grava tudo **no seu computador** e roda a bateria de testes na hora — mas **nada vai ao ar sozinho**. Para publicar, é uma release normal do jogo: peça ao assistente "fechar release" (ou siga o ritual da referência técnica).

**Como funciona por dentro:** ao clicar "aplicar/registrar" no estúdio, o servidor local grava os SVGs em `art/`, reescreve o `js/systems/SkinRegistry.js` e o bloco gerenciado do `sw.js` — e **roda o `test-skins` como portão**: se qualquer assert reprovar, tudo é desfeito (rollback), então a árvore nunca fica quebrada. A partir daí a skin já funciona em `localhost`. O caminho até produção é o ritual de release (`docs/04-referencia-tecnica.md` §5): bump da versão nos 4 lugares → bateria completa das 9 suítes → commit → push (o GitHub Pages publica sozinho) → tag + GitHub Release → smoke em produção. Regras do banco **não** mudam por causa de skin nova.

### 16/08/2026 — A tela de setup fala em porta 3000, mas o `iniciar-gerador.bat` abre a 3210. Qual é o procedimento correto?

**Resposta curta:** são **dois servidores com papéis diferentes**, e o fluxo completo usa os dois: a porta **3000** serve o JOGO (e a página do estúdio); a **3210** é o MOTOR do gerador. Procedimento: suba os dois e trabalhe em `http://localhost:3000/?setup=0929`.

**Como funciona por dentro:**

| Porta | O que é | Como sobe |
|---|---|---|
| `:3000` | O jogo em si, servido estático (python) — inclui a página do estúdio `/?setup=0929` | `python -m http.server 3000` na pasta do projeto |
| `:3210` | O servidor do gerador (node) — quem fatia folhas, vetoriza, grava `art/`/registry/sw e roda o portão de testes | `npm run sprite-gen` ou o duplo-clique no `iniciar-gerador.bat` |

O `.bat` abre `http://localhost:3210/` porque essa é a **página avulsa antiga** do gerador (a primeira versão da ferramenta) — ela ainda funciona para converter folhas, mas o front oficial com o fluxo completo (desbloqueio, editar, esconder, remover) é o **`/?setup` dentro do jogo**, na 3000. A página do estúdio detecta sozinha quando o `:3210` está no ar (bolinha verde "executando"). Detalhe extra: o `/?setup` do **site publicado** também funciona — desde que aberto no seu PC com o `:3210` rodando (o servidor manda o header de Private Network Access que o Chrome exige).

> **→ Atualizado em 22/08/2026 (v1.8.8): virou um servidor só.** Veja a entrada seguinte.

### 22/08/2026 — Ainda preciso subir dois servidores (3000 e 3210)?

**Resposta curta:** **não.** Um duplo-clique no **`iniciar-estudio.bat`** (na RAIZ da pasta do jogo) sobe tudo e já abre o estúdio no endereço certo (`http://localhost:3000/?setup=0929`).

**Como funciona por dentro:** desde a v1.8.8 o servidor do gerador (`npm run sprite-gen`) é **unificado**: além da API na `:3210`, ele serve o JOGO inteiro dos arquivos da raiz e escuta **também na `:3000`**. Se a `:3000` já estiver ocupada (ex.: você subiu o `python -m http.server 3000` à moda antiga), ele avisa no console e segue só na `:3210` — o python continua servindo o jogo e nada quebra: os dois modos são suportados. O card **"Servidores locais"** no topo do `/?setup` mostra as duas linhas (o jogo — quem serve a página — e o gerador) e ganhou o botão **⏻ Parar servidor** (com aviso: se quem serve a página é o unificado, parar derruba tudo). A página avulsa antiga do gerador foi aposentada (o histórico está no git). ⚠️ Uma regra continua valendo: **jogue e teste sempre pela `:3000`** — `localStorage`, medalhas e o service worker são por ORIGEM, e jogar em `localhost:3210` criaria uma segunda identidade do zero.

---

## 📣 News — os cards do Diário da Fuga (home)

### 16/08/2026 — Onde atualizo os textos das notícias? Qual a lógica? Precisa de deploy?

**Resposta curta:** no **console do Firebase**, sem deploy nenhum — o texto muda para todos os jogadores em até 1 hora. Caminho: Firestore Database → coleção `config` → documento `news` → campo `items`.

**Como funciona por dentro:**

- **Onde:** `config/news` é um doc com um campo `items`, do tipo **array**, com valores **string** — cada string vira um card do Diário. Editar/adicionar/remover strings no console é tudo o que existe de "CMS". As rules permitem leitura pública e escrita **só** pelo console (`allow write: if false` para clientes).
- **Lógica de exibição:** o Diário mostra até 3 cards. O **primeiro item do `items` sempre aparece** (é o seu megafone — novidades de versão, avisos). As demais vagas são preenchidas pelos **eventos locais do jogador** (skin desbloqueada, entrou no pódio, perdeu o pódio, recorde novo — cada um aparece uma única vez, para sempre) e, sobrando vaga, pelos outros itens do `items`.
- **Prazo de propagação:** cada navegador guarda o doc por **1 hora** (cache — é o que mantém o custo em 1 leitura/hora/jogador no plano gratuito). Sem internet, vale o último texto conhecido; sem o doc, o Diário mostra só os eventos locais. Nada disso derruba o jogo.
- **Deploy?** Nunca, para textos. Deploy só quando mudar o CÓDIGO do Diário (`js/systems/NewsSystem.js`).

---

## 🔧 A página `/?setup` (estúdio de skins)

### 16/08/2026 — Ela "só existe local"? Quais as principais funcionalidades e riscos? Por que não é pública?

**Resposta curta:** a página em si até existe no site publicado — mas ela é um **controle remoto sem aparelho** fora do seu PC: o motor que faz tudo (o servidor `:3210`) só roda na sua máquina. É essa a proteção de verdade, e é por isso que ela não é (nem precisa ser) "pública".

**Funcionalidades principais:**

1. **Criar skin de ponta a ponta sem programar**: soltar a folha de desenhos (IA), escolher os 3 quadros do galope, ajustar a paleta, ver a prévia animada, dar nome/descrição e configurar o desbloqueio (grátis · pódio exato · façanha numa corrida · totais de vida — o texto do cadeado é gerado sozinho da regra). Folha de fúria própria opcional.
2. **Gerenciar o elenco**: ✏️ editar (nome/descrição/regra), ✅/🚫 tirar do ar e pôr de volta (reversível, ninguém perde conquista), 🗑 remover de vez — tudo menos a Furious Rhino original, que é o "plano B" universal.
3. **Rede de segurança embutida**: toda gravação roda a bateria de testes das skins e **desfaz tudo se algo reprovar** — o jogo nunca fica quebrado no meio de uma edição.

**Riscos que valem lembrar:**

- **Remover uma skin ORIGINAL apaga a arte de `art/` sem cópia no gerador** — a página avisa com uma confirmação extra; a única volta é pelo histórico do git. Para "tirar do ar" o caminho seguro é sempre o 🚫 (reversível).
- **Editar skins durante uma sessão de desenvolvimento do assistente** muda o chão sob os pés dele (já aconteceu duas vezes — inclusive derrubando testes no meio de uma release). Não é proibido; só avise quando fizer.
- O servidor local **grava na árvore do repositório** — o que você fizer no estúdio vira mudança pendente de commit, e entra na próxima release.

**Por que não pública:** o poder de escrita é do servidor `:3210`, que roda apenas no seu PC — um visitante que abra `/?setup` no site vê a página trancada pela chave e, mesmo com a chave, não tem motor para operar (o navegador dele não alcança um servidor na SUA máquina). A chave numérica é só para afastar curiosos — a segurança real é o motor não existir fora daqui. Publicar o estúdio de verdade exigiria um backend com autenticação, o que o projeto evita por decisão (zero servidor próprio, plano gratuito).

---

## 🛡️ Bosses — os guardiões da estrada

### 23/08/2026 — Quantos bosses temos, quando aparecem, quais os poderes de cada um e como passar? Quais estão no jogo e quais estão fora?

**Resposta curta:** **cinco lutas, TODAS vivas no jogo desde a v1.8.10** — Caçador do Portão (1000 m), a Muralha (2000 m), a Barreira da Escavação (3650 m), o Faraó de Bronze (4700 m) e o Caçador-Mor (9995 m). **Nenhum boss está fora do jogo hoje**: o único que passou um período "na geladeira" foi o Cerco (declarado sem luta da v1.8.5 à v1.8.9), e ele voltou na v1.8.10 retematizado como a Barreira da Escavação.

**Como funciona por dentro — a gramática comum às cinco lutas:** todo boss é uma barricada em camadas com um atirador no topo. Vencer = **investir na camada cuja fresta BRILHA**, uma por vez; errar o alinhamento não mata — o rino ricocheteia (quique de ~600 px com o controle de volta). O perigo é o atirador: todo tiro tem **aviso prévio** (mira laser, holofote ou feixe de ~0,32–0,45 s) e a cadência acelera a cada camada quebrada. **A Fúria Total é bloqueada dentro de toda arena** (a carga continua enchendo e libera na vitória) — decisão orientada por dados da v1.8. Nenhum portão tem corpo físico (banda de contato + clamp posicional — a regra anti-soft-lock da casa), a arena não tem spawns, e cada camada quebrada vale **+25 pts** no ranking. Filosofia declarada no design: *"justo, telegrafado, nunca um muro de morte"*.

| # | Boss | Onde | Camadas (ordem) | Poderes | Como passar | Vitória |
|---|---|---|---|---|---|---|
| 1 | **Caçador do Portão** (zoo) | 1000 m | 3: chão → meio → alto | Rifle tranquilizante: tiro reto mirado, **morteiro** em arco na zona do quique e rajada de até 3 (cadência 1500→950 ms) | A ordem é fixa e sobe: a última camada exige **pulo duplo + investida NO AR** — a técnica-clímax do jogo. Entre tiros, alinhe e invista | A fuga do zoológico (+100 da fuga; 3 camadas em ≤20 s = blitz +50) |
| 2 | **A Muralha** (cidade) | 2000 m | 4: **ALTO** → chão → meio → alto | **Granada-de-luz** (morteiro cujo aviso é o próprio holofote varrendo até onde ela cai), rajadas, leque na última camada e o **K9 rasante** rente ao chão (anti-camping); enrage suave aos 45 s | Leia a LUZ, não decore ordem: ela abre pelo alto (tudo que a Zona de Contenção ensinou). Quando o holofote varrer, saia da zona; quando o cão vier, pule | A barricada desaba, a **Brecha** amanhece (+150 pts, medalha "Queda da Muralha") — a corrida continua |
| 3 | **A Barreira da Escavação** (o Cerco, deserto) | 3650 m | 4: **MEIO** → chão → alto → meio | **Canhão de redes**: leque de tiros e **rasante** anti-camping desde a 1ª camada; o morteiro só entra na última, como estocada final; enrage aos 45 s | O leque pune quem fica parado no meio da arena — movimente-se entre as janelas de tiro e leia o glow (a ordem não é "de baixo para cima" de propósito) | Miniboss do meio do deserto (+150 pts, letra própria `u` na telemetria, causa própria `cerco`; a medalha **"Fura-Bloqueio" acordou apontando para cá**) |
| 4 | **O Faraó de Bronze** (deserto) | 4700 m | **5**: meio → alto → chão → meio → alto | O exame mais agressivo POR CADÊNCIA (1200→**700 ms**, a mais curta do jogo): rajadas triplas, leque, o **Espelho de Rá** (o feixe de luz que varre até onde o tiro em arco vai cair) e o **Mergulho de Hórus** (projétil-falcão rasante); **enrage aos 30 s** — metade dos outros | Quem chegou aos 4700 m já sabe ler telegraph; aqui a régua é EXECUTAR RÁPIDO: 5 camadas antes de o relógio apertar a cadência. Sem morteiro clássico — o feixe É o tiro em arco | Derruba a muralha de arenito e abre o **deserto profundo** (medalha "Quebra-Faraó", causa própria `farao`) |
| 5 | **O Caçador-Mor** (fim do mundo) | 9995 m | 5 em **palíndromo**: chão → meio → alto → meio → chão | O remix dos arsenais: morteiro desde cedo, leque no meio, rajadas triplas — e o **rasante só na última camada**, cobrando de surpresa a lição de pular o padrão; **sem enrage** (5 camadas já são a prova) | O vaivém do palíndromo obriga a reler o glow a cada quebra; guarde o reflexo de pulo para o rasante final | **Vencer É virar LENDA** (10.000 m): dispara a cutscene, +400 do `legend`, medalha "Lenda do Mundo" |

**Detalhes que valem saber:**
- **Dica na tela só nos 2 primeiros encontros** de cada boss na vida do jogador; o glow pulsante na fresta é permanente (é a mira, não uma dica).
- **Cada luta tem telemetria própria** (camadas quebradas e tempo de luta por corrida) e **causa de morte própria** no funil: `boss`, `boss2` (a Muralha herdou a série histórica dos 2000 m), `cerco`, `farao`, `boss3` — dá para ver no painel `/?stats` onde cada um está matando.
- **Tudo é calibrável ao vivo** no painel `/?debug=1` (pasta "Bosses": cadências camada a camada, enrage, bloqueio da fúria, e o botão "Pular p/ 50 m antes" de cada arena).
- **Histórico dos "fora do jogo"**: o Cerco ficou **declarado sem luta** da v1.8.5 à v1.8.9 (as tabelas existiam, o slot dos 2000 m foi dado à Muralha na v1.8.7) e a arte do Capturador (`boss2-hunter`) chegou a aparecer como "órfã" no catálogo da aba Sprites — a v1.8.10 religou os dois na Barreira da Escavação. Hoje **não há nenhum boss desenhado e desligado**; o próximo espaço em aberto é o deserto profundo (4700–9995 m), que segue sem chefe intermediário por decisão (só com dado que justifique — regra registrada no banco de ideias).

---

### 25/08/2026 — ⚠️ Correção da resposta acima: no dia em que ela foi escrita, os cinco chefes estavam sendo atravessados sem luta

**A resposta de 23/08 diz "cinco lutas, TODAS vivas no jogo" e "nenhum boss está
fora do jogo hoje". A tabela de poderes está correta — o veredito não estava.**
Naquele momento os cinco existiam no código, tinham arte, telemetria e tabela de
tiro, e **nenhum deles precisava ser vencido para seguir em frente**.

**O que estava acontecendo.** Um gatilho antigo declarava a fuga pela **posição**
do rinoceronte na linha dos 1000 m. Ele deveria valer só no modo de teste, mas
rodava na partida normal — e a janela entre a face do portão e essa linha é de
120 px, que um único quadro travado de 85 ms atravessa. Feita a fuga sem luta,
cada chefe seguinte olhava a própria âncora, via o rino já do outro lado e se
rendia. Em cascata, até o fim do mundo.

**Desde quando.** Da **v1.8.5** (21/08) à **v1.9.3**. A última camada quebrada
por um jogador na base inteira foi em **22/08 16:14, v1.8.3**. Corrigido na
**v1.9.4**.

**A consequência que muda a resposta de verdade:** a Muralha, a Barreira da
Escavação, o Faraó de Bronze e o Caçador-Mor chegaram **dentro** dessa janela —
entre a v1.8.5 e a v1.8.10. Ou seja, **nunca estiveram de pé**. Ninguém jamais
derrotou nenhum dos quatro. A v1.9.4 é a primeira versão em que os cinco
existem de verdade, e o jogo ficou sensivelmente mais difícil **sem que nada
neles tenha mudado**. Se alguém disser que "ficou muito mais difícil de
repente", não é impressão nem regressão: é o jogo funcionando pela primeira vez.

**A lição de método, que vale além dos chefes.** A resposta de 23/08 foi
levantada lendo o **código** — as cinco `def` estavam lá, completas e corretas.
O que faltou foi perguntar aos **dados** se alguém realmente lutava: bastava
uma consulta de "quantas camadas foram quebradas por versão" para o zero
aparecer. Desde então isso virou detector permanente (`D3-vitoria-sem-chefe` e
`D5-arena-sem-quebra` no `npm run investiga`), justamente para que a pergunta
seja feita sozinha a cada coleta. **Código presente não é funcionalidade viva.**

---


## 🪪 Identidade — quem é o jogador para o jogo

### 23/08/2026 — Reinstalei o PWA no celular, o apelido "Teco" não voltou e, ao tentar registrá-lo de novo, o jogo disse que "já está em uso". O que aconteceu? Como recuperar?

**O que aconteceu (e sim, é o comportamento esperado da arquitetura):** o jogo não tem login — a identidade é um **UUID aleatório criado no primeiro acesso e guardado só no `localStorage` do aparelho** (`StorageManager.getOrCreatePlayerId`). Desinstalar o PWA apaga esse armazenamento (no iOS sempre — o storage do app de tela inicial é particionado do Safari; no Android normalmente só com "limpar dados", porque o WebAPK compartilha o storage com o Chrome). No reinstall, o jogo criou **outro** UUID em silêncio, e com ele zeraram apelido, recorde, medalhas, skins e histórico locais. O detalhe cruel: a checagem de apelido (`checkName`) compara com a coleção `scores/` inteira **excluindo "o meu doc" pelo id** — com o id novo, o doc antigo do próprio Teco virou "de outra pessoa" e passou a **bloquear o dono do nome**. O doc órfão (1.907 pts / 1.533 m) continua no ranking para sempre: as rules negam delete a todo cliente e a unicidade de apelido é só do cliente (as rules não a impõem).

**A recuperação (v1.9.0 — "reassignment" mediado pelo administrador):**
1. No aparelho, o jogador tenta o apelido, recebe o erro e toca **"🆘 Este apelido era meu (reinstalei o app)"** — isso envia um push ntfy para você com o **id novo** + assinatura do aparelho/local, e arma o aparelho para consultar a ordem de migração (1 read/h, só de quem pediu).
2. Você abre **`/?setup=0929` › aba 🆘 Recuperação** (com o estúdio no ar — `iniciar-estudio.bat`): digite o apelido e o id novo do push, **Conferir** (a aba mostra o doc antigo e a comparação de aparelho/local dos dois lados — o antifraude é você) e **Autorizar**. O servidor local grava o par `{idNovo: idAntigo}` no doc `config/reassign` com a credencial do seu `npx firebase-tools login` (clientes só leem esse doc — `write: if false`).
3. O jogo do jogador, no próximo boot (ou em até 1h), encontra o próprio id no mapa, **adota o id antigo** e restaura tudo localmente dos docs públicos: apelido, marca do ranking (com o "há Xd" intacto), recorde, totais **somados** (a monotonia das rules exige ≥ servidor — copiar em vez de somar congelaria a telemetria em silêncio), corridas, histórico. As skins de conquista voltam sozinhas (retro-scan de `runs[]`); **as medalhas só parcialmente** — não existe registro delas no servidor, então o jogo re-infere o que a janela de 50 corridas prova e o resto se reconquista jogando.
4. Chega o push "✅ Identidade restaurada" → volte à aba e clique **Concluído**: o par sai do mapa e os docs órfãos do id provisório são apagados.

**Fallbacks** (se o 🆘 não puder ser usado): restauração manual semeando o `localStorage` via console remoto (Android + USB, `chrome://inspect` — mesma mecânica que a feature automatiza), ou o corte final `node tools/delete-player.mjs Teco --yes`, que **liberta o nome apagando a marca e o histórico para sempre** (só com sua decisão explícita).

⚠️ Regra de teste: os endpoints de reassign escrevem em produção — em teste, só pares e docs de sonda `claude-*`, nunca um par real.
