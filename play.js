// =============================================================
// MewMo — игры с котами (режим «Дом»)
// =============================================================
// Кнопка «Игры» в убежище (или «Поиграть» в карточке кота):
//   1. выбираем кота из экипажа;
//   2. выбираем игру:
//      • «Лазерная указка» — водишь пальцем по полю, кот бежит за
//        светящейся точкой и ловит её;
//      • «Мячик» — смахни мячик пальцем, он катится и отскакивает
//        от стенок, кот бежит за ним и приносит обратно;
//   3. играем PLAY_SECONDS секунд (30). Проиграть нельзя.
// С каждым котом раз в день игра даёт +2 очка дружбы (logic.js:
// applyPlayReward). Играть можно сколько угодно.
// При «уменьшить движение» кот и мячик двигаются вдвое медленнее.

// ----- Состояние -----
let playCat = null;    // с каким котом играем
let playGame = null;   // идущая игра: { kind, field, pet, toy, ... }

// ----- Элементы -----
const playWindow = document.getElementById('play');
const playViews = ['play-pick', 'play-choose', 'play-game', 'play-end'].map(function (id) {
  return document.getElementById(id);
});

// Картинки на кнопках выбора игры (art.js)
document.getElementById('play-laser-icon').innerHTML = laserDotSprite();
document.getElementById('play-ball-icon').innerHTML = toyBallSprite();

// ----- Кнопки -----
document.getElementById('home-play').addEventListener('click', function () { openPlay(null); });
document.getElementById('care-play').addEventListener('click', function () {
  const cat = careCat; // home.js: кот, чья карточка открыта
  closeCare();         // home.js
  openPlay(cat);
});
document.getElementById('play-close').addEventListener('click', closePlay);
document.getElementById('play-other').addEventListener('click', showPlayPick);
document.getElementById('play-laser').addEventListener('click', function () { startPlay('laser'); });
document.getElementById('play-ball').addEventListener('click', function () { startPlay('ball'); });
document.getElementById('play-again').addEventListener('click', showPlayChoose);
document.getElementById('play-done').addEventListener('click', closePlay);
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && !playWindow.classList.contains('hidden')) closePlay();
});

// cat — сразу этот кот (из карточки) или null — сначала выбрать кота
function openPlay(cat) {
  playWindow.classList.remove('hidden');
  if (cat) {
    playCat = cat;
    showPlayChoose();
  } else {
    showPlayPick();
  }
}

// Закрыть окно. Если игра шла — она просто заканчивается без очков.
function closePlay() {
  stopPlay();
  playWindow.classList.add('hidden');
}

function showPlayView(view) {
  for (let i = 0; i < playViews.length; i++) {
    playViews[i].classList.toggle('hidden', playViews[i] !== view);
  }
}

function today() {
  return localDayKey(new Date()); // logic.js
}

// =============================================================
// 1. Выбор кота
// =============================================================
function showPlayPick() {
  stopPlay();
  const box = playViews[0];
  box.textContent = '';
  showPlayView(box);

  // Коты убежища (те же, что сидят на полу)
  const cats = shelterCats(CATS.concat(CAPTAINS), save, 12).shown; // logic.js
  const text = document.createElement('p');
  text.className = 'screen-text small-text';
  box.appendChild(text);
  if (cats.length === 0) {
    text.textContent = 'В экипаже пока нет котов. Найди их на прогулке или познакомься с гостем!';
    return;
  }
  text.textContent = 'С кем поиграем? Игра с каждым котом раз в день даёт +' + PLAY_POINTS + ' очка дружбы.';
  const grid = document.createElement('div');
  grid.className = 'play-cats';
  for (let i = 0; i < cats.length; i++) {
    grid.appendChild(makePlayCatButton(cats[i]));
  }
  box.appendChild(grid);
  // Первое знакомство с играми — плашка-подсказка (minigames.js)
  showHintPlaque('play', box, 'Как это работает',
    'Выбери кота и игру: «Лазерная указка» или «Мячик». Проиграть нельзя — просто играй! ' +
    'Раз в день игра с каждым котом даёт +' + PLAY_POINTS + ' очка дружбы.');
}

function makePlayCatButton(cat) {
  const button = document.createElement('button');
  button.className = 'play-cat-button';
  const circle = document.createElement('span');
  circle.className = 'mini-circle';
  setCircleColor(circle, cat); // encounter.js
  circle.innerHTML = catPortrait(cat.id); // art.js
  const name = document.createElement('span');
  name.textContent = cat.name.replace('Капитан ', '');
  const mark = document.createElement('span');
  mark.className = 'play-cat-mark';
  mark.textContent = canGetPlayPoints(save, cat.id, today()) ? '+' + PLAY_POINTS + ' ♥' : '✓ сегодня';
  button.appendChild(circle);
  button.appendChild(name);
  button.appendChild(mark);
  button.setAttribute('aria-label', 'Поиграть: ' + cat.name);
  button.addEventListener('click', function () {
    playCat = cat;
    showPlayChoose();
  });
  return button;
}

