const searchInput = byId("search-input");
let lastState = null;
let consecutiveErrors = 0;

function buildRowData(state) {
  const cumulative = Array.isArray(state.cumulative) ? state.cumulative : [];
  const history = Array.isArray(state.roundHistory) ? state.roundHistory : [];
  const liveBoard = Array.isArray(state.leaderboard) ? state.leaderboard : [];

  const rows = cumulative.map((entry) => {
    const base = {
      id: entry.id,
      name: entry.name,
      roundProfits: (entry.roundProfits || []).slice(),
      roundRoles: (entry.roundRoles || []).slice(),
      totalProfit: Number(entry.totalProfit || 0),
      liveProfit: null,
      liveRole: null
    };

    if (state.phase === "trading" && state.currentRound >= 0) {
      const live = liveBoard.find((e) => e.id === entry.id);
      if (live) {
        base.liveProfit = live.profit;
        base.liveRole = live.informed ? "Informado" : "No informado";
      }
    }

    return base;
  });

  return { rows, history };
}

function renderLeaderboard(state) {
  if (!state) return;
  lastState = state;

  const { rows, history } = buildRowData(state);
  const filter = (searchInput.value || "").trim().toLowerCase();

  const connEl = byId("connection-status");
  if (connEl) {
    connEl.hidden = true;
  }

  if (state.isGameOver) {
    setText("lb-title", "¡Juego terminado!");
    setText("lb-subtitle", "Posiciones finales tras todas las rondas.");
  } else if (state.phase === "trading") {
    setText("lb-title", "Leaderboard en vivo");
    setText(
      "lb-subtitle",
      `Ronda ${state.currentRound + 1} de ${state.totalRounds} en curso. Las ganancias provisionales se liquidan cuando se resuelve.`
    );
  } else if (history.length > 0) {
    setText("lb-title", "Posiciones generales");
    setText(
      "lb-subtitle",
      `${history.length} de ${state.totalRounds} rondas completadas.`
    );
  } else if (rows.length > 0) {
    setText("lb-title", "Sala de espera");
    setText(
      "lb-subtitle",
      `${rows.length} jugador(es) esperando. Aún no hay rondas jugadas.`
    );
  } else {
    setText("lb-title", "Leaderboard");
    setText("lb-subtitle", "Aún no hay jugadores. Comparte el enlace de la sala.");
  }

  if (history.length > 0) {
    const summaryHtml = history
      .map(
        (r) =>
          `<div class="round-chip">
            <strong>${escapeHtml(r.label)}</strong>: ${escapeHtml(r.question)}
            — Respuesta: <span class="${sideClass(r.correctAnswer)}">${labelSide(r.correctAnswer)}</span>
            — Precio final: ${r.impliedProbability}%
          </div>`
      )
      .join("");
    setHtml("round-history-summary", summaryHtml);
  } else {
    setHtml(
      "round-history-summary",
      '<span class="muted">Sin rondas completadas aún.</span>'
    );
  }

  const showLiveCol = state.phase === "trading";
  const roundHeaders = history
    .map((r) => `<th>${escapeHtml(r.label)}</th>`)
    .join("");
  const liveHeader = showLiveCol
    ? `<th>En vivo (R${state.currentRound + 1})</th>`
    : "";
  setHtml(
    "lb-head",
    `<tr><th>#</th><th>Nombre</th>${roundHeaders}${liveHeader}<th>Total</th></tr>`
  );

  let filtered = rows;
  if (filter) {
    filtered = rows.filter((r) => r.name.toLowerCase().includes(filter));
  }

  if (!filtered.length) {
    const cols = 3 + history.length + (showLiveCol ? 1 : 0);
    const msg = filter
      ? "Ningún jugador coincide con la búsqueda."
      : rows.length === 0
        ? "Sin jugadores aún."
        : "Sin coincidencias.";
    setHtml(
      "lb-body",
      `<tr><td colspan="${cols}" class="center muted">${msg}</td></tr>`
    );
    return;
  }

  const rankMap = new Map();
  rows.forEach((r, i) => rankMap.set(r.id, i + 1));

  const bodyHtml = filtered
    .map((entry) => {
      const globalRank = rankMap.get(entry.id) || 0;
      const roundCells = entry.roundProfits
        .map((p, i) => {
          const profitClass = p >= 0 ? "side-yes" : "side-no";
          const role = entry.roundRoles[i] || "-";
          return `<td>
              <span class="${profitClass}">${signedMoney(p)}</span>
              <span class="role-tag">${escapeHtml(role)}</span>
            </td>`;
        })
        .join("");

      let liveCell = "";
      if (showLiveCol) {
        if (entry.liveProfit !== null) {
          const lpClass = entry.liveProfit >= 0 ? "side-yes" : "side-no";
          liveCell = `<td>
            <span class="${lpClass}">${signedMoney(entry.liveProfit)}</span>
            <span class="role-tag">provisional · ${escapeHtml(entry.liveRole || "-")}</span>
          </td>`;
        } else {
          liveCell = '<td class="muted">—</td>';
        }
      }

      const isTop3 = globalRank <= 3 && history.length > 0;
      return `
        <tr class="${isTop3 ? "row-highlight" : ""}">
          <td class="rank">${globalRank}</td>
          <td><strong>${escapeHtml(entry.name)}</strong></td>
          ${roundCells}
          ${liveCell}
          <td class="total-cell"><strong>${signedMoney(entry.totalProfit)}</strong></td>
        </tr>`;
    })
    .join("");

  setHtml("lb-body", bodyHtml);
}

function renderConnectionError(message) {
  const connEl = byId("connection-status");
  if (connEl) {
    connEl.hidden = false;
    connEl.className = "banner error";
    connEl.textContent = message;
  }

  if (!lastState) {
    setText("lb-title", "Sin conexión");
    setText("lb-subtitle", "Reintentando...");
    setHtml(
      "lb-body",
      '<tr><td colspan="3" class="center muted">Reintentando conectar...</td></tr>'
    );
  }
}

async function refreshLeaderboard() {
  try {
    const state = await getState();
    consecutiveErrors = 0;
    renderLeaderboard(state);
  } catch (error) {
    consecutiveErrors += 1;
    if (consecutiveErrors >= 2) {
      renderConnectionError(
        `Conexión intermitente (${consecutiveErrors} reintentos). ${error.message}`
      );
    }
  }
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    if (lastState) renderLeaderboard(lastState);
  });
}

refreshLeaderboard();
setInterval(refreshLeaderboard, POLL_MS * 2);
