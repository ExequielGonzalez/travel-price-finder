# Travel Price Finder - Agent Instructions

## Setup

```bash
uv sync                    # Install dependencies
uv run travel-price-finder # Start the server on :8000
```

## API Base URL

Once the server is running, all API endpoints are available at:
```
http://localhost:8000/api
```

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Dashboard

Open http://localhost:8000/ in a browser for the visual search dashboard.

## Endpoints

### `GET /api/health`

Health check and service info.

**Response model: `HealthResponse`**

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Always `"ok"` |
| `version` | `string` | API version (e.g. `"0.1.0"`) |
| `letsfg_available` | `boolean` | Whether LetsFG backend is reachable |

---

### `GET /api/search`

Search for flight offers.

**Query parameters**

| Parameter | Type | Required | Default | Constraints | Description |
|-----------|------|----------|---------|-------------|-------------|
| `origin` | `string` | Yes | — | — | Origin IATA code or city name |
| `destination` | `string` | Yes | — | — | Destination IATA code or city name |
| `date` | `string` | Yes | — | `YYYY-MM-DD` | Departure date |
| `return_date` | `string` | No | `null` | `YYYY-MM-DD` | Return date (omit for one-way) |
| `adults` | `integer` | No | `1` | `1..9` | Number of adult passengers |
| `children` | `integer` | No | `0` | `0..8` | Number of child passengers |
| `cabin_class` | `string` | No | `null` | `M`, `W`, `C`, `F` or empty | Cabin class: M = Economy, W = Premium Economy, C = Business, F = First |
| `max_stops` | `integer` | No | `2` | `0..4` | Maximum number of stopovers (alias for `max_stopovers`) |
| `limit` | `integer` | No | `50` | `1..100` | Maximum number of offers to return |
| `mode` | `string` | No | `"full"` | `"full"` or `"fast"` | Search mode (see below) |

**Response model: `SearchResponse`**

| Field | Type | Description |
|-------|------|-------------|
| `total_results` | `integer` | Total number of offers found |
| `offers` | `list[dict]` | List of raw offer objects from the search engine |
| `search_params` | `dict` | Echo of the parameters used for the search |
| `elapsed_seconds` | `float` | Time spent searching (seconds) |

**Search modes**

| Mode | Connectors | Typical duration | Use case |
|------|------------|------------------|----------|
| `fast` | ~25 | 20-40 seconds | Quick price checks, agent loops |
| `full` | 200+ | ~6 minutes | Exhaustive search for best deals |

**Example request**

```bash
curl "http://localhost:8000/api/search?origin=BCN&destination=LON&date=2026-06-15&mode=fast"
```

---

### `GET /api/locations`

Resolve a city or airport name to IATA codes.

**Query parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | `string` | Yes | Search query (min 1 character) |

**Response model: `list[LocationResult]`**

| Field | Type | Description |
|-------|------|-------------|
| `iata_code` | `string` | IATA airport/city code |
| `name` | `string` | Location name |
| `type` | `string` | Location type (e.g. `airport`, `city`) |
| `city` | `string \| null` | City name |
| `country` | `string \| null` | Country name |

> **Note:** This endpoint currently returns HTTP `501` when `LETSFG_API_KEY` is not set, because local search does not include geocoding. It is only functional in cloud mode.

**Example request**

```bash
curl "http://localhost:8000/api/locations?q=Barcelona"
```

---

## Environment

Copy `.env.example` to `.env` and set `LETSFG_API_KEY` if you have one
(optional — search works without it using local connectors).

| Variable | Description | Default |
|----------|-------------|---------|
| `LETSFG_API_KEY` | API key de LetsFG (optional, enables cloud features) | *(empty)* |
| `HOST` | Bind address | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `CORS_ORIGINS` | Allowed CORS origins | `["*"]` |

## Testing

```bash
uv run pytest
```

## Notes for Agents

- **No API key required for basic flight search.** The `/api/search` endpoint works locally out of the box.
- **Always prefer `mode=fast`** unless the user explicitly asks for the cheapest possible fare, because `full` can take ~6 minutes.
- **Location resolution (`/api/locations`) requires `LETSFG_API_KEY`.** Without it, use known IATA codes directly in `origin` and `destination`.
- **Error handling:** The search endpoint returns `500` with a `detail` string on engine failures. Always check `total_results` in the response; a value of `0` means no flights were found.
- **CORS is open by default** (`["*"]`), so browser-based agents or dashboards can call the API directly.
