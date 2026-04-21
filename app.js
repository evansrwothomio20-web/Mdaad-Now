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
    { id:2, name:'Hope Beyond Borders', category:'ngo', verification_status:'verified', address:'Sector C, Aid Coordination Office', phone:'+905559876543', whatsapp:'+905559876543', description:'Food distribution and non-food item provisioning. Running daily kitchen serving 800 meals.', capacity:'800 meals/day', stock_level: 8, wishlist: ['Blankets', 'Rice', 'Cooking Oil'] },
    { id:3, name:'Shelter Point Alpha', category:'shelter', verification_status:'verified', address:'District 3, Old School Compound', phone:'+905553456789', whatsapp:'+905553456789', description:'Transitional shelter for displaced families. Warm meals, bedding, and psychosocial support available.', capacity:'120 families' },
    { id:4, name:'Blue Crescent Clinic', category:'hospital', verification_status:'verified', address:'District 7, Main Road', phone:'+905557654321', whatsapp:'+905557654321', description:'Primary healthcare, vaccination program, and chronic disease management.', capacity:'60 patients/day' },
    { id:5, name:'Neighbors Aid Coalition', category:'ngo', verification_status:'pending', address:'Sector B, Community Center', phone:'+905552345678', whatsapp:null, description:'Volunteer-run group providing clothing and hygiene kits. Verification pending.', capacity:'200 kits/week', stock_level: 45, wishlist: ['Hygiene Kits', 'Baby Formula'] },
    { id:6, name:'Emergency Shelter District 9', category:'shelter', verification_status:'unverified', address:'District 9, Near Mosque', phone:null, whatsapp:null, description:'Reported ad-hoc shelter. Not yet verified by coordination team.', capacity:'Unknown' },
    { id:7, name:'Medical Relief International', category:'ngo', verification_status:'verified', address:'Sector A, Field Hospital', phone:'+905558765432', whatsapp:'+905558765432', description:'Mobile surgical unit and trauma stabilization point. Staffed by international volunteers.', capacity:'30 surgical cases/week', stock_level: 95, wishlist: ['Surgical Masks', 'Bandages'] },
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
    { id:'u8', created_at:'2024-01-15T13:00:00Z', location_coords:{lat:37.060,lat2:37.380}, description:'Safe Haven Women\'s Shelter requires additional security personnel and dignity kits.', category:'Safety', is_verified:true, image_url:null, reported_by:'Coordinator', reporter_role:'admin', is_confidential: true },
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
  // REQUEST HELP & PIZZA TRACKER
  // =========================================================
  function PizzaTracker(props) {
    const statuses = ['Pending', 'Dispatched', 'Fulfilled'];
    const currentIndex = statuses.indexOf(props.status) !== -1 ? statuses.indexOf(props.status) : 0;
    
    return html`
      <div className="w-full mt-4 bg-white p-4 rounded-xl border border-cream-darker">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-bark">Request Status</span>
          <span className="text-xs font-bold text-terracotta uppercase">${props.status}</span>
        </div>
        <div className="flex items-center w-full relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-cream-dark rounded-full"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-terracotta rounded-full transition-all duration-500" style=${{width: (currentIndex / (statuses.length - 1)) * 100 + '%'}}></div>
          
          ${statuses.map((s, i) => {
            const isActive = i <= currentIndex;
            return html`
              <div key=${s} className="relative z-10 flex flex-col items-center flex-1">
                <div className=${'w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-500 ' + (isActive ? 'bg-terracotta border-terracotta text-white' : 'bg-white border-cream-darker text-bark-lighter')}>
                  ${isActive ? html`<i className="fa-solid fa-check text-[10px]"></i>` : html`<div className="w-2 h-2 rounded-full bg-cream-darker"></div>`}
                </div>
                <span className=${'text-[10px] mt-1.5 font-bold uppercase tracking-wider transition-colors ' + (isActive ? 'text-bark' : 'text-bark-lighter')}>${s}</span>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  function RequestHelpModal(props) {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ category:'Food', district:'', urgency:'Medium', description:'', is_confidential:false });
    const [isSubmitting, setSubmitting] = useState(false);
    const [submittedReq, setSubmittedReq] = useState(null);

    async function handleSubmit(e) {
      e.preventDefault();
      setSubmitting(true);
      const res = await apiFetch('/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      setSubmitting(false);
      setSubmittedReq(Object.assign({status: 'Pending'}, form, {id: res?.id || genId()}));
      showToast('Request submitted successfully', 'success');
    }

    if (submittedReq) {
      return html`
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick=${props.onClose}></div>
          <div className="slide-up relative bg-cream rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 bottom-safe">
            <div className="text-center">
              <div className="w-16 h-16 bg-verified/20 rounded-full flex items-center justify-center mx-auto mb-4 text-verified text-2xl">
                <i className="fa-solid fa-check-circle"></i>
              </div>
              <h2 className="text-xl font-bold text-bark mb-1">Help is on the way</h2>
              <p className="text-sm text-bark-lighter mb-4">Your request has been logged in the system.</p>
            </div>
            <${PizzaTracker} status=${submittedReq.status} />
            <button onClick=${props.onClose} className="w-full mt-6 py-3 rounded-xl bg-terracotta text-white font-semibold text-sm">Close</button>
          </div>
        </div>
      `;
    }

    return html`
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick=${props.onClose}></div>
        <div className="slide-up relative bg-cream rounded-t-3xl sm:rounded-3xl w-full max-w-md bottom-safe overflow-y-auto max-h-[90vh]">
          <div className="sticky top-0 bg-cream pt-5 pb-3 px-6 flex items-center justify-between border-b border-cream-darker z-10">
            <h2 className="text-lg text-bark">Request Help</h2>
            <button type="button" onClick=${props.onClose} className="w-9 h-9 rounded-full bg-cream-dark flex items-center justify-center text-bark-light"><i className="fa-solid fa-xmark"></i></button>
          </div>
          <form onSubmit=${handleSubmit} className="p-6 space-y-4">
            ${step === 1 ? html`
              <div className="space-y-4 fade-in">
                <div>
                  <label className="block text-sm font-semibold text-bark mb-2">What do you need?</label>
                  <div className="grid grid-cols-2 gap-2">
                    ${CATEGORIES.map(cat => html`
                      <button key=${cat} type="button" onClick=${() => setForm(Object.assign({},form,{category:cat}))} 
                        className=${'p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ' + (form.category===cat ? 'bg-terracotta/10 border-terracotta text-terracotta' : 'bg-white border-cream-darker text-bark-light')}>
                        <i className=${'fa-solid ' + CATEGORY_ICONS[cat] + ' text-xl'}></i>
                        <span className="text-xs font-bold">${cat}</span>
                      </button>
                    `)}
                  </div>
                </div>
                <button type="button" onClick=${() => setStep(2)} className="w-full py-3 rounded-xl bg-bark text-white font-semibold text-sm mt-4">Next Step <i className="fa-solid fa-arrow-right ml-1"></i></button>
              </div>
            ` : null}
            ${step === 2 ? html`
              <div className="space-y-4 fade-in">
                <div>
                  <label className="block text-sm font-semibold text-bark mb-1.5">District</label>
                  <input type="text" value=${form.district} onInput=${e => setForm(Object.assign({},form,{district:e.target.value}))} required
                    className="w-full rounded-xl border border-cream-darker bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-terracotta/30 outline-none" placeholder="e.g. Sector 4, Downtown" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-bark mb-1.5">Urgency Level</label>
                  <div className="flex gap-2">
                    ${['Low','Medium','Critical'].map(level => html`
                      <button key=${level} type="button" onClick=${() => setForm(Object.assign({},form,{urgency:level}))}
                        className=${'flex-1 py-2 rounded-lg border text-xs font-semibold ' + (form.urgency===level ? (level==='Critical'?'bg-unverified border-unverified text-white':'bg-bark border-bark text-white') : 'bg-white border-cream-darker text-bark-light')}>
                        ${level}
                      </button>
                    `)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-bark mb-1.5">Additional Details</label>
                  <textarea value=${form.description} onInput=${e => setForm(Object.assign({},form,{description:e.target.value}))} rows="2"
                    className="w-full rounded-xl border border-cream-darker bg-white px-4 py-3 text-sm focus:ring-2 focus:ring-terracotta/30 outline-none"></textarea>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick=${() => setStep(1)} className="w-1/3 py-3 rounded-xl bg-cream-dark text-bark font-semibold text-sm">Back</button>
                  <button type="submit" disabled=${isSubmitting || !form.district} className="w-2/3 py-3 rounded-xl bg-terracotta text-white font-semibold text-sm disabled:opacity-50 flex justify-center items-center">
                    ${isSubmitting ? html`<i className="fa-solid fa-spinner fa-spin mr-2"></i>` : null} Submit Request
                  </button>
                </div>
              </div>
            ` : null}
          </form>
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
      <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-[0_4px_15px_rgba(0,0,0,0.03)] p-4 fade-up overflow-hidden relative">
        <i className=${'fa-solid ' + (CATEGORY_ICONS[u.category]||'fa-circle') + ' absolute -right-4 -bottom-4 text-8xl opacity-10'} style=${{color:col}}></i>
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm" style=${{backgroundColor:col}}>
              <i className=${'fa-solid ' + (CATEGORY_ICONS[u.category]||'fa-circle') + ' text-xl text-white'}></i>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider" style=${{color:col}}>${u.category}</span>
              ${u.location_coords ? html`<div className="text-[11px] text-bark-lighter font-medium mt-0.5"><i className="fa-solid fa-location-dot mr-1"></i>${u.reporter_role === 'user' ? 'User reported' : 'Field report'}</div>` : null}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            ${u.is_verified
              ? html`<span className="bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm"><i className="fa-solid fa-check mr-1"></i>Verified</span>`
              : html`<span className="bg-cream-dark border border-cream-darker text-bark-lighter text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"><i className="fa-solid fa-clock mr-1"></i>Pending</span>`
            }
          </div>
        </div>
        <p className="text-[15px] font-medium text-bark mt-3 leading-relaxed relative z-10">${u.description}</p>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-cream-dark relative z-10">
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

    var isNgo = r.category === 'ngo';
    var isCriticallyLow = isNgo && r.stock_level !== undefined && r.stock_level < 10;

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
        
        ${isNgo && r.stock_level !== undefined ? html`
          <div className="mt-3 p-3 bg-cream rounded-xl border border-cream-darker">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-bark">Inventory Stock Level</span>
              <span className=${'text-xs font-bold ' + (isCriticallyLow ? 'text-unverified' : 'text-verified')}>${r.stock_level}%</span>
            </div>
            <div className="w-full h-1.5 bg-cream-darker rounded-full overflow-hidden mb-2">
              <div className=${'h-full rounded-full ' + (isCriticallyLow ? 'bg-unverified' : 'bg-verified')} style=${{width: r.stock_level + '%'}}></div>
            </div>
            ${isCriticallyLow ? html`
              <div className="text-[10px] text-unverified font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                <i className="fa-solid fa-triangle-exclamation"></i> Critically Low
              </div>
            ` : null}
            ${r.wishlist && r.wishlist.length > 0 ? html`
              <div>
                <span className="text-[10px] text-bark-lighter uppercase tracking-wider font-bold block mb-1">Wishlist (Urgent Needs):</span>
                <div className="flex flex-wrap gap-1">
                  ${r.wishlist.map(item => html`
                    <span key=${item} className="text-[10px] bg-white border border-cream-darker text-bark-light px-2 py-0.5 rounded-md">${item}</span>
                  `)}
                </div>
              </div>
            ` : null}
          </div>
        ` : null}

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
  // VOLUNTEER VIEW
  // =========================================================
  function VolunteerView(props) {
    const [isRegistered, setIsRegistered] = useState(false);
    const [skills, setSkills] = useState([]);
    const [tasks, setTasks] = useState(props.updates.filter(u => !u.is_verified)); // Open requests
    const availableSkills = ['Medical', 'Logistics', 'Construction', 'Translation', 'Counseling'];

    function handleRegister(e) {
      e.preventDefault();
      setIsRegistered(true);
      showToast('Successfully registered as Volunteer', 'success');
    }

    function handleClaim(id) {
      setTasks(prev => prev.filter(t => t.id !== id));
      showToast('Task claimed! Thank you.', 'success');
    }

    if (!isRegistered) {
      return html`
        <div className="px-4 pb-6 space-y-4 fade-in">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-terracotta/10 rounded-full flex items-center justify-center mx-auto mb-4 text-terracotta text-2xl">
              <i className="fa-solid fa-hands-holding-child"></i>
            </div>
            <h1 className="text-2xl text-bark font-bold mb-2">Join the Volunteer Force</h1>
            <p className="text-sm text-bark-lighter">Register your skills and help your community when they need it most.</p>
          </div>
          <form onSubmit=${handleRegister} className="bg-white p-5 rounded-2xl border border-cream-darker space-y-4">
            <div>
              <label className="block text-sm font-semibold text-bark mb-2">Select your skills</label>
              <div className="flex flex-wrap gap-2">
                ${availableSkills.map(skill => {
                  const active = skills.includes(skill);
                  return html`
                    <button key=${skill} type="button" 
                      onClick=${() => setSkills(active ? skills.filter(s => s !== skill) : [...skills, skill])}
                      className=${'px-3 py-2 rounded-lg text-xs font-semibold border transition-all ' + (active ? 'bg-terracotta text-white border-terracotta' : 'bg-white text-bark-light border-cream-darker')}>
                      ${skill}
                    </button>
                  `;
                })}
              </div>
            </div>
            <button type="submit" disabled=${skills.length===0} className="w-full py-3 rounded-xl bg-bark text-white font-semibold text-sm disabled:opacity-50 mt-4">Complete Registration</button>
          </form>
        </div>
      `;
    }

    return html`
      <div className="px-4 pb-6 space-y-4 fade-in">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h1 className="text-2xl text-bark">Task Board</h1>
            <p className="text-sm text-bark-lighter mt-0.5">Open requests needing assistance</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-terracotta bg-terracotta/10 px-2 py-1 rounded-lg">${tasks.length} Active</span>
          </div>
        </div>
        
        <div className="space-y-3">
          ${tasks.map(t => html`
            <div key=${t.id} className="bg-white p-4 rounded-xl border border-cream-darker fade-up">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wide" style=${{color: CATEGORY_COLORS[t.category]||'#B83B2E'}}>${t.category}</span>
                <span className="text-[10px] text-bark-lighter">${timeAgo(t.created_at)}</span>
              </div>
              <p className="text-sm text-bark mb-3">${t.description}</p>
              ${t.location_coords ? html`<div className="text-xs text-bark-lighter mb-3"><i className="fa-solid fa-location-dot mr-1"></i> Nearby Location</div>` : null}
              <button onClick=${() => handleClaim(t.id)} className="w-full py-2.5 rounded-lg bg-terracotta/10 text-terracotta font-semibold text-xs hover:bg-terracotta hover:text-white transition-colors">
                <i className="fa-solid fa-handshake mr-1"></i> Claim Task
              </button>
            </div>
          `)}
          ${tasks.length === 0 ? html`
            <div className="text-center py-12">
              <i className="fa-solid fa-check-double text-3xl text-verified mb-3 opacity-50"></i>
              <p className="text-sm text-bark-lighter">No open tasks right now.</p>
            </div>
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
        <div className="fade-up fade-up-delay-2 flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            <button onClick=${props.onRequestHelp}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl text-white text-sm font-black transition-all active:scale-[0.97] shadow-lg border-[1.5px] border-white/50"
              style=${{background:'linear-gradient(135deg, #C41E3A, #CC5500)'}}
            >
              <i className="fa-solid fa-hand-holding-hand text-xl"></i> 
              <span className="uppercase tracking-wide">Request Help</span>
            </button>
            <button onClick=${props.onSuggest}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl text-white text-sm font-black transition-all active:scale-[0.97] shadow-lg border-[1.5px] border-white/20"
              style=${{background:'linear-gradient(135deg, #0047AB, #008080)'}}
            >
              <i className="fa-solid fa-plus text-xl"></i>
              <span className="uppercase tracking-wide">Report Update</span>
            </button>
          </div>
          <div className="flex gap-2 flex-1 sm:flex-none">
            <button onClick=${function(){ props.setTab('resources'); }}
              className="flex-1 sm:px-6 flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-cream-darker text-bark text-sm font-semibold transition-all active:scale-[0.97]"
            >
              <i className="fa-solid fa-magnifying-glass"></i> Find Help
            </button>
          </div>
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
        
        var isAuthorized = props.user && (props.user.role === 'admin' || props.user.role === 'verified_org');
        var isConfidential = u.is_confidential;
        
        var lat = u.location_coords.lat;
        var lng = u.location_coords.lat2;
        var displayDesc = u.description;
        var col = CATEGORY_COLORS[u.category] || '#6B5344';
        
        var verBadge = u.is_verified
          ? '<span style="background:var(--verified);color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px">VERIFIED</span>'
          : '<span style="background:#F0E4D7;color:var(--bark-lighter);font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px">PENDING</span>';

        if (isConfidential && !isAuthorized) {
          // General area circle instead of exact marker
          lat = Math.floor(lat * 100) / 100;
          lng = Math.floor(lng * 100) / 100;
          displayDesc = '<b style="color:var(--unverified)">Confidential Location</b><br/>General Area Only. Precise coordinates hidden for safety.';
          var circle = L.circle([lat, lng], {
            color: col,
            fillColor: col,
            fillOpacity: 0.2,
            radius: 800,
            stroke: false
          }).addTo(map);
          circle.bindPopup(
            '<div style="min-width:180px">' +
              '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">' +
                verBadge +
                '<span style="background:var(--unverified);color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px"><i class="fa-solid fa-eye-slash mr-1"></i>HIDDEN</span>' +
              '</div>' +
              '<p style="font-size:13px;line-height:1.5;color:var(--bark);margin:0 0 6px 0">' + displayDesc + '</p>' +
              '<span style="font-size:11px;color:var(--bark-lighter)">' + u.category + ' · ' + timeAgo(u.created_at) + '</span>' +
            '</div>'
          );
          markersRef.current.push(circle);
        } else {
          var icon = L.divIcon({
            className: '',
            html: '<div class="map-marker" style="background:' + col + '"><i class="fa-solid ' + (CATEGORY_ICONS[u.category]||'fa-circle') + '" style="font-size:11px"></i></div>',
            iconSize: [28,28],
            iconAnchor: [14,14],
            popupAnchor: [0,-16],
          });
          var marker = L.marker([lat, lng], {icon:icon}).addTo(map);
          var confBadge = isConfidential ? '<span style="background:var(--unverified);color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px"><i class="fa-solid fa-lock mr-1"></i>CONFIDENTIAL</span>' : '';
          marker.bindPopup(
            '<div style="min-width:180px">' +
              '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">' +
                verBadge + confBadge +
              '</div>' +
              '<p style="font-size:13px;line-height:1.5;color:var(--bark);margin:0 0 6px 0">' + displayDesc + '</p>' +
              '<span style="font-size:11px;color:var(--bark-lighter)">' + u.category + ' · ' + timeAgo(u.created_at) + '</span>' +
            '</div>'
          );
          markersRef.current.push(marker);
        }
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
  // ANALYTICS VIEW
  // =========================================================
  function AnalyticsView(props) {
    if (props.user.role !== 'admin') {
      return html`
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <i className="fa-solid fa-lock text-4xl text-cream-darker mb-4"></i>
          <h2 className="text-xl text-bark font-bold mb-2">Access Denied</h2>
          <p className="text-sm text-bark-lighter">You need Admin privileges to view this page.</p>
        </div>
      `;
    }

    const totalReq = props.updates.length;
    const fulfilledReq = props.updates.filter(u => u.is_verified).length;
    const categories = ['Food', 'Health', 'Safety', 'Shelter'];

    return html`
      <div className="px-4 pb-6 space-y-4 fade-in">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-2xl text-bark font-bold">Admin Analytics</h1>
            <p className="text-sm text-bark-lighter">Gap Analysis & Heatmap</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white p-4 rounded-xl border border-cream-darker text-center">
            <div className="text-2xl font-bold text-bark">${totalReq}</div>
            <div className="text-[10px] text-bark-lighter uppercase tracking-wider font-semibold">Total Requests</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-cream-darker text-center">
            <div className="text-2xl font-bold text-verified">${fulfilledReq}</div>
            <div className="text-[10px] text-bark-lighter uppercase tracking-wider font-semibold">Fulfilled / Verified</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-cream-darker mb-4">
          <h3 className="text-sm font-semibold text-bark mb-3">Needs by Category</h3>
          <div className="space-y-3">
            ${categories.map(cat => {
              const count = props.updates.filter(u => u.category === cat).length;
              const pct = totalReq ? Math.round((count / totalReq) * 100) : 0;
              const col = CATEGORY_COLORS[cat];
              return html`
                <div key=${cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-bark">${cat}</span>
                    <span className="text-bark-lighter">${count} (${pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-cream-darker rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style=${{width: pct+'%', backgroundColor: col}}></div>
                  </div>
                </div>
              `;
            })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-cream-darker">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-bark">Heatmap Preview</h3>
            <span className="bg-unverified/10 text-unverified text-[10px] px-2 py-1 rounded font-bold">LIVE</span>
          </div>
          <div className="h-40 bg-cream-darker rounded-lg relative overflow-hidden flex items-center justify-center">
            <i className="fa-solid fa-map-location-dot text-4xl text-white opacity-50 absolute"></i>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-unverified/20 to-transparent mix-blend-multiply"></div>
            <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-unverified/40 rounded-full blur-xl"></div>
            <div className="absolute top-1/3 right-1/3 w-12 h-12 bg-terracotta/40 rounded-full blur-lg"></div>
            <p className="z-10 text-xs font-bold text-bark bg-white/80 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm">District 5 Critical Zone</p>
          </div>
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
  // DONATION MODAL
  // =========================================================
  function DonationModal(props) {
    var options = [
      { id: 'global1', name: 'PayPal International', icon: 'fa-brands fa-paypal', region: 'Global', type: 'paypal' },
      { id: 'global2', name: 'Bitcoin / Crypto', icon: 'fa-brands fa-bitcoin', region: 'Global', type: 'crypto' },
      { id: 'eu1', name: 'SEPA Bank Transfer', icon: 'fa-solid fa-building-columns', region: 'Europe', type: 'bank' },
      { id: 'af1', name: 'Mobile Money (M-Pesa)', icon: 'fa-solid fa-mobile-screen', region: 'Africa', type: 'mobile' },
      { id: 'asia1', name: 'AliPay / WeChat', icon: 'fa-brands fa-alipay', region: 'Asia', type: 'app' },
    ];

    return html`
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Donation options">
        <div className="absolute inset-0 bg-black/40" onClick=${props.onClose}></div>
        <div className="slide-up relative bg-cream rounded-t-3xl sm:rounded-3xl w-full bottom-safe overflow-y-auto" style=${{maxWidth:'480px',maxHeight:'90vh'}}>
          <div className="sticky top-0 bg-cream pt-5 pb-3 px-6 flex items-center justify-between border-b border-cream-darker">
            <h2 className="text-lg text-bark">Support Our Mission</h2>
            <button onClick=${props.onClose} className="w-9 h-9 rounded-full bg-cream-dark flex items-center justify-center text-bark-light" aria-label="Close">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-bark-lighter mb-4">Choose a convenient payment method for your region to help fund humanitarian efforts.</p>
            ${options.map(function(opt) {
              return html`
                <button key=${opt.id} onClick=${function(){ showToast('Redirecting to ' + opt.name + '...', 'info'); props.onClose(); }} 
                  className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-cream-darker hover:border-terracotta/30 transition-all active:scale-[0.98]">
                  <div className="w-10 h-10 rounded-full bg-cream-dark flex items-center justify-center flex-shrink-0 text-terracotta">
                    <i className=${opt.icon + ' text-lg'}></i>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-bark text-sm">${opt.name}</div>
                    <div className="text-xs text-bark-lighter mt-0.5"><i className="fa-solid fa-globe mr-1 text-bark-lighter opacity-70"></i>${opt.region}</div>
                  </div>
                  <i className="fa-solid fa-arrow-up-right-from-square text-bark-lighter text-sm opacity-50"></i>
                </button>
              `;
            })}
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================
  // MAIN APP
  // =========================================================
  function App() {
    var tabRef = useState('home');
    var tab = tabRef[0], setTab = tabRef[1];

    var userRef = useState({ name:'Civilian', role:'user' });
    var user = userRef[0], setUser = userRef[1];

    var updatesRef = useState(INITIAL_UPDATES);
    var updates = updatesRef[0], setUpdates = updatesRef[1];

    var showSOSRef = useState(false);
    var showSOS = showSOSRef[0], setShowSOS = showSOSRef[1];

    var showSuggestRef = useState(false);
    var showSuggest = showSuggestRef[0], setShowSuggest = showSuggestRef[1];

    var showRequestHelpRef = useState(false);
    var showRequestHelp = showRequestHelpRef[0], setShowRequestHelp = showRequestHelpRef[1];

    var showDonationRef = useState(false);
    var showDonation = showDonationRef[0], setShowDonation = showDonationRef[1];

    function handleRoleChange(role) {
      var names = { user:'Civilian', verified_org:'Verified NGO', admin:'Admin' };
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
      { key:'map', label:'Map', icon:'fa-map-location-dot' },
      { key:'volunteer', label:'Volunteer', icon:'fa-hands-holding-child' },
      { key:'resources', label:'Resources', icon:'fa-building' },
      { key:'briefs', label:'Briefs', icon:'fa-clipboard-list' },
    ];
    if (user.role === 'admin') {
      tabs.push({ key:'analytics', label:'Analytics', icon:'fa-chart-pie' });
    }

    var pendingCount = updates.filter(function(u){ return !u.is_verified; }).length;

    return html`
      <div className="min-h-screen flex flex-col bg-grid" style=${{maxWidth:'100%',margin:'0 auto'}}>
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
          ${tab==='home' && html`<${HomeView} user=${user} updates=${updates} resources=${MOCK_RESOURCES} onSuggest=${function(){ setShowSuggest(true); }} onRequestHelp=${function(){ setShowRequestHelp(true); }} onDonate=${function(){ setShowDonation(true); }} setTab=${setTab} />`}
          ${tab==='map' && html`<${MapView} updates=${updates} user=${user} />`}
          ${tab==='volunteer' && html`<${VolunteerView} updates=${updates} user=${user} />`}
          ${tab==='resources' && html`<${ResourcesView} resources=${MOCK_RESOURCES} user=${user} />`}
          ${tab==='briefs' && html`<${BriefsView} user=${user} updates=${updates} onVerify=${handleVerify} onReject=${handleReject} onSuggest=${function(){ setShowSuggest(true); }} />`}
          ${tab==='analytics' && html`<${AnalyticsView} user=${user} updates=${updates} />`}
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

        <!-- SOS Floating Action Button -->
        <button
          onClick=${function(){ setShowSOS(true); }}
          className="sos-radar-pulse fixed z-50 rounded-full flex flex-col items-center justify-center text-white shadow-[0_8px_30px_rgb(184,59,46,0.6)] active:scale-95 transition-transform"
          style=${{
            width: '84px',
            height: '84px',
            backgroundColor: 'var(--unverified)',
            bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
            right: '24px',
            background: 'linear-gradient(135deg, #FF4B3A, #B83B2E)'
          }}
          aria-label="Emergency SOS contacts"
        >
          <span className="font-black text-2xl tracking-wider leading-none">SOS</span>
          <span className="text-[9px] font-bold uppercase tracking-wider mt-1 opacity-90 text-center leading-tight">Emergency<br/>Dispatch</span>
        </button>

        <!-- Modals -->
        ${showSOS ? html`<${SOSPanel} onClose=${function(){ setShowSOS(false); }} />` : null}
        ${showSuggest ? html`<${SuggestModal} user=${user} onClose=${function(){ setShowSuggest(false); }} onSubmit=${handleSuggest} />` : null}
        ${showRequestHelp ? html`<${RequestHelpModal} onClose=${function(){ setShowRequestHelp(false); }} />` : null}
        ${showDonation ? html`<${DonationModal} onClose=${function(){ setShowDonation(false); }} />` : null}

        <!-- Toasts -->
        <${ToastContainer} />
      </div>
    `;
  }

  // =========================================================
  // PWA MANIFEST & SERVICE WORKER & OFFLINE SYNC
  // =========================================================
  const API_BASE = 'http://localhost:8000/api'; // Or relative '/api' if hosted together

  // Register real service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(err => {
        console.error('ServiceWorker registration failed: ', err);
      });
    });
  }

  // Offline API Fetch wrapper
  async function apiFetch(endpoint, options = {}) {
    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        return await response.json();
      } catch (err) {
        console.warn('Network error, queueing offline request', err);
        return queueOfflineRequest(endpoint, options);
      }
    } else {
      console.log('Offline, queueing request');
      return queueOfflineRequest(endpoint, options);
    }
  }

  async function queueOfflineRequest(endpoint, options) {
    const queue = await localforage.getItem('offlineQueue') || [];
    const request = {
      id: Date.now().toString(),
      endpoint,
      options,
      timestamp: Date.now()
    };
    queue.push(request);
    await localforage.setItem('offlineQueue', queue);
    showToast('Saved offline. Will sync when connected.', 'info');
    
    // Attempt to trigger background sync if supported
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(swRegistration => {
        return swRegistration.sync.register('sync-offline-requests');
      }).catch(() => {
        // Fallback for browsers lacking Background Sync API
        window.addEventListener('online', processOfflineQueue, { once: true });
      });
    } else {
      window.addEventListener('online', processOfflineQueue, { once: true });
    }
    
    return { queued: true, id: request.id };
  }

  async function processOfflineQueue() {
    const queue = await localforage.getItem('offlineQueue') || [];
    if (queue.length === 0) return;
    
    console.log('Processing offline queue', queue.length);
    let successCount = 0;
    const remainingQueue = [];
    
    for (const req of queue) {
      try {
        await fetch(`${API_BASE}${req.endpoint}`, req.options);
        successCount++;
      } catch (err) {
        console.error('Failed to sync queued request', err);
        remainingQueue.push(req);
      }
    }
    
    await localforage.setItem('offlineQueue', remainingQueue);
    if (successCount > 0) showToast(`Synced ${successCount} offline updates`, 'success');
  }

  window.addEventListener('online', processOfflineQueue);

  // =========================================================
  // RENDER
  // =========================================================
  var root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(html`<${App} />`);
