# 🦏 FURIOUS RHINO

##<teste de update>

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

## Rodando localmente

```bash
git clone https://github.com/Cs-Ave/furious-rhino.git
cd furious-rhino
python -m http.server 3000
# abra http://localhost:3000
```

---

🤖 Desenvolvido em parceria com [Claude Code](https://claude.com/claude-code)
