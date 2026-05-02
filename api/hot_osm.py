import urllib.request
import json
import ssl
from typing import List, Dict

BASE_URL = "https://tasks.hotosm.org/api/v2"

def fetch_hot_projects(search: str = "Lebanon") -> List[Dict]:
    """
    Search for active projects in HOT Tasking Manager.
    """
    # URL encoding search term
    encoded_search = urllib.parse.quote(search)
    url = f"{BASE_URL}/projects/?text={encoded_search}"
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    headers = {
        'User-Agent': 'MdaadNow/1.0',
        'Accept': 'application/json'
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode())
            # Results are typically in data['results'] or data['mapResults']
            # We'll check for results and filter for active ones
            projects = data.get('results', [])
            return projects[:10] # Return top 10 relevant projects
    except Exception as e:
        print(f"HOT TM API Error (Projects): {e}")
        return []

def fetch_project_stats(project_id: int) -> Dict:
    """
    Fetch mapping and validation statistics for a specific project.
    """
    url = f"{BASE_URL}/projects/{project_id}/statistics/"
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    headers = {
        'User-Agent': 'MdaadNow/1.0'
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"HOT TM API Error (Stats): {e}")
        return {}
