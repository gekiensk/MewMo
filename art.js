// =============================================================
// MewMo — картинки игры в SVG
// =============================================================
// Все картинки нарисованы прямо здесь, в коде, в формате SVG.
// SVG — это картинка, описанная текстом: «круг здесь, линия там».
// Поэтому не нужны файлы картинок и сторонние библиотеки.
//
// Главные функции:
//   catPortrait(id)  — портрет кота или капитана по его id;
//   capsuleIcon()    — капсула с котом (для карты);
//   beaconIcon()     — маяк (для карты).
//
// Все портреты рисуются по одному шаблону (голова, ушки, большие глаза,
// шлем скафандра с антенной), а отличаются цветом шерсти, цветом
// скафандра и своей деталью (гаечный ключ, ночной колпак, экран …).
// Холст портрета — 120×120 «точек» (viewBox), SVG сам растягивается
// под размер круга.

// ----- Цвета -----
// Палитра мягкая, пастельная (после теста с ребёнком: яркие цвета
// утомляли глаза). Тёмный контур — цвет фона игры.
const INK = '#34375F';      // тёмный контур (цвет ночного неба)
const FUR_LIGHT = '#FAF7F2'; // светлый
const PINK = '#F4A7B9';      // розовый нос и щёчки
const GOLD = '#F5D88E';      // звёздный жёлтый
const MINT = '#9FD8C8';      // мятный

// Цвет скафандра по типу кота
const SUIT_COLORS = {
  'водный': '#A9D3F0',       // голубой
  'лесной': '#B5E2B0',       // зелёный
  'городской': GOLD,         // жёлтый
  'космический': PINK,       // легендарный — розовый
  'сумеречный': 'twilight',  // сиренево-оранжевый (градиент, см. ниже)
  'капитан': '#6F6AA8'       // капитанский тёмно-синий с золотым воротником
};

// Внешность каждого кота:
//   suit   — тип скафандра (должен совпадать с type кота в cats.js — это проверяет тест);
//   fur    — цвет шерсти;
//   eyes   — цвет глаз;
//   eyeStyle — 'обычные', 'сонные', 'мечтательные', 'подмигивает', 'кошачьи'
//              (кошачьи — узкий зрачок-щёлочка);
//   stripes — полоски на лбу;
//   detail — своя деталь, по которой кота легко узнать (см. DETAILS ниже).
const CAT_LOOKS = {
  bul:    { suit: 'водный', fur: '#C9CED6', eyes: INK, eyeStyle: 'обычные', stripes: false, detail: 'wrench' },
  murena: { suit: 'водный', fur: '#F2B880', eyes: INK, eyeStyle: 'обычные', stripes: false, detail: 'snorkel' },
  shishka: { suit: 'лесной', fur: '#B08560', eyes: INK, eyeStyle: 'обычные', stripes: false, detail: 'sprout' },
  moh:    { suit: 'лесной', fur: '#BBAE9E', eyes: INK, eyeStyle: 'сонные', stripes: false, detail: 'nightcap' },
  iskra:  { suit: 'городской', fur: '#F2B47C', eyes: INK, eyeStyle: 'подмигивает', stripes: true, detail: 'goggles' },
  gaika:  { suit: 'городской', fur: '#E4E4EC', eyes: INK, eyeStyle: 'обычные', stripes: true, detail: 'gear' },
  pixel:  { suit: 'городской', fur: '#4B4B63', eyes: MINT, eyeStyle: 'обычные', stripes: false, detail: 'screen' },
  kometa: { suit: 'космический', fur: '#FFFFFF', eyes: '#9C84D4', eyeStyle: 'обычные', stripes: false, detail: 'comet' },
  sumrak: { suit: 'сумеречный', fur: '#77739A', eyes: INK, eyeStyle: 'мечтательные', stripes: false, detail: 'moon' },
  yantar: { suit: 'сумеречный', fur: '#3F3850', eyes: '#EFC16E', eyeStyle: 'кошачьи', stripes: false, detail: 'sun' },
  zvezdous: { suit: 'капитан', fur: '#D9D2C5', eyes: INK, eyeStyle: 'обычные', stripes: false, detail: 'captainCap' },
  'lunnaya-lapa': { suit: 'капитан', fur: '#F5E6C8', eyes: INK, eyeStyle: 'обычные', stripes: false, detail: 'crown' },

  // ----- Глава 2 -----
  volna:       { suit: 'водный', fur: '#F4D9B0', eyes: INK, eyeStyle: 'обычные', stripes: false, detail: 'surfboard' },
  kapel:       { suit: 'водный', fur: '#A7B8C9', eyes: INK, eyeStyle: 'мечтательные', stripes: false, detail: 'umbrella' },
  yakor:       { suit: 'водный', fur: '#8A6A55', eyes: INK, eyeStyle: 'обычные', stripes: true, detail: 'anchor' },
  zhemchug:    { suit: 'водный', fur: '#FFFFFF', eyes: '#7FB6DE', eyeStyle: 'обычные', stripes: false, detail: 'shell' },
  zholud:      { suit: 'лесной', fur: '#E0A060', eyes: INK, eyeStyle: 'обычные', stripes: false, detail: 'acornCap' },
  listik:      { suit: 'лесной', fur: '#D8CFC0', eyes: '#3E8E41', eyeStyle: 'подмигивает', stripes: false, detail: 'leafEar' },
  svetlyachok: { suit: 'лесной', fur: '#5A5470', eyes: '#F5DFA0', eyeStyle: 'обычные', stripes: false, detail: 'lantern' },
  kompas:      { suit: 'городской', fur: '#C2A27C', eyes: INK, eyeStyle: 'обычные', stripes: true, detail: 'compass' },
  bublik:      { suit: 'городской', fur: '#F2C58A', eyes: INK, eyeStyle: 'обычные', stripes: false, detail: 'chefHat' },
  radar:       { suit: 'городской', fur: '#9AA3B5', eyes: INK, eyeStyle: 'обычные', stripes: false, detail: 'headphones' },
  zakat:       { suit: 'сумеречный', fur: '#E8A87C', eyes: '#9C84D4', eyeStyle: 'мечтательные', stripes: false, detail: 'brush' },
  orbita:      { suit: 'космический', fur: '#E3DAF5', eyes: '#EC93AE', eyeStyle: 'обычные', stripes: false, detail: 'planetRing' },
  'admiral-grom': { suit: 'капитан', fur: '#7D7D8C', eyes: INK, eyeStyle: 'обычные', stripes: false, detail: 'bicorne' },
  tumannost:   { suit: 'капитан', fur: '#B9A6E0', eyes: MINT, eyeStyle: 'мечтательные', stripes: false, detail: 'telescope' }
};

// Счётчик для уникальных id внутри SVG (градиенты). Если на странице
// несколько одинаковых SVG, у их частей должны быть разные id.
let artIdCounter = 0;

// =============================================================
// Портрет кота
// =============================================================
// Возвращает текст SVG. Если кота с таким id нет — рисует «обычного»
// серого кота, чтобы игра не сломалась.
function catPortrait(id) {
  const look = CAT_LOOKS[id] || { suit: 'городской', fur: '#C9CED6', eyes: INK, eyeStyle: 'обычные', stripes: false, detail: '' };
  artIdCounter = artIdCounter + 1;
  const uid = 'art' + artIdCounter;

  // Цвет скафандра. У сумеречных — градиент (плавный переход цветов)
  let defs = '';
  let suitFill = SUIT_COLORS[look.suit] || GOLD;
  if (suitFill === 'twilight') {
    defs = '<defs><linearGradient id="' + uid + '-suit" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#C2B0E8"/><stop offset="1" stop-color="#F6BE98"/>' +
      '</linearGradient></defs>';
    suitFill = 'url(#' + uid + '-suit)';
  }
  const collar = look.suit === 'капитан' ? GOLD : FUR_LIGHT;

  // Детали бывают «на голове» (под стеклом шлема) и «в лапах»
  // (поверх скафандра). DETAILS[...] возвращает { head, front }.
  const detail = DETAILS[look.detail] ? DETAILS[look.detail](look) : { head: '', front: '', back: '' };

  return '<svg class="portrait" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    defs +
    (detail.back || '') +
    // Антенна на шлеме
    '<line x1="60" y1="15" x2="60" y2="5" stroke="' + FUR_LIGHT + '" stroke-width="3"/>' +
    '<circle cx="60" cy="5" r="4.5" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.5"/>' +
    // Ушки
    '<path d="M33 54 L35 24 L55 40 Z" fill="' + look.fur + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M37 46 L38.5 31 L49 40 Z" fill="' + PINK + '"/>' +
    '<path d="M87 54 L85 24 L65 40 Z" fill="' + look.fur + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M83 46 L81.5 31 L71 40 Z" fill="' + PINK + '"/>' +
    // Голова
    '<ellipse cx="60" cy="63" rx="31" ry="27" fill="' + look.fur + '" stroke="' + INK + '" stroke-width="2.5"/>' +
    (look.stripes ? stripes() : '') +
    // Щёчки
    '<circle cx="40" cy="72" r="5" fill="' + PINK + '" opacity="0.5"/>' +
    '<circle cx="80" cy="72" r="5" fill="' + PINK + '" opacity="0.5"/>' +
    eyes(look) +
    // Нос и рот
    '<path d="M56.5 70 L63.5 70 L60 74 Z" fill="' + PINK + '" stroke="' + INK + '" stroke-width="1" stroke-linejoin="round"/>' +
    '<path d="M60 74 Q57 78 53.5 76 M60 74 Q63 78 66.5 76" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    // Усы
    '<path d="M38 71 L24 68 M38 75 L24 77 M82 71 L96 68 M82 75 L96 77" stroke="' + INK + '" stroke-width="1.5" opacity="0.55" stroke-linecap="round"/>' +
    detail.head +
    // Стекло шлема: почти прозрачный круг и блик
    // (класс helmet — чтобы у силуэта в альбоме шлем можно было спрятать)
    '<circle class="helmet" cx="60" cy="60" r="46" fill="#BFE9FF" fill-opacity="0.16" stroke="' + FUR_LIGHT + '" stroke-width="3"/>' +
    '<path class="helmet" d="M27 46 Q32 28 50 20" stroke="#FFFFFF" stroke-width="4" opacity="0.55" fill="none" stroke-linecap="round"/>' +
    // Скафандр с воротником
    '<path d="M16 120 Q18 94 60 92 Q102 94 104 120 Z" fill="' + suitFill + '" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M32 99 Q60 110 88 99" stroke="' + collar + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    detail.front +
    '</svg>';
}

