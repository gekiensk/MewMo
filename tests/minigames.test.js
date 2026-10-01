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

// ----- «Повтори узор» -----
test('узор: длина 3/4/5, один светлячок не мигает дважды подряд', function () {
  assert.strictEqual(logic.patternSettings('обычный').length, 3);
  assert.strictEqual(logic.patternSettings('редкий').length, 4);
  assert.strictEqual(logic.patternSettings('легендарный').length, 5);
  const random = seededRandom(3);
  for (let i = 0; i < 200; i++) {
    const pattern = logic.makePattern(5, random);
    assert.strictEqual(pattern.length, 5);
    for (let j = 1; j < 5; j++) {
      assert.notStrictEqual(pattern[j], pattern[j - 1]);
      assert.ok(pattern[j] >= 0 && pattern[j] <= 3);
    }
  }
});

test('узор: одна ошибка разрешена, вторая — проигрыш', function () {
  let state = { pattern: [2, 0, 3], position: 0, mistakes: 0, mistakesAllowed: 1 };
  let step = logic.patternPress(state, 2);
  assert.strictEqual(step.result, 'верно');
  step = logic.patternPress(step.state, 1); // ошибка
  assert.strictEqual(step.result, 'ошибка');
  assert.strictEqual(step.state.position, 0); // повторяем с начала
  step = logic.patternPress(step.state, 2);
  step = logic.patternPress(step.state, 0);
  step = logic.patternPress(step.state, 3);
  assert.strictEqual(step.result, 'победа');
  // две ошибки
  state = { pattern: [1, 2, 3], position: 0, mistakes: 0, mistakesAllowed: 1 };
  step = logic.patternPress(state, 0);
  step = logic.patternPress(step.state, 0);
  assert.strictEqual(step.result, 'проигрыш');
  // поблажка за сигнал — ещё одна ошибка
  assert.strictEqual(logic.patternSettings('обычный', logic.signalBonus(true)).mistakesAllowed, 2);
  assert.strictEqual(logic.patternSettings('обычный', null, true).showTwice, true);
});

// ----- «Ритм» -----
test('ритм: 8 нот, нужно 6 (обычный) или 7 (редкий)', function () {
  const common = logic.rhythmSettings('обычный');
  assert.strictEqual(common.notes, 8);
  assert.strictEqual(common.needed, 6);
  assert.strictEqual(logic.rhythmSettings('редкий').needed, 7);
  assert.strictEqual(logic.rhythmSettings('обычный', logic.signalBonus(true)).needed, 5);
  assert.ok(logic.rhythmSettings('обычный', null, true).interval > common.interval); // помощник — медленнее
  assert.strictEqual(logic.rhythmSettings('обычный', null, false, true).interval, common.interval * 2);
  // вся игра — около 20–30 секунд
  const total = common.notes * common.interval;
  assert.ok(total >= 20 && total <= 30, 'длится ' + total + ' с');
});

test('ритм: кольцо сжимается к кругу, попадание — в пределах окна', function () {
  const settings = logic.rhythmSettings('обычный');
  const target = logic.rhythmTargetTime(0, settings);
  assert.strictEqual(logic.rhythmRingSize(0, 0, settings), 1);
  assert.strictEqual(logic.rhythmRingSize(0, target, settings), 0);
  assert.strictEqual(logic.rhythmHit(target + 0.2, target, settings.window), true);
  assert.strictEqual(logic.rhythmHit(target + 0.4, target, settings.window), false);
  assert.strictEqual(logic.rhythmOutcome(6, 0, settings), 'победа');
  assert.strictEqual(logic.rhythmOutcome(3, 3, settings), 'проигрыш'); // 3 промаха из 8 при нужных 6
  assert.strictEqual(logic.rhythmOutcome(3, 2, settings), '');
});

// ----- «Созвездие» -----
test('созвездие: 5–7 звёзд на контуре кота, по порядку', function () {
  for (const [difficulty, count] of [['обычный', 5], ['редкий', 6], ['легендарный', 7]]) {
    const settings = logic.starsSettings(difficulty);
    assert.strictEqual(settings.count, count);
    const stars = logic.constellationStars(count);
    assert.deepStrictEqual(stars.map(function (s) { return s.number; }), Array.from({ length: count }, function (_, i) { return i + 1; }));
    // звёзды не совпадают друг с другом
    const places = new Set(stars.map(function (s) { return s.x + ',' + s.y; }));
    assert.strictEqual(places.size, count);
  }
  assert.strictEqual(logic.starsSettings('обычный', logic.signalBonus(true)).fadeTime, 23);
  assert.ok(logic.starsSettings('обычный', null, true).fadeTime > 20);
});

test('созвездие: не та звезда — без наказания, по порядку — победа', function () {
  let step = logic.starPress(1, 2, 3);
  assert.deepStrictEqual(step, { next: 1, result: 'мимо' });
  step = logic.starPress(1, 1, 3);
  step = logic.starPress(step.next, 2, 3);
  step = logic.starPress(step.next, 3, 3);
  assert.strictEqual(step.result, 'победа');
  assert.strictEqual(logic.starsBrightness(0, 20), 1);
  assert.strictEqual(logic.starsBrightness(10, 20), 0.5);
  assert.strictEqual(logic.starsBrightness(30, 20), 0);
});

test('легендарный кот — две разные игры, капитан — три разные', function () {
  const random = seededRandom(9);
  for (let i = 0; i < 50; i++) {
    const legend = logic.randomMinigames(2, random);
    assert.notStrictEqual(legend[0], legend[1]);
    const captain = logic.randomMinigames(3, random);
    assert.strictEqual(new Set(captain).size, 3);
  }
  // у каждого типа — своя игра
  assert.deepStrictEqual(logic.planMinigames({ type: 'лесной', rarity: 'обычный' }, random).games, ['pattern']);
  assert.deepStrictEqual(logic.planMinigames({ type: 'городской', rarity: 'редкий' }, random).games, ['rhythm']);
  assert.deepStrictEqual(logic.planMinigames({ type: 'сумеречный', rarity: 'обычный' }, random).games, ['stars']);
});
