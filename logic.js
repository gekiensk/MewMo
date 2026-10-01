// =============================================================
// MewMo — «чистая» логика игры
// =============================================================
// Здесь только расчёты: никакой карты, никаких кнопок и HTML.
// Поэтому этот файл можно проверять автоматическими тестами в Node
// (см. папку tests/), а в браузере он подключается обычным <script>.
//
// Многие функции принимают параметр random — это функция, которая
// возвращает случайное число от 0 до 1 (как Math.random).
// В игре туда передаётся Math.random, а в тестах — «подставная»
// функция с заранее известными числами, чтобы проверять результат.

// =============================================================
// Расстояния и координаты
// =============================================================
// Помним: координаты в формате [долгота, широта].

// Сколько метров в одном градусе широты (примерно)
const METERS_PER_DEGREE = 111320;

// Расстояние между двумя точками в метрах.
// Это формула гаверсинусов: она учитывает, что Земля — шар.
function distanceMeters(a, b) {
  const earthRadius = 6371000; // радиус Земли в метрах
  const toRadians = Math.PI / 180;
  const lat1 = a[1] * toRadians;
  const lat2 = b[1] * toRadians;
  const deltaLat = (b[1] - a[1]) * toRadians;
  const deltaLng = (b[0] - a[0]) * toRadians;

  const h = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

// Точка, которая лежит в distance метрах от center в направлении angle
// (angle — угол в радианах: 0 — на восток, π/2 — на север).
function offsetPosition(center, distance, angle) {
  const lng = center[0];
  const lat = center[1];
  // В одном градусе долготы метров меньше, чем в градусе широты,
  // и чем ближе к полюсу, тем меньше. Это учитывает косинус широты.
  const metersPerDegreeLng = METERS_PER_DEGREE * Math.cos(lat * Math.PI / 180);
  return [
    lng + (distance * Math.cos(angle)) / metersPerDegreeLng,
    lat + (distance * Math.sin(angle)) / METERS_PER_DEGREE
  ];
}

// Случайное место для новой капсулы: от minDistance до maxDistance метров
// от игрока, в случайном направлении.
function randomCapsulePosition(center, minDistance, maxDistance, random) {
  const angle = random() * 2 * Math.PI;
  const distance = minDistance + random() * (maxDistance - minDistance);
  return offsetPosition(center, distance, angle);
}

// =============================================================
// Выбор кота по редкости
// =============================================================
// Шансы редкостей. В сумме — 1 (то есть 100%).
const RARITY_CHANCES = [
  { rarity: 'обычный', chance: 0.70 },
  { rarity: 'редкий', chance: 0.25 },
  { rarity: 'легендарный', chance: 0.05 }
];

// Выбирает редкость: бросаем «кубик» от 0 до 1 и смотрим,
// в какой отрезок он попал: [0; 0.70) — обычный,
// [0.70; 0.95) — редкий, [0.95; 1) — легендарный.
function pickRarity(random) {
  const roll = random();
  let sum = 0;
  for (let i = 0; i < RARITY_CHANCES.length; i++) {
    sum = sum + RARITY_CHANCES[i].chance;
    if (roll < sum) {
      return RARITY_CHANCES[i].rarity;
    }
  }
  // Сюда попадём только из-за крошечных ошибок округления
  return RARITY_CHANCES[RARITY_CHANCES.length - 1].rarity;
}

// Выбирает кота: сначала редкость, потом случайного кота этой редкости
function pickCat(cats, random) {
  const rarity = pickRarity(random);
  const sameRarity = cats.filter(function (cat) { return cat.rarity === rarity; });
  // Если котов такой редкости нет — берём из всех
  const choices = sameRarity.length > 0 ? sameRarity : cats;
  return choices[Math.floor(random() * choices.length)];
}

// Сколько звёздочек у редкости (1–3)
function rarityStars(rarity) {
  if (rarity === 'легендарный' || rarity === 'капитан') return 3;
  if (rarity === 'редкий') return 2;
  return 1;
}

// =============================================================
// «Лапка, Коготь, Клубок»
// =============================================================
const GESTURES = ['Лапка', 'Коготь', 'Клубок'];

// Кого бьёт каждый жест:
// Лапка прижимает Коготь, Коготь режет нитку Клубка, Клубок запутывает Лапку
const BEATS = {
  'Лапка': 'Коготь',
  'Коготь': 'Клубок',
  'Клубок': 'Лапка'
};

// Результат раунда с точки зрения игрока: 'победа', 'поражение' или 'ничья'
function roundResult(playerGesture, catGesture) {
  if (playerGesture === catGesture) return 'ничья';
  if (BEATS[playerGesture] === catGesture) return 'победа';
  return 'поражение';
}

// Кот выбирает жест: в половине случаев — любимый,
// иначе — случайный из трёх (случайный тоже может оказаться любимым,
// поэтому всего любимый выпадает примерно в 2/3 случаев).
function catChooseGesture(favoriteGesture, random) {
  if (random() < 0.5) {
    return favoriteGesture;
  }
  return GESTURES[Math.floor(random() * GESTURES.length)];
}

// =============================================================
// «Поймай сигнал»
// =============================================================
// Сложность зависит от редкости кота (у капитанов rarity = 'капитан'):
// zoneWidth — ширина зелёной зоны (доля шкалы от 0 до 1),
// speed — сколько «шкал» огонёк пробегает за секунду.
function signalSettings(rarity, reducedMotion) {
  let settings;
  if (rarity === 'капитан') {
    // у капитанов зона ещё уже, чем у легендарных
    settings = { zoneWidth: 0.08, speed: 1.6 };
  } else if (rarity === 'легендарный') {
    settings = { zoneWidth: 0.12, speed: 1.6 };
  } else if (rarity === 'редкий') {
    settings = { zoneWidth: 0.2, speed: 1.2 };
  } else {
    settings = { zoneWidth: 0.3, speed: 0.8 };
  }
  // «Уменьшить движение»: огонёк бежит вдвое медленнее
  if (reducedMotion) {
    settings.speed = settings.speed / 2;
  }
  return settings;
}

// Где огонёк через seconds секунд: число от 0 (левый край) до 1 (правый).
// Огонёк бежит туда-обратно: 0 → 1 → 0 → 1 …
function signalPosition(seconds, speed) {
  const path = (seconds * speed) % 2; // пройденный путь, от 0 до 2
  return path <= 1 ? path : 2 - path; // вторая половина — обратно
}

// Попал ли огонёк в зелёную зону. Края зоны тоже считаются попаданием.
function isInGreenZone(position, zoneStart, zoneWidth) {
  // Компьютер считает дроби чуть-чуть неточно: например, 0.7 + 0.1
  // у него получается 0.7999999999999999. Поэтому добавляем к краям
  // крошечный запас EDGE, чтобы попадание ровно в край засчитывалось.
  const EDGE = 0.000001;
  return position >= zoneStart - EDGE && position <= zoneStart + zoneWidth + EDGE;
}

// =============================================================
// Ошибки GPS
// =============================================================
// Что делать, когда GPS прислал ошибку. Возвращает:
//   'демо'          — нет разрешения: включить демо-режим и показать,
//                     как разрешить геолокацию;
//   'слабый сигнал' — GPS уже работал: игрок остаётся на последнем месте,
//                     пишем «Слабый сигнал GPS…»;
//   'ищем'          — координат ещё не было: пишем «Ищем спутники…»
//                     и продолжаем искать (демо-режим включит «таймер»
//                     gpsSearchState, если за 45 секунд ничего не придёт).
// gpsWorked        — приходило ли уже хоть одно местоположение от GPS;
// permissionDenied — игрок не разрешил геолокацию.
function gpsErrorAction(gpsWorked, permissionDenied) {
  // Нет разрешения — без демо-режима играть не получится
  if (permissionDenied) return 'демо';
  // GPS уже работал, а сейчас сигнал пропал (например, игрок зашёл
  // под крышу или в арку) — это временно, ждём, пока сигнал вернётся
  if (gpsWorked) return 'слабый сигнал';
  // Координат ещё не было: телефону нужно время, чтобы найти спутники
  return 'ищем';
}

const GPS_WATCHDOG_TIME = 30 * 1000; // «сторож»: нет координат 30 с — перезапуск слежения
const GPS_DEMO_WAIT = 45 * 1000;     // демо-режим, если за 45 с не пришло ни одних координат

// «Сторож»: пора ли перезапустить слежение за GPS.
// info: { walking, visible, permissionDenied, lastFixAt, lastStartAt, now } — время в мс.
// Если геолокацию запретили — не перезапускаем: браузер всё равно откажет,
// а игрок увидит окно с инструкцией и кнопкой «Попробовать снова».
// Считаем от самого позднего: последней координаты или последнего запуска
// слежения, — чтобы после перезапуска снова подождать 30 секунд.
function shouldRestartGps(info) {
  if (!info.walking || !info.visible) return false; // дома и в фоне не трогаем
  if (info.permissionDenied) return false;
  const lastEvent = Math.max(info.lastFixAt || 0, info.lastStartAt || 0);
  return info.now - lastEvent >= GPS_WATCHDOG_TIME;
}

// Состояние поиска координат. info: { permissionDenied, hasFix,
// searchStartedAt, now }. Возвращает:
//   'нет разрешения' — геолокацию запретили;
//   'работает'       — координаты уже приходили;
//   'демо'           — ищем дольше 45 секунд и ничего — пора в демо-режим;
//   'ищем'           — ещё ищем.
function gpsSearchState(info) {
  if (info.permissionDenied) return 'нет разрешения';
  if (info.hasFix) return 'работает';
  if (info.now - info.searchStartedAt >= GPS_DEMO_WAIT) return 'демо';
  return 'ищем';
}

// =============================================================
// Сохранение прогресса
// =============================================================
// Прогресс хранится в памяти браузера (localStorage) в виде текста JSON.
// ВАЖНО: координаты игрока сюда НИКОГДА не записываются.
//
// Как выглядит сохранение:
// {
//   crew: { bul: 2, moh: 1 },   // кто в экипаже и сколько раз встречен
//   captains: { … },            // капитаны в экипаже (так же: id → встречи)
//   fish: 12,                   // космические рыбки
//   parts: 3,                   // детали корабля
//   beaconCooldowns: { … },     // маяки на перезарядке: id → до какого времени (мс)
//   nextCaptainAt: 0,           // раньше этого времени (мс) новый капитан не появится
//   settings: { … },            // настройки (см. DEFAULT_SETTINGS)
//   playTime: { day, seconds, bonusMinutes }, // сколько сыграно сегодня
//   guests: { list: ['bul'], nextAt: 0 },     // гости в убежище и когда прилетит следующий
//   friendship: { bul: 7 },                   // сколько раз угостили каждого кота
//   quests: { day, list: [{ id, progress, done }] }, // задания на сегодня
//   chapter: 1,               // текущая глава
//   chaptersDone: [],         // пройденные главы
//   badges: ['rescuer-1'],    // значки игрока
//   flewHome: ['bul'],        // коты, улетевшие домой на первом корабле
//   latecomers: ['moh'],      // «отставшие» коты главы 1, найденные в главе 2
//   tutorialSeen: true,       // обучение «Как играть» уже показано
//   tipEncounters: 2          // в скольких встречах уже были подсказки
// }
//
// Старые сохранения (без новых полей) продолжают работать: cleanSave
// заполняет недостающие поля значениями по умолчанию.

const SAVE_KEY = 'mewmo-save-v1'; // под этим именем лежит сохранение
const SHIP_PARTS_NEEDED = 20;      // сколько деталей нужно для ремонта корабля
const NEW_CAT_PARTS = 1;           // награда за нового кота — деталь корабля
const REPEAT_CAT_FISH = 3;         // награда за повторную встречу — рыбки

// Настройки по умолчанию
const DEFAULT_SETTINGS = {
  soundLevel: 'обычно', // громкость: 'выкл', 'тихо' или 'обычно'
  vibration: true,   // вибрация включена
  dailyLimit: 0,     // ограничение времени в день, минут (0 — выключено)
  homeOnly: false    // «Только режим „Дом“» (прогулка недоступна)
};
const DAILY_LIMIT_CHOICES = [0, 30, 60, 90]; // варианты ограничения (минуты)
const SOUND_LEVELS = ['выкл', 'тихо', 'обычно'];   // варианты громкости

// Пустое сохранение: игра с нуля
function emptySave() {
  return {
    crew: {}, captains: {}, fish: 0, parts: 0, beaconCooldowns: {}, nextCaptainAt: 0,
    settings: Object.assign({}, DEFAULT_SETTINGS),
    playTime: { day: '', seconds: 0, bonusMinutes: 0 },
    guests: { list: [], nextAt: 0 },
    friendship: {},
    quests: { day: '', list: [] },
    chapter: 1,
    chaptersDone: [],
    badges: [],
    flewHome: [],
    latecomers: [],
    tutorialSeen: false,
    tipEncounters: 0,
    captainDay: '',                    // в какой день приходил последний капитан
    walkToday: { day: '', meters: 0 }  // сколько метров пройдено сегодня (только число!)
  };
}

// Список строк без повторов (для id котов и значков). Всё, что не строка, выбрасываем.
function cleanStringList(data) {
  if (!Array.isArray(data)) return [];
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (typeof data[i] === 'string' && !result.includes(data[i])) result.push(data[i]);
  }
  return result;
}

