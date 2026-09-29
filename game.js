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
const CAPSULE_COUNT = 5;        // сколько капсул появится вокруг игрока
const CAPSULE_MIN_DISTANCE = 30;  // ближе этого (в метрах) капсулы не появляются
const CAPSULE_MAX_DISTANCE = 150; // дальше этого (в метрах) капсулы не появляются
const OPEN_DISTANCE = 40;       // с какого расстояния (в метрах) можно открыть капсулу

// Цвет круга точности GPS. Это тот же розовый, что --nose в style.css.
// Круг рисует сама карта, а она не умеет читать переменные из CSS,
// поэтому цвет записан здесь ещё раз.
const ACCURACY_COLOR = '#FF8FB1';

// ----- Переменные состояния игры -----
let map;                 // сама карта
let playerMarker;        // значок игрока
let followPlayer = true; // двигается ли карта вслед за игроком
let demoMode = false;    // true, когда GPS не работает
let capsules = [];       // список капсул, которые ещё лежат на карте
let capsulesPlaced = false; // разложили ли уже капсулы вокруг игрока
let foundCats = 0;       // сколько котов уже нашли
let hasGps = false;      // приходил ли уже хоть раз ответ от GPS

// Пока карта грузит свой стиль, рисовать круг точности нельзя.
// Поэтому запоминаем последний круг и нарисуем его, когда карта будет готова.
let mapReady = false;
let lastAccuracy = { center: DEFAULT_POSITION, radius: 0 };

// ----- Находим элементы страницы по их id -----
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const statusText = document.getElementById('status');
const centerButton = document.getElementById('center-button');

