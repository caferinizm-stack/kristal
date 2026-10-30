// ─── Retra Live · Web Kristal Merkezi ───────────────────────────────────────
// 1) Retra ID → hesap önizlemesi (web_crystal_lookup) → "Devam et"
// 2) Paket seçilir (web_crystal_public) → "Devam et" → sunucu ID sahibine
//    uygulamada Retra Payment Asistan mesajıyla 5 haneli kod yollar
//    (web_crystal_code_request).
// 3) Kod girilir → web_crystal_code_verify. Ücretsiz pakette "Aktar"
//    (web_crystal_transfer) → 3D dekont; ücretli pakette "Satın al" →
//    kartla ödeme bağlanana kadar "yakında" (aktarma yapılmaz).
// Kristal miktarı, sınırlar ve kod kontrolü tamamen sunucuda.

const SUPABASE_URL = 'https://mwjyppehzqobmcrsmxlj.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13anlwcGVoenFvYm1jcnNteGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxODYxOTksImV4cCI6MjEwNTc2MjE5OX0.OWXeMWkfzwftIJXGR4Pkr66mBq4IB5u6vM9T7I7Nx-0';

const params = new URLSearchParams(location.search);
const DEMO = params.get('demo') === '1';
const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('tr-TR');
const money = (n) => `${Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
const store = {
  get(k) { try { return localStorage.getItem(`kristal_${k}`) || ''; } catch { return ''; } },
  set(k, v) { try { localStorage.setItem(`kristal_${k}`, v); } catch { /* yok */ } },
};

const ERR = {
  CLOSED: 'Kristal merkezi şu an kapalı.',
  NO_USER: 'Bu ID ile hesap bulunamadı.',
  NO_PACKAGE: 'Bu paket artık yok.',
  NOT_FREE: 'Bu paket ücretli; kartla ödeme yakında.',
  ALREADY: 'Bu ücretsiz paketi bu hesap zaten aldı.',
  ALREADY_TODAY: 'Bu paketi bugün aldın, yarın tekrar gel.',
  SOLD_OUT: 'Bu paketin stoğu bitti.',
  RATE: 'Çok fazla deneme yapıldı, biraz sonra tekrar dene.',
  NO_CODE: 'Kod isteği bulunamadı, yeni kod iste.',
  EXPIRED: 'Kodun süresi doldu, yeni kod iste.',
  LOCKED: 'Çok fazla yanlış deneme. Yeni kod iste.',
  NO_VERIFY: 'Önce uygulamadaki kodu doğrula.',
  USED: 'Bu kod zaten kullanıldı.',
  PAY_SOON: 'Kartla ödeme şu an kapalı.',
  NOT_PAID: 'Bu paket ücretsiz, "Aktar" ile alabilirsin.',
  SHOPIER: 'Ödeme sayfası açılamadı, biraz sonra tekrar dene.',
};
const errText = (t) => {
  const w = String(t).match(/WAIT:(\d+)/);
  if (w) return `Yeni kod için ${w[1]} sn bekle.`;
  for (const [k, v] of Object.entries(ERR)) if (String(t).includes(k)) return v;
  return 'İşlem yapılamadı, tekrar dene.';
};

// ─── Sunucu ────────────────────────────────────────────────────────────────
async function rpc(fn, args = {}) {
  if (DEMO) return demo(fn, args);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || `rpc ${fn} ${res.status}`);
  return body;
}

const demoClaimed = new Set();
const demoCodes = {};
async function demo(name, a) {
  await new Promise((r) => setTimeout(r, 300));
  if (name === 'web_crystal_public') {
    return { enabled: true, payments: params.get('pay') === '1', packages: [
      { id: 'f1', crystals: 15000, base_crystals: 10000, price: 0, is_free: true, max_claims: 50, left: 47, badge: 'Hoş geldin', bg_effect: 'fire', amount_effect: 'gold', price_effect: 'fire' },
      { id: 'f2', crystals: 500, base_crystals: 0, price: 0, is_free: true, max_claims: 20, left: 0 },
      { id: 'p1', crystals: 15000, base_crystals: 0, price: 147, is_free: false, bg_effect: 'neon', bg_color: '#3dbaff', amount_effect: 'neon', price_effect: 'pill' },
      { id: 'p2', crystals: 130000, base_crystals: 100000, price: 980, is_free: false, badge: '+%30', bg_effect: 'aurora', amount_effect: 'rainbow', price_effect: 'gold' },
      { id: 'p3', crystals: 400000, base_crystals: 300000, price: 2940, is_free: false, bg_effect: 'galaxy', amount_effect: 'ice', price_effect: 'stamp' },
      { id: 'p4', crystals: 1500000, base_crystals: 1000000, price: 9800, is_free: false, badge: 'En popüler', bg_effect: 'gold', amount_effect: 'fire', price_effect: 'pulse' },
      { id: 'p5', crystals: 3000000, base_crystals: 0, price: 19000, is_free: false, bg_effect: 'rainbow', amount_effect: 'shine', price_effect: 'neon' },
      { id: 'p6', crystals: 6000000, base_crystals: 0, price: 35000, is_free: false, bg_effect: 'ice', amount_effect: 'outline', price_effect: 'ice' },
      { id: 'p7', crystals: 9000000, base_crystals: 0, price: 50000, is_free: false, bg_effect: 'solid', bg_color: '#b0154a', amount_effect: 'pulse', price_effect: 'pill' },
      { id: 'p8', crystals: 12000000, base_crystals: 0, price: 70000, is_free: false, bg_effect: 'glass', amount_effect: 'gold', price_effect: 'rainbow' }] };
  }
  if (name === 'web_crystal_lookup') return a.p_id === '1001' ? { retra_id: '1001', username: 'Reyhan', avatar_url: '' } : null;
  if (name === 'web_crystal_code_request') {
    if (demoClaimed.has(a.p_package)) throw new Error('ALREADY');
    const id = `d${Date.now()}`;
    demoCodes[id] = { code: '12345', pack: a.p_package };
    toast('Demo: uygulamaya giden kod 12345');
    return { ok: true, request_id: id, expires_in: 600, username: 'Reyhan', retra_id: '1001' };
  }
  if (name === 'web_crystal_code_verify') {
    const r = demoCodes[a.p_request];
    if (!r) throw new Error('NO_CODE');
    if (a.p_code !== r.code) return { ok: false, error: 'WRONG', left: 3 };
    const p = (await demo('web_crystal_public')).packages.find((x) => x.id === r.pack);
    return { ok: true, token: 'demo-token', is_free: p.is_free, crystals: p.crystals };
  }
  if (name === 'web_crystal_transfer') {
    const r = demoCodes[a.p_request];
    const p = (await demo('web_crystal_public')).packages.find((x) => x.id === r.pack);
    if (!p.is_free) throw new Error('PAY_SOON');
    demoClaimed.add(p.id);
    return { ok: true, crystals: p.crystals, base_crystals: p.base_crystals, username: 'Reyhan', retra_id: '1001', receipt_no: 'RW-261030-A1B2C3' };
  }
  if (name === 'edge:shopier') {
    return { ok: true, order_id: 'demo-order', url: 'https://www.shopier.com/demo', receipt_no: 'RS-261030-DEMO01' };
  }
  if (name === 'web_crystal_shopier_status') {
    return Date.now() - (Number(a.at) || Date.now()) > 6000
      ? { status: 'paid', crystals: a.crystals, base_crystals: a.base, price: a.price, receipt_no: a.no, username: 'Reyhan', retra_id: '1001' }
      : { status: 'pending' };
  }
  return null;
}

// ─── Durum ─────────────────────────────────────────────────────────────────
// step: 1 = ID, 2 = paket, 3 = kod
const state = {
  user: null, packages: [], pack: null, busy: false, seq: 0, payments: false,
  step: 1, request: null, token: null, verified: false, resendAt: 0,
};

function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 2800);
}

function bonusPct(p) {
  const base = Number(p.base_crystals) || 0;
  return base > 0 && base < p.crystals ? Math.round(((p.crystals - base) / base) * 100) : 0;
}

function renderPacks() {
  const box = $('packs');
  box.innerHTML = '';
  if (!state.packages.length) {
    box.innerHTML = '<div class="muted">Şu an paket yok.</div>';
    return;
  }
  for (const p of state.packages) {
    const pct = bonusPct(p);
    const el = document.createElement('button');
    const max = Number(p.max_claims) || 0;
    const left = max > 0 ? Math.max(0, Number(p.left ?? max)) : null;
    const out = left === 0;
    el.className = `pack${p.is_free ? ' free' : ''}${pct ? ' bonus' : ''}${out ? ' out' : ''}${state.pack?.id === p.id ? ' sel' : ''}${p.bg_effect ? ` bg-${p.bg_effect}` : ''}`;
    if (/^#[0-9a-f]{6}$/i.test(p.bg_color || '')) el.style.setProperty('--pc', p.bg_color);
    // Stok: "Kalan 47/50" + doluluk çubuğu.
    const stock = max > 0
      ? `<span class="stock${out ? ' none' : left <= Math.max(3, max * 0.2) ? ' low' : ''}">
           <span class="stock-t">${out ? 'Tükendi' : `Kalan <b>${fmt(left)}</b>/${fmt(max)}`}</span>
           <i><u style="width:${Math.round((left / max) * 100)}%"></u></i>
         </span>`
      : '';
    const badge = p.badge || (p.is_free ? 'ÜCRETSİZ' : pct ? `+%${pct} BONUS` : '');
    el.innerHTML = `
      ${badge ? `<span class="tag">${String(badge).replace(/</g, '&lt;')}</span>` : ''}
      <span class="fx"></span>
      <img src="./assets/kristal.png" alt="" />
      ${pct ? `<s class="old">${fmt(p.base_crystals)}</s>` : ''}
      <span class="amt${p.amount_effect ? ` fx-${p.amount_effect}` : ''}">${fmt(p.crystals)}<small>kristal</small></span>
      ${pct ? `<span class="up">▲ +${fmt(p.crystals - p.base_crystals)} bonus</span>` : ''}
      <span class="price${p.price_effect ? ` fx-${p.price_effect}` : ''}">${p.is_free ? 'Ücretsiz' : money(p.price)}</span>
      ${stock}
      ${p.is_free ? '' : state.payments ? '<span class="lim pay">💳 Kartla öde</span>' : '<span class="lim soon">Kartla ödeme yakında</span>'}`;
    el.onclick = () => {
      if (state.busy) return;
      if (out) { toast('Bu paketin stoğu bitti.'); return; }
      if (state.pack?.id !== p.id) resetCode();
      state.pack = p;
      renderPacks();
      renderPay();
    };
    box.appendChild(el);
  }
}

// Paket ya da ID değişince kod adımı sıfırlanır.
function resetCode() {
  state.request = null;
  state.token = null;
  state.verified = false;
  if (state.step > 2) state.step = 2;
  $('code-card').hidden = true;
  $('code-ok').hidden = true;
  $('code-resend').hidden = false;
  const otp = $('otp');
  otp.className = 'otp';
  for (const i of otp.querySelectorAll('input')) { i.value = ''; i.disabled = false; }
}

function otpValue() {
  return [...$('otp').querySelectorAll('input')].map((i) => i.value).join('');
}

function renderPay() {
  const p = state.pack;
  const btn = $('pay-btn');
  const label = $('pay-label');
  const total = $('pay-total');
  const busy = state.busy;
  if (state.step === 1) {
    total.textContent = state.user ? state.user.username : '—';
    label.textContent = state.user ? `ID ${state.user.retra_id} · hesap bulundu` : 'Retra ID gir';
    btn.textContent = 'Devam et';
    btn.disabled = !state.user || busy;
    return;
  }
  total.textContent = p ? (p.is_free ? 'Ücretsiz' : money(p.price)) : '—';
  label.textContent = p ? `${fmt(p.crystals)} kristal → ${state.user?.username || ''}` : 'Paket seç';
  if (state.step === 2) {
    btn.textContent = busy ? 'Kod gönderiliyor…' : 'Devam et';
    btn.disabled = !p || busy;
    return;
  }
  if (!state.verified) {
    btn.textContent = busy ? 'Kontrol ediliyor…' : 'Kodu onayla';
    btn.disabled = otpValue().length !== 5 || busy;
    return;
  }
  btn.textContent = p?.is_free ? (busy ? 'Aktarılıyor…' : 'Aktar') : busy ? 'Ödeme açılıyor…' : '💳 Satın al';
  btn.disabled = busy;
}

function goStep(n) {
  state.step = n;
  $('pack-card').hidden = n < 2;
  $('code-card').hidden = n < 3;
  renderPay();
  const target = n === 2 ? $('pack-card') : n === 3 ? $('code-card') : null;
  if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
}

async function lookup() {
  const id = $('rid').value.replace(/\s/g, '');
  const hint = $('rid-hint');
  state.user = null;
  $('who').hidden = true;
  resetCode();
  if (state.step > 1) goStep(1);
  renderPay();
  if (!id) {
    hint.className = 'hint';
    hint.textContent = "ID'ni uygulamada profil sayfanda görebilirsin.";
    return;
  }
  const seq = ++state.seq;
  hint.className = 'hint';
  hint.textContent = 'Aranıyor…';
  try {
    const u = await rpc('web_crystal_lookup', { p_id: id });
    if (seq !== state.seq) return;
    if (!u) {
      hint.className = 'hint err';
      hint.textContent = "Bu ID ile hesap bulunamadı. ID'ni kontrol et.";
      return;
    }
    state.user = u;
    store.set('id', id);
    $('who-name').textContent = u.username || 'Kullanıcı';
    $('who-id').textContent = `ID: ${u.retra_id}`;
    const av = $('who-av');
    const url = String(u.avatar_url || '');
    if (/^https:\/\//.test(url)) { av.style.backgroundImage = `url("${url.replace(/"/g, '')}")`; av.textContent = ''; }
    else { av.style.backgroundImage = ''; av.textContent = (u.username || '?').slice(0, 1).toUpperCase(); }
    $('who').hidden = false;
    hint.textContent = 'Hesabın bu mu? "Devam et" ile paketini seç.';
    renderPay();
  } catch {
    if (seq !== state.seq) return;
    hint.className = 'hint err';
    hint.textContent = 'Bağlantı hatası, tekrar dene.';
  }
}

