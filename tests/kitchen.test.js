// =============================================================
// Тесты занятий дома: ингредиенты, кухня, ремонт, игры, обстановка
// Запуск из папки проекта: node --test
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');

function seededRandom(seed) {
  let state = seed;
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// ----- Ингредиенты -----
test('5 ингредиентов с разными id и названиями', function () {
  assert.strictEqual(logic.INGREDIENTS.length, 5);
  assert.strictEqual(new Set(logic.INGREDIENTS.map(function (i) { return i.id; })).size, 5);
  assert.strictEqual(logic.findIngredient('flour').name, 'Звёздная мука');
});

test('маяк даёт 1–2 ингредиента, капсула — примерно в половине случаев', function () {
  const random = seededRandom(1);
  let fromCapsules = 0;
  for (let i = 0; i < 2000; i++) {
    const beacon = logic.beaconIngredients(random);
    assert.ok(beacon.length === 1 || beacon.length === 2);
    beacon.forEach(function (id) { assert.ok(logic.findIngredient(id)); });
    fromCapsules = fromCapsules + logic.capsuleIngredients(random).length;
  }
  assert.ok(Math.abs(fromCapsules / 2000 - 0.5) < 0.05, 'доля ' + fromCapsules / 2000);
});

test('ингредиенты складываются в кладовую', function () {
  let pantry = {};
  pantry = logic.addIngredients(pantry, ['flour', 'milk', 'flour']);
  assert.deepStrictEqual(pantry, { flour: 2, milk: 1 });
  assert.strictEqual(logic.ingredientsText(['mint', 'berry']), 'Космическая мята, Туманная ягода');
});

test('старое сохранение без кладовой; неизвестные ингредиенты выбрасываются', function () {
  const text = JSON.stringify({ pantry: { flour: 3, gold: 9, milk: -1 } });
  const save = logic.loadSave({ getItem: function () { return text; }, setItem: function () {} });
  assert.deepStrictEqual(save.pantry, { flour: 3 });
  const old = logic.loadSave({ getItem: function () { return '{}'; }, setItem: function () {} });
  assert.deepStrictEqual(old.pantry, {});
});

// ----- Кухня -----
const { CATS, CAPTAINS } = require('../cats.js');

test('6 рецептов из 2–3 известных ингредиентов', function () {
  assert.strictEqual(logic.RECIPES.length, 6);
  for (const recipe of logic.RECIPES) {
    const ids = Object.keys(recipe.needs);
    assert.ok(ids.length >= 2 && ids.length <= 3, recipe.name);
    ids.forEach(function (id) { assert.ok(logic.findIngredient(id), id); });
  }
});

test('у каждого кота и капитана есть любимое угощение из рецептов', function () {
  for (const cat of CATS.concat(CAPTAINS)) {
    assert.ok(logic.findRecipe(cat.favoriteTreat), cat.name + ': ' + cat.favoriteTreat);
  }
});

test('готовка: ингредиенты и рыбки уходят, угощение появляется', function () {
  let save = logic.emptySave();
  save.pantry = { flour: 1, milk: 1 };
  save.fish = 1;
  const cake = logic.findRecipe('fish-cake'); // нужно 2 рыбки
  assert.strictEqual(logic.canCook(save, cake), false);
  assert.strictEqual(logic.cookRecipe(save, 'fish-cake'), save);
  save.fish = 3;
  save = logic.cookRecipe(save, 'fish-cake');
  assert.deepStrictEqual(save.pantry, {});
  assert.strictEqual(save.fish, 1);
  assert.deepStrictEqual(save.treats, { 'fish-cake': 1 });
});

test('угощение — 3 очка, любимое — 5, без угощения — нельзя', function () {
  let save = logic.emptySave();
  save.treats = { 'star-cookie': 2 };
  let result = logic.feedTreat(save, 'bul', 'star-cookie', 'fish-cake');
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.favorite, false);
  assert.strictEqual(result.save.friendship.bul, 3);
  result = logic.feedTreat(result.save, 'gaika', 'star-cookie', 'star-cookie');
  assert.strictEqual(result.favorite, true);
  assert.strictEqual(result.save.friendship.gaika, 5);
  assert.strictEqual(result.levelUp, true);
  assert.deepStrictEqual(result.save.treats, {}); // кончились
  assert.strictEqual(logic.feedTreat(result.save, 'bul', 'star-cookie', 'x').ok, false);
});

test('старая дружба пересчитывается в очки, уровень не меняется', function () {
  for (let treats = 0; treats <= 40; treats++) {
    const oldLevel = Math.min(5, Math.floor(treats / 5));
    assert.strictEqual(logic.levelForPoints(logic.migrateFriendship(treats)), oldLevel, 'угощений ' + treats);
  }
  const text = JSON.stringify({ friendship: { bul: 12, moh: 30 } }); // старое сохранение
  const save = logic.loadSave({ getItem: function () { return text; }, setItem: function () {} });
  assert.strictEqual(logic.friendshipLevel(save, 'bul'), 2);
  assert.strictEqual(logic.friendshipLevel(save, 'moh'), 5);
  assert.strictEqual(save.friendshipVersion, 2);
  // новое сохранение (версия 2) второй раз не пересчитывается
  const text2 = JSON.stringify({ friendship: { bul: 12 }, friendshipVersion: 2 });
  const save2 = logic.loadSave({ getItem: function () { return text2; }, setItem: function () {} });
  assert.strictEqual(save2.friendship.bul, 12);
});

test('смешать: 3 круга пальцем, туда-сюда не считается', function () {
  let state = { lastAngle: null, total: 0 };
  // ведём палец по кругу маленькими шагами: 3 полных круга
  for (let i = 0; i <= 3 * 36; i++) {
    state = logic.mixAdd(state, Math.atan2(Math.sin(i * Math.PI / 18), Math.cos(i * Math.PI / 18)));
  }
  assert.ok(logic.mixProgress(state) >= 0.999, 'смешано ' + logic.mixProgress(state));
  // туда-сюда
  let wiggle = { lastAngle: null, total: 0 };
  for (let i = 0; i < 200; i++) wiggle = logic.mixAdd(wiggle, i % 2 === 0 ? 0 : 0.5);
  assert.ok(logic.mixProgress(wiggle) < 0.05);
});
