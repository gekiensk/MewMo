// =============================================================
// MewMo — мини-игры знакомства с котом
// =============================================================
// Вместо «Лапка, Коготь, Клубок» у каждого типа кота своя мини-игра
// (20–30 секунд):
//   водные — «Поймай рыбок», лесные — «Повтори узор»,
//   городские — «Ритм», сумеречные — «Созвездие»;
//   легендарные — две случайные игры подряд; капитаны — три (нужно 2 из 3).
//
// Единый способ запустить:
//   runMinigames(games, options, onDone)
//     games   — список игр, например ['fish'] или ['fish', 'stars'];
//     options — { difficulty, bonus, perks, winsNeeded, reducedMotion };
//     onDone  — функция, которую позовут в конце: onDone({ outcome, flawless }),
//               outcome — 'победа' или 'поражение'.
//   stopMinigame() — остановить игру (например, окно закрыли).
//
// Правила и расчёты каждой игры — в logic.js (fishSettings и т. п.),
// здесь только экран, касания пальцем и анимация.

// ----- Правила игр: подсказка-плашка при первом знакомстве с игрой -----
const GAME_RULES = {
  fish: 'Води пальцем по полю — корзинка поедет за ним. Лови рыбок, а пузыри — не лови: пойманный пузырь отнимает жизнь.',
  pattern: 'Светлячки мигнут по очереди. Запомни и нажми их в том же порядке. Одна ошибка разрешена.',
  rhythm: 'Кольцо сжимается к кругу. Нажми на круг, когда кольцо с ним совпадёт.',
  stars: 'Нажимай звёзды по порядку номеров: 1, 2, 3… Звёзды медленно гаснут — успей!'
};

// Как помогает помощник (коротко, для строки под игрой)
const HELPER_SHORT = {
  fish: 'корзинка шире',
  pattern: 'узор покажут ещё раз',
  rhythm: 'музыка медленнее',
  stars: 'звёзды гаснут дольше'
};

// ----- Состояние -----
let currentGame = null; // запущенная игра: объект с функцией stop()
let gameTimer = null;   // пауза между играми

// ----- Элементы -----
const gameArea = document.getElementById('game-area');
const gameStatus = document.getElementById('game-status');
const gameProgress = document.getElementById('game-progress');

// =============================================================
// Запуск серии мини-игр
// =============================================================
function runMinigames(games, options, onDone) {
  const series = { index: 0, wins: 0, losses: 0, flawless: true };
  const maxLosses = games.length - options.winsNeeded; // сколько можно проиграть

  function updateProgress() {
    let text = MINIGAME_NAMES[games[series.index]] || '';
    if (games.length > 1) {
      text = 'Игра ' + (series.index + 1) + ' из ' + games.length + ': ' + text +
        '. Побед: ' + series.wins + ' (нужно ' + options.winsNeeded + ')';
    }
    gameProgress.textContent = text;
  }

  function nextGame() {
    if (series.wins >= options.winsNeeded) {
      finishSeries('победа');
      return;
    }
    if (series.losses > maxLosses || series.index >= games.length) {
      finishSeries('поражение');
      return;
    }
    updateProgress();
    const game = games[series.index];
    showRulesIfNew(game, function () {
      // Если в этой игре помогает кот из экипажа — пишем об этом
      const helper = options.helperNames && options.helperNames[game];
      gameStatus.textContent = helper ? 'Помогает ' + helper + ': ' + HELPER_SHORT[game] : '';
      startGame(game, options, gameOver);
    });
  }

  // Одна игра закончилась: win — победа, flawless — без потерянных жизней
  function gameOver(win, flawless) {
    currentGame = null;
    series.index = series.index + 1;
    if (win) {
      series.wins = series.wins + 1;
      questEvent('gameWin');                 // задание «Выиграй 3 мини-игры» (quests.js)
      if (flawless) questEvent('perfectWin'); // задание «…не потеряв ни одной жизни»
      gameStatus.textContent = 'Получилось! 🎉';
    } else {
      series.losses = series.losses + 1;
      series.flawless = false;
      gameStatus.textContent = 'Не вышло… Ничего страшного!';
    }
    if (!flawless) series.flawless = false;
    // Небольшая пауза, чтобы прочитать итог
    gameTimer = setTimeout(nextGame, 1300);
  }

  function finishSeries(outcome) {
    onDone({ outcome: outcome, flawless: series.flawless });
  }

  nextGame();
}

