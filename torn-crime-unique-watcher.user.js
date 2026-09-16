// ==UserScript==
// @name         Torn Crime Unique Watcher
// @namespace    https://www.torn.com/
// @version      0.1.0
// @description  Alerts when Torn marks a Shoplifting or Pickpocketing unique outcome as available.
// @author       PurpleZyn
// @homepageURL  https://github.com/PurpleZyn/torn-crime-unique-watcher
// @supportURL   https://github.com/PurpleZyn/torn-crime-unique-watcher/issues
// @downloadURL  https://raw.githubusercontent.com/PurpleZyn/torn-crime-unique-watcher/main/torn-crime-unique-watcher.user.js
// @updateURL    https://raw.githubusercontent.com/PurpleZyn/torn-crime-unique-watcher/main/torn-crime-unique-watcher.user.js
// @match        https://www.torn.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // No API calls, no background scraping, no automatic crime actions.
    // The watcher only reads the Shoplifting/Pickpocketing page you are actively viewing.

    var PREFIX = 'tcuw';
    var soundOn = localStorage.getItem(PREFIX + '-sound') !== '0';
    var observer = null;
    var timer = null;
    var active = new Set();
    var lastAlert = new Map();
    var audio = null;
    var lastUrl = location.href;

    function crime() {
        var h = (location.hash || '').toLowerCase();
        if (h.indexOf('/shoplifting') !== -1) return 'Shoplifting';
        if (h.indexOf('/pickpocketing') !== -1) return 'Pickpocketing';
        return null;
    }

    function foreground() {
        return document.visibilityState === 'visible' && document.hasFocus();
    }

    function clean(s) {
        return String(s || '')
            .replace(/unique\s*outcome/ig, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 220);
    }

    function addStyle() {
        if (document.getElementById(PREFIX + '-style')) return;
        var s = document.createElement('style');
        s.id = PREFIX + '-style';
        s.textContent =
            '#tcuw-pill{position:fixed;right:12px;bottom:12px;z-index:2147483646;padding:8px 11px;border:1px solid #d6a92f;border-radius:20px;background:rgba(25,25,28,.95);color:#fff;font:600 12px Arial;cursor:pointer;box-shadow:0 4px 15px #0008}' +
            '#tcuw-pill.paused{opacity:.65;border-color:#777}' +
            '#tcuw-toast{position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:2147483647;width:min(520px,calc(100vw - 28px));padding:14px;border:1px solid #f0be36;border-radius:9px;background:#17171af7;color:#fff;text-align:center;font:600 14px Arial;box-shadow:0 8px 28px #000a}' +
            '#tcuw-toast b{color:#ffd75e}#tcuw-toast span{display:block;margin-top:5px;font-weight:400}' +
            '#tcuw-flash{position:fixed;inset:0;z-index:2147483645;pointer-events:none;box-sizing:border-box;animation:tcuwflash 1.4s ease-out}' +
            '@keyframes tcuwflash{0%{box-shadow:inset 0 0 0 0 #ffc52d00}15%{box-shadow:inset 0 0 0 10px #ffc52df2,inset 0 0 45px #ffc52d70}100%{box-shadow:inset 0 0 0 0 #ffc52d00}}';
        document.head.appendChild(s);
    }

    function pill() {
        var p = document.getElementById(PREFIX + '-pill');
        if (!p) {
            p = document.createElement('div');
            p.id = PREFIX + '-pill';
            p.title = 'Click to toggle sound. Shift-click to test the alert.';
            p.addEventListener('click', function (e) {
                primeAudio();
                if (e.shiftKey) {
                    alertUser(crime() || 'Crime', 'Test alert — watcher is working.');
                    return;
                }
                soundOn = !soundOn;
                localStorage.setItem(PREFIX + '-sound', soundOn ? '1' : '0');
                updatePill();
            });
            document.body.appendChild(p);
        }
        return p;
    }

    function updatePill() {
        var p = document.getElementById(PREFIX + '-pill');
        if (!p) return;
        var c = crime();
        var armed = !!c && foreground();
        p.classList.toggle('paused', !armed);
        p.textContent = '★ ' + (armed ? c + ' watcher armed' : 'Unique watcher paused') + (soundOn ? ' 🔊' : ' 🔇');
    }

    function removeUi() {
        var p = document.getElementById(PREFIX + '-pill');
        if (p) p.remove();
    }

    function primeAudio() {
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            if (!audio) audio = new AC();
            if (audio.state === 'suspended') audio.resume().catch(function () {});
        } catch (_) {}
    }

    function beep() {
        if (!soundOn || !foreground()) return;
        try {
            primeAudio();
            if (!audio || audio.state !== 'running') return;
            [760, 1040].forEach(function (hz, i) {
                var o = audio.createOscillator();
                var g = audio.createGain();
                var start = audio.currentTime + i * .16;
                o.frequency.value = hz;
                g.gain.setValueAtTime(.0001, start);
                g.gain.exponentialRampToValueAtTime(.2, start + .015);
                g.gain.exponentialRampToValueAtTime(.0001, start + .13);
                o.connect(g); g.connect(audio.destination);
                o.start(start); o.stop(start + .15);
            });
        } catch (_) {}
    }

    function toast(c, detail) {
        var old = document.getElementById(PREFIX + '-toast');
        if (old) old.remove();
        var t = document.createElement('div');
        t.id = PREFIX + '-toast';
        var b = document.createElement('b');
        b.textContent = '★ UNIQUE AVAILABLE — ' + c;
        var d = document.createElement('span');
        d.textContent = detail || c + ' unique available';
        t.appendChild(b); t.appendChild(d); document.body.appendChild(t);
        setTimeout(function () { if (t.isConnected) t.remove(); }, 5000);
    }

    function flash() {
        var f = document.createElement('div');
        f.id = PREFIX + '-flash';
        document.body.appendChild(f);
        setTimeout(function () { if (f.isConnected) f.remove(); }, 1500);
    }

    function alertUser(c, detail) {
        if (!foreground()) return;
        beep(); flash(); toast(c, detail);
    }

    function indicators() {
        var out = new Set();
        var sel = '[aria-label*="unique outcome" i],[title*="unique outcome" i],[data-tooltip*="unique outcome" i],[data-tip*="unique outcome" i]';
        document.querySelectorAll(sel).forEach(function (e) { out.add(e); });
        document.querySelectorAll('svg title,title').forEach(function (e) {
            if (/unique\s*outcome/i.test(e.textContent || '')) out.add(e);
        });
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        var n;
        while ((n = walker.nextNode())) {
            if (/unique\s*outcome/i.test(n.nodeValue || '') && n.parentElement) out.add(n.parentElement);
        }
        return Array.from(out);
    }

    function hostFor(el) {
        var cur = el;
        var best = el;
        for (var i = 0; cur && cur !== document.body && i < 10; i++, cur = cur.parentElement) {
            var txt = clean(cur.innerText || cur.textContent);
            if (txt && txt.length <= 220) best = cur;
            if (cur.matches && cur.matches('button,[role="button"],li')) return cur;
        }
        return best;
    }

    function describe(el, c) {
        var h = hostFor(el);
        var txt = clean(h && (h.innerText || h.textContent));
        if (!txt && h && h.getAttribute) txt = clean((h.getAttribute('aria-label') || '') + ' ' + (h.getAttribute('title') || ''));
        return txt || c + ' unique available';
    }

    function scan() {
        timer = null;
        var c = crime();
        if (!c || !foreground()) return;
        var now = Date.now();
        var next = new Set();
        indicators().forEach(function (el) {
            var detail = describe(el, c);
            var key = c + '|' + detail.toLowerCase();
            next.add(key);
            var previous = active.has(key);
            var cooled = now - (lastAlert.get(key) || 0) > 30000;
            if (!previous && cooled) {
                lastAlert.set(key, now);
                alertUser(c, detail);
            }
        });
        active = next;
    }

    function schedule() {
        if (!crime() || !foreground() || timer) return;
        timer = setTimeout(scan, 75);
    }

    function stop() {
        if (observer) observer.disconnect();
        observer = null;
        if (timer) clearTimeout(timer);
        timer = null;
        active.clear();
    }

    function lifecycle() {
        var c = crime();
        if (!c) {
            stop(); removeUi(); return;
        }
        addStyle(); pill(); updatePill();
        if (!foreground()) {
            stop(); updatePill(); return;
        }
        if (!observer) {
            observer = new MutationObserver(schedule);
            observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['aria-label','title','data-tooltip','data-tip','class'] });
        }
        schedule();
    }

    document.addEventListener('pointerdown', primeAudio, { passive:true });
    document.addEventListener('keydown', primeAudio, { passive:true });
    document.addEventListener('visibilitychange', lifecycle);
    window.addEventListener('focus', lifecycle);
    window.addEventListener('blur', lifecycle);
    window.addEventListener('hashchange', lifecycle);
    window.addEventListener('popstate', lifecycle);
    setInterval(function () {
        if (location.href !== lastUrl) { lastUrl = location.href; lifecycle(); }
    }, 500);

    lifecycle();
}());
