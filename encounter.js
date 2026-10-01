// =============================================================
// MewMo — окно «Знакомство с котом» (главная мини-игра)
// =============================================================
// Порядок экранов:
//   1. «Кот рядом!»           — кто сидит в капсуле
//                               (или «Потерявшийся капитан!» у маяка);
//   2. «Помощники»            — только для капитанов: выбери до двух котов
//                               из экипажа, каждый поможет в игре своего типа;
//   3. «Поймай сигнал»        — попал в зелёную зону → поблажка (+1 жизнь
//                               или +3 секунды в мини-игре);
//   4. Мини-игра кота          — своя у каждого типа (minigames.js);
//                               у легендарных — две, у капитанов — три (2 из 3);
//   5. «Кот найден!»          — если выиграл;
//   6. «Ой!»                  — если проиграл (без наказания).
//
// Правила и расчёты берутся из logic.js, а когда игра закончилась,
// этот файл вызывает функции из game.js и captains.js:
//   catchCat(capsule)      — забрать кота в экипаж (или получить рыбок за повтор);
//   makeCatShy(capsule)    — кот смутился, капсула минуту не открывается;
//   captainWon(captain)    — капитан вступает в экипаж;
//   captainLost(captain)   — капитан ждёт, следующая попытка через 2 минуты;
//   guestWon(cat), guestShy(cat) — то же для гостя в убежище (home.js).

// ----- Настройки -----
const RESULT_PAUSE = 900; // пауза (мс) перед экраном итога, чтобы прочитать «Получилось!»

// ----- Состояние мини-игры -----
// Пока окно закрыто — null. Когда открыто — объект с данными встречи:
//   kind       — 'capsule' (кот из капсулы) или 'captain' (капитан у маяка);
//   capsule    — капсула (для обычного кота);
//   captain    — капитан на карте (для капитана);
//   cat        — кот или капитан из cats.js;
//   plan       — какие мини-игры и сколько нужно выиграть (planMinigames);
//   bonus      — поблажка за пойманный сигнал (signalBonus);
//   helpers    — id выбранных помощников;
//   finished   — '' (идёт), 'победа' или 'поражение';
//   signal     — данные шкалы «Поймай сигнал».
let activeEncounter = null;

// ----- Находим элементы окна -----
const encounterWindow = document.getElementById('encounter');
const screens = document.querySelectorAll('#encounter .screen');
const signalZone = document.getElementById('signal-zone');
const signalLight = document.getElementById('signal-light');
const signalButton = document.getElementById('signal-button');
const signalResult = document.getElementById('signal-result');
const signalNext = document.getElementById('signal-next');
const helperList = document.getElementById('helper-list');

// ----- Кнопки окна -----
document.getElementById('encounter-close').addEventListener('click', closeButtonPressed);
document.getElementById('intro-next').addEventListener('click', introNext);
document.getElementById('helpers-go').addEventListener('click', startSignal);
signalButton.addEventListener('click', catchSignal);
signalNext.addEventListener('click', startGames);
document.getElementById('win-take').addEventListener('click', takeCat);
document.getElementById('lose-ok').addEventListener('click', catGotShy);

// Клавиша Esc на компьютере тоже закрывает окно
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && activeEncounter) {
    closeButtonPressed();
  }
});

// =============================================================
// Открыть и закрыть окно
// =============================================================
// Обычный кот из капсулы (вызывается из game.js)
function openEncounter(capsule) {
  startEncounter({ kind: 'capsule', capsule: capsule, captain: null, cat: capsule.cat });
}

// Капитан у маяка (вызывается из captains.js)
function openCaptainEncounter(captain, captainData) {
  startEncounter({ kind: 'captain', capsule: null, captain: captain, cat: captainData });
}

// Гость в убежище (вызывается из home.js)
function openGuestEncounter(cat) {
  startEncounter({ kind: 'guest', capsule: null, captain: null, cat: cat });
}