// Остановить всё (окно закрыли посреди игры)
function stopMinigame() {
  clearTimeout(gameTimer);
  if (currentGame) currentGame.stop();
  currentGame = null;
  gameArea.textContent = '';
}

// Плашка с правилами — только при первом знакомстве с игрой.
// Какие игры уже объясняли — в сохранении (save.seenGames).
function showRulesIfNew(game, start) {
  if (save.seenGames.includes(game)) {
    start();
    return;
  }
  gameArea.textContent = '';
  const plaque = document.createElement('div');
  plaque.className = 'game-rules';
  const title = document.createElement('p');
  title.className = 'game-rules-title';
  title.textContent = 'Новая игра: «' + MINIGAME_NAMES[game] + '»';
  const text = document.createElement('p');
  text.textContent = GAME_RULES[game];
  const button = document.createElement('button');
  button.className = 'big-button';
  button.textContent = 'Понятно!';
  button.addEventListener('click', function () {
    save.seenGames.push(game);
    saveGame(); // game.js
    start();
  });
  plaque.appendChild(title);
  plaque.appendChild(text);
  plaque.appendChild(button);
  gameArea.appendChild(plaque);
  button.focus();
}

// Запустить одну игру по названию
function startGame(game, options, finish) {
  const starters = { fish: startFishGame, pattern: startPatternGame, rhythm: startRhythmGame, stars: startStarsGame };
  const starter = starters[game] || startFishGame;
  currentGame = starter(options, finish);
}

// Строка над полем: «Рыбки: 3 из 8 · ♥♥ · 18 с»
function setHud(text) {
  const hud = gameArea.querySelector('.game-hud');
  if (hud) hud.textContent = text;
}

// Сердечки жизней: ♥♥
function livesText(lives) {
  return lives > 0 ? '♥'.repeat(lives) : '—';
}

// =============================================================
// «Поймай рыбок» (водные коты)
// =============================================================
function startFishGame(options, finish) {
  const settings = fishSettings(options.difficulty, options.bonus, options.perks.fish, options.reducedMotion); // logic.js

  gameArea.innerHTML =
    '<p class="game-hud"></p>' +
    '<div class="game-field fish-field" aria-label="Поле: веди пальцем, чтобы двигать корзинку">' +
    '<div class="fish-basket">' + basketSprite() + '</div></div>';
  const field = gameArea.querySelector('.fish-field');
  const basket = gameArea.querySelector('.fish-basket');
  basket.style.width = (settings.basketWidth * 100) + '%';

  const state = {
    basketX: 0.5, caught: 0, lives: settings.lives, lostLife: false,
    items: [], nextSpawn: 0.4, start: performance.now(), frame: null, over: false
  };

  // Корзинка едет за пальцем (или мышкой)
  function moveBasket(event) {
    const rect = field.getBoundingClientRect();
    const half = settings.basketWidth / 2;
    const x = (event.clientX - rect.left) / rect.width;
    state.basketX = Math.min(1 - half, Math.max(half, x));
  }
  field.addEventListener('pointermove', moveBasket);
  field.addEventListener('pointerdown', moveBasket);
  // На компьютере — стрелки влево и вправо
  function keys(event) {
    if (event.key === 'ArrowLeft') state.basketX = Math.max(settings.basketWidth / 2, state.basketX - 0.08);
    if (event.key === 'ArrowRight') state.basketX = Math.min(1 - settings.basketWidth / 2, state.basketX + 0.08);
  }
  document.addEventListener('keydown', keys);

  function frame() {
    const time = (performance.now() - state.start) / 1000;

    // Новые рыбки и пузыри
    while (state.nextSpawn <= time) {
      const item = makeFallingItem(settings, Math.random, state.nextSpawn); // logic.js
      item.element = document.createElement('div');
      item.element.className = 'fish-item';
      item.element.dataset.kind = item.kind; // 'рыбка' или 'пузырь' (нужно для проверки tools/smoke.js)
      item.element.innerHTML = item.kind === 'рыбка' ? fishSprite() : bubbleSprite();
      item.element.style.left = (item.x * 100) + '%';
      field.appendChild(item.element);
      state.items.push(item);
      state.nextSpawn = state.nextSpawn + settings.spawnEvery;
    }

    // Двигаем всё вниз и проверяем, что попало в корзинку
    const stillFalling = [];
    for (let i = 0; i < state.items.length; i++) {
      const item = state.items[i];
      const y = fallingY(item, time, settings.fallTime); // logic.js
      item.element.style.top = (y * 88) + '%';
      if (y >= 0.88) {
        if (isCaughtByBasket(item.x, state.basketX, settings.basketWidth)) {
          if (item.kind === 'рыбка') {
            state.caught = state.caught + 1;
            playTone(523, 0.15); // мягкое «дзынь»
          } else {
            state.lives = state.lives - 1;
            state.lostLife = true;
            playSound('oops');
          }
          item.element.remove();
          continue;
        }
        if (y > 1.02) { // упало мимо — просто исчезает
          item.element.remove();
          continue;
        }
      }
      stillFalling.push(item);
    }
    state.items = stillFalling;
    basket.style.left = (state.basketX * 100) + '%';

    const timeLeft = Math.max(0, settings.duration - time);
    setHud('Рыбки: ' + state.caught + ' из ' + settings.goal + ' · Жизни: ' + livesText(state.lives) +
      ' · ' + Math.ceil(timeLeft) + ' с');

    const outcome = fishOutcome(state.caught, settings.goal, state.lives, timeLeft); // logic.js
    if (outcome) {
      stop();
      finish(outcome === 'победа', !state.lostLife);
      return;
    }
    state.frame = requestAnimationFrame(frame);
  }

  function stop() {
    if (state.over) return;
    state.over = true;
    cancelAnimationFrame(state.frame);
    field.removeEventListener('pointermove', moveBasket);
    field.removeEventListener('pointerdown', moveBasket);
    document.removeEventListener('keydown', keys);
  }

  state.frame = requestAnimationFrame(frame);
  return { stop: stop };
}

