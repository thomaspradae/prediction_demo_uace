const searchInput = byId("search-input");
let lastState = null;

function renderLeaderboard(state) {
  lastState = state;

  const cumulative = state.cumulative || [];
  const history = state.roundHistory || [];
  const filter = (searchInput.value || "").trim().toLowerCase();

  if (state.isGameOver) {
    setText("lb-title", "¡Juego terminado!");
    setText("lb-subtitle", "Posiciones finales después de todas las rondas.");
  } else if (history.length > 0) {
    setText("lb-title", "Posiciones generales");
    setText(
      "lb-subtitle",
      `${history.length} de ${state.totalRounds} rondas completadas.`
    );
  } else {
    setText("lb-title", "Posiciones generales");
    setText("lb-subtitle", "Sin rondas completadas aún.");
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
    setHtml("round-history-summary", "Sin rondas completadas aún.");
  }

  const roundHeaders = history
    .map((r) => `<th>${escapeHtml(r.label)}</th>`)
    .join("");
  setHtml(
    "lb-head",
    `<tr><th>#</th><th>Nombre</th>${roundHeaders}<th>Total</th></tr>`
  );

  let filtered = cumulative;
  if (filter) {
    filtered = cumulative.filter((e) =>
      e.name.toLowerCase().includes(filter)
    );
  }

  if (!filtered.length) {
    const cols = 3 + history.length;
    setHtml(
      "lb-body",
      `<tr><td colspan="${cols}" class="center muted">${
        filter ? "Ningún jugador coincide." : "Sin datos aún. Completa al menos una ronda."
      }</td></tr>`
    );
    return;
  }

  const rows = filtered
    .map((entry, idx) => {
      const globalRank =
        cumulative.findIndex((e) => e.id === entry.id) + 1;
      const roundCells = entry.roundProfits
        .map(
          (p, i) =>
            `<td>
              <span class="${p >= 0 ? "side-yes" : "side-no"}">${signedMoney(p)}</span>
              <span class="role-tag">${escapeHtml(entry.roundRoles[i] || "")}</span>
            </td>`
        )
        .join("");
      const isTop3 = globalRank <= 3;
      return `
        <tr class="${isTop3 ? "row-highlight" : ""}">
          <td class="rank">${globalRank}</td>
          <td><strong>${escapeHtml(entry.name)}</strong></td>
          ${roundCells}
          <td class="total-cell"><strong>${signedMoney(entry.totalProfit)}</strong></td>
        </tr>`;
    })
    .join("");

  setHtml("lb-body", rows);
}

async function refreshLeaderboard() {
  try {
    const state = await getState();
    renderLeaderboard(state);
  } catch (error) {
    setText("lb-subtitle", "Error cargando datos.");
  }
}

searchInput.addEventListener("input", () => {
  if (lastState) renderLeaderboard(lastState);
});

refreshLeaderboard();
setInterval(refreshLeaderboard, POLL_MS * 2);
