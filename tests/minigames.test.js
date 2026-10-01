// =============================================================
// Тесты мини-игр (logic.js)
// Запуск из папки проекта: node --test
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');
const { CATS, CAPTAINS } = require('../cats.js');

function seededRandom(seed) {
  let state = seed;
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// ----- Каркас -----
test('сложность мини-игры по редкости', function () {
  assert.strictEqual(logic.minigameDifficulty('обычный'), 'обычный');
  assert.strictEqual(logic.minigameDifficulty('редкий'), 'редкий');
  assert.strictEqual(logic.minigameDifficulty('легендарный'), 'легендарный');
  assert.strictEqual(logic.minigameDifficulty('капитан'), 'легендарный');
});

test('план встречи: обычный кот — 1 игра, легендарный — 2, капитан — 3 (нужно 2)', function () {
  const random = seededRandom(1);
  const water = CATS.find(function (c) { return c.id === 'bul'; });
  const plan = logic.planMinigames(water, random);
  assert.strictEqual(plan.games.length, 1);
  assert.strictEqual(plan.winsNeeded, 1);
  const legend = CATS.find(function (c) { return c.rarity === 'легендарный'; });
  const legendPlan = logic.planMinigames(legend, random);
  assert.strictEqual(legendPlan.games.length, 2);
  assert.strictEqual(legendPlan.winsNeeded, 2);
  const captainPlan = logic.planMinigames(CAPTAINS[0], random);
  assert.strictEqual(captainPlan.games.length, 3);
  assert.strictEqual(captainPlan.winsNeeded, 2);
  for (const game of captainPlan.games.concat(legendPlan.games, plan.games)) {
    assert.ok(logic.READY_MINIGAMES.includes(game), game);
  }
});

test('пойманный сигнал — поблажка: +1 жизнь или +3 секунды', function () {
  assert.deepStrictEqual(logic.signalBonus(true), { extraLives: 1, extraSeconds: 3 });
  assert.deepStrictEqual(logic.signalBonus(false), { extraLives: 0, extraSeconds: 0 });
});

test('помощник помогает в игре своего типа', function () {
  const perks = logic.helperPerks([{ type: 'водный' }, { type: 'сумеречный' }]);
  assert.deepStrictEqual(perks, { fish: true, pattern: false, rhythm: false, stars: true });
  assert.ok(logic.helperHelpText({ type: 'лесной' }).includes('Повтори узор'));
  assert.ok(logic.helperHelpText({ type: 'капитан' }).includes('подбадривает'));
});

// ----- «Поймай рыбок» -----
test('рыбок нужно больше у редких, поблажка и помощник работают', function () {
  const common = logic.fishSettings('обычный', null, false, false);
  const legend = logic.fishSettings('легендарный', null, false, false);
  assert.ok(legend.goal > common.goal);
  assert.ok(legend.fallTime < common.fallTime);
  assert.strictEqual(logic.fishSettings('обычный', logic.signalBonus(true), false, false).lives, common.lives + 1);
  assert.ok(logic.fishSettings('обычный', null, true, false).basketWidth > common.basketWidth);
  // «уменьшить движение» — вдвое медленнее
  assert.strictEqual(logic.fishSettings('обычный', null, false, true).fallTime, common.fallTime * 2);
  assert.ok(common.duration >= 20 && common.duration <= 30);
});

test('рыбки и пузыри падают в пределах поля, пузырей меньше', function () {
  const settings = logic.fishSettings('обычный', null, false, false);
  const random = seededRandom(2);
  let bubbles = 0;
  for (let i = 0; i < 2000; i++) {
    const item = logic.makeFallingItem(settings, random, 0);
    assert.ok(item.x >= 0.08 && item.x <= 0.92);
    if (item.kind === 'пузырь') bubbles++;
  }
  assert.ok(Math.abs(bubbles / 2000 - settings.bubbleChance) < 0.04);
  assert.strictEqual(logic.fallingY({ born: 1 }, 2.6, 3.2), 0.5);
});

test('корзинка ловит то, что над ней', function () {
  assert.strictEqual(logic.isCaughtByBasket(0.5, 0.55, 0.24), true);
  assert.strictEqual(logic.isCaughtByBasket(0.5, 0.62, 0.24), true);  // край
  assert.strictEqual(logic.isCaughtByBasket(0.5, 0.63, 0.24), false);
});

test('итог «Поймай рыбок»', function () {
  assert.strictEqual(logic.fishOutcome(8, 8, 1, 5), 'победа');
  assert.strictEqual(logic.fishOutcome(3, 8, 0, 5), 'проигрыш');
  assert.strictEqual(logic.fishOutcome(3, 8, 2, 0), 'проигрыш');
  assert.strictEqual(logic.fishOutcome(3, 8, 2, 5), '');
});
