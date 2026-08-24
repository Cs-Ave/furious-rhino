# FURIOUS RHINO — contexto do projeto

Auto-runner de ação para web mobile (paisagem): um rinoceronte foge do zoológico investindo contra tudo. Phaser 3.85.2 via CDN, **zero build**, **zero asset binário** (arte SVG/procedural, áudio sintetizado em Web Audio), PWA com jogo offline. Backend = Firebase Firestore (plano gratuito) só para ranking (`scores/`) e telemetria (`stats/`); hospedado no GitHub Pages: https://cs-ave.github.io/furious-rhino/

## Onde ler o quê

| Preciso de... | Arquivo |
|---|---|
| Design do jogo e o porquê de cada decisão (várias orientadas por dados) | `GAME_DESIGN.md` |
| Estado da última release + tabelas completas de parâmetros operacionais | `HANDOFF.md` |
| Documentação completa (leigo → técnico) e histórico de versões | `docs/` |
| Dúvidas pontuais do dono já respondidas (documento vivo — registrar novas ali) | `docs/QA-Registro.md` |
| Ideias ainda não implementadas + a radiografia dos dados dos jogadores (banco vivo, sem versão prometida) | `docs/IDEIAS-FUTURAS.md` |
| Problemas EM ABERTO: hipóteses vivas, as já descartadas e os detectores (documento vivo) | `docs/INVESTIGACOES.md` |
| Todo o tuning numérico | `js/utils/Constants.js` |

## Regras que não se negociam

1. **Telemetria e ranking são acessórios** — erro de rede/rules jamais derruba o jogo (`safeTelemetry`).
2. **Nenhum campo novo de primeiro nível em `stats`** no Firestore — o orçamento das rules estoura (19 passavam, 20 falhavam) e os writes são negados em silêncio. Campo novo entra nos mapas existentes ou nos elementos de `runs[]`.
3. **Ordem de release:** publicar `firestore.rules` no console ANTES do deploy do código.
4. **A versão vive em 4 lugares** que têm de bater: `js/utils/Constants.js` (`VERSION`), `index.html` (`#game-version`), `package.json`, `sw.js` (`CACHE`). Todo `.js` novo entra em `ASSETS` do `sw.js` + bump do `CACHE`.
5. **Ambiente local (localhost/127.0.0.1/IP de rede local) não grava no Firestore por padrão** (`StorageManager.allowsRemoteWrite`) — só quando o teste semeia explicitamente `furious_rhino_allow_local_write = '1'` no `localStorage`, ANTES da página carregar. Testes Playwright que precisam validar a escrita real (ex.: `e2e-stats.mjs`) usam esse opt-in + `player_id` de sonda `claude-*`; os que não precisam (`e2e-boss.mjs`, `e2e-ramp.mjs`, `e2e-special.mjs`) simplesmente não gravam nada. Sempre com `furious_rhino_notify_off = '1'` também — já houve produção suja e celular do dono inundado.
6. **Rampas são terreno, não corpo de física** (Arcade não tem superfície inclinada — corpo estático causa soft-lock). Ver `js/entities/Ramp.js` + `GameScene.updateTerrain()`.
7. **Nunca rodar `npm run export-art -- --force`** — sobrescreve a arte retocada à mão.
8. Mais armadilhas (WebGL, SVG, `setDoc` sem merge...): `docs/04-referencia-tecnica.md` §13.

## Comandos

```bash
python -m http.server 3000   # servir o jogo (os e2e dependem da :3000)
npm run sprite-gen           # OU: servidor unificado — jogo na :3000 + gerador na :3210 (cede a 3000 ao python com aviso)
npm run test-stats           # 69 asserts, sem navegador
npm run test-ramp            # 30 asserts e2e (Chromium)
npm run test-e2e-stats       # 69 asserts e2e (Chromium, escreve com sonda claude-*)
npm run digest               # resumo diário sem enviar
npm run radiografia          # análise de usabilidade completa (leitura pública, zero writes) — markdown p/ IDEIAS-FUTURAS
npm run investiga            # varre a base com os detectores e compara com a coleta anterior
npm run test-radiografia     # 62 asserts do núcleo/CLI/aba, sem rede
```

URLs úteis: `/?debug=1` (painel de tuning), `/?stats` (painel público, chave `0929` para o detalhado), `/?setup=0929` (estúdio de skins do dono — upload/desbloqueio/aplicar; a escrita exige o gerador no ar; o `iniciar-estudio.bat` da raiz sobe tudo e abre direto), `/?ntfy=test|off|on`.

## Documentação

**Sempre que houver mudanças significativas no código, lembrar o usuário de rodar `/atualizar-docs` antes de fechar uma release.** O comando (em `.claude/commands/atualizar-docs.md`) compara o código com a última versão documentada via git e sincroniza a pasta `docs/` + `docs/CHANGELOG.md`.