// Yeni kod düğmesi için geri sayım.
function tickResend() {
  const b = $('code-resend');
  const left = Math.ceil((state.resendAt - Date.now()) / 1000);
  if (left > 0 && !state.verified) {
    b.disabled = true;
    b.textContent = `Yeni kod (${left})`;
    clearTimeout(tickResend.t);
    tickResend.t = setTimeout(tickResend, 1000);
  } else {
    b.disabled = false;
    b.hidden = state.verified;
    b.textContent = 'Yeni kod gönder';
  }
}

async function requestCode() {
  const p = state.pack;
  if (state.busy || !p || !state.user) return;
  state.busy = true;
  renderPay();
  try {
    const r = await rpc('web_crystal_code_request', { p_retra_id: state.user.retra_id, p_package: p.id });
    resetCode();
    state.request = r.request_id;
    state.resendAt = Date.now() + 60000;
    $('code-who').textContent = `${r.username || state.user.username} hesabına`;
    $('code-hint').className = 'hint';
    $('code-hint').textContent = 'Kod 10 dakika geçerli.';
    goStep(3);
    tickResend();
    setTimeout(() => $('otp').querySelector('input').focus(), 350);
  } catch (e) {
    toast(errText(e?.message));
  } finally {
    state.busy = false;
    renderPay();
  }
}

