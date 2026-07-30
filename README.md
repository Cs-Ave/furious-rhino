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
| `stats/{playerId}` | Telemetria anônima (tentativas, tempo, mortes por tier/causa, dispositivo, geo aproximada) | Pública (painel `/?stats`) | Totais monotônicos do próprio doc |

- As **Security Rules** estão versionadas em [`firestore.rules`](firestore.rules) e precisam ser publicadas **manualmente**: [console do Firebase](https://console.firebase.google.com/project/furious-rhino/firestore) → Firestore → Regras → colar → Publicar.
- **⚠️ Ordem de release**: publique as rules **ANTES** de fazer deploy de uma versão que dependa delas. As rules são retrocompatíveis com o cliente anterior; a ordem inversa faz o Firestore rejeitar os writes novos **em silêncio** (o jogo engole erros de rede por design).
- Os docs de `stats` podem ser inspecionados no console em Firestore → Dados → `stats`, ou de forma agregada no painel público **`/?stats`** do próprio jogo.
- Privacidade: os docs são chaveados por UUID aleatório do aparelho; **nenhum IP é armazenado** (a geolocalização aproximada país/região/cidade vem de uma consulta de IP feita no cliente e só o resultado é gravado).

## Rodando localmente

```bash
git clone https://github.com/Cs-Ave/furious-rhino.git
cd furious-rhino
python -m http.server 3000
# abra http://localhost:3000
```

---

🤖 Desenvolvido em parceria com [Claude Code](https://claude.com/claude-code)
