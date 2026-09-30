// =============================================================
// MewMo — автоматическая проверка игры в браузере («дымовой тест»)
// =============================================================
// Запуск из папки проекта:
//
//     node tools/smoke.js
//
// Что делает:
//   1. Запускает маленький сервер: python3 -m http.server (как на GitHub Pages,
//      только у тебя на компьютере).
//   2. Открывает игру в браузере Chromium на экране телефона 390×844
//      с подменённой геолокацией.
//   3. Сценарий «Прогулка»: «Гулять» → координаты приходят, точка игрока
//      идёт по 5 точкам → альбом (открыть и закрыть) → настройки →
//      «Проверить GPS» → «Играть дома» → убежище → снова «Гулять» →
//      координаты снова приходят.
//   4. Сценарий «Нет разрешения»: геолокация запрещена → окно с инструкцией.
//   5. Сценарий «Финал главы»: 20 деталей → «Запустить корабль» → взлёт →
//      вступление к главе 2.
//   6. Любая ошибка в консоли браузера = провал.
//   В конце печатает «ВСЁ ХОРОШО» или список проблем.
//
// Что нужно: Node.js, Python 3 и Playwright с браузером Chromium.
// Playwright НЕ добавляется в проект (никаких npm-пакетов в репозитории):
// скрипт ищет уже установленный на компьютере Playwright — обычный
// require('playwright') или глобальную папку npm (npm root -g).
// Установить глобально можно так: npm install -g playwright
// и затем npx playwright install chromium.
//
// Внешние серверы (карты OpenFreeMap, шрифт Google, MapLibre с jsDelivr)
// проверка подменяет своими «заглушками», чтобы проверять только НАШ код
// и не зависеть от интернета:
//   • MapLibre скачивается один раз программой curl во временную папку
//     компьютера (не в проект) и отдаётся браузеру оттуда;
//   • вместо карты — пустой стиль (просто фон, без улиц);
//   • шрифт не загружается (используется запасной).
// Как выглядят настоящие карта и шрифт — смотри на телефоне.
// Если нужна проверка с настоящей сетью: node tools/smoke.js --real-network

const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

// ----- Настройки -----
const ROOT = path.join(__dirname, '..');   // папка проекта
const PORT = 8790;                          // порт сервера для проверки
const URL = 'http://127.0.0.1:' + PORT + '/';
const MAPLIBRE_VERSION = '5.24.0';          // как в index.html
const CACHE_DIR = path.join(os.tmpdir(), 'mewmo-smoke-cache');
const REAL_NETWORK = process.argv.includes('--real-network');

// Маршрут прогулки: 5 точек по ~60 м (Париж, как стартовая точка игры)
const ROUTE = [
  [2.2950, 48.8580], [2.2958, 48.8577], [2.2966, 48.8574],
  [2.2974, 48.8571], [2.2982, 48.8568]
];
const BACK_FROM_HOME = [2.2990, 48.8565]; // точка после возвращения из дома

const problems = []; // сюда собираем все найденные проблемы

// =============================================================
// Помощники
// =============================================================
// Найти Playwright: сначала обычным способом, потом в глобальной папке npm
function loadPlaywright() {
  try {
    return require('playwright');
  } catch (error) {
    try {
      const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
      return require(path.join(globalRoot, 'playwright'));
    } catch (error2) {
      console.log('Не найден Playwright. Установи: npm install -g playwright && npx playwright install chromium');
      process.exit(2);
    }
  }
}

// Скачать файл программой curl (один раз, в кэш вне проекта)
function cached(url, name) {
  const file = path.join(CACHE_DIR, name);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    execFileSync('curl', ['-sSfL', '-o', file, url]);
  }
  return file;
}

// Подождать, пока сервер начнёт отвечать
function waitForServer(tries) {
  return new Promise(function (resolve, reject) {
    function attempt(left) {
      http.get(URL, function (res) { res.resume(); resolve(); })
        .on('error', function () {
          if (left <= 0) reject(new Error('сервер не запустился'));
          else setTimeout(function () { attempt(left - 1); }, 200);
        });
    }
    attempt(tries);
  });
}

// Пустой стиль карты: только фон, никаких внешних серверов
const EMPTY_STYLE = JSON.stringify({
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#EDE7DD' } }]
});

// Подменить внешние серверы заглушками (см. объяснение в начале файла)
async function stubExternal(context) {
  if (REAL_NETWORK) return;
  const base = 'https://cdn.jsdelivr.net/npm/maplibre-gl@' + MAPLIBRE_VERSION + '/dist/';
  const js = cached(base + 'maplibre-gl.js', 'maplibre-gl-' + MAPLIBRE_VERSION + '.js');
  const css = cached(base + 'maplibre-gl.css', 'maplibre-gl-' + MAPLIBRE_VERSION + '.css');
  await context.route('https://cdn.jsdelivr.net/**', function (route) {
    const isCss = route.request().url().endsWith('.css');
    route.fulfill({ path: isCss ? css : js, contentType: isCss ? 'text/css' : 'application/javascript' });
  });
  await context.route('https://tiles.openfreemap.org/**', function (route) {
    route.fulfill({ body: EMPTY_STYLE, contentType: 'application/json' });
  });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, function (route) {
    route.fulfill({ body: '', contentType: 'text/css' });
  });
}

