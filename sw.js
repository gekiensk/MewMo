// =============================================================
// MewMo — service worker: игра открывается и без интернета
// =============================================================
// Service worker — это маленькая программа, которую браузер держит
// рядом с сайтом. Она видит все запросы игры и может ответить на них
// из «кэша» — копий файлов, сохранённых на телефоне.
//
// Главное правило: СНАЧАЛА СЕТЬ. Если интернет есть, браузер всегда
// берёт свежие файлы с GitHub Pages — обновления игры приходят сразу,
// как и раньше. Кэш — только запасной вариант:
//   • интернета нет — файлы берутся из кэша, игра открывается;
//   • интернет очень медленный (дольше NETWORK_TIMEOUT) — отвечаем
//     из кэша, а свежий файл докачивается и сохраняется к следующему разу.
//
// Что кэшируем: файлы игры, библиотеку карты MapLibre и шрифт.
// Что НЕ кэшируем: кусочки карты (их очень много) — без интернета
// карта будет пустой, а режим «Дом» работает полностью.
// Никаких данных игрока здесь нет: сохранение лежит в localStorage.
//
// Регистрирует этот файл game.js — только на https (GitHub Pages)
// и на localhost (для проверки). В tools/smoke.js (адрес 127.0.0.1)
// service worker не включается: он мешал бы заглушкам проверки.

// Имя кэша. Если поменять — старый кэш удалится при следующем запуске.
const CACHE_NAME = 'mewmo-cache-v1';

// Сколько ждать сеть, прежде чем ответить из кэша (мс)
const NETWORK_TIMEOUT = 4000;

// Файлы игры: кладём в кэш сразу при установке
const GAME_FILES = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'logic.js', 'cats.js', 'art.js', 'sound.js', 'minigames.js', 'encounter.js',
  'album.js', 'tutorial.js', 'launch.js', 'quests.js', 'settings.js',
  'kitchen.js', 'repair.js', 'play.js', 'decor.js', 'home.js',
  'gps.js', 'beacons.js', 'captains.js', 'game.js'
];

// Чужие сайты, файлы с которых тоже можно кэшировать
// (MapLibre с jsDelivr и шрифт Google). Карты OpenFreeMap — нет.
const CACHED_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

// ----- Установка: сохраняем файлы игры -----
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Каждый файл отдельно: если один не скачался, остальные всё равно
      // попадут в кэш (а недостающий докачается при первом запросе)
      return Promise.all(GAME_FILES.map(function (file) {
        return cache.add(file).catch(function () {});
      }));
    }).then(function () {
      return self.skipWaiting(); // новая версия начинает работать сразу
    })
  );
});

// ----- Включение: удаляем старые кэши -----
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        if (name !== CACHE_NAME) return caches.delete(name);
        return null;
      }));
    }).then(function () {
      return self.clients.claim(); // управляем уже открытой страницей
    })
  );
});

// ----- Запросы -----
self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return; // только чтение файлов
  const url = new URL(request.url);
  const ours = url.origin === self.location.origin;
  if (!ours && !CACHED_HOSTS.includes(url.hostname)) return; // карты и прочее — как обычно
  event.respondWith(networkFirst(request));
});

// Сначала сеть, потом кэш (подробно — в начале файла)
function networkFirst(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    // Запрос в сеть. Удачный ответ сразу кладём в кэш.
    const fromNetwork = fetch(request).then(function (response) {
      if (response.ok || response.type === 'opaque') {
        cache.put(request, response.clone());
      }
      return response;
    });

    // ignoreSearch: ссылка с хвостом «?…» (например, присланная
    // в мессенджере) находит в кэше тот же файл без хвоста
    return cache.match(request, { ignoreSearch: true }).then(function (cached) {
      if (!cached) {
        return fromNetwork; // в кэше нет — ждём сеть, сколько понадобится
      }
      // В кэше есть: ждём сеть не дольше NETWORK_TIMEOUT,
      // а если сеть упала — сразу отвечаем из кэша
      const timeout = new Promise(function (resolve) {
        setTimeout(function () { resolve(cached); }, NETWORK_TIMEOUT);
      });
      return Promise.race([
        fromNetwork.catch(function () { return cached; }),
        timeout
      ]);
    });
  });
}
