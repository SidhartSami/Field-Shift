"""Build field data bundles from NASA sources.

Sources
-------
NASA POWER daily point API (MERRA-2 reanalysis, 1984-present, no auth):
  T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, WS2M, ALLSKY_SFC_SW_DWN, GWETROOT
NASA MODIS MOD13Q1 250 m 16-day NDVI (NASA LP DAAC product, read from the
  Microsoft Planetary Computer COG mirror because the LP DAAC requires an
  Earthdata token; the underlying data is NASA's).
ISRIC SoilGrids 250 m (non-NASA local soil information, used as the
  "local agricultural information" half of the challenge brief).

Output: data/fields/<id>.json, one compact bundle per field.

Run: python pipeline/fetch_fields.py [--only id1,id2] [--skip-ndvi]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif")
os.environ.setdefault("VSI_CACHE", "TRUE")
os.environ.setdefault("GDAL_HTTP_MULTIPLEX", "YES")
os.environ.setdefault("GDAL_HTTP_VERSION", "2")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "5")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "2")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "fields"
CACHE = ROOT / "data" / "cache"
OUT.mkdir(parents=True, exist_ok=True)
CACHE.mkdir(parents=True, exist_ok=True)

START_YEAR = 1991
END_YEAR = 2024
NDVI_START = "2000-02-18"

POWER_PARAMS = [
    "T2M",
    "T2M_MAX",
    "T2M_MIN",
    "PRECTOTCORR",
    "RH2M",
    "WS2M",
    "ALLSKY_SFC_SW_DWN",
    "GWETROOT",
]

FIELDS = [
    {
        "id": "punjab-sheikhupura",
        "name": "Sheikhupura, Punjab",
        "country": "Pakistan",
        "lat": 31.7127,
        "lon": 73.9850,
        "region": "indo-gangetic",
        "system": "rice-wheat",
        "note": "Rice-wheat heartland of the Pakistani Punjab, canal plus tubewell irrigation.",
    },
    {
        "id": "iowa-boone",
        "name": "Boone County, Iowa",
        "country": "United States",
        "lat": 42.0369,
        "lon": -93.9319,
        "region": "us-corn-belt",
        "system": "corn-soybean",
        "note": "Rainfed maize-soybean rotation, the reference high-input system.",
    },
    {
        "id": "kenya-nakuru",
        "name": "Nakuru County",
        "country": "Kenya",
        "lat": -0.3031,
        "lon": 36.0800,
        "region": "east-african-highlands",
        "system": "maize-bean",
        "note": "Smallholder maize-bean system, bimodal rainfall, low external input.",
    },
    {
        "id": "india-nagpur",
        "name": "Nagpur, Maharashtra",
        "country": "India",
        "lat": 21.1458,
        "lon": 79.0882,
        "region": "deccan",
        "system": "cotton-soybean",
        "note": "Rainfed cotton-soybean on vertisols, high inter-annual rainfall variance.",
    },
    {
        "id": "vietnam-can-tho",
        "name": "Can Tho, Mekong Delta",
        "country": "Vietnam",
        "lat": 10.0341,
        "lon": 105.7880,
        "region": "mekong",
        "system": "rice-rice",
        "note": "Double or triple rice, delta hydrology, salinity intrusion risk.",
    },
]


def http_json(url: str, tries: int = 4, timeout: int = 90):
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "field-shift/3.0"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read())
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"request failed: {url} :: {last}")


def fetch_power(field: dict) -> dict:
    """Daily meteorology, chunked by five years to keep responses small."""
    cache_file = CACHE / f"power-{field['id']}-{START_YEAR}-{END_YEAR}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())

    merged: dict[str, dict[str, float]] = {p: {} for p in POWER_PARAMS}
    elevation = None
    for y0 in range(START_YEAR, END_YEAR + 1, 5):
        y1 = min(y0 + 4, END_YEAR)
        q = urllib.parse.urlencode(
            {
                "parameters": ",".join(POWER_PARAMS),
                "community": "AG",
                "longitude": field["lon"],
                "latitude": field["lat"],
                "start": f"{y0}0101",
                "end": f"{y1}1231",
                "format": "JSON",
            }
        )
        url = f"https://power.larc.nasa.gov/api/temporal/daily/point?{q}"
        print(f"  POWER {field['id']} {y0}-{y1}", flush=True)
        doc = http_json(url)
        elevation = doc["geometry"]["coordinates"][2]
        for p in POWER_PARAMS:
            merged[p].update(doc["properties"]["parameter"][p])
        time.sleep(0.4)

    payload = {"elevation": elevation, "parameters": merged}
    cache_file.write_text(json.dumps(payload))
    return payload


def _pc_search(collection: str, lon: float, lat: float, start: str, end: str, limit: int = 1000):
    """STAC search with pagination, so a 25-year point history is complete."""
    features: list[dict] = []
    body = {
        "collections": [collection],
        "intersects": {"type": "Point", "coordinates": [lon, lat]},
        "datetime": f"{start}/{end}",
        "limit": limit,
    }
    url = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
    while True:
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json", "User-Agent": "field-shift/3.0"},
        )
        with urllib.request.urlopen(req, timeout=90) as r:
            doc = json.loads(r.read())
        features.extend(doc.get("features", []))
        nxt = next((l for l in doc.get("links", []) if l.get("rel") == "next"), None)
        if not nxt or len(features) >= 4000:
            break
        url = nxt["href"]
        body = nxt.get("body") or body
        if nxt.get("method") == "GET":
            req = urllib.request.Request(url, headers={"User-Agent": "field-shift/3.0"})
            with urllib.request.urlopen(req, timeout=90) as r:
                doc = json.loads(r.read())
            features.extend(doc.get("features", []))
            nxt = next((l for l in doc.get("links", []) if l.get("rel") == "next"), None)
            if not nxt:
                break
            url = nxt["href"]
    return features


_SAS_CACHE: dict[str, str] = {}
_SAS_LOCK = None


def _sign(href: str) -> str:
    """Sign a blob URL, reusing the container SAS token.

    The Planetary Computer issues a container-scoped SAS, so one signature
    covers every MODIS COG in the container. Signing per file trips the rate
    limiter (HTTP 429) after a few hundred requests.

    The lock matters when this runs inside a thread pool: without it every worker
    misses the cache at the same moment, all of them hit the sign endpoint, and
    the whole batch fails with 429.
    """
    global _SAS_LOCK
    if _SAS_LOCK is None:
        import threading

        _SAS_LOCK = threading.Lock()

    base, _, _ = href.partition("?")
    # The SAS is scoped to the storage container, not the directory. Keying on the
    # directory meant one sign request per composite — 301 of them — which trips the
    # rate limiter and turns a two-minute read into an hour.
    parts = base.split("/")
    container = "/".join(parts[:4]) if len(parts) >= 4 else base
    if container in _SAS_CACHE:
        return base + "?" + _SAS_CACHE[container]

    with _SAS_LOCK:
        if container in _SAS_CACHE:
            return base + "?" + _SAS_CACHE[container]

        url = "https://planetarycomputer.microsoft.com/api/sas/v1/sign?href=" + urllib.parse.quote(
            base, safe=""
        )
        for attempt in range(6):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "field-shift/3.0"})
                with urllib.request.urlopen(req, timeout=60) as r:
                    signed = json.loads(r.read())["href"]
                token = signed.partition("?")[2]
                _SAS_CACHE[container] = token
                return base + "?" + token
            except urllib.error.HTTPError as exc:
                if exc.code == 429:
                    time.sleep(3 * (attempt + 1))
                    continue
                raise
        raise RuntimeError("could not obtain a SAS token")


def _ndvi_point(feat: dict, lon: float, lat: float) -> tuple[str, float | None]:
    """Read a 3x3 pixel mean of NDVI around one point from one composite."""
    import rasterio
    from rasterio.warp import transform as warp_transform
    from rasterio.windows import Window

    stamp = feat["properties"]["start_datetime"][:10]
    href = feat["assets"]["250m_16_days_NDVI"]["href"]
    last = None
    for attempt in range(6):
        try:
            with rasterio.open("/vsicurl/" + _sign(href)) as ds:
                xs, ys = warp_transform("EPSG:4326", ds.crs, [lon], [lat])
                row, col = ds.index(xs[0], ys[0])
                win = ds.read(1, window=Window(col - 1, row - 1, 3, 3)).astype("float64")
                valid = win[win != ds.nodata]
                if not valid.size:
                    return stamp, None
                return stamp, round(float(valid.mean()) * 0.0001, 4)
        except Exception as exc:  # noqa: BLE001
            # Throttling and DNS failures are both transient. Retrying everything is
            # cheaper than losing a composite, and a lost composite is a hole in the
            # greenness record that nothing downstream can fill.
            last = exc
            time.sleep(1.5 * (attempt + 1))
    print(f"    skip {feat['id']}: {last}", flush=True)
    return stamp, None


def fetch_ndvi(field: dict, workers: int = 4) -> dict:
    """MODIS MOD13Q1 250 m 16-day NDVI, 3x3 pixel mean around the point.

    Each composite is a separate COG on the Planetary Computer blob store, so the
    cost is one HTTP round trip per composite. Reading them serially takes about
    an hour per field; a thread pool brings that to a few minutes. GDAL releases
    the GIL inside the read, so threads are the right tool here.
    """
    from concurrent.futures import ThreadPoolExecutor

    cache_file = CACHE / f"ndvi-{field['id']}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())

    end = date.today().isoformat()
    feats = _pc_search("modis-13Q1-061", field["lon"], field["lat"], NDVI_START, end)
    # The collection mixes Terra (MOD13Q1) and Aqua (MYD13Q1) and repeats tiles.
    # Keep Terra only, one composite per acquisition date.
    seen: dict[str, dict] = {}
    for feat in feats:
        if not feat["id"].startswith("MOD13Q1"):
            continue
        stamp = feat["properties"].get("start_datetime") or ""
        if not stamp:
            continue
        seen.setdefault(stamp[:10], feat)
    feats = [seen[k] for k in sorted(seen)][::2]  # 32-day sampling keeps the run bounded
    print(f"  MODIS {field['id']}: {len(feats)} composites, {workers} workers", flush=True)

    done = 0
    results: list[tuple[str, float | None]] = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(_ndvi_point, f, field["lon"], field["lat"]) for f in feats]
        for fut in futures:
            results.append(fut.result())
            done += 1
            if done % 50 == 0:
                print(f"    {done}/{len(feats)}", flush=True)

    results.sort(key=lambda r: r[0])
    dates = [d for d, v in results if v is not None]
    values = [v for _, v in results if v is not None]

    payload = {"dates": dates, "values": values, "product": "MOD13Q1.061", "scale": 0.0001}
    cache_file.write_text(json.dumps(payload))
    print(f"    wrote {len(values)} NDVI points", flush=True)
    return payload


SOIL_DEFAULTS = {
    # clay %, sand %, silt %, SOC %, pH, bulk density g/cm3, source note
    "punjab-sheikhupura": (22, 45, 33, 0.45, 7.8, 1.45, "Typical canal-command loam, Punjab"),
    "iowa-boone": (27, 35, 38, 2.20, 6.4, 1.35, "Typical Iowa loess-derived loam"),
    "kenya-nakuru": (32, 40, 28, 1.40, 5.8, 1.30, "Highland nitisol, Nakuru"),
    "india-nagpur": (38, 25, 37, 0.60, 7.6, 1.40, "Deccan vertisol"),
    "vietnam-can-tho": (35, 15, 50, 1.80, 5.5, 1.20, "Mekong Delta alluvial clay loam"),
}


SOIL_PROPS = ["clay", "sand", "silt", "soc", "phh2o", "bdod"]

# SoilGrids reports in g/kg, dg/kg, pH*10 and cg/cm3. We divide by d_factor, so the
# stored number is in the target unit and the label has to say so — otherwise the
# bundle claims "22.3 g/kg clay" when it means 22.3 percent.
SOIL_UNITS = {
    "clay": "%",
    "sand": "%",
    "silt": "%",
    "soc": "g/kg",
    "phh2o": "pH",
    "bdod": "g/cm3",
}

# Half-width of the WCS window, in degrees. 0.06 deg is about 6.6 km, so the box is
# roughly 13 km across — a neighbourhood, not a single pixel.
SOIL_HALF_DEG = 0.06
# Half-width of the central window we actually take the median over, about 2.2 km.
SOIL_CORE_DEG = 0.02


def _soil_wcs(prop: str, lat: float, lon: float) -> tuple[float | None, int]:
    """Median of the valid SoilGrids pixels in a small box around the field.

    The point-query API is unusable at scale: it returns HTTP 500 for multi-property
    requests, 429s under any concurrency, and hangs often enough that a nine-point
    walk takes tens of minutes. The WCS endpoint serves the same 250 m grid as a
    small GeoTIFF in one request, which is both faster and a better statistic — a
    median over a neighbourhood instead of one pixel that may be masked.
    """
    import numpy as np
    import rasterio
    from rasterio.io import MemoryFile

    url = (
        "https://maps.isric.org/mapserv?map=/map/{p}.map"
        "&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage"
        "&COVERAGEID={p}_0-5cm_mean&FORMAT=GEOTIFF_INT16"
        "&SUBSET=long({x0},{x1})&SUBSET=lat({y0},{y1})"
        "&SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/4326"
    ).format(
        p=prop,
        x0=round(lon - SOIL_HALF_DEG, 4),
        x1=round(lon + SOIL_HALF_DEG, 4),
        y0=round(lat - SOIL_HALF_DEG, 4),
        y1=round(lat + SOIL_HALF_DEG, 4),
    )
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "field-shift/3.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                blob = r.read()
            with MemoryFile(blob) as mem, mem.open() as ds:
                band = ds.read(1).astype("float64")
                nodata = ds.nodata
                transform = ds.transform
                # Central window first; fall back to the whole box if it is empty.
                for half in (SOIL_CORE_DEG, SOIL_HALF_DEG):
                    rows, cols = rasterio.transform.rowcol(
                        transform,
                        [lon - half, lon + half],
                        [lat + half, lat - half],
                    )
                    r0, r1 = max(0, min(rows)), min(band.shape[0], max(rows) + 1)
                    c0, c1 = max(0, min(cols)), min(band.shape[1], max(cols) + 1)
                    window = band[r0:r1, c0:c1]
                    # These coverages carry no nodata tag; masked pixels are stored as 0,
                    # and every property here is physically positive, so 0 is the mask.
                    valid = window[window > 0]
                    valid = valid[np.isfinite(valid)]
                    if valid.size:
                        return float(np.median(valid)), int(valid.size)
            return None, 0
        except Exception:  # noqa: BLE001
            time.sleep(3 * (attempt + 1))
    return None, 0


def fetch_soil(field: dict) -> dict:
    """SoilGrids 250 m surface properties, median over a neighbourhood.

    Every field in the app carries a real SoilGrids texture. Where the exact pixel
    is masked — water, built-up land, a gap in the grid — the median over the
    surrounding 2.2 km still returns a value, and the bundle records how many
    pixels went into it so the number is auditable.
    """
    cache_file = CACHE / f"soil-{field['id']}.json"
    if cache_file.exists():
        return json.loads(cache_file.read_text())

    out: dict[str, object] = {}
    counts: dict[str, int] = {}
    for prop in SOIL_PROPS:
        raw, n = _soil_wcs(prop, field["lat"], field["lon"])
        if raw is None:
            continue
        factor = {"clay": 10, "sand": 10, "silt": 10, "soc": 10, "phh2o": 10, "bdod": 100}[prop]
        out[prop] = {"value": round(raw / factor, 3), "unit": SOIL_UNITS[prop]}
        counts[prop] = n
        print(f"  soil {field['id']} {prop}: {raw / factor:.2f} from {n} px", flush=True)

    if all(p in out for p in ("clay", "sand", "silt")):
        out["source"] = (
            "ISRIC SoilGrids 250m, 0-5cm mean, median of the valid pixels within "
            f"{SOIL_CORE_DEG * 111:.1f} km of the field point"
        )
        out["pixels"] = counts
        out["fallback"] = False
        cache_file.write_text(json.dumps(out))
        print(f"  soil {field['id']}: SoilGrids, {len(counts)}/6 properties", flush=True)
        return out

    clay, sand, silt, soc, ph, bd, note = SOIL_DEFAULTS[field["id"]]
    print(f"  soil fallback for {field['id']}: {len(counts)}/6 properties", flush=True)
    out = {
        "clay": {"value": clay, "unit": "%"},
        "sand": {"value": sand, "unit": "%"},
        "silt": {"value": silt, "unit": "%"},
        "soc": {"value": soc * 10, "unit": "g/kg"},
        "phh2o": {"value": ph * 10, "unit": "pH"},
        "bdod": {"value": bd * 100, "unit": "g/cm3"},
        "source": f"Regional default ({note}); SoilGrids unreachable at build time. Editable in the app.",
        "fallback": True,
    }
    cache_file.write_text(json.dumps(out))
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--skip-ndvi", action="store_true")
    args = ap.parse_args()
    wanted = {s.strip() for s in args.only.split(",") if s.strip()}

    for field in FIELDS:
        if wanted and field["id"] not in wanted:
            continue
        print(f"== {field['id']}", flush=True)
        power = fetch_power(field)
        params = power["parameters"]
        days = sorted(params["T2M"].keys())
        bundle = {
            "id": field["id"],
            "name": field["name"],
            "country": field["country"],
            "region": field["region"],
            "system": field["system"],
            "note": field["note"],
            "lat": field["lat"],
            "lon": field["lon"],
            "elevation": power["elevation"],
            "provenance": {
                "meteorology": {
                    "source": "NASA POWER daily point API, community AG",
                    "product": "MERRA-2 reanalysis",
                    "url": (
                        "https://power.larc.nasa.gov/api/temporal/daily/point"
                        f"?parameters={','.join(POWER_PARAMS)}&community=AG"
                        f"&longitude={field['lon']}&latitude={field['lat']}"
                        f"&start={START_YEAR}0101&end={END_YEAR}1231&format=JSON"
                    ),
                    "retrieved": date.today().isoformat(),
                },
                "vegetation": {
                    "source": "NASA MODIS MOD13Q1 250m 16-day NDVI",
                    "access": "Microsoft Planetary Computer COG mirror of the NASA LP DAAC product",
                },
            },
            "daily": {
                "start": days[0],
                "n": len(days),
                "tmax": [round(params["T2M_MAX"][d], 1) for d in days],
                "tmin": [round(params["T2M_MIN"][d], 1) for d in days],
                "tmean": [round(params["T2M"][d], 1) for d in days],
                "precip": [round(params["PRECTOTCORR"][d], 1) for d in days],
                "rh": [round(params["RH2M"][d]) for d in days],
                "ws": [round(params["WS2M"][d], 1) for d in days],
                "srad": [round(params["ALLSKY_SFC_SW_DWN"][d], 1) for d in days],
                "gwetroot": [round(params["GWETROOT"][d], 2) for d in days],
            },
            "soil": fetch_soil(field),
        }
        if not args.skip_ndvi:
            bundle["ndvi"] = fetch_ndvi(field)
        (OUT / f"{field['id']}.json").write_text(json.dumps(bundle, separators=(",", ":")))
        print(f"  wrote {field['id']}.json", flush=True)

    index = [
        {k: f[k] for k in ("id", "name", "country", "region", "system", "lat", "lon", "note")}
        for f in FIELDS
    ]
    (OUT / "index.json").write_text(json.dumps(index, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
