// =============================================================
// MewMo — «чистая» логика игры
// =============================================================
// Здесь только расчёты: никакой карты, никаких кнопок и HTML.
// Поэтому этот файл можно проверять автоматическими тестами в Node
// (см. папку tests/), а в браузере он подключается обычным <script>.
//
// Многие функции принимают параметр random — это функция, которая
// возвращает случайное число от 0 до 1 (как Math.random).
// В игре туда передаётся Math.random, а в тестах — «подставная»
// функция с заранее известными числами, чтобы проверять результат.

// =============================================================
// Расстояния и координаты
// =============================================================
// Помним: координаты в формате [долгота, широта].

// Сколько метров в одном градусе широты (примерно)
const METERS_PER_DEGREE = 111320;

// Расстояние между двумя точками в метрах.
// Это формула гаверсинусов: она учитывает, что Земля — шар.
function distanceMeters(a, b) {
  const earthRadius = 6371000; // радиус Земли в метрах
  const toRadians = Math.PI / 180;
  const lat1 = a[1] * toRadians;
  const lat2 = b[1] * toRadians;
  const deltaLat = (b[1] - a[1]) * toRadians;
  const deltaLng = (b[0] - a[0]) * toRadians;

  const h = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

// Точка, которая лежит в distance метрах от center в направлении angle
// (angle — угол в радианах: 0 — на восток, π/2 — на север).
function offsetPosition(center, distance, angle) {
  const lng = center[0];
  const lat = center[1];
  // В одном градусе долготы метров меньше, чем в градусе широты,
  // и чем ближе к полюсу, тем меньше. Это учитывает косинус широты.
  const metersPerDegreeLng = METERS_PER_DEGREE * Math.cos(lat * Math.PI / 180);
  return [
    lng + (distance * Math.cos(angle)) / metersPerDegreeLng,
    lat + (distance * Math.sin(angle)) / METERS_PER_DEGREE
  ];
}

// Случайное место для новой капсулы: от minDistance до maxDistance метров
// от игрока, в случайном направлении.
function randomCapsulePosition(center, minDistance, maxDistance, random) {
  const angle = random() * 2 * Math.PI;
  const distance = minDistance + random() * (maxDistance - minDistance);
  return offsetPosition(center, distance, angle);
}

// =============================================================
// Выбор кота по редкости
// =============================================================
// Шансы редкостей. В сумме — 1 (то есть 100%).
const RARITY_CHANCES = [
  { rarity: 'обычный', chance: 0.70 },
  { rarity: 'редкий', chance: 0.25 },
  { rarity: 'легендарный', chance: 0.05 }
];

// Выбирает редкость: бросаем «кубик» от 0 до 1 и смотрим,
// в какой отрезок он попал: [0; 0.70) — обычный,
// [0.70; 0.95) — редкий, [0.95; 1) — легендарный.
function pickRarity(random) {
  const roll = random();
  let sum = 0;
  for (let i = 0; i < RARITY_CHANCES.length; i++) {
    sum = sum + RARITY_CHANCES[i].chance;
    if (roll < sum) {
      return RARITY_CHANCES[i].rarity;
    }
  }
  // Сюда попадём только из-за крошечных ошибок округления
  return RARITY_CHANCES[RARITY_CHANCES.length - 1].rarity;
}

// Выбирает кота: сначала редкость, потом случайного кота этой редкости
function pickCat(cats, random) {
  const rarity = pickRarity(random);
  const sameRarity = cats.filter(function (cat) { return cat.rarity === rarity; });
  // Если котов такой редкости нет — берём из всех
  const choices = sameRarity.length > 0 ? sameRarity : cats;
  return choices[Math.floor(random() * choices.length)];
}

// Сколько звёздочек у редкости (1–3)
function rarityStars(rarity) {
  if (rarity === 'легендарный' || rarity === 'капитан') return 3;
  if (rarity === 'редкий') return 2;
  return 1;
}

// =============================================================
// «Лапка, Коготь, Клубок»
// =============================================================
const GESTURES = ['Лапка', 'Коготь', 'Клубок'];

// Кого бьёт каждый жест:
// Лапка прижимает Коготь, Коготь режет нитку Клубка, Клубок запутывает Лапку
const BEATS = {
  'Лапка': 'Коготь',
  'Коготь': 'Клубок',
  'Клубок': 'Лапка'
};

// Результат раунда с точки зрения игрока: 'победа', 'поражение' или 'ничья'
function roundResult(playerGesture, catGesture) {
  if (playerGesture === catGesture) return 'ничья';
  if (BEATS[playerGesture] === catGesture) return 'победа';
  return 'поражение';
}

// Кот выбирает жест: в половине случаев — любимый,
// иначе — случайный из трёх (случайный тоже может оказаться любимым,
// поэтому всего любимый выпадает примерно в 2/3 случаев).
function catChooseGesture(favoriteGesture, random) {
  if (random() < 0.5) {
    return favoriteGesture;
  }
  return GESTURES[Math.floor(random() * GESTURES.length)];
}

// =============================================================
// «Поймай сигнал»
// =============================================================
// Сложность зависит от редкости кота (у капитанов rarity = 'капитан'):
// zoneWidth — ширина зелёной зоны (доля шкалы от 0 до 1),
// speed — сколько «шкал» огонёк пробегает за секунду.
function signalSettings(rarity, reducedMotion) {
  let settings;
  if (rarity === 'капитан') {
    // у капитанов зона ещё уже, чем у легендарных
    settings = { zoneWidth: 0.08, speed: 1.6 };
  } else if (rarity === 'легендарный') {
    settings = { zoneWidth: 0.12, speed: 1.6 };
  } else if (rarity === 'редкий') {
    settings = { zoneWidth: 0.2, speed: 1.2 };
  } else {
    settings = { zoneWidth: 0.3, speed: 0.8 };
  }
  // «Уменьшить движение»: огонёк бежит вдвое медленнее
  if (reducedMotion) {
    settings.speed = settings.speed / 2;
  }
  return settings;
}

// Где огонёк через seconds секунд: число от 0 (левый край) до 1 (правый).
// Огонёк бежит туда-обратно: 0 → 1 → 0 → 1 …
function signalPosition(seconds, speed) {
  const path = (seconds * speed) % 2; // пройденный путь, от 0 до 2
  return path <= 1 ? path : 2 - path; // вторая половина — обратно
}

// Попал ли огонёк в зелёную зону. Края зоны тоже считаются попаданием.
function isInGreenZone(position, zoneStart, zoneWidth) {
  // Компьютер считает дроби чуть-чуть неточно: например, 0.7 + 0.1
  // у него получается 0.7999999999999999. Поэтому добавляем к краям
  // крошечный запас EDGE, чтобы попадание ровно в край засчитывалось.
  const EDGE = 0.000001;
  return position >= zoneStart - EDGE && position <= zoneStart + zoneWidth + EDGE;
}

// =============================================================
// Ошибки GPS
// =============================================================
// Что делать, когда GPS прислал ошибку. Возвращает:
//   'демо'          — включить демо-режим (игрок ходит нажатием на карту);
//   'слабый сигнал' — оставить игрока на последнем известном месте
//                     и просто написать «Слабый сигнал GPS…».
// gpsWorked      — приходило ли уже хоть одно местоположение от GPS;
// permissionDenied — игрок не разрешил геолокацию.
function gpsErrorAction(gpsWorked, permissionDenied) {
  // Нет разрешения — без демо-режима играть не получится
  if (permissionDenied) return 'демо';
  // GPS уже работал, а сейчас сигнал пропал (например, игрок зашёл
  // под крышу или в арку) — это временно, ждём, пока сигнал вернётся
  if (gpsWorked) return 'слабый сигнал';
  // GPS не заработал ни разу — включаем демо-режим
  return 'демо';
}

// =============================================================
// Сохранение прогресса
// =============================================================
// Прогресс хранится в памяти браузера (localStorage) в виде текста JSON.
// ВАЖНО: координаты игрока сюда НИКОГДА не записываются.
//
// Как выглядит сохранение:
// {
//   crew: { bul: 2, moh: 1 },   // кто в экипаже и сколько раз встречен
//   captains: { … },            // капитаны в экипаже (так же: id → встречи)
//   fish: 12,                   // космические рыбки
//   parts: 3,                   // детали корабля
//   beaconCooldowns: { … },     // маяки на перезарядке: id → до какого времени (мс)
//   nextCaptainAt: 0            // раньше этого времени (мс) новый капитан не появится
// }

const SAVE_KEY = 'mewmo-save-v1'; // под этим именем лежит сохранение
const SHIP_PARTS_NEEDED = 20;      // сколько деталей нужно для ремонта корабля
const NEW_CAT_PARTS = 1;           // награда за нового кота — деталь корабля
const REPEAT_CAT_FISH = 3;         // награда за повторную встречу — рыбки

// Пустое сохранение: игра с нуля
function emptySave() {
  return { crew: {}, captains: {}, fish: 0, parts: 0, beaconCooldowns: {}, nextCaptainAt: 0 };
}

// Целое число 0 или больше? (для проверки испорченных данных)
function isCount(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

// Проверяет «словарь» вида { id: число } и оставляет только правильные
// записи. Числа должны быть не меньше minValue.
function cleanCounts(data, minValue) {
  const result = {};
  // Должен быть обычный объект, а не массив, не null и не строка
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return result;
  }
  const keys = Object.keys(data);
  for (let i = 0; i < keys.length; i++) {
    const value = data[keys[i]];
    if (isCount(value) && value >= minValue) {
      result[keys[i]] = value;
    }
  }
  return result;
}

// Приводит прочитанные данные в порядок. Всё испорченное заменяется
// на значения «с нуля», чтобы игра не сломалась.
function cleanSave(data) {
  const save = emptySave();
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return save;
  }
  save.crew = cleanCounts(data.crew, 1);
  save.captains = cleanCounts(data.captains, 1);
  save.fish = isCount(data.fish) ? data.fish : 0;
  save.parts = isCount(data.parts) ? data.parts : 0;
  save.beaconCooldowns = cleanCounts(data.beaconCooldowns, 0);
  save.nextCaptainAt = isCount(data.nextCaptainAt) ? data.nextCaptainAt : 0;
  return save;
}

