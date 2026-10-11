// =============================================================
// Тесты работы без интернета (sw.js)
// =============================================================
// Service worker работает только в браузере, поэтому здесь проверяем
// сам файл: все файлы игры из index.html есть в списке GAME_FILES.
// Иначе новый файл игры без интернета не загрузится.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// Список GAME_FILES из sw.js: всё, что в кавычках между [ и ]
function gameFiles() {
  const block = sw.slice(sw.indexOf('const GAME_FILES = ['), sw.indexOf('];', sw.indexOf('const GAME_FILES = [')));
  return Array.from(block.matchAll(/'([^']+)'/g)).map(function (m) { return m[1]; });
}

test('все свои скрипты и стили из index.html есть в кэше sw.js', function () {
  const files = gameFiles();
  const local = [];
  for (const m of html.matchAll(/<script src="([^"]+)"|<link rel="(?:stylesheet|manifest|icon|apple-touch-icon)" href="([^"]+)"/g)) {
    const file = m[1] || m[2];
    if (!/^https?:/.test(file)) local.push(file);
  }
  assert.ok(local.length >= 20, 'нашлось мало файлов: ' + local.length);
  for (const file of local) {
    assert.ok(files.includes(file), file + ' нет в GAME_FILES (sw.js)');
  }
});

test('все файлы из списка кэша существуют', function () {
  for (const file of gameFiles()) {
    if (file === './') continue;
    assert.ok(fs.existsSync(path.join(ROOT, file)), file + ' не найден');
  }
});

test('кусочки карты не кэшируются (их слишком много)', function () {
  assert.ok(!sw.includes("'tiles.openfreemap.org'"), 'карты OpenFreeMap не должно быть в CACHED_HOSTS');
});

test('ссылка с хвостом «?…» без интернета находит файл в кэше', function () {
  assert.ok(sw.includes('ignoreSearch: true'), 'в cache.match нужен ignoreSearch');
});
