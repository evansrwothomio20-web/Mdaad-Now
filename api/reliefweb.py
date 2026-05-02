import urllib.request
import json
import ssl
from typing import List, Dict

APP_NAME = "mdaad_now" # Recommended to be pre-approved by ReliefWeb
BASE_URL = "https://api.reliefweb.int/v2"

def fetch_reliefweb_reports(country: str = "Lebanon", limit: int = 5) -> List[Dict]:
    """
    Fetch the latest humanitarian reports from ReliefWeb API v2.
    """
    # Build query params
    # We use URL encoding for safety though not strictly needed for these simple strings
    query_params = [
        f"appname={APP_NAME}",
        f"limit={limit}",
        f"filter[field]=primary_country",
        f"filter[value]={country}",
        "sort[]=date:desc",
        "fields[include][]=title",
        "fields[include][]=source",
        "fields[include][]=url",
        "fields[include][]=date"
    ]
    url = f"{BASE_URL}/reports?" + "&".join(query_params)
    
    # Bypass SSL for environment compatibility
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    headers = {
        'User-Agent': 'MdaadNow/1.0'
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode())
            reports = []
            for item in data.get('data', []):
                fields = item.get('fields', {})
                sources = fields.get('source', [])
                source_name = sources[0].get('name') if sources else "ReliefWeb"
                reports.append({
                    "title": fields.get('title'),
                    "source": source_name,
                    "url": fields.get('url'),
                    "date": fields.get('date', {}).get('created')
                })
            return reports
    except Exception as e:
        # In production, use proper logging
        print(f"ReliefWeb API Error (Reports): {e}")
        return []

def fetch_active_disasters_count() -> int:
    """
    Fetch the count of active disasters from ReliefWeb API v2.
    """
    url = f"{BASE_URL}/disasters?appname={APP_NAME}&preset=external&limit=0"
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    headers = {
        'User-Agent': 'MdaadNow/1.0'
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode())
            return data.get('totalCount', 0)
    except Exception as e:
        print(f"ReliefWeb API Error (Disasters): {e}")
        return 0
