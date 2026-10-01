// =============================================================
// MewMo — кошачья кухня (режим «Дом»)
// =============================================================
// Из ингредиентов, найденных на прогулке, готовим угощения для котов.
// Готовка — 3 шага:
//   1. «Смешать» — водить пальцем по кругу в миске (3 круга);
//   2. «Слепить» — нажать на тесто 6 раз;
//   3. «Испечь»  — подождать 10 секунд, окошко духовки мягко светится
//                   (никакого огня и опасных действий).
// Ингредиенты списываются только в конце, поэтому если закрыть кухню
// посреди готовки — ничего не пропадёт.
// Рецепты и правила — в logic.js (RECIPES, canCook, cookRecipe, mixAdd).

// ----- Состояние -----
let cooking = null; // что готовим сейчас: { recipe, step, mix, taps, timer, start }

// ----- Элементы -----
const kitchenWindow = document.getElementById('kitchen');
const kitchenList = document.getElementById('kitchen-list');
const kitchenCook = document.getElementById('kitchen-cook');
const kitchenArea = document.getElementById('kitchen-area');
const kitchenProgress = document.getElementById('kitchen-progress');

// ----- Кнопки -----
document.getElementById('home-kitchen').addEventListener('click', openKitchen);
document.getElementById('kitchen-close').addEventListener('click', closeKitchen);
document.getElementById('kitchen-back').addEventListener('click', showRecipes);
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && !kitchenWindow.classList.contains('hidden')) closeKitchen();
});

function openKitchen() {
  kitchenWindow.classList.remove('hidden');
  showRecipes();
}

function closeKitchen() {
  stopCooking();
  kitchenWindow.classList.add('hidden');
}

function stopCooking() {
  if (cooking) clearInterval(cooking.timer);
  cooking = null;
  kitchenArea.textContent = '';
}

// =============================================================
// Список рецептов
// =============================================================
function showRecipes() {
  stopCooking();
  kitchenCook.classList.add('hidden');
  kitchenList.classList.remove('hidden');
  kitchenList.textContent = '';

  const fish = document.createElement('p');
  fish.className = 'album-fish';
  fish.textContent = 'У тебя 🐟 ' + save.fish;
  kitchenList.appendChild(fish);
  // Первое знакомство с кухней — плашка-подсказка (minigames.js)
  showHintPlaque('kitchen', kitchenList, 'Кошачья кухня',
    'Выбери рецепт и приготовь угощение: смешай, слепи, испеки. ' +
    'Ингредиенты находятся только на прогулке — у маяков и в капсулах. ' +
    'Угощение дари коту в убежище: так дружба растёт быстрее.');

  for (let i = 0; i < RECIPES.length; i++) {
    kitchenList.appendChild(makeRecipeCard(RECIPES[i]));
  }
}

// Карточка рецепта: картинка, название, сколько есть, что нужно, «Готовить»
function makeRecipeCard(recipe) {
  const card = document.createElement('div');
  card.className = 'recipe';

  const head = document.createElement('div');
  head.className = 'recipe-head';
  const icon = document.createElement('span');
  icon.className = 'recipe-icon';
  icon.innerHTML = treatIcon(recipe.id); // art.js
  const title = document.createElement('span');
  title.textContent = recipe.name + (save.treats[recipe.id] ? ' (есть: ' + save.treats[recipe.id] + ')' : '');
  head.appendChild(icon);
  head.appendChild(title);
  card.appendChild(head);

  // Что нужно: иконка ингредиента и «есть / нужно»
  const needs = document.createElement('div');
  needs.className = 'recipe-needs';
  const ids = Object.keys(recipe.needs);
  for (let i = 0; i < ids.length; i++) {
    const have = save.pantry[ids[i]] || 0;
    const need = document.createElement('span');
    need.className = 'recipe-need' + (have < recipe.needs[ids[i]] ? ' missing' : '');
    need.innerHTML = '<span class="pantry-icon">' + ingredientIcon(ids[i]) + '</span>';
    const text = document.createElement('span');
    text.textContent = findIngredient(ids[i]).name + ' ' + have + '/' + recipe.needs[ids[i]];
    need.appendChild(text);
    needs.appendChild(need);
  }
  if (recipe.fish > 0) {
    const fishNeed = document.createElement('span');
    fishNeed.className = 'recipe-need' + (save.fish < recipe.fish ? ' missing' : '');
    fishNeed.textContent = '🐟 ' + save.fish + '/' + recipe.fish;
    needs.appendChild(fishNeed);
  }
  card.appendChild(needs);

  const button = document.createElement('button');
  button.className = 'big-button';
  button.textContent = 'Готовить';
  button.disabled = !canCook(save, recipe); // logic.js
  button.addEventListener('click', function () { startCooking(recipe); });
  card.appendChild(button);
  return card;
}