async function verifyCode() {
  const code = otpValue();
  if (state.busy || code.length !== 5 || !state.request) return;
  state.busy = true;
  renderPay();
  const otp = $('otp');
  const hint = $('code-hint');
  try {
    const r = await rpc('web_crystal_code_verify', { p_request: state.request, p_code: code });
    if (!r?.ok) {
      otp.className = 'otp bad';
      setTimeout(() => (otp.className = 'otp'), 400);
      hint.className = 'hint err';
      hint.textContent = r?.left > 0 ? `Kod yanlış. ${r.left} deneme hakkın kaldı.` : 'Kod yanlış. Yeni kod iste.';
      for (const i of otp.querySelectorAll('input')) i.value = '';
      otp.querySelector('input').focus();
      return;
    }
    state.token = r.token;
    state.verified = true;
    otp.className = 'otp ok';
    for (const i of otp.querySelectorAll('input')) i.disabled = true;
    $('code-ok').hidden = false;
    $('code-ok').textContent = '✓ Kod doğrulandı';
    hint.className = 'hint';
    hint.textContent = state.pack?.is_free ? '"Aktar" ile kristal hesabına geçer.' : (state.payments ? '"Satın al" ile Shopier güvenli ödeme sayfası açılır.' : 'Kartla ödeme çok yakında açılacak.');
    tickResend();
  } catch (e) {
    hint.className = 'hint err';
    hint.textContent = errText(e?.message);
  } finally {
    state.busy = false;
    renderPay();
  }
}