// =============================================================
// 2. Выбор игры
// =============================================================
function showPlayChoose() {
  stopPlay();
  showPlayView(playViews[1]);
  const circle = document.getElementById('play-cat-circle');
  setCircleColor(circle, playCat);
  circle.innerHTML = catPortrait(playCat.id);
  document.getElementById('play-cat-name').textContent = playCat.name;
  document.getElementById('play-reward-note').textContent = canGetPlayPoints(save, playCat.id, today())
    ? 'Поиграй ' + PLAY_SECONDS + ' секунд — и дружба вырастет на ' + PLAY_POINTS + ' очка.'
    : 'Сегодня вы уже играли — очки дружбы будут завтра. Но играть можно сколько хочешь!';
  document.getElementById('play-laser').focus();
}

// =============================================================
// 3. Игра
// =============================================================
function startPlay(kind) {
  showPlayView(playViews[2]);
  // Поле каждый раз новое (копия без детей и без старых обработчиков нажатий)
  const oldField = document.getElementById('play-field');
  const field = oldField.cloneNode(false);
  oldField.replaceWith(field);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Кот на поле
  const pet = document.createElement('div');
  pet.className = 'play-pet';
  setCircleColor(pet, playCat);
  pet.innerHTML = catPortrait(playCat.id);
  field.appendChild(pet);

  // Игрушка: точка или мячик
  const toy = document.createElement('div');
  toy.className = kind === 'laser' ? 'play-dot' : 'play-toy';
  toy.innerHTML = kind === 'laser' ? laserDotSprite() : toyBallSprite();
  field.appendChild(toy);

  // Подсказка сверху поля
  const tip = document.createElement('p');
  tip.className = 'play-tip';
  tip.textContent = kind === 'laser' ? 'Води пальцем по полю' : 'Смахни мячик пальцем вверх';
  field.appendChild(tip);

  const width = field.clientWidth;
  const height = field.clientHeight;
  playGame = {
    kind: kind,
    field: field, pet: pet, toy: toy, tip: tip,
    width: width, height: height,
    elapsed: 0, last: performance.now(), frame: 0,
    count: 0,                                   // сколько раз поймал точку / принёс мячик
    catSpeed: playSpeed(kind === 'laser' ? LASER_CAT_SPEED : BALL_CAT_SPEED, reducedMotion),
    slowThrow: reducedMotion,
    petPos: { x: width / 2 + 70, y: height - 50 },
    // лазер: где точка; можно ли засчитать «поймал» (после поимки точку надо увести)
    target: { x: width / 2, y: height / 3 }, armed: true,
    // мячик: где лежит и как летит; ready → flying → fetch → back
    ballHome: { x: width / 2, y: height - 60 },
    ball: { x: width / 2, y: height - 60, vx: 0, vy: 0 }, state: 'ready',
    swipe: null
  };

  if (kind === 'laser') {
    field.addEventListener('pointerdown', laserMove);
    field.addEventListener('pointermove', laserMove);
  } else {
    field.addEventListener('pointerdown', ballSwipeStart);
    field.addEventListener('pointerup', ballSwipeEnd);
  }
  drawPlay();
  updatePlayHud();
  playGame.frame = requestAnimationFrame(playFrame);
}

// Остановить игру (без награды)
function stopPlay() {
  if (playGame) cancelAnimationFrame(playGame.frame);
  playGame = null;
}

// Где палец внутри поля
function fieldPoint(event) {
  const rect = playGame.field.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(playGame.width, event.clientX - rect.left)),
    y: Math.max(0, Math.min(playGame.height, event.clientY - rect.top))
  };
}

// «Лазерная указка»: точка — там, где палец (только пока палец на поле)
function laserMove(event) {
  if (!playGame || playGame.kind !== 'laser') return;
  if (event.type === 'pointermove' && event.buttons === 0 && event.pointerType === 'mouse') return;
  playGame.target = fieldPoint(event);
  playGame.tip.textContent = '';
}

// «Мячик»: запоминаем, где и когда палец коснулся поля…
function ballSwipeStart(event) {
  if (!playGame || playGame.state !== 'ready') return;
  playGame.swipe = { point: fieldPoint(event), time: performance.now() };
}

// …и бросаем мячик в ту сторону, куда смахнули
function ballSwipeEnd(event) {
  if (!playGame || playGame.state !== 'ready' || !playGame.swipe) return;
  const end = fieldPoint(event);
  const dx = end.x - playGame.swipe.point.x;
  const dy = end.y - playGame.swipe.point.y;
  const ms = performance.now() - playGame.swipe.time;
  playGame.swipe = null;
  if (Math.sqrt(dx * dx + dy * dy) < 20) return; // это было нажатие, а не взмах
  let velocity = throwVelocity(dx, dy, ms); // logic.js
  if (playGame.slowThrow) velocity = { vx: velocity.vx / 2, vy: velocity.vy / 2 };
  playGame.ball.vx = velocity.vx;
  playGame.ball.vy = velocity.vy;
  playGame.state = 'flying';
  playGame.tip.textContent = '';
  playTone(440, 0.1);
}

