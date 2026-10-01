// Тесты ремонта корабля: найденные и установленные детали, пазл
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');

function fakeStorage(data) {
  return {
    getItem: function (key) { return key in data ? data[key] : null; },
    setItem: function (key, value) { data[key] = String(value); }
  };
}

test('старое сохранение: все собранные детали считаются установленными', function () {
  const old = JSON.stringify({ crew: { bul: 1 }, parts: 12 });
  const save = logic.loadSave(fakeStorage({ [logic.SAVE_KEY]: old }));
  assert.strictEqual(save.parts, 12);
  assert.strictEqual(save.partsInstalled, 12);
  assert.strictEqual(logic.spareParts(save), 0);
});

test('старое сохранение с 20+ деталями — корабль готов к запуску, как раньше', function () {
  const old = JSON.stringify({ crew: { bul: 1 }, parts: 23 });
  const save = logic.loadSave(fakeStorage({ [logic.SAVE_KEY]: old }));
  assert.strictEqual(save.partsInstalled, 20); // не больше, чем нужно кораблю
  assert.strictEqual(logic.spareParts(save), 3);
  assert.strictEqual(logic.canLaunchShip(save), true);
});

test('установленных не может быть больше найденных', function () {
  const text = JSON.stringify({ parts: 3, partsInstalled: 9 });
  const save = logic.loadSave(fakeStorage({ [logic.SAVE_KEY]: text }));
  assert.strictEqual(save.partsInstalled, 3);
  const broken = logic.cleanSave({ parts: 3, partsInstalled: 'много' });
  assert.strictEqual(broken.partsInstalled, 3);
});

test('новая игра: деталей нет, устанавливать нечего', function () {
  const save = logic.emptySave();
  assert.strictEqual(save.partsInstalled, 0);
  assert.strictEqual(logic.canInstallPart(save), false);
  assert.strictEqual(logic.installPart(save), save);
});

test('установка детали: найденная становится установленной', function () {
  const save = logic.emptySave();
  save.parts = 2;
  assert.strictEqual(logic.spareParts(save), 2);
  const after = logic.installPart(save);
  assert.strictEqual(after.partsInstalled, 1);
  assert.strictEqual(after.parts, 2);
  assert.strictEqual(logic.spareParts(after), 1);
  assert.strictEqual(save.partsInstalled, 0); // исходное не изменилось
});

test('нельзя установить больше, чем нужно кораблю', function () {
  const save = logic.emptySave();
  save.parts = 25;
  save.partsInstalled = 20;
  assert.strictEqual(logic.canInstallPart(save), false);
  assert.strictEqual(logic.installPart(save).partsInstalled, 20);
});

test('шкала ремонта и запуск считают только установленные детали', function () {
  const save = logic.emptySave();
  save.parts = 20;
  save.partsInstalled = 5;
  assert.strictEqual(logic.canLaunchShip(save), false);
  assert.strictEqual(logic.shipRepairShare(save.partsInstalled, 1), 0.25);
});

test('пазл: 4 кусочка вначале, 6 — позже; все повёрнуты', function () {
  const save = logic.emptySave();
  assert.strictEqual(logic.puzzleSize(save), 4);
  save.partsInstalled = 10;
  assert.strictEqual(logic.puzzleSize(save), 6);
  const turns = logic.makePuzzle(6, Math.random);
  assert.strictEqual(turns.length, 6);
  turns.forEach(function (turn) { assert.ok(turn >= 1 && turn <= 3); });
  assert.strictEqual(logic.puzzleSolved(turns), false);
});

test('пазл: нажатие поворачивает кусочек, четыре нажатия — круг', function () {
  let turns = [3, 1];
  turns = logic.turnPiece(turns, 0);
  assert.deepStrictEqual(turns, [0, 1]);
  assert.strictEqual(logic.puzzleSolved(turns), false);
  turns = logic.turnPiece(turns, 1);
  turns = logic.turnPiece(turns, 1);
  turns = logic.turnPiece(turns, 1);
  assert.deepStrictEqual(turns, [0, 0]);
  assert.strictEqual(logic.puzzleSolved(turns), true);
});
