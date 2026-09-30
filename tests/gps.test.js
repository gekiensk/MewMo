// =============================================================
// Тесты надёжного GPS и диагностики (logic.js)
// Запуск из папки проекта: node --test
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');

// ----- Журнал диагностики -----
test('журнал хранит не больше 50 последних записей', function () {
  let log = [];
  for (let i = 0; i < 60; i++) {
    log = logic.addLogEntry(log, { time: i, event: 'событие ' + i, error: '' });
  }
  assert.strictEqual(log.length, logic.GPS_LOG_MAX);
  assert.strictEqual(log[0].event, 'событие 10');
  assert.strictEqual(log[49].event, 'событие 59');
});

test('в журнал попадают только время, событие и текст ошибки', function () {
  const log = logic.addLogEntry([], { time: 5, event: 'координаты', error: undefined, lat: 55.7, lng: 37.6 });
  assert.deepStrictEqual(log, [{ time: 5, event: 'координаты', error: '' }]);
});

test('время журнала — часы:минуты:секунды', function () {
  assert.strictEqual(logic.formatClock(new Date(2026, 8, 30, 9, 5, 7)), '09:05:07');
  assert.strictEqual(logic.formatClock(new Date(2026, 8, 30, 23, 59, 59)), '23:59:59');
});
