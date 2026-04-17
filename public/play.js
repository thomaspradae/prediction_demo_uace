const playerId = getStoredPlayerId();
const buyYesButton = byId("buy-yes");
const buyNoButton = byId("buy-no");

let latestState = null;
let cooldownUntil = 0;
let cooldownTimerHandle = null;

function updateButtonLabels() {
  const now = Date.now();
  const remainMs = cooldownUntil - now;
  const canTradeNow = latestState && latestState.phase === "trading";

  if (!canTradeNow) {
    buyYesButton.disabled = true;
    buyNoButton.disabled = true;
    buyYesButton.textContent = "Votar SÍ";
    buyNoButton.textContent = "Votar NO";
    return;
  }

  if (remainMs > 0) {
    const secs = (remainMs / 1000).toFixed(1);
    buyYesButton.disabled = true;
    buyNoButton.disabled = true;
    buyYesButton.textContent = `Espera ${secs}s`;
    buyNoButton.textContent = `Espera ${secs}s`;
  } else {
    buyYesButton.disabled = false;
    buyNoButton.disabled = false;
    buyYesButton.textContent = "Votar SÍ";
    buyNoButton.textContent = "Votar NO";
  }
}

function startCooldownTicker() {
  if (cooldownTimerHandle) return;
  cooldownTimerHandle = setInterval(() => {
    updateButtonLabels();
    if (Date.now() >= cooldownUntil) {
      clearInterval(cooldownTimerHandle);
      cooldownTimerHandle = null;
    }
  }, 100);
}

function setCooldown(ms) {
  const target = Date.now() + Math.max(0, ms);
  if (target > cooldownUntil) {
    cooldownUntil = target;
  }
  updateButtonLabels();
  startCooldownTicker();
}

async function doTrade(side) {
  if (!playerId) {
    window.location.href = "/";
    return;
  }
  if (Date.now() < cooldownUntil) return;

  clearMessage("play-message");

  // Optimistically start cooldown so double-taps can't spam
  const optimisticCooldown =
    latestState && latestState.tradeCooldownMs
      ? latestState.tradeCooldownMs
      : 1500;
  setCooldown(optimisticCooldown);

  try {
    const response = await requestJson("/api/trade", {
      method: "POST",
      body: JSON.stringify({ playerId, side })
    });
    latestState = response.state;
    renderPlayerState(response.state);
  } catch (error) {
    if (error.status === 429 || error.code === "COOLDOWN" || error.code === "IP_RATE_LIMIT") {
      if (typeof error.remainMs === "number" && error.remainMs > 0) {
        setCooldown(error.remainMs);
      }
      showMessage("play-message", error.message, "error");
    } else {
      cooldownUntil = 0;
      updateButtonLabels();
      showMessage("play-message", error.message);
    }
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
  const scenario = state.scenario;

  if (scenario) {
    setText("round-label", scenario.label);
    setText("player-question", scenario.question);
    setText("scenario-context", scenario.context);
  } else {
    setText("round-label", "Esperando");
    setText("player-question", "Esperando la primera ronda...");
    setText("scenario-context", "");
  }

  setText("player-name", player.name);

  if (state.phase === "join") {
    setText("player-clue", "Esperando a que el moderador inicie la ronda.");
    const badge = byId("clue-badge");
    if (badge) badge.hidden = true;
  } else {
    setText("player-clue", player.clueText);
    const badge = byId("clue-badge");
    if (badge) {
      badge.hidden = false;
      badge.textContent = player.informed
        ? "TIENES INFO PRIVILEGIADA"
        : "SIN INFO PRIVILEGIADA";
      badge.className = player.informed
        ? "clue-badge informed"
        : "clue-badge uninformed";
    }
  }

  setText("player-cash", money(player.cash));
  setText("player-yes", String(player.yesShares));
  setText("player-no", String(player.noShares));
  setText("player-price", `$${state.price.toFixed(2)}`);
  setText(
    "player-probability",
    `Probabilidad implícita = ${state.impliedProbability}%`
  );
  setText("player-timer", countdownText(state));
  renderRecentTrades(state.recentTrades, "player-trades");

  if (
    typeof player.cooldownRemainingMs === "number" &&
    player.cooldownRemainingMs > 0
  ) {
    setCooldown(player.cooldownRemainingMs);
  } else {
    updateButtonLabels();
  }

  if (state.phase === "resolved" && state.finalOutcome) {
    const msg = state.isGameOver
      ? `¡Juego terminado! Resultado de esta ronda: ${labelSide(state.finalOutcome)}. Ve al Leaderboard para ver las posiciones finales.`
      : `Ronda resuelta: ${labelSide(state.finalOutcome)}. Espera a que el moderador inicie la siguiente ronda.`;
    showMessage("play-message", msg, "success");
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
