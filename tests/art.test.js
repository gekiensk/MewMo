// =============================================================
// Тесты картинок (art.js)
// Запуск из папки проекта: node --test
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const art = require('../art.js');
const { CATS, CAPTAINS } = require('../cats.js');

// Похоже ли на правильный SVG: начинается с <svg, кончается </svg>,
// открывающих и закрывающих тегов <svg> поровну
function looksLikeSvg(text) {
  return typeof text === 'string' &&
    text.startsWith('<svg') &&
    text.endsWith('</svg>') &&
    text.length > 200 &&
    !text.includes('undefined') &&
    !text.includes('NaN');
}

test('у каждого кота и капитана есть портрет', function () {
  for (const cat of CATS.concat(CAPTAINS)) {
    assert.ok(art.CAT_LOOKS[cat.id], 'нет внешности у ' + cat.name);
    assert.ok(looksLikeSvg(art.catPortrait(cat.id)), 'плохой портрет у ' + cat.name);
  }
});

test('цвет скафандра совпадает с типом кота', function () {
  for (const cat of CATS.concat(CAPTAINS)) {
    assert.strictEqual(art.CAT_LOOKS[cat.id].suit, cat.type, cat.name);
    assert.ok(art.SUIT_COLORS[cat.type], 'нет цвета для типа ' + cat.type);
  }
});

test('у каждого кота своя деталь', function () {
  const all = CATS.concat(CAPTAINS);
  const details = all.map(function (cat) { return art.CAT_LOOKS[cat.id].detail; });
  assert.strictEqual(new Set(details).size, all.length);
});

test('все 6 картинок обучения — SVG', function () {
  assert.strictEqual(art.TUTORIAL_PICTURE_COUNT, 6);
  for (let i = 0; i < art.TUTORIAL_PICTURE_COUNT; i++) {
    assert.ok(looksLikeSvg(art.tutorialPicture(i)), 'картинка ' + (i + 1));
  }
});

test('картинки мини-игр — SVG', function () {
  assert.ok(looksLikeSvg(art.fishSprite()));
  assert.ok(looksLikeSvg(art.bubbleSprite()));
  assert.ok(looksLikeSvg(art.basketSprite()));
  assert.ok(looksLikeSvg(art.fireflySprite('#F5D88E')));
  assert.ok(looksLikeSvg(art.starSprite()));
  for (const id of ['star-cookie', 'moon-pudding', 'mint-jelly', 'berry-pie', 'fish-cake', 'comet-candy']) {
    assert.ok(looksLikeSvg(art.treatIcon(id)), id);
  }
  assert.ok(looksLikeSvg(art.bowlPicture()) && looksLikeSvg(art.doughPicture()) && looksLikeSvg(art.ovenPicture()));
  for (const id of ['flour', 'milk', 'mint', 'sugar', 'berry']) {
    assert.ok(looksLikeSvg(art.ingredientIcon(id)), id);
  }
});

test('неизвестный кот не ломает игру', function () {
  assert.ok(looksLikeSvg(art.catPortrait('нет-такого')));
});

test('иконки капсулы и маяка — SVG', function () {
  assert.ok(looksLikeSvg(art.capsuleIcon()));
  assert.ok(looksLikeSvg(art.beaconIcon()));
  assert.ok(looksLikeSvg(art.shelterScene()));
  assert.ok(looksLikeSvg(art.launchScene(['bul', 'moh'])));
  assert.ok(looksLikeSvg(art.launchScene([])));
  // 8 котов — 6 в иллюминаторах и надпись «…и ещё 2»
  assert.ok(art.launchScene(['bul', 'moh', 'iskra', 'gaika', 'pixel', 'kometa', 'shishka', 'murena']).includes('…и ещё 2'));
});

test('картинки ремонта: отсеки для пазла и корабль со шкалой', function () {
  assert.strictEqual(art.COMPARTMENT_NAMES.length, 3);
  for (let variant = 0; variant < 3; variant++) {
    for (const width of [240, 360]) {
      const inner = art.compartmentPicture(variant, width);
      assert.ok(inner.length > 100 && !inner.includes('undefined') && !inner.includes('NaN'), variant + ' ' + width);
    }
  }
  assert.ok(looksLikeSvg(art.repairShipPicture(0)));
  assert.ok(looksLikeSvg(art.repairShipPicture(0.5)));
  assert.ok(looksLikeSvg(art.repairShipPicture(1)));
});

test('картинки игр с котами — SVG', function () {
  assert.ok(looksLikeSvg(art.laserDotSprite()));
  assert.ok(looksLikeSvg(art.toyBallSprite()));
});
