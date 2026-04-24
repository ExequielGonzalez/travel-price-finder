from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    origin: str = Field(..., description="Origin IATA code or city name")
    destination: str = Field(..., description="Destination IATA code or city name")
    date: str = Field(..., description="Departure date YYYY-MM-DD")
    return_date: str | None = Field(None, description="Return date YYYY-MM-DD")
    adults: int = Field(1, ge=1, le=9)
    children: int = Field(0, ge=0, le=8)
    cabin_class: str | None = Field(None, pattern=r"^[MWCF]?$")
    max_stopovers: int = Field(2, ge=0, le=4, alias="max_stops")
    limit: int = Field(50, ge=1, le=100)
    mode: str = Field("full", pattern=r"^(full|fast)$")


class SearchResponse(BaseModel):
    total_results: int
    offers: list[dict]
    search_params: dict
    elapsed_seconds: float = 0.0


class LocationResult(BaseModel):
    iata_code: str
    name: str
    type: str
    city: str | None = None
    country: str | None = None


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    letsfg_available: bool