// Следить за ошибками консоли и страницы
function watchErrors(page, scenario) {
  page.on('console', function (message) {
    if (message.type() === 'error') {
      problems.push(scenario + ': ошибка в консоли: ' + message.text());
    }
  });
  page.on('pageerror', function (error) {
    problems.push(scenario + ': ошибка JavaScript: ' + error.message);
  });
}

// Проверка условия: если не так — записываем проблему
function expect(ok, text) {
  if (!ok) problems.push(text);
  return ok;
}

// Ждать, пока условие в странице станет верным (до timeout мс)
async function waitFor(page, condition, argument, timeout) {
  try {
    await page.waitForFunction(condition, argument, { timeout: timeout || 8000 });
    return true;
  } catch (error) {
    return false;
  }
}

// Если появилось обучение «Как играть» — пропускаем его
async function skipTutorial(page) {
  const skip = page.locator('#tutorial-skip');
  if (await skip.count() > 0 && await skip.isVisible()) {
    await skip.click();
  }
}

// Прислать координаты и дождаться, что точка игрока туда передвинулась
async function moveTo(page, context, point, label) {
  await context.setGeolocation({ longitude: point[0], latitude: point[1], accuracy: 10 });
  const ok = await waitFor(page, function (p) {
    if (typeof playerPosition !== 'function' || !playerMarker) return false;
    const pos = playerPosition();
    return Math.abs(pos[0] - p[0]) < 0.00001 && Math.abs(pos[1] - p[1]) < 0.00001;
  }, point, 10000);
  expect(ok, 'Прогулка: точка игрока не пришла в ' + label);
}

// =============================================================
// Сценарий 1: прогулка, альбом, настройки, дом и обратно
// =============================================================
async function walkScenario(browser) {
  const name = 'Прогулка';
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    geolocation: { longitude: ROUTE[0][0], latitude: ROUTE[0][1], accuracy: 10 },
    permissions: ['geolocation']
  });
  await stubExternal(context);
  const page = await context.newPage();
  page.setDefaultTimeout(8000); // не ждать кнопку дольше 8 секунд
  watchErrors(page, name);
  await page.goto(URL);
  await skipTutorial(page);

  // «Гулять» → координаты приходят, точка идёт по 5 точкам
  await page.click('#start-button');
  await skipTutorial(page);
  for (let i = 0; i < ROUTE.length; i++) {
    await moveTo(page, context, ROUTE[i], 'точку ' + (i + 1));
  }
  const status = await page.textContent('#status');
  expect(status.includes('Ты здесь'), name + ': в строке состояния нет «Ты здесь» (там: «' + status + '»)');
  const capsules = await page.evaluate(function () { return capsules.length; });
  expect(capsules > 0, name + ': вокруг игрока нет капсул');

  // Альбом: открыть и закрыть
  await page.click('#crew-button');
  expect(await page.isVisible('#album'), name + ': альбом не открылся');
  await page.click('#album-close');
  expect(await page.isHidden('#album'), name + ': альбом не закрылся');

  // Настройки → «Проверить GPS»
  await page.click('#settings-button');
  await page.click('#open-gps-check');
  const report = await page.textContent('#gps-report');
  expect(report.includes('Координаты приходили'), name + ': в «Проверить GPS» нет отчёта');
  expect(!report.includes('48.85') && !report.includes('2.29'), name + ': в отчёте GPS видны координаты!');
  await page.click('#gps-back');

  // «Играть дома» → убежище
  await page.click('#toggle-mode');
  const home = await waitFor(page, function () {
    return gameMode === 'home' && !document.getElementById('home').classList.contains('hidden');
  }, null, 5000);
  expect(home, name + ': не открылось убежище («Играть дома»)');

  // Снова «Гулять» → координаты снова приходят
  await page.click('#settings-button');
  await page.click('#toggle-mode');
  const walk = await waitFor(page, function () { return gameMode === 'walk'; }, null, 5000);
  expect(walk, name + ': не вернулись на прогулку');
  await moveTo(page, context, BACK_FROM_HOME, 'точку после возвращения из дома');

  await context.close();
}

// =============================================================
// Сценарий 2: нет разрешения на геолокацию → окно с инструкцией
// =============================================================
async function deniedScenario(browser) {
  const name = 'Нет разрешения';
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    permissions: [] // геолокация не разрешена — браузер откажет
  });
  await stubExternal(context);
  const page = await context.newPage();
  page.setDefaultTimeout(8000); // не ждать кнопку дольше 8 секунд
  watchErrors(page, name);
  await page.goto(URL);
  await skipTutorial(page);
  await page.click('#start-button');
  await skipTutorial(page);
  const helpShown = await waitFor(page, function () {
    return !document.getElementById('gps-help').classList.contains('hidden');
  }, null, 8000);
  expect(helpShown, name + ': не появилось окно «Нет доступа к геолокации»');
  const demo = await page.evaluate(function () { return demoMode; });
  expect(demo, name + ': не включился демо-режим');
  await context.close();
}

