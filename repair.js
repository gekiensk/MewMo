// =============================================================
// MewMo — ремонт корабля (режим «Дом»)
// =============================================================
// Детали корабля находятся на прогулке (капсулы, маяки, капитаны,
// задания) — это «найденные» детали. Здесь, дома, их устанавливают:
// каждая деталь — короткий пазл. Картинку отсека разрезали на 4–6
// кусочков и повернули; нажатие поворачивает кусочек на четверть круга.
// Все кусочки стоят правильно — деталь установлена.
//
// Шкала ремонта и кнопка «Запустить корабль» (в альбоме) считают
// только установленные детали.
// Правила — в logic.js (spareParts, canInstallPart, installPart,
// puzzleSize, makePuzzle, turnPiece, puzzleSolved).

// ----- Настройки -----
const PIECE_SIZE = 120; // размер кусочка на холсте картинки отсека

// ----- Состояние -----
// Пазл, который собираем сейчас:
//   turns   — на сколько четвертей повёрнут каждый кусочек (0 — правильно);
//   angles  — угол, на который кусочек повёрнут на экране (растёт с каждым
//             нажатием, чтобы кусочек всегда крутился в одну сторону);
//   done    — пазл уже собран.
let puzzle = null;

// ----- Элементы -----
const repairWindow = document.getElementById('repair');
const repairMain = document.getElementById('repair-main');
const repairPuzzleView = document.getElementById('repair-puzzle-view');
const repairPuzzle = document.getElementById('repair-puzzle');

// ----- Кнопки -----
document.getElementById('home-repair').addEventListener('click', openRepair);
document.getElementById('repair-close').addEventListener('click', closeRepair);
document.getElementById('repair-install').addEventListener('click', startPuzzle);
document.getElementById('repair-puzzle-back').addEventListener('click', showRepairMain);
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && !repairWindow.classList.contains('hidden')) closeRepair();
});

function openRepair() {
  repairWindow.classList.remove('hidden');
  showRepairMain();
  // Первое знакомство с ремонтом — плашка-подсказка (minigames.js)
  showHintPlaque('repair', repairMain, 'Как это работает',
    'Детали находятся на прогулке, а устанавливаются здесь. Нажми «Установить деталь» ' +
    'и поверни кусочки картинки, чтобы она стала целой.');
}

function closeRepair() {
  puzzle = null;
  repairWindow.classList.add('hidden');
}

// =============================================================
// Главный вид: корабль, шкала, «Установить деталь»
// =============================================================
function showRepairMain() {
  puzzle = null;
  repairPuzzleView.classList.add('hidden');
  repairMain.classList.remove('hidden');

  const needed = partsNeeded(save.chapter);              // logic.js
  const share = shipRepairShare(save.partsInstalled, save.chapter);
  document.getElementById('repair-ship').innerHTML = repairShipPicture(share); // art.js
  document.getElementById('repair-count').textContent =
    'Установлено: ' + save.partsInstalled + ' из ' + needed;
  document.getElementById('repair-fill').style.width = (share * 100) + '%';

  const spare = spareParts(save);
  const install = document.getElementById('repair-install');
  const text = document.getElementById('repair-spare');
  install.disabled = !canInstallPart(save);
  if (save.partsInstalled >= needed) {
    text.textContent = canLaunchShip(save)
      ? 'Корабль починен! Запусти его в альбоме «Экипаж» 🚀'
      : 'Корабль починен! Скоро он сможет взлететь.';
  } else if (spare > 0) {
    text.textContent = 'Найдено на прогулке и ждут установки: ' + spare + ' 🔩';
  } else {
    text.textContent = 'Найденных деталей нет. Детали находятся на прогулке: в капсулах, у маяков и у капитанов.';
  }
}

// =============================================================
// Пазл
// =============================================================
function startPuzzle() {
  if (!canInstallPart(save)) return;
  const size = puzzleSize(save);                 // 4 или 6 кусочков
  const turns = makePuzzle(size, Math.random);   // logic.js
  puzzle = {
    turns: turns,
    angles: turns.map(function (turn) { return turn * 90; }),
    done: false
  };
  repairMain.classList.add('hidden');
  repairPuzzleView.classList.remove('hidden');

  // Какой отсек чиним: отсеки идут по кругу
  const variant = save.partsInstalled % COMPARTMENT_NAMES.length; // art.js
  const columns = size === 4 ? 2 : 3;
  const picture = compartmentPicture(variant, columns * PIECE_SIZE);
  document.getElementById('repair-puzzle-title').textContent = 'Отсек «' + COMPARTMENT_NAMES[variant] + '»';
  document.getElementById('repair-puzzle-back').textContent = 'Назад';

  repairPuzzle.textContent = '';
  repairPuzzle.classList.remove('solved');
  repairPuzzle.style.gridTemplateColumns = 'repeat(' + columns + ', 1fr)';
  for (let i = 0; i < size; i++) {
    const x = (i % columns) * PIECE_SIZE;
    const y = Math.floor(i / columns) * PIECE_SIZE;
    const piece = document.createElement('button');
    piece.className = 'puzzle-piece';
    piece.setAttribute('aria-label', 'Кусочек ' + (i + 1) + ': повернуть');
    // Кусочек — та же картинка отсека, но видно только свой квадрат (viewBox)
    piece.innerHTML = '<svg viewBox="' + x + ' ' + y + ' ' + PIECE_SIZE + ' ' + PIECE_SIZE +
      '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + picture + '</svg>';
    piece.style.rotate = puzzle.angles[i] + 'deg';
    piece.addEventListener('click', function () { turnPuzzlePiece(i, piece); });
    repairPuzzle.appendChild(piece);
  }
}

// Нажали на кусочек — поворачиваем его на четверть круга
function turnPuzzlePiece(index, piece) {
  if (!puzzle || puzzle.done) return;
  puzzle.turns = turnPiece(puzzle.turns, index); // logic.js
  puzzle.angles[index] = puzzle.angles[index] + 90;
  piece.style.rotate = puzzle.angles[index] + 'deg';
  playTone(puzzle.turns[index] === 0 ? 523 : 392, 0.1); // кусочек на месте — нота выше
  if (puzzleSolved(puzzle.turns)) {
    finishPuzzle();
  }
}

// Пазл собран: деталь установлена
function finishPuzzle() {
  puzzle.done = true;
  save = installPart(save); // logic.js
  saveGame();
  playSound('reward');
  repairPuzzle.classList.add('solved'); // щели между кусочками исчезают
  document.getElementById('repair-puzzle-title').textContent = 'Готово! Деталь установлена 🔧';
  const back = document.getElementById('repair-puzzle-back');
  back.textContent = 'Дальше';
  back.focus();
}