// Прочитать сохранение. storage — хранилище (в игре это localStorage,
// в тестах — подставной объект с методами getItem и setItem).
// Если сохранения нет или оно испорчено — начинаем с нуля.
function loadSave(storage) {
  try {
    const text = storage.getItem(SAVE_KEY);
    if (!text) return emptySave();
    return cleanSave(JSON.parse(text));
  } catch (error) {
    // Сюда попадём, если хранилища нет, оно запрещено
    // или внутри не JSON, а «каша»
    return emptySave();
  }
}

// Записать сохранение. Возвращает true, если получилось.
function writeSave(storage, save) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch (error) {
    // Память браузера переполнена или запрещена — играем без сохранения
    return false;
  }
}

// Копия сохранения, чтобы не менять исходный объект
// (так функции проще проверять тестами)
function copySave(save) {
  return JSON.parse(JSON.stringify(save));
}

// Есть ли кот в экипаже
function isInCrew(save, catId) {
  return (save.crew[catId] || 0) > 0;
}

// Сколько котов из каталога cats уже в экипаже
function crewCount(save, cats) {
  let count = 0;
  for (let i = 0; i < cats.length; i++) {
    if (isInCrew(save, cats[i].id)) count = count + 1;
  }
  return count;
}

// Игрок победил кота. Возвращает { save, reward }:
//   save   — новое сохранение;
//   reward — { isNew, parts, fish }: что игрок получил.
// Новый кот вступает в экипаж и приносит деталь корабля.
// Знакомый кот просто рад встрече и дарит рыбок (второй раз в экипаж
// он не добавляется, только растёт счётчик встреч).
function applyCatWin(save, catId) {
  const result = copySave(save);
  const isNew = !isInCrew(save, catId);
  const reward = { isNew: isNew, parts: 0, fish: 0 };

  result.crew[catId] = (result.crew[catId] || 0) + 1;
  if (isNew) {
    reward.parts = NEW_CAT_PARTS;
  } else {
    reward.fish = REPEAT_CAT_FISH;
  }
  result.parts = result.parts + reward.parts;
  result.fish = result.fish + reward.fish;
  return { save: result, reward: reward };
}

