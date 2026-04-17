const STARTING_CASH = 100;
const DEFAULT_ROUND_SECONDS = 120;
const PRICE_STEP = 0.04;
const MIN_PRICE = 0.05;
const MAX_PRICE = 0.95;
const INFORMED_SHARE = 0.30;
const RECENT_TRADES_LIMIT = 10;
const TRADE_COOLDOWN_MS = 1500;

const REAL_ROUNDS_PER_GAME = 4;

const EXAMPLE_SCENARIO = {
  id: "example",
  label: "Ronda de Ejemplo",
  question:
    "¿Inversiones Alternativas FC ganará la final del Campeonato Mundial del Mundo?",
  context:
    "Gran final mundial: Inversiones Alternativas FC vs Deportivo Mercado de Capitales. Las casas de apuestas los dan 50/50.",
  insiderInfo:
    "El técnico de Deportivo Mercado de Capitales suspendió a tres titulares por indisciplina en el establecimiento \"Rolons\" la noche anterior. Alternativas FC llega descansado y con plantel completo.",
  correctAnswer: "YES"
};

const SCENARIO_POOL = [
  {
    id: "fed",
    question:
      "¿La Reserva Federal subirá la tasa de interés en su próxima reunión?",
    context:
      "Inflación en 3.2% (objetivo: 2%). Empleo muestra señales de enfriamiento. Analistas divididos.",
    insiderInfo:
      "Un borrador filtrado de las minutas indica que la mayoría del comité prefiere MANTENER las tasas sin cambio.",
    correctAnswer: "NO"
  },
  {
    id: "earnings",
    question:
      "¿NovaTech reportará ganancias por encima de las estimaciones de Wall Street?",
    context:
      "Analistas esperan $2.15/acción. Resultados mixtos el trimestre anterior. Sector tech en buen momento.",
    insiderInfo:
      "Fuentes dentro de NovaTech confirman ventas récord en Asia y mejora significativa en márgenes operativos.",
    correctAnswer: "YES"
  },
  {
    id: "oil",
    question:
      "¿El petróleo Brent cerrará por encima de $85/barril al final del mes?",
    context:
      "Cotización actual: $82. Tensiones geopolíticas elevadas. Demanda incierta por desaceleración en China.",
    insiderInfo:
      "Delegados de la OPEP+ acordaron en privado un recorte sorpresa de 500K barriles/día. El anuncio oficial sale mañana.",
    correctAnswer: "YES"
  },
  {
    id: "rates",
    question:
      "¿El Banco Central bajará la tasa de interés en su próxima reunión?",
    context:
      "La economía crece por debajo del potencial. El mercado espera un recorte de 25pb con 60% de probabilidad.",
    insiderInfo:
      "Datos internos del banco muestran que la inflación subyacente repuntó inesperadamente, presionando al comité a NO recortar.",
    correctAnswer: "NO"
  },
  {
    id: "ipo",
    question:
      "¿Nexus Biotech cerrará su primer día de cotización por encima del precio de salida?",
    context:
      "IPO muy esperada en el sector biotech. Precio de salida: $28. Sentimiento de mercado mixto por IPOs recientes decepcionantes.",
    insiderInfo:
      "El libro institucional está sobre-suscrito 8x y los bancos colocadores están asignando racionadamente. Demanda retail fuerte en pre-mercado.",
    correctAnswer: "YES"
  },
  {
    id: "merger",
    question:
      "¿La fusión entre GlobalBank y AtlanticTrust recibirá aprobación regulatoria?",
    context:
      "Operación de $40B anunciada hace 6 meses. Crea el segundo banco más grande del país. Mercado asigna 70% de probabilidad de aprobación.",
    insiderInfo:
      "Fuentes del Departamento de Justicia indicaron privadamente a los abogados que tienen preocupaciones serias sobre concentración en banca comercial en 5 estados.",
    correctAnswer: "NO"
  },
  {
    id: "bonds",
    question:
      "¿El rendimiento del bono del Tesoro a 10 años cerrará por debajo de 4.0% al final del mes?",
    context:
      "Rendimiento actual: 4.25%. El mercado debate si la Fed pivotará pronto. Datos macro mixtos.",
    insiderInfo:
      "Mesas institucionales reportan que grandes asset managers están acumulando duración agresivamente esta semana; el flujo es histórico.",
    correctAnswer: "YES"
  },
  {
    id: "crypto",
    question:
      "¿Bitcoin cerrará por encima de $70,000 al final del mes?",
    context:
      "Precio actual: $68,500. ETFs al contado siguen atrayendo flujos. Volatilidad elevada por elecciones y macro.",
    insiderInfo:
      "Una subcomisión del Congreso está preparando un marco regulatorio más restrictivo que se anunciará la próxima semana. El personal técnico ya filtró borradores a la industria.",
    correctAnswer: "NO"
  }
];

