// ─── Retra Live · Web Kristal Yükleme ───────────────────────────────────────
// 1) Retra ID → hesap önizlemesi (web_crystal_lookup)
// 2) Kredi Kartı paketleri (web_crystal_public) — fiyatlar sunucudan
// 3) "Güvenli Öde" → edge function `web-crystal` (init) → iyzico ödeme sayfası
// 4) iyzico dönüşü → bu sayfa ?order=… ile açılır, sonuç sunucudan okunur.
// Kart bilgisi bu sayfaya hiç gelmez; tutar istemciden gönderilmez.

const SUPABASE_URL = 'https://mwjyppehzqobmcrsmxlj.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13anlwcGVoenFvYm1jcnNteGxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxODYxOTksImV4cCI6MjEwNTc2MjE5OX0.OWXeMWkfzwftIJXGR4Pkr66mBq4IB5u6vM9T7I7Nx-0';

/**
 * Satıcı bilgileri — mesafeli satış için **kendi bilgilerinle doldur**
 * (şirket kurulunca unvan, adres, vergi no). Boş alanlar gösterilmez.
 */
const SELLER = {
  name: '',      // Örn. "Ad Soyad - Retra Live" / şirket unvanı
  address: '',   // İşletme adresi
  email: '',     // Destek e-postası
  phone: '',     // Destek telefonu
  taxInfo: '',   // Vergi dairesi / no
};