// Слово после числа по-русски: 1 деталь, 2 детали, 5 деталей,
// 11 деталей, 21 деталь, 22 детали …
function pluralRu(n, one, few, many) {
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

// Какая доля ремонта корабля готова: число от 0 до 1
function shipRepairShare(parts) {
  return Math.min(parts, SHIP_PARTS_NEEDED) / SHIP_PARTS_NEEDED;
}

// =============================================================
// Маяки у реальных мест
// =============================================================
// Маяки ставятся у интересных мест из данных карты: слой 'poi' источника
// OpenMapTiles. У каждого места там есть class (общий вид, например
// 'art_gallery') и subclass (точнее, например 'artwork').

// Разрешённые места: subclass (или class) → как назвать место в игре
const BEACON_PLACES = {
  playground: 'Детская площадка',
  park: 'Парк',
  garden: 'Сад',
  fountain: 'Фонтан',
  library: 'Библиотека',
  museum: 'Музей',
  artwork: 'Арт-объект',
  sculpture: 'Скульптура'
};

// Запрещённые места: если class ИЛИ subclass в этом списке, маяка не будет.
// Запрет сильнее разрешения. Здесь кладбища, мемориалы, места поклонения,
// больницы, школы и детские сады, дороги, парковки, стройки и железная дорога.
const BEACON_FORBIDDEN = [
  'cemetery', 'grave_yard',
  'memorial', 'monument', 'wayside_cross', 'wayside_shrine',
  'place_of_worship', 'religion', 'church', 'mosque', 'synagogue', 'temple', 'shrine',
  'hospital', 'clinic', 'doctors', 'dentist', 'nursing_home',
  'school', 'kindergarten', 'childcare', 'college', 'university',
  'road', 'highway', 'motorway', 'bus', 'bus_stop', 'bus_station',
  'parking', 'bicycle_parking', 'motorcycle_parking', 'parking_entrance', 'fuel',
  'construction',
  'railway', 'rail', 'station', 'halt', 'tram_stop', 'subway', 'level_crossing'
];

const BEACON_RADIUS = 300;           // маяки ищем не дальше 300 м от игрока
const BEACON_MAX_COUNT = 6;          // показываем не больше 6 маяков
const BEACON_MIN_GAP = 40;           // между маяками не меньше 40 м
const VIRTUAL_BEACON_COUNT = 3;      // сколько «виртуальных» маяков, если реальных нет
const BEACON_COOLDOWN = 5 * 60 * 1000; // перезарядка маяка: 5 минут (в мс)
const BEACON_PART_CHANCE = 0.3;      // шанс получить деталь корабля у маяка

// Годится ли место для маяка. properties — свойства места из данных карты.
function isBeaconPlace(properties) {
  if (!properties) return false;
  const placeClass = properties.class || '';
  const subclass = properties.subclass || '';
  // Сначала запреты
  if (BEACON_FORBIDDEN.includes(placeClass) || BEACON_FORBIDDEN.includes(subclass)) {
    return false;
  }
  return beaconKind(properties) !== '';
}

// Вид места для маяка ('park', 'library' …) или '' если не подходит.
// Сначала смотрим на subclass (он точнее), потом на class.
// Пример: книжный магазин в данных — class 'library', subclass 'books'.
// subclass 'books' не разрешён, поэтому магазин маяком не станет.
function beaconKind(properties) {
  const subclass = properties.subclass || '';
  if (subclass !== '') {
    return BEACON_PLACES[subclass] ? subclass : '';
  }
  const placeClass = properties.class || '';
  return BEACON_PLACES[placeClass] ? placeClass : '';
}

// Выбирает маяки из списка мест-кандидатов.
// candidates — [{ id, position, kind, name }], center — где игрок.
// Берём места не дальше BEACON_RADIUS, начиная с ближайших, и пропускаем
// те, что ближе BEACON_MIN_GAP к уже выбранным (так убираются дубликаты
// одного места — в данных карты одно место иногда встречается дважды).
function selectBeacons(candidates, center) {
  // Добавляем каждому кандидату расстояние до игрока
  const near = [];
  for (let i = 0; i < candidates.length; i++) {
    const distance = distanceMeters(center, candidates[i].position);
    if (distance <= BEACON_RADIUS) {
      near.push({ place: candidates[i], distance: distance });
    }
  }
  // Сортируем: ближние — первыми
  near.sort(function (a, b) { return a.distance - b.distance; });

  const chosen = [];
  for (let i = 0; i < near.length && chosen.length < BEACON_MAX_COUNT; i++) {
    const place = near[i].place;
    let tooClose = false;
    for (let j = 0; j < chosen.length; j++) {
      if (chosen[j].id === place.id ||
          distanceMeters(chosen[j].position, place.position) < BEACON_MIN_GAP) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) chosen.push(place);
  }
  return chosen;
}

// Маяки из списка, которые не дальше radius метров от игрока
function beaconsNear(beacons, center, radius) {
  return beacons.filter(function (beacon) {
    return distanceMeters(center, beacon.position) <= radius;
  });
}

// «Виртуальные» маяки — если в данных карты подходящих мест нет.
// Ставим их вокруг игрока на 60–120 м, примерно через треть круга
// друг от друга — так между ними точно больше BEACON_MIN_GAP.
// idPrefix — начало id (например, время создания), чтобы id не повторялись.
function makeVirtualBeacons(center, random, idPrefix) {
  const beacons = [];
  const startAngle = random() * 2 * Math.PI;
  for (let i = 0; i < VIRTUAL_BEACON_COUNT; i++) {
    // ровно по кругу + небольшое случайное отклонение (до ±20°)
    const wobble = (random() - 0.5) * (40 * Math.PI / 180);
    const angle = startAngle + i * (2 * Math.PI / VIRTUAL_BEACON_COUNT) + wobble;
    const distance = 60 + random() * 60;
    beacons.push({
      id: 'virtual-' + idPrefix + '-' + i,
      position: offsetPosition(center, distance, angle),
      kind: 'virtual',
      name: ''
    });
  }
  return beacons;
}

// Как назвать маяк для игрока
function beaconTitle(beacon) {
  if (beacon.name) return beacon.name;
  if (beacon.kind === 'virtual') return 'Космический маяк';
  return BEACON_PLACES[beacon.kind] || 'Маяк';
}

// Награда маяка: 2–4 рыбки и с шансом 30% деталь корабля
function beaconReward(random) {
  const fish = 2 + Math.floor(random() * 3); // 2, 3 или 4
  const parts = random() < BEACON_PART_CHANCE ? 1 : 0;
  return { fish: fish, parts: parts };
}

// Сколько миллисекунд осталось до конца перезарядки (0 — маяк готов).
// cooldowns — словарь «id маяка → до какого времени перезаряжается».
function beaconCooldownLeft(cooldowns, beaconId, now) {
  const readyAt = cooldowns[beaconId] || 0;
  return Math.max(0, readyAt - now);
}

// Запускает перезарядку маяка. Возвращает НОВЫЙ словарь, в котором
// заодно выброшены маяки, чья перезарядка уже закончилась
// (чтобы сохранение не росло бесконечно).
function startBeaconCooldown(cooldowns, beaconId, now) {
  const result = {};
  const ids = Object.keys(cooldowns);
  for (let i = 0; i < ids.length; i++) {
    if (cooldowns[ids[i]] > now) {
      result[ids[i]] = cooldowns[ids[i]];
    }
  }
  result[beaconId] = now + BEACON_COOLDOWN;
  return result;
}

// Игрок забрал награду маяка: возвращает новое сохранение
function applyBeaconReward(save, beaconId, reward, now) {
  const result = copySave(save);
  result.fish = result.fish + reward.fish;
  result.parts = result.parts + reward.parts;
  result.beaconCooldowns = startBeaconCooldown(result.beaconCooldowns, beaconId, now);
  return result;
}

// Время «минуты:секунды», например 4:05
function formatTimeLeft(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

// =============================================================
// Что рядом на карте: вода, зелень или город
// =============================================================
// Данные карты приходят в формате GeoJSON: у каждой фигуры есть
// geometry.type ('Point', 'LineString', 'Polygon' и «мульти»-версии)
// и geometry.coordinates — точки [долгота, широта].

const TERRAIN_RADIUS = 100;     // смотрим, что есть в 100 м от капсулы
const PLACE_TYPE_CHANCE = 0.6;  // «чаще» = 60% кот подходящего к месту типа

// Какой тип кота «живёт» в каждой местности
const TERRAIN_CAT_TYPE = {
  'вода': 'водный',
  'зелень': 'лесной',
  'город': 'городской'
};

// Что это за фигура на карте: 'вода', 'зелень' или '' (не важно для нас).
// sourceLayer — слой данных OpenMapTiles, properties — свойства фигуры.
function terrainKind(sourceLayer, properties) {
  const placeClass = (properties && properties.class) || '';
  if (sourceLayer === 'water') {
    // бассейн — это не пруд
    return placeClass === 'swimming_pool' ? '' : 'вода';
  }
  if (sourceLayer === 'waterway') {
    // реки, ручьи и каналы (канавы не считаем)
    return ['river', 'stream', 'canal'].includes(placeClass) ? 'вода' : '';
  }
  if (sourceLayer === 'landcover') {
    // лес, трава (в том числе газоны парков) и поля
    return ['wood', 'grass', 'farmland'].includes(placeClass) ? 'зелень' : '';
  }
  if (sourceLayer === 'park') {
    return 'зелень'; // национальные парки и заповедники
  }
  return '';
}

// Переводит точку [долгота, широта] в метры относительно origin
// (x — на восток, y — на север). На расстояниях в сотни метров
// Землю можно считать плоской — ошибка крошечная.
function toLocalMeters(point, origin) {
  const metersPerDegreeLng = METERS_PER_DEGREE * Math.cos(origin[1] * Math.PI / 180);
  return {
    x: (point[0] - origin[0]) * metersPerDegreeLng,
    y: (point[1] - origin[1]) * METERS_PER_DEGREE
  };
}

// Расстояние (в метрах) от начала координат до отрезка a–b.
// Точка игрока — это (0, 0), а a и b уже в метрах.
function distanceToSegment(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  // t — где на отрезке ближайшая к (0, 0) точка: 0 — в a, 1 — в b
  let t = 0;
  if (lengthSquared > 0) {
    t = -(a.x * dx + a.y * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
  }
  const x = a.x + t * dx;
  const y = a.y + t * dy;
  return Math.sqrt(x * x + y * y);
}

// Лежит ли (0, 0) внутри кольца (замкнутой ломаной) — «метод луча»:
// пускаем луч вправо и считаем, сколько раз он пересёк границу.
// Нечётное число — точка внутри.
function isInsideRing(ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i = i + 1) {
    const a = ring[i];
    const b = ring[j];
    const crosses = (a.y > 0) !== (b.y > 0) &&
      0 < (b.x - a.x) * (0 - a.y) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

// Самое маленькое расстояние от (0, 0) до ломаной (цепочки отрезков)
function distanceToLine(points) {
  if (points.length === 1) {
    return Math.sqrt(points[0].x * points[0].x + points[0].y * points[0].y);
  }
  let best = Infinity;
  for (let i = 0; i + 1 < points.length; i++) {
    best = Math.min(best, distanceToSegment(points[i], points[i + 1]));
  }
  return best;
}

// Расстояние от многоугольника: 0, если точка внутри (и не в «дырке»),
// иначе — до ближайшей границы. rings[0] — внешняя граница, остальные — дырки.
function distanceToPolygon(rings) {
  if (rings.length === 0) return Infinity;
  let inside = isInsideRing(rings[0]);
  for (let i = 1; i < rings.length; i++) {
    if (isInsideRing(rings[i])) inside = false; // точка в «дырке»
  }
  if (inside) return 0;
  let best = Infinity;
  for (let i = 0; i < rings.length; i++) {
    best = Math.min(best, distanceToLine(rings[i]));
  }
  return best;
}

// Расстояние в метрах от точки до фигуры GeoJSON любого вида.
// Если фигура непонятная — Infinity («очень далеко»).
function distanceToGeometry(point, geometry) {
  if (!geometry || !geometry.coordinates) return Infinity;
  // Переводим список точек в метры относительно point
  function toMeters(list) {
    return list.map(function (p) { return toLocalMeters(p, point); });
  }
  const c = geometry.coordinates;
  let best = Infinity;
  if (geometry.type === 'Point') {
    return distanceToLine(toMeters([c]));
  } else if (geometry.type === 'MultiPoint' || geometry.type === 'LineString') {
    return c.length > 0 ? distanceToLine(toMeters(c)) : Infinity;
  } else if (geometry.type === 'MultiLineString') {
    for (let i = 0; i < c.length; i++) {
      if (c[i].length > 0) best = Math.min(best, distanceToLine(toMeters(c[i])));
    }
  } else if (geometry.type === 'Polygon') {
    return distanceToPolygon(c.map(toMeters));
  } else if (geometry.type === 'MultiPolygon') {
    for (let i = 0; i < c.length; i++) {
      best = Math.min(best, distanceToPolygon(c[i].map(toMeters)));
    }
  }
  return best;
}

// Что рядом с точкой: 'вода', 'зелень' или 'город'.
// features — [{ kind: 'вода' | 'зелень', geometry }].
// Побеждает то, что ближе. Если вода и зелень одинаково близко
// (например, пруд в парке) — вода.
function terrainNear(point, features, radius) {
  let waterDistance = Infinity;
  let greenDistance = Infinity;
  for (let i = 0; i < features.length; i++) {
    const d = distanceToGeometry(point, features[i].geometry);
    if (features[i].kind === 'вода') waterDistance = Math.min(waterDistance, d);
    if (features[i].kind === 'зелень') greenDistance = Math.min(greenDistance, d);
  }
  if (waterDistance <= radius && waterDistance <= greenDistance) return 'вода';
  if (greenDistance <= radius) return 'зелень';
  return 'город';
}

// Выбирает кота с учётом места.
// options.terrain — 'вода', 'зелень', 'город' или null (данных карты нет).
// Сначала, как и раньше, редкость. Потом в 60% случаев — кот подходящего
// типа этой редкости, иначе — любой кот этой редкости.
// Легендарная Комета выпадает где угодно с обычным шансом.
function pickCatForPlace(cats, options, random) {
  const rarity = pickRarity(random);
  const sameRarity = cats.filter(function (cat) { return cat.rarity === rarity; });
  let choices = sameRarity.length > 0 ? sameRarity : cats;

  const wantedType = options && options.terrain ? TERRAIN_CAT_TYPE[options.terrain] : '';
  if (wantedType && rarity !== 'легендарный' && random() < PLACE_TYPE_CHANCE) {
    // Коты нужного типа этой редкости, а если таких нет — нужного типа любой
    // (не легендарной) редкости
    let placeCats = sameRarity.filter(function (cat) { return cat.type === wantedType; });
    if (placeCats.length === 0) {
      placeCats = cats.filter(function (cat) {
        return cat.type === wantedType && cat.rarity !== 'легендарный';
      });
    }
    if (placeCats.length > 0) choices = placeCats;
  }
  return choices[Math.floor(random() * choices.length)];
}

// =============================================================
// Бой «Лапка, Коготь, Клубок» (для обычных котов и для капитанов)
// =============================================================
// Состояние боя — объект:
//   winsNeeded  — до скольких побед играем (коты — 2, капитаны — 3);
//   playerWins, catWins — счёт;
//   helpersLeft — id помощников, которые ещё могут дать «вторую попытку»;
//   pendingLoss — true, если раунд проигран и игрок решает, позвать ли
//                 помощника (очко сопернику пока не засчитано);
//   finished    — '' (идёт), 'победа' или 'поражение'.
// Функции ниже не меняют старый объект, а возвращают новый.

function createBattle(winsNeeded, helperIds) {
  return {
    winsNeeded: winsNeeded,
    playerWins: 0,
    catWins: 0,
    helpersLeft: (helperIds || []).slice(), // копия списка
    pendingLoss: false,
    finished: ''
  };
}

// Проверяет, не закончился ли бой
function battleCheckFinished(battle) {
  if (battle.playerWins >= battle.winsNeeded) battle.finished = 'победа';
  else if (battle.catWins >= battle.winsNeeded) battle.finished = 'поражение';
  return battle;
}

// Итог раунда: result — 'победа', 'поражение' или 'ничья' (из roundResult)
function battleRound(state, result) {
  const battle = Object.assign({}, state, { helpersLeft: state.helpersLeft.slice() });
  if (battle.finished || battle.pendingLoss) return battle; // бой уже кончился или ждём решения
  if (result === 'победа') {
    battle.playerWins = battle.playerWins + 1;
  } else if (result === 'поражение') {
    if (battle.helpersLeft.length > 0) {
      // Есть помощник — очко пока не засчитываем, игрок решит сам
      battle.pendingLoss = true;
    } else {
      battle.catWins = battle.catWins + 1;
    }
  }
  return battleCheckFinished(battle);
}

// «Помоги, <имя>!» — помощник тратит свою вторую попытку,
// проигранный раунд не считается и переигрывается
function battleUseHelper(state, helperId) {
  const battle = Object.assign({}, state, { helpersLeft: state.helpersLeft.slice() });
  const index = battle.helpersLeft.indexOf(helperId);
  if (!battle.pendingLoss || index === -1) return battle;
  battle.helpersLeft.splice(index, 1);
  battle.pendingLoss = false;
  return battle;
}

// Игрок решил не звать помощника — очко сопернику
function battleAcceptLoss(state) {
  const battle = Object.assign({}, state, { helpersLeft: state.helpersLeft.slice() });
  if (!battle.pendingLoss) return battle;
  battle.pendingLoss = false;
  battle.catWins = battle.catWins + 1;
  return battleCheckFinished(battle);
}

// =============================================================
// Потерявшиеся капитаны (боссы)
// =============================================================
const CAPTAIN_MIN_CREW = 3;                  // капитаны приходят, когда в экипаже 3+ кота
const CAPTAIN_LIFETIME = 60 * 60 * 1000;     // капитан ждёт у маяка 1 час
const CAPTAIN_NEXT_DELAY = 30 * 60 * 1000;   // после победы следующий — через 30 минут
const CAPTAIN_RETRY_DELAY = 2 * 60 * 1000;   // после проигрыша — ещё раз через 2 минуты
const CAPTAIN_WINS_NEEDED = 3;               // бой с капитаном — до трёх побед
const MAX_HELPERS = 2;                       // помощников — не больше двух
const CAPTAIN_PARTS = 3;                     // награда за капитана — 3 детали

// Капитан (объект на карте) ещё ждёт игрока?
// captain — { captainId, beaconId, expiresAt, retryAt } или null
function isCaptainActive(captain, now) {
  return !!captain && now < captain.expiresAt;
}

// Можно ли сейчас позвать нового капитана.
// info: { crewCount, captain, nextCaptainAt, beaconCount, now }
function canSpawnCaptain(info) {
  if (info.crewCount < CAPTAIN_MIN_CREW) return false;     // экипаж маловат
  if (isCaptainActive(info.captain, info.now)) return false; // один уже ждёт
  if (info.now < info.nextCaptainAt) return false;         // после победы — пауза
  return info.beaconCount > 0;                             // капитан ждёт у маяка
}

// Какой капитан придёт: сначала те, кого ещё нет в экипаже;
// если все уже в экипаже — любой (можно встретиться снова).
function chooseCaptain(captains, save, random) {
  const notMet = captains.filter(function (c) { return !((save.captains[c.id] || 0) > 0); });
  const choices = notMet.length > 0 ? notMet : captains;
  return choices[Math.floor(random() * choices.length)];
}

// Новый капитан у маяка beaconId
function makeCaptain(captainId, beaconId, now) {
  return { captainId: captainId, beaconId: beaconId, expiresAt: now + CAPTAIN_LIFETIME, retryAt: 0 };
}

// Игрок проиграл капитану: без наказания, но следующая попытка — через 2 минуты.
// Капитан остаётся до конца своего часа.
function captainAfterLoss(captain, now) {
  return Object.assign({}, captain, { retryAt: now + CAPTAIN_RETRY_DELAY });
}

// Сколько мс ждать до следующей попытки (0 — можно играть)
function captainRetryLeft(captain, now) {
  return Math.max(0, captain.retryAt - now);
}

// Игрок победил капитана: капитан вступает в экипаж, награда — 3 детали,
// следующий капитан — не раньше чем через 30 минут.
function applyCaptainWin(save, captainId, now) {
  const result = copySave(save);
  const isNew = !((save.captains[captainId] || 0) > 0);
  result.captains[captainId] = (result.captains[captainId] || 0) + 1;
  result.parts = result.parts + CAPTAIN_PARTS;
  result.nextCaptainAt = now + CAPTAIN_NEXT_DELAY;
  return { save: result, reward: { isNew: isNew, parts: CAPTAIN_PARTS } };
}

// Кого можно взять в помощники: все из экипажа (коты и капитаны),
// кроме самого капитана, с которым идёт бой. list — каталог(и).
function availableHelpers(save, list, exceptId) {
  return list.filter(function (cat) {
    const met = (save.crew[cat.id] || 0) + (save.captains[cat.id] || 0);
    return met > 0 && cat.id !== exceptId;
  });
}

// Выбор помощников: нажали на кота — добавляем (если мест ещё нет — не
// добавляем), нажали снова — убираем. Возвращает новый список id.
function toggleHelper(selected, catId) {
  if (selected.includes(catId)) {
    return selected.filter(function (id) { return id !== catId; });
  }
  if (selected.length >= MAX_HELPERS) return selected.slice();
  return selected.concat([catId]);
}

// ----- Для тестов в Node: отдаём функции наружу -----
// В браузере переменной module нет, и эта строка ничего не делает.
if (typeof module !== 'undefined') {
  module.exports = {
    distanceMeters, offsetPosition, randomCapsulePosition,
    RARITY_CHANCES, pickRarity, pickCat, rarityStars,
    GESTURES, BEATS, roundResult, catChooseGesture,
    signalSettings, signalPosition, isInGreenZone,
    gpsErrorAction,
    SAVE_KEY, SHIP_PARTS_NEEDED, NEW_CAT_PARTS, REPEAT_CAT_FISH,
    emptySave, cleanSave, loadSave, writeSave, isInCrew, crewCount,
    applyCatWin, pluralRu, shipRepairShare,
    BEACON_PLACES, BEACON_FORBIDDEN, BEACON_RADIUS, BEACON_MAX_COUNT, BEACON_MIN_GAP,
    VIRTUAL_BEACON_COUNT, BEACON_COOLDOWN, BEACON_PART_CHANCE,
    isBeaconPlace, beaconKind, selectBeacons, beaconsNear, makeVirtualBeacons,
    beaconTitle, beaconReward, beaconCooldownLeft, startBeaconCooldown,
    applyBeaconReward, formatTimeLeft,
    TERRAIN_RADIUS, PLACE_TYPE_CHANCE, TERRAIN_CAT_TYPE, terrainKind,
    distanceToGeometry, terrainNear, pickCatForPlace,
    createBattle, battleRound, battleUseHelper, battleAcceptLoss,
    CAPTAIN_MIN_CREW, CAPTAIN_LIFETIME, CAPTAIN_NEXT_DELAY, CAPTAIN_RETRY_DELAY,
    CAPTAIN_WINS_NEEDED, MAX_HELPERS, CAPTAIN_PARTS,
    isCaptainActive, canSpawnCaptain, chooseCaptain, makeCaptain, captainAfterLoss,
    captainRetryLeft, applyCaptainWin, availableHelpers, toggleHelper
  };
}
