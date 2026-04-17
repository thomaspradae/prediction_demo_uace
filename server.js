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
    res.json({ ok: true, phase: game.phase });
  });

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

  return app;
}

function startServer(port = Number(process.env.PORT) || 3000) {
  const app = createApp();
  return app.listen(port, () => {
    console.log(`Mercado de Predicción escuchando en http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer
};
