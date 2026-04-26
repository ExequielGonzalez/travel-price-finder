import asyncio
import time
from letsfg.local import search_local


class FlightEngine:
    def __init__(self, api_key: str = ""):
        self.api_key = api_key

    async def _search_single(
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
        """Run a single origin-destination search."""
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
        }

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
        result = await self._search_single(
            origin, destination, date,
            return_date=return_date, adults=adults, children=children,
            cabin_class=cabin_class, max_stopovers=max_stopovers,
            limit=limit, mode=mode,
        )
        elapsed = round(time.time() - t0, 1)
        result["search_params"] = {
            "origin": origin,
            "destination": destination,
            "date": date,
            "return_date": return_date,
            "adults": adults,
            "children": children,
            "cabin_class": cabin_class,
            "max_stopovers": max_stopovers,
            "mode": mode,
        }
        result["elapsed_seconds"] = elapsed
        return result

    async def search_multi(
        self,
        origins: list[str],
        destinations: list[str],
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

        # Build all origin-destination combinations
        tasks = []
        combos = []
        for origin in origins:
            for destination in destinations:
                tasks.append(
                    self._search_single(
                        origin, destination, date,
                        return_date=return_date, adults=adults, children=children,
                        cabin_class=cabin_class, max_stopovers=max_stopovers,
                        limit=limit, mode=mode,
                    )
                )
                combos.append((origin, destination))

        # Run all searches in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_offers = []
        total_results = 0
        errors = []
        for combo, res in zip(combos, results):
            if isinstance(res, Exception):
                errors.append(f"{combo[0]}→{combo[1]}: {res}")
                continue
            total_results += res.get("total_results", 0)
            all_offers.extend(res.get("offers", []))

        # Sort all offers globally by price ascending
        all_offers.sort(key=lambda o: (o.get("price") if isinstance(o, dict) else float("inf")) or float("inf"))

        elapsed = round(time.time() - t0, 1)

        return {
            "total_results": total_results,
            "offers": all_offers,
            "search_params": {
                "origin": ",".join(origins),
                "destination": ",".join(destinations),
                "date": date,
                "return_date": return_date,
                "adults": adults,
                "children": children,
                "cabin_class": cabin_class,
                "max_stopovers": max_stopovers,
                "mode": mode,
            },
            "elapsed_seconds": elapsed,
            "errors": errors if errors else None,
        }
