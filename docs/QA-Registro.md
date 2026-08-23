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
