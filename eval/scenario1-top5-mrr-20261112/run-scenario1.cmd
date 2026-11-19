@echo off
rem Scenario 1 launcher: retrieval only (no generation, no Cloudflare). Logs to run-log.txt in this folder.
setlocal
cd /d "%~dp0..\.."
set LOG=%~dp0run-log.txt
echo ==== start %date% %time% > "%LOG%"
echo [1/4] starting containers >> "%LOG%"
docker start eval-qasper-full2-20261028-primary-r3-qdrant >> "%LOG%" 2>&1
docker start local-rag-ollama >> "%LOG%" 2>&1
docker ps --format "{{.Names}} {{.Status}} {{.Ports}}" >> "%LOG%" 2>&1
echo [2/4] waiting for services >> "%LOG%"
for /l %%i in (1,1,30) do (
  curl -s -o nul -w "qdrant %%{http_code} " http://127.0.0.1:36333/readyz >> "%LOG%" 2>&1
  curl -s -o nul -w "ollama %%{http_code}\n" http://127.0.0.1:11434/api/tags >> "%LOG%" 2>&1
  timeout /t 2 /nobreak > nul
)
node -v >> "%LOG%" 2>&1
echo [3/4] pdf run >> "%LOG%"
node --import tsx eval/scenario1-top5-mrr-20261112/run.mjs pdf >> "%LOG%" 2>&1
echo pdf exit %errorlevel% >> "%LOG%"
echo [4/4] docx run >> "%LOG%"
node --import tsx eval/scenario1-top5-mrr-20261112/run.mjs docx >> "%LOG%" 2>&1
echo docx exit %errorlevel% >> "%LOG%"
echo ==== end %date% %time% >> "%LOG%"
echo Done. You can close this window.
