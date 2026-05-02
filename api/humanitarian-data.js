// api/humanitarian-data.js
export default async function handler(req, res) {
  const { type, country, search, project_id } = req.query;
  const TRUST_HEADERS = { 'User-Agent': 'MdaadNow-Coordination-Hub' };

  try {
    let url = '';
    
    if (type === 'reliefweb') {
      url = `https://api.reliefweb.int/v2/reports?appname=MdaadNow&filter[field]=primary_country&filter[value]=${country || 'Lebanon'}&limit=5&fields[include][]=title&fields[include][]=source&fields[include][]=url&fields[include][]=date`;
    } else if (type === 'unhcr') {
      url = `https://api.unhcr.org/stats/v1/population?coa=${country || 'LBN'}&year=2023`;
    } else if (type === 'hdx-presence') {
      url = `https://hapi.humdata.org/api/v2/coordination-context/operational-presence?app_identifier=mdaadnow&location_name=${country || 'Lebanon'}&admin_level=0&output_format=json`;
    } else if (type === 'hdx-funding') {
      url = `https://hapi.humdata.org/api/v2/coordination-context/funding?app_identifier=mdaadnow&location_name=${country || 'Lebanon'}&output_format=json`;
    } else if (type === 'hotosm') {
      url = `https://tasks.hotosm.org/api/v2/projects/?text=${encodeURIComponent(search || 'Lebanon')}`;
    }

    const response = await fetch(url, { headers: TRUST_HEADERS });
    const data = await response.json();
    
    // Schema Mapping for ReliefWeb
    if (type === 'reliefweb' && data.data) {
        const mapped = data.data.map(item => ({
            id: 'rw-' + item.id,
            category: 'Safety',
            description: item.fields.title,
            reported_by: (item.fields.source || [{}])[0].name || 'ReliefWeb',
            created_at: item.fields.date.created,
            is_verified: true,
            url: item.fields.url
        }));
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json(mapped);
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy Fetch Error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'Failed to fetch humanitarian data' });
  }
}
