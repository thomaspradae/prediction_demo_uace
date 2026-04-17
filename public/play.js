const playerId = getStoredPlayerId();
const buyYesButton = byId("buy-yes");
const buyNoButton = byId("buy-no");

let latestState = null;

async function doTrade(side) {
  if (!playerId) {
    window.location.href = "/";
    return;
  }

  clearMessage("play-message");

  try {
    const response = await requestJson("/api/trade", {
      method: "POST",
      body: JSON.stringify({ playerId, side })
    });
    latestState = response.state;
    renderPlayerState(response.state);
  } catch (error) {
    showMessage("play-message", error.message);
  }
}

function renderPlayerState(state) {
  latestState = state;

  if (!state.player) {
    clearStoredPlayerId();
    window.location.href = "/";
    return;
  }

  const player = state.player;
  setText("player-question", state.question);
  setText("player-name", player.name);
  setText("player-role-pill", player.informed ? "Pista privada activa" : "Sin pista privada");
  setText("player-clue", state.phase === "join" ? "Esperando a que empiece la ronda." : player.clueText);
  setText("player-cash", money(player.cash));
  setText("player-yes", String(player.yesShares));
  setText("player-no", String(player.noShares));
  setText("player-price", `$${state.price.toFixed(2)}`);
  setText("player-probability", `Probabilidad implícita = ${state.impliedProbability}%`);
  setText("player-timer", countdownText(state));
  renderRecentTrades(state.recentTrades, "player-trades");

  const canTradeNow = state.phase === "trading";
  buyYesButton.disabled = !canTradeNow;
  buyNoButton.disabled = !canTradeNow;

  if (state.phase === "resolved") {
    showMessage(
      "play-message",
      `Ronda resuelta: ${labelSide(state.finalOutcome)}. Revisa la página de resultados para ver ganancias y quién movió el precio hacia la verdad.`,
      "success"
    );
  }
}

async function refreshPlayer() {
  if (!playerId) {
    window.location.href = "/";
    return;
  }

  try {
    const state = await getState(playerId);
    renderPlayerState(state);
  } catch (error) {
    showMessage("play-message", error.message);
  }
}

buyYesButton.addEventListener("click", () => doTrade("YES"));
buyNoButton.addEventListener("click", () => doTrade("NO"));

if (!playerId) {
  window.location.href = "/";
} else {
  refreshPlayer();
  setInterval(refreshPlayer, POLL_MS);
}
