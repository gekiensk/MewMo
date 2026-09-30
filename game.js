// =============================================================
// MewMo — карта (MapLibre GL JS + OpenFreeMap), игрок и капсулы
// =============================================================

// ----- Настройки -----
// Стартовая точка для демо-режима (когда GPS недоступен).
// Замени на координаты своего двора или парка.
// ВНИМАНИЕ: в MapLibre порядок координат [долгота, широта] — наоборот,
// чем в Leaflet! Сначала «влево-вправо» (lng), потом «вверх-вниз» (lat).
const DEFAULT_POSITION = [2.2945, 48.8584];

// Стиль карты: бесплатные карты OpenFreeMap, API-ключ не нужен
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

// Камера «как в Pokémon GO»
const START_ZOOM = 17.5; // чем больше число, тем крупнее карта
const MIN_ZOOM = 17;     // дальше отдалить нельзя
const MAX_ZOOM = 18;     // ближе приблизить нельзя
const CAMERA_PITCH = 60; // наклон камеры в градусах (0 — смотрим сверху)

// Капсулы с котами
const CAPSULE_COUNT = 5;           // сколько капсул всегда лежит вокруг игрока
const CAPSULE_MIN_DISTANCE = 30;  // ближе этого (в метрах) новые капсулы не появляются
const CAPSULE_MAX_DISTANCE = 150; // дальше этого (в метрах) новые капсулы не появляются
const DESPAWN_DISTANCE = 250;     // если игрок ушёл дальше (в метрах) — капсула исчезает
const OPEN_DISTANCE = 40;         // с какого расстояния (в метрах) можно открыть капсулу
const TOAST_TIME = 3000;          // сколько миллисекунд висит подсказка (3 секунды)
const SHY_TIME = 60000;           // сколько миллисекунд кот смущается после проигрыша (1 минута)

// Цвет круга точности GPS. Это тот же розовый, что --nose в style.css.
// Круг рисует сама карта, а она не умеет читать переменные из CSS,
// поэтому цвет записан здесь ещё раз.
const ACCURACY_COLOR = '#FF8FB1';

// ----- Переменные состояния игры -----
let map;                 // сама карта
let playerMarker;        // значок игрока
let followPlayer = true; // двигается ли карта вслед за игроком
let demoMode = false;    // true, когда GPS не работает
let capsules = [];       // список капсул, которые лежат на карте
let hasGps = false;      // приходил ли уже хоть раз ответ от GPS
let statusMessage = '';  // текст строки состояния (без счётчика котов)
let toastTimer = null;   // таймер, который прячет подсказку
let wasTwilight = false; // были ли сумерки при прошлой проверке
let gameMode = '';       // '' — стартовый экран, 'walk' — прогулка, 'home' — режим «Дом»

// ----- Сохранение -----
// Хранилище браузера (localStorage). В некоторых браузерах (например,
// в режиме «инкогнито») оно запрещено — тогда играем без сохранения.
// ВАЖНО: координаты игрока в сохранение НЕ записываются — только коты,
// рыбки, детали и перезарядка маяков.
const storage = browserStorage();
let save = loadSave(storage); // функция из logic.js

// Пока карта грузит свой стиль, рисовать круг точности нельзя.
// Поэтому запоминаем последний круг и нарисуем его, когда карта будет готова.
let mapReady = false;
let lastAccuracy = { center: DEFAULT_POSITION, radius: 0 };

// ----- Находим элементы страницы по их id -----
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const statusText = document.getElementById('status');
const centerButton = document.getElementById('center-button');
const toast = document.getElementById('toast');

// ----- Что происходит при нажатии кнопок -----
startButton.addEventListener('click', startWalk);

centerButton.addEventListener('click', function () {
  followPlayer = true;
  // easeTo плавно «перелетает» камерой: к игроку, на нужный зум и наклон
  map.easeTo({
    center: playerMarker.getLngLat(),
    zoom: START_ZOOM,
    pitch: CAMERA_PITCH
  });
});

