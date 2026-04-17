const STARTING_CASH = 100;
const DEFAULT_ROUND_SECONDS = 30;
const CLUE_SAMPLE_SIZE = 8;
const PRICE_STEP = 0.04;
const MIN_PRICE = 0.05;
const MAX_PRICE = 0.95;
const INFORMED_SHARE = 0.25;
const RECENT_TRADES_LIMIT = 10;

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
    roundNumber: 1,
    question: "¿La canica final será ROJA?",
    price: 0.5,
    priceHistory: [{ value: 0.5, at: Date.now() }],
    players: {},
    playerOrder: [],
    trades: [],
    trueBias: null,
    finalOutcome: null,
    tradingEndsAt: null,
    resolvedAt: null,
    startedAt: null
  };
}

function cloneForReset(game) {
  const fresh = createEmptyGame();
  fresh.roundNumber = game.roundNumber + 1;
  return fresh;
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

  const playerId = randomId();
  const now = Date.now();

  game.players[playerId] = {
    id: playerId,
    name: cleanName,
    informed: false,
    clueText: "No tienes pista privada.",
    cash: STARTING_CASH,
    yesShares: 0,
    noShares: 0,
    trades: [],
    joinedAt: now
  };
  game.playerOrder.push(playerId);

  return game.players[playerId];
}

function coinFlip() {
  return Math.random() < 0.5 ? 0.7 : 0.3;
}

function sampleCount(probability, draws) {
  let successCount = 0;
  for (let index = 0; index < draws; index += 1) {
    if (Math.random() < probability) {
      successCount += 1;
    }
  }
  return successCount;
}

function ensureAtLeastOneInformed(playerIds) {
  if (playerIds.length === 0) {
    return new Set();
  }
  const pickedId = playerIds[Math.floor(Math.random() * playerIds.length)];
  return new Set([pickedId]);
}

function startRound(game, roundSeconds = DEFAULT_ROUND_SECONDS) {
  if (game.phase !== "join") {
    throw new Error("La ronda solo puede empezar desde la sala.");
  }
  if (game.playerOrder.length === 0) {
    throw new Error("Al menos una persona debe unirse antes de empezar la ronda.");
  }

  const now = Date.now();
  const playerIds = [...game.playerOrder];
  const informedIds = ensureAtLeastOneInformed(playerIds);

  for (const playerId of playerIds) {
    if (Math.random() < INFORMED_SHARE) {
      informedIds.add(playerId);
    }
  }

  game.phase = "trading";
  game.startedAt = now;
  game.resolvedAt = null;
  game.finalOutcome = null;
  game.price = 0.5;
  game.priceHistory = [{ value: 0.5, at: now }];
  game.trades = [];
  game.trueBias = coinFlip();
  game.tradingEndsAt = now + roundSeconds * 1000;

  for (const playerId of playerIds) {
    const player = game.players[playerId];
    const redSeen = sampleCount(game.trueBias, CLUE_SAMPLE_SIZE);

    player.cash = STARTING_CASH;
    player.yesShares = 0;
    player.noShares = 0;
    player.trades = [];
    player.informed = informedIds.has(playerId);
    player.clueText = player.informed
      ? `Tu muestra privada: ${redSeen} rojas, ${CLUE_SAMPLE_SIZE - redSeen} azules.`
      : "No tienes pista privada.";
  }
}

function canTrade(game) {
  return game.phase === "trading" && Date.now() < game.tradingEndsAt;
}

function outcomeFromBias(trueBias) {
  return Math.random() < trueBias ? "YES" : "NO";
}

function resolveRound(game) {
  if (game.phase !== "trading") {
    throw new Error("No hay una ronda activa para resolver.");
  }

  const now = Date.now();
  game.phase = "resolved";
  game.finalOutcome = outcomeFromBias(game.trueBias);
  game.resolvedAt = now;
  game.tradingEndsAt = now;
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

  game.price = toCents(clamp(game.price + delta, MIN_PRICE, MAX_PRICE));

  const tradeRecord = {
    id: randomId(),
    playerId,
    playerName: player.name,
    side: cleanSide,
    cost: toCents(entryPrice),
    previousPrice,
    priceAfter: game.price,
    at: Date.now()
  };

  player.trades.push(tradeRecord);
  game.trades.push(tradeRecord);
  game.priceHistory.push({ value: game.price, at: tradeRecord.at });

  maybeAutoResolve(game);
  return tradeRecord;
}

