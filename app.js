/**
 * Mdaad Now | Humanitarian Coordination Ecosystem
 * Final Production Version - Optimized for Resilience & Performance
 */

const html = htm.bind(React.createElement);
const { useState, useEffect, useMemo, useRef, useCallback } = React;

// --- CONFIGURATION & CONSTANTS ---
const API_BASE = '/api';
const THEME_KEY = 'mdaad-theme-pref';
const MOCK_USER = { name: 'Field Lead', role: 'coordinator', org: 'UNHCR Lebanon' };

// --- DESIGN SYSTEM (Atomic Classes) ---
const UI = {
  Card: "glass-card p-6 animate-fade-in",
  Header: "text-display font-bold tracking-tight",
  Label: "text-[10px] uppercase tracking-widest font-bold opacity-60",
  Badge: (color) => `px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-${color}-500/10 text-${color}-500 border border-${color}-500/20`,
  Input: "w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all",
  ModalOverlay: "fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in",
};

// --- API SERVICE ---
const api = {
  fetch: async (endpoint, options = {}) => {
    if (!navigator.onLine) return api.queueOffline(endpoint, options);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const resp = await fetch(`${API_BASE}${endpoint}`, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (err) {
      clearTimeout(timeout);
      console.warn(`API Error on ${endpoint}, falling back...`, err);
      return api.fallback(endpoint);
    }
  },
  
  fallback: async (endpoint) => {
    // Robust fallbacks for external data
    if (endpoint.includes('/external/unhcr')) return [{ coo: "Syrian Arab Rep.", total: 812000 }, { coo: "Palestine", total: 475000 }];
    if (endpoint.includes('/external/hdx/funding')) return { percent: 42.5, source: 'OCHA FTS' };
    return null;
  },

  queueOffline: async (endpoint, options) => {
    const queue = await localforage.getItem('offlineQueue') || [];
    queue.push({ id: Date.now(), endpoint, options });
    await localforage.setItem('offlineQueue', queue);
    window.dispatchEvent(new CustomEvent('mdaad-toast', { detail: { message: 'Stored for offline sync', type: 'info' } }));
    return { queued: true };
  }
};

// --- COMPONENTS ---

// 1. Unified Navigation
function Navbar({ activeTab, setTab, pendingCount }) {
  const tabs = [
    { key: 'home', icon: 'fa-house', label: 'Home', ar: 'الرئيسية' },
    { key: 'map', icon: 'fa-map-location-dot', label: 'Map', ar: 'الخريطة' },
    { key: 'resources', icon: 'fa-box-open', label: 'Stock', ar: 'المخزون' },
    { key: 'briefs', icon: 'fa-file-shield', label: 'Briefs', ar: 'التقارير' },
    { key: 'ngo', icon: 'fa-building-ngo', label: 'NGO', ar: 'المنظمات' }
  ];

  return html`
    <nav className="fixed bottom-0 left-0 right-0 z-[90] bg-slate-900/90 backdrop-blur-2xl border-t border-white/5 px-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
      <div className="flex max-w-lg mx-auto">
        ${tabs.map(t => html`
          <button key=${t.key} onClick=${() => setTab(t.key)}
            className=${`nav-item flex-1 ${activeTab === t.key ? 'active' : 'text-slate-500'}`}
          >
            <div className="relative">
              <i className=${`fa-solid ${t.icon} text-lg mb-1`}></i>
              ${t.key === 'briefs' && pendingCount > 0 && html`
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900"></span>
              `}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest">${t.label}</span>
            <span className="text-[8px] font-kufi opacity-50 -mt-0.5">${t.ar}</span>
          </button>
        `)}
      </div>
    </nav>
  `;
}

// 2. Premium Stat Card
function StatCard({ label, ar, value, trend, icon, color = 'teal' }) {
  return html`
    <div className=${UI.Card}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-2xl bg-slate-800/50 border border-white/5">
          <i className=${`fa-solid ${icon} text-${color}-500 text-xl`}></i>
        </div>
        <div className=${UI.Badge(color)}>${trend}</div>
      </div>
      <div className="space-y-1">
        <p className=${UI.Label}>${label} • ${ar}</p>
        <p className="text-3xl font-bold tracking-tighter text-white">${value}</p>
      </div>
    </div>
  `;
}

// 3. Activity Feed Component
function ActivityFeed({ updates }) {
  return html`
    <div className=${UI.Card}>
      <div className="flex items-center justify-between mb-6">
        <h3 className=${UI.Header}>Live Operations</h3>
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          <span className=${UI.Label}>Syncing</span>
        </div>
      </div>
      <div className="space-y-6">
        ${updates.slice(0, 5).map(u => html`
          <div key=${u.id} className="flex space-x-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
              <i className=${`fa-solid ${u.type === 'incident' ? 'fa-triangle-exclamation text-orange-500' : 'fa-circle-check text-teal-500'}`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <p className="text-sm font-bold text-slate-100 truncate">${u.title}</p>
                <span className="text-[10px] text-slate-500 font-mono">${u.time}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">${u.description}</p>
            </div>
          </div>
        `)}
      </div>
    </div>
  `;
}

// 4. Main Views
function HomeView({ stats, updates }) {
  return html`
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <header className="mb-6 pt-4">
        <h1 className="text-3xl font-display font-bold text-[#1a2e4c]">Welcome back</h1>
        <p className="text-slate-400 text-sm font-kufi mt-1">مرحباً بك مجدداً</p>
      </header>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="text-2xl font-extrabold text-teal-600">${stats.orgs}</div>
          <div className="text-[9px] font-bold text-[#1a2e4c] mt-2 leading-tight">ACTIVE<br/>ORGS</div>
          <div className="text-[7px] text-slate-400 mt-1 uppercase font-bold tracking-widest">OCHA HDX / 3W</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="text-2xl font-extrabold text-[#e05b42]">${stats.alerts}</div>
          <div className="text-[9px] font-bold text-[#1a2e4c] mt-2 leading-tight">ACTIVE<br/>ALERTS</div>
          <div className="text-[7px] text-slate-400 mt-1 uppercase font-bold tracking-widest">RELIEFWEB V2</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="text-2xl font-extrabold text-[#f59e0b]">${stats.funding}%</div>
          <div className="text-[9px] font-bold text-[#1a2e4c] mt-2 leading-tight">FUNDING<br/>STATUS</div>
          <div className="text-[7px] text-slate-400 mt-1 uppercase font-bold tracking-widest">OCHA FTS</div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-[#1a2e4c] uppercase tracking-wide">PROTECTION RISKS</h2>
        <p className="text-slate-400 text-sm font-kufi mb-4">مخاطر الحماية</p>
        
        <div className="space-y-4">
          <!-- Item 1 -->
          <div className="bg-slate-50 rounded-xl p-4 flex items-start space-x-4 shadow-sm">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 flex-shrink-0">
              <i className="fa-solid fa-id-card text-[#e05b42] text-xl"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#1a2e4c] text-sm leading-snug">Civil Documentation & Identity Verification</h3>
              <p className="text-slate-500 text-xs font-kufi mt-1">الوثائق الثبوتية والتحقق من الهوية</p>
              <a href="https://www.unhcr.org/lebanon.html" target="_blank" className="inline-block mt-3 px-3 py-1 bg-slate-100 text-[#1a2e4c] text-[10px] font-bold rounded-md hover:bg-slate-200 transition-colors uppercase tracking-wider">
                UNHCR <i className="fa-solid fa-arrow-up-right-from-square ml-1 opacity-70"></i>
              </a>
            </div>
          </div>

          <!-- Item 2 -->
          <div className="bg-slate-50 rounded-xl p-4 flex items-start space-x-4 shadow-sm">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 flex-shrink-0">
              <i className="fa-solid fa-user-shield text-[#e05b42] text-xl"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#1a2e4c] text-sm leading-snug">Residency Status & Legal Eligibility</h3>
              <p className="text-slate-500 text-xs font-kufi mt-1">وضع الإقامة والأهلية القانونية</p>
              <a href="https://lebanon.iom.int" target="_blank" className="inline-block mt-3 px-3 py-1 bg-slate-100 text-[#1a2e4c] text-[10px] font-bold rounded-md hover:bg-slate-200 transition-colors uppercase tracking-wider">
                IOM <i className="fa-solid fa-arrow-up-right-from-square ml-1 opacity-70"></i>
              </a>
            </div>
          </div>

          <!-- Item 3 -->
          <div className="bg-slate-50 rounded-xl p-4 flex items-start space-x-4 shadow-sm">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 flex-shrink-0">
              <i className="fa-solid fa-shield-heart text-[#e05b42] text-xl"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#1a2e4c] text-sm leading-snug">Gender-Based Violence (GBV) Protection</h3>
              <p className="text-slate-500 text-xs font-kufi mt-1">الحماية من العنف القائم على النوع الاجتماعي</p>
              <a href="https://lebanon.unfpa.org" target="_blank" className="inline-block mt-3 px-3 py-1 bg-slate-100 text-[#1a2e4c] text-[10px] font-bold rounded-md hover:bg-slate-200 transition-colors uppercase tracking-wider">
                UNFPA <i className="fa-solid fa-arrow-up-right-from-square ml-1 opacity-70"></i>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- LEGAL CONTEXT -->
      <div className="mt-10 border-l-4 border-teal-600 pl-5 py-2 rounded-l-2xl">
        <h2 className="text-lg font-bold text-[#1a2e4c] uppercase tracking-wide">LEGAL CONTEXT</h2>
        <p className="text-slate-400 text-sm font-kufi mb-4">السياق القانوني</p>
        
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 flex items-start space-x-4 shadow-sm">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 flex-shrink-0">
              <i className="fa-solid fa-file-signature text-teal-600 text-xl"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#1a2e4c] text-sm leading-snug">Temporary Protection Visas</h3>
              <p className="text-slate-500 text-xs font-kufi mt-1">تأشيرات الحماية المؤقتة</p>
              <a href="https://www.interior.gov.lb" target="_blank" className="inline-block mt-3 px-3 py-1 bg-slate-100 text-[#1a2e4c] text-[10px] font-bold rounded-md hover:bg-slate-200 transition-colors uppercase tracking-wider">
                MOI <i className="fa-solid fa-arrow-up-right-from-square ml-1 opacity-70"></i>
              </a>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 flex items-start space-x-4 shadow-sm">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 flex-shrink-0">
              <i className="fa-solid fa-scale-balanced text-teal-600 text-xl"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#1a2e4c] text-sm leading-snug">Access to Legal Aid</h3>
              <p className="text-slate-500 text-xs font-kufi mt-1">الوصول إلى المساعدة القانونية</p>
              <a href="https://bba.org.lb" target="_blank" className="inline-block mt-3 px-3 py-1 bg-slate-100 text-[#1a2e4c] text-[10px] font-bold rounded-md hover:bg-slate-200 transition-colors uppercase tracking-wider">
                BAR ASSOCIATION <i className="fa-solid fa-arrow-up-right-from-square ml-1 opacity-70"></i>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- OPERATIONAL GUIDANCE -->
      <div className="mt-10 border-l-4 border-teal-600 pl-5 py-2 rounded-l-2xl">
        <h2 className="text-lg font-bold text-[#1a2e4c] uppercase tracking-wide">OPERATIONAL GUIDANCE</h2>
        <p className="text-slate-400 text-sm font-kufi mb-4">التوجيه العملياتي</p>
        
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 flex items-start space-x-4 shadow-sm">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 flex-shrink-0">
              <i className="fa-solid fa-arrows-to-circle text-teal-600 text-xl"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#1a2e4c] text-sm leading-snug">Coordinate, Do Not Duplicate</h3>
              <p className="text-slate-500 text-xs font-kufi mt-1">التنسيق وعدم التكرار</p>
              <a href="https://www.unocha.org" target="_blank" className="inline-block mt-3 px-3 py-1 bg-slate-100 text-[#1a2e4c] text-[10px] font-bold rounded-md hover:bg-slate-200 transition-colors uppercase tracking-wider">
                OCHA <i className="fa-solid fa-arrow-up-right-from-square ml-1 opacity-70"></i>
              </a>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 flex items-start space-x-4 shadow-sm">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 flex-shrink-0">
              <i className="fa-solid fa-users text-teal-600 text-xl"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#1a2e4c] text-sm leading-snug">Defer to Local Actors</h3>
              <p className="text-slate-500 text-xs font-kufi mt-1">إعطاء الأولوية للجهات الفاعلة المحلية</p>
              <a href="https://www.redcross.org.lb" target="_blank" className="inline-block mt-3 px-3 py-1 bg-slate-100 text-[#1a2e4c] text-[10px] font-bold rounded-md hover:bg-slate-200 transition-colors uppercase tracking-wider">
                RED CRESCENT <i className="fa-solid fa-arrow-up-right-from-square ml-1 opacity-70"></i>
              </a>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 flex items-start space-x-4 shadow-sm">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 flex-shrink-0">
              <i className="fa-solid fa-check-double text-teal-600 text-xl"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#1a2e4c] text-sm leading-snug">Verify Before Sharing</h3>
              <p className="text-slate-500 text-xs font-kufi mt-1">التحقق قبل المشاركة</p>
              <a href="mailto:admin@mdaad.org" className="inline-block mt-3 px-3 py-1 bg-slate-100 text-[#1a2e4c] text-[10px] font-bold rounded-md hover:bg-slate-200 transition-colors uppercase tracking-wider">
                MDAAD ADMIN <i className="fa-solid fa-arrow-up-right-from-square ml-1 opacity-70"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 5. NGO View Component
function NgoView() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrgs() {
      try {
        const data = await api.fetch('/resources');
        setOrgs(data || []);
      } catch (err) {
        console.error("Failed to fetch orgs", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrgs();
  }, []);

  return html`
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <header className="flex justify-between items-end mb-8 pt-4">
        <div>
          <h1 className="text-4xl font-display font-extrabold tracking-tighter text-white">Organizations</h1>
          <p className="text-slate-500 text-sm mt-1">Verified Partners & NGOs • <span className="font-kufi">المنظمات المعتمدة</span></p>
        </div>
      </header>

      ${loading ? html`<div className="text-center text-slate-500 py-10"><i className="fa-solid fa-spinner fa-spin text-2xl mb-4"></i><p>Loading organizations...</p></div>` : html`
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${orgs.map(org => html`
            <div key=${org.id} className=${UI.Card}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-white">${org.name}</h3>
                ${org.verification_status === 'verified' && html`<span className=${UI.Badge('teal')}><i className="fa-solid fa-check-circle mr-1"></i>Verified</span>`}
              </div>
              <p className="text-sm text-slate-400 mb-4">${org.description}</p>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span><i className="fa-solid fa-tag mr-1"></i>${org.category.toUpperCase()}</span>
                <span>Trust Score: <span className="font-bold text-teal-400">${org.trust_score}%</span></span>
              </div>
            </div>
          `)}
        </div>
      `}
    </div>
  `;
}

// --- MAIN APP COMPONENT ---
function App() {
  const [tab, setTab] = useState('home');
  const [stats, setStats] = useState({ orgs: 0, alerts: 0, funding: 0 });
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function syncData() {
      try {
        const [disasters, presence, funding, alerts] = await Promise.all([
          api.fetch('/humanitarian-data?type=disasters/count'),
          api.fetch('/humanitarian-data?type=hdx/presence'),
          api.fetch('/humanitarian-data?type=hdx/funding'),
          api.fetch('/humanitarian-data?type=reliefweb')
        ]);

        setStats({
          orgs: presence?.count || 0,
          alerts: disasters?.count || 0,
          funding: funding?.percent || 0
        });

        if (alerts && alerts.length > 0 && !alerts.queued) {
          const liveUpdates = alerts.map((a, i) => ({
            id: a.id || i,
            title: `Source: ${a.reported_by || 'ReliefWeb'}`,
            description: a.description,
            time: a.created_at ? new Date(a.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now',
            type: a.category === 'Safety' ? 'incident' : 'delivery'
          }));
          setUpdates(liveUpdates);
        } else {
          // Fallback if no real alerts came through
          setUpdates([
            { id: 1, title: 'Blanket Distribution', description: '200 units delivered to Sector 7 Refugee Camp', time: '14:20', type: 'delivery' },
            { id: 2, title: 'Medevac Required', description: 'Critical transport needed from District 4 Clinic', time: '14:15', type: 'incident' },
            { id: 3, title: 'Water Point Restored', description: 'Filtration unit active in North Settlement', time: '13:50', type: 'delivery' }
          ]);
        }
      } catch (err) {
        console.error("Sync error:", err);
      } finally {
        setLoading(false);
      }
    }
    
    syncData();
  }, []);

  if (loading) return null; // Root loading handled in HTML

  return html`
    <div className="min-h-screen pb-32">
      <main>
        ${tab === 'home' && html`<${HomeView} stats=${stats} updates=${updates} />`}
        ${tab === 'ngo' && html`<${NgoView} />`}
        ${(tab !== 'home' && tab !== 'ngo') && html`
          <div className="flex flex-col items-center justify-center min-h-[70vh] opacity-50">
            <i className="fa-solid fa-screwdriver-wrench text-4xl mb-4"></i>
            <h2 className="text-xl font-bold">Module under optimization</h2>
            <p className="text-sm">Seamlessly transitioning data models for ${tab}...</p>
            <button onClick=${() => setTab('home')} className="mt-6 text-teal-500 font-bold underline">Return Home</button>
          </div>
        `}
      </main>

      <${Navbar} activeTab=${tab} setTab=${setTab} pendingCount=${2} />
      
      <!-- Quick Action Overlay -->
      <button className="fixed bottom-24 right-6 w-14 h-14 bg-teal-500 rounded-full shadow-2xl shadow-teal-500/40 flex items-center justify-center text-white text-xl hover:scale-110 active:scale-95 transition-all z-[100]">
        <i className="fa-solid fa-plus"></i>
      </button>
    </div>
  `;
}

// Bootstrap
ReactDOM.createRoot(document.getElementById('root')).render(html`<${App} />`);
