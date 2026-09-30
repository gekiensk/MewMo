// =============================================================
// Тесты капитанов: каталог, правила появления, бой с помощниками
// Запуск из папки проекта: node --test
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');
const { CATS, CAPTAINS, findCaptain } = require('../cats.js');

const FIELDS = ['id', 'name', 'type', 'rarity', 'character', 'favoriteGesture', 'fact'];
const MINUTE = 60 * 1000;

// ----- Каталог -----
test('два капитана, все поля заполнены, жесты правильные', function () {
  assert.strictEqual(CAPTAINS.length, 2);
  for (const captain of CAPTAINS) {
    for (const field of FIELDS) {
      assert.strictEqual(typeof captain[field], 'string', captain.name + ': ' + field);
      assert.ok(captain[field].trim().length > 0, captain.name + ': пустое ' + field);
    }
    assert.ok(logic.GESTURES.includes(captain.favoriteGesture));
    assert.strictEqual(captain.rarity, 'капитан');
  }
});

test('id капитанов не совпадают друг с другом и с котами, факты не повторяются', function () {
  const ids = CATS.concat(CAPTAINS).map(function (c) { return c.id; });
  assert.strictEqual(new Set(ids).size, ids.length);
  const facts = CATS.concat(CAPTAINS).map(function (c) { return c.fact; });
  assert.strictEqual(new Set(facts).size, facts.length);
  assert.strictEqual(findCaptain('zvezdous').name, 'Капитан Звездоус');
});

test('у капитана зона сигнала уже, чем у легендарных', function () {
  const captain = logic.signalSettings('капитан', false);
  const legendary = logic.signalSettings('легендарный', false);
  assert.ok(captain.zoneWidth < legendary.zoneWidth);
});

// ----- Правила появления -----
function info(changes) {
  return Object.assign({ crewCount: 3, captain: null, nextCaptainAt: 0, beaconCount: 2, now: 1000 * MINUTE }, changes);
}

test('капитан приходит, только если в экипаже 3+ кота', function () {
  assert.strictEqual(logic.canSpawnCaptain(info({ crewCount: 2 })), false);
  assert.strictEqual(logic.canSpawnCaptain(info({ crewCount: 3 })), true);
  assert.strictEqual(logic.canSpawnCaptain(info({ crewCount: 8 })), true);
});

test('капитан ждёт у маяка: без маяков не приходит', function () {
  assert.strictEqual(logic.canSpawnCaptain(info({ beaconCount: 0 })), false);
});

test('одновременно — не больше одного капитана, он ждёт 1 час', function () {
  const now = 1000 * MINUTE;
  const captain = logic.makeCaptain('zvezdous', 'poi-1', now);
  assert.strictEqual(logic.isCaptainActive(captain, now + 59 * MINUTE), true);
  assert.strictEqual(logic.isCaptainActive(captain, now + 60 * MINUTE), false);
  assert.strictEqual(logic.canSpawnCaptain(info({ captain: captain, now: now + 10 * MINUTE })), false);
  // час прошёл — может прийти новый
  assert.strictEqual(logic.canSpawnCaptain(info({ captain: captain, now: now + 61 * MINUTE })), true);
});

test('после победы следующий капитан — не раньше чем через 30 минут', function () {
  const now = 1000 * MINUTE;
  const result = logic.applyCaptainWin(logic.emptySave(), 'zvezdous', now);
  const next = result.save.nextCaptainAt;
  assert.strictEqual(logic.canSpawnCaptain(info({ nextCaptainAt: next, now: now + 29 * MINUTE })), false);
  assert.strictEqual(logic.canSpawnCaptain(info({ nextCaptainAt: next, now: now + 30 * MINUTE })), true);
});

test('победа: капитан в экипаже и 3 детали', function () {
  const result = logic.applyCaptainWin(logic.emptySave(), 'zvezdous', 0);
  assert.deepStrictEqual(result.reward, { isNew: true, parts: 3 });
  assert.strictEqual(result.save.captains.zvezdous, 1);
  assert.strictEqual(result.save.parts, 3);
  // капитаны не считаются в «Экипаж: N из M» обычных котов
  assert.strictEqual(logic.crewCount(result.save, CATS), 0);
  const again = logic.applyCaptainWin(result.save, 'zvezdous', 0);
  assert.strictEqual(again.reward.isNew, false);
  assert.strictEqual(again.save.captains.zvezdous, 2);
});

test('проигрыш: капитан остаётся, повтор через 2 минуты', function () {
  const now = 1000 * MINUTE;
  const captain = logic.makeCaptain('zvezdous', 'poi-1', now);
  const after = logic.captainAfterLoss(captain, now + 5 * MINUTE);
  assert.strictEqual(after.expiresAt, captain.expiresAt); // час не сбросился
  assert.strictEqual(logic.captainRetryLeft(after, now + 5 * MINUTE), 2 * MINUTE);
  assert.strictEqual(logic.captainRetryLeft(after, now + 7 * MINUTE), 0);
  assert.strictEqual(logic.isCaptainActive(after, now + 7 * MINUTE), true);
});