// =============================================================
// «Повтори узор» (лесные коты)
// =============================================================
// 4 светлячка мигают по очереди — у каждого свой цвет и своя нота.
const FIREFLY_COLORS = ['#F5D88E', '#9FD8C8', '#F4A7B9', '#A9D3F0'];
const FIREFLY_NOTES = [262, 330, 392, 523]; // до, ми, соль, до (мягко)

function startPatternGame(options, finish) {
  const settings = patternSettings(options.difficulty, options.bonus, options.perks.pattern, options.reducedMotion); // logic.js
  const state = {
    game: { pattern: makePattern(settings.length, Math.random), position: 0, mistakes: 0, mistakesAllowed: settings.mistakesAllowed },
    showing: true, // пока показываем узор — нажимать нельзя
    timers: [],
    over: false
  };

  let html = '<p class="game-hud"></p><div class="game-field pattern-field">';
  for (let i = 0; i < 4; i++) {
    html = html + '<button class="firefly" data-index="' + i + '" aria-label="Светлячок ' + (i + 1) + '">' +
      fireflySprite(FIREFLY_COLORS[i]) + '</button>';
  }
  gameArea.innerHTML = html + '</div>';
  const flies = gameArea.querySelectorAll('.firefly');

  function hud(text) {
    setHud(text + ' · Ошибок можно: ' + Math.max(0, state.game.mistakesAllowed - state.game.mistakes));
  }

  // Зажечь светлячка index на время flashTime
  function flash(index) {
    flies[index].classList.add('lit');
    playTone(FIREFLY_NOTES[index], settings.flashTime * 0.8);
    state.timers.push(setTimeout(function () { flies[index].classList.remove('lit'); }, settings.flashTime * 1000));
  }

  // Показать узор (times — сколько раз подряд), потом ждать нажатий
  function show(times) {
    state.showing = true;
    hud('Смотри…');
    const step = (settings.flashTime + settings.gapTime) * 1000;
    let delay = 600;
    for (let t = 0; t < times; t++) {
      for (let i = 0; i < state.game.pattern.length; i++) {
        const index = state.game.pattern[i];
        state.timers.push(setTimeout(function () { flash(index); }, delay));
        delay = delay + step;
      }
      delay = delay + 700; // пауза между повторами
    }
    state.timers.push(setTimeout(function () {
      state.showing = false;
      hud('Повтори! Нажато: 0 из ' + state.game.pattern.length);
    }, delay));
  }

  function press(event) {
    const button = event.target.closest('.firefly');
    if (!button || state.showing || state.over) return;
    const index = Number(button.dataset.index);
    flash(index);
    const step = patternPress(state.game, index); // logic.js
    state.game = step.state;
    if (step.result === 'верно') {
      hud('Повтори! Нажато: ' + state.game.position + ' из ' + state.game.pattern.length);
    } else if (step.result === 'ошибка') {
      playSound('oops');
      gameStatus.textContent = 'Ошибка — смотри ещё раз!';
      show(1);
    } else {
      stop();
      finish(step.result === 'победа', state.game.mistakes === 0);
    }
  }
  gameArea.addEventListener('click', press);

  function stop() {
    if (state.over) return;
    state.over = true;
    state.timers.forEach(clearTimeout);
    gameArea.removeEventListener('click', press);
  }

  // Помощник — лесной кот: в начале узор показывают два раза
  show(settings.showTwice ? 2 : 1);
  return { stop: stop };
}

