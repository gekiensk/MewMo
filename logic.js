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
  if (rarity === 'легендарный') return 3;
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
// Сложность зависит от редкости кота:
// zoneWidth — ширина зелёной зоны (доля шкалы от 0 до 1),
// speed — сколько «шкал» огонёк пробегает за секунду.
function signalSettings(rarity, reducedMotion) {
  let settings;
  if (rarity === 'легендарный') {
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
//   beaconCooldowns: { … }      // маяки на перезарядке: id → до какого времени (мс)
// }

const SAVE_KEY = 'mewmo-save-v1'; // под этим именем лежит сохранение
const SHIP_PARTS_NEEDED = 20;      // сколько деталей нужно для ремонта корабля
const NEW_CAT_PARTS = 1;           // награда за нового кота — деталь корабля
const REPEAT_CAT_FISH = 3;         // награда за повторную встречу — рыбки

// Пустое сохранение: игра с нуля
function emptySave() {
  return { crew: {}, captains: {}, fish: 0, parts: 0, beaconCooldowns: {} };
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
    applyCatWin, pluralRu, shipRepairShare
  };
}
