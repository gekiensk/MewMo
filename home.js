// =============================================================
// MewMo — режим «Дом»: убежище корабля
// =============================================================
// В режиме «Дом» геолокация НЕ запрашивается, а карта не создаётся.
// Вместо карты — «Убежище»: уютный отсек космического корабля
// (картинка shelterScene из art.js), на полу — коты из экипажа.
//
//   • Нажал на кота из экипажа → карточка и кнопка «Угостить рыбкой».
//     Каждые 5 угощений — новый уровень дружбы (сердечки, максимум 5).
//   • Раз в 3 часа прилетает кот-гость (не больше 3 гостей).
//     Знакомство с гостем — та же мини-игра из encounter.js.
//
// Правила (прилёт гостей, дружба) — в logic.js, а здесь только экран.

// ----- Настройки -----
const HOME_CHECK_TIME = 30000; // раз в 30 секунд проверяем, не прилетел ли гость

// Места котов на полу: [слева в %, сверху в %] — 3 ряда по 4 кота
const CREW_SLOTS = [
  [16, 57], [39, 57], [62, 57], [85, 57],
  [16, 69], [39, 69], [62, 69], [85, 69],
  [16, 81], [39, 81], [62, 81], [85, 81]
];
// Места гостей — прямо под иллюминатором
const GUEST_SLOTS = [[27, 43], [50, 45], [73, 43]];

// ----- Состояние -----
let homeTimer = null;      // таймер проверки гостей
let guestShyUntil = {};    // гость смутился после проигрыша: id → до какого времени (мс)
let careCat = null;        // кот, чья карточка заботы открыта

// ----- Находим элементы -----
const homeScreen = document.getElementById('home');
const homeCats = document.getElementById('home-cats');
const careWindow = document.getElementById('care');

// Картинка убежища рисуется один раз
document.getElementById('home-scene').innerHTML = shelterScene();

// ----- Кнопки -----
document.getElementById('home-button').addEventListener('click', startHome);
document.getElementById('care-close').addEventListener('click', closeCare);
document.getElementById('care-feed').addEventListener('click', feedCareCat);
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && !careWindow.classList.contains('hidden')) {
    closeCare();
  }
});

// =============================================================
// Стартовый экран и переключение режимов
// =============================================================
// Если взрослый включил «Только режим „Дом“», кнопки «Гулять» нет.
// Вызывается из game.js при загрузке и из настроек.
function renderStartScreen() {
  const homeOnly = save.settings.homeOnly;
  document.getElementById('start-button').classList.toggle('hidden', homeOnly);
  document.getElementById('home-only-note').classList.toggle('hidden', !homeOnly);
}

// Переключить режим (кнопка в настройках)
function switchMode() {
  if (gameMode === 'home') {
    startWalk(); // из game.js
  } else {
    startHome();
  }
}

// =============================================================
// Запуск режима «Дом»
// =============================================================
function startHome() {
  initSound();       // sound.js — звук включается по нажатию
  startPlayClock();  // settings.js — часы игры
  stopWalk();        // game.js — перестаём следить за GPS, если гуляли

  gameMode = 'home';
  startScreen.classList.add('hidden');
  document.body.classList.add('mode-home');
  homeScreen.classList.remove('hidden');
  setStatus('Ты в убежище корабля.');

  checkGuests(false);
  renderHome();
  if (!homeTimer) {
    homeTimer = setInterval(function () {
      if (gameMode === 'home') checkGuests(true);
    }, HOME_CHECK_TIME);
  }
}

// Спрятать убежище (при переходе на прогулку — вызывается из game.js)
function hideHome() {
  if (decorEditing) stopDecorEdit(); // decor.js
  homeScreen.classList.add('hidden');
  document.body.classList.remove('mode-home');
  closeCare();
}

