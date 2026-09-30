// =============================================================
// Тесты «тип кота зависит от места» (logic.js)
// Запуск из папки проекта: node --test
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');
const { CATS } = require('../cats.js');

function seededRandom(seed) {
  let state = seed;
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const P = [37.62, 55.75]; // точка, где появляется капсула

// Квадрат со стороной 2·half метров, центр — в center
function square(center, half) {
  const nw = logic.offsetPosition(logic.offsetPosition(center, half, Math.PI / 2), half, Math.PI);
  const ne = logic.offsetPosition(logic.offsetPosition(center, half, Math.PI / 2), half, 0);
  const se = logic.offsetPosition(logic.offsetPosition(center, half, -Math.PI / 2), half, 0);
  const sw = logic.offsetPosition(logic.offsetPosition(center, half, -Math.PI / 2), half, Math.PI);
  return { type: 'Polygon', coordinates: [[nw, ne, se, sw, nw]] };
}

// ----- Расстояние до фигур -----
test('внутри многоугольника расстояние 0, снаружи — до края', function () {
  assert.strictEqual(logic.distanceToGeometry(P, square(P, 20)), 0);
  // квадрат 40×40 м, центр в 100 м к востоку → до его края 80 м
  const d = logic.distanceToGeometry(P, square(logic.offsetPosition(P, 100, 0), 20));
  assert.ok(Math.abs(d - 80) < 1, 'получилось ' + d);
});

test('расстояние до линии (реки) и до точки', function () {
  // «река» с запада на восток, в 50 м к северу
  const a = logic.offsetPosition(logic.offsetPosition(P, 50, Math.PI / 2), 300, Math.PI);
  const b = logic.offsetPosition(logic.offsetPosition(P, 50, Math.PI / 2), 300, 0);
  const d = logic.distanceToGeometry(P, { type: 'LineString', coordinates: [a, b] });
  assert.ok(Math.abs(d - 50) < 1, 'до реки ' + d);
  const point = logic.offsetPosition(P, 30, 2);
  const dp = logic.distanceToGeometry(P, { type: 'Point', coordinates: point });
  assert.ok(Math.abs(dp - 30) < 1, 'до точки ' + dp);
  assert.strictEqual(logic.distanceToGeometry(P, null), Infinity);
});

test('точка в «дырке» многоугольника — не внутри', function () {
  const outer = square(P, 50).coordinates[0];
  const hole = square(P, 10).coordinates[0];
  const d = logic.distanceToGeometry(P, { type: 'Polygon', coordinates: [outer, hole] });
  assert.ok(Math.abs(d - 10) < 1, 'получилось ' + d);
});

test('мульти-многоугольник: берётся ближайшая часть', function () {
  const far = square(logic.offsetPosition(P, 500, 0), 10).coordinates;
  const near = square(logic.offsetPosition(P, 60, Math.PI), 10).coordinates;
  const d = logic.distanceToGeometry(P, { type: 'MultiPolygon', coordinates: [far, near] });
  assert.ok(Math.abs(d - 50) < 1, 'получилось ' + d);
});

// ----- Что рядом -----
test('вода рядом → «вода», парк рядом → «зелень», ничего → «город»', function () {
  const pond = { kind: 'вода', geometry: square(logic.offsetPosition(P, 70, 0), 20) }; // край в 50 м
  const park = { kind: 'зелень', geometry: square(logic.offsetPosition(P, 50, Math.PI), 20) }; // край в 30 м
  const farPark = { kind: 'зелень', geometry: square(logic.offsetPosition(P, 400, 1), 20) };
  assert.strictEqual(logic.terrainNear(P, [pond], 100), 'вода');
  assert.strictEqual(logic.terrainNear(P, [park], 100), 'зелень');
  assert.strictEqual(logic.terrainNear(P, [farPark], 100), 'город');
  assert.strictEqual(logic.terrainNear(P, [], 100), 'город');
  // ближе — зелень
  assert.strictEqual(logic.terrainNear(P, [pond, park], 100), 'зелень');
  // пруд в парке: оба «вокруг» точки — вода важнее
  const bigPark = { kind: 'зелень', geometry: square(P, 200) };
  const pondHere = { kind: 'вода', geometry: square(P, 15) };
  assert.strictEqual(logic.terrainNear(P, [bigPark, pondHere], 100), 'вода');
});

test('какие фигуры карты считаются водой и зеленью', function () {
  assert.strictEqual(logic.terrainKind('water', { class: 'lake' }), 'вода');
  assert.strictEqual(logic.terrainKind('water', { class: 'swimming_pool' }), '');
  assert.strictEqual(logic.terrainKind('waterway', { class: 'river' }), 'вода');
  assert.strictEqual(logic.terrainKind('waterway', { class: 'ditch' }), '');
  assert.strictEqual(logic.terrainKind('landcover', { class: 'wood' }), 'зелень');
  assert.strictEqual(logic.terrainKind('landcover', { class: 'grass' }), 'зелень');
  assert.strictEqual(logic.terrainKind('landcover', { class: 'sand' }), '');
  assert.strictEqual(logic.terrainKind('park', { class: 'nature_reserve' }), 'зелень');
  assert.strictEqual(logic.terrainKind('building', {}), '');
});

// ----- Выбор кота -----
function typeShare(options, type, seed) {
  const random = seededRandom(seed);
  const total = 10000;
  let count = 0;
  let legendary = 0;
  for (let i = 0; i < total; i++) {
    const cat = logic.pickCatForPlace(CATS, options, random);
    if (cat.type === type) count = count + 1;
    if (cat.rarity === 'легендарный') legendary = legendary + 1;
  }
  return { share: count / total, legendary: legendary / total };
}

test('рядом вода — водных котов заметно больше', function () {
  const nearWater = typeShare({ terrain: 'вода' }, 'водный', 3);
  const noData = typeShare({ terrain: null }, 'водный', 3);
  assert.ok(nearWater.share > 0.55, 'у воды водных ' + nearWater.share);
  assert.ok(noData.share < 0.35, 'без данных водных ' + noData.share);
  assert.ok(nearWater.share > noData.share + 0.25);
});

test('в парке больше лесных, в городе больше городских', function () {
  assert.ok(typeShare({ terrain: 'зелень' }, 'лесной', 4).share > 0.55);
  assert.ok(typeShare({ terrain: 'город' }, 'городской', 5).share > 0.6);
});

test('легендарная Комета встречается где угодно примерно в 5% случаев', function () {
  for (const terrain of ['вода', 'зелень', 'город', null]) {
    const result = typeShare({ terrain: terrain }, 'водный', 9);
    assert.ok(Math.abs(result.legendary - 0.05) < 0.015, terrain + ': ' + result.legendary);
  }
});
