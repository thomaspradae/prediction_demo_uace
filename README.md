# Mercado de Predicción

Juego interactivo de 5 rondas para demostrar cómo la información privilegiada mueve un mercado de predicción. Diseñado para grupos de investigación en finanzas.

## Ejecutarlo localmente

1. `npm install`
2. `npm start`
3. Abre `http://localhost:3000`

## Rutas

- `/` — Jugadores se unen al juego
- `/play` — Pantalla del celular de cada jugador (votar SÍ/NO)
- `/screen` — Pantalla del proyector (moderador controla las rondas)
- `/results` — Resultados detallados de la ronda actual (informados vs no informados)
- `/leaderboard` — Leaderboard acumulado a lo largo de todas las rondas

## Cómo funciona

1. Los jugadores se unen desde `/` y esperan.
2. El moderador abre `/screen` e inicia cada ronda.
3. Cada ronda plantea un escenario del mundo real (decisión de la Fed, ganancias corporativas, petróleo, tipo de cambio).
4. ~30% de los jugadores reciben **información privilegiada** que les da una ventaja.
5. Todos votan SÍ o NO. Cada voto mueve el precio del mercado.
6. Al resolver, se revela la respuesta correcta y se compara cómo votaron los informados vs los no informados.
7. El **leaderboard acumulado** rastrea el puntaje total ronda a ronda.

## Las 5 rondas

| # | Escenario | Pregunta |
|---|-----------|----------|
| Ejemplo | Fútbol | ¿Equipo Azul gana la final? |
| 1 | Fed | ¿La Fed sube la tasa de interés? |
| 2 | Corporativo | ¿NovaTech supera estimaciones de Wall Street? |
| 3 | Petróleo | ¿Brent cierra por encima de $85/barril? |
| 4 | Banco Central | ¿El Banco Central baja la tasa? |

## Desplegar

El repo está listo para tres plataformas. **Recomendado: Fly.io** (always-on gratis) o **Railway** (más fácil).

### Opción A — Fly.io (always-on gratis, recomendado)

El plan gratis incluye hasta 3 máquinas shared-cpu-1x / 256MB, suficiente para este demo.

```bash
# 1. Instalar flyctl
curl -L https://fly.io/install.sh | sh

# 2. Login (abre el navegador)
fly auth login

# 3. Desde la raíz del repo
fly launch --copy-config --no-deploy
# → pregunta por nombre de app, región, etc. Acepta los defaults o edita fly.toml.

# 4. Desplegar
fly deploy

# 5. Abrir en el navegador
fly open
```

Para actualizar después de cambios:
```bash
fly deploy
```

Ver logs en vivo:
```bash
fly logs
```

### Opción B — Railway (cero configuración)

1. Ve a [railway.app](https://railway.app) y haz login con GitHub.
2. **New Project → Deploy from GitHub repo** → elige este repo.
3. Railway detecta Node automáticamente y despliega.
4. Ve a **Settings → Networking → Generate Domain** para obtener una URL pública.
5. Listo. El plan gratuito da $5 USD en créditos/mes, suficiente para este demo.

### Opción C — Render (puede dormirse en el plan gratis)

Este repo incluye un `render.yaml`. En Render, crea un Blueprint desde el repo. Ojo: el plan gratis duerme tras 15 min de inactividad y puede tener cold-starts.

## Variables de entorno

- `PORT` — puerto del servidor (default `3000`). Todas las plataformas lo inyectan automáticamente.
- `NODE_ENV` — `production` recomendado en despliegue.