async function transfer() {
  const p = state.pack;
  if (state.busy || !p || !state.verified) return;
  if (!p.is_free) {
    if (!state.payments) { toast('Kartla ödeme çok yakında. Şimdilik ücretsiz paketleri alabilirsin.'); return; }
    return checkout(p);
  }
  state.busy = true;
  renderPay();
  try {
    const r = await rpc('web_crystal_transfer', { p_request: state.request, p_token: state.token });
    showReceipt(r, p);
  } catch (e) {
    toast(errText(e?.message));
  } finally {
    state.busy = false;
    renderPay();
  }
}

// ─── Kartla ödeme (Shopier) ────────────────────────────────────────────────
async function edge(name, body) {
  if (DEMO) return demo(`edge:${name}`, body);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j) throw new Error(j?.error || `edge ${res.status}`);
  return j;
}

async function checkout(p) {
  if (state.busy) return;
  state.busy = true;
  renderPay();
  // Açılır pencere engellenmesin: sekme dokunuş anında açılır, link sonra verilir.
  let win = null;
  try { win = DEMO ? null : window.open('', '_blank'); } catch { win = null; }
  try {
    const r = await edge('shopier', { action: 'checkout', request_id: state.request, token: state.token });
    if (!r?.url || !/^https:\/\//.test(r.url) && !DEMO) throw new Error(r?.error || 'SHOPIER');
    let opened = false;
    if (win && !win.closed) { try { win.location.href = r.url; opened = true; } catch { opened = false; } }
    startWaiting({ id: r.order_id, url: r.url, no: r.receipt_no || '', crystals: p.crystals, base: p.base_crystals, price: p.price, at: Date.now() }, opened);
  } catch (e) {
    try { win?.close(); } catch { /* yok */ }
    toast(errText(e?.message));
  } finally {
    state.busy = false;
    renderPay();
  }
}

const WAIT_MS = 2 * 60 * 60 * 1000; // 2 saat sonra bekleme bırakılır
function startWaiting(o, opened) {
  store.set('pending', JSON.stringify(o));
  $('shop').hidden = true;
  $('paying').hidden = false;
  document.body.classList.add('done');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  $('pw-sum').textContent = `${fmt(o.crystals)} kristal · ${money(o.price)}`;
  $('pw-no').textContent = o.no ? `Sipariş no: ${o.no}` : '';
  const link = $('pw-open');
  link.href = o.url || '#';
  link.textContent = opened ? '💳 Ödeme sayfasını tekrar aç' : '💳 Ödeme sayfasını aç';
  $('pw-text').textContent = opened
    ? 'Shopier güvenli ödeme sayfası yeni sekmede açıldı. Ödemeyi tamamladığın an kristalin otomatik yüklenecek ve dekontun burada açılacak.'
    : 'Aşağıdaki düğmeyle Shopier güvenli ödeme sayfasını aç. Ödemeyi tamamladığın an kristalin otomatik yüklenecek ve dekontun burada açılacak.';
  $('pw-cancel').onclick = () => { store.set('pending', ''); location.href = location.pathname + (DEMO ? '?demo=1' : ''); };
  clearTimeout(startWaiting.t);
  const poll = async () => {
    if (Date.now() - o.at > WAIT_MS) { store.set('pending', ''); $('pw-text').textContent = 'Ödeme gelmedi. Ödeme yaptıysan birkaç dakika içinde kristalin yine yüklenecek; uygulamadaki Retra Payment Asistan mesajını kontrol et.'; return; }
    try {
      const st = DEMO ? await demo('web_crystal_shopier_status', o) : await rpc('web_crystal_shopier_status', { p_order: o.id });
      if (st?.status === 'paid') {
        store.set('pending', '');
        $('paying').hidden = true;
        showReceipt(st, { is_free: false, price: Number(st.price) || o.price, crystals: o.crystals });
        return;
      }
      if (st?.status === 'failed') {
        store.set('pending', '');
        toast('Ödeme sayfası açılamadı, tekrar dene.');
        setTimeout(() => { location.href = location.pathname; }, 1800);
        return;
      }
    } catch { /* bağlantı: tekrar dene */ }
    startWaiting.t = setTimeout(poll, document.hidden ? 6000 : 3000);
  };
  startWaiting.t = setTimeout(poll, 2500);
}

function resumeWaiting() {
  try {
    const o = JSON.parse(store.get('pending') || 'null');
    if (o?.id && Date.now() - Number(o.at) < WAIT_MS) { startWaiting(o, true); return true; }
  } catch { /* yok */ }
  return false;
}

function onPay() {
  if (state.step === 1) return state.user && goStep(2);
  if (state.step === 2) return requestCode();
  return state.verified ? transfer() : verifyCode();
}

function setupOtp() {
  const boxes = [...$('otp').querySelectorAll('input')];
  const fill = (start, digits) => {
    let i = start;
    for (const d of digits) { if (i >= boxes.length) break; boxes[i++].value = d; }
    (boxes[Math.min(i, boxes.length - 1)]).focus();
    renderPay();
    if (otpValue().length === 5) verifyCode();
  };
  boxes.forEach((box, idx) => {
    box.addEventListener('input', () => {
      const digits = box.value.replace(/\D/g, '');
      box.value = '';
      if (digits) fill(idx, digits); else renderPay();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) { boxes[idx - 1].value = ''; boxes[idx - 1].focus(); renderPay(); }
      if (e.key === 'Enter') onPay();
    });
    box.addEventListener('paste', (e) => {
      const digits = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
      if (!digits) return;
      e.preventDefault();
      fill(0, digits.slice(0, 5));
    });
  });
  $('code-resend').onclick = () => { if (!state.verified) requestCode(); };
}

