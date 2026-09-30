// =============================================================
// MewMo — альбом экипажа
// =============================================================
// Окно открывается кнопкой «Экипаж» на карте. В нём:
//   • сверху — «Экипаж: N из M», рыбки и шкала ремонта корабля;
//   • сеткой — все коты каталога: найденный — цветной круг, имя
//     и звёзды, ненайденный — серый силуэт и «???»;
//   • нажатие на найденного кота открывает его карточку;
//   • отдельный ряд «Капитаны» — побеждённые капитаны;
//   • внизу — маленькая кнопка «Начать заново» (с подтверждением).
//
// Данные берутся из сохранения save (оно живёт в game.js), а расчёты —
// из logic.js. Чтобы начать заново, альбом вызывает resetProgress()
// из game.js.

// ----- Находим элементы окна -----
const albumWindow = document.getElementById('album');
const albumMain = document.getElementById('album-main');
const albumCatView = document.getElementById('album-cat');
const albumConfirm = document.getElementById('album-confirm');
const albumLaunchConfirm = document.getElementById('album-launch-confirm');

// Какую главу сейчас показывает альбом (вкладки «Глава 1» / «Глава 2»)
let albumChapter = 1;

// Вкладки глав: data-chapter хранит номер главы
const albumTabs = document.querySelectorAll('.album-tab');
for (let i = 0; i < albumTabs.length; i++) {
  albumTabs[i].addEventListener('click', function () {
    albumChapter = Number(albumTabs[i].dataset.chapter);
    renderAlbum();
  });
}
const albumGrid = document.getElementById('album-grid');

// ----- Кнопки -----
document.getElementById('crew-button').addEventListener('click', openAlbum);
document.getElementById('album-close').addEventListener('click', closeAlbum);
document.getElementById('album-back').addEventListener('click', showAlbumMain);
document.getElementById('album-reset').addEventListener('click', function () {
  showAlbumView(albumConfirm);
  document.getElementById('album-reset-no').focus();
});
document.getElementById('album-reset-no').addEventListener('click', showAlbumMain);

// «🚀 Запустить корабль» → подтверждение → взлёт (launch.js)
document.getElementById('album-launch').addEventListener('click', function () {
  showAlbumView(albumLaunchConfirm);
  document.getElementById('album-launch-no').focus();
});
document.getElementById('album-launch-no').addEventListener('click', showAlbumMain);
// (launch.js подключается позже album.js, поэтому зовём через функцию-обёртку:
// к моменту нажатия launchShipNow уже будет)
document.getElementById('album-launch-yes').addEventListener('click', function () {
  launchShipNow();
});
document.getElementById('album-reset-yes').addEventListener('click', function () {
  resetProgress(); // функция из game.js
  showAlbumMain();
});

// Клавиша Esc на компьютере закрывает альбом
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && !albumWindow.classList.contains('hidden')) {
    closeAlbum();
  }
});

// =============================================================
// Открыть и закрыть
// =============================================================
function openAlbum() {
  albumChapter = save.chapter; // открываем на текущей главе
  albumWindow.classList.remove('hidden');
  showAlbumMain();
  document.getElementById('album-close').focus();
}

function closeAlbum() {
  albumWindow.classList.add('hidden');
}

// В окне три «вида»: главный (сетка), карточка кота и подтверждение.
// Показываем один, остальные прячем.
function showAlbumView(view) {
  const views = [albumMain, albumCatView, albumConfirm, albumLaunchConfirm];
  for (let i = 0; i < views.length; i++) {
    views[i].classList.toggle('hidden', views[i] !== view);
  }
}

function showAlbumMain() {
  renderAlbum();
  showAlbumView(albumMain);
}

// =============================================================
// Рисуем главный вид альбома
// =============================================================
function renderAlbum() {
  // Коты и капитаны выбранной главы
  const cats = chapterCats(CATS, albumChapter);         // logic.js
  const captains = chapterCats(CAPTAINS, albumChapter);

  // Вкладки глав видны, когда открыта глава 2 или дальше
  document.getElementById('album-tabs').classList.toggle('hidden', save.chapter < 2);
  for (let i = 0; i < albumTabs.length; i++) {
    const chosen = Number(albumTabs[i].dataset.chapter) === albumChapter;
    albumTabs[i].setAttribute('aria-pressed', chosen ? 'true' : 'false');
    // вкладки будущих глав не показываем
    albumTabs[i].classList.toggle('hidden', Number(albumTabs[i].dataset.chapter) > save.chapter);
  }

  // Заголовок: сколько котов главы найдено из скольких
  document.getElementById('album-title').textContent =
    'Экипаж: ' + crewCount(save, cats) + ' из ' + cats.length;

  // Рыбки
  document.getElementById('album-fish').textContent =
    '🐟 Космические рыбки: ' + save.fish;

  // Шкала ремонта корабля текущей главы (в главе 1 — 20 деталей, в главе 2 — 30)
  document.getElementById('album-repair-text').textContent =
    'Ремонт корабля: ' + save.parts + ' ' +
    pluralRu(save.parts, 'деталь', 'детали', 'деталей') + ' из ' + partsNeeded(save.chapter);
  document.getElementById('album-repair-fill').style.width =
    (shipRepairShare(save.parts, save.chapter) * 100) + '%';

  // Корабль починен — большая кнопка «Запустить корабль» (logic.js решает, можно ли)
  document.getElementById('album-launch').classList.toggle('hidden', !canLaunchShip(save));

  // Значки игрока («Спасатель 1 ранга» и т. п.)
  const badges = document.getElementById('album-badges');
  badges.textContent = save.badges.map(function (badge) { return '🏅 ' + badgeName(badge); }).join('   ');
  badges.classList.toggle('hidden', save.badges.length === 0);

  // Задания на сегодня (quests.js)
  renderQuests(document.getElementById('album-quests'));

  // Сетка котов: сначала очищаем, потом добавляем по клетке на кота
  albumGrid.textContent = '';
  for (let i = 0; i < cats.length; i++) {
    albumGrid.appendChild(makeAlbumCell(cats[i], save.crew));
  }

  // Отдельный ряд «Капитаны»
  document.getElementById('album-captains-title').textContent =
    'Капитаны: ' + countMet(save.captains, captains) + ' из ' + captains.length;
  const captainsGrid = document.getElementById('album-captains');
  captainsGrid.textContent = '';
  for (let i = 0; i < captains.length; i++) {
    captainsGrid.appendChild(makeAlbumCell(captains[i], save.captains));
  }
}