// Три полоски на лбу (у полосатых котов)
function stripes() {
  return '<path d="M60 38 L60 46 M52 40 L54 47 M68 40 L66 47" stroke="' + INK + '" stroke-width="2.5" opacity="0.35" stroke-linecap="round"/>';
}

// Глаза. Большие, с бликами — так кот выглядит милее.
function eyes(look) {
  const color = look.eyes;
  // Один открытый глаз с центром (x, y)
  function openEye(x, y, ry) {
    let pupil = '';
    if (look.eyeStyle === 'кошачьи') {
      // узкий зрачок-щёлочка поверх цветного глаза
      pupil = '<ellipse cx="' + x + '" cy="' + y + '" rx="2" ry="' + (ry - 2) + '" fill="' + INK + '"/>';
    }
    return '<ellipse cx="' + x + '" cy="' + y + '" rx="7.5" ry="' + ry + '" fill="' + color + '" stroke="' + INK + '" stroke-width="1.5"/>' +
      pupil +
      '<circle cx="' + (x + 2.5) + '" cy="' + (y - 3.5) + '" r="2.8" fill="#FFFFFF"/>' +
      '<circle cx="' + (x - 2) + '" cy="' + (y + 3) + '" r="1.3" fill="#FFFFFF"/>';
  }
  // Закрытый глаз — дужка
  function closedEye(x, y) {
    return '<path d="M' + (x - 7) + ' ' + y + ' Q' + x + ' ' + (y + 6) + ' ' + (x + 7) + ' ' + y + '" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
  }

  if (look.eyeStyle === 'сонные') {
    return closedEye(47, 62) + closedEye(73, 62);
  }
  if (look.eyeStyle === 'подмигивает') {
    return openEye(47, 61, 9) + closedEye(73, 62);
  }
  if (look.eyeStyle === 'мечтательные') {
    // полуприкрытые глаза: глаз поменьше и «веко» сверху
    return openEye(47, 63, 6) + openEye(73, 63, 6) +
      '<path d="M39 60 Q47 55 55 60 M65 60 Q73 55 81 60" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
  }
  return openEye(47, 61, 9) + openEye(73, 61, 9);
}

// =============================================================
// Свои детали котов
// =============================================================
// Каждая функция возвращает { head, front, back }:
//   head  — рисуется на голове (под стеклом шлема);
//   front — поверх скафандра (то, что кот держит в лапах);
//   back  — позади всего (например, хвост кометы).
const DETAILS = {
  // Буль — спокойный механик: гаечный ключ
  wrench: function () {
    return {
      head: '',
      front: '<g transform="rotate(-30 96 100)">' +
        '<rect x="92" y="92" width="8" height="26" rx="3" fill="#C3CCD8" stroke="' + INK + '" stroke-width="2"/>' +
        '<path d="M86 84 A11 11 0 1 1 106 84 L101 80 L101 88 L91 88 L91 80 Z" fill="#C3CCD8" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
        '</g>',
      back: ''
    };
  },
  // Мурена — обожает нырять: трубка для ныряния и пузырьки
  snorkel: function () {
    return {
      head: '<path d="M84 72 L92 72 L92 34" stroke="#EE9A95" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<rect x="34" y="52" width="52" height="5" rx="2.5" fill="#EE9A95" opacity="0.8"/>',
      front: '<circle cx="104" cy="30" r="4" fill="none" stroke="#FFFFFF" stroke-width="2"/>' +
        '<circle cx="110" cy="18" r="2.5" fill="none" stroke="#FFFFFF" stroke-width="2"/>' +
        '<circle cx="100" cy="12" r="2" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>',
      back: ''
    };
  },
  // Шишка — любопытный ботаник: росток на голове и круглые очки
  sprout: function () {
    return {
      head: '<path d="M60 37 Q59 30 62 25" stroke="#5E9A5E" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M62 27 Q71 18 77 25 Q69 31 62 27 Z" fill="#8CC98A" stroke="' + INK + '" stroke-width="1.5"/>' +
        '<path d="M61 29 Q52 22 47 28 Q54 33 61 29 Z" fill="#A8D5A2" stroke="' + INK + '" stroke-width="1.5"/>' +
        '<circle cx="47" cy="61" r="11" fill="none" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<circle cx="73" cy="61" r="11" fill="none" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<line x1="58" y1="60" x2="62" y2="60" stroke="' + INK + '" stroke-width="2.5"/>',
      front: '',
      back: ''
    };
  },
  // Мох — большой соня: ночной колпак с помпоном и «з-з-з»
  nightcap: function () {
    return {
      head: '<path d="M33 48 Q40 24 64 24 Q88 26 97 58 Q86 44 86 48 Z" fill="#9FC9F5" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M33 48 Q60 40 87 48" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round"/>' +
        '<circle cx="97" cy="60" r="5.5" fill="#FFFFFF" stroke="' + INK + '" stroke-width="2"/>',
      front: '<text x="98" y="30" font-size="13" font-weight="700" font-family="sans-serif" fill="#FFFFFF">z</text>' +
        '<text x="106" y="20" font-size="10" font-weight="700" font-family="sans-serif" fill="#FFFFFF">z</text>',
      back: ''
    };
  },
  // Искра — хитрый пилот: лётные очки на лбу (и подмигивает)
  goggles: function () {
    return {
      head: '<path d="M31 45 Q60 38 89 45" stroke="#6B4B2A" stroke-width="5" fill="none"/>' +
        '<circle cx="49" cy="42" r="8" fill="' + MINT + '" stroke="#6B4B2A" stroke-width="3"/>' +
        '<circle cx="71" cy="42" r="8" fill="' + MINT + '" stroke="#6B4B2A" stroke-width="3"/>' +
        '<circle cx="51" cy="40" r="2" fill="#FFFFFF"/><circle cx="73" cy="40" r="2" fill="#FFFFFF"/>',
      front: '',
      back: ''
    };
  },
  // Гайка — изобретатель: шестерёнка на груди
  gear: function () {
    return { head: '', front: gearShape(60, 110, 9, '#B0B7C3'), back: '' };
  },
  // Пиксель — любит светящиеся экраны: светящийся планшет в лапах
  screen: function () {
    return {
      head: '',
      front: '<rect x="66" y="84" width="38" height="28" rx="6" fill="' + MINT + '" opacity="0.35"/>' +
        '<rect x="70" y="88" width="30" height="20" rx="3" fill="#123B4A" stroke="' + INK + '" stroke-width="2"/>' +
        '<rect x="74" y="92" width="5" height="5" fill="' + MINT + '"/>' +
        '<rect x="81" y="92" width="5" height="5" fill="' + GOLD + '"/>' +
        '<rect x="88" y="92" width="5" height="5" fill="' + PINK + '"/>' +
        '<rect x="74" y="99" width="19" height="4" fill="' + MINT + '"/>',
      back: ''
    };
  },
  // Комета — легендарная: звезда с хвостом над шлемом и искорки
  comet: function () {
    return {
      head: '',
      front: '',
      back: '<path d="M2 58 Q12 30 26 20 L18 16 Q6 30 2 58 Z" fill="' + GOLD + '" opacity="0.55"/>' +
        '<path d="M24 22 L27 13 L30 22 L39 23 L32 28 L34 37 L27 32 L20 37 L22 28 L15 23 Z" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.5" stroke-linejoin="round"/>' +
        sparkle(100, 18, 5) + sparkle(110, 44, 3.5) + sparkle(14, 86, 3)
    };
  },
  // Сумрак — мечтатель: месяц у антенны
  moon: function () {
    return {
      head: '',
      front: '',
      back: '<path d="M90 6 A13 13 0 1 0 104 26 A10 10 0 1 1 90 6 Z" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.5"/>' +
        sparkle(18, 20, 3.5) + sparkle(108, 42, 2.5)
    };
  },
  // Янтарь — собирает последние лучи: янтарные глаза и маленькое солнце
  sun: function () {
    let rays = '';
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const x1 = 20 + Math.cos(angle) * 10;
      const y1 = 18 + Math.sin(angle) * 10;
      const x2 = 20 + Math.cos(angle) * 15;
      const y2 = 18 + Math.sin(angle) * 15;
      rays = rays + '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#F6BE98" stroke-width="2.5" stroke-linecap="round"/>';
    }
    return {
      head: '',
      front: '',
      back: rays + '<circle cx="20" cy="18" r="8" fill="#EFC16E" stroke="' + INK + '" stroke-width="1.5"/>'
    };
  },
  // Капитан Звездоус — капитанская фуражка со звездой
  captainCap: function () {
    return {
      head: '<path d="M30 44 Q34 20 60 20 Q86 20 90 44 Z" fill="#6F6AA8" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<rect x="31" y="40" width="58" height="8" rx="3" fill="' + INK + '"/>' +
        '<path d="M38 48 Q60 57 82 48" stroke="' + INK + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
        star(60, 31, 7, GOLD) +
        // пышные капитанские усы
        '<path d="M54 76 Q44 82 36 76 M66 76 Q76 82 84 76" stroke="' + FUR_LIGHT + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
      front: star(96, 104, 5, GOLD) + star(24, 104, 5, GOLD),
      back: ''
    };
  },
  // Капитан Лунная Лапа — корона с месяцем
  crown: function () {
    return {
      head: '<path d="M38 44 L37 22 L48 32 L60 18 L72 32 L83 22 L82 44 Z" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<circle cx="48" cy="38" r="3" fill="' + PINK + '"/><circle cx="72" cy="38" r="3" fill="' + MINT + '"/>' +
        '<path d="M58 28 A5 5 0 1 0 64 35 A4 4 0 1 1 58 28 Z" fill="#FFFFFF"/>',
      front: star(96, 104, 5, GOLD) + star(24, 104, 5, GOLD),
      back: ''
    };
  }
};

