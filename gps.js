// =============================================================
// MewMo — надёжный GPS и его диагностика
// =============================================================
// Здесь:
//   • журнал событий GPS (только в памяти, без координат!);
//   • safely() — «страховка»: если какая-то часть игры сломалась,
//     ошибка записывается в журнал, а GPS продолжает работать.
//
// ВАЖНО: координаты игрока в журнал не пишутся и никуда не сохраняются.

// ----- Журнал -----
let gpsLog = []; // записи { time, event, error } — только пока открыта страница

// Записать событие в журнал. error — текст ошибки (можно не указывать).
function logGps(event, error) {
  gpsLog = addLogEntry(gpsLog, { time: Date.now(), event: event, error: error }); // logic.js
}

// Выполнить часть игры «со страховкой». name — как назвать её в журнале.
// Если внутри ошибка — пишем её в журнал и идём дальше.
function safely(name, work) {
  try {
    work();
  } catch (error) {
    logGps('ошибка: ' + name, error && error.message ? error.message : String(error));
  }
}

// =============================================================
// Слежение за GPS
// =============================================================
// Одна функция startGps() запускает слежение. Перед новым слежением
// старое всегда останавливается (clearWatch), чтобы их не было два.
// Правила «сторожа» и демо-режима — в logic.js (shouldRestartGps,
// gpsSearchState), здесь только таймер, который их спрашивает.

// ----- Настройки слежения -----
const WATCH_OPTIONS = {
  enableHighAccuracy: true, // точный GPS
  maximumAge: 10000,        // можно взять координаты не старше 10 секунд
  timeout: 20000            // ждём ответа не дольше 20 секунд
};
// Быстрый первый запрос: неточный (по Wi‑Fi и вышкам), зато сразу
const QUICK_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 60000,        // подойдут координаты минутной давности
  timeout: 20000
};

// ----- Состояние (для диагностики тоже) -----
let watchId = null;           // номер слежения (чтобы его остановить)
let gpsTimer = null;          // таймер «сторожа» (раз в секунду)
let gpsSearchStartedAt = 0;   // когда начали искать первые координаты
let gpsLastStartAt = 0;       // когда последний раз запускали слежение
let gpsLastFixAt = 0;         // когда пришли последние координаты
let gpsFixCount = 0;          // сколько раз пришли координаты
let gpsLastAccuracy = null;   // точность последних координат, м
let gpsLastError = null;      // последняя ошибка: { code, message, time }
let gpsPermissionDenied = false; // игрок запретил геолокацию

// Запустить (или перезапустить) слежение. reason — для журнала.
function startGps(reason) {
  if (!('geolocation' in navigator)) {
    logGps('браузер не умеет геолокацию', '');
    startDemoMode('Этот браузер не умеет определять местоположение.'); // game.js
    return;
  }
  stopGps();
  const now = Date.now();
  gpsLastStartAt = now;
  if (!hasGps && gpsSearchStartedAt === 0) {
    gpsSearchStartedAt = now; // с этого момента считаем 45 секунд до демо-режима
  }
  logGps('запуск слежения', reason);

  try {
    watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, WATCH_OPTIONS);
    // Сразу же — быстрый неточный запрос, чтобы первая точка появилась быстрее
    navigator.geolocation.getCurrentPosition(onPosition, onPositionError, QUICK_OPTIONS);
  } catch (error) {
    logGps('ошибка запуска слежения', error.message);
  }

  // «Сторож» запускается один раз и дальше работает сам
  if (!gpsTimer) {
    gpsTimer = setInterval(gpsTick, 1000);
  }
}

// Остановить слежение (например, игрок ушёл «Домой»)
function stopGps() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

// Прогулка закончилась: 45 секунд до демо-режима в следующий раз
// считаем заново (дома время не должно «натикать»)
function resetGpsSearch() {
  gpsSearchStartedAt = 0;
}

// Пришли координаты (вызывается из onPosition в game.js).
// Координаты сюда НЕ передаются — только точность.
function noteGpsFix(accuracy) {
  gpsFixCount = gpsFixCount + 1;
  gpsLastFixAt = Date.now();
  gpsLastAccuracy = accuracy;
  gpsPermissionDenied = false;
  if (gpsFixCount === 1) logGps('первые координаты', 'точность ' + Math.round(accuracy) + ' м');
}

// Пришла ошибка (вызывается из onPositionError в game.js)
function noteGpsError(error) {
  gpsLastError = { code: error.code, message: error.message || '', time: Date.now() };
  if (error.code === error.PERMISSION_DENIED) gpsPermissionDenied = true;
  logGps('ошибка GPS (код ' + error.code + ')', error.message);
}

