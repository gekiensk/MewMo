// =============================================================
// Тесты обучения «Как играть» (logic.js)
// Запуск из папки проекта: node --test
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');

function load(data) {
  const text = JSON.stringify(data);
  return logic.loadSave({ getItem: function () { return text; }, setItem: function () {} });
}

test('новый игрок видит обучение и подсказки', function () {
  const save = logic.emptySave();
  assert.strictEqual(logic.shouldShowTutorial(save), true);
  assert.strictEqual(logic.needsEncounterTips(save), true);
});

test('старое сохранение без флага: кто уже играл — без обучения', function () {
  const played = load({ crew: { bul: 1 }, fish: 3 });
  assert.strictEqual(played.tutorialSeen, true);
  assert.strictEqual(logic.needsEncounterTips(played), false);
  // старое сохранение совсем без прогресса — обучение покажем
  const fresh = load({ settings: { sound: false } });
  assert.strictEqual(fresh.tutorialSeen, false);
  assert.strictEqual(fresh.tipEncounters, 0);
});

test('подсказки в мини-игре — только в первые 2 встречи', function () {
  const save = logic.emptySave();
  save.tipEncounters = 1;
  assert.strictEqual(logic.needsEncounterTips(save), true);
  save.tipEncounters = 2;
  assert.strictEqual(logic.needsEncounterTips(save), false);
});

test('флаг обучения сохраняется', function () {
  const save = load({ tutorialSeen: true, tipEncounters: 0 });
  assert.strictEqual(logic.shouldShowTutorial(save), false);
  assert.strictEqual(logic.needsEncounterTips(save), true);
});