function finalWealth(player, finalOutcome) {
  const payout = finalOutcome === "YES" ? player.yesShares : player.noShares;
  return toCents(player.cash + payout);
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function countTowardTruth(player, finalOutcome) {
  let toward = 0;
  let away = 0;

  for (const tradeRecord of player.trades) {
    const isToward = tradeRecord.side === finalOutcome;
    if (isToward) {
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

  if (toward > away) {
    return "Mayormente hacia la verdad";
  }
  if (away > toward) {
    return "Mayormente lejos de la verdad";
  }
  return "Mixto";
}

function actionSummary(player) {
  const yesCount = player.trades.filter((tradeRecord) => tradeRecord.side === "YES").length;
  const noCount = player.trades.length - yesCount;

  if (player.trades.length === 0) {
    return "Sin operaciones";
  }

  return `${yesCount} SÍ / ${noCount} NO`;
}

function roleLabel(player) {
  return player.informed ? "Informado" : "No informado";
}

function buildLeaderboard(game) {
  if (game.phase !== "resolved") {
    return [];
  }

  return game.playerOrder
    .map((playerId) => {
      const player = game.players[playerId];
      const endingCash = finalWealth(player, game.finalOutcome);
      const profit = toCents(endingCash - STARTING_CASH);

      return {
        id: player.id,
        name: player.name,
        role: roleLabel(player),
        actionSummary: actionSummary(player),
        pushTowardTruth: pushLabel(player, game.finalOutcome),
        towardTruthTrades: countTowardTruth(player, game.finalOutcome).toward,
        awayFromTruthTrades: countTowardTruth(player, game.finalOutcome).away,
        endingCash,
        profit
      };
    })
    .sort((left, right) => right.profit - left.profit || right.endingCash - left.endingCash);
}

function buildGroupComparison(game, leaderboard) {
  if (game.phase !== "resolved") {
    return null;
  }

  const informed = leaderboard.filter((entry) => entry.role === "Informed");
  const uninformed = leaderboard.filter((entry) => entry.role === "Uninformed");

  const summarize = (entries) => {
    const totalToward = entries.reduce((sum, entry) => sum + entry.towardTruthTrades, 0);
    const totalAway = entries.reduce((sum, entry) => sum + entry.awayFromTruthTrades, 0);
    return {
      count: entries.length,
      averageProfit: toCents(average(entries.map((entry) => entry.profit))),
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

function buildRecentTrades(game) {
  return game.trades.slice(-RECENT_TRADES_LIMIT).reverse().map((tradeRecord) => ({
    id: tradeRecord.id,
    label: `${tradeRecord.playerName} compró ${tradeRecord.side === "YES" ? "SÍ" : "NO"} a $${tradeRecord.cost.toFixed(2)}`,
    atLabel: formatTimeStamp(tradeRecord.at),
    side: tradeRecord.side
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

function buildState(game, playerId) {
  maybeAutoResolve(game);

  const player = playerId ? game.players[playerId] || null : null;
  const leaderboard = buildLeaderboard(game);
  const comparison = buildGroupComparison(game, leaderboard);

  return {
    phase: game.phase,
    roundNumber: game.roundNumber,
    question: game.question,
    playerCount: game.playerOrder.length,
    price: game.price,
    impliedProbability: Math.round(game.price * 100),
    priceHistory: buildPriceHistory(game),
    recentTrades: buildRecentTrades(game),
    tradingEndsAt: game.tradingEndsAt,
    serverTime: Date.now(),
    trueBias: game.phase === "resolved" ? game.trueBias : null,
    finalOutcome: game.finalOutcome,
    finalPrice: game.phase === "resolved" ? game.price : null,
    leaderboard,
    comparison,
    players: game.phase === "resolved"
      ? game.playerOrder.map((id) => ({
          id,
          name: game.players[id].name,
          role: roleLabel(game.players[id])
        }))
      : [],
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
          tradeCount: player.trades.length
        }
      : null
  };
}

module.exports = {
  DEFAULT_ROUND_SECONDS,
  STARTING_CASH,
  createEmptyGame,
  cloneForReset,
  joinGame,
  startRound,
  trade,
  resolveRound,
  buildState
};
