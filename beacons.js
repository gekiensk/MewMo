// =============================================================
// MewMo — маяки у реальных мест
// =============================================================
// Маяки стоят у детских площадок, парков, фонтанов, библиотек, музеев
// и арт-объектов. Места берутся из данных самой карты (слой 'poi'),
// ничего никуда не отправляется.
//
// Этот файл «тонкий»: он только достаёт места из карты, рисует маркеры
// и реагирует на нажатия. Все правила (какие места годятся, сколько
// маяков, награды, перезарядка) — в logic.js.
//
// Каждый маяк — объект:
//   id       — id места из данных карты ('poi-…') или 'virtual-…';
//   position — [долгота, широта] (живёт только в памяти, не сохраняется);
//   kind     — вид места ('park', 'library' … или 'virtual');
//   name     — название из карты (может быть пустым);
//   marker, element, timer — маркер на карте, кнопка и надпись с таймером.

// ----- Настройки -----
const BEACON_REFRESH_DISTANCE = 30;  // пересчитываем маяки, если игрок ушёл на 30 м
const BEACON_REFRESH_TIME = 20000;   // …или раз в 20 секунд
const BEACON_VIRTUAL_RETRY = 3000;   // пока стоят виртуальные маяки — ищем настоящие раз в 3 с

// ----- Состояние -----
let beacons = [];              // маяки, которые сейчас на карте
let lastBeaconCenter = null;   // где был игрок при прошлом пересчёте
let lastBeaconTime = 0;        // когда был прошлый пересчёт (мс)

// =============================================================
// Пересчёт маяков
// =============================================================
// force = true — пересчитать сразу, не глядя на расстояние и время
function refreshBeacons(force) {
  if (!map || !playerMarker) return;
  const center = playerPosition();
  const now = Date.now();

  // Не пересчитываем слишком часто: это не бесплатно для телефона.
  // Но пока стоят только виртуальные маяки, пробуем чаще: данные карты
  // могли как раз догрузиться, и тогда появятся настоящие места.
  const movedFar = !lastBeaconCenter ||
    distanceMeters(lastBeaconCenter, center) > BEACON_REFRESH_DISTANCE;
  const onlyVirtual = beacons.every(function (b) { return b.kind === 'virtual'; });
  const waitTime = (onlyVirtual && !demoMode) ? BEACON_VIRTUAL_RETRY : BEACON_REFRESH_TIME;
  if (!force && !movedFar && now - lastBeaconTime < waitTime) {
    return;
  }
  lastBeaconCenter = center;
  lastBeaconTime = now;

  // 1. Настоящие места из карты (в демо-режиме — не ищем)
  const candidates = demoMode ? [] : readBeaconPlaces();
  let chosen = selectBeacons(candidates, center); // из logic.js

  // 2. Настоящих нет — «виртуальные» маяки. Старые виртуальные
  //    оставляем, пока игрок рядом с ними, иначе ставим новые.
  if (chosen.length === 0) {
    const oldVirtual = beacons.filter(function (b) { return b.kind === 'virtual'; });
    chosen = beaconsNear(oldVirtual, center, BEACON_RADIUS);
    if (chosen.length === 0) {
      chosen = makeVirtualBeacons(center, Math.random, now);
    }
  }

  showBeacons(chosen);
}

// Достаёт из данных карты места, подходящие для маяков.
// querySourceFeatures отдаёт всё, что уже загружено в кусочки карты.
function readBeaconPlaces() {
  const places = [];
  let features = [];
  try {
    features = map.querySourceFeatures('openmaptiles', { sourceLayer: 'poi' });
  } catch (error) {
    return places; // стиль карты не загрузился — мест нет
  }

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    if (!feature.geometry || feature.geometry.type !== 'Point') continue;
    if (!isBeaconPlace(feature.properties)) continue; // из logic.js

    const kind = beaconKind(feature.properties);
    const name = feature.properties.name || '';
    // id места из карты. Если его нет — склеиваем вид и название
    // (координаты в id не пишем).
    const id = feature.id !== undefined ? 'poi-' + feature.id : 'poi-' + kind + '-' + name;
    places.push({
      id: id,
      position: feature.geometry.coordinates, // [долгота, широта]
      kind: kind,
      name: name
    });
  }
  return places;
}

