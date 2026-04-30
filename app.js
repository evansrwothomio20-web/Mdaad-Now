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
  const CATEGORY_COLORS = { Safety:'#EF4444', Food:'#10B981', Health:'#3B82F6', Shelter:'#F59E0B' };
  const CATEGORY_ICONS = { Safety:'fa-triangle-exclamation', Food:'fa-wheat-awn', Health:'fa-heart-pulse', Shelter:'fa-tent' };
  const RESOURCE_CATS = ['all','ngo','hospital','shelter'];
  const RESOURCE_LABELS = { all:'All', ngo:'NGOs', hospital:'Hospitals', shelter:'Shelters' };
  const ARABIC_LABELS = {
    all: 'الكل',
    ngo: 'منظمات',
    hospital: 'مستشفيات',
    shelter: 'ملاجئ',
    Safety: 'الأمن',
    Food: 'الغذاء',
    Health: 'الصحة',
    Shelter: 'الإيواء'
  };
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
  // APP STATE (MOCKED -> REAL DATA SYNC)
  // =========================================================
  const [resources, setResources] = React.useState([]);
  const [updates, setUpdates] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // NGO Org profile (demo — replace with Supabase auth user's org)
  const MOCK_NGO_ORG = {
    id:'org-001', name:'Hope Beyond Borders', category:'ngo',
    description:'Food distribution and NFI provisioning. Running a daily kitchen serving 800 meals across 5 districts.',
    phone:'+905559876543', whatsapp:'+905559876543', address:'Sector C, Aid Coordination Office',
    verification_status:'verified', trust_score:78,
    docs_submitted:true, un_ocha_registered:true, has_field_contact:true,
    community_reports:3, campaigns_fulfilled:4, days_active:45,
    verified_at:'2024-01-10T09:00:00Z',
  };

  // ── Sync Data from Backend ──────────────────────────────
  React.useEffect(() => {
    async function initData() {
      try {
        const [resData, reqData] = await Promise.all([
          apiFetch('/resources'),
          apiFetch('/requests')
        ]);
        
        // Transform backend requests into the frontend "updates" format
        const feedUpdates = (reqData || []).map(r => ({
          id: 'req-' + r.id,
          created_at: r.created_at || new Date().toISOString(),
          description: r.description,
          category: r.needs_category,
          district: r.district,
          urgency: r.urgency_level,
          status: r.status,
          is_verified: true, // Backend requests are typically verified/official
          reported_by: r.reported_by || 'System',
          reporter_role: 'verified_org'
        }));

        setResources(resData || []);
        setUpdates(feedUpdates);
      } catch (err) {
        console.error('Failed to fetch initial data', err);
        showToast('Running in offline/cache mode', 'info');
      } finally {
        setIsLoading(false);
      }
    }
    initData();
  }, []);

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

    async function handleSubmit(e) {
      e.preventDefault();
      if (!form.description.trim()) return;
      setSubmitting(true);
      
      try {
        const payload = {
          category: form.category,
          district: form.location || 'Unknown',
          urgency: 'Medium', // Suggestions are typically medium urgency
          description: form.description.trim(),
          is_confidential: false
        };
        
        const res = await apiFetch('/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (res && !res.error) {
          props.onSubmit(Object.assign({}, payload, { id: 'req-' + res.id, created_at: new Date().toISOString() }));
          setForm({ description:'', category:'Safety', location:'' });
          showToast('Update submitted successfully', 'success');
          props.onClose();
        }
      } catch (err) {
        showToast('Failed to submit update', 'error');
      } finally {
        setSubmitting(false);
      }
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
      <div className="bg-white rounded-premium shadow-premium border-l-[6px] p-5 fade-up overflow-hidden relative" style=${{borderLeftColor: col}}>
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style=${{backgroundColor: col + '15'}}>
              <i className=${'fa-solid ' + (CATEGORY_ICONS[u.category]||'fa-circle')} style=${{color: col}}></i>
            </div>
            <div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider" style=${{color: col}}>${u.category}</span>
                <span className="text-[10px] font-kufi text-slate-400 -mt-0.5">${ARABIC_LABELS[u.category]}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            ${u.is_verified
              ? html`
                <div className="flex flex-col items-end">
                  <span className="text-tealAccent text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <i className="fa-solid fa-circle-check"></i> Verified
                  </span>
                  <span className="text-[9px] font-kufi text-tealAccent/60">موثق</span>
                </div>`
              : html`
                <div className="flex flex-col items-end">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <i className="fa-solid fa-clock"></i> Pending
                  </span>
                  <span className="text-[9px] font-kufi text-slate-400/60">قيد المراجعة</span>
                </div>`
            }
          </div>
        </div>
        <p className="text-[15px] font-medium text-slate-700 mt-4 leading-relaxed relative z-10">${u.description}</p>
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-50 relative z-10">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-400 font-medium">By ${u.reported_by}</span>
            <span className="text-[9px] font-kufi text-slate-300">بواسطة ${u.reported_by}</span>
          </div>
          <span className="text-[11px] text-slate-400">${timeAgo(u.created_at)}</span>
        </div>
        ${props.showActions && !u.is_verified ? html`
          <div className="flex gap-2 mt-4">
            <button onClick=${function(){ props.onVerify(u.id); }}
              className="flex-1 py-2.5 rounded-xl bg-tealAccent/10 text-tealAccent text-xs font-bold hover:bg-tealAccent/20 transition-all">
              APPROVE / موافقة
            </button>
            <button onClick=${function(){ props.onReject(u.id); }}
              className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 transition-all">
              REJECT / رفض
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
    var verCol = r.verification_status==='verified' ? 'var(--teal-accent)' : 'var(--pending)';
    var verBg = r.verification_status==='verified' ? 'rgba(13,148,136,0.1)' : 'rgba(196,150,12,0.1)';
    var verLabel = r.verification_status==='verified' ? 'Verified' : 'Pending';
    var verLabelAr = r.verification_status==='verified' ? 'موثق' : 'قيد المراجعة';
    var catIcon = RESOURCE_ICONS[r.category] || 'fa-building';
    var waLink = whatsappLink(r.whatsapp);
    var callLink = telLink(r.phone);

    return html`
      <div className="bg-white rounded-premium shadow-premium border border-slate-50 p-5 fade-up transition-all hover:border-tealAccent/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 shadow-inner">
            <i className=${'fa-solid ' + catIcon + ' text-navy text-xl'}></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <h3 className="font-bold text-navy text-base leading-tight">${r.name}</h3>
                <span className="text-[10px] font-kufi text-slate-400 mt-0.5">${RESOURCE_LABELS[r.category]} / ${ARABIC_LABELS[r.category]}</span>
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style=${{color:verCol, backgroundColor:verBg}}>
                  ${verLabel}
                </span>
                <span className="text-[9px] font-kufi mt-0.5" style=${{color:verCol}}>${verLabelAr}</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-600 mt-4 leading-relaxed">${r.description}</p>
        
        <div className="flex gap-2 mt-5 pt-4 border-t border-slate-50">
          ${waLink ? html`
            <a href=${waLink} target="_blank" rel="noopener noreferrer"
              className="flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all active:scale-95"
              style=${{backgroundColor:'#25D36615', color:'#25D366'}}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">WhatsApp</span>
              <span className="text-[9px] font-kufi opacity-80">واتساب</span>
            </a>
          ` : null}
          ${callLink ? html`
            <a href=${callLink}
              className="flex-1 flex flex-col items-center justify-center py-2 rounded-xl bg-navy text-white transition-all active:scale-95"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">Call</span>
              <span className="text-[9px] font-kufi opacity-80">اتصال</span>
            </a>
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

    async function handleRegister(e) {
      e.preventDefault();
      try {
        await apiFetch('/volunteers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 'user-' + Date.now(),
            name: props.user.name,
            skill_tags: skills
          })
        });
        setIsRegistered(true);
        showToast('Successfully registered as Volunteer', 'success');
      } catch (err) {
        showToast('Failed to register volunteer', 'error');
      }
    }

    async function handleClaim(id) {
      const cleanId = id.toString().replace('req-', '');
      try {
        await apiFetch(`/requests/${cleanId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Dispatched' })
        });
        setTasks(function(prev){ return prev.filter(function(t){ return t.id !== id; }); });
        showToast('Task claimed! Thank you.', 'success');
      } catch (err) {
        showToast('Failed to claim task', 'error');
      }
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
    
    return html`
      <div className="px-4 pb-6 space-y-6">
        <!-- Greeting -->
        <div className="fade-up pt-4">
          <h1 className="text-3xl font-bold text-navy leading-tight">Welcome back, Civilian</h1>
          <p className="text-sm font-kufi text-slate-400 mt-1 opacity-80 font-medium">مرحباً بك مجدداً</p>
        </div>

        <!-- Stats -->
        <div className="grid grid-cols-3 gap-3 fade-up">
          <div className="bg-white rounded-premium shadow-premium p-3 text-center border border-slate-50 transition-transform active:scale-95">
            <div className="text-2xl font-bold text-tealAccent">${verifiedCount}</div>
            <div className="flex flex-col mt-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-tight">Verified<br/>Resources</span>
              <span className="text-[9px] font-kufi text-slate-400 mt-0.5">الموارد الموثقة</span>
            </div>
          </div>
          <div className="bg-white rounded-premium shadow-premium p-3 text-center border border-slate-50 transition-transform active:scale-95">
            <div className="text-2xl font-bold text-actionOrange">${alertCount}</div>
            <div className="flex flex-col mt-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-tight">Active<br/>Alerts</span>
              <span className="text-[9px] font-kufi text-slate-400 mt-0.5">تنبيهات نشطة</span>
            </div>
          </div>
          <div className="bg-white rounded-premium shadow-premium p-3 text-center border border-slate-50 transition-transform active:scale-95">
            <div className="text-2xl font-bold text-amber-500">${pendingCount}</div>
            <div className="flex flex-col mt-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-tight">Pending<br/>Reviews</span>
              <span className="text-[9px] font-kufi text-slate-400 mt-0.5">مراجعات معلقة</span>
            </div>
          </div>
        </div>

        <!-- Quick actions -->
        <div className="fade-up flex flex-col gap-3">
          <div className="flex gap-3">
            <button onClick=${props.onRequestHelp}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-5 rounded-premium text-white transition-all active:scale-95 shadow-lg shadow-actionOrange/20"
              style=${{background: 'linear-gradient(135deg, #C2410C, #9A3412)'}}
            >
              <span className="text-xs font-bold uppercase tracking-wider">REQUEST HELP</span>
              <span className="text-[11px] font-kufi opacity-90">طلب المساعدة</span>
            </button>
            <button onClick=${props.onSuggest}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-5 rounded-premium text-white transition-all active:scale-95 shadow-lg shadow-navy/20"
              style=${{background: 'linear-gradient(135deg, #1A365D, #102A43)'}}
            >
              <span className="text-xs font-bold uppercase tracking-wider">REPORT UPDATE</span>
              <span className="text-[11px] font-kufi opacity-90">إبلاغ عن تحديث</span>
            </button>
          </div>
          <button onClick=${function(){ props.setTab('resources'); }}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-premium bg-white border border-slate-100 text-slate-700 shadow-premium transition-all active:scale-[0.98]"
          >
            <i className="fa-solid fa-magnifying-glass text-tealAccent"></i>
            <div className="flex flex-col items-start">
              <span className="text-xs font-bold uppercase tracking-wider">Find Help</span>
              <span className="text-[10px] font-kufi text-slate-400 leading-none">البحث عن مساعدة</span>
            </div>
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
  // TRUST SCORE — utility + meter component
  // =========================================================
  const TRUST_THRESHOLD = 65;

  function calculateTrustScore(org) {
    return Math.min(100, Math.round(
      (org.docs_submitted      ? 25 : 0) +
      (org.un_ocha_registered  ? 20 : 0) +
      (org.has_field_contact   ? 20 : 0) +
      Math.min(10, org.community_reports  || 0) +
      Math.min(15, (org.campaigns_fulfilled || 0) * 2) +
      Math.min(10, Math.round((org.days_active || 0) * 0.1))
    ));
  }

  function TrustScoreMeter({ org }) {
    const score = calculateTrustScore(org);
    const isVerified = org.verification_status === 'verified';
    const checkpoints = [
      { label:'Documents Submitted',    done: org.docs_submitted,                    pts: 25 },
      { label:'UN/OCHA Registered',     done: org.un_ocha_registered,               pts: 20 },
      { label:'Field Contact Verified', done: org.has_field_contact,                 pts: 20 },
      { label:'5+ Community Reports',   done: (org.community_reports||0) >= 5,       pts: 10 },
      { label:'3+ Campaigns Fulfilled', done: (org.campaigns_fulfilled||0) >= 3,     pts: 15 },
      { label:'30+ Days Active',        done: (org.days_active||0) >= 30,            pts: 10 },
    ];
    return html`
      <div className="bg-white rounded-2xl border border-cream-darker p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-bark">Trust Score</h3>
            <p className="text-[11px] text-bark-lighter mt-0.5">Verification requires ${TRUST_THRESHOLD}+ points</p>
          </div>
          ${isVerified
            ? html`<span className="text-xs font-bold text-verified bg-verified/10 px-2.5 py-1 rounded-full flex items-center gap-1.5"><i className="fa-solid fa-circle-check"></i>Verified</span>`
            : html`<span className="text-2xl font-black text-bark">${score}<span className="text-sm font-normal text-bark-lighter">/100</span></span>`
          }
        </div>
        <div className="relative w-full h-2 bg-cream-dark rounded-full mb-5 mt-4">
          <div className="h-full rounded-full transition-all duration-700"
            style=${{ width: score+'%', background: score >= TRUST_THRESHOLD ? 'var(--verified)' : 'linear-gradient(90deg,var(--terracotta),#E8963A)' }}>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-bark/30 rounded"
            style=${{ left: TRUST_THRESHOLD+'%' }}>
          </div>
          <span className="absolute -top-5 text-[10px] font-bold text-bark-lighter"
            style=${{ left: TRUST_THRESHOLD+'%', transform:'translateX(-50%)' }}>
            ${TRUST_THRESHOLD} min
          </span>
        </div>
        <div className="space-y-2.5">
          ${checkpoints.map(function(cp) {
            return html`
              <div key=${cp.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className=${'fa-solid text-sm ' + (cp.done ? 'fa-circle-check text-verified' : 'fa-circle text-cream-darker')}></i>
                  <span className=${'text-xs ' + (cp.done ? 'text-bark font-medium' : 'text-bark-lighter')}>${cp.label}</span>
                </div>
                <span className="text-[11px] font-bold text-bark-lighter">+${cp.pts} pts</span>
              </div>
            `;
          })}
        </div>
        ${!isVerified && score >= TRUST_THRESHOLD ? html`
          <div className="mt-4 p-3 bg-verified/10 rounded-xl text-xs text-verified font-semibold flex items-center gap-2">
            <i className="fa-solid fa-star"></i> Score qualifies — admin review pending
          </div>
        ` : null}
      </div>
    `;
  }

  // =========================================================
  // CAMPAIGN CARD COMPONENT
  // =========================================================
  const URGENCY_COLORS = { Low:'#2D7A3A', Medium:'#C4960C', High:'#CC5500', Critical:'#B83B2E' };

  function CampaignCard({ campaign, showActions, onFulfill }) {
    const col = URGENCY_COLORS[campaign.urgency_level] || '#6B5344';
    const pct = campaign.quantity_needed
      ? Math.min(100, Math.round((campaign.quantity_fulfilled / campaign.quantity_needed) * 100))
      : 0;
    const isFulfilled = campaign.status === 'fulfilled';
    return html`
      <div className=${'bg-white rounded-xl border border-cream-darker p-4 fade-up ' + (isFulfilled ? 'opacity-60' : '')}>
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white flex-shrink-0"
                style=${{ backgroundColor: col }}>${campaign.urgency_level}</span>
              <span className="text-[10px] font-semibold text-bark-lighter uppercase">${campaign.category}</span>
            </div>
            <h3 className="font-semibold text-bark text-sm leading-snug">${campaign.title}</h3>
          </div>
          ${isFulfilled
            ? html`<span className="text-[10px] font-bold text-verified bg-verified/10 px-2 py-0.5 rounded-full flex-shrink-0"><i className="fa-solid fa-check mr-1"></i>Done</span>`
            : campaign.is_verified
              ? html`<span className="text-[10px] font-bold text-verified bg-verified/10 px-2 py-0.5 rounded-full flex-shrink-0"><i className="fa-solid fa-circle-dot mr-1"></i>Live</span>`
              : html`<span className="text-[10px] font-bold text-pending bg-pending/10 px-2 py-0.5 rounded-full flex-shrink-0"><i className="fa-solid fa-clock mr-1"></i>Pending</span>`
          }
        </div>
        <p className="text-xs text-bark-light leading-relaxed mb-2">${campaign.description}</p>
        ${campaign.location_label ? html`
          <p className="text-xs text-bark-lighter mb-2">
            <i className="fa-solid fa-location-dot text-terracotta/50 mr-1"></i>${campaign.location_label}
          </p>
        ` : null}
        ${campaign.quantity_needed ? html`
          <div className="mb-3">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-bark-lighter">Progress</span>
              <span className="font-bold text-bark">${campaign.quantity_fulfilled}/${campaign.quantity_needed} ${campaign.quantity_unit}</span>
            </div>
            <div className="w-full h-1.5 bg-cream-dark rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style=${{ width: pct+'%', backgroundColor: isFulfilled ? 'var(--verified)' : col }}></div>
            </div>
          </div>
        ` : null}
        <div className="flex items-center justify-between text-[11px] text-bark-lighter pt-2 border-t border-cream-dark">
          <span>${timeAgo(campaign.created_at)}</span>
          ${showActions && !isFulfilled ? html`
            <button onClick=${function() { onFulfill(campaign.id); }}
              className="font-semibold text-verified flex items-center gap-1 hover:underline">
              <i className="fa-solid fa-circle-check"></i> Mark Fulfilled
            </button>
          ` : null}
        </div>
      </div>
    `;
  }

  // =========================================================
  // LEAFLET LOCATION PICKER (reuses existing Leaflet CDN)
  // =========================================================
  function LeafletLocationPicker({ value, onChange }) {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    useEffect(function() {
      if (!containerRef.current || mapRef.current) return;
      var map = L.map(containerRef.current, { center:[37.066,37.383], zoom:13 });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(map);
      map.on('click', function(e) {
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = L.marker([e.latlng.lat, e.latlng.lng], {
          icon: L.divIcon({
            className: '',
            html: '<div style="width:22px;height:22px;background:var(--terracotta);border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>',
            iconSize:[22,22], iconAnchor:[11,11]
          })
        }).addTo(map);
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      mapRef.current = map;
      setTimeout(function(){ map.invalidateSize(); }, 150);
      return function() { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
    }, []);
    return html`
      <div>
        <p className="text-xs text-bark-lighter mb-2 flex items-center gap-1.5">
          <i className="fa-solid fa-hand-pointer text-terracotta"></i>
          Tap the map to pin the exact location of this need
        </p>
        <div ref=${containerRef}
          style=${{ height:'210px', borderRadius:'12px', overflow:'hidden', border:'2px solid var(--cream-darker)' }} />
        ${value
          ? html`<p className="text-xs text-verified font-semibold mt-2 flex items-center gap-1.5"><i className="fa-solid fa-circle-check"></i>Pinned: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}</p>`
          : html`<p className="text-xs text-bark-lighter mt-2">No location pinned yet</p>`
        }
      </div>
    `;
  }

  // =========================================================
  // POST LIVE NEED MODAL — 5-step NGO campaign form
  // =========================================================
  const LIVE_CATEGORIES = ['Food','Health','Shelter','Safety','WASH','Education','Protection'];
  const LIVE_CAT_ICONS = { Food:'fa-wheat-awn', Health:'fa-heart-pulse', Shelter:'fa-tent',
    Safety:'fa-triangle-exclamation', WASH:'fa-droplet', Education:'fa-book-open', Protection:'fa-shield-halved' };

  function PostLiveNeedModal({ org, onClose, onSubmit }) {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
      title:'', description:'', category:'Food', quantity_needed:'', quantity_unit:'units',
      urgency_level:'Medium', location_coords:null, location_label:'', is_location_masked:false, volunteer_slots:0,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    function patch(k, v) { setForm(function(f){ return Object.assign({}, f, {[k]:v}); }); }

    const stepTitles = ['Need Type','Details','Location','Urgency','Review & Post'];
    const stepValid = {
      1: !!form.category,
      2: form.title.trim().length >= 5 && form.description.trim().length >= 10,
      3: !!form.location_coords,
      4: !!form.urgency_level,
      5: true,
    };

    async function handleSubmit(e) {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        const payload = Object.assign({}, form, {
          org_id: org.id,
          quantity_needed: parseInt(form.quantity_needed) || null,
          volunteer_slots: parseInt(form.volunteer_slots) || 0
        });
        const res = await apiFetch('/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        onSubmit(Object.assign({}, payload, {
          id: 'c-' + res.id,
          status: 'active',
          is_verified: true,
          quantity_fulfilled: 0,
          created_at: new Date().toISOString()
        }));
        setIsSubmitting(false);
        showToast('Live Need posted successfully!', 'success');
        onClose();
      } catch (err) {
        setIsSubmitting(false);
        showToast('Failed to post live need', 'error');
      }
    }

    return html`
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick=${onClose}></div>
        <div className="slide-up relative bg-cream rounded-t-3xl sm:rounded-3xl w-full bottom-safe overflow-y-auto" style=${{ maxWidth:'520px', maxHeight:'92vh' }}>

          <!-- Header + step dots -->
          <div className="sticky top-0 bg-cream/95 backdrop-blur-md pt-5 pb-3 px-6 border-b border-cream-darker z-10">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-base font-bold text-bark">Post a Live Need</h2>
                <p className="text-xs text-bark-lighter">Step ${step}/5 — ${stepTitles[step-1]}</p>
              </div>
              <button type="button" onClick=${onClose}
                className="w-8 h-8 rounded-full bg-cream-dark flex items-center justify-center text-bark-light" aria-label="Close">
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>
            <div className="flex gap-1">
              ${[1,2,3,4,5].map(function(s) {
                return html`<div key=${s} className=${'flex-1 h-1 rounded-full transition-all ' + (s < step ? 'bg-verified' : s === step ? 'bg-terracotta' : 'bg-cream-dark')}></div>`;
              })}
            </div>
          </div>

          <form onSubmit=${handleSubmit} className="p-6">

            <!-- Step 1: Category -->
            ${step === 1 ? html`
              <div className="fade-in space-y-3">
                <p className="text-sm font-semibold text-bark mb-3">What type of need are you posting?</p>
                <div className="grid grid-cols-2 gap-2">
                  ${LIVE_CATEGORIES.map(function(cat) {
                    const active = form.category === cat;
                    const col = CATEGORY_COLORS[cat] || '#6B5344';
                    return html`
                      <button key=${cat} type="button" onClick=${function(){ patch('category', cat); }}
                        className=${'p-3 rounded-xl border-2 flex items-center gap-2.5 transition-all ' + (active ? 'border-terracotta bg-terracotta/5' : 'border-cream-darker bg-white')}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style=${{ backgroundColor: active ? col : 'var(--cream-dark)' }}>
                          <i className=${'fa-solid ' + (LIVE_CAT_ICONS[cat]||'fa-circle') + ' text-sm'} style=${{ color: active ? 'white' : col }}></i>
                        </div>
                        <span className=${'text-xs font-semibold ' + (active ? 'text-bark' : 'text-bark-light')}>${cat}</span>
                      </button>
                    `;
                  })}
                </div>
              </div>
            ` : null}

            <!-- Step 2: Details -->
            ${step === 2 ? html`
              <div className="fade-in space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-bark mb-1.5">Need Title <span className="text-unverified">*</span></label>
                  <input type="text" value=${form.title} maxlength="150" required
                    onInput=${function(e){ patch('title', e.target.value); }}
                    className="w-full rounded-xl border border-cream-darker bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                    placeholder="e.g. 200 Blankets Needed for District 3 Families" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-bark mb-1.5">Description <span className="text-unverified">*</span></label>
                  <textarea value=${form.description} rows="3"
                    onInput=${function(e){ patch('description', e.target.value); }}
                    className="w-full rounded-xl border border-cream-darker bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 resize-none"
                    placeholder="Who needs it, how urgent, what impact donations will have..."></textarea>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-bark mb-1.5">Quantity Needed</label>
                    <input type="number" min="1" value=${form.quantity_needed}
                      onInput=${function(e){ patch('quantity_needed', e.target.value); }}
                      className="w-full rounded-xl border border-cream-darker bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                      placeholder="200" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-bark mb-1.5">Unit</label>
                    <select value=${form.quantity_unit} onChange=${function(e){ patch('quantity_unit', e.target.value); }}
                      className="w-full rounded-xl border border-cream-darker bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30">
                      ${['units','kg','pallets','meals','kits','families','liters','vehicles'].map(function(u) {
                        return html`<option key=${u} value=${u}>${u}</option>`;
                      })}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-bark mb-1.5">Volunteer Slots (0 = none)</label>
                  <input type="number" min="0" value=${form.volunteer_slots}
                    onInput=${function(e){ patch('volunteer_slots', e.target.value); }}
                    className="w-full rounded-xl border border-cream-darker bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                    placeholder="0" />
                </div>
              </div>
            ` : null}

            <!-- Step 3: Location picker -->
            ${step === 3 ? html`
              <div className="fade-in space-y-3">
                <${LeafletLocationPicker} value=${form.location_coords} onChange=${function(c){ patch('location_coords', c); }} />
                <div>
                  <label className="block text-xs font-semibold text-bark mb-1.5">Location Label (optional)</label>
                  <input type="text" value=${form.location_label}
                    onInput=${function(e){ patch('location_label', e.target.value); }}
                    className="w-full rounded-xl border border-cream-darker bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                    placeholder="e.g. District 3, near the old school" />
                </div>
              </div>
            ` : null}

            <!-- Step 4: Urgency + Privacy -->
            ${step === 4 ? html`
              <div className="fade-in space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-bark mb-2">Urgency Level</label>
                  <div className="grid grid-cols-2 gap-2">
                    ${['Low','Medium','High','Critical'].map(function(level) {
                      const active = form.urgency_level === level;
                      const col = URGENCY_COLORS[level];
                      return html`
                        <button key=${level} type="button" onClick=${function(){ patch('urgency_level', level); }}
                          className=${'py-3 rounded-xl border-2 text-xs font-bold uppercase tracking-wide transition-all ' + (active ? 'text-white' : 'bg-white border-cream-darker text-bark-lighter')}
                          style=${active ? { backgroundColor: col, borderColor: col } : {}}>
                          ${level}
                        </button>
                      `;
                    })}
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-cream-darker">
                  <input type="checkbox" id="loc-mask" checked=${form.is_location_masked}
                    onChange=${function(e){ patch('is_location_masked', e.target.checked); }}
                    className="mt-0.5 accent-terracotta" />
                  <label htmlFor="loc-mask" className="cursor-pointer">
                    <span className="text-sm font-semibold text-bark block">Mask Exact Location</span>
                    <span className="text-xs text-bark-lighter">Shows general area only — recommended for sensitive or women's shelter needs</span>
                  </label>
                </div>
              </div>
            ` : null}

            <!-- Step 5: Review & Submit -->
            ${step === 5 ? html`
              <div className="fade-in space-y-4">
                <div className="bg-white rounded-xl border border-cream-darker p-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-bark-lighter font-medium">Category</span>
                    <span className="font-semibold text-bark">${form.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-bark-lighter font-medium">Urgency</span>
                    <span className="font-bold" style=${{ color: URGENCY_COLORS[form.urgency_level] }}>${form.urgency_level}</span>
                  </div>
                  <div>
                    <span className="text-bark-lighter font-medium block mb-1">Title</span>
                    <span className="font-semibold text-bark text-sm">${form.title}</span>
                  </div>
                  <div>
                    <span className="text-bark-lighter font-medium block mb-1">Description</span>
                    <p className="text-bark text-xs leading-relaxed">${form.description}</p>
                  </div>
                  ${form.location_label ? html`
                    <div className="flex justify-between">
                      <span className="text-bark-lighter font-medium">Location</span>
                      <span className="font-semibold text-bark text-xs">${form.location_label}</span>
                    </div>
                  ` : null}
                  ${form.quantity_needed ? html`
                    <div className="flex justify-between">
                      <span className="text-bark-lighter font-medium">Quantity</span>
                      <span className="font-semibold text-bark">${form.quantity_needed} ${form.quantity_unit}</span>
                    </div>
                  ` : null}
                </div>
                <div className="flex items-center gap-2 p-3 bg-terracotta/8 rounded-xl text-xs text-bark-light border border-terracotta/15">
                  <i className="fa-solid fa-circle-info text-terracotta"></i>
                  This need will be published live on the public map immediately.
                </div>
              </div>
            ` : null}

            <!-- Navigation buttons -->
            <div className=${'flex gap-2 mt-6 ' + (step === 1 ? 'justify-end' : '')}>
              ${step > 1 ? html`
                <button type="button" onClick=${function(){ setStep(step-1); }}
                  className="flex-1 py-3 rounded-xl bg-cream-dark text-bark font-semibold text-sm">
                  <i className="fa-solid fa-arrow-left mr-1.5"></i> Back
                </button>
              ` : null}
              ${step < 5 ? html`
                <button type="button" onClick=${function(){ setStep(step+1); }}
                  disabled=${!stepValid[step]}
                  className="flex-1 py-3 rounded-xl bg-bark text-white font-semibold text-sm disabled:opacity-40">
                  Next <i className="fa-solid fa-arrow-right ml-1.5"></i>
                </button>
              ` : html`
                <button type="submit" disabled=${isSubmitting}
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style=${{ background:'linear-gradient(135deg,var(--terracotta),#E8963A)' }}>
                  ${isSubmitting ? html`<i className="fa-solid fa-spinner fa-spin"></i>` : html`<i className="fa-solid fa-bullhorn"></i>`}
                  ${isSubmitting ? 'Posting...' : 'Post Live Need'}
                </button>
              `}
            </div>

          </form>
        </div>
      </div>
    `;
  }

  // =========================================================
  // NGO DASHBOARD VIEW
  // =========================================================
  function NGODashboardView({ org, campaigns, onPostNeed, onFulfill }) {
    const score = calculateTrustScore(org);
    const isVerified = org.verification_status === 'verified';
    const active = campaigns.filter(function(c){ return c.status === 'active'; });
    const fulfilled = campaigns.filter(function(c){ return c.status === 'fulfilled'; });
    const totalReached = campaigns.reduce(function(acc, c){ return acc + (c.quantity_fulfilled||0); }, 0);

    return html`
      <div className="px-4 pb-6 space-y-5 fade-in">

        <!-- Org profile card -->
        <div className="bg-white rounded-2xl border border-cream-darker p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-white text-2xl font-bold shadow-sm"
              style=${{ background:'linear-gradient(135deg,var(--terracotta),#E8963A)' }}>
              ${org.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-bark leading-tight">${org.name}</h1>
                ${isVerified ? html`
                  <span className="text-[10px] font-bold text-verified bg-verified/10 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                    <i className="fa-solid fa-circle-check"></i> Verified NGO
                  </span>
                ` : html`
                  <span className="text-[10px] font-bold text-pending bg-pending/10 px-2 py-0.5 rounded-full flex-shrink-0">
                    <i className="fa-solid fa-clock mr-1"></i>Pending Verification
                  </span>
                `}
              </div>
              <p className="text-xs text-bark-lighter mt-1">${org.address}</p>
            </div>
          </div>
          <p className="text-sm text-bark-light leading-relaxed mt-3">${org.description}</p>

          <!-- Impact stats row -->
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-cream-dark">
            <div className="text-center">
              <div className="text-xl font-black text-terracotta">${active.length}</div>
              <div className="text-[10px] text-bark-lighter uppercase tracking-wide font-semibold mt-0.5">Live Needs</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-verified">${fulfilled.length}</div>
              <div className="text-[10px] text-bark-lighter uppercase tracking-wide font-semibold mt-0.5">Fulfilled</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-bark">${totalReached}</div>
              <div className="text-[10px] text-bark-lighter uppercase tracking-wide font-semibold mt-0.5">Units Delivered</div>
            </div>
          </div>
        </div>

        <!-- Trust Score Meter -->
        <${TrustScoreMeter} org=${org} />

        <!-- Post Live Need CTA -->
        ${isVerified ? html`
          <button onClick=${onPostNeed}
            className="w-full py-4 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-transform border border-white/20"
            style=${{ background:'linear-gradient(135deg,#C41E3A,var(--terracotta))' }}>
            <i className="fa-solid fa-bullhorn text-lg"></i>
            Post a Live Need
          </button>
        ` : html`
          <div className="w-full py-4 rounded-2xl bg-cream-dark text-bark-lighter text-sm flex items-center justify-center gap-2 border border-cream-darker">
            <i className="fa-solid fa-lock"></i>
            Posting requires verified status
          </div>
        `}

        <!-- Campaigns list -->
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-bark">Your Campaigns</h2>
            <span className="text-xs font-bold text-terracotta bg-terracotta/10 px-2 py-1 rounded-lg">${active.length} Active</span>
          </div>
          <div className="space-y-3">
            ${campaigns.length === 0 ? html`
              <div className="text-center py-10">
                <i className="fa-solid fa-clipboard-list text-3xl text-cream-darker mb-3"></i>
                <p className="text-sm text-bark-lighter">No campaigns yet — post your first Live Need above</p>
              </div>
            ` : campaigns.map(function(c) {
              return html`
                <${CampaignCard} key=${c.id} campaign=${c} showActions=${true} onFulfill=${onFulfill} />
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

    var updatesRef = React.useState([]);
    var updates = updatesRef[0], setUpdates = updatesRef[1];

    var showSOSRef = useState(false);
    var showSOS = showSOSRef[0], setShowSOS = showSOSRef[1];

    var showSuggestRef = useState(false);
    var showSuggest = showSuggestRef[0], setShowSuggest = showSuggestRef[1];

    var showRequestHelpRef = useState(false);
    var showRequestHelp = showRequestHelpRef[0], setShowRequestHelp = showRequestHelpRef[1];

    var showDonationRef = useState(false);
    var showDonation = showDonationRef[0], setShowDonation = showDonationRef[1];

    var orgRef = React.useState(null);
    var org = orgRef[0], setOrg = orgRef[1];
    var orgCampaignsRef = React.useState([]);
    var orgCampaigns = orgCampaignsRef[0], setOrgCampaigns = orgCampaignsRef[1];

    // ── Fetch NGO Data ─────────────────────────────────────
    React.useEffect(() => {
      if (user.role === 'verified_org') {
        async function fetchOrgData() {
          try {
            // For demo, we assume "Hope Beyond Borders" has ID 2
            const orgData = await apiFetch('/organizations/2');
            setOrg(orgData);
            
            // Fetch real campaigns from the backend
            const camps = await apiFetch('/campaigns');
            setOrgCampaigns(camps.map(c => ({
              id: 'c-' + c.id,
              title: c.title,
              category: c.category,
              urgency_level: c.urgency_level,
              status: c.status.toLowerCase(),
              description: c.description,
              location_label: c.location_label,
              location_coords: c.location_coords || { lat: 37.066, lng: 37.383 },
              quantity_needed: c.quantity_needed,
              quantity_unit: c.quantity_unit,
              quantity_fulfilled: c.quantity_fulfilled,
              volunteer_slots: c.volunteer_slots,
              created_at: c.created_at
            })));
          } catch (err) {
            console.error('Failed to fetch org data', err);
          }
        }
        fetchOrgData();
      }
    }, [user.role]);

    function handleRoleChange(role) {
      var names = { user:'Civilian', verified_org:'Verified NGO', admin:'Admin' };
      setUser({ name: names[role] || 'User', role: role });
      showToast('Switched to ' + (role==='user'?'Civilian':role==='verified_org'?'Verified NGO':'Admin') + ' view', 'info');
    }

    function handleSuggest(newUpdate) {
      setUpdates(function(prev) { return [newUpdate].concat(prev); });
    }

    async function handleVerify(id) {
      const cleanId = id.toString().replace('req-', '');
      try {
        await apiFetch(`/requests/${cleanId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Verified' })
        });
        setUpdates(function(prev) {
          return prev.map(function(u) { return u.id===id ? Object.assign({},u,{is_verified:true,verified_by:user.name}) : u; });
        });
        showToast('Update approved and published', 'success');
      } catch (err) {
        showToast('Failed to verify update', 'error');
      }
    }

    async function handleReject(id) {
      const cleanId = id.toString().replace('req-', '');
      try {
        await apiFetch(`/requests/${cleanId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Rejected' })
        });
        setUpdates(function(prev) { return prev.filter(function(u) { return u.id!==id; }); });
        showToast('Update rejected', 'error');
      } catch (err) {
        showToast('Failed to reject update', 'error');
      }
    }

    // Cache emergency numbers to localStorage for offline use
    useEffect(function() {
      try { localStorage.setItem('mdaad_emergency', JSON.stringify(EMERGENCY_NUMBERS)); } catch(e) {}
    }, []);

    var tabs = [
      { key:'home', label:'Home', arabic:'الرئيسية', icon:'fa-house' },
      { key:'map', label:'Map', arabic:'الخريطة', icon:'fa-map-location-dot' },
      { key:'volunteer', label:'Volunteer', arabic:'تطوع', icon:'fa-hands-holding-child' },
      { key:'resources', label:'Resources', arabic:'الموارد', icon:'fa-building' },
    ];
    if (user.role === 'verified_org') {
      tabs.push({ key:'ngo', label:'NGO Hub', arabic:'مركز المنظمات', icon:'fa-hand-holding-heart' });
    }
    if (user.role === 'admin') {
      tabs.push({ key:'analytics', label:'Analytics', arabic:'التحليلات', icon:'fa-chart-pie' });
    }

    var pendingCount = updates.filter(function(u){ return !u.is_verified; }).length;

    return html`
      <div className="min-h-screen flex flex-col bg-grid" style=${{maxWidth:'100%',margin:'0 auto'}}>
        <!-- Header -->
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-navy shadow-lg shadow-navy/20">
                <span className="font-serif text-white text-xl leading-none">M</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm font-bold text-navy leading-tight tracking-tight uppercase">Mdaad Now</h1>
                <span className="text-[10px] font-kufi text-slate-400 font-medium">نظام مدد للتنسيق الإنساني</span>
              </div>
            </div>
            <${RoleSwitcher} role=${user.role} onChange=${handleRoleChange} />
          </div>
        </header>

        <!-- Tab content -->
        <main className="flex-1 overflow-y-auto tab-content" style=${{paddingTop:'16px'}}>
          ${tab==='home' && html`<${HomeView} user=${user} updates=${updates} resources=${resources} onSuggest=${function(){ setShowSuggest(true); }} onRequestHelp=${function(){ setShowRequestHelp(true); }} onDonate=${function(){ setShowDonation(true); }} setTab=${setTab} />`}
          ${tab==='map' && html`<${MapView} updates=${updates} user=${user} />`}
          ${tab==='volunteer' && html`<${VolunteerView} updates=${updates} user=${user} />`}
          ${tab==='resources' && html`<${ResourcesView} resources=${resources} user=${user} />`}
          ${tab==='briefs' && html`<${BriefsView} user=${user} updates=${updates} onVerify=${handleVerify} onReject=${handleReject} onSuggest=${function(){ setShowSuggest(true); }} />`}
          ${tab==='ngo' && (org ? html`<${NGODashboardView}
            org=${org}
            campaigns=${orgCampaigns}
            onPostNeed=${function(){ setShowPostNeed(true); }}
            onFulfill=${function(id){
              setOrgCampaigns(function(prev){
                return prev.map(function(c){ return c.id===id ? Object.assign({},c,{status:'fulfilled'}) : c; });
              });
              showToast('Campaign marked as fulfilled!', 'success');
            }}
          />` : html`<div className="flex items-center justify-center h-64 text-bark-lighter"><i className="fa-solid fa-spinner fa-spin mr-2"></i>Loading NGO Profile...</div>`) }
          ${tab==='analytics' && html`<${AnalyticsView} user=${user} updates=${updates} />`}
        </main>

        <!-- Bottom navigation -->
        <nav className="sticky bottom-0 z-40 bg-white/90 backdrop-blur-lg border-t border-slate-100 bottom-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)]" aria-label="Main navigation">
          <div className="flex px-2">
            ${tabs.map(function(t) {
              var active = tab === t.key;
              var badge = t.key==='briefs' && pendingCount > 0 ? pendingCount : null;
              return html`
                <button key=${t.key} onClick=${function(){ setTab(t.key); }}
                  className=${'flex-1 flex flex-col items-center py-3 relative transition-all ' + (active ? 'text-navy' : 'text-slate-400')}
                  aria-label=${t.label}
                  aria-current=${active ? 'page' : undefined}
                >
                  <div className="relative">
                    <i className=${'fa-solid ' + t.icon + ' text-[19px] transition-transform ' + (active ? 'scale-110' : '')}></i>
                    ${badge ? html`
                      <span className="absolute -top-1 -right-2 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 border-2 border-white">${badge}</span>
                    ` : null}
                  </div>
                  <div className="flex flex-col items-center mt-1.5">
                    <span className=${'text-[9px] uppercase tracking-wider leading-none ' + (active ? 'font-bold' : 'font-medium')}>${t.label}</span>
                    <span className="text-[8px] font-kufi mt-0.5 opacity-70">${t.arabic}</span>
                  </div>
                  ${active ? html`<div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full bg-tealAccent"></div>` : null}
                </button>
              `;
            })}
          </div>
        </nav>

        <!-- SOS Floating Action Button -->
        <button
          onClick=${function(){ setShowSOS(true); }}
          className="sos-pulse fixed z-50 rounded-full flex flex-col items-center justify-center text-white active:scale-90 transition-all shadow-xl"
          style=${{
            width: '80px',
            height: '80px',
            bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
            right: '20px',
            background: 'radial-gradient(circle at center, #EF4444, #B91C1C)'
          }}
          aria-label="Emergency SOS contacts"
        >
          <span className="font-black text-2xl tracking-tighter leading-none">SOS</span>
          <span className="text-[10px] font-kufi font-bold mt-1 opacity-90">استغاثة</span>
        </button>

        <!-- Modals -->
        ${showSOS ? html`<${SOSPanel} onClose=${function(){ setShowSOS(false); }} />` : null}
        ${showSuggest ? html`<${SuggestModal} user=${user} onClose=${function(){ setShowSuggest(false); }} onSubmit=${handleSuggest} />` : null}
        ${showRequestHelp ? html`<${RequestHelpModal} onClose=${function(){ setShowRequestHelp(false); }} />` : null}
        ${showDonation ? html`<${DonationModal} onClose=${function(){ setShowDonation(false); }} />` : null}
        ${showPostNeed ? html`<${PostLiveNeedModal}
          org=${MOCK_NGO_ORG}
          onClose=${function(){ setShowPostNeed(false); }}
          onSubmit=${function(c){ setOrgCampaigns(function(prev){ return [c].concat(prev); }); }}
        />` : null}

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
