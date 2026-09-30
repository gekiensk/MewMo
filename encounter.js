// =============================================================
// MewMo — окно «Знакомство с котом» (главная мини-игра)
// =============================================================
// Порядок экранов:
//   1. «Кот рядом!»           — кто сидит в капсуле;
//   2. «Поймай сигнал»        — попал в зелёную зону → подсказка;
//   3. «Лапка, Коготь, Клубок» — играем до двух побед;
//   4. «Кот найден!»          — если выиграл;
//   5. «Кот смутился…»        — если проиграл (без наказания).
//
// Правила и расчёты берутся из logic.js, а когда игра закончилась,
// этот файл вызывает функции из game.js:
//   catchCat(capsule)  — забрать кота в экипаж (или получить рыбок за повтор);
//   makeCatShy(capsule) — кот смутился, капсула минуту не открывается.

// ----- Настройки -----
const WINS_NEEDED = 2;         // сколько побед нужно в «Лапка, Коготь, Клубок»
const ROUND_PAUSE = 1400;      // пауза (мс) перед финальным экраном, чтобы прочитать итог раунда

// Значки жестов
const GESTURE_ICONS = { 'Лапка': '🐾', 'Коготь': '✂️', 'Клубок': '🧶' };

// Жест в винительном падеже: «этот кот любит … Лапку / Коготь / Клубок»
const GESTURE_ACCUSATIVE = { 'Лапка': 'Лапку', 'Коготь': 'Коготь', 'Клубок': 'Клубок' };

// Почему жест победил (ключ — жест победителя)
const WIN_REASONS = {
  'Лапка': 'Лапка прижимает Коготь',
  'Коготь': 'Коготь режет нитку Клубка',
  'Клубок': 'Лапка запуталась в Клубке'
};

// ----- Состояние мини-игры -----
// Пока окно закрыто — null. Когда открыто — объект с данными встречи.
let activeEncounter = null;

// ----- Находим элементы окна -----
const encounterWindow = document.getElementById('encounter');
const screens = document.querySelectorAll('#encounter .screen');
const signalZone = document.getElementById('signal-zone');
const signalLight = document.getElementById('signal-light');
const signalButton = document.getElementById('signal-button');
const signalResult = document.getElementById('signal-result');
const signalNext = document.getElementById('signal-next');
const rpsHint = document.getElementById('rps-hint');
const rpsScore = document.getElementById('rps-score');
const rpsRound = document.getElementById('rps-round');
const gestureButtons = document.querySelectorAll('.gesture-button');

// ----- Кнопки окна -----
document.getElementById('encounter-close').addEventListener('click', closeButtonPressed);
document.getElementById('intro-next').addEventListener('click', startSignal);
signalButton.addEventListener('click', catchSignal);
signalNext.addEventListener('click', startRps);
document.getElementById('win-take').addEventListener('click', takeCat);
document.getElementById('lose-ok').addEventListener('click', catGotShy);

for (let i = 0; i < gestureButtons.length; i++) {
  gestureButtons[i].addEventListener('click', function () {
    // data-gesture в HTML хранит название жеста этой кнопки
    playRound(gestureButtons[i].dataset.gesture);
  });
}

// Клавиша Esc на компьютере тоже закрывает окно
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && activeEncounter) {
    closeButtonPressed();
  }
});

// =============================================================
// Открыть и закрыть окно
// =============================================================
function openEncounter(capsule) {
  activeEncounter = {
    capsule: capsule,
    cat: capsule.cat,
    hintEarned: false, // получил ли игрок подсказку в «Поймай сигнал»
    playerWins: 0,
    catWins: 0,
    signal: null,      // данные шкалы «Поймай сигнал»
    finished: ''       // '', 'победа' или 'поражение'
  };

  // Заполняем экран «Кот рядом!»
  const cat = capsule.cat;
  setCircleColor(document.getElementById('intro-circle'), cat);
  document.getElementById('intro-name').textContent = cat.name;
  document.getElementById('intro-stars').textContent = starsText(cat.rarity);

  encounterWindow.classList.remove('hidden');
  showScreen('screen-intro');
  document.getElementById('intro-next').focus();
}

function closeEncounter() {
  stopSignal();
  encounterWindow.classList.add('hidden');
  activeEncounter = null;
}

