// =========================================================
  // Supabase PostgreSQL Schema (deploy in Supabase SQL Editor)
  // =========================================================
  /*
  CREATE TABLE updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    location_coords JSONB,
    description TEXT NOT NULL,
    category TEXT CHECK (category IN ('Safety','Food','Health','Shelter')),
    is_verified BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    reported_by UUID REFERENCES auth.users(id),
    verified_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending'
  );

  CREATE TABLE resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('ngo','hospital','shelter')),
    verification_status TEXT DEFAULT 'unverified',
    address TEXT,
    phone TEXT,
    whatsapp TEXT,
    description TEXT,
    capacity TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    display_name TEXT,
    role TEXT DEFAULT 'user',
    organization_name TEXT
  );

  ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Public read verified updates" ON updates FOR SELECT USING (is_verified = TRUE);
  CREATE POLICY "Public read resources" ON resources FOR SELECT USING (true);
  CREATE POLICY "Auth users insert updates" ON updates FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  CREATE POLICY "Admin/NGO verify updates" ON updates FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin','verified_org'))
  );
  */

  // =========================================================
  // To connect Supabase, uncomment below and add your URL/key:
  // =========================================================
  // const SUPABASE_URL = 'https://your-project.supabase.co';
  // const SUPABASE_KEY = 'your-anon-key';
  // const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // =========================================================
  // htm setup — JSX-free React templating
  // =========================================================
  const html = htm.bind(React.createElement);
  const { useState, useEffect, useRef, useCallback, useMemo } = React;

  // =========================================================
  // CONSTANTS
  // =========================================================
  const CATEGORIES = ['Safety','Food','Health','Shelter'];
  const CATEGORY_COLORS = { Safety:'#B83B2E', Food:'#2D7A3A', Health:'#2563EB', Shelter:'#D27D56' };
  const CATEGORY_ICONS = { Safety:'fa-triangle-exclamation', Food:'fa-wheat-awn', Health:'fa-heart-pulse', Shelter:'fa-tent' };
  const RESOURCE_CATS = ['all','ngo','hospital','shelter'];
  const RESOURCE_LABELS = { all:'All', ngo:'NGOs', hospital:'Hospitals', shelter:'Shelters' };
  const RESOURCE_ICONS = { ngo:'fa-hand-holding-heart', hospital:'fa-hospital', shelter:'fa-house-chimney' };

  const EMERGENCY_NUMBERS = [
    { name:'Ambulance', number:'112', icon:'fa-truck-medical' },
    { name:'Fire Department', number:'110', icon:'fa-fire-extinguisher' },
    { name:'Police', number:'155', icon:'fa-shield-halved' },
    { name:'UN OCHA', number:'+41 22 917 12 34', icon:'fa-globe' },
    { name:'Red Cross / Red Crescent', number:'+41 22 730 42 22', icon:'fa-plus' },
    { name:'WHO Emergency', number:'+41 22 791 21 11', icon:'fa-staff-snake' },
    { name:'UNICEF', number:'+1 212 326 7000', icon:'fa-child-reaching' },
    { name:'Local Crisis Helpline', number:'183', icon:'fa-phone-volume' },
  ];

  // =========================================================
  // MOCK DATA
  // =========================================================
  const MOCK_RESOURCES = [
    { id:1, name:'Al-Rahma Medical Center', category:'hospital', verification_status:'verified', address:'District 5, Sector A, Building 12', phone:'+905551234567', whatsapp:'+905551234567', description:'24/7 emergency care, pediatrics, and maternal health services. Currently operating at 80% capacity.', capacity:'150 beds' },
    { id:2, name:'Hope Beyond Borders', category:'ngo', verification_status:'verified', address:'Sector C, Aid Coordination Office', phone:'+905559876543', whatsapp:'+905559876543', description:'Food distribution and non-food item provisioning. Running daily kitchen serving 800 meals.', capacity:'800 meals/day' },
    { id:3, name:'Shelter Point Alpha', category:'shelter', verification_status:'verified', address:'District 3, Old School Compound', phone:'+905553456789', whatsapp:'+905553456789', description:'Transitional shelter for displaced families. Warm meals, bedding, and psychosocial support available.', capacity:'120 families' },
    { id:4, name:'Blue Crescent Clinic', category:'hospital', verification_status:'verified', address:'District 7, Main Road', phone:'+905557654321', whatsapp:'+905557654321', description:'Primary healthcare, vaccination program, and chronic disease management.', capacity:'60 patients/day' },
    { id:5, name:'Neighbors Aid Coalition', category:'ngo', verification_status:'pending', address:'Sector B, Community Center', phone:'+905552345678', whatsapp:null, description:'Volunteer-run group providing clothing and hygiene kits. Verification pending.', capacity:'200 kits/week' },
    { id:6, name:'Emergency Shelter District 9', category:'shelter', verification_status:'unverified', address:'District 9, Near Mosque', phone:null, whatsapp:null, description:'Reported ad-hoc shelter. Not yet verified by coordination team.', capacity:'Unknown' },
    { id:7, name:'Medical Relief International', category:'ngo', verification_status:'verified', address:'Sector A, Field Hospital', phone:'+905558765432', whatsapp:'+905558765432', description:'Mobile surgical unit and trauma stabilization point. Staffed by international volunteers.', capacity:'30 surgical cases/week' },
    { id:8, name:'Safe Haven Women\'s Shelter', category:'shelter', verification_status:'verified', address:'District 2, Confidential Location', phone:'+905554567890', whatsapp:'+905554567890', description:'Safe space for women and children with legal aid, counseling, and protection services.', capacity:'40 residents' },
  ];

  const INITIAL_UPDATES = [
    { id:'u1', created_at:'2024-01-15T10:30:00Z', location_coords:{lat:37.066,lat2:37.383}, description:'Main road between District 3 and District 5 blocked by debris. Use alternate route through Sector B.', category:'Safety', is_verified:true, image_url:null, reported_by:'Field Team Alpha', reporter_role:'verified_org' },
    { id:'u2', created_at:'2024-01-15T09:15:00Z', location_coords:{lat:37.070,lat2:37.378}, description:'Hot meal distribution starting at 12:00 near District 7 mosque. First come, first served.', category:'Food', is_verified:true, image_url:null, reported_by:'Hope Beyond Borders', reporter_role:'verified_org' },
    { id:'u3', created_at:'2024-01-15T08:45:00Z', location_coords:{lat:37.063,lat2:37.388}, description:'Al-Rahma Medical Center reporting shortage of insulin and pediatric antibiotics. Urgent resupply needed.', category:'Health', is_verified:true, image_url:null, reported_by:'Dr. Lina M.', reporter_role:'verified_org' },
    { id:'u4', created_at:'2024-01-15T11:00:00Z', location_coords:{lat:37.068,lat2:37.390}, description:'New tent settlement spotted in District 4 open field. Approximately 30 families, no services yet.', category:'Shelter', is_verified:false, image_url:null, reported_by:'Ahmed K.', reporter_role:'user' },
    { id:'u5', created_at:'2024-01-15T07:30:00Z', location_coords:{lat:37.072,lat2:37.375}, description:'Water truck delivering to District 8 today. Bring your own containers. 10:00-14:00.', category:'Food', is_verified:false, image_url:null, reported_by:'Community Volunteer', reporter_role:'user' },
    { id:'u6', created_at:'2024-01-14T18:00:00Z', location_coords:{lat:37.065,lat2:37.385}, description:'Structural damage reported on Building 14, District 5. Do not enter. Assessment team en route.', category:'Safety', is_verified:true, image_url:null, reported_by:'Civil Defense', reporter_role:'verified_org' },
    { id:'u7', created_at:'2024-01-15T12:20:00Z', location_coords:{lat:37.061,lat2:37.392}, description:'Volunteer doctors offering free consultations at Sector D community tent. General medicine only.', category:'Health', is_verified:false, image_url:null, reported_by:'Mariam T.', reporter_role:'user' },
  ];

  // =========================================================
  // UTILITIES
  // =========================================================
  function timeAgo(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff/60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins/60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs/24) + 'd ago';
  }

  function genId() { return 'u' + Date.now() + Math.random().toString(36).slice(2,7); }

  function whatsappLink(num) {
    if (!num) return null;
    return 'https://wa.me/' + num.replace(/[^0-9+]/g,'');
  }

  function telLink(num) {
    if (!num) return null;
    return 'tel:' + num;
  }

  // =========================================================
  // TOAST SYSTEM
  // =========================================================
  let toastListeners = [];
  function showToast(message, type) {
    type = type || 'success';
    toastListeners.forEach(function(fn) { fn(message, type); });
  }

  function ToastContainer(props) {
    var ref = useState([]);
    var toasts = ref[0], setToasts = ref[1];
    useEffect(function() {
      var handler = function(msg, type) {
        var id = Date.now();
        setToasts(function(prev) { return prev.concat([{id:id, message:msg, type:type, removing:false}]); });
        setTimeout(function() {
          setToasts(function(prev) { return prev.map(function(t) { return t.id===id ? Object.assign({},t,{removing:true}) : t; }); });
          setTimeout(function() {
            setToasts(function(prev) { return prev.filter(function(t) { return t.id!==id; }); });
          }, 300);
        }, 3000);
      };
      toastListeners.push(handler);
      return function() { toastListeners = toastListeners.filter(function(fn) { return fn!==handler; }); };
    }, []);
    return html`
      <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none" style=${{maxWidth:'100%',margin:'0 auto'}}>
        ${toasts.map(function(t) {
          var bg = t.type==='success' ? 'bg-verified' : t.type==='error' ? 'bg-unverified' : 'bg-pending';
          var icon = t.type==='success' ? 'fa-circle-check' : t.type==='error' ? 'fa-circle-xmark' : 'fa-circle-info';
          return html`
            <div key=${t.id} className=${(t.removing?'toast-out':'toast-in') + ' pointer-events-auto flex items-center gap-3 ' + bg + ' text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium'}>
              <i className=${'fa-solid ' + icon}></i>
              <span>${t.message}</span>
            </div>
          `;
        })}
      </div>
    `;
  }

  // =========================================================
  // SOS PANEL
  // =========================================================
  function SOSPanel(props) {
    return html`
      <div className="fixed inset-0 z-[90] flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Emergency contacts">
        <div className="absolute inset-0 bg-black/40" onClick=${props.onClose}></div>
        <div className="slide-up relative bg-cream rounded-t-3xl max-h-[80vh] overflow-y-auto bottom-safe" style=${{maxWidth:'100%',margin:'0 auto',width:'100%'}}>
          <div className="sticky top-0 bg-cream pt-4 pb-2 px-6 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl text-bark">Emergency Contacts</h2>
              <p className="text-xs text-bark-lighter mt-0.5">Available offline — no internet needed</p>
            </div>
            <button onClick=${props.onClose} className="w-10 h-10 rounded-full bg-cream-dark flex items-center justify-center text-bark-light hover:text-bark" aria-label="Close">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
          <div className="px-6 pb-8 space-y-2">
            ${EMERGENCY_NUMBERS.map(function(e) {
              return html`
                <a key=${e.number} href=${'tel:'+e.number} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-cream-darker hover:border-terracotta/30 transition-colors active:bg-cream-dark">
                  <div className="w-11 h-11 rounded-full bg-unverified/10 flex items-center justify-center flex-shrink-0">
                    <i className=${'fa-solid ' + e.icon + ' text-unverified'}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-bark text-sm">${e.name}</div>
                    <div className="text-bark-lighter text-xs mt-0.5">${e.number}</div>
                  </div>
                  <i className="fa-solid fa-phone text-terracotta text-sm"></i>
                </a>
              `;
            })}
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================
  // SUGGEST MODAL
  // =========================================================
  function SuggestModal(props) {
    var formRef = useState({ description:'', category:'Safety', location:'' });
    var form = formRef[0], setForm = formRef[1];
    var submitting = useState(false);
    var isSubmitting = submitting[0], setSubmitting = submitting[1];

    function handleSubmit(e) {
      e.preventDefault();
      if (!form.description.trim()) return;
      setSubmitting(true);
      // Simulate network delay for low-bandwidth realism
      setTimeout(function() {
        var newUpdate = {
          id: genId(),
          created_at: new Date().toISOString(),
          location_coords: { lat: 37.066 + (Math.random()-0.5)*0.02, lat2: 37.383 + (Math.random()-0.5)*0.02 },
          description: form.description.trim(),
          category: form.category,
          is_verified: false,
          image_url: null,
          reported_by: props.user.name,
          reporter_role: props.user.role,
        };
        props.onSubmit(newUpdate);
        setForm({ description:'', category:'Safety', location:'' });
        setSubmitting(false);
        props.onClose();
        showToast('Update submitted for review', 'success');
      }, 800);
    }

    return html`
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Suggest an update">
        <div className="absolute inset-0 bg-black/40" onClick=${props.onClose}></div>
        <div className="slide-up relative bg-cream rounded-t-3xl sm:rounded-3xl w-full bottom-safe overflow-y-auto" style=${{maxWidth:'100%',maxHeight:'90vh'}}>
          <div className="sticky top-0 bg-cream pt-5 pb-3 px-6 flex items-center justify-between border-b border-cream-darker">
            <h2 className="text-lg text-bark">Suggest an Update</h2>
            <button onClick=${props.onClose} className="w-9 h-9 rounded-full bg-cream-dark flex items-center justify-center text-bark-light" aria-label="Close">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form onSubmit=${handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-bark mb-1.5">What's happening?</label>
              <textarea
                value=${form.description}
                onInput=${function(e){ setForm(Object.assign({},form,{description:e.target.value})); }}
                rows="3"
                className="w-full rounded-xl border border-cream-darker bg-white px-4 py-3 text-bark text-sm placeholder:text-bark-lighter/60 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta resize-none"
                placeholder="e.g. Road blocked near District 5, aid distribution at 2pm..."
                required
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-semibold text-bark mb-1.5">Category</label>
              <div className="flex gap-2 flex-wrap">
                ${CATEGORIES.map(function(cat) {
                  var active = form.category === cat;
                  var col = CATEGORY_COLORS[cat];
                  return html`
                    <button key=${cat} type="button"
                      onClick=${function(){ setForm(Object.assign({},form,{category:cat})); }}
                      className=${'px-3.5 py-2 rounded-lg text-xs font-semibold border-2 transition-all ' + (active ? 'text-white' : 'bg-white text-bark-light border-cream-darker')}
                      style=${active ? {backgroundColor:col, borderColor:col} : {}}
                    >
                      <i className=${'fa-solid ' + CATEGORY_ICONS[cat] + ' mr-1'}></i> ${cat}
                    </button>
                  `;
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-bark mb-1.5">Location (optional)</label>
              <input
                type="text"
                value=${form.location}
                onInput=${function(e){ setForm(Object.assign({},form,{location:e.target.value})); }}
                className="w-full rounded-xl border border-cream-darker bg-white px-4 py-3 text-bark text-sm placeholder:text-bark-lighter/60 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
                placeholder="e.g. District 3, near the mosque"
              />
            </div>
            <div className="flex items-center gap-2 p-3 bg-pending/10 rounded-xl text-xs text-bark-light">
              <i className="fa-solid fa-circle-info text-pending"></i>
              <span>Your update will be reviewed by a verified coordinator before appearing on the live feed.</span>
            </div>
            <button type="submit" disabled=${isSubmitting || !form.description.trim()}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style=${{backgroundColor:'var(--terracotta)'}}
            >
              ${isSubmitting ? html`<i className="fa-solid fa-spinner fa-spin mr-2"></i>Sending...` : 'Submit Update'}
            </button>
          </form>
        </div>
      </div>
    `;
  }

  // =========================================================
  // UPDATE CARD
  // =========================================================
  function UpdateCard(props) {
    var u = props.update;
    var col = CATEGORY_COLORS[u.category] || '#6B5344';
    return html`
      <div className="bg-white rounded-xl border border-cream-darker p-4 fade-up">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style=${{backgroundColor:col+'15'}}>
              <i className=${'fa-solid ' + (CATEGORY_ICONS[u.category]||'fa-circle') + ' text-sm'} style=${{color:col}}></i>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wide" style=${{color:col}}>${u.category}</span>
              ${u.location_coords ? html`<div className="text-[11px] text-bark-lighter mt-0.5"><i className="fa-solid fa-location-dot mr-1"></i>${u.reporter_role === 'user' ? 'User reported' : 'Field report'}</div>` : null}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            ${u.is_verified
              ? html`<span className="verified-shimmer text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"><i className="fa-solid fa-check mr-1"></i>Verified</span>`
              : html`<span className="bg-cream-dark text-bark-lighter text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"><i className="fa-solid fa-clock mr-1"></i>Pending</span>`
            }
          </div>
        </div>
        <p className="text-sm text-bark mt-3 leading-relaxed">${u.description}</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-cream-dark">
          <span className="text-[11px] text-bark-lighter">By ${u.reported_by}</span>
          <span className="text-[11px] text-bark-lighter">${timeAgo(u.created_at)}</span>
        </div>
        ${props.showActions && !u.is_verified ? html`
          <div className="flex gap-2 mt-3">
            <button onClick=${function(){ props.onVerify(u.id); }}
              className="flex-1 py-2 rounded-lg bg-verified/10 text-verified text-xs font-semibold hover:bg-verified/20 transition-colors">
              <i className="fa-solid fa-check mr-1"></i>Approve
            </button>
            <button onClick=${function(){ props.onReject(u.id); }}
              className="flex-1 py-2 rounded-lg bg-unverified/10 text-unverified text-xs font-semibold hover:bg-unverified/20 transition-colors">
              <i className="fa-solid fa-xmark mr-1"></i>Reject
            </button>
          </div>
        ` : null}
      </div>
    `;
  }

  // =========================================================
  // RESOURCE CARD
  // =========================================================
  function ResourceCard(props) {
    var r = props.resource;
    var verCol = r.verification_status==='verified' ? 'var(--verified)' : r.verification_status==='pending' ? 'var(--pending)' : 'var(--bark-lighter)';
    var verBg = r.verification_status==='verified' ? 'rgba(45,122,58,0.1)' : r.verification_status==='pending' ? 'rgba(196,150,12,0.1)' : 'rgba(107,83,68,0.08)';
    var verLabel = r.verification_status==='verified' ? 'Verified' : r.verification_status==='pending' ? 'Pending Review' : 'Unverified';
    var verIcon = r.verification_status==='verified' ? 'fa-circle-check' : r.verification_status==='pending' ? 'fa-clock' : 'fa-circle-question';
    var catIcon = RESOURCE_ICONS[r.category] || 'fa-building';
    var waLink = whatsappLink(r.whatsapp);
    var callLink = telLink(r.phone);

    return html`
      <div className="bg-white rounded-xl border border-cream-darker p-4 fade-up">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-terracotta/10 flex items-center justify-center flex-shrink-0">
            <i className=${'fa-solid ' + catIcon + ' text-terracotta'}></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-bark text-sm leading-tight">${r.name}</h3>
              <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex items-center gap-1" style=${{color:verCol, backgroundColor:verBg}}>
                <i className=${'fa-solid ' + verIcon}></i> ${verLabel}
              </span>
            </div>
            <span className="text-xs text-bark-lighter capitalize mt-0.5 block">${RESOURCE_LABELS[r.category]}</span>
          </div>
        </div>
        <p className="text-xs text-bark-light mt-2.5 leading-relaxed">${r.description}</p>
        ${r.address ? html`<p className="text-xs text-bark-lighter mt-1.5"><i className="fa-solid fa-location-dot text-terracotta/60 mr-1.5"></i>${r.address}</p>` : null}
        ${r.capacity ? html`<p className="text-xs text-bark-lighter mt-1"><i className="fa-solid fa-people-group text-terracotta/60 mr-1.5"></i>${r.capacity}</p>` : null}
        <div className="flex gap-2 mt-3 pt-3 border-t border-cream-dark">
          ${waLink ? html`
            <a href=${waLink} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-colors"
              style=${{backgroundColor:'#25D36620', color:'#25D366'}}
              aria-label=${'WhatsApp ' + r.name}
            >
              <i className="fa-brands fa-whatsapp text-sm"></i> WhatsApp
            </a>
          ` : null}
          ${callLink ? html`
            <a href=${callLink}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-terracotta/10 text-terracotta text-xs font-semibold hover:bg-terracotta/20 transition-colors"
              aria-label=${'Call ' + r.name}
            >
              <i className="fa-solid fa-phone text-sm"></i> Call
            </a>
          ` : null}
          ${!waLink && !callLink ? html`
            <span className="flex-1 text-center py-2.5 text-xs text-bark-lighter italic">No contact info available</span>
          ` : null}
        </div>
      </div>
    `;
  }

  // =========================================================
  // HOME VIEW
  // =========================================================
  function HomeView(props) {
    var verifiedCount = props.resources.filter(function(r){ return r.verification_status==='verified'; }).length;
    var alertCount = props.updates.filter(function(u){ return u.category==='Safety' && u.is_verified; }).length;
    var pendingCount = props.updates.filter(function(u){ return !u.is_verified; }).length;
    var canApprove = props.user.role==='admin' || props.user.role==='verified_org';
    var latestVerified = props.updates.filter(function(u){ return u.is_verified; }).slice(0,3);

    return html`
      <div className="px-4 pb-6 space-y-5">
        <!-- Greeting -->
        <div className="fade-up">
          <h1 className="text-2xl text-bark leading-tight">Welcome back, ${props.user.name}</h1>
          <p className="text-sm text-bark-lighter mt-1">Coordination snapshot for your area</p>
        </div>

        <!-- Stats -->
        <div className="grid grid-cols-3 gap-3 fade-up fade-up-delay-1">
          <div className="stat-card bg-white rounded-xl border border-cream-darker p-3 text-center">
            <div className="text-xl font-bold text-terracotta">${verifiedCount}</div>
            <div className="text-[10px] text-bark-lighter mt-0.5 font-medium uppercase tracking-wide">Verified<br/>Resources</div>
          </div>
          <div className="stat-card bg-white rounded-xl border border-cream-darker p-3 text-center">
            <div className="text-xl font-bold text-unverified">${alertCount}</div>
            <div className="text-[10px] text-bark-lighter mt-0.5 font-medium uppercase tracking-wide">Active<br/>Alerts</div>
          </div>
          <div className="stat-card bg-white rounded-xl border border-cream-darker p-3 text-center">
            <div className="text-xl font-bold text-pending">${pendingCount}</div>
            <div className="text-[10px] text-bark-lighter mt-0.5 font-medium uppercase tracking-wide">Pending<br/>Reviews</div>
          </div>
        </div>

        <!-- Quick actions -->
        <div className="fade-up fade-up-delay-2 flex gap-2">
          <button onClick=${props.onSuggest}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold transition-all active:scale-[0.97]"
            style=${{backgroundColor:'var(--terracotta)'}}
          >
            <i className="fa-solid fa-plus"></i> Report Update
          </button>
          <button onClick=${function(){ props.setTab('resources'); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-cream-darker text-bark text-sm font-semibold transition-all active:scale-[0.97]"
          >
            <i className="fa-solid fa-magnifying-glass"></i> Find Help
          </button>
        </div>

        <!-- Latest verified updates -->
        <div className="fade-up fade-up-delay-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base text-bark">Latest Verified Updates</h2>
            <button onClick=${function(){ props.setTab('briefs'); }} className="text-xs text-terracotta font-semibold hover:text-terracotta-dark">
              View all <i className="fa-solid fa-arrow-right ml-0.5"></i>
            </button>
          </div>
          <div className="space-y-3">
            ${latestVerified.map(function(u) {
              return html`<${UpdateCard} key=${u.id} update=${u} />`;
            })}
            ${latestVerified.length === 0 ? html`
              <div className="text-center py-8 text-bark-lighter text-sm">No verified updates yet</div>
            ` : null}
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================
  // MAP VIEW
  // =========================================================
  function MapView(props) {
    var mapContainer = useRef(null);
    var mapInstance = useRef(null);
    var markersRef = useRef([]);
    var filterRef = useState('all');
    var mapFilter = filterRef[0], setMapFilter = filterRef[1];

    useEffect(function() {
      if (!mapContainer.current || mapInstance.current) return;

      var map = L.map(mapContainer.current, {
        center: [37.066, 37.383],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position:'topright' }).addTo(map);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.control.attribution({ prefix:false, position:'bottomleft' }).addTo(map)
        .addAttribution('OpenStreetMap');

      mapInstance.current = map;

      setTimeout(function() {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
        }
      }, 100);

      map.locate({ setView: true, maxZoom: 14 });
      
      map.on('locationfound', function(e) {
        var userIcon = L.divIcon({
          className: '',
          html: '<div class="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-[0_0_0_2px_rgba(59,130,246,0.4)]"></div>',
          iconSize: [16,16],
          iconAnchor: [8,8]
        });
        L.marker(e.latlng, {icon: userIcon, zIndexOffset: 1000}).addTo(map)
          .bindPopup("You are here");
      });

      return function() {
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }
      };
    }, []);

    useEffect(function() {
      var map = mapInstance.current;
      if (!map) return;

      // Clear old markers
      markersRef.current.forEach(function(m) { map.removeLayer(m); });
      markersRef.current = [];

      var filtered = mapFilter === 'all' ? props.updates : props.updates.filter(function(u) { return u.category === mapFilter; });

      filtered.forEach(function(u) {
        if (!u.location_coords) return;
        var col = CATEGORY_COLORS[u.category] || '#6B5344';
        var icon = L.divIcon({
          className: '',
          html: '<div class="map-marker" style="background:' + col + '"><i class="fa-solid ' + (CATEGORY_ICONS[u.category]||'fa-circle') + '" style="font-size:11px"></i></div>',
          iconSize: [28,28],
          iconAnchor: [14,14],
          popupAnchor: [0,-16],
        });
        var marker = L.marker([u.location_coords.lat, u.location_coords.lat2], {icon:icon}).addTo(map);
        var verBadge = u.is_verified
          ? '<span style="background:var(--verified);color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px">VERIFIED</span>'
          : '<span style="background:#F0E4D7;color:var(--bark-lighter);font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px">PENDING</span>';
        marker.bindPopup(
          '<div style="min-width:180px">' +
            '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">' +
              verBadge +
            '</div>' +
            '<p style="font-size:13px;line-height:1.5;color:var(--bark);margin:0 0 6px 0">' + u.description + '</p>' +
            '<span style="font-size:11px;color:var(--bark-lighter)">' + u.category + ' · ' + timeAgo(u.created_at) + '</span>' +
          '</div>'
        );
        markersRef.current.push(marker);
      });
    }, [props.updates, mapFilter]);

    return html`
      <div className="relative" style=${{height:'calc(100vh - 130px)'}}>
        <!-- Filter chips -->
        <div className="absolute top-3 left-3 right-3 z-[30] flex gap-2 overflow-x-auto pb-1" style=${{scrollbarWidth:'none'}}>
          <button onClick=${function(){ setMapFilter('all'); }}
            className=${'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ' + (mapFilter==='all' ? 'bg-bark text-white border-bark' : 'bg-white/90 text-bark-light border-cream-darker backdrop-blur-sm')}>
            All
          </button>
          ${CATEGORIES.map(function(cat) {
            var active = mapFilter === cat;
            return html`
              <button key=${cat} onClick=${function(){ setMapFilter(cat); }}
                className=${'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ' + (active ? 'text-white border-transparent' : 'bg-white/90 text-bark-light border-cream-darker backdrop-blur-sm')}
                style=${active ? {backgroundColor:CATEGORY_COLORS[cat], borderColor:CATEGORY_COLORS[cat]} : {}}
              >
                <i className=${'fa-solid ' + CATEGORY_ICONS[cat] + ' mr-1'}></i>${cat}
              </button>
            `;
          })}
        </div>
        <div ref=${mapContainer} className="w-full h-full rounded-none"></div>
      </div>
    `;
  }

  // =========================================================
  // RESOURCES VIEW
  // =========================================================
  function ResourcesView(props) {
    var searchRef = useState('');
    var query = searchRef[0], setQuery = searchRef[1];
    var catRef = useState('all');
    var catFilter = catRef[0], setCatFilter = catRef[1];

    var filtered = useMemo(function() {
      return props.resources.filter(function(r) {
        var matchCat = catFilter==='all' || r.category===catFilter;
        var matchSearch = !query || r.name.toLowerCase().includes(query.toLowerCase()) || r.description.toLowerCase().includes(query.toLowerCase());
        return matchCat && matchSearch;
      });
    }, [props.resources, catFilter, query]);

    return html`
      <div className="px-4 pb-6 space-y-4">
        <div className="fade-up">
          <h1 className="text-2xl text-bark">Resources</h1>
          <p className="text-sm text-bark-lighter mt-0.5">${filtered.length} ${filtered.length===1?'result':'results'}</p>
        </div>

        <!-- Search -->
        <div className="fade-up fade-up-delay-1 relative">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-bark-lighter text-sm"></i>
          <input
            type="search"
            value=${query}
            onInput=${function(e){ setQuery(e.target.value); }}
            className="w-full rounded-xl border border-cream-darker bg-white pl-11 pr-4 py-3 text-sm text-bark placeholder:text-bark-lighter/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            placeholder="Search organizations, hospitals..."
            aria-label="Search resources"
          />
          ${query ? html`
            <button onClick=${function(){ setQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-cream-dark flex items-center justify-center text-bark-lighter text-xs" aria-label="Clear search">
              <i className="fa-solid fa-xmark"></i>
            </button>
          ` : null}
        </div>

        <!-- Category filter -->
        <div className="fade-up fade-up-delay-2 flex gap-2 overflow-x-auto" style=${{scrollbarWidth:'none'}}>
          ${RESOURCE_CATS.map(function(c) {
            var active = catFilter === c;
            return html`
              <button key=${c} onClick=${function(){ setCatFilter(c); }}
                className=${'flex-shrink-0 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ' + (active ? 'bg-bark text-white border-bark' : 'bg-white text-bark-light border-cream-darker')}
              >
                ${c!=='all' ? html`<i className=${'fa-solid ' + RESOURCE_ICONS[c] + ' mr-1.5'}></i>` : null}${RESOURCE_LABELS[c]}
              </button>
            `;
          })}
        </div>

        <!-- Resource list -->
        <div className="space-y-3 fade-up fade-up-delay-3">
          ${filtered.map(function(r) {
            return html`<${ResourceCard} key=${r.id} resource=${r} />`;
          })}
          ${filtered.length === 0 ? html`
            <div className="text-center py-12">
              <i className="fa-solid fa-building-circle-xmark text-3xl text-cream-darker mb-3"></i>
              <p className="text-sm text-bark-lighter">No resources found matching your search</p>
            </div>
          ` : null}
        </div>
      </div>
    `;
  }

  // =========================================================
  // BRIEFS VIEW (Trust Engine)
  // =========================================================
  function BriefsView(props) {
    var sectionRef = useState('all');
    var section = sectionRef[0], setSection = sectionRef[1];
    var canApprove = props.user.role==='admin' || props.user.role==='verified_org';

    var filtered = useMemo(function() {
      if (section==='pending') return props.updates.filter(function(u){ return !u.is_verified; });
      if (section==='verified') return props.updates.filter(function(u){ return u.is_verified; });
      return props.updates;
    }, [props.updates, section]);

    var sectionLabels = { all:'All Updates', pending:'Pending Review', verified:'Verified' };

    return html`
      <div className="px-4 pb-6 space-y-4">
        <div className="fade-up">
          <h1 className="text-2xl text-bark">Briefs</h1>
          <p className="text-sm text-bark-lighter mt-0.5">
            ${canApprove ? 'You can approve or reject pending updates' : 'Updates you submit will be reviewed by verified coordinators'}
          </p>
        </div>

        <!-- Role indicator -->
        ${canApprove ? html`
          <div className="fade-up fade-up-delay-1 flex items-center gap-2 p-3 rounded-xl border" style=${{backgroundColor:'rgba(45,122,58,0.06)', borderColor:'rgba(45,122,58,0.15)'}}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style=${{backgroundColor:'var(--verified)'}}>
              <i className="fa-solid fa-shield-halved text-white text-xs"></i>
            </div>
            <div>
              <span className="text-xs font-semibold" style=${{color:'var(--verified)'}}>Coordinator Access</span>
              <span className="text-xs text-bark-lighter ml-1">— ${props.user.role==='admin' ? 'Admin' : 'Verified Organization'}</span>
            </div>
          </div>
        ` : null}

        <!-- Section tabs -->
        <div className="fade-up fade-up-delay-1 flex gap-1 bg-cream-dark rounded-xl p-1">
          ${['all','pending','verified'].map(function(s) {
            var count = s==='pending' ? props.updates.filter(function(u){return !u.is_verified;}).length
                       : s==='verified' ? props.updates.filter(function(u){return u.is_verified;}).length
                       : props.updates.length;
            var active = section === s;
            return html`
              <button key=${s} onClick=${function(){ setSection(s); }}
                className=${'flex-1 py-2 rounded-lg text-xs font-semibold transition-all ' + (active ? 'bg-white text-bark shadow-sm' : 'text-bark-lighter')}
              >
                ${sectionLabels[s]} ${html`<span className=${'ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ' + (s==='pending'&&count>0 ? 'bg-pending text-white' : active ? 'bg-cream-dark text-bark-light' : 'bg-transparent')}>${count}</span>`}
              </button>
            `;
          })}
        </div>

        <!-- Updates list -->
        <div className="space-y-3 fade-up fade-up-delay-2">
          ${filtered.map(function(u) {
            return html`<${UpdateCard} key=${u.id} update=${u} showActions=${canApprove && !u.is_verified} onVerify=${props.onVerify} onReject=${props.onReject} />`;
          })}
          ${filtered.length === 0 ? html`
            <div className="text-center py-12">
              <i className="fa-solid fa-clipboard-check text-3xl text-cream-darker mb-3"></i>
              <p className="text-sm text-bark-lighter">${section==='pending' ? 'No pending updates — all clear' : 'No updates in this category'}</p>
            </div>
          ` : null}
        </div>
      </div>
    `;
  }

  // =========================================================
  // ROLE SWITCHER (Demo)
  // =========================================================
  function RoleSwitcher(props) {
    var roles = [
      { key:'user', label:'Civilian', icon:'fa-user' },
      { key:'verified_org', label:'Verified NGO', icon:'fa-hand-holding-heart' },
      { key:'admin', label:'Admin', icon:'fa-shield-halved' },
    ];
    return html`
      <div className="flex items-center gap-1.5 bg-cream-dark rounded-lg p-0.5">
        ${roles.map(function(r) {
          var active = props.role === r.key;
          return html`
            <button key=${r.key} onClick=${function(){ props.onChange(r.key); }}
              className=${'px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ' + (active ? 'bg-white text-bark shadow-sm' : 'text-bark-lighter')}
              title=${'Switch to ' + r.label + ' role'}
            >
              <i className=${'fa-solid ' + r.icon}></i>
              <span className="hidden sm:inline">${r.label}</span>
            </button>
          `;
        })}
      </div>
    `;
  }

  // =========================================================
  // MAIN APP
  // =========================================================
  function App() {
    var tabRef = useState('home');
    var tab = tabRef[0], setTab = tabRef[1];

    var userRef = useState({ name:'Ahmed K.', role:'user' });
    var user = userRef[0], setUser = userRef[1];

    var updatesRef = useState(INITIAL_UPDATES);
    var updates = updatesRef[0], setUpdates = updatesRef[1];

    var showSOSRef = useState(false);
    var showSOS = showSOSRef[0], setShowSOS = showSOSRef[1];

    var showSuggestRef = useState(false);
    var showSuggest = showSuggestRef[0], setShowSuggest = showSuggestRef[1];

    function handleRoleChange(role) {
      var names = { user:'Ahmed K.', verified_org:'Hope Beyond Borders', admin:'Coordination Lead' };
      setUser({ name: names[role] || 'User', role: role });
      showToast('Switched to ' + (role==='user'?'Civilian':role==='verified_org'?'Verified NGO':'Admin') + ' view', 'info');
    }

    function handleSuggest(newUpdate) {
      setUpdates(function(prev) { return [newUpdate].concat(prev); });
    }

    function handleVerify(id) {
      setUpdates(function(prev) {
        return prev.map(function(u) { return u.id===id ? Object.assign({},u,{is_verified:true,verified_by:user.name}) : u; });
      });
      showToast('Update approved and published', 'success');
    }

    function handleReject(id) {
      setUpdates(function(prev) { return prev.filter(function(u) { return u.id!==id; }); });
      showToast('Update rejected', 'error');
    }

    // Cache emergency numbers to localStorage for offline use
    useEffect(function() {
      try { localStorage.setItem('mdaad_emergency', JSON.stringify(EMERGENCY_NUMBERS)); } catch(e) {}
    }, []);

    var tabs = [
      { key:'home', label:'Home', icon:'fa-house' },
      { key:'map', label:'Live Map', icon:'fa-map-location-dot' },
      { key:'resources', label:'Resources', icon:'fa-building' },
      { key:'briefs', label:'Briefs', icon:'fa-clipboard-list' },
    ];

    var pendingCount = updates.filter(function(u){ return !u.is_verified; }).length;

    return html`
      <div className="min-h-screen flex flex-col" style=${{maxWidth:'100%',margin:'0 auto',background:'var(--cream)'}}>
        <!-- Header -->
        <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-cream-darker">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style=${{backgroundColor:'var(--terracotta)'}}>
                <span className="font-serif text-white text-lg leading-none" style=${{marginTop:'2px'}}>M</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-bark leading-tight">Mdaad Now</h1>
                <p className="text-[10px] text-bark-lighter">Humanitarian Coordination</p>
              </div>
            </div>
            <${RoleSwitcher} role=${user.role} onChange=${handleRoleChange} />
          </div>
        </header>

        <!-- Tab content -->
        <main className="flex-1 overflow-y-auto tab-content" style=${{paddingTop:'16px'}}>
          ${tab==='home' && html`<${HomeView} user=${user} updates=${updates} resources=${MOCK_RESOURCES} onSuggest=${function(){ setShowSuggest(true); }} setTab=${setTab} />`}
          ${tab==='map' && html`<${MapView} updates=${updates} user=${user} />`}
          ${tab==='resources' && html`<${ResourcesView} resources=${MOCK_RESOURCES} user=${user} />`}
          ${tab==='briefs' && html`<${BriefsView} user=${user} updates=${updates} onVerify=${handleVerify} onReject=${handleReject} onSuggest=${function(){ setShowSuggest(true); }} />`}
        </main>

        <!-- Bottom navigation -->
        <nav className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-cream-darker bottom-safe" aria-label="Main navigation">
          <div className="flex">
            ${tabs.map(function(t) {
              var active = tab === t.key;
              var badge = t.key==='briefs' && pendingCount > 0 ? pendingCount : null;
              return html`
                <button key=${t.key} onClick=${function(){ setTab(t.key); }}
                  className=${'flex-1 flex flex-col items-center py-2.5 pt-3 relative transition-colors ' + (active ? 'text-terracotta' : 'text-bark-lighter')}
                  aria-label=${t.label}
                  aria-current=${active ? 'page' : undefined}
                >
                  <div className="relative">
                    <i className=${'fa-solid ' + t.icon + ' text-lg'}></i>
                    ${badge ? html`
                      <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 rounded-full bg-unverified text-white text-[9px] font-bold flex items-center justify-center px-1">${badge}</span>
                    ` : null}
                  </div>
                  <span className=${'text-[10px] mt-1 ' + (active ? 'font-bold' : 'font-medium')}>${t.label}</span>
                  ${active ? html`<div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style=${{backgroundColor:'var(--terracotta)'}}></div>` : null}
                </button>
              `;
            })}
          </div>
        </nav>

        <!-- SOS Floating Button -->
        <button
          onClick=${function(){ setShowSOS(true); }}
          className="sos-pulse fixed z-50 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl active:scale-90 transition-transform"
          style=${{backgroundColor:'var(--unverified)', bottom:'calc(80px + env(safe-area-inset-bottom, 0px))', right:'16px'}}
          aria-label="Emergency SOS contacts"
        >
          <span className="font-bold text-sm tracking-wider">SOS</span>
        </button>

        <!-- Modals -->
        ${showSOS ? html`<${SOSPanel} onClose=${function(){ setShowSOS(false); }} />` : null}
        ${showSuggest ? html`<${SuggestModal} user=${user} onClose=${function(){ setShowSuggest(false); }} onSubmit=${handleSuggest} />` : null}

        <!-- Toasts -->
        <${ToastContainer} />
      </div>
    `;
  }

  // =========================================================
  // PWA MANIFEST & SERVICE WORKER
  // =========================================================
  (function setupPWA() {
    // Create manifest
    var iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="#D27D56"/><text x="96" y="132" font-family="Georgia,serif" font-size="120" font-weight="bold" fill="white" text-anchor="middle">M</text></svg>';
    var iconDataUri = 'data:image/svg+xml;base64,' + btoa(iconSvg);
    var manifest = {
      name: 'Mdaad Now',
      short_name: 'Mdaad',
      description: 'Humanitarian coordination for low-bandwidth environments',
      start_url: '.',
      display: 'standalone',
      background_color: '#FFF8F0',
      theme_color: '#D27D56',
      orientation: 'portrait',
      icons: [{ src: iconDataUri, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
    };
    var blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    var link = document.querySelector('link[rel="manifest"]');
    if (link) link.href = URL.createObjectURL(blob);

    // Apple touch icon
    var appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = iconDataUri;
    document.head.appendChild(appleLink);

    // Register minimal service worker for offline shell caching
    if ('serviceWorker' in navigator) {
      var swCode = [
        'var CACHE_NAME = "mdaad-now-v1";',
        'var SHELL_URLS = [self.location.origin + self.location.pathname];',
        'self.addEventListener("install", function(e) {',
        '  e.waitUntil(caches.open(CACHE_NAME).then(function(c) { return c.addAll(SHELL_URLS); }));',
        '  self.skipWaiting();',
        '});',
        'self.addEventListener("activate", function(e) {',
        '  e.waitUntil(caches.keys().then(function(keys) {',
        '    return Promise.all(keys.filter(function(k){return k!==CACHE_NAME;}).map(function(k){return caches.delete(k);}));',
        '  }));',
        '  self.clients.claim();',
        '});',
        'self.addEventListener("fetch", function(e) {',
        '  e.respondWith(',
        '    caches.match(e.request).then(function(r) { return r || fetch(e.request).then(function(resp) {',
        '      if(resp.ok && resp.type==="basic"){var c=resp.clone();caches.open(CACHE_NAME).then(function(cache){cache.put(e.request,c);});}',
        '      return resp;',
        '    }).catch(function(){return new Response("Offline",{status:503});});',
        '  ));',
        '});',
      ].join('\n');
      var swBlob = new Blob([swCode], { type: 'application/javascript' });
      var swUrl = URL.createObjectURL(swBlob);
      navigator.serviceWorker.register(swUrl, { scope: './' }).catch(function() {
        // Service worker registration may fail with blob URLs in some browsers — graceful fallback
      });
    }
  })();

  // =========================================================
  // RENDER
  // =========================================================
  var root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(html`<${App} />`);
