"""Builds the site-risk snapshots used by VITRO TestFit.
data/grid-ph.json   substations and >=69 kV lines from OpenStreetMap (ODbL)
data/faults-ph.json Philippine active faults from the GEM Global Active Faults Database (CC BY-SA)
Run by .github/workflows/risk-data.yml (quarterly, or on demand)."""
import json, math, urllib.request, urllib.parse, datetime, time

TODAY = datetime.date.today().isoformat()
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
            "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]

def overpass(q):
    last = None
    for attempt in range(3):
        for ep in OVERPASS:
            try:
                req = urllib.request.Request(ep, data=urllib.parse.urlencode({"data": q}).encode(),
                                             headers={"User-Agent": "vitro-testfit-risk-data"})
                txt = urllib.request.urlopen(req, timeout=400).read().decode()
                if txt.lstrip().startswith("{"):
                    return json.loads(txt)
                last = txt[:200]
            except Exception as e:
                last = str(e)
        time.sleep(60)
    raise SystemExit("Overpass failed: " + str(last))

def kv(v):
    out = []
    for x in str(v).replace(",", ";").split(";"):
        try: out.append(float(x))
        except ValueError: pass
    return max(out) / 1000 if out else 0

def simplify(geom):
    out, last = [], None
    for i, p in enumerate(geom):
        q = [round(p["lon"], 4), round(p["lat"], 4)]
        if last is None or i == len(geom) - 1 or math.hypot((q[0]-last[0])*108000, (q[1]-last[1])*111000) > 250:
            out.append(q); last = q
    return out

AREA = 'area["ISO3166-1"="PH"][admin_level=2]->.ph;'
subs_raw = overpass('[out:json][timeout:300];' + AREA + '(node["power"="substation"](area.ph);way["power"="substation"](area.ph);relation["power"="substation"](area.ph););out center tags;')
subs = []
for e in subs_raw["elements"]:
    t = e.get("tags", {}); c = e.get("center") or {"lat": e.get("lat"), "lon": e.get("lon")}
    if c.get("lat") is None: continue
    subs.append([round(c["lon"], 4), round(c["lat"], 4), t.get("name", ""), t.get("operator", ""), kv(t.get("voltage", ""))])
subs.sort(key=lambda s: -((2 if s[2] else 0) + (1 if s[4] else 0)))
keep = []
for s in subs:
    if any(math.hypot((k[0]-s[0])*108000, (k[1]-s[1])*111000) < 200 for k in keep): continue
    keep.append(s)

lines_raw = overpass('[out:json][timeout:400];' + AREA + 'way["power"="line"]["voltage"](area.ph);out tags geom;')
lines = [[kv(e["tags"].get("voltage")), e["tags"].get("name", ""), e["tags"].get("operator", ""), simplify(e["geometry"])]
         for e in lines_raw["elements"] if e.get("geometry") and kv(e["tags"].get("voltage")) >= 69]
json.dump({"source": "OpenStreetMap contributors (ODbL): power=substation and power=line >= 69 kV", "retrieved": TODAY,
           "subs": keep, "lines": lines}, open("data/grid-ph.json", "w"), separators=(",", ":"))
print("grid:", len(keep), "substations,", len(lines), "lines")

gem = json.load(urllib.request.urlopen("https://raw.githubusercontent.com/GEMScienceTools/gem-global-active-faults/master/geojson/gem_active_faults_harmonized.geojson", timeout=300))
faults = []
for f in gem["features"]:
    g, p = f.get("geometry"), f.get("properties", {})
    if not g or p.get("catalog_name") not in ("philippines", "EOS_SE_Asia"): continue
    parts = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]
    if not any(116 <= c[0] <= 127.5 and 4 <= c[1] <= 21.5 for l in parts for c in l): continue
    for l in parts:
        faults.append({"n": p.get("name") or "Unnamed active fault", "t": p.get("slip_type") or "",
                       "c": [[round(c[0], 4), round(c[1], 4)] for c in l]})
json.dump({"source": "GEM Global Active Faults Database (CC BY-SA 4.0); Philippine traces after Penarubia et al. 2019",
           "retrieved": TODAY, "faults": faults}, open("data/faults-ph.json", "w"), separators=(",", ":"))
print("faults:", len(faults))
