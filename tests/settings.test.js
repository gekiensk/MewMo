// =============================================================
// Тесты настроек, времени игры и родительского замка (logic.js)
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

// ----- Старые сохранения -----
test('старое сохранение (без настроек) загружается, настройки — по умолчанию', function () {
  const old = JSON.stringify({ crew: { bul: 2 }, fish: 7, parts: 1 });
  const save = logic.loadSave(fakeStorage({ [logic.SAVE_KEY]: old }));
  assert.deepStrictEqual(save.crew, { bul: 2 });
  assert.strictEqual(save.fish, 7);
  assert.deepStrictEqual(save.settings, logic.DEFAULT_SETTINGS);
  assert.deepStrictEqual(save.playTime, { day: '', seconds: 0, bonusMinutes: 0 });
});

test('испорченные настройки заменяются значениями по умолчанию', function () {
  const text = JSON.stringify({
    settings: { sound: 'да', vibration: false, dailyLimit: 45, homeOnly: 1 },
    playTime: { day: 5, seconds: -3, bonusMinutes: 'много' }
  });
  const save = logic.loadSave(fakeStorage({ [logic.SAVE_KEY]: text }));
  assert.deepStrictEqual(save.settings, { sound: true, vibration: false, dailyLimit: 0, homeOnly: false });
  assert.deepStrictEqual(save.playTime, { day: '', seconds: 0, bonusMinutes: 0 });
});

// ----- Время игры -----
test('ключ дня — по местному времени', function () {
  // new Date(год, месяц с 0, день, часы, минуты) — это местное время
  assert.strictEqual(logic.localDayKey(new Date(2026, 8, 30, 23, 59)), '2026-09-30');
  assert.strictEqual(logic.localDayKey(new Date(2026, 8, 30, 23, 59, 59, 999)), '2026-09-30');
  assert.strictEqual(logic.localDayKey(new Date(2026, 9, 1, 0, 0)), '2026-10-01');
  assert.strictEqual(logic.localDayKey(new Date(2027, 0, 5, 12, 0)), '2027-01-05');
});

test('время игры копится и обнуляется в полночь', function () {
  const beforeMidnight = logic.localDayKey(new Date(2026, 8, 30, 23, 59, 30));
  const afterMidnight = logic.localDayKey(new Date(2026, 9, 1, 0, 0, 1));
  let playTime = { day: '', seconds: 0, bonusMinutes: 0 };
  for (let i = 0; i < 30; i++) playTime = logic.addPlayTime(playTime, beforeMidnight, 1);
  assert.strictEqual(playTime.seconds, 30);
  assert.strictEqual(logic.playedToday(playTime, beforeMidnight), 30);
  // наступила полночь
  assert.strictEqual(logic.playedToday(playTime, afterMidnight), 0);
  playTime = logic.addPlayTime(playTime, afterMidnight, 1);
  assert.deepStrictEqual(playTime, { day: afterMidnight, seconds: 1, bonusMinutes: 0 });
});

test('ограничение: играем, за 5 минут — предупреждение, потом «время вышло»', function () {
  const day = '2026-09-30';
  const at = function (seconds) {
    return logic.timeLimitState({ day: day, seconds: seconds, bonusMinutes: 0 }, day, 30);
  };
  assert.strictEqual(at(0).status, 'играем');
  assert.strictEqual(at(24 * 60 + 59).status, 'играем');
  assert.strictEqual(at(25 * 60).status, 'скоро конец');
  assert.strictEqual(at(25 * 60).secondsLeft, 5 * 60);
  assert.strictEqual(at(29 * 60 + 59).status, 'скоро конец');
  assert.strictEqual(at(30 * 60).status, 'время вышло');
  assert.strictEqual(at(40 * 60).secondsLeft, 0);
});

test('без ограничения — время не кончается; вчерашнее время не считается', function () {
  const state = logic.timeLimitState({ day: '2026-09-30', seconds: 99999, bonusMinutes: 0 }, '2026-09-30', 0);
  assert.strictEqual(state.status, 'без ограничения');
  const yesterday = { day: '2026-09-29', seconds: 90 * 60, bonusMinutes: 0 };
  assert.strictEqual(logic.timeLimitState(yesterday, '2026-09-30', 60).status, 'играем');
});

test('взрослый добавляет 15 минут на сегодня', function () {
  const day = '2026-09-30';
  let playTime = { day: day, seconds: 60 * 60, bonusMinutes: 0 };
  assert.strictEqual(logic.timeLimitState(playTime, day, 60).status, 'время вышло');
  playTime = logic.addBonusTime(playTime, day);
  const state = logic.timeLimitState(playTime, day, 60);
  assert.strictEqual(state.secondsLeft, 15 * 60);
  // бонус сгорает в полночь
  const next = logic.addPlayTime(playTime, '2026-10-01', 1);
  assert.strictEqual(next.bonusMinutes, 0);
});

// ----- Родительский замок -----
test('пример — двузначное на однозначное', function () {
  for (const r of [0, 0.3, 0.999]) {
    const q = logic.makeParentQuestion(function () { return r; });
    assert.ok(q.a >= 12 && q.a <= 99, 'a = ' + q.a);
    assert.ok(q.b >= 3 && q.b <= 9, 'b = ' + q.b);
    assert.strictEqual(q.answer, q.a * q.b);
    assert.strictEqual(q.text, q.a + ' × ' + q.b);
  }
});

test('проверка ответа родительского замка', function () {
  const q = { a: 23, b: 4, answer: 92, text: '23 × 4' };
  assert.strictEqual(logic.checkParentAnswer(q, '92'), true);
  assert.strictEqual(logic.checkParentAnswer(q, ' 92 '), true);
  assert.strictEqual(logic.checkParentAnswer(q, '93'), false);
  assert.strictEqual(logic.checkParentAnswer(q, ''), false);
  assert.strictEqual(logic.checkParentAnswer(q, '92.0'), false);
  assert.strictEqual(logic.checkParentAnswer(q, '9 2'), false);
  assert.strictEqual(logic.checkParentAnswer(q, '-92'), false);
});
