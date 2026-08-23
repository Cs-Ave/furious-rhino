@echo off
rem ESTUDIO DE SKINS - duplo-clique: sobe o servidor unificado (jogo :3000 +
rem gerador :3210) e abre o estudio. Feche a janela do servidor (ou use o
rem botao Parar na pagina) para encerrar. Se a 3000 ja estiver com o python,
rem o servidor avisa e segue so na 3210 - o link abaixo continua certo.
cd /d "%~dp0"
start "furious-rhino-servidor" cmd /k node gerador-de-sprites\server.mjs
for /l %%i in (1,1,8) do (
  curl -s -o nul --max-time 1 http://localhost:3210/api/status && goto abrir
  timeout /t 1 /nobreak >nul
)
:abrir
start http://localhost:3000/?setup=0929