// Проверяет настройки: всё непонятное — как по умолчанию
function cleanSettings(data) {
  const settings = Object.assign({}, DEFAULT_SETTINGS);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return settings;
  // Звук. Раньше было «вкл/выкл» (поле sound): старое «выкл» → 'выкл',
  // старое «вкл» → 'обычно'.
  if (SOUND_LEVELS.includes(data.soundLevel)) {
    settings.soundLevel = data.soundLevel;
  } else if (data.sound === false) {
    settings.soundLevel = 'выкл';
  }
  if (typeof data.vibration === 'boolean') settings.vibration = data.vibration;
  if (DAILY_LIMIT_CHOICES.includes(data.dailyLimit)) settings.dailyLimit = data.dailyLimit;
  if (typeof data.homeOnly === 'boolean') settings.homeOnly = data.homeOnly;
  return settings;
}

// Проверяет счётчик времени игры
function cleanPlayTime(data) {
  const playTime = { day: '', seconds: 0, bonusMinutes: 0 };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return playTime;
  if (typeof data.day === 'string') playTime.day = data.day;
  if (isCount(data.seconds)) playTime.seconds = data.seconds;
  if (isCount(data.bonusMinutes)) playTime.bonusMinutes = data.bonusMinutes;
  return playTime;
}

// Целое число 0 или больше? (для проверки испорченных данных)
function isCount(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

// Проверяет «словарь» вида { id: число } и оставляет только правильные
// записи. Числа должны быть не меньше minValue.
function cleanCounts(data, minValue) {
  const result = {};
  // Должен быть обычный объект, а не массив, не null и не строка
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return result;
  }
  const keys = Object.keys(data);
  for (let i = 0; i < keys.length; i++) {
    const value = data[keys[i]];
    if (isCount(value) && value >= minValue) {
      result[keys[i]] = value;
    }
  }
  return result;
}

// Приводит прочитанные данные в порядок. Всё испорченное заменяется
// на значения «с нуля», чтобы игра не сломалась.
function cleanSave(data) {
  const save = emptySave();
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return save;
  }
  save.crew = cleanCounts(data.crew, 1);
  save.captains = cleanCounts(data.captains, 1);
  save.fish = isCount(data.fish) ? data.fish : 0;
  save.parts = isCount(data.parts) ? data.parts : 0;
  save.beaconCooldowns = cleanCounts(data.beaconCooldowns, 0);
  save.nextCaptainAt = isCount(data.nextCaptainAt) ? data.nextCaptainAt : 0;
  save.settings = cleanSettings(data.settings);
  save.playTime = cleanPlayTime(data.playTime);
  save.guests = cleanGuests(data.guests);
  save.friendship = cleanCounts(data.friendship, 0);
  save.quests = cleanQuests(data.quests);
  // Главы. Старое сохранение без номера главы — это глава 1.
  save.chapter = (Number.isInteger(data.chapter) && data.chapter >= 1 && data.chapter <= LAST_CHAPTER) ? data.chapter : 1;
  save.chaptersDone = Array.isArray(data.chaptersDone)
    ? data.chaptersDone.filter(function (n, i, list) {
      return Number.isInteger(n) && n >= 1 && n <= LAST_CHAPTER && list.indexOf(n) === i;
    })
    : [];
  save.badges = cleanStringList(data.badges);
  save.flewHome = cleanStringList(data.flewHome);
  save.latecomers = cleanStringList(data.latecomers);
  // Обучение. Если в старом сохранении этих полей нет, но игрок уже
  // играл (есть коты, рыбки или детали) — обучение и подсказки ему
  // не нужны: он и так умеет играть.
  const alreadyPlayed = Object.keys(save.crew).length > 0 || save.fish > 0 || save.parts > 0;
  save.tutorialSeen = typeof data.tutorialSeen === 'boolean' ? data.tutorialSeen : alreadyPlayed;
  save.tipEncounters = isCount(data.tipEncounters) ? data.tipEncounters
    : (alreadyPlayed ? TIP_ENCOUNTERS : 0);
  save.captainDay = typeof data.captainDay === 'string' ? data.captainDay : '';
  const walk = data.walkToday;
  save.walkToday = (walk && typeof walk.day === 'string' && isCount(walk.meters))
    ? { day: walk.day, meters: walk.meters } : { day: '', meters: 0 };
  return save;
}

// Прочитать сохранение. storage — хранилище (в игре это localStorage,
// в тестах — подставной объект с методами getItem и setItem).
// Если сохранения нет или оно испорчено — начинаем с нуля.
function loadSave(storage) {
  try {
    const text = storage.getItem(SAVE_KEY);
    if (!text) return emptySave();
    return cleanSave(JSON.parse(text));
  } catch (error) {
    // Сюда попадём, если хранилища нет, оно запрещено
    // или внутри не JSON, а «каша»
    return emptySave();
  }
}

// Записать сохранение. Возвращает true, если получилось.
function writeSave(storage, save) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch (error) {
    // Память браузера переполнена или запрещена — играем без сохранения
    return false;
  }
}

// Копия сохранения, чтобы не менять исходный объект
// (так функции проще проверять тестами)
function copySave(save) {
  return JSON.parse(JSON.stringify(save));
}

// Есть ли кот в экипаже
function isInCrew(save, catId) {
  return (save.crew[catId] || 0) > 0;
}

// Сколько котов из каталога cats уже в экипаже
function crewCount(save, cats) {
  let count = 0;
  for (let i = 0; i < cats.length; i++) {
    if (isInCrew(save, cats[i].id)) count = count + 1;
  }
  return count;
}

// Игрок победил кота. Возвращает { save, reward }:
//   save   — новое сохранение;
//   reward — { isNew, parts, fish }: что игрок получил.
// Новый кот вступает в экипаж и приносит деталь корабля.
// Знакомый кот просто рад встрече и дарит рыбок (второй раз в экипаж
// он не добавляется, только растёт счётчик встреч).
// cat (необязательно) — сам кот из каталога: если это новый кот из
// прошлой главы («отставший»), он запоминается в списке latecomers.
function applyCatWin(save, catId, cat) {
  const result = copySave(save);
  const isNew = !isInCrew(save, catId);
  const reward = { isNew: isNew, parts: 0, fish: 0 };
  if (isNew && cat && catChapter(cat) < save.chapter && !result.latecomers.includes(catId)) {
    result.latecomers.push(catId);
  }

  result.crew[catId] = (result.crew[catId] || 0) + 1;
  if (isNew) {
    reward.parts = NEW_CAT_PARTS;
  } else {
    reward.fish = REPEAT_CAT_FISH;
  }
  result.parts = result.parts + reward.parts;
  result.fish = result.fish + reward.fish;
  return { save: result, reward: reward };
}

