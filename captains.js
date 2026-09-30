// =============================================================
// MewMo — потерявшиеся капитаны (боссы) у маяков
// =============================================================
// Капитаны приходят, когда в экипаже уже 3+ кота. Одновременно на карте —
// не больше одного капитана: он ждёт у одного из маяков 1 час.
// Бой с капитаном идёт в окне знакомства (encounter.js), а правила
// (когда приходит, награды, повтор через 2 минуты) — в logic.js.
// Этот файл только ставит капитана на карту и реагирует на нажатия.

// ----- Настройки -----
// Первые 15 секунд игры капитан не приходит: пусть сначала загрузятся
// настоящие маяки (пока грузится карта, стоят виртуальные).
const CAPTAIN_START_PAUSE = 15000;

// ----- Состояние -----
// captainState — капитан из logic.js: { captainId, beaconId, expiresAt, retryAt }
// или null, если капитана нет. Остальное — его маркер на карте.
// Место капитана живёт только в памяти и никуда не сохраняется.
let captainState = null;
let captainMarker = null;
let captainElement = null;
let captainTimer = null;
let captainPosition = null;
let captainWatchStart = 0; // когда игра начала следить за капитанами (0 — ещё не начала)

// Раз в секунду (из game.js): убрать капитана, если его час прошёл,
// позвать нового, если можно, и обновить его вид
function updateCaptain() {
  const now = Date.now();
  const inBattle = activeEncounter && activeEncounter.kind === 'captain';
  // Первый вызов — сразу после «Начать поиск»: запоминаем время
  if (captainWatchStart === 0) captainWatchStart = now;

  // Час прошёл — капитан улетает (но не посреди боя)
  if (captainState && !isCaptainActive(captainState, now) && !inBattle) {
    removeCaptain();
  }

  if (!captainState && now - captainWatchStart > CAPTAIN_START_PAUSE) {
    maybeSpawnCaptain(now);
  }
  updateCaptainLook(now);
}

function maybeSpawnCaptain(now) {
  // canSpawnCaptain из logic.js проверяет все правила появления
  const allowed = canSpawnCaptain({
    crewCount: crewCount(save, CATS),
    captain: captainState,
    nextCaptainAt: save.nextCaptainAt,
    beaconCount: beacons.length,
    now: now
  });
  if (!allowed) return;

  const beacon = beacons[Math.floor(Math.random() * beacons.length)];
  const data = chooseCaptain(CAPTAINS, save, Math.random);
  captainState = makeCaptain(data.id, beacon.id, now);
  captainPosition = beacon.position;

  // Капитан — кнопка над маяком. offset сдвигает его вверх на 64 пикселя,
  // чтобы он не закрывал маяк.
  captainElement = document.createElement('button');
  captainElement.className = 'captain';
  captainElement.setAttribute('aria-label', data.name + ' ждёт у маяка');
  captainElement.textContent = catFace(data); // функция из encounter.js
  captainTimer = document.createElement('span');
  captainTimer.className = 'captain-timer';
  captainElement.appendChild(captainTimer);
  captainElement.addEventListener('click', openCaptain);

  captainMarker = new maplibregl.Marker({ element: captainElement, anchor: 'bottom', offset: [0, -64] })
    .setLngLat(captainPosition)
    .addTo(map);

  showToast('У маяка ждёт потерявшийся капитан! 😼');
}

function removeCaptain() {
  if (captainMarker) captainMarker.remove();
  captainState = null;
  captainMarker = null;
  captainElement = null;
  captainTimer = null;
  captainPosition = null;
}

// captain-near    — игрок ближе 40 м, можно начинать бой;
// captain-resting — после проигрыша капитан отдыхает 2 минуты (виден таймер).
function updateCaptainLook(now) {
  if (!captainState || !playerMarker) return;
  const left = captainRetryLeft(captainState, now);
  const resting = left > 0;
  const near = !resting && distanceMeters(playerPosition(), captainPosition) <= OPEN_DISTANCE;
  captainElement.classList.toggle('captain-resting', resting);
  captainElement.classList.toggle('captain-near', near);
  captainTimer.textContent = resting ? formatTimeLeft(left) : '';
}

// Нажатие на капитана
function openCaptain() {
  const now = Date.now();
  const data = findCaptain(captainState.captainId);

  const left = captainRetryLeft(captainState, now);
  if (left > 0) {
    showToast(data.name + ' отдыхает. Попробуй через ' + formatTimeLeft(left) + '.');
    return;
  }

  const distance = distanceMeters(playerPosition(), captainPosition);
  if (distance > OPEN_DISTANCE) {
    showToast('Подойди ближе! До капитана ' + Math.round(distance) + ' м.');
    return;
  }

  openCaptainEncounter(captainState, data); // функция из encounter.js
}

// Игрок победил капитана (вызывается из encounter.js)
function captainWon(state) {
  const data = findCaptain(state.captainId);
  const result = applyCaptainWin(save, state.captainId, Date.now()); // logic.js
  save = result.save;
  saveGame();
  removeCaptain();
  if (result.reward.isNew) {
    showToast(data.name + ' вступил в экипаж! +' + result.reward.parts + ' детали 🔩');
  } else {
    showToast(data.name + ' снова с тобой! +' + result.reward.parts + ' детали 🔩');
  }
  updateStatus();
}

// Игрок проиграл капитану (вызывается из encounter.js): без наказания,
// капитан ждёт до конца своего часа, ещё раз — через 2 минуты
function captainLost(state) {
  if (captainState !== state) return; // капитан уже улетел
  captainState = captainAfterLoss(captainState, Date.now()); // logic.js
  updateCaptainLook(Date.now());
}
