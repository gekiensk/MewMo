// =============================================================
// Тесты для logic.js
// Запуск из папки проекта: node --test
// Используем встроенные модули Node — ничего устанавливать не нужно.
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');

// «Подставной» генератор случайных чисел: по очереди отдаёт числа из списка.
// Так тест всегда получает одни и те же «случайные» числа.
function fakeRandom(numbers) {
  let index = 0;
  return function () {
    const value = numbers[index % numbers.length];
    index = index + 1;
    return value;
  };
}

// Простой «случайный» генератор с зерном (seed): каждый запуск теста
// даёт одинаковую последовательность, поэтому тесты не «мигают».
function seededRandom(seed) {
  let state = seed;
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// ----- Расстояния -----
test('расстояние от точки до самой себя — 0 метров', function () {
  assert.strictEqual(logic.distanceMeters([37.62, 55.75], [37.62, 55.75]), 0);
});

test('один градус широты — примерно 111 км', function () {
  const d = logic.distanceMeters([0, 0], [0, 1]);
  assert.ok(Math.abs(d - 111195) < 100, 'получилось ' + d);
});

test('offsetPosition сдвигает точку на нужное число метров', function () {
  const center = [37.62, 55.75];
  const angles = [0, 1, 2, 3, 4, 5, 6];
  for (const angle of angles) {
    const moved = logic.offsetPosition(center, 100, angle);
    const d = logic.distanceMeters(center, moved);
    assert.ok(Math.abs(d - 100) < 1, 'угол ' + angle + ': получилось ' + d);
  }
});

test('новые капсулы всегда на расстоянии 30–150 м от игрока', function () {
  const random = seededRandom(42);
  const places = [[37.62, 55.75], [2.2945, 48.8584], [0, 0], [30.3, 59.94]];
  for (const center of places) {
    for (let i = 0; i < 1000; i++) {
      const position = logic.randomCapsulePosition(center, 30, 150, random);
      const d = logic.distanceMeters(center, position);
      // допуск 1 м: формула перевода метров в градусы приблизительная
      assert.ok(d >= 29 && d <= 151, 'расстояние ' + d);
    }
  }
  // Крайние случаи: random = 0 и random почти 1
  const near = logic.randomCapsulePosition([37.62, 55.75], 30, 150, fakeRandom([0]));
  const far = logic.randomCapsulePosition([37.62, 55.75], 30, 150, fakeRandom([0.999999]));
  assert.ok(Math.abs(logic.distanceMeters([37.62, 55.75], near) - 30) < 1);
  assert.ok(Math.abs(logic.distanceMeters([37.62, 55.75], far) - 150) < 1);
});

// ----- Редкость -----
test('шансы редкостей в сумме дают 100%', function () {
  let sum = 0;
  for (const item of logic.RARITY_CHANCES) sum = sum + item.chance;
  assert.ok(Math.abs(sum - 1) < 0.000001);
});

test('выбор по редкости на 10 000 бросков: ~70% / ~25% / ~5%', function () {
  const random = seededRandom(7);
  const counts = { 'обычный': 0, 'редкий': 0, 'легендарный': 0 };
  const total = 10000;
  for (let i = 0; i < total; i++) {
    counts[logic.pickRarity(random)] += 1;
  }
  // Допуск ±2.5 процентных пункта
  assert.ok(Math.abs(counts['обычный'] / total - 0.70) < 0.025, JSON.stringify(counts));
  assert.ok(Math.abs(counts['редкий'] / total - 0.25) < 0.025, JSON.stringify(counts));
  assert.ok(Math.abs(counts['легендарный'] / total - 0.05) < 0.025, JSON.stringify(counts));
});

test('pickRarity на границах отрезков', function () {
  assert.strictEqual(logic.pickRarity(fakeRandom([0])), 'обычный');
  assert.strictEqual(logic.pickRarity(fakeRandom([0.69])), 'обычный');
  assert.strictEqual(logic.pickRarity(fakeRandom([0.7])), 'редкий');
  assert.strictEqual(logic.pickRarity(fakeRandom([0.94])), 'редкий');
  assert.strictEqual(logic.pickRarity(fakeRandom([0.96])), 'легендарный');
  assert.strictEqual(logic.pickRarity(fakeRandom([0.999999])), 'легендарный');
});

test('pickCat выбирает кота нужной редкости', function () {
  const cats = [
    { id: 'a', rarity: 'обычный' },
    { id: 'b', rarity: 'редкий' },
    { id: 'c', rarity: 'легендарный' }
  ];
  // первое число — редкость, второе — какой кот из подходящих
  assert.strictEqual(logic.pickCat(cats, fakeRandom([0.1, 0.5])).id, 'a');
  assert.strictEqual(logic.pickCat(cats, fakeRandom([0.8, 0.5])).id, 'b');
  assert.strictEqual(logic.pickCat(cats, fakeRandom([0.99, 0.5])).id, 'c');
});

test('звёздочки редкости: 1, 2, 3', function () {
  assert.strictEqual(logic.rarityStars('обычный'), 1);
  assert.strictEqual(logic.rarityStars('редкий'), 2);
  assert.strictEqual(logic.rarityStars('легендарный'), 3);
});

// ----- «Поймай сигнал» -----
test('попадание в зелёную зону считается правильно на краях', function () {
  // зона от 0.4 до 0.6
  assert.strictEqual(logic.isInGreenZone(0.4, 0.4, 0.2), true);  // левый край
  assert.strictEqual(logic.isInGreenZone(0.6, 0.4, 0.2), true);  // правый край
  assert.strictEqual(logic.isInGreenZone(0.5, 0.4, 0.2), true);  // середина
  assert.strictEqual(logic.isInGreenZone(0.399, 0.4, 0.2), false); // чуть левее
  assert.strictEqual(logic.isInGreenZone(0.601, 0.4, 0.2), false); // чуть правее
  // неточные дроби: 0.7 + 0.1 у компьютера не равно 0.8
  assert.strictEqual(logic.isInGreenZone(0.8, 0.7, 0.1), true);
});

test('огонёк бегает туда-обратно от 0 до 1', function () {
  assert.strictEqual(logic.signalPosition(0, 1), 0);
  assert.ok(Math.abs(logic.signalPosition(0.5, 1) - 0.5) < 1e-9);
  assert.ok(Math.abs(logic.signalPosition(1, 1) - 1) < 1e-9);
  assert.ok(Math.abs(logic.signalPosition(1.5, 1) - 0.5) < 1e-9); // обратно
  assert.ok(Math.abs(logic.signalPosition(2, 1) - 0) < 1e-9);
  for (let t = 0; t < 10; t = t + 0.037) {
    const p = logic.signalPosition(t, 1.3);
    assert.ok(p >= 0 && p <= 1);
  }
});

test('у редких котов зона уже и огонёк быстрее', function () {
  const common = logic.signalSettings('обычный', false);
  const rare = logic.signalSettings('редкий', false);
  const legendary = logic.signalSettings('легендарный', false);
  assert.ok(rare.zoneWidth < common.zoneWidth && rare.speed > common.speed);
  assert.ok(legendary.zoneWidth < rare.zoneWidth && legendary.speed > rare.speed);
  // «уменьшить движение» — медленнее
  assert.ok(logic.signalSettings('обычный', true).speed < common.speed);
});

// ----- Ошибки GPS -----
test('ошибка GPS: демо только без разрешения, до первых координат — «ищем»', function () {
  // GPS ещё ни разу не работал — продолжаем искать (демо включит таймер через 45 с)
  assert.strictEqual(logic.gpsErrorAction(false, false), 'ищем');
  // нет разрешения — всегда демо
  assert.strictEqual(logic.gpsErrorAction(false, true), 'демо');
  assert.strictEqual(logic.gpsErrorAction(true, true), 'демо');
  // GPS уже работал, а потом пропал сигнал — игрок остаётся на месте
  assert.strictEqual(logic.gpsErrorAction(true, false), 'слабый сигнал');
});

// ----- Мягкие цвета карты -----
test('карта приглушается: фон, вода, зелень, дороги, здания, подписи', function () {
  assert.deepStrictEqual(logic.mutedPaint({ id: 'background', type: 'background' }), { 'background-color': logic.MAP_COLORS.background });
  assert.strictEqual(logic.mutedPaint({ id: 'water', type: 'fill' })['fill-color'], logic.MAP_COLORS.water);
  assert.strictEqual(logic.mutedPaint({ id: 'waterway_river', type: 'line' })['line-color'], logic.MAP_COLORS.water);
  assert.strictEqual(logic.mutedPaint({ id: 'park', type: 'fill' })['fill-color'], logic.MAP_COLORS.green);
  assert.strictEqual(logic.mutedPaint({ id: 'landcover_wood', type: 'fill' })['fill-color'], logic.MAP_COLORS.green);
  assert.strictEqual(logic.mutedPaint({ id: 'road_primary', type: 'line' })['line-color'], logic.MAP_COLORS.road);
  assert.strictEqual(logic.mutedPaint({ id: 'building-3d', type: 'fill-extrusion' })['fill-extrusion-color'], logic.MAP_COLORS.building);
  assert.strictEqual(logic.mutedPaint({ id: 'poi_r1', type: 'symbol' })['icon-opacity'], 0.45);
  assert.deepStrictEqual(logic.mutedPaint({ id: 'hillshade', type: 'raster' }), {});
});