// =============================================================
// Детали котов главы 2
// =============================================================
// Функции добавляются в тот же словарь DETAILS (см. выше)

// Волна — сёрфингистка: доска для сёрфинга
DETAILS.surfboard = function () {
  return {
    head: '',
    front: '<g transform="rotate(-20 100 96)">' +
      '<ellipse cx="100" cy="96" rx="9" ry="27" fill="#F6BE98" stroke="' + INK + '" stroke-width="2"/>' +
      '<line x1="100" y1="72" x2="100" y2="120" stroke="#FFFFFF" stroke-width="2.5"/></g>',
    back: '<path d="M4 92 Q14 84 24 92 T44 92" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round"/>'
  };
};

// Капель — любит дождик: зонтик и капли
DETAILS.umbrella = function () {
  return {
    head: '',
    front: '',
    back: '<path d="M2 34 Q22 4 42 34 Q37 29 32 34 Q27 29 22 34 Q17 29 12 34 Q7 29 2 34 Z" fill="#F5D88E" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M22 34 L22 54 Q22 60 17 58" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M100 14 Q96 20 100 22 Q104 20 100 14 Z M110 34 Q106 40 110 42 Q114 40 110 34 Z" fill="#A9D3F0"/>'
  };
};

// Якорь — надёжный боцман: якорь на груди
DETAILS.anchor = function () {
  return {
    head: '',
    front: '<circle cx="60" cy="100" r="3" fill="none" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M60 103 L60 118 M54 107 L66 107 M49 111 Q60 124 71 111" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
    back: ''
  };
};

// Жемчуг — собирает ракушки: ракушка с жемчужиной
DETAILS.shell = function () {
  return {
    head: '',
    front: '<path d="M84 110 Q96 82 108 110 Z" fill="#F8DCE3" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M96 110 L96 90 M90 110 L93 92 M102 110 L99 92" stroke="' + INK + '" stroke-width="1.2" opacity="0.6"/>' +
      '<circle cx="96" cy="104" r="3.5" fill="#FFFFFF" stroke="' + INK + '" stroke-width="1"/>',
    back: ''
  };
};

// Жёлудь — маленький разведчик: шляпка от жёлудя
DETAILS.acornCap = function () {
  return {
    head: '<path d="M34 46 Q60 16 86 46 Z" fill="#8A5A2B" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M44 40 L52 30 M56 42 L64 28 M68 42 L74 33 M50 42 L42 34 M66 40 L58 30" stroke="#5E3A17" stroke-width="2" opacity="0.7"/>' +
      '<path d="M60 22 L63 13" stroke="#5E3A17" stroke-width="3.5" stroke-linecap="round"/>',
    front: '',
    back: ''
  };
};

// Листик — любит прятки: большой лист у уха
DETAILS.leafEar = function () {
  return {
    head: '<path d="M68 44 Q88 12 102 28 Q94 52 68 44 Z" fill="#8CC98A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M70 43 Q86 34 98 30" stroke="#5E9A5E" stroke-width="1.8" fill="none"/>',
    front: '',
    back: ''
  };
};

// Светлячок — освещает путь: фонарик со светом
DETAILS.lantern = function () {
  return {
    head: '',
    front: '<circle cx="98" cy="102" r="16" fill="#F5DFA0" opacity="0.35"/>' +
      '<path d="M91 88 Q98 78 105 88" stroke="' + INK + '" stroke-width="2" fill="none"/>' +
      '<rect x="90" y="88" width="16" height="22" rx="4" fill="#F5DFA0" stroke="' + INK + '" stroke-width="2"/>' +
      '<line x1="90" y1="99" x2="106" y2="99" stroke="' + INK + '" stroke-width="1.2" opacity="0.5"/>',
    back: ''
  };
};

// Компас — никогда не теряется: компас на груди
DETAILS.compass = function () {
  return {
    head: '',
    front: '<circle cx="60" cy="109" r="10" fill="#FFFFFF" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M60 101 L63 109 L60 111 L57 109 Z" fill="#EE9A95"/>' +
      '<path d="M60 117 L63 109 L60 107 L57 109 Z" fill="#6F6AA8"/>',
    back: ''
  };
};

// Бублик — корабельный повар: поварской колпак и бублик
DETAILS.chefHat = function () {
  return {
    head: '<path d="M40 46 L40 36 Q28 28 38 18 Q46 8 60 14 Q74 8 82 18 Q92 28 80 36 L80 46 Z" fill="#FFFFFF" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<line x1="40" y1="40" x2="80" y2="40" stroke="' + INK + '" stroke-width="1.5" opacity="0.5"/>',
    front: '<circle cx="98" cy="104" r="10" fill="#E8A860" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="98" cy="104" r="3.5" fill="' + INK + '" opacity="0.8"/>',
    back: ''
  };
};

// Радар — ловит сигналы: большие наушники
DETAILS.headphones = function () {
  return {
    head: '<path d="M30 60 Q28 22 60 22 Q92 22 90 60" stroke="#4A4E7E" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<rect x="22" y="52" width="13" height="22" rx="6" fill="' + PINK + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="85" y="52" width="13" height="22" rx="6" fill="' + PINK + '" stroke="' + INK + '" stroke-width="2"/>',
    front: '',
    back: '<path d="M100 14 Q108 22 100 30 M106 8 Q118 22 106 36" stroke="' + MINT + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
  };
};

// Закат — художник: кисть и палитра
DETAILS.brush = function () {
  return {
    head: '',
    front: '<ellipse cx="22" cy="104" rx="13" ry="9" fill="#F5E6C8" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="16" cy="102" r="2.5" fill="#EE9A95"/><circle cx="23" cy="99" r="2.5" fill="#F5D88E"/><circle cx="29" cy="104" r="2.5" fill="#9C84D4"/>' +
      '<line x1="88" y1="118" x2="104" y2="90" stroke="#8A5A2B" stroke-width="4" stroke-linecap="round"/>' +
      '<ellipse cx="106" cy="86" rx="4" ry="6" fill="#F6BE98" stroke="' + INK + '" stroke-width="1.5" transform="rotate(30 106 86)"/>',
    back: ''
  };
};

// Орбита — легендарная: кольцо вокруг, как у планеты, и маленькая планета
DETAILS.planetRing = function () {
  return {
    head: '',
    front: '',
    back: '<ellipse cx="60" cy="62" rx="58" ry="15" fill="none" stroke="' + GOLD + '" stroke-width="4" opacity="0.8" transform="rotate(-15 60 62)"/>' +
      '<circle cx="104" cy="16" r="8" fill="#F6BE98" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<ellipse cx="104" cy="16" rx="13" ry="3.5" fill="none" stroke="' + GOLD + '" stroke-width="2"/>' +
      sparkle(16, 22, 4) + sparkle(12, 86, 3)
  };
};

// Адмирал Гром — адмиральская двууголка
DETAILS.bicorne = function () {
  return {
    head: '<path d="M24 48 Q60 6 96 48 Q60 36 24 48 Z" fill="' + INK + '" stroke="' + GOLD + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<circle cx="60" cy="34" r="6" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.5"/>' +
      // пышные усы
      '<path d="M54 76 Q44 82 34 76 M66 76 Q76 82 86 76" stroke="' + FUR_LIGHT + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
    front: star(96, 104, 5, GOLD) + star(24, 104, 5, GOLD),
    back: ''
  };
};

// Капитан Туманность — знает все звёзды: подзорная труба
DETAILS.telescope = function () {
  return {
    head: '',
    front: '<g transform="rotate(-35 96 102)">' +
      '<rect x="80" y="96" width="30" height="11" rx="3" fill="#B9A6E0" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="108" y="93" width="8" height="17" rx="2" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="2"/></g>' +
      star(24, 104, 5, GOLD),
    back: sparkle(104, 14, 5) + sparkle(16, 24, 3.5) + sparkle(110, 40, 2.5)
  };
};

// Шестерёнка: круг с зубцами и дыркой в центре
function gearShape(cx, cy, r, color) {
  let teeth = '';
  for (let i = 0; i < 8; i++) {
    const angle = i * 45;
    teeth = teeth + '<rect x="' + (cx - 2.5) + '" y="' + (cy - r - 4) + '" width="5" height="6" fill="' + color + '" stroke="' + INK + '" stroke-width="1.5" transform="rotate(' + angle + ' ' + cx + ' ' + cy + ')"/>';
  }
  return teeth +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + color + '" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r / 2.5) + '" fill="' + INK + '"/>';
}

// Пятиконечная звезда с центром (cx, cy) и радиусом r
function star(cx, cy, r, color) {
  let points = '';
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    points = points + (cx + Math.cos(angle) * radius).toFixed(1) + ',' + (cy + Math.sin(angle) * radius).toFixed(1) + ' ';
  }
  return '<polygon points="' + points.trim() + '" fill="' + color + '" stroke="' + INK + '" stroke-width="1.2" stroke-linejoin="round"/>';
}

// Искорка-«крестик»
function sparkle(cx, cy, r) {
  return '<path d="M' + cx + ' ' + (cy - r) + ' Q' + cx + ' ' + cy + ' ' + (cx + r) + ' ' + cy +
    ' Q' + cx + ' ' + cy + ' ' + cx + ' ' + (cy + r) + ' Q' + cx + ' ' + cy + ' ' + (cx - r) + ' ' + cy +
    ' Q' + cx + ' ' + cy + ' ' + cx + ' ' + (cy - r) + ' Z" fill="#FFFFFF"/>';
}

