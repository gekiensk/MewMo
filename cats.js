// =============================================================
// MewMo — каталог котов-пришельцев
// =============================================================
// У каждого кота есть:
//   id              — короткое имя латиницей, по нему кот узнаётся в коде
//                     (должно быть у всех разным);
//   chapter         — глава игры, в которой живёт кот (1 или 2);
//   name            — имя, которое видит игрок;
//   type            — тип: 'водный', 'лесной', 'городской', 'сумеречный'
//                     (у легендарной Кометы — 'космический');
//                     сумеречные коты попадаются только в последний час до заката;
//   rarity          — редкость: 'обычный', 'редкий' или 'легендарный';
//   character       — характер, пара слов о коте;
//   favoriteGesture — любимый жест: 'Лапка', 'Коготь' или 'Клубок'
//                     (больше не показывается — игра «Лапка, Коготь, Клубок» убрана);
//   favoriteTreat   — любимое угощение с кухни (id рецепта из logic.js, RECIPES);
//   fact            — настоящий факт о кошках для окна «А ты знал?».
//
// Чтобы добавить нового кота, скопируй любой блок { ... } и поменяй значения.

const CATS = [
  {
    id: 'bul',
    name: 'Буль',
    chapter: 1,
    type: 'водный',
    rarity: 'обычный',
    character: 'Спокойный механик',
    favoriteGesture: 'Лапка',
    favoriteTreat: 'fish-cake',
    fact: 'Кошки мурлыкают не только от радости, но и чтобы успокоиться.'
  },
  {
    id: 'murena',
    name: 'Мурена',
    chapter: 1,
    type: 'водный',
    rarity: 'редкий',
    character: 'Обожает нырять',
    favoriteGesture: 'Клубок',
    favoriteTreat: 'moon-pudding',
    fact: 'Кошки не чувствуют сладкий вкус.'
  },
  {
    id: 'shishka',
    name: 'Шишка',
    chapter: 1,
    type: 'лесной',
    rarity: 'обычный',
    character: 'Любопытный ботаник',
    favoriteGesture: 'Коготь',
    favoriteTreat: 'berry-pie',
    fact: 'Кошки могут поворачивать уши почти на 180 градусов.'
  },
  {
    id: 'moh',
    name: 'Мох',
    chapter: 1,
    type: 'лесной',
    rarity: 'обычный',
    character: 'Большой соня',
    favoriteGesture: 'Лапка',
    favoriteTreat: 'moon-pudding',
    fact: 'Кошки спят в среднем 12–16 часов в сутки.'
  },
  {
    id: 'iskra',
    name: 'Искра',
    chapter: 1,
    type: 'городской',
    rarity: 'обычный',
    character: 'Хитрый пилот',
    favoriteGesture: 'Коготь',
    favoriteTreat: 'comet-candy',
    fact: 'Усы помогают кошке понять, пролезет ли она в щель.'
  },
  {
    id: 'gaika',
    name: 'Гайка',
    chapter: 1,
    type: 'городской',
    rarity: 'обычный',
    character: 'Изобретатель',
    favoriteGesture: 'Клубок',
    favoriteTreat: 'star-cookie',
    fact: 'У каждой кошки свой узор на носу, как отпечаток пальца у человека.'
  },
  {
    id: 'pixel',
    name: 'Пиксель',
    chapter: 1,
    type: 'городской',
    rarity: 'редкий',
    character: 'Любит светящиеся экраны',
    favoriteGesture: 'Лапка',
    favoriteTreat: 'comet-candy',
    fact: 'В каждом ухе у кошки больше 30 мышц.'
  },
  {
    id: 'kometa',
    name: 'Комета',
    chapter: 1,
    type: 'космический',
    rarity: 'легендарный',
    character: 'Может встретиться где угодно',
    favoriteGesture: 'Клубок',
    favoriteTreat: 'star-cookie',
    fact: 'Котёнок начинает мурлыкать уже в первые дни жизни.'
  },
  // ----- Сумеречные коты: только в последний час до заката -----
  {
    id: 'sumrak',
    name: 'Сумрак',
    chapter: 1,
    type: 'сумеречный',
    rarity: 'обычный',
    character: 'Тихий мечтатель, любит смотреть на закат',
    favoriteGesture: 'Клубок',
    favoriteTreat: 'berry-pie',
    fact: 'Кошки особенно активны в сумерках — на рассвете и на закате.'
  },
  {
    id: 'yantar',
    name: 'Янтарь',
    chapter: 1,
    type: 'сумеречный',
    rarity: 'редкий',
    character: 'Собирает последние лучи солнца',
    favoriteGesture: 'Коготь',
    favoriteTreat: 'mint-jelly',
    fact: 'Глаза кошки светятся в темноте, потому что внутри глаза есть слой, который отражает свет.'
  },
  // =============================================================
  // Глава 2 «Сигнал с орбиты» — экипаж большого корабля
  // =============================================================
  // ----- водные -----
  {
    id: 'volna',
    name: 'Волна',
    chapter: 2,
    type: 'водный',
    rarity: 'обычный',
    character: 'Весёлая сёрфингистка',
    favoriteGesture: 'Лапка',
    favoriteTreat: 'mint-jelly',
    fact: 'Кошки потеют через подушечки лап.'
  },
  {
    id: 'kapel',
    name: 'Капель',
    chapter: 2,
    type: 'водный',
    rarity: 'обычный',
    character: 'Тихоня, любит слушать дождь',
    favoriteGesture: 'Клубок',
    favoriteTreat: 'moon-pudding',
    fact: 'У кошки на передних лапах обычно по 5 пальцев, а на задних — по 4.'
  },
  {
    id: 'yakor',
    name: 'Якорь',
    chapter: 2,
    type: 'водный',
    rarity: 'обычный',
    character: 'Надёжный боцман',
    favoriteGesture: 'Коготь',
    favoriteTreat: 'fish-cake',
    fact: 'Кошки ходят на кончиках пальцев.'
  },
  {
    id: 'zhemchug',
    name: 'Жемчуг',
    chapter: 2,
    type: 'водный',
    rarity: 'редкий',
    character: 'Собирает ракушки',
    favoriteGesture: 'Лапка',
    favoriteTreat: 'fish-cake',
    fact: 'Язык кошки покрыт крошечными крючками — ими она расчёсывает шерсть.'
  },
  // ----- лесные -----
  {
    id: 'zholud',
    name: 'Жёлудь',
    chapter: 2,
    type: 'лесной',
    rarity: 'обычный',
    character: 'Смелый маленький разведчик',
    favoriteGesture: 'Коготь',
    favoriteTreat: 'berry-pie',
    fact: 'Падая, кошка переворачивается в воздухе, чтобы приземлиться на лапы.'
  },
  {
    id: 'listik',
    name: 'Листик',
    chapter: 2,
    type: 'лесной',
    rarity: 'обычный',
    character: 'Любит играть в прятки',
    favoriteGesture: 'Клубок',
    favoriteTreat: 'mint-jelly',
    fact: 'Хвост помогает кошке держать равновесие.'
  },
  {
    id: 'svetlyachok',
    name: 'Светлячок',
    chapter: 2,
    type: 'лесной',
    rarity: 'редкий',
    character: 'Освещает путь в тёмном лесу',
    favoriteGesture: 'Лапка',
    favoriteTreat: 'berry-pie',
    fact: 'Кошке трудно спуститься с дерева головой вниз: её когти загнуты назад.'
  },
  // ----- городские -----
  {
    id: 'kompas',
    name: 'Компас',
    chapter: 2,
    type: 'городской',
    rarity: 'обычный',
    character: 'Никогда не теряется',
    favoriteGesture: 'Лапка',
    favoriteTreat: 'star-cookie',
    fact: 'Нос кошки чувствует запахи намного лучше, чем нос человека.'
  },
  {
    id: 'bublik',
    name: 'Бублик',
    chapter: 2,
    type: 'городской',
    rarity: 'обычный',
    character: 'Весёлый корабельный повар',
    favoriteGesture: 'Коготь',
    favoriteTreat: 'star-cookie',
    fact: 'Взрослые кошки мяукают в основном для людей, а не для других кошек.'
  },
  {
    id: 'radar',
    name: 'Радар',
    chapter: 2,
    type: 'городской',
    rarity: 'редкий',
    character: 'Ловит все сигналы на свете',
    favoriteGesture: 'Клубок',
    favoriteTreat: 'comet-candy',
    fact: 'Кошки узнают голос своего человека среди других голосов.'
  },
  // ----- сумеречный -----
  {
    id: 'zakat',
    name: 'Закат',
    chapter: 2,
    type: 'сумеречный',
    rarity: 'редкий',
    character: 'Художник, рисует закаты',
    favoriteGesture: 'Коготь',
    favoriteTreat: 'berry-pie',
    fact: 'Если кошка медленно моргает, глядя на тебя, — это знак доверия.'
  },
  // ----- легендарная -----
  {
    id: 'orbita',
    name: 'Орбита',
    chapter: 2,
    type: 'космический',
    rarity: 'легендарный',
    character: 'Облетает Землю быстрее всех',
    favoriteGesture: 'Клубок',
    favoriteTreat: 'comet-candy',
    fact: 'У кошек есть третье веко — тонкая плёнка, которая защищает глаз.'
  }
];