// Один кадр игры (примерно 60 раз в секунду)
function playFrame(now) {
  const game = playGame;
  if (!game) return;
  const seconds = Math.min(0.05, (now - game.last) / 1000); // если вкладка «спала» — не прыгаем
  game.last = now;
  game.elapsed = game.elapsed + seconds;

  if (game.kind === 'laser') {
    laserFrame(game, seconds);
  } else {
    ballFrame(game, seconds);
  }
  drawPlay();
  updatePlayHud();

  if (game.elapsed >= PLAY_SECONDS) {
    finishPlay();
    return;
  }
  game.frame = requestAnimationFrame(playFrame);
}

function laserFrame(game, seconds) {
  game.petPos = chaseStep(game.petPos, game.target, game.catSpeed, seconds); // logic.js
  const distance = pointDistance(game.petPos, game.target);
  if (game.armed && distance < 24) {
    game.armed = false;
    game.count = game.count + 1;
    playTone(523, 0.12);
    catHop(game.pet);
  } else if (!game.armed && distance > 70) {
    game.armed = true; // точку увели — можно ловить снова
  }
}

function ballFrame(game, seconds) {
  if (game.state === 'flying') {
    game.ball = ballStep(game.ball, seconds, game.width, game.height, 18); // logic.js
    if (ballStopped(game.ball)) game.state = 'fetch';
  } else if (game.state === 'fetch') {
    // кот бежит к мячику
    game.petPos = chaseStep(game.petPos, game.ball, game.catSpeed, seconds);
    if (pointDistance(game.petPos, game.ball) < 2) {
      game.state = 'back';
      playTone(392, 0.1);
    }
  } else if (game.state === 'back') {
    // кот несёт мячик обратно (мячик — у него во рту)
    const home = { x: game.ballHome.x + 50, y: game.ballHome.y };
    game.petPos = chaseStep(game.petPos, home, game.catSpeed, seconds);
    game.ball = { x: game.petPos.x - 26, y: game.petPos.y + 20, vx: 0, vy: 0 };
    if (pointDistance(game.petPos, home) < 2) {
      game.ball = { x: game.ballHome.x, y: game.ballHome.y, vx: 0, vy: 0 };
      game.state = 'ready';
      game.count = game.count + 1;
      playTone(523, 0.12);
      catHop(game.pet);
    }
  }
}

// Кот подпрыгивает от радости
function catHop(pet) {
  pet.classList.remove('play-hop');
  void pet.offsetWidth; // перезапуск анимации
  pet.classList.add('play-hop');
}

// Ставим кота и игрушку на свои места
function drawPlay() {
  const game = playGame;
  game.pet.style.left = game.petPos.x + 'px';
  game.pet.style.top = game.petPos.y + 'px';
  const toyPos = game.kind === 'laser' ? game.target : game.ball;
  game.toy.style.left = toyPos.x + 'px';
  game.toy.style.top = toyPos.y + 'px';
}

function updatePlayHud() {
  const game = playGame;
  const left = Math.max(0, Math.ceil(PLAY_SECONDS - game.elapsed));
  document.getElementById('play-hud').textContent = (game.kind === 'laser'
    ? 'Поймал точку: ' + game.count
    : 'Принёс мячик: ' + game.count) + ' · ' + left + ' с';
  document.getElementById('play-time').style.width = Math.min(100, game.elapsed / PLAY_SECONDS * 100) + '%';
}

// =============================================================
// 4. Конец игры
// =============================================================
function finishPlay() {
  const game = playGame;
  stopPlay();
  const result = applyPlayReward(save, playCat.id, today()); // logic.js
  save = result.save;
  saveGame();
  playSound(result.levelUp ? 'crew' : 'meow');

  showPlayView(playViews[3]);
  const circle = document.getElementById('play-end-circle');
  setCircleColor(circle, playCat);
  circle.innerHTML = catPortrait(playCat.id);
  document.getElementById('play-end-text').textContent = playCat.name + ' наигрался! ' +
    (game.kind === 'laser' ? 'Поймал точку: ' + game.count : 'Принёс мячик: ' + game.count);
  let note = result.given
    ? 'Дружба +' + PLAY_POINTS + ' очка ♥'
    : 'Очки дружбы за игру — раз в день с каждым котом. Приходи завтра!';
  if (result.levelUp) note = note + ' Дружба выросла! ' + friendshipHearts(result.level);
  document.getElementById('play-end-note').textContent = note;
  document.getElementById('play-done').focus();
}
