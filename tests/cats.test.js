// =============================================================
// Тесты для каталога котов (cats.js)
// Запуск из папки проекта: node --test
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const { CATS, findCat } = require('../cats.js');
const { GESTURES, RARITY_CHANCES } = require('../logic.js');

const FIELDS = ['id', 'name', 'type', 'rarity', 'character', 'favoriteGesture', 'fact'];

test('в каталоге 22 кота: 10 в главе 1 и 12 в главе 2', function () {
  assert.strictEqual(CATS.length, 22);
  const first = CATS.filter(function (cat) { return cat.chapter === 1; });
  const second = CATS.filter(function (cat) { return cat.chapter === 2; });
  assert.strictEqual(first.length, 10);
  assert.strictEqual(second.length, 12);
  assert.strictEqual(first.filter(function (cat) { return cat.type === 'сумеречный'; }).length, 2);
  // глава 2: 4 водных, 3 лесных, 3 городских, 1 сумеречный, 1 легендарный
  const count = function (type) { return second.filter(function (cat) { return cat.type === type; }).length; };
  assert.strictEqual(count('водный'), 4);
  assert.strictEqual(count('лесной'), 3);
  assert.strictEqual(count('городской'), 3);
  assert.strictEqual(count('сумеречный'), 1);
  assert.strictEqual(second.filter(function (cat) { return cat.rarity === 'легендарный'; }).length, 1);
});

test('у каждого кота есть глава (1 или 2)', function () {
  for (const cat of CATS) {
    assert.ok(cat.chapter === 1 || cat.chapter === 2, cat.name);
  }
});

test('факты о кошках не повторяются', function () {
  const facts = CATS.map(function (cat) { return cat.fact; });
  assert.strictEqual(new Set(facts).size, facts.length);
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
