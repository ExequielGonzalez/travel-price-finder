# Travel Price Finder

Buscador de vuelos baratos con API REST y dashboard web. Diseñado para integrarse fácilmente con agentes autónomos y aplicaciones propias.

Este proyecto es una capa de abstracción sobre [LetsFG](https://github.com/LetsFG/LetsFG), proporcionando acceso a **400+ aerolíneas** y **200+ conectores** a través de una API moderna y un panel de control visual.

## Características

- **Búsqueda de vuelos** sin necesidad de API key (usa conectores locales)
- **API REST** con documentación automática (Swagger / ReDoc)
- **Dashboard web** responsive para búsquedas manuales
- **Soporte para agentes autónomos** con endpoints simples y CORS abierto
- Búsquedas de ida y vuelta, filtros por clase de cabina, escalas y más
- Dos modos de búsqueda: `fast` (~20-40s, 25 conectores) y `full` (~6min, 200+ conectores)

## Requisitos

- Python >= 3.10
- [uv](https://docs.astral.sh/uv/) (gestor de paquetes)

## Instalación

```bash
uv sync
```

## Uso

### Iniciar el servidor

```bash
uv run travel-price-finder
```

El servidor se iniciará en `http://localhost:8000` por defecto.

### Endpoints de la API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/health` | Verificación de salud y versión |
| `GET` | `/api/search` | Buscar vuelos (parámetros por query) |
| `GET` | `/api/locations?q=` | Resolver nombres de ciudades a códigos IATA |

**Ejemplo de búsqueda:**

```bash
curl "http://localhost:8000/api/search?origin=BCN&destination=LON&date=2026-06-15&mode=fast"
```

**Documentación interactiva:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Dashboard web

Abre http://localhost:8000/ en tu navegador para acceder al panel de búsqueda visual.

## Variables de entorno

Copia `.env.example` a `.env` y ajusta según necesites:

```bash
cp .env.example .env
```

| Variable | Descripción | Default |
|----------|-------------|---------|
| `LETSFG_API_KEY` | API key de LetsFG (opcional, habilita funciones cloud) | *(vacío)* |
| `HOST` | Dirección de bind del servidor | `0.0.0.0` |
| `PORT` | Puerto del servidor | `8000` |
| `CORS_ORIGINS` | Orígenes permitidos para CORS | `["*"]` |

## Tests

```bash
uv run pytest
```

## Estructura del proyecto

```
travel-price-finder/
├── src/travel_price_finder/
│   ├── main.py          # Aplicación FastAPI y entry point
│   ├── engine.py        # Wrapper del SDK de LetsFG
│   ├── config.py        # Configuración via pydantic-settings
│   ├── api/
│   │   └── routes.py    # Endpoints REST
│   └── models/
│       └── schemas.py   # Modelos Pydantic
├── static/              # Dashboard web (HTML/CSS/JS)
├── tests/               # Tests con pytest
├── pyproject.toml       # Configuración del proyecto
├── .env.example         # Plantilla de variables de entorno
└── AGENTS.md            # Instrucciones para agentes
```

## Tecnologías

- [FastAPI](https://fastapi.tiangolo.com/) — Framework web async
- [Uvicorn](https://www.uvicorn.org/) — Servidor ASGI
- [Pydantic](https://docs.pydantic.dev/) — Validación de datos
- [LetsFG](https://github.com/LetsFG/LetsFG) — Motor de búsqueda de vuelos
- pytest + httpx — Testing

## Licencia

MIT
