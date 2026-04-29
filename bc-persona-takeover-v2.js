/**
 * BC 16-Tag Persona · TAKEOVER v2
 * Hijacks #bcSubmitBtn click on bornCompass.com homepage and replaces the entire
 * results panel with the new persona card UI. Does not modify any section file.
 *
 * Install (Shopline Admin → 应用 → 自定义代码 → 编辑 existing or 添加新代码):
 *   <script src="https://cdn.jsdelivr.net/gh/jy02133048-max/bc-tags-cards@main/bc-persona-takeover-v2.js" defer></script>
 *
 * Uninstall: remove the script tag entry. Reload homepage. Original flow restored.
 */
(function() {
  'use strict';
  var API_BASE = 'https://blissful-alignment-production.up.railway.app';
  var DEBUG = false;

  function log() { if (DEBUG) console.log.apply(console, ['[bc-persona-v2]'].concat([].slice.call(arguments))); }

  var EL_COLORS = { '木': '#7A9E7E', '火': '#C47A6A', '土': '#C9A96E', '金': '#B8B8B8', '水': '#6A9EB8' };
  var EL_NAMES = { '木': 'Wood', '火': 'Fire', '土': 'Earth', '金': 'Metal', '水': 'Water' };
  var STAGES = ['Mapping your wiring', 'Reading the pattern', 'Matching your persona', 'Writing your card'];

  function takeOver() {
    var btn = document.getElementById('bcSubmitBtn');
    if (!btn) { setTimeout(takeOver, 500); return; }
    if (btn.dataset.bcTakenOver === '1') return;
    btn.dataset.bcTakenOver = '1';

    // Replace button label
    btn.textContent = 'Reveal My Persona →';

    // Update hero copy if elements exist (form panel)
    var formWrap = document.getElementById('bcFormWrap');
    if (formWrap) {
      var pill = formWrap.querySelector('div[style*="Free Instant Preview"]');
      var h2 = formWrap.querySelector('h2');
      var sub = formWrap.querySelector('h2 + p');
      if (h2 && /compass/i.test(h2.textContent)) {
        h2.innerHTML = 'Find out which <em style="color:#8a7355;">persona</em> your chart says you are.';
      }
      if (sub && /Five Element/i.test(sub.textContent)) {
        sub.textContent = "Enter your birth details. We'll match you to one of 16 persona cards — free, ready in ~30 seconds.";
      }
      formWrap.querySelectorAll('div').forEach(function(d) {
        if (d.textContent.trim() === '✦ Free Instant Preview') d.textContent = '✦ Free Instant Persona Card';
      });
    }

    // Override click — capture to run before original
    btn.removeAttribute('onclick');
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      runPersonaFlow();
    }, { capture: true });

    log('takeover armed');
  }

  function runPersonaFlow() {
    var pick = function(id) { var el = document.getElementById(id); return el ? el.value : ''; };
    var year = parseInt(pick('bcYear'));
    var month = parseInt(pick('bcMonth'));
    var day = parseInt(pick('bcDay'));
    var hour = parseInt(pick('bcHour') || '12');
    var city = pick('bcCity');
    var gender = pick('bcGender');
    var email = pick('bcEmail').trim();
    var errEl = document.getElementById('bcError');

    if (!year || !month || !day || !gender) {
      if (errEl) {
        errEl.textContent = 'Please fill in date of birth and gender.';
        errEl.style.display = 'block';
      }
      return;
    }
    if (errEl) errEl.style.display = 'none';

    document.getElementById('bcFormWrap').style.display = 'none';
    var loading = document.getElementById('bcLoading');
    if (loading) {
      loading.style.display = 'block';
      var p = loading.querySelector('p');
      if (p) p.textContent = 'Reading your chart...';
      // Add stage subtitle
      var stageEl = document.getElementById('bcLoadingStageV2');
      if (!stageEl) {
        stageEl = document.createElement('p');
        stageEl.id = 'bcLoadingStageV2';
        stageEl.style.cssText = 'font-size:13px;color:#9B958E;font-style:italic;margin:6px 0 0;';
        loading.appendChild(stageEl);
      }
      var si = 0; stageEl.textContent = STAGES[0];
      window._bcStageInterval = setInterval(function() { si = (si + 1) % STAGES.length; stageEl.textContent = STAGES[si]; }, 6000);
    }

    if (email) {
      fetch(API_BASE + '/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) }).catch(function() {});
    }

    var payload = {
      gender: gender === 'f' ? 'female' : 'male',
      birth: { year: year, month: month, day: day, hour: hour, minute: 0, location: city || '' }
    };

    fetch(API_BASE + '/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function(r) {
        if (!r.ok) throw new Error('Server ' + r.status);
        return r.json();
      })
      .then(function(data) {
        clearInterval(window._bcStageInterval);
        if (data.error) throw new Error(data.error);
        if (loading) loading.style.display = 'none';
        renderResults(data, email);
        if (typeof window.fbq === 'function') {
          window.fbq('track', 'Lead', { content_name: 'Persona Card Revealed', content_category: data.topTag });
        }
      })
      .catch(function(err) {
        clearInterval(window._bcStageInterval);
        if (loading) loading.style.display = 'none';
        document.getElementById('bcFormWrap').style.display = 'block';
        if (errEl) {
          errEl.textContent = 'Something went wrong. Please try again.';
          errEl.style.display = 'block';
        }
        log('match err', err);
      });
  }

  function renderResults(d, email) {
    var resultsEl = document.getElementById('bcResults');
    if (!resultsEl) return;
    resultsEl.style.display = 'block';

    var tag = d.topTag.replace(/^\d+-/, '').replace(/^./, function(c) { return c.toUpperCase(); });
    var bs = d.baziSummary || {};
    var fe = bs.fiveElements || {};
    var order = ['木', '火', '土', '金', '水'];
    var total = order.reduce(function(s, k) { return s + (fe[k] || 0); }, 0) || 1;
    var barHtml = order.map(function(k) {
      var pct = Math.round((fe[k] || 0) * 100 / total);
      return pct > 0 ? '<div style="width:' + pct + '%;background:' + EL_COLORS[k] + ';transition:width 0.8s ease;"></div>' : '';
    }).join('');
    var legendHtml = order.map(function(k) {
      return '<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + EL_COLORS[k] + ';margin-right:4px;vertical-align:middle;"></span>' + EL_NAMES[k] + ' ' + Math.round((fe[k] || 0) * 100 / total) + '%</span>';
    }).join('');

    resultsEl.innerHTML = [
      '<div style="display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:8px 16px;font-size:14px;background:rgba(138,115,85,0.1);color:#8a7355;">✦ Your Persona Card</div>',
      '<div style="margin-top:24px;text-align:center;">',
      '  <img src="' + (d.cardCdnUrl || '') + '" alt="" style="width:100%;max-width:380px;border-radius:14px;box-shadow:0 8px 32px rgba(45,42,38,0.18);border:1px solid #E8E6E1;background:#f5f0e6;display:block;margin:0 auto;aspect-ratio:9/16;object-fit:cover;">',
      '  <h3 style="margin-top:24px;font-family:\'Songti SC\',\'Times New Roman\',serif;font-size:clamp(1.7rem,3.5vw,2.4rem);font-weight:500;letter-spacing:0.04em;color:#2D2A26;line-height:1.15;">' + escapeHtml(tag + ' ' + d.zodiac) + '</h3>',
      '  <p style="margin-top:4px;font-size:12px;text-transform:uppercase;letter-spacing:0.18em;color:#8a7355;">' + escapeHtml(d.topTag.replace(/^\d+-/, '').toUpperCase() + ' · ' + d.zodiac.toUpperCase()) + '</p>',
      '</div>',
      '<p style="margin-top:24px;font-size:16px;line-height:1.75;color:#2D2A26;text-align:left;padding:0 4px;">' + escapeHtml(d.englishCopy || '') + '</p>',
      '<div style="margin-top:32px;padding:20px;background:#FAFAF9;border-radius:12px;border:1px solid #E8E6E1;">',
      '  <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.18em;color:#8a7355;margin:0 0 12px;">Your Wiring</p>',
      '  <div style="display:flex;height:10px;border-radius:5px;overflow:hidden;background:#E8E6E1;margin-bottom:8px;">' + barHtml + '</div>',
      '  <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:#6B6560;">' + legendHtml + '</div>',
      '  <p style="font-size:12px;color:#6B6560;margin-top:10px;font-family:\'Songti SC\',serif;letter-spacing:0.05em;">' + escapeHtml((bs.pillars || '') + (bs.dayMaster ? ' · ' + bs.dayMaster : '')) + '</p>',
      '</div>',
      email ? '' : [
        '<div style="margin-top:24px;border:1px solid #E8E6E1;border-radius:12px;padding:18px;background:#FAFAF9;">',
        '  <p style="font-size:14px;color:#2D2A26;margin:0 0 12px;">📩 Want this card + your full chart by email?</p>',
        '  <div style="display:flex;gap:8px;">',
        '    <input type="email" id="bcPersonaEmailInput" placeholder="you@example.com" style="flex:1;height:44px;padding:0 14px;font-size:15px;border:1px solid #D8D6D1;border-radius:10px;background:#FFF;outline:none;">',
        '    <button id="bcPersonaEmailBtn" style="height:44px;padding:0 18px;border-radius:10px;background:#2D2A26;color:#FFF;font-size:13px;font-weight:500;border:none;cursor:pointer;white-space:nowrap;">Send it</button>',
        '  </div>',
        '  <p id="bcPersonaEmailMsg" style="display:none;font-size:13px;color:#8a7355;margin-top:10px;"></p>',
        '</div>'
      ].join(''),
      '<div style="margin-top:32px;padding:28px;border-radius:14px;background:linear-gradient(135deg,rgba(138,115,85,0.08),rgba(138,115,85,0.02));border:1px solid #E8E6E1;">',
      '  <p style="font-size:16px;font-weight:500;color:#2D2A26;margin:0 0 4px;">This is one card. There are nine more layers.</p>',
      '  <p style="font-size:13px;color:#6B6560;margin:0 0 18px;line-height:1.5;">Your full reading: 11,000+ words · 30+ pages · across 10 chapters covering past / present / 2026 forecast / love / career.</p>',
      '  <a href="/products/the-reading" style="display:block;text-align:center;padding:16px;border-radius:12px;background:#8a7355;color:#FFF;font-size:16px;font-weight:500;text-decoration:none;">Get Your Full Reading — $29</a>',
      '  <p style="text-align:center;margin-top:10px;font-size:12px;color:#6B6560;">100% refund if it doesn\'t resonate.</p>',
      '</div>',
      '<button id="bcPersonaResetBtn" style="display:block;margin:20px auto 0;background:none;border:none;color:#8a7355;font-size:13px;cursor:pointer;text-decoration:underline;">← Try a different birthday</button>'
    ].join('');

    // Wire interactive elements
    var emailBtn = document.getElementById('bcPersonaEmailBtn');
    if (emailBtn) emailBtn.addEventListener('click', sendCaptureEmail);
    var resetBtn = document.getElementById('bcPersonaResetBtn');
    if (resetBtn) resetBtn.addEventListener('click', function() {
      resultsEl.style.display = 'none';
      var formWrap = document.getElementById('bcFormWrap');
      if (formWrap) formWrap.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function sendCaptureEmail() {
    var input = document.getElementById('bcPersonaEmailInput');
    var msg = document.getElementById('bcPersonaEmailMsg');
    if (!input || !msg) return;
    var v = input.value.trim();
    if (!v || v.indexOf('@') < 0) { msg.textContent = 'Valid email please.'; msg.style.display = 'block'; return; }
    fetch(API_BASE + '/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v }) })
      .then(function() { msg.textContent = '✓ Sent. Check your inbox.'; msg.style.display = 'block'; })
      .catch(function() { msg.textContent = 'Try again.'; msg.style.display = 'block'; });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', takeOver);
  } else {
    takeOver();
  }
})();