// Прилетел ли кто-нибудь. announce — показать подсказку о новом госте.
function checkGuests(announce) {
  const before = save.guests.list.length;
  const hourOf = function (ms) { return new Date(ms).getHours(); }; // местный час
  // Гости — коты текущей главы и «отставшие» (logic.js)
  save.guests = updateGuests(save.guests, Date.now(), CATS, hourOf, Math.random, save);
  saveGame();
  if (save.guests.list.length > before) {
    renderHome();
    if (announce) {
      playSound('meow');
      showToast('В убежище прилетел гость! Познакомься с ним.');
    }
  }
}

// =============================================================
// Рисуем убежище
// =============================================================
function renderHome() {
  homeCats.textContent = '';
  renderDecor(); // decor.js — предметы обстановки

  // Коты на полу: экипаж текущей главы, найденные отставшие и капитаны
  // главы. Мест 12 — если котов больше, показываем самых дружных
  // (shelterCats из logic.js), а про остальных пишем «ещё N — в альбоме».
  const shelter = shelterCats(CATS.concat(CAPTAINS), save, CREW_SLOTS.length);
  const crew = shelter.shown;
  for (let i = 0; i < crew.length; i++) {
    homeCats.appendChild(makeHomeCat(crew[i], CREW_SLOTS[i], false));
  }
  const more = document.getElementById('home-more');
  more.textContent = 'Ещё ' + shelter.hidden + ' — в альбоме «Экипаж»';
  more.classList.toggle('hidden', shelter.hidden === 0);

  // Гости
  for (let i = 0; i < save.guests.list.length && i < GUEST_SLOTS.length; i++) {
    const guest = findCat(save.guests.list[i]);
    if (guest) homeCats.appendChild(makeHomeCat(guest, GUEST_SLOTS[i], true));
  }

  // Подсказка, если в убежище пусто
  const empty = crew.length === 0 && save.guests.list.length === 0;
  document.getElementById('home-empty').classList.toggle('hidden', !empty);
  updateStatus();
}

// Кнопка-кот в убежище. slot — место [слева %, сверху %].
function makeHomeCat(cat, slot, isGuest) {
  const button = document.createElement('button');
  button.className = 'home-cat' + (isGuest ? ' home-guest' : '');
  button.style.left = slot[0] + '%';
  button.style.top = slot[1] + '%';
  button.setAttribute('aria-label', isGuest ? 'Гость: ' + cat.name : cat.name);

  const circle = document.createElement('span');
  circle.className = 'home-cat-circle';
  setCircleColor(circle, cat);          // encounter.js
  circle.innerHTML = catPortrait(cat.id); // art.js
  button.appendChild(circle);

  const label = document.createElement('span');
  label.className = 'home-cat-name';
  // У капитанов длинные имена — в убежище пишем без слова «Капитан»
  label.textContent = isGuest ? 'Гость!' : cat.name.replace('Капитан ', '');
  button.appendChild(label);

  button.addEventListener('click', function () {
    if (isGuest) {
      openGuest(cat);
    } else {
      openCare(cat);
    }
  });
  return button;
}

// =============================================================
// Гости
// =============================================================
function openGuest(cat) {
  const shyUntil = guestShyUntil[cat.id] || 0;
  if (Date.now() < shyUntil) {
    const seconds = Math.ceil((shyUntil - Date.now()) / 1000);
    showToast('Гость ещё смущается. Попробуй через ' + seconds + ' с.');
    return;
  }
  openGuestEncounter(cat); // encounter.js
}

// Победа над гостем (вызывается из encounter.js)
function guestWon(cat) {
  const result = applyCatWin(save, cat.id, cat); // logic.js: новый → деталь, знакомый → рыбки
  save = result.save;
  save.guests = removeGuest(save.guests, cat.id);
  saveGame();
  if (result.reward.isNew) {
    playSound('crew');
    showToast(cat.name + ' теперь в твоём экипаже! +1 🔩 деталь корабля');
  } else {
    playSound('reward');
    showToast(cat.name + ' рад встрече! +' + result.reward.fish + ' 🐟');
  }
  questEvent('guest'); // quests.js
  renderHome();
}

