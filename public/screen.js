const startButton = byId("start-round");
const resolveButton = byId("resolve-round");
const resetButton = byId("reset-game");

async function controlRound(path, body = {}) {
  clearMessage("screen-message");
  try {
    const state = await requestJson(path, {
      method: "POST",
      body: JSON.stringify(body)
    });
    renderScreen(state);
  } catch (error) {
    showMessage("screen-message", error.message);
  }
}

function renderResolution(state) {
  if (state.phase !== "resolved") {
    setHtml(
      "resolution-banner",
      "El resultado aparecerá aquí cuando se resuelva la ronda."
    );
    byId("resolution-banner").className = "banner";
    return;
  }

  const outcomeText = labelSide(state.finalOutcome);
  const biasText = state.trueBias === 0.7 ? "Bolsa 70% roja" : "Bolsa 30% roja";
  const banner = byId("resolution-banner");

  banner.className = "banner success";
  banner.innerHTML = `
    Resultado final: <strong>${outcomeText}</strong><br>
    Precio final del mercado antes de resolver: <strong>${state.impliedProbability}%</strong><br>
    Sesgo oculto de la bolsa: <strong>${biasText}</strong>
  `;
}

function renderScreen(state) {
  setText("screen-question", state.question);
  setText("screen-price", `$${state.price.toFixed(2)}`);
  setText("screen-probability", `Probabilidad implícita = ${state.impliedProbability}%`);
  setText("screen-timer", countdownText(state));
  setText("screen-phase", labelPhase(state.phase));
  setText("screen-count", String(state.playerCount));
  setText("screen-round", String(state.roundNumber));
  renderRecentTrades(state.recentTrades, "screen-trades");
  renderPriceHistory(state.priceHistory, "screen-history");
  drawChart("price-chart", state.priceHistory);
  renderResolution(state);

  startButton.disabled = state.phase !== "join";
  resolveButton.disabled = state.phase !== "trading";
}

async function refreshScreen() {
  try {
    const state = await getState();
    renderScreen(state);
  } catch (error) {
    showMessage("screen-message", error.message);
  }
}

startButton.addEventListener("click", () => controlRound("/api/start", { roundSeconds: 30 }));
resolveButton.addEventListener("click", () => controlRound("/api/resolve"));
resetButton.addEventListener("click", () => controlRound("/api/reset"));

refreshScreen();
setInterval(refreshScreen, POLL_MS);
