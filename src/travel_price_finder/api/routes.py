from fastapi import APIRouter, HTTPException, Query
import logging
from ..engine import FlightEngine
from ..models.schemas import SearchResponse, LocationResult, HealthResponse
from ..config import settings
from ..locations import search_locations

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")
engine = FlightEngine(api_key=settings.letsfg_api_key)

_MAX_AIRPORTS = 5


def _parse_airports(value: str) -> list[str]:
    """Split comma-separated IATA codes, uppercase and deduplicate."""
    codes = [c.strip().upper() for c in value.split(",") if c.strip()]
    seen = []
    for c in codes:
        if c not in seen:
            seen.append(c)
    return seen


@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(version="0.1.0", letsfg_available=True)


@router.get("/search", response_model=SearchResponse)
async def search(
    origin: str = Query(..., description="Origin IATA code(s), comma-separated"),
    destination: str = Query(..., description="Destination IATA code(s), comma-separated"),
    date: str = Query(..., description="Departure date YYYY-MM-DD"),
    return_date: str | None = Query(None, description="Return date YYYY-MM-DD"),
    adults: int = Query(1, ge=1, le=9),
    children: int = Query(0, ge=0, le=8),
    cabin_class: str | None = Query(None, pattern=r"^[MWCF]?$"),
    max_stopovers: int = Query(2, ge=0, le=4, alias="max_stops"),
    limit: int = Query(50, ge=1, le=100),
    mode: str = Query("full", pattern=r"^(full|fast)$"),
):
    origins = _parse_airports(origin)
    destinations = _parse_airports(destination)

    if len(origins) > _MAX_AIRPORTS:
        raise HTTPException(
            status_code=400,
            detail=f"Too many origin airports: {len(origins)} (max {_MAX_AIRPORTS})",
        )
    if len(destinations) > _MAX_AIRPORTS:
        raise HTTPException(
            status_code=400,
            detail=f"Too many destination airports: {len(destinations)} (max {_MAX_AIRPORTS})",
        )

    try:
        result = await engine.search_multi(
            origins=origins,
            destinations=destinations,
            date=date,
            return_date=return_date,
            adults=adults,
            children=children,
            cabin_class=cabin_class,
            max_stopovers=max_stopovers,
            limit=limit,
            mode=mode,
        )
        return result
    except Exception as e:
        logger.exception("Search failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/locations", response_model=list[LocationResult])
async def resolve_location(q: str = Query(..., min_length=1)):
    results = search_locations(q)
    return [
        LocationResult(
            iata_code=r["iata_code"],
            name=r["name"],
            type=r["type"],
            city=r.get("city"),
            country=r.get("country"),
        )
        for r in results
    ]
