// =============================================================
// Тесты времени заката и сумеречных котов (logic.js)
// Запуск из папки проекта: node --test
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');
const { CATS } = require('../cats.js');

const MINUTE = 60 * 1000;

function seededRandom(seed) {
  let state = seed;
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// Настоящие времена заката (по справочникам восхода и заката),
// записаны по UTC. Координаты — [долгота, широта].
const KNOWN_SUNSETS = [
  // Москва, 21 июня 2024: 21:18 по Москве (UTC+3)
  { place: 'Москва', lngLat: [37.6173, 55.7558], sunset: '2024-06-21T18:18:00Z' },
  // Лондон, 21 декабря 2024: 15:53 по Гринвичу
  { place: 'Лондон', lngLat: [-0.1278, 51.5074], sunset: '2024-12-21T15:53:00Z' },
  // Нью-Йорк, 20 марта 2024: 19:10 по летнему времени (UTC−4)
  { place: 'Нью-Йорк', lngLat: [-74.0060, 40.7128], sunset: '2024-03-20T23:10:00Z' },
  // Сидней, 21 декабря 2024: 20:05 по местному летнему времени (UTC+11)
  { place: 'Сидней', lngLat: [151.2093, -33.8688], sunset: '2024-12-21T09:05:00Z' }
];

test('закат по формуле NOAA совпадает с настоящим в пределах 5 минут', function () {
  for (const item of KNOWN_SUNSETS) {
    const expected = Date.parse(item.sunset);
    const got = logic.sunsetTime(expected, item.lngLat[0], item.lngLat[1]);
    const diff = Math.abs(got - expected) / MINUTE;
    assert.ok(diff <= 5, item.place + ': ошибка ' + diff.toFixed(1) + ' мин (' + new Date(got).toISOString() + ')');
  }
});

test('закат в западном полушарии может быть уже в следующих сутках по UTC', function () {
  // Сан-Франциско, 21 июня 2024: закат 20:35 по местному (UTC−7) = 03:35 UTC 22 июня
  const got = logic.sunsetTime(Date.parse('2024-06-21T12:00:00Z'), -122.4194, 37.7749);
  const expected = Date.parse('2024-06-22T03:35:00Z');
  assert.ok(Math.abs(got - expected) <= 5 * MINUTE, new Date(got).toISOString());
});

test('полярный день и полярная ночь — заката нет', function () {
  // Мурманск: в конце июня Солнце не заходит, в конце декабря не встаёт
  assert.strictEqual(logic.sunsetTime(Date.parse('2024-06-21T12:00:00Z'), 33.08, 68.97), null);
  assert.strictEqual(logic.sunsetTime(Date.parse('2024-12-21T12:00:00Z'), 33.08, 68.97), null);
  assert.strictEqual(logic.isTwilightTime(Date.parse('2024-06-21T20:00:00Z'), 33.08, 68.97), false);
});

test('сумерки — только последний час до заката', function () {
  const moscow = [37.6173, 55.7558];
  const sunset = logic.sunsetTime(Date.parse('2024-06-21T12:00:00Z'), moscow[0], moscow[1]);
  const check = function (ms) { return logic.isTwilightTime(ms, moscow[0], moscow[1]); };
  assert.strictEqual(check(sunset - 61 * MINUTE), false); // ещё рано
  assert.strictEqual(check(sunset - 59 * MINUTE), true);
  assert.strictEqual(check(sunset - 1 * MINUTE), true);
  assert.strictEqual(check(sunset + 1 * MINUTE), false);  // солнце село
  assert.strictEqual(check(sunset - 6 * 60 * MINUTE), false); // днём
});

test('сумерки в Сан-Франциско находятся, хотя закат в других сутках по UTC', function () {
  const sunset = logic.sunsetTime(Date.parse('2024-06-21T12:00:00Z'), -122.4194, 37.7749);
  assert.strictEqual(logic.isTwilightTime(sunset - 30 * MINUTE, -122.4194, 37.7749), true);
});

// ----- Сумеречные коты -----
function countTwilight(twilight, seed) {
  const random = seededRandom(seed);
  let count = 0;
  for (let i = 0; i < 10000; i++) {
    const cat = logic.pickCatForPlace(CATS, { terrain: 'город', twilight: twilight }, random);
    if (cat.type === 'сумеречный') count = count + 1;
  }
  return count / 10000;
}

test('днём и после заката сумеречных котов в капсулах нет', function () {
  assert.strictEqual(countTwilight(false, 1), 0);
});

test('в последний час до заката сумеречные коты попадаются (~30%)', function () {
  const share = countTwilight(true, 2);
  assert.ok(Math.abs(share - 0.3) < 0.02, 'доля ' + share);
});