// =============================================================
// Сценарий 3: финал главы 1 — запуск корабля и вступление к главе 2
// =============================================================
async function launchScenario(browser) {
  const name = 'Финал главы';
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    geolocation: { longitude: ROUTE[0][0], latitude: ROUTE[0][1], accuracy: 10 },
    permissions: ['geolocation']
  });
  await stubExternal(context);
  // Перед загрузкой игры кладём сохранение: 20 деталей и три кота в экипаже.
  // (Только при первой загрузке страницы — дальше игра сама ведёт сохранение.)
  await context.addInitScript(function () {
    if (!sessionStorage.getItem('smoke-ready')) {
      sessionStorage.setItem('smoke-ready', '1');
      localStorage.setItem('mewmo-save-v1', JSON.stringify({
        crew: { bul: 1, moh: 2, iskra: 1 }, parts: 20, fish: 3, tutorialSeen: true
      }));
    }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  watchErrors(page, name);
  await page.goto(URL);
  await skipTutorial(page);
  await page.click('#start-button');
  await skipTutorial(page);
  await moveTo(page, context, ROUTE[1], 'первую точку');

  await page.click('#crew-button');
  expect(await page.isVisible('#album-launch'), name + ': нет кнопки «Запустить корабль» при 20 деталях');
  await page.click('#album-launch');
  await page.click('#album-launch-yes');
  expect(await page.isVisible('#launch'), name + ': не появилась сцена взлёта');
  await page.click('#launch-skip');
  await page.click('#launch-next');
  const intro = await page.textContent('#launch-intro-text');
  expect(intro.includes('сигнал бедствия'), name + ': нет вступления к главе 2');
  await page.click('#launch-start-chapter');
  const state = await page.evaluate(function () {
    return { chapter: save.chapter, badges: save.badges, flew: save.flewHome.length };
  });
  expect(state.chapter === 2, name + ': после взлёта не началась глава 2');
  expect(state.badges.includes('rescuer-1'), name + ': нет значка «Спасатель 1 ранга»');
  expect(state.flew === 3, name + ': домой улетели не все коты экипажа');
  // Прогулка продолжается: координаты приходят
  await moveTo(page, context, ROUTE[2], 'точку после взлёта');

  // Глава 2: в капсулах коты главы 2 (или отставшие главы 1, которых ещё не нашли)
  const capsuleCats = await page.evaluate(function () {
    return capsules.map(function (c) { return { chapter: catChapter(c.cat), found: isInCrew(save, c.cat.id) }; });
  });
  expect(capsuleCats.length > 0, name + ': в главе 2 нет капсул');
  expect(capsuleCats.every(function (c) { return c.chapter === 2 || !c.found; }),
    name + ': в капсулах главы 2 попался уже найденный кот главы 1');

  // Альбом: вкладки глав, у улетевших — «Вернулся домой», шкала — 30 деталей
  await page.click('#crew-button');
  expect(await page.isVisible('#album-tabs'), name + ': в альбоме нет вкладок глав');
  const repair = await page.textContent('#album-repair-text');
  expect(repair.includes('из 30'), name + ': в главе 2 шкала ремонта не на 30 деталей (' + repair + ')');
  await page.click('.album-tab[data-chapter="1"]');
  const notes = await page.locator('#album-grid .album-note').count();
  expect(notes === 3, name + ': у улетевших котов нет отметки «Вернулся домой» (нашлось ' + notes + ')');
  await page.click('#album-close');

  // Убежище главы 2 открывается без ошибок
  await page.click('#settings-button');
  await page.click('#toggle-mode');
  const home = await waitFor(page, function () { return gameMode === 'home'; }, null, 5000);
  expect(home, name + ': не открылось убежище в главе 2');
  await context.close();
}

// =============================================================
// Запуск
// =============================================================
async function main() {
  const playwright = loadPlaywright();

  // Сервер: python3 -m http.server в папке проекта
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: ROOT, stdio: 'ignore'
  });
  let browser = null;
  try {
    await waitForServer(50);
    browser = await playwright.chromium.launch({
      // программная отрисовка карты (WebGL) — работает и без видеокарты
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    });
    console.log('Сценарий 1: прогулка, альбом, настройки, дом и обратно…');
    await walkScenario(browser);
    console.log('Сценарий 2: нет разрешения на геолокацию…');
    await deniedScenario(browser);
    console.log('Сценарий 3: финал главы 1 — запуск корабля…');
    await launchScenario(browser);
  } catch (error) {
    problems.push('Проверка упала: ' + error.message.split('\n')[0]);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }

  console.log('');
  if (problems.length === 0) {
    console.log('ВСЁ ХОРОШО ✅');
    process.exit(0);
  } else {
    console.log('ЕСТЬ ПРОБЛЕМЫ ❌ (' + problems.length + '):');
    for (let i = 0; i < problems.length; i++) {
      console.log('  ' + (i + 1) + '. ' + problems[i]);
    }
    process.exit(1);
  }
}

main();
