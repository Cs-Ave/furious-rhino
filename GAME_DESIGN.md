# Mobile Game - Rinoceronte Rabujento - Documento de Design

## 🎮 HISTÓRIA & CONCEITO

**História Principal:**
Um rinoceronte rabujento decide fugir do zoológico, investindo contra as paredes de forma contínua e em linha reta. Seu caminho é caótico — diferentes animais vão passando pela tela enquanto ele destroça tudo em seu caminho na busca pela liberdade.

**Gênero:** Plataforma Auto-Runner de Ação  
**Público:** Casual, rápido (5-15 minutos por sessão)  
**Plataforma:** Web Mobile (navegador, paisagem)  
**Tom:** Caótico, divertido, "fuga selvagem"

---

## 🦏 PERSONAGEM PRINCIPAL

**O Rinoceronte Rabujento:**
- Investe (carga) continuamente para frente — é seu jeito de se mover
- Pula para desviar de obstáculos altos ou alcançar plataformas
- Conforme a raiva aumenta, sua aparência muda (mais vermelho, fumaça nas narinas, olhos revoltados)
- A velocidade aumenta conforme a raiva cresce
- Cada parede quebrada o deixa mais furioso

---

## 🎮 MECÂNICAS DE JOGO

### **MECÂNICA 1: PULO (TOQUE ESQUERDA DA TELA)**
- **Máximo de 2 pulos** antes de voltar ao chão
- **Segure o toque:** pulo vai mais alto (força máxima até ~2 segundos)
- **Libere rápido:** pulo curto (pouca altura)
- Funciona no chão E no ar (pulo duplo)
- Resseta o contador de pulos ao tocar o chão

### **MECÂNICA 2: INVESTIDA/CARGA (TOQUE DIREITA DA TELA)**
- *[A SER DEFINIDO]*
- Quebra paredes quebráveis ao colidir
- Parede normal NÃO pode ser quebrada (obstáculo intransponível)

---

## 🧱 OBSTÁCULOS & INIMIGOS

**Tipo 1 - Parede Normal do Zoológico**
- Bloqueia a tela inteira verticalmente
- Força o jogador a pular por cima (não pode ser quebrada)
- Visual: alvenaria clássica de zoológico
- Colisão = morte

**Tipo 2 - Parede Quebrável (Madeira Fraca)**
- Quebra ao colidir com a investida do rinoceronte
- Deixa espaço aberto após quebrar
- Visual: madeira velha com textura trincada (cor diferente, marrom/avermelhado)
- Feedback ao quebrar: partículas, shake de câmera, som satisfatório

**Tipo 3 - Espinhos/Cerca de Arame**
- Obstáculo que causa game over ao tocar
- Visual: arame farpado ou picos agressivos
- Pode estar em piso ou suspenso

**Tipo 4 - Animais do Zoológico (Decoração Viva)**
- Leão, zebra, macaco, elefante, pássaros, etc. passam pela tela
- São apenas cenário (não interagem com o jogador)
- Adicionam vida visual ao caos da fuga
- Aparecem aleatoriamente no fundo/paralax

---

## 📊 SISTEMA DE DIFICULDADE & PROGRESSÃO

**Raiva do Rinoceronte:**
- Aumenta conforme a distância percorrida
- Aumenta ainda mais cada vez que quebra uma parede
- Afeta: velocidade, visual (cor/fumaça), intensidade sonora

**Aumento de Dificuldade:**
- Velocidade cresce gradualmente
- Obstáculos aparecem mais próximos um do outro
- Espaços para passar ficam mais apertados
- Padrão de obstáculos muda conforme a raiva

**Padrão de Geração:**
- Aleatório — paredes aparecem em sequência imprevisível
- Sempre deixa espaço mínimo para passar (não é impossível)
- Quanto mais rápido, mais difícil calcular onde pular/investir

---

## 📍 PONTUAÇÃO & META

**Sistema de Pontos:**
- Baseado em **distância percorrida** (1 metro = 1 ponto)
- Recorde salvo no **localStorage** do dispositivo
- Exibe em tempo real: pontuação atual + recorde pessoal

**Meta:**
- *[A SER DEFINIDO]* — Existe um destino final (liberdade/fim do zoológico)? Ou é infinito?

---

## 🎨 FEEDBACK AO JOGADOR

