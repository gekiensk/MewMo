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

// ----- Глава 2 на настоящем каталоге -----
const { CATS, CAPTAINS } = require('../cats.js');

function seededRandom(seed) {
  let state = seed;
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function chapter2Save() {
  const save = logic.emptySave();
  save.chapter = 2;
  save.chaptersDone = [1];
  save.crew = { bul: 1, moh: 1, iskra: 1 }; // нашли в главе 1 и они улетели
  save.flewHome = ['bul', 'moh', 'iskra'];
  return save;
}

test('в главе 1 в капсулах только коты главы 1', function () {
  const random = seededRandom(1);
  for (let i = 0; i < 2000; i++) {
    const cat = logic.pickCatForChapter(CATS, logic.emptySave(), { terrain: 'город', twilight: true }, random);
    assert.strictEqual(cat.chapter, 1, cat.name);
  }
});

test('в главе 2 — коты главы 2, а отставшие главы 1 — примерно в 10% капсул', function () {
  const save = chapter2Save();
  const random = seededRandom(2);
  let late = 0;
  const total = 10000;
  for (let i = 0; i < total; i++) {
    const cat = logic.pickCatForChapter(CATS, save, { terrain: 'вода', twilight: false }, random);
    if (cat.chapter === 1) {
      late++;
      // отставший — только тот, кого ещё не нашли
      assert.ok(!save.flewHome.includes(cat.id), cat.name);
      assert.notStrictEqual(cat.type, 'сумеречный'); // не сумерки
    }
  }
  assert.ok(Math.abs(late / total - 0.1) < 0.015, 'доля отставших ' + late / total);
});

test('когда все коты главы 1 найдены, отставших больше нет', function () {
  const save = chapter2Save();
  for (const cat of CATS) if (cat.chapter === 1) save.crew[cat.id] = 1;
  const random = seededRandom(3);
  for (let i = 0; i < 3000; i++) {
    assert.strictEqual(logic.pickCatForChapter(CATS, save, { terrain: null, twilight: true }, random).chapter, 2);
  }
});

test('найденный отставший кот запоминается и попадает в альбом главы 1', function () {
  const save = chapter2Save();
  const shishka = CATS.find(function (c) { return c.id === 'shishka'; });
  const result = logic.applyCatWin(save, 'shishka', shishka);
  assert.deepStrictEqual(result.save.latecomers, ['shishka']);
  assert.strictEqual(result.save.crew.shishka, 1);
  // кот главы 2 отставшим не считается
  const volna = CATS.find(function (c) { return c.id === 'volna'; });
  assert.deepStrictEqual(logic.applyCatWin(result.save, 'volna', volna).save.latecomers, ['shishka']);
});

test('гости в главе 2 — коты главы 2 и отставшие', function () {
  const save = chapter2Save();
  const random = seededRandom(4);
  let late = 0;
  for (let i = 0; i < 3000; i++) {
    const guests = logic.updateGuests({ list: [], nextAt: 0 }, 12 * 3600000, CATS,
      function () { return 12; }, random, save);
    const cat = CATS.find(function (c) { return c.id === guests.list[0]; });
    if (cat.chapter === 1) late++;
    assert.notStrictEqual(cat.type, 'сумеречный'); // полдень — не сумерки
  }
  assert.ok(late > 150 && late < 450, 'отставших среди гостей ' + late);
});

test('помощники — из обеих глав; улетевшие коты — «на связи по рации»', function () {
  const save = chapter2Save();
  save.crew.volna = 1;
  const helpers = logic.availableHelpers(save, CATS.concat(CAPTAINS), 'admiral-grom')
    .map(function (c) { return c.id; });
  assert.deepStrictEqual(helpers.sort(), ['bul', 'iskra', 'moh', 'volna']);
  assert.strictEqual(logic.isOnRadio(save, 'bul'), true);
  assert.strictEqual(logic.isOnRadio(save, 'volna'), false);
});

test('капитаны главы 2 приходят, когда в экипаже главы 2 три кота', function () {
  const save = chapter2Save();
  const chapterCatsNow = logic.chapterCats(CATS, 2);
  assert.strictEqual(logic.crewCount(save, chapterCatsNow), 0); // коты главы 1 не считаются
  save.crew.volna = 1; save.crew.kapel = 1; save.crew.yakor = 1;
  assert.strictEqual(logic.crewCount(save, chapterCatsNow), 3);
  const captains2 = logic.chapterCats(CAPTAINS, 2);
  assert.deepStrictEqual(captains2.map(function (c) { return c.id; }).sort(), ['admiral-grom', 'tumannost']);
  assert.ok(captains2.includes(logic.chooseCaptain(captains2, save, Math.random)));
});

test('убежище: экипаж главы и отставшие; если мест мало — самые дружные', function () {
  const save = chapter2Save();
  save.crew = Object.assign(save.crew, { volna: 1, kapel: 3, yakor: 1, shishka: 1 });
  save.latecomers = ['shishka'];
  save.friendship = { yakor: 12, shishka: 4 };
  const result = logic.shelterCats(CATS.concat(CAPTAINS), save, 3);
  // bul, moh, iskra улетели — их в убежище нет
  assert.deepStrictEqual(result.shown.map(function (c) { return c.id; }), ['yakor', 'shishka', 'kapel']);
  assert.strictEqual(result.hidden, 1);
});