// Кнопка ✕. Что будет, зависит от того, чем закончилась игра:
// выиграл — кот всё равно твой; проиграл — кот смущается;
// игра не закончена — просто закрываем, капсулу можно открыть снова.
function closeButtonPressed() {
  if (!activeEncounter) return;
  if (activeEncounter.finished === 'победа') {
    takeCat();
  } else if (activeEncounter.finished === 'поражение') {
    catGotShy();
  } else {
    closeEncounter();
  }
}

// Показывает один экран, остальные прячет
function showScreen(id) {
  for (let i = 0; i < screens.length; i++) {
    screens[i].classList.toggle('hidden', screens[i].id !== id);
  }
}

// =============================================================
// Часть 1: «Поймай сигнал»
// =============================================================
function startSignal() {
  const cat = activeEncounter.cat;
  // Включено ли на телефоне «уменьшить движение»
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settings = signalSettings(cat.rarity, reducedMotion);

  // Зелёная зона — в случайном месте шкалы (но не у самых краёв)
  const zoneStart = 0.1 + Math.random() * (0.8 - settings.zoneWidth);

  activeEncounter.signal = {
    zoneStart: zoneStart,
    zoneWidth: settings.zoneWidth,
    speed: settings.speed,
    startTime: performance.now(), // когда огонёк начал бежать (в мс)
    position: 0,                  // где огонёк сейчас (от 0 до 1)
    frameId: null                 // номер кадра анимации, чтобы её остановить
  };

  // Рисуем зелёную зону: отступ слева и ширина — в процентах шкалы
  signalZone.style.left = (zoneStart * 100) + '%';
  signalZone.style.width = (settings.zoneWidth * 100) + '%';

  signalResult.textContent = '';
  signalButton.classList.remove('hidden');
  signalNext.classList.add('hidden');
  showScreen('screen-signal');
  signalButton.focus();

  moveSignalLight();
}

// Двигает огонёк. requestAnimationFrame просит браузер вызвать
// эту функцию снова перед следующей перерисовкой экрана (~60 раз в секунду).
function moveSignalLight() {
  const signal = activeEncounter.signal;
  const seconds = (performance.now() - signal.startTime) / 1000;
  signal.position = signalPosition(seconds, signal.speed);
  signalLight.style.left = (signal.position * 100) + '%';
  signal.frameId = requestAnimationFrame(moveSignalLight);
}

function stopSignal() {
  if (activeEncounter && activeEncounter.signal) {
    cancelAnimationFrame(activeEncounter.signal.frameId);
  }
}

// Игрок нажал «Поймать!» (попытка одна)
function catchSignal() {
  stopSignal();
  const signal = activeEncounter.signal;
  const hit = isInGreenZone(signal.position, signal.zoneStart, signal.zoneWidth);
  const cat = activeEncounter.cat;

  if (hit) {
    activeEncounter.hintEarned = true;
    signalResult.textContent = 'Сигнал пойман! Подсказка: этот кот любит ' +
      GESTURE_ICONS[cat.favoriteGesture] + ' ' + GESTURE_ACCUSATIVE[cat.favoriteGesture] + '.';
  } else {
    signalResult.textContent = 'Сигнал ускользнул. Ничего страшного — играем дальше!';
  }

  signalButton.classList.add('hidden');
  signalNext.classList.remove('hidden');
  signalNext.focus();
}

// =============================================================
// Часть 2: «Лапка, Коготь, Клубок»
// =============================================================
function startRps() {
  const cat = activeEncounter.cat;
  activeEncounter.playerWins = 0;
  activeEncounter.catWins = 0;

  if (activeEncounter.hintEarned) {
    rpsHint.textContent = 'Подсказка: ' + cat.name + ' любит ' +
      GESTURE_ICONS[cat.favoriteGesture] + ' ' + GESTURE_ACCUSATIVE[cat.favoriteGesture] + '.';
    rpsHint.classList.remove('hidden');
  } else {
    rpsHint.classList.add('hidden');
  }

  rpsRound.textContent = 'Выбери жест!';
  setGestureButtonsEnabled(true);
  updateScore();
  showScreen('screen-rps');
}

