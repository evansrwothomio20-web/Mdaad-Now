// api/humanitarian-data.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  const { type, country, search } = req.query;
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
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }

    const response = await fetch(url, { headers: TRUST_HEADERS });
    if (!response.ok) {
        console.warn(`External API Error [${type}]: ${response.status}`);
        return res.status(200).json([]); // Return empty list instead of 500
    }

    const data = await response.json();
    
    // Mapping ReliefWeb to Mdaad Schema
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
        return res.status(200).json(mapped);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Final Proxy Error:', error);
    return res.status(200).json([]); // Final safety fallback
  }
}
