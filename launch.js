// =============================================================
// MewMo — финал главы: запуск корабля
// =============================================================
// Когда деталей хватает (в главе 1 — 20), в альбоме появляется кнопка
// «🚀 Запустить корабль». Игрок нажимает её сам, когда захочет, и
// подтверждает: «Экипаж улетит домой. Готов?».
//
// Потом — сцена взлёта (5–8 секунд, со звуком): корабль, в иллюминаторах
// коты экипажа машут лапками, корабль улетает. Текст «Спасибо, Земной
// спасатель!» и значок «Спасатель 1 ранга». Сцену можно пропустить.
// При «уменьшить движение» — без анимации: картинка и текст.
// После — вступление к следующей главе.
//
// Правила (можно ли запускать, кто улетает, значок) — в logic.js
// (canLaunchShip, launchShip). Сохранение меняется СРАЗУ при запуске,
// поэтому «Пропустить» или закрытая вкладка ничего не теряют.

// ----- Настройки -----
const LAUNCH_SCENE_TIME = 6500; // сколько длится сцена взлёта (мс)

// Вступления к главам (что показать после взлёта)
const CHAPTER_INTROS = {
  2: {
    title: 'Глава 2. Сигнал с орбиты',
    text: 'Улетая, корабль поймал сигнал бедствия: у Земли разбился второй ' +
      'корабль, больше первого. Его экипаж ждёт помощи!'
  }
};

// ----- Состояние -----
let launchTimer = null;

// ----- Элементы -----
const launchWindow = document.getElementById('launch');

// ----- Кнопки -----
document.getElementById('launch-skip').addEventListener('click', finishLaunchScene);
document.getElementById('launch-next').addEventListener('click', showChapterIntro);
document.getElementById('launch-start-chapter').addEventListener('click', closeLaunch);

// Подтверждение «Да, запускаем!» (в альбоме) — вызывается из album.js
function launchShipNow() {
  if (!canLaunchShip(save)) return; // logic.js
  const chapter = save.chapter;
  // Кто улетает — запоминаем до запуска (для картинки)
  const before = save.flewHome.slice();
  save = launchShip(save, CATS.concat(CAPTAINS)); // logic.js
  saveGame();
  const flying = save.flewHome.filter(function (id) { return !before.includes(id); });

  closeAlbum(); // album.js
  startNewChapterOnMap(); // старые капсулы и капитан исчезают
  showLaunchScene(chapter, flying);
}

// Новая глава: на карте капсулы раскладываются заново (там уже новые
// коты), капитан прошлой главы улетает; дома — убежище рисуется заново
function startNewChapterOnMap() {
  safely('новая глава: капитан', removeCaptain);          // captains.js
  if (gameMode === 'walk') {
    safely('новая глава: капсулы', function () {
      removeAllCapsules();                                 // game.js
      refreshCapsules(playerPosition());
    });
  }
  if (gameMode === 'home') safely('новая глава: убежище', renderHome); // home.js
  updateStatus();
}

// Сцена взлёта
function showLaunchScene(chapter, flyingIds) {
  document.getElementById('launch-scene').innerHTML = launchScene(flyingIds); // art.js
  document.getElementById('launch-badge').textContent =
    '🏅 Новый значок: «' + badgeName('rescuer-' + chapter) + '»';

  launchWindow.classList.remove('hidden', 'launch-done');
  document.getElementById('launch-thanks').classList.remove('hidden');
  document.getElementById('launch-intro').classList.add('hidden');
  document.getElementById('launch-next').classList.add('hidden');
  document.getElementById('launch-skip').classList.remove('hidden');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    // Без анимации: сразу картинка и текст
    finishLaunchScene();
    return;
  }
  // Анимацию запускает класс launch-go (см. style.css)
  launchWindow.classList.add('launch-go');
  playSound('launch'); // sound.js
  vibrate([200, 100, 200]); // settings.js
  clearTimeout(launchTimer);
  launchTimer = setTimeout(finishLaunchScene, LAUNCH_SCENE_TIME);
  document.getElementById('launch-skip').focus();
}

// Конец сцены (или «Пропустить»): текст и значок видны, кнопка «Дальше»
function finishLaunchScene() {
  clearTimeout(launchTimer);
  launchWindow.classList.remove('launch-go');
  launchWindow.classList.add('launch-done');
  document.getElementById('launch-skip').classList.add('hidden');
  document.getElementById('launch-next').classList.remove('hidden');
  document.getElementById('launch-next').focus();
}

// Вступление к новой главе
function showChapterIntro() {
  const intro = CHAPTER_INTROS[save.chapter];
  if (!intro) {
    closeLaunch();
    return;
  }
  document.getElementById('launch-intro-title').textContent = intro.title;
  document.getElementById('launch-intro-text').textContent = intro.text;
  document.getElementById('launch-thanks').classList.add('hidden');
  document.getElementById('launch-next').classList.add('hidden');
  document.getElementById('launch-intro').classList.remove('hidden');
  document.getElementById('launch-start-chapter').focus();
}

function closeLaunch() {
  launchWindow.classList.add('hidden');
  launchWindow.classList.remove('launch-go', 'launch-done');
}