test('сначала приходят капитаны, которых ещё нет в экипаже', function () {
  const save = logic.emptySave();
  save.captains = { zvezdous: 1 };
  for (const r of [0, 0.5, 0.99]) {
    assert.strictEqual(logic.chooseCaptain(CAPTAINS, save, function () { return r; }).id, 'lunnaya-lapa');
  }
  save.captains = { zvezdous: 1, 'lunnaya-lapa': 1 };
  assert.ok(CAPTAINS.includes(logic.chooseCaptain(CAPTAINS, save, Math.random)));
});

// ----- Помощники -----
test('помощников не больше двух, повторное нажатие убирает', function () {
  let selected = [];
  selected = logic.toggleHelper(selected, 'bul');
  selected = logic.toggleHelper(selected, 'moh');
  selected = logic.toggleHelper(selected, 'iskra'); // третий — не влезает
  assert.deepStrictEqual(selected, ['bul', 'moh']);
  selected = logic.toggleHelper(selected, 'bul');
  assert.deepStrictEqual(selected, ['moh']);
});

test('в помощники — только коты из экипажа', function () {
  const save = logic.emptySave();
  save.crew = { bul: 1, moh: 2 };
  save.captains = { zvezdous: 1 };
  const all = CATS.concat(CAPTAINS);
  const ids = logic.availableHelpers(save, all, 'zvezdous').map(function (c) { return c.id; });
  assert.deepStrictEqual(ids.sort(), ['bul', 'moh']);
  const ids2 = logic.availableHelpers(save, all, 'lunnaya-lapa').map(function (c) { return c.id; });
  assert.deepStrictEqual(ids2.sort(), ['bul', 'moh', 'zvezdous']);
});

// ----- Бой до трёх побед и «вторая попытка» -----
test('бой с капитаном — до трёх побед игрока', function () {
  let battle = logic.createBattle(3, []);
  battle = logic.battleRound(battle, 'победа');
  battle = logic.battleRound(battle, 'ничья');
  battle = logic.battleRound(battle, 'победа');
  assert.strictEqual(battle.finished, '');
  battle = logic.battleRound(battle, 'поражение');
  assert.strictEqual(battle.catWins, 1);
  battle = logic.battleRound(battle, 'победа');
  assert.strictEqual(battle.playerWins, 3);
  assert.strictEqual(battle.finished, 'победа');
  // после конца боя счёт не меняется
  assert.strictEqual(logic.battleRound(battle, 'победа').playerWins, 3);
});

test('три поражения без помощников — бой проигран', function () {
  let battle = logic.createBattle(3, []);
  for (let i = 0; i < 3; i++) battle = logic.battleRound(battle, 'поражение');
  assert.strictEqual(battle.catWins, 3);
  assert.strictEqual(battle.finished, 'поражение');
});

test('помощник даёт одну вторую попытку: проигранный раунд не считается', function () {
  let battle = logic.createBattle(3, ['bul', 'moh']);
  battle = logic.battleRound(battle, 'поражение');
  assert.strictEqual(battle.pendingLoss, true);
  assert.strictEqual(battle.catWins, 0); // очко пока не засчитано
  // пока ждём решения, новые раунды не играются
  assert.strictEqual(logic.battleRound(battle, 'победа').playerWins, 0);

  battle = logic.battleUseHelper(battle, 'bul');
  assert.strictEqual(battle.pendingLoss, false);
  assert.strictEqual(battle.catWins, 0);
  assert.deepStrictEqual(battle.helpersLeft, ['moh']);

  // Буль уже помог — второй раз нельзя
  battle = logic.battleRound(battle, 'поражение');
  const again = logic.battleUseHelper(battle, 'bul');
  assert.strictEqual(again.pendingLoss, true);

  // отказываемся от помощи Мха — очко капитану, Мох остаётся в запасе
  battle = logic.battleAcceptLoss(battle);
  assert.strictEqual(battle.catWins, 1);
  assert.deepStrictEqual(battle.helpersLeft, ['moh']);

  // Мох помогает позже
  battle = logic.battleRound(battle, 'поражение');
  battle = logic.battleUseHelper(battle, 'moh');
  assert.strictEqual(battle.catWins, 1);
  assert.deepStrictEqual(battle.helpersLeft, []);

  // помощников больше нет — поражение засчитывается сразу
  battle = logic.battleRound(battle, 'поражение');
  assert.strictEqual(battle.pendingLoss, false);
  assert.strictEqual(battle.catWins, 2);
});

test('обычный кот — бой до двух побед', function () {
  let battle = logic.createBattle(2, []);
  battle = logic.battleRound(battle, 'поражение');
  battle = logic.battleRound(battle, 'поражение');
  assert.strictEqual(battle.finished, 'поражение');
});
