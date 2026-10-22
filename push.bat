@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo === Pelta Nera: отправка изменений на GitHub ===
echo.
rem Удаляем старые файлы, которые больше не используются (безопасно, если их уже нет)
git rm -q --ignore-unmatch src/components/Navbar.tsx src/components/Hero.tsx src/components/Marquee.tsx src/components/Catalog.tsx src/components/About.tsx src/components/Contact.tsx src/components/ProductModal.tsx src/components/AuthModal.tsx src/components/AccountModal.tsx src/context/AuthContext.tsx src/lib/supabase.ts src/hooks/useReveal.ts >nul 2>&1
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
