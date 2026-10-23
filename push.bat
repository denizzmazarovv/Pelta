@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo === Pelta Nera: отправка изменений на GitHub ===
echo.
git add -A
git status --short
echo.
set "MSG="
set /p MSG=Что изменили? (Enter = update site): 
if "%MSG%"=="" set "MSG=update site"
git commit -m "%MSG%"
git pull --rebase
git push
echo.
if %errorlevel%==0 (echo Готово! Сайт обновится через 1-2 минуты: https://peltanera.com) else (echo Ошибка при отправке. Скопируйте текст выше и пришлите Claude.)
echo.
pause
