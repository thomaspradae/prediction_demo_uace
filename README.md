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

## Desplegar en Render

Este repo incluye un `render.yaml` para un servicio web Node en el plan gratis.
