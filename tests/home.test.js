// =============================================================
// Тесты режима «Дом»: гости, дружба, ежедневные задания (logic.js)
// Запуск из папки проекта: node --test
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');
const { CATS } = require('../cats.js');

const HOUR = 60 * 60 * 1000;

function seededRandom(seed) {
  let state = seed;
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function fakeStorage(startData) {
  const data = Object.assign({}, startData);
  return {
    getItem: function (key) { return key in data ? data[key] : null; },
    setItem: function (key, value) { data[key] = String(value); }
  };
}

// «Часы» для тестов: время 0 — это 00:00, час = время / HOUR (по кругу 24 ч)
function hourOf(ms) {
  return Math.floor(ms / HOUR) % 24;
}
// Утро: 08:00 первого дня
const MORNING = 8 * HOUR;

// ----- Старое сохранение -----
test('старое сохранение без гостей, дружбы и заданий загружается', function () {
  const old = JSON.stringify({ crew: { bul: 1 }, fish: 3 });
  const save = logic.loadSave(fakeStorage({ [logic.SAVE_KEY]: old }));
  assert.deepStrictEqual(save.guests, { list: [], nextAt: 0 });
  assert.deepStrictEqual(save.friendship, {});
  assert.deepStrictEqual(save.quests, { day: '', list: [] });
  assert.strictEqual(save.fish, 3);
});

test('испорченные гости и задания не ломают игру', function () {
  const text = JSON.stringify({
    guests: { list: ['bul', 5, 'moh', 'iskra', 'gaika'], nextAt: -1 },
    quests: { day: '2026-09-30', list: [{ id: 'нет-такого', progress: 1, done: false }] },
    friendship: { bul: 'много', moh: 3 }
  });
  const save = logic.loadSave(fakeStorage({ [logic.SAVE_KEY]: text }));
  assert.deepStrictEqual(save.guests, { list: ['bul'], nextAt: 0 }); // гостей не больше одного
  assert.deepStrictEqual(save.quests, { day: '', list: [] });
  assert.deepStrictEqual(save.friendship, { moh: 3 });
});

// ----- Гости -----
test('первый гость прилетает сразу, следующий — через 6 часов', function () {
  const random = seededRandom(1);
  let guests = { list: [], nextAt: 0 };
  guests = logic.updateGuests(guests, MORNING, CATS, hourOf, random);
  assert.strictEqual(guests.list.length, 1);
  assert.strictEqual(guests.nextAt, MORNING + 6 * HOUR);
  // познакомились с гостем — место свободно
  guests = logic.removeGuest(guests, guests.list[0]);
  // через 5 часов 59 минут — никого нового
  guests = logic.updateGuests(guests, MORNING + 6 * HOUR - 60000, CATS, hourOf, random);
  assert.strictEqual(guests.list.length, 0);
  // ровно через 6 часов — новый гость
  guests = logic.updateGuests(guests, MORNING + 6 * HOUR, CATS, hourOf, random);
  assert.strictEqual(guests.list.length, 1);
  assert.strictEqual(guests.nextAt, MORNING + 12 * HOUR);
});

test('гостей копится не больше одного', function () {
  const random = seededRandom(2);
  let guests = { list: [], nextAt: 0 };
  guests = logic.updateGuests(guests, MORNING, CATS, hourOf, random);
  // игрок не заходил неделю
  guests = logic.updateGuests(guests, MORNING + 7 * 24 * HOUR, CATS, hourOf, random);
  assert.strictEqual(guests.list.length, 1);
  // следующий прилёт — в будущем, а не в прошлом
  assert.ok(guests.nextAt > MORNING + 7 * 24 * HOUR);
  assert.ok(guests.nextAt <= MORNING + 7 * 24 * HOUR + 6 * HOUR);
  // после знакомства с гостем место освобождается
  guests = logic.removeGuest(guests, guests.list[0]);
  assert.strictEqual(guests.list.length, 0);
});

test('removeGuest убирает только одного гостя с таким id', function () {
  const guests = logic.removeGuest({ list: ['bul', 'bul', 'moh'], nextAt: 5 }, 'bul');
  assert.deepStrictEqual(guests, { list: ['bul', 'moh'], nextAt: 5 });
});

test('сумеречные гости — только с 17:00 до 22:00', function () {
  assert.strictEqual(logic.isTwilightHour(16), false);
  assert.strictEqual(logic.isTwilightHour(17), true);
  assert.strictEqual(logic.isTwilightHour(21), true);
  assert.strictEqual(logic.isTwilightHour(22), false);
  const random = seededRandom(3);
  let dayTwilight = 0;
  let eveningTwilight = 0;
  for (let i = 0; i < 3000; i++) {
    if (logic.pickGuest(CATS, 12, random).type === 'сумеречный') dayTwilight++;
    if (logic.pickGuest(CATS, 19, random).type === 'сумеречный') eveningTwilight++;
  }
  assert.strictEqual(dayTwilight, 0);
  assert.ok(eveningTwilight > 600, 'вечером сумеречных ' + eveningTwilight);
});

test('гость, прилетевший вечером, может быть сумеречным', function () {
  // Все прилёты в 18:00; случайность такая, что сумеречный выпадает сразу
  let guests = { list: [], nextAt: 18 * HOUR };
  guests = logic.updateGuests(guests, 18 * HOUR, CATS, hourOf, function () { return 0; });
  assert.strictEqual(CATS.find(function (c) { return c.id === guests.list[0]; }).type, 'сумеречный');
  // тот же «случай» утром — не сумеречный
  let morning = { list: [], nextAt: MORNING };
  morning = logic.updateGuests(morning, MORNING, CATS, hourOf, function () { return 0; });
  assert.notStrictEqual(CATS.find(function (c) { return c.id === morning.list[0]; }).type, 'сумеречный');
});

// ----- Дружба -----
test('каждые 5 угощений — новый уровень дружбы, максимум 5', function () {
  let save = logic.emptySave();
  save.fish = 100;
  let levelUps = 0;
  for (let i = 1; i <= 30; i++) {
    const result = logic.feedCat(save, 'bul');
    assert.strictEqual(result.ok, true);
    if (result.levelUp) levelUps++;
    save = result.save;
    if (i === 4) assert.strictEqual(logic.friendshipLevel(save, 'bul'), 0);
    if (i === 5) assert.strictEqual(logic.friendshipLevel(save, 'bul'), 1);
  }
  assert.strictEqual(logic.friendshipLevel(save, 'bul'), 5);
  assert.strictEqual(levelUps, 5);
  assert.strictEqual(save.fish, 70); // каждое угощение — 1 рыбка
  assert.strictEqual(logic.treatsToNextLevel(save, 'bul'), 0);
  assert.strictEqual(logic.friendshipHearts(2), '♥♥♡♡♡');
});

test('без рыбок угостить нельзя', function () {
  const save = logic.emptySave();
  const result = logic.feedCat(save, 'bul');
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.save, save);
  assert.strictEqual(logic.treatsToNextLevel(save, 'bul'), 5);
});

