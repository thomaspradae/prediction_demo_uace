const path = require("path");
const express = require("express");
const {
  DEFAULT_ROUND_SECONDS,
  createEmptyGame,
  resetGame,
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

  app.get("/", (req, res) => sendPage(res, "index.html"));
  app.get("/play", (req, res) => sendPage(res, "play.html"));
  app.get("/screen", (req, res) => sendPage(res, "screen.html"));
  app.get("/results", (req, res) => sendPage(res, "results.html"));
  app.get("/leaderboard", (req, res) => sendPage(res, "leaderboard.html"));

  app.get("/healthz", (req, res) => {
    res.status(200).json({ ok: true, phase: game.phase, players: game.playerOrder.length });
  });

  app.get("/ready", (req, res) => res.status(200).send("ok"));

  app.get("/api/state", (req, res) => {
    res.json(buildState(game, req.query.playerId));
  });

  app.post("/api/join", (req, res) => {
    try {
      const player = joinGame(game, req.body?.name);
      res.json({
        playerId: player.id,
        playerName: player.name,
        state: buildState(game, player.id)
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/start", (req, res) => {
    try {
      const roundSeconds =
        Number(req.body?.roundSeconds) || DEFAULT_ROUND_SECONDS;
      startRound(game, roundSeconds);
      res.json(buildState(game));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/trade", (req, res) => {
    try {
      const tradeRecord = trade(game, req.body?.playerId, req.body?.side);
      res.json({
        trade: tradeRecord,
        state: buildState(game, req.body?.playerId)
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/resolve", (req, res) => {
    try {
      resolveRound(game);
      res.json(buildState(game));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/reset", (req, res) => {
    game = resetGame();
    res.json(buildState(game));
  });

  app.use((err, req, res, next) => {
    console.error("Error en servidor:", err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: "Error interno del servidor." });
  });

  return app;
}

process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});

function startServer(port = Number(process.env.PORT) || 3000) {
  const app = createApp();
  const host = "0.0.0.0";
  const server = app.listen(port, host, () => {
    console.log(`Mercado de Predicción escuchando en ${host}:${port}`);
  });
  server.keepAliveTimeout = 120000;
  server.headersTimeout = 125000;
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer
};