// Раз в секунду: «сторож» и переход в демо-режим
function gpsTick() {
  if (gameMode !== 'walk') return;
  const now = Date.now();

  const restart = shouldRestartGps({ // logic.js
    walking: true,
    visible: document.visibilityState === 'visible',
    permissionDenied: gpsPermissionDenied,
    lastFixAt: gpsLastFixAt,
    lastStartAt: gpsLastStartAt,
    now: now
  });
  if (restart) {
    startGps('сторож: 30 секунд без координат');
  }

  const state = gpsSearchState({ // logic.js
    permissionDenied: gpsPermissionDenied,
    hasFix: hasGps,
    searchStartedAt: gpsSearchStartedAt,
    now: now
  });
  if (state === 'демо' && !demoMode) {
    logGps('демо-режим', 'за 45 секунд не пришло ни одних координат');
    startDemoMode('Не получается найти спутники.'); // game.js — поиск при этом продолжается
  }
}

// Игра снова на экране (разблокировали телефон, вернулись из другого
// приложения) — на прогулке перезапускаем слежение: телефон мог его «усыпить»
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible' && gameMode === 'walk') {
    startGps('игра снова на экране');
  }
});

// =============================================================
// Окно «Как разрешить геолокацию»
// =============================================================
function showGpsHelp() {
  document.getElementById('gps-help').classList.remove('hidden');
  document.getElementById('gps-help-retry').focus();
}

function hideGpsHelp() {
  document.getElementById('gps-help').classList.add('hidden');
}

document.getElementById('gps-help-retry').addEventListener('click', function () {
  hideGpsHelp();
  gpsPermissionDenied = false; // вдруг взрослый уже разрешил — пробуем
  setStatus('Ищем спутники…'); // game.js
  startGps('кнопка «Попробовать снова»');
});
document.getElementById('gps-help-close').addEventListener('click', hideGpsHelp);

// =============================================================
// Окно «Проверить GPS» (в настройках, без родительского замка)
// =============================================================
// Показывает состояние GPS и последние события журнала. КООРДИНАТ
// НЕ ПОКАЗЫВАЕТ. Текст собирает buildGpsReport из logic.js.

let gpsPermissionState = '';  // 'granted', 'denied', 'prompt' или '' (неизвестно)
let gpsReportTimer = null;    // обновление окна раз в секунду

// Узнать состояние разрешения, если браузер умеет (navigator.permissions)
function checkGpsPermission() {
  try {
    if (!navigator.permissions || !navigator.permissions.query) return;
    navigator.permissions.query({ name: 'geolocation' }).then(function (status) {
      gpsPermissionState = status.state;
      // Если разрешение поменяют, пока игра открыта, — узнаем об этом
      status.onchange = function () {
        gpsPermissionState = status.state;
        logGps('разрешение изменилось', status.state);
      };
    }).catch(function () {
      gpsPermissionState = '';
    });
  } catch (error) {
    gpsPermissionState = '';
  }
}

// Собрать текст отчёта (только то, что нужно, без координат)
function gpsReportText() {
  return buildGpsReport({ // logic.js
    now: Date.now(),
    supported: 'geolocation' in navigator,
    secure: window.isSecureContext === true,
    permission: gpsPermissionState,
    mode: gameMode,
    demo: demoMode,
    watching: watchId !== null,
    fixCount: gpsFixCount,
    lastFixAt: gpsLastFixAt,
    accuracy: gpsLastAccuracy,
    lastError: gpsLastError,
    log: gpsLog,
    browser: navigator.userAgent
  });
}

function openGpsCheck() {
  checkGpsPermission();
  showSettingsView(document.getElementById('settings-gps')); // settings.js
  renderGpsReport();
  // Пока окно открыто, обновляем его раз в секунду («5 с назад» и т. п.)
  if (!gpsReportTimer) gpsReportTimer = setInterval(renderGpsReport, 1000);
}

function renderGpsReport() {
  const view = document.getElementById('settings-gps');
  const closed = view.classList.contains('hidden') || settingsWindow.classList.contains('hidden');
  if (closed) {
    // Окно закрыли — перестаём обновлять
    clearInterval(gpsReportTimer);
    gpsReportTimer = null;
    return;
  }
  document.getElementById('gps-report').textContent = gpsReportText();
}

// «Скопировать отчёт»: чтобы игрок мог прислать его разработчику
function copyGpsReport() {
  const text = gpsReportText();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      showToast('Отчёт скопирован. Его можно отправить разработчику.');
    }).catch(function () {
      showToast('Не получилось скопировать. Выдели текст отчёта пальцем и скопируй.');
    });
  } else {
    showToast('Не получилось скопировать. Выдели текст отчёта пальцем и скопируй.');
  }
}

document.getElementById('open-gps-check').addEventListener('click', openGpsCheck);
document.getElementById('gps-copy').addEventListener('click', copyGpsReport);
document.getElementById('gps-back').addEventListener('click', function () {
  showSettingsView(document.getElementById('settings-main'));
});
document.getElementById('gps-restart').addEventListener('click', function () {
  if (gameMode !== 'walk') {
    showToast('GPS работает только на прогулке. Дома координаты не нужны.');
    return;
  }
  gpsPermissionDenied = false;
  startGps('кнопка «Перезапустить GPS»');
  renderGpsReport();
  showToast('GPS перезапущен.');
});

// Сразу при загрузке узнаём, разрешена ли геолокация (если браузер умеет)
checkGpsPermission();
