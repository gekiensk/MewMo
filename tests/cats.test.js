// =============================================================
// Тесты для каталога котов (cats.js)
// Запуск из папки проекта: node --test
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const { CATS, findCat } = require('../cats.js');
const { GESTURES, RARITY_CHANCES } = require('../logic.js');

const FIELDS = ['id', 'name', 'type', 'rarity', 'character', 'favoriteGesture', 'fact'];

test('в каталоге 10 котов (8 обычных + 2 сумеречных)', function () {
  assert.strictEqual(CATS.length, 10);
  const twilight = CATS.filter(function (cat) { return cat.type === 'сумеречный'; });
  assert.strictEqual(twilight.length, 2);
});

test('у всех котов заполнены все поля', function () {
  for (const cat of CATS) {
    for (const field of FIELDS) {
      assert.strictEqual(typeof cat[field], 'string', cat.name + ': поле ' + field);
      assert.ok(cat[field].trim().length > 0, cat.name + ': пустое поле ' + field);
    }
  }
});

test('id котов не повторяются', function () {
  const ids = CATS.map(function (cat) { return cat.id; });
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('любимый жест — один из трёх', function () {
  for (const cat of CATS) {
    assert.ok(GESTURES.includes(cat.favoriteGesture), cat.name + ': ' + cat.favoriteGesture);
  }
});

test('редкость — одна из известных', function () {
  const rarities = RARITY_CHANCES.map(function (item) { return item.rarity; });
  for (const cat of CATS) {
    assert.ok(rarities.includes(cat.rarity), cat.name + ': ' + cat.rarity);
  }
});

test('тип — один из известных', function () {
  const types = ['водный', 'лесной', 'городской', 'космический', 'сумеречный'];
  for (const cat of CATS) {
    assert.ok(types.includes(cat.type), cat.name + ': ' + cat.type);
  }
});

test('для каждой редкости есть хотя бы один кот', function () {
  for (const item of RARITY_CHANCES) {
    assert.ok(CATS.some(function (cat) { return cat.rarity === item.rarity; }), item.rarity);
  }
});

test('findCat находит кота по id', function () {
  assert.strictEqual(findCat('kometa').name, 'Комета');
  assert.strictEqual(findCat('нет-такого'), undefined);
});
