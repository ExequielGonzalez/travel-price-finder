# Travel Price Finder - Agent Instructions

## Setup

```bash
uv sync                    # Install dependencies
uv run travel-price-finder # Start the server on :8000
```

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Dashboard

Open http://localhost:8000/ in a browser for the visual search dashboard.

## Environment

Copy `.env.example` to `.env` and set `LETSFG_API_KEY` if you have one
(optional — search works without it using local connectors).

## Testing

```bash
uv run pytest
```