// =============================================================
// «Ритм» (городские коты)
// =============================================================
// Кольцо сжимается к кругу; нажать на круг, когда они совпали.
// Под каждую ноту играет спокойная мелодия.
const RHYTHM_MELODY = [262, 330, 392, 330, 349, 294, 330, 262];

function startRhythmGame(options, finish) {
  const settings = rhythmSettings(options.difficulty, options.bonus, options.perks.rhythm, options.reducedMotion); // logic.js
  gameArea.innerHTML =
    '<p class="game-hud"></p>' +
    '<div class="game-field rhythm-field">' +
    '<div class="rhythm-ring"></div>' +
    '<button class="rhythm-target" aria-label="Нажми, когда кольцо совпадёт с кругом">Жми!</button>' +
    '</div>';
  const ring = gameArea.querySelector('.rhythm-ring');
  const target = gameArea.querySelector('.rhythm-target');
  const state = { start: performance.now(), note: 0, hits: 0, misses: 0, judged: [], played: -1, frame: null, over: false };

  function now() {
    return (performance.now() - state.start) / 1000;
  }

  function hud() {
    setHud('Попаданий: ' + state.hits + ' (нужно ' + settings.needed + ') · Нота ' +
      Math.min(state.note + 1, settings.notes) + ' из ' + settings.notes);
  }

  // Нажатие: ищем ноту, которая сейчас совпадает с кругом
  function tap() {
    if (state.over) return;
    const time = now();
    for (let n = 0; n < settings.notes; n++) {
      if (state.judged[n]) continue;
      if (rhythmHit(time, rhythmTargetTime(n, settings), settings.window)) { // logic.js
        state.judged[n] = 'попал';
        state.hits = state.hits + 1;
        playTone(784, 0.12);
        gameStatus.textContent = 'В точку!';
        target.classList.add('hit');
        setTimeout(function () { target.classList.remove('hit'); }, 200);
        check();
        return;
      }
    }
    gameStatus.textContent = 'Рано или поздно — подожди кольцо';
  }
  target.addEventListener('click', tap);

  function check() {
    hud();
    const outcome = rhythmOutcome(state.hits, state.misses, settings); // logic.js
    if (outcome || state.note >= settings.notes) {
      stop();
      finish(outcome === 'победа' || state.hits >= settings.needed, state.misses === 0);
    }
  }

  function frame() {
    const time = now();
    // Текущая нота — первая, у которой ещё не прошло время совпадения
    while (state.note < settings.notes && time > rhythmTargetTime(state.note, settings) + settings.window) {
      if (!state.judged[state.note]) {
        state.judged[state.note] = 'мимо';
        state.misses = state.misses + 1;
        gameStatus.textContent = 'Мимо';
      }
      state.note = state.note + 1;
      check();
      if (state.over) return;
    }
    // Мелодия: каждая нота звучит один раз — в момент совпадения кольца с кругом
    if (state.note < settings.notes && state.played < state.note && time >= rhythmTargetTime(state.note, settings)) {
      state.played = state.note;
      playTone(RHYTHM_MELODY[state.note % RHYTHM_MELODY.length], 0.3);
    }
    // Размер кольца: от 100% поля до размера круга
    const size = Math.max(0, rhythmRingSize(state.note, time, settings)); // logic.js
    ring.style.width = (30 + size * 62) + '%'; // высота — такая же (aspect-ratio в style.css)
    state.frame = requestAnimationFrame(frame);
  }

  function stop() {
    if (state.over) return;
    state.over = true;
    cancelAnimationFrame(state.frame);
    target.removeEventListener('click', tap);
  }

  hud();
  state.frame = requestAnimationFrame(frame);
  return { stop: stop };
}

