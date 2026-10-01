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
      gameStatus.textContent = '';
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
  const starters = { fish: startFishGame };
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
