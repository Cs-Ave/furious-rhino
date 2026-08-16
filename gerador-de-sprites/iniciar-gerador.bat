@echo off
rem GERADOR DE SPRITES - duplo-clique para subir o servidor e abrir a pagina.
rem A janela do servidor fica aberta; feche-a (ou use o botao Parar na
rem pagina) para encerrar.
cd /d "%~dp0.."
start "gerador-de-sprites" cmd /k node gerador-de-sprites\server.mjs
timeout /t 2 /nobreak >nul
start http://localhost:3210/