// ─── 3D dekont ─────────────────────────────────────────────────────────────
function showReceipt(r, p) {
  document.body.classList.add('done');
  $('shop').hidden = true;
  $('result').hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const crystals = Number(r.crystals) || p.crystals;
  const base = Number(r.base_crystals) || 0;
  $('rc-user').textContent = `${r.username} · ID ${r.retra_id}`;
  $('rc-no').textContent = r.receipt_no || '-';
  $('rc-price').textContent = p.is_free ? 'Ücretsiz' : money(p.price);
  $('rc-date').textContent = new Date().toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
  if (base > 0 && base < crystals) {
    $('rc-base').textContent = `${fmt(base)} kristal`;
    $('rc-base').hidden = false;
    $('rc-bonus').textContent = `▲ +${fmt(crystals - base)} bonus kristal (+%${Math.round(((crystals - base) / base) * 100)})`;
    $('rc-bonus').hidden = false;
  }
  // Sayı yukarı sayar.
  const el = $('rc-crystals');
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 1200);
    el.textContent = fmt(crystals * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  // Parmağa / fareye göre 3D eğim.
  const card = $('receipt');
  const tilt = (x, y) => {
    const rect = card.getBoundingClientRect();
    const rx = ((y - rect.top) / rect.height - 0.5) * -14;
    const ry = ((x - rect.left) / rect.width - 0.5) * 18;
    card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    card.style.setProperty('--sx', `${((x - rect.left) / rect.width) * 100}%`);
  };
  card.addEventListener('pointermove', (e) => tilt(e.clientX, e.clientY));
  card.addEventListener('pointerleave', () => { card.style.transform = ''; });
}

