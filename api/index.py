from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import urllib.request
import urllib.parse
import json
import ssl
from typing import List, Dict, Optional

app = FastAPI(title="Mdaad Now Unified Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# High-trust headers to satisfy UN/ReliefWeb security
TRUST_HEADERS = {
    'User-Agent': 'MdaadNow-Coordination-Hub',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
}

def safe_fetch(url: str):
    try:
        req = urllib.request.Request(url, headers=TRUST_HEADERS)
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"Fetch Error [{url}]: {e}")
        return None

@app.get("/api/health")
def health(): return {"status": "online", "environment": "production"}

@app.get("/api/external/reports")
def get_reports(country: str = "Lebanon"):
    data = safe_fetch(f"https://api.reliefweb.int/v2/reports?appname=mdaad&limit=5&filter[field]=primary_country&filter[value]={country}&sort[]=date:desc&fields[include][]=title&fields[include][]=source&fields[include][]=url&fields[include][]=date")
    if not data: return []
    return [{
        "id": f"rw-{item['id']}",
        "category": "Safety",
        "description": item['fields'].get('title'),
        "reported_by": (item['fields'].get('source') or [{}])[0].get('name', 'ReliefWeb'),
        "created_at": item['fields'].get('date', {}).get('created'),
        "is_verified": True,
        "url": item['fields'].get('url')
    } for item in data.get('data', [])]

@app.get("/api/external/disasters/count")
def get_disasters():
    data = safe_fetch("https://api.reliefweb.int/v2/disasters?appname=mdaad&limit=0&preset=external")
    return {"count": data.get('totalCount', 0) if data else 0}

@app.get("/api/external/hdx/presence")
def get_presence(location: str = "Lebanon"):
    data = safe_fetch(f"https://hapi.humdata.org/api/v2/coordination-context/operational-presence?app_identifier=mdaad&location_name={location}&admin_level=0&output_format=json")
    if not data: return {"count": 0, "source": "OCHA HDX"}
    orgs = set(i.get('org_name') for i in data.get('data', []) if i.get('org_name'))
    return {"count": len(orgs), "source": "OCHA HDX / 3W"}

@app.get("/api/external/hdx/funding")
def get_funding(location: str = "Lebanon"):
    data = safe_fetch(f"https://hapi.humdata.org/api/v2/coordination-context/funding?app_identifier=mdaad&location_name={location}&output_format=json")
    if not data: return {"percent": 0, "source": "OCHA FTS"}
    tr = sum(i.get('requirements_usd', 0) for i in data.get('data', []))
    tf = sum(i.get('funding_usd', 0) for i in data.get('data', []))
    return {"percent": round((tf/tr*100), 1) if tr > 0 else 0, "source": "OCHA FTS"}

@app.get("/api/external/unhcr/population")
def get_population(coa: str = "LBN"):
    data = safe_fetch(f"https://api.unhcr.org/stats/v1/population?year=2023&coa={coa}")
    if not data: return []
    agg = {}
    for r in data.get('data', []):
        total = int(r.get('refugees', 0)) + int(r.get('asylum_seekers', 0))
        if total > 0:
            coo = r.get('coo_name')
            agg[coo] = agg.get(coo, 0) + total
    res = sorted([{"coo": k, "total": v} for k, v in agg.items()], key=lambda x: x['total'], reverse=True)
    return res[:5]

@app.get("/api/external/hot/projects")
def get_hot(search: str = "Lebanon"):
    data = safe_fetch(f"https://tasks.hotosm.org/api/v2/projects/?text={urllib.parse.quote(search)}")
    return (data.get('results', []) if data else [])[:10]

@app.get("/api/requests")
def get_reqs(): return []
@app.get("/api/resources")
def get_res(): return []
