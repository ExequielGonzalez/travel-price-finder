import re
import unicodedata
from typing import List, Dict, Any

import airportsdata

# Load airport data once at module level
_AIRPORTS = airportsdata.load("IATA")

# Country name mappings: various names -> ISO 3166-1 alpha-2 code
_COUNTRY_MAP: Dict[str, str] = {}


def _build_country_map():
    """Build a case-insensitive map of country names to ISO codes."""
    # Common countries in Spanish and English
    mappings = {
        "es": ["spain", "españa", "espana", "kingdom of spain"],
        "ar": ["argentina", "argentine republic"],
        "mx": ["mexico", "méxico", "mexico", "estados unidos mexicanos"],
        "us": ["united states", "estados unidos", "usa", "eeuu", "estados unidos de america", "united states of america"],
        "gb": ["united kingdom", "reino unido", "uk", "great britain", "gran bretaña"],
        "fr": ["france", "francia", "french republic"],
        "de": ["germany", "alemania", "deutschland", "federal republic of germany"],
        "it": ["italy", "italia", "italian republic"],
        "br": ["brazil", "brasil", "federative republic of brazil"],
        "co": ["colombia", "republic of colombia"],
        "cl": ["chile", "republic of chile"],
        "pe": ["peru", "perú", "republic of peru"],
        "ec": ["ecuador", "republic of ecuador"],
        "bo": ["bolivia", "plurinational state of bolivia"],
        "py": ["paraguay", "republic of paraguay"],
        "uy": ["uruguay", "oriental republic of uruguay"],
        "ve": ["venezuela", "bolivarian republic of venezuela"],
        "cr": ["costa rica", "republic of costa rica"],
        "pa": ["panama", "panamá", "republic of panama"],
        "gt": ["guatemala", "republic of guatemala"],
        "hn": ["honduras", "republic of honduras"],
        "sv": ["el salvador", "republic of el salvador"],
        "ni": ["nicaragua", "republic of nicaragua"],
        "cu": ["cuba", "republic of cuba"],
        "do": ["dominican republic", "república dominicana", "republica dominicana"],
        "pr": ["puerto rico"],
        "jp": ["japan", "japón", "japon", "nihon", "nippon"],
        "cn": ["china", "people's republic of china", "república popular china", "republica popular china"],
        "in": ["india", "india", "republic of india"],
        "au": ["australia", "australia", "commonwealth of australia"],
        "ca": ["canada", "canadá", "canada"],
        "ru": ["russia", "rusia", "russian federation"],
        "kr": ["south korea", "korea", "república de corea", "republic of korea", "corea del sur"],
        "kp": ["north korea", "corea del norte", "democratic people's republic of korea"],
        "th": ["thailand", "tailandia", "kingdom of thailand"],
        "vn": ["vietnam", "viet nam", "socialist republic of vietnam"],
        "sg": ["singapore", "singapur", "republic of singapore"],
        "my": ["malaysia", "malasia"],
        "id": ["indonesia", "indonesian republic"],
        "ph": ["philippines", "filipinas", "republic of the philippines"],
        "nz": ["new zealand", "nueva zelanda"],
        "za": ["south africa", "sudáfrica", "sudafrica", "republic of south africa"],
        "eg": ["egypt", "egipto", "arab republic of egypt"],
        "ma": ["morocco", "marruecos", "kingdom of morocco"],
        "tn": ["tunisia", "túnez", "tunez", "republic of tunisia"],
        "dz": ["algeria", "argelia", "people's democratic republic of algeria"],
        "ng": ["nigeria", "nigerian federal republic"],
        "ke": ["kenya", "republic of kenya"],
        "et": ["ethiopia", "etiopía", "etiopia", "federal democratic republic of ethiopia"],
        "tr": ["turkey", "turquía", "turquia", "republic of turkey"],
        "gr": ["greece", "grecia", "hellenic republic"],
        "pt": ["portugal", "portuguese republic"],
        "nl": ["netherlands", "países bajos", "paises bajos", "holland", "holanda", "kingdom of the netherlands"],
        "be": ["belgium", "bélgica", "belgica", "kingdom of belgium"],
        "ch": ["switzerland", "suiza", "swiss confederation"],
        "at": ["austria", "austria", "republic of austria"],
        "se": ["sweden", "suecia", "kingdom of sweden"],
        "no": ["norway", "noruega", "kingdom of norway"],
        "dk": ["denmark", "dinamarca", "kingdom of denmark"],
        "fi": ["finland", "finlandia", "republic of finland"],
        "pl": ["poland", "polonia", "republic of poland"],
        "cz": ["czech republic", "czechia", "república checa", "republica checa", "chequia"],
        "hu": ["hungary", "hungría", "hungria", "hungary"],
        "ro": ["romania", "rumania", "rumanía", "romania"],
        "bg": ["bulgaria", "bulgaria", "republic of bulgaria"],
        "hr": ["croatia", "croacia", "republic of croatia"],
        "rs": ["serbia", "serbia", "republic of serbia"],
        "ua": ["ukraine", "ucrania", "ukraina"],
        "il": ["israel", "israel", "state of israel"],
        "sa": ["saudi arabia", "arabia saudita", "kingdom of saudi arabia"],
        "ae": ["united arab emirates", "emiratos árabes unidos", "emiratos arabes unidos", "uae"],
        "qa": ["qatar", "catar", "state of qatar"],
        "kw": ["kuwait", "kuwait", "state of kuwait"],
        "iq": ["iraq", "irak", "republic of iraq"],
        "ir": ["iran", "irán", "iran", "islamic republic of iran"],
        "pk": ["pakistan", "pakistán", "pakistan", "islamic republic of pakistan"],
        "bd": ["bangladesh", "bangladesh", "people's republic of bangladesh"],
        "lk": ["sri lanka", "srilanka", "democratic socialist republic of sri lanka"],
        "np": ["nepal", "nepal", "federal democratic republic of nepal"],
        "mm": ["myanmar", "birmania", "republic of the union of myanmar"],
        "kh": ["cambodia", "camboya", "kingdom of cambodia"],
        "la": ["laos", "lao people's democratic republic"],
        "tw": ["taiwan", "taiwán", "taiwan", "republic of china"],
        "hk": ["hong kong", "hongkong", "hong kong sar"],
        "mo": ["macao", "macau", "macao sar"],
        "ie": ["ireland", "irlanda", "republic of ireland"],
        "is": ["iceland", "islandia", "republic of iceland"],
        "mt": ["malta", "malta", "republic of malta"],
        "cy": ["cyprus", "chipre", "republic of cyprus"],
        "lu": ["luxembourg", "luxemburgo", "grand duchy of luxembourg"],
        "li": ["liechtenstein", "liechtenstein", "principality of liechtenstein"],
        "mc": ["monaco", "mónaco", "monaco", "principality of monaco"],
        "ad": ["andorra", "andorra", "principality of andorra"],
        "sm": ["san marino", "sanmarino", "republic of san marino"],
        "va": ["vatican", "vaticano", "vatican city state", "holy see"],
    }
    for code, names in mappings.items():
        for name in names:
            _COUNTRY_MAP[_normalize(name)] = code.upper()
        _COUNTRY_MAP[_normalize(code)] = code.upper()