const normalize = (list) => (list || []).map((p) => ({
  ...p, crystals: Number(p.crystals), base_crystals: Number(p.base_crystals) || 0, price: Number(p.price),
  max_claims: Number(p.max_claims) || 0, left: p.left == null ? null : Number(p.left),
  bg_effect: safeKey(p.bg_effect), amount_effect: safeKey(p.amount_effect), price_effect: safeKey(p.price_effect),
}));

// Efekt adları yalnız harf (sunucu zaten izin listesiyle doğrular).
const safeKey = (v) => (/^[a-z]{1,12}$/.test(String(v || '')) ? String(v) : '');

// Admin'in paket / efekt değişiklikleri sayfayı yenilemeden yansısın.
let lastPacks = '';
async function refreshPackages() {
  try {
    const cfg = await rpc('web_crystal_public');
    if (!cfg?.enabled) return;
    const pay = cfg.payments === true;
    const sig = JSON.stringify(cfg.packages || []) + pay;
    state.payments = pay;
    if (sig === lastPacks) return;
    lastPacks = sig;
    state.packages = normalize(cfg.packages);
    if (state.pack) {
      const fresh = state.packages.find((x) => x.id === state.pack.id);
      if (fresh) state.pack = fresh;
    }
    renderPacks();
    renderPay();
  } catch { /* sonraki turda tekrar */ }
}