// ----- Задания -----
test('каждый день — 3 разных задания', function () {
  for (let seed = 1; seed < 30; seed++) {
    const list = logic.chooseDailyQuests(seededRandom(seed));
    assert.strictEqual(list.length, 3);
    assert.strictEqual(new Set(list.map(function (q) { return q.id; })).size, 3);
  }
});

test('задания обновляются в новый день, а в тот же день остаются', function () {
  const random = seededRandom(4);
  const first = logic.refreshQuests({ day: '', list: [] }, '2026-09-30', random);
  assert.strictEqual(first.day, '2026-09-30');
  const same = logic.refreshQuests(first, '2026-09-30', random);
  assert.strictEqual(same, first);
  const next = logic.refreshQuests(first, '2026-10-01', random);
  assert.strictEqual(next.day, '2026-10-01');
  assert.ok(next.list.every(function (q) { return q.progress === 0 && !q.done; }));
});

test('событие двигает задание, при выполнении выдаётся награда один раз', function () {
  let save = logic.emptySave();
  save.quests = { day: '2026-09-30', list: [
    { id: 'catch2', progress: 0, done: false },
    { id: 'treat1', progress: 0, done: false },
    { id: 'perfect1', progress: 0, done: false }
  ] };
  let result = logic.applyQuestEvent(save, '2026-09-30', 'catch', Math.random);
  assert.strictEqual(result.completed.length, 0);
  assert.strictEqual(result.save.quests.list[0].progress, 1);
  result = logic.applyQuestEvent(result.save, '2026-09-30', 'catch', Math.random);
  assert.strictEqual(result.completed.length, 1);
  assert.strictEqual(result.save.fish, 4);
  // третий раз — задание уже выполнено, награды нет
  result = logic.applyQuestEvent(result.save, '2026-09-30', 'catch', Math.random);
  assert.strictEqual(result.completed.length, 0);
  assert.strictEqual(result.save.fish, 4);
  // рыбки за «без поражений»
  result = logic.applyQuestEvent(result.save, '2026-09-30', 'perfectWin', Math.random);
  assert.strictEqual(result.save.fish, 8);
  // событие, которого нет в заданиях, ничего не меняет
  const before = JSON.stringify(result.save);
  result = logic.applyQuestEvent(result.save, '2026-09-30', 'beacon', Math.random);
  assert.strictEqual(JSON.stringify(result.save), before);
});

test('вчерашний прогресс не засчитывается в новый день', function () {
  let save = logic.emptySave();
  save.quests = { day: '2026-09-29', list: [
    { id: 'catch2', progress: 1, done: false },
    { id: 'treat1', progress: 0, done: false },
    { id: 'beacon1', progress: 0, done: false }
  ] };
  const result = logic.applyQuestEvent(save, '2026-09-30', 'catch', seededRandom(5));
  assert.strictEqual(result.save.quests.day, '2026-09-30');
  assert.ok(result.save.quests.list.every(function (q) { return q.progress <= 1; }));
});

test('текст награды', function () {
  assert.strictEqual(logic.questRewardText({ fish: 5, parts: 0 }), '+5 🐟');
});

test('задания, выполнимые дома, дают меньше, чем прогулочные', function () {
  const value = function (quest) { return quest.reward.fish + quest.reward.parts * 5; }; // деталь ≈ 5 рыбок
  const home = logic.QUEST_TYPES.filter(function (q) { return q.place === 'дом'; });
  const walk = logic.QUEST_TYPES.filter(function (q) { return q.place === 'прогулка'; });
  assert.ok(home.length > 0 && walk.length > 0);
  const bestHome = Math.max.apply(null, home.map(value));
  const worstWalk = Math.min.apply(null, walk.map(value));
  assert.ok(bestHome < worstWalk, 'дома до ' + bestHome + ', на прогулке от ' + worstWalk);
  for (const quest of logic.QUEST_TYPES) {
    assert.ok(['дом', 'прогулка', 'везде'].includes(quest.place), quest.id);
  }
  assert.strictEqual(logic.questRewardText({ fish: 0, parts: 1 }), '+1 деталь 🔩');
});