// =============================================================
// Готовка: смешать → слепить → испечь
// =============================================================
function startCooking(recipe) {
  kitchenList.classList.add('hidden');
  kitchenCook.classList.remove('hidden');
  document.getElementById('kitchen-back').classList.add('hidden');
  cooking = { recipe: recipe, step: 1, mix: { lastAngle: null, total: 0 }, taps: 0, timer: null, start: 0 };
  showMixStep();
}

function setStep(title, hint, progress) {
  document.getElementById('kitchen-step').textContent = title;
  document.getElementById('kitchen-hint').textContent = hint;
  kitchenProgress.style.width = (progress * 100) + '%';
}

// Шаг 1: водим пальцем по кругу в миске
function showMixStep() {
  setStep('Шаг 1 из 3: смешать', 'Води пальцем по кругу в миске (3 круга).', 0);
  kitchenArea.innerHTML = '<div class="kitchen-bowl" aria-label="Миска: води пальцем по кругу">' + bowlPicture() + '</div>';
  const bowl = kitchenArea.querySelector('.kitchen-bowl');
  let pressed = false;

  function move(event) {
    if (!pressed || !cooking || cooking.step !== 1) return;
    const rect = bowl.getBoundingClientRect();
    // Угол пальца относительно центра миски
    const angle = Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2));
    cooking.mix = mixAdd(cooking.mix, angle); // logic.js
    const progress = mixProgress(cooking.mix);
    kitchenProgress.style.width = (progress * 100) + '%';
    if (progress >= 1) {
      cooking.step = 2;
      playTone(392, 0.25);
      showShapeStep();
    }
  }
  bowl.addEventListener('pointerdown', function (event) {
    pressed = true;
    cooking.mix.lastAngle = null; // начинаем новый круг с того места, где палец
    move(event);
  });
  bowl.addEventListener('pointermove', move);
  bowl.addEventListener('pointerup', function () { pressed = false; });
  bowl.addEventListener('pointerleave', function () { pressed = false; });
}

// Шаг 2: лепим — нажимаем на тесто
function showShapeStep() {
  setStep('Шаг 2 из 3: слепить', 'Нажимай на тесто, чтобы слепить угощение.', 0);
  kitchenArea.innerHTML = '<button class="kitchen-dough" aria-label="Тесто: нажимай">' + doughPicture() + '</button>';
  const dough = kitchenArea.querySelector('.kitchen-dough');
  dough.addEventListener('click', function () {
    if (!cooking || cooking.step !== 2) return;
    cooking.taps = cooking.taps + 1;
    playTone(330 + cooking.taps * 30, 0.12);
    // Тесто немного меняет форму с каждым нажатием
    dough.style.scale = (1 - cooking.taps * 0.04) + ' ' + (1 + cooking.taps * 0.02);
    kitchenProgress.style.width = (cooking.taps / SHAPE_TAPS * 100) + '%';
    if (cooking.taps >= SHAPE_TAPS) {
      cooking.step = 3;
      showBakeStep();
    }
  });
}

// Шаг 3: печём 10 секунд, окошко духовки светится
function showBakeStep() {
  setStep('Шаг 3 из 3: испечь', 'Духовка печёт. Подожди немного…', 0);
  kitchenArea.innerHTML = '<div class="kitchen-oven baking">' + ovenPicture() + '</div>';
  cooking.start = Date.now();
  cooking.timer = setInterval(function () {
    const seconds = (Date.now() - cooking.start) / 1000;
    kitchenProgress.style.width = Math.min(100, seconds / BAKE_SECONDS * 100) + '%';
    document.getElementById('kitchen-hint').textContent =
      'Духовка печёт. Осталось ' + Math.max(0, Math.ceil(BAKE_SECONDS - seconds)) + ' с…';
    if (seconds >= BAKE_SECONDS) {
      clearInterval(cooking.timer);
      finishCooking();
    }
  }, 200);
}

// Готово: ингредиенты списываются, угощение — в запас
function finishCooking() {
  const recipe = cooking.recipe;
  save = cookRecipe(save, recipe.id); // logic.js
  saveGame();
  cooking = null;
  playSound('reward');
  setStep('Готово!', recipe.name + ' — в запасе: ' + (save.treats[recipe.id] || 0) +
    '. Угости кота в убежище: нажми на него.', 1);
  kitchenArea.innerHTML = '<div class="recipe-icon kitchen-done">' + treatIcon(recipe.id) + '</div>';
  const back = document.getElementById('kitchen-back');
  back.classList.remove('hidden');
  back.focus();
}
