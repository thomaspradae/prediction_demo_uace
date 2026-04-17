const POLL_MS = 1000;
const STORAGE_KEY = "prediction-market-player-id";

function getStoredPlayerId() {
  return localStorage.getItem(STORAGE_KEY);
}

function setStoredPlayerId(playerId) {
  localStorage.setItem(STORAGE_KEY, playerId);
}

function clearStoredPlayerId() {
  localStorage.removeItem(STORAGE_KEY);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "La solicitud falló.");
  }
  return data;
}

async function getState(playerId) {
  const query = playerId ? `?playerId=${encodeURIComponent(playerId)}` : "";
  return requestJson(`/api/state${query}`);
}

function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = byId(id);
  if (element) {
    element.textContent = value;
  }
}

function setHtml(id, value) {
  const element = byId(id);
  if (element) {
    element.innerHTML = value;
  }
}

function showMessage(id, text, tone = "error") {
  const element = byId(id);
  if (!element) {
    return;
  }
  element.textContent = text;
  element.className = `banner ${tone}`;
  element.hidden = false;
}

function clearMessage(id) {
  const element = byId(id);
  if (!element) {
    return;
  }
  element.hidden = true;
  element.textContent = "";
  element.className = "banner";
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function sideClass(side) {
  return side === "YES" ? "side-yes" : "side-no";
}

function labelSide(side) {
  return side === "YES" ? "SÍ" : "NO";
}

function labelPhase(phase) {
  if (phase === "join") {
    return "Sala";
  }
  if (phase === "trading") {
    return "Operando";
  }
  if (phase === "resolved") {
    return "Resuelta";
  }
  return phase;
}

function renderRecentTrades(trades, targetId, emptyText = "Todavía no hay operaciones.") {
  const container = byId(targetId);
  if (!container) {
    return;
  }

  if (!trades.length) {
    container.innerHTML = `<li class="simple-item muted">${emptyText}</li>`;
    return;
  }

  container.innerHTML = trades
    .map(
      (trade) => `
        <li class="feed-item">
          <span class="${sideClass(trade.side)}">${escapeHtml(trade.label)}</span>
          <span class="feed-time">${trade.atLabel}</span>
        </li>
      `
    )
    .join("");
}

function renderPriceHistory(history, targetId, emptyText = "El historial de precio aparecerá aquí.") {
  const container = byId(targetId);
  if (!container) {
    return;
  }

  if (!history.length) {
    container.innerHTML = `<li class="simple-item muted">${emptyText}</li>`;
    return;
  }

  container.innerHTML = history
    .slice()
    .reverse()
    .map(
      (point) => `
        <li class="history-item">
          <span>${escapeHtml(point.label)}</span>
          <span class="history-time">${point.atLabel}</span>
        </li>
      `
    )
    .join("");
}

function drawChart(canvasId, history) {
  const canvas = byId(canvasId);
  if (!canvas) {
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 300;
  const height = canvas.clientHeight || 210;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  const context = canvas.getContext("2d");
  context.scale(dpr, dpr);
  context.clearRect(0, 0, width, height);

  context.fillStyle = "rgba(255,255,255,0.02)";
  context.fillRect(0, 0, width, height);

  const padding = 18;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 1;
  for (const y of [0.25, 0.5, 0.75]) {
    const yPos = padding + chartHeight * y;
    context.beginPath();
    context.moveTo(padding, yPos);
    context.lineTo(width - padding, yPos);
    context.stroke();
  }

  if (!history.length) {
    context.fillStyle = "#9ba7b4";
    context.font = "14px sans-serif";
    context.fillText("Esperando datos de precio", padding, height / 2);
    return;
  }

  context.strokeStyle = "#58a6ff";
  context.lineWidth = 3;
  context.beginPath();

  history.forEach((point, index) => {
    const x =
      history.length === 1
        ? padding + chartWidth / 2
        : padding + (chartWidth * index) / (history.length - 1);
    const y = padding + chartHeight * (1 - point.value);
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();

  const last = history[history.length - 1];
  const lastX =
    history.length === 1
      ? padding + chartWidth / 2
      : padding + chartWidth;
  const lastY = padding + chartHeight * (1 - last.value);

  context.fillStyle = "#58a6ff";
  context.beginPath();
  context.arc(lastX, lastY, 5, 0, Math.PI * 2);
  context.fill();
}

function countdownText(state) {
  if (state.phase !== "trading" || !state.tradingEndsAt) {
    return state.phase === "resolved" ? "Ronda resuelta" : "Esperando a empezar";
  }

  const msLeft = Math.max(0, state.tradingEndsAt - state.serverTime);
  return `${Math.ceil(msLeft / 1000)} segundos restantes`;
}

function redirectToPlayIfJoined() {
  const playerId = getStoredPlayerId();
  if (playerId) {
    window.location.href = "/play";
  }
}