// =============================================================
// Капсула с котом (для карты)
// =============================================================
// Жёлто-фиолетовая капсула с окошком, в окошке видны кошачьи ушки.
// Холст 40×54.
function capsuleIcon() {
  return '<svg class="map-icon" viewBox="0 0 40 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    // антенна
    '<line x1="20" y1="6" x2="20" y2="1.5" stroke="' + FUR_LIGHT + '" stroke-width="2"/>' +
    '<circle cx="20" cy="2.5" r="2.3" fill="' + PINK + '"/>' +
    // крылышки внизу
    '<path d="M5 40 L1 52 L10 47 Z M35 40 L39 52 L30 47 Z" fill="' + PINK + '" stroke="' + FUR_LIGHT + '" stroke-width="1.5" stroke-linejoin="round"/>' +
    // корпус: сверху жёлтый, снизу фиолетовый
    '<path d="M4 24 Q4 6 20 6 Q36 6 36 24 L36 30 L4 30 Z" fill="' + GOLD + '" stroke="' + FUR_LIGHT + '" stroke-width="2.5"/>' +
    '<path d="M4 30 L36 30 L36 42 Q36 50 28 50 L12 50 Q4 50 4 42 Z" fill="#4A4E7E" stroke="' + FUR_LIGHT + '" stroke-width="2.5"/>' +
    // окошко с котом
    '<circle cx="20" cy="21" r="9" fill="' + MINT + '" stroke="' + FUR_LIGHT + '" stroke-width="2"/>' +
    '<path d="M13.5 27 L14 16 L18.5 20 L21.5 20 L26 16 L26.5 27 Z" fill="' + INK + '" opacity="0.75"/>' +
    // огоньки на корпусе
    '<circle cx="12" cy="40" r="2" fill="' + MINT + '"/><circle cx="20" cy="40" r="2" fill="' + GOLD + '"/><circle cx="28" cy="40" r="2" fill="' + PINK + '"/>' +
    '</svg>';
}

// =============================================================
// Маяк (для карты)
// =============================================================
// Полосатая башенка. Наверху — будка с кошачьими ушками и огоньком
// (огонёк мигает, анимация в style.css: класс beacon-light). Холст 36×64.
function beaconIcon() {
  return '<svg class="map-icon" viewBox="0 0 36 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    // свечение огонька
    '<circle class="beacon-light" cx="18" cy="13" r="11" fill="' + GOLD + '" opacity="0.45"/>' +
    // ушки на крыше
    '<path d="M8 12 L9 2 L15 8 Z M28 12 L27 2 L21 8 Z" fill="' + PINK + '" stroke="' + FUR_LIGHT + '" stroke-width="1.5" stroke-linejoin="round"/>' +
    // будка с огоньком
    '<rect x="8" y="7" width="20" height="14" rx="6" fill="#4A4E7E" stroke="' + FUR_LIGHT + '" stroke-width="2"/>' +
    '<circle class="beacon-light" cx="18" cy="14" r="4.5" fill="' + GOLD + '"/>' +
    // башня в полоску (мятный и фиолетовый)
    '<path d="M10 21 L26 21 L27.5 32 L8.5 32 Z" fill="' + MINT + '" stroke="' + FUR_LIGHT + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M8.5 32 L27.5 32 L29 43 L7 43 Z" fill="#4A4E7E" stroke="' + FUR_LIGHT + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M7 43 L29 43 L30.5 54 L5.5 54 Z" fill="' + MINT + '" stroke="' + FUR_LIGHT + '" stroke-width="2" stroke-linejoin="round"/>' +
    // основание
    '<rect x="3" y="54" width="30" height="8" rx="4" fill="' + PINK + '" stroke="' + FUR_LIGHT + '" stroke-width="2"/>' +
    '</svg>';
}

// =============================================================
// Убежище — уютный отсек космического корабля (режим «Дом»)
// =============================================================
// Холст 400×700. Сверху — стена с большим иллюминатором (за ним звёзды
// и планета), слева пульт с огоньками, справа космическое растение,
// снизу (с середины) — пол с круглым ковриком и подушками. Коты стоят
// на полу — их кнопки кладёт home.js поверх этой картинки.
function shelterScene() {
  // Звёзды за иллюминатором: координаты заданы вручную, чтобы картинка
  // была всегда одинаковой
  const stars = [[140, 110], [170, 80], [230, 95], [260, 150], [150, 200], [250, 230],
    [120, 160], [210, 250], [275, 110], [190, 140], [130, 230], [230, 180]];
  let starDots = '';
  for (let i = 0; i < stars.length; i++) {
    starDots = starDots + '<circle cx="' + stars[i][0] + '" cy="' + stars[i][1] + '" r="' + (i % 3 === 0 ? 2.5 : 1.5) + '" fill="#FFFFFF"/>';
  }
  // Болты вокруг иллюминатора
  let bolts = '';
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    bolts = bolts + '<circle cx="' + (200 + Math.cos(angle) * 122).toFixed(1) + '" cy="' + (165 + Math.sin(angle) * 122).toFixed(1) + '" r="4" fill="#C9C4E2"/>';
  }
  // Панели на стене — сетка прямоугольников
  let panels = '';
  for (let x = 0; x < 400; x = x + 80) {
    for (let y = 0; y < 360; y = y + 90) {
      panels = panels + '<rect x="' + (x + 4) + '" y="' + (y + 4) + '" width="72" height="82" rx="8" fill="none" stroke="#565A8C" stroke-width="3"/>';
    }
  }
  // Полоски пола (как доски, уходящие вдаль)
  let floorLines = '';
  for (let x = -200; x <= 600; x = x + 60) {
    floorLines = floorLines + '<line x1="' + (200 + (x - 200) * 0.45).toFixed(0) + '" y1="360" x2="' + x + '" y2="700" stroke="#61669A" stroke-width="2"/>';
  }

  return '<svg class="shelter-scene" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    // стена
    '<rect x="0" y="0" width="400" height="360" fill="#4A4E7E"/>' +
    panels +
    // трубы под потолком
    '<path d="M0 22 H400 M0 34 H400" stroke="#6F6AA8" stroke-width="7"/>' +
    '<circle cx="60" cy="28" r="7" fill="#9FD8C8"/><circle cx="340" cy="28" r="7" fill="#F5D88E"/>' +
    // иллюминатор
    '<circle cx="200" cy="165" r="130" fill="#9A96B4" stroke="#FAF7F2" stroke-width="4"/>' +
    '<circle cx="200" cy="165" r="112" fill="#2A2C4C" stroke="#34375F" stroke-width="6"/>' +
    starDots +
    // планета с кольцом и маленькая луна
    '<ellipse cx="238" cy="200" rx="52" ry="12" fill="none" stroke="#F5D88E" stroke-width="4" transform="rotate(-18 238 200)"/>' +
    '<circle cx="238" cy="200" r="32" fill="#F6BE98"/>' +
    '<path d="M210 190 Q238 180 266 195" stroke="#F4A7B9" stroke-width="5" fill="none"/>' +
    '<circle cx="150" cy="120" r="12" fill="#E3DAF5"/>' +
    '<path d="M110 90 Q140 60 190 64" stroke="#FFFFFF" stroke-width="6" opacity="0.25" fill="none" stroke-linecap="round"/>' +
    bolts +
    // (пульт и растение раньше были нарисованы здесь — теперь игрок сам
    // обставляет убежище, см. decor.js)
    // пол
    '<rect x="0" y="360" width="400" height="340" fill="#555A8A"/>' +
    floorLines +
    '<rect x="0" y="352" width="400" height="10" fill="#FAF7F2" opacity="0.8"/>' +
    // круглый коврик
    '<ellipse cx="200" cy="540" rx="185" ry="105" fill="#F4A7B9" opacity="0.35"/>' +
    '<ellipse cx="200" cy="540" rx="150" ry="80" fill="none" stroke="#F5D88E" stroke-width="4" stroke-dasharray="10 10" opacity="0.7"/>' +
    // подушки-лежанки
    '<ellipse cx="60" cy="660" rx="54" ry="20" fill="#9FD8C8" opacity="0.7"/>' +
    '<ellipse cx="340" cy="660" rx="54" ry="20" fill="#F5D88E" opacity="0.7"/>' +
    '</svg>';
}

// =============================================================
// Взлёт корабля (финал главы)
// =============================================================
// Холст 400×600. Корабль с иллюминаторами, в иллюминаторах — портреты
// котов экипажа, рядом с каждым — машущая лапка. crewIds — id котов
// (показываем до 6, остальных — надписью «…и ещё N»).
// Анимацию (тряска, полёт вверх, пламя, лапки) задаёт style.css
// по классам launch-ship, launch-flame, launch-paw.
const LAUNCH_PORTHOLES = [[150, 230], [250, 230], [150, 310], [250, 310], [150, 390], [250, 390]];