// =============================================================
// Запуск прогулки
// =============================================================
// Кнопка «Гулять» (и переключение режима в настройках)
function startWalk() {
  // Взрослый включил «Только режим „Дом“» — прогулка недоступна
  if (save.settings.homeOnly) {
    startHome(); // home.js
    return;
  }
  initSound(); // звук можно включить только по нажатию (sound.js)
  startPlayClock(); // часы игры и ограничение времени (settings.js)
  startScreen.classList.add('hidden'); // прячем стартовый экран
  hideHome(); // если были дома — прячем убежище (home.js)
  gameMode = 'walk';

  if (!map) {
    // Первая прогулка: создаём карту
    createMap(DEFAULT_POSITION);
    // Раз в секунду обновляем вид капсул и маяков: например, смущённый
    // кот через минуту снова становится обычным, а у маяка тикает таймер
    setInterval(everySecond, 1000);
  } else {
    // Карта уже есть (вернулись из дома) — пусть заново измерит экран
    map.resize();
  }

  // Координаты уже приходили раньше (например, вернулись из дома) —
  // пишем «Обновляем…», иначе — «Ищем спутники…»
  setStatus(hasGps ? 'Обновляем, где ты…' : 'Ищем спутники…');
  // Слежение за GPS: gps.js (там же «сторож» и диагностика)
  startGps('прогулка');
}

// Закончить прогулку (переходим в режим «Дом»): перестаём следить за GPS
function stopWalk() {
  stopGps();        // gps.js
  resetGpsSearch(); // gps.js
}

// =============================================================
// Создание карты
// =============================================================
function createMap(position) {
  map = new maplibregl.Map({
    container: 'map',     // id блока, в котором рисуем карту
    style: MAP_STYLE,     // как выглядит карта (цвета, дороги, здания)
    center: position,     // [долгота, широта]
    zoom: START_ZOOM,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    pitch: CAMERA_PITCH,  // наклоняем камеру, как в Pokémon GO
    attributionControl: false // подпись об авторах добавим сами, ниже
  });

  // Подпись об авторах карты. Это ОБЯЗАТЕЛЬНОЕ условие бесплатного
  // использования OpenFreeMap и OpenStreetMap — не убирай её!
  // Ставим её слева внизу, чтобы не пряталась под кнопкой «Где я?».
  map.addControl(new maplibregl.AttributionControl({
    compact: false, // показываем текст целиком, а не только значок «i»
    customAttribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> ' +
      '<a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> ' +
      'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
  }), 'bottom-left');

  // Значок игрока: розовая точка, внешний вид задан в style.css.
  // HTML-маркер — это обычный <div>, который MapLibre двигает вместе с картой.
  const playerElement = document.createElement('div');
  playerElement.className = 'player-dot';
  playerMarker = new maplibregl.Marker({ element: playerElement })
    .setLngLat(position)
    .addTo(map);

  // Событие 'load' наступает, когда стиль карты загрузился.
  // Только после этого можно добавлять на карту свои слои.
  // Каждая часть — «со страховкой» (safely из gps.js): если, например,
  // не получилось добавить здания, круг точности GPS всё равно появится.
  map.on('load', function () {
    safely('объёмные здания', add3dBuildings);
    safely('круг точности', function () {
      addAccuracyCircle();
      mapReady = true;
      drawAccuracyCircle(lastAccuracy.center, lastAccuracy.radius);
    });
  });

  // Если игрок сам двигает карту пальцем — перестаём за ним следить
  map.on('dragstart', function () {
    followPlayer = false;
  });

  // Клик по карте нужен для демо-режима
  map.on('click', onMapClick);
}

// =============================================================
// Объёмные здания
// =============================================================
function add3dBuildings() {
  // В стиле «liberty» обычно уже есть объёмные здания.
  // Проверяем: есть ли среди слоёв хоть один типа 'fill-extrusion'
  // (так в MapLibre называются «выдавленные вверх» объёмные фигуры).
  const layers = map.getStyle().layers;
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].type === 'fill-extrusion') {
      return; // здания уже есть — ничего не делаем
    }
  }

  // Здания берутся из данных OpenMapTiles. Если такого источника в стиле
  // нет (например, стиль карты не загрузился целиком) — зданий не будет
  if (!map.getSource('openmaptiles')) {
    return;
  }

  // Если вдруг их нет — добавляем свой слой зданий
  map.addLayer({
    id: 'mewmo-buildings-3d',
    type: 'fill-extrusion',
    source: 'openmaptiles',   // откуда брать данные (источник из стиля)
    'source-layer': 'building', // какой слой данных — здания
    paint: {
      'fill-extrusion-color': '#E6E0F5',
      // высота здания в метрах берётся из данных карты
      'fill-extrusion-height': ['get', 'render_height'],
      'fill-extrusion-base': ['get', 'render_min_height'],
      'fill-extrusion-opacity': 0.8
    }
  });
}