// =============================================================
// Потерявшиеся капитаны (боссы)
// =============================================================
// Это не обычные коты: они не сидят в капсулах, а ждут игрока у маяка.
// Поля те же, что у котов. rarity у всех — 'капитан' (от неё зависит
// сложность «Поймай сигнал»), type — 'капитан'.
const CAPTAINS = [
  {
    id: 'zvezdous',
    name: 'Капитан Звездоус',
    chapter: 1,
    type: 'капитан',
    rarity: 'капитан',
    character: 'Строгий, но добрый штурман. Потерял звёздную карту',
    favoriteGesture: 'Коготь',
    favoriteTreat: 'star-cookie',
    fact: 'Кошкам нужно примерно в 6 раз меньше света, чем человеку, чтобы видеть.'
  },
  {
    id: 'lunnaya-lapa',
    name: 'Капитан Лунная Лапа',
    chapter: 1,
    type: 'капитан',
    rarity: 'капитан',
    character: 'Весёлый командир, отдаёт команды громким «Мяу!»',
    favoriteGesture: 'Лапка',
    favoriteTreat: 'moon-pudding',
    fact: 'Когда кошка идёт шагом, её задние лапы ступают почти точно в следы передних.'
  },
  // ----- Капитаны главы 2 -----
  {
    id: 'admiral-grom',
    name: 'Адмирал Гром',
    chapter: 2,
    type: 'капитан',
    rarity: 'капитан',
    character: 'Громкий, но очень заботливый командир большого корабля',
    favoriteGesture: 'Коготь',
    favoriteTreat: 'fish-cake',
    fact: 'Котята рождаются с голубыми глазами, а настоящий цвет появляется позже.'
  },
  {
    id: 'tumannost',
    name: 'Капитан Туманность',
    chapter: 2,
    type: 'капитан',
    rarity: 'капитан',
    character: 'Мудрая и загадочная, знает все звёзды',
    favoriteGesture: 'Лапка',
    favoriteTreat: 'mint-jelly',
    fact: 'Обычная температура тела кошки — около 38–39 градусов, выше, чем у человека.'
  }
];

// Найти кота по его id (или undefined, если такого нет)
function findCat(id) {
  return CATS.find(function (cat) { return cat.id === id; });
}

// Найти капитана по его id
function findCaptain(id) {
  return CAPTAINS.find(function (captain) { return captain.id === id; });
}

// ----- Для тестов в Node: отдаём каталог наружу -----
if (typeof module !== 'undefined') {
  module.exports = { CATS, CAPTAINS, findCat, findCaptain };
}
