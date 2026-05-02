from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import urllib.request
import urllib.parse
import json
import ssl
from typing import List, Dict, Optional

# --- CONFIGURATION ---
app = FastAPI(title="Mdaad Now Consolidated API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SSL Context for humanitarian APIs (bypassing local cert issues)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {'User-Agent': 'MdaadNow/1.0'}

# --- EXTERNAL API LOGIC ---

def fetch_reliefweb_reports(country: str = "Lebanon", limit: int = 5):
    url = f"https://api.reliefweb.int/v2/reports?appname=mdaadnow&limit={limit}&filter[field]=primary_country&filter[value]={country}&sort[]=date:desc&fields[include][]=title&fields[include][]=source&fields[include][]=url&fields[include][]=date"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode())
            reports = []
            for item in data.get('data', []):
                fields = item.get('fields', {})
                sources = fields.get('source', [])
                source_name = sources[0].get('name') if sources else "ReliefWeb"
                reports.append({
                    "id": f"rw-{item['id']}",
                    "category": "Safety",
                    "description": fields.get('title'),
                    "reported_by": source_name,
                    "created_at": fields.get('date', {}).get('created'),
                    "is_verified": True,
                    "url": fields.get('url')
                })
            return reports
    except Exception as e:
        return []

def fetch_hdx_presence(location: str = "Lebanon"):
    url = f"https://hapi.humdata.org/api/v2/coordination-context/operational-presence?app_identifier=mdaadnow&location_name={location}&admin_level=0&output_format=json"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode())
            orgs = set(item.get('org_name') for item in data.get('data', []) if item.get('org_name'))
            return {"count": len(orgs), "source": "OCHA HDX / 3W"}
    except:
        return {"count": 0, "source": "OCHA HDX"}

def fetch_hdx_funding(location: str = "Lebanon"):
    url = f"https://hapi.humdata.org/api/v2/coordination-context/funding?app_identifier=mdaadnow&location_name={location}&output_format=json"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode())
            tr = sum(item.get('requirements_usd', 0) for item in data.get('data', []))
            tf = sum(item.get('funding_usd', 0) for item in data.get('data', []))
            return {"percent": round((tf/tr*100), 1) if tr > 0 else 0, "source": "OCHA FTS"}
    except:
        return {"percent": 0, "source": "OCHA FTS"}

def fetch_unhcr_population(coa: str = "LBN"):
    url = f"https://api.unhcr.org/stats/v1/population?year=2023&coa={coa}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode())
            agg = {}
            for r in data.get('data', []):
                total = int(r.get('refugees', 0)) + int(r.get('asylum_seekers', 0))
                if total > 0:
                    coo = r.get('coo_name')
                    agg[coo] = agg.get(coo, 0) + total
            res = [{"coo": k, "total": v} for k, v in agg.items()]
            res.sort(key=lambda x: x['total'], reverse=True)
            return res[:5]
    except:
        return []

# --- ENDPOINTS ---

@app.get("/api/health")
def health(): return {"status": "ok"}

@app.get("/api/external/reports")
def get_reports(country: str = "Lebanon"): return fetch_reliefweb_reports(country)

@app.get("/api/external/disasters/count")
def get_disasters():
    url = "https://api.reliefweb.int/v2/disasters?appname=mdaadnow&limit=0"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx) as response:
            return {"count": json.loads(response.read().decode()).get('totalCount', 0)}
    except: return {"count": 0}

@app.get("/api/external/hdx/presence")
def get_presence(location: str = "Lebanon"): return fetch_hdx_presence(location)

@app.get("/api/external/hdx/funding")
def get_funding(location: str = "Lebanon"): return fetch_hdx_funding(location)

@app.get("/api/external/unhcr/population")
def get_population(coa: str = "LBN"): return fetch_unhcr_population(coa)

@app.get("/api/external/hot/projects")
def get_hot(search: str = "Lebanon"):
    url = f"https://tasks.hotosm.org/api/v2/projects/?text={urllib.parse.quote(search)}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=ctx) as response:
            return json.loads(response.read().decode()).get('results', [])[:10]
    except: return []

@app.get("/api/requests")
def get_reqs(): return [] # Mock for now to prevent database errors

@app.get("/api/resources")
def get_res(): return [] # Mock for now
