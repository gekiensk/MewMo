// =============================================================
// MewMo — обучение «Как играть»
// =============================================================
// При самом первом запуске (флаг tutorialSeen в сохранении) — короткая
// история в 7 картинках (рисует art.js, tutorialPicture). Крупный текст,
// кнопки «Дальше» и «Пропустить». На последней картинке — напоминание
// о безопасности. Показать снова: ⚙️ → «❓ Как играть».

// Тексты картинок (по порядку)
const TUTORIAL_TEXTS = [
  'Корабль котов-пришельцев разбился рядом с Землёй!',
  'Коты разлетелись в спасательных капсулах по всему городу.',
  'Ты — Земной спасатель. Найди котов и помоги им вернуться домой!',
  'Подойди к капсуле ближе 40 метров и нажми на неё. «Поймай сигнал»: жми, когда огонёк в зелёной зоне, — получишь поблажку в игре.',
  'У каждого кота своя игра: водные ловят рыбок, лесные повторяют узор светлячков, городские играют в ритм, сумеречные собирают созвездие.',
  'Собирай на прогулке — используй дома! Из ингредиентов готовь угощения на кухне, ' +
    'детали ставь в «Ремонте», а за рыбок обставляй убежище.',
  'За новых котов — детали. Почини корабль, и экипаж полетит домой! ' +
    'Гуляй вместе со взрослым и смотри по сторонам, а не в телефон.'
];

// ----- Состояние -----
let tutorialPage = 0;

// ----- Элементы -----
const tutorialWindow = document.getElementById('tutorial');
const tutorialNext = document.getElementById('tutorial-next');

// ----- Кнопки -----
tutorialNext.addEventListener('click', function () {
  if (tutorialPage < TUTORIAL_TEXTS.length - 1) {
    showTutorialPage(tutorialPage + 1);
  } else {
    closeTutorial();
  }
});
document.getElementById('tutorial-skip').addEventListener('click', closeTutorial);
document.getElementById('open-tutorial').addEventListener('click', function () {
  closeSettings(); // settings.js
  openTutorial();
});

// Открыть обучение с первой картинки
function openTutorial() {
  tutorialWindow.classList.remove('hidden');
  showTutorialPage(0);
}

function showTutorialPage(index) {
  tutorialPage = index;
  document.getElementById('tutorial-picture').innerHTML = tutorialPicture(index); // art.js
  document.getElementById('tutorial-text').textContent = TUTORIAL_TEXTS[index];
  document.getElementById('tutorial-count').textContent = (index + 1) + ' из ' + TUTORIAL_TEXTS.length;
  const last = index === TUTORIAL_TEXTS.length - 1;
  tutorialNext.textContent = last ? 'Начать!' : 'Дальше';
  // На последней картинке «Пропустить» не нужна
  document.getElementById('tutorial-skip').classList.toggle('hidden', last);
  // Предупреждение о безопасности на последней картинке — отдельным цветом
  document.getElementById('tutorial-text').classList.toggle('tutorial-safety', last);
  tutorialNext.focus();
}

// Закрыть («Пропустить» или «Начать!») — больше само не показывается
function closeTutorial() {
  tutorialWindow.classList.add('hidden');
  if (!save.tutorialSeen) {
    save.tutorialSeen = true;
    saveGame(); // game.js
  }
}

// Вызывается из game.js при загрузке страницы
function showTutorialIfNeeded() {
  if (shouldShowTutorial(save)) { // logic.js
    openTutorial();
  }
}
