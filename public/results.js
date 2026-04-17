function emptyResults() {
  setText("results-outcome", "Esperando una ronda resuelta");
  setText("results-summary", "Termina una ronda para comparar jugadores y ganancias.");
  setText("results-final-outcome", "-");
  setText("results-final-price", "-");
  setText("results-bias", "-");
  setText("results-informed-profit", "-");
  setText("results-uninformed-profit", "-");
  setText("results-toward-truth", "-");
  setHtml(
    "results-body",
    '<tr><td colspan="7" class="center muted">Todavía no hay resultados.</td></tr>'
  );
}

function renderResults(state) {
  if (state.phase !== "resolved") {
    emptyResults();
    return;
  }

  const biasText = state.trueBias === 0.7 ? "Bolsa 70% roja" : "Bolsa 30% roja";
  setText("results-outcome", `Resultado ${labelSide(state.finalOutcome)}`);
  setText(
    "results-summary",
    `El mercado cerró en ${state.impliedProbability}% y luego la canica final salió ${labelSide(state.finalOutcome)}.`
  );
  setText("results-final-outcome", labelSide(state.finalOutcome));
  setText("results-final-price", `${state.impliedProbability}%`);
  setText("results-bias", biasText);

  const informedProfit = state.comparison ? money(state.comparison.informed.averageProfit) : "-";
  const uninformedProfit = state.comparison ? money(state.comparison.uninformed.averageProfit) : "-";
  const towardTruth = state.comparison
    ? `${state.comparison.informed.towardTruthShare}% / ${state.comparison.uninformed.towardTruthShare}%`
    : "-";

  setText("results-informed-profit", informedProfit);
  setText("results-uninformed-profit", uninformedProfit);
  setText("results-toward-truth", towardTruth);

  const rows = state.leaderboard.length
    ? state.leaderboard
        .map(
          (entry, index) => `
            <tr>
              <td class="rank">${index + 1}</td>
              <td>${escapeHtml(entry.name)}</td>
              <td>${escapeHtml(entry.role)}</td>
              <td>${escapeHtml(entry.actionSummary)}</td>
              <td>${escapeHtml(entry.pushTowardTruth)}</td>
              <td>${money(entry.endingCash)}</td>
              <td>${money(entry.profit)}</td>
            </tr>
          `
        )
        .join("")
    : '<tr><td colspan="7" class="center muted">No hubo jugadores en esta ronda.</td></tr>';

  setHtml("results-body", rows);
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
