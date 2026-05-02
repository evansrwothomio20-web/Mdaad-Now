// api/humanitarian-data.js
export default async function handler(req, res) {
  const { type, country } = req.query;

  try {
    let url = '';
    
    if (type === 'reliefweb') {
      url = `https://api.reliefweb.int/v2/reports?appname=MdaadNow&filter[field]=primary_country&filter[value]=${country || 'Lebanon'}&limit=5&fields[include][]=title&fields[include][]=source&fields[include][]=url&fields[include][]=date`;
    } else if (type === 'unhcr') {
      url = `https://api.unhcr.org/stats/v1/population?coa=${country || 'LBN'}&year=2023`;
    }

    const response = await fetch(url, {
        headers: { 'User-Agent': 'MdaadNow-Coordination-Hub' }
    });
    const data = await response.json();
    
    // Mapping ReliefWeb to Mdaad Schema
    if (type === 'reliefweb' && data.data) {
        const mapped = data.data.map(item => ({
            id: 'rw-' + item.id,
            category: 'Safety',
            description: item.fields.title,
            reported_by: item.fields.source[0]?.name || 'ReliefWeb',
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
    res.status(500).json({ error: 'Failed to fetch humanitarian data' });
  }
}
