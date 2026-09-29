// =============================================================
// MewMo — Этап 1: карта и точка игрока
// =============================================================

// ----- Настройки -----
// Стартовая точка для демо-режима (когда GPS недоступен).
// Замени на координаты своего двора или парка.
const DEFAULT_POSITION = [48.8584, 2.2945];
const START_ZOOM = 17; // чем больше число, тем крупнее карта

// ----- Переменные состояния игры -----
let map;                 // сама карта
let playerMarker;        // значок игрока
let accuracyCircle;      // круг «примерно здесь» вокруг игрока
let followPlayer = true; // двигается ли карта вслед за игроком
let demoMode = false;    // true, когда GPS не работает

// ----- Находим элементы страницы по их id -----
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const statusText = document.getElementById('status');
const centerButton = document.getElementById('center-button');

// ----- Что происходит при нажатии кнопок -----
startButton.addEventListener('click', startGame);

centerButton.addEventListener('click', function () {
  followPlayer = true;
  map.setView(playerMarker.getLatLng(), START_ZOOM);
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
  map = L.map('map', { zoomControl: false }).setView(position, START_ZOOM);

  // Картинки карты берём у OpenStreetMap. Подпись об авторах обязательна.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  // Значок игрока: розовая точка, внешний вид задан в style.css
  const playerIcon = L.divIcon({
    className: 'player-icon',
    html: '<div class="player-dot"></div>',
    iconSize: [36, 36],
    iconAnchor: [18, 18] // «ножка» значка — ровно в центре
  });
  playerMarker = L.marker(position, { icon: playerIcon }).addTo(map);

  accuracyCircle = L.circle(position, { radius: 0, className: 'accuracy-circle' }).addTo(map);

  // Если игрок сам двигает карту пальцем — перестаём за ним следить
  map.on('dragstart', function () {
    followPlayer = false;
  });

  // Клик по карте нужен для демо-режима
  map.on('click', onMapClick);
}

// =============================================================
// GPS прислал новое местоположение
// =============================================================
function onPosition(pos) {
  demoMode = false; // GPS заработал — выходим из демо-режима
  const latLng = [pos.coords.latitude, pos.coords.longitude];
  movePlayer(latLng, pos.coords.accuracy);
  setStatus('Ты здесь. Точность: ' + Math.round(pos.coords.accuracy) + ' м');
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
function movePlayer(latLng, accuracy) {
  playerMarker.setLatLng(latLng);
  accuracyCircle.setLatLng(latLng);
  accuracyCircle.setRadius(accuracy || 0);

  if (followPlayer) {
    map.panTo(latLng);
  }
}

// =============================================================
// Демо-режим: играем без GPS, нажимая на карту
// =============================================================
function startDemoMode(reason) {
  demoMode = true;
  setStatus(reason + ' Демо-режим: нажми на карту, чтобы переместиться.');
}

function onMapClick(event) {
  if (!demoMode) return; // с работающим GPS клики не двигают игрока
  movePlayer([event.latlng.lat, event.latlng.lng], 0);
}

// ----- Маленький помощник: написать текст в строке состояния -----
function setStatus(text) {
  statusText.textContent = text;
}
