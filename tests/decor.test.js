// Тесты обстановки убежища: магазин, места, гости по предметам
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');
const { CATS } = require('../cats.js');

test('в магазине 10–12 предметов, у каждого своя цена; первый — дешёвый', function () {
  assert.ok(logic.DECOR_ITEMS.length >= 10 && logic.DECOR_ITEMS.length <= 12);
  const ids = logic.DECOR_ITEMS.map(function (item) { return item.id; });
  assert.strictEqual(new Set(ids).size, ids.length);
  const cheapest = Math.min.apply(null, logic.DECOR_ITEMS.map(function (item) { return item.price; }));
  assert.ok(cheapest <= 10, 'самый дешёвый — после 1–2 прогулок');
  assert.ok(logic.DECOR_SLOT_COUNT >= 6 && logic.DECOR_SLOT_COUNT <= 8);
  // аквариум — водных, цветок — лесных, телескоп — сумеречных
  assert.strictEqual(logic.findDecor('aquarium').attracts, 'водный');
  assert.strictEqual(logic.findDecor('plant').attracts, 'лесной');
  assert.strictEqual(logic.findDecor('telescope').attracts, 'сумеречный');
});

test('старое сохранение без обстановки — ничего не куплено, места пустые', function () {
  const save = logic.cleanSave({ crew: { bul: 1 }, fish: 5 });
  assert.deepStrictEqual(save.decor.owned, []);
  assert.strictEqual(save.decor.placed.length, logic.DECOR_SLOT_COUNT);
  assert.ok(save.decor.placed.every(function (slot) { return slot === null; }));
});

test('испорченная обстановка чинится', function () {
  const decor = logic.cleanDecor({
    owned: ['rug', 'rug', 'нет-такого', 5, 'plant'],
    placed: ['rug', 'rug', 'telescope', 'plant', null, null, 'plant', 'plant']
  });
  assert.deepStrictEqual(decor.owned, ['rug', 'plant']);
  // rug — только на одном месте, telescope не куплен, лишних мест нет
  assert.deepStrictEqual(decor.placed, ['rug', null, null, 'plant', null, null]);
});

test('покупка: рыбки списываются, второй раз купить нельзя', function () {
  let save = logic.emptySave();
  save.fish = 9;
  let result = logic.buyDecor(save, 'rug');
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.save.fish, 1);
  assert.deepStrictEqual(result.save.decor.owned, ['rug']);
  assert.strictEqual(save.fish, 9); // исходное не изменилось
  save = result.save;
  assert.strictEqual(logic.buyDecor(save, 'rug').reason, 'уже есть');
  assert.strictEqual(logic.buyDecor(save, 'telescope').reason, 'мало рыбок');
  assert.strictEqual(logic.buyDecor(save, 'нет-такого').ok, false);
});

test('поставить, переставить, убрать', function () {
  let save = logic.emptySave();
  save.decor.owned = ['rug', 'plant'];
  save = logic.placeDecor(save, 0, 'rug');
  assert.strictEqual(save.decor.placed[0], 'rug');
  // переставить: коврик переезжает на место 3, место 0 пустеет
  save = logic.placeDecor(save, 3, 'rug');
  assert.strictEqual(save.decor.placed[0], null);
  assert.strictEqual(save.decor.placed[3], 'rug');
  // поставить другой предмет на занятое место — старый убирается
  save = logic.placeDecor(save, 3, 'plant');
  assert.strictEqual(save.decor.placed[3], 'plant');
  assert.ok(!save.decor.placed.includes('rug'));
  // убрать
  save = logic.removeDecor(save, 3);
  assert.ok(save.decor.placed.every(function (slot) { return slot === null; }));
  // некупленный предмет поставить нельзя
  assert.strictEqual(logic.placeDecor(save, 1, 'telescope'), save);
  assert.strictEqual(logic.placeDecor(save, 99, 'rug'), save);
});

test('предметы зовут котов своего типа (только обычных, текущей главы)', function () {
  const save = logic.emptySave();
  save.decor.owned = ['aquarium', 'rug', 'plant'];
  assert.deepStrictEqual(logic.attractedGuests(CATS, save), []); // ещё не расставлены
  save.decor.placed = ['aquarium', 'rug', null, null, null, null];
  assert.deepStrictEqual(logic.decorAttracts(save), ['водный']);
  const water = logic.attractedGuests(CATS, save);
  assert.ok(water.length > 0);
  water.forEach(function (cat) {
    assert.strictEqual(cat.type, 'водный');
    assert.strictEqual(cat.rarity, 'обычный');
    assert.strictEqual(cat.chapter || 1, 1);
  });
});

test('гости: с аквариумом чаще водные, но не чаще раза в 6 часов', function () {
  const save = logic.emptySave();
  save.decor.owned = ['aquarium'];
  save.decor.placed = ['aquarium', null, null, null, null, null];
  let water = 0;
  const total = 400;
  for (let i = 0; i < total; i++) {
    const guests = logic.updateGuests({ list: [], nextAt: 0 }, 1000, CATS, function () { return 12; }, Math.random, save);
    assert.strictEqual(guests.list.length, 1);
    assert.strictEqual(guests.nextAt, 1000 + logic.GUEST_INTERVAL);
    if (CATS.find(function (c) { return c.id === guests.list[0]; }).type === 'водный') water++;
  }
  // без аквариума водный гость — примерно 1 из 6 обычных котов главы 1,
  // с аквариумом — больше половины
  assert.ok(water / total > 0.5, 'доля водных ' + water / total);
  // правило 6 часов: через час новый гость не прилетает
  const first = logic.updateGuests({ list: [], nextAt: 0 }, 1000, CATS, function () { return 12; }, Math.random, save);
  const later = logic.updateGuests({ list: [], nextAt: first.nextAt }, 1000 + 3600000, CATS, function () { return 12; }, Math.random, save);
  assert.deepStrictEqual(later.list, []);
});