function startEncounter(target) {
  const isCaptain = target.kind === 'captain';
  activeEncounter = {
    kind: target.kind,
    capsule: target.capsule,
    captain: target.captain,
    cat: target.cat,
    plan: planMinigames(target.cat, Math.random), // logic.js
    bonus: signalBonus(false),
    helpers: [],
    finished: '',
    flawless: true,
    signal: null,
    showTips: needsEncounterTips(save) // подсказки — только в первые 2 встречи (logic.js)
  };
  if (activeEncounter.showTips) {
    save.tipEncounters = save.tipEncounters + 1; // эта встреча — «с подсказками»
    saveGame();
  }

  // Заполняем экран «Кот рядом!»
  const cat = target.cat;
  const circle = document.getElementById('intro-circle');
  setCircleColor(circle, cat);
  circle.innerHTML = catFace(cat);
  let title = 'Кот рядом!';
  if (isCaptain) title = 'Потерявшийся капитан!';
  if (target.kind === 'guest') title = 'Гость в убежище!';
  document.getElementById('intro-title').textContent = title;
  document.getElementById('intro-name').textContent = cat.name;
  document.getElementById('intro-stars').textContent = starsText(cat.rarity);
  const introText = document.getElementById('intro-text');
  let intro = '';
  if (isCaptain) {
    intro = 'Капитан ищет свой корабль. Выиграй 2 мини-игры из 3 — и он вступит в экипаж!';
  } else if (activeEncounter.plan.games.length > 1) {
    intro = 'Легендарный кот! Две мини-игры подряд — выиграй обе.';
  }
  introText.textContent = intro;
  introText.classList.toggle('hidden', intro === '');

  encounterWindow.classList.remove('hidden');
  showScreen('screen-intro');
  playSound('meow'); // «мяу-чирп» — кот появился (sound.js)
  document.getElementById('intro-next').focus();
}

function closeEncounter() {
  stopSignal();
  stopMinigame(); // minigames.js
  encounterWindow.classList.add('hidden');
  activeEncounter = null;
}

