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
          var bg = t.type==='success' ? 'bg-tealAccent' : t.type==='error' ? 'bg-red-500' : 'bg-navy';
          var icon = t.type==='success' ? 'fa-circle-check' : t.type==='error' ? 'fa-circle-xmark' : 'fa-circle-info';
          return html`
            <div key=${t.id} className=${(t.removing?'toast-out':'toast-in') + ' pointer-events-auto flex items-center justify-between gap-3 ' + bg + ' text-white px-5 py-4 rounded-premium shadow-premium text-sm font-bold'}>
              <div className="flex items-center gap-3">
                <i className=${'fa-solid ' + icon}></i>
                <div className="flex flex-col">
                  <span>${t.message}</span>
                </div>
              </div>
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
        <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick=${props.onClose}></div>
        <div className="slide-up relative bg-white rounded-t-[32px] max-h-[85vh] overflow-y-auto bottom-safe shadow-2xl">
          <div className="sticky top-0 bg-white/80 backdrop-blur-md pt-6 pb-4 px-8 flex items-center justify-between z-10 border-b border-slate-50">
            <div>
              <h2 className="text-2xl font-bold text-navy">Emergency Contacts</h2>
              <p className="text-[11px] font-kufi text-slate-400 mt-1">جهات اتصال الطوارئ — تعمل بدون إنترنت</p>
            </div>
            <button onClick=${props.onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-navy transition-colors">
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
          <div className="p-6 space-y-3">
            ${EMERGENCY_NUMBERS.map(function(e) {
              return html`
                <a key=${e.number} href=${'tel:'+e.number} className="flex items-center gap-4 p-5 bg-white rounded-premium border border-slate-50 shadow-premium hover:border-red-100 transition-all active:scale-[0.98]">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <i className=${'fa-solid ' + e.icon + ' text-red-500 text-xl'}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-navy text-base leading-none">${e.name}</div>
                    <div className="text-slate-400 text-xs mt-1.5 font-medium tracking-tight">${e.number}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                    <i className="fa-solid fa-phone text-sm"></i>
                  </div>
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
    const arabicStatuses = ['قيد الانتظار', 'تم الإرسال', 'تم الإنجاز'];
    const currentIndex = statuses.indexOf(props.status) !== -1 ? statuses.indexOf(props.status) : 0;
    
    return html`
      <div className="w-full mt-6 bg-slate-50 p-6 rounded-premium border border-slate-100">
        <div className="flex justify-between items-end mb-6">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-navy uppercase tracking-wider">Request Status</span>
            <span className="text-[10px] font-kufi text-slate-400">حالة الطلب</span>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-sm font-black text-tealAccent uppercase">${props.status}</span>
            <span className="text-[10px] font-kufi text-tealAccent/70">${arabicStatuses[currentIndex]}</span>
          </div>
        </div>
        <div className="flex items-center w-full relative px-2">
          <div className="absolute left-0 right-0 top-[11px] h-1.5 bg-slate-200 rounded-full mx-6"></div>
          <div className="absolute left-0 top-[11px] h-1.5 bg-tealAccent rounded-full transition-all duration-700 ease-out mx-6" style=${{width: `calc(${(currentIndex / (statuses.length - 1)) * 100}% - 4px)`}}></div>
          
          ${statuses.map((s, i) => {
            const isActive = i <= currentIndex;
            return html`
              <div key=${s} className="relative z-10 flex flex-col items-center flex-1">
                <div className=${'w-6 h-6 rounded-full flex items-center justify-center border-[3px] transition-all duration-500 shadow-sm ' + (isActive ? 'bg-tealAccent border-white text-white' : 'bg-white border-slate-200 text-slate-300')}>
                  ${isActive ? html`<i className="fa-solid fa-check text-[10px]"></i>` : html`<div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>`}
                </div>
                <div className="flex flex-col items-center mt-3">
                  <span className=${'text-[9px] font-black uppercase tracking-tight ' + (isActive ? 'text-navy' : 'text-slate-400')}>${s}</span>
                  <span className=${'text-[8px] font-kufi mt-0.5 ' + (isActive ? 'text-navy/60' : 'text-slate-300')}>${arabicStatuses[i]}</span>
                </div>
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
          <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick=${props.onClose}></div>
          <div className="slide-up relative bg-white rounded-t-[32px] sm:rounded-premium w-full max-w-md p-8 bottom-safe shadow-2xl">
            <div className="text-center">
              <div className="w-20 h-20 bg-tealAccent/10 rounded-full flex items-center justify-center mx-auto mb-6 text-tealAccent text-3xl shadow-inner">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <h2 className="text-2xl font-bold text-navy mb-1">Help is on the way</h2>
              <p className="text-[11px] font-kufi text-slate-400">طلبك مسجل في النظام — المساعدة في طريقها إليك</p>
            </div>
            <${PizzaTracker} status=${submittedReq.status} />
            <button onClick=${props.onClose} className="w-full mt-8 py-4 rounded-premium bg-navy text-white font-bold text-sm shadow-lg shadow-navy/20 active:scale-[0.98] transition-all">
              DISMISS / إغلاق
            </button>
          </div>
        </div>
      `;
    }

    return html`
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick=${props.onClose}></div>
        <div className="slide-up relative bg-white rounded-t-[32px] sm:rounded-premium w-full max-w-md bottom-safe overflow-y-auto max-h-[90vh] shadow-2xl">
          <div className="sticky top-0 bg-white/80 backdrop-blur-md pt-6 pb-4 px-8 flex items-center justify-between border-b border-slate-50 z-10">
            <div>
              <h2 className="text-xl font-bold text-navy uppercase tracking-tight">Request Help</h2>
              <p className="text-[10px] font-kufi text-slate-400 mt-0.5">طلب المساعدة والموارد</p>
            </div>
            <button type="button" onClick=${props.onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-navy transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form onSubmit=${handleSubmit} className="p-8 space-y-6">
            ${step === 1 ? html`
              <div className="space-y-6 fade-in">
                <div>
                  <label className="flex justify-between items-end mb-3">
                    <span className="text-xs font-bold text-navy uppercase tracking-wider">What do you need?</span>
                    <span className="text-[9px] font-kufi text-slate-400">ما هي حاجتك؟</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    ${CATEGORIES.map(cat => html`
                      <button key=${cat} type="button" onClick=${() => setForm(Object.assign({},form,{category:cat}))} 
                        className=${'p-4 rounded-premium border-2 flex flex-col items-center gap-2 transition-all ' + (form.category===cat ? 'bg-tealAccent/5 border-tealAccent text-tealAccent shadow-sm' : 'bg-white border-slate-100 text-slate-400')}>
                        <i className=${'fa-solid ' + CATEGORY_ICONS[cat] + ' text-2xl'}></i>
                        <span className="text-[10px] font-bold uppercase tracking-widest">${cat}</span>
                        <span className="text-[9px] font-kufi opacity-70">${ARABIC_LABELS[cat]}</span>
                      </button>
                    `)}
                  </div>
                </div>
                <button type="button" onClick=${() => setStep(2)} className="w-full py-4 rounded-premium bg-navy text-white font-bold text-sm shadow-lg shadow-navy/20 active:scale-[0.98] transition-all">
                  CONTINUE / استمرار <i className="fa-solid fa-chevron-right ml-2 text-[10px]"></i>
                </button>
              </div>
            ` : null}
            ${step === 2 ? html`
              <div className="space-y-6 fade-in">
                <div>
                  <label className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-navy uppercase tracking-wider">Location / District</span>
                    <span className="text-[9px] font-kufi text-slate-400">المنطقة / الحي</span>
                  </label>
                  <input type="text" value=${form.district} onInput=${e => setForm(Object.assign({},form,{district:e.target.value}))} required
                    className="w-full rounded-premium border border-slate-100 bg-slate-50 px-5 py-4 text-sm font-medium text-navy focus:ring-2 focus:ring-tealAccent/20 focus:bg-white outline-none transition-all" placeholder="e.g. Sector 4, Downtown" />
                </div>
                <div>
                  <label className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-navy uppercase tracking-wider">Urgency</span>
                    <span className="text-[9px] font-kufi text-slate-400">درجة الاستعجال</span>
                  </label>
                  <div className="flex gap-2">
                    ${['Low','Medium','Critical'].map(level => html`
                      <button key=${level} type="button" onClick=${() => setForm(Object.assign({},form,{urgency:level}))}
                        className=${'flex-1 py-3 rounded-xl border-2 text-[10px] font-bold uppercase tracking-wider transition-all ' + (form.urgency===level ? (level==='Critical'?'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20':'bg-navy border-navy text-white shadow-lg shadow-navy/20') : 'bg-white border-slate-100 text-slate-400')}>
                        ${level}
                      </button>
                    `)}
                  </div>
                </div>
                <div>
                  <label className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-navy uppercase tracking-wider">Additional Details</span>
                    <span className="text-[9px] font-kufi text-slate-400">تفاصيل إضافية</span>
                  </label>
                  <textarea value=${form.description} onInput=${e => setForm(Object.assign({},form,{description:e.target.value}))} rows="3"
                    className="w-full rounded-premium border border-slate-100 bg-slate-50 px-5 py-4 text-sm font-medium text-navy focus:ring-2 focus:ring-tealAccent/20 focus:bg-white outline-none transition-all resize-none"></textarea>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick=${() => setStep(1)} className="w-1/3 py-4 rounded-premium bg-slate-50 text-slate-400 font-bold text-sm hover:text-navy transition-all">BACK</button>
                  <button type="submit" disabled=${isSubmitting || !form.district} className="w-2/3 py-4 rounded-premium bg-actionOrange text-white font-bold text-sm shadow-lg shadow-actionOrange/20 disabled:opacity-50 flex justify-center items-center active:scale-[0.98] transition-all">
                    ${isSubmitting ? html`<i className="fa-solid fa-spinner fa-spin mr-2"></i>` : null} SUBMIT / إرسال
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
        <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick=${props.onClose}></div>
        <div className="slide-up relative bg-white rounded-t-[32px] sm:rounded-premium w-full bottom-safe overflow-y-auto max-h-[90vh] shadow-2xl">
          <div className="sticky top-0 bg-white/80 backdrop-blur-md pt-6 pb-4 px-8 flex items-center justify-between border-b border-slate-50 z-10">
            <div>
              <h2 className="text-xl font-bold text-navy uppercase tracking-tight">Report Update</h2>
              <p className="text-[10px] font-kufi text-slate-400 mt-0.5">إبلاغ عن تحديث ميداني</p>
            </div>
            <button onClick=${props.onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-navy transition-colors" aria-label="Close">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form onSubmit=${handleSubmit} className="p-8 space-y-6">
            <div>
              <label className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-navy uppercase tracking-wider">What's happening?</span>
                <span className="text-[9px] font-kufi text-slate-400">ماذا يحدث الآن؟</span>
              </label>
              <textarea
                value=${form.description}
                onInput=${function(e){ setForm(Object.assign({},form,{description:e.target.value})); }}
                rows="3"
                className="w-full rounded-premium border border-slate-100 bg-slate-50 px-5 py-4 text-navy text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-navy/5 focus:bg-white transition-all resize-none font-medium"
                placeholder="e.g. Road blocked near District 5, aid distribution at 2pm..."
                required
              ></textarea>
            </div>
            <div>
              <label className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-navy uppercase tracking-wider">Category</span>
                <span className="text-[9px] font-kufi text-slate-400">التصنيف</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                ${CATEGORIES.map(function(cat) {
                  var active = form.category === cat;
                  var col = CATEGORY_COLORS[cat];
                  return html`
                    <button key=${cat} type="button"
                      onClick=${function(){ setForm(Object.assign({},form,{category:cat})); }}
                      className=${'px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border-2 transition-all ' + (active ? 'text-white shadow-lg' : 'bg-white text-slate-400 border-slate-100')}
                      style=${active ? {backgroundColor:col, borderColor:col, shadowColor: col + '40'} : {}}
                    >
                      <i className=${'fa-solid ' + CATEGORY_ICONS[cat] + ' mr-1.5'}></i> ${cat}
                    </button>
                  `;
                })}
              </div>
            </div>
            <div>
              <label className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-navy uppercase tracking-wider">Location (optional)</span>
                <span className="text-[9px] font-kufi text-slate-400">الموقع (اختياري)</span>
              </label>
              <input
                type="text"
                value=${form.location}
                onInput=${function(e){ setForm(Object.assign({},form,{location:e.target.value})); }}
                className="w-full rounded-premium border border-slate-100 bg-slate-50 px-5 py-4 text-navy text-sm font-medium focus:ring-2 focus:ring-navy/5 focus:bg-white transition-all"
                placeholder="e.g. District 3, near the mosque"
              />
            </div>
            <div className="flex items-center gap-3 p-4 bg-navy/5 rounded-premium text-[11px] text-navy font-medium border border-navy/5">
              <i className="fa-solid fa-circle-info text-navy/40 text-lg"></i>
              <div>
                <span>Your update will be reviewed by a verified coordinator.</span>
                <p className="font-kufi opacity-60">سيتم مراجعة تحديثك من قبل منسق معتمد.</p>
              </div>
            </div>
            <button type="submit" disabled=${isSubmitting || !form.description.trim()}
              className="w-full py-4 rounded-premium font-bold text-white text-sm transition-all shadow-lg shadow-navy/20 disabled:opacity-50 active:scale-[0.98]"
              style=${{backgroundColor:'var(--navy)'}}
            >
              ${isSubmitting ? html`<i className="fa-solid fa-spinner fa-spin mr-2"></i>SENDING...` : 'SUBMIT UPDATE / إرسال التحديث'}
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400">By ${u.reported_by}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span className="text-[11px] text-slate-400">${timeAgo(u.created_at)}</span>
            ${u.url && html`
              <>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <a href="${u.url}" target="_blank" rel="noopener noreferrer" className="text-[11px] text-tealAccent hover:underline font-bold">
                  View Source <i className="fa-solid fa-arrow-up-right-from-square text-[8px] ml-0.5"></i>
                </a>
              </>
            `}
          </div>
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
  // BRIEF CARD COMPONENT
  // =========================================================
  function BriefCard({ title, titleAr, items, color }) {
    return html`
      <div className="bg-white rounded-premium shadow-premium border-l-[4px] p-5 fade-up" style=${{ borderLeftColor: color }}>
        <div className="mb-4">
          <h3 className="text-sm font-bold text-navy uppercase tracking-wider">${title}</h3>
          <p className="text-[10px] font-kufi text-slate-400 mt-0.5">${titleAr}</p>
        </div>
        <div className="space-y-4">
          ${items.map(item => html`
            <div key=${item.en} className="group cursor-default hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors">
              <div className="flex gap-4">
                <div className="mt-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-slate-50 group-hover:bg-white shadow-sm">
                    <i className=${`fa-solid ${item.icon} text-[10px]`} style=${{ color: color }}></i>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[12px] font-bold text-navy leading-tight">${item.en}</div>
                  <div className="text-[11px] font-kufi text-slate-500 mt-1 leading-snug">${item.ar}</div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md flex items-center gap-1.5 transition-all group-hover:bg-navy/5 group-hover:text-navy cursor-pointer border border-transparent group-hover:border-navy/10">
                      ${item.source} <i className="fa-solid fa-arrow-up-right-from-square text-[6px]"></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          `)}
        </div>
      </div>
    `;
  }

  function BilingualBriefing() {
    const protectionRisks = [
      { 
        en: 'Civil Documentation & Identity Verification', 
        ar: 'الوثائق الثبوتية والتحقق من الهوية', 
        icon: 'fa-id-card', 
        source: 'UNHCR'
      },
      { 
        en: 'Residency Status & Legal Eligibility', 
        ar: 'وضع الإقامة والأهلية القانونية', 
        icon: 'fa-user-shield', 
        source: 'IOM'
      },
      { 
        en: 'Gender-Based Violence (GBV) Protection', 
        ar: 'الحماية من العنف القائم على النوع الاجتماعي', 
        icon: 'fa-shield-heart', 
        source: 'UNFPA'
      }
    ];

    const operationalGuidance = [
      { 
        en: 'Coordinate, Do Not Duplicate', 
        ar: 'التنسيق وعدم التكرار', 
        icon: 'fa-arrows-to-circle', 
        source: 'OCHA'
      },
      { 
        en: 'Defer to Local Actors', 
        ar: 'إعطاء الأولوية للجهات الفاعلة المحلية', 
        icon: 'fa-people-group', 
        source: 'Red Crescent'
      },
      { 
        en: 'Verify Before Sharing', 
        ar: 'التحقق قبل المشاركة', 
        icon: 'fa-check-double', 
        source: 'Mdaad Admin'
      }
    ];

    const legalContext = [
      { 
        en: 'Temporary Protection Visas', 
        ar: 'تأشيرات الحماية المؤقتة', 
        icon: 'fa-file-signature', 
        source: 'MOI'
      },
      { 
        en: 'Access to Legal Aid', 
        ar: 'الوصول إلى المساعدة القانونية', 
        icon: 'fa-scale-balanced', 
        source: 'BAR Association'
      }
    ];

    return html`
      <div className="space-y-6 fade-up fade-up-delay-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-navy uppercase tracking-tight">What Helpers Should Know</h2>
          <p className="text-[11px] font-kufi text-slate-400">ما يجب أن يعرفه المتطوعون والمنسقون</p>
        </div>

        <${BriefCard} 
          title="Protection Risks" 
          titleAr="مخاطر الحماية" 
          color="#C2410C" 
          items=${protectionRisks} 
        />

        <${BriefCard} 
          title="Operational Guidance" 
          titleAr="التوجيه العملياتي" 
          color="#0D9488" 
          items=${operationalGuidance} 
        />

        <${BriefCard} 
          title="Legal Context" 
          titleAr="السياق القانوني" 
          color="#0D9488" 
          items=${legalContext} 
        />
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
    var orgCount = props.hdxPresence ? props.hdxPresence.count : 0;
    var alertCount = props.externalAlertCount || 0;
    var fundingPercent = props.hdxFunding ? props.hdxFunding.percent : 0;
    
    var latestVerified = props.updates.filter(function(u){ return u.is_verified; }).slice(0,3);
    
    return html`
      <div className="px-4 pb-6 space-y-6">
        <!-- Greeting -->
        <div className="fade-up pt-4">
          <h1 className="text-3xl font-bold text-navy leading-tight">Welcome back</h1>
          <p className="text-sm font-kufi text-slate-400 mt-1 opacity-80 font-medium">مرحباً بك مجدداً</p>
        </div>

        <!-- Stats -->
        <div className="grid grid-cols-3 gap-3 fade-up">
          <div className="bg-[#F1F5F9] rounded-premium shadow-premium p-3 text-center border border-slate-100 transition-transform active:scale-95">
            <div className="text-2xl font-bold text-tealAccent">${orgCount}</div>
            <div className="flex flex-col mt-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-tight">Active<br/>Orgs</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">OCHA HDX / 3W</span>
            </div>
          </div>
          <div className="bg-[#F1F5F9] rounded-premium shadow-premium p-3 text-center border border-slate-100 transition-transform active:scale-95">
            <div className="text-2xl font-bold text-actionOrange">${alertCount}</div>
            <div className="flex flex-col mt-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-tight">Active<br/>Alerts</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">ReliefWeb v2</span>
            </div>
          </div>
          <div className="bg-[#F1F5F9] rounded-premium shadow-premium p-3 text-center border border-slate-100 transition-transform active:scale-95">
            <div className="text-2xl font-bold text-amber-500">${fundingPercent}%</div>
            <div className="flex flex-col mt-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-tight">Funding<br/>Status</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">OCHA FTS</span>
            </div>
          </div>
        </div>

        <!-- Quick actions -->
        <div className="fade-up flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center px-2">
            <button onClick=${props.onRequestHelp}
              className="w-full md:w-[220px] flex flex-col items-center justify-center gap-1 py-5 rounded-premium text-white transition-all hover:scale-105 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
              style=${{background: '#E2725B'}}
            >
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-hand-holding-heart text-sm"></i>
                <span className="text-xs font-bold uppercase tracking-wider">REQUEST HELP</span>
              </div>
              <span className="text-[11px] font-kufi opacity-90">طلب المساعدة</span>
            </button>
            <button onClick=${props.onSuggest}
              className="w-full md:w-[220px] flex flex-col items-center justify-center gap-1 py-5 rounded-premium text-white transition-all hover:scale-105 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
              style=${{background: '#475569'}}
            >
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-bullhorn text-sm"></i>
                <span className="text-xs font-bold uppercase tracking-wider">REPORT UPDATE</span>
              </div>
              <span className="text-[11px] font-kufi opacity-90">إبلاغ عن تحديث</span>
            </button>
            <button onClick=${() => props.setTab('briefs')}
              className="w-full md:w-[220px] flex flex-col items-center justify-center gap-1 py-5 rounded-premium text-white transition-all hover:scale-105 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
              style=${{background: '#649173'}}
            >
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-file-lines text-sm"></i>
                <span className="text-xs font-bold uppercase tracking-wider">COUNTRY BRIEFS</span>
              </div>
              <span className="text-[11px] font-kufi opacity-90">ملخصات الدول</span>
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

        <!-- Impact Update Ticker -->
        <div className="fade-up flex items-center justify-between px-5 py-3 bg-tealAccent/5 rounded-2xl border border-tealAccent/10">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-tealAccent rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-navy uppercase tracking-widest">Impact Update: 1,200+ Kits delivered this week</span>
          </div>
          <a href="#" className="text-[9px] font-black text-tealAccent uppercase tracking-widest hover:underline">Latest Story →</a>
        </div>

        <!-- Humanitarian Briefing -->
        <${BilingualBriefing} />

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

        <!-- Neutrality Note -->
        <div className="fade-up fade-up-delay-4 bg-[#F1F5F9] rounded-premium p-6 border border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm flex-shrink-0">
              <i className="fa-solid fa-circle-info"></i>
            </div>
            <div>
              <div className="flex flex-col text-left">
                <h3 className="text-sm font-bold text-navy uppercase tracking-wider leading-none">A note on neutrality</h3>
                <p className="text-[10px] font-kufi text-slate-400 mt-1.5 opacity-80">ملاحظة حول الحياد</p>
              </div>
              <div className="space-y-3 mt-4 text-left">
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">Mdaad Now is a strictly neutral humanitarian coordination tool. All data is verified based on need alone, without political or sectarian affiliation.</p>
                <p className="text-[10px] font-kufi text-slate-500 leading-relaxed">نظام مدد هو أداة تنسيق إنسانية محايدة تماماً. يتم التحقق من جميع البيانات بناءً على الاحتياج فقط، دون أي انتماء سياسي أو طائفي.</p>
              </div>
            </div>
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
    var updatesRef = useState([]);
    var updates = updatesRef[0], setUpdates = updatesRef[1];

    var externalAlertCountRef = useState(0);
    var externalAlertCount = externalAlertCountRef[0], setExternalAlertCount = externalAlertCountRef[1];

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
        var lng = u.location_coords.lng;
        var displayDesc = u.description;
        var col = CATEGORY_COLORS[u.category] || '#6B5344';
        
        var verBadge = u.is_verified
          ? `<span style="background:var(--teal-accent);color:white;font-size:9px;font-weight:900;padding:2px 10px;border-radius:6px;letter-spacing:0.05em">VERIFIED</span>`
          : `<span style="background:#F1F5F9;color:#94A3B8;font-size:9px;font-weight:900;padding:2px 10px;border-radius:6px;letter-spacing:0.05em">PENDING</span>`;

        if (isConfidential && !isAuthorized) {
          lat = Math.floor(lat * 100) / 100;
          lng = Math.floor(lng * 100) / 100;
          var circle = L.circle([lat, lng], {
            color: col,
            fillColor: col,
            fillOpacity: 0.15,
            radius: 800,
            stroke: false
          }).addTo(map);
          circle.bindPopup(`
            <div style="min-width:200px; padding:4px">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px">
                ${verBadge}
                <span style="background:#EF4444;color:white;font-size:9px;font-weight:900;padding:2px 10px;border-radius:6px"><i class="fa-solid fa-eye-slash"></i> MASKED</span>
              </div>
              <p style="font-size:14px; font-weight:600; color:var(--navy); margin:0 0 6px 0">Confidential Location</p>
              <p style="font-size:12px; line-height:1.4; color:#64748B; margin:0 0 12px 0">Precise coordinates are hidden for security. This marks the general vicinity.</p>
              <div style="display:flex; justify-content:between; align-items:center; border-top:1px solid #F1F5F9; padding-top:8px">
                <span style="font-size:10px; font-weight:700; color:${col}">${u.category.toUpperCase()}</span>
                <span style="font-size:10px; color:#94A3B8; margin-left:auto">${timeAgo(u.created_at)}</span>
              </div>
            </div>
          `);
          markersRef.current.push(circle);
        } else {
          var icon = L.divIcon({
            className: '',
            html: `<div class="map-marker shadow-lg" style="background:${col}; border:3px solid white; width:32px; height:32px; border-radius:12px 12px 0 12px; display:flex; align-items:center; justify-center; transform:rotate(45deg)">
                    <i class="fa-solid ${(CATEGORY_ICONS[u.category]||'fa-circle')}" style="color:white; font-size:14px; transform:rotate(-45deg)"></i>
                   </div>`,
            iconSize: [32,32],
            iconAnchor: [16,32],
            popupAnchor: [0,-32],
          });
          var marker = L.marker([lat, lng], {icon:icon}).addTo(map);
          var confBadge = isConfidential ? '<span style="background:#6366F1;color:white;font-size:9px;font-weight:900;padding:2px 10px;border-radius:6px;margin-left:4px">MASKED</span>' : '';
          marker.bindPopup(`
            <div style="min-width:220px; padding:4px">
              <div style="display:flex; align-items:center; gap:4px; margin-bottom:10px">
                ${verBadge} ${confBadge}
              </div>
              <p style="font-size:14px; font-weight:500; line-height:1.5; color:var(--navy); margin:0 0 12px 0">${u.description}</p>
              <div style="display:flex; justify-content:between; align-items:center; border-top:1px solid #F1F5F9; padding-top:8px">
                <div style="display:flex; flex-direction:column">
                  <span style="font-size:10px; font-weight:800; color:${col}; letter-spacing:0.02em">${u.category.toUpperCase()}</span>
                  <span style="font-size:9px; font-family:'Readex Pro'; color:#94A3B8">${ARABIC_LABELS[u.category]}</span>
                </div>
                <span style="font-size:10px; color:#94A3B8; margin-left:auto">${timeAgo(u.created_at)}</span>
              </div>
            </div>
          `);
          markersRef.current.push(marker);
        }
      });
    }, [props.updates, mapFilter]);

    return html`
      <div className="relative" style=${{height:'calc(100vh - 130px)'}}>
        <!-- Filter chips -->
        <div className="absolute top-4 left-4 right-4 z-[30] flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button onClick=${function(){ setMapFilter('all'); }}
            className=${'flex-shrink-0 flex flex-col items-center justify-center px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all backdrop-blur-md ' + (mapFilter==='all' ? 'bg-navy border-navy text-white shadow-lg shadow-navy/20' : 'bg-white/80 text-slate-400 border-slate-100')}>
            <span>All</span>
            <span className="text-[8px] font-kufi opacity-60">الكل</span>
          </button>
          ${CATEGORIES.map(function(cat) {
            var active = mapFilter === cat;
            return html`
              <button key=${cat} onClick=${function(){ setMapFilter(cat); }}
                className=${'flex-shrink-0 flex flex-col items-center justify-center px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all backdrop-blur-md ' + (active ? 'text-white border-transparent shadow-lg' : 'bg-white/80 text-slate-400 border-slate-100')}
                style=${active ? {backgroundColor:CATEGORY_COLORS[cat], shadowColor: CATEGORY_COLORS[cat] + '40'} : {}}
              >
                <div className="flex items-center gap-1.5">
                  <i className=${'fa-solid ' + CATEGORY_ICONS[cat]}></i>
                  <span>${cat}</span>
                </div>
                <span className="text-[8px] font-kufi opacity-70">${ARABIC_LABELS[cat]}</span>
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
      <div className="px-4 pb-6 space-y-6">
        <div className="fade-up pt-4">
          <h1 className="text-3xl font-bold text-navy">Resources</h1>
          <p className="text-[11px] font-kufi text-slate-400 mt-1 uppercase tracking-wider">${filtered.length} results / ${filtered.length} نتائج</p>
        </div>

        <!-- Search -->
        <div className="fade-up fade-up-delay-1 relative group">
          <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-tealAccent transition-colors"></i>
          <input
            type="search"
            value=${query}
            onInput=${function(e){ setQuery(e.target.value); }}
            className="w-full rounded-premium border border-slate-100 bg-white pl-12 pr-5 py-4 text-sm font-medium text-navy shadow-premium placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-tealAccent/5 focus:border-tealAccent/50 transition-all"
            placeholder="Search organizations, hospitals..."
            aria-label="Search resources"
          />
          ${query ? html`
            <button onClick=${function(){ setQuery(''); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-navy transition-all" aria-label="Clear search">
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          ` : null}
        </div>

        <!-- Category filter -->
        <div className="fade-up fade-up-delay-2 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          ${RESOURCE_CATS.map(function(c) {
            var active = catFilter === c;
            return html`
              <button key=${c} onClick=${function(){ setCatFilter(c); }}
                className=${'flex-shrink-0 flex flex-col items-center justify-center px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ' + (active ? 'bg-navy border-navy text-white shadow-lg shadow-navy/20' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200')}
              >
                <div className="flex items-center gap-2">
                  ${c!=='all' ? html`<i className=${'fa-solid ' + RESOURCE_ICONS[c]}></i>` : null}
                  <span>${RESOURCE_LABELS[c]}</span>
                </div>
                <span className="text-[8px] font-kufi opacity-60 mt-0.5">${ARABIC_LABELS[c]}</span>
              </button>
            `;
          })}
        </div>

        <!-- Resource list -->
        <div className="space-y-4 fade-up fade-up-delay-3">
          ${filtered.map(function(r) {
            return html`<${ResourceCard} key=${r.id} resource=${r} />`;
          })}
          ${filtered.length === 0 ? html`
            <div className="text-center py-20 bg-white rounded-premium border border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-building-circle-xmark text-3xl text-slate-200"></i>
              </div>
              <p className="text-sm font-bold text-navy">No resources found</p>
              <p className="text-xs font-kufi text-slate-400 mt-1">لا توجد موارد تطابق بحثك</p>
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
        <div className="flex flex-col items-center justify-center h-full p-10 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <i className="fa-solid fa-lock text-3xl text-slate-200"></i>
          </div>
          <h2 className="text-xl text-navy font-bold mb-2">Access Denied</h2>
          <p className="text-xs text-slate-400 font-kufi">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
        </div>
      `;
    }

    const totalReq = props.updates.length;
    const fulfilledReq = props.updates.filter(u => u.is_verified).length;
    const categories = ['Food', 'Health', 'Safety', 'Shelter'];

    return html`
      <div className="px-4 pb-6 space-y-6 fade-in">
        <div className="pt-4">
          <h1 className="text-3xl font-bold text-navy">Analytics</h1>
          <p className="text-[11px] font-kufi text-slate-400 mt-1 uppercase tracking-wider">Gap Analysis & Heatmap / تحليل الفجوات</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-premium border border-slate-100 shadow-premium group">
            <div className="text-3xl font-black text-navy group-hover:text-tealAccent transition-colors">${totalReq}</div>
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-1">Total Updates</div>
            <div className="text-[8px] font-kufi text-slate-300 mt-0.5">إجمالي التحديثات</div>
          </div>
          <div className="bg-white p-5 rounded-premium border border-slate-100 shadow-premium group">
            <div className="text-3xl font-black text-tealAccent">${fulfilledReq}</div>
            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-1">Verified</div>
            <div className="text-[8px] font-kufi text-slate-300 mt-0.5">تم التحقق منها</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-premium border border-slate-100 shadow-premium">
          <h3 className="text-sm font-black text-navy uppercase tracking-widest mb-6 flex items-center justify-between">
            <span>Needs distribution</span>
            <span className="text-[10px] font-kufi text-slate-400">توزيع الاحتياجات</span>
          </h3>
          <div className="space-y-5">
            ${['Food', 'Health', 'Safety', 'Shelter'].map(function(cat) {
              const count = (props.updates || []).filter(u => u.category === cat).length;
              const pct = totalReq ? Math.round((count / totalReq) * 100) : 0;
              const col = CATEGORY_COLORS[cat];
              return html`
                <div key=${cat} className="group">
                  <div className="flex justify-between items-end text-xs mb-2">
                    <div className="flex flex-col">
                      <span className="font-bold text-navy">${cat}</span>
                      <span className="text-[9px] font-kufi text-slate-400">${ARABIC_LABELS[cat]}</span>
                    </div>
                    <span className="font-black text-navy opacity-40 group-hover:opacity-100 transition-opacity">${count} (${pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out" style=${{width: pct+'%', backgroundColor: col}}></div>
                  </div>
                </div>
              `;
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-premium border border-slate-100 shadow-premium">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-black text-navy uppercase tracking-widest">Urgency Heatmap</h3>
              <p className="text-[10px] font-kufi text-slate-400">خريطة الحرارة للاحتياجات العاجلة</p>
            </div>
            <span className="bg-actionOrange/10 text-actionOrange text-[9px] px-2.5 py-1 rounded-lg font-black tracking-widest">LIVE</span>
          </div>
          <div className="h-48 bg-slate-50 rounded-2xl relative overflow-hidden flex items-center justify-center border border-slate-100">
            <i className="fa-solid fa-map-location-dot text-5xl text-slate-200 absolute"></i>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-actionOrange/5 to-transparent mix-blend-multiply"></div>
            <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-actionOrange/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute top-1/3 right-1/3 w-20 h-20 bg-navy/10 rounded-full blur-xl"></div>
            <p className="z-10 text-[10px] font-black text-navy bg-white/90 px-4 py-2 rounded-xl backdrop-blur-md shadow-lg border border-white uppercase tracking-widest">
              District 5 Critical Zone
            </p>
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
    var sectionArabic = { all:'الكل', pending:'قيد المراجعة', verified:'تم التحقق' };

    return html`
      <div className="px-4 pb-6 space-y-6">
        <div className="fade-up pt-4">
          <h1 className="text-3xl font-bold text-navy">Country Briefs</h1>
          <p className="text-[11px] font-kufi text-slate-400 mt-1 uppercase tracking-wider">
            Official displacement statistics and humanitarian intelligence / معلومات إنسانية وإحصاءات رسمية
          </p>
        </div>

        <!-- Population at Risk Visualization -->
        <div className="fade-up fade-up-delay-1 bg-white p-6 rounded-premium border border-slate-100 shadow-premium">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-black text-navy uppercase tracking-widest">Population at Risk</h3>
              <p className="text-[10px] font-kufi text-slate-400">سياق النزوح وحالات اللجوء</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Country of Asylum: Lebanon</span>
              <span className="text-[8px] font-black text-tealAccent uppercase tracking-widest mt-1">Source: UNHCR Refugee Statistics</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${(props.unhcrData || []).map(function(item) {
              return html`
                <div key=${item.coo} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-navy uppercase tracking-widest">${item.coo}</span>
                    <span className="text-[9px] font-kufi text-slate-400 mt-0.5">بلد المنشأ / Country of Origin</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-black text-navy">${item.total.toLocaleString()}</span>
                    <span className="text-[9px] font-kufi text-slate-400 mt-0.5">إجمالي النازحين / Total Displaced</span>
                  </div>
                </div>
              `;
            })}
            ${(!props.unhcrData || props.unhcrData.length === 0) && html`
              <div className="col-span-full text-center py-8 text-slate-300 text-[10px] uppercase tracking-widest font-black">Loading displacement context...</div>
            `}
          </div>
        </div>

        <!-- Role indicator -->
        ${canApprove ? html`
          <div className="fade-up fade-up-delay-1 flex items-center gap-4 p-4 rounded-premium bg-tealAccent/5 border border-tealAccent/20">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-tealAccent shadow-lg shadow-tealAccent/20 text-white">
              <i className="fa-solid fa-shield-check text-lg"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-tealAccent uppercase tracking-widest">Coordinator Access</span>
                <span className="text-[10px] px-2 py-0.5 bg-tealAccent/10 text-tealAccent rounded font-bold uppercase">${props.user.role}</span>
              </div>
              <p className="text-[10px] font-kufi text-slate-400 mt-0.5">لديك صلاحيات التحقق من التقارير</p>
            </div>
          </div>
        ` : null}

        <!-- Section tabs -->
        <div className="fade-up fade-up-delay-1 flex p-1 bg-slate-50 rounded-2xl border border-slate-100">
          ${['all','pending','verified'].map(function(s) {
            var count = s==='pending' ? props.updates.filter(function(u){return !u.is_verified;}).length
                       : s==='verified' ? props.updates.filter(function(u){return u.is_verified;}).length
                       : props.updates.length;
            var active = section === s;
            return html`
              <button key=${s} onClick=${function(){ setSection(s); }}
                className=${'flex-1 flex flex-col items-center py-2.5 rounded-xl transition-all ' + (active ? 'bg-white text-navy shadow-premium' : 'text-slate-400 hover:text-slate-600')}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest">${sectionLabels[s]}</span>
                  ${count > 0 ? html`<span className=${'flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black ' + (s==='pending' ? 'bg-actionOrange text-white' : 'bg-slate-100 text-slate-400')}>${count}</span>` : null}
                </div>
                <span className="text-[9px] font-kufi opacity-60">${sectionArabic[s]}</span>
              </button>
            `;
          })}
        </div>

        <!-- Updates list -->
        <div className="space-y-4 fade-up fade-up-delay-2">
          ${filtered.map(function(u) {
            return html`<${UpdateCard} key=${u.id} update=${u} showActions=${canApprove && !u.is_verified} onVerify=${props.onVerify} onReject=${props.onReject} />`;
          })}
          ${filtered.length === 0 ? html`
            <div className="text-center py-20 bg-white rounded-premium border border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-clipboard-check text-3xl text-slate-200"></i>
              </div>
              <p className="text-sm font-bold text-navy">${section==='pending' ? 'No pending reviews' : 'No updates found'}</p>
              <p className="text-xs font-kufi text-slate-400 mt-1">لا توجد تقارير في هذا القسم</p>
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
      { key:'user', label:'Civilian', icon:'fa-user', arabic:'مدني' },
      { key:'verified_org', label:'NGO', icon:'fa-hand-holding-heart', arabic:'منظمة' },
      { key:'admin', label:'Admin', icon:'fa-shield-halved', arabic:'مسؤول' },
    ];
    return html`
      <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
        ${roles.map(function(r) {
          var active = props.role === r.key;
          return html`
            <button key=${r.key} onClick=${function(){ props.onChange(r.key); }}
              className=${'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ' + (active ? 'bg-white text-navy shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600')}
              title=${'Switch to ' + r.label + ' role'}
            >
              <i className=${'fa-solid ' + r.icon + ' text-[12px]'}></i>
              <div className="flex flex-col items-start leading-none">
                <span className="text-[9px] font-black uppercase tracking-wider hidden sm:inline">${r.label}</span>
                <span className="text-[8px] font-kufi opacity-70 hidden sm:inline">${r.arabic}</span>
              </div>
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
      { id: 'global1', name: 'PayPal International', icon: 'fa-brands fa-paypal', region: 'Global', type: 'paypal', arabic:'بايبال العالمي' },
      { id: 'global2', name: 'Bitcoin / Crypto', icon: 'fa-brands fa-bitcoin', region: 'Global', type: 'crypto', arabic:'عملات رقمية' },
      { id: 'eu1', name: 'SEPA Bank Transfer', icon: 'fa-solid fa-building-columns', region: 'Europe', type: 'bank', arabic:'تحويل بنكي أوروبا' },
      { id: 'af1', name: 'Mobile Money (M-Pesa)', icon: 'fa-solid fa-mobile-screen', region: 'Africa', type: 'mobile', arabic:'الدفع عبر الهاتف' },
      { id: 'asia1', name: 'AliPay / WeChat', icon: 'fa-brands fa-alipay', region: 'Asia', type: 'app', arabic:'علي باي / وي تشات' },
    ];

    return html`
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Donation options">
        <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick=${props.onClose}></div>
        <div className="slide-up relative bg-white rounded-3xl w-full max-w-[480px] overflow-hidden shadow-2xl">
          <div className="bg-navy p-6 text-white relative">
            <h2 className="text-xl font-bold">Support Our Mission</h2>
            <p className="text-xs text-white/60 font-kufi mt-1">ساهم في دعم مهامنا الإنسانية</p>
            <button onClick=${props.onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all" aria-label="Close">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
            <p className="text-sm text-slate-500 leading-relaxed">Choose a convenient payment method for your region to help fund humanitarian efforts.</p>
            ${options.map(function(opt) {
              return html`
                <button key=${opt.id} onClick=${function(){ showToast('Redirecting to ' + opt.name + '...', 'info'); props.onClose(); }} 
                  className="w-full flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-tealAccent/30 hover:bg-white hover:shadow-premium transition-all active:scale-[0.98] group">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 text-actionOrange group-hover:bg-actionOrange group-hover:text-white transition-all">
                    <i className=${opt.icon + ' text-xl'}></i>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-navy text-sm">${opt.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">${opt.region}</span>
                      <span className="text-[10px] font-kufi text-slate-300">· ${opt.arabic}</span>
                    </div>
                  </div>
                  <i className="fa-solid fa-chevron-right text-slate-300 text-xs group-hover:translate-x-1 transition-transform"></i>
                </button>
              `;
            })}
          </div>
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
            <i className="fa-solid fa-shield-heart text-tealAccent"></i>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">100% of proceeds go to the field</span>
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
      { label:'Documents Submitted',    arabic:'تم تقديم المستندات',    done: org.docs_submitted,                    pts: 25 },
      { label:'UN/OCHA Registered',     arabic:'مسجل لدى الأمم المتحدة', done: org.un_ocha_registered,               pts: 20 },
      { label:'Field Contact Verified', arabic:'التحقق من الاتصال الميداني', done: org.has_field_contact,                 pts: 20 },
      { label:'5+ Community Reports',   arabic:'أكثر من 5 بلاغات مجتمعية', done: (org.community_reports||0) >= 5,       pts: 10 },
      { label:'3+ Campaigns Fulfilled', arabic:'إنجاز 3 حملات على الأقل',  done: (org.campaigns_fulfilled||0) >= 3,     pts: 15 },
      { label:'30+ Days Active',        arabic:'نشط لأكثر من 30 يوماً',   done: (org.days_active||0) >= 30,            pts: 10 },
    ];
    return html`
      <div className="bg-white rounded-premium border border-slate-100 p-6 shadow-premium">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-navy">Trust Score</h3>
            <p className="text-[10px] font-kufi text-slate-400 mt-1 uppercase tracking-wider">Verification requires ${TRUST_THRESHOLD}+ points</p>
          </div>
          ${isVerified
            ? html`<span className="text-[10px] font-black text-tealAccent bg-tealAccent/10 px-3 py-1.5 rounded-lg flex items-center gap-2 uppercase tracking-widest"><i className="fa-solid fa-circle-check"></i>Verified</span>`
            : html`<div className="text-right"><span className="text-3xl font-black text-navy">${score}</span><span className="text-xs font-bold text-slate-300 ml-1">/ 100</span></div>`
          }
        </div>
        <div className="relative w-full h-3 bg-slate-50 rounded-full mb-8">
          <div className="h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
            style=${{ width: score+'%', background: score >= TRUST_THRESHOLD ? 'var(--teal-accent)' : 'linear-gradient(90deg, var(--action-orange), #fbbf24)' }}>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-navy/20 rounded-full"
            style=${{ left: TRUST_THRESHOLD+'%' }}>
          </div>
          <span className="absolute -top-6 text-[9px] font-black text-slate-400 uppercase tracking-widest"
            style=${{ left: TRUST_THRESHOLD+'%', transform:'translateX(-50%)' }}>
            MIN ${TRUST_THRESHOLD}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4">
          ${checkpoints.map(function(cp) {
            return html`
              <div key=${cp.label} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className=${'w-6 h-6 rounded-lg flex items-center justify-center transition-all ' + (cp.done ? 'bg-tealAccent/10 text-tealAccent' : 'bg-slate-50 text-slate-200')}>
                    <i className=${'fa-solid ' + (cp.done ? 'fa-check' : 'fa-circle-notch')}></i>
                  </div>
                  <div className="flex flex-col">
                    <span className=${'text-[11px] font-bold ' + (cp.done ? 'text-navy' : 'text-slate-400')}>${cp.label}</span>
                    <span className="text-[9px] font-kufi text-slate-300">${cp.arabic}</span>
                  </div>
                </div>
                <span className=${'text-[10px] font-black ' + (cp.done ? 'text-tealAccent' : 'text-slate-300')}>+${cp.pts}</span>
              </div>
            `;
          })}
        </div>
        ${!isVerified && score >= TRUST_THRESHOLD ? html`
          <div className="mt-8 p-4 bg-tealAccent/5 rounded-2xl text-[10px] text-tealAccent font-black flex items-center gap-3 border border-tealAccent/10 uppercase tracking-widest">
            <i className="fa-solid fa-sparkles text-sm"></i>
            <span>Score qualifies — admin review pending</span>
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
    const col = CATEGORY_COLORS[campaign.urgency_level] || URGENCY_COLORS[campaign.urgency_level] || '#6B5344';
    const pct = campaign.quantity_needed
      ? Math.min(100, Math.round((campaign.quantity_fulfilled / campaign.quantity_needed) * 100))
      : 0;
    const isFulfilled = campaign.status === 'fulfilled';
    return html`
      <div className=${'bg-white rounded-premium border border-slate-100 p-5 shadow-premium fade-up ' + (isFulfilled ? 'opacity-60 grayscale' : '')}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-white"
                style=${{ backgroundColor: col }}>${campaign.urgency_level}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${campaign.category}</span>
            </div>
            <h3 className="font-bold text-navy text-sm leading-tight">${campaign.title}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-300">
            <i className=${'fa-solid ' + (CATEGORY_ICONS[campaign.category] || 'fa-box')}></i>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">${campaign.description}</p>
        
        ${campaign.quantity_needed ? html`
          <div className="mb-4">
            <div className="flex justify-between text-[10px] mb-2">
              <span className="text-slate-400 font-bold uppercase tracking-widest">Progress</span>
              <span className="font-black text-navy">${campaign.quantity_fulfilled} / ${campaign.quantity_needed} ${campaign.quantity_unit}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000"
                style=${{ width: pct+'%', backgroundColor: isFulfilled ? 'var(--teal-accent)' : col }}></div>
            </div>
          </div>
        ` : null}

        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">${timeAgo(campaign.created_at)}</span>
          </div>
          ${showActions && !isFulfilled ? html`
            <button onClick=${function() { onFulfill(campaign.id); }}
              className="text-[10px] font-black text-tealAccent uppercase tracking-widest flex items-center gap-1.5 group">
              <i className="fa-solid fa-circle-check"></i> Mark Done
            </button>
          ` : isFulfilled ? html`
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
              <i className="fa-solid fa-check-double"></i> Completed
            </span>
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
      var map = L.map(containerRef.current, { center:[37.066,37.383], zoom:13, zoomControl:false });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(map);
      map.on('click', function(e) {
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = L.marker([e.latlng.lat, e.latlng.lng], {
          icon: L.divIcon({
            className: '',
            html: '<div style="width:24px;height:24px;background:var(--action-orange);border-radius:10px 10px 0 10px;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.2);transform:rotate(45deg)"></div>',
            iconSize:[24,24], iconAnchor:[12,24]
          })
        }).addTo(map);
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      mapRef.current = map;
      setTimeout(function(){ map.invalidateSize(); }, 150);
      return function() { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
    }, []);
    return html`
      <div className="space-y-3">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <i className="fa-solid fa-map-pin text-actionOrange"></i>
          Select target location / اختر الموقع المستهدف
        </p>
        <div ref=${containerRef}
          className="shadow-inner border-2 border-slate-100"
          style=${{ height:'240px', borderRadius:'24px', overflow:'hidden' }} />
        ${value
          ? html`<p className="text-[10px] font-black text-tealAccent uppercase tracking-widest flex items-center gap-2"><i className="fa-solid fa-circle-check"></i>Pinned: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}</p>`
          : html`<p className="text-[10px] font-kufi text-slate-300">انقر على الخريطة لتحديد الموقع</p>`
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

    const stepTitles = ['Need Type','Details','Location','Urgency','Review'];
    const stepArabic = ['نوع الاحتياج','التفاصيل','الموقع','الأهمية','المراجعة'];
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
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick=${onClose}></div>
        <div className="slide-up relative bg-white rounded-3xl w-full max-w-[520px] overflow-hidden shadow-2xl">

          <!-- Header + step dots -->
          <div className="bg-navy p-6 text-white relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">Post a Live Need</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Step ${step}/5</span>
                  <span className="text-[10px] font-kufi text-white/40">· ${stepArabic[step-1]}</span>
                </div>
              </div>
              <button type="button" onClick=${onClose}
                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="flex gap-2">
              ${[1,2,3,4,5].map(function(s) {
                return html`<div key=${s} className=${'flex-1 h-1.5 rounded-full transition-all duration-500 ' + (s <= step ? 'bg-tealAccent shadow-[0_0_8px_var(--teal-accent)]' : 'bg-white/10')}></div>`;
              })}
            </div>
          </div>

          <form onSubmit=${handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">

            <!-- Step 1: Category -->
            ${step === 1 ? html`
              <div className="fade-in space-y-4">
                <p className="text-sm font-bold text-navy uppercase tracking-widest">Select Category / اختر الفئة</p>
                <div className="grid grid-cols-2 gap-3">
                  ${LIVE_CATEGORIES.map(function(cat) {
                    const active = form.category === cat;
                    const col = CATEGORY_COLORS[cat] || '#6B5344';
                    return html`
                      <button key=${cat} type="button" onClick=${function(){ patch('category', cat); }}
                        className=${'p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ' + (active ? 'border-tealAccent bg-tealAccent/5' : 'border-slate-50 bg-slate-50/50 hover:border-slate-100')}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all"
                          style=${{ backgroundColor: active ? col : 'white', color: active ? 'white' : col, boxShadow: active ? '0 8px 15px ' + col + '30' : 'none' }}>
                          <i className=${'fa-solid ' + (LIVE_CAT_ICONS[cat]||'fa-circle')}></i>
                        </div>
                        <div className="text-center">
                          <span className=${'text-[10px] font-black uppercase tracking-widest block ' + (active ? 'text-navy' : 'text-slate-400')}>${cat}</span>
                          <span className="text-[9px] font-kufi text-slate-300 mt-0.5">${ARABIC_LABELS[cat]}</span>
                        </div>
                      </button>
                    `;
                  })}
                </div>
              </div>
            ` : null}

            <!-- Step 2: Details -->
            ${step === 2 ? html`
              <div className="fade-in space-y-6">
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-tealAccent transition-colors">Need Title / عنوان الاحتياج</label>
                  <input type="text" value=${form.title} maxlength="150" required
                    onInput=${function(e){ patch('title', e.target.value); }}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-medium text-navy focus:outline-none focus:ring-4 focus:ring-tealAccent/5 focus:border-tealAccent transition-all"
                    placeholder="e.g. 200 Blankets Needed for District 3" />
                </div>
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-tealAccent transition-colors">Description / الوصف التفصيلي</label>
                  <textarea value=${form.description} rows="4"
                    onInput=${function(e){ patch('description', e.target.value); }}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-medium text-navy focus:outline-none focus:ring-4 focus:ring-tealAccent/5 focus:border-tealAccent transition-all resize-none"
                    placeholder="Detailed explanation of the requirements..."></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quantity / الكمية</label>
                    <input type="number" min="1" value=${form.quantity_needed}
                      onInput=${function(e){ patch('quantity_needed', e.target.value); }}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-medium text-navy focus:outline-none focus:ring-4 focus:ring-tealAccent/5 focus:border-tealAccent transition-all" />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Unit / الوحدة</label>
                    <select value=${form.quantity_unit} onChange=${function(e){ patch('quantity_unit', e.target.value); }}
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-medium text-navy focus:outline-none focus:ring-4 focus:ring-tealAccent/5 focus:border-tealAccent transition-all appearance-none">
                      ${['units','kg','pallets','meals','kits','families','liters','vehicles'].map(function(u) {
                        return html`<option key=${u} value=${u}>${u.toUpperCase()}</option>`;
                      })}
                    </select>
                  </div>
                </div>
              </div>
            ` : null}

            <!-- Step 3: Location picker -->
            ${step === 3 ? html`
              <div className="fade-in space-y-6">
                <${LeafletLocationPicker} value=${form.location_coords} onChange=${function(c){ patch('location_coords', c); }} />
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-focus-within:text-tealAccent transition-colors">Location Label / اسم الموقع</label>
                  <input type="text" value=${form.location_label}
                    onInput=${function(e){ patch('location_label', e.target.value); }}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 px-5 py-4 text-sm font-medium text-navy focus:outline-none focus:ring-4 focus:ring-tealAccent/5 focus:border-tealAccent transition-all"
                    placeholder="e.g. District 3 Community Center" />
                </div>
              </div>
            ` : null}

            <!-- Step 4: Urgency -->
            ${step === 4 ? html`
              <div className="fade-in space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Urgency Level / مستوى الأهمية</label>
                  <div className="grid grid-cols-2 gap-3">
                    ${['Low','Medium','High','Critical'].map(function(level) {
                      const active = form.urgency_level === level;
                      const col = URGENCY_COLORS[level];
                      return html`
                        <button key=${level} type="button" onClick=${function(){ patch('urgency_level', level); }}
                          className=${'p-4 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] transition-all ' + (active ? 'text-white' : 'bg-slate-50 border-slate-100 text-slate-400')}
                          style=${active ? { backgroundColor: col, borderColor: col, boxShadow: '0 8px 15px ' + col + '30' } : {}}>
                          ${level}
                        </button>
                      `;
                    })}
                  </div>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                  <div className="relative inline-block w-12 h-6 flex-shrink-0">
                    <input type="checkbox" id="loc-mask" checked=${form.is_location_masked}
                      onChange=${function(e){ patch('is_location_masked', e.target.checked); }}
                      className="peer absolute w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="w-full h-full bg-slate-200 rounded-full peer-checked:bg-tealAccent transition-colors"></div>
                    <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                  </div>
                  <div>
                    <label htmlFor="loc-mask" className="text-xs font-bold text-navy block">Mask Exact Location</label>
                    <p className="text-[10px] text-slate-400 mt-1">Recommended for sensitive or high-security needs.</p>
                  </div>
                </div>
              </div>
            ` : null}

            <!-- Step 5: Review -->
            ${step === 5 ? html`
              <div className="fade-in space-y-6">
                <div className="bg-slate-50 rounded-3xl p-6 space-y-4 border border-slate-100">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</span>
                      <span className="text-xs font-bold text-navy">${form.category}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Urgency</span>
                      <span className="text-xs font-black" style=${{ color: URGENCY_COLORS[form.urgency_level] }}>${form.urgency_level.toUpperCase()}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Title</span>
                    <span className="text-sm font-bold text-navy">${form.title}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Quantity</span>
                    <span className="text-xs font-bold text-navy">${form.quantity_needed} ${form.quantity_unit}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-5 bg-tealAccent/5 rounded-2xl border border-tealAccent/10">
                  <div className="w-10 h-10 bg-tealAccent/10 rounded-xl flex items-center justify-center text-tealAccent">
                    <i className="fa-solid fa-bullhorn text-lg"></i>
                  </div>
                  <p className="text-[10px] font-bold text-tealAccent uppercase tracking-widest leading-relaxed">Publishing this will make it visible to all verified humanitarian responders.</p>
                </div>
              </div>
            ` : null}

            <!-- Navigation buttons -->
            <div className="flex gap-4 pt-4">
              ${step > 1 ? html`
                <button type="button" onClick=${function(){ setStep(step-1); }}
                  className="flex-1 py-4 rounded-2xl bg-slate-100 text-navy font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all">
                  Back
                </button>
              ` : null}
              ${step < 5 ? html`
                <button type="button" onClick=${function(){ setStep(step+1); }}
                  disabled=${!stepValid[step]}
                  className="flex-1 py-4 rounded-2xl bg-navy text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-navy/20 disabled:opacity-30 active:scale-95 transition-all">
                  Next Step
                </button>
              ` : html`
                <button type="submit" disabled=${isSubmitting}
                  className="flex-1 py-4 rounded-2xl bg-tealAccent text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-tealAccent/20 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2">
                  ${isSubmitting ? html`<i className="fa-solid fa-spinner fa-spin"></i>` : html`<i className="fa-solid fa-paper-plane"></i>`}
                  <span>${isSubmitting ? 'Publishing...' : 'Publish Live Need'}</span>
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
    const score = calculateTrustScore(org || {});
    const isVerified = org?.verification_status === 'verified';
    const active = (campaigns || []).filter(function(c){ return c.status === 'active'; });
    const fulfilled = (campaigns || []).filter(function(c){ return c.status === 'fulfilled'; });
    const totalReached = (campaigns || []).reduce(function(acc, c){ return acc + (c.quantity_fulfilled||0); }, 0);

    return html`
      <div className="px-4 pb-6 space-y-6 fade-in">

        <!-- Org profile card -->
        <div className="bg-white rounded-premium border border-slate-100 p-6 shadow-premium">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-white text-2xl font-black shadow-lg shadow-actionOrange/20"
              style=${{ background:'linear-gradient(135deg, var(--action-orange), #fbbf24)' }}>
              ${(org?.name || 'N').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-navy leading-tight">${org?.name || 'NGO Profile'}</h1>
                ${isVerified ? html`
                  <span className="text-[9px] font-black text-tealAccent bg-tealAccent/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5 uppercase tracking-widest">
                    <i className="fa-solid fa-circle-check"></i> Verified NGO
                  </span>
                ` : html`
                  <span className="text-[9px] font-black text-actionOrange bg-actionOrange/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5 uppercase tracking-widest">
                    <i className="fa-solid fa-clock"></i> Verification Pending
                  </span>
                `}
              </div>
              <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">${org?.address || 'Address not listed'}</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed mt-4">${org?.description || 'No description available.'}</p>

          <!-- Impact stats row -->
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-50">
            <div className="text-center group">
              <div className="text-2xl font-black text-navy group-hover:text-actionOrange transition-colors">${active.length}</div>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-1">Live Needs</div>
            </div>
            <div className="text-center group">
              <div className="text-2xl font-black text-tealAccent">${fulfilled.length}</div>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-1">Fulfilled</div>
            </div>
            <div className="text-center group">
              <div className="text-2xl font-black text-navy group-hover:text-tealAccent transition-colors">${totalReached}</div>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-1">Units Sent</div>
            </div>
          </div>
        </div>

        <!-- Trust Score Meter -->
        <${TrustScoreMeter} org=${org} />

        <!-- Post Live Need CTA -->
        <div className="fade-up fade-up-delay-1">
          ${isVerified ? html`
            <button onClick=${onPostNeed}
              className="w-full py-5 rounded-premium text-white font-black text-sm flex items-center justify-center gap-4 shadow-xl active:scale-[0.98] transition-all uppercase tracking-widest border border-white/20"
              style=${{ background:'linear-gradient(135deg, var(--navy), var(--teal-accent))' }}>
              <i className="fa-solid fa-bullhorn text-xl"></i>
              Post a Live Need
            </button>
          ` : html`
            <div className="w-full py-5 rounded-premium bg-slate-50 text-slate-300 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 border border-slate-100">
              <i className="fa-solid fa-lock text-lg"></i>
              Posting requires verified status
            </div>
          `}
        </div>

        <!-- Campaigns list -->
        <div className="fade-up fade-up-delay-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-navy uppercase tracking-widest">Your Campaigns</h2>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-actionOrange bg-actionOrange/10 px-2 py-1 rounded uppercase tracking-wider">${active.length} Active</span>
            </div>
          </div>
          <div className="space-y-4">
            ${(campaigns || []).length === 0 ? html`
              <div className="text-center py-20 bg-white rounded-premium border border-dashed border-slate-200">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fa-solid fa-clipboard-list text-3xl text-slate-200"></i>
                </div>
                <p className="text-sm font-bold text-navy">No campaigns yet</p>
                <p className="text-xs font-kufi text-slate-400 mt-1">ابدأ بنشر أول احتياج ميداني اليوم</p>
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

    var [resources, setResources] = React.useState([]);
    var [updates, setUpdates] = React.useState([]);
    var [campaigns, setCampaigns] = React.useState([]);
    var [requests, setRequests] = React.useState([]);
    var [isLoading, setIsLoading] = React.useState(true);

    var [showPostNeed, setShowPostNeed] = React.useState(false);
    
    var [externalAlertCount, setExternalAlertCount] = React.useState(0);
    var [hdxPresence, setHdxPresence] = React.useState(null);
    var [hdxFunding, setHdxFunding] = React.useState(null);
    var [unhcrData, setUnhcrData] = React.useState([]);

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
          const [resData, reqData, campData] = await Promise.all([
            apiFetch('/resources'),
            apiFetch('/requests'),
            apiFetch('/campaigns')
          ]);
          
          const safeReqData = Array.isArray(reqData) ? reqData : [];
          const safeResData = Array.isArray(resData) ? resData : [];
          const safeCampData = Array.isArray(campData) ? campData : [];

          // Transform backend requests into the frontend "updates" format
          const feedUpdates = safeReqData.map(r => ({
            id: 'req-' + r.id,
            created_at: r.created_at || new Date().toISOString(),
            description: r.description,
            category: r.needs_category,
            district: r.district,
            urgency: r.urgency_level,
            status: r.status,
            is_verified: true,
            reported_by: r.reported_by || 'System',
            reporter_role: 'verified_org'
          }));

          setResources(safeResData);
          setCampaigns(safeCampData);
          setUpdates(feedUpdates);

          // Fetch external updates from ReliefWeb and prepend them
          apiFetch('/external/reports').then(function(externalData){
            if (externalData && Array.isArray(externalData)) {
              setUpdates(function(prev){
                var existing = prev.filter(function(u){ return !u.id.toString().startsWith('rw-'); });
                return [...externalData, ...existing];
              });
            }
          });

          // Fetch external disasters count
          apiFetch('/external/disasters/count').then(function(data){
            if (data && data.count !== undefined) {
               setExternalAlertCount(data.count);
            }
          });

        } catch (err) {
          console.error('Failed to fetch initial data', err);
        } finally {
          setIsLoading(false);
        }
        // Fetch HDX HAPI data
        apiFetch('/external/hdx/presence').then(function(data){
          if (data && data.count !== undefined) {
             setHdxPresence(data);
          }
        });
        apiFetch('/external/hdx/funding').then(function(data){
          if (data && data.percent !== undefined) {
             setHdxFunding(data);
          }
        });

        // Fetch UNHCR population data
        apiFetch('/external/unhcr/population').then(function(data){
          if (data && Array.isArray(data)) {
             setUnhcrData(data);
          }
        });

      }
      initData();
    }, []);

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
            const campsData = await apiFetch('/campaigns');
            const safeCampsData = Array.isArray(campsData) ? campsData : [];
            
            setOrgCampaigns(safeCampsData.map(c => ({
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
      { key:'briefs', label:'Briefs', arabic:'ملخصات', icon:'fa-file-lines' },
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
          ${tab==='home' && html`<${HomeView} 
            user=${user} 
            updates=${updates} 
            resources=${resources} 
            externalAlertCount=${externalAlertCount}
            hdxPresence=${hdxPresence}
            hdxFunding=${hdxFunding}
            onSuggest=${function(){ setShowSuggest(true); }} 
            onRequestHelp=${function(){ setShowRequestHelp(true); }} 
            onDonate=${function(){ setShowDonation(true); }} 
            setTab=${setTab} 
          />`}
          ${tab==='map' && html`<${MapView} updates=${updates} user=${user} />`}
          ${tab==='volunteer' && html`<${VolunteerView} updates=${updates} user=${user} />`}
          ${tab==='resources' && html`<${ResourcesView} resources=${resources} user=${user} />`}
          ${tab==='briefs' && html`<${BriefsView} 
            user=${user} 
            updates=${updates} 
            unhcrData=${unhcrData}
            onVerify=${handleVerify} 
            onReject=${handleReject} 
            onSuggest=${function(){ setShowSuggest(true); }} 
          />`}
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
        if (!response.ok) throw new Error('API offline');
        return await response.json();
      } catch (err) {
        console.warn('Backend unreachable, attempting direct fetch fallback for:', endpoint);
        // Fallback for external APIs if backend is down (e.g. on GitHub Pages)
        if (endpoint.startsWith('/external/')) {
          const fallbackData = await fetchExternalDirectly(endpoint);
          if (fallbackData) return fallbackData;
        }
        return queueOfflineRequest(endpoint, options);
      }
    } else {
      console.log('Offline, queueing request');
      return queueOfflineRequest(endpoint, options);
    }
  }

  async function fetchExternalDirectly(endpoint) {
    try {
      if (endpoint.startsWith('/external/reports')) {
        const resp = await fetch('https://api.reliefweb.int/v2/reports?appname=mdaad_now&limit=5&filter[field]=primary_country&filter[value]=Lebanon&sort[]=date:desc&fields[include][]=title&fields[include][]=source&fields[include][]=url&fields[include][]=date');
        const data = await resp.json();
        return (data.data || []).map(item => ({
          id: 'rw-' + item.fields.url.split('/').pop(),
          category: 'Safety',
          description: item.fields.title,
          reported_by: item.fields.source[0]?.name || 'ReliefWeb',
          created_at: item.fields.date.created,
          is_verified: true,
          url: item.fields.url
        }));
      }
      
      if (endpoint === '/external/disasters/count') {
        const resp = await fetch('https://api.reliefweb.int/v2/disasters?appname=mdaad_now&preset=external&limit=0');
        const data = await resp.json();
        return { count: data.totalCount || 0 };
      }
      
      if (endpoint === '/external/hdx/presence') {
        const resp = await fetch('https://hapi.humdata.org/api/v2/coordination-context/operational-presence?app_identifier=mdaad_now&location_name=Lebanon&admin_level=0&output_format=json');
        const data = await resp.json();
        const orgs = new Set((data.data || []).map(i => i.org_name).filter(Boolean));
        return { count: orgs.size, source: 'OCHA HDX / 3W' };
      }
      
      if (endpoint === '/external/hdx/funding') {
        const resp = await fetch('https://hapi.humdata.org/api/v2/coordination-context/funding?app_identifier=mdaad_now&location_name=Lebanon&output_format=json');
        const data = await resp.json();
        let totalReq = 0, totalFund = 0;
        (data.data || []).forEach(i => {
          totalReq += (i.requirements_usd || 0);
          totalFund += (i.funding_usd || 0);
        });
        const percent = totalReq > 0 ? (totalFund / totalReq * 100) : 0;
        return { percent: Math.round(percent * 10) / 10, source: 'OCHA FTS' };
      }
      
      if (endpoint === '/external/unhcr/population') {
        const resp = await fetch('https://api.unhcr.org/stats/v1/population?year=2023&coa=LBN');
        const data = await resp.json();
        const records = data.data || [];
        const agg = {};
        records.forEach(r => {
          const total = parseInt(r.refugees || 0) + parseInt(r.asylum_seekers || 0);
          if (total > 0) {
            agg[r.coo_name] = (agg[r.coo_name] || 0) + total;
          }
        });
        return Object.entries(agg)
          .map(([coo, total]) => ({ coo, total }))
          .sort((a,b) => b.total - a.total)
          .slice(0,5);
      }
    } catch (err) {
      console.error('Direct fallback fetch failed:', err);
    }
    return null;
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