// Слово после числа по-русски: 1 деталь, 2 детали, 5 деталей,
// 11 деталей, 21 деталь, 22 детали …
function pluralRu(n, one, few, many) {
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

// Какая доля ремонта корабля готова: число от 0 до 1.
// chapter — глава (у каждой главы свой корабль и своё число деталей).
function shipRepairShare(parts, chapter) {
  const needed = partsNeeded(chapter || 1);
  return Math.min(parts, needed) / needed;
}

// =============================================================
// Главы
// =============================================================
// Глава 1 — маленький корабль (20 деталей). Когда он починен, экипаж
// улетает домой, и начинается глава 2 — большой корабль (30 деталей).
const LAST_CHAPTER = 2;                  // сколько глав уже есть в игре
const CHAPTER_PARTS = { 1: 20, 2: 30 };  // сколько деталей нужно в каждой главе
const LAUNCHABLE_CHAPTERS = [1];         // у каких глав уже есть финал со взлётом

// Сколько деталей нужно для ремонта корабля главы chapter
function partsNeeded(chapter) {
  return CHAPTER_PARTS[chapter] || SHIP_PARTS_NEEDED;
}

// Глава кота (у старых записей без поля chapter — глава 1)
function catChapter(cat) {
  return cat.chapter || 1;
}

// Коты главы chapter. Если котов этой главы ещё нет в каталоге —
// коты главы 1 (чтобы игра не осталась без котов).
function chapterCats(cats, chapter) {
  const result = cats.filter(function (cat) { return catChapter(cat) === chapter; });
  if (result.length > 0) return result;
  return cats.filter(function (cat) { return catChapter(cat) === 1; });
}

// Можно ли запустить корабль: деталей хватает, и у главы есть финал
function canLaunchShip(save) {
  return LAUNCHABLE_CHAPTERS.includes(save.chapter) && save.parts >= partsNeeded(save.chapter);
}

// Запуск корабля: экипаж главы улетает домой, игрок получает значок
// «Спасатель N ранга», начинается следующая глава.
// allCats — все коты и капитаны (чтобы узнать, кто из этой главы).
// Лишние детали (сверх нужных) переходят в новую главу.
function launchShip(save, allCats) {
  if (!canLaunchShip(save)) return save;
  const result = copySave(save);
  const chapter = save.chapter;
  for (let i = 0; i < allCats.length; i++) {
    const cat = allCats[i];
    const inCrew = (save.crew[cat.id] || 0) > 0 || (save.captains[cat.id] || 0) > 0;
    if (inCrew && catChapter(cat) === chapter && !result.flewHome.includes(cat.id)) {
      result.flewHome.push(cat.id);
    }
  }
  if (!result.chaptersDone.includes(chapter)) result.chaptersDone.push(chapter);
  const badge = 'rescuer-' + chapter;
  if (!result.badges.includes(badge)) result.badges.push(badge);
  result.parts = save.parts - partsNeeded(chapter);
  result.chapter = chapter + 1;
  return result;
}

const LATECOMER_CHANCE = 0.1; // «отставшие» коты прошлой главы — примерно в 10% капсул

// Отставшие: коты прошлых глав, которых игрок так и не нашёл.
// twilight — сейчас сумерки (иначе сумеречных не берём).
function latecomerCats(cats, save, twilight) {
  return cats.filter(function (cat) {
    return catChapter(cat) < save.chapter &&
      !isInCrew(save, cat.id) &&
      (twilight || cat.type !== 'сумеречный');
  });
}

// Выбор кота для капсулы (и для гостя) с учётом главы.
// allCats — весь каталог котов (без капитанов), save — сохранение,
// options — { terrain, twilight }, как у pickCatForPlace.
// В главе 1 — коты главы 1. В главе 2 — коты главы 2, а примерно в 10%
// случаев — отставший кот главы 1 (пока такие есть).
function pickCatForChapter(allCats, save, options, random) {
  const chapter = save.chapter || 1;
  if (chapter > 1) {
    const late = latecomerCats(allCats, save, options && options.twilight);
    if (late.length > 0 && random() < LATECOMER_CHANCE) {
      return pickCat(late, random); // по редкости, как обычно
    }
  }
  return pickCatForPlace(chapterCats(allCats, chapter), options, random);
}

// Коты на полу убежища: экипаж текущей главы, найденные отставшие
// и капитаны текущей главы. Если их больше, чем мест (max), — самые
// дружные (по числу угощений), при равенстве — те, кого чаще встречали.
// allCats — коты и капитаны.
function shelterCats(allCats, save, max) {
  const chapter = save.chapter || 1;
  const list = allCats.filter(function (cat) {
    const met = (save.crew[cat.id] || 0) + (save.captains[cat.id] || 0);
    if (met === 0) return false;
    return catChapter(cat) === chapter || save.latecomers.includes(cat.id);
  });
  // Сортировка: сначала дружба, потом число встреч, потом порядок каталога
  const order = list.map(function (cat, index) { return { cat: cat, index: index }; });
  order.sort(function (a, b) {
    const friendA = save.friendship[a.cat.id] || 0;
    const friendB = save.friendship[b.cat.id] || 0;
    if (friendA !== friendB) return friendB - friendA;
    const metA = (save.crew[a.cat.id] || 0) + (save.captains[a.cat.id] || 0);
    const metB = (save.crew[b.cat.id] || 0) + (save.captains[b.cat.id] || 0);
    if (metA !== metB) return metB - metA;
    return a.index - b.index;
  });
  return {
    shown: order.slice(0, max).map(function (item) { return item.cat; }),
    hidden: Math.max(0, order.length - max)
  };
}

// Кот «на связи по рации»: улетел домой на первом корабле, но может
// помочь советом в бою с капитаном
function isOnRadio(save, catId) {
  return save.flewHome.includes(catId);
}

// =============================================================
// Обучение «Как играть»
// =============================================================
const TIP_ENCOUNTERS = 2; // подсказки в мини-играх — только в первые 2 встречи

// Показывать ли обучение при запуске игры
function shouldShowTutorial(save) {
  return !save.tutorialSeen;
}

// Нужны ли подсказки в этой встрече (первые 2 встречи)
function needsEncounterTips(save) {
  return save.tipEncounters < TIP_ENCOUNTERS;
}

// Название значка: 'rescuer-1' → «Спасатель 1 ранга»
function badgeName(badge) {
  const parts = badge.split('-');
  if (parts[0] === 'rescuer') return 'Спасатель ' + parts[1] + ' ранга';
  return badge;
}

// =============================================================
// Маяки у реальных мест
// =============================================================
// Маяки ставятся у интересных мест из данных карты: слой 'poi' источника
// OpenMapTiles. У каждого места там есть class (общий вид, например
// 'art_gallery') и subclass (точнее, например 'artwork').

// Разрешённые места: subclass (или class) → как назвать место в игре
const BEACON_PLACES = {
  playground: 'Детская площадка',
  park: 'Парк',
  garden: 'Сад',
  fountain: 'Фонтан',
  library: 'Библиотека',
  museum: 'Музей',
  artwork: 'Арт-объект',
  sculpture: 'Скульптура'
};

// Запрещённые места: если class ИЛИ subclass в этом списке, маяка не будет.
// Запрет сильнее разрешения. Здесь кладбища, мемориалы, места поклонения,
// больницы, школы и детские сады, дороги, парковки, стройки и железная дорога.
const BEACON_FORBIDDEN = [
  'cemetery', 'grave_yard',
  'memorial', 'monument', 'wayside_cross', 'wayside_shrine',
  'place_of_worship', 'religion', 'church', 'mosque', 'synagogue', 'temple', 'shrine',
  'hospital', 'clinic', 'doctors', 'dentist', 'nursing_home',
  'school', 'kindergarten', 'childcare', 'college', 'university',
  'road', 'highway', 'motorway', 'bus', 'bus_stop', 'bus_station',
  'parking', 'bicycle_parking', 'motorcycle_parking', 'parking_entrance', 'fuel',
  'construction',
  'railway', 'rail', 'station', 'halt', 'tram_stop', 'subway', 'level_crossing'
];

const BEACON_RADIUS = 300;           // маяки ищем не дальше 300 м от игрока
const BEACON_MAX_COUNT = 6;          // показываем не больше 6 маяков
const BEACON_MIN_GAP = 40;           // между маяками не меньше 40 м
const VIRTUAL_BEACON_COUNT = 3;      // сколько «виртуальных» маяков, если реальных нет
const BEACON_COOLDOWN = 15 * 60 * 1000; // перезарядка маяка: 15 минут (в мс)
const BEACON_PART_CHANCE = 0.3;      // шанс получить деталь корабля у маяка

// Годится ли место для маяка. properties — свойства места из данных карты.
function isBeaconPlace(properties) {
  if (!properties) return false;
  const placeClass = properties.class || '';
  const subclass = properties.subclass || '';
  // Сначала запреты
  if (BEACON_FORBIDDEN.includes(placeClass) || BEACON_FORBIDDEN.includes(subclass)) {
    return false;
  }
  return beaconKind(properties) !== '';
}

// Вид места для маяка ('park', 'library' …) или '' если не подходит.
// Сначала смотрим на subclass (он точнее), потом на class.
// Пример: книжный магазин в данных — class 'library', subclass 'books'.
// subclass 'books' не разрешён, поэтому магазин маяком не станет.
function beaconKind(properties) {
  const subclass = properties.subclass || '';
  if (subclass !== '') {
    return BEACON_PLACES[subclass] ? subclass : '';
  }
  const placeClass = properties.class || '';
  return BEACON_PLACES[placeClass] ? placeClass : '';
}

// Выбирает маяки из списка мест-кандидатов.
// candidates — [{ id, position, kind, name }], center — где игрок.
// Берём места не дальше BEACON_RADIUS, начиная с ближайших, и пропускаем
// те, что ближе BEACON_MIN_GAP к уже выбранным (так убираются дубликаты
// одного места — в данных карты одно место иногда встречается дважды).
function selectBeacons(candidates, center) {
  // Добавляем каждому кандидату расстояние до игрока
  const near = [];
  for (let i = 0; i < candidates.length; i++) {
    const distance = distanceMeters(center, candidates[i].position);
    if (distance <= BEACON_RADIUS) {
      near.push({ place: candidates[i], distance: distance });
    }
  }
  // Сортируем: ближние — первыми
  near.sort(function (a, b) { return a.distance - b.distance; });

  const chosen = [];
  for (let i = 0; i < near.length && chosen.length < BEACON_MAX_COUNT; i++) {
    const place = near[i].place;
    let tooClose = false;
    for (let j = 0; j < chosen.length; j++) {
      if (chosen[j].id === place.id ||
          distanceMeters(chosen[j].position, place.position) < BEACON_MIN_GAP) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) chosen.push(place);
  }
  return chosen;
}

// Маяки из списка, которые не дальше radius метров от игрока
function beaconsNear(beacons, center, radius) {
  return beacons.filter(function (beacon) {
    return distanceMeters(center, beacon.position) <= radius;
  });
}

// «Виртуальные» маяки — если в данных карты подходящих мест нет.
// Ставим их вокруг игрока на 60–120 м, примерно через треть круга
// друг от друга — так между ними точно больше BEACON_MIN_GAP.
// idPrefix — начало id (например, время создания), чтобы id не повторялись.
function makeVirtualBeacons(center, random, idPrefix) {
  const beacons = [];
  const startAngle = random() * 2 * Math.PI;
  for (let i = 0; i < VIRTUAL_BEACON_COUNT; i++) {
    // ровно по кругу + небольшое случайное отклонение (до ±20°)
    const wobble = (random() - 0.5) * (40 * Math.PI / 180);
    const angle = startAngle + i * (2 * Math.PI / VIRTUAL_BEACON_COUNT) + wobble;
    const distance = 60 + random() * 60;
    beacons.push({
      id: 'virtual-' + idPrefix + '-' + i,
      position: offsetPosition(center, distance, angle),
      kind: 'virtual',
      name: ''
    });
  }
  return beacons;
}

// Как назвать маяк для игрока
function beaconTitle(beacon) {
  if (beacon.name) return beacon.name;
  if (beacon.kind === 'virtual') return 'Космический маяк';
  return BEACON_PLACES[beacon.kind] || 'Маяк';
}

// Награда маяка: 2–4 рыбки и с шансом 30% деталь корабля
function beaconReward(random) {
  const fish = 2 + Math.floor(random() * 3); // 2, 3 или 4
  const parts = random() < BEACON_PART_CHANCE ? 1 : 0;
  return { fish: fish, parts: parts };
}

// Сколько миллисекунд осталось до конца перезарядки (0 — маяк готов).
// cooldowns — словарь «id маяка → до какого времени перезаряжается».
function beaconCooldownLeft(cooldowns, beaconId, now) {
  const readyAt = cooldowns[beaconId] || 0;
  return Math.max(0, readyAt - now);
}

// Запускает перезарядку маяка. Возвращает НОВЫЙ словарь, в котором
// заодно выброшены маяки, чья перезарядка уже закончилась
// (чтобы сохранение не росло бесконечно).
function startBeaconCooldown(cooldowns, beaconId, now) {
  const result = {};
  const ids = Object.keys(cooldowns);
  for (let i = 0; i < ids.length; i++) {
    if (cooldowns[ids[i]] > now) {
      result[ids[i]] = cooldowns[ids[i]];
    }
  }
  result[beaconId] = now + BEACON_COOLDOWN;
  return result;
}

// Игрок забрал награду маяка: возвращает новое сохранение
function applyBeaconReward(save, beaconId, reward, now) {
  const result = copySave(save);
  result.fish = result.fish + reward.fish;
  result.parts = result.parts + reward.parts;
  result.beaconCooldowns = startBeaconCooldown(result.beaconCooldowns, beaconId, now);
  return result;
}

// Время «минуты:секунды», например 4:05
function formatTimeLeft(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

// =============================================================
// Время заката (формула NOAA)
// =============================================================
// Считаем закат прямо в браузере по дате и координатам — без интернета
// и без сторонних сервисов, координаты никуда не уходят.
// Формулы — из «солнечного калькулятора» NOAA (Национальное управление
// океанических и атмосферных исследований США). Точность — около минуты.

const DAY_MS = 24 * 60 * 60 * 1000;   // миллисекунд в сутках
const TWILIGHT_TIME = 60 * 60 * 1000; // «сумерки» в игре — последний час до заката
const TWILIGHT_CHANCE = 0.3;          // в сумерки ~30% капсул — с сумеречными котами

function degToRad(deg) { return deg * Math.PI / 180; }
function radToDeg(rad) { return rad * 180 / Math.PI; }

// Положение Солнца в момент ms (миллисекунды, как Date.now()).
// Возвращает склонение Солнца (в градусах) и «уравнение времени»
// (в минутах — насколько солнечные часы спешат или отстают).
function sunPosition(ms) {
  const julianDay = ms / DAY_MS + 2440587.5;          // юлианский день
  const t = (julianDay - 2451545) / 36525;            // юлианские века от 2000 года

  // Средняя долгота и средняя аномалия Солнца (градусы)
  const meanLong = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const meanAnomaly = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  // Эксцентриситет орбиты Земли
  const eccent = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

  // Уравнение центра и истинная долгота Солнца
  const m = degToRad(meanAnomaly);
  const center = Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m) * 0.000289;
  const trueLong = meanLong + center;

  // Видимая долгота (поправка на нутацию)
  const omega = degToRad(125.04 - 1934.136 * t);
  const apparentLong = trueLong - 0.00569 - 0.00478 * Math.sin(omega);

  // Наклон земной оси
  const meanObliq = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliq = meanObliq + 0.00256 * Math.cos(omega);

  // Склонение Солнца
  const declination = radToDeg(Math.asin(Math.sin(degToRad(obliq)) * Math.sin(degToRad(apparentLong))));

  // Уравнение времени (минуты)
  const y = Math.pow(Math.tan(degToRad(obliq) / 2), 2);
  const l0 = degToRad(meanLong);
  const eqTime = 4 * radToDeg(
    y * Math.sin(2 * l0) -
    2 * eccent * Math.sin(m) +
    4 * eccent * y * Math.sin(m) * Math.cos(2 * l0) -
    0.5 * y * y * Math.sin(4 * l0) -
    1.25 * eccent * eccent * Math.sin(2 * m)
  );

  return { declination: declination, eqTime: eqTime };
}

// Время заката (в мс, как Date.now()) для суток dayMs (любой момент
// этих суток по UTC) в точке [lng, lat] (долгота, широта).
// Если в этот день Солнце не заходит (полярный день) или не встаёт
// (полярная ночь) — возвращает null.
function sunsetTime(dayMs, lng, lat) {
  const dayStart = Math.floor(dayMs / DAY_MS) * DAY_MS; // полночь по UTC
  // Сначала считаем для полудня, потом уточняем для найденного заката
  let sunsetMinutes = 720;
  for (let step = 0; step < 2; step++) {
    const sun = sunPosition(dayStart + sunsetMinutes * 60000);
    // Часовой угол заката: 90.833° — это центр Солнца на 0.833° ниже
    // горизонта (учтены преломление воздуха и размер диска Солнца)
    const cosHourAngle =
      Math.cos(degToRad(90.833)) / (Math.cos(degToRad(lat)) * Math.cos(degToRad(sun.declination))) -
      Math.tan(degToRad(lat)) * Math.tan(degToRad(sun.declination));
    if (cosHourAngle < -1 || cosHourAngle > 1) return null; // полярный день или ночь
    const hourAngle = radToDeg(Math.acos(cosHourAngle));
    // Солнечный полдень по UTC (в минутах от полуночи) + половина светового дня
    sunsetMinutes = 720 - 4 * lng - sun.eqTime + 4 * hourAngle;
  }
  return dayStart + Math.round(sunsetMinutes * 60000);
}

// Идёт ли сейчас «последний час до заката» в точке [lng, lat].
// Смотрим закаты вчера, сегодня и завтра по UTC: в разных часовых поясах
// местный вечер может приходиться на другие сутки по UTC.
function isTwilightTime(now, lng, lat) {
  for (let offset = -1; offset <= 1; offset++) {
    const sunset = sunsetTime(now + offset * DAY_MS, lng, lat);
    if (sunset !== null && now >= sunset - TWILIGHT_TIME && now < sunset) {
      return true;
    }
  }
  return false;
}

// =============================================================
// Что рядом на карте: вода, зелень или город
// =============================================================
// Данные карты приходят в формате GeoJSON: у каждой фигуры есть
// geometry.type ('Point', 'LineString', 'Polygon' и «мульти»-версии)
// и geometry.coordinates — точки [долгота, широта].

const TERRAIN_RADIUS = 100;     // смотрим, что есть в 100 м от капсулы
const PLACE_TYPE_CHANCE = 0.6;  // «чаще» = 60% кот подходящего к месту типа

// Какой тип кота «живёт» в каждой местности
const TERRAIN_CAT_TYPE = {
  'вода': 'водный',
  'зелень': 'лесной',
  'город': 'городской'
};

// Что это за фигура на карте: 'вода', 'зелень' или '' (не важно для нас).
// sourceLayer — слой данных OpenMapTiles, properties — свойства фигуры.
function terrainKind(sourceLayer, properties) {
  const placeClass = (properties && properties.class) || '';
  if (sourceLayer === 'water') {
    // бассейн — это не пруд
    return placeClass === 'swimming_pool' ? '' : 'вода';
  }
  if (sourceLayer === 'waterway') {
    // реки, ручьи и каналы (канавы не считаем)
    return ['river', 'stream', 'canal'].includes(placeClass) ? 'вода' : '';
  }
  if (sourceLayer === 'landcover') {
    // лес, трава (в том числе газоны парков) и поля
    return ['wood', 'grass', 'farmland'].includes(placeClass) ? 'зелень' : '';
  }
  if (sourceLayer === 'park') {
    return 'зелень'; // национальные парки и заповедники
  }
  return '';
}

// Переводит точку [долгота, широта] в метры относительно origin
// (x — на восток, y — на север). На расстояниях в сотни метров
// Землю можно считать плоской — ошибка крошечная.
function toLocalMeters(point, origin) {
  const metersPerDegreeLng = METERS_PER_DEGREE * Math.cos(origin[1] * Math.PI / 180);
  return {
    x: (point[0] - origin[0]) * metersPerDegreeLng,
    y: (point[1] - origin[1]) * METERS_PER_DEGREE
  };
}

// Расстояние (в метрах) от начала координат до отрезка a–b.
// Точка игрока — это (0, 0), а a и b уже в метрах.
function distanceToSegment(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  // t — где на отрезке ближайшая к (0, 0) точка: 0 — в a, 1 — в b
  let t = 0;
  if (lengthSquared > 0) {
    t = -(a.x * dx + a.y * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
  }
  const x = a.x + t * dx;
  const y = a.y + t * dy;
  return Math.sqrt(x * x + y * y);
}

// Лежит ли (0, 0) внутри кольца (замкнутой ломаной) — «метод луча»:
// пускаем луч вправо и считаем, сколько раз он пересёк границу.
// Нечётное число — точка внутри.
function isInsideRing(ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i = i + 1) {
    const a = ring[i];
    const b = ring[j];
    const crosses = (a.y > 0) !== (b.y > 0) &&
      0 < (b.x - a.x) * (0 - a.y) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

// Самое маленькое расстояние от (0, 0) до ломаной (цепочки отрезков)
function distanceToLine(points) {
  if (points.length === 1) {
    return Math.sqrt(points[0].x * points[0].x + points[0].y * points[0].y);
  }
  let best = Infinity;
  for (let i = 0; i + 1 < points.length; i++) {
    best = Math.min(best, distanceToSegment(points[i], points[i + 1]));
  }
  return best;
}

// Расстояние от многоугольника: 0, если точка внутри (и не в «дырке»),
// иначе — до ближайшей границы. rings[0] — внешняя граница, остальные — дырки.
function distanceToPolygon(rings) {
  if (rings.length === 0) return Infinity;
  let inside = isInsideRing(rings[0]);
  for (let i = 1; i < rings.length; i++) {
    if (isInsideRing(rings[i])) inside = false; // точка в «дырке»
  }
  if (inside) return 0;
  let best = Infinity;
  for (let i = 0; i < rings.length; i++) {
    best = Math.min(best, distanceToLine(rings[i]));
  }
  return best;
}

// Расстояние в метрах от точки до фигуры GeoJSON любого вида.
// Если фигура непонятная — Infinity («очень далеко»).
function distanceToGeometry(point, geometry) {
  if (!geometry || !geometry.coordinates) return Infinity;
  // Переводим список точек в метры относительно point
  function toMeters(list) {
    return list.map(function (p) { return toLocalMeters(p, point); });
  }
  const c = geometry.coordinates;
  let best = Infinity;
  if (geometry.type === 'Point') {
    return distanceToLine(toMeters([c]));
  } else if (geometry.type === 'MultiPoint' || geometry.type === 'LineString') {
    return c.length > 0 ? distanceToLine(toMeters(c)) : Infinity;
  } else if (geometry.type === 'MultiLineString') {
    for (let i = 0; i < c.length; i++) {
      if (c[i].length > 0) best = Math.min(best, distanceToLine(toMeters(c[i])));
    }
  } else if (geometry.type === 'Polygon') {
    return distanceToPolygon(c.map(toMeters));
  } else if (geometry.type === 'MultiPolygon') {
    for (let i = 0; i < c.length; i++) {
      best = Math.min(best, distanceToPolygon(c[i].map(toMeters)));
    }
  }
  return best;
}

// Что рядом с точкой: 'вода', 'зелень' или 'город'.
// features — [{ kind: 'вода' | 'зелень', geometry }].
// Побеждает то, что ближе. Если вода и зелень одинаково близко
// (например, пруд в парке) — вода.
function terrainNear(point, features, radius) {
  let waterDistance = Infinity;
  let greenDistance = Infinity;
  for (let i = 0; i < features.length; i++) {
    const d = distanceToGeometry(point, features[i].geometry);
    if (features[i].kind === 'вода') waterDistance = Math.min(waterDistance, d);
    if (features[i].kind === 'зелень') greenDistance = Math.min(greenDistance, d);
  }
  if (waterDistance <= radius && waterDistance <= greenDistance) return 'вода';
  if (greenDistance <= radius) return 'зелень';
  return 'город';
}

// Выбирает кота с учётом места и времени.
// options.terrain  — 'вода', 'зелень', 'город' или null (данных карты нет);
// options.twilight — true, если сейчас последний час до заката.
// Сумеречные коты бывают только в сумерки: тогда примерно в 30% капсул
// сумеречный кот. В остальное время их в выборе нет совсем.
// Дальше, как и раньше, редкость. Потом в 60% случаев — кот подходящего
// типа этой редкости, иначе — любой кот этой редкости.
// Легендарная Комета выпадает где угодно с обычным шансом.
function pickCatForPlace(allCats, options, random) {
  const twilightCats = allCats.filter(function (cat) { return cat.type === 'сумеречный'; });
  if (options && options.twilight && twilightCats.length > 0 && random() < TWILIGHT_CHANCE) {
    // Сумеречный кот: тоже с учётом редкости (редкий — реже)
    return pickCat(twilightCats, random);
  }
  // Все остальные коты, кроме сумеречных
  const cats = allCats.filter(function (cat) { return cat.type !== 'сумеречный'; });

  const rarity = pickRarity(random);
  const sameRarity = cats.filter(function (cat) { return cat.rarity === rarity; });
  let choices = sameRarity.length > 0 ? sameRarity : cats;

  const wantedType = options && options.terrain ? TERRAIN_CAT_TYPE[options.terrain] : '';
  if (wantedType && rarity !== 'легендарный' && random() < PLACE_TYPE_CHANCE) {
    // Коты нужного типа этой редкости, а если таких нет — нужного типа любой
    // (не легендарной) редкости
    let placeCats = sameRarity.filter(function (cat) { return cat.type === wantedType; });
    if (placeCats.length === 0) {
      placeCats = cats.filter(function (cat) {
        return cat.type === wantedType && cat.rarity !== 'легендарный';
      });
    }
    if (placeCats.length > 0) choices = placeCats;
  }
  return choices[Math.floor(random() * choices.length)];
}

// =============================================================
// Бой «Лапка, Коготь, Клубок» (для обычных котов и для капитанов)
// =============================================================
// Состояние боя — объект:
//   winsNeeded  — до скольких побед играем (коты — 2, капитаны — 3);
//   playerWins, catWins — счёт;
//   helpersLeft — id помощников, которые ещё могут дать «вторую попытку»;
//   pendingLoss — true, если раунд проигран и игрок решает, позвать ли
//                 помощника (очко сопернику пока не засчитано);
//   finished    — '' (идёт), 'победа' или 'поражение'.
// Функции ниже не меняют старый объект, а возвращают новый.

function createBattle(winsNeeded, helperIds) {
  return {
    winsNeeded: winsNeeded,
    playerWins: 0,
    catWins: 0,
    helpersLeft: (helperIds || []).slice(), // копия списка
    pendingLoss: false,
    finished: ''
  };
}

// Проверяет, не закончился ли бой
function battleCheckFinished(battle) {
  if (battle.playerWins >= battle.winsNeeded) battle.finished = 'победа';
  else if (battle.catWins >= battle.winsNeeded) battle.finished = 'поражение';
  return battle;
}

// Итог раунда: result — 'победа', 'поражение' или 'ничья' (из roundResult)
function battleRound(state, result) {
  const battle = Object.assign({}, state, { helpersLeft: state.helpersLeft.slice() });
  if (battle.finished || battle.pendingLoss) return battle; // бой уже кончился или ждём решения
  if (result === 'победа') {
    battle.playerWins = battle.playerWins + 1;
  } else if (result === 'поражение') {
    if (battle.helpersLeft.length > 0) {
      // Есть помощник — очко пока не засчитываем, игрок решит сам
      battle.pendingLoss = true;
    } else {
      battle.catWins = battle.catWins + 1;
    }
  }
  return battleCheckFinished(battle);
}

// «Помоги, <имя>!» — помощник тратит свою вторую попытку,
// проигранный раунд не считается и переигрывается
function battleUseHelper(state, helperId) {
  const battle = Object.assign({}, state, { helpersLeft: state.helpersLeft.slice() });
  const index = battle.helpersLeft.indexOf(helperId);
  if (!battle.pendingLoss || index === -1) return battle;
  battle.helpersLeft.splice(index, 1);
  battle.pendingLoss = false;
  return battle;
}

// Игрок решил не звать помощника — очко сопернику
function battleAcceptLoss(state) {
  const battle = Object.assign({}, state, { helpersLeft: state.helpersLeft.slice() });
  if (!battle.pendingLoss) return battle;
  battle.pendingLoss = false;
  battle.catWins = battle.catWins + 1;
  return battleCheckFinished(battle);
}

// =============================================================
// Потерявшиеся капитаны (боссы)
// =============================================================
const CAPTAIN_MIN_CREW = 5;                  // капитаны приходят, когда в экипаже главы 5+ котов
const CAPTAIN_LIFETIME = 60 * 60 * 1000;     // капитан ждёт у маяка 1 час
const CAPTAIN_NEXT_DELAY = 30 * 60 * 1000;   // после победы следующий — через 30 минут
const CAPTAIN_RETRY_DELAY = 2 * 60 * 1000;   // после проигрыша — ещё раз через 2 минуты
const CAPTAIN_WINS_NEEDED = 3;               // бой с капитаном — до трёх побед
const MAX_HELPERS = 2;                       // помощников — не больше двух
const CAPTAIN_PARTS = 3;                     // награда за капитана — 3 детали

// Капитан (объект на карте) ещё ждёт игрока?
// captain — { captainId, beaconId, expiresAt, retryAt } или null
function isCaptainActive(captain, now) {
  return !!captain && now < captain.expiresAt;
}

// Можно ли сейчас позвать нового капитана.
// info: { crewCount, captain, nextCaptainAt, beaconCount, now }
// info.today — «ключ» сегодняшнего дня, info.captainDay — день, когда
// приходил последний капитан: капитан приходит не чаще раза в день
// (после победы следующий — уже на следующий день).
function canSpawnCaptain(info) {
  if (info.crewCount < CAPTAIN_MIN_CREW) return false;     // экипаж маловат
  if (isCaptainActive(info.captain, info.now)) return false; // один уже ждёт
  if (info.now < info.nextCaptainAt) return false;         // после победы — пауза
  if (info.today && info.captainDay === info.today) return false; // сегодня уже был
  return info.beaconCount > 0;                             // капитан ждёт у маяка
}

// Какой капитан придёт: сначала те, кого ещё нет в экипаже;
// если все уже в экипаже — любой (можно встретиться снова).
function chooseCaptain(captains, save, random) {
  const notMet = captains.filter(function (c) { return !((save.captains[c.id] || 0) > 0); });
  const choices = notMet.length > 0 ? notMet : captains;
  return choices[Math.floor(random() * choices.length)];
}

// Новый капитан у маяка beaconId
function makeCaptain(captainId, beaconId, now) {
  return { captainId: captainId, beaconId: beaconId, expiresAt: now + CAPTAIN_LIFETIME, retryAt: 0 };
}

// Игрок проиграл капитану: без наказания, но следующая попытка — через 2 минуты.
// Капитан остаётся до конца своего часа.
function captainAfterLoss(captain, now) {
  return Object.assign({}, captain, { retryAt: now + CAPTAIN_RETRY_DELAY });
}

// Сколько мс ждать до следующей попытки (0 — можно играть)
function captainRetryLeft(captain, now) {
  return Math.max(0, captain.retryAt - now);
}

// Игрок победил капитана: капитан вступает в экипаж, награда — 3 детали,
// следующий капитан — не раньше чем через 30 минут.
function applyCaptainWin(save, captainId, now) {
  const result = copySave(save);
  const isNew = !((save.captains[captainId] || 0) > 0);
  result.captains[captainId] = (result.captains[captainId] || 0) + 1;
  result.parts = result.parts + CAPTAIN_PARTS;
  result.nextCaptainAt = now + CAPTAIN_NEXT_DELAY;
  return { save: result, reward: { isNew: isNew, parts: CAPTAIN_PARTS } };
}

// Кого можно взять в помощники: все из экипажа (коты и капитаны),
// кроме самого капитана, с которым идёт бой. list — каталог(и).
function availableHelpers(save, list, exceptId) {
  return list.filter(function (cat) {
    const met = (save.crew[cat.id] || 0) + (save.captains[cat.id] || 0);
    return met > 0 && cat.id !== exceptId;
  });
}

// Выбор помощников: нажали на кота — добавляем (если мест ещё нет — не
// добавляем), нажали снова — убираем. Возвращает новый список id.
function toggleHelper(selected, catId) {
  if (selected.includes(catId)) {
    return selected.filter(function (id) { return id !== catId; });
  }
  if (selected.length >= MAX_HELPERS) return selected.slice();
  return selected.concat([catId]);
}

// =============================================================
// Время игры в день
// =============================================================
// Считаем секунды, пока игра открыта и видна на экране. В полночь по
// местному времени счётчик обнуляется: у каждого дня свой «ключ» дня.

const LIMIT_WARNING_SECONDS = 5 * 60; // за 5 минут до конца — предупреждение
const BONUS_MINUTES = 15;             // «Добавить 15 минут» в разделе для взрослых

// «Ключ» дня по местному времени, например '2026-09-30'.
// date — объект Date (время на телефоне игрока).
function localDayKey(date) {
  const month = date.getMonth() + 1; // месяцы в JavaScript считаются с 0
  const day = date.getDate();
  return date.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
}

// Прибавляет seconds секунд к времени игры за день dayKey.
// Если наступил новый день — счётчик начинается с нуля.
// Возвращает новый объект playTime.
function addPlayTime(playTime, dayKey, seconds) {
  if (playTime.day !== dayKey) {
    return { day: dayKey, seconds: seconds, bonusMinutes: 0 };
  }
  return { day: dayKey, seconds: playTime.seconds + seconds, bonusMinutes: playTime.bonusMinutes };
}

// Сколько секунд сыграно сегодня (если в сохранении вчерашний день — 0)
function playedToday(playTime, dayKey) {
  return playTime.day === dayKey ? playTime.seconds : 0;
}

// Состояние ограничения времени. Возвращает:
//   status  — 'без ограничения', 'играем', 'скоро конец' или 'время вышло';
//   secondsLeft — сколько секунд осталось (Infinity, если ограничения нет).
// limitMinutes — ограничение из настроек (0 — выключено).
function timeLimitState(playTime, dayKey, limitMinutes) {
  if (!limitMinutes) {
    return { status: 'без ограничения', secondsLeft: Infinity };
  }
  const bonus = playTime.day === dayKey ? playTime.bonusMinutes : 0;
  const allowed = (limitMinutes + bonus) * 60;
  const left = Math.max(0, allowed - playedToday(playTime, dayKey));
  let status = 'играем';
  if (left === 0) status = 'время вышло';
  else if (left <= LIMIT_WARNING_SECONDS) status = 'скоро конец';
  return { status: status, secondsLeft: left };
}

// Взрослый разрешил поиграть ещё немного сегодня
function addBonusTime(playTime, dayKey) {
  const today = playTime.day === dayKey ? playTime : { day: dayKey, seconds: 0, bonusMinutes: 0 };
  return { day: dayKey, seconds: today.seconds, bonusMinutes: today.bonusMinutes + BONUS_MINUTES };
}

// =============================================================
// Родительский замок
// =============================================================
// Чтобы войти в раздел «Для взрослых», нужно решить пример:
// двузначное число умножить на однозначное (например, 23 × 4).
// Для ребёнка 9–12 лет это не мгновенно, а взрослый решит легко.

function makeParentQuestion(random) {
  const a = 12 + Math.floor(random() * 88); // от 12 до 99
  const b = 3 + Math.floor(random() * 7);   // от 3 до 9
  return { a: a, b: b, answer: a * b, text: a + ' × ' + b };
}

// Правильный ли ответ. text — то, что ввели (строка).
// Пробелы по краям не мешают, но принимаем только цифры.
function checkParentAnswer(question, text) {
  const clean = String(text).trim();
  if (!/^[0-9]+$/.test(clean)) return false;
  return Number(clean) === question.answer;
}

// =============================================================
// Режим «Дом»: гости в убежище
// =============================================================
// Раз в 6 часов в убежище прилетает кот-гость. Гостей копится не больше 1
// (после теста с ребёнком: дома было слишком много котов).
// Время прилёта следующего гостя (nextAt) хранится в сохранении.
// Гость выбирается по редкости, как в капсулах. С 17:00 до 22:00 по
// местному времени гостями бывают и сумеречные коты (дома координат нет,
// поэтому смотрим просто на часы).

const GUEST_INTERVAL = 6 * 60 * 60 * 1000; // гость прилетает раз в 6 часов
const MAX_GUESTS = 1;                      // больше одного гостя не копится
const TWILIGHT_HOUR_FROM = 17;             // сумеречные гости — с 17:00…
const TWILIGHT_HOUR_TO = 22;               // …до 22:00

// Проверяет гостей из сохранения
function cleanGuests(data) {
  const guests = { list: [], nextAt: 0 };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return guests;
  if (Array.isArray(data.list)) {
    guests.list = data.list.filter(function (id) { return typeof id === 'string'; }).slice(0, MAX_GUESTS);
  }
  if (isCount(data.nextAt)) guests.nextAt = data.nextAt;
  return guests;
}

// Сумеречный час для гостей? hour — час по местному времени (0–23)
function isTwilightHour(hour) {
  return hour >= TWILIGHT_HOUR_FROM && hour < TWILIGHT_HOUR_TO;
}

// Выбор гостя: по редкости, как в капсулах; сумеречные — только в 17–22
function pickGuest(cats, hour, random) {
  return pickCatForPlace(cats, { terrain: null, twilight: isTwilightHour(hour) }, random);
}

// Обновляет гостей к моменту now. Возвращает новый объект guests.
//   cats   — каталог котов;
//   hourOf — функция: время (мс) → час по местному времени (0–23);
//   random — случайные числа.
// Первый раз (nextAt = 0) гость прилетает сразу. Потом — каждые 6 часов.
// Если гость уже ждёт, новый не прилетает (его прилёт пропадает).
// save (необязательно) — сохранение: тогда гости выбираются по главе
// (коты текущей главы и отставшие, см. pickCatForChapter).
function updateGuests(guests, now, cats, hourOf, random, save) {
  const result = { list: guests.list.slice(), nextAt: guests.nextAt };
  if (result.nextAt === 0) result.nextAt = now; // самый первый гость — сразу
  if (now < result.nextAt) return result;

  // Сколько прилётов было с прошлого раза (если игрок не заходил неделю,
  // не перебираем каждый прилёт — гостей всё равно не больше 3)
  const arrivals = Math.floor((now - result.nextAt) / GUEST_INTERVAL) + 1;
  const places = MAX_GUESTS - result.list.length;
  const newGuests = Math.min(arrivals, places);
  // Гости прилетели в последние прилёты: у каждого своё время (для
  // сумеречного правила — по часам прилёта)
  for (let i = 0; i < newGuests; i++) {
    const arrivalTime = result.nextAt + (arrivals - newGuests + i) * GUEST_INTERVAL;
    const hour = hourOf(arrivalTime);
    // Гости — только обычные коты (редкие и легендарные — на прогулке)
    const guest = save
      ? pickCatForChapter(commonOnly(cats), save, { terrain: null, twilight: isTwilightHour(hour) }, random)
      : pickGuest(commonOnly(cats), hour, random);
    result.list.push(guest.id);
  }
  result.nextAt = result.nextAt + arrivals * GUEST_INTERVAL;
  return result;
}

// Гость познакомился с игроком (победа) — он больше не ждёт в убежище.
// Убираем только одного гостя с таким id.
function removeGuest(guests, catId) {
  const list = guests.list.slice();
  const index = list.indexOf(catId);
  if (index !== -1) list.splice(index, 1);
  return { list: list, nextAt: guests.nextAt };
}

// =============================================================
// Режим «Дом»: забота и дружба
// =============================================================
const TREATS_PER_LEVEL = 5;   // каждые 5 угощений — новый уровень дружбы
const MAX_FRIENDSHIP = 5;     // самый высокий уровень дружбы
const TREAT_COST = 1;         // угощение стоит 1 рыбку

// Уровень дружбы кота (0–5)
function friendshipLevel(save, catId) {
  const treats = save.friendship[catId] || 0;
  return Math.min(MAX_FRIENDSHIP, Math.floor(treats / TREATS_PER_LEVEL));
}

// Сколько угощений осталось до следующего уровня (0 — уровень максимальный)
function treatsToNextLevel(save, catId) {
  if (friendshipLevel(save, catId) >= MAX_FRIENDSHIP) return 0;
  const treats = save.friendship[catId] || 0;
  return TREATS_PER_LEVEL - (treats % TREATS_PER_LEVEL);
}

// Угостить кота рыбкой. Возвращает { save, ok, levelUp, level }:
//   ok      — false, если рыбок нет (тогда сохранение не меняется);
//   levelUp — true, если дружба выросла на уровень.
function feedCat(save, catId) {
  if (save.fish < TREAT_COST) {
    return { save: save, ok: false, levelUp: false, level: friendshipLevel(save, catId) };
  }
  const before = friendshipLevel(save, catId);
  const result = copySave(save);
  result.fish = result.fish - TREAT_COST;
  result.friendship[catId] = (result.friendship[catId] || 0) + 1;
  const after = friendshipLevel(result, catId);
  return { save: result, ok: true, levelUp: after > before, level: after };
}

// Сердечки дружбы: ♥♥♡♡♡
function friendshipHearts(level) {
  return '♥'.repeat(level) + '♡'.repeat(MAX_FRIENDSHIP - level);
}

// =============================================================
// Ежедневные задания
// =============================================================
// Каждый день — 3 задания из списка. Задания засчитываются и на прогулке,
// и дома. event — какое событие игры двигает задание вперёд.
// place — где выполняется: 'прогулка', 'дом' или 'везде'. Задания, которые
// можно выполнить дома, дают награду меньше, чем прогулочные: пусть
// главное собирается на прогулке.
const QUEST_TYPES = [
  { id: 'catch2', text: 'Поймай 2 котов', event: 'catch', goal: 2, place: 'везде', reward: { fish: 4, parts: 0 } },
  { id: 'treat1', text: 'Угости любого кота', event: 'treat', goal: 1, place: 'дом', reward: { fish: 2, parts: 0 } },
  { id: 'treat3', text: 'Угости котов 3 раза', event: 'treat', goal: 3, place: 'дом', reward: { fish: 3, parts: 0 } },
  { id: 'beacon1', text: 'Зайди на маяк', event: 'beacon', goal: 1, place: 'прогулка', reward: { fish: 5, parts: 0 } },
  { id: 'perfect1', text: 'Выиграй встречу, не проиграв ни одного раунда', event: 'perfectWin', goal: 1, place: 'везде', reward: { fish: 4, parts: 0 } },
  { id: 'signal2', text: 'Поймай сигнал 2 раза', event: 'signal', goal: 2, place: 'везде', reward: { fish: 3, parts: 0 } },
  { id: 'guest1', text: 'Познакомься с гостем в убежище', event: 'guest', goal: 1, place: 'дом', reward: { fish: 2, parts: 0 } },
  { id: 'rounds5', text: 'Выиграй 5 раундов', event: 'roundWin', goal: 5, place: 'везде', reward: { fish: 4, parts: 0 } },
  { id: 'walk500', text: 'Пройди 500 м на прогулке', event: 'walk', goal: 500, unit: 'м', place: 'прогулка', reward: { fish: 8, parts: 1 } }
];
const QUESTS_PER_DAY = 3;

function findQuestType(id) {
  return QUEST_TYPES.find(function (quest) { return quest.id === id; });
}

// Проверяет задания из сохранения
function cleanQuests(data) {
  const quests = { day: '', list: [] };
  if (!data || typeof data !== 'object' || Array.isArray(data)) return quests;
  if (typeof data.day !== 'string' || !Array.isArray(data.list)) return quests;
  const list = data.list.filter(function (item) {
    return item && findQuestType(item.id) && isCount(item.progress) && typeof item.done === 'boolean';
  }).map(function (item) {
    return { id: item.id, progress: item.progress, done: item.done };
  });
  if (list.length !== QUESTS_PER_DAY) return quests; // что-то не так — задания выберутся заново
  quests.day = data.day;
  quests.list = list;
  return quests;
}

// Выбирает 3 разных задания (по порядку перемешанного списка)
function chooseDailyQuests(random) {
  const ids = QUEST_TYPES.map(function (quest) { return quest.id; });
  const chosen = [];
  while (chosen.length < QUESTS_PER_DAY) {
    const index = Math.floor(random() * ids.length);
    chosen.push({ id: ids[index], progress: 0, done: false });
    ids.splice(index, 1); // чтобы задание не повторилось
  }
  return chosen;
}

// Если наступил новый день (по местному времени) — новые задания.
// Возвращает новый объект quests.
function refreshQuests(quests, dayKey, random) {
  if (quests.day === dayKey && quests.list.length === QUESTS_PER_DAY) {
    return quests;
  }
  return { day: dayKey, list: chooseDailyQuests(random) };
}

// Событие игры (например, 'catch' — поймали кота).
// Двигает вперёд подходящие задания. Возвращает { save, completed }:
// completed — задания, которые только что выполнились (награда уже выдана).
// amount — на сколько продвинуть (по умолчанию 1; для «Пройди 500 м» — метры).
function applyQuestEvent(save, dayKey, eventName, random, amount) {
  const step = amount || 1;
  const result = copySave(save);
  result.quests = refreshQuests(result.quests, dayKey, random);
  const completed = [];
  for (let i = 0; i < result.quests.list.length; i++) {
    const item = result.quests.list[i];
    const type = findQuestType(item.id);
    if (item.done || type.event !== eventName) continue;
    item.progress = Math.min(type.goal, item.progress + step);
    if (item.progress >= type.goal) {
      item.done = true;
      result.fish = result.fish + type.reward.fish;
      result.parts = result.parts + type.reward.parts;
      completed.push(type);
    }
  }
  return { save: result, completed: completed };
}

// Текст награды: «+5 🐟» или «+1 деталь 🔩»
function questRewardText(reward) {
  const parts = [];
  if (reward.fish > 0) parts.push('+' + reward.fish + ' 🐟');
  if (reward.parts > 0) parts.push('+' + reward.parts + ' ' + pluralRu(reward.parts, 'деталь', 'детали', 'деталей') + ' 🔩');
  return parts.join(' и ');
}

// =============================================================
// Журнал диагностики GPS
// =============================================================
// Журнал живёт только в памяти, пока открыта страница, и никуда
// не сохраняется. КООРДИНАТ В НЁМ НЕТ: только время, событие и текст ошибки.

const GPS_LOG_MAX = 50; // храним не больше 50 последних записей

// Добавляет запись в журнал. Возвращает новый массив (старые записи
// сверх GPS_LOG_MAX выбрасываются). entry — { time, event, error }.
function addLogEntry(log, entry) {
  const result = log.concat([{
    time: entry.time,
    event: String(entry.event || ''),
    error: String(entry.error || '')
  }]);
  return result.slice(Math.max(0, result.length - GPS_LOG_MAX));
}

// Время для журнала: «14:05:09» (по часам телефона). date — объект Date.
function formatClock(date) {
  function two(n) { return (n < 10 ? '0' : '') + n; }
  return two(date.getHours()) + ':' + two(date.getMinutes()) + ':' + two(date.getSeconds());
}

// Названия ошибок геолокации по коду
const GPS_ERROR_NAMES = {
  1: 'PERMISSION_DENIED — нет разрешения',
  2: 'POSITION_UNAVAILABLE — место недоступно',
  3: 'TIMEOUT — нет ответа вовремя'
};

// Названия состояний разрешения (navigator.permissions)
const PERMISSION_NAMES = {
  granted: 'разрешено',
  denied: 'запрещено',
  prompt: 'браузер спросит'
};

// Сколько времени прошло: «5 с назад», «3 мин назад»
function agoText(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 120) return seconds + ' с назад';
  return Math.round(seconds / 60) + ' мин назад';
}

// Текст отчёта «Проверить GPS». info — только то, что нужно для отчёта:
// { now, supported, secure, permission, mode, demo, watching, fixCount,
//   lastFixAt, accuracy, lastError: { code, message, time } | null,
//   log: [{ time, event, error }], browser }.
// КООРДИНАТ В ОТЧЁТЕ НЕТ: функция берёт из info только поля выше.
function buildGpsReport(info) {
  const yesNo = function (value) { return value ? 'да' : 'нет'; };
  const modes = { walk: 'прогулка', home: 'дом', '': 'стартовый экран' };
  const lines = [];
  lines.push('MewMo — проверка GPS');
  lines.push('Время: ' + formatClock(new Date(info.now)));
  lines.push('Браузер умеет геолокацию: ' + yesNo(info.supported));
  lines.push('Защищённое соединение (https): ' + yesNo(info.secure));
  lines.push('Разрешение: ' + (PERMISSION_NAMES[info.permission] || 'неизвестно'));
  lines.push('Режим: ' + (modes[info.mode] || info.mode) + '. Демо-режим: ' + yesNo(info.demo));
  lines.push('Слежение запущено: ' + yesNo(info.watching));
  lines.push('Координаты приходили: ' + info.fixCount + ' ' + pluralRu(info.fixCount, 'раз', 'раза', 'раз'));
  if (info.lastFixAt) {
    lines.push('Последние координаты: ' + agoText(info.now - info.lastFixAt));
    lines.push('Точность: ' + Math.round(info.accuracy) + ' м');
  } else {
    lines.push('Последние координаты: ещё не было');
  }
  if (info.lastError) {
    lines.push('Последняя ошибка: код ' + info.lastError.code + ' (' +
      (GPS_ERROR_NAMES[info.lastError.code] || 'неизвестная') + ')' +
      (info.lastError.message ? ' — ' + info.lastError.message : '') +
      ', ' + agoText(info.now - info.lastError.time));
  } else {
    lines.push('Последняя ошибка: нет');
  }
  lines.push('Журнал (последние 10 событий):');
  const last = info.log.slice(-10);
  if (last.length === 0) lines.push('  пусто');
  for (let i = 0; i < last.length; i++) {
    lines.push('  ' + formatClock(new Date(last[i].time)) + ' ' + last[i].event +
      (last[i].error ? ' — ' + last[i].error : ''));
  }
  lines.push('Браузер: ' + (info.browser || 'неизвестно'));
  return lines.join('\n');
}

// =============================================================
// Мягкие цвета карты
// =============================================================
// Карта OpenFreeMap яркая. Чтобы капсулы и маяки было лучше видно,
// приглушаем её: светлый тёплый фон, бледная вода и зелень, полупрозрачные
// дороги и здания, бледные значки и подписи.
// layer — слой стиля карты ({ id, type }). Возвращает { свойство: значение }
// для map.setPaintProperty (пустой объект — слой не трогаем).
const MAP_COLORS = {
  background: '#EEEAE3',
  water: '#CADDE8',
  green: '#DCE7D3',
  road: '#F8F6F1',
  building: '#E6E2EC',
  label: '#6B6E8A'
};

function mutedPaint(layer) {
  const id = (layer.id || '').toLowerCase();
  // Есть ли в названии слоя одно из слов
  function has(words) {
    return words.some(function (word) { return id.includes(word); });
  }
  const isWater = has(['water', 'river', 'ocean', 'lake']);
  const isGreen = has(['park', 'wood', 'grass', 'forest', 'landcover', 'landuse', 'scrub', 'wetland']);
  const isRoad = has(['road', 'highway', 'transportation', 'bridge', 'tunnel', 'path', 'street', 'railway', 'aeroway']);

  if (layer.type === 'background') {
    return { 'background-color': MAP_COLORS.background };
  }
  if (layer.type === 'fill') {
    if (isWater) return { 'fill-color': MAP_COLORS.water };
    if (isGreen) return { 'fill-color': MAP_COLORS.green, 'fill-opacity': 0.6 };
    if (has(['building'])) return { 'fill-color': MAP_COLORS.building };
    return { 'fill-opacity': 0.5 };
  }
  if (layer.type === 'line') {
    if (isWater) return { 'line-color': MAP_COLORS.water };
    if (isRoad) return { 'line-color': MAP_COLORS.road, 'line-opacity': 0.8 };
    return { 'line-opacity': 0.5 };
  }
  if (layer.type === 'fill-extrusion') {
    return { 'fill-extrusion-color': MAP_COLORS.building, 'fill-extrusion-opacity': 0.55 };
  }
  if (layer.type === 'symbol') {
    return { 'text-color': MAP_COLORS.label, 'icon-opacity': 0.45 };
  }
  return {};
}

// =============================================================
// Баланс прогулки (после теста с ребёнком)
// =============================================================
// Капсул вокруг игрока немного (2–3), они дальше (60–250 м), а новая
// появляется не сразу, а через 2–4 минуты после того, как открыли старую.
// Так прогулка становится настоящей прогулкой.
const CAPSULE_TARGET = 3;                  // не больше 3 капсул вокруг игрока
const CAPSULE_RESPAWN_MIN = 2 * 60 * 1000; // новая капсула — через 2…
const CAPSULE_RESPAWN_MAX = 4 * 60 * 1000; // …4 минуты

// Когда появится новая капсула вместо открытой (мс)
function capsuleRespawnTime(now, random) {
  return now + CAPSULE_RESPAWN_MIN + random() * (CAPSULE_RESPAWN_MAX - CAPSULE_RESPAWN_MIN);
}

// Сколько капсул добавить прямо сейчас.
// count — сколько лежит; waiting — времена «появится в…» для открытых капсул.
// Место открытой капсулы занято, пока не наступило её время.
function capsulesToAdd(count, waiting, now) {
  const stillWaiting = waiting.filter(function (time) { return time > now; }).length;
  return Math.max(0, CAPSULE_TARGET - count - stillWaiting);
}

// Сколько метров засчитать за шаг между двумя точками GPS.
// meters — расстояние между точками, seconds — сколько секунд прошло,
// accuracy — точность GPS в метрах. Не засчитываем «дрожание» GPS
// (меньше 5 м), неточные координаты (хуже 40 м) и слишком быстрое
// движение (быстрее 10 м/с — это машина или автобус, а не прогулка).
const WALK_MIN_STEP = 5;
const WALK_MAX_ACCURACY = 40;
const WALK_MAX_SPEED = 10;

function walkStepMeters(meters, seconds, accuracy) {
  if (meters < WALK_MIN_STEP) return 0;
  if (accuracy > WALK_MAX_ACCURACY) return 0;
  if (seconds <= 0 || meters / seconds > WALK_MAX_SPEED) return 0;
  return meters;
}

// Прибавить пройденные метры к сегодняшнему дню (новый день — с нуля).
// В сохранение попадает ТОЛЬКО число метров, без координат.
function addWalkMeters(walkToday, dayKey, meters) {
  const today = walkToday.day === dayKey ? walkToday.meters : 0;
  return { day: dayKey, meters: Math.round(today + meters) };
}

// Сколько метров пройдено сегодня
function walkedToday(walkToday, dayKey) {
  return walkToday.day === dayKey ? walkToday.meters : 0;
}

// Гости дома — только обычные коты (и сумеречные вечером).
// Редкие и легендарные встречаются только на прогулке.
function commonOnly(cats) {
  return cats.filter(function (cat) { return cat.rarity === 'обычный'; });
}

// ----- Для тестов в Node: отдаём функции наружу -----
// В браузере переменной module нет, и эта строка ничего не делает.
if (typeof module !== 'undefined') {
  module.exports = {
    distanceMeters, offsetPosition, randomCapsulePosition,
    RARITY_CHANCES, pickRarity, pickCat, rarityStars,
    GESTURES, BEATS, roundResult, catChooseGesture,
    signalSettings, signalPosition, isInGreenZone,
    gpsErrorAction, GPS_WATCHDOG_TIME, GPS_DEMO_WAIT, shouldRestartGps, gpsSearchState,
    SAVE_KEY, SHIP_PARTS_NEEDED, NEW_CAT_PARTS, REPEAT_CAT_FISH,
    emptySave, cleanSave, loadSave, writeSave, isInCrew, crewCount,
    applyCatWin, pluralRu, shipRepairShare,
    BEACON_PLACES, BEACON_FORBIDDEN, BEACON_RADIUS, BEACON_MAX_COUNT, BEACON_MIN_GAP,
    VIRTUAL_BEACON_COUNT, BEACON_COOLDOWN, BEACON_PART_CHANCE,
    isBeaconPlace, beaconKind, selectBeacons, beaconsNear, makeVirtualBeacons,
    beaconTitle, beaconReward, beaconCooldownLeft, startBeaconCooldown,
    applyBeaconReward, formatTimeLeft,
    TERRAIN_RADIUS, PLACE_TYPE_CHANCE, TERRAIN_CAT_TYPE, terrainKind,
    distanceToGeometry, terrainNear, pickCatForPlace,
    DAY_MS, TWILIGHT_TIME, TWILIGHT_CHANCE, sunPosition, sunsetTime, isTwilightTime,
    createBattle, battleRound, battleUseHelper, battleAcceptLoss,
    CAPTAIN_MIN_CREW, CAPTAIN_LIFETIME, CAPTAIN_NEXT_DELAY, CAPTAIN_RETRY_DELAY,
    CAPTAIN_WINS_NEEDED, MAX_HELPERS, CAPTAIN_PARTS,
    isCaptainActive, canSpawnCaptain, chooseCaptain, makeCaptain, captainAfterLoss,
    captainRetryLeft, applyCaptainWin, availableHelpers, toggleHelper,
    DEFAULT_SETTINGS, DAILY_LIMIT_CHOICES, SOUND_LEVELS, LIMIT_WARNING_SECONDS, BONUS_MINUTES,
    localDayKey, addPlayTime, playedToday, timeLimitState, addBonusTime,
    makeParentQuestion, checkParentAnswer,
    GUEST_INTERVAL, MAX_GUESTS, isTwilightHour, pickGuest, updateGuests, removeGuest,
    TREATS_PER_LEVEL, MAX_FRIENDSHIP, friendshipLevel, treatsToNextLevel, feedCat, friendshipHearts,
    QUEST_TYPES, QUESTS_PER_DAY, chooseDailyQuests, refreshQuests, applyQuestEvent, questRewardText,
    LAST_CHAPTER, CHAPTER_PARTS, LAUNCHABLE_CHAPTERS, partsNeeded, catChapter, chapterCats,
    canLaunchShip, launchShip, badgeName, LATECOMER_CHANCE, latecomerCats, pickCatForChapter,
    shelterCats, isOnRadio, TIP_ENCOUNTERS, shouldShowTutorial, needsEncounterTips,
    MAP_COLORS, mutedPaint,
    CAPSULE_TARGET, CAPSULE_RESPAWN_MIN, CAPSULE_RESPAWN_MAX, capsuleRespawnTime, capsulesToAdd,
    walkStepMeters, addWalkMeters, walkedToday, commonOnly,
    GPS_LOG_MAX, addLogEntry, formatClock, GPS_ERROR_NAMES, agoText, buildGpsReport
  };
}
