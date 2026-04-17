# Demo de Mercado de Canicas

Un juego de una sola ronda para mostrar cómo la información privada puede mover un precio compartido en un mercado de predicción.

## Ejecutarlo localmente

1. `npm install`
2. `npm start`
3. Abre `http://localhost:3000`

Rutas:

- `/` para que los jugadores se unan
- `/play` para cada celular
- `/screen` para el proyector
- `/results` para ver resultados al final

## Cómo funciona la ronda

- Todos empiezan con `$100`
- A algunos jugadores se les asigna aleatoriamente el rol de informados
- Los informados reciben una muestra privada con ruido de una bolsa oculta de canicas
- Cada operación `YES` sube el precio en `0.04`
- Cada operación `NO` baja el precio en `0.04`
- La ronda se resuelve sola después de 2 minutos, a menos que la resuelvas antes desde `/screen`

## Desplegar en Render

Este repo ya incluye un `render.yaml` para un servicio web Node en el plan gratis.

1. Sube el proyecto a GitHub
2. En Render, crea un nuevo Blueprint desde ese repo
3. Confirma la configuración que Render toma desde `render.yaml`
4. Despliega
