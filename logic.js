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

// ----- Для тестов в Node: отдаём функции наружу -----
// В браузере переменной module нет, и эта строка ничего не делает.
if (typeof module !== 'undefined') {
  module.exports = {
    distanceMeters, offsetPosition, randomCapsulePosition,
    RARITY_CHANCES, pickRarity, pickCat, rarityStars,
    GESTURES, BEATS, roundResult, catChooseGesture,
    signalSettings, signalPosition, isInGreenZone
  };
}