// ─── Başlat ────────────────────────────────────────────────────────────────
async function main() {
  $('rid').value = (params.get('id') || store.get('id')).replace(/[^\w-]/g, '');
  let t = null;
  $('rid').addEventListener('input', () => { clearTimeout(t); t = setTimeout(lookup, 450); });
  $('rid-btn').onclick = lookup;
  $('pay-btn').onclick = onPay;
  setupOtp();
  $('res-again').onclick = () => { location.href = location.pathname + (DEMO ? '?demo=1' : ''); };

  try {
    const cfg = await rpc('web_crystal_public');
    state.payments = cfg?.payments === true;
    lastPacks = JSON.stringify(cfg?.packages || []) + (cfg?.payments === true);
    state.packages = normalize(cfg?.packages);
    if (!cfg?.enabled) {
      $('packs').innerHTML = '<div class="muted">Kristal merkezi şu an kapalı. Kısa süre sonra tekrar dene.</div>';
      state.packages = [];
    } else {
      renderPacks();
    }
  } catch {
    $('packs').innerHTML = '<div class="muted">Paketler yüklenemedi. Sayfayı yenile.</div>';
  }
  if (resumeWaiting()) return;
  if ($('rid').value) lookup();
  renderPay();
  setInterval(() => { if (!document.hidden && !$('shop').hidden) refreshPackages(); }, 20000);
}

main();
