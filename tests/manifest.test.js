// =============================================================
// Тест: манифест для установки игры на телефон
// Запуск из папки проекта: node --test
// =============================================================
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

test('манифест — правильный JSON с названием, цветами и иконками', function () {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  assert.strictEqual(manifest.short_name, 'MewMo');
  assert.ok(manifest.name.includes('MewMo'));
  assert.strictEqual(manifest.display, 'standalone');
  assert.strictEqual(manifest.start_url, './');
  assert.ok(/^#[0-9A-F]{6}$/i.test(manifest.theme_color));
  assert.ok(/^#[0-9A-F]{6}$/i.test(manifest.background_color));
  const sizes = manifest.icons.map(function (icon) { return icon.sizes; });
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  // все файлы иконок на месте
  for (const icon of manifest.icons) {
    assert.ok(fs.existsSync(path.join(root, icon.src)), 'нет файла ' + icon.src);
  }
});

test('страница подключает манифест', function () {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.includes('<link rel="manifest" href="manifest.webmanifest">'));
});
