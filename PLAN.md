# Travel Price Finder — Implementation Plan

Abstraction layer over [LetsFG](https://github.com/LetsFG/LetsFG) — 400+ airlines, 200+ connectors — installable via `uv`, with REST API, web dashboard, and opencode agent skill.

---

## Architecture

```
Agente (opencode) ──lee──→ SKILL.md ──llama──→ REST API (FastAPI)
                                                    │
Usuario ──navega──→ Dashboard (HTML/JS) ──fetch──→ REST API
                                                    │
                                               letsfg SDK
                                                    │
                                            200+ aerolíneas
```

## Project Structure

```
travel-price-finder/
├── pyproject.toml              # uv project config + dependencies
├── AGENTS.md                   # Agent instructions (setup, API docs)
├── SKILL.md                    # opencode skill definition
├── .env.example                # Environment variable template
├── src/
│   └── travel_price_finder/
│       ├── __init__.py
│       ├── main.py             # FastAPI app entry point (uvicorn)
│       ├── config.py           # Settings via pydantic-settings (env vars)
│       ├── engine.py           # Wrapper around letsfg SDK
│       ├── api/
│       │   ├── __init__.py
│       │   └── routes.py       # REST endpoints: /api/search, /api/health, /api/locations
│       └── models/
│           ├── __init__.py
│           └── schemas.py      # Pydantic request/response models
├── static/
│   ├── index.html              # Dashboard HTML
│   ├── app.js                  # Dashboard logic (vanilla JS)
│   └── style.css               # Dashboard styles
├── tests/
│   ├── __init__.py
│   └── test_api.py             # API tests (pytest + httpx)
└── PLAN.md                     # This file
```

## Component Details

### 1. `pyproject.toml` — uv project config

```toml
[project]
name = "travel-price-finder"
version = "0.1.0"
description = "Flight price search dashboard and API for autonomous agents"
requires-python = ">=3.10"
dependencies = [
    "letsfg>=2026.4.0",
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.34.0",
    "pydantic>=2.0",
    "pydantic-settings>=2.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.uv]
dev-dependencies = [
    "pytest>=8.0",
    "httpx>=0.28.0",
]

[project.scripts]
travel-price-finder = "travel_price_finder.main:main"
```

### 2. `config.py` — Settings

Loads configuration from environment variables using `pydantic-settings`:
- `LETSFG_API_KEY` — optional, enables cloud API features (unlock/book)
- `HOST` / `PORT` — server bind address (default `0.0.0.0:8000`)
- `CORS_ORIGINS` — allowed origins for CORS (default `["*"]`)

### 3. `engine.py` — Flight Engine

Wraps the LetsFG SDK:
- Primary: `search_local()` — no API key required, runs 200+ local connectors
- Secondary: `LetsFG.search()` — with API key, includes GDS/NDC providers
- `resolve_location()` — convert city names to IATA codes

**`search_local()` parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `origin` | str | — | IATA code or city name |
| `destination` | str | — | IATA code or city name |
| `date` | str | — | Departure date `YYYY-MM-DD` |
| `return_date` | str | `None` | Return date (optional) |
| `adults` | int | `1` | Adults (1–9) |
| `children` | int | `0` | Children (0–8) |
| `cabin_class` | str | `None` | `M`=economy, `W`=premium, `C`=business, `F`=first |
| `max_stops` | int | `2` | Max stopovers (0–4) |
| `limit` | int | `20` | Max results (1–100) |
| `sort` | str | `"price"` | `price` or `duration` |
| `mode` | str | `"full"` | `full` (200+ connectors, ~6min) or `fast` (~25 connectors, 20–40s) |

### 4. `api/routes.py` — REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check + version info |
| `GET` | `/api/search` | Search flights (query params) |
| `GET` | `/api/locations?q=` | Resolve city names to IATA codes |

**Response schema (`/api/search`):**
```json
{
  "total_results": 42,
  "offers": [
    {
      "id": "off_xxx",
      "price": 56.00,
      "currency": "EUR",
      "airlines": ["Ryanair"],
      "outbound": {
        "route_str": "BCN → STN",
        "stopovers": 0,
        "total_duration_seconds": 8400
      },
      "conditions": {"refund_before_departure": "not_allowed"},
      "baggage": {"included_hand_luggage": "1 small bag"}
    }
  ],
  "search_params": {"origin": "BCN", "destination": "LON", "date": "2026-06-15"},
  "elapsed_seconds": 5.2
}
```

### 5. `main.py` — FastAPI Application

- FastAPI app with CORS middleware (all origins allowed)
- Serves static files from `/static` directory
- Mounts dashboard at `/`
- Swagger UI at `/docs`, ReDoc at `/redoc`
- Entry point via `uv run travel-price-finder` or `uvicorn`

### 6. Dashboard — `static/`

Vanilla HTML/CSS/JS single-page application:
- **index.html**: Responsive form with origin, destination, date, return date, adults, cabin class, max stops, mode (fast/full)
- **app.js**: Fetches `/api/search`, renders results as cards with price, airline, route, stops, duration
- **style.css**: Clean, responsive design with loading spinner and error states

### 7. `SKILL.md` — opencode Agent Skill

Markdown file with structured instructions for AI agents:
- How to call the REST API
- All parameters documented
- Example curl commands
- Error handling guidance
- Note that search may take 5–60s depending on mode

### 8. `AGENTS.md` — Agent Setup Instructions

Quick-start guide for agents:
- `uv sync && uv run travel-price-finder`
- Links to `/docs` (Swagger) and `/redoc`
- Environment setup from `.env.example`
- How to run tests: `uv run pytest`

## Implementation Order

| # | Step | Files | Verification |
|---|------|-------|-------------|
| 1 | Create `pyproject.toml` | `pyproject.toml` | `uv sync` succeeds |
| 2 | Create directory structure | `src/`, `static/`, `tests/` | `ls -R` matches plan |
| 3 | Implement `config.py` | `config.py` | Imports without errors |
| 4 | Implement `schemas.py` | `models/schemas.py` | Pydantic validation works |
| 5 | Implement `engine.py` | `engine.py` | Wraps `letsfg.local.search_local` |
| 6 | Implement `routes.py` | `api/routes.py` | Endpoints respond correctly |
| 7 | Implement `main.py` | `main.py` | Server starts on `:8000` |
| 8 | Create dashboard | `static/index.html`, `app.js`, `style.css` | Browser shows search form |
| 9 | Create SKILL.md | `SKILL.md` | Valid markdown |
| 10 | Create AGENTS.md | `AGENTS.md` | Valid markdown |
| 11 | Create .env.example | `.env.example` | Template file |
| 12 | Create tests | `tests/test_api.py` | `uv run pytest` passes |
| 13 | End-to-end test | — | Dashboard → search → real LetsFG results |

## Dependencies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Package manager | `uv` | Fast Python package installation |
| Flight engine | `letsfg` (PyPI) | 400+ airlines, 200+ local connectors |
| Web framework | FastAPI | Async REST API with auto-docs |
| Server | Uvicorn | ASGI server |
| Validation | Pydantic v2 | Request/response schemas |
| Config | pydantic-settings | Environment variable management |
| Frontend | Vanilla HTML/CSS/JS | Zero-build dashboard |
| Testing | pytest + httpx | Async API tests |

## Key Design Decisions

1. **`search_local()` over `bt.search()`**: No API key required for search. The 200+ local connectors run directly on the host machine via Playwright + httpx. This removes the registration requirement for basic search.

2. **Vanilla JS frontend**: No framework build step. Faster to iterate, fewer dependencies. Served as static files by FastAPI.

3. **Query params over POST body**: `GET /api/search?origin=...` makes it trivial for agents to call with `curl` or `fetch`. No JSON body needed.

4. **CORS open by default**: Agents may connect from any origin. Can be locked down via `CORS_ORIGINS` env var.

5. **Async throughout**: FastAPI + `search_local` (which is async) means the server can handle concurrent search requests without blocking.

## Future Enhancements

- [ ] POST endpoint accepting JSON body for complex searches
- [ ] WebSocket endpoint for streaming search progress
- [ ] API key authentication for remote access
- [ ] Search history persistence (SQLite)
- [ ] Price alerts / monitoring
- [ ] MCP server protocol support (Model Context Protocol)
- [ ] Dockerfile for containerized deployment
- [ ] CI/CD pipeline (GitHub Actions)