function shuffleArray(items) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickScenariosForGame() {
  const shuffled = shuffleArray(SCENARIO_POOL).slice(
    0,
    Math.min(REAL_ROUNDS_PER_GAME, SCENARIO_POOL.length)
  );
  const picked = [EXAMPLE_SCENARIO];
  shuffled.forEach((scenario, index) => {
    picked.push({ ...scenario, label: `Ronda ${index + 1}` });
  });
  return picked;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toCents(value) {
  return Number(value.toFixed(2));
}

function formatTimeStamp(value) {
  const date = new Date(value);
  return date.toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });
}

function createEmptyGame() {
  return {
    phase: "join",
    createdAt: Date.now(),
    currentRound: -1,
    scenarios: pickScenariosForGame(),
    players: {},
    playerOrder: [],
    price: 0.5,
    priceHistory: [{ value: 0.5, at: Date.now() }],
    trades: [],
    finalOutcome: null,
    tradingEndsAt: null,
    startedAt: null,
    resolvedAt: null,
    roundHistory: []
  };
}

function resetGame() {
  return createEmptyGame();
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
}

function joinGame(game, name) {
  if (game.phase !== "join") {
    throw new Error("La ventana para unirse ya está cerrada.");
  }

  const cleanName = normalizeName(name);
  if (!cleanName) {
    throw new Error("Escribe un nombre para unirte.");
  }

  const duplicate = game.playerOrder.find(
    (id) => game.players[id].name.toLowerCase() === cleanName.toLowerCase()
  );
  if (duplicate) {
    throw new Error("Ya hay alguien con ese nombre. Usa otro.");
  }

  const playerId = randomId();
  const now = Date.now();

  game.players[playerId] = {
    id: playerId,
    name: cleanName,
    informed: false,
    clueText: "",
    cash: STARTING_CASH,
    yesShares: 0,
    noShares: 0,
    trades: [],
    lastTradeAt: 0,
    joinedAt: now
  };
  game.playerOrder.push(playerId);

  return game.players[playerId];
}

function ensureAtLeastOneInformed(playerIds) {
  if (playerIds.length === 0) {
    return new Set();
  }
  const picked = playerIds[Math.floor(Math.random() * playerIds.length)];
  return new Set([picked]);
}

function startRound(game, roundSeconds = DEFAULT_ROUND_SECONDS) {
  if (game.phase !== "join" && game.phase !== "resolved") {
    throw new Error("No se puede empezar una ronda ahora.");
  }

  const nextRound = game.currentRound + 1;
  if (nextRound >= game.scenarios.length) {
    throw new Error("Ya se jugaron todas las rondas.");
  }

  if (game.playerOrder.length === 0) {
    throw new Error("Al menos una persona debe unirse antes de empezar.");
  }

  const scenario = game.scenarios[nextRound];
  const now = Date.now();
  const playerIds = [...game.playerOrder];
  const informedIds = ensureAtLeastOneInformed(playerIds);

  for (const pid of playerIds) {
    if (Math.random() < INFORMED_SHARE) {
      informedIds.add(pid);
    }
  }

  game.phase = "trading";
  game.currentRound = nextRound;
  game.startedAt = now;
  game.resolvedAt = null;
  game.finalOutcome = null;
  game.price = 0.5;
  game.priceHistory = [{ value: 0.5, at: now }];
  game.trades = [];
  game.tradingEndsAt = now + roundSeconds * 1000;

  for (const pid of playerIds) {
    const player = game.players[pid];
    player.cash = STARTING_CASH;
    player.yesShares = 0;
    player.noShares = 0;
    player.trades = [];
    player.lastTradeAt = 0;
    player.informed = informedIds.has(pid);
    player.clueText = player.informed
      ? scenario.insiderInfo
      : "No tienes información privilegiada en esta ronda.";
  }
}

