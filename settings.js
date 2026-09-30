// =============================================================
// MewMo — настройки, раздел «Для взрослых» и время игры
// =============================================================
// Маленькая кнопка ⚙️ открывает окно «Настройки»:
//   • звук вкл/выкл, вибрация вкл/выкл;
//   • переключение режима: прогулка ↔ «Дом»;
//   • внизу — «Для взрослых»: вход через «родительский замок»
//     (пример на умножение), внутри — ограничение времени игры в день,
//     «Только режим „Дом“» и рассказ о том, какие данные хранит игра.
//
// Здесь же «часы игры»: раз в секунду, пока игра открыта и видна
// на экране, прибавляем секунду к времени игры за сегодня.
// Правила (подсчёт, полночь, предупреждение, замок) — в logic.js.
// Настройки лежат в том же сохранении save (game.js).

// ----- Находим элементы -----
const settingsWindow = document.getElementById('settings');
const settingsMain = document.getElementById('settings-main');
const settingsLock = document.getElementById('settings-lock');
const settingsAdult = document.getElementById('settings-adult');
const timeUpScreen = document.getElementById('time-up');
const lockInput = document.getElementById('lock-answer');
const lockMessage = document.getElementById('lock-message');

// ----- Состояние -----
let parentQuestion = null;   // текущий пример родительского замка
let playClockTimer = null;   // таймер «часов игры»
let playClockTicks = 0;      // сколько секунд прошло с прошлой записи сохранения
let warnedDay = '';          // в какой день уже предупредили «осталось 5 минут»

// ----- Кнопки -----
document.getElementById('settings-button').addEventListener('click', openSettings);
document.getElementById('settings-close').addEventListener('click', closeSettings);
document.getElementById('toggle-sound').addEventListener('click', function () {
  save.settings.sound = !save.settings.sound;
  saveGame();
  renderSettings();
});
document.getElementById('toggle-vibration').addEventListener('click', function () {
  save.settings.vibration = !save.settings.vibration;
  saveGame();
  renderSettings();
  vibrate(40); // показать, как это ощущается (если включили)
});
document.getElementById('open-adult').addEventListener('click', openParentLock);
document.getElementById('toggle-mode').addEventListener('click', function () {
  closeSettings();
  switchMode(); // home.js
});
document.getElementById('toggle-home-only').addEventListener('click', function () {
  save.settings.homeOnly = !save.settings.homeOnly;
  saveGame();
  renderAdult();
  renderStartScreen(); // home.js
  // Если сейчас идёт прогулка — сразу переходим домой
  if (save.settings.homeOnly && gameMode === 'walk') {
    startHome();
  }
});
document.getElementById('time-up-adult').addEventListener('click', function () {
  openSettings();
  openParentLock();
});
document.getElementById('lock-check').addEventListener('click', checkLock);
lockInput.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') checkLock();
});
document.getElementById('lock-back').addEventListener('click', showSettingsMain);
document.getElementById('adult-back').addEventListener('click', showSettingsMain);
document.getElementById('adult-bonus').addEventListener('click', function () {
  save.playTime = addBonusTime(save.playTime, todayKey()); // logic.js
  saveGame();
  renderAdult();
  checkTimeLimit();
});

// Кнопки выбора ограничения времени: data-limit хранит число минут
const limitButtons = document.querySelectorAll('.limit-button');
for (let i = 0; i < limitButtons.length; i++) {
  limitButtons[i].addEventListener('click', function () {
    save.settings.dailyLimit = Number(limitButtons[i].dataset.limit);
    saveGame();
    renderAdult();
    checkTimeLimit();
  });
}

// Esc закрывает настройки
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && !settingsWindow.classList.contains('hidden')) {
    closeSettings();
  }
});

// =============================================================
// Для других файлов: включён ли звук и вибрация
// =============================================================
function isSoundOn() {
  return save.settings.sound;
}

function isVibrationOn() {
  return save.settings.vibration;
}

