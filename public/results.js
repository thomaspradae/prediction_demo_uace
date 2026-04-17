function emptyResults() {
  setText("results-round-label", "Resultados de la ronda");
  setText("results-outcome", "Esperando una ronda resuelta");
  setText("results-summary", "Resuelve una ronda para ver el análisis.");
  setText("results-correct", "-");
  setText("results-final-price", "-");
  setText("results-round-num", "-");
  setText("results-informed-profit", "-");
  setText("results-uninformed-profit", "-");
  setText("results-toward-truth", "-");
  setHtml("informed-body", '<tr><td colspan="6" class="center muted">Sin datos aún.</td></tr>');
  setHtml("results-body", '<tr><td colspan="7" class="center muted">Sin resultados aún.</td></tr>');
}

function directionBadge(label) {
  if (label === "Hacia la verdad") return `<span class="badge badge-yes">${escapeHtml(label)}</span>`;
  if (label === "Lejos de la verdad") return `<span class="badge badge-no">${escapeHtml(label)}</span>`;
  return `<span class="badge badge-neutral">${escapeHtml(label)}</span>`;
}

function renderResults(state) {
  if (state.phase !== "resolved") {
    emptyResults();
    return;
  }

  const scenario = state.scenario;
  const label = scenario ? scenario.label : "Ronda";

  setText("results-round-label", label);
  setText("results-outcome", `Resultado: ${labelSide(state.finalOutcome)}`);
  setText(
    "results-summary",
    scenario
      ? `${escapeHtml(scenario.question)} — El mercado cerró en ${state.impliedProbability}%.`
      : ""
  );
  setText("results-correct", labelSide(state.finalOutcome));
  setText("results-final-price", `${state.impliedProbability}%`);
  setText("results-round-num", `${state.currentRound + 1} de ${state.totalRounds}`);

  const informedProfit = state.comparison ? money(state.comparison.informed.averageProfit) : "-";
  const uninformedProfit = state.comparison ? money(state.comparison.uninformed.averageProfit) : "-";
  const towardTruth = state.comparison
    ? `Inf: ${state.comparison.informed.towardTruthShare}% / No inf: ${state.comparison.uninformed.towardTruthShare}%`
    : "-";

  setText("results-informed-profit", informedProfit);
  setText("results-uninformed-profit", uninformedProfit);
  setText("results-toward-truth", towardTruth);

  const informed = state.leaderboard.filter((e) => e.informed);
  const informedRows = informed.length
    ? informed
        .map(
          (e) => `
          <tr>
            <td><strong>${escapeHtml(e.name)}</strong></td>
            <td>${escapeHtml(e.actionSummary)}</td>
            <td class="side-yes">${e.towardTruthTrades}</td>
            <td class="side-no">${e.awayFromTruthTrades}</td>
            <td>${directionBadge(e.pushTowardTruth)}</td>
            <td>${signedMoney(e.profit)}</td>
          </tr>`
        )
        .join("")
    : '<tr><td colspan="6" class="center muted">No hubo informados esta ronda.</td></tr>';

  setHtml("informed-body", informedRows);

  const allRows = state.leaderboard.length
    ? state.leaderboard
        .map(
          (e, i) => `
          <tr class="${e.informed ? "row-informed" : ""}">
            <td class="rank">${i + 1}</td>
            <td>${escapeHtml(e.name)}</td>
            <td>${escapeHtml(e.role)}</td>
            <td>${escapeHtml(e.actionSummary)}</td>
            <td>${directionBadge(e.pushTowardTruth)}</td>
            <td>${money(e.endingCash)}</td>
            <td>${signedMoney(e.profit)}</td>
          </tr>`
        )
        .join("")
    : '<tr><td colspan="7" class="center muted">No hubo jugadores esta ronda.</td></tr>';

  setHtml("results-body", allRows);
}

async function refreshResults() {
  try {
    const state = await getState();
    renderResults(state);
  } catch (error) {
    emptyResults();
  }
}

refreshResults();
setInterval(refreshResults, POLL_MS);
