// ==UserScript==
// @name         Torn Crime Unique Watcher
// @namespace    https://www.torn.com/
// @version      0.2.0
// @description  Pickpocketing live unique watcher + personalized Shoplifting API alerts anywhere on Torn.
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

    var PREFIX = 'tcuw';
    var API_BASE = 'https://api.torn.com/v2';
    var PROFILE_REFRESH_MS = 5 * 60 * 1000;

    var soundOn = localStorage.getItem(PREFIX + '-sound') !== '0';
    var storedVolume = parseFloat(localStorage.getItem(PREFIX + '-volume'));
    var volume = Number.isFinite(storedVolume) ? Math.min(1, Math.max(.25, storedVolume)) : .75;
    var pollSeconds = parseInt(localStorage.getItem(PREFIX + '-poll') || '30', 10);
    if (![15, 30, 60].includes(pollSeconds)) pollSeconds = 30;

    var pageObserver = null;
    var pageTimer = null;
    var pageActive = new Set();
    var pageLastAlert = new Map();
    var audio = null;
    var lastUrl = location.href;

    var apiTimer = null;
    var apiChecking = false;
    var apiActive = new Set();
    var apiProfile = null;
    var apiLastError = '';
    var apiLastCheck = 0;

    /*
     * Only security-dependent Shoplifting uniques are included here.
     * Security booleans mean required "disabled" state:
     * true = disabled/off duty, false = enabled/on duty.
     *
     * Security-independent uniques and notoriety-only uniques remain covered by
     * Torn's real unique star when the Shoplifting page is actively viewed.
     */
    var SHOP_RULES = [
        R('sally-jawbreaker', "Sally's Sweet Shop", 20, 'Jawbreaker', {camera:true}, I('Jawbreaker',1)),
        R('sally-empty-box', "Sally's Sweet Shop", 40, 'Empty Box bundle', {camera:false}, IS([['Empty Box',1],['Bag of Chocolate Truffles',2],['Jawbreaker',2]])),
        R('sally-pixie', "Sally's Sweet Shop", 60, 'Pixie Sticks', {camera:true}, I('Pixie Sticks',2)),
        R('sally-sherbet', "Sally's Sweet Shop", 70, 'Bags of Sherbet', {camera:false}, I('Bag of Sherbet',4)),
        R('sally-treats', "Sally's Sweet Shop", 80, 'Tin of Treats', {camera:true}, I('Tin of Treats',1)),

        R('bits-champagne', "Bits 'n' Bobs", 1, 'Bottle of Champagne x8', {camera:true}, I('Bottle of Champagne',8)),
        R('bits-duct', "Bits 'n' Bobs", 30, 'Duct Tape', {camera:true}, I('Duct Tape',1)),
        R('bits-cash', "Bits 'n' Bobs", 80, '$12,890–$57,340', {camera:true}, M(12890,57340)),

        R('tc-raincoat', 'TC Clothing', 20, 'Raincoat', {checkpoint:true}, I('Raincoat',1)),
        R('tc-tailor', 'TC Clothing', 40, "Tailor's Dummy + Scissors", {camera:true}, IS([["Tailor's Dummy",1],['Scissors',1]])),
        R('tc-bush', 'TC Clothing', 80, 'Bush Hat', {camera:true,checkpoint:false}, I('Bush Hat',1)),
        R('tc-poncho', 'TC Clothing', 100, 'Poncho', {checkpoint:true}, I('Poncho',1)),

        R('super-dslr', 'Super Store', 1, 'DSLR Camera', {checkpoint:true}, I('DSLR Camera',1)),
        R('super-dvd', 'Super Store', 1, 'DVD Player + Erotic DVD', {camera:true,checkpoint:true}, IS([['DVD Player',1],['Erotic DVD',1]])),
        R('super-dongle', 'Super Store', 40, 'Wireless Dongle', {camera:true}, I('Wireless Dongle',1)),
        R('super-keyboard', 'Super Store', 60, 'Ergonomic Keyboard', {checkpoint:true}, I('Ergonomic Keyboard',1)),

        R('pharm-melatonin', 'Pharmacy', 5, 'Melatonin', {camera:false}, I('Melatonin',1)),
        R('pharm-medical', 'Pharmacy', 100, 'Box of Medical Supplies', {checkpoint:false}, I('Box of Medical Supplies',1)),
        R('pharm-tyrosine', 'Pharmacy', 10, 'Tyrosine', {camera:true,checkpoint:false}, I('Tyrosine',1)),
        R('pharm-epi', 'Pharmacy', 100, 'Epinephrine', {camera:false,checkpoint:true}, I('Epinephrine',1)),
        R('pharm-serotonin', 'Pharmacy', 1, 'Serotonin + Syringes', {camera:true,checkpoint:true}, IS([['Serotonin',1],['Syringe',4]])),

        R('cyber-points', 'Cyber Force', 1, '3–9 Points', {guard:true}, Z()),
        R('cyber-cash', 'Cyber Force', 1, '$220,000–$299,000', {camera:false,guard:false}, M(220000,299000)),
        R('cyber-rf', 'Cyber Force', 1, 'RF Detector', {camera:true}, I('RF Detector',1)),
        R('cyber-hpcpu', 'Cyber Force', 5, 'HPCPU x3', {camera:true}, I('HPCPU',3)),
        R('cyber-parts', 'Cyber Force', 15, 'Computer parts bundle', {camera:true,guard:true}, IS([['CPU',5],['HPCPU',1],['Computer Fan',2],['Water Block',1]])),
        R('cyber-chair', 'Cyber Force', 60, 'Office Chair', {guard:true}, I('Office Chair',1)),

        R('jewel-tooth', 'Jewelry Store', 20, 'Gold Tooth x12', {guard:false}, I('Gold Tooth',12)),
        R('jewel-diamond-latex', 'Jewelry Store', 40, 'Diamond Ring + Latex Gloves', {guard:false}, IS([['Diamond Ring',1],['Latex Gloves',1]])),
        R('jewel-ivory', 'Jewelry Store', 40, 'Raw Ivory', {camera:false,guard:false}, I('Raw Ivory',1)),
        R('jewel-knife', 'Jewelry Store', 60, 'Diamond Bladed Knife', {guard:true}, I('Diamond Bladed Knife',1)),
        R('jewel-mirror', 'Jewelry Store', 10, 'Vanity Hand Mirror', {camera:true,guard:true}, I('Vanity Hand Mirror',1)),
        R('jewel-grinding', 'Jewelry Store', 1, 'Diamond Ring + Grinding Stone', {camera:true}, IS([['Diamond Ring',1],['Grinding Stone',1]])),
        R('jewel-drill', 'Jewelry Store', 1, 'Gold Rings + Drill + Polishing Pad', {camera:true}, IS([['Gold Ring',2],['Drill',1],['Polishing Pad',1]])),
        R('jewel-cluster', 'Jewelry Store', 100, 'Cluster Ring', {camera:true,guard:true}, I('Cluster Ring',1), 'Also requires zero notoriety.'),

        R('al-ammo', "Big Al's Gun Shop", 1, '2,500 Special Ammo', {camera:true,guard:true}, A(2500,'special')),
        R('al-armor', "Big Al's Gun Shop", 1, 'Full Body Armor', {camera:true,guard:true}, I('Full Body Armor',1)),
        R('al-ninja', "Big Al's Gun Shop", 30, 'Ninja Stars x9', {camera:true}, I('Ninja Star',9)),
        R('al-deagle', "Big Al's Gun Shop", 40, 'Desert Eagle', {camera:false,guard:false}, I('Desert Eagle',1)),
        R('al-stick', "Big Al's Gun Shop", 50, 'Stick Grenades x6', {guard:true}, I('Stick Grenade',6)),
        R('al-steyr', "Big Al's Gun Shop", 60, 'Steyr AUG', {guard:true}, I('Steyr AUG',1)),
        R('al-knives', "Big Al's Gun Shop", 70, 'Throwing Knives x4', {camera:true}, I('Throwing Knife',4)),
        R('al-heg', "Big Al's Gun Shop", 80, 'HEG x8', {camera:false,guard:false}, I('HEG',8))
    ];

    function R(key, shop, skill, label, security, reward, note) {
        return {key:key, shop:shop, skill:skill, label:label, security:security, reward:reward, note:note || ''};
    }
    function I(name, amount) { return {type:'items', items:[[name,amount]]}; }
    function IS(items) { return {type:'items', items:items}; }
    function M(min, max) { return {type:'money', min:min, max:max}; }
    function A(amount, type) { return {type:'ammo', amount:amount, ammoType:type}; }
    function Z() { return {type:'zero'}; }

    function currentCrime() {
        var h = (location.hash || '').toLowerCase();
        if (h.indexOf('/shoplifting') !== -1) return 'Shoplifting';
        if (h.indexOf('/pickpocketing') !== -1) return 'Pickpocketing';
        return null;
    }

    function foreground() {
        return document.visibilityState === 'visible' && document.hasFocus();
    }

    function clean(s) {
        return String(s || '').replace(/unique\s*outcome/ig, '').replace(/\s+/g, ' ').trim().slice(0, 240);
    }

    function norm(s) {
        return String(s || '').toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();
    }

    function getKey() {
        return localStorage.getItem(PREFIX + '-api-key') || '';
    }

    function addStyle() {
        if (document.getElementById(PREFIX + '-style')) return;
        var s = document.createElement('style');
        s.id = PREFIX + '-style';
        s.textContent =
            '#tcuw-pill{position:fixed;right:12px;bottom:12px;z-index:2147483646;padding:8px 11px;border:1px solid #d6a92f;border-radius:20px;background:rgba(25,25,28,.96);color:#fff;font:600 12px Arial;cursor:pointer;box-shadow:0 4px 15px #0008;user-select:none}' +
            '#tcuw-pill.warn{border-color:#d76b55}' +
            '#tcuw-toast{position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:2147483647;width:min(560px,calc(100vw - 28px));padding:14px;border:1px solid #f0be36;border-radius:9px;background:#17171af7;color:#fff;text-align:center;font:600 14px Arial;box-shadow:0 8px 28px #000a}' +
            '#tcuw-toast b{color:#ffd75e}#tcuw-toast span{display:block;margin-top:5px;font-weight:400;white-space:pre-line}' +
            '#tcuw-flash{position:fixed;inset:0;z-index:2147483645;pointer-events:none;box-sizing:border-box;animation:tcuwflash 1.4s ease-out}' +
            '@keyframes tcuwflash{0%{box-shadow:inset 0 0 0 0 #ffc52d00}15%{box-shadow:inset 0 0 0 10px #ffc52df2,inset 0 0 45px #ffc52d70}100%{box-shadow:inset 0 0 0 0 #ffc52d00}}' +
            '#tcuw-modal-back{position:fixed;inset:0;z-index:2147483647;background:#0009;display:flex;align-items:center;justify-content:center;padding:18px}' +
            '#tcuw-modal{width:min(560px,100%);background:#202024;color:#eee;border:1px solid #777;border-radius:12px;padding:18px;box-shadow:0 14px 45px #000b;font:13px/1.45 Arial}' +
            '#tcuw-modal h2{margin:0 0 8px;font-size:19px;color:#ffd15a}#tcuw-modal p{margin:7px 0;color:#ccc}' +
            '#tcuw-modal label{display:block;margin-top:12px;font-weight:700}#tcuw-modal input,#tcuw-modal select{box-sizing:border-box;width:100%;margin-top:5px;padding:9px;border:1px solid #666;border-radius:6px;background:#111;color:#fff}' +
            '#tcuw-modal .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}#tcuw-modal button{padding:9px 12px;border:1px solid #777;border-radius:6px;background:#34343a;color:#fff;cursor:pointer}' +
            '#tcuw-modal button.primary{background:#765f18;border-color:#d2aa35}#tcuw-modal button.danger{background:#532a2a}' +
            '#tcuw-api-status{margin-top:12px;padding:9px;border-radius:6px;background:#151518;color:#ddd;white-space:pre-line}' +
            '#tcuw-modal a{color:#e6c55c}';
        document.head.appendChild(s);
    }

    function ensurePill() {
        var p = document.getElementById(PREFIX + '-pill');
        if (p) return p;

        p = document.createElement('div');
        p.id = PREFIX + '-pill';
        p.addEventListener('click', function (e) {
            primeAudio();

            if (!getKey() && !e.shiftKey && !e.ctrlKey) {
                openSettings();
                return;
            }
            if (e.altKey) {
                openSettings();
                return;
            }
            if (e.shiftKey) {
                alertUser('TEST ALERT', 'Watcher sound is ' + Math.round(volume * 100) + '%.', true, false);
                return;
            }
            if (e.ctrlKey) {
                cycleVolume();
                updatePill();
                alertUser('TEST ALERT', 'Alert volume set to ' + Math.round(volume * 100) + '%.', true, false);
                return;
            }

            soundOn = !soundOn;
            localStorage.setItem(PREFIX + '-sound', soundOn ? '1' : '0');
            updatePill();
        });
        document.body.appendChild(p);
        return p;
    }

    function updatePill() {
        var p = ensurePill();
        var c = currentCrime();
        var parts = [];

        if (c === 'Pickpocketing') parts.push('PP ' + (foreground() ? 'armed' : 'paused'));
        else if (c === 'Shoplifting') parts.push('SL page ' + (foreground() ? 'armed' : 'paused'));

        if (!getKey()) {
            parts.push('SL API setup');
            p.classList.add('warn');
        } else if (apiLastError) {
            parts.push('SL API error');
            p.classList.add('warn');
        } else if (apiProfile) {
            var remain = Math.max(0, (apiProfile.total || 58) - (apiProfile.completedCount || 0));
            parts.push('SL API armed · ' + remain + ' missing');
            p.classList.remove('warn');
        } else {
            parts.push('SL API connecting');
            p.classList.remove('warn');
        }

        parts.push(soundOn ? '🔊 ' + Math.round(volume * 100) + '%' : '🔇');
        p.textContent = '★ ' + parts.join(' • ');
        p.title = 'Click: mute/unmute • Shift-click: test • Ctrl-click: volume • Alt-click: API settings';
    }

    function cycleVolume() {
        var levels = [.25, .50, .75, 1];
        var index = levels.findIndex(function (level) { return Math.abs(level - volume) < .01; });
        volume = levels[(index + 1) % levels.length];
        localStorage.setItem(PREFIX + '-volume', String(volume));
    }

    function primeAudio() {
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return Promise.resolve(null);
            if (!audio) audio = new AC();
            if (audio.state === 'running') return Promise.resolve(audio);
            return audio.resume().then(function () { return audio; }).catch(function () { return null; });
        } catch (_) {
            return Promise.resolve(null);
        }
    }

    function beep(force, allowBackground) {
        if ((!soundOn && !force) || (!allowBackground && !foreground())) return Promise.resolve(false);
        return primeAudio().then(function (ctx) {
            if (!ctx || ctx.state !== 'running') return false;
            try {
                [{hz:660,at:0,len:.14},{hz:880,at:.17,len:.14},{hz:1100,at:.34,len:.20}].forEach(function (tone) {
                    var o = ctx.createOscillator();
                    var g = ctx.createGain();
                    var start = ctx.currentTime + tone.at;
                    var peak = Math.max(.03, volume * .42);
                    o.type = 'sine';
                    o.frequency.setValueAtTime(tone.hz, start);
                    g.gain.setValueAtTime(.0001, start);
                    g.gain.exponentialRampToValueAtTime(peak, start + .015);
                    g.gain.exponentialRampToValueAtTime(.0001, start + tone.len);
                    o.connect(g); g.connect(ctx.destination);
                    o.start(start); o.stop(start + tone.len + .03);
                });
                return true;
            } catch (_) { return false; }
        });
    }

    function toast(title, detail) {
        if (document.visibilityState !== 'visible') return;
        var old = document.getElementById(PREFIX + '-toast');
        if (old) old.remove();
        var t = document.createElement('div');
        t.id = PREFIX + '-toast';
        var b = document.createElement('b');
        b.textContent = '★ ' + title;
        var d = document.createElement('span');
        d.textContent = detail;
        t.appendChild(b); t.appendChild(d); document.body.appendChild(t);
        setTimeout(function () { if (t.isConnected) t.remove(); }, 7000);
    }

    function flash() {
        if (document.visibilityState !== 'visible') return;
        var f = document.createElement('div');
        f.id = PREFIX + '-flash';
        document.body.appendChild(f);
        setTimeout(function () { if (f.isConnected) f.remove(); }, 1500);
    }

    function alertUser(title, detail, forceSound, allowBackground) {
        if (!allowBackground && !foreground()) return;
        beep(!!forceSound, !!allowBackground);
        if (document.visibilityState === 'visible') {
            flash();
            toast(title, detail);
        }
    }

    function openSettings() {
        addStyle();
        var old = document.getElementById(PREFIX + '-modal-back');
        if (old) old.remove();

        var back = document.createElement('div');
        back.id = PREFIX + '-modal-back';
        var modal = document.createElement('div');
        modal.id = PREFIX + '-modal';

        var h = document.createElement('h2');
        h.textContent = 'Torn Crime Unique Watcher';

        var intro = document.createElement('p');
        intro.textContent = 'Shoplifting can be monitored through Torn’s official API from anywhere on Torn. Use a Minimal Access key so the watcher can read your Shoplifting skill and completed unique outcomes. The key is stored only in this browser and is sent only to api.torn.com.';

        var keyLabel = document.createElement('label');
        keyLabel.textContent = 'Torn API key (Minimal Access)';
        var keyInput = document.createElement('input');
        keyInput.type = 'password';
        keyInput.id = PREFIX + '-key-input';
        keyInput.autocomplete = 'off';
        keyInput.value = getKey();
        keyInput.placeholder = 'Paste your Torn API key';

        var pollLabel = document.createElement('label');
        pollLabel.textContent = 'Shoplifting check interval';
        var poll = document.createElement('select');
        poll.id = PREFIX + '-poll-select';
        [15,30,60].forEach(function (n) {
            var o = document.createElement('option');
            o.value = String(n);
            o.textContent = n + ' seconds';
            if (n === pollSeconds) o.selected = true;
            poll.appendChild(o);
        });

        var apiLink = document.createElement('p');
        apiLink.innerHTML = '<a href="https://www.torn.com/preferences.php#tab=api" target="_blank" rel="noopener noreferrer">Open Torn API settings</a>';

        var status = document.createElement('div');
        status.id = PREFIX + '-api-status';
        status.textContent = settingsStatusText();

        var row = document.createElement('div');
        row.className = 'row';

        var save = document.createElement('button');
        save.className = 'primary';
        save.textContent = 'Save & Test API';
        save.addEventListener('click', function () {
            var key = keyInput.value.trim();
            if (!key) {
                status.textContent = 'Paste a Minimal Access API key first.';
                return;
            }
            localStorage.setItem(PREFIX + '-api-key', key);
            pollSeconds = parseInt(poll.value, 10);
            localStorage.setItem(PREFIX + '-poll', String(pollSeconds));
            apiProfile = null;
            apiLastError = '';
            status.textContent = 'Testing API and syncing your Shoplifting data…';
            updatePill();
            syncApiProfile(true).then(function () {
                startApiMonitor();
                status.textContent = settingsStatusText();
                updatePill();
            }).catch(function (err) {
                apiLastError = err.message || String(err);
                status.textContent = 'API setup failed:\n' + apiLastError + '\n\nMake sure the key has Minimal Access.';
                updatePill();
            });
        });

        var clear = document.createElement('button');
        clear.className = 'danger';
        clear.textContent = 'Clear API Key';
        clear.addEventListener('click', function () {
            localStorage.removeItem(PREFIX + '-api-key');
            apiProfile = null;
            apiLastError = '';
            apiActive.clear();
            stopApiMonitor();
            keyInput.value = '';
            status.textContent = 'API key cleared. Pickpocketing/page-based watching still works.';
            updatePill();
        });

        var close = document.createElement('button');
        close.textContent = 'Close';
        close.addEventListener('click', function () { back.remove(); });

        row.append(save, clear, close);
        modal.append(h, intro, keyLabel, keyInput, pollLabel, poll, apiLink, status, row);
        back.appendChild(modal);
        back.addEventListener('click', function (e) { if (e.target === back) back.remove(); });
        document.body.appendChild(back);
    }

    function settingsStatusText() {
        if (!getKey()) return 'No API key saved. Shoplifting API monitoring is off.';
        if (apiLastError) return 'API error: ' + apiLastError;
        if (!apiProfile) return 'API key saved. Waiting to sync…';
        var remaining = Math.max(0, apiProfile.total - apiProfile.completedCount);
        var matched = apiProfile.matchedKeys.size;
        return 'Connected.\nShoplifting skill: ' + apiProfile.skill +
            '\nCompleted uniques: ' + apiProfile.completedCount + ' / ' + apiProfile.total +
            '\nSecurity-window uniques recognized as completed: ' + matched +
            '\nStill missing overall: ' + remaining +
            '\nPolling every: ' + pollSeconds + ' seconds';
    }

    function apiGet(path) {
        var key = getKey();
        if (!key) return Promise.reject(new Error('No API key saved.'));

        var join = path.indexOf('?') === -1 ? '?' : '&';
        return fetch(API_BASE + path + join + 'comment=TCUW', {
            method: 'GET',
            headers: {'Authorization':'ApiKey ' + key, 'Accept':'application/json'},
            cache: 'no-store'
        }).then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
                if (!res.ok || data.error) {
                    var msg = data && data.error ? (data.error.error || data.error.message || JSON.stringify(data.error)) : ('HTTP ' + res.status);
                    throw new Error(msg);
                }
                return data;
            });
        });
    }

    function syncApiProfile(force) {
        if (!getKey()) return Promise.reject(new Error('No API key saved.'));
        if (!force && apiProfile && Date.now() - apiProfile.syncedAt < PROFILE_REFRESH_MS) {
            return Promise.resolve(apiProfile);
        }

        return apiGet('/torn/crimes').then(function (data) {
            var crimes = data.crimes || [];
            var shopCrime = crimes.find(function (x) { return norm(x.name) === 'shoplifting'; });
            if (!shopCrime) throw new Error('Could not find Shoplifting in Torn crime data.');

            return Promise.all([
                Promise.resolve(shopCrime),
                apiGet('/torn/' + shopCrime.id + '/subcrimes'),
                apiGet('/user/' + shopCrime.id + '/crimes')
            ]);
        }).then(function (parts) {
            var shopCrime = parts[0];
            var subData = parts[1];
            var userData = parts[2];
            var crimeData = userData.crimes;
            if (!crimeData || typeof crimeData.skill !== 'number') {
                throw new Error('Personal Shoplifting data was unavailable. Use a Minimal Access API key.');
            }

            var subNames = {};
            (subData.subcrimes || []).forEach(function (s) { subNames[String(s.id)] = s.name; });

            var uniques = crimeData.uniques || [];
            var itemIds = [];
            uniques.forEach(function (u) {
                ((u.rewards && u.rewards.items) || []).forEach(function (it) {
                    if (!itemIds.includes(it.id)) itemIds.push(it.id);
                });
            });

            return fetchItemNames(itemIds).then(function (itemNames) {
                var matched = matchCompleted(uniques, itemNames);
                apiProfile = {
                    crimeId: shopCrime.id,
                    total: shopCrime.unique_outcomes_count || 58,
                    skill: crimeData.skill,
                    completedCount: uniques.length,
                    matchedKeys: matched,
                    subNames: subNames,
                    syncedAt: Date.now()
                };
                apiLastError = '';
                updatePill();
                return apiProfile;
            });
        });
    }

    function fetchItemNames(ids) {
        if (!ids.length) return Promise.resolve({});
        var chunks = [];
        for (var i = 0; i < ids.length; i += 75) chunks.push(ids.slice(i, i + 75));

        return Promise.all(chunks.map(function (chunk) {
            return apiGet('/torn/' + chunk.join(',') + '/items');
        })).then(function (responses) {
            var map = {};
            responses.forEach(function (data) {
                (data.items || []).forEach(function (item) { map[String(item.id)] = item.name; });
            });
            return map;
        });
    }

    function itemSignature(items) {
        return items.map(function (p) { return norm(p[0]) + ':' + Number(p[1]); }).sort().join('|');
    }

    function userRewardDescriptor(reward, itemNames) {
        reward = reward || {};
        var items = reward.items || [];
        if (items.length) {
            var pairs = items.map(function (it) { return [itemNames[String(it.id)] || ('#' + it.id), it.amount]; });
            return {type:'items', sig:itemSignature(pairs)};
        }
        if (reward.money) return {type:'money', min:Number(reward.money.min), max:Number(reward.money.max)};
        if (reward.ammo) return {type:'ammo', amount:Number(reward.ammo.amount), ammoType:norm(reward.ammo.type)};
        return {type:'zero'};
    }

    function ruleRewardDescriptor(rule) {
        var r = rule.reward;
        if (r.type === 'items') return {type:'items', sig:itemSignature(r.items)};
        return r;
    }

    function rewardMatches(a, b) {
        if (!a || !b || a.type !== b.type) return false;
        if (a.type === 'items') return a.sig === b.sig;
        if (a.type === 'money') return Number(a.min) === Number(b.min) && Number(a.max) === Number(b.max);
        if (a.type === 'ammo') return Number(a.amount) === Number(b.amount) && norm(a.ammoType).indexOf(norm(b.ammoType)) !== -1;
        if (a.type === 'zero') return true;
        return false;
    }

    function matchCompleted(uniques, itemNames) {
        var matched = new Set();
        var descriptors = uniques.map(function (u) { return userRewardDescriptor(u.rewards, itemNames); });

        SHOP_RULES.forEach(function (rule) {
            var target = ruleRewardDescriptor(rule);
            var idx = descriptors.findIndex(function (d) { return rewardMatches(d, target); });
            if (idx !== -1) {
                matched.add(rule.key);
                descriptors.splice(idx, 1);
            }
        });
        return matched;
    }

    function shopState(entry) {
        var state = {camera:null, checkpoint:null, guard:null};
        (entry.status || []).forEach(function (s) {
            var t = norm(s.title);
            if (t.indexOf('camera') !== -1) state.camera = state.camera === null ? !!s.disabled : (state.camera && !!s.disabled);
            if (t.indexOf('checkpoint') !== -1) state.checkpoint = !!s.disabled;
            if (t.indexOf('guard') !== -1) state.guard = state.guard === null ? !!s.disabled : (state.guard && !!s.disabled);
        });
        return state;
    }

    function securityMatches(required, current) {
        return Object.keys(required).every(function (k) {
            return current[k] !== null && current[k] === required[k];
        });
    }

    function findShopName(entry) {
        if (apiProfile && apiProfile.subNames[String(entry.id)]) return apiProfile.subNames[String(entry.id)];
        return '';
    }

    function checkShopliftingApi() {
        if (!getKey() || apiChecking) return Promise.resolve();
        apiChecking = true;

        return syncApiProfile(false).then(function () {
            return apiGet('/torn/shoplifting');
        }).then(function (data) {
            apiLastCheck = Date.now();
            apiLastError = '';
            var next = new Set();
            var newly = [];

            (data.shoplifting || []).forEach(function (entry) {
                var shop = findShopName(entry);
                var state = shopState(entry);

                SHOP_RULES.forEach(function (rule) {
                    if (norm(rule.shop) !== norm(shop)) return;
                    if (apiProfile.skill < rule.skill) return;
                    if (apiProfile.matchedKeys.has(rule.key)) return;
                    if (!securityMatches(rule.security, state)) return;

                    next.add(rule.key);
                    if (!apiActive.has(rule.key)) newly.push(rule);
                });
            });

            apiActive = next;

            var onShopPage = currentCrime() === 'Shoplifting' && foreground();
            if (!onShopPage && newly.length) notifyApiRules(newly);

            updatePill();
        }).catch(function (err) {
            apiLastError = err.message || String(err);
            updatePill();
        }).finally(function () {
            apiChecking = false;
        });
    }

    function notifyApiRules(rules) {
        var grouped = {};
        rules.forEach(function (r) {
            if (!grouped[r.shop]) grouped[r.shop] = [];
            grouped[r.shop].push(r);
        });

        Object.keys(grouped).forEach(function (shop, idx) {
            setTimeout(function () {
                var rs = grouped[shop];
                var labels = rs.map(function (r) {
                    return r.label + (r.note ? ' — ' + r.note : '');
                });
                alertUser('SHOPLIFTING UNIQUE WINDOW', shop + '\n' + labels.join('\n'), false, true);
            }, idx * 850);
        });
    }

    function startApiMonitor() {
        stopApiMonitor();
        if (!getKey()) return;
        checkShopliftingApi();
        apiTimer = setInterval(checkShopliftingApi, pollSeconds * 1000);
    }

    function stopApiMonitor() {
        if (apiTimer) clearInterval(apiTimer);
        apiTimer = null;
    }

    function isVisible(el) {
        if (!(el instanceof Element)) return false;
        var rect = el.getBoundingClientRect();
        var style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }

    function indicators() {
        return Array.from(document.querySelectorAll('[style*="unique-outcome-star"]')).filter(isVisible);
    }

    function hostFor(el) {
        var cur = el;
        var fallback = el;
        for (var i = 0; cur && cur !== document.body && i < 12; i++, cur = cur.parentElement) {
            var txt = clean(cur.innerText || cur.textContent);
            if (cur.matches && cur.matches('li') && txt && txt.length <= 350) return cur;
            if (txt && txt.length <= 350 && /\b(?:SHOPLIFT|PICKPOCKET)\b/i.test(txt)) return cur;
            if (txt && txt.length <= 220) fallback = cur;
        }
        return fallback;
    }

    function describe(el, c) {
        var h = hostFor(el);
        var txt = clean(h && (h.innerText || h.textContent));
        if (txt) {
            txt = txt.replace(/\bSHOPLIFT\s*\d*\b/ig, '').replace(/\bPICKPOCKET\s*\d*\b/ig, '').replace(/\s+/g, ' ').trim();
        }
        return txt || c + ' unique star detected';
    }

    function pageScan() {
        pageTimer = null;
        var c = currentCrime();
        if (!c || !foreground()) return;

        var now = Date.now();
        var next = new Set();

        indicators().forEach(function (el) {
            var detail = describe(el, c);
            var key = c + '|' + detail.toLowerCase();
            next.add(key);
            var previous = pageActive.has(key);
            var cooled = now - (pageLastAlert.get(key) || 0) > 30000;
            if (!previous && cooled) {
                pageLastAlert.set(key, now);
                alertUser('UNIQUE AVAILABLE — ' + c, detail, false, false);
            }
        });

        pageActive = next;
    }

    function schedulePageScan() {
        if (!currentCrime() || !foreground() || pageTimer) return;
        pageTimer = setTimeout(pageScan, 75);
    }

    function stopPageWatcher() {
        if (pageObserver) pageObserver.disconnect();
        pageObserver = null;
        if (pageTimer) clearTimeout(pageTimer);
        pageTimer = null;
        pageActive.clear();
    }

    function refreshLifecycle() {
        addStyle();
        ensurePill();

        var c = currentCrime();
        if (!c || !foreground()) {
            stopPageWatcher();
            updatePill();
            return;
        }

        if (!pageObserver) {
            pageObserver = new MutationObserver(schedulePageScan);
            pageObserver.observe(document.body, {
                childList:true,
                subtree:true,
                attributes:true,
                attributeFilter:['style','class']
            });
        }
        schedulePageScan();
        updatePill();
    }

    document.addEventListener('pointerdown', primeAudio, {passive:true});
    document.addEventListener('keydown', primeAudio, {passive:true});
    document.addEventListener('visibilitychange', refreshLifecycle);
    window.addEventListener('focus', refreshLifecycle);
    window.addEventListener('blur', refreshLifecycle);
    window.addEventListener('hashchange', refreshLifecycle);
    window.addEventListener('popstate', refreshLifecycle);

    setInterval(function () {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            refreshLifecycle();
        }
    }, 500);

    addStyle();
    ensurePill();
    refreshLifecycle();

    if (getKey()) {
        syncApiProfile(false)
            .catch(function (err) {
                apiLastError = err.message || String(err);
                updatePill();
            })
            .finally(startApiMonitor);
    } else {
        updatePill();
    }
}());