function launchScene(crewIds) {
  artIdCounter = artIdCounter + 1;
  const uid = 'launch' + artIdCounter;

  // Звёзды на небе
  const stars = [[40, 60], [90, 140], [330, 50], [370, 170], [60, 300], [350, 330], [200, 40], [120, 30], [290, 110]];
  let sky = '';
  for (let i = 0; i < stars.length; i++) {
    sky = sky + '<circle cx="' + stars[i][0] + '" cy="' + stars[i][1] + '" r="' + (i % 2 === 0 ? 2.5 : 1.5) + '" fill="#FFFFFF"/>';
  }

  // Иллюминаторы с котами и машущими лапками
  let windows = '';
  let clips = '';
  const shown = Math.min(crewIds.length, LAUNCH_PORTHOLES.length);
  for (let i = 0; i < LAUNCH_PORTHOLES.length; i++) {
    const x = LAUNCH_PORTHOLES[i][0];
    const y = LAUNCH_PORTHOLES[i][1];
    clips = clips + '<clipPath id="' + uid + '-c' + i + '"><circle cx="' + x + '" cy="' + y + '" r="32"/></clipPath>';
    windows = windows + '<circle cx="' + x + '" cy="' + y + '" r="36" fill="#2A2C4C" stroke="#FAF7F2" stroke-width="5"/>';
    if (i < shown) {
      // Портрет кота внутри иллюминатора (вложенная картинка SVG)
      const portrait = catPortrait(crewIds[i]).replace('<svg class="portrait"',
        '<svg x="' + (x - 34) + '" y="' + (y - 32) + '" width="68" height="68"');
      windows = windows + '<g clip-path="url(#' + uid + '-c' + i + ')">' + portrait + '</g>';
      // Лапка машет: снаружи иллюминатора, со стороны края корабля
      const pawX = x < 200 ? x - 42 : x + 42;
      windows = windows + '<g class="launch-paw">' +
        '<ellipse cx="' + pawX + '" cy="' + (y - 4) + '" rx="8" ry="11" fill="#F5D88E" stroke="#34375F" stroke-width="2"/>' +
        '<circle cx="' + (pawX - 4) + '" cy="' + (y - 13) + '" r="2.5" fill="#F4A7B9"/>' +
        '<circle cx="' + (pawX + 4) + '" cy="' + (y - 13) + '" r="2.5" fill="#F4A7B9"/></g>';
    }
  }
  let more = '';
  if (crewIds.length > shown) {
    more = '<text x="200" y="455" text-anchor="middle" font-size="18" font-weight="700" font-family="sans-serif" fill="#FAF7F2">…и ещё ' + (crewIds.length - shown) + '</text>';
  }

  return '<svg class="launch-svg" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<defs>' + clips + '</defs>' +
    '<rect width="400" height="600" fill="#34375F"/>' + sky +
    // планета Земля внизу
    '<ellipse cx="200" cy="640" rx="330" ry="120" fill="#A9D3F0"/>' +
    '<path d="M-20 560 Q60 530 120 555 T260 548 Q330 530 420 560 L420 600 L-20 600 Z" fill="#B5E2B0"/>' +
    '<g class="launch-ship">' +
    // пламя из дюз
    '<path class="launch-flame" d="M165 500 Q200 590 235 500 Z" fill="#F6BE98"/>' +
    '<path class="launch-flame" d="M180 500 Q200 560 220 500 Z" fill="#F5D88E"/>' +
    // крылья
    '<path d="M110 420 L60 500 L120 480 Z M290 420 L340 500 L280 480 Z" fill="#F4A7B9" stroke="#FAF7F2" stroke-width="4" stroke-linejoin="round"/>' +
    // корпус с носом и кошачьими ушками на носу
    '<path d="M110 480 L110 220 Q110 120 200 80 Q290 120 290 220 L290 480 Q290 505 265 505 L135 505 Q110 505 110 480 Z" fill="#F5D88E" stroke="#FAF7F2" stroke-width="5"/>' +
    '<path d="M168 104 L176 70 L196 88 Z M232 104 L224 70 L204 88 Z" fill="#F4A7B9" stroke="#FAF7F2" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="110" y="440" width="180" height="22" fill="#4A4E7E"/>' +
    windows + more +
    '</g>' +
    '</svg>';
}

// =============================================================
// Картинки для мини-игр
// =============================================================
// Рыбка (для «Поймай рыбок»). Холст 40×28.
function fishSprite() {
  return '<svg class="sprite" viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M28 14 L39 5 L37 14 L39 23 Z" fill="#F6BE98" stroke="' + INK + '" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<ellipse cx="17" cy="14" rx="15" ry="10" fill="#F5D88E" stroke="' + INK + '" stroke-width="1.5"/>' +
    '<path d="M14 6 Q18 14 14 22" stroke="#F6BE98" stroke-width="2" fill="none"/>' +
    '<circle cx="8" cy="12" r="2.2" fill="' + INK + '"/><circle cx="8.6" cy="11.3" r="0.7" fill="#FFFFFF"/>' +
    '</svg>';
}

// Светлячок (для «Повтори узор»). color — цвет брюшка. Холст 60×60.
function fireflySprite(color) {
  return '<svg class="sprite" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<ellipse cx="18" cy="24" rx="12" ry="7" fill="#FAF7F2" fill-opacity="0.75" transform="rotate(-25 18 24)"/>' +
    '<ellipse cx="42" cy="24" rx="12" ry="7" fill="#FAF7F2" fill-opacity="0.75" transform="rotate(25 42 24)"/>' +
    '<circle class="firefly-glow" cx="30" cy="38" r="13" fill="' + color + '"/>' +
    '<circle cx="30" cy="22" r="8" fill="' + INK + '"/>' +
    '<circle cx="27" cy="21" r="1.6" fill="#FFFFFF"/><circle cx="33" cy="21" r="1.6" fill="#FFFFFF"/>' +
    '<path d="M26 15 L22 7 M34 15 L38 7" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';
}

// Звезда для «Созвездия» (с номером рисует minigames.js). Холст 40×40.
function starSprite() {
  return '<svg class="sprite" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    star(20, 20, 18, GOLD) + '</svg>';
}

// Иконки ингредиентов. Холст 48×48.
function ingredientIcon(id) {
  const open = '<svg class="sprite" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  let body = '';
  if (id === 'flour') {
    // мешочек муки со звёздочкой
    body = '<path d="M12 18 Q10 42 24 44 Q38 42 36 18 Z" fill="#FAF7F2" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M14 18 Q24 10 34 18" stroke="#E8C49A" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      star(24, 31, 7, GOLD);
  } else if (id === 'milk') {
    // бутылочка молока с месяцем
    body = '<rect x="18" y="6" width="12" height="7" rx="2" fill="#A9D3F0" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M16 14 L32 14 L34 22 L34 42 Q34 44 32 44 L16 44 Q14 44 14 42 L14 22 Z" fill="#FAF7F2" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M26 26 A6 6 0 1 0 28 36 A5 5 0 1 1 26 26 Z" fill="#F5D88E"/>';
  } else if (id === 'mint') {
    // листики мяты
    body = '<path d="M24 44 L24 22" stroke="#5E9A5E" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M24 24 Q8 22 10 8 Q24 10 24 24 Z" fill="#9FD8C8" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M24 30 Q40 28 38 14 Q24 16 24 30 Z" fill="#B5E2B0" stroke="' + INK + '" stroke-width="2"/>';
  } else if (id === 'sugar') {
    // кристаллики сахара-метеорита
    body = '<path d="M8 36 L16 22 L26 30 L20 42 Z" fill="#E3DAF5" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M22 20 L30 8 L40 18 L34 30 Z" fill="#FAF7F2" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M28 38 L34 30 L42 36 L36 44 Z" fill="#F8DCE3" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>';
  } else {
    // туманные ягоды
    body = '<path d="M24 6 Q26 14 22 18" stroke="#5E9A5E" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="17" cy="28" r="9" fill="#C2B0E8" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="31" cy="28" r="9" fill="#9C84D4" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="24" cy="38" r="8" fill="#C2B0E8" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="14" cy="25" r="2" fill="#FFFFFF"/><circle cx="28" cy="25" r="2" fill="#FFFFFF"/>';
  }
  return open + body + '</svg>';
}

// Угощения с кошачьей кухни. Холст 48×48.
function treatIcon(id) {
  const open = '<svg class="sprite" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  let body = '';
  if (id === 'star-cookie') {
    body = '<circle cx="24" cy="24" r="18" fill="#E8C49A" stroke="' + INK + '" stroke-width="2"/>' + star(24, 24, 9, GOLD);
  } else if (id === 'moon-pudding') {
    body = '<path d="M8 38 Q8 12 24 12 Q40 12 40 38 Z" fill="#F9EDC9" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M10 22 Q24 16 38 22" stroke="#E8C49A" stroke-width="5" fill="none"/>' +
      '<rect x="4" y="37" width="40" height="6" rx="3" fill="#A9D3F0" stroke="' + INK + '" stroke-width="2"/>';
  } else if (id === 'mint-jelly') {
    body = '<path d="M10 40 Q8 16 16 14 Q20 10 24 14 Q28 10 32 14 Q40 16 38 40 Z" fill="#9FD8C8" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M16 22 Q18 18 22 20" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
  } else if (id === 'berry-pie') {
    body = '<path d="M6 32 Q24 4 42 32 Z" fill="#E8C49A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M6 32 L42 32 L38 40 L10 40 Z" fill="#C9A47C" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="20" cy="25" r="3" fill="#9C84D4"/><circle cx="28" cy="25" r="3" fill="#9C84D4"/>';
  } else if (id === 'fish-cake') {
    body = '<path d="M30 24 L44 14 L42 24 L44 34 Z" fill="#F6BE98" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<ellipse cx="20" cy="24" rx="17" ry="12" fill="#E8C49A" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="11" cy="21" r="2.2" fill="' + INK + '"/>';
  } else {
    body = '<path d="M4 24 L12 16 L12 32 Z M44 24 L36 16 L36 32 Z" fill="#F4A7B9" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<ellipse cx="24" cy="24" rx="13" ry="10" fill="#C2B0E8" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M16 20 Q24 30 32 20" stroke="#FAF7F2" stroke-width="2.5" fill="none"/>';
  }
  return open + body + '</svg>';
}

// Миска для «Смешать» (холст 200×200)
function bowlPicture() {
  return '<svg class="sprite" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<circle cx="100" cy="100" r="92" fill="#DCEBF6" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="100" cy="100" r="70" fill="#F9EDC9"/>' +
    '<path d="M60 100 Q80 70 100 100 T140 100" stroke="#E8C49A" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="100" cy="100" r="8" fill="#E8C49A"/>' +
    '</svg>';
}

// Тесто для «Слепить» (холст 120×120)
function doughPicture() {
  return '<svg class="sprite" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<ellipse cx="60" cy="68" rx="48" ry="36" fill="#F9EDC9" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M36 60 Q44 52 52 58 M68 56 Q78 50 86 58" stroke="#E8C49A" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '</svg>';
}