function canTrade(game) {
  return game.phase === "trading" && Date.now() < game.tradingEndsAt;
}

function finalWealth(player, finalOutcome) {
  const payout = finalOutcome === "YES" ? player.yesShares : player.noShares;
  return toCents(player.cash + payout);
}

function resolveRound(game) {
  if (game.phase !== "trading") {
    throw new Error("No hay una ronda activa para resolver.");
  }

  const scenario = game.scenarios[game.currentRound];
  const now = Date.now();

  game.phase = "resolved";
  game.finalOutcome = scenario.correctAnswer;
  game.resolvedAt = now;
  game.tradingEndsAt = now;

  const roundResult = {
    roundIndex: game.currentRound,
    scenarioId: scenario.id,
    label: scenario.label,
    question: scenario.question,
    correctAnswer: scenario.correctAnswer,
    finalPrice: game.price,
    impliedProbability: Math.round(game.price * 100),
    playerResults: {}
  };

  for (const pid of game.playerOrder) {
    const player = game.players[pid];
    const endingCash = finalWealth(player, scenario.correctAnswer);
    const profit = toCents(endingCash - STARTING_CASH);
    const toward = countTowardTruth(player, scenario.correctAnswer);

    roundResult.playerResults[pid] = {
      name: player.name,
      informed: player.informed,
      profit,
      endingCash,
      towardTruth: toward.toward,
      awayFromTruth: toward.away,
      tradeCount: player.trades.length,
      actionSummary: actionSummary(player)
    };
  }

  game.roundHistory.push(roundResult);
}

function maybeAutoResolve(game) {
  if (game.phase === "trading" && Date.now() >= game.tradingEndsAt) {
    resolveRound(game);
  }
}

function validatePlayer(game, playerId) {
  const player = game.players[playerId];
  if (!player) {
    throw new Error("No se encontró al jugador.");
  }
  return player;
}

function quoteForSide(price, side) {
  return side === "YES" ? price : 1 - price;
}

