/* ============ MyPos — interactions ============ */
(function(){
  'use strict';
  document.documentElement.classList.add('js');

  /* ---- header scroll state ---- */
  const hdr = document.getElementById('hdr');
  const onHdr = () => hdr.classList.toggle('scrolled', window.scrollY > 16);
  onHdr();
  window.addEventListener('scroll', onHdr, {passive:true});

  /* ---- mobile burger ---- */
  const burger = document.getElementById('burger');
  const mnav = document.getElementById('mnav');
  if (burger && mnav){
    const close = () => { mnav.classList.remove('open'); burger.setAttribute('aria-expanded','false'); };
    burger.addEventListener('click', () => {
      const open = mnav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mnav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  }

  /* ---- scroll-based reveal (no IntersectionObserver dependency) ---- */
  const reveals = Array.from(document.querySelectorAll('.reveal'));
  function checkReveals(){
    const vh = window.innerHeight || document.documentElement.clientHeight;
    for (let i = reveals.length - 1; i >= 0; i--){
      const el = reveals[i];
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.9 && r.bottom > 0){
        el.classList.add('in');
        reveals.splice(i, 1);
      }
    }
  }
  /* ---- counters ---- */
  function formatNum(n){ return Math.round(n).toLocaleString('ru-RU').replace(/\u00A0/g,' '); }
  const counters = Array.from(document.querySelectorAll('.num[data-to]'));
  function runCounter(el){
    const to = parseFloat(el.dataset.to), suf = el.dataset.suf || '', pre = el.dataset.pre || '', dur = 1500, start = performance.now();
    (function tick(t){
      const p = Math.min((t - start)/dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + formatNum(to * e) + suf;
      if (p < 1) requestAnimationFrame(tick);
    })(performance.now());
  }
  function checkCounters(){
    const vh = window.innerHeight || document.documentElement.clientHeight;
    for (let i = counters.length - 1; i >= 0; i--){
      const r = counters[i].getBoundingClientRect();
      if (r.top < vh * 0.85 && r.bottom > 0){ runCounter(counters[i]); counters.splice(i,1); }
    }
  }
  function tickAll(){ checkReveals(); checkCounters(); }
  window.addEventListener('scroll', tickAll, {passive:true});
  window.addEventListener('resize', tickAll);
  // initial passes (cover late layout / font load)
  requestAnimationFrame(tickAll);
  setTimeout(tickAll, 120);
  setTimeout(tickAll, 600);
  window.addEventListener('load', tickAll);
  // hard safety: never leave content hidden even if scroll math/throttling misbehaves
  setTimeout(() => { reveals.forEach(el => el.classList.add('in')); reveals.length = 0; }, 2200);

  /* ---- build a faux QR code grid (reusable) ---- */
  function buildQR(el){
    if (!el || el.children.length) return;
    const N = 11;
    const corner = (r,c) => (r<3&&c<3)||(r<3&&c>=N-3)||(r>=N-3&&c<3);
    const pat = [0b11111000111,0b10001011101,0b10101010001,0b10101001101,0b10001011001,
                 0b11111010101,0b00000011010,0b11011000111,0b01010111001,0b10110010101,0b11001011101];
    for (let r=0;r<N;r++) for (let c=0;c<N;c++){
      const i = document.createElement('i');
      let on;
      if (corner(r,c)){
        const rr = r<3? r : r-(N-3), cc = c<3? c : c-(N-3);
        on = (rr===0||rr===2||cc===0||cc===2)||(rr===1&&cc===1);
      } else on = (pat[r] >> (N-1-c)) & 1;
      if (!on) i.classList.add('off');
      el.appendChild(i);
    }
  }
  buildQR(document.getElementById('qr'));
  buildQR(document.getElementById('b2Qr'));
  buildQR(document.getElementById('rcQr'));

  /* ---- QR payment scene loop ---- */
  const scene = document.getElementById('scene');
  if (scene){
    const mStatus = document.getElementById('mStatus');
    const ppSt = document.getElementById('ppSt');
    let timers = [];
    const clearT = () => { timers.forEach(clearTimeout); timers = []; };
    const setStatus = (m,p) => { if(mStatus)mStatus.textContent=m; if(ppSt)ppSt.textContent=p; };
    function cycle(){
      clearT();
      scene.classList.remove('s-scan','s-done');
      setStatus('Отсканируйте QR','Наведите камеру на QR');
      timers.push(setTimeout(()=>{ scene.classList.add('s-scan'); setStatus('Ожидание оплаты…','Сканирование QR…'); }, 900));
      timers.push(setTimeout(()=>{ scene.classList.remove('s-scan'); scene.classList.add('s-done'); setStatus('Оплата получена','Оплата прошла ✓'); }, 3400));
      timers.push(setTimeout(()=>{ setStatus('Выдача товара…','Готово'); }, 4400));
      timers.push(setTimeout(cycle, 6600));
    }
    cycle();
  }

  /* ---- real-time crediting demo ---- */
  const flow = document.getElementById('flowDemo');
  if (flow){
    const posAmt = document.getElementById('posAmt');
    const posState = document.getElementById('posState');
    const posCardBrand = document.getElementById('posCardBrand');
    const dashBal = document.getElementById('dashBal');
    const dashList = document.getElementById('dashList');
    const bars = Array.from(document.querySelectorAll('#dashBars span'));
    const fmt = n => n.toLocaleString('ru-RU').replace(/\u00A0/g,' ') + ' ₸';

    const TX = [
      {m:'Кофейный аппарат №12', method:'VISA', amt:1500, ic:'coffee'},
      {m:'Автомойка «Аква»',     method:'Kaspi QR', amt:2000, ic:'car'},
      {m:'Снековый автомат №7',  method:'Mastercard', amt:850, ic:'snack'},
      {m:'Водомат №3',           method:'Halyk QR', amt:500, ic:'drop'},
      {m:'Кофепоинт «Утро»',     method:'Apple Pay', amt:1200, ic:'coffee'}
    ];
    const ICONS = {
      coffee:'<path d="M4 8h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M17 9h2a2 2 0 0 1 0 4h-2"/><path d="M7 3v2M11 3v2"/>',
      car:'<path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13"/><path d="M4 13h16v4H4z"/><circle cx="7.5" cy="17.5" r="1.2"/><circle cx="16.5" cy="17.5" r="1.2"/>',
      snack:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h2M9 11h2M9 15h2"/>',
      drop:'<path d="M12 3s6 6.5 6 10a6 6 0 0 1-12 0c0-3.5 6-10 6-10Z"/>'
    };
    const svgIc = k => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(ICONS[k]||ICONS.snack)+'</svg>';

    // seed bars
    bars.forEach(b => b.style.height = (28 + Math.random()*55) + '%');
    // seed dashboard with a few prior operations
    const SEED = [
      {...TX[2], t:'3 мин назад'}, {...TX[3], t:'8 мин назад'}, {...TX[0], t:'15 мин назад'}
    ];
    function rowHTML(t, timeLabel, isNew){
      return '<div class="tx'+(isNew?' new':'')+'">'+
        '<span class="tx-ic">'+svgIc(t.ic)+'</span>'+
        '<div class="tx-main"><div class="tx-name">'+t.m+'</div>'+
        '<div class="tx-meta"><span class="tx-method">'+t.method+'</span>'+(timeLabel)+'</div></div>'+
        '<div class="tx-amt">+'+fmt(t.amt)+'</div></div>';
    }
    dashList.innerHTML = SEED.map(s => rowHTML(s, s.t, false)).join('');

    let balance = 184500;
    let idx = 0, hot = 0;
    let timers = [];
    const clearT = () => { timers.forEach(clearTimeout); timers = []; };

    function step(){
      clearT();
      const t = TX[idx % TX.length];
      flow.classList.remove('fd-tap','fd-approved','fd-send');
      posAmt.textContent = fmt(t.amt);
      if (posCardBrand) posCardBrand.textContent = (t.method==='Kaspi QR'||t.method==='Halyk QR'||t.method==='Apple Pay') ? 'NFC' : t.method;
      posState.textContent = 'Приложите карту';

      timers.push(setTimeout(()=>{ flow.classList.add('fd-tap'); posState.textContent = 'Считывание карты…'; }, 900));
      timers.push(setTimeout(()=>{ flow.classList.add('fd-approved'); posState.textContent = '✓ Одобрено'; }, 2100));
      timers.push(setTimeout(()=>{ flow.classList.add('fd-send'); }, 2500));
      timers.push(setTimeout(()=>{
        // money lands in dashboard
        balance += t.amt;
        dashBal.textContent = fmt(balance);
        dashBal.classList.add('pop');
        setTimeout(()=> dashBal.classList.remove('pop'), 260);
        // new row
        dashList.insertAdjacentHTML('afterbegin', rowHTML(t, 'только что', true));
        while (dashList.children.length > 4) dashList.removeChild(dashList.lastElementChild);
        // bump a bar
        bars.forEach(b => b.classList.remove('hot'));
        const bar = bars[hot % bars.length];
        if (bar){ bar.style.height = (60 + Math.random()*38) + '%'; bar.classList.add('hot'); }
        hot++;
        idx++;
      }, 3500));
      timers.push(setTimeout(step, 5600));
    }
    step();
  }

  /* ---- Block 2 · interactive payment ---- */
  const b2 = document.getElementById('flowDemo2');
  if (b2){
    const device = document.getElementById('b2Device');
    const amtEl = document.getElementById('b2Amt');
    const tabs = document.getElementById('b2Tabs');
    const keys = document.getElementById('b2Keys');
    const accept = document.getElementById('b2Accept');
    const cancel = document.getElementById('b2Cancel');
    const procAmt = document.getElementById('b2ProcAmt');
    const procState = document.getElementById('b2ProcState');
    const procBrand = document.getElementById('b2ProcBrand');
    const bal = document.getElementById('b2Bal');
    const list = document.getElementById('b2List');
    const bars = Array.from(document.querySelectorAll('#b2Bars span'));
    const receipt = document.getElementById('b2Receipt');
    const rcMethod = document.getElementById('rcMethod');
    const rcAmt = document.getElementById('rcAmt');
    const rcTotal = document.getElementById('rcTotal');
    const rcTime = document.getElementById('rcTime');
    const fmt = n => n.toLocaleString('ru-RU').replace(/\u00A0/g,' ') + ' ₸';

    const SVG = {
      card:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
      qr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M21 21v-4M17 21h.01"/></svg>'
    };

    let raw = '', amount = 0, method = 'qr', balance = 184500, hot = 0;
    let timers = [];
    const clearT = () => { timers.forEach(clearTimeout); timers = []; };

    function renderAmt(){
      amtEl.textContent = amount > 0 ? fmt(amount) : '0\u00A0₸';
      accept.disabled = amount <= 0;
    }
    function setRaw(s){
      raw = s.replace(/^0+/, '').slice(0, 7);
      amount = parseInt(raw || '0', 10);
      renderAmt();
    }
    renderAmt();

    // seed dashboard
    bars.forEach(b => b.style.height = (26 + Math.random()*52) + '%');
    function rowHTML(amt, m, time, isNew){
      const name = m === 'card' ? 'Платёж картой' : 'Платёж по QR';
      const badge = m === 'card' ? 'VISA •• 4921' : 'Kaspi QR';
      return '<div class="tx'+(isNew?' new':'')+'">'+
        '<span class="tx-ic">'+SVG[m==='card'?'card':'qr']+'</span>'+
        '<div class="tx-main"><div class="tx-name">'+name+'</div>'+
        '<div class="tx-meta"><span class="tx-method">'+badge+'</span>'+time+'</div></div>'+
        '<div class="tx-amt">+'+fmt(amt)+'</div></div>';
    }
    list.innerHTML = rowHTML(1500,'card','6 мин назад',false) + rowHTML(500,'qr','12 мин назад',false);

    // keypad
    keys.addEventListener('click', e => {
      const btn = e.target.closest('button'); if (!btn) return;
      const k = btn.dataset.k;
      if (k === 'del') setRaw(raw.slice(0, -1));
      else setRaw(raw + k);
    });
    // method tabs
    tabs.addEventListener('click', e => {
      const btn = e.target.closest('button'); if (!btn) return;
      method = btn.dataset.m;
      tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === btn));
      device.classList.toggle('m-card', method === 'card');
      device.classList.toggle('m-qr', method === 'qr');
    });

    function reset(){
      clearT();
      device.classList.remove('processing','tap','scan','approved','bankpick');
      if (receipt) receipt.classList.remove('show');
      setRaw('');
    }
    function bumpBar(){
      bars.forEach(b => b.classList.remove('hot'));
      const bar = bars[hot % bars.length];
      if (bar){ bar.style.height = (58 + Math.random()*40) + '%'; bar.classList.add('hot'); }
      hot++;
    }
    function showReceipt(amt, m){
      if (!receipt) return;
      rcMethod.textContent = m === 'card' ? 'Картой' : 'Kaspi QR';
      rcAmt.textContent = fmt(amt);
      rcTotal.textContent = fmt(amt);
      const now = new Date();
      const p = n => String(n).padStart(2,'0');
      rcTime.textContent = p(now.getDate())+'.'+p(now.getMonth()+1)+'.'+now.getFullYear()+' · '+p(now.getHours())+':'+p(now.getMinutes());
      receipt.classList.add('show');
    }
    function land(amt, m){
      b2.classList.add('fd-send');
      setTimeout(() => b2.classList.remove('fd-send'), 1100);
      balance += amt;
      bal.textContent = fmt(balance);
      bal.classList.add('pop');
      setTimeout(() => bal.classList.remove('pop'), 260);
      list.insertAdjacentHTML('afterbegin', rowHTML(amt, m, 'только что', true));
      while (list.children.length > 4) list.removeChild(list.lastElementChild);
      bumpBar();
      showReceipt(amt, m);
    }

    accept.addEventListener('click', () => {
      if (amount <= 0) return;
      const amt = amount, m = method;
      clearT();
      device.classList.remove('tap','scan','approved');
      device.classList.add('processing');
      procAmt.textContent = fmt(amt);
      if (m === 'card'){
        procBrand.textContent = 'MyPos · POS-терминал';
        procState.textContent = 'Приложите карту';
        timers.push(setTimeout(() => { device.classList.add('tap'); procState.textContent = 'Считывание карты…'; }, 700));
        timers.push(setTimeout(() => { device.classList.add('approved'); procState.textContent = '✓ Одобрено'; }, 1900));
        timers.push(setTimeout(() => land(amt, m), 2500));
      } else {
        procBrand.textContent = 'MyPos · Kaspi/Halyk QR';
        procState.textContent = 'Выберите способ оплаты';
        device.classList.add('bankpick');
        const banks = device.querySelectorAll('.bankpick .bp-bank');
        banks.forEach(x => x.classList.remove('pick'));
        // auto-highlight a bank, then proceed
        timers.push(setTimeout(() => { banks[Math.random()<0.5?0:1].classList.add('pick'); }, 700));
        timers.push(setTimeout(() => { device.classList.remove('bankpick'); device.classList.add('scan'); procState.textContent = 'Сканирование QR…'; }, 1600));
        timers.push(setTimeout(() => { device.classList.add('approved'); procState.textContent = '✓ Оплачено'; }, 3100));
        timers.push(setTimeout(() => land(amt, m), 3700));
      }
      timers.push(setTimeout(reset, (m === 'card' ? 2500 : 3700) + 3600));
    });
    cancel.addEventListener('click', reset);
  }

  /* ---- Block 3 · interactive payment → real cabinet (clone) ---- */
  const b3 = document.getElementById('flowDemo3');
  if (b3){
    const device = document.getElementById('b3Device');
    const amtEl = document.getElementById('b3Amt');
    const tabs = document.getElementById('b3Tabs');
    const keys = document.getElementById('b3Keys');
    const accept = document.getElementById('b3Accept');
    const cancel = document.getElementById('b3Cancel');
    const procAmt = document.getElementById('b3ProcAmt');
    const procState = document.getElementById('b3ProcState');
    const procBrand = document.getElementById('b3ProcBrand');
    const receipt = document.getElementById('b3Receipt');
    const rcMethod = document.getElementById('rc3Method');
    const rcAmt = document.getElementById('rc3Amt');
    const rcTotal = document.getElementById('rc3Total');
    const rcTime = document.getElementById('rc3Time');
    const toast = document.getElementById('b3Toast');
    const toastAmt = document.getElementById('b3ToastAmt');
    const toastM = document.getElementById('b3ToastM');
    const turnoverEl = document.getElementById('b3Turnover');
    const pcountEl = document.getElementById('b3Pcount');
    const kaspiEl = document.getElementById('b3KaspiAmt');
    const boxEl = document.getElementById('b3BoxAmt');
    let cabTurnover = 4200, cabCount = 7, cabBox = 2400;
    const fmt = n => n.toLocaleString('ru-RU').replace(/\u00A0/g,' ') + ' ₸';

    let raw = '', amount = 0, method = 'qr';
    let timers = [];
    const clearT = () => { timers.forEach(clearTimeout); timers = []; };
    function renderAmt(){ amtEl.textContent = amount > 0 ? fmt(amount) : '0\u00A0₸'; accept.disabled = amount <= 0; }
    function setRaw(s){ raw = s.replace(/^0+/, '').slice(0, 7); amount = parseInt(raw || '0', 10); renderAmt(); }
    renderAmt();

    keys.addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return;
      if (b.dataset.k === 'del') setRaw(raw.slice(0,-1)); else setRaw(raw + b.dataset.k); });
    tabs.addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return;
      method = b.dataset.m; tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x===b));
      device.classList.toggle('m-card', method==='card'); device.classList.toggle('m-qr', method==='qr'); });

    function reset(){ clearT(); device.classList.remove('processing','tap','scan','approved','bankpick'); if(receipt) receipt.classList.remove('show'); setRaw(''); }
    function showReceipt(amt, m){ if(!receipt) return;
      rcMethod.textContent = m==='card'?'Картой':'Kaspi QR'; rcAmt.textContent = fmt(amt); rcTotal.textContent = fmt(amt);
      const n=new Date(), p=x=>String(x).padStart(2,'0');
      rcTime.textContent = p(n.getDate())+'.'+p(n.getMonth()+1)+'.'+n.getFullYear()+' · '+p(n.getHours())+':'+p(n.getMinutes());
      receipt.classList.add('show'); }
    function land(amt, m){
      b3.classList.add('fd-send'); setTimeout(()=>b3.classList.remove('fd-send'),1100);
      // live update on the real cabinet phone
      if (toast){ toastAmt.textContent='+'+fmt(amt); toastM.textContent=(m==='card'?'Картой':'Kaspi QR')+' · только что';
        toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'), 2600); }
      // bump turnover + payment count + breakdowns
      cabTurnover += amt; cabCount += 1; cabBox += amt;
      if (turnoverEl){ turnoverEl.textContent = fmt(cabTurnover); turnoverEl.classList.add('pop'); setTimeout(()=>turnoverEl.classList.remove('pop'),260); }
      if (pcountEl) pcountEl.textContent = cabCount;
      if (kaspiEl) kaspiEl.textContent = fmt(cabTurnover);
      if (boxEl) boxEl.textContent = fmt(cabBox);
      showReceipt(amt, m);
    }
    accept.addEventListener('click', () => {
      if (amount <= 0) return;
      const amt = amount, m = method; clearT();
      device.classList.remove('tap','scan','approved');
      device.classList.add('processing'); procAmt.textContent = fmt(amt);
      if (m === 'card'){
        procBrand.textContent = 'MyPos · POS-терминал'; procState.textContent = 'Приложите карту';
        timers.push(setTimeout(()=>{device.classList.add('tap');procState.textContent='Считывание карты…';},700));
        timers.push(setTimeout(()=>{device.classList.add('approved');procState.textContent='✓ Одобрено';},1900));
        timers.push(setTimeout(()=>land(amt,m),2500));
      } else {
        procBrand.textContent = 'MyPos · Kaspi/Halyk QR'; procState.textContent = 'Выберите способ оплаты';
        device.classList.add('bankpick');
        const banks = device.querySelectorAll('.bankpick .bp-bank'); banks.forEach(x=>x.classList.remove('pick'));
        timers.push(setTimeout(()=>{banks[Math.random()<0.5?0:1].classList.add('pick');},700));
        timers.push(setTimeout(()=>{device.classList.remove('bankpick');device.classList.add('scan');procState.textContent='Сканирование QR…';},1600));
        timers.push(setTimeout(()=>{device.classList.add('approved');procState.textContent='✓ Оплачено';},3100));
        timers.push(setTimeout(()=>land(amt,m),3700));
      }
      timers.push(setTimeout(reset, (m==='card'?2500:3700)+3600));
    });
    cancel.addEventListener('click', reset);

    // build the QR grid in the clone terminal (reuse markup pattern)
    const qrEl = document.getElementById('b3Qr');
    if (qrEl && !qrEl.children.length){
      for (let i=0;i<121;i++){ const c=document.createElement('i'); if(Math.random()<0.45)c.classList.add('off'); qrEl.appendChild(c); }
    }
  }

  /* ---- Block 3 · interactive payment → dark cabinet (clone variant 3) ---- */
  const b4 = document.getElementById('flowDemo4');
  if (b4){
    const device = document.getElementById('b4Device');
    const amtEl = document.getElementById('b4Amt');
    const tabs = document.getElementById('b4Tabs');
    const keys = document.getElementById('b4Keys');
    const accept = document.getElementById('b4Accept');
    const cancel = document.getElementById('b4Cancel');
    const procAmt = document.getElementById('b4ProcAmt');
    const procState = document.getElementById('b4ProcState');
    const procBrand = document.getElementById('b4ProcBrand');
    const bal = document.getElementById('b4Bal');
    const list = document.getElementById('b4List');
    const bars = Array.from(document.querySelectorAll('#b4Bars span'));
    const receipt = document.getElementById('b4Receipt');
    const rcMethod = document.getElementById('rc4Method');
    const rcAmt = document.getElementById('rc4Amt');
    const rcTotal = document.getElementById('rc4Total');
    const rcTime = document.getElementById('rc4Time');
    const pcountEl = document.getElementById('b4Pcount');
    const kaspiEl = document.getElementById('b4Kaspi');
    const boxEl = document.getElementById('b4Box');
    const fmt = n => n.toLocaleString('ru-RU').replace(/\u00A0/g,' ') + ' ₸';
    const SVG = {
      card:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
      qr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M21 21v-4M17 21h.01"/></svg>'
    };
    let raw='', amount=0, method='qr', turnover=4200, count=7, box=2400, hot=0;
    let timers=[]; const clearT=()=>{timers.forEach(clearTimeout);timers=[];};
    function renderAmt(){ amtEl.textContent = amount>0?fmt(amount):'0\u00A0₸'; accept.disabled = amount<=0; }
    function setRaw(s){ raw=s.replace(/^0+/,'').slice(0,7); amount=parseInt(raw||'0',10); renderAmt(); }
    renderAmt();
    bars.forEach(b=>b.style.height=(26+Math.random()*52)+'%');
    function rowHTML(amt,m,time,isNew){ const name=m==='card'?'Платёж картой':'Платёж по QR'; const badge=m==='card'?'VISA •• 4921':'Kaspi QR';
      return '<div class="tx'+(isNew?' new':'')+'"><span class="tx-ic">'+SVG[m==='card'?'card':'qr']+'</span><div class="tx-main"><div class="tx-name">'+name+'</div><div class="tx-meta"><span class="tx-method">'+badge+'</span>'+time+'</div></div><div class="tx-amt">+'+fmt(amt)+'</div></div>'; }
    list.innerHTML = rowHTML(1500,'card','6 мин назад',false)+rowHTML(500,'qr','12 мин назад',false);
    keys.addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b)return; if(b.dataset.k==='del')setRaw(raw.slice(0,-1)); else setRaw(raw+b.dataset.k); });
    tabs.addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b)return; method=b.dataset.m; tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); device.classList.toggle('m-card',method==='card'); device.classList.toggle('m-qr',method==='qr'); });
    function reset(){ clearT(); device.classList.remove('processing','tap','scan','approved','bankpick'); if(receipt)receipt.classList.remove('show'); setRaw(''); }
    function bumpBar(){ bars.forEach(b=>b.classList.remove('hot')); const bar=bars[hot%bars.length]; if(bar){bar.style.height=(58+Math.random()*40)+'%';bar.classList.add('hot');} hot++; }
    function showReceipt(amt,m){ if(!receipt)return; rcMethod.textContent=m==='card'?'Картой':'Kaspi QR'; rcAmt.textContent=fmt(amt); rcTotal.textContent=fmt(amt);
      const n=new Date(),p=x=>String(x).padStart(2,'0'); rcTime.textContent=p(n.getDate())+'.'+p(n.getMonth()+1)+'.'+n.getFullYear()+' · '+p(n.getHours())+':'+p(n.getMinutes()); receipt.classList.add('show'); }
    function land(amt,m){
      b4.classList.add('fd-send'); setTimeout(()=>b4.classList.remove('fd-send'),1100);
      turnover+=amt; count+=1; box+=amt;
      bal.textContent=fmt(turnover); bal.classList.add('pop'); setTimeout(()=>bal.classList.remove('pop'),260);
      if(pcountEl)pcountEl.textContent=count; if(kaspiEl)kaspiEl.textContent=fmt(turnover); if(boxEl)boxEl.textContent=fmt(box);
      list.insertAdjacentHTML('afterbegin', rowHTML(amt,m,'только что',true));
      while(list.children.length>4) list.removeChild(list.lastElementChild);
      bumpBar(); showReceipt(amt,m);
    }
    accept.addEventListener('click', ()=>{
      if(amount<=0)return; const amt=amount,m=method; clearT();
      device.classList.remove('tap','scan','approved'); device.classList.add('processing'); procAmt.textContent=fmt(amt);
      if(m==='card'){ procBrand.textContent='MyPos · POS-терминал'; procState.textContent='Приложите карту';
        timers.push(setTimeout(()=>{device.classList.add('tap');procState.textContent='Считывание карты…';},700));
        timers.push(setTimeout(()=>{device.classList.add('approved');procState.textContent='✓ Одобрено';},1900));
        timers.push(setTimeout(()=>land(amt,m),2500));
      } else { procBrand.textContent='MyPos · Kaspi/Halyk QR'; procState.textContent='Выберите способ оплаты'; device.classList.add('bankpick');
        const banks=device.querySelectorAll('.bankpick .bp-bank'); banks.forEach(x=>x.classList.remove('pick'));
        timers.push(setTimeout(()=>{banks[Math.random()<0.5?0:1].classList.add('pick');},700));
        timers.push(setTimeout(()=>{device.classList.remove('bankpick');device.classList.add('scan');procState.textContent='Сканирование QR…';},1600));
        timers.push(setTimeout(()=>{device.classList.add('approved');procState.textContent='✓ Оплачено';},3100));
        timers.push(setTimeout(()=>land(amt,m),3700));
      }
      timers.push(setTimeout(reset,(m==='card'?2500:3700)+3600));
    });
    cancel.addEventListener('click', reset);
    const qr4=document.getElementById('b4Qr');
    if(qr4&&!qr4.children.length){ for(let i=0;i<121;i++){const c=document.createElement('i'); if(Math.random()<0.45)c.classList.add('off'); qr4.appendChild(c);} }
  }

  /* ---- Block 3 · payment → dark cabinet with clickable periods + Halyk (variant 4) ---- */
  const b5 = document.getElementById('flowDemo5');
  if (b5){
    const device=document.getElementById('b5Device'), amtEl=document.getElementById('b5Amt'),
      tabs=document.getElementById('b5Tabs'), keys=document.getElementById('b5Keys'),
      accept=document.getElementById('b5Accept'), cancel=document.getElementById('b5Cancel'),
      procAmt=document.getElementById('b5ProcAmt'), procState=document.getElementById('b5ProcState'),
      procBrand=document.getElementById('b5ProcBrand'), bal=document.getElementById('b5Bal'),
      list=document.getElementById('b5List'), bars=Array.from(document.querySelectorAll('#b5Bars span')),
      receipt=document.getElementById('b5Receipt'), rcMethod=document.getElementById('rc5Method'),
      rcAmt=document.getElementById('rc5Amt'), rcTotal=document.getElementById('rc5Total'), rcTime=document.getElementById('rc5Time'),
      pcountEl=document.getElementById('b5Pcount'), periodTabs=document.getElementById('b5Period'), periodLbl=document.getElementById('b5PeriodLbl'),
      kaspiEl=document.getElementById('b5Kaspi'), kaspiPct=document.getElementById('b5KaspiPct'), kaspiBar=document.getElementById('b5KaspiBar'),
      halykEl=document.getElementById('b5Halyk'), halykPct=document.getElementById('b5HalykPct'), halykBar=document.getElementById('b5HalykBar'),
      boxEl=document.getElementById('b5Box');
    const fmt=n=>n.toLocaleString('ru-RU').replace(/\u00A0/g,' ')+' ₸';
    const SVG={card:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',qr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M21 21v-4M17 21h.01"/></svg>'};
    // per-period datasets
    const DATA={
      today:{lbl:'сегодня', kaspi:2800, halyk:1400, count:7, box:2400, bars:[30,55,38,62,45,70,52,40]},
      yest:{lbl:'вчера', kaspi:5200, halyk:3100, count:14, box:4600, bars:[42,60,50,72,58,66,48,55]},
      week:{lbl:'неделя', kaspi:38400, halyk:21700, count:96, box:33200, bars:[55,70,60,82,68,90,74]},
      month:{lbl:'месяц', kaspi:162500, halyk:94300, count:418, box:142800, bars:[60,75,68,88,72,95,80,84,70]}
    };
    let period='today';
    function applyPeriod(p){
      const d=DATA[p]; const total=d.kaspi+d.halyk;
      bal.textContent=fmt(total); periodLbl.textContent=d.lbl; pcountEl.textContent=d.count;
      const kp=Math.round(d.kaspi/total*100), hp=100-kp;
      kaspiEl.textContent=fmt(d.kaspi); kaspiPct.textContent=kp+'%'; kaspiBar.style.width=kp+'%';
      halykEl.textContent=fmt(d.halyk); halykPct.textContent=hp+'%'; halykBar.style.width=hp+'%';
      boxEl.textContent=fmt(d.box);
      // chart bars
      bars.forEach((b,i)=>{ b.classList.remove('hot'); b.style.height=(d.bars[i%d.bars.length]||40)+'%'; });
    }
    applyPeriod('today');
    periodTabs.addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b)return;
      period=b.dataset.p; periodTabs.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); applyPeriod(period); });

    let raw='', amount=0, method='qr', hot=0; let timers=[]; const clearT=()=>{timers.forEach(clearTimeout);timers=[];};
    function renderAmt(){ amtEl.textContent=amount>0?fmt(amount):'0\u00A0₸'; accept.disabled=amount<=0; }
    function setRaw(s){ raw=s.replace(/^0+/,'').slice(0,7); amount=parseInt(raw||'0',10); renderAmt(); }
    renderAmt();
    function rowHTML(amt,m,time,isNew){ const name=m==='card'?'Платёж картой':'Платёж по QR'; const badge=m==='card'?'VISA •• 4921':'Kaspi QR';
      return '<div class="tx'+(isNew?' new':'')+'"><span class="tx-ic">'+SVG[m==='card'?'card':'qr']+'</span><div class="tx-main"><div class="tx-name">'+name+'</div><div class="tx-meta"><span class="tx-method">'+badge+'</span>'+time+'</div></div><div class="tx-amt">+'+fmt(amt)+'</div></div>'; }
    list.innerHTML=rowHTML(1500,'card','6 мин назад',false)+rowHTML(500,'qr','12 мин назад',false);
    keys.addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b)return; if(b.dataset.k==='del')setRaw(raw.slice(0,-1)); else setRaw(raw+b.dataset.k); });
    tabs.addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b)return; method=b.dataset.m; tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); device.classList.toggle('m-card',method==='card'); device.classList.toggle('m-qr',method==='qr'); });
    function reset(){ clearT(); device.classList.remove('processing','tap','scan','approved','bankpick'); if(receipt)receipt.classList.remove('show'); setRaw(''); }
    function showReceipt(amt,m){ if(!receipt)return; rcMethod.textContent=m==='card'?'Картой':'Kaspi QR'; rcAmt.textContent=fmt(amt); rcTotal.textContent=fmt(amt);
      const n=new Date(),p=x=>String(x).padStart(2,'0'); rcTime.textContent=p(n.getDate())+'.'+p(n.getMonth()+1)+'.'+n.getFullYear()+' · '+p(n.getHours())+':'+p(n.getMinutes()); receipt.classList.add('show'); }
    function land(amt,m){
      b5.classList.add('fd-send'); setTimeout(()=>b5.classList.remove('fd-send'),1100);
      DATA.today.kaspi+=amt; DATA.today.count+=1; DATA.today.box+=amt;
      if(period==='today') applyPeriod('today');
      bal.classList.add('pop'); setTimeout(()=>bal.classList.remove('pop'),260);
      const bar=bars[hot%bars.length]; if(bar){bar.classList.add('hot');} hot++;
      list.insertAdjacentHTML('afterbegin', rowHTML(amt,m,'только что',true));
      while(list.children.length>4) list.removeChild(list.lastElementChild);
      showReceipt(amt,m);
    }
    accept.addEventListener('click', ()=>{
      if(amount<=0)return; const amt=amount,m=method; clearT();
      device.classList.remove('tap','scan','approved'); device.classList.add('processing'); procAmt.textContent=fmt(amt);
      if(m==='card'){ procBrand.textContent='MyPos · POS-терминал'; procState.textContent='Приложите карту';
        timers.push(setTimeout(()=>{device.classList.add('tap');procState.textContent='Считывание карты…';},700));
        timers.push(setTimeout(()=>{device.classList.add('approved');procState.textContent='✓ Одобрено';},1900));
        timers.push(setTimeout(()=>land(amt,m),2500));
      } else { procBrand.textContent='MyPos · Kaspi/Halyk QR'; procState.textContent='Выберите способ оплаты'; device.classList.add('bankpick');
        const banks=device.querySelectorAll('.bankpick .bp-bank'); banks.forEach(x=>x.classList.remove('pick'));
        timers.push(setTimeout(()=>{banks[Math.random()<0.5?0:1].classList.add('pick');},700));
        timers.push(setTimeout(()=>{device.classList.remove('bankpick');device.classList.add('scan');procState.textContent='Сканирование QR…';},1600));
        timers.push(setTimeout(()=>{device.classList.add('approved');procState.textContent='✓ Оплачено';},3100));
        timers.push(setTimeout(()=>land(amt,m),3700));
      }
      timers.push(setTimeout(reset,(m==='card'?2500:3700)+3600));
    });
    cancel.addEventListener('click', reset);
    const qr5=document.getElementById('b5Qr');
    if(qr5&&!qr5.children.length){ for(let i=0;i<121;i++){const c=document.createElement('i'); if(Math.random()<0.45)c.classList.add('off'); qr5.appendChild(c);} }
  }

  /* ---- Block 3 · payment → dark cabinet with clickable periods + Halyk (combined 03+04) ---- */
  const b6 = document.getElementById('flowDemo6');
  if (b6){
    const device=document.getElementById('b6Device'), amtEl=document.getElementById('b6Amt'),
      tabs=document.getElementById('b6Tabs'), keys=document.getElementById('b6Keys'),
      accept=document.getElementById('b6Accept'), cancel=document.getElementById('b6Cancel'),
      procAmt=document.getElementById('b6ProcAmt'), procState=document.getElementById('b6ProcState'),
      procBrand=document.getElementById('b6ProcBrand'), bal=document.getElementById('b6Bal'),
      list=document.getElementById('b6List'), bars=Array.from(document.querySelectorAll('#b6Bars span')),
      receipt=document.getElementById('b6Receipt'), rcMethod=document.getElementById('rc6Method'),
      rcAmt=document.getElementById('rc6Amt'), rcTotal=document.getElementById('rc6Total'), rcTime=document.getElementById('rc6Time'),
      pcountEl=document.getElementById('b6Pcount'), periodTabs=document.getElementById('b6Period'), periodLbl=document.getElementById('b6PeriodLbl'),
      kaspiEl=document.getElementById('b6Kaspi'), kaspiPct=document.getElementById('b6KaspiPct'), kaspiBar=document.getElementById('b6KaspiBar'),
      halykEl=document.getElementById('b6Halyk'), halykPct=document.getElementById('b6HalykPct'), halykBar=document.getElementById('b6HalykBar'),
      boxEl=document.getElementById('b6Box');
    const fmt=n=>n.toLocaleString('ru-RU').replace(/\u00A0/g,' ')+' ₸';
    const SVG={card:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',qr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M21 21v-4M17 21h.01"/></svg>'};
    // per-period datasets
    const DATA={
      today:{lbl:'сегодня', kaspi:2800, halyk:1400, count:7, box:2400, bars:[30,55,38,62,45,70,52,40]},
      yest:{lbl:'вчера', kaspi:5200, halyk:3100, count:14, box:4600, bars:[42,60,50,72,58,66,48,55]},
      week:{lbl:'неделя', kaspi:38400, halyk:21700, count:96, box:33200, bars:[55,70,60,82,68,90,74]},
      month:{lbl:'месяц', kaspi:162500, halyk:94300, count:418, box:142800, bars:[60,75,68,88,72,95,80,84,70]}
    };
    let period='today';
    function applyPeriod(p){
      const d=DATA[p]; const total=d.kaspi+d.halyk;
      bal.textContent=fmt(total); periodLbl.textContent=d.lbl; pcountEl.textContent=d.count;
      const kp=Math.round(d.kaspi/total*100), hp=100-kp;
      kaspiEl.textContent=fmt(d.kaspi); kaspiPct.textContent=kp+'%'; kaspiBar.style.width=kp+'%';
      halykEl.textContent=fmt(d.halyk); halykPct.textContent=hp+'%'; halykBar.style.width=hp+'%';
      boxEl.textContent=fmt(d.box);
      // chart bars
      bars.forEach((b,i)=>{ b.classList.remove('hot'); b.style.height=(d.bars[i%d.bars.length]||40)+'%'; });
    }
    applyPeriod('today');
    periodTabs.addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b)return;
      period=b.dataset.p; periodTabs.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); applyPeriod(period); });

    let raw='', amount=0, method='qr', hot=0; let timers=[]; const clearT=()=>{timers.forEach(clearTimeout);timers=[];};
    function renderAmt(){ amtEl.textContent=amount>0?fmt(amount):'0\u00A0₸'; accept.disabled=amount<=0; }
    function setRaw(s){ raw=s.replace(/^0+/,'').slice(0,7); amount=parseInt(raw||'0',10); renderAmt(); }
    renderAmt();
    function rowHTML(amt,m,time,isNew){ const name=m==='card'?'Платёж картой':'Платёж по QR'; const badge=m==='card'?'VISA •• 4921':'Kaspi QR';
      return '<div class="tx'+(isNew?' new':'')+'"><span class="tx-ic">'+SVG[m==='card'?'card':'qr']+'</span><div class="tx-main"><div class="tx-name">'+name+'</div><div class="tx-meta"><span class="tx-method">'+badge+'</span>'+time+'</div></div><div class="tx-amt">+'+fmt(amt)+'</div></div>'; }
    list.innerHTML=rowHTML(1500,'card','6 мин назад',false)+rowHTML(500,'qr','12 мин назад',false);
    keys.addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b)return; if(b.dataset.k==='del')setRaw(raw.slice(0,-1)); else setRaw(raw+b.dataset.k); });
    tabs.addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b)return; method=b.dataset.m; tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b)); device.classList.toggle('m-card',method==='card'); device.classList.toggle('m-qr',method==='qr'); });
    function reset(){ clearT(); device.classList.remove('processing','tap','scan','approved','bankpick'); if(receipt)receipt.classList.remove('show'); setRaw(''); }
    function showReceipt(amt,m){ if(!receipt)return; rcMethod.textContent=m==='card'?'Картой':'Kaspi QR'; rcAmt.textContent=fmt(amt); rcTotal.textContent=fmt(amt);
      const n=new Date(),p=x=>String(x).padStart(2,'0'); rcTime.textContent=p(n.getDate())+'.'+p(n.getMonth()+1)+'.'+n.getFullYear()+' · '+p(n.getHours())+':'+p(n.getMinutes()); receipt.classList.add('show'); }
    function land(amt,m){
      b6.classList.add('fd-send'); setTimeout(()=>b6.classList.remove('fd-send'),1100);
      DATA.today.kaspi+=amt; DATA.today.count+=1; DATA.today.box+=amt;
      if(period==='today') applyPeriod('today');
      bal.classList.add('pop'); setTimeout(()=>bal.classList.remove('pop'),260);
      const bar=bars[hot%bars.length]; if(bar){bar.classList.add('hot');} hot++;
      list.insertAdjacentHTML('afterbegin', rowHTML(amt,m,'только что',true));
      while(list.children.length>4) list.removeChild(list.lastElementChild);
      showReceipt(amt,m);
    }
    accept.addEventListener('click', ()=>{
      if(amount<=0)return; const amt=amount,m=method; clearT();
      device.classList.remove('tap','scan','approved'); device.classList.add('processing'); procAmt.textContent=fmt(amt);
      if(m==='card'){ procBrand.textContent='MyPos · POS-терминал'; procState.textContent='Приложите карту';
        timers.push(setTimeout(()=>{device.classList.add('tap');procState.textContent='Считывание карты…';},700));
        timers.push(setTimeout(()=>{device.classList.add('approved');procState.textContent='✓ Одобрено';},1900));
        timers.push(setTimeout(()=>land(amt,m),2500));
      } else { procBrand.textContent='MyPos · Kaspi/Halyk QR'; procState.textContent='Выберите способ оплаты'; device.classList.add('bankpick');
        const banks=device.querySelectorAll('.bankpick .bp-bank'); banks.forEach(x=>x.classList.remove('pick'));
        timers.push(setTimeout(()=>{banks[Math.random()<0.5?0:1].classList.add('pick');},700));
        timers.push(setTimeout(()=>{device.classList.remove('bankpick');device.classList.add('scan');procState.textContent='Сканирование QR…';},1600));
        timers.push(setTimeout(()=>{device.classList.add('approved');procState.textContent='✓ Оплачено';},3100));
        timers.push(setTimeout(()=>land(amt,m),3700));
      }
      timers.push(setTimeout(reset,(m==='card'?2500:3700)+3600));
    });
    cancel.addEventListener('click', reset);
    const qr6=document.getElementById('b6Qr');
    if(qr6&&!qr6.children.length){ for(let i=0;i<121;i++){const c=document.createElement('i'); if(Math.random()<0.45)c.classList.add('off'); qr6.appendChild(c);} }
  }


  const xray = document.getElementById('xrayStage');
  if (xray){
    let timers = [];
    let visible = false;
    const T = (fn, ms) => timers.push(setTimeout(fn, ms));
    const clearT = () => { timers.forEach(t => clearTimeout(t)); timers = []; };

    function loop(){
      if (!visible) return;
      clearT();
      xray.classList.remove('reveal-mode');        // 0s: machine + scanning line
      T(() => xray.classList.add('reveal-mode'), 4800);    // 4.8s: reveal skeleton (machine shown +1s)
      T(() => xray.classList.remove('reveal-mode'), 12800); // skeleton held 8s (+2s) → back to machine
      T(loop, 12800);
    }
    function reset(){ clearT(); xray.classList.remove('reveal-mode'); }

    function isOnScreen(){
      const r = xray.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      return r.top < vh*0.7 && r.bottom > vh*0.3;
    }
    function sync(){
      const on = isOnScreen();
      if (on && !visible){ visible = true; T(loop, 250); }
      else if (!on && visible){ visible = false; reset(); }
    }
    sync();
    window.addEventListener('scroll', sync, {passive:true});
    setTimeout(sync, 700);

    // live readouts
    const sig = document.getElementById('hudSignal');
    const data = document.getElementById('intData');
    let cups = 248;
    setInterval(() => {
      if (sig) sig.textContent = 'канал ' + (84 + Math.round(Math.random()*12)) + '%';
      const temp = 90 + Math.round(Math.random()*5);
      if (Math.random() < 0.5) cups++;
      if (data) data.textContent = 'БОЙЛЕР ' + temp + '°C · ПОМОЛ OK · ЧАШЕК ' + cups;
    }, 1800);
  }

  /* ---- app photo A/B switch (optional; removed when fixed to variant 1) ---- */
  const ownPhoto = document.getElementById('ownPhoto');
  const ownSwitch = ownPhoto && ownPhoto.querySelector('.own-switch');
  if (ownSwitch){
    ownSwitch.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.dataset.v;
      ownPhoto.dataset.variant = v;
      const vis = ownPhoto.closest('.own-visual'); if (vis) vis.dataset.variant = v;
      ownSwitch.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    });
  }

  /* ---- business chips marquee (seamless loop) ---- */
  document.querySelectorAll('.biz-marquee').forEach(bizMarquee => {
    bizMarquee.querySelectorAll('.bm-track').forEach(track => {
      // duplicate children once so a -50% translate loops seamlessly
      const items = [...track.children];
      items.forEach(node => {
        const clone = node.cloneNode(true);
        clone.setAttribute('aria-hidden','true');
        track.appendChild(clone);
      });
    });
  });

  /* ---- variant 2: computer-network graph (structured, tech) ---- */
  const neural = document.getElementById('neuralCanvas');
  if (neural){
    const ctx = neural.getContext('2d');
    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const COLS = 7, ROWS = 5;
    const nodes = [];
    function seed(){
      nodes.length = 0;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++){
        const bx = (c + 0.5) / COLS, by = (r + 0.5) / ROWS;
        nodes.push({ bx, by, x: bx, y: by,
          ph: Math.random() * Math.PI * 2,
          sp: 0.0004 + Math.random() * 0.0004,
          amp: 0.012 + Math.random() * 0.016,
          on: Math.random() < 0.5 });
      }
    }
    function resize(){
      const rect = neural.getBoundingClientRect();
      W = rect.width; H = rect.height;
      neural.width = Math.round(W * dpr); neural.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    seed(); resize();
    window.addEventListener('resize', resize);
    let last = performance.now();
    function frame(now){
      const dt = Math.min(now - last, 60); last = now;
      ctx.clearRect(0, 0, W, H);
      for (const n of nodes){
        n.ph += n.sp * dt;
        n.x = n.bx + Math.cos(n.ph) * n.amp;
        n.y = n.by + Math.sin(n.ph * 0.8) * n.amp;
      }
      // orthogonal (circuit) traces between horizontal & vertical neighbours
      ctx.lineWidth = 1;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++){
        const i = r * COLS + c, a = nodes[i];
        const ax = a.x * W, ay = a.y * H;
        if (c < COLS - 1){ const b = nodes[i + 1], bx = b.x * W, by = b.y * H;
          ctx.strokeStyle = 'rgba(95,130,230,.16)';
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo((ax + bx) / 2, ay); ctx.lineTo((ax + bx) / 2, by); ctx.lineTo(bx, by); ctx.stroke(); }
        if (r < ROWS - 1){ const b = nodes[i + COLS], bx = b.x * W, by = b.y * H;
          ctx.strokeStyle = 'rgba(95,130,230,.12)';
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, (ay + by) / 2); ctx.lineTo(bx, (ay + by) / 2); ctx.lineTo(bx, by); ctx.stroke(); }
      }
      // square chip nodes
      for (const n of nodes){
        const px = n.x * W, py = n.y * H, s = 3.2;
        ctx.fillStyle = n.on ? 'rgba(150,180,255,.9)' : 'rgba(120,140,180,.45)';
        ctx.fillRect(px - s, py - s, s * 2, s * 2);
        ctx.strokeStyle = 'rgba(120,150,255,.25)';
        ctx.strokeRect(px - s - 2.5, py - s - 2.5, (s + 2.5) * 2, (s + 2.5) * 2);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    // occasionally toggle a node's "active" state for subtle blinking
    setInterval(() => { const n = nodes[Math.floor(Math.random() * nodes.length)]; if (n) n.on = !n.on; }, 900);
  }

  /* ---- variant 3: thin threads with travelling impulses ---- */
  const thread = document.getElementById('threadCanvas');
  if (thread){
    const ctx = thread.getContext('2d');
    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const NODES = 16;
    let pts = [], links = [], pulses = [];
    function seed(){
      pts = [];
      for (let i = 0; i < NODES; i++) pts.push({ x: Math.random(), y: Math.random(), vx:(Math.random()-.5)*0.00006, vy:(Math.random()-.5)*0.00006 });
      // build links: each node to its 2 nearest neighbours
      links = [];
      const seen = new Set();
      for (let i = 0; i < NODES; i++){
        const d = pts.map((p, j) => ({ j, dist: Math.hypot(p.x - pts[i].x, p.y - pts[i].y) })).filter(o => o.j !== i).sort((a,b)=>a.dist-b.dist);
        for (let k = 0; k < 2; k++){ const j = d[k].j; const key = i < j ? i+'-'+j : j+'-'+i; if (!seen.has(key)){ seen.add(key); links.push({ a:i, b:j }); } }
      }
      pulses = [];
    }
    function resize(){ const r = thread.getBoundingClientRect(); W=r.width;H=r.height; thread.width=Math.round(W*dpr); thread.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }
    seed(); resize();
    window.addEventListener('resize', resize);
    // spawn a pulse along a random link periodically
    function spawn(){ if (links.length){ const li = Math.floor(Math.random()*links.length); pulses.push({ li, t:0, sp: 0.00035 + Math.random()*0.0004, dir: Math.random()<.5?1:-1 }); } }
    const spawnTimer = setInterval(spawn, 650);
    let last = performance.now();
    function frame(now){
      const dt = Math.min(now - last, 60); last = now;
      ctx.clearRect(0,0,W,H);
      for (const p of pts){ p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.x<0.05||p.x>0.95)p.vx*=-1; if(p.y<0.06||p.y>0.94)p.vy*=-1; }
      // base threads
      for (const L of links){
        const a = pts[L.a], b = pts[L.b];
        ctx.strokeStyle = 'rgba(120,150,255,.12)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x*W,a.y*H); ctx.lineTo(b.x*W,b.y*H); ctx.stroke();
      }
      // pulses + discharge glow on their link
      for (let i = pulses.length - 1; i >= 0; i--){
        const pu = pulses[i]; pu.t += pu.sp * dt;
        if (pu.t >= 1){ pulses.splice(i,1); continue; }
        const L = links[pu.li]; if (!L) { pulses.splice(i,1); continue; }
        const a = pts[L.a], b = pts[L.b];
        const t = pu.dir === 1 ? pu.t : 1 - pu.t;
        const ax=a.x*W, ay=a.y*H, bx=b.x*W, by=b.y*H;
        // brighten the whole thread as discharge passes (fades near ends)
        const glow = Math.sin(pu.t * Math.PI);
        ctx.strokeStyle = 'rgba(150,180,255,' + (0.5 * glow).toFixed(3) + ')';
        ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
        // travelling bright dot
        const px = ax + (bx-ax)*t, py = ay + (by-ay)*t;
        const g = ctx.createRadialGradient(px,py,0,px,py,9);
        g.addColorStop(0,'rgba(190,210,255,.95)'); g.addColorStop(1,'rgba(150,180,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px,py,9,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#dce6ff'; ctx.beginPath(); ctx.arc(px,py,1.8,0,Math.PI*2); ctx.fill();
      }
      // node dots
      for (const p of pts){ ctx.fillStyle='rgba(150,175,235,.55)'; ctx.beginPath(); ctx.arc(p.x*W,p.y*H,1.8,0,Math.PI*2); ctx.fill(); }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---- variant 4: devices communicating (threads + impulses + mini schematics) ---- */
  const thread4 = document.getElementById('threadCanvas4');
  if (thread4){
    const ctx = thread4.getContext('2d');
    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const NODES = 6;
    let pts = [], links = [], pulses = [];
    // dimmed background field (no icons) — impulses also pass behind the text
    let bgPts = [], bgLinks = [], bgPulses = [];
    const BG = 14;
    function seedBg(){
      bgPts = [];
      for (let i = 0; i < BG; i++) bgPts.push({ x: Math.random(), y: Math.random(), vx:(Math.random()-.5)*0.00005, vy:(Math.random()-.5)*0.00005 });
      bgLinks = []; const seen = new Set();
      for (let i = 0; i < BG; i++){
        const d = bgPts.map((p,j)=>({j,dist:Math.hypot(p.x-bgPts[i].x,p.y-bgPts[i].y)})).filter(o=>o.j!==i).sort((a,b)=>a.dist-b.dist);
        for (let k=0;k<2;k++){ const j=d[k].j; const key=i<j?i+'-'+j:j+'-'+i; if(!seen.has(key)){seen.add(key);bgLinks.push({a:i,b:j});} }
      }
      bgPulses = [];
    }
    function seed(){
      pts = [];
      // spread nodes via a jittered grid so they don't clump together
      const slots = [[0.16,0.2],[0.5,0.14],[0.84,0.26],[0.22,0.62],[0.6,0.78],[0.88,0.66]];
      for (let i = 0; i < NODES; i++){ const s = slots[i % slots.length];
        pts.push({ x: s[0] + (Math.random()-.5)*0.1, y: s[1] + (Math.random()-.5)*0.12,
        vx:(Math.random()-.5)*0.000035, vy:(Math.random()-.5)*0.000035,
        kind: i % 3, ph: Math.random()*Math.PI*2 }); }
      links = [];
      const seen = new Set();
      for (let i = 0; i < NODES; i++){
        const d = pts.map((p, j) => ({ j, dist: Math.hypot(p.x-pts[i].x, p.y-pts[i].y) })).filter(o=>o.j!==i).sort((a,b)=>a.dist-b.dist);
        for (let k = 0; k < 2; k++){ const j = d[k].j; const key = i<j?i+'-'+j:j+'-'+i; if(!seen.has(key)){seen.add(key);links.push({a:i,b:j});} }
      }
      pulses = [];
    }
    function resize(){ const r = thread4.getBoundingClientRect(); W=r.width;H=r.height; thread4.width=Math.round(W*dpr); thread4.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }
    seed(); seedBg(); resize();
    window.addEventListener('resize', resize);
    function spawn(){ if(links.length){ pulses.push({ li:Math.floor(Math.random()*links.length), t:0, sp:0.00025+Math.random()*0.00029, dir:Math.random()<.5?1:-1 }); } }
    setInterval(spawn, 520);
    function spawnBg(){ if(bgLinks.length){ bgPulses.push({ li:Math.floor(Math.random()*bgLinks.length), t:0, sp:0.00024+Math.random()*0.00032, dir:Math.random()<.5?1:-1 }); } }
    setInterval(spawnBg, 480);
    // draw a small device schematic at a node
    function device(px, py, kind, lit){
      ctx.save(); ctx.translate(px, py);
      const col = lit ? 'rgba(170,195,255,.95)' : 'rgba(125,150,200,.6)';
      ctx.strokeStyle = col; ctx.fillStyle = 'rgba(20,26,40,.85)'; ctx.lineWidth = 1.2;
      if (kind === 0){ // chip with pins
        ctx.fillRect(-7,-7,14,14); ctx.strokeRect(-7,-7,14,14);
        ctx.beginPath();
        for(let i=-1;i<=1;i++){ ctx.moveTo(-7,i*4); ctx.lineTo(-11,i*4); ctx.moveTo(7,i*4); ctx.lineTo(11,i*4); ctx.moveTo(i*4,-7); ctx.lineTo(i*4,-11); ctx.moveTo(i*4,7); ctx.lineTo(i*4,11); }
        ctx.stroke();
        ctx.strokeStyle=col; ctx.strokeRect(-3,-3,6,6);
      } else if (kind === 1){ // terminal / screen
        ctx.fillRect(-6,-8,12,16); ctx.strokeRect(-6,-8,12,16);
        ctx.strokeStyle=col; ctx.beginPath(); ctx.moveTo(-4,-4); ctx.lineTo(4,-4); ctx.moveTo(-4,0); ctx.lineTo(4,0); ctx.stroke();
      } else { // antenna node
        ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(0,-11); ctx.stroke();
        ctx.beginPath(); ctx.arc(0,-11,1.6,0,Math.PI*2); ctx.fillStyle=col; ctx.fill();
      }
      ctx.restore();
    }
    let last = performance.now();
    function frame(now){
      const dt = Math.min(now-last,60); last=now;
      ctx.clearRect(0,0,W,H);
      // --- dimmed background field (drawn first, sits behind everything incl. text dark backdrop) ---
      for(const p of bgPts){ p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.x<0.02||p.x>0.98)p.vx*=-1; if(p.y<0.03||p.y>0.97)p.vy*=-1; }
      for(const L of bgLinks){ const a=bgPts[L.a],b=bgPts[L.b]; ctx.strokeStyle='rgba(110,140,230,.05)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(a.x*W,a.y*H); ctx.lineTo(b.x*W,b.y*H); ctx.stroke(); }
      for(let i=bgPulses.length-1;i>=0;i--){ const pu=bgPulses[i]; pu.t+=pu.sp*dt; if(pu.t>=1){bgPulses.splice(i,1);continue;}
        const L=bgLinks[pu.li]; if(!L){bgPulses.splice(i,1);continue;}
        const a=bgPts[L.a],b=bgPts[L.b]; const t=pu.dir===1?pu.t:1-pu.t;
        const ax=a.x*W,ay=a.y*H,bx=b.x*W,by=b.y*H; const glow=Math.sin(pu.t*Math.PI);
        ctx.strokeStyle='rgba(120,150,255,'+(0.16*glow).toFixed(3)+')'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
        const px=ax+(bx-ax)*t, py=ay+(by-ay)*t;
        const g=ctx.createRadialGradient(px,py,0,px,py,6); g.addColorStop(0,'rgba(150,175,240,.4)'); g.addColorStop(1,'rgba(150,175,240,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,6,0,Math.PI*2); ctx.fill();
      }
      // --- foreground device network ---
      for(const p of pts){ p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.x<0.1||p.x>0.9)p.vx*=-1; if(p.y<0.1||p.y>0.9)p.vy*=-1; p.ph+=dt*0.0006; }
      for(const L of links){ const a=pts[L.a],b=pts[L.b]; ctx.strokeStyle='rgba(120,150,255,.12)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(a.x*W,a.y*H); ctx.lineTo(b.x*W,b.y*H); ctx.stroke(); }
      const litNodes = new Set();
      for(let i=pulses.length-1;i>=0;i--){ const pu=pulses[i]; pu.t+=pu.sp*dt; if(pu.t>=1){ pulses.splice(i,1); continue; }
        const L=links[pu.li]; if(!L){pulses.splice(i,1);continue;}
        const a=pts[L.a],b=pts[L.b]; const t=pu.dir===1?pu.t:1-pu.t;
        const ax=a.x*W,ay=a.y*H,bx=b.x*W,by=b.y*H;
        const glow=Math.sin(pu.t*Math.PI);
        ctx.strokeStyle='rgba(150,180,255,'+(0.5*glow).toFixed(3)+')'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
        const px=ax+(bx-ax)*t, py=ay+(by-ay)*t;
        const g=ctx.createRadialGradient(px,py,0,px,py,9); g.addColorStop(0,'rgba(190,210,255,.95)'); g.addColorStop(1,'rgba(150,180,255,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,9,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#dce6ff'; ctx.beginPath(); ctx.arc(px,py,1.8,0,Math.PI*2); ctx.fill();
        if(pu.t<0.12) litNodes.add(pu.dir===1?L.a:L.b);
        if(pu.t>0.88) litNodes.add(pu.dir===1?L.b:L.a);
      }
      for(let i=0;i<pts.length;i++){ const p=pts[i]; device(p.x*W, p.y*H, p.kind, litNodes.has(i)); }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---- variant 5: board broadcasting impulses ---- */
  const boardC = document.getElementById('boardCanvas');
  if (boardC){
    const ctx = boardC.getContext('2d');
    let W=0,H=0,dpr=Math.min(window.devicePixelRatio||1,2);
    // hub = board location (right side); nodes scattered on the left/center
    let nodes=[], pulses=[];
    function seed(){
      nodes=[];
      for(let i=0;i<10;i++) nodes.push({ x:0.06+Math.random()*0.62, y:0.1+Math.random()*0.8, vx:(Math.random()-.5)*0.00004, vy:(Math.random()-.5)*0.00004 });
      pulses=[];
    }
    function resize(){ const r=boardC.getBoundingClientRect(); W=r.width;H=r.height; boardC.width=Math.round(W*dpr); boardC.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }
    seed(); resize(); window.addEventListener('resize', resize);
    const hub = ()=>({ x: 0.80*W, y: 0.5*H });
    function spawn(){ if(nodes.length){ pulses.push({ ni:Math.floor(Math.random()*nodes.length), t:0, sp:0.00028+Math.random()*0.0003, dir: Math.random()<.5?1:-1 }); } }
    setInterval(spawn, 520);
    let last=performance.now();
    function frame(now){
      const dt=Math.min(now-last,60); last=now;
      ctx.clearRect(0,0,W,H);
      const h=hub();
      for(const n of nodes){ n.x+=n.vx*dt; n.y+=n.vy*dt; if(n.x<0.04||n.x>0.7)n.vx*=-1; if(n.y<0.08||n.y>0.92)n.vy*=-1; }
      // faint base lines from hub to each node
      for(const n of nodes){ ctx.strokeStyle='rgba(110,140,230,.07)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.lineTo(n.x*W,n.y*H); ctx.stroke(); }
      // pulses travelling hub<->node
      for(let i=pulses.length-1;i>=0;i--){ const pu=pulses[i]; pu.t+=pu.sp*dt; if(pu.t>=1){pulses.splice(i,1);continue;}
        const n=nodes[pu.ni]; if(!n){pulses.splice(i,1);continue;}
        const nx=n.x*W, ny=n.y*H; const t=pu.dir===1?pu.t:1-pu.t;
        const glow=Math.sin(pu.t*Math.PI);
        ctx.strokeStyle='rgba(150,180,255,'+(0.32*glow).toFixed(3)+')'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(h.x,h.y); ctx.lineTo(nx,ny); ctx.stroke();
        const px=h.x+(nx-h.x)*t, py=h.y+(ny-h.y)*t;
        const g=ctx.createRadialGradient(px,py,0,px,py,8); g.addColorStop(0,'rgba(190,210,255,.9)'); g.addColorStop(1,'rgba(150,180,255,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,8,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#dce6ff'; ctx.beginPath(); ctx.arc(px,py,1.7,0,Math.PI*2); ctx.fill();
      }
      // node dots
      for(const n of nodes){ ctx.fillStyle='rgba(150,175,235,.5)'; ctx.beginPath(); ctx.arc(n.x*W,n.y*H,1.7,0,Math.PI*2); ctx.fill(); }
      // hub glow (behind board)
      const hg=ctx.createRadialGradient(h.x,h.y,0,h.x,h.y,80); hg.addColorStop(0,'rgba(77,124,255,.10)'); hg.addColorStop(1,'rgba(77,124,255,0)');
      ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(h.x,h.y,80,0,Math.PI*2); ctx.fill();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---- intake: static impulses + evenly-distributed mini devices (all variants) ---- */
  document.querySelectorAll('.intake-board-net').forEach(inet => {
    const ctx = inet.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function dev(px,py,kind,scale){
      ctx.save(); ctx.translate(px,py); ctx.scale(scale,scale);
      ctx.strokeStyle='rgba(150,175,235,.55)'; ctx.fillStyle='rgba(18,24,38,.9)'; ctx.lineWidth=1.1;
      if(kind===0){ ctx.fillRect(-7,-7,14,14); ctx.strokeRect(-7,-7,14,14);
        ctx.beginPath(); for(let i=-1;i<=1;i++){ctx.moveTo(-7,i*4);ctx.lineTo(-11,i*4);ctx.moveTo(7,i*4);ctx.lineTo(11,i*4);ctx.moveTo(i*4,-7);ctx.lineTo(i*4,-11);ctx.moveTo(i*4,7);ctx.lineTo(i*4,11);} ctx.stroke();
      } else { ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,-5);ctx.lineTo(0,-11); ctx.stroke(); }
      ctx.restore();
    }
    function draw(){
      const r = inet.getBoundingClientRect(); const W=r.width,H=r.height; if(!W||!H) return;
      inet.width=Math.round(W*dpr); inet.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
      const hub={x:0.5*W, y:0.46*H};
      const routes=[
        {pts:[hub,{x:0.16*W,y:0.74*H}], imp:null},
        {pts:[hub,{x:0.22*W,y:0.2*H}], imp:0.6},
        {pts:[hub,{x:0.86*W,y:0.3*H},{x:1.06*W,y:0.3*H}], imp:0.72},
        {pts:[hub,{x:0.92*W,y:0.5*H},{x:1.08*W,y:0.5*H}], imp:0.66},
        {pts:[hub,{x:0.88*W,y:0.7*H},{x:1.06*W,y:0.78*H}], imp:0.8},
        {pts:[hub,{x:0.36*W,y:0.92*H}], imp:null},
        {pts:[hub,{x:0.6*W,y:0.12*H},{x:0.78*W,y:0.12*H}], imp:0.5},
        {pts:[hub,{x:0.1*W,y:0.42*H}], imp:null}
      ];
      function poly(p,op){ ctx.strokeStyle='rgba(120,150,255,'+op+')'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(p[0].x,p[0].y); for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y); ctx.stroke(); }
      routes.forEach(rt=>poly(rt.pts,.12));
      function at(p,f){let s=[],t=0;for(let i=1;i<p.length;i++){const l=Math.hypot(p[i].x-p[i-1].x,p[i].y-p[i-1].y);s.push(l);t+=l;}let d=f*t;for(let i=1;i<p.length;i++){if(d<=s[i-1]){const k=d/s[i-1];return{x:p[i-1].x+(p[i].x-p[i-1].x)*k,y:p[i-1].y+(p[i].y-p[i-1].y)*k};}d-=s[i-1];}return p[p.length-1];}
      routes.forEach(rt=>{ if(rt.imp==null)return; const q=at(rt.pts,rt.imp);
        const g=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,6); g.addColorStop(0,'rgba(180,205,255,.6)'); g.addColorStop(1,'rgba(150,180,255,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(q.x,q.y,6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(220,230,255,.65)'; ctx.beginPath(); ctx.arc(q.x,q.y,1.4,0,Math.PI*2); ctx.fill(); });
      // mini devices spread evenly across the canvas (not clustered at the edges)
      const devs=[[0.14,0.22,0],[0.5,0.12,1],[0.84,0.24,0],[0.18,0.6,1],[0.5,0.82,0],[0.82,0.66,1],[0.34,0.4,0],[0.66,0.5,1]];
      devs.forEach(d=>dev(d[0]*W,d[1]*H,d[2],0.78));
    }
    draw(); window.addEventListener('resize', draw); setTimeout(draw,400); setTimeout(draw,1000);
  });

  /* ---- variant 3 intake tabs ---- */
  const intakeTabs = document.getElementById('intakeTabs');
  if (intakeTabs){
    const views = [...document.querySelectorAll('.intake-view')];
    intakeTabs.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      intakeTabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      views.forEach(v => v.classList.toggle('on', v.dataset.v === b.dataset.t));
    });
  }

  /* ---- lineup decoration: STATIC threads + mini-devices + frozen impulses (same as block 2) ---- */
  const lnet = document.getElementById('lineupNet');
  if (lnet){
    const ctx = lnet.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function miniDevice(px,py,kind,scale){
      ctx.save(); ctx.translate(px,py); ctx.scale(scale,scale);
      ctx.strokeStyle='rgba(150,175,235,.6)'; ctx.fillStyle='rgba(18,24,38,.9)'; ctx.lineWidth=1.1;
      if(kind===0){ ctx.fillRect(-7,-7,14,14); ctx.strokeRect(-7,-7,14,14);
        ctx.beginPath(); for(let i=-1;i<=1;i++){ctx.moveTo(-7,i*4);ctx.lineTo(-11,i*4);ctx.moveTo(7,i*4);ctx.lineTo(11,i*4);ctx.moveTo(i*4,-7);ctx.lineTo(i*4,-11);ctx.moveTo(i*4,7);ctx.lineTo(i*4,11);} ctx.stroke();
        ctx.strokeRect(-3,-3,6,6);
      } else if(kind===1){ ctx.fillRect(-6,-8,12,16); ctx.strokeRect(-6,-8,12,16);
        ctx.beginPath(); ctx.moveTo(-4,-4);ctx.lineTo(4,-4);ctx.moveTo(-4,0);ctx.lineTo(4,0); ctx.stroke();
      } else { ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,-5);ctx.lineTo(0,-11); ctx.stroke();
        ctx.beginPath(); ctx.arc(0,-11,1.6,0,Math.PI*2); ctx.fillStyle='rgba(150,175,235,.8)'; ctx.fill(); }
      ctx.restore();
    }
    function draw(){
      const r = lnet.getBoundingClientRect();
      const W=r.width, H=r.height; if(!W||!H) return;
      lnet.width=Math.round(W*dpr); lnet.height=Math.round(H*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
      // mini devices scattered chaotically across the block (not on the edges)
      const devs=[
        {x:0.30*W,y:0.13*H,k:0,s:0.9},
        {x:0.46*W,y:0.10*H,k:2,s:0.82},
        {x:0.63*W,y:0.66*H,k:1,s:0.88},
        {x:0.90*W,y:0.50*H,k:0,s:0.8}
      ];
      // hub = the controller board (right side of featured card) — everything emanates from it
      const hub={x:0.79*W, y:0.27*H};
      // routes: some straight, some with a 45° elbow (dogleg) → asymmetric, ending at varied points (not all at edges)
      // each route: list of points from hub; impulse=fraction along route for a frozen dot (or null)
      const routes=[
        {pts:[hub,{x:0.5*W,y:0.46*H}], imp:0.55},                         // to centre card area
        {pts:[hub,{x:0.62*W,y:0.42*H},{x:0.30*W,y:0.42*H}], imp:null},    // elbow then left
        {pts:[hub,{x:0.84*W,y:0.52*H}], imp:null},                        // to right card top
        {pts:[hub,{x:0.7*W,y:0.18*H},{x:0.45*W,y:0.18*H}], imp:0.62},     // up then 45° to a mid point
        {pts:[hub,{x:0.2*W,y:0.34*H}], imp:null},                          // long diagonal left
        {pts:[hub,{x:0.9*W,y:0.4*H},{x:0.9*W,y:0.62*H}], imp:null},        // right elbow down
        {pts:[hub,{x:0.5*W,y:0.42*H},{x:0.5*W,y:0.74*H}], imp:0.78}        // down into the MIDDLE of QR + POS card
      ];
      function drawRoute(pts,op){ ctx.strokeStyle='rgba(120,150,255,'+op+')'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y); for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y); ctx.stroke(); }
      // faint links to mini-devices too
      devs.forEach(d=>drawRoute([hub,d],.08));
      routes.forEach(r2=>drawRoute(r2.pts,.13));
      // frozen impulse dots positioned along the route polyline (skip nulls)
      function ptAlong(pts,f){ // f in [0,1] across total length
        let segs=[],tot=0; for(let i=1;i<pts.length;i++){const dx=pts[i].x-pts[i-1].x,dy=pts[i].y-pts[i-1].y,l=Math.hypot(dx,dy);segs.push(l);tot+=l;}
        let d=f*tot; for(let i=1;i<pts.length;i++){ if(d<=segs[i-1]){const t=d/segs[i-1];return {x:pts[i-1].x+(pts[i].x-pts[i-1].x)*t,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*t};} d-=segs[i-1]; }
        return pts[pts.length-1]; }
      routes.forEach(r2=>{ if(r2.imp==null)return; const p=ptAlong(r2.pts,r2.imp);
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,6); g.addColorStop(0,'rgba(180,205,255,.54)'); g.addColorStop(1,'rgba(150,180,255,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(220,230,255,.59)'; ctx.beginPath(); ctx.arc(p.x,p.y,1.5,0,Math.PI*2); ctx.fill();
      });
      // hub node glow
      const hg=ctx.createRadialGradient(hub.x,hub.y,0,hub.x,hub.y,12); hg.addColorStop(0,'rgba(120,150,255,.5)'); hg.addColorStop(1,'rgba(120,150,255,0)');
      ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(hub.x,hub.y,12,0,Math.PI*2); ctx.fill();
      devs.forEach(d=>miniDevice(d.x,d.y,d.k,d.s));
    }
    draw(); window.addEventListener('resize', draw);
    setTimeout(draw,300); setTimeout(draw,900);
  }

  /* ---- static device-network decoration spanning the controller clone block ---- */
  const bsn = document.getElementById('boardStaticNet');
  if (bsn){
    const ctx = bsn.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function draw(){
      const r = bsn.getBoundingClientRect();
      const W = r.width, H = r.height;
      if (!W || !H) return;
      bsn.width = Math.round(W*dpr); bsn.height = Math.round(H*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,W,H);
      // nodes spread across the WHOLE block (left text area + right board area)
      const pts = [
        [0.07,0.24],[0.22,0.66],[0.40,0.20],[0.30,0.86],[0.52,0.55],
        [0.66,0.16],[0.78,0.74],[0.92,0.34],[0.86,0.90],[0.60,0.92]
      ].map(p=>({x:p[0]*W,y:p[1]*H}));
      // links to nearest neighbour only (sparse, natural)
      const seen=new Set();
      for(let i=0;i<pts.length;i++){
        const d=pts.map((p,j)=>({j,dist:Math.hypot(p.x-pts[i].x,p.y-pts[i].y)})).filter(o=>o.j!==i).sort((a,b)=>a.dist-b.dist);
        for(let k=0;k<2;k++){ const j=d[k].j; const key=i<j?i+'-'+j:j+'-'+i; if(seen.has(key))continue; seen.add(key);
          const a=pts[i],b=pts[j];
          ctx.strokeStyle='rgba(120,150,255,.11)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
      // only a few frozen impulses (natural, sparse)
      const impulses=[[0,3],[4,5],[7,2]]; // node index pairs
      for(const [ia,ib] of impulses){
        const a=pts[ia], b=pts[ib]; if(!a||!b) continue;
        const t=0.45;
        const px=a.x+(b.x-a.x)*t, py=a.y+(b.y-a.y)*t;
        const g=ctx.createRadialGradient(px,py,0,px,py,6); g.addColorStop(0,'rgba(180,205,255,.7)'); g.addColorStop(1,'rgba(150,180,255,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(220,230,255,.9)'; ctx.beginPath(); ctx.arc(px,py,1.4,0,Math.PI*2); ctx.fill();
      }
      for(const p of pts){ ctx.fillStyle='rgba(150,175,235,.4)'; ctx.beginPath(); ctx.arc(p.x,p.y,1.8,0,Math.PI*2); ctx.fill(); }
    }
    draw();
    window.addEventListener('resize', draw);
    setTimeout(draw, 300); setTimeout(draw, 900);
  }

  /* ---- variant 3: mini-device network connecting INTO the board ---- */
  const net3 = document.getElementById('boardNet3');
  if (net3){
    const ctx = net3.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function miniDevice(px,py,kind,scale){
      ctx.save(); ctx.translate(px,py); ctx.scale(scale,scale);
      ctx.strokeStyle='rgba(150,175,235,.6)'; ctx.fillStyle='rgba(18,24,38,.9)'; ctx.lineWidth=1.1;
      if(kind===0){ ctx.fillRect(-7,-7,14,14); ctx.strokeRect(-7,-7,14,14);
        ctx.beginPath(); for(let i=-1;i<=1;i++){ctx.moveTo(-7,i*4);ctx.lineTo(-11,i*4);ctx.moveTo(7,i*4);ctx.lineTo(11,i*4);ctx.moveTo(i*4,-7);ctx.lineTo(i*4,-11);ctx.moveTo(i*4,7);ctx.lineTo(i*4,11);} ctx.stroke();
        ctx.strokeRect(-3,-3,6,6);
      } else if(kind===1){ ctx.fillRect(-6,-8,12,16); ctx.strokeRect(-6,-8,12,16);
        ctx.beginPath(); ctx.moveTo(-4,-4);ctx.lineTo(4,-4);ctx.moveTo(-4,0);ctx.lineTo(4,0); ctx.stroke();
      } else { ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,-5);ctx.lineTo(0,-11); ctx.stroke();
        ctx.beginPath(); ctx.arc(0,-11,1.6,0,Math.PI*2); ctx.fillStyle='rgba(150,175,235,.8)'; ctx.fill();
      }
      ctx.restore();
    }
    function draw(){
      const r = net3.getBoundingClientRect();
      const W=r.width,H=r.height; if(!W||!H)return;
      net3.width=Math.round(W*dpr); net3.height=Math.round(H*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
      // board hub: right side where the image sits
      const hub={x:0.82*W, y:0.5*H};
      // mini devices scattered across block (incl. left/text area)
      const devs=[
        {x:0.10*W,y:0.26*H,k:0,s:0.95},
        {x:0.24*W,y:0.78*H,k:2,s:0.9},
        {x:0.42*W,y:0.16*H,k:1,s:0.85},
        {x:0.50*W,y:0.62*H,k:0,s:0.8},
        {x:0.62*W,y:0.88*H,k:2,s:0.9},
        {x:0.30*W,y:0.46*H,k:1,s:0.8}
      ];
      // links: each device -> hub (board), plus a couple device-device
      ctx.lineWidth=1;
      function link(a,b,op){ ctx.strokeStyle='rgba(120,150,255,'+op+')'; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
      devs.forEach(dv=>link(dv,hub,.1));
      link(devs[0],devs[5],.08); link(devs[1],devs[3],.08); link(devs[2],devs[4],.07);
      // a few frozen impulses on device->board links
      [0,2,4].forEach(idx=>{ const dv=devs[idx]; const t=0.55;
        const px=dv.x+(hub.x-dv.x)*t, py=dv.y+(hub.y-dv.y)*t;
        const g=ctx.createRadialGradient(px,py,0,px,py,6); g.addColorStop(0,'rgba(180,205,255,.75)'); g.addColorStop(1,'rgba(150,180,255,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(220,230,255,.9)'; ctx.beginPath(); ctx.arc(px,py,1.4,0,Math.PI*2); ctx.fill();
      });
      // draw devices
      devs.forEach(dv=>miniDevice(dv.x,dv.y,dv.k,dv.s));
    }
    draw(); window.addEventListener('resize', draw);
    setTimeout(draw,300); setTimeout(draw,900);
  }

  /* ---- variant 3 & 9 in-place teardown crossfade (box → board) ---- */
  document.querySelectorAll('.p3-teardown, #p3Teardown, #p3Teardown9').forEach(p3 => {
    if (!p3 || p3.dataset.tdInit) return; p3.dataset.tdInit = '1';
    const box = p3.querySelector('.p3-box');
    const board = p3.querySelector('.p3-board');
    if(!box||!board) return;
    function p3Scroll(){
      const r = p3.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      let p = (vh*0.78 - r.top) / (vh*0.6);
      p = Math.min(1, Math.max(0, p));
      box.style.opacity = (1 - p).toFixed(3);
      box.style.transform = 'scale(' + (1 + p*0.06).toFixed(3) + ')';
      board.style.opacity = Math.min(1, p*1.15).toFixed(3);
      board.style.transform = 'scale(' + (0.94 + p*0.06).toFixed(3) + ')';
    }
    board.style.opacity = '0';
    window.addEventListener('scroll', p3Scroll, {passive:true});
    window.addEventListener('resize', p3Scroll);
    p3Scroll();
  });

  /* ---- teardown scroll reveal ---- */
  const teardown = document.getElementById('teardown');
  if (teardown){
    const box = teardown.querySelector('.td-box');
    const board = teardown.querySelector('.td-board');
    const cap = teardown.querySelector('.td-caption');
    function onScroll(){
      const r = teardown.getBoundingClientRect();
      const total = teardown.offsetHeight - window.innerHeight;
      let p = (-r.top) / total;
      p = Math.min(1, Math.max(0, p));
      // box fades/scales out over first 75% of scroll
      const fp = Math.min(1, p / 0.75);
      box.style.opacity = (1 - fp).toFixed(3);
      box.style.transform = 'scale(' + (1 + fp * 0.08).toFixed(3) + ')';
      // board emerges
      board.style.opacity = Math.min(1, fp * 1.2).toFixed(3);
      board.style.transform = 'scale(' + (0.92 + fp * 0.08).toFixed(3) + ')';
      cap.classList.toggle('show', p > 0.82);
    }
    board.style.opacity = '0';
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();
  }

  /* ---- prices6 static wave impulses (audio-wave aesthetic) ---- */
  const pr6 = document.getElementById('pr6Net');
  if (pr6){
    const ctx = pr6.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function draw(){
      const r = pr6.getBoundingClientRect(); const W=r.width,H=r.height; if(!W||!H) return;
      pr6.width=Math.round(W*dpr); pr6.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
      const cy=H*0.5;
      // several overlapping sine waves with an envelope (waist in the middle like the ref)
      const waves=[
        {amp:H*0.18, freq:2.0, phase:0.0,  col:'rgba(120,150,255,.55)', lw:2},
        {amp:H*0.14, freq:2.4, phase:0.8,  col:'rgba(120,150,255,.32)', lw:1.6},
        {amp:H*0.10, freq:1.7, phase:2.1,  col:'rgba(150,170,235,.22)', lw:1.4},
        {amp:H*0.16, freq:2.2, phase:3.4,  col:'rgba(120,150,255,.2)',  lw:1.4},
        {amp:H*0.08, freq:3.0, phase:1.2,  col:'rgba(170,185,255,.18)', lw:1.2}
      ];
      for(const w of waves){
        ctx.beginPath();
        for(let x=0;x<=W;x+=4){
          const t=x/W;
          const env=Math.sin(Math.PI*t); // 0 at edges, 1 in middle area
          const env2=0.35+0.65*Math.pow(env,0.7);
          const y=cy+Math.sin(t*Math.PI*2*w.freq + w.phase)*w.amp*env2;
          if(x===0)ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.strokeStyle=w.col; ctx.lineWidth=w.lw; ctx.shadowBlur=10; ctx.shadowColor='rgba(100,130,230,.5)';
        ctx.stroke(); ctx.shadowBlur=0;
      }
      // faint elliptical halo
      ctx.strokeStyle='rgba(255,255,255,.03)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.ellipse(W/2,cy,W*0.46,H*0.42,0,0,Math.PI*2); ctx.stroke();
    }
    draw(); window.addEventListener('resize', draw); setTimeout(draw,300); setTimeout(draw,900);
  }

  /* ---- prices5 equipment toggle ---- */
  document.querySelectorAll('#p5Toggle, #p5Toggle9').forEach(p5t => {
    const suffix = p5t.id === 'p5Toggle9' ? '9' : '';
    const DATA = {
      ctrl:  { cPrice:'30 000 ₸', cFee:'5 000 ₸ / мес', yPrice:'65 000', save:'Выгода 25 000 ₸', saveShow:true },
      water: { cPrice:'30 000 ₸', cFee:'2 700 ₸ / мес', yPrice:'45 000', save:'', saveShow:false }
    };
    const el = id => document.getElementById(id + suffix);
    function apply(k){
      const d = DATA[k];
      if(el('p5cPrice')) el('p5cPrice').textContent = d.cPrice;
      if(el('p5cFee')) el('p5cFee').textContent = d.cFee;
      if(el('p5yPrice')) el('p5yPrice').textContent = d.yPrice;
      const sv = el('p5Save');
      if(sv){ sv.textContent = d.save; sv.style.display = d.saveShow ? '' : 'none'; }
    }
    p5t.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      p5t.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      apply(b.dataset.eq);
    });
    apply('ctrl');
  });

  /* ---- voice analytics waveform (static, speech-like spectrum) ---- */
  const vaWave = document.getElementById('vaWave');
  if (vaWave){
    const ctx = vaWave.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function draw(){
      const r=vaWave.getBoundingClientRect(); const W=r.width,H=r.height; if(!W||!H) return;
      vaWave.width=Math.round(W*dpr); vaWave.height=Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,W,H);
      const STEP=5, mid=H*0.5, count=Math.floor(W/STEP);
      // deterministic pseudo-random so it stays fixed
      let seed=1337; const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
      for(let i=0;i<count;i++){
        const t=i/count;
        // a few speech "peaks" across the width + low chatter between
        const peaks=Math.pow(Math.max(0,Math.sin(t*Math.PI*7)),8)+Math.pow(Math.max(0,Math.sin(t*Math.PI*3+1.5)),10);
        const base=0.08+rnd()*0.18;
        const v=Math.min(1, base + peaks*(0.5+rnd()*0.5));
        const x=i*STEP+STEP*0.5;
        const h=v*H*0.32;
        ctx.fillStyle='rgba(205,218,255,'+(0.4+v*0.55).toFixed(3)+')';
        ctx.fillRect(x-0.6, mid-h, 1.3, h*2);
        // dotted lower texture under the bar
        if(v>0.04){ ctx.fillStyle='rgba(150,175,235,'+(0.1+v*0.12).toFixed(3)+')';
          for(let yy=mid+h; yy<mid+h*1.6 && yy<H; yy+=3){ ctx.fillRect(x-0.4, yy, 0.9, 1); } }
      }
      ctx.fillStyle='rgba(220,230,255,.45)'; ctx.fillRect(0, mid-0.6, W, 1.2);
    }
    draw(); window.addEventListener('resize', draw); setTimeout(draw,300); setTimeout(draw,900);
  }

  /* ---- tech spec toggle ---- */
  const techCard = document.getElementById('techCard');
  const techHead = document.getElementById('techHead');
  const techOpen = document.getElementById('techOpen');
  if (techHead) techHead.addEventListener('click', ()=> techCard.classList.toggle('open'));
  [techOpen, document.getElementById('techOpen2'), document.getElementById('techOpen3')].forEach(btn=>{
    if (btn) btn.addEventListener('click', (ev)=>{
      ev.preventDefault();
      techCard.classList.add('open');
      document.getElementById('tech').scrollIntoView({behavior:'smooth'});
    });
  });

  /* ---- lead form ---- */
  const form = document.getElementById('leadForm');
  [form, document.getElementById('leadForm2'), document.getElementById('leadForm3')].forEach(f => {
    if (!f) return;
    f.addEventListener('submit', (e)=>{
      e.preventDefault();
      const btn = f.querySelector('button[type=submit]');
      const orig = btn.textContent;
      btn.textContent = 'Заявка отправлена ✓';
      btn.style.background = 'var(--green)';
      setTimeout(()=>{ f.reset(); btn.textContent = orig; btn.style.background=''; }, 2600);
    });
  });
})();