// Духовка для «Испечь»: окошко светится мягким светом (класс oven-light).
// Никакого огня — только тёплый свет. Холст 200×180.
function ovenPicture() {
  return '<svg class="sprite" viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<rect x="14" y="10" width="172" height="160" rx="20" fill="#E3DAF5" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="45" cy="34" r="8" fill="#F4A7B9" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="75" cy="34" r="8" fill="#9FD8C8" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="34" y="56" width="132" height="96" rx="14" fill="#6F6AA8" stroke="' + INK + '" stroke-width="4"/>' +
    '<rect class="oven-light" x="40" y="62" width="120" height="84" rx="10" fill="#F5D88E"/>' +
    '<path d="M100 110 m-24 0 a24 14 0 1 0 48 0 a24 14 0 1 0 -48 0" fill="#E8C49A" stroke="' + INK + '" stroke-width="2"/>' +
    '</svg>';
}

// Пузырь (его ловить нельзя). Холст 32×32.
function bubbleSprite() {
  return '<svg class="sprite" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<circle cx="16" cy="16" r="13" fill="#DCEBF6" fill-opacity="0.5" stroke="#FAF7F2" stroke-width="2.5"/>' +
    '<path d="M9 12 Q11 8 15 7" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '</svg>';
}

// Корзинка с кошачьими ушками. Холст 100×44.
function basketSprite() {
  return '<svg class="sprite" viewBox="0 0 100 44" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M14 10 L20 0 L28 10 Z M86 10 L80 0 L72 10 Z" fill="' + PINK + '"/>' +
    '<path d="M4 10 L96 10 L86 42 L14 42 Z" fill="#E8C49A" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M9 20 L91 20 M12 30 L88 30 M30 10 L34 42 M50 10 L50 42 M70 10 L66 42" stroke="#B98E62" stroke-width="2"/>' +
    '</svg>';
}

// =============================================================
// Ремонт корабля: картинки отсеков для пазла и корабль со шкалой
// =============================================================
// Картинка отсека рисуется на холсте ширины width (240 — пазл 2×2,
// 360 — пазл 3×2) и высоты 240. Функция отдаёт только «внутренность»
// SVG: repair.js сам режет её на кусочки (у каждого кусочка свой viewBox).
// В каждом кусочке есть что-то несимметричное (трубы, звёзды, надписи),
// чтобы было видно, как кусочек должен стоять.
const COMPARTMENT_NAMES = ['Иллюминатор', 'Пульт управления', 'Двигатель'];

function compartmentPicture(variant, width) {
  const w = width;
  const cx = w / 2;
  // Общий фон: стена отсека с полосой и заклёпками по краям
  let back = '<rect width="' + w + '" height="240" fill="#E3DAF5"/>' +
    '<rect y="200" width="' + w + '" height="40" fill="#C9BEE8"/>' +
    '<path d="M0 30 L' + w + ' 30" stroke="#C9BEE8" stroke-width="10"/>';
  for (let x = 14; x < w; x = x + 40) {
    back = back + '<circle cx="' + x + '" cy="14" r="4" fill="#B3A6DC"/>' +
      '<circle cx="' + x + '" cy="220" r="4" fill="#9C8FCC"/>';
  }
  // Труба слева сверху вниз и кошачья мордочка-наклейка в левом верхнем углу
  back = back + '<path d="M18 40 L18 180 Q18 196 34 196 L' + (w - 30) + ' 196" stroke="' + MINT + '" stroke-width="12" fill="none" stroke-linecap="round"/>' +
    '<path d="M40 44 L46 32 L52 44 Z M60 44 L66 32 L72 44 Z" fill="' + PINK + '"/>' +
    '<circle cx="56" cy="54" r="14" fill="' + PINK + '"/>' +
    '<circle cx="51" cy="52" r="2.5" fill="' + INK + '"/><circle cx="61" cy="52" r="2.5" fill="' + INK + '"/>';

  let front = '';
  if (variant === 0) {
    // Большой круглый иллюминатор: ночное небо, месяц, звёзды, планета
    front = '<circle cx="' + cx + '" cy="112" r="78" fill="' + INK + '" stroke="#FAF7F2" stroke-width="10"/>' +
      '<circle cx="' + (cx + 28) + '" cy="80" r="20" fill="' + GOLD + '"/>' +
      '<circle cx="' + (cx + 38) + '" cy="74" r="18" fill="' + INK + '"/>' +
      '<circle cx="' + (cx - 30) + '" cy="140" r="22" fill="#A9D3F0"/>' +
      '<path d="M' + (cx - 50) + ' 140 Q' + (cx - 30) + ' 128 ' + (cx - 10) + ' 140" stroke="#B5E2B0" stroke-width="7" fill="none"/>' +
      star(cx - 40, 70, 8, GOLD) + star(cx + 40, 150, 6, GOLD) + sparkle(cx, 100, 6) +
      '<circle cx="' + (cx - 74) + '" cy="112" r="5" fill="#9C8FCC"/><circle cx="' + (cx + 74) + '" cy="112" r="5" fill="#9C8FCC"/>';
  } else if (variant === 1) {
    // Пульт: экран с кошачьими ушками, ряды кнопок, рычаг
    front = '<rect x="' + (cx - 90) + '" y="50" width="180" height="90" rx="14" fill="' + INK + '" stroke="#FAF7F2" stroke-width="6"/>' +
      '<path d="M' + (cx - 60) + ' 120 L' + (cx - 30) + ' 90 L' + cx + ' 110 L' + (cx + 30) + ' 70 L' + (cx + 60) + ' 96" stroke="' + MINT + '" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      star(cx + 60, 70, 7, GOLD) +
      '<rect x="' + (cx - 90) + '" y="150" width="180" height="40" rx="10" fill="#6F6AA8"/>' +
      '<circle cx="' + (cx - 60) + '" cy="170" r="10" fill="' + PINK + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="' + (cx - 30) + '" cy="170" r="10" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="' + (cx - 8) + '" y="162" width="36" height="16" rx="5" fill="' + MINT + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M' + (cx + 58) + ' 182 L' + (cx + 72) + ' 150" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>' +
      '<circle cx="' + (cx + 72) + '" cy="148" r="8" fill="' + PINK + '" stroke="' + INK + '" stroke-width="2"/>';
  } else {
    // Двигатель: шестерёнки, бак со стрелкой-указателем, звёздочки-искры
    front = '<rect x="' + (cx - 40) + '" y="46" width="80" height="140" rx="30" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="4"/>' +
      '<circle cx="' + cx + '" cy="90" r="22" fill="#FAF7F2" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M' + cx + ' 90 L' + (cx + 14) + ' 76" stroke="' + PINK + '" stroke-width="4" stroke-linecap="round"/>' +
      '<rect x="' + (cx - 26) + '" y="130" width="52" height="12" rx="6" fill="' + PINK + '"/>' +
      '<rect x="' + (cx - 26) + '" y="152" width="34" height="12" rx="6" fill="' + MINT + '"/>' +
      gearShape(cx - 78, 80, 22, MINT) + gearShape(cx + 76, 150, 18, PINK) + gearShape(cx + 84, 70, 12, '#FAF7F2') +
      sparkle(cx - 70, 160, 7) + star(cx - 86, 130, 6, GOLD);
  }
  // Номер отсека в правом нижнем углу — ещё одна подсказка, где низ
  return back + front +
    '<text x="' + (w - 14) + '" y="232" text-anchor="end" font-size="16" font-weight="700" font-family="sans-serif" fill="' + INK + '">▲ верх</text>';
}

// Корабль со шкалой ремонта: серый силуэт, снизу вверх «заливается»
// цветом по мере установки деталей. share — доля от 0 до 1. Холст 200×240.
function repairShipPicture(share) {
  artIdCounter = artIdCounter + 1;
  const uid = 'ship' + artIdCounter;
  const fillTop = 220 - Math.round(200 * Math.max(0, Math.min(1, share)));
  const body = 'M60 200 L60 90 Q60 40 100 20 Q140 40 140 90 L140 200 Q140 212 128 212 L72 212 Q60 212 60 200 Z';
  const wings = 'M60 160 L30 205 L62 195 Z M140 160 L170 205 L138 195 Z';
  return '<svg class="sprite" viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<defs><clipPath id="' + uid + '"><rect x="0" y="' + fillTop + '" width="200" height="240"/></clipPath></defs>' +
    // серый силуэт — сколько ещё чинить
    '<path d="' + wings + '" fill="#6F6AA8"/><path d="' + body + '" fill="#6F6AA8"/>' +
    // цветная часть — что уже починено
    '<g clip-path="url(#' + uid + ')">' +
    '<path d="' + wings + '" fill="' + PINK + '"/><path d="' + body + '" fill="' + GOLD + '"/>' +
    '<path d="M84 34 L88 16 L98 26 Z M116 34 L112 16 L102 26 Z" fill="' + PINK + '"/>' +
    '</g>' +
    '<path d="' + body + '" fill="none" stroke="#FAF7F2" stroke-width="4"/>' +
    '<circle cx="100" cy="90" r="16" fill="' + INK + '" stroke="#FAF7F2" stroke-width="4"/>' +
    '<circle cx="100" cy="140" r="16" fill="' + INK + '" stroke="#FAF7F2" stroke-width="4"/>' +
    '</svg>';
}

// =============================================================
// Игры с котами: точка «лазерной указки» и мячик
// =============================================================
// Мягкая розовая точка со свечением. Холст 40×40.
function laserDotSprite() {
  return '<svg class="sprite" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<circle cx="20" cy="20" r="18" fill="' + PINK + '" fill-opacity="0.35"/>' +
    '<circle cx="20" cy="20" r="11" fill="' + PINK + '" fill-opacity="0.6"/>' +
    '<circle cx="20" cy="20" r="6" fill="#FFFFFF"/>' +
    '</svg>';
}

// Мячик-клубок: мятный с полосками и звёздочкой. Холст 40×40.
function toyBallSprite() {
  return '<svg class="sprite" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<circle cx="20" cy="20" r="17" fill="' + MINT + '" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M6 14 Q20 22 34 14 M6 26 Q20 18 34 26" stroke="#FAF7F2" stroke-width="3" fill="none"/>' +
    star(20, 20, 5, GOLD) +
    '</svg>';
}

