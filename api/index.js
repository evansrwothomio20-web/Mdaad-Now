const url = require('url');

module.exports = async (req, res) => {
  // Standardize Headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname.replace('/api', '');

  console.log(`API Request: ${req.method} ${path}`);

  try {
    // Basic Health Route
    if (path === '/health' || path === '') {
      return res.status(200).json({ status: "online", environment: "production", version: "1.0.0" });
    }

    // Humanitarian Data (Legacy/Proxy)
    if (path === '/humanitarian-data') {
      const type = parsedUrl.query.type;
      const country = parsedUrl.query.country || 'Lebanon';
      if (type === 'reliefweb') {
        const rwUrl = `https://api.reliefweb.int/v2/reports?appname=mdaad&limit=5&filter[field]=primary_country&filter[value]=${country}&sort[]=date:desc&fields[include][]=title&fields[include][]=source&fields[include][]=url&fields[include][]=date`;
        const rwResp = await fetch(rwUrl);
        const rwData = await rwResp.json();
        const results = (rwData.data || []).map(item => ({
          id: `rw-${item.id}`,
          category: "Safety",
          description: item.fields.title,
          reported_by: (item.fields.source || [{}])[0].name || 'ReliefWeb',
          created_at: item.fields.date?.created,
          is_verified: true,
          url: item.fields.url
        }));
        return res.status(200).json(results);
      }
    }

    // Campaigns Route
    if (path === '/campaigns') {
      return res.status(200).json([
        {
          id: 1,
          org_id: 2,
          title: "200 Blankets for District 3",
          description: "Providing warmth for displaced families in the old school compound.",
          category: "Shelter",
          urgency_level: "High",
          status: "active",
          location_label: "District 3",
          location_coords: { lat: 37.066, lng: 37.383 },
          quantity_needed: 200,
          quantity_unit: "units",
          quantity_fulfilled: 45,
          volunteer_slots: 5,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          org_id: 2,
          title: "Emergency Food Parcels",
          description: "Weekly food distribution for Sector C families.",
          category: "Food",
          urgency_level: "Critical",
          status: "active",
          location_label: "Sector C",
          location_coords: { lat: 37.067, lng: 37.384 },
          quantity_needed: 500,
          quantity_unit: "kits",
          quantity_fulfilled: 120,
          volunteer_slots: 10,
          created_at: new Date().toISOString()
        }
      ]);
    }

    // Requests Route
    if (path === '/requests') {
      if (req.method === 'GET') {
        return res.status(200).json([
          {
            id: 1,
            needs_category: "Safety",
            district: "District 3",
            urgency_level: "High",
            status: "Pending",
            description: "Main road between District 3 and District 5 blocked by debris. Assessment team needed.",
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            needs_category: "Food",
            district: "Sector C",
            urgency_level: "Medium",
            status: "Dispatched",
            description: "Daily hot meal distribution starting at 12:00 near Mosque.",
            created_at: new Date().toISOString()
          }
        ]);
      }
      
      if (req.method === 'POST') {
        // In a real serverless env, we'd write to a DB. Here we just echo back success.
        return res.status(201).json({ success: true, id: Math.floor(Math.random() * 1000), message: "Request received" });
      }
    }

    // Requests Detail / PATCH
    if (path.startsWith('/requests/')) {
      const id = path.split('/')[2];
      if (req.method === 'PATCH') {
         return res.status(200).json({ success: true, id, message: "Request updated" });
      }
    }

    // Resources Route
    if (path === '/resources') {
      return res.status(200).json([
        {
          id: 1,
          name: "Al-Rahma Medical Center",
          category: "hospital",
          address: "District 5, Sector A, Building 12",
          description: "24/7 emergency care, pediatrics, and maternal health services.",
          verification_status: "verified",
          trust_score: 95,
          last_updated: new Date().toISOString()
        },
        {
          id: 2,
          name: "Hope Beyond Borders",
          category: "ngo",
          address: "Sector C, Aid Coordination Office",
          description: "Food distribution and non-food item provisioning. Running daily kitchen serving 800 meals.",
          verification_status: "verified",
          trust_score: 78,
          last_updated: new Date().toISOString()
        },
        {
          id: 3,
          name: "Shelter Point Alpha",
          category: "shelter",
          address: "District 3, Old School Compound",
          description: "Transitional shelter for displaced families. Warm meals, bedding, and psychosocial support available.",
          verification_status: "verified",
          trust_score: 88,
          last_updated: new Date().toISOString()
        }
      ]);
    }

    // External Proxies
    if (path.startsWith('/external/')) {
      const subPath = path.replace('/external/', '');
      
      // ReliefWeb Reports
      if (subPath === 'reports') {
        const country = parsedUrl.query.country || 'Lebanon';
        const rwUrl = `https://api.reliefweb.int/v2/reports?appname=mdaad&limit=5&filter[field]=primary_country&filter[value]=${country}&sort[]=date:desc&fields[include][]=title&fields[include][]=source&fields[include][]=url&fields[include][]=date`;
        const rwResp = await fetch(rwUrl);
        const rwData = await rwResp.json();
        const results = (rwData.data || []).map(item => ({
          id: `rw-${item.id}`,
          category: "Safety",
          description: item.fields.title,
          reported_by: (item.fields.source || [{}])[0].name || 'ReliefWeb',
          created_at: item.fields.date?.created,
          is_verified: true,
          url: item.fields.url
        }));
        return res.status(200).json(results);
      }

      // ReliefWeb Disasters Count
      if (subPath === 'disasters/count') {
        const rwUrl = "https://api.reliefweb.int/v2/disasters?appname=mdaad&limit=0&preset=external";
        const rwResp = await fetch(rwUrl);
        const rwData = await rwResp.json();
        return res.status(200).json({ count: rwData.totalCount || 0 });
      }

      // HDX Presence
      if (subPath === 'hdx/presence') {
        const location = parsedUrl.query.location || 'Lebanon';
        const hdxUrl = `https://hapi.humdata.org/api/v2/coordination-context/operational-presence?app_identifier=mdaad&location_name=${location}&admin_level=0&output_format=json`;
        const hdxResp = await fetch(hdxUrl);
        const hdxData = await hdxResp.json();
        const orgs = new Set((hdxData.data || []).map(i => i.org_name).filter(Boolean));
        return res.status(200).json({ count: orgs.size, source: "OCHA HDX / 3W" });
      }

      // HDX Funding
      if (subPath === 'hdx/funding') {
        const location = parsedUrl.query.location || 'Lebanon';
        const hdxUrl = `https://hapi.humdata.org/api/v2/coordination-context/funding?app_identifier=mdaad&location_name=${location}&output_format=json`;
        const hdxResp = await fetch(hdxUrl);
        const hdxData = await hdxResp.json();
        const tr = (hdxData.data || []).reduce((acc, i) => acc + (i.requirements_usd || 0), 0);
        const tf = (hdxData.data || []).reduce((acc, i) => acc + (i.funding_usd || 0), 0);
        return res.status(200).json({ percent: tr > 0 ? Math.round((tf/tr*100) * 10) / 10 : 0, source: "OCHA FTS" });
      }

      // UNHCR Population
      if (subPath === 'unhcr/population') {
        const coa = parsedUrl.query.coa || 'LBN';
        const unhcrUrl = `https://api.unhcr.org/stats/v1/population?year=2023&coa=${coa}`;
        const unhcrResp = await fetch(unhcrUrl);
        const unhcrData = await unhcrResp.json();
        const agg = {};
        (unhcrData.data || []).forEach(r => {
          const total = parseInt(r.refugees || 0) + parseInt(r.asylum_seekers || 0);
          if (total > 0) {
            const coo = r.coo_name;
            agg[coo] = (agg[coo] || 0) + total;
          }
        });
        const resList = Object.entries(agg)
          .map(([k, v]) => ({ coo: k, total: v }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
        return res.status(200).json(resList);
      }

      // HOT Projects
      if (subPath === 'hot/projects') {
        const search = parsedUrl.query.search || 'Lebanon';
        const hotUrl = `https://tasks.hotosm.org/api/v2/projects/?text=${encodeURIComponent(search)}`;
        const hotResp = await fetch(hotUrl);
        const hotData = await hotResp.json();
        return res.status(200).json((hotData.results || []).slice(0, 10));
      }
    }

    // Volunteers Route
    if (path === '/volunteers') {
      if (req.method === 'POST') {
        return res.status(201).json({ success: true, message: "Volunteer registered" });
      }
    }

    // Organizations Route
    if (path.startsWith('/organizations/')) {
      const id = path.split('/')[2];
      return res.status(200).json({
        id,
        name: id === '2' ? "Hope Beyond Borders" : "NGO Partner",
        category: "ngo",
        description: "Humanitarian coordination and field operations.",
        address: "Sector C, Coordination Hub",
        verification_status: "verified",
        trust_score: 85
      });
    }

    // Default 404
    return res.status(404).json({ error: "Route not found", path });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
};
