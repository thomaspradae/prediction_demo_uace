const startButton = byId("start-round");
const resolveButton = byId("resolve-round");
const resetButton = byId("reset-game");
const outcomeModal = byId("outcome-modal");
const closeOutcomeButton = byId("close-outcome-modal");

let shownResolutionKey = null;

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
  const banner = byId("resolution-banner");
  if (!banner) return;

  if (state.phase !== "resolved") {
    banner.className = "banner";
    banner.innerHTML = "El resultado aparecerá aquí cuando se resuelva la ronda.";
    return;
  }

  const outcomeText = labelSide(state.finalOutcome);
  const scenario = state.scenario;
  banner.className = "banner success";
  banner.innerHTML = `
    Resultado: <strong>${outcomeText}</strong><br>
    Precio final del mercado: <strong>${state.impliedProbability}%</strong><br>
    Escenario: <strong>${escapeHtml(scenario ? scenario.question : "")}</strong>
  `;
}

function closeOutcomeModal() {
  if (!outcomeModal) return;
  outcomeModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function openOutcomeModal(state) {
  if (!outcomeModal || state.phase !== "resolved" || !state.finalOutcome) return;

  const scenario = state.scenario;
  const outcomeText = labelSide(state.finalOutcome);
  const title = byId("outcome-modal-title");

  if (title) {
    title.textContent = outcomeText;
    title.className = `modal-outcome ${
      state.finalOutcome === "YES" ? "modal-outcome-yes" : "modal-outcome-no"
    }`;
  }

  setText(
    "outcome-modal-summary",
    state.isGameOver
      ? "Esta fue la última ronda del juego."
      : "La ronda ya se resolvió. Ya puedes anunciar el resultado final."
  );
  setText("outcome-modal-price", `${state.impliedProbability}%`);
  setText("outcome-modal-round", scenario ? scenario.label : `Ronda ${state.currentRound + 1}`);
  setText("outcome-modal-question", scenario ? scenario.question : "");

  outcomeModal.hidden = false;
  document.body.classList.add("modal-open");
}

function syncOutcomeModal(state) {
  if (state.phase === "join" && state.currentRound < 0) {
    shownResolutionKey = null;
    closeOutcomeModal();
    return;
  }

  if (state.phase !== "resolved" || !state.finalOutcome) {
    closeOutcomeModal();
    return;
  }

  const resolutionKey = `${state.currentRound}:${state.finalOutcome}`;
  if (resolutionKey !== shownResolutionKey) {
    shownResolutionKey = resolutionKey;
    openOutcomeModal(state);
  }
}

function renderScreen(state) {
  const scenario = state.scenario;

  if (scenario) {
    setText("screen-round-label", scenario.label);
    setText("screen-question", scenario.question);
    setText("screen-context", scenario.context);
  } else {
    setText("screen-round-label", "Esperando");
    setText("screen-question", "Esperando primera ronda...");
    setText("screen-context", "");
  }

  setText("screen-price", `$${state.price.toFixed(2)}`);
  setText("screen-probability", `Probabilidad implícita = ${state.impliedProbability}%`);
  setText("screen-timer", countdownText(state));
  setText("screen-phase", labelPhase(state.phase));
  setText("screen-count", String(state.playerCount));
  setText("screen-progress-label", state.phase === "trading" ? "Tiempo" : "Estado");
  setText("screen-progress", state.phase === "trading" ? countdownClockText(state) : progressText(state));

  renderRecentTrades(state.recentTrades, "screen-trades");
  renderPriceHistory(state.priceHistory, "screen-history");
  drawChart("price-chart", state.priceHistory);
  renderResolution(state);
  syncOutcomeModal(state);

  const canStart = state.phase === "join" || (state.phase === "resolved" && !state.isGameOver);
  startButton.disabled = !canStart;
  resolveButton.disabled = state.phase !== "trading";

  if (canStart && state.upcomingLabel) {
    startButton.textContent = `Empezar ${state.upcomingLabel || "ronda"}`;
  } else if (state.isGameOver) {
    startButton.textContent = "Juego terminado";
  } else {
    startButton.textContent = "Empezar ronda";
  }

  const upcomingSection = byId("upcoming-section");
  if (upcomingSection) {
    if (state.phase === "resolved" && state.upcomingLabel && !state.isGameOver) {
      upcomingSection.hidden = false;
      setText("upcoming-label", `Siguiente: ${state.upcomingLabel}`);
    } else if (state.isGameOver) {
      upcomingSection.hidden = false;
      setText("upcoming-label", "¡Juego terminado! Ve al Leaderboard para las posiciones finales.");
    } else {
      upcomingSection.hidden = true;
    }
  }
}

async function refreshScreen() {
  try {
    const state = await getState();
    renderScreen(state);
  } catch (error) {
    showMessage("screen-message", error.message);
  }
}

startButton.addEventListener("click", () =>
  controlRound("/api/start", { roundSeconds: 120 })
);
resolveButton.addEventListener("click", () => controlRound("/api/resolve"));
resetButton.addEventListener("click", () => {
  if (confirm("¿Reiniciar todo el juego? Se pierden todos los datos.")) {
    controlRound("/api/reset");
  }
});

if (closeOutcomeButton) {
  closeOutcomeButton.addEventListener("click", closeOutcomeModal);
}

if (outcomeModal) {
  outcomeModal.addEventListener("click", (event) => {
    if (event.target === outcomeModal) {
      closeOutcomeModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && outcomeModal && !outcomeModal.hidden) {
    closeOutcomeModal();
  }
});

refreshScreen();
setInterval(refreshScreen, POLL_MS);
