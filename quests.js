// =============================================================
// MewMo — ежедневные задания
// =============================================================
// Каждый день (по местному времени) — 3 задания, например «Поймай 2 котов».
// Задания засчитываются и на прогулке, и дома. Список заданий и правила —
// в logic.js (QUEST_TYPES, applyQuestEvent), а здесь — только связь с игрой:
//   questEvent('catch')  — сообщить, что в игре что-то произошло;
//   renderQuests(список) — нарисовать задания (в альбоме экипажа).
//
// События: 'catch' (кот или капитан в экипаже / знакомство), 'treat'
// (угостил кота), 'beacon' (награда маяка), 'perfectWin' (победа без
// проигранных раундов), 'signal' (пойман сигнал), 'guest' (знакомство
// с гостем в убежище), 'roundWin' (выигран раунд).

// Сообщить о событии. Если задание выполнилось — награда уже выдана
// в logic.js, здесь показываем подсказку и играем звук.
function questEvent(eventName) {
  const result = applyQuestEvent(save, localDayKey(new Date()), eventName, Math.random);
  save = result.save;
  saveGame();
  for (let i = 0; i < result.completed.length; i++) {
    const quest = result.completed[i];
    // Подсказку показываем чуть позже, чтобы она не перебила
    // подсказку о самом событии («Кот в экипаже!» и т. п.)
    setTimeout(function () {
      playSound('reward');
      showToast('Задание выполнено: «' + quest.text + '»! ' + questRewardText(quest.reward));
    }, TOAST_TIME + 200);
  }
}

// Рисует задания на сегодня в элементе container
function renderQuests(container) {
  // Если наступил новый день — сначала выбираем новые задания
  const fresh = refreshQuests(save.quests, localDayKey(new Date()), Math.random);
  if (fresh !== save.quests) {
    save.quests = fresh;
    saveGame();
  }

  container.textContent = '';
  for (let i = 0; i < save.quests.list.length; i++) {
    const item = save.quests.list[i];
    const type = QUEST_TYPES.find(function (quest) { return quest.id === item.id; });
    const row = document.createElement('li');
    row.className = 'quest' + (item.done ? ' quest-done' : '');
    const mark = item.done ? '✅ ' : '⬜ ';
    const progress = item.done ? 'готово' : Math.min(item.progress, type.goal) + ' из ' + type.goal;
    row.textContent = mark + type.text + ' (' + progress + '). Награда: ' + questRewardText(type.reward);
    container.appendChild(row);
  }
}
