import pytest
from httpx import ASGITransport, AsyncClient
from travel_price_finder.main import app


@pytest.mark.anyio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["version"] == "0.1.0"
        assert data["letsfg_available"] is True


@pytest.mark.anyio
async def test_search_missing_params():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/search")
        assert resp.status_code == 422


@pytest.mark.anyio
async def test_search_invalid_date():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/search?origin=LON&destination=BCN&date=invalid")
        assert resp.status_code == 500


@pytest.mark.anyio
async def test_locations_missing_query():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/locations")
        assert resp.status_code == 422


@pytest.mark.anyio
async def test_dashboard_served():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/")
        assert resp.status_code == 200
        assert "text/html" in resp.headers["content-type"]
