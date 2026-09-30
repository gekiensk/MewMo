// =============================================================
// Тесты маяков (logic.js)
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

function fakeRandom(numbers) {
  let index = 0;
  return function () {
    const value = numbers[index % numbers.length];
    index = index + 1;
    return value;
  };
}

const CENTER = [37.62, 55.75];

// ----- Фильтр мест -----
test('разрешённые места становятся маяками', function () {
  const good = [
    { class: 'playground', subclass: 'playground' },
    { class: 'park', subclass: 'park' },
    { class: 'garden', subclass: 'garden' },
    { class: 'fountain', subclass: 'fountain' },
    { class: 'library', subclass: 'library' },
    { class: 'museum', subclass: 'museum' },
    { class: 'art_gallery', subclass: 'artwork' },
    { class: 'art_gallery', subclass: 'sculpture' },
    { class: 'park' } // без subclass — смотрим на class
  ];
  for (const place of good) {
    assert.strictEqual(logic.isBeaconPlace(place), true, JSON.stringify(place));
  }
});

test('запрещённые и неподходящие места маяками не становятся', function () {
  const bad = [
    { class: 'cemetery', subclass: 'cemetery' },
    { class: 'cemetery', subclass: 'grave_yard' },
    { class: 'monument', subclass: 'memorial' },
    { class: 'monument', subclass: 'monument' },
    { class: 'place_of_worship', subclass: 'christian' },
    { class: 'hospital', subclass: 'hospital' },
    { class: 'hospital', subclass: 'clinic' },
    { class: 'school', subclass: 'school' },
    { class: 'school', subclass: 'kindergarten' },
    { class: 'parking', subclass: 'parking' },
    { class: 'railway', subclass: 'station' },
    { class: 'bus', subclass: 'bus_stop' },
    { class: 'construction' },
    { class: 'library', subclass: 'books' },   // книжный магазин — не библиотека
    { class: 'art_gallery', subclass: 'gallery' }, // обычная галерея-магазин
    { class: 'cafe', subclass: 'cafe' },
    // запрет сильнее разрешения
    { class: 'school', subclass: 'playground' },
    { class: 'cemetery', subclass: 'park' },
    {},
    null
  ];
  for (const place of bad) {
    assert.strictEqual(logic.isBeaconPlace(place), false, JSON.stringify(place));
  }
});

test('в списках разрешённых и запрещённых нет пересечений', function () {
  for (const kind of Object.keys(logic.BEACON_PLACES)) {
    assert.ok(!logic.BEACON_FORBIDDEN.includes(kind), kind);
  }
});

// ----- Выбор маяков и расстояния -----
test('маяки не ближе 40 м друг к другу, не дальше 300 м и не больше 6', function () {
  const random = seededRandom(5);
  const candidates = [];
  for (let i = 0; i < 200; i++) {
    candidates.push({
      id: 'p' + i,
      position: logic.randomCapsulePosition(CENTER, 0, 400, random),
      kind: 'park', name: ''
    });
  }
  const chosen = logic.selectBeacons(candidates, CENTER);
  assert.strictEqual(chosen.length, 6);
  for (let i = 0; i < chosen.length; i++) {
    assert.ok(logic.distanceMeters(CENTER, chosen[i].position) <= 300);
    for (let j = i + 1; j < chosen.length; j++) {
      const gap = logic.distanceMeters(chosen[i].position, chosen[j].position);
      assert.ok(gap >= 40, 'между маяками ' + gap + ' м');
    }
  }
});

test('дубликаты одного места убираются, берутся ближайшие', function () {
  const a = logic.offsetPosition(CENTER, 50, 0);
  const aCopy = logic.offsetPosition(CENTER, 55, 0);   // то же место, 5 м в сторону
  const b = logic.offsetPosition(CENTER, 100, Math.PI);
  const far = logic.offsetPosition(CENTER, 350, 1);     // дальше 300 м
  const chosen = logic.selectBeacons([
    { id: 'far', position: far },
    { id: 'b', position: b },
    { id: 'a-copy', position: aCopy },
    { id: 'a', position: a },
    { id: 'a', position: a } // тот же id дважды
  ], CENTER);
  assert.deepStrictEqual(chosen.map(function (p) { return p.id; }), ['a', 'b']);
});

