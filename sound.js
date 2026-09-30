// =============================================================
// MewMo — звуки игры (Web Audio API)
// =============================================================
// Все звуки синтезируются прямо здесь, в коде: никаких аудиофайлов.
// Звук — это колебания. «Осциллятор» (oscillator) делает колебания
// нужной частоты (высоты), а «усилитель» (gain) — нужной громкости.
// Меняя частоту и громкость во времени, получаем «мяу», «дзынь» и мелодии.
//
// Правило браузеров: звук можно включить только после того, как
// человек что-то нажал. Поэтому initSound() вызывается из обработчика
// кнопки «Гулять» / «Играть дома».

// ----- Настройки -----
const MASTER_VOLUME = 0.12; // общая громкость (от 0 до 1) — тихо

// ----- Состояние -----
let audioContext = null; // «звуковая система» браузера, создаётся по нажатию
let masterGain = null;   // общий регулятор громкости

// Включить звук. Вызывать только из обработчика нажатия!
function initSound() {
  if (audioContext) return; // уже включён
  // В старых Safari «звуковая система» называется webkitAudioContext
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return; // браузер не умеет — играем без звука
  try {
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = MASTER_VOLUME;
    masterGain.connect(audioContext.destination);
  } catch (error) {
    audioContext = null; // не получилось — играем без звука
  }
}

// Можно ли сейчас играть звук: звук включён браузером и в настройках.
// isSoundOn() — из game.js (читает настройки из сохранения).
function canPlaySound() {
  if (!audioContext) return false;
  if (typeof isSoundOn === 'function' && !isSoundOn()) return false;
  // Телефон мог «усыпить» звук, пока вкладка была в фоне
  if (audioContext.state === 'suspended') audioContext.resume();
  return true;
}

// Одна нота.
//   frequency — высота в герцах (440 — нота «ля»);
//   start     — через сколько секунд начать (0 — сейчас);
//   duration  — сколько секунд звучит;
//   type      — форма волны: 'sine' (мягкий), 'triangle' (звонче), 'square' (резкий);
//   volume    — громкость ноты (от 0 до 1, умножается на общую);
//   slideTo   — если задано, высота плавно съезжает к этой частоте.
function playNote(frequency, start, duration, type, volume, slideTo) {
  const now = audioContext.currentTime + start;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  }
  // Громкость: быстро нарастает и плавно затихает — так нет щелчков
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
}

// «Мяу-чирп»: высота быстро поднимается и опускается, как кошачье «мр-мяу»
function playMeow() {
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(600, now);
  oscillator.frequency.exponentialRampToValueAtTime(1100, now + 0.12);
  oscillator.frequency.exponentialRampToValueAtTime(700, now + 0.38);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.7, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + 0.45);
}

// Все звуки игры по названию
const SOUNDS = {
  // кот появился
  meow: function () { playMeow(); },
  // щелчок кнопки — очень короткий и тихий
  click: function () { playNote(1400, 0, 0.04, 'triangle', 0.25); },
  // «пойман сигнал» — два быстрых звонких «дзынь» вверх
  signal: function () {
    playNote(880, 0, 0.12, 'triangle', 0.6);
    playNote(1320, 0.1, 0.18, 'triangle', 0.6);
  },
  // победа в раунде — весёлый аккорд по нотам вверх
  roundWin: function () {
    playNote(523, 0, 0.12, 'triangle', 0.6);
    playNote(659, 0.09, 0.12, 'triangle', 0.6);
    playNote(784, 0.18, 0.2, 'triangle', 0.6);
  },
  // проигрыш раунда — мягкий, не обидный: тихо съезжает вниз
  roundLose: function () {
    playNote(440, 0, 0.35, 'sine', 0.4, 330);
  },
  // кот вступил в экипаж — весёлая мелодия из 6 нот
  crew: function () {
    const melody = [523, 659, 784, 659, 784, 1047]; // до, ми, соль, ми, соль, до
    for (let i = 0; i < melody.length; i++) {
      const last = i === melody.length - 1;
      playNote(melody[i], i * 0.13, last ? 0.4 : 0.14, 'triangle', 0.55);
    }
  },
  // награда (маяк, рыбки) — блестящее «дзынь-дзынь-дзынь»
  reward: function () {
    playNote(1047, 0, 0.1, 'sine', 0.5);
    playNote(1319, 0.07, 0.1, 'sine', 0.5);
    playNote(1568, 0.14, 0.22, 'sine', 0.5);
  }
};

// Вибрация к некоторым звукам (миллисекунды). vibrate() — из settings.js,
// она сама проверяет, включена ли вибрация и умеет ли телефон.
const VIBRATIONS = {
  meow: 20,
  signal: 30,
  roundWin: 40,
  crew: [80, 60, 80],
  reward: 50
};

// Сыграть звук по названию: playSound('meow').
// Заодно телефон коротко вибрирует (если вибрация включена),
// даже когда звук выключен.
function playSound(name) {
  if (VIBRATIONS[name] && typeof vibrate === 'function') {
    vibrate(VIBRATIONS[name]);
  }
  if (!canPlaySound() || !SOUNDS[name]) return;
  try {
    SOUNDS[name]();
  } catch (error) {
    // Звук — не главное: если что-то пошло не так, игра продолжается
  }
}

// Щелчок на любую кнопку игры
document.addEventListener('click', function (event) {
  if (event.target.closest && event.target.closest('button')) {
    playSound('click');
  }
});
