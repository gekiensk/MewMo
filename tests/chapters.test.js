// =============================================================
// Тесты глав: финал главы 1 и переход в главу 2 (logic.js)
// Запуск из папки проекта: node --test
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');

function fakeStorage(startData) {
  const data = Object.assign({}, startData);
  return {
    getItem: function (key) { return key in data ? data[key] : null; },
    setItem: function (key, value) { data[key] = String(value); }
  };
}

// Маленький каталог для тестов
const TEST_CATS = [
  { id: 'a', chapter: 1 }, { id: 'b', chapter: 1 }, { id: 'c' }, // у «c» нет поля chapter — глава 1
  { id: 'x', chapter: 2 }, { id: 'y', chapter: 2 }
];

test('старое сохранение без номера главы — глава 1', function () {
  const old = JSON.stringify({ crew: { bul: 1 }, parts: 12 });
  const save = logic.loadSave(fakeStorage({ [logic.SAVE_KEY]: old }));
  assert.strictEqual(save.chapter, 1);
  assert.deepStrictEqual(save.chaptersDone, []);
  assert.deepStrictEqual(save.badges, []);
  assert.deepStrictEqual(save.flewHome, []);
  assert.deepStrictEqual(save.latecomers, []);
});

test('испорченные поля глав заменяются', function () {
  const text = JSON.stringify({ chapter: 99, chaptersDone: [1, 1, 'два', 7], badges: [5, 'rescuer-1'], flewHome: 'bul' });
  const save = logic.loadSave(fakeStorage({ [logic.SAVE_KEY]: text }));
  assert.strictEqual(save.chapter, 1);
  assert.deepStrictEqual(save.chaptersDone, [1]);
  assert.deepStrictEqual(save.badges, ['rescuer-1']);
  assert.deepStrictEqual(save.flewHome, []);
});

test('корабль можно запустить, только когда деталей 20 или больше', function () {
  const save = logic.emptySave();
  save.parts = 19;
  assert.strictEqual(logic.canLaunchShip(save), false);
  save.parts = 20;
  assert.strictEqual(logic.canLaunchShip(save), true);
});

test('запуск корабля: экипаж главы 1 улетает, значок, глава 2', function () {
  let save = logic.emptySave();
  save.parts = 23;
  save.crew = { a: 2, c: 1, x: 1 };
  save.captains = { cap1: 1 };
  const cats = TEST_CATS.concat([{ id: 'cap1', chapter: 1 }]);
  const after = logic.launchShip(save, cats);
  assert.strictEqual(after.chapter, 2);
  assert.deepStrictEqual(after.chaptersDone, [1]);
  assert.deepStrictEqual(after.badges, ['rescuer-1']);
  assert.deepStrictEqual(after.flewHome.sort(), ['a', 'c', 'cap1']);
  assert.strictEqual(after.parts, 3); // лишние детали переходят в главу 2
  assert.strictEqual(logic.badgeName('rescuer-1'), 'Спасатель 1 ранга');
  // в главе 2 финала пока нет — второй запуск не происходит
  after.parts = 99;
  assert.strictEqual(logic.canLaunchShip(after), false);
  assert.strictEqual(logic.launchShip(after, cats), after);
  // исходное сохранение не изменилось
  assert.strictEqual(save.chapter, 1);
});

test('шкала ремонта: 20 деталей в главе 1, 30 в главе 2', function () {
  assert.strictEqual(logic.partsNeeded(1), 20);
  assert.strictEqual(logic.partsNeeded(2), 30);
  assert.strictEqual(logic.shipRepairShare(10, 1), 0.5);
  assert.strictEqual(logic.shipRepairShare(15, 2), 0.5);
  assert.strictEqual(logic.shipRepairShare(40, 2), 1);
});

test('коты главы; если котов главы нет — коты главы 1', function () {
  assert.deepStrictEqual(logic.chapterCats(TEST_CATS, 1).map(function (c) { return c.id; }), ['a', 'b', 'c']);
  assert.deepStrictEqual(logic.chapterCats(TEST_CATS, 2).map(function (c) { return c.id; }), ['x', 'y']);
  assert.deepStrictEqual(logic.chapterCats(TEST_CATS.slice(0, 3), 2).map(function (c) { return c.id; }), ['a', 'b', 'c']);
});
