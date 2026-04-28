/**
 * BC 16-Tag Persona Card · Script Tag injection v1
 * Loads via jsDelivr CDN, hooks into bcSubmitChart flow on bornCompass.com homepage.
 *
 * Install: Shopline Admin → Apps → Script Tags → Add URL:
 *   https://cdn.jsdelivr.net/gh/jy02133048-max/bc-tags-cards@main/bc-persona-card-inject-v1.js
 *
 * Behavior:
 *   1. Wait for #bcPersonality element to render (free chart submitted)
 *   2. Extract birth fields from #bcYear/#bcMonth/#bcDay/#bcHour/#bcGender/#bcCity
 *   3. POST to /api/match (parallel · doesn't block existing UI)
 *   4. Insert persona card after #bcPersonality
 *   5. Fire fbq ViewContent event
 *
 * Uninstall: Remove the Script Tag from Shopline Admin. Reload BC homepage.
 */
(function() {
  'use strict';
  var API_BASE = 'https://blissful-alignment-production.up.railway.app';
  var API_MATCH = API_BASE + '/api/match';
  var DEBUG = false;
  var INJECTED = false;
  var FETCH_FIRED = false;

  function log() { if (DEBUG) console.log.apply(console, ['[bc-persona]'].concat([].slice.call(arguments))); }

  function buildCard() {
    var wrap = document.createElement('div');
    wrap.id = 'bcPersonaCardWrap';
    wrap.innerHTML = [
      '<div id="bcPersonaLoading" style="margin-top:24px;font-size:13px;color:#8a7355;text-align:center;font-style:italic;">Reading your persona card...</div>',
      '<div id="bcPersonaCard" style="display:none;margin-top:24px;border:1px solid #E8E6E1;border-radius:12px;padding:20px;background:#FAFAF9;">',
      '  <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.2em;color:#8a7355;margin:0 0 14px;">YOUR PERSONA CARD</p>',
      '  <div style="display:grid;grid-template-columns:140px 1fr;gap:18px;align-items:start;">',
      '    <img id="bcPersonaImg" alt="" style="width:100%;border-radius:8px;border:1px solid #E8E6E1;background:#f5f0e6;display:block;">',
      '    <div>',
      '      <h3 id="bcPersonaTitle" style="font-size:1.4rem;font-weight:600;color:#2D2A26;margin:0 0 6px;line-height:1.2;letter-spacing:0.02em;"></h3>',
      '      <p id="bcPersonaCopy" style="font-size:14px;color:#4a4540;line-height:1.7;margin:0;"></p>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');
    return wrap;
  }

  function readForm() {
    var pick = function(id) { var el = document.getElementById(id); return el ? el.value : ''; };
    var year = parseInt(pick('bcYear'));
    var month = parseInt(pick('bcMonth'));
    var day = parseInt(pick('bcDay'));
    var hour = parseInt(pick('bcHour') || '12');
    var gender = pick('bcGender');
    var city = pick('bcCity');
    if (!year || !month || !day || !gender) return null;
    return {
      gender: gender,
      birth: { year: year, month: month, day: day, hour: hour, minute: 0, location: city || '' }
    };
  }

  function injectAndFetch() {
    if (INJECTED) return;
    var personality = document.getElementById('bcPersonality');
    if (!personality) return;
    var personalityWrap = personality.parentNode;
    if (!personalityWrap || !personalityWrap.parentNode) return;

    var card = buildCard();
    personalityWrap.parentNode.insertBefore(card, personalityWrap.nextSibling);
    INJECTED = true;

    var input = readForm();
    if (!input) {
      log('form fields missing, abort');
      var loading = document.getElementById('bcPersonaLoading');
      if (loading) loading.style.display = 'none';
      return;
    }
    if (FETCH_FIRED) return;
    FETCH_FIRED = true;

    log('fetching match', input);
    fetch(API_MATCH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
      .then(function(r) { return r.json(); })
      .then(function(p) {
        var loading = document.getElementById('bcPersonaLoading');
        if (loading) loading.style.display = 'none';
        if (!p || p.error || !p.topTag) {
          log('match response missing topTag', p);
          return;
        }
        var tag = p.topTag.replace(/^\d+-/, '').replace(/^./, function(c) { return c.toUpperCase(); });
        var titleEl = document.getElementById('bcPersonaTitle');
        var copyEl = document.getElementById('bcPersonaCopy');
        var imgEl = document.getElementById('bcPersonaImg');
        var cardEl = document.getElementById('bcPersonaCard');
        if (titleEl) titleEl.textContent = tag + ' ' + p.zodiac;
        if (copyEl) copyEl.textContent = p.englishCopy || '';
        if (imgEl) imgEl.src = p.cardCdnUrl || (API_BASE + (p.cardWebPath || ''));
        if (cardEl) cardEl.style.display = 'block';
        if (typeof window.fbq === 'function') {
          window.fbq('track', 'ViewContent', {
            content_name: 'Persona Card',
            content_category: p.topTag
          });
        }
        log('persona rendered:', tag, p.zodiac);
      })
      .catch(function(err) {
        log('fetch failed', err);
        var loading = document.getElementById('bcPersonaLoading');
        if (loading) loading.style.display = 'none';
      });
  }

  function setupObserver() {
    var personality = document.getElementById('bcPersonality');
    if (!personality) {
      // Wait for DOM if bcPersonality not yet rendered
      setTimeout(setupObserver, 500);
      return;
    }
    // Watch personality element — when text content appears (chart submitted), trigger
    var mo = new MutationObserver(function() {
      if (personality.textContent && personality.textContent.trim().length > 0) {
        log('personality content detected, injecting');
        injectAndFetch();
        mo.disconnect();
      }
    });
    mo.observe(personality, { childList: true, characterData: true, subtree: true });
    log('observer armed on #bcPersonality');

    // Also fallback: poll every 2s for 60s in case mutation observer misses
    var ticks = 0;
    var poll = setInterval(function() {
      ticks++;
      if (personality.textContent && personality.textContent.trim().length > 0) {
        log('poll detected personality content');
        injectAndFetch();
        clearInterval(poll);
        mo.disconnect();
      }
      if (ticks > 30) clearInterval(poll);
    }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupObserver);
  } else {
    setupObserver();
  }
})();
