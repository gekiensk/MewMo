// Тесты игр с котами: «Лазерная указка» и «Мячик»
const test = require('node:test');
const assert = require('node:assert');
const logic = require('../logic.js');

test('игра с котом: +2 очка дружбы раз в день', function () {
  let save = logic.emptySave();
  assert.strictEqual(logic.canGetPlayPoints(save, 'bul', '2026-10-01'), true);
  let result = logic.applyPlayReward(save, 'bul', '2026-10-01');
  assert.strictEqual(result.given, true);
  assert.strictEqual(result.save.friendship.bul, logic.PLAY_POINTS);
  save = result.save;
  // второй раз в тот же день — без очков (но играть можно)
  result = logic.applyPlayReward(save, 'bul', '2026-10-01');
  assert.strictEqual(result.given, false);
  assert.strictEqual(result.save.friendship.bul, 2);
  // другой кот в тот же день — очки есть
  result = logic.applyPlayReward(save, 'moh', '2026-10-01');
  assert.strictEqual(result.given, true);
  assert.deepStrictEqual(result.save.playToday.cats, ['bul', 'moh']);
  // назавтра — снова можно
  result = logic.applyPlayReward(save, 'bul', '2026-10-02');
  assert.strictEqual(result.given, true);
  assert.strictEqual(result.save.friendship.bul, 4);
  assert.deepStrictEqual(result.save.playToday, { day: '2026-10-02', cats: ['bul'] });
});

test('игра с котом может поднять уровень дружбы', function () {
  const save = logic.emptySave();
  save.friendship.bul = 4;
  const result = logic.applyPlayReward(save, 'bul', '2026-10-01');
  assert.strictEqual(result.levelUp, true);
  assert.strictEqual(result.level, 1);
});

test('старое сохранение без playToday — играли сегодня ни с кем', function () {
  const save = logic.cleanSave({ crew: { bul: 1 } });
  assert.deepStrictEqual(save.playToday, { day: '', cats: [] });
  const broken = logic.cleanSave({ playToday: { day: 5, cats: 'bul' } });
  assert.deepStrictEqual(broken.playToday, { day: '', cats: [] });
});

test('кот бежит к цели, но не быстрее своей скорости', function () {
  const pos = logic.chaseStep({ x: 0, y: 0 }, { x: 300, y: 400 }, 100, 1);
  assert.ok(Math.abs(pos.x - 60) < 1e-9 && Math.abs(pos.y - 80) < 1e-9);
  // близко — встаёт прямо на цель
  assert.deepStrictEqual(logic.chaseStep({ x: 0, y: 0 }, { x: 3, y: 4 }, 100, 1), { x: 3, y: 4 });
  assert.strictEqual(logic.pointDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

test('«уменьшить движение» — вдвое медленнее', function () {
  assert.strictEqual(logic.playSpeed(220, false), 220);
  assert.strictEqual(logic.playSpeed(220, true), 110);
});

test('бросок мячика: скорость от взмаха, но не больше предела', function () {
  assert.deepStrictEqual(logic.throwVelocity(100, 0, 200), { vx: 500, vy: 0 });
  const fast = logic.throwVelocity(0, -1000, 50);
  assert.ok(Math.abs(fast.vy + logic.BALL_MAX_SPEED) < 1e-9);
  // слишком короткий взмах не даёт бесконечной скорости
  const quick = logic.throwVelocity(10, 0, 0);
  assert.ok(Number.isFinite(quick.vx));
});

test('мячик тормозит, отскакивает от стенок и останавливается', function () {
  let ball = { x: 290, y: 100, vx: 600, vy: 0 };
  ball = logic.ballStep(ball, 0.1, 300, 300, 15);
  assert.strictEqual(ball.x, 285);      // упёрся в правую стенку
  assert.ok(ball.vx < 0);               // и полетел обратно
  assert.ok(Math.abs(ball.vx) < 600);   // медленнее, чем был
  for (let i = 0; i < 200; i++) ball = logic.ballStep(ball, 0.05, 300, 300, 15);
  assert.strictEqual(logic.ballStopped(ball), true);
  assert.ok(ball.x >= 15 && ball.x <= 285);
});
