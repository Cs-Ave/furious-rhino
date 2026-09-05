# Revisão geral — 05/09/2026

> O dossiê completo da sessão de revisão que o dono pediu: *"propor uma revisão
> geral do game, sugerindo o que podemos melhorar em termos de jogabilidade,
> design e atratividade, utilizando dados coletados dos jogadores, os feedbacks
> abaixo e benchmark de outros games similares"*.
>
> Aqui fica o **material bruto**. As decisões que saíram dele estão em
> `docs/IDEIAS-FUTURAS.md` §N (com N.1 legibilidade, N.2 chefes, N.3 banco com
> gatilho, N.4 vetados) e a fila de releases, em `HANDOFF.md` §5. Este
> diretório existe porque a análise custa caro para refazer e as decisões
> futuras vão precisar consultá-la — não porque tudo aqui virou plano.

## Os três feedbacks que motivaram

1. *"Contraste da fase da cidade não está bom, cenário está confundindo com os inimigos, dificultando os avanços."*
2. *"Boss fight todos muito parecidos, sempre sendo o chefe da muralha."*
3. *"Mensagens de pop up que aparecem na tela do celular estão maiores que a tela, tendo que rolar para achar os botões (ex.: game over no iPhone 17 Pro). E no pódio mundial, ver top 10, o nome do usuário ficou desalinhado com os pontos."*

## O diagnóstico que reordenou tudo

A retenção **melhorou** (57% de um-dia-só contra 69% na baseline de 16/08; 43%
voltam a um 2º dia; D7 de 20-29% nas coortes, contra ~4% de referência do
gênero). O que colapsou foi a **entrada**: 1 jogador novo na última semana
cheia, 44 execuções em 7 dias contra 235 nos 7 anteriores, 12 aparelhos ativos.

E os feedbacks têm audiências muito diferentes: a cidade é vista por **18 de 75**
aparelhos, dois chefes ou mais por **≤5** — enquanto a tela de fim de corrida é
atravessada por **toda** corrida, com **48 dos 75** aparelhos em tela curta o
bastante para o botão sair do viewport.

Daí a ordem: **medir e caber → trazer gente → embelezar**.

## O que virou release

| Release | Quando | O quê |
|---|---|---|
| **v1.12.1 "Régua"** ✅ | 05/09 | fim de corrida / top 10 / modais em tela curta; instrumento com corte por `v`; letras `rs`/`rt` e `history.src` |
| **v1.12.2 "Desafio"** | 12→19/09 | ideia G (link de desafio), estaca do amigo, reengajamento local |
| **v1.12.3 "Farol"** | 19/09→03/10 | passe de legibilidade da cidade + pacote P dos chefes |
| **v1.13 "Jornada"** | out/1ª q. | programa Zoo parte 3 (trocou de ordem com Mata e Água) |
| **v1.14 "Mata e Água"** | out/2ª q. | programa Zoo parte 2 — toca spawn, por isso vai depois |

## O que tem aqui dentro

| Arquivo | O quê |
|---|---|
| `benchmark.md` | A pesquisa externa (chefes, legibilidade, UI mobile em paisagem, retenção, concorrentes web) com as fontes. **É o material menos reproduzível deste diretório.** |
| `radiografia-2026-09-05.md` | A radiografia do dia, como saiu do `npm run radiografia`. O JSON cru fica em `tools/snapshots/` (fora do git, como os do `investiga`); os números-chave estão congelados no código em `RadiografiaCore.BASELINE_20260905`. |
| `leitura-feedbacks.md` | Os 3 feedbacks rastreados até a causa no código (cores dos SVGs × paleta do fundo tintado, tabela de parâmetros dos 5 chefes, CSS/altura de cada overlay). |
| `leitura-dados.md` | O que os instrumentos mediam e o que eram cegos para medir. |
| `leitura-docs.md` | O que o design já tinha decidido e registrado — para a revisão não reinventar o aprovado. |
| `painel-dados.md` | Analista de dados: diagnóstico, priorização por evidência, o que medir e o alerta de calendário. |
| `painel-arte.md` | Direção de arte: a régua de valor, a regra do "rim da cidade", a tabela hex por espécie e o critério numérico de aceite. |
| `painel-boss.md` | Design de chefes: 5 chefes ↔ 5 verbos, o Portão como clímax sem virar muro, o que a Muralha pode mudar agora. |
| `painel-ux.md` | UX mobile: wireframes, CSS, auditoria de todos os overlays, checklist de teste. **Boa parte já foi implementada na v1.12.1.** |
| `painel-retencao.md` | Retenção e aquisição: por que os seis sistemas de "volta amanhã" não seguram, e as alavancas ranqueadas. |
| `painel-auditoria.md` | O cético: conflitos entre os painelistas e a decisão de cada um, calendário, orçamento, riscos técnicos, vetos e o top-12. **É o documento que virou o plano.** |

## Como ler sem se perder

Se você tem 5 minutos: `painel-auditoria.md` §1 (conflitos e decisões) e §6
(top-12). Se vai executar o **Farol**: `painel-arte.md` §2 (a tabela de cores
por espécie) e `painel-boss.md` §3. Se vai executar o **Desafio**:
`painel-retencao.md` §2.1. Se vai reabrir uma decisão: `painel-auditoria.md`
§5 (vetos) diz o motivo de cada corte — várias ideias boas foram cortadas por
audiência ou calendário, não por mérito.

## Ressalva honesta

Os pareceres do painel são **análise, não verdade** — foram produzidos por
agentes a partir do dossiê de fatos verificados em código, e o cético
contradiz vários deles de propósito. Onde um parecer e o `painel-auditoria.md`
divergem, **vale a auditoria**: foi ela que passou pelo crivo do calendário de
medição, do orçamento das rules e da capacidade de um dev só. E onde a
auditoria e o dono divergirem, vale o dono — três decisões de 05/09 (programa
inteiro, ordem invertida, chefes por gatilho) foram dele.