// =============================================================
// Обстановка убежища: 12 предметов магазина
// =============================================================
// Холст 64×64. Все предметы нарисованы мягкими цветами палитры.
function decorIcon(id) {
  const open = '<svg class="sprite" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  const line = ' stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"';
  let body = '';
  if (id === 'rug') {
    // Мягкий коврик: овал с полосками и бахромой
    body = '<ellipse cx="32" cy="40" rx="28" ry="14" fill="' + PINK + '"' + line + '/>' +
      '<ellipse cx="32" cy="40" rx="18" ry="8" fill="none" stroke="' + GOLD + '" stroke-width="3"/>' +
      '<ellipse cx="32" cy="40" rx="8" ry="3.5" fill="' + MINT + '"/>';
  } else if (id === 'yarn') {
    // Корзинка с клубками
    body = '<circle cx="22" cy="28" r="10" fill="' + PINK + '"' + line + '/>' +
      '<circle cx="40" cy="26" r="11" fill="' + MINT + '"' + line + '/>' +
      '<path d="M16 26 Q22 20 28 30 M34 22 Q42 30 48 24" stroke="#FAF7F2" stroke-width="2" fill="none"/>' +
      '<path d="M8 34 L56 34 L50 58 L14 58 Z" fill="#E8C49A"' + line + '/>' +
      '<path d="M12 44 L52 44 M24 34 L26 58 M40 34 L38 58" stroke="#B98E62" stroke-width="2"/>';
  } else if (id === 'poster') {
    // Звёздная карта в рамке: созвездие-кошка
    body = '<rect x="8" y="8" width="48" height="48" rx="6" fill="' + INK + '" stroke="' + GOLD + '" stroke-width="4"/>' +
      '<path d="M18 40 L24 24 L32 32 L40 24 L46 40 Z" stroke="#9FD8C8" stroke-width="1.5" fill="none" stroke-dasharray="3 3"/>' +
      star(18, 40, 4, GOLD) + star(24, 24, 4, GOLD) + star(40, 24, 4, GOLD) + star(46, 40, 4, GOLD) + star(32, 32, 3, '#FAF7F2');
  } else if (id === 'cushion') {
    // Подушка-облачко
    body = '<path d="M12 46 Q4 46 6 38 Q8 30 16 32 Q16 20 28 22 Q34 12 44 20 Q56 20 54 32 Q62 36 56 46 Z" fill="#DCEBF6"' + line + '/>' +
      '<circle cx="26" cy="36" r="2" fill="' + INK + '"/><circle cx="38" cy="36" r="2" fill="' + INK + '"/>' +
      '<path d="M29 41 Q32 44 35 41" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>';
  } else if (id === 'lamp') {
    // Лампа-луна на подставке
    body = '<circle cx="32" cy="24" r="16" fill="' + GOLD + '" opacity="0.35"/>' +
      '<path d="M38 10 A14 14 0 1 0 38 38 A20 20 0 0 1 38 10 Z" fill="' + GOLD + '"' + line + '/>' +
      '<path d="M32 38 L32 54" stroke="' + INK + '" stroke-width="3"/>' +
      '<ellipse cx="32" cy="56" rx="12" ry="4" fill="' + MINT + '"' + line + '/>';
  } else if (id === 'scratcher') {
    // Когтеточка: столбик в верёвке и мячик на ниточке
    body = '<rect x="24" y="10" width="14" height="42" rx="3" fill="#E8C49A"' + line + '/>' +
      '<path d="M24 18 L38 16 M24 26 L38 24 M24 34 L38 32 M24 42 L38 40" stroke="#B98E62" stroke-width="2"/>' +
      '<rect x="12" y="50" width="38" height="8" rx="3" fill="' + PINK + '"' + line + '/>' +
      '<path d="M38 14 Q48 16 48 30" stroke="' + INK + '" stroke-width="1.5" fill="none"/>' +
      '<circle cx="48" cy="33" r="4" fill="' + MINT + '"' + line + '/>';
  } else if (id === 'plant') {
    // Цветок в горшке (лесной)
    body = '<path d="M32 40 Q28 24 18 18 M32 40 Q34 22 44 14 M32 40 Q40 30 50 30" stroke="#B5E2B0" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<circle cx="18" cy="17" r="5" fill="' + PINK + '"/><circle cx="44" cy="13" r="5" fill="' + GOLD + '"/><circle cx="50" cy="30" r="4" fill="' + MINT + '"/>' +
      '<path d="M18 40 L46 40 L42 58 L22 58 Z" fill="#F6BE98"' + line + '/>';
  } else if (id === 'globe') {
    // Глобус Земли на подставке
    body = '<circle cx="32" cy="28" r="18" fill="#A9D3F0"' + line + '/>' +
      '<path d="M22 20 Q28 16 32 22 Q30 28 24 28 Z M34 30 Q42 26 44 34 Q38 40 34 36 Z" fill="#B5E2B0"/>' +
      '<path d="M14 28 A18 18 0 0 0 50 28" stroke="' + GOLD + '" stroke-width="3" fill="none"/>' +
      '<path d="M32 46 L32 54" stroke="' + INK + '" stroke-width="3"/>' +
      '<rect x="20" y="54" width="24" height="5" rx="2" fill="' + PINK + '"' + line + '/>';
  } else if (id === 'radio') {
    // Радиоприёмник (городской): антенна, динамик, ручка, нотка
    body = '<path d="M20 20 L12 6" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="6" r="3" fill="' + PINK + '"/>' +
      '<rect x="8" y="20" width="48" height="34" rx="8" fill="' + MINT + '"' + line + '/>' +
      '<circle cx="24" cy="37" r="9" fill="#FAF7F2"' + line + '/><circle cx="24" cy="37" r="3" fill="' + INK + '"/>' +
      '<rect x="38" y="28" width="12" height="6" rx="2" fill="' + GOLD + '"/>' +
      '<circle cx="44" cy="44" r="4" fill="' + PINK + '"' + line + '/>' +
      '<path d="M48 8 L48 16 M48 8 L54 10" stroke="#FAF7F2" stroke-width="2" fill="none"/><circle cx="46" cy="16" r="2.5" fill="#FAF7F2"/>';
  } else if (id === 'aquarium') {
    // Аквариум (водный): вода, рыбка, водоросли, пузырьки
    body = '<rect x="6" y="16" width="52" height="38" rx="6" fill="#DCEBF6"' + line + '/>' +
      '<rect x="9" y="24" width="46" height="27" rx="3" fill="#A9D3F0"/>' +
      '<path d="M16 51 Q12 42 18 36 M46 51 Q50 42 44 34" stroke="#B5E2B0" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M26 38 Q32 32 38 38 Q32 44 26 38 Z M38 38 L44 34 L44 42 Z" fill="' + GOLD + '"' + line + '/>' +
      '<circle cx="30" cy="37" r="1.3" fill="' + INK + '"/>' +
      '<circle cx="40" cy="28" r="2" fill="#FAF7F2"/><circle cx="43" cy="24" r="1.4" fill="#FAF7F2"/>' +
      '<rect x="4" y="54" width="56" height="6" rx="2" fill="' + PINK + '"' + line + '/>';
  } else if (id === 'telescope') {
    // Телескоп (сумеречный) на треноге и звёздочка
    body = '<path d="M14 36 L46 18 L50 26 L18 44 Z" fill="' + GOLD + '"' + line + '/>' +
      '<rect x="44" y="14" width="8" height="16" rx="2" fill="' + PINK + '" transform="rotate(-30 48 22)"' + line + '/>' +
      '<path d="M32 34 L20 58 M32 34 L32 58 M32 34 L44 58" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
      star(16, 12, 6, '#FAF7F2');
  } else {
    // Кошачий домик: домик с ушками на крыше и круглой дверцей
    body = '<path d="M10 30 L32 10 L54 30 Z" fill="' + PINK + '"' + line + '/>' +
      '<path d="M18 22 L20 10 L26 17 Z M46 22 L44 10 L38 17 Z" fill="' + PINK + '"' + line + '/>' +
      '<rect x="14" y="30" width="36" height="28" rx="3" fill="' + GOLD + '"' + line + '/>' +
      '<circle cx="32" cy="46" r="9" fill="' + INK + '"/>' +
      '<circle cx="29" cy="45" r="1.5" fill="' + MINT + '"/><circle cx="35" cy="45" r="1.5" fill="' + MINT + '"/>';
  }
  return open + body + '</svg>';
}

// =============================================================
// Картинки обучения «Как играть» (7 штук)
// =============================================================
// Холст 400×300. tutorialPicture(0) … tutorialPicture(6).
const TUTORIAL_PICTURE_COUNT = 7;

// Вставить маленькую картинку SVG (портрет, капсулу) внутрь большой:
// меняем начало тега <svg class="…"> на <svg x y width height>
function placeSvg(svgText, x, y, width, height) {
  return svgText.replace(/^<svg class="[^"]*"/, '<svg x="' + x + '" y="' + y + '" width="' + width + '" height="' + height + '"');
}

// Звёздное небо для картинок обучения
function tutorialSky() {
  const stars = [[30, 30], [80, 70], [150, 25], [260, 40], [330, 80], [370, 20], [210, 90], [50, 140], [360, 150]];
  let sky = '<rect width="400" height="300" rx="24" fill="#34375F"/>';
  for (let i = 0; i < stars.length; i++) {
    sky = sky + '<circle cx="' + stars[i][0] + '" cy="' + stars[i][1] + '" r="' + (i % 2 === 0 ? 2.5 : 1.5) + '" fill="#FFFFFF"/>';
  }
  return sky;
}

// Силуэты домов (город внизу картинки)
function tutorialCity() {
  return '<path d="M0 300 L0 230 L40 230 L40 200 L80 200 L80 240 L120 240 L120 180 L165 180 L165 235 L210 235 L210 205 L250 205 L250 245 L290 245 L290 190 L335 190 L335 230 L400 230 L400 300 Z" fill="#4A4E7E"/>' +
    '<rect x="130" y="195" width="10" height="10" fill="#F5D88E"/><rect x="150" y="215" width="10" height="10" fill="#F5D88E"/>' +
    '<rect x="300" y="205" width="10" height="10" fill="#F5D88E"/><rect x="220" y="215" width="10" height="10" fill="#F5D88E"/>';
}

