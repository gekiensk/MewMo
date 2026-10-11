// =============================================================
// Тесты наклеек прогулок (logic.js): дни с прогулкой и календарь
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');

test('старое сохранение без наклеек — пустой список', function () {
  const save = logic.cleanSave({ crew: { bul: 1 } });
  assert.deepStrictEqual(save.walkDays, []);
  assert.deepStrictEqual(logic.emptySave().walkDays, []);
});

test('в списке дней остаются только даты, без повторов и по порядку', function () {
  const save = logic.cleanSave({
    walkDays: ['2026-10-11', 'вчера', 5, '2026-10-01', '2026-10-11', '2026-1-5', null]
  });
  assert.deepStrictEqual(save.walkDays, ['2026-10-01', '2026-10-11']);
  assert.deepStrictEqual(logic.cleanSave({ walkDays: 'много' }).walkDays, []);
});

test('день отмечается один раз, старый список не меняется', function () {
  const before = ['2026-10-01'];
  const after = logic.addWalkDay(before, '2026-10-11');
  assert.deepStrictEqual(after, ['2026-10-01', '2026-10-11']);
  assert.deepStrictEqual(before, ['2026-10-01']);
  assert.strictEqual(logic.addWalkDay(after, '2026-10-11'), after); // уже есть — тот же список
});

test('хранится не больше WALK_DAYS_MAX последних дней', function () {
  let days = [];
  const start = new Date(2025, 0, 1);
  for (let i = 0; i < logic.WALK_DAYS_MAX + 20; i++) {
    days = logic.addWalkDay(days, logic.localDayKey(new Date(2025, 0, 1 + i)));
  }
  assert.strictEqual(days.length, logic.WALK_DAYS_MAX);
  assert.ok(!days.includes(logic.localDayKey(start)), 'самый старый день должен забыться');
});

test('календарь октября 2026: начинается с четверга, 31 день', function () {
  const calendar = logic.monthCalendar(2026, 9, ['2026-10-01', '2026-10-11', '2026-09-30'], '2026-10-11');
  assert.strictEqual(calendar.title, 'Октябрь 2026');
  assert.strictEqual(calendar.blanks, 3); // пн, вт, ср — пустые
  assert.strictEqual(calendar.days.length, 31);
  assert.strictEqual(calendar.count, 2); // сентябрьский день не считается
  assert.strictEqual(calendar.days[0].walked, true);
  assert.strictEqual(calendar.days[10].today, true);
  assert.strictEqual(calendar.days[10].walked, true);
  assert.strictEqual(calendar.days[1].walked, false);
});

test('календарь: месяц с понедельника и с воскресенья', function () {
  assert.strictEqual(logic.monthCalendar(2026, 5, [], '').blanks, 0); // 1 июня 2026 — понедельник
  assert.strictEqual(logic.monthCalendar(2026, 2, [], '').blanks, 6); // 1 марта 2026 — воскресенье
  assert.strictEqual(logic.monthCalendar(2028, 1, [], '').days.length, 29); // високосный февраль
});