test('виртуальных маяков 3, они рядом и не ближе 40 м друг к другу', function () {
  for (let seed = 1; seed < 50; seed++) {
    const beacons = logic.makeVirtualBeacons(CENTER, seededRandom(seed), 'test');
    assert.strictEqual(beacons.length, 3);
    const ids = new Set(beacons.map(function (b) { return b.id; }));
    assert.strictEqual(ids.size, 3);
    for (let i = 0; i < 3; i++) {
      const d = logic.distanceMeters(CENTER, beacons[i].position);
      assert.ok(d >= 59 && d <= 121, 'до маяка ' + d);
      for (let j = i + 1; j < 3; j++) {
        assert.ok(logic.distanceMeters(beacons[i].position, beacons[j].position) >= 40);
      }
    }
  }
});

test('beaconsNear оставляет только ближние маяки', function () {
  const near = { id: 'n', position: logic.offsetPosition(CENTER, 100, 0) };
  const far = { id: 'f', position: logic.offsetPosition(CENTER, 400, 0) };
  assert.deepStrictEqual(logic.beaconsNear([near, far], CENTER, 300), [near]);
});

// ----- Награды -----
test('маяк даёт 2–4 рыбки и деталь примерно в 30% случаев', function () {
  const random = seededRandom(11);
  const total = 10000;
  let parts = 0;
  const fishSeen = new Set();
  for (let i = 0; i < total; i++) {
    const reward = logic.beaconReward(random);
    assert.ok(reward.fish >= 2 && reward.fish <= 4);
    assert.ok(reward.parts === 0 || reward.parts === 1);
    fishSeen.add(reward.fish);
    parts = parts + reward.parts;
  }
  assert.deepStrictEqual([...fishSeen].sort(), [2, 3, 4]);
  assert.ok(Math.abs(parts / total - 0.3) < 0.02, 'доля деталей ' + parts / total);
  // крайние случаи
  assert.deepStrictEqual(logic.beaconReward(fakeRandom([0, 0])), { fish: 2, parts: 1 });
  assert.deepStrictEqual(logic.beaconReward(fakeRandom([0.99, 0.99])), { fish: 4, parts: 0 });
});

// ----- Перезарядка -----
test('после награды маяк перезаряжается 5 минут', function () {
  const now = 1000000;
  let save = logic.emptySave();
  save = logic.applyBeaconReward(save, 'poi-1', { fish: 3, parts: 1 }, now);
  assert.strictEqual(save.fish, 3);
  assert.strictEqual(save.parts, 1);
  assert.strictEqual(logic.beaconCooldownLeft(save.beaconCooldowns, 'poi-1', now), 5 * 60 * 1000);
  assert.strictEqual(logic.beaconCooldownLeft(save.beaconCooldowns, 'poi-1', now + 60000), 4 * 60 * 1000);
  assert.strictEqual(logic.beaconCooldownLeft(save.beaconCooldowns, 'poi-1', now + 5 * 60 * 1000), 0);
  // другой маяк не перезаряжается
  assert.strictEqual(logic.beaconCooldownLeft(save.beaconCooldowns, 'poi-2', now), 0);
});

test('закончившиеся перезарядки выбрасываются, в сохранении нет координат', function () {
  const now = 10 * 60 * 1000;
  const old = { 'poi-old': now - 1, 'poi-busy': now + 1000 };
  const result = logic.startBeaconCooldown(old, 'virtual-1-0', now);
  assert.deepStrictEqual(Object.keys(result).sort(), ['poi-busy', 'virtual-1-0']);
  // только числа-времена, никаких координат
  for (const value of Object.values(result)) {
    assert.strictEqual(typeof value, 'number');
  }
});

test('время перезарядки пишется как минуты:секунды', function () {
  assert.strictEqual(logic.formatTimeLeft(5 * 60 * 1000), '5:00');
  assert.strictEqual(logic.formatTimeLeft(245000), '4:05');
  assert.strictEqual(logic.formatTimeLeft(500), '0:01');
});

test('название маяка', function () {
  assert.strictEqual(logic.beaconTitle({ kind: 'park', name: 'Парк Горького' }), 'Парк Горького');
  assert.strictEqual(logic.beaconTitle({ kind: 'playground', name: '' }), 'Детская площадка');
  assert.strictEqual(logic.beaconTitle({ kind: 'virtual', name: '' }), 'Космический маяк');
});