function tutorialPicture(index) {
  const open = '<svg class="tutorial-svg" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  let body = '';

  if (index === 0) {
    // 1. Корабль котов разбился: наклонённый корабль, дым и звёзды-искры
    body = tutorialSky() +
      '<path d="M40 300 Q200 230 360 300 Z" fill="#B5E2B0"/>' +
      '<g transform="rotate(35 200 150)">' +
      '<path d="M165 230 L165 110 Q165 60 200 40 Q235 60 235 110 L235 230 Z" fill="#F5D88E" stroke="#FAF7F2" stroke-width="4"/>' +
      '<path d="M180 55 L186 30 L198 45 Z M220 55 L214 30 L202 45 Z" fill="#F4A7B9" stroke="#FAF7F2" stroke-width="3" stroke-linejoin="round"/>' +
      '<circle cx="200" cy="120" r="20" fill="#2A2C4C" stroke="#FAF7F2" stroke-width="4"/>' +
      '<path d="M165 200 L140 240 L165 230 Z M235 200 L260 240 L235 230 Z" fill="#F4A7B9" stroke="#FAF7F2" stroke-width="3"/>' +
      '</g>' +
      '<circle cx="110" cy="120" r="22" fill="#9A96B4" opacity="0.7"/><circle cx="85" cy="95" r="16" fill="#9A96B4" opacity="0.55"/>' +
      '<circle cx="65" cy="70" r="11" fill="#9A96B4" opacity="0.4"/>' +
      sparkle(300, 90, 10) + sparkle(270, 250, 8) + sparkle(120, 230, 7);
  } else if (index === 1) {
    // 2. Коты разлетелись в капсулах над городом
    body = tutorialSky() + tutorialCity() +
      placeSvg(capsuleIcon(), 60, 60, 50, 68) +
      placeSvg(capsuleIcon(), 175, 20, 50, 68) +
      placeSvg(capsuleIcon(), 290, 70, 50, 68) +
      '<path d="M85 140 Q80 170 90 190 M200 95 Q205 140 190 170 M315 150 Q320 180 310 200" stroke="#F5D88E" stroke-width="3" stroke-dasharray="6 8" fill="none" stroke-linecap="round"/>';
  } else if (index === 2) {
    // 3. Ты — Земной спасатель: кот благодарит, большая звезда-значок
    body = tutorialSky() +
      '<circle cx="140" cy="160" r="90" fill="#F9EDC9"/>' +
      placeSvg(catPortrait('iskra'), 60, 80, 160, 160) +
      star(300, 140, 60, GOLD) +
      '<text x="300" y="150" text-anchor="middle" font-size="30" font-weight="800" font-family="sans-serif" fill="#34375F">1</text>';
  } else if (index === 3) {
    // 4. Подойди к капсуле и поймай сигнал
    body = tutorialSky() +
      placeSvg(capsuleIcon(), 40, 50, 90, 122) +
      '<path d="M150 110 L200 110" stroke="#FAF7F2" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M192 100 L206 110 L192 120" stroke="#FAF7F2" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<text x="85" y="200" text-anchor="middle" font-size="22" font-weight="800" font-family="sans-serif" fill="#9FD8C8">≤ 40 м</text>' +
      // шкала «Поймай сигнал»: зелёная зона и огонёк в ней
      '<rect x="220" y="85" width="160" height="50" rx="25" fill="#34375F" stroke="#FAF7F2" stroke-width="4"/>' +
      '<rect x="285" y="89" width="40" height="42" fill="#9FD8C8"/>' +
      '<circle cx="305" cy="110" r="14" fill="#F5D88E" stroke="#FAF7F2" stroke-width="3"/>' +
      '<rect x="240" y="170" width="120" height="50" rx="25" fill="#F4A7B9"/>' +
      '<text x="300" y="203" text-anchor="middle" font-size="22" font-weight="800" font-family="sans-serif" fill="#34375F">Поймать!</text>';
  } else if (index === 4) {
    // 5. У каждого кота своя игра: 4 плитки с иконками игр
    const tile = function (x, y, color, picture, label) {
      return '<rect x="' + x + '" y="' + y + '" width="170" height="120" rx="20" fill="' + color + '" stroke="#FAF7F2" stroke-width="3"/>' +
        picture +
        '<text x="' + (x + 85) + '" y="' + (y + 108) + '" text-anchor="middle" font-size="15" font-weight="800" font-family="sans-serif" fill="#34375F">' + label + '</text>';
    };
    // «Ритм»: кольцо вокруг круга
    const rhythmIcon = '<circle cx="285" cy="72" r="34" fill="none" stroke="#9FD8C8" stroke-width="5"/>' +
      '<circle cx="285" cy="72" r="18" fill="#F4A7B9" stroke="#34375F" stroke-width="2"/>';
    body = '<rect width="400" height="300" rx="24" fill="#4A4E7E"/>' +
      tile(20, 15, '#DCEBF6', placeSvg(fishSprite(), 70, 30, 70, 50), 'Водные: рыбки') +
      tile(210, 15, '#F9EDC9', rhythmIcon, 'Городские: ритм') +
      tile(20, 160, '#DDF0DA', placeSvg(fireflySprite('#F5D88E'), 75, 170, 60, 60), 'Лесные: узор') +
      tile(210, 160, '#E3DAF5', placeSvg(starSprite(), 245, 175, 40, 40) + placeSvg(starSprite(), 290, 195, 30, 30) +
        placeSvg(starSprite(), 320, 170, 26, 26), 'Сумеречные: звёзды');
  } else if (index === 5) {
    // 6. Собирай на прогулке — используй дома: слева прогулка (город,
    // ингредиент, деталь, рыбка), стрелка, справа убежище (угощение,
    // корабль, предмет обстановки)
    body = '<rect width="400" height="300" rx="24" fill="#34375F"/>' +
      // прогулка
      '<rect x="12" y="12" width="168" height="276" rx="18" fill="#4A4E7E"/>' +
      '<path d="M12 288 L12 230 L40 230 L40 205 L70 205 L70 240 L100 240 L100 195 L135 195 L135 235 L180 235 L180 288 Z" fill="#555A8A"/>' +
      '<text x="96" y="44" text-anchor="middle" font-size="22" font-weight="800" font-family="sans-serif" fill="#F5D88E">Прогулка</text>' +
      placeSvg(ingredientIcon('flour'), 30, 62, 56, 56) +
      placeSvg(fishSprite(), 104, 74, 60, 42) +
      gearShape(60, 160, 20, '#9FD8C8') +
      placeSvg(ingredientIcon('berry'), 104, 132, 56, 56) +
      // стрелка
      '<path d="M186 150 L214 150" stroke="#FAF7F2" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M204 138 L218 150 L204 162" stroke="#FAF7F2" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      // дом
      '<rect x="220" y="12" width="168" height="276" rx="18" fill="#6F6AA8"/>' +
      '<rect x="220" y="200" width="168" height="88" rx="18" fill="#555A8A"/>' +
      '<text x="304" y="44" text-anchor="middle" font-size="22" font-weight="800" font-family="sans-serif" fill="#F5D88E">Дом</text>' +
      placeSvg(treatIcon('star-cookie'), 236, 62, 60, 60) +
      placeSvg(repairShipPicture(0.6), 312, 56, 64, 76) +
      placeSvg(decorIcon('aquarium'), 238, 150, 64, 64) +
      placeSvg(decorIcon('plant'), 314, 150, 64, 64);
  } else {
    // 7. Ремонт корабля + безопасность: гуляем со взрослым
    body = tutorialSky() +
      // шкала ремонта
      '<text x="200" y="45" text-anchor="middle" font-size="20" font-weight="800" font-family="sans-serif" fill="#FAF7F2">Ремонт корабля</text>' +
      '<rect x="80" y="58" width="240" height="26" rx="13" fill="#34375F" stroke="#FAF7F2" stroke-width="4"/>' +
      '<rect x="84" y="62" width="150" height="18" rx="9" fill="#9FD8C8"/>' +
      // взрослый и ребёнок держатся за руки
      '<circle cx="150" cy="130" r="18" fill="#FAF7F2"/><path d="M128 250 L132 160 Q150 148 168 160 L172 250 Z" fill="#A9D3F0"/>' +
      '<circle cx="225" cy="165" r="14" fill="#FAF7F2"/><path d="M208 250 L211 188 Q225 178 239 188 L242 250 Z" fill="#F5D88E"/>' +
      '<path d="M170 190 Q190 205 210 200" stroke="#FAF7F2" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      // глазки по сторонам
      '<path d="M270 150 Q290 135 310 150 Q290 165 270 150 Z" fill="#FAF7F2"/><circle cx="290" cy="150" r="6" fill="#34375F"/>' +
      '<path d="M270 190 L320 190 M300 180 L320 190 L300 200" stroke="#9FD8C8" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M130 190 L80 190 M100 180 L80 190 L100 200" stroke="#9FD8C8" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<rect x="0" y="255" width="400" height="45" fill="#555A8A"/>';
  }
  return open + body + '</svg>';
}

// ----- Для тестов в Node: отдаём функции наружу -----
if (typeof module !== 'undefined') {
  module.exports = {
    CAT_LOOKS, SUIT_COLORS, catPortrait, capsuleIcon, beaconIcon, shelterScene, launchScene,
    TUTORIAL_PICTURE_COUNT, tutorialPicture, fishSprite, bubbleSprite, basketSprite,
    fireflySprite, starSprite, ingredientIcon, treatIcon, bowlPicture, doughPicture, ovenPicture,
    COMPARTMENT_NAMES, compartmentPicture, repairShipPicture, laserDotSprite, toyBallSprite,
    decorIcon
  };
}