function trade(game, playerId, side) {
  maybeAutoResolve(game);

  if (game.phase !== "trading") {
    throw new Error("Las operaciones ya están cerradas.");
  }

  const player = validatePlayer(game, playerId);
  const now = Date.now();
  const msSinceLast = now - (player.lastTradeAt || 0);
  if (msSinceLast < TRADE_COOLDOWN_MS) {
    const remainMs = TRADE_COOLDOWN_MS - msSinceLast;
    const err = new Error(
      `Espera ${Math.ceil(remainMs / 100) / 10}s antes de votar otra vez.`
    );
    err.code = "COOLDOWN";
    err.remainMs = remainMs;
    throw err;
  }

  const cleanSide = side === "NO" ? "NO" : "YES";
  const entryPrice = quoteForSide(game.price, cleanSide);

  if (player.cash + 1e-9 < entryPrice) {
    throw new Error("No tienes suficiente efectivo para esa operación.");
  }

  const previousPrice = game.price;
  const delta = cleanSide === "YES" ? PRICE_STEP : -PRICE_STEP;

  player.cash = toCents(player.cash - entryPrice);
  if (cleanSide === "YES") {
    player.yesShares += 1;
  } else {
    player.noShares += 1;
  }
  player.lastTradeAt = now;

  game.price = toCents(clamp(game.price + delta, MIN_PRICE, MAX_PRICE));

  const tradeRecord = {
    id: randomId(),
    playerId,
    playerName: player.name,
    side: cleanSide,
    cost: toCents(entryPrice),
    previousPrice,
    priceAfter: game.price,
    at: now
  };

  player.trades.push(tradeRecord);
  game.trades.push(tradeRecord);
  game.priceHistory.push({ value: game.price, at: tradeRecord.at });

  maybeAutoResolve(game);
  return tradeRecord;
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function countTowardTruth(player, finalOutcome) {
  let toward = 0;
  let away = 0;

  for (const t of player.trades) {
    if (t.side === finalOutcome) {
      toward += 1;
    } else {
      away += 1;
    }
  }

  return { toward, away };
}

function pushLabel(player, finalOutcome) {
  if (player.trades.length === 0) {
    return "Sin acción";
  }
  const { toward, away } = countTowardTruth(player, finalOutcome);
  if (toward > away) return "Hacia la verdad";
  if (away > toward) return "Lejos de la verdad";
  return "Mixto";
}

function actionSummary(player) {
  const yesCount = player.trades.filter((t) => t.side === "YES").length;
  const noCount = player.trades.length - yesCount;
  if (player.trades.length === 0) return "Sin operaciones";
  return `${yesCount} SÍ / ${noCount} NO`;
}

function roleLabel(player) {
  return player.informed ? "Informado" : "No informado";
}

function buildRoundLeaderboard(game) {
  if (game.phase === "join" || game.currentRound < 0) {
    return [];
  }

  if (game.phase === "trading") {
    return game.playerOrder
      .map((pid) => {
        const player = game.players[pid];
        const unrealized = toCents(
          player.cash +
            player.yesShares * game.price +
            player.noShares * (1 - game.price)
        );
        const profit = toCents(unrealized - STARTING_CASH);

        return {
          id: player.id,
          name: player.name,
          role: roleLabel(player),
          informed: player.informed,
          actionSummary: actionSummary(player),
          pushTowardTruth: "En curso",
          towardTruthTrades: 0,
          awayFromTruthTrades: 0,
          endingCash: unrealized,
          profit,
          provisional: true
        };
      })
      .sort((a, b) => b.profit - a.profit || b.endingCash - a.endingCash);
  }

  return game.playerOrder
    .map((pid) => {
      const player = game.players[pid];
      const endingCash = finalWealth(player, game.finalOutcome);
      const profit = toCents(endingCash - STARTING_CASH);
      const toward = countTowardTruth(player, game.finalOutcome);

      return {
        id: player.id,
        name: player.name,
        role: roleLabel(player),
        informed: player.informed,
        actionSummary: actionSummary(player),
        pushTowardTruth: pushLabel(player, game.finalOutcome),
        towardTruthTrades: toward.toward,
        awayFromTruthTrades: toward.away,
        endingCash,
        profit,
        provisional: false
      };
    })
    .sort((a, b) => b.profit - a.profit || b.endingCash - a.endingCash);
}

function buildGroupComparison(game, leaderboard) {
  if (game.phase !== "resolved") {
    return null;
  }

  const informed = leaderboard.filter((e) => e.informed);
  const uninformed = leaderboard.filter((e) => !e.informed);

  const summarize = (entries) => {
    const totalToward = entries.reduce((s, e) => s + e.towardTruthTrades, 0);
    const totalAway = entries.reduce((s, e) => s + e.awayFromTruthTrades, 0);
    return {
      count: entries.length,
      averageProfit: toCents(average(entries.map((e) => e.profit))),
      towardTruthShare:
        totalToward + totalAway === 0
          ? 0
          : Math.round((totalToward / (totalToward + totalAway)) * 100)
    };
  };

  return {
    informed: summarize(informed),
    uninformed: summarize(uninformed)
  };
}

function buildCumulativeLeaderboard(game) {
  const scores = {};

  for (const pid of game.playerOrder) {
    scores[pid] = {
      id: pid,
      name: game.players[pid].name,
      roundProfits: [],
      roundRoles: [],
      totalProfit: 0
    };
  }

  for (const round of game.roundHistory) {
    for (const pid of game.playerOrder) {
      const result = round.playerResults[pid];
      if (result) {
        scores[pid].roundProfits.push(result.profit);
        scores[pid].roundRoles.push(result.informed ? "Informado" : "No informado");
        scores[pid].totalProfit = toCents(scores[pid].totalProfit + result.profit);
      } else {
        scores[pid].roundProfits.push(0);
        scores[pid].roundRoles.push("-");
      }
    }
  }

  return Object.values(scores).sort(
    (a, b) => b.totalProfit - a.totalProfit
  );
}

function buildRecentTrades(game) {
  return game.trades
    .slice(-RECENT_TRADES_LIMIT)
    .reverse()
    .map((t) => ({
      id: t.id,
      label: `${t.playerName} votó ${t.side === "YES" ? "SÍ" : "NO"} a $${t.cost.toFixed(2)}`,
      atLabel: formatTimeStamp(t.at),
      side: t.side
    }));
}

function buildPriceHistory(game) {
  return game.priceHistory.map((entry, index) => ({
    index,
    value: entry.value,
    label: `${Math.round(entry.value * 100)}%`,
    at: entry.at,
    atLabel: formatTimeStamp(entry.at)
  }));
}

function currentScenario(game) {
  if (game.currentRound < 0 || game.currentRound >= game.scenarios.length) {
    return null;
  }
  return game.scenarios[game.currentRound];
}

function nextScenario(game) {
  const next = game.currentRound + 1;
  if (next >= game.scenarios.length) return null;
  return game.scenarios[next];
}

function buildState(game, playerId) {
  maybeAutoResolve(game);

  const player = playerId ? game.players[playerId] || null : null;
  const scenario = currentScenario(game);
  const upcoming = nextScenario(game);
  const leaderboard = buildRoundLeaderboard(game);
  const comparison = buildGroupComparison(game, leaderboard);
  const cumulative = buildCumulativeLeaderboard(game);
  const isGameOver =
    game.currentRound >= game.scenarios.length - 1 && game.phase === "resolved";

  return {
    phase: game.phase,
    currentRound: game.currentRound,
    totalRounds: game.scenarios.length,
    isGameOver,

    scenario: scenario
      ? {
          id: scenario.id,
          label: scenario.label,
          question: scenario.question,
          context: scenario.context,
          correctAnswer: game.phase === "resolved" ? scenario.correctAnswer : null
        }
      : null,

    upcomingLabel: upcoming ? upcoming.label : null,

    playerCount: game.playerOrder.length,
    price: game.price,
    impliedProbability: Math.round(game.price * 100),
    priceHistory: buildPriceHistory(game),
    recentTrades: buildRecentTrades(game),
    tradingEndsAt: game.tradingEndsAt,
    serverTime: Date.now(),

    finalOutcome: game.finalOutcome,
    finalPrice: game.phase === "resolved" ? game.price : null,

    leaderboard,
    comparison,
    cumulative,

    roundHistory: game.roundHistory.map((r) => ({
      roundIndex: r.roundIndex,
      label: r.label,
      question: r.question,
      correctAnswer: r.correctAnswer,
      finalPrice: r.finalPrice,
      impliedProbability: r.impliedProbability
    })),

    players:
      game.phase === "resolved"
        ? game.playerOrder.map((id) => ({
            id,
            name: game.players[id].name,
            role: roleLabel(game.players[id])
          }))
        : [],

    tradeCooldownMs: TRADE_COOLDOWN_MS,

    player: player
      ? {
          id: player.id,
          name: player.name,
          informed: player.informed,
          role: roleLabel(player),
          clueText: player.clueText,
          cash: toCents(player.cash),
          yesShares: player.yesShares,
          noShares: player.noShares,
          tradeCount: player.trades.length,
          lastTradeAt: player.lastTradeAt || 0,
          cooldownRemainingMs: Math.max(
            0,
            (player.lastTradeAt || 0) + TRADE_COOLDOWN_MS - Date.now()
          )
        }
      : null
  };
}

module.exports = {
  DEFAULT_ROUND_SECONDS,
  STARTING_CASH,
  REAL_ROUNDS_PER_GAME,
  EXAMPLE_SCENARIO,
  SCENARIO_POOL,
  createEmptyGame,
  resetGame,
  joinGame,
  startRound,
  trade,
  resolveRound,
  buildState
};
