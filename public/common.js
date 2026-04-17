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
  const el = byId(id);
  if (el) el.textContent = value;
}

function setHtml(id, value) {
  const el = byId(id);
  if (el) el.innerHTML = value;
}

function showMessage(id, text, tone = "error") {
  const el = byId(id);
  if (!el) return;
  el.textContent = text;
  el.className = `banner ${tone}`;
  el.hidden = false;
}

function clearMessage(id) {
  const el = byId(id);
  if (!el) return;
  el.hidden = true;
  el.textContent = "";
  el.className = "banner";
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function signedMoney(value) {
  const n = Number(value || 0);
  const prefix = n >= 0 ? "+" : "";
  return `${prefix}$${n.toFixed(2)}`;
}

function sideClass(side) {
  return side === "YES" ? "side-yes" : "side-no";
}

function labelSide(side) {
  return side === "YES" ? "SÍ" : "NO";
}

function labelPhase(phase) {
  if (phase === "join") return "Sala";
  if (phase === "trading") return "Operando";
  if (phase === "resolved") return "Resuelta";
  return phase;
}

function roundLabel(state) {
  if (!state.scenario) return "—";
  return state.scenario.label;
}

function progressText(state) {
  if (state.currentRound < 0) return "Sin empezar";
  return `Ronda ${state.currentRound + 1} de ${state.totalRounds}`;
}

function renderRecentTrades(trades, targetId, emptyText = "Sin operaciones aún.") {
  const container = byId(targetId);
  if (!container) return;

  if (!trades.length) {
    container.innerHTML = `<li class="simple-item muted">${emptyText}</li>`;
    return;
  }

  container.innerHTML = trades
    .map(
      (t) => `
        <li class="feed-item">
          <span class="${sideClass(t.side)}">${escapeHtml(t.label)}</span>
          <span class="feed-time">${t.atLabel}</span>
        </li>`
    )
    .join("");
}

function renderPriceHistory(history, targetId) {
  const container = byId(targetId);
  if (!container) return;

  if (!history.length) {
    container.innerHTML = '<li class="simple-item muted">El historial aparecerá aquí.</li>';
    return;
  }

  container.innerHTML = history
    .slice()
    .reverse()
    .map(
      (p) => `
        <li class="history-item">
          <span>${escapeHtml(p.label)}</span>
          <span class="history-time">${p.atLabel}</span>
        </li>`
    )
    .join("");
}

function drawChart(canvasId, history) {
  const canvas = byId(canvasId);
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 300;
  const height = canvas.clientHeight || 210;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fillRect(0, 0, width, height);

  const pad = 18;
  const cw = width - pad * 2;
  const ch = height - pad * 2;

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (const y of [0.25, 0.5, 0.75]) {
    const yPos = pad + ch * y;
    ctx.beginPath();
    ctx.moveTo(pad, yPos);
    ctx.lineTo(width - pad, yPos);
    ctx.stroke();
  }

  if (!history.length) {
    ctx.fillStyle = "#9ba7b4";
    ctx.font = "14px sans-serif";
    ctx.fillText("Esperando datos de precio", pad, height / 2);
    return;
  }

  ctx.strokeStyle = "#58a6ff";
  ctx.lineWidth = 3;
  ctx.beginPath();

  history.forEach((point, i) => {
    const x =
      history.length === 1 ? pad + cw / 2 : pad + (cw * i) / (history.length - 1);
    const y = pad + ch * (1 - point.value);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const last = history[history.length - 1];
  const lastX = history.length === 1 ? pad + cw / 2 : pad + cw;
  const lastY = pad + ch * (1 - last.value);

  ctx.fillStyle = "#58a6ff";
  ctx.beginPath();
  ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
  ctx.fill();
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