// =============================================================
// «Созвездие» (сумеречные коты)
// =============================================================
// Звёзды с номерами медленно гаснут; нажимай по порядку. Получилось —
// звёзды соединяются, и появляется силуэт кота.
function startStarsGame(options, finish) {
  const settings = starsSettings(options.difficulty, options.bonus, options.perks.stars); // logic.js
  const stars = constellationStars(settings.count); // logic.js
  let html = '<p class="game-hud"></p><div class="game-field stars-field">' +
    '<svg class="constellation" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>';
  for (let i = 0; i < stars.length; i++) {
    html = html + '<button class="star-button" data-number="' + stars[i].number + '" style="left:' +
      (stars[i].x * 100) + '%; top:' + (stars[i].y * 100) + '%" aria-label="Звезда ' + stars[i].number + '">' +
      starSprite() + '<span class="star-number">' + stars[i].number + '</span></button>';
  }
  gameArea.innerHTML = html + '</div>';
  const buttons = gameArea.querySelectorAll('.star-button');
  const state = { next: 1, start: performance.now(), frame: null, over: false, timer: null };

  function press(event) {
    const button = event.target.closest('.star-button');
    if (!button || state.over) return;
    const step = starPress(state.next, Number(button.dataset.number), settings.count); // logic.js
    if (step.result === 'мимо') {
      gameStatus.textContent = 'Ищи звезду номер ' + state.next;
      return;
    }
    state.next = step.next;
    button.classList.add('done');
    playTone(392 + state.next * 40, 0.2);
    if (step.result === 'победа') {
      drawConstellation();
      stop();
      // Секунду любуемся силуэтом кота
      state.timer = setTimeout(function () { finish(true, true); }, 1200);
    }
  }
  gameArea.addEventListener('click', press);

  // Линии между звёздами по порядку и силуэт кота
  function drawConstellation() {
    let points = '';
    for (let i = 0; i < CAT_CONSTELLATION.length; i++) {
      points = points + (CAT_CONSTELLATION[i][0] * 100) + ',' + (CAT_CONSTELLATION[i][1] * 100) + ' ';
    }
    gameArea.querySelector('.constellation').innerHTML =
      '<polygon points="' + points.trim() + '" fill="#F5D88E" fill-opacity="0.25" stroke="#F5D88E" stroke-width="0.8"/>';
    gameStatus.textContent = 'Из звёзд сложился кот!';
  }

  function frame() {
    const time = (performance.now() - state.start) / 1000;
    const brightness = starsBrightness(time, settings.fadeTime); // logic.js
    for (let i = 0; i < buttons.length; i++) {
      if (!buttons[i].classList.contains('done')) buttons[i].style.opacity = 0.25 + brightness * 0.75;
    }
    setHud('Следующая: ' + state.next + ' · Звёзды гаснут: ' + Math.ceil(Math.max(0, settings.fadeTime - time)) + ' с');
    if (brightness <= 0) {
      stop();
      finish(false, false);
      return;
    }
    state.frame = requestAnimationFrame(frame);
  }

  function stop() {
    if (state.over) return;
    state.over = true;
    cancelAnimationFrame(state.frame);
    gameArea.removeEventListener('click', press);
  }

  state.frame = requestAnimationFrame(frame);
  return {
    stop: function () { stop(); clearTimeout(state.timer); }
  };
}