// =============================================================
// Круг точности GPS
// =============================================================
// В MapLibre нет готового «круга в метрах», как L.circle в Leaflet.
// Поэтому мы сами считаем многоугольник из 64 точек, похожий на круг,
// и отдаём его карте как данные GeoJSON.
function addAccuracyCircle() {
  // «Источник» — это данные (наш круг)
  map.addSource('accuracy', {
    type: 'geojson',
    data: makeCircle(DEFAULT_POSITION, 0)
  });
  // «Слой» — это как эти данные нарисовать: заливка...
  map.addLayer({
    id: 'accuracy-fill',
    type: 'fill',
    source: 'accuracy',
    paint: { 'fill-color': ACCURACY_COLOR, 'fill-opacity': 0.12 }
  });
  // ...и обводка
  map.addLayer({
    id: 'accuracy-line',
    type: 'line',
    source: 'accuracy',
    paint: { 'line-color': ACCURACY_COLOR, 'line-opacity': 0.5, 'line-width': 1 }
  });
}

function drawAccuracyCircle(center, radius) {
  lastAccuracy = { center: center, radius: radius };
  if (!mapReady) return; // карта ещё грузится — нарисуем позже
  map.getSource('accuracy').setData(makeCircle(center, radius));
}

// Считает круг радиусом radius метров вокруг точки center
function makeCircle(center, radius) {
  const points = [];
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * 2 * Math.PI; // угол от 0 до полного круга
    // offsetPosition из logic.js: точка в radius метрах в сторону angle
    points.push(offsetPosition(center, radius, angle));
  }

  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [points] }
  };
}

// =============================================================
// GPS прислал новое местоположение
// =============================================================
function onPosition(pos) {
  if (gameMode !== 'walk') return; // дома координаты не нужны
  noteGpsFix(pos.coords.accuracy); // для диагностики — только точность (gps.js)
  demoMode = false; // GPS заработал — выходим из демо-режима

  // Первый ответ GPS: если капсулы уже лежат вокруг демо-точки,
  // их надо убрать — новые появятся рядом с настоящим местом игрока
  const firstFix = !hasGps;
  hasGps = true;

  // Сначала самое важное: точка игрока и строка состояния.
  // Остальное (капсулы, маяки, камера) — в movePlayer, «со страховкой».
  const lngLat = [pos.coords.longitude, pos.coords.latitude]; // сначала долгота!
  setStatus('Ты здесь. Точность: ' + Math.round(pos.coords.accuracy) + ' м.');
  if (firstFix) {
    safely('убрать демо-капсулы', removeAllCapsules); // gps.js
  }
  movePlayer(lngLat, pos.coords.accuracy);
}

// GPS не смог определить местоположение
function onPositionError(error) {
  if (gameMode !== 'walk') return;
  noteGpsError(error); // журнал диагностики (gps.js)
  const permissionDenied = error.code === error.PERMISSION_DENIED;
  // gpsErrorAction из logic.js решает, что делать:
  //   'демо'          — нет разрешения: демо-режим и окно с инструкцией;
  //   'слабый сигнал' — GPS уже работал: игрок остаётся на месте;
  //   'ищем'          — координат ещё не было: ищем дальше (если за 45 с
  //                     ничего не придёт, демо-режим включит gps.js).
  const action = gpsErrorAction(hasGps, permissionDenied);

  if (action === 'слабый сигнал') {
    setStatus('Слабый сигнал GPS… Ты там, где был в последний раз.');
  } else if (action === 'ищем') {
    if (!demoMode) setStatus('Ищем спутники…');
  } else {
    if (!demoMode) startDemoMode('Нет разрешения на геолокацию.');
    showGpsHelp(); // gps.js: как разрешить геолокацию
  }
}