// Вибрация (если телефон умеет и она включена в настройках).
// pattern — миллисекунды: 40 или [80, 60, 80] (вибрация, пауза, вибрация).
function vibrate(pattern) {
  if (!isVibrationOn() || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch (error) {
    // Не получилось — ничего страшного
  }
}

// =============================================================
// Окно «Настройки»
// =============================================================
function openSettings() {
  settingsWindow.classList.remove('hidden');
  showSettingsMain();
  document.getElementById('settings-close').focus();
}

function closeSettings() {
  settingsWindow.classList.add('hidden');
  parentQuestion = null;
}

// В окне три вида: главный, замок и раздел для взрослых
function showSettingsView(view) {
  const views = [settingsMain, settingsLock, settingsAdult, document.getElementById('settings-gps')];
  for (let i = 0; i < views.length; i++) {
    views[i].classList.toggle('hidden', views[i] !== view);
  }
}

function showSettingsMain() {
  renderSettings();
  showSettingsView(settingsMain);
}

// Кнопка-переключатель: текст и aria-pressed («нажата» = включено)
function setToggle(button, label, on) {
  button.textContent = label + ': ' + (on ? 'вкл' : 'выкл');
  button.setAttribute('aria-pressed', on ? 'true' : 'false');
}

function renderSettings() {
  setToggle(document.getElementById('toggle-sound'), '🔊 Звук', save.settings.sound);
  setToggle(document.getElementById('toggle-vibration'), '📳 Вибрация', save.settings.vibration);
  // Если телефон не умеет вибрировать — честно пишем об этом
  document.getElementById('vibration-note').classList.toggle('hidden', !!navigator.vibrate);

  // Кнопка переключения режима: дома — «Пойти гулять», на прогулке — «Играть дома».
  // Если прогулку выключил взрослый, из дома уйти нельзя.
  const modeButton = document.getElementById('toggle-mode');
  const walkLocked = gameMode === 'home' && save.settings.homeOnly;
  modeButton.textContent = gameMode === 'home' ? '🗺️ Пойти гулять' : '🏠 Играть дома';
  modeButton.classList.toggle('hidden', walkLocked);
  document.getElementById('mode-note').classList.toggle('hidden', !walkLocked);
}

// =============================================================
// Родительский замок
// =============================================================
function openParentLock() {
  parentQuestion = makeParentQuestion(Math.random); // logic.js
  document.getElementById('lock-question').textContent = parentQuestion.text + ' = ?';
  lockInput.value = '';
  lockMessage.textContent = '';
  showSettingsView(settingsLock);
  lockInput.focus();
}

function checkLock() {
  if (!parentQuestion) return;
  if (checkParentAnswer(parentQuestion, lockInput.value)) { // logic.js
    parentQuestion = null;
    renderAdult();
    showSettingsView(settingsAdult);
    document.getElementById('adult-back').focus();
  } else {
    // Неверно — новый пример, чтобы нельзя было просто перебирать
    parentQuestion = makeParentQuestion(Math.random);
    document.getElementById('lock-question').textContent = parentQuestion.text + ' = ?';
    lockInput.value = '';
    lockMessage.textContent = 'Неверно. Вот другой пример.';
    lockInput.focus();
  }
}

// =============================================================
// Раздел «Для взрослых»
// =============================================================
function renderAdult() {
  // Кнопки ограничения: выбранная «нажата»
  for (let i = 0; i < limitButtons.length; i++) {
    const chosen = Number(limitButtons[i].dataset.limit) === save.settings.dailyLimit;
    limitButtons[i].setAttribute('aria-pressed', chosen ? 'true' : 'false');
  }
  const minutes = Math.floor(playedToday(save.playTime, todayKey()) / 60);
  let text = 'Сегодня сыграно: ' + minutes + ' мин.';
  const state = timeLimitState(save.playTime, todayKey(), save.settings.dailyLimit);
  if (state.status !== 'без ограничения') {
    text = text + ' Осталось: ' + Math.ceil(state.secondsLeft / 60) + ' мин.';
  }
  document.getElementById('adult-played').textContent = text;
  setToggle(document.getElementById('toggle-home-only'), '🏠 Только режим «Дом»', save.settings.homeOnly);
  // «Добавить 15 минут» имеет смысл, только если ограничение включено
  document.getElementById('adult-bonus').classList.toggle('hidden', !save.settings.dailyLimit);
}

// =============================================================
// Часы игры и ограничение времени
// =============================================================
function todayKey() {
  return localDayKey(new Date()); // logic.js, по местному времени
}

// Запускается один раз, когда игрок нажал «Начать» (любой режим)
function startPlayClock() {
  if (playClockTimer) return;
  playClockTimer = setInterval(tickPlayClock, 1000);
  checkTimeLimit();
}

function tickPlayClock() {
  // Считаем только когда игра видна на экране (не свёрнута, не в фоне)
  if (document.visibilityState !== 'visible') return;
  save.playTime = addPlayTime(save.playTime, todayKey(), 1); // logic.js
  // Записываем сохранение раз в 5 секунд, а не каждую секунду
  playClockTicks = playClockTicks + 1;
  if (playClockTicks >= 5) {
    playClockTicks = 0;
    saveGame();
  }
  checkTimeLimit();
}

// Показывает предупреждение или экран «На сегодня всё!»
function checkTimeLimit() {
  const today = todayKey();
  const state = timeLimitState(save.playTime, today, save.settings.dailyLimit);
  if (state.status === 'скоро конец' && warnedDay !== today) {
    warnedDay = today;
    showToast('Осталось 5 минут игры. Скоро котам пора спать!');
  }
  const timeUp = state.status === 'время вышло';
  if (timeUp && timeUpScreen.classList.contains('hidden')) {
    saveGame();
  }
  timeUpScreen.classList.toggle('hidden', !timeUp);
}