// ----- Что происходит при нажатии кнопок -----
startButton.addEventListener('click', startGame);

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
// Запуск игры
// =============================================================
function startGame() {
  startScreen.classList.add('hidden'); // прячем стартовый экран
  createMap(DEFAULT_POSITION);

  if ('geolocation' in navigator) {
    setStatus('Ищем тебя на карте…');
    // watchPosition вызывает onPosition каждый раз, когда игрок сдвинулся
    navigator.geolocation.watchPosition(onPosition, onPositionError, {
      enableHighAccuracy: true, // просим точный GPS
      maximumAge: 5000,         // можно взять данные не старше 5 секунд
      timeout: 15000            // ждём ответа не дольше 15 секунд
    });
  } else {
    startDemoMode('Этот браузер не умеет определять местоположение.');
  }
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
  map.on('load', function () {
    add3dBuildings();
    addAccuracyCircle();
    mapReady = true;
    drawAccuracyCircle(lastAccuracy.center, lastAccuracy.radius);
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
  const lng = center[0];
  const lat = center[1];
  // Сколько градусов в одном метре (примерно).
  // По широте: 1 градус ≈ 111 320 м. По долготе меньше — зависит от широты.
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(lat * Math.PI / 180);

  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * 2 * Math.PI; // угол от 0 до полного круга
    points.push([
      lng + (radius * Math.cos(angle)) / metersPerDegreeLng,
      lat + (radius * Math.sin(angle)) / metersPerDegreeLat
    ]);
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
  demoMode = false; // GPS заработал — выходим из демо-режима

  // Первый ответ GPS: если капсулы уже лежат вокруг демо-точки,
  // убираем их — новые появятся рядом с настоящим местом игрока
  if (!hasGps) {
    hasGps = true;
    removeAllCapsules();
  }

  const lngLat = [pos.coords.longitude, pos.coords.latitude]; // сначала долгота!
  movePlayer(lngLat, pos.coords.accuracy);
  setStatus('Ты здесь. Точность: ' + Math.round(pos.coords.accuracy) + ' м. ' +
    'Найдено котов: ' + foundCats);
}

// GPS не смог определить местоположение
function onPositionError(error) {
  if (error.code === error.PERMISSION_DENIED) {
    startDemoMode('Нет разрешения на геолокацию.');
  } else if (error.code === error.TIMEOUT) {
    startDemoMode('GPS долго не отвечает.');
  } else {
    startDemoMode('Не получается найти тебя на карте.');
  }
}

// =============================================================
// Перемещение игрока
// =============================================================
function movePlayer(lngLat, accuracy) {
  playerMarker.setLngLat(lngLat);
  drawAccuracyCircle(lngLat, accuracy || 0);

  // Когда игрок впервые появился на карте, раскладываем вокруг него капсулы
  if (!capsulesPlaced) {
    spawnCapsules(lngLat);
  }

  if (followPlayer) {
    map.easeTo({ center: lngLat }); // плавно двигаем карту за игроком
  }
}

// =============================================================
// Капсулы с котами
// =============================================================
function spawnCapsules(center) {
  capsulesPlaced = true;
  for (let i = 0; i < CAPSULE_COUNT; i++) {
    // Случайное направление и случайное расстояние от игрока
    const angle = Math.random() * 2 * Math.PI;
    const distance = CAPSULE_MIN_DISTANCE +
      Math.random() * (CAPSULE_MAX_DISTANCE - CAPSULE_MIN_DISTANCE);
    // Переводим «метры в сторону» в координаты — так же, как в makeCircle
    const lat = center[1];
    const lng = center[0];
    const position = [
      lng + (distance * Math.cos(angle)) / (111320 * Math.cos(lat * Math.PI / 180)),
      lat + (distance * Math.sin(angle)) / 111320
    ];
    addCapsule(position);
  }
}

function addCapsule(position) {
  // Капсула — тоже HTML-маркер, её вид задан в style.css (.capsule)
  const element = document.createElement('button');
  element.className = 'capsule';
  element.setAttribute('aria-label', 'Капсула с котом');

  const marker = new maplibregl.Marker({ element: element, anchor: 'bottom' })
    .setLngLat(position)
    .addTo(map);

  capsules.push(marker);

  element.addEventListener('click', function () {
    openCapsule(marker);
  });
}

function openCapsule(marker) {
  // distanceTo считает расстояние между двумя точками в метрах
  const distance = playerMarker.getLngLat().distanceTo(marker.getLngLat());

  if (distance > OPEN_DISTANCE) {
    setStatus('Подойди ближе! До капсулы ' + Math.round(distance) + ' м.');
    return;
  }

  marker.remove(); // убираем капсулу с карты
  capsules = capsules.filter(function (m) { return m !== marker; });
  foundCats = foundCats + 1;

  if (capsules.length === 0) {
    setStatus('Ура! Ты нашёл всех котов: ' + foundCats + '!');
  } else {
    setStatus('Ты нашёл кота! Найдено: ' + foundCats + '. Осталось капсул: ' + capsules.length + '.');
  }
}

// Убирает с карты все капсулы (например, чтобы разложить их заново)
function removeAllCapsules() {
  for (let i = 0; i < capsules.length; i++) {
    capsules[i].remove();
  }
  capsules = [];
  capsulesPlaced = false;
}

// =============================================================
// Демо-режим: играем без GPS, нажимая на карту
// =============================================================
function startDemoMode(reason) {
  demoMode = true;
  setStatus(reason + ' Демо-режим: нажми на карту, чтобы переместиться.');
  // Без GPS игрок стоит в стартовой точке — раскладываем капсулы вокруг неё
  if (!capsulesPlaced) {
    spawnCapsules(DEFAULT_POSITION);
  }
}

function onMapClick(event) {
  if (!demoMode) return; // с работающим GPS клики не двигают игрока
  // Нажатие на капсулу — это «открыть капсулу», а не «идти сюда»
  if (event.originalEvent.target.closest('.capsule')) return;
  movePlayer([event.lngLat.lng, event.lngLat.lat], 0);
}

// ----- Маленький помощник: написать текст в строке состояния -----
function setStatus(text) {
  statusText.textContent = text;
}