// =============================================================
// Перемещение игрока
// =============================================================
// Сначала двигаем точку игрока. Всё остальное — «со страховкой»
// (safely из gps.js): если, например, в капсулах случится ошибка,
// она попадёт в журнал диагностики, а GPS и точка игрока продолжат работать.
function movePlayer(lngLat, accuracy) {
  playerMarker.setLngLat(lngLat);
  safely('круг точности', function () { drawAccuracyCircle(lngLat, accuracy || 0); });

  // Убираем далёкие капсулы, добавляем новые и обновляем их свечение
  safely('капсулы', function () { refreshCapsules(lngLat); });
  // Маяки у реальных мест (beacons.js)
  safely('маяки', function () { refreshBeacons(false); });

  if (followPlayer) {
    safely('камера', function () { map.easeTo({ center: lngLat }); }); // карта едет за игроком
  }
}

// Где сейчас игрок, в виде [долгота, широта]
function playerPosition() {
  const lngLat = playerMarker.getLngLat();
  return [lngLat.lng, lngLat.lat];
}

// =============================================================
// Капсулы с котами
// =============================================================
// Каждая капсула — это объект:
//   marker   — HTML-маркер на карте;
//   element  — сама кнопка-капсула (чтобы менять ей CSS-классы);
//   cat      — кот из каталога cats.js, который сидит внутри;
//   shyUntil — до какого времени кот смущается (0 — не смущается).

// Главная функция капсул. Вызывается каждый раз, когда игрок сдвинулся.
function refreshCapsules(center) {
  // 1. Капсулы дальше DESPAWN_DISTANCE исчезают
  const stillNear = [];
  for (let i = 0; i < capsules.length; i++) {
    const capsule = capsules[i];
    // Капсулу, с котом из которой сейчас идёт знакомство, не трогаем
    const isInEncounter = activeEncounter && activeEncounter.capsule === capsule;
    if (!isInEncounter && distanceMeters(center, capsulePosition(capsule)) > DESPAWN_DISTANCE) {
      capsule.marker.remove(); // игрок ушёл далеко — убираем с карты
    } else {
      stillNear.push(capsule);
    }
  }
  capsules = stillNear;

  // 2. Добавляем новые, пока вокруг игрока не станет CAPSULE_COUNT капсул
  while (capsules.length < CAPSULE_COUNT) {
    addCapsule(randomCapsulePosition(center, CAPSULE_MIN_DISTANCE, CAPSULE_MAX_DISTANCE, Math.random));
  }

  // 3. Близкие капсулы светятся ярче
  updateCapsuleLooks();
}

function addCapsule(position) {
  // Капсула — HTML-маркер, её вид задан в style.css (.capsule)
  const element = document.createElement('button');
  element.className = 'capsule';
  element.setAttribute('aria-label', 'Капсула с котом');
  element.innerHTML = capsuleIcon(); // картинка капсулы из art.js

  const marker = new maplibregl.Marker({ element: element, anchor: 'bottom' })
    .setLngLat(position)
    .addTo(map);

  const capsule = {
    marker: marker,
    element: element,
    // кот выбирается с учётом редкости, того, что рядом на карте,
    // и времени (сумеречные коты — только в последний час до заката)
    cat: pickCatForPlace(CATS, { terrain: readTerrain(position), twilight: isTwilightNow() }, Math.random),
    shyUntil: 0
  };
  capsules.push(capsule);

  element.addEventListener('click', function () {
    openCapsule(capsule);
  });
}

// Что рядом с точкой на карте: 'вода', 'зелень', 'город'
// или null, если данных карты нет (тогда кот выбирается как обычно).
// Здесь мы только достаём фигуры из карты, а решает terrainNear из logic.js.
function readTerrain(position) {
  const layers = ['water', 'waterway', 'landcover', 'park'];
  const features = [];
  let total = 0; // сколько фигур этих слоёв вообще загружено
  try {
    for (let i = 0; i < layers.length; i++) {
      const found = map.querySourceFeatures('openmaptiles', { sourceLayer: layers[i] });
      total = total + found.length;
      for (let j = 0; j < found.length; j++) {
        const kind = terrainKind(layers[i], found[j].properties);
        if (kind !== '') {
          features.push({ kind: kind, geometry: found[j].geometry });
        }
      }
    }
  } catch (error) {
    return null; // карта ещё не готова
  }
  if (total === 0) return null; // данных карты нет
  return terrainNear(position, features, TERRAIN_RADIUS);
}

