import { Game } from './world.js';
const game = new Game(document.getElementById('game'));
game.start().catch(error => {
  console.error(error);
  document.getElementById('loading').innerHTML = '<strong>Не удалось открыть мир</strong><span>Обнови страницу или запусти игру через HTTP-сервер.</span>';
});
window.tiholesye = game;
