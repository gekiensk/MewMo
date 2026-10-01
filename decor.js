// =============================================================
// MewMo — обстановка убежища (режим «Дом»)
// =============================================================
// Кнопка «Обстановка» в убежище открывает магазин: 12 предметов
// (картинки — decorIcon в art.js), покупаются за рыбок с прогулки.
// Кнопка «Расставить» включает режим расстановки: в убежище видны
// места (пунктирные кружки). Нажал на место — выбираешь, что туда
// поставить (купленный предмет переезжает, если стоял в другом месте)
// или «Убрать отсюда».
// Аквариум, цветок, телескоп и радиоприёмник зовут гостей своего
// типа — это решает logic.js (attractedGuests в updateGuests).
// Правила (покупка, места) — в logic.js: buyDecor, placeDecor, removeDecor.

// Места для предметов в убежище: [слева в %, сверху в %, размер в px].
// Подобраны так, чтобы не закрывать котов, гостя и кнопки.
const DECOR_SLOTS = [
  [9, 42, 66],   // 0 — у левой стены, на полу
  [91, 42, 66],  // 1 — у правой стены, на полу
  [50, 47, 60],  // 2 — под иллюминатором
  [74, 47, 60],  // 3 — справа под иллюминатором
  [9, 25, 52],   // 4 — на левой стене
  [91, 25, 52]   // 5 — на правой стене
];

// ----- Состояние -----
let decorEditing = false; // включён режим расстановки
let decorSlot = -1;       // для какого места сейчас выбираем предмет

// ----- Элементы -----
const decorLayer = document.getElementById('home-decor');
const decorShop = document.getElementById('decor');
const decorPick = document.getElementById('decor-pick');
const decorEditBar = document.getElementById('decor-edit-bar');

// ----- Кнопки -----
document.getElementById('home-decor-button').addEventListener('click', openDecorShop);
document.getElementById('decor-close').addEventListener('click', closeDecorShop);
document.getElementById('decor-arrange').addEventListener('click', function () {
  closeDecorShop();
  startDecorEdit();
});
document.getElementById('decor-edit-done').addEventListener('click', stopDecorEdit);
document.getElementById('decor-edit-shop').addEventListener('click', function () {
  stopDecorEdit();
  openDecorShop();
});
document.getElementById('decor-pick-close').addEventListener('click', closeDecorPick);
document.addEventListener('keydown', function (event) {
  if (event.key !== 'Escape') return;
  if (!decorPick.classList.contains('hidden')) closeDecorPick();
  else if (!decorShop.classList.contains('hidden')) closeDecorShop();
});

// =============================================================
// Предметы в убежище
// =============================================================
// Рисует расставленные предметы (а в режиме расстановки — ещё и места).
// Вызывается из renderHome (home.js).
function renderDecor() {
  decorLayer.textContent = '';
  for (let i = 0; i < DECOR_SLOTS.length && i < DECOR_SLOT_COUNT; i++) {
    const itemId = save.decor.placed[i];
    const slot = DECOR_SLOTS[i];
    // В обычном режиме — только картинка (нажатия проходят к котам);
    // в режиме расстановки — кнопка-место.
    const element = document.createElement(decorEditing ? 'button' : 'div');
    element.className = 'decor-place' + (decorEditing ? ' decor-slot' : '') + (itemId ? '' : ' decor-empty');
    element.style.left = slot[0] + '%';
    element.style.top = slot[1] + '%';
    element.style.width = slot[2] + 'px';
    element.style.height = slot[2] + 'px';
    if (itemId) element.innerHTML = decorIcon(itemId); // art.js
    if (decorEditing) {
      element.setAttribute('aria-label', 'Место ' + (i + 1) + ': ' + (itemId ? findDecor(itemId).name : 'пусто'));
      element.addEventListener('click', function () { openDecorPick(i); });
    } else if (!itemId) {
      continue; // пустые места в обычном режиме не показываем
    }
    decorLayer.appendChild(element);
  }
}

// Режим расстановки: коты бледнеют, видны места и полоска «Готово»
function startDecorEdit() {
  decorEditing = true;
  homeScreen.classList.add('decor-editing'); // home.js: экран убежища
  decorEditBar.classList.remove('hidden');
  renderDecor();
}

function stopDecorEdit() {
  decorEditing = false;
  homeScreen.classList.remove('decor-editing');
  decorEditBar.classList.add('hidden');
  closeDecorPick();
  renderDecor();
}

// =============================================================
// Магазин
// =============================================================
function openDecorShop() {
  decorShop.classList.remove('hidden');
  renderDecorShop();
  document.getElementById('decor-close').focus();
}

function closeDecorShop() {
  decorShop.classList.add('hidden');
}

