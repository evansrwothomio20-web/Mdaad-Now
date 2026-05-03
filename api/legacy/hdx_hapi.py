import urllib.request
import json
import ssl
from typing import List, Dict, Optional

APP_IDENTIFIER = "mdaad_now"
BASE_URL = "https://hapi.humdata.org/api/v2"

def fetch_hdx_presence(location: str = "Lebanon", admin_level: int = 0) -> Dict:
    """
    Fetch humanitarian operational presence (3W) from HDX HAPI.
    """
    # HAPI parameters
    # Note: location_name should be accurately matched in HAPI
    params = [
        f"app_identifier={APP_IDENTIFIER}",
        f"location_name={location}",
        f"admin_level={admin_level}",
        "output_format=json"
    ]
    url = f"{BASE_URL}/coordination-context/operational-presence?" + "&".join(params)
    
    # SSL context for environment compatibility
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'MdaadNow/1.0'})
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode())
            # HAPI returns a list of organizations per sector/location
            # We aggregate unique organization names
            orgs = set()
            for item in data.get('data', []):
                org_name = item.get('org_name')
                if org_name:
                    orgs.add(org_name)
            return {
                "count": len(orgs),
                "source": "OCHA HDX / 3W",
                "location": location
            }
    except Exception as e:
        print(f"HDX HAPI Error (Presence): {e}")
        return {"count": 0, "source": "OCHA HDX", "error": str(e)}

def fetch_hdx_funding(location: str = "Lebanon") -> Dict:
    """
    Fetch humanitarian funding data (FTS) from HDX HAPI.
    """
    params = [
        f"app_identifier={APP_IDENTIFIER}",
        f"location_name={location}",
        "output_format=json"
    ]
    url = f"{BASE_URL}/coordination-context/funding?" + "&".join(params)
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'MdaadNow/1.0'})
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode())
            # Sum up requirements and funding
            total_req = 0
            total_fund = 0
            for item in data.get('data', []):
                total_req += item.get('requirements_usd', 0)
                total_fund += item.get('funding_usd', 0)
            
            percent = (total_fund / total_req * 100) if total_req > 0 else 0
            return {
                "requirements": total_req,
                "funding": total_fund,
                "percent": round(percent, 1),
                "source": "OCHA FTS / HDX",
                "location": location
            }
    except Exception as e:
        print(f"HDX HAPI Error (Funding): {e}")
        return {"percent": 0, "source": "OCHA FTS", "error": str(e)}