def _normalize(text: str) -> str:
    """Normalize text for comparison: lowercase, strip accents, trim."""
    text = text.lower().strip()
    # Remove accents
    text = "".join(
        c for c in unicodedata.normalize("NFKD", text)
        if unicodedata.category(c) != "Mn"
    )
    return text


_build_country_map()


def search_locations(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Search airports by IATA, name, city, or country.

    Returns a list of dicts with keys: iata_code, name, city, country, type.
    """
    if not query or len(query.strip()) < 1:
        return []

    q = _normalize(query)
    results: List[Dict[str, Any]] = []
    seen = set()

    # Helper to add a result
    def add_result(iata: str, airport: Dict[str, Any], score: int):
        if iata in seen:
            return
        seen.add(iata)
        results.append({
            "iata_code": iata,
            "name": airport.get("name", ""),
            "city": airport.get("city", ""),
            "country": airport.get("country", ""),
            "type": "airport",
            "score": score,
        })

    # 1. Exact IATA match (highest priority)
    if q.upper() in _AIRPORTS:
        add_result(q.upper(), _AIRPORTS[q.upper()], 0)

    # 2. Country code or name match
    country_code = None
    if len(q) == 2 and q.upper() in {a["country"] for a in _AIRPORTS.values()}:
        country_code = q.upper()
    else:
        country_code = _COUNTRY_MAP.get(q)

    # 3. Search all airports
    for iata, airport in _AIRPORTS.items():
        if iata in seen:
            continue

        name = _normalize(airport.get("name", ""))
        city = _normalize(airport.get("city", ""))
        a_country = airport.get("country", "").upper()

        # Country-level search
        if country_code and a_country == country_code:
            add_result(iata, airport, 10)
            continue

        # Exact city match
        if q == city:
            add_result(iata, airport, 20)
            continue

        # Exact name match
        if q == name:
            add_result(iata, airport, 30)
            continue

        # Partial matches (only if query length >= 2)
        if len(q) >= 2:
            if q in city or q in name:
                add_result(iata, airport, 50)
                continue
            # Also check if query is prefix of IATA
            if iata.startswith(q.upper()):
                add_result(iata, airport, 40)
                continue

    # Sort by score and then by IATA code for stability
    results.sort(key=lambda x: (x["score"], x["iata_code"]))

    # Remove internal score before returning
    for r in results:
        r.pop("score", None)

    return results[:limit]