function playRound(playerGesture) {
  const cat = activeEncounter.cat;
  const catGesture = catChooseGesture(cat.favoriteGesture, Math.random);
  const result = roundResult(playerGesture, catGesture);

  // Что выбрали оба
  let text = 'Ты: ' + GESTURE_ICONS[playerGesture] + ' ' + playerGesture +
    '. ' + cat.name + ': ' + GESTURE_ICONS[catGesture] + ' ' + catGesture + '. ';

  if (result === 'ничья') {
    text = text + 'Ничья — переигрываем!';
  } else if (result === 'победа') {
    activeEncounter.playerWins = activeEncounter.playerWins + 1;
    text = text + WIN_REASONS[playerGesture] + '. Очко тебе!';
  } else {
    activeEncounter.catWins = activeEncounter.catWins + 1;
    text = text + WIN_REASONS[catGesture] + '. Очко коту!';
  }

  rpsRound.textContent = text;
  updateScore();

  // Кто-то набрал две победы — игра окончена
  if (activeEncounter.playerWins >= WINS_NEEDED) {
    finishRps('победа');
  } else if (activeEncounter.catWins >= WINS_NEEDED) {
    finishRps('поражение');
  }
}

function finishRps(outcome) {
  activeEncounter.finished = outcome;
  setGestureButtonsEnabled(false); // пока ждём, жесты нажимать нельзя

  // Небольшая пауза, чтобы игрок успел прочитать, чем кончился раунд
  const encounter = activeEncounter;
  setTimeout(function () {
    // Если за это время окно закрыли — ничего не показываем
    if (activeEncounter !== encounter) return;
    if (outcome === 'победа') {
      showWinScreen();
    } else {
      showScreen('screen-lose');
      document.getElementById('lose-ok').focus();
    }
  }, ROUND_PAUSE);
}

function updateScore() {
  rpsScore.textContent = 'Счёт: ты ' + activeEncounter.playerWins +
    ' — ' + activeEncounter.catWins + ' ' + activeEncounter.cat.name;
}

function setGestureButtonsEnabled(enabled) {
  for (let i = 0; i < gestureButtons.length; i++) {
    gestureButtons[i].disabled = !enabled;
  }
}

// =============================================================
// Итог встречи
// =============================================================
function showWinScreen() {
  const cat = activeEncounter.cat;
  // Знакомый кот уже в экипаже — он просто рад встрече и дарит рыбок.
  // isInCrew — из logic.js, save — сохранение из game.js.
  const known = isInCrew(save, cat.id);
  document.getElementById('win-title').textContent = known ? 'Снова встреча!' : 'Кот найден!';
  document.getElementById('win-take').textContent = known ? 'Ура! Забрать ' + REPEAT_CAT_FISH + ' 🐟' : 'Забрать в экипаж';
  setCircleColor(document.getElementById('win-circle'), cat);
  document.getElementById('win-name').textContent = cat.name;
  document.getElementById('win-stars').textContent = starsText(cat.rarity) + ' ' + cat.rarity;
  document.getElementById('win-info').textContent = 'Тип: ' + cat.type + '. Характер: ' + cat.character + '.';
  document.getElementById('win-fact').textContent = cat.fact;
  showScreen('screen-win');
  document.getElementById('win-take').focus();
}

// Кнопка «Забрать в экипаж»
function takeCat() {
  const capsule = activeEncounter.capsule;
  closeEncounter();
  catchCat(capsule); // функция из game.js
}

// Кнопка «Хорошо» после проигрыша
function catGotShy() {
  const capsule = activeEncounter.capsule;
  closeEncounter();
  makeCatShy(capsule); // функция из game.js
}

// =============================================================
// Помощники для внешнего вида
// =============================================================
// Цвет круга: легендарный — розовый, иначе по типу кота
function setCircleColor(element, cat) {
  element.classList.remove('circle-water', 'circle-forest', 'circle-city', 'circle-legendary');
  if (cat.rarity === 'легендарный') {
    element.classList.add('circle-legendary');
  } else if (cat.type === 'водный') {
    element.classList.add('circle-water');
  } else if (cat.type === 'лесной') {
    element.classList.add('circle-forest');
  } else if (cat.type === 'городской') {
    element.classList.add('circle-city');
  } else {
    element.classList.add('circle-legendary');
  }
}

// Звёздочки редкости: ★☆☆, ★★☆ или ★★★
function starsText(rarity) {
  const stars = rarityStars(rarity); // функция из logic.js
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}
