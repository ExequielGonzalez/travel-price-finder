import time
from letsfg.local import search_local


class FlightEngine:
    def __init__(self, api_key: str = ""):
        self.api_key = api_key

    async def search(
        self,
        origin: str,
        destination: str,
        date: str,
        return_date: str | None = None,
        adults: int = 1,
        children: int = 0,
        cabin_class: str | None = None,
        max_stopovers: int = 2,
        limit: int = 50,
        mode: str = "full",
    ) -> dict:
        t0 = time.time()

        result = await search_local(
            origin,
            destination,
            date,
            return_date=return_date,
            adults=adults,
            children=children,
            cabin_class=cabin_class,
            max_stopovers=max_stopovers,
            limit=limit,
            mode=mode,
        )
        elapsed = round(time.time() - t0, 1)

        offers = []
        total_results = 0
        if isinstance(result, dict):
            raw_offers = result.get("offers", [])
            total_results = result.get("total_results", len(raw_offers))
            for o in raw_offers:
                if isinstance(o, dict):
                    offers.append(o)
                else:
                    offers.append(o.__dict__ if hasattr(o, "__dict__") else str(o))

        return {
            "total_results": total_results,
            "offers": offers,
            "search_params": {
                "origin": origin,
                "destination": destination,
                "date": date,
                "return_date": return_date,
                "adults": adults,
                "children": children,
                "cabin_class": cabin_class,
                "max_stopovers": max_stopovers,
                "mode": mode,
            },
            "elapsed_seconds": elapsed,
        }
