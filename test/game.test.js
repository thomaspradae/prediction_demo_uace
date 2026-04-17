const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createEmptyGame,
  joinGame,
  startRound,
  trade,
  buildState
} = require("../lib/game");

test("joining adds a player to the lobby", () => {
  const game = createEmptyGame();
  const player = joinGame(game, "Ada");

  assert.equal(game.playerOrder.length, 1);
  assert.equal(player.name, "Ada");
});

test("trading updates holdings and price", () => {
  const game = createEmptyGame();
  const player = joinGame(game, "Grace");
  startRound(game, 30);

  const before = game.price;
  trade(game, player.id, "YES");
  const state = buildState(game, player.id);

  assert.equal(state.player.yesShares, 1);
  assert.equal(state.price > before, true);
});
