// =============================================================
// MewMo — звуки игры (Web Audio API)
// =============================================================
// Все звуки синтезируются прямо здесь, в коде: никаких аудиофайлов.
// Звук — это колебания. «Осциллятор» (oscillator) делает колебания
// нужной частоты (высоты), а «усилитель» (gain) — нужной громкости.
//
// После теста с ребёнком звуки стали мягче:
//   • только мягкие формы волны — синусоида ('sine') и треугольник ('triangle');
//   • плавное нарастание и затухание (без щелчков);
//   • ниже по высоте и короче;
//   • вдвое тише, а в настройках — «Выкл», «Тихо», «Обычно»;
//   • обычные нажатия кнопок звука не издают — звучат только важные
//     моменты: кот появился, кот в экипаже, награда, победа над
//     капитаном, взлёт корабля (и звуки внутри мини-игр).
//
// Правило браузеров: звук можно включить только после того, как
// человек что-то нажал. Поэтому initSound() вызывается из обработчика
// кнопки «Гулять» / «Играть дома».

// ----- Настройки -----
// Общая громкость для «Обычно» и «Тихо» (от 0 до 1)
const VOLUME_BY_LEVEL = { 'обычно': 0.06, 'тихо': 0.03, 'выкл': 0 };
const ATTACK = 0.04; // нарастание звука, секунды (плавно, без щелчка)

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
    masterGain.gain.value = VOLUME_BY_LEVEL['обычно'];
    masterGain.connect(audioContext.destination);
  } catch (error) {
    audioContext = null; // не получилось — играем без звука
  }
}

// Можно ли сейчас играть звук: звук включён браузером и в настройках.
// isSoundOn() и soundLevel() — из settings.js (читают сохранение).
function canPlaySound() {
  if (!audioContext) return false;
  if (typeof isSoundOn === 'function' && !isSoundOn()) return false;
  // Громкость — по настройке «Тихо» / «Обычно»
  if (typeof soundLevel === 'function') {
    masterGain.gain.value = VOLUME_BY_LEVEL[soundLevel()] || VOLUME_BY_LEVEL['обычно'];
  }
  // Телефон мог «усыпить» звук, пока вкладка была в фоне
  if (audioContext.state === 'suspended') audioContext.resume();
  return true;
}

// Одна мягкая нота.
//   frequency — высота в герцах (440 — нота «ля»);
//   start     — через сколько секунд начать (0 — сейчас);
//   duration  — сколько секунд звучит (вместе с затуханием);
//   type      — 'sine' (самый мягкий) или 'triangle' (чуть звонче);
//   volume    — громкость ноты (от 0 до 1, умножается на общую);
//   slideTo   — если задано, высота плавно съезжает к этой частоте.
function playNote(frequency, start, duration, type, volume, slideTo) {
  const now = audioContext.currentTime + start;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type === 'triangle' ? 'triangle' : 'sine'; // только мягкие волны
  oscillator.frequency.setValueAtTime(frequency, now);
  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  }
  // Громкость: плавно нарастает (ATTACK) и плавно затихает до конца ноты
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + ATTACK);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
}

// Ноты (частоты в герцах) — чтобы мелодии было проще читать
const NOTE = {
  C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494,
  C5: 523, D5: 587, E5: 659, G5: 784
};

// Все звуки игры по названию
const SOUNDS = {
  // кот появился: мягкое «мр-мяу» — нота плавно поднимается и опускается
  meow: function () {
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(420, now);
    oscillator.frequency.exponentialRampToValueAtTime(620, now + 0.12);
    oscillator.frequency.exponentialRampToValueAtTime(460, now + 0.32);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.6, now + ATTACK);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + 0.4);
  },
  // кот в экипаже: спокойная мелодия из 5 нот (до-ми-соль-ми-до)
  crew: function () {
    const melody = [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.E4, NOTE.C5];
    for (let i = 0; i < melody.length; i++) {
      const last = i === melody.length - 1;
      playNote(melody[i], i * 0.16, last ? 0.45 : 0.2, 'triangle', 0.5);
    }
  },
  // награда (маяк, рыбки, задание): три тихие ноты, как колокольчик
  reward: function () {
    playNote(NOTE.E5, 0, 0.18, 'sine', 0.45);
    playNote(NOTE.G5 * 0.75, 0.1, 0.18, 'sine', 0.45); // ре5 ~ 588 Гц
    playNote(NOTE.C5, 0.2, 0.35, 'sine', 0.45);
  },
  // победа над капитаном: маленькие «фанфары», но тихие и мягкие
  captainWin: function () {
    const melody = [NOTE.G4, NOTE.C5, NOTE.E5, NOTE.D5, NOTE.E5, NOTE.G5];
    const lengths = [0.15, 0.15, 0.3, 0.15, 0.15, 0.5];
    let time = 0;
    for (let i = 0; i < melody.length; i++) {
      playNote(melody[i], time, lengths[i] + 0.05, 'triangle', 0.45);
      time = time + lengths[i];
    }
  },
  // взлёт корабля: мягкий низкий гул, который поднимается, а потом мелодия
  launch: function () {
    playNote(110, 0, 3.0, 'sine', 0.4, 220);
    playNote(165, 0.4, 2.6, 'triangle', 0.2, 330);
    const melody = [NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.G4, NOTE.C5];
    for (let i = 0; i < melody.length; i++) {
      playNote(melody[i], 3.1 + i * 0.18, i === melody.length - 1 ? 0.6 : 0.22, 'triangle', 0.45);
    }
  },
  // Мягкий «не получилось» — одна тихая низкая нота
  oops: function () {
    playNote(NOTE.E4, 0, 0.3, 'sine', 0.35, NOTE.C4);
  }
};

// Вибрация к некоторым звукам (миллисекунды). vibrate() — из settings.js,
// она сама проверяет, включена ли вибрация и умеет ли телефон.
const VIBRATIONS = {
  meow: 20,
  crew: [60, 50, 60],
  reward: 40,
  captainWin: [80, 60, 80],
  launch: [150, 100, 150]
};

// Сыграть звук по названию: playSound('meow').
// Заодно телефон коротко вибрирует (если вибрация включена),
// даже когда звук выключен. Названия, которых нет в SOUNDS
// (раньше были «щелчок», «сигнал» и т. п.), просто ничего не делают.
function playSound(name) {
  if (VIBRATIONS[name] && typeof vibrate === 'function') {
    vibrate(VIBRATIONS[name]);
  }
  if (!SOUNDS[name] || !canPlaySound()) return;
  try {
    SOUNDS[name]();
  } catch (error) {
    // Звук — не главное: если что-то пошло не так, игра продолжается
  }
}

// Одна мягкая нота для мини-игр: playTone(392, 0.25)
function playTone(frequency, duration) {
  if (!canPlaySound()) return;
  try {
    playNote(frequency, 0, duration || 0.25, 'sine', 0.5);
  } catch (error) {
    // без звука — не страшно
  }
}
