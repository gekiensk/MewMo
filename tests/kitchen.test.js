// =============================================================
// Тесты занятий дома: ингредиенты, кухня, ремонт, игры, обстановка
// Запуск из папки проекта: node --test
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');

function seededRandom(seed) {
  let state = seed;
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// ----- Ингредиенты -----
test('5 ингредиентов с разными id и названиями', function () {
  assert.strictEqual(logic.INGREDIENTS.length, 5);
  assert.strictEqual(new Set(logic.INGREDIENTS.map(function (i) { return i.id; })).size, 5);
  assert.strictEqual(logic.findIngredient('flour').name, 'Звёздная мука');
});

test('маяк даёт 1–2 ингредиента, капсула — примерно в половине случаев', function () {
  const random = seededRandom(1);
  let fromCapsules = 0;
  for (let i = 0; i < 2000; i++) {
    const beacon = logic.beaconIngredients(random);
    assert.ok(beacon.length === 1 || beacon.length === 2);
    beacon.forEach(function (id) { assert.ok(logic.findIngredient(id)); });
    fromCapsules = fromCapsules + logic.capsuleIngredients(random).length;
  }
  assert.ok(Math.abs(fromCapsules / 2000 - 0.5) < 0.05, 'доля ' + fromCapsules / 2000);
});

test('ингредиенты складываются в кладовую', function () {
  let pantry = {};
  pantry = logic.addIngredients(pantry, ['flour', 'milk', 'flour']);
  assert.deepStrictEqual(pantry, { flour: 2, milk: 1 });
  assert.strictEqual(logic.ingredientsText(['mint', 'berry']), 'Космическая мята, Туманная ягода');
});

test('старое сохранение без кладовой; неизвестные ингредиенты выбрасываются', function () {
  const text = JSON.stringify({ pantry: { flour: 3, gold: 9, milk: -1 } });
  const save = logic.loadSave({ getItem: function () { return text; }, setItem: function () {} });
  assert.deepStrictEqual(save.pantry, { flour: 3 });
  const old = logic.loadSave({ getItem: function () { return '{}'; }, setItem: function () {} });
  assert.deepStrictEqual(old.pantry, {});
});