**Visual:**
- Rinoceronte fica mais **vermelho/furioso** conforme a raiva sobe
- **Fumaça nas narinas** quando muito raivoso
- Olhos revoltados/vermelhos
- Partículas satisfatórias ao quebrar parede (lascas de madeira)
- Shake de câmera ao quebrar (para impacto)
- Animais passam pela tela (paralax opcional)

**Audio:**
- Som de pulo (simples, curto)
- Som de investida (grunhido/berro)
- Som de parede quebrando (craque satisfatório)
- Fundo sonoro crescente conforme raiva aumenta

**HUD (Interface):**
- Pontuação atual: topo esquerda
- Recorde pessoal: topo esquerda (em cor diferente)
- Guias de toque embaixo da tela:
  - Esquerda: "← PULO"
  - Direita: "INVESTIDA →"
- Tela de Game Over: mostra pontuação final, recorde, botão "Jogar Novamente"

---

## 🎨 ESTILO VISUAL & TÉCNICO

**Framework:** Phaser 3 (via CDN)  
**Orientação:** Paisagem (horizontal)  
**Responsividade:** Funciona em qualquer tamanho de tela  
**Física:** Phaser Physics (gravidade, colisão)  
**Paleta de Cores:** Tons de verde/marrom (natureza) + vermelho crescente conforme raiva

**Estilo de Arte:** *[A SER DEFINIDO]*
- Pixel art?
- Cartoon simples?
- Realista minimalista?

---

## ❓ PERGUNTAS COMPLEMENTARES A RESPONDER

### **1. Sobre a Investida/Carga:**
- A investida é **automática** (rinoceronte já investe sempre) ou requer **toque para controlar**?
- A investida tem **cooldown** (delay entre usos) ou pode ser usada sempre?
- A investida pode ser usada **no ar** (enquanto pula) ou apenas no chão?

### **2. Sobre Pulo + Investida:**
- Pode pular **enquanto investe**? A carga interrompe o pulo ou eles funcionam juntos?
- Se cair durante o pulo, a investida reinicia?

### **3. Sobre os Animais do Fundo:**
- São apenas **decoração visual** ou afetam a jogabilidade?
- Passam em qual velocidade? (acompanham o personagem ou têm velocidade própria?)
- Qual é a quantidade/frequência de animais?

### **4. Sobre Paredes Quebráveis:**
- Quebram **completamente** ou deixam **detritos/rastros**?
- Uma vez quebrada, aquela parede reaparece depois ou é única?

### **5. Sobre Raiva Visual:**
- Rinoceronte muda de cor gradualmente (verde → amarelo → vermelho)?
- Quando atinge raiva máxima, há um visual especial ou limite?

### **6. Sobre a Meta do Jogo:**
- Existe um **destino/fim** (ex: sair do zoológico)?
- Ou é **infinito** (quanto mais longe, mais difícil)?
- Qual a diferença na progressão?

### **7. Sobre Estilo Artístico:**
- Qual estilo visual? (pixel art, cartoon, realista minimalista?)
- Isso afeta a complexidade visual do rinoceronte e ambiente

### **8. Sobre Vidas:**
- Uma colisão = Game Over?
- Ou rinoceronte tem múltiplas vidas?

### **9. Sobre Obstáculos Especiais:**
- Existem **power-ups** (escudo, velocidade, inversão)?
- Ou a jogabilidade é **pura** (só pulo + investida)?

### **10. Sobre o Zoológico:**
- O fundo muda visualmente conforme o rinoceronte progride? (saindo do zoológico progressivamente)
- Ou mantém sempre a mesma estética?

---

## 📋 RESUMO DO ENTENDIMENTO ATUAL

✅ **Definido:**
- Protagonista: Rinoceronte rabujento fugindo
- Mecânica 1: Pulo com pulo duplo (toque esquerda)
- Mecânica 2: Investida (toque direita) — detalhes a definir
- 4 tipos de obstáculos (muro normal, madeira quebrável, espinhos, animais)
- Sistema de raiva crescente
- Pontuação por distância
- Recorde salvo localmente
- Feedback: visual, audio, shake

❓ **A Definir:**
- Funcionamento exato da investida (automática ou manual, com cooldown?)
- Meta final (infinito ou tem fim)
- Estilo artístico
- Mecânicas adicionais (power-ups, múltiplas vidas)
- Padrão visual do zoológico

---

Aguardando suas respostas! 🎮
