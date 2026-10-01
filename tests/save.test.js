// =============================================================
// Тесты сохранения прогресса и наград (logic.js)
// Запуск из папки проекта: node --test
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');

// Подставное хранилище: ведёт себя как localStorage, но живёт в памяти
function fakeStorage(startData) {
  const data = Object.assign({}, startData);
  return {
    data: data,
    getItem: function (key) { return key in data ? data[key] : null; },
    setItem: function (key, value) { data[key] = String(value); }
  };
}

// Хранилище, которое всегда «падает» (как запрещённый localStorage)
const brokenStorage = {
  getItem: function () { throw new Error('запрещено'); },
  setItem: function () { throw new Error('запрещено'); }
};

test('записанное сохранение читается обратно без изменений', function () {
  const storage = fakeStorage();
  const save = {
    crew: { bul: 2, moh: 1 }, captains: { cap: 1 },
    fish: 12, parts: 3, beaconCooldowns: { 'poi-5': 1700000000000 },
    nextCaptainAt: 1700000000000,
    settings: { soundLevel: 'тихо', vibration: true, dailyLimit: 60, homeOnly: true },
    playTime: { day: '2026-09-30', seconds: 125, bonusMinutes: 15 },
    guests: { list: ['sumrak'], nextAt: 1700000000000 },
    friendship: { bul: 7 },
    quests: { day: '2026-09-30', list: [
      { id: 'catch2', progress: 1, done: false },
      { id: 'treat1', progress: 1, done: true },
      { id: 'beacon1', progress: 0, done: false }
    ] },
    chapter: 2,
    chaptersDone: [1],
    badges: ['rescuer-1'],
    flewHome: ['bul', 'moh'],
    latecomers: ['iskra'],
    tutorialSeen: true,
    tipEncounters: 1,
    seenGames: ['fish'],
    pantry: { flour: 2, milk: 1 },
    captainDay: '2026-10-01',
    walkToday: { day: '2026-10-01', meters: 340 }
  };
  assert.strictEqual(logic.writeSave(storage, save), true);
  assert.ok(logic.SAVE_KEY in storage.data, 'ключ ' + logic.SAVE_KEY);
  assert.deepStrictEqual(logic.loadSave(storage), save);
});

test('пустое хранилище — игра с нуля', function () {
  assert.deepStrictEqual(logic.loadSave(fakeStorage()), logic.emptySave());
});

test('испорченное сохранение не ломает игру', function () {
  const broken = ['{каша', 'null', '42', '"строка"', '[1,2,3]', ''];
  for (const text of broken) {
    const storage = fakeStorage({ [logic.SAVE_KEY]: text });
    assert.deepStrictEqual(logic.loadSave(storage), logic.emptySave(), 'данные: ' + text);
  }
  // Хранилище недоступно совсем
  assert.deepStrictEqual(logic.loadSave(brokenStorage), logic.emptySave());
  assert.deepStrictEqual(logic.loadSave(null), logic.emptySave());
  assert.strictEqual(logic.writeSave(brokenStorage, logic.emptySave()), false);
});

test('испорченные поля заменяются, правильные остаются', function () {
  const text = JSON.stringify({
    crew: { bul: 2, moh: -1, iskra: 'много', gaika: 1.5, pixel: 0 },
    fish: -5,
    parts: 'три',
    captains: [1, 2],
    beaconCooldowns: { a: 100, b: null },
    nextCaptainAt: 'скоро'
  });
  const save = logic.loadSave(fakeStorage({ [logic.SAVE_KEY]: text }));
  assert.deepStrictEqual(save.crew, { bul: 2 });
  assert.strictEqual(save.fish, 0);
  assert.strictEqual(save.parts, 0);
  assert.deepStrictEqual(save.captains, {});
  assert.deepStrictEqual(save.beaconCooldowns, { a: 100 });
  assert.strictEqual(save.nextCaptainAt, 0);
});

test('новый кот: в экипаж и 1 деталь корабля', function () {
  const start = logic.emptySave();
  const result = logic.applyCatWin(start, 'bul');
  assert.deepStrictEqual(result.reward, { isNew: true, parts: 1, fish: 0 });
  assert.strictEqual(result.save.crew.bul, 1);
  assert.strictEqual(result.save.parts, 1);
  assert.strictEqual(result.save.fish, 0);
  // исходное сохранение не изменилось
  assert.deepStrictEqual(start, logic.emptySave());
});

test('повторная встреча: 3 рыбки, второй раз в экипаж не добавляется', function () {
  let save = logic.applyCatWin(logic.emptySave(), 'bul').save;
  const result = logic.applyCatWin(save, 'bul');
  assert.deepStrictEqual(result.reward, { isNew: false, parts: 0, fish: 3 });
  assert.strictEqual(result.save.crew.bul, 2); // встреч стало 2
  assert.strictEqual(result.save.parts, 1);    // деталей не прибавилось
  assert.strictEqual(result.save.fish, 3);
  assert.strictEqual(logic.crewCount(result.save, [{ id: 'bul' }, { id: 'moh' }]), 1);
});

test('счётчик экипажа считает только котов из каталога', function () {
  const save = logic.emptySave();
  save.crew = { bul: 1, moh: 3, 'старый-кот': 1 };
  assert.strictEqual(logic.crewCount(save, [{ id: 'bul' }, { id: 'moh' }, { id: 'iskra' }]), 2);
});

test('слова после чисел: деталь, детали, деталей', function () {
  const forms = ['деталь', 'детали', 'деталей'];
  const expected = { 0: 'деталей', 1: 'деталь', 2: 'детали', 4: 'детали', 5: 'деталей',
    11: 'деталей', 12: 'деталей', 14: 'деталей', 20: 'деталей', 21: 'деталь', 22: 'детали', 111: 'деталей' };
  for (const n of Object.keys(expected)) {
    assert.strictEqual(logic.pluralRu(Number(n), forms[0], forms[1], forms[2]), expected[n], 'число ' + n);
  }
});

test('шкала ремонта корабля не больше 100%', function () {
  assert.strictEqual(logic.shipRepairShare(0), 0);
  assert.strictEqual(logic.shipRepairShare(10), 0.5);
  assert.strictEqual(logic.shipRepairShare(25), 1);
});