function renderDecorShop() {
  document.getElementById('decor-fish').textContent = 'У тебя 🐟 ' + save.fish;
  const list = document.getElementById('decor-list');
  list.textContent = '';
  // Первое знакомство — плашка-подсказка (minigames.js)
  showHintPlaque('decor', list, 'Как это работает',
    'Покупай предметы за рыбок с прогулки и расставляй их в убежище. ' +
    'Аквариум, цветок, телескоп и радио зовут гостей своего типа.');
  for (let i = 0; i < DECOR_ITEMS.length; i++) {
    list.appendChild(makeDecorCard(DECOR_ITEMS[i]));
  }
  document.getElementById('decor-arrange').disabled = save.decor.owned.length === 0;
}

// Какие коты приходят на предмет: «Зовёт водных котов»
const ATTRACT_TEXT = {
  'водный': 'водных', 'лесной': 'лесных', 'сумеречный': 'сумеречных', 'городской': 'городских'
};

function makeDecorCard(item) {
  const owned = save.decor.owned.includes(item.id);
  const card = document.createElement('div');
  card.className = 'decor-card';
  const icon = document.createElement('span');
  icon.className = 'decor-card-icon';
  icon.innerHTML = decorIcon(item.id);
  const info = document.createElement('div');
  info.className = 'decor-card-info';
  const name = document.createElement('b');
  name.textContent = item.name;
  info.appendChild(name);
  if (item.attracts) {
    const note = document.createElement('span');
    note.className = 'decor-card-note';
    note.textContent = 'Зовёт ' + ATTRACT_TEXT[item.attracts] + ' котов';
    info.appendChild(note);
  }
  const button = document.createElement('button');
  button.className = 'decor-buy';
  if (owned) {
    button.textContent = save.decor.placed.includes(item.id) ? '✓ Стоит' : '✓ Куплено';
    button.disabled = true;
  } else {
    button.textContent = item.price + ' 🐟';
    button.setAttribute('aria-label', 'Купить «' + item.name + '» за ' + item.price + ' рыбок');
    button.classList.toggle('decor-buy-cant', save.fish < item.price);
    button.addEventListener('click', function () { buyDecorItem(item); });
  }
  card.appendChild(icon);
  card.appendChild(info);
  card.appendChild(button);
  return card;
}

function buyDecorItem(item) {
  const result = buyDecor(save, item.id); // logic.js
  if (!result.ok) {
    if (result.reason === 'мало рыбок') {
      showToast('Нужно ' + item.price + ' 🐟, а у тебя ' + save.fish + '. Рыбок дают маяки и задания на прогулке.');
    }
    return;
  }
  save = result.save;
  saveGame();
  playSound('reward');
  showToast('«' + item.name + '» куплен! Нажми «Расставить», чтобы поставить его в убежище.');
  renderDecorShop();
}

// =============================================================
// Выбор предмета для места
// =============================================================
function openDecorPick(slot) {
  decorSlot = slot;
  const current = save.decor.placed[slot];
  document.getElementById('decor-pick-title').textContent = current
    ? 'Здесь стоит «' + findDecor(current).name + '»'
    : 'Что поставить сюда?';
  const list = document.getElementById('decor-pick-list');
  list.textContent = '';
  // Купленные предметы: стоящий здесь — не показываем, стоящий в другом
  // месте — «переставить сюда»
  for (let i = 0; i < save.decor.owned.length; i++) {
    const itemId = save.decor.owned[i];
    if (itemId === current) continue;
    const button = document.createElement('button');
    button.className = 'decor-pick-item';
    const icon = document.createElement('span');
    icon.className = 'decor-card-icon';
    icon.innerHTML = decorIcon(itemId);
    const label = document.createElement('span');
    label.textContent = findDecor(itemId).name +
      (save.decor.placed.includes(itemId) ? ' — переставить сюда' : '');
    button.appendChild(icon);
    button.appendChild(label);
    button.addEventListener('click', function () {
      save = placeDecor(save, decorSlot, itemId); // logic.js
      saveGame();
      playTone(523, 0.12);
      closeDecorPick();
      renderDecor();
    });
    list.appendChild(button);
  }
  if (current) {
    const remove = document.createElement('button');
    remove.className = 'big-button';
    remove.textContent = 'Убрать отсюда';
    remove.addEventListener('click', function () {
      save = removeDecor(save, decorSlot); // logic.js
      saveGame();
      closeDecorPick();
      renderDecor();
    });
    list.appendChild(remove);
  }
  if (list.children.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'screen-text small-text';
    empty.textContent = 'Больше нечего ставить — купи что-нибудь в магазине.';
    list.appendChild(empty);
  }
  decorPick.classList.remove('hidden');
  document.getElementById('decor-pick-close').focus();
}

function closeDecorPick() {
  decorPick.classList.add('hidden');
  decorSlot = -1;
}
