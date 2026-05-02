import urllib.request
import json
import ssl
from typing import List, Dict

BASE_URL = "https://api.unhcr.org/stats/v1"

def fetch_unhcr_population(coa: str = "LBN", year: int = 2023) -> List[Dict]:
    """
    Fetch and aggregate refugee population statistics from UNHCR API.
    coa: Country of Asylum (ISO3)
    year: The year for the statistics
    """
    params = [
        f"year={year}",
        f"coa={coa}"
    ]
    url = f"{BASE_URL}/population?" + "&".join(params)
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'MdaadNow/1.0'})
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode())
            records = data.get('data', [])
            
            # Aggregate by Country of Origin
            aggregation = {}
            for r in records:
                coo = r.get('coo_name')
                refugees = int(r.get('refugees', 0))
                asylum_seekers = int(r.get('asylum_seekers', 0))
                total = refugees + asylum_seekers
                
                if total > 0:
                    if coo in aggregation:
                        aggregation[coo] += total
                    else:
                        aggregation[coo] = total
            
            # Convert to list and sort by total
            result = [
                {"coo": coo, "total": total} 
                for coo, total in aggregation.items()
            ]
            result.sort(key=lambda x: x['total'], reverse=True)
            
            return result[:5] # Return top 5 countries of origin
            
    except Exception as e:
        print(f"UNHCR API Error (Population): {e}")
        return []