const params = new URLSearchParams(location.search);
const DEMO = params.get('demo') === '1';
const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('tr-TR');
const money = (n) => `${Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;

const store = {
  get(k) { try { return localStorage.getItem(`kristal_${k}`) || ''; } catch { return ''; } },
  set(k, v) { try { localStorage.setItem(`kristal_${k}`, v); } catch { /* yok */ } },
};

// ─── Sunucu ────────────────────────────────────────────────────────────────
async function rpc(fn, args = {}) {
  if (DEMO) return demo.rpc(fn, args);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`rpc ${fn} ${res.status}`);
  return res.json();
}
async function fn(body) {
  if (DEMO) return demo.fn(body);
  const res = await fetch(`${SUPABASE_URL}/functions/v1/web-crystal`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ error: 'Sunucuya ulaşılamadı.' }));
}

// Sunucusuz deneme (?demo=1)
const demo = {
  async rpc(name, a) {
    await new Promise((r) => setTimeout(r, 250));
    if (name === 'web_crystal_public') {
      return { enabled: true, mode: 'sandbox', packages: [
        { id: 'p1', crystals: 5000, price: 49 }, { id: 'p2', crystals: 15000, price: 147 },
        { id: 'p3', crystals: 30000, price: 294 }, { id: 'p4', crystals: 100000, price: 980 },
        { id: 'p5', crystals: 300000, price: 2940 }, { id: 'p6', crystals: 1000000, price: 9800 }] };
    }
    if (name === 'web_crystal_lookup') return a.p_id === '1001' ? { retra_id: '1001', username: 'Reyhan', avatar_url: '' } : null;
    if (name === 'web_crystal_order_status') return { status: 'paid', crystals: 15000, username: 'Reyhan', retra_id: '1001', mode: 'sandbox' };
    return null;
  },
  async fn() {
    await new Promise((r) => setTimeout(r, 500));
    return { ok: true, url: `${location.pathname}?demo=1&order=00000000-0000-0000-0000-000000000000` };
  },
};

// ─── Durum ─────────────────────────────────────────────────────────────────
const state = { user: null, packages: [], pack: null, busy: false, lookupSeq: 0 };

function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 2800);
}

function shortAmount(n) {
  if (n >= 1e6) return `${+(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M`;
  if (n >= 1e3) return `${+(n / 1e3).toFixed(n % 1e3 && n < 1e4 ? 1 : 0)}K`;
  return String(n);
}

function renderPacks() {
  const box = $('packs');
  box.innerHTML = '';
  if (!state.packages.length) {
    box.innerHTML = '<div class="muted">Şu an satışta paket yok.</div>';
    return;
  }
  // En iyi oran (kristal / TL) etiketlenir.
  // Yalnız gerçekten daha avantajlı tek paket varsa (oranlar eşitse etiket yok).
  let best = null;
  const ratios = state.packages.map((p) => p.crystals / p.price);
  const max = Math.max(...ratios), min = Math.min(...ratios);
  if (max > min * 1.001 && ratios.filter((r) => r >= max * 0.999).length === 1) {
    best = { id: state.packages[ratios.indexOf(max)].id };
  }
  for (const p of state.packages) {
    const el = document.createElement('button');
    el.className = `pack${state.pack?.id === p.id ? ' sel' : ''}`;
    el.innerHTML = `${best && best.id === p.id && state.packages.length > 2 ? '<span class="tag">En avantajlı</span>' : ''}
      <img src="./assets/kristal.png" alt="" />
      <span class="amt">${fmt(p.crystals)}<small>kristal</small></span>
      <span class="price">${money(p.price)}</span>`;
    el.onclick = () => { state.pack = p; renderPacks(); renderPay(); };
    box.appendChild(el);
  }
}

function renderPay() {
  const p = state.pack;
  $('pay-total').textContent = p ? money(p.price) : '—';
  $('pay-label').textContent = p
    ? `${fmt(p.crystals)} kristal${state.user ? ` → ${state.user.username}` : ''}`
    : 'Paket seç';
  $('pay-btn').disabled = !(p && state.user) || state.busy;
}

async function lookup() {
  const id = $('rid').value.replace(/\s/g, '');
  const hint = $('rid-hint');
  state.user = null;
  $('who').hidden = true;
  renderPay();
  if (id.length < 1) {
    hint.className = 'hint';
    hint.textContent = "ID'ni uygulamada profil sayfanda görebilirsin.";
    return;
  }
  const seq = ++state.lookupSeq;
  hint.className = 'hint';
  hint.textContent = 'Aranıyor…';
  try {
    const u = await rpc('web_crystal_lookup', { p_id: id });
    if (seq !== state.lookupSeq) return;
    if (!u) {
      hint.className = 'hint err';
      hint.textContent = 'Bu ID ile hesap bulunamadı. ID\'ni kontrol et.';
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
    hint.textContent = 'Kristaller bu hesaba yüklenecek.';
    renderPay();
  } catch {
    if (seq !== state.lookupSeq) return;
    hint.className = 'hint err';
    hint.textContent = 'Bağlantı hatası, tekrar dene.';
  }
}

async function pay() {
  if (state.busy || !state.pack || !state.user) return;
  const name = $('name').value.trim().replace(/\s+/g, ' ');
  const email = $('email').value.trim();
  const phone = $('phone').value.trim();
  if (name.split(' ').length < 2) return toast('Ad ve soyadını tam yaz.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Geçerli bir e-posta yaz.');
  if (!/^(90|0)?5\d{9}$/.test(phone.replace(/\D/g, ''))) return toast('Cep telefonunu 5xx xxx xx xx şeklinde yaz.');
  if (!$('agree').checked) return toast('Devam etmek için satış koşullarını onayla.');
  store.set('name', name); store.set('email', email); store.set('phone', phone);
  state.busy = true;
  const btn = $('pay-btn');
  btn.classList.add('busy'); btn.textContent = 'Yönlendiriliyor…';
  renderPay();
  const res = await fn({ action: 'init', id: state.user.retra_id, package_id: state.pack.id, name, email, phone });
  if (res?.ok && res.url) {
    location.href = res.url; // iyzico güvenli ödeme sayfası
    return;
  }
  state.busy = false;
  btn.classList.remove('busy'); btn.textContent = 'Güvenli Öde';
  renderPay();
  toast(res?.error || 'Ödeme başlatılamadı.');
}

// ─── Sonuç ekranı (iyzico dönüşü) ──────────────────────────────────────────
async function showResult(orderId) {
  document.body.classList.add('done');
  $('shop').hidden = true;
  $('result').hidden = false;
  const set = (icon, title, text) => { $('res-icon').textContent = icon; $('res-title').textContent = title; $('res-text').textContent = text; };
  for (let i = 0; i < 20; i++) {
    let o = null;
    try { o = await rpc('web_crystal_order_status', { p_order: orderId }); } catch { o = null; }
    if (o?.mode === 'sandbox') $('test-banner').hidden = false;
    if (o?.status === 'paid') {
      set('🎉', 'Kristalin yüklendi!', `${o.username} (ID ${o.retra_id}) hesabına eklendi. Uygulamayı açınca bakiyende görürsün.`);
      $('res-crystals').textContent = fmt(o.crystals);
      $('res-amount').hidden = false;
      return;
    }
    if (o?.status === 'failed') {
      set('⚠️', 'Ödeme tamamlanamadı', 'Kartından para çekilmediyse tekrar deneyebilirsin. Çekildiyse destek ekibine sipariş numaranla yaz: ' + orderId.slice(0, 8));
      return;
    }
    if (o?.status === 'review') {
      set('🕵️', 'Ödemen kontrol ediliyor', 'Ödeme alındı ve güvenlik kontrolünde. Onaylanınca kristal hesabına otomatik geçer. Sipariş: ' + orderId.slice(0, 8));
      return;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  set('⏳', 'Ödeme henüz doğrulanmadı', 'Kristal birkaç dakika içinde hesabına geçmezse destek ekibine sipariş numaranla yaz: ' + orderId.slice(0, 8));
}

function termsText() {
  const s = SELLER;
  const seller = [s.name, s.address, s.taxInfo, s.email && `E-posta: ${s.email}`, s.phone && `Telefon: ${s.phone}`].filter(Boolean);
  return `
    <p><b>Ürün:</b> Retra Live uygulamasında kullanılan dijital kristal. Fiziksel teslimat yoktur.</p>
    <p><b>Teslim:</b> Ödeme iyzico tarafından onaylandığında kristal, girdiğin ID'ye ait hesaba anında ve otomatik olarak yüklenir. Yanlış ID'ye yapılan yüklemeden alıcı sorumludur; ödemeden önce önizlemedeki hesabı kontrol et.</p>
    <p><b>Cayma hakkı:</b> Elektronik ortamda anında ifa edilen dijital içeriklerde, alıcının onayıyla ifaya başlandığında cayma hakkı kullanılamaz (Mesafeli Sözleşmeler Yönetmeliği m.15).</p>
    <p><b>Ödeme:</b> Kart bilgileri Retra'ya iletilmez; ödeme iyzico'nun güvenli ödeme sayfasında yapılır.</p>
    ${seller.length ? `<p><b>Satıcı:</b><br>${seller.map((x) => String(x).replace(/</g, '&lt;')).join('<br>')}</p>` : ''}`;
}

// ─── Başlat ────────────────────────────────────────────────────────────────
async function main() {
  const order = params.get('order');
  if (order && /^[0-9a-f-]{36}$/i.test(order)) {
    $('res-again').onclick = () => { location.href = location.pathname + (DEMO ? '?demo=1' : ''); };
    showResult(order);
    return;
  }
  if (params.get('err')) toast('Ödeme sayfasından dönüşte bir sorun oldu, tekrar dene.');

  $('rid').value = (params.get('id') || store.get('id')).replace(/[^\w-]/g, '');
  $('name').value = store.get('name');
  $('email').value = store.get('email');
  $('phone').value = store.get('phone');
  let t = null;
  $('rid').addEventListener('input', () => { clearTimeout(t); t = setTimeout(lookup, 450); });
  $('rid-btn').onclick = lookup;
  $('pay-btn').onclick = pay;
  $('terms-link').onclick = (e) => { e.preventDefault(); $('terms-body').innerHTML = termsText(); $('terms').hidden = false; $('terms-back').hidden = false; };
  const close = () => { $('terms').hidden = true; $('terms-back').hidden = true; };
  $('terms-close').onclick = close; $('terms-back').onclick = close;
  if (SELLER.name) $('company').textContent = SELLER.name;

  try {
    const cfg = await rpc('web_crystal_public');
    if (cfg?.mode === 'sandbox') $('test-banner').hidden = false;
    state.packages = (cfg?.packages || []).map((p) => ({ ...p, crystals: Number(p.crystals), price: Number(p.price) }));
    if (!cfg?.enabled) {
      $('packs').innerHTML = '<div class="muted">Web kristal satışı şu an kapalı. Kısa süre sonra tekrar dene.</div>';
      state.packages = [];
    } else {
      renderPacks();
    }
  } catch {
    $('packs').innerHTML = '<div class="muted">Paketler yüklenemedi. Sayfayı yenile.</div>';
  }
  if ($('rid').value) lookup();
  renderPay();
}

main();
