"""Bank of Russia currency history and the public Pages demo snapshot."""
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
import json
import sys
from urllib.parse import urlencode
from urllib.request import urlopen
import xml.etree.ElementTree as ET


CBR_HISTORY_URL = "https://www.cbr.ru/scripts/XML_dynamic.asp"
CBR_HISTORY_IDS = {"USD": "R01235", "EUR": "R01239", "CNY": "R01375"}
CBR_TIMEZONE = timezone(timedelta(hours=3))


def history_params(asset: str, end: date) -> dict[str, str]:
    return {
        "date_req1": (end - timedelta(days=29)).strftime("%d/%m/%Y"),
        "date_req2": end.strftime("%d/%m/%Y"),
        "VAL_NM_RQ": CBR_HISTORY_IDS[asset],
    }


def parse_history(asset: str, end: date, content: bytes) -> dict:
    start = end - timedelta(days=29)
    points = {}
    for record in ET.fromstring(content).findall("Record"):
        recorded = datetime.strptime(record.attrib["Date"], "%d.%m.%Y").date()
        if start <= recorded <= end:
            nominal = Decimal(record.findtext("Nominal", "0"))
            value = Decimal(record.findtext("Value", "0").replace(",", "."))
            if nominal > 0 and value > 0:
                points[recorded] = float(value / nominal)
    if not points:
        raise ValueError("Банк России не вернул историю курсов")
    return {
        "asset": asset,
        "end": end.isoformat(),
        "points": [{"date": day.isoformat(), "value": points[day]} for day in sorted(points)],
    }


def write_public_snapshot(destination: Path) -> None:
    end = datetime.now(CBR_TIMEZONE).date()

    def fetch(asset: str) -> dict:
        query = urlencode(history_params(asset, end))
        with urlopen(f"{CBR_HISTORY_URL}?{query}", timeout=12) as response:
            return parse_history(asset, end, response.read())

    with ThreadPoolExecutor(max_workers=len(CBR_HISTORY_IDS)) as pool:
        history = dict(zip(CBR_HISTORY_IDS, pool.map(fetch, CBR_HISTORY_IDS)))
    quotes = {}
    for asset, entry in history.items():
        previous, latest = entry["points"][-2:]
        quotes[asset] = {"value": latest["value"], "prev": previous["value"], "date": latest["date"]}
    snapshot = {"quotes": {"rates": quotes}, "history": history}
    destination.write_text(json.dumps(snapshot, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    write_public_snapshot(Path(sys.argv[1]))