// Координаты капсулы в виде [долгота, широта]
function capsulePosition(capsule) {
  const lngLat = capsule.marker.getLngLat();
  return [lngLat.lng, lngLat.lat];
}

// Сколько метров от игрока до капсулы
function distanceToCapsule(capsule) {
  return distanceMeters(playerPosition(), capsulePosition(capsule));
}

// Смущается ли кот в капсуле прямо сейчас
function isShy(capsule) {
  return Date.now() < capsule.shyUntil; // Date.now() — текущее время в мс
}

// Обновляет вид капсул:
// capsule-near — до капсулы можно дотянуться, она светится ярче;
// capsule-shy  — кот смутился, капсула тусклая и минуту не открывается.
function updateCapsuleLooks() {
  if (!playerMarker) return;
  for (let i = 0; i < capsules.length; i++) {
    const capsule = capsules[i];
    const shy = isShy(capsule);
    const isNear = !shy && distanceToCapsule(capsule) <= OPEN_DISTANCE;
    // toggle(класс, true) добавляет класс, toggle(класс, false) — убирает
    capsule.element.classList.toggle('capsule-near', isNear);
    capsule.element.classList.toggle('capsule-shy', shy);
  }
}

function openCapsule(capsule) {
  const distance = distanceToCapsule(capsule);

  if (isShy(capsule)) {
    const secondsLeft = Math.ceil((capsule.shyUntil - Date.now()) / 1000);
    showToast('Кот ещё смущается. Попробуй через ' + secondsLeft + ' с.');
    return;
  }

  if (distance > OPEN_DISTANCE) {
    showToast('Подойди ближе! До капсулы ' + Math.round(distance) + ' м.');
    return;
  }

  // Капсула рядом — открываем окно знакомства (encounter.js)
  openEncounter(capsule);
}

// Игрок выиграл и нажал «Забрать в экипаж» (вызывается из encounter.js)
function catchCat(capsule) {
  removeCapsule(capsule); // на её место появится новая

  // applyCatWin из logic.js: новый кот → в экипаж и деталь корабля,
  // знакомый кот → просто рад встрече и дарит рыбок
  const result = applyCatWin(save, capsule.cat.id);
  save = result.save;
  saveGame();

  if (result.reward.isNew) {
    playSound('crew');
    showToast(capsule.cat.name + ' теперь в твоём экипаже! +' + result.reward.parts + ' 🔩 деталь корабля');
  } else {
    playSound('reward');
    showToast(capsule.cat.name + ' рад встрече! +' + result.reward.fish + ' 🐟');
  }
  updateStatus();
  refreshCapsules(playerPosition());
}

// Игрок проиграл: кот смущается, капсула минуту тусклая (вызывается из encounter.js)
function makeCatShy(capsule) {
  capsule.shyUntil = Date.now() + SHY_TIME;
  updateCapsuleLooks();
}

// Убирает одну капсулу с карты и из списка
function removeCapsule(capsule) {
  capsule.marker.remove();
  capsules = capsules.filter(function (c) { return c !== capsule; });
}

// Убирает с карты все капсулы (например, чтобы разложить их заново)
function removeAllCapsules() {
  for (let i = 0; i < capsules.length; i++) {
    capsules[i].marker.remove();
  }
  capsules = [];
}

// Сейчас последний час до заката там, где стоит игрок?
// Закат считается прямо на телефоне (isTwilightTime из logic.js),
// координаты никуда не отправляются.
function isTwilightNow() {
  const position = playerPosition();
  return isTwilightTime(Date.now(), position[0], position[1]);
}

// Следит за сумерками: когда они начались — подсказка,
// когда солнце село — сумеречные коты улетают из капсул
function checkTwilight() {
  const twilight = isTwilightNow();
  if (twilight && !wasTwilight) {
    showToast('Скоро закат! Появляются сумеречные коты. Вернись домой до темноты!');
  }
  if (!twilight && wasTwilight) {
    removeTwilightCapsules();
  }
  wasTwilight = twilight;
}

