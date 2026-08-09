# 🦏 FURIOUS RHINO

Um rinoceronte rabujento decide fugir do zoológico — investindo contra as paredes de forma contínua e em linha reta, enquanto os outros animais tentam (sem sucesso) ficar no caminho.

**▶️ Jogue agora: https://cs-ave.github.io/furious-rhino/**

Funciona no navegador do celular (paisagem) e no PC. Pode ser instalado como app (PWA) e jogado offline.

## Como jogar

| Ação | Celular | PC |
|---|---|---|
| **Pular** (segure para mais alto, encadeie no ar) | Toque na metade **esquerda** | Seta **←** |
| **Investida** (quebra paredes trincadas e arremessa animais) | Toque na metade **direita** | Seta **→** |

- Toda parede tem uma **seção trincada** em uma de 3 alturas — alinhe-se com ela pulando e **invista** para atravessar. Errar a altura é fatal.
- **Animais** do zoológico bloqueiam o caminho: investir neles os arremessa gritando; encostar sem investir é game over.
- **Espinhos** só se desviam pulando.
- A **fúria** (ícone de fogo) cresce com a distância: mais velocidade, mais obstáculos, música mais intensa.
- Chegue ao fim da distância para **escapar do zoológico**. Uma vida só. Seu recorde fica salvo.

## Tecnologia

- [Phaser 3](https://phaser.io/) via CDN — sem build, sem dependências instaladas
- **Arte 100% procedural**: personagens em SVG inline, cenário desenhado via Canvas — zero arquivos de imagem
- **Áudio 100% procedural**: efeitos e música generativa via Web Audio API — zero arquivos de som
- **PWA**: instalável, com service worker para jogar offline

## Backend (Firestore)

O jogo usa o Firebase Firestore (plano Spark, sem servidor próprio) com duas coleções:

| Coleção | Conteúdo | Leitura | Escrita |
|---|---|---|---|
| `scores/{playerId}` | Ranking mundial (nome + melhor score) | Pública | Só melhora o próprio score |
| `stats/{playerId}` | Telemetria anônima (tentativas, tempo, mortes por tier/causa, mecânicas por corrida, atividade diária, dispositivo, geo aproximada) | Pública (painel `/?stats`) | Totais monotônicos do próprio doc |
| `config/notify` | Parâmetros das notificações do administrador | Pública | **Nenhuma** — só o console do Firebase |

- As **Security Rules** estão versionadas em [`firestore.rules`](firestore.rules) e precisam ser publicadas **manualmente**: [console do Firebase](https://console.firebase.google.com/project/furious-rhino/firestore) → Firestore → Regras → colar → Publicar.
- **⚠️ Ordem de release**: publique as rules **ANTES** de fazer deploy de uma versão que dependa delas. As rules são retrocompatíveis com o cliente anterior; a ordem inversa faz o Firestore rejeitar os writes novos **em silêncio** (o jogo engole erros de rede por design).
- Os docs de `stats` podem ser inspecionados no console em Firestore → Dados → `stats`, ou de forma agregada no painel público **`/?stats`** do próprio jogo.
- Privacidade: os docs são chaveados por UUID aleatório do aparelho; **nenhum IP é armazenado** (a geolocalização aproximada país/região/cidade vem de uma consulta de IP feita no cliente e só o resultado é gravado).

## Notificações do administrador (ntfy)

Pushes no [ntfy](https://ntfy.sh) quando alguém começa a jogar, quando a sessão
encerra e quando o recorde mundial cai — mais um resumo diário por cron.

1. Escolha um tópico com sufixo aleatório longo (ex.: `rhino-a7f3c91b2e04`) e
   assine-o no app do ntfy. **Um tópico é público para quem souber o nome.**
2. Preencha `topic` em [`js/notify-config.js`](js/notify-config.js). Enquanto
   ele estiver **vazio, todo o sistema fica desligado** — quem clonar este
   repositório não passa a notificar ninguém.
3. Para o resumo diário, cadastre o secret `NTFY_TOPIC` no repositório
   (Settings → Secrets → Actions). O workflow é
   [`.github/workflows/daily-digest.yml`](.github/workflows/daily-digest.yml),
   testável pelo botão *Run workflow*.
4. Para mudar limiares sem deploy, crie o doc `config/notify` no console do
   Firebase — ele sobrepõe os defaults do arquivo, campo a campo.

Teste os três pushes de cliente sem precisar jogar: abra o jogo com
**`/?ntfy=test`**.

**Silenciar um aparelho:** abra o jogo com **`/?ntfy=off`** (e `/?ntfy=on` para
reativar). A marca fica gravada nesse navegador e vence qualquer configuração —
útil no seu próprio celular, para não receber push das suas partidas. As suítes
de e2e nascem silenciadas por este mesmo mecanismo: sem isso, cada execução
dispararia dezenas de "fulano começou a jogar".

## Rodando localmente

```bash
git clone https://github.com/Cs-Ave/furious-rhino.git
cd furious-rhino
python -m http.server 3000
# abra http://localhost:3000
```

Testes (os e2e exigem o servidor acima no ar):

```bash
npm run test-stats      # 69 asserts, sem navegador
npm run test-e2e-stats  # 66 asserts em Chromium
npm run test-ramp       # 30 asserts em Chromium
npm run digest          # monta o resumo diário SEM enviar
```

---

🤖 Desenvolvido em parceria com [Claude Code](https://claude.com/claude-code)
