/*
  Pelta Nera — мини-приложение Telegram.
  Если сайт открыт из Telegram (кнопка «Магазин» в боте), подключаем скрипт Telegram
  до запуска сайта: он читает данные запуска из адреса. В обычном браузере ничего не делает.
*/
(function () {
  try {
    var tg =
      /tgWebAppData=|tgWebAppPlatform=/.test(location.hash) ||
      /[?&]tgapp=1/.test(location.search) ||
      sessionStorage.getItem('pelta_tgapp') === '1';
    if (!tg) return;
    sessionStorage.setItem('pelta_tgapp', '1');
    document.write('<script src="https://telegram.org/js/telegram-web-app.js?59"><\/script>');
  } catch (e) {
    /* ignore */
  }
})();
