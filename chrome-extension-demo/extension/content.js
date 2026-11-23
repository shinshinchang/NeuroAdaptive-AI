/* NeuroAdaptive AI – Chrome extension demo (content script)
 * 在任何網頁收集滑鼠/捲動微行為（滾動 12 秒視窗），計算 0–100 注意力負荷指標。
 * 權重沿用 NeuroAdaptive-AI-v0.1/js/analyzer.js 的 0.30/0.28/0.20/0.12/0.10，
 * 但把 Go/No-Go 專用特徵換成「自由瀏覽」可量到的對應特徵（見 README 對照表）。
 * 所有資料只存在記憶體，不上傳、不儲存原始軌跡。非醫療診斷工具。 */
(() => {
  if (window.__naLoaded) return; window.__naLoaded = true;
  if (document.querySelector('meta[name="na-exclude"]')) return;

  const WINDOW_MS = 12000, CALIB_MS = 25000;
  const calib = { start: performance.now(), sum: 0, n: 0, base: null }; // 個人基準線
  const S = { enabled: true, sensitivity: 1.0, demoMode: false, trail: false, autoPrompt: true };
  let moves = [], scrolls = [], lastScrollY = window.scrollY, lastScrollDir = 0, segStart = window.scrollY;
  let score = 0, comps = {}, highSince = 0, prompted = false, snoozeUntil = 0;
  let focusOn = false, chunkOn = false, rulerOn = false, focusHighSince = 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- UI (shadow DOM so page CSS can't break it) ----------
  const host = document.createElement('div'); host.id = 'na-root';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
  :host{all:initial}
  *{box-sizing:border-box;font-family:"Noto Sans CJK TC","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif}
  .badge{position:fixed;top:16px;right:16px;z-index:2147483646;background:#fffdf7;border-radius:18px;padding:10px 14px 10px 10px;display:flex;gap:10px;align-items:flex-start;box-shadow:0 6px 18px rgba(0,0,0,.18);cursor:pointer;border:2px solid #e8e1d3;min-width:190px}
  .ring{width:58px;height:58px;position:relative}
  .ring svg{transform:rotate(-90deg)}
  .num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;color:#222}
  .lbl{font-size:12px;color:#666;line-height:1.3}.lvl{font-size:16px;font-weight:800}
  .detail{display:none;margin-top:6px;font-size:11px;color:#444}.badge.open .detail{display:block}
  .bar{height:5px;background:#eee;border-radius:3px;margin:2px 0 5px}.bar i{display:block;height:100%;border-radius:3px;background:#3478f6}
  .prompt{position:fixed;top:100px;right:16px;z-index:2147483646;width:330px;background:#fffdf7;border-radius:16px;padding:18px;box-shadow:0 12px 32px rgba(0,0,0,.25);border:2px solid #f0a33a;transform:translateY(-10px);opacity:0;transition:all .35s;pointer-events:none}
  .prompt.show{opacity:1;transform:none;pointer-events:auto}
  .prompt h3{margin:0 0 6px;font-size:17px;color:#222}.prompt p{margin:0 0 14px;font-size:13px;color:#555;line-height:1.6}
  .btn{border:0;border-radius:10px;padding:9px 16px;font-size:14px;font-weight:700;cursor:pointer;margin-right:8px}
  .pri{background:#2f7d5b;color:#fff}.sec{background:#eee;color:#333}
  .ruler{position:fixed;left:0;right:0;z-index:2147483640;pointer-events:none;display:none}
  .rtop{top:0;background:rgba(30,25,20,.45)}.rbot{bottom:0;background:rgba(30,25,20,.45)}
  .rband{position:fixed;left:0;right:0;height:46px;border-top:2px solid #f0a33a;border-bottom:2px solid #f0a33a;pointer-events:none;z-index:2147483641;display:none}
  .prog{position:fixed;top:0;left:0;height:6px;background:#2f7d5b;z-index:2147483647;width:0;transition:width .3s;display:none}
  .chunknav{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483646;display:none;background:#fffdf7;border-radius:14px;padding:8px;box-shadow:0 6px 18px rgba(0,0,0,.2)}
  .brk{position:fixed;inset:0;z-index:2147483647;background:rgba(246,241,231,.96);display:none;align-items:center;justify-content:center;flex-direction:column;color:#333}
  .brk.show{display:flex}.breath{width:140px;height:140px;border-radius:50%;background:#9cc9b0;animation:br 8s ease-in-out infinite}
  @keyframes br{0%,100%{transform:scale(.6)}50%{transform:scale(1.1)}}
  .toast{position:fixed;left:50%;top:18px;transform:translateX(-50%);background:#2b2622;color:#fff;padding:8px 16px;border-radius:20px;font-size:14px;z-index:2147483647;opacity:0;transition:opacity .3s}
  canvas{position:fixed;inset:0;pointer-events:none;z-index:2147483639}
  </style>
  <canvas id="trail"></canvas>
  <div class="ruler rtop" id="rt"></div><div class="rband" id="rb"></div><div class="ruler rbot" id="rbt"></div>
  <div class="prog" id="prog"></div>
  <div class="badge" id="badge"><div class="ring"><svg width="58" height="58"><circle cx="29" cy="29" r="24" stroke="#eee" stroke-width="7" fill="none"/><circle id="arc" cx="29" cy="29" r="24" stroke="#2f7d5b" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="150.8" stroke-dashoffset="150.8" style="transition:all .4s"/></svg><div class="num" id="num">0</div></div>
   <div><div class="lbl">注意力負荷（即時）</div><div class="lvl" id="lvl">低</div><div class="detail" id="det"></div></div></div>
  <div class="prompt" id="prompt"><h3>偵測到注意力負荷偏高，要開啟專注模式嗎？</h3><p>最近幾秒的滑鼠移動變化較大。專注模式會藏起廣告與側欄、降低彩度並放大字距。你可以隨時關閉。</p>
   <button class="btn pri" id="yes">開啟</button><button class="btn sec" id="no">稍後</button></div>
  <div class="chunknav" id="cn"><button class="btn sec" id="cprev">上一段</button><button class="btn pri" id="cnext">下一段</button></div>
  <div class="brk" id="brk"><div class="breath"></div><h2 style="margin:28px 0 6px">休息一分鐘</h2><p id="brkt">跟著圓圈慢慢吸氣、吐氣　60</p><button class="btn sec" id="brkx">略過</button></div>
  <div class="toast" id="toast"></div><button class="btn sec" id="undo" style="position:fixed;left:16px;bottom:16px;z-index:2147483646;display:none;box-shadow:0 4px 12px rgba(0,0,0,.2)">↩ 一鍵復原</button>`;
  (document.body || document.documentElement).appendChild(host);
  const $ = id => root.getElementById(id);

  // ---------- data collection ----------
  addEventListener('mousemove', e => { if (S.enabled) moves.push({ t: performance.now(), x: e.clientX, y: e.clientY }); placeRuler(e.clientY); }, { passive: true });
  addEventListener('scroll', () => {
    // 方向反轉且這一段捲動 ≥120px 才算一次「來回捲動」
    const y = window.scrollY, d = Math.sign(y - lastScrollY);
    if (d && d !== lastScrollDir) { if (lastScrollDir && Math.abs(lastScrollY - segStart) >= 120) scrolls.push(performance.now()); lastScrollDir = d; segStart = lastScrollY; }
    lastScrollY = y;
  }, { passive: true });

  function features() {
    const now = performance.now();
    moves = moves.filter(m => now - m.t < WINDOW_MS); scrolls = scrolls.filter(t => now - t < WINDOW_MS);
    const sp = []; let dirCh = 0, path = 0, activeMs = 0, prevAng = null, bursts = 0;
    for (let i = 1; i < moves.length; i++) {
      const a = moves[i - 1], b = moves[i], dt = b.t - a.t; if (dt <= 0 || dt > 250) { prevAng = null; continue; }
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 2) continue;
      const v = d / dt * 1000; sp.push(v); path += d; activeMs += dt; if (v > 2200) bursts++;
      const ang = Math.atan2(dy, dx);
      if (prevAng !== null) { let da = Math.abs(ang - prevAng); if (da > Math.PI) da = 2 * Math.PI - da; if (da > Math.PI / 2) dirCh++; }
      prevAng = ang;
    }
    const n = sp.length, mean = n ? sp.reduce((s, v) => s + v, 0) / n : 0;
    const sd = n > 1 ? Math.sqrt(sp.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)) : 0;
    const act = Math.max(activeMs / 1000, 0.5);
    return { n, speedMean: mean, speedSD: sd, speedCV: mean ? sd / mean : 0, burstRatio: n ? bursts / n : 0,
      dirPerSec: dirCh / act, scrollFlips: scrolls.length, activeSec: activeMs / 1000 };
  }

  function compute() {
    const f = features();
    // 與 analyzer.js 相同的加權結構，特徵換成自由瀏覽對應版本
    comps = {
      paceVariability: clamp((f.speedCV - 0.55) / 0.9, 0, 1),   // ← rtVariability ×0.30（移動節奏不穩）
      impulsiveBursts: clamp(f.burstRatio / 0.22, 0, 1),        // ← commission ×0.28（突發高速甩動）
      scrollBacktrack: clamp(f.scrollFlips / 6, 0, 1),          // ← omission ×0.20（來回捲動／找不到位置）
      direction: clamp((f.dirPerSec - 0.6) / 4, 0, 1),          // ← direction ×0.12
      movementVariability: clamp(f.speedSD / 900, 0, 1),       // ← speed SD ×0.10
    };
    let raw = 100 * (comps.paceVariability * .30 + comps.impulsiveBursts * .28 + comps.scrollBacktrack * .20 + comps.direction * .12 + comps.movementVariability * .10);
    if (f.activeSec < 1.0) raw *= f.activeSec;                   // 幾乎沒動 → 不判斷
    // 個人基準線：前 25 秒（有在動的時候）的平均原始分數當作「這個人平常的樣子」，之後只看高出基準的部分
    if (!S.demoMode) {
      if (calib.base === null) { if (f.activeSec >= 1) { calib.sum += raw; calib.n++; } if (performance.now() - calib.start > CALIB_MS && calib.n >= 10) calib.base = Math.min(calib.sum / calib.n, 50); }
      else { const b = calib.base * 0.8; raw = clamp((raw - b) * 100 / (100 - b), 0, 100); }
    }
    raw = clamp(raw * S.sensitivity, 0, 100);
    score = score + (raw - score) * 0.35;                         // 平滑
    render(f);
  }

  const TH = () => S.demoMode ? { high: 50, mod: 28, hold: 1500, prompt: 50 } : { high: 65, mod: 35, hold: 6000, prompt: 70 };
  function render(f) {
    const s = Math.round(score), th = TH();
    const lvl = s >= th.high ? 'High' : s >= th.mod ? 'Moderate' : 'Low';
    const col = lvl === 'High' ? '#d9532b' : lvl === 'Moderate' ? '#f0a33a' : '#2f7d5b';
    $('num').textContent = s; $('lvl').textContent = { High: '偏高', Moderate: '中等', Low: '低' }[lvl]; $('lvl').style.color = col; if (!S.demoMode && calib.base === null) $('lvl').textContent += '・校準中';
    $('arc').style.stroke = col; $('arc').style.strokeDashoffset = 150.8 * (1 - s / 100);
    const names = { paceVariability: '節奏不穩 ×0.30', impulsiveBursts: '突發甩動 ×0.28', scrollBacktrack: '來回捲動 ×0.20', direction: '方向變換 ×0.12', movementVariability: '速度變異 ×0.10' };
    $('det').innerHTML = Object.entries(comps).map(([k, v]) => `${names[k]}<div class="bar"><i style="width:${Math.round(v * 100)}%"></i></div>`).join('') + '<div style="color:#999">資料只在本機計算・非診斷</div>';
    window.__naState = { score: s, level: lvl, comps, features: f, focusOn };
    document.documentElement.setAttribute('data-na-score', s); document.documentElement.setAttribute('data-na-state', JSON.stringify({ score: s, level: lvl, focusOn, comps: Object.fromEntries(Object.entries(comps).map(([k, v]) => [k, +v.toFixed(2)])) }));
    const now = performance.now();
    if (s >= th.prompt) { if (!highSince) highSince = now; } else highSince = 0;
    if (S.autoPrompt && !focusOn && !prompted && highSince && now - highSince > th.hold && now > snoozeUntil) { prompted = true; $('prompt').classList.add('show'); }
    if (focusOn) { if (lvl === 'High') { if (!focusHighSince) focusHighSince = now; if (now - focusHighSince > 60000) { focusHighSince = 0; showBreak(); } } else focusHighSince = 0; }
    const bb = $('badge').getBoundingClientRect(); $('prompt').style.top = (bb.bottom + 12) + 'px';
    drawTrail();
  }

  // ---------- mouse trail overlay (demo) ----------
  const cv = $('trail'), ctx = cv.getContext('2d');
  function drawTrail() {
    cv.width = innerWidth; cv.height = innerHeight; if (!S.trail) return;
    const now = performance.now(), pts = moves.filter(m => now - m.t < 2500);
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i]; if (b.t - a.t > 250) { ctx.fillStyle = 'rgba(217,83,43,.6)'; ctx.beginPath(); ctx.arc(a.x, a.y, 6, 0, 7); ctx.fill(); continue; }
      ctx.strokeStyle = `rgba(217,83,43,${0.15 + 0.7 * (1 - (now - b.t) / 2500)})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }

  // ---------- Focus Mode ----------
  function findMain() {
    const cands = [...document.querySelectorAll('article, main, [role=main], div, section')];
    let best = null, bs = 0;
    for (const el of cands) { if (host.contains(el)) continue; const ps = el.querySelectorAll(':scope > p'); let t = 0; ps.forEach(p => t += p.textContent.length); if (t > bs) { bs = t; best = el; } }
    return best;
  }
  const NOISE = 'aside, nav, iframe, marquee, video[autoplay], [class*="ad-"], [class*="-ad"], [class^="ad"], [id^="ad"], [class*="banner"], [class*="sponsor"], [class*="promo"], [class*="comment"], [class*="sidebar"], [class*="related"], [class*="popup"], [class*="recommend"], [class*="ticker"], [class*="newsletter"], [data-na-noise]';
  function setFocus(on, staged = true) {
    if (on === focusOn) return; focusOn = on; $('prompt').classList.remove('show');
    const html = document.documentElement;
    if (!on) { $('undo').style.display = 'none'; html.classList.remove('na-f1', 'na-f2', 'na-f3', 'na-f4', 'na-focus'); document.querySelectorAll('.na-hide,.na-slide').forEach(e => e.classList.remove('na-hide', 'na-slide', 'na-gone')); setChunk(false); setRuler(false); toast('專注模式已關閉'); prompted = false; return; }
    const main = findMain(); if (main) main.setAttribute('data-na-main', '');
    // 不是正文祖先的兄弟節點都視為干擾
    const keep = new Set(); let p = main; while (p) { keep.add(p); p = p.parentElement; }
    const noise = new Set(document.querySelectorAll(NOISE));
    if (main) { let a = main; while (a && a !== document.body) { for (const sib of a.parentElement.children) if (!keep.has(sib) && sib !== host && !/^H1$/.test(sib.tagName) && !sib.querySelector('h1')) noise.add(sib); a = a.parentElement; } }
    for (const el of document.querySelectorAll('body *')) { if (el === host || keep.has(el) || el.closest('[data-na-keep]')) continue; const cs = getComputedStyle(el); if (cs.position === 'fixed' || cs.position === 'sticky') noise.add(el); }
    noise.forEach(el => { if (keep.has(el) || el.closest('[data-na-keep]') || el === host || host.contains(el)) noise.delete(el); });
    document.querySelectorAll('video,audio').forEach(v => { try { v.pause(); v.autoplay = false; } catch (e) {} });
    const ads = [...noise].filter(e => /ad|banner|sponsor|promo|iframe|marquee|popup/i.test(e.className + ' ' + e.id + ' ' + e.tagName) || e.hasAttribute('data-na-ad'));
    const rest = [...noise].filter(e => !ads.includes(e));
    $('undo').style.display = 'block';
    const steps = [
      () => { ads.forEach(e => e.classList.add('na-hide')); toast('① 藏起干擾：廣告淡出'); },
      () => { rest.forEach(e => e.classList.add('na-slide')); toast('② 側欄、推薦、留言滑走'); },
      () => { html.classList.add('na-f3'); toast('③ 降低彩度、停止動畫'); },
      () => { [...noise].forEach(e => e.classList.add('na-gone')); html.classList.add('na-f4', 'na-focus'); window.scrollTo({ top: 0 }); toast('④ 放大字距、單欄閱讀'); },
    ];
    const gap = staged ? 1100 : 0; steps.forEach((fn, i) => setTimeout(fn, i * gap));
    window.dispatchEvent(new CustomEvent('na-focus-on'));
  }

  // reading ruler
  let rulerY = innerHeight / 2;
  function placeRuler(y) { rulerY = y; if (!rulerOn) return; const h = 46, t = Math.max(0, y - h / 2); $('rt').style.height = t + 'px'; $('rb').style.top = t + 'px'; $('rbt').style.top = (t + h) + 'px'; $('rbt').style.height = 'auto'; }
  function setRuler(on) { rulerOn = on; ['rt', 'rb', 'rbt'].forEach(i => $(i).style.display = on ? 'block' : 'none'); placeRuler(rulerY); }

  // chunked paragraphs
  let chunkIdx = 0, paras = [];
  function setChunk(on) {
    chunkOn = on; const main = document.querySelector('[data-na-main]') || findMain();
    paras = main ? [...main.querySelectorAll(':scope > p')] : [];
    $('prog').style.display = $('cn').style.display = on && paras.length ? 'block' : 'none';
    paras.forEach(p => p.classList.toggle('na-dim', on)); if (on) showChunk(0);
  }
  function showChunk(i) { chunkIdx = clamp(i, 0, paras.length - 1); paras.forEach((p, k) => { p.classList.toggle('na-cur', k === chunkIdx); p.classList.toggle('na-dim', k !== chunkIdx); }); paras[chunkIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); $('prog').style.width = ((chunkIdx + 1) / paras.length * 100) + '%'; }
  $('cnext').onclick = () => showChunk(chunkIdx + 1); $('cprev').onclick = () => showChunk(chunkIdx - 1);
  addEventListener('keydown', e => { if (!chunkOn) return; if (e.key === 'ArrowRight' || e.key === 'j') showChunk(chunkIdx + 1); if (e.key === 'ArrowLeft' || e.key === 'k') showChunk(chunkIdx - 1); });

  // break reminder
  let brkTimer;
  function showBreak() { let n = 60; $('brk').classList.add('show'); clearInterval(brkTimer); brkTimer = setInterval(() => { n--; $('brkt').textContent = '跟著圓圈慢慢吸氣、吐氣　' + n; if (n <= 0) hideBreak(); }, 1000); }
  function hideBreak() { clearInterval(brkTimer); $('brk').classList.remove('show'); }
  $('brkx').onclick = hideBreak;

  let toastT; function toast(m) { const t = $('toast'); t.textContent = m; t.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => t.style.opacity = 0, 1600); }
  $('undo').onclick = () => setFocus(false);
  $('yes').onclick = () => setFocus(true); $('no').onclick = () => { $('prompt').classList.remove('show'); prompted = false; snoozeUntil = performance.now() + 60000; };
  $('badge').onclick = () => $('badge').classList.toggle('open');

  // ---------- control channel ----------
  function cmd(c, v) {
    switch (c) {
      case 'focus': setFocus(v === undefined ? !focusOn : !!v, true); break;
      case 'focusInstant': setFocus(!!v, false); break;
      case 'chunk': setChunk(v === undefined ? !chunkOn : !!v); break;
      case 'ruler': setRuler(v === undefined ? !rulerOn : !!v); break;
      case 'break': showBreak(); break;
      case 'details': $('badge').classList.toggle('open', !!v); break;
      case 'reset': calib.start = performance.now(); calib.sum = 0; calib.n = 0; calib.base = null; moves = []; scrolls = []; score = 0; prompted = false; snoozeUntil = 0; hideBreak(); if (focusOn) setFocus(false); break;
    }
    return { score: Math.round(score), focusOn, chunkOn, rulerOn };
  }
  try {
    chrome.runtime.onMessage.addListener((m, _, reply) => { reply(m.cmd === 'state' ? { score: Math.round(score), level: window.__naState?.level, focusOn, chunkOn, rulerOn } : cmd(m.cmd, m.value)); });
    const apply = st => { Object.assign(S, st); host.style.display = S.enabled ? '' : 'none'; };
    chrome.storage.local.get(S, apply);
    chrome.storage.onChanged.addListener(ch => { const o = {}; for (const k in ch) o[k] = ch[k].newValue; apply(o); });
  } catch (e) {}
  // 也接受頁面事件（給錄影腳本 / 攤位遙控使用）
  document.addEventListener('na-cmd', e => { const d = e.detail || {}; if (d.settings) Object.assign(S, d.settings); if (d.cmd) cmd(d.cmd, d.value); });
  setInterval(() => { if (S.enabled) compute(); }, 400);
})();