// Маленькая подпись в клетке альбома («Вернулся домой» и т. п.)
function addCellNote(cell, text) {
  const note = document.createElement('span');
  note.className = 'album-note';
  note.textContent = text;
  cell.appendChild(note);
}

// Сколько из списка list уже встречено (есть в словаре counts)
function countMet(counts, list) {
  let count = 0;
  for (let i = 0; i < list.length; i++) {
    if ((counts[list[i].id] || 0) > 0) count = count + 1;
  }
  return count;
}

// Одна клетка альбома. crewCounts — словарь «id → сколько раз встречен».
// Найденный кот — кнопка (нажми, чтобы открыть карточку).
// Ненайденный — просто серый силуэт, нажимать на него нечего.
function makeAlbumCell(cat, crewCounts) {
  const found = (crewCounts[cat.id] || 0) > 0;
  const cell = document.createElement(found ? 'button' : 'div');
  cell.className = 'album-cell';

  const circle = document.createElement('div');
  circle.className = 'mini-circle';
  const face = document.createElement('span');
  // Портрет (функция из encounter.js). У ненайденного кота CSS
  // превращает этот же портрет в тёмный силуэт.
  face.innerHTML = catFace(cat);
  circle.appendChild(face);

  const name = document.createElement('span');
  name.className = 'album-name';

  if (found) {
    setCircleColor(circle, cat); // функция из encounter.js
    name.textContent = cat.name;
    const stars = document.createElement('span');
    stars.className = 'album-stars';
    stars.textContent = starsText(cat.rarity); // функция из encounter.js
    cell.appendChild(circle);
    cell.appendChild(name);
    cell.appendChild(stars);
    // Улетел домой на первом корабле / отставший, нашёлся позже
    if (isOnRadio(save, cat.id)) {
      addCellNote(cell, '🏠 Вернулся домой');
    } else if (save.latecomers.includes(cat.id)) {
      addCellNote(cell, '🧭 Нашёлся!');
    }
    // Сердечки дружбы (режим «Дом»), если кот хоть раз стал другом
    const level = friendshipLevel(save, cat.id);
    if (level > 0) {
      const hearts = document.createElement('span');
      hearts.className = 'album-hearts';
      hearts.textContent = '♥'.repeat(level);
      hearts.setAttribute('aria-label', 'Дружба: ' + level + ' из 5');
      cell.appendChild(hearts);
    }
    cell.setAttribute('aria-label', cat.name + ', открыть карточку');
    cell.addEventListener('click', function () {
      showAlbumCat(cat, crewCounts[cat.id]);
    });
  } else {
    cell.classList.add('album-unknown');
    circle.classList.add('silhouette');
    name.textContent = '???';
    cell.appendChild(circle);
    cell.appendChild(name);
    cell.setAttribute('aria-label', 'Этот кот ещё не найден');
  }
  return cell;
}

// =============================================================
// Карточка кота
// =============================================================
// timesMet — сколько раз игрок встретил этого кота
function showAlbumCat(cat, timesMet) {
  const circle = document.getElementById('album-cat-circle');
  setCircleColor(circle, cat);
  circle.innerHTML = catFace(cat);
  document.getElementById('album-cat-name').textContent = cat.name;
  document.getElementById('album-cat-stars').textContent = starsText(cat.rarity) + ' ' + cat.rarity;
  document.getElementById('album-cat-info').textContent =
    'Тип: ' + cat.type + '. Характер: ' + cat.character + '.';
  document.getElementById('album-cat-met').textContent =
    'Встреч: ' + timesMet + '. Дружба: ' + friendshipHearts(friendshipLevel(save, cat.id));
  document.getElementById('album-cat-fact').textContent = cat.fact;
  showAlbumView(albumCatView);
  document.getElementById('album-back').focus();
}