// Ставит на карту выбранные маяки. Маяки, которые уже стоят, не трогаем
// (чтобы они не мигали), лишние убираем, новые добавляем.
function showBeacons(chosen) {
  const chosenIds = chosen.map(function (b) { return b.id; });

  // Убираем маяки, которых больше нет в списке
  const kept = [];
  for (let i = 0; i < beacons.length; i++) {
    if (chosenIds.includes(beacons[i].id)) {
      kept.push(beacons[i]);
    } else {
      beacons[i].marker.remove();
    }
  }
  beacons = kept;

  // Добавляем новые
  const keptIds = beacons.map(function (b) { return b.id; });
  for (let i = 0; i < chosen.length; i++) {
    if (!keptIds.includes(chosen[i].id)) {
      addBeaconMarker(chosen[i]);
    }
  }
  updateBeaconLooks();
}

function addBeaconMarker(place) {
  // Маяк — кнопка, её вид задан в style.css (.beacon)
  const element = document.createElement('button');
  element.className = 'beacon';
  element.setAttribute('aria-label', 'Маяк: ' + beaconTitle(place));
  element.innerHTML = beaconIcon(); // картинка маяка из art.js

  // Надпись с таймером перезарядки (видна, только когда маяк тусклый)
  const timer = document.createElement('span');
  timer.className = 'beacon-timer';
  element.appendChild(timer);

  const beacon = {
    id: place.id,
    position: place.position,
    kind: place.kind,
    name: place.name,
    element: element,
    timer: timer,
    marker: new maplibregl.Marker({ element: element, anchor: 'bottom' })
      .setLngLat(place.position)
      .addTo(map)
  };
  beacons.push(beacon);

  element.addEventListener('click', function () {
    openBeacon(beacon);
  });
}

// =============================================================
// Вид маяков
// =============================================================
// beacon-near     — игрок ближе 40 м, маяк светится ярче;
// beacon-charging — маяк перезаряжается: тусклый, виден таймер.
function updateBeaconLooks() {
  if (!playerMarker) return;
  const now = Date.now();
  for (let i = 0; i < beacons.length; i++) {
    const beacon = beacons[i];
    const left = beaconCooldownLeft(save.beaconCooldowns, beacon.id, now);
    const charging = left > 0;
    const near = !charging && distanceMeters(playerPosition(), beacon.position) <= OPEN_DISTANCE;
    beacon.element.classList.toggle('beacon-charging', charging);
    beacon.element.classList.toggle('beacon-near', near);
    beacon.timer.textContent = charging ? formatTimeLeft(left) : '';
  }
}

// =============================================================
// Нажатие на маяк
// =============================================================
function openBeacon(beacon) {
  const now = Date.now();
  const left = beaconCooldownLeft(save.beaconCooldowns, beacon.id, now);
  if (left > 0) {
    showToast('Маяк перезаряжается. Осталось ' + formatTimeLeft(left) + '.');
    return;
  }

  const distance = distanceMeters(playerPosition(), beacon.position);
  if (distance > OPEN_DISTANCE) {
    showToast('Подойди ближе! До маяка ' + Math.round(distance) + ' м.');
    return;
  }

  // Награда: 2–4 рыбки и, может быть, деталь корабля
  const reward = beaconReward(Math.random);
  save = applyBeaconReward(save, beacon.id, reward, now);
  // Ингредиенты для кухни — только на прогулке (logic.js)
  const found = beaconIngredients(Math.random);
  save.pantry = addIngredients(save.pantry, found);
  saveGame();

  let text = beaconTitle(beacon) + ': +' + reward.fish + ' 🐟';
  if (reward.parts > 0) {
    text = text + ' и деталь корабля 🔩';
  }
  text = text + '. В кладовую: ' + ingredientsText(found);
  playSound('reward');
  showToast(text + '!');
  questEvent('beacon'); // задание «Зайди на маяк» (quests.js)
  updateBeaconLooks();
}
