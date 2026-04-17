const path = require("path");
const express = require("express");
const {
  DEFAULT_ROUND_SECONDS,
  createEmptyGame,
  cloneForReset,
  joinGame,
  startRound,
  trade,
  resolveRound,
  buildState
} = require("./lib/game");

const publicDir = path.join(__dirname, "public");
let game = createEmptyGame();

function sendPage(response, filename) {
  response.sendFile(path.join(publicDir, filename));
}

function sendError(response, error) {
  response.status(400).json({ error: error.message || "La solicitud falló." });
}

function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.static(publicDir));

  app.get("/", (request, response) => {
    sendPage(response, "index.html");
  });

  app.get("/play", (request, response) => {
    sendPage(response, "play.html");
  });

  app.get("/screen", (request, response) => {
    sendPage(response, "screen.html");
  });

  app.get("/results", (request, response) => {
    sendPage(response, "results.html");
  });

  app.get("/healthz", (request, response) => {
    response.json({ ok: true, phase: game.phase });
  });

  app.get("/api/state", (request, response) => {
    response.json(buildState(game, request.query.playerId));
  });

  app.post("/api/join", (request, response) => {
    try {
      const player = joinGame(game, request.body?.name);
      response.json({
        playerId: player.id,
        playerName: player.name,
        state: buildState(game, player.id)
      });
    } catch (error) {
      sendError(response, error);
    }
  });

  app.post("/api/start", (request, response) => {
    try {
      const roundSeconds = Number(request.body?.roundSeconds) || DEFAULT_ROUND_SECONDS;
      startRound(game, roundSeconds);
      response.json(buildState(game));
    } catch (error) {
      sendError(response, error);
    }
  });

  app.post("/api/trade", (request, response) => {
    try {
      const tradeRecord = trade(game, request.body?.playerId, request.body?.side);
      response.json({
        trade: tradeRecord,
        state: buildState(game, request.body?.playerId)
      });
    } catch (error) {
      sendError(response, error);
    }
  });

  app.post("/api/resolve", (request, response) => {
    try {
      resolveRound(game);
      response.json(buildState(game));
    } catch (error) {
      sendError(response, error);
    }
  });

  app.post("/api/reset", (request, response) => {
    game = cloneForReset(game);
    response.json(buildState(game));
  });

  return app;
}

function startServer(port = Number(process.env.PORT) || 3000) {
  const app = createApp();
  return app.listen(port, () => {
    console.log(`Demo del mercado de predicción escuchando en http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer
};
