// =============================================================
// Тесты компаса к ближайшей капсуле (logic.js):
// направление, «горячо — холодно» и круглое расстояние
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');

// Точка в Париже, как в tools/smoke.js. Координаты — [долгота, широта].
const CENTER = [2.2950, 48.8580];

// Почти равны (направление считается с дробями)
function near(actual, expected, tolerance) {
  // Разница по кругу: 359° и 1° отличаются на 2°, а не на 358°
  const diff = Math.abs(((actual - expected) + 540) % 360 - 180);
  assert.ok(diff <= tolerance, actual + ' вместо ' + expected);
}

test('направление на 4 стороны света: север 0°, восток 90°, юг 180°, запад 270°', function () {
  // offsetPosition: угол 0 — на восток, π/2 — на север
  near(logic.bearingDegrees(CENTER, logic.offsetPosition(CENTER, 100, Math.PI / 2)), 0, 0.5);
  near(logic.bearingDegrees(CENTER, logic.offsetPosition(CENTER, 100, 0)), 90, 0.5);
  near(logic.bearingDegrees(CENTER, logic.offsetPosition(CENTER, 100, -Math.PI / 2)), 180, 0.5);
  near(logic.bearingDegrees(CENTER, logic.offsetPosition(CENTER, 100, Math.PI)), 270, 0.5);
});

test('направление по диагонали учитывает, что градус долготы короче', function () {
  // Северо-восток: 45° по метрам, хотя в градусах долгота сдвинута сильнее
  near(logic.bearingDegrees(CENTER, logic.offsetPosition(CENTER, 150, Math.PI / 4)), 45, 0.5);
});

test('направление всегда от 0 до 360', function () {
  for (let angle = 0; angle < 2 * Math.PI; angle += 0.3) {
    const bearing = logic.bearingDegrees(CENTER, logic.offsetPosition(CENTER, 80, angle));
    assert.ok(bearing >= 0 && bearing < 360, String(bearing));
  }
});

test('«горячо — холодно» по расстоянию', function () {
  assert.strictEqual(logic.warmth(40, 40), 'рядом');
  assert.strictEqual(logic.warmth(41, 40), 'горячо');
  assert.strictEqual(logic.warmth(logic.WARM_HOT, 40), 'горячо');
  assert.strictEqual(logic.warmth(logic.WARM_HOT + 1, 40), 'тепло');
  assert.strictEqual(logic.warmth(logic.WARM_WARM, 40), 'тепло');
  assert.strictEqual(logic.warmth(250, 40), 'холодно');
});

test('расстояние в подсказке круглое и не меньше шага', function () {
  assert.strictEqual(logic.roundDistance(47), 45);
  assert.strictEqual(logic.roundDistance(98), 100);
  assert.strictEqual(logic.roundDistance(123), 120);
  assert.strictEqual(logic.roundDistance(1), 5);
});