// Убирает капсулы с сумеречными котами (кроме той, где идёт знакомство)
// и раскладывает на их место обычные
function removeTwilightCapsules() {
  const twilightCapsules = capsules.filter(function (capsule) {
    const inEncounter = activeEncounter && activeEncounter.capsule === capsule;
    return capsule.cat.type === 'сумеречный' && !inEncounter;
  });
  for (let i = 0; i < twilightCapsules.length; i++) {
    removeCapsule(twilightCapsules[i]);
  }
  if (twilightCapsules.length > 0) {
    refreshCapsules(playerPosition());
  }
}

// То, что делаем раз в секунду (только на прогулке)
// Каждая часть — «со страховкой»: ошибка в одной не мешает остальным.
function everySecond() {
  if (gameMode !== 'walk') return;
  safely('сумерки', checkTwilight);
  safely('вид капсул', updateCapsuleLooks);
  safely('вид маяков', updateBeaconLooks);                          // таймеры перезарядки (beacons.js)
  safely('маяки', function () { refreshBeacons(false); });          // сам решит, пора ли пересчитывать
  safely('капитан', updateCaptain);                                 // капитаны у маяков (captains.js)
}

// =============================================================
// Сохранение
// =============================================================
// Достаёт localStorage. Даже само обращение к нему может «упасть»,
// если браузер запрещает память сайтам, — поэтому try/catch.
function browserStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    return null; // loadSave и writeSave умеют работать без хранилища
  }
}

// Записывает текущий прогресс в память браузера
function saveGame() {
  writeSave(storage, save); // функция из logic.js
}

// «Начать заново» из альбома: весь прогресс стирается
function resetProgress() {
  // Настройки и время игры — это решения взрослого, их не стираем
  const keepSettings = save.settings;
  const keepPlayTime = save.playTime;
  save = emptySave();
  save.settings = keepSettings;
  save.playTime = keepPlayTime;
  saveGame();
  removeCaptain(); // экипажа больше нет — капитан улетает (captains.js)
  if (gameMode === 'home') renderHome(); // home.js
  updateStatus();
}

// =============================================================
// Демо-режим: играем без GPS, нажимая на карту
// =============================================================
function startDemoMode(reason) {
  demoMode = true;
  setStatus(reason + ' Демо-режим: нажми на карту, чтобы переместиться.');
  // Без GPS игрок стоит там, где стоит, — раскладываем капсулы вокруг него
  refreshCapsules(playerPosition());
  // В демо-режиме маяки виртуальные
  refreshBeacons(true);
}

function onMapClick(event) {
  if (!demoMode) return; // с работающим GPS клики не двигают игрока
  // Нажатие на капсулу, маяк или капитана — это «открыть», а не «идти сюда»
  if (event.originalEvent.target.closest('.capsule, .beacon, .captain')) return;
  movePlayer([event.lngLat.lng, event.lngLat.lat], 0);
}

// =============================================================
// Строка состояния и всплывающая подсказка
// =============================================================
// Строка состояния сверху: сообщение + счётчик найденных котов.
// GPS обновляет её часто, поэтому важные короткие сообщения
// («Подойди ближе!») показываем отдельно — всплывающей подсказкой.
function setStatus(text) {
  statusMessage = text;
  updateStatus();
}

function updateStatus() {
  // Счётчик берётся из сохранения: сколько котов каталога в экипаже
  statusText.textContent = statusMessage + ' Экипаж: ' + crewCount(save, CATS) + ' из ' + CATS.length + '.';
}

// Всплывающая подсказка внизу экрана. Держится TOAST_TIME и исчезает.
function showToast(text) {
  toast.textContent = text;
  toast.classList.add('visible');
  // Если прошлая подсказка ещё не спряталась — отменяем её таймер,
  // чтобы новая провисела свои полные 3 секунды
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove('visible');
  }, TOAST_TIME);
}

// =============================================================
// При загрузке страницы
// =============================================================
// Стартовый экран зависит от настроек (например, «Только режим „Дом“»)
renderStartScreen(); // home.js
