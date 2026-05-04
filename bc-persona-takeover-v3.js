/**
 * BC 16-Tag Persona · TAKEOVER v3
 *
 * 严格约束：
 *   - 不动 #bcSubmitBtn (id / onclick / 任何属性) → 保留 Meta Pixel click 埋点
 *   - 不动付费 CTA href="/products/the-reading"
 *   - 不动 hero / 其他 section
 *   - 只接管 #bcLoading 和 #bcResults 两个区域
 *
 * 实现：
 *   - Override window.bcSubmitChart 函数（DOM event listener 不受影响 · 埋点保留）
 *   - 注入大罗盘（嵌入 compass canvas init code · 不依赖主题 compass.js）
 *   - 进度条 0% → 92% (28s) → 100% (GLM 完成)
 *   - 揭秘分段：tag → 卡图 → typewriter 话术 → Wiring → CTA
 *   - 保留 fbq Lead 触发
 *
 * Install:
 *   Shopline Admin → 自定义代码 → 编辑 / 添加：
 *   <script src="https://cdn.jsdelivr.net/gh/jy02133048-max/bc-tags-cards@main/bc-persona-takeover-v3.js?v=1" defer></script>
 *
 * Uninstall: 删 Script Tag · 30 秒回原状。
 */
(function() {
  'use strict';
  var API = 'https://blissful-alignment-production.up.railway.app';
  var CDN = 'https://cdn.jsdelivr.net/gh/jy02133048-max/bc-tags-cards@main';

  var EL_COLORS = { '木':'#7A9E7E', '火':'#C47A6A', '土':'#C9A96E', '金':'#B8B8B8', '水':'#6A9EB8' };
  var EL_NAMES = { '木':'Wood', '火':'Fire', '土':'Earth', '金':'Metal', '水':'Water' };
  var STAGES = ['Mapping your wiring','Reading the pattern','Listening to silences','Matching your persona','Writing your card','Sealing it'];

  var stageInterval = null;
  var progressInterval = null;
  var typewriterTimer = null;
  var compassInited = false;

  // ─── Compass canvas (embedded · 不依赖主题 compass.js) ───
  function initCompass(containerId, sizePx) {
    var container = document.getElementById(containerId);
    if (!container) return;
    if (container.dataset.compassInited === '1') return;
    container.dataset.compassInited = '1';
    var size = sizePx || 280;
    var MC = document.createElement('canvas'), FC = document.createElement('canvas');
    MC.width = 600; MC.height = 600; FC.width = 600; FC.height = 600;
    MC.style.cssText = 'width:100%;height:100%;display:block;';
    FC.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
    container.style.cssText = 'width:'+size+'px;height:'+size+'px;position:relative;margin:0 auto;';
    container.appendChild(MC); container.appendChild(FC);
    var mc = MC.getContext('2d'), fc = FC.getContext('2d'), W = 600, H = 600, cx = W/2, cy = H/2;
    var d28 = '角亢氐房心尾箕斗牛女虚危室壁奎娄胃昴毕觜参井鬼柳星张翼轸'.split('');
    var d24 = '壬子癸丑艮寅甲卯乙辰巽巳丙午丁未坤申庚酉辛戌乾亥'.split('');
    var tg = '甲乙丙丁戊己庚辛壬癸'.split(''), dz = '子丑寅卯辰巳午未申酉戌亥'.split('');
    var bgS = '☰☱☲☳☴☵☶☷';
    var wx = [{c:'金',cl:'#ddc88a'},{c:'木',cl:'#8ab872'},{c:'水',cl:'#72a0b8'},{c:'火',cl:'#d48a5a'},{c:'土',cl:'#b8a068'}];
    var S = 0.75, rings = [
      {oR:375*S,iR:345*S,speed:0.04,divs:360,label:'ticks'},
      {oR:345*S,iR:300*S,chars:d28,cR:322*S,cS:10,cW:'600',speed:-0.06,divs:28},
      {oR:300*S,iR:260*S,chars:d24,cR:280*S,cS:10,cW:'600',speed:0.04,divs:24},
      {oR:260*S,iR:215*S,chars:tg,cR:237*S,cS:16,cW:'700',speed:-0.05,divs:10,glow:true},
      {oR:215*S,iR:170*S,chars:dz,cR:192*S,cS:14,cW:'700',speed:0.035,divs:12,glow:true},
      {oR:170*S,iR:130*S,speed:-0.045,divs:8,label:'bagua'},
      {oR:130*S,iR:68*S,speed:0.03,divs:5,label:'wuxing'}
    ];
    var rots = rings.map(function(){return 0;}), t0 = null, lightAngle = 0;
    function eOC(t){return 1-Math.pow(1-t,3);}
    function eOB(t){var s=1.8;return 1+((s+1)*Math.pow(t-1,3))+(s*Math.pow(t-1,2));}
    function entry(i,el){var delay=400+i*300,t=Math.max(0,Math.min(1,(el-delay)/800));return{a:eOC(t),r:(1-eOB(Math.min(1,t*1.3)))*(i%2===0?-50:50)};}
    function drawRing(ctx, r, i, el) {
      var en = entry(i, el), ringR = (r.oR + r.iR) / 2 + en.r;
      ctx.save(); ctx.globalAlpha = en.a; ctx.translate(cx, cy);
      ctx.beginPath(); ctx.arc(0, 0, r.oR, 0, Math.PI*2); ctx.strokeStyle = '#c8b88a'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r.iR, 0, Math.PI*2); ctx.strokeStyle = '#c8b88a'; ctx.lineWidth = 1; ctx.stroke();
      ctx.rotate(rots[i]);
      if (r.label === 'ticks') {
        for (var j = 0; j < r.divs; j++) {
          var a = (j / r.divs) * Math.PI * 2; var len = (j % 5 === 0) ? 12 : 6;
          ctx.beginPath(); ctx.moveTo(Math.cos(a)*r.oR, Math.sin(a)*r.oR); ctx.lineTo(Math.cos(a)*(r.oR-len), Math.sin(a)*(r.oR-len));
          ctx.strokeStyle = '#a89568'; ctx.lineWidth = (j % 5 === 0) ? 1.2 : 0.6; ctx.stroke();
        }
      } else if (r.label === 'bagua') {
        for (var j = 0; j < 8; j++) {
          var a = (j / 8) * Math.PI * 2 - Math.PI/2;
          ctx.save(); ctx.rotate(a + Math.PI/2);
          ctx.font = '20px serif'; ctx.fillStyle = '#a89568'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(bgS[j], 0, -ringR);
          ctx.restore();
        }
      } else if (r.label === 'wuxing') {
        for (var j = 0; j < 5; j++) {
          var a = (j / 5) * Math.PI * 2 - Math.PI/2;
          var x = Math.cos(a) * ringR, y = Math.sin(a) * ringR;
          ctx.fillStyle = wx[j].cl; ctx.font = 'bold 22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(wx[j].c, x, y);
        }
      } else if (r.chars) {
        for (var j = 0; j < r.divs; j++) {
          var a = (j / r.divs) * Math.PI * 2 - Math.PI/2;
          ctx.save(); ctx.rotate(a + Math.PI/2);
          ctx.font = (r.cW||'500') + ' ' + (r.cS||12) + 'px serif';
          ctx.fillStyle = r.glow ? '#8a7355' : '#6f6358';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(r.chars[j % r.chars.length], 0, -ringR);
          ctx.restore();
        }
      }
      ctx.restore();
    }
    function drawLight() {
      fc.clearRect(0, 0, W, H);
      var grad = fc.createRadialGradient(cx + Math.cos(lightAngle)*200, cy + Math.sin(lightAngle)*200, 30, cx, cy, 320);
      grad.addColorStop(0, 'rgba(255,240,200,0.3)'); grad.addColorStop(1, 'rgba(255,240,200,0)');
      fc.fillStyle = grad; fc.beginPath(); fc.arc(cx, cy, 320, 0, Math.PI*2); fc.fill();
    }
    function frame(ts) {
      if (!t0) t0 = ts; var el = ts - t0;
      mc.clearRect(0, 0, W, H);
      rings.forEach(function(r, i) { rots[i] += r.speed * 0.016; drawRing(mc, r, i, el); });
      lightAngle += 0.005; drawLight();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ─── Build loading panel + persona slot in DOM ───
  function buildPanels() {
    var bcLoading = document.getElementById('bcLoading');
    var bcResults = document.getElementById('bcResults');
    if (!bcLoading || !bcResults) return false;
    if (bcLoading.dataset.bcV3 === '1') return true;
    bcLoading.dataset.bcV3 = '1';

    // 替换 loading 内容（保留 div · 替换内部 HTML）
    bcLoading.innerHTML = [
      '<div id="bcCompassLoading" style="margin:0 auto 28px;"></div>',
      '<p style="font-size:18px;color:#2D2A26;font-weight:500;margin:0 0 6px;letter-spacing:0.02em;">Reading your chart…</p>',
      '<p id="bcLoadingStage" style="font-size:14px;color:#8a7355;font-style:italic;margin:0 0 24px;letter-spacing:0.04em;">Mapping your wiring</p>',
      '<div style="max-width:340px;margin:0 auto;">',
      '  <div style="height:4px;background:#E8E6E1;border-radius:2px;overflow:hidden;">',
      '    <div id="bcProgressBar" style="height:100%;width:0%;background:linear-gradient(90deg,#8a7355,#a0875e);transition:width 0.4s ease;"></div>',
      '  </div>',
      '  <p id="bcProgressLabel" style="font-size:11px;color:#9B958E;margin:8px 0 0;letter-spacing:0.18em;text-transform:uppercase;">0%</p>',
      '</div>'
    ].join('');
    bcLoading.style.cssText = 'display:none;text-align:center;padding:24px 0;';

    // 替换 results 内容（保留 div + bcResults id · 替换内部 · 保留 a[href=/products/the-reading]）
    bcResults.innerHTML = [
      '<div style="display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:8px 16px;font-size:14px;background:#2D2A26;color:#FFF;">✦ Your Persona Card</div>',
      '<div style="margin-top:24px;text-align:center;">',
      '  <img id="bcCardImg" alt="" style="width:100%;max-width:380px;border-radius:14px;box-shadow:0 8px 32px rgba(45,42,38,0.18);border:1px solid #E8E6E1;background:#f5f0e6;display:block;margin:0 auto;aspect-ratio:9/16;object-fit:cover;opacity:0;transform:scale(0.96);transition:opacity 0.7s ease,transform 0.7s ease;">',
      '  <h3 id="bcCardTag" style="margin-top:24px;font-family:\'Songti SC\',\'Times New Roman\',serif;font-size:clamp(1.8rem,3.8vw,2.6rem);font-weight:500;letter-spacing:0.04em;color:#2D2A26;line-height:1.15;opacity:0;transition:opacity 0.5s ease;"></h3>',
      '  <p id="bcCardZodiac" style="margin-top:4px;font-size:12px;text-transform:uppercase;letter-spacing:0.18em;color:#8a7355;opacity:0;transition:opacity 0.5s ease;"></p>',
      '</div>',
      '<p id="bcCardCopy" style="margin-top:24px;font-size:17px;line-height:1.75;color:#2D2A26;text-align:left;padding:0 4px;min-height:24px;"></p>',
      '<div id="bcWiringWrap" style="margin-top:32px;padding:20px;background:#FAFAF9;border-radius:12px;border:1px solid #E8E6E1;opacity:0;transition:opacity 0.6s ease;">',
      '  <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.18em;color:#8a7355;margin:0 0 12px;">Your Wiring</p>',
      '  <div id="bcWiringBar" style="display:flex;height:10px;border-radius:5px;overflow:hidden;background:#E8E6E1;margin-bottom:10px;"></div>',
      '  <div id="bcWiringLegend" style="display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:#6B6560;"></div>',
      '  <p id="bcWiringDayMaster" style="font-size:13px;color:#6B6560;margin:14px 0 0;font-family:\'Songti SC\',serif;letter-spacing:0.05em;"></p>',
      '</div>',
      '<div id="bcEmailCapture" style="display:none;margin-top:24px;border:1px solid #E8E6E1;border-radius:12px;padding:18px;background:#FAFAF9;opacity:0;transition:opacity 0.5s ease;">',
      '  <p style="font-size:14px;color:#2D2A26;margin:0 0 12px;">📩 Want this card + your full chart by email?</p>',
      '  <div style="display:flex;gap:8px;">',
      '    <input type="email" id="bcEmailCaptureInput" placeholder="you@example.com" style="flex:1;height:44px;padding:0 14px;font-size:15px;border:1px solid #D8D6D1;border-radius:10px;background:#FFF;outline:none;">',
      '    <button id="bcEmailCaptureBtn" style="height:44px;padding:0 18px;border-radius:10px;background:#2D2A26;color:#FFF;font-size:13px;font-weight:500;border:none;cursor:pointer;white-space:nowrap;">Send it</button>',
      '  </div>',
      '  <p id="bcEmailCaptureMsg" style="display:none;font-size:13px;color:#8a7355;margin-top:10px;"></p>',
      '</div>',
      '<div id="bcCta" style="margin-top:32px;padding:28px;border-radius:14px;background:linear-gradient(135deg,rgba(138,115,85,0.08),rgba(138,115,85,0.02));border:1px solid #E8E6E1;opacity:0;transition:opacity 0.5s ease;">',
      '  <p style="font-size:16px;font-weight:500;color:#2D2A26;margin:0 0 4px;">This is one card. There are nine more layers.</p>',
      '  <p style="font-size:13px;color:#6B6560;margin:0 0 18px;line-height:1.5;">Your full reading: 11,000+ words · 30+ pages · across 10 chapters covering past / present / 2026 forecast / love / career.</p>',
      // ⚠️ 付费 CTA 链接保持 /products/the-reading 不变 · 文字保持
      '  <a href="/products/the-reading" style="display:block;text-align:center;padding:16px;border-radius:12px;background:#8a7355;color:#FFF;font-size:16px;font-weight:500;text-decoration:none;">Get Your Full Reading — $29</a>',
      '  <p style="text-align:center;margin-top:10px;font-size:12px;color:#6B6560;">100% refund if it doesn\'t resonate.</p>',
      '</div>',
      '<button id="bcResetBtn" style="display:block;margin:20px auto 0;background:none;border:none;color:#8a7355;font-size:13px;cursor:pointer;text-decoration:underline;">← Try a different birthday</button>'
    ].join('');
    bcResults.style.display = 'none';

    // Wire up email capture button
    var emailBtn = document.getElementById('bcEmailCaptureBtn');
    if (emailBtn) emailBtn.addEventListener('click', captureEmail);
    var resetBtn = document.getElementById('bcResetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetFlow);

    return true;
  }

  // ─── Rewrite hero copy + button text (button element + id + onclick 不动) ───
  function rewriteHeroCopy() {
    var formWrap = document.getElementById('bcFormWrap');
    if (!formWrap) return;
    // Hero pill
    formWrap.querySelectorAll('div').forEach(function(d) {
      var t = (d.textContent || '').trim();
      if (t === '✦ Free Instant Preview') d.textContent = '✦ Free Instant Persona Card';
    });
    // Hero h2 ("See what your compass says.")
    var h2 = formWrap.querySelector('h2');
    if (h2 && /compass says/i.test(h2.textContent)) {
      h2.innerHTML = 'Find out which <em style="color:#8a7355;">persona</em> your chart says you are.';
    }
    // Hero sub ("Enter your birth details. Get your Five Element breakdown...")
    var subs = formWrap.querySelectorAll('p');
    subs.forEach(function(p) {
      if (/Five Element breakdown|personality snapshot/i.test(p.textContent)) {
        p.textContent = "Enter your birth details. We'll match you to one of 16 persona cards — free, ready in ~30 seconds.";
      }
    });
    // Submit button text only (id / onclick / element 不动 · 埋点保留)
    var btn = document.getElementById('bcSubmitBtn');
    if (btn && /See My Chart/i.test(btn.textContent)) {
      btn.textContent = 'Reveal My Persona →';
    }
    // 文案改完 · 解除 pre-hide · fade-in 表单
    formWrap.classList.add('bc-persona-ready');
  }

  // ─── Override button click handler (移除 inline onclick · 加 listener · 保留 click event 给埋点) ───
  function takeOver() {
    if (!buildPanels()) {
      setTimeout(takeOver, 500);
      return;
    }
    rewriteHeroCopy();
    // 双保险 override:
    // 1. Override window.bcSubmitChart (理论上够了)
    window.bcSubmitChart = personaFlow;
    // 2. 移除 button 的 inline onclick · 加 addEventListener
    //    这样 inline `bcSubmitChart()` 不会触发旧逻辑 · 但 click event 仍然 fire · Meta Pixel 等第三方埋点（监听 click event）不受影响
    var btn = document.getElementById('bcSubmitBtn');
    if (btn && btn.dataset.bcV3Bound !== '1') {
      btn.dataset.bcV3Bound = '1';
      btn.removeAttribute('onclick');
      btn.addEventListener('click', function(e) { personaFlow(); });
    }
    console.log('[bc-persona-v3] takeover armed (hero copy rewritten · button bound)');
  }

  function personaFlow() {
    var year = parseInt(document.getElementById('bcYear').value);
    var month = parseInt(document.getElementById('bcMonth').value);
    var day = parseInt(document.getElementById('bcDay').value);
    var hourVal = document.getElementById('bcHour').value;
    var hour = hourVal ? parseInt(hourVal) : 12;
    var city = document.getElementById('bcCity').value;
    var gender = document.getElementById('bcGender').value;
    var email = document.getElementById('bcEmail').value.trim();
    var errEl = document.getElementById('bcError');

    if (!year || !month || !day || !gender) {
      if (errEl) { errEl.textContent = 'Please fill in date of birth and gender.'; errEl.style.display = 'block'; }
      return;
    }
    if (errEl) errEl.style.display = 'none';

    document.getElementById('bcFormWrap').style.display = 'none';
    var bcLoading = document.getElementById('bcLoading');
    bcLoading.style.display = 'block';

    // Init compass once
    if (!compassInited) {
      initCompass('bcCompassLoading', 280);
      var compassEl = document.getElementById('bcCompassLoading');
      if (compassEl) compassEl.style.animation = 'bcSpin 30s linear infinite';
      compassInited = true;
    }

    // Stage rotation
    var stageEl = document.getElementById('bcLoadingStage');
    var si = 0; stageEl.textContent = STAGES[0];
    stageInterval = setInterval(function() { si = (si + 1) % STAGES.length; stageEl.textContent = STAGES[si]; }, 4500);

    // Progress bar 0% → 92% over 28s · 100% on success
    var pBar = document.getElementById('bcProgressBar'), pLabel = document.getElementById('bcProgressLabel');
    var startedAt = Date.now(); var matchDone = false;
    progressInterval = setInterval(function() {
      if (matchDone) return;
      var elapsed = (Date.now() - startedAt) / 1000;
      var pct = Math.min(92, Math.round(elapsed / 28 * 92));
      pBar.style.width = pct + '%'; pLabel.textContent = pct + '%';
    }, 200);

    // Email captured separately
    if (email) {
      fetch(API + '/api/email', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:email}) }).catch(function(){});
    }

    fetch(API + '/api/match', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        gender: gender === 'f' ? 'female' : 'male',
        birth: { year:year, month:month, day:day, hour:hour, minute:0, location:city || '' }
      })
    })
    .then(function(r) { if (!r.ok) throw new Error('Server '+r.status); return r.json(); })
    .then(function(data) {
      if (data.error) throw new Error(data.error);
      matchDone = true;
      pBar.style.width = '100%'; pLabel.textContent = '100%';
      setTimeout(function() { revealPersona(data, email); }, 500);
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', { content_name: 'Persona Card Revealed', content_category: data.topTag });
      }
    })
    .catch(function(err) {
      clearInterval(stageInterval); clearInterval(progressInterval);
      bcLoading.style.display = 'none';
      document.getElementById('bcFormWrap').style.display = 'block';
      if (errEl) { errEl.textContent = 'Something went wrong. Please try again.'; errEl.style.display = 'block'; }
    });
  }

  function revealPersona(d, email) {
    clearInterval(stageInterval); clearInterval(progressInterval);
    document.getElementById('bcLoading').style.display = 'none';
    document.getElementById('bcResults').style.display = 'block';

    var tag = d.topTag.replace(/^\d+-/, '').replace(/^./, function(c){return c.toUpperCase();});
    document.getElementById('bcCardTag').textContent = tag + ' ' + d.zodiac;
    document.getElementById('bcCardZodiac').textContent = d.topTag.replace(/^\d+-/,'').toUpperCase() + ' · ' + d.zodiac.toUpperCase();
    document.getElementById('bcCardImg').src = d.cardCdnUrl || '';

    var tagEl = document.getElementById('bcCardTag'), zodEl = document.getElementById('bcCardZodiac');
    var imgEl = document.getElementById('bcCardImg'), copyEl = document.getElementById('bcCardCopy');
    var ctaEl = document.getElementById('bcCta'), emailWrap = document.getElementById('bcEmailCapture');

    setTimeout(function() { tagEl.style.opacity = '1'; zodEl.style.opacity = '1'; }, 100);
    setTimeout(function() { imgEl.style.opacity = '1'; imgEl.style.transform = 'scale(1)'; }, 700);
    setTimeout(function() {
      typewrite(copyEl, d.englishCopy || '', function() {
        renderWiring(d.baziSummary || {});
        setTimeout(function() { ctaEl.style.opacity = '1'; }, 400);
        if (!email) {
          emailWrap.style.display = 'block';
          setTimeout(function() { emailWrap.style.opacity = '1'; }, 400);
        }
      });
    }, 1600);
  }

  function renderWiring(bs) {
    var wrap = document.getElementById('bcWiringWrap');
    if (!wrap || !bs.fiveElements) return;
    var fe = bs.fiveElements;
    var order = ['木','火','土','金','水'];
    var total = order.reduce(function(s,k){return s + (fe[k]||0);}, 0) || 1;
    var bar = document.getElementById('bcWiringBar'), leg = document.getElementById('bcWiringLegend');
    bar.innerHTML = ''; leg.innerHTML = '';
    order.forEach(function(k) {
      var pct = Math.round((fe[k]||0) * 100 / total);
      if (pct > 0) {
        var seg = document.createElement('div');
        seg.style.cssText = 'width:0%;background:'+EL_COLORS[k]+';transition:width 0.9s ease;';
        bar.appendChild(seg);
        setTimeout(function() { seg.style.width = pct + '%'; }, 200);
      }
      var item = document.createElement('span');
      item.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+EL_COLORS[k]+';margin-right:4px;vertical-align:middle;"></span>'+EL_NAMES[k]+' '+pct+'%';
      leg.appendChild(item);
    });
    document.getElementById('bcWiringDayMaster').textContent = (bs.pillars || '') + (bs.dayMaster ? ' · ' + bs.dayMaster : '');
    wrap.style.opacity = '1';
  }

  function typewrite(el, text, onDone) {
    var parts = text.split(/(?<=[.!?])\s+/);
    el.textContent = ''; var i = 0;
    function next() {
      if (i >= parts.length) { if (onDone) onDone(); return; }
      el.textContent += (i ? ' ' : '') + parts[i]; i++;
      typewriterTimer = setTimeout(next, 1400);
    }
    next();
  }

  function captureEmail() {
    var input = document.getElementById('bcEmailCaptureInput'), msg = document.getElementById('bcEmailCaptureMsg');
    if (!input || !msg) return;
    var v = input.value.trim();
    if (!v || v.indexOf('@') < 0) { msg.textContent = 'Valid email please.'; msg.style.display = 'block'; return; }
    fetch(API + '/api/email', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:v}) })
      .then(function() { msg.textContent = '✓ Sent. Check your inbox.'; msg.style.display = 'block'; })
      .catch(function() { msg.textContent = 'Try again.'; msg.style.display = 'block'; });
  }

  function resetFlow() {
    if (typewriterTimer) clearTimeout(typewriterTimer);
    if (stageInterval) clearInterval(stageInterval);
    if (progressInterval) clearInterval(progressInterval);
    document.getElementById('bcResults').style.display = 'none';
    document.getElementById('bcLoading').style.display = 'none';
    var resetEls = ['bcCardImg','bcCardTag','bcCardZodiac','bcCta','bcWiringWrap','bcEmailCapture'];
    resetEls.forEach(function(id) { var el = document.getElementById(id); if (el) el.style.opacity = '0'; });
    var img = document.getElementById('bcCardImg'); if (img) img.style.transform = 'scale(0.96)';
    var emailWrap = document.getElementById('bcEmailCapture'); if (emailWrap) emailWrap.style.display = 'none';
    document.getElementById('bcProgressBar').style.width = '0%';
    document.getElementById('bcProgressLabel').textContent = '0%';
    document.getElementById('bcFormWrap').style.display = 'block';
    var topEl = document.getElementById('free-preview');
    if (topEl) topEl.scrollIntoView({behavior:'smooth'});
  }

  // CSS keyframes for compass spin + 立即注入 pre-hide CSS（防 FOUC）
  // takeOver() 完成后会移除 pre-hide
  var styleTag = document.createElement('style');
  styleTag.id = 'bc-persona-prestyles';
  styleTag.textContent = [
    '@keyframes bcSpin{to{transform:rotate(360deg)}}',
    /* 表单先隐形 · 等 rewriteHeroCopy 改完文案再 fade-in · 防止旧文案闪现 */
    '#bcFormWrap{opacity:0;transition:opacity 0.35s ease;}',
    '#bcFormWrap.bc-persona-ready{opacity:1;}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(styleTag);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', takeOver);
  } else {
    takeOver();
  }
})();