// Проигрыш гостю: гость остаётся, но минуту смущается
function guestShy(cat) {
  guestShyUntil[cat.id] = Date.now() + SHY_TIME;
}

// =============================================================
// Забота: карточка кота и угощение
// =============================================================
function openCare(cat) {
  careCat = cat;
  renderCare();
  careWindow.classList.remove('hidden');
  document.getElementById('care-feed').focus();
}

function closeCare() {
  careWindow.classList.add('hidden');
  careCat = null;
}

function renderCare() {
  const cat = careCat;
  const circle = document.getElementById('care-circle');
  setCircleColor(circle, cat);
  circle.innerHTML = catPortrait(cat.id);
  document.getElementById('care-name').textContent = cat.name;
  const level = friendshipLevel(save, cat.id); // logic.js
  document.getElementById('care-hearts').textContent = friendshipHearts(level);
  const left = treatsToNextLevel(save, cat.id);
  document.getElementById('care-info').textContent = left > 0
    ? 'Дружба: уровень ' + level + ' из 5. До следующего сердечка: ' + left + ' ' + pluralRu(left, 'очко', 'очка', 'очков') + '.'
    : 'Дружба: уровень 5 из 5 — лучшие друзья!';
  renderCareTreats();
  document.getElementById('care-character').textContent = 'Характер: ' + cat.character + '.';
  document.getElementById('care-fish').textContent = 'У тебя 🐟 ' + save.fish;
}

function feedCareCat() {
  const result = feedCat(save, careCat.id); // logic.js: рыбка — 1 очко
  if (!result.ok) {
    showToast('Рыбок нет. Их дают маяки, задания и повторные встречи с котами.');
    return;
  }
  catIsHappy(result, '');
}

// Угощения с кухни: кнопка на каждое, что есть в запасе.
// Любимое угощение кота — с сердечком и +5 очков, остальные — +3.
function renderCareTreats() {
  const box = document.getElementById('care-treats');
  box.textContent = '';
  const ids = Object.keys(save.treats);
  for (let i = 0; i < ids.length; i++) {
    const recipe = findRecipe(ids[i]); // logic.js
    const favorite = ids[i] === careCat.favoriteTreat;
    const button = document.createElement('button');
    button.className = 'care-treat' + (favorite ? ' care-treat-favorite' : '');
    const icon = document.createElement('span');
    icon.className = 'care-treat-icon';
    icon.innerHTML = treatIcon(ids[i]); // art.js
    const label = document.createElement('span');
    label.textContent = recipe.name + ' ×' + save.treats[ids[i]] +
      (favorite ? ' — любимое! (+' + FAVORITE_POINTS + ')' : ' (+' + TREAT_POINTS + ')');
    button.appendChild(icon);
    button.appendChild(label);
    button.addEventListener('click', function () {
      const result = feedTreat(save, careCat.id, ids[i], careCat.favoriteTreat); // logic.js
      if (result.ok) catIsHappy(result, result.favorite ? careCat.name + ' обожает «' + recipe.name + '»!' : '');
    });
    box.appendChild(button);
  }
  if (ids.length === 0) {
    const note = document.createElement('p');
    note.className = 'screen-text small-text';
    note.textContent = 'Угощений пока нет — приготовь их на кухне (ингредиенты — с прогулки).';
    box.appendChild(note);
  }
}

// Кот съел угощение: сохраняем, звук, задание «Угости кота», радость
function catIsHappy(result, message) {
  save = result.save;
  saveGame();
  playSound(result.levelUp ? 'crew' : 'meow');
  if (result.levelUp) {
    showToast(careCat.name + ': дружба выросла! ' + friendshipHearts(result.level));
  } else if (message) {
    showToast(message);
  }
  questEvent('treat'); // quests.js

  // Кот радуется: подпрыгивает (та же анимация, что при победе)
  const wrap = document.getElementById('care-celebrate');
  wrap.classList.remove('celebrate-go');
  void wrap.offsetWidth; // перезапуск анимации (см. startCelebration в encounter.js)
  wrap.classList.add('celebrate-go');
  renderCare();
}
