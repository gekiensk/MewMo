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

// ----- «Сторож» -----
const SEC = 1000;
function watchdog(changes) {
  return logic.shouldRestartGps(Object.assign({
    walking: true, visible: true, lastFixAt: 0, lastStartAt: 0, now: 100 * SEC
  }, changes));
}

test('сторож: нет координат 30 секунд — перезапуск', function () {
  assert.strictEqual(watchdog({ lastFixAt: 71 * SEC, lastStartAt: 10 * SEC }), false); // 29 с
  assert.strictEqual(watchdog({ lastFixAt: 70 * SEC, lastStartAt: 10 * SEC }), true);  // 30 с
});

test('сторож: после перезапуска снова ждёт 30 секунд', function () {
  assert.strictEqual(watchdog({ lastFixAt: 0, lastStartAt: 80 * SEC }), false);
  assert.strictEqual(watchdog({ lastFixAt: 0, lastStartAt: 70 * SEC }), true);
});

test('сторож не трогает GPS дома, когда игра свёрнута и когда нет разрешения', function () {
  assert.strictEqual(watchdog({ walking: false }), false);
  assert.strictEqual(watchdog({ visible: false }), false);
  assert.strictEqual(watchdog({ permissionDenied: true }), false);
  assert.strictEqual(watchdog({ permissionDenied: false }), true);
});

// ----- Переход в демо-режим -----
function search(changes) {
  return logic.gpsSearchState(Object.assign({
    permissionDenied: false, hasFix: false, searchStartedAt: 0, now: 0
  }, changes));
}

test('до первых координат ищем 45 секунд, потом — демо-режим', function () {
  assert.strictEqual(search({ now: 0 }), 'ищем');
  assert.strictEqual(search({ now: 44 * SEC }), 'ищем');
  assert.strictEqual(search({ now: 45 * SEC }), 'демо');
  assert.strictEqual(search({ searchStartedAt: 100 * SEC, now: 120 * SEC }), 'ищем');
});

test('нет разрешения — сразу; координаты были — всё работает', function () {
  assert.strictEqual(search({ permissionDenied: true }), 'нет разрешения');
  assert.strictEqual(search({ hasFix: true, now: 999 * SEC }), 'работает');
});

test('ошибка TIMEOUT до первых координат не включает демо-режим сразу', function () {
  assert.strictEqual(logic.gpsErrorAction(false, false), 'ищем');
  assert.strictEqual(logic.gpsErrorAction(true, false), 'слабый сигнал');
  assert.strictEqual(logic.gpsErrorAction(false, true), 'демо');
});

// ----- Отчёт «Проверить GPS» -----
function reportInfo(changes) {
  const now = new Date(2026, 8, 30, 14, 5, 9).getTime();
  return Object.assign({
    now: now, supported: true, secure: true, permission: 'granted', mode: 'walk',
    demo: false, watching: true, fixCount: 12, lastFixAt: now - 3000, accuracy: 15.4,
    lastError: { code: 3, message: 'Timeout expired', time: now - 40000 },
    log: [{ time: now - 60000, event: 'запуск слежения', error: 'прогулка' }],
    browser: 'Тестовый браузер'
  }, changes);
}

test('отчёт показывает состояние GPS', function () {
  const text = logic.buildGpsReport(reportInfo({}));
  assert.ok(text.includes('Время: 14:05:09'));
  assert.ok(text.includes('Браузер умеет геолокацию: да'));
  assert.ok(text.includes('Защищённое соединение (https): да'));
  assert.ok(text.includes('Разрешение: разрешено'));
  assert.ok(text.includes('Координаты приходили: 12 раз'));
  assert.ok(text.includes('Последние координаты: 3 с назад'));
  assert.ok(text.includes('Точность: 15 м'));
  assert.ok(text.includes('код 3 (TIMEOUT'));
  assert.ok(text.includes('14:04:09 запуск слежения — прогулка'));
});

test('отчёт без координат и без ошибок', function () {
  const text = logic.buildGpsReport(reportInfo({ fixCount: 0, lastFixAt: 0, lastError: null, log: [], permission: undefined }));
  assert.ok(text.includes('Последние координаты: ещё не было'));
  assert.ok(text.includes('Последняя ошибка: нет'));
  assert.ok(text.includes('Разрешение: неизвестно'));
  assert.ok(text.includes('пусто'));
});

test('координаты никогда не попадают в отчёт', function () {
  // Даже если по ошибке передать координаты — функция их не берёт
  const text = logic.buildGpsReport(reportInfo({
    latitude: 55.755812, longitude: 37.617304, coords: { latitude: 55.755812, longitude: 37.617304 }
  }));
  assert.ok(!text.includes('55.75'));
  assert.ok(!text.includes('37.61'));
});

test('в отчёт попадают только 10 последних событий журнала', function () {
  const now = new Date(2026, 8, 30, 12, 0, 0).getTime();
  const log = [];
  for (let i = 0; i < 20; i++) log.push({ time: now, event: 'событие-' + i, error: '' });
  const text = logic.buildGpsReport(reportInfo({ now: now, log: log }));
  assert.ok(!/событие-9$/m.test(text)); // «событие-9» в конце строки — его быть не должно
  assert.ok(text.includes('событие-10'));
  assert.ok(text.includes('событие-19'));
});
