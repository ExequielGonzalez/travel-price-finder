# Travel Price Finder Skill

Search cheap flights across 400+ airlines using the Travel Price Finder API.

## Usage

This skill provides flight search capabilities through a REST API. Use HTTP
GET requests to the `/api/search` endpoint.

### Search Flights

`GET http://localhost:8000/api/search?origin=<IATA>&destination=<IATA>&date=<YYYY-MM-DD>`

**Parameters:**

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `origin` | Yes | — | IATA code or city name (LON, JFK, BCN, etc.) |
| `destination` | Yes | — | IATA code or city name |
| `date` | Yes | — | Departure date YYYY-MM-DD |
| `return_date` | No | — | Return date YYYY-MM-DD |
| `adults` | No | 1 | Number of adults (1-9) |
| `children` | No | 0 | Number of children (0-8) |
| `cabin_class` | No | — | M=economy, W=premium, C=business, F=first |
| `max_stops` | No | 2 | Max stopovers (0-4) |
| `mode` | No | full | full (200+ connectors) or fast (~25 connectors, 20-40s) |
| `sort` | No | price | price or duration |
| `limit` | No | 20 | Max results (1-100) |

### Health Check

`GET http://localhost:8000/api/health`

Returns server status and version.

### Response Format

```json
{
  "total_results": 42,
  "offers": [
    {
      "price": 56.00,
      "currency": "EUR",
      "airlines": ["Ryanair"],
      "outbound": {
        "route_str": "BCN -> STN",
        "stopovers": 0,
        "total_duration_seconds": 8400
      },
      "conditions": {
        "refund_before_departure": "not_allowed"
      }
    }
  ],
  "search_params": {
    "origin": "BCN",
    "destination": "LON",
    "date": "2026-06-15"
  },
  "elapsed_seconds": 5.2
}
```

## Examples

```bash
# Search one-way flights
curl "http://localhost:8000/api/search?origin=LON&destination=BCN&date=2026-06-15&mode=fast"

# Search round trip with cabin class
curl "http://localhost:8000/api/search?origin=JFK&destination=LAX&date=2026-07-01&return_date=2026-07-10&cabin_class=C&adults=2"

# Direct flights only
curl "http://localhost:8000/api/search?origin=BER&destination=PAR&date=2026-08-15&max_stops=0&mode=fast"
```

## Error Handling

- **422**: Invalid parameters (bad date format, out-of-range values)
- **500**: Flight search engine error — retry with different parameters
- Search may take 5-60 seconds depending on mode (`fast` vs `full`)