// Кнопка ✕. Что будет, зависит от того, чем закончилась игра:
// выиграл — кот всё равно твой; проиграл — как кнопка «Хорошо»;
// игра не закончена — просто закрываем, можно открыть снова.
function closeButtonPressed() {
  if (!activeEncounter) return;
  const finished = activeEncounter.finished;
  if (finished === 'победа') {
    takeCat();
  } else if (finished === 'поражение') {
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

// Кнопка «Познакомиться» / «Сразиться»: капитану сначала выбираем помощников
function introNext() {
  if (activeEncounter.kind === 'captain') {
    showHelpers();
  } else {
    startSignal();
  }
}

// =============================================================
// Помощники (только для капитанов)
// =============================================================
function showHelpers() {
  // Все коты и капитаны из экипажа, кроме этого капитана (logic.js)
  const candidates = availableHelpers(save, CATS.concat(CAPTAINS), activeEncounter.cat.id);
  helperList.textContent = '';

  if (candidates.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'screen-text';
    empty.textContent = 'В экипаже пока некому помочь. Ничего — справишься сам!';
    helperList.appendChild(empty);
  }

  for (let i = 0; i < candidates.length; i++) {
    const cat = candidates[i];
    const button = document.createElement('button');
    button.className = 'helper-button';
    button.dataset.catId = cat.id;
    button.setAttribute('aria-pressed', 'false');
    // маленький портрет и имя
    const face = document.createElement('span');
    face.className = 'helper-face';
    face.innerHTML = catFace(cat);
    const name = document.createElement('span');
    name.textContent = cat.name;
    button.appendChild(face);
    button.appendChild(name);
    // Чем поможет: в какой игре и как (logic.js)
    const help = document.createElement('span');
    help.className = 'helper-help';
    help.textContent = helperHelpText(cat);
    button.appendChild(help);
    // Коты, улетевшие домой на первом корабле, помогают по рации
    if (isOnRadio(save, cat.id)) {
      const radio = document.createElement('span');
      radio.className = 'helper-radio';
      radio.textContent = '📻 на связи по рации';
      button.appendChild(radio);
    }
    button.addEventListener('click', function () {
      // toggleHelper из logic.js: не больше двух помощников
      activeEncounter.helpers = toggleHelper(activeEncounter.helpers, cat.id);
      updateHelperButtons();
    });
    helperList.appendChild(button);
  }

  updateHelperButtons();
  showScreen('screen-helpers');
  document.getElementById('helpers-go').focus();
}

// Выбранные помощники подсвечены, остальные — обычные
function updateHelperButtons() {
  const buttons = helperList.querySelectorAll('.helper-button');
  for (let i = 0; i < buttons.length; i++) {
    const chosen = activeEncounter.helpers.includes(buttons[i].dataset.catId);
    buttons[i].setAttribute('aria-pressed', chosen ? 'true' : 'false');
  }
  document.getElementById('helpers-count').textContent =
    'Выбрано: ' + activeEncounter.helpers.length + ' из ' + MAX_HELPERS;
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
  // Подсказка для новичка (первые 2 встречи)
  setTip('signal-tip', activeEncounter.showTips ? '👉 Нажми «Поймать!», когда огонёк в зелёной зоне!' : '');
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
  if (hit) {
    questEvent('signal'); // задание «Поймай сигнал» (quests.js)
    activeEncounter.bonus = signalBonus(true); // logic.js
    signalResult.textContent = 'Сигнал пойман! Поблажка в игре: +1 жизнь (или +3 секунды).';
  } else {
    signalResult.textContent = 'Сигнал ускользнул. Ничего страшного — играем дальше!';
  }

  signalButton.classList.add('hidden');
  signalNext.classList.remove('hidden');
  signalNext.focus();
}

// =============================================================
// Часть 2: мини-игры (minigames.js)
// =============================================================
function startGames() {
  const plan = activeEncounter.plan;
  // Помощники (против капитанов) помогают в игре своего типа (logic.js)
  const helperCats = activeEncounter.helpers.map(function (id) { return findCat(id) || findCaptain(id); });
  showScreen('screen-game');
  document.getElementById('game-title').textContent = activeEncounter.cat.name;
  // Кто в какой игре помогает — чтобы показать это во время игры
  const helperNames = {};
  for (let i = 0; i < helperCats.length; i++) {
    const game = MINIGAME_BY_TYPE[helperCats[i].type];
    if (game) helperNames[game] = helperCats[i].name;
  }
  runMinigames(plan.games, { // minigames.js
    difficulty: minigameDifficulty(activeEncounter.cat.rarity),
    bonus: activeEncounter.bonus,
    perks: helperPerks(helperCats),
    helperNames: helperNames,
    winsNeeded: plan.winsNeeded,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, gamesFinished);
}

// Мини-игры закончились: result — { outcome, flawless }
function gamesFinished(result) {
  const encounter = activeEncounter;
  if (!encounter) return;
  encounter.finished = result.outcome;
  encounter.flawless = result.flawless;
  setTimeout(function () {
    if (activeEncounter !== encounter) return; // окно уже закрыли
    if (result.outcome === 'победа') {
      showWinScreen();
    } else {
      showLoseScreen();
    }
  }, RESULT_PAUSE);
}

// =============================================================
// Итог встречи
// =============================================================
function showWinScreen() {
  const cat = activeEncounter.cat;
  const isCaptain = activeEncounter.kind === 'captain';
  // Знакомый кот уже в экипаже — он просто рад встрече и дарит рыбок.
  // isInCrew — из logic.js, save — сохранение из game.js.
  const known = isCaptain ? (save.captains[cat.id] || 0) > 0 : isInCrew(save, cat.id);

  let title = known ? 'Снова встреча!' : 'Кот найден!';
  let button = known ? 'Ура! Забрать ' + REPEAT_CAT_FISH + ' 🐟' : 'Забрать в экипаж';
  if (isCaptain) {
    title = known ? 'Снова победа!' : 'Капитан в экипаже!';
    button = 'Ура! Забрать ' + CAPTAIN_PARTS + ' ' + pluralRu(CAPTAIN_PARTS, 'деталь', 'детали', 'деталей') + ' 🔩';
  }
  document.getElementById('win-title').textContent = title;
  document.getElementById('win-take').textContent = button;

  const circle = document.getElementById('win-circle');
  setCircleColor(circle, cat);
  circle.innerHTML = catFace(cat);
  document.getElementById('win-name').textContent = cat.name;
  document.getElementById('win-stars').textContent = starsText(cat.rarity) + ' ' + cat.rarity;
  document.getElementById('win-info').textContent = 'Тип: ' + cat.type + '. Характер: ' + cat.character + '.';
  document.getElementById('win-fact').textContent = cat.fact;
  showScreen('screen-win');
  startCelebration();
  document.getElementById('win-take').focus();
}

function showLoseScreen() {
  // Портрет смутившегося кота (класс shy делает его тусклым)
  document.getElementById('lose-circle').innerHTML = catFace(activeEncounter.cat);
  const loseText = document.getElementById('lose-text');
  if (activeEncounter.kind === 'captain') {
    loseText.textContent = 'Капитан пока сильнее. Он подождёт у маяка — попробуй ещё раз через 2 минуты!';
  } else {
    loseText.textContent = 'Кот смутился и спрятался. Попробуй ещё раз через минуту!';
  }
  showScreen('screen-lose');
  document.getElementById('lose-ok').focus();
}

// Кнопка «Забрать в экипаж»
function takeCat() {
  const encounter = activeEncounter;
  closeEncounter();
  if (encounter.kind === 'captain') {
    captainWon(encounter.captain); // функция из captains.js
  } else if (encounter.kind === 'guest') {
    guestWon(encounter.cat);       // функция из home.js
  } else {
    catchCat(encounter.capsule);   // функция из game.js
  }
  // Ежедневные задания (quests.js)
  questEvent('catch');
}

// Кнопка «Хорошо» после проигрыша
function catGotShy() {
  const encounter = activeEncounter;
  closeEncounter();
  if (encounter.kind === 'captain') {
    captainLost(encounter.captain); // функция из captains.js
  } else if (encounter.kind === 'guest') {
    guestShy(encounter.cat);        // функция из home.js
  } else {
    makeCatShy(encounter.capsule);  // функция из game.js
  }
}

// Анимация победы: кот подпрыгивает, вокруг разлетаются звёздочки.
// Чтобы анимация сыграла заново, класс сначала убираем, потом ставим.
// Между этим браузер должен «заметить» изменение — для этого читаем
// offsetWidth (это заставляет браузер пересчитать вид элемента).
function startCelebration() {
  const celebrate = document.getElementById('win-celebrate');
  celebrate.classList.remove('celebrate-go');
  void celebrate.offsetWidth;
  celebrate.classList.add('celebrate-go');
}

// Показать подсказку новичку (или спрятать, если text пустой)
function setTip(id, text) {
  const tip = document.getElementById(id);
  tip.textContent = text;
  tip.classList.toggle('hidden', text === '');
}

// =============================================================
// Помощники для внешнего вида
// =============================================================
// Цвет круга: капитан — золотой, легендарный — розовый, иначе по типу кота
function setCircleColor(element, cat) {
  element.classList.remove('circle-water', 'circle-forest', 'circle-city',
    'circle-legendary', 'circle-captain', 'circle-twilight');
  if (cat.type === 'капитан') {
    element.classList.add('circle-captain');
  } else if (cat.rarity === 'легендарный') {
    element.classList.add('circle-legendary');
  } else if (cat.type === 'водный') {
    element.classList.add('circle-water');
  } else if (cat.type === 'лесной') {
    element.classList.add('circle-forest');
  } else if (cat.type === 'городской') {
    element.classList.add('circle-city');
  } else if (cat.type === 'сумеречный') {
    element.classList.add('circle-twilight');
  } else {
    element.classList.add('circle-legendary');
  }
}

// Портрет кота в круге (SVG из art.js). Вставляется через innerHTML —
// это безопасно, потому что картинку рисует сама игра, а не игрок.
function catFace(cat) {
  return catPortrait(cat.id);
}

// Звёздочки редкости: ★☆☆, ★★☆ или ★★★
function starsText(rarity) {
  const stars = rarityStars(rarity); // функция из logic.js
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}
