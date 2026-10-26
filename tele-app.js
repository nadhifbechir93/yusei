/* ================================================================
   MA TÉLÉ — interface d'accueil pour Samsung Tizen
   Pilotable à la télécommande : flèches, OK, Retour.
   Fonctionne aussi dans un navigateur PC (flèches, Entrée, Échap).
   ================================================================ */
(function () {
  "use strict";

  // ---------- Réglages (config.js + modifications faites sur la télé)
  var DEFAULT = window.MATELE_CONFIG || {};
  var cfg = load();
  function load() {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem("matele") || "{}"); } catch (e) {}
    var c = {};
    for (var k in DEFAULT) c[k] = DEFAULT[k];
    for (var k2 in saved) if (saved[k2] !== "" && saved[k2] != null) c[k2] = saved[k2];
    // Firebase : modifiable aussi depuis l'écran Réglages (pratique sans PC)
    var fb = c.firebase || {}, web = window.FIREBASE_CONFIG || {};
    if (!fb.apiKey && web.apiKey) fb = { apiKey: web.apiKey, databaseURL: web.databaseURL };
    if (!c.urlTelecommande && /^https?:/.test(location.protocol) && web.apiKey) c.urlTelecommande = location.href.replace(/[?#].*$/, "").replace(/\/[^\/]*$/, "");
    c.fbApiKey = c.fbApiKey || fb.apiKey || "";
    c.fbUrl = c.fbUrl || fb.databaseURL || "";
    c.firebase = { apiKey: c.fbApiKey, databaseURL: c.fbUrl };
    return c;
  }
  var $ = function (id) { return document.getElementById(id); };
  var IS_TIZEN = typeof window.tizen !== "undefined";
  // Mode navigateur : l'interface ouverte dans l'appli Internet de la télé (sans installation)
  var WEB = !IS_TIZEN && /^https?:/.test(location.protocol);
  if (WEB) document.documentElement.className += " web-mode";
  // L'interface est dessinée en 1920×1080 : on l'adapte à la taille réelle de la fenêtre du navigateur
  function fit() {
    if (!WEB) return;
    var k = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    document.body.style.transformOrigin = "0 0";
    var x = Math.max(0, (window.innerWidth - 1920 * k) / 2), y = Math.max(0, (window.innerHeight - 1080 * k) / 2);
    document.body.style.transform = "translate(" + x + "px," + y + "px) scale(" + k + ")";
  }
  window.addEventListener("resize", fit);
  setTimeout(fit, 0);

  // ---------- Touches de la télécommande
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 10009, ESC: 27 };
  // Télé 2018 (Chromium 56) : pas de CSS grid ni de « gap » en flexbox → mise en page de secours (style.css, fin du fichier)
  (function () {
    var h = document.documentElement, ok = window.CSS && CSS.supports;
    if (!(ok && CSS.supports("display", "grid"))) h.className += " nogrid";
    try {
      var d = document.createElement("div"); d.style.cssText = "display:flex;flex-direction:column;row-gap:1px;gap:1px;position:absolute;visibility:hidden";
      d.appendChild(document.createElement("div")); d.appendChild(document.createElement("div"));
      document.body.appendChild(d); var g = d.scrollHeight === 1; document.body.removeChild(d);
      if (!g) h.className += " nogap";
    } catch (e) { h.className += " nogap"; }
  })();
  if (IS_TIZEN) {
    try {
      ["ColorF0Red", "ColorF1Green", "ColorF2Yellow", "ColorF3Blue", "MediaPlayPause"].forEach(function (k) {
        tizen.tvinputdevice.registerKey(k);
      });
    } catch (e) {}
  }

  // ================================================================
  //  NAVIGATION SPATIALE
  // ================================================================
  var current = null;
  var screenStack = [];

  function activeScreen() { return document.querySelector(".screen.active"); }
  function focusables() {
    return Array.prototype.filter.call(activeScreen().querySelectorAll(".focusable"), function (el) {
      return el.offsetParent !== null;
    });
  }
  function setFocus(el) {
    if (!el) return;
    if (current) current.classList.remove("focused");
    current = el;
    el.classList.add("focused");
    if (el.classList.contains("mtile") && cfg.theme === "premium") {
      var m = el.parentNode; // garde une tuile visible à gauche de la sélection
      m.scrollLeft = Math.max(0, el.offsetLeft - 70 - 340);
    } else if (el.scrollIntoView) {
      // Chromium 56 (télé 2018) ne connaît pas les options : on ne défile que si l'élément sort de l'écran
      var r = el.getBoundingClientRect(), H = window.innerHeight || 1080;
      if (r.top < 0 || r.bottom > H) el.scrollIntoView(r.top < 0);
    }
    if (el.classList.contains("mtile") && window.__hero) window.__hero(el);
  }
  function center(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  function move(dir) {
    var list = focusables();
    if (!current || list.indexOf(current) < 0) { setFocus(list[0]); return; }
    var a = current.getBoundingClientRect(), ca = center(a), best = null, bestScore = Infinity;
    list.forEach(function (el) {
      if (el === current) return;
      var b = el.getBoundingClientRect(), cb = center(b);
      var dx = cb.x - ca.x, dy = cb.y - ca.y, main, side;
      if (dir === "left") { if (b.right > a.left + 5) return; main = -dx; side = Math.abs(dy); }
      if (dir === "right") { if (b.left < a.right - 5) return; main = dx; side = Math.abs(dy); }
      if (dir === "up") { if (b.bottom > a.top + 5) return; main = -dy; side = Math.abs(dx); }
      if (dir === "down") { if (b.top < a.bottom - 5) return; main = dy; side = Math.abs(dx); }
      var score = main + side * 2.2;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) setFocus(best);
  }

  function show(id, remember) {
    var cur = activeScreen();
    if (cur.id === id) return;
    if (remember !== false) screenStack.push(cur.id);
    cur.classList.remove("active");
    $(id).classList.add("active");
    document.body.classList.toggle("dim", id !== "home" && id !== "brief");
    document.body.classList.toggle("briefing", id === "brief");
    if (current) current.classList.remove("focused");
    current = null;
    if (onShow[id]) onShow[id]();
    // sur l'accueil, la sélection revient toujours sur la rangée de tuiles
    setFocus(id === "home" ? (document.querySelector(".mtile") || focusables()[0]) : focusables()[0]);
  }
  function back() {
    if (document.activeElement && document.activeElement.tagName === "INPUT") {
      document.activeElement.blur(); return;
    }
    if (activeScreen().id === "settings" && formChanged()) saveForm(true);
    if (activeScreen().id === "brief") { stopSpeak(); return goHome(); }
    if (activeScreen().id === "home") screenStack = [];   // depuis l'accueil, Retour ne « revient » jamais dans un autre écran
    if (screenStack.length) {
      var id = screenStack.pop();
      show(id, false);
      return;
    }
    if (activeScreen().id !== "home") return goHome();   // jamais de sortie directe depuis un écran intérieur
    // Accueil : il faut appuyer DEUX fois sur Retour (en moins de 2,5 s) pour quitter l'appli
    var now = Date.now();
    if (now - lastBack < 2500) { lastBack = 0; hideExitHint(); return goTV(); }
    lastBack = now; showExitHint();
  }
  var lastBack = 0, exitT = null;
  function showExitHint() {
    var el = $("exitHint");
    if (!el) { el = document.createElement("div"); el.id = "exitHint"; el.className = "exit-hint"; document.body.appendChild(el); }
    el.textContent = "Appuie encore sur Retour pour quitter Yusei";
    el.className = "exit-hint show";
    clearTimeout(exitT); exitT = setTimeout(hideExitHint, 2500);
  }
  function hideExitHint() { var el = $("exitHint"); if (el) el.className = "exit-hint"; }

  function activate(el) {
    if (!el) return;
    if (el.tagName === "INPUT") { el.focus(); try { var n = el.value.length; el.setSelectionRange(n, n); } catch (x) {} return; }
    if (el.dataset.go) return show(el.dataset.go);
    if (el.classList.contains("back")) return back();
    if (el.dataset.app) return launchApp(el.dataset.app, el.dataset.name);
    if (el.dataset.action === "tv") return goTV();
    if (el.dataset.min) return startTimer(+el.dataset.min);
    if (el.dataset.prompt) return askAI(el.dataset.prompt);
    if (el._onOk) return el._onOk();
  }

  // Clavier à l'écran de la télé : « Terminé » = 65376, « Annuler » = 65385 (pas la touche 13).
  function caretAt(inp, end) {
    try { var p = inp.selectionStart, q = inp.selectionEnd; return p === q && (end ? p >= inp.value.length : p === 0); } catch (x) { return true; }
  }
  document.addEventListener("keydown", function (e) {
    var ae = document.activeElement, typing = ae && ae.tagName === "INPUT";
    switch (e.keyCode) {
      case 65376: case 65385:
        if (typing) { ae.blur(); if (ae.id === "aiInput" && e.keyCode === 65376) sendAI(); }
        e.preventDefault(); break;
      case KEY.LEFT: if (!typing || caretAt(ae, false)) { if (typing) ae.blur(); move("left"); e.preventDefault(); } break;
      case KEY.RIGHT: if (!typing || caretAt(ae, true)) { if (typing) ae.blur(); move("right"); e.preventDefault(); } break;
      case KEY.UP: if (typing) document.activeElement.blur(); move("up"); e.preventDefault(); break;
      case KEY.DOWN: if (typing) document.activeElement.blur(); move("down"); e.preventDefault(); break;
      case KEY.ENTER:
        if (typing) {
          var inp = document.activeElement; inp.blur();
          if (inp.id === "aiInput") sendAI();
        } else activate(current);
        e.preventDefault(); break;
      case KEY.BACK: case KEY.ESC: if (typing) ae.blur(); else back(); e.preventDefault(); break;  // Retour ferme d'abord le clavier
      case 403: show("ai"); break;       // touche rouge   → IA
      case 404: show("timer"); break;    // touche verte   → minuteur
      case 405: show("rer"); break;      // touche jaune   → RER
      case 406: show("weather"); break;  // touche bleue   → météo
    }
  });
  // Plein écran au premier appui dans le navigateur de la télé
  function goFull() {
    if (!WEB || document.fullscreenElement || document.webkitFullscreenElement) return;
    var d = document.documentElement;
    try { (d.requestFullscreen || d.webkitRequestFullscreen || function () {}).call(d); } catch (e) {}
  }
  document.addEventListener("keydown", goFull, true);
  document.addEventListener("click", goFull, true);
  // souris / pointeur (navigateur PC)
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest(".focusable");
    if (el) { setFocus(el); activate(el); }
  });

  // ================================================================
  //  HORLOGE
  // ================================================================
  function tick() {
    var d = new Date();
    $("clock").textContent = pad(d.getHours()) + ":" + pad(d.getMinutes());
    $("date").textContent = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    var h = d.getHours();
    $("greet").textContent = (h < 5 ? "Bonne nuit" : h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir") +
      (cfg.nomFoyer ? ", " + cfg.nomFoyer : "");
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hm(d) { return pad(d.getHours()) + "h" + pad(d.getMinutes()); }

  // ================================================================
  //  MÉTÉO — Open-Meteo (gratuit, sans clé)
  // ================================================================
  var WMO = {
    0: ["☀️", "Ciel dégagé"], 1: ["🌤", "Plutôt ensoleillé"], 2: ["⛅", "Partiellement nuageux"], 3: ["☁️", "Couvert"],
    45: ["🌫", "Brouillard"], 48: ["🌫", "Brouillard givrant"], 51: ["🌦", "Bruine légère"], 53: ["🌦", "Bruine"], 55: ["🌧", "Bruine forte"],
    61: ["🌦", "Pluie faible"], 63: ["🌧", "Pluie"], 65: ["🌧", "Forte pluie"], 66: ["🌧", "Pluie verglaçante"], 67: ["🌧", "Pluie verglaçante"],
    71: ["🌨", "Neige faible"], 73: ["🌨", "Neige"], 75: ["❄️", "Forte neige"], 77: ["🌨", "Grains de neige"],
    80: ["🌦", "Averses"], 81: ["🌧", "Averses"], 82: ["⛈", "Fortes averses"], 85: ["🌨", "Averses de neige"], 86: ["🌨", "Averses de neige"],
    95: ["⛈", "Orage"], 96: ["⛈", "Orage et grêle"], 99: ["⛈", "Orage et grêle"]
  };
  var meteoTexte = "", demainTexte = "", pluieTexte = "", perturbTexte = "", perturbAt = 0;
  function wmo(c) { return WMO[c] || ["🌡", "—"]; }

  function loadWeather() {
    $("wCity").textContent = $("wCity2").textContent = cfg.ville;
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + cfg.latitude + "&longitude=" + cfg.longitude +
      "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&hourly=precipitation_probability,precipitation&forecast_hours=6&timezone=Europe%2FParis";
    getJSON(url).then(function (j) {
      var c = j.current, w = wmo(c.weather_code);
      $("wIcon").textContent = w[0];
      $("wTemp").textContent = Math.round(c.temperature_2m) + "°";
      var max = Math.round(j.daily.temperature_2m_max[0]), min = Math.round(j.daily.temperature_2m_min[0]);
      $("wDesc").textContent = w[1] + " · " + min + "° / " + max + "° · ressenti " + Math.round(c.apparent_temperature) + "°";
      meteoTexte = w[1] + ", " + Math.round(c.temperature_2m) + "°C (min " + min + "°, max " + max + "°), pluie " +
        j.daily.precipitation_probability_max[0] + "%";
      var html = "";
      for (var i = 0; i < 7; i++) {
        var d = new Date(j.daily.time[i] + "T12:00:00"), dw = wmo(j.daily.weather_code[i]);
        html += '<div class="day"><div class="d">' + (i === 0 ? "Aujourd'hui" : d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })) +
          '</div><div class="i">' + dw[0] + '</div><div class="t">' + Math.round(j.daily.temperature_2m_min[i]) + "° / " +
          Math.round(j.daily.temperature_2m_max[i]) + '°</div><div class="r">💧 ' + j.daily.precipitation_probability_max[i] + "%</div></div>";
      }
      $("wDays").innerHTML = html;
      // demain (récap du soir)
      try { var w1 = wmo(j.daily.weather_code[1]);
        demainTexte = w1[1] + ", " + Math.round(j.daily.temperature_2m_min[1]) + " à " + Math.round(j.daily.temperature_2m_max[1]) + "°C, pluie " + j.daily.precipitation_probability_max[1] + "%"; } catch (e) { demainTexte = ""; }
      // alerte pluie : dans les 3 prochaines heures
      pluieTexte = "";
      try {
        var hh = j.hourly || {}, tt = hh.time || [], pp = hh.precipitation_probability || [], mm = hh.precipitation || [], nowH = Date.now() - 3600000;
        for (var k = 0; k < tt.length && k < 6; k++) {
          var at = new Date(tt[k] + ":00").getTime();
          if (at < nowH || at > Date.now() + 3 * 3600000) continue;
          if ((pp[k] || 0) >= 60 || (mm[k] || 0) >= 0.4) {
            var dh = new Date(at); pluieTexte = "Pluie vers " + dh.getHours() + " h (" + (pp[k] || 0) + " %)"; break;
          }
        }
      } catch (e) {}
    }).catch(function () { $("wDesc").textContent = "Météo indisponible"; });
  }

  // ================================================================
  //  TRANSPORTS EN COMMUN (RER B + tram T11) — API PRIM Île-de-France Mobilités
  // ================================================================
  // Plusieurs arrêts possibles (gare RER + station de tram) : identifiants séparés par des virgules.
  function lineName(mvj) {
    var lr = JSON.stringify(mvj.LineRef || ""), pub = (mvj.PublishedLineName && mvj.PublishedLineName[0] && mvj.PublishedLineName[0].value) || "";
    if (lr.indexOf("C01743") >= 0 || /^(rer )?b$/i.test(pub)) return "RER B";
    if (/^t?\s?11/i.test(pub) || /tram.*11/i.test(pub)) return "T11";
    if (/tram/i.test(String(mvj.VehicleMode || "")) && !pub) return "Tram";
    return pub || "";
  }
  // ---- Recherche automatique des arrêts (gare RER + station de tram) à partir du nom de la gare
  var PRIM = "https://prim.iledefrance-mobilites.fr/marketplace/";
  function monitor(ref) {
    return getJSON(PRIM + "stop-monitoring?MonitoringRef=" + encodeURIComponent(ref), { apikey: cfg.primCle })
      .then(function (j) { return j.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit || []; });
  }
  // État lisible de la recherche des transports (affiché à l'écran et dans le Diagnostic)
  var trState = { step: "", msg: "" };
  function trSet(step, msg) { trState = { step: step, msg: msg }; }
  function errCode(e) { var m = /\b(\d{3})\b/.exec(String(e && e.message || e)); return m ? +m[1] : 0; }
  function candidates(place) {
    var word = place.replace(/^(le|la|les|l')\s+/i, "");
    var re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), refs = [];
    function add(ref) { if (ref && refs.indexOf(ref) < 0) refs.push(ref); }
    function sp(id) { id = String(id || "").replace(/\D/g, ""); return id ? "STIF:StopArea:SP:" + id + ":" : ""; }
    var q = encodeURIComponent('search("' + word.replace(/"/g, "") + '")');
    var OD = "https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/";
    // 1) arrêts + lignes (open data, sans clé) : monomodalStopPlace = zone d'arrêt, sinon quai
    var al = getJSON(OD + "arrets-lignes/records?limit=100&where=" + q).then(function (j) {
      (j.results || []).forEach(function (r) {
        var txt = [r.stop_name, r.nom_commune, r.stop_name_fr].join(" "), mode = String(r.mode || r.route_type || "");
        if (!re.test(txt) || /bus/i.test(mode)) return;
        var sid = String(r.stop_id || r.arrid || ""), m = /monomodalStopPlace:(\d+)/.exec(sid);
        if (m) add(sp(m[1])); else if (/\d/.test(sid)) add("STIF:StopPoint:Q:" + sid.replace(/\D/g, "") + ":");
      });
    }).catch(function () {});
    // 2) zones d'arrêt (open data)
    var od = getJSON(OD + "zones-d-arrets/records?limit=100&where=" + q).then(function (j) {
      (j.results || []).forEach(function (r) {
        var txt = [r.zdaname, r.zdatown, r.name, r.town].join(" "), type = String(r.zdatype || r.type || "");
        if (re.test(txt) && (!type || /rail|tram|train/i.test(type))) add(sp(r.zdaid || r.id));
      });
    }).catch(function () {});
    // 3) recherche PRIM (avec la clé)
    var nv = getJSON(PRIM + "v2/navitia/places?count=20&type%5B%5D=stop_area&q=" + encodeURIComponent(place), { apikey: cfg.primCle }).then(function (j) {
      (j.places || []).forEach(function (pl) { if (re.test(pl.name || "")) { var m = /(\d{4,7})\s*$/.exec(pl.id || ""); if (m) add(sp(m[1])); } });
    }).catch(function () {});
    return Promise.all([al, od, nv]).then(function () {
      // les zones d'arrêt (gares) d'abord, puis les quais
      refs.sort(function (x, y) { return (/StopArea/.test(y) ? 1 : 0) - (/StopArea/.test(x) ? 1 : 0); });
      return refs.slice(0, 16);
    });
  }
  var findingStops = null, stopsFailAt = 0;
  function autoStops() {
    var key = "matele_arrets", place = cfg.arretNom || cfg.ville || "";
    try { var c = JSON.parse(localStorage.getItem(key) || "null"); if (c && c.place === place && c.refs.length) return Promise.resolve(c.refs); } catch (e) {}
    if (findingStops) return findingStops;
    if (Date.now() - stopsFailAt < 15 * 60000) return Promise.resolve([]);   // échec récent : on ne harcèle pas PRIM
    trSet("search", "Recherche des arrêts de " + place + "…");
    findingStops = candidates(place).then(function (cands) {
      if (!cands.length) { trSet("none", "Aucun arrêt trouvé pour « " + place + " » (sites d'Île-de-France Mobilités injoignables ?)"); return []; }
      return Promise.all(cands.map(function (ref) {
        return monitor(ref).then(function (v) {
          var lines = v.map(function (x) { return lineName(x.MonitoredVehicleJourney); });
          return { ref: ref, n: v.length, b: lines.indexOf("RER B") >= 0, t: lines.some(function (l) { return /^T/.test(l); }) };
        }, function (e) { return { ref: ref, n: 0, err: errCode(e) || -1 }; });
      })).then(function (res) {
        var rer = res.filter(function (r) { return r.b; }), tram = res.filter(function (r) { return r.t && !r.b; });
        var refs = [].concat(rer.slice(0, 1), tram.slice(0, 1)).map(function (r) { return r.ref; });
        if (!refs.length) refs = res.filter(function (r) { return r.n; }).slice(0, 2).map(function (r) { return r.ref; });
        if (!refs.length) {
          var codes = res.map(function (r) { return r.err; }).filter(Boolean);
          if (codes.some(function (c) { return c === 401 || c === 403; })) trSet("key", "Clé PRIM refusée (" + codes[0] + ") : sur prim.iledefrance-mobilites.fr, vérifie ton jeton et l'accès à l'API « Prochains passages (requête unitaire) »");
          else if (codes.some(function (c) { return c === 429; })) trSet("quota", "Trop de demandes à PRIM pour aujourd'hui : réessaie plus tard");
          else if (codes.length === res.length) trSet("net", "PRIM ne répond pas depuis la télé (code " + codes[0] + ")");
          else trSet("empty", cands.length + " arrêts trouvés, mais aucun passage annoncé en ce moment");
        } else trSet("ok", "");
        return refs;
      });
    }).then(function (refs) {
      findingStops = null;
      if (refs.length) { stopsFailAt = 0; try { localStorage.setItem(key, JSON.stringify({ place: place, refs: refs })); } catch (e) {} }
      else stopsFailAt = Date.now();
      return refs;
    }, function () { findingStops = null; stopsFailAt = Date.now(); trSet("none", "Recherche des arrêts impossible"); return []; });
    return findingStops;
  }
  function stopRefs() {
    var manual = String(cfg.arretRef || "").split(/\s*,\s*/).filter(function (x) { return x && !/^auto$/i.test(x); }).slice(0, 4);
    return manual.length ? Promise.resolve(manual) : autoStops();
  }
  var rerTried = false;
  function loadPerturb(visits) {
    if (Date.now() - perturbAt < 10 * 60000) return; perturbAt = Date.now();
    var refs = [];
    (visits || []).forEach(function (v) { var l = v.MonitoredVehicleJourney && v.MonitoredVehicleJourney.LineRef; l = l && (l.value || l); if (typeof l === "string" && refs.indexOf(l) < 0) refs.push(l); });
    Promise.all(refs.slice(0, 3).map(function (ref) {
      return getJSON(PRIM + "general-message?LineRef=" + encodeURIComponent(ref), { apikey: cfg.primCle }).then(function (j) {
        var d = (((j.Siri || {}).ServiceDelivery || {}).GeneralMessageDelivery || [])[0] || {}, out = [];
        (d.InfoMessage || []).forEach(function (m) {
          var until = m.ValidUntilTime ? new Date(m.ValidUntilTime).getTime() : 0;
          if (until && until < Date.now()) return;
          ((m.Content || {}).Message || []).forEach(function (x) { var t = x.MessageText && (x.MessageText.value || x.MessageText); if (typeof t === "string" && t.trim()) out.push(t.trim()); });
        });
        return out;
      }, function () { return []; });
    })).then(function (lists) {
      var all = [].concat.apply([], lists).filter(function (t, i, s) { return s.indexOf(t) === i; });
      perturbTexte = all.slice(0, 3).join(" | ").replace(/\s+/g, " ").slice(0, 400);
      var el = $("rerAlert");
      if (el) { el.textContent = perturbTexte ? "Info trafic : " + perturbTexte.split(" | ").slice(0, 2).join(" — ") : ""; el.style.display = perturbTexte ? "" : "none"; }
    });
  }
  function loadRer() {
    $("rerName").textContent = $("rerName2").textContent = cfg.arretNom || "";
    if (!cfg.primCle) {
      var msg = '<li class="muted">À configurer dans Réglages (clé PRIM gratuite)</li>';
      $("rerList").innerHTML = $("rerBig").innerHTML = msg;
      return;
    }
    stopRefs().then(function (refs) {
      if (!refs.length) throw new Error(trState.msg || "aucun arrêt");
      return Promise.all(refs.map(function (ref) { return monitor(ref).then(null, function () { return null; }); }));
    }).then(function (all) {
      if (all.every(function (x) { return x === null; })) throw new Error("indispo");
      var visits = [].concat.apply([], all.map(function (x) { return x || []; }));
      var now = Date.now();
      var deps = visits.map(function (v) {
        var mvj = v.MonitoredVehicleJourney, call = mvj.MonitoredCall || {};
        var t = call.ExpectedDepartureTime || call.ExpectedArrivalTime || call.AimedDepartureTime;
        var dest = (mvj.DestinationName && mvj.DestinationName[0] && mvj.DestinationName[0].value) ||
          (call.DestinationDisplay && call.DestinationDisplay[0] && call.DestinationDisplay[0].value) || "—";
        return { t: new Date(t), dest: dest, ln: lineName(mvj) };
      }).filter(function (d) { return d.t.getTime() > now - 60000; })
        .sort(function (a, b) { return a.t - b.t; });
      if (!deps.length) { $("rerList").innerHTML = $("rerBig").innerHTML = '<li class="muted">Aucun départ annoncé</li>'; return; }
      function line(d) {
        var min = Math.max(0, Math.round((d.t - now) / 60000));
        var badge = d.ln ? '<span class="ln ' + (d.ln === "RER B" ? "ln-b" : "ln-t") + '">' + esc(d.ln === "RER B" ? "B" : d.ln) + "</span>" : "";
        return '<li><span class="when">' + (min === 0 ? "À quai" : min + " min") + '</span><span class="what">' + badge + esc(d.dest) + " · " + hm(d.t) + "</span></li>";
      }
      rerTexte = deps.slice(0, 6).map(function (d) { return (d.ln ? d.ln + " " : "") + "dans " + Math.max(0, Math.round((d.t - now) / 60000)) + " min vers " + d.dest; }).join(" ; ");
      // accueil : les 3 prochains, en gardant au moins 1 départ de chaque ligne
      var first = [], seen = {};
      deps.forEach(function (d) { if (!seen[d.ln]) { seen[d.ln] = 1; first.push(d); } });
      var home = first.concat(deps.filter(function (d) { return first.indexOf(d) < 0; })).slice(0, 3).sort(function (a, b) { return a.t - b.t; });
      rerTried = true;
      loadPerturb(visits);
      $("rerList").innerHTML = home.map(line).join("");
      $("rerBig").innerHTML = deps.slice(0, 12).map(line).join("");
    }).catch(function (e) {
      rerTried = true;
      try { localStorage.removeItem("matele_arrets"); } catch (e) {}  // on recherchera les arrêts au prochain essai
      var c = errCode(e), why = trState.step && trState.step !== "ok" ? trState.msg :
        c === 401 || c === 403 ? "Clé PRIM refusée (" + c + ")" : c ? "PRIM a répondu par une erreur " + c : "PRIM injoignable depuis la télé";
      if (!trState.step || trState.step === "ok") trSet("err", why);
      $("rerList").innerHTML = '<li class="muted">Horaires indisponibles</li>';
      $("rerBig").innerHTML = '<li class="muted">Horaires indisponibles — ' + esc(why) + "</li>";
    });
  }

  // ================================================================
  //  AGENDA — lien iCal (Google Agenda, Outlook…)
  // ================================================================
  function parseIcsDate(v) {
    // 20261026T143000Z | 20261026T143000 | 20261026
    var m = v.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
    if (!m) return null;
    if (!m[4]) return { d: new Date(+m[1], m[2] - 1, +m[3]), allDay: true };
    if (m[7]) return { d: new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6])), allDay: false };
    return { d: new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]), allDay: false };
  }
  // Rendez-vous ajoutés à Yusei (à la voix ou par écrit), gardés sur la télé et mélangés à Google Agenda.
  function localRdv() { try { return JSON.parse(localStorage.getItem("matele_rdv") || "[]"); } catch (e) { return []; } }
  function saveRdv(l) { try { localStorage.setItem("matele_rdv", JSON.stringify(l.slice(-200))); } catch (e) {} }
  function addRdv(titre, date, heure) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || "")), h = /^(\d{1,2})[:h](\d{2})?$/.exec(String(heure || "").trim());
    titre = String(titre || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 80);
    if (!m || !titre) return false;
    var d = new Date(+m[1], +m[2] - 1, +m[3], h ? Math.min(23, +h[1]) : 0, h ? Math.min(59, +(h[2] || 0)) : 0);
    if (isNaN(d.getTime())) return false;
    var l = localRdv(); l.push({ t: d.getTime(), allDay: !h, title: titre }); saveRdv(l);
    loadAgenda(); return true;
  }
  function delRdv(titre, date) {
    var q = String(titre || "").toLowerCase(), l = localRdv(), n = l.length;
    l = l.filter(function (e) { var d = new Date(e.t); var ds = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
      return !(e.title.toLowerCase().indexOf(q) >= 0 && (!date || date === ds)); });
    saveRdv(l); loadAgenda(); return l.length < n;
  }
  var agendaState = "", agendaToday = [];   // "off" (rien de relié), "vide", "ok"
  function loadAgenda() {
    var local = localRdv().map(function (e) { return { start: { d: new Date(e.t), allDay: e.allDay }, title: e.title, mine: true }; });
    var ics = cfg.agendaIcs ? getText(cfg.agendaIcs) : Promise.resolve("");
    ics.then(function (txt) {
      var lines = String(txt || "").replace(/\r\n[ \t]/g, "").split(/\r?\n/), evs = local.slice(), ev = null;
      lines.forEach(function (l) {
        if (l === "BEGIN:VEVENT") ev = {};
        else if (l === "END:VEVENT") { if (ev && ev.start) evs.push(ev); ev = null; }
        else if (ev) {
          var i = l.indexOf(":"), key = l.slice(0, i).split(";")[0], val = l.slice(i + 1);
          if (key === "DTSTART") ev.start = parseIcsDate(val);
          if (key === "SUMMARY") ev.title = val.replace(/\\,/g, ",").replace(/\\n/g, " ");
        }
      });
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var limit = new Date(today.getTime() + 8 * 864e5);
      evs = evs.filter(function (e) { return e.start.d >= today && e.start.d < limit; })
        .sort(function (a, b) { return a.start.d - b.start.d; });
      var refDay = new Date(); if (isEvening()) refDay = new Date(Date.now() + (new Date().getHours() < 4 ? 0 : 864e5));
      agendaToday = evs.filter(function (e) { return e.start.d.toDateString() === refDay.toDateString(); });
      if (!evs.length) {
        agendaState = cfg.agendaIcs || local.length ? "vide" : "off"; agendaTexte = "";
        $("agendaList").innerHTML = $("agendaBig").innerHTML = '<li class="muted">' + (agendaState === "off" ? "Dis à Yusei : « ajoute un rendez-vous… »" : "Rien de prévu cette semaine") + "</li>";
        return;
      }
      agendaState = "ok";
      function line(e) {
        var d = e.start.d, isToday = d.toDateString() === new Date().toDateString();
        var day = isToday ? "Auj." : d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
        return '<li><span class="when">' + day + (e.start.allDay ? "" : " " + hm(d)) + '</span><span class="what">' + esc(e.title || "(sans titre)") + "</span></li>";
      }
      agendaTexte = evs.slice(0, 6).map(function (e) { return e.start.d.toLocaleString("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit" }) + " : " + (e.title || ""); }).join(" ; ");
      $("agendaList").innerHTML = evs.slice(0, 3).map(line).join("");
      $("agendaBig").innerHTML = evs.slice(0, 10).map(line).join("");
    }).catch(function () { agendaState = agendaState || "vide"; $("agendaList").innerHTML = $("agendaBig").innerHTML = '<li class="muted">Agenda indisponible</li>'; });
  }

  // ================================================================
  //  APPLIS SAMSUNG
  // ================================================================
  // Jeu d'icônes original (traits fins, même style partout)
  function svg(body) {
    return '<svg class="m-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + body + "</svg>";
  }
  var ICON = {
    spark: svg('<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M19 3.5v3M17.5 5h3M5.5 17v3M4 18.5h3"/>'),
    weather: svg('<circle cx="8" cy="8" r="2.8"/><path d="M8 2.5v1.2M2.5 8h1.2M4.1 4.1l.9.9M11.9 4.1l-.9.9"/><path d="M8.5 19.5h8.5a3.8 3.8 0 0 0 .3-7.6 5 5 0 0 0-9.3 1.2 3.2 3.2 0 0 0 .5 6.4z"/>'),
    train: svg('<rect x="6" y="3" width="12" height="13.5" rx="3.2"/><path d="M6 10h12M9 3.5V2.5M15 3.5V2.5"/><circle cx="9.3" cy="13.3" r=".6"/><circle cx="14.7" cy="13.3" r=".6"/><path d="M8.5 21l2-4.5M15.5 21l-2-4.5M9.4 19h5.2"/>'),
    tv: svg('<rect x="3" y="5.5" width="18" height="12" rx="2.6"/><path d="M8.5 21h7M12 17.5V21M9.5 2.5l2.5 3 2.5-3"/>'),
    pen: svg('<path d="M4.5 19.5l3.8-.9L19 7.9a2.1 2.1 0 0 0-3-3L5.4 15.6z"/><path d="M14.5 6.5l3 3"/><path d="M13 20c1.5 0 1.8-1.6 3.4-1.6S18.6 20 20 20"/>'),
    spy: svg('<path d="M3 11.5h18"/><path d="M6.2 11.5l1.4-5.2a2 2 0 0 1 2.7-1.3l1.7.8 1.7-.8a2 2 0 0 1 2.7 1.3l1.4 5.2"/><circle cx="8" cy="16.2" r="2.7"/><circle cx="16" cy="16.2" r="2.7"/><path d="M10.7 16h2.6"/>'),
    timer: svg('<circle cx="12" cy="13.5" r="7.2"/><path d="M12 13.5V10M10 2.8h4M12 2.8v3.5M18.3 7.2l1.3-1.3"/>'),
    photo: svg('<rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="9" cy="10" r="1.7"/><path d="M3.5 17.2l5-4.6 4 3.6 3-2.6 5 4.2"/>'),
    grid: svg('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>'),
    cart: svg('<path d="M3 4h2.2l2.1 10.2a1.6 1.6 0 0 0 1.6 1.3h8.3a1.6 1.6 0 0 0 1.6-1.2L20.5 8H6.1"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>'),
    kids: svg('<circle cx="12" cy="8.5" r="4.5"/><path d="M10.3 8.2h.01M13.7 8.2h.01M10.4 10.4c.9.7 2.3.7 3.2 0"/><path d="M5 21c.8-3.7 3.6-6 7-6s6.2 2.3 7 6"/><path d="M9 4.6C9.6 3.3 10.7 2.8 12 3"/>'),
    quiz: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.8v.4"/><circle cx="12" cy="16.8" r=".7"/>'),
    note: svg('<path d="M4.5 5.5h15v10h-7l-4.5 3.8v-3.8H4.5z"/><path d="M8 9.5h8M8 12.5h5"/>'),
    alert: svg('<path d="M12 3.8 21 19.5H3z"/><path d="M12 9.5v4.5M12 16.8h.01"/>'),
    sliders: svg('<path d="M4 7h9.5M18.5 7H20M4 17h4M12.5 17H20"/><circle cx="16" cy="7" r="2.3"/><circle cx="10" cy="17" r="2.3"/>'),
    cal: function (d) {
      return svg('<rect x="3.5" y="5" width="17" height="15.5" rx="3.2"/><path d="M3.5 9.8h17M8 3v4M16 3v4"/>' +
        '<text x="12" y="17.6" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" stroke="none" font-family="Inter,Arial,sans-serif">' + d + "</text>");
    }
  };

  // Tuiles masquées depuis la télécommande (Yusei et Réglages restent toujours visibles)
  function hiddenTile(label) {
    var m = String((window.__prefs && window.__prefs.masquer) || "").toLowerCase().split(",").map(function (x) { return x.trim(); }).filter(Boolean);
    var l = String(label).toLowerCase();
    if (l === String(cfg.jarvisNom || "yusei").toLowerCase() || l === "réglages") return false;
    return m.indexOf(l) >= 0;
  }
  function buildApps() {
    // Une tuile = nom, icône, description, couleurs. Chaque thème l'affiche à sa façon.
    var premium = cfg.theme === "premium";
    function t(attrs, ico, label, cls, effet, elem, rare, c1, c2) {
      if (hiddenTile(label)) return "";
      return '<div class="mtile focusable ' + (cls || "") + '" data-el="' + elem + '" data-title="' + label + '" data-sub="' + effet + '"' +
        (c1 ? ' style="--c:' + c1 + ";--c2:" + (c2 || c1) + '"' : "") + " " + attrs + '>' +
        '<div class="c-top"><span class="c-name">' + label + '</span><span class="c-rare">' + rare + '</span></div>' +
        '<div class="c-art">' + ico + '</div>' +
        '<div class="c-desc">' + effet + '</div><span class="c-holo"></span></div>';
    }
    var nom = esc(cfg.jarvisNom || "Yusei");
    var html = t('data-go="ai"', ICON.spark, nom, "star", "Votre assistant : il répond à tout et pilote la maison.", "legend", "★★★★★");
    if (premium) {
      html += t('data-go="weather"', ICON.weather, "Météo", "", "Prévisions sur 7 jours au " + esc(cfg.ville) + ".", "azur", "", "#62b8ea", "#1d6fb8");
      html += t('data-go="rer"', ICON.train, "Transports en commun", "", "RER B et tram T11, en temps réel.", "azur", "", "#2f80c4", "#123f78");
      html += t('data-go="agenda"', ICON.cal(new Date().getDate()), "Agenda", "", "Les rendez-vous de la semaine.", "azur", "", "#e9965a", "#b4532b");
      html += t('data-go="courses"', ICON.cart, "Courses", "", "La liste de courses partagée avec ton téléphone.", "azur", "", "#86a95c", "#3f6a2b");
    }
    if (!WEB) html += t('data-action="tv"', ICON.tv, "Télévision", "", "Retour aux chaînes.", "azur", "★★", "#7a6f68", "#3b322e");
    (cfg.applis || []).forEach(function (a) {
      if (WEB && !a.web) return;   // navigateur : seules les applis avec une version web (YouTube)
      if (a.siInstallee && !(IS_TIZEN && findInstalled(a))) return;   // tuile seulement si l'appli est sur la télé
      html += t('data-app="' + esc((a.ids || [])[0] || a.id || a.nom) + '" data-name="' + esc(a.nom) + '"',
        '<span class="m-app">' + esc(a.nom) + "</span>", esc(a.nom), "",
        "Ouvre " + esc(a.nom) + ".", "ecarlate", "★★★", esc(a.couleur), "#141414");
    });
    if (!WEB) html += t('data-go="apps"', ICON.grid, "Toutes mes applis", "", "Toutes les applications installées sur la télé.", "gris", "★★", "#d6b585", "#946f42");
    html += t('data-go="draw"', ICON.pen, "Tableau", "", "Dessine en direct depuis ton téléphone.", "emeraude", "★★", "#86a95c", "#3f6a2b");
    html += t('data-go="quiz"', ICON.quiz, "Quiz en famille", "", "Tout le monde répond depuis son téléphone. Qui sera le champion ?", "ecarlate", "★★★★", "#f2c14e", "#b47a12");
    html += t('data-go="enfants"', ICON.kids, "Enfants", "", "Histoire du soir, aide aux devoirs et temps d'écran.", "emeraude", "★★★", "#6cc3e8", "#2a78a8");
    html += t('data-go="undercover"', ICON.spy, "Undercover", "", "Le jeu d'ambiance : trouve l'infiltré parmi tes invités.", "ecarlate", "★★★★", "#a27bbd", "#55367a");
    html += t('data-go="timer"', ICON.timer, "Minuteur", "", "Compte le temps.", "emeraude", "★★", "#45bdb3", "#1b7a74");
    html += t('data-go="photos"', ICON.photo, "Photos", "", "Souvenirs de famille.", "emeraude", "★★", "#ec9a7f", "#b35848");
    html += t('data-go="settings"', ICON.sliders, "Réglages", "", "Configure la maison.", "gris", "★", "#bdb3a5", "#6d6357");
    $("menu").innerHTML = html;
    applyLogos();
  }

  // Logos : l'icône officielle de l'appli installée sur la télé (ou une image perso "logo" dans config.js).
  // ---------- Applis installées sur la télé ----------
  // On demande à la télé la liste de ses applis et on retrouve chacune par son nom
  // (les identifiants Samsung changent selon les années), avec des identifiants connus en secours.
  var installed = null;   // null = pas encore vérifié ; {} = liste reçue
  function appIds(a) { return [].concat(a.ids || [], a.id ? [a.id] : []).filter(function (x, i, arr) { return x && arr.indexOf(x) === i; }); }
  function findInstalled(a) {
    if (!installed) return null;
    var ids = appIds(a), re = new RegExp(a.match || a.nom.replace(/[^A-Za-z0-9]/g, ".?"), "i");
    for (var i = 0; i < ids.length; i++) if (installed.byId[ids[i]]) return installed.byId[ids[i]];
    for (var k = 0; k < installed.list.length; k++) if (re.test(installed.list[k].name || "")) return installed.list[k];
    return null;
  }
  function discoverApps(done) {
    if (!IS_TIZEN) { if (done) done(); return; }
    try {
      tizen.application.getAppsInfo(function (list) {
        installed = { list: list || [], byId: {} };
        installed.list.forEach(function (x) { installed.byId[x.id] = x; });
        var sel = current && current.classList.contains("mtile") ? current.dataset.title : null;
        buildApps();
        if (activeScreen().id === "home") {
          var again = sel && Array.prototype.filter.call(document.querySelectorAll(".mtile"), function (x) { return x.dataset.title === sel; })[0];
          setFocus(again || document.querySelector(".mtile"));
        }
        if (done) done();
      }, function () { installed = { list: [], byId: {} }; if (done) done(); });
    } catch (e) { installed = { list: [], byId: {} }; if (done) done(); }
  }
  function appIcon(a) {
    if (a.logo) return a.logo;
    var f = findInstalled(a);
    return f && f.iconPath ? f.iconPath : "";
  }
  function applyLogos() {
    (cfg.applis || []).forEach(function (a) {
      var src = appIcon(a);
      if (!src || !/^(file:|https?:|logos\/|\/|data:image\/)/.test(src)) return;
      var tile = document.querySelector('.mtile[data-name="' + esc(a.nom) + '"] .c-art');
      if (!tile) return;
      var img = new Image();
      img.className = "m-logo"; img.alt = "";
      img.onload = function () { tile.innerHTML = ""; tile.appendChild(img); tile.classList.add("has-logo"); };
      img.src = src;
    });
  }
  // ---------- Écran « Toutes mes applis »
  var OWN_ID = "";
  try { OWN_ID = tizen.application.getCurrentApplication().appInfo.id; } catch (e) {}
  function buildAllApps() {
    var box = $("allApps");
    if (!IS_TIZEN) { box.innerHTML = '<p class="uc-big">Disponible avec l\'appli installée sur la télé (méthode B).</p>'; return; }
    if (!installed) { box.innerHTML = '<p class="uc-big">Recherche des applications…</p>'; discoverApps(buildAllApps); return; }
    var list = installed.list.filter(function (x) { return x && x.name && x.id !== OWN_ID && !/^(org\.tizen\.(system|setting|homescreen)|com\.samsung\.tv\.store)/.test(x.id); })
      .sort(function (a, b) { return String(a.name).localeCompare(String(b.name), "fr"); });
    if (!list.length) { box.innerHTML = '<p class="uc-big">Aucune application trouvée.</p>'; return; }
    box.innerHTML = list.map(function (x) {
      var ok = x.iconPath && /^(file:|https?:|\/|data:image\/)/.test(x.iconPath);
      return '<div class="ap focusable" data-aid="' + esc(x.id) + '"><div class="ap-ico">' + (ok ? '<img alt="" src="' + esc(x.iconPath) + '">' : '<span>' + esc(String(x.name).charAt(0)) + "</span>") +
        '</div><div class="ap-name">' + esc(x.name) + "</div></div>";
    }).join("");
    Array.prototype.forEach.call(box.querySelectorAll(".ap"), function (el) {
      el._onOk = function () { try { tizen.application.launch(el.dataset.aid, function () {}, function () { toast("Impossible d'ouvrir cette appli"); }); } catch (e) { toast("Impossible d'ouvrir cette appli"); } };
      var im = el.querySelector("img"); if (im) im.onerror = function () { im.parentNode.innerHTML = "<span>" + esc(el.querySelector(".ap-name").textContent.charAt(0)) + "</span>"; };
    });
  }

  function appByName(name) {
    var low = String(name || "").toLowerCase().replace(/[^a-z0-9+]/g, "");
    return (cfg.applis || []).filter(function (x) {
      var n = x.nom.toLowerCase().replace(/[^a-z0-9+]/g, "");
      return n && low && (n.indexOf(low) >= 0 || low.indexOf(n) >= 0);
    })[0];
  }

  // Bandeau "à la une" (thème premium) : change selon la tuile sélectionnée.
  function extraChips() {
    var out = [];
    if (perturbTexte) out.push([ICON.alert, perturbTexte.split(" | ")[0].slice(0, 70)]);
    if (pluieTexte) out.push([ICON.weather, pluieTexte]);
    if (window.Maison) window.Maison.chips().forEach(function (c) { var ic = ICON[c[0]] || ICON.note; out.push([typeof ic === "function" ? ic("") : ic, c[1]]); });
    return out;
  }
  window.__hero = function (el) {
    if (cfg.theme !== "premium") return;
    var isAi = el.dataset.go === "ai";
    $("heroKicker").textContent = isAi ? (new Date().getHours() < 18 ? "Bonjour" : "Bonsoir") + ", " + (cfg.appellation || "") : "";
    $("heroTitle").textContent = el.dataset.title;
    $("heroSub").textContent = el.dataset.sub;
    var chips = [];
    if (isAi || el.dataset.go === "weather") chips.push([ICON.weather, $("wTemp").textContent + " · " + ($("wDesc").textContent.split(" · ")[0] || "")]);
    if ((isAi || el.dataset.go === "rer") && rerTexte) chips.push([ICON.train, rerTexte.split(" ; ")[0]]);
    if ((isAi || el.dataset.go === "agenda") && agendaTexte) chips.push([ICON.cal(""), agendaTexte.split(" ; ")[0]]);
    if (isAi) extraChips().forEach(function (c) { chips.push(c); });
    $("heroChips").innerHTML = chips.slice(0, 5).map(function (c) { return '<span class="chipx">' + c[0] + esc(c[1]) + "</span>"; }).join("");
  };
  function launchApp(id, name) {
    var a = appByName(name) || { nom: name, id: id };
    if (WEB) {
      if (a.web) {
        toast("Ouverture de " + a.nom + "… (bouton Retour pour revenir)");
        setTimeout(function () { location.href = a.web; }, 900);
        return "web";
      }
      toast("Ouvre " + a.nom + " avec le bouton Accueil de ta télécommande Samsung");
      return "home";
    }
    if (!IS_TIZEN) { toast("Lancement de " + a.nom + " (sur la télé)"); return "pc"; }
    var f = findInstalled(a), ids = appIds(a);
    if (f) ids = [f.id].concat(ids.filter(function (x) { return x !== f.id; }));
    if (installed && !f) {
      toast(a.nom + " n'est pas installée : installe-la depuis Apps (Smart Hub)");
      try { tizen.application.launch("org.volt.apps"); } catch (e) {}
      return "missing";
    }
    (function tryNext(i) {
      if (i >= ids.length) { toast("Impossible d'ouvrir " + a.nom); return; }
      try { tizen.application.launch(ids[i], function () {}, function () { tryNext(i + 1); }); }
      catch (e) { tryNext(i + 1); }
    })(0);
    return "launch";
  }
  function goTV() {
    if (WEB) return toast("Appuie sur le bouton Source ou Accueil de ta télécommande pour la télé");
    if (!IS_TIZEN) return toast("Retour à la télévision (sur la télé)");
    try { tizen.application.getCurrentApplication().hide(); } catch (e) {
      try { tizen.application.getCurrentApplication().exit(); } catch (e2) {}
    }
  }

  // ================================================================
  //  YUSEI — IA de la maison (Google Gemini + actions sur la télé)
  // ================================================================
  var history = [];
  var rerTexte = "", agendaTexte = "";
  var PROMPTS = [
    "Yusei, fais-moi le point de la journée",
    "Mets YouTube",
    "Lance un minuteur de 10 minutes",
    "Idée de repas halal rapide pour ce soir",
    "Raconte une histoire courte pour enfants",
    "Explique-moi une notion de maths simplement"
  ];
  // Seules ces actions sont possibles : Yusei ne peut rien faire d'autre sur la télé.
  var TOOLS = [{ functionDeclarations: [
    { name: "ouvrir_application", description: "Ouvre une application de streaming sur la télévision.",
      parameters: { type: "object", properties: { nom: { type: "string", description: "Nom exact de l'application" } }, required: ["nom"] } },
    { name: "lancer_minuteur", description: "Lance un minuteur.",
      parameters: { type: "object", properties: { minutes: { type: "integer" } }, required: ["minutes"] } },
    { name: "arreter_minuteur", description: "Arrête le minuteur en cours.", parameters: { type: "object", properties: {} } },
    { name: "afficher_ecran", description: "Affiche un écran de l'interface.",
      parameters: { type: "object", properties: { ecran: { type: "string", enum: ["accueil", "meteo", "rer", "agenda", "photos", "minuteur", "jarvis", "dessin", "undercover", "courses", "enfants", "quiz"] } }, required: ["ecran"] } },
    { name: "ajouter_course", description: "Ajoute un article à la liste de courses partagée.",
      parameters: { type: "object", properties: { article: { type: "string" } }, required: ["article"] } },
    { name: "retirer_course", description: "Retire un article de la liste de courses.",
      parameters: { type: "object", properties: { article: { type: "string" } }, required: ["article"] } },
    { name: "regarder_la_television", description: "Ferme l'interface et revient aux chaînes de télévision.", parameters: { type: "object", properties: {} } },
    { name: "changer_fond_ecran", description: "Change l'image de fond d'écran.", parameters: { type: "object", properties: {} } },
    { name: "ajouter_rendez_vous", description: "Ajoute un rendez-vous ou un rappel dans l'agenda de la maison.",
      parameters: { type: "object", properties: { titre: { type: "string" }, date: { type: "string", description: "AAAA-MM-JJ" }, heure: { type: "string", description: "HH:MM, vide si toute la journée" } }, required: ["titre", "date"] } },
    { name: "supprimer_rendez_vous", description: "Supprime un rendez-vous de l'agenda de la maison (ajouté par Yusei).",
      parameters: { type: "object", properties: { titre: { type: "string" }, date: { type: "string", description: "AAAA-MM-JJ (facultatif)" } }, required: ["titre"] } }
  ] }];

  function buildChips() {
    $("chips").innerHTML = PROMPTS.map(function (p) {
      return '<div class="chip focusable" data-prompt="' + esc(p) + '">' + esc(p) + "</div>";
    }).join("");
    $("jvName").textContent = (cfg.jarvisNom || "YUSEI").split("").join(".") + ".";
    if (!$("chat").children.length) addMsg("Bonjour " + (cfg.appellation || "Monsieur") + ". Tous les systèmes sont opérationnels. Que puis-je faire pour vous ?", "bot");
  }
  function addMsg(txt, who, src) {
    var d = document.createElement("div");
    d.className = "msg " + who;
    if (src) { var s = document.createElement("span"); s.className = "src"; s.textContent = src; d.appendChild(s); }
    d.appendChild(document.createTextNode(txt));
    $("chat").appendChild(d);
    while ($("chat").children.length > 40) $("chat").removeChild($("chat").firstChild);
    $("chat").scrollTop = $("chat").scrollHeight;
    return d;
  }
  function setMsg(d, txt) { d.className = "msg bot"; d.lastChild.nodeValue = txt; $("chat").scrollTop = $("chat").scrollHeight; }
  function reactor(state) { $("reactor").className = "reactor " + (state || ""); $("jvStatus").textContent = state === "thinking" ? "ANALYSE EN COURS…" : "EN LIGNE"; }
  function hud() {
    $("jvHud").innerHTML = esc(cfg.ville.toUpperCase()) + " · " + esc($("wTemp").textContent + " · " + ($("wDesc").textContent.split(" · ")[0] || "").toUpperCase()) + "<br>" +
      "LIAISON TÉLÉPHONE : " + (window.LinkStatus === "ok" ? "ACTIVE" : "INACTIVE");
  }

  var overlayT;
  function overlay(q, a) {
    $("jvoQ").textContent = q ? "« " + q + " »" : "";
    $("jvoA").textContent = a;
    $("jvOverlay").classList.add("show");
    clearTimeout(overlayT);
    overlayT = setTimeout(function () { $("jvOverlay").classList.remove("show"); }, Math.min(25000, 6000 + a.length * 60));
  }

  var SCREENS = { accueil: "home", meteo: "weather", rer: "rer", agenda: "agenda", photos: "photos", minuteur: "timer", jarvis: "ai", dessin: "draw", undercover: "undercover",
    courses: "courses", enfants: "enfants", quiz: "quiz" };
  // (le diagnostic et les réglages ne sont jamais ouvrables à distance)
  function runTool(call) {
    var a = call.args || {};
    switch (call.name) {
      case "ouvrir_application": return openAppByName(String(a.nom || ""));
      case "lancer_minuteur": return startTimer(Math.max(1, Math.min(180, parseInt(a.minutes, 10) || 5)));
      case "arreter_minuteur": return stopTimer();
      case "afficher_ecran": if (SCREENS[a.ecran]) { if (SCREENS[a.ecran] === "home") goHome(); else show(SCREENS[a.ecran]); } return;
      case "regarder_la_television": return setTimeout(goTV, 3000);
      case "changer_fond_ecran": return rotateBg();
      case "ajouter_rendez_vous": return addRdv(a.titre, a.date, a.heure);
      case "ajouter_course": return window.Maison && window.Maison.addCourse(String(a.article || ""));
      case "retirer_course": return window.Maison && window.Maison.delCourse(String(a.article || ""));
      case "supprimer_rendez_vous": return delRdv(a.titre, a.date);
    }
  }
  function openAppByName(n) {
    var app = appByName(n);
    if (app) return launchApp(app.id, app.nom);
    toast("Application inconnue : " + n);
  }
  function goHome() { screenStack = []; show("home", false); }

  // ---------- Appel Gemini robuste ----------
  // - clés « AIza » (anciennes) et « AQ. » (nouvelles, 2026) : envoyées dans l'en-tête officiel x-goog-api-key,
  //   et si Google refuse (401), nouvel essai avec l'en-tête Authorization: Bearer ;
  // - si le modèle n'existe plus (404), l'appli choisit toute seule un modèle « flash » disponible.
  var GBASE = "https://generativelanguage.googleapis.com/v1beta/";
  var authMode = null; // "key" ou "bearer" une fois trouvé
  function gfetch(path, opts, mode) {
    var h = { "Content-Type": "application/json" };
    if (mode === "bearer") h.Authorization = "Bearer " + cfg.geminiCle; else h["x-goog-api-key"] = cfg.geminiCle;
    return fetch(GBASE + path, { method: opts.method || "GET", headers: h, body: opts.body }).then(function (r) {
      return r.json().then(function (jj) { return { status: r.status, json: jj }; }, function () { return { status: r.status, json: {} }; });
    });
  }
  function gauth(path, opts) {
    var modes = authMode ? [authMode] : ["key", "bearer"];
    function attempt(i) {
      return gfetch(path, opts, modes[i]).then(function (res) {
        if ((res.status === 401 || res.status === 403) && i + 1 < modes.length) return attempt(i + 1);
        if (res.status < 400) authMode = modes[i];
        return res;
      });
    }
    return attempt(0);
  }
  function flashModels(withLite) {
    return gauth("models?pageSize=200", {}).then(function (res) {
      var list = ((res.json && res.json.models) || []).filter(function (m) {
        return (m.supportedGenerationMethods || []).indexOf("generateContent") >= 0 && /flash/.test(m.name) &&
          !/(tts|image|audio|live|embed|transcribe)/.test(m.name) && (withLite || !/lite/.test(m.name));
      }).map(function (m) { return m.name.replace(/^models\//, ""); });
      list.sort(function (a, b) { return b.localeCompare(a, "en", { numeric: true }); }); // le plus récent d'abord
      return list;
    });
  }
  function pickModel() { return flashModels(false).then(function (l) { return l[0] || null; }); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  // Serveur Google saturé (« high demand », 503/429/500) : on réessaie, puis on passe sur un autre modèle flash.
  function isBusy(res) {
    var e = res.json && res.json.error;
    return !!e && (res.status === 429 || res.status === 500 || res.status === 503 ||
      /high demand|overloaded|unavailable|resource.?exhausted|try again/i.test((e.message || "") + " " + (e.status || "")));
  }
  function genWith(model, body) {
    return gauth("models/" + encodeURIComponent(model) + ":generateContent", { method: "POST", body: JSON.stringify(body) });
  }
  function busyFallback(body, firstRes) {
    var tried = [cfg.geminiModele];
    return wait(1500).then(function () { return genWith(cfg.geminiModele, body); }).then(function (res) {
      if (!isBusy(res)) return res;
      return flashModels(true).catch(function () { return []; }).then(function (list) {
        var others = list.filter(function (m) { return tried.indexOf(m) < 0; }).slice(0, 3);
        function next(i, last) {
          if (i >= others.length) return last;
          return genWith(others[i], body).then(function (r) { return isBusy(r) ? next(i + 1, r) : r; }, function () { return next(i + 1, last); });
        }
        return next(0, res);
      });
    }, function () { return firstRes; });
  }
  function gemini(body, retried) {
    return genWith(cfg.geminiModele, body).then(function (res) {
      return isBusy(res) ? busyFallback(body, res) : res;
    }).then(function (res) {
      var e = res.json && res.json.error;
      if (e && isBusy(res)) throw new Error("les serveurs de Google sont saturés en ce moment, redemande-moi dans une minute");
      if (e && !retried && (res.status === 404 || /not found|not supported|deprecated/i.test(e.message || ""))) {
        return pickModel().then(function (m) {
          if (!m || m === cfg.geminiModele) throw new Error(e.message);
          cfg.geminiModele = m;
          try { var s = JSON.parse(localStorage.getItem("matele") || "{}"); s.geminiModele = m; localStorage.setItem("matele", JSON.stringify(s)); } catch (x) {}
          return gemini(body, true);
        });
      }
      if (e) throw new Error(res.status === 401 ? "clé refusée par Google (" + (e.status || 401) + ")" : (e.message || "erreur " + res.status));
      return res.json;
    });
  }

  // ---------- Voix de Yusei sur la télé
  // 1) voix du navigateur de la télé si elle existe ; 2) sinon voix Gemini (même clé), jouée par les haut-parleurs de la télé.
  var audioCtx = null, srcs = [], playEnd = 0, ttsModel = null, speakSeq = 0;
  function voiceOn() { return !/^(non|false|0|off)$/i.test(String(cfg.voixTele)); }
  function stopSpeak() {
    speakSeq++;
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
    srcs.forEach(function (s) { try { s.stop(); } catch (e) {} }); srcs = []; playEnd = 0;
  }
  function frVoice() {
    try { var v = window.speechSynthesis ? speechSynthesis.getVoices() : []; return v.filter(function (x) { return /^fr/i.test(x.lang); })[0] || null; } catch (e) { return null; }
  }
  function ttsModels() {
    if (ttsModel) return Promise.resolve([ttsModel]);
    return gauth("models?pageSize=200", {}).then(function (res) {
      var l = ((res.json && res.json.models) || []).map(function (m) { return m.name.replace(/^models\//, ""); })
        .filter(function (n) { return /tts/.test(n) && /flash/.test(n); });
      l.sort(function (a, b) { return b.localeCompare(a, "en", { numeric: true }); });
      return l.slice(0, 2);
    });
  }
  // Découpe en phrases courtes : la voix Gemini est bien plus fiable sur des morceaux courts
  // (sur un long texte elle peut s'arrêter net ou finir par un grésillement).
  function chunks(text) {
    var parts = String(text).replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]*\s*/g) || [String(text)], out = [], cur = "";
    parts.forEach(function (p) {
      while (p.length > 220) { var k = p.lastIndexOf(",", 200); k = k > 60 ? k + 1 : 200; out.push(p.slice(0, k)); p = p.slice(k); }
      if ((cur + p).length > 200 && cur) { out.push(cur); cur = ""; }
      cur += p;
    });
    if (cur.trim()) out.push(cur);
    return out.map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function playPcm(b64s, mime, seq, text) {
    var Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) throw new Error("pas d'audio");
    if (!audioCtx) audioCtx = new Ctx();
    var rate = parseInt((/rate=(\d+)/.exec(mime || "") || [0, 24000])[1], 10) || 24000;
    var bin = b64s.map(function (b) { return atob(b); }).join("");   // la réponse peut arriver en plusieurs morceaux
    var n = bin.length >> 1;
    // garde-fou : si le son est bien plus long que le texte (grésillement en fin de réponse), on le coupe
    var maxN = Math.round(rate * (2.5 + String(text || "").length / 9));
    if (n > maxN) n = maxN;
    if (n < 10) return;
    var buf = audioCtx.createBuffer(1, n, rate), ch = buf.getChannelData(0);
    for (var i = 0; i < n; i++) { var v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); ch[i] = (v >= 32768 ? v - 65536 : v) / 32768; }
    var f = Math.min(n >> 2, Math.round(rate * 0.02));   // fondu de 20 ms au début et à la fin : plus de « clac »
    for (var j = 0; j < f; j++) { ch[j] *= j / f; ch[n - 1 - j] *= j / f; }
    if (seq !== speakSeq) return;
    try { if (audioCtx.state === "suspended") audioCtx.resume(); } catch (e) {}
    var src = audioCtx.createBufferSource(); src.buffer = buf; src.connect(audioCtx.destination);
    var at = Math.max(audioCtx.currentTime + 0.05, playEnd); src.start(at); playEnd = at + buf.duration + 0.12; srcs.push(src);
  }
  var ttsChain = Promise.resolve();
  // Durée attendue d'une phrase lue calmement en français (~13 caractères par seconde)
  function expectedSec(text) { return String(text).replace(/\s+/g, " ").length / 13; }
  function audioSec(b64s, mime) {
    var rate = parseInt((/rate=(\d+)/.exec(mime || "") || [0, 24000])[1], 10) || 24000, bytes = 0;
    b64s.forEach(function (b) { bytes += Math.floor(b.length * 3 / 4) - (/==$/.test(b) ? 2 : /=$/.test(b) ? 1 : 0); });
    return bytes / 2 / rate;
  }
  // Contrôle AVANT de jouer : si la durée ne colle pas au texte (phrase sautée, ou la voix a « inventé »
  // une autre phrase), on redemande. On n'envoie QUE le texte à lire, sans consigne, pour qu'elle
  // ne puisse lire que lui.
  function audioLooksRight(sec, text) {
    var exp = expectedSec(text);
    return sec >= Math.max(0.35, exp * 0.45) && sec <= exp * 2.1 + 1.2;
  }
  function ttsOne(text, seq, list) {
    var body = JSON.stringify({ contents: [{ role: "user", parts: [{ text: text }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: cfg.voixNom || "Charon" } } } } });
    var tries = 0, best = null;
    function tryM(i, again) {
      if (seq !== speakSeq) return;
      if (i >= list.length) { if (best) playPcm(best.d, best.m, seq, text); return; }   // faute de mieux : le meilleur essai
      tries++;
      return gauth("models/" + encodeURIComponent(list[i]) + ":generateContent", { method: "POST", body: body }).then(function (res) {
        var p = (res.json && res.json.candidates && res.json.candidates[0] && res.json.candidates[0].content && res.json.candidates[0].content.parts) || [];
        var d = p.filter(function (x) { return x.inlineData && x.inlineData.data; });
        if (!d.length) return again ? tryM(i + 1) : tryM(i, true);   // un 2e essai, puis modèle suivant
        var b64 = d.map(function (x) { return x.inlineData.data; }), mime = d[0].inlineData.mimeType, sec = audioSec(b64, mime);
        if (!audioLooksRight(sec, text)) {
          var gap = Math.abs(sec - expectedSec(text));
          if (!best || gap < best.gap) best = { d: b64, m: mime, gap: gap };
          if (tries < 3) return again ? tryM(i + 1) : tryM(i, true);
          if (best) playPcm(best.d, best.m, seq, text);
          return;
        }
        ttsModel = list[i];
        playPcm(b64, mime, seq, text);
      }, function () { return again ? tryM(i + 1) : tryM(i, true); });
    }
    return tryM(0);
  }
  function speak(text, keep) {   // keep = à la suite de ce qui est déjà en train d'être dit
    if (!voiceOn() || !text) return;
    if (!keep) { stopSpeak(); ttsChain = Promise.resolve(); }
    var seq = speakSeq, parts = chunks(String(text).slice(0, 900));
    var v = frVoice();
    if (v) {   // voix de la télé : une phrase à la fois (évite la coupure des longues phrases)
      try { parts.forEach(function (s) { var u = new SpeechSynthesisUtterance(s); u.voice = v; u.lang = v.lang; u.rate = 1; speechSynthesis.speak(u); }); return; } catch (e) {}
    }
    if (!cfg.geminiCle) return;
    ttsChain = ttsChain.then(function () { return ttsModels(); }).then(function (list) {
      var c = Promise.resolve();
      parts.forEach(function (s) { c = c.then(function () { if (seq === speakSeq) return ttsOne(s, seq, list); }); });
      return c;
    }).catch(function () {});
  }
  if (window.speechSynthesis) { try { speechSynthesis.getVoices(); } catch (e) {} }

  // Vérification du texte AVANT de l'afficher ou de le dire : on retire les phrases où l'IA parle
  // d'elle-même ou de la consigne (« je parle distinctement et calmement… ») et les restes de format.
  var META = /(\bje (vais )?(parle|parlerai|lis|lirai|vais lire|m'exprime)\b|\b(d'une|avec une|sur un) (voix|ton|manière|façon) (calme|posée|douce|claire|élégante)|\bdistinctement\b|\b(texte|consigne|instruction)s? (à lire|ci-dessus|ci-dessous|demandée?s?)\b|\bvoici (le|mon) (récapitulatif|texte|briefing)\b|^\s*(PAROLE|ACTU)\s*:)/i;
  function cleanSay(t) {
    t = String(t || "").replace(/[*#_`]/g, "").replace(/\s+/g, " ").trim();
    var parts = t.match(/[^.!?…]+[.!?…]*\s*/g) || [t];
    var kept = parts.filter(function (s) { return !META.test(s); }).join("").trim();
    return kept || t;
  }

  // Point d'entrée unique : depuis la télé ou depuis le téléphone.
  function jarvis(q, fromPhone) {
    q = String(q || "").slice(0, 500).trim();
    if (!q) return Promise.resolve("");
    var onAi = activeScreen().id === "ai";
    addMsg(q, "me", fromPhone ? "📱 Téléphone" : null);
    if (!cfg.geminiCle) {
      var m = "Il me manque ma clé Gemini, " + (cfg.appellation || "Monsieur") + ". Ajoutez-la dans les réglages.";
      addMsg(m, "bot"); if (!onAi) overlay(q, m);
      return Promise.resolve(m);
    }
    stopSpeak();
    var wait = addMsg("…", "bot wait");
    reactor("thinking");
    history.push({ role: "user", parts: [{ text: q }] });
    var nom = cfg.jarvisNom || "YUSEI";
    var sys = "Tu es " + nom + ", l'intelligence artificielle de la maison de " + (cfg.nomFoyer || "la famille") + " à " + cfg.ville +
      ", une intelligence artificielle de maison haut de gamme. Tu t'adresses à l'utilisateur en l'appelant « " + (cfg.appellation || "Monsieur") + " ». " +
      "Ton : posé, efficace, élégant, avec une pointe d'humour pince-sans-rire. Réponds en français, en 2 à 4 phrases courtes (70 mots max), " +
      "sans markdown ni emoji, car ta réponse est lue à voix haute et affichée en grand. " +
      "Quand on te demande une action sur la télé, appelle la fonction correspondante ET confirme en une phrase. " +
      "Applications disponibles : " + (cfg.applis || []).map(function (x) { return x.nom; }).join(", ") + ". " +
      "Pour les recettes, propose uniquement des plats halal. Pour les devoirs des enfants, guide étape par étape sans donner directement la réponse. " +
      "Pour ajouter un rendez-vous ou un rappel, appelle ajouter_rendez_vous (date AAAA-MM-JJ, heure HH:MM). Aujourd'hui = " + isoDay(new Date()) + ". " +
      "Contexte en direct — date : " + new Date().toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) +
      ". Météo : " + (meteoTexte || "inconnue") + ". Transports au Bourget (RER B et tram T11) : " + (rerTexte || "non configuré") + ". Agenda : " + (agendaTexte || "non configuré") + ".";
    return gemini({ systemInstruction: { parts: [{ text: sys }] }, contents: history.slice(-12), tools: TOOLS }).then(function (j) {
      var parts = (j.candidates && j.candidates[0].content && j.candidates[0].content.parts) || [];
      var txt = "", calls = [];
      parts.forEach(function (p) { if (p.text) txt += p.text; if (p.functionCall) calls.push(p.functionCall); });
      txt = cleanSay(txt) || (calls.length ? "C'est fait, " + (cfg.appellation || "Monsieur") + "." : "Je n'ai pas de réponse, " + (cfg.appellation || "Monsieur") + ".");
      history.push({ role: "model", parts: [{ text: txt }] });
      setMsg(wait, txt);
      reactor();
      speak(txt);
      if (activeScreen().id !== "ai") overlay(q, txt);
      calls.forEach(function (c) { try { runTool(c); } catch (e) {} });
      return txt;
    }).catch(function (err) {
      history.pop(); reactor();
      var m = "Je rencontre une difficulté technique : " + err.message;
      setMsg(wait, m);
      if (activeScreen().id !== "ai") overlay(q, m);
      return m;
    });
  }
  function sendAI() {
    var v = $("aiInput").value.trim();
    if (!v) return;
    $("aiInput").value = "";
    jarvis(v, false);
  }
  function askAI(q) { if (activeScreen().id !== "ai") show("ai"); jarvis(q, false); }
  $("aiSend")._onOk = sendAI;
  $("aiClear")._onOk = function () {
    history = [];
    $("chat").innerHTML = "";
    addMsg("Mémoire de conversation effacée, " + (cfg.appellation || "Monsieur") + ".", "bot");
  };

  // ================================================================
  //  MINUTEUR
  // ================================================================
  var timerEnd = 0, timerInt = null, ringInt = null;
  function startTimer(min) {
    stopTimer();
    timerEnd = Date.now() + min * 60000;
    timerInt = setInterval(drawTimer, 250);
    drawTimer();
    toast("Minuteur lancé : " + min + " min");
  }
  function drawTimer() {
    var left = Math.max(0, Math.round((timerEnd - Date.now()) / 1000));
    $("timerFace").textContent = pad(Math.floor(left / 60)) + ":" + pad(left % 60);
    if (left === 0 && timerInt) {
      clearInterval(timerInt); timerInt = null;
      $("timerFace").classList.add("ring");
      if (activeScreen().id !== "timer") show("timer");
      beep(); ringInt = setInterval(beep, 1500);
    }
  }
  function stopTimer() {
    clearInterval(timerInt); clearInterval(ringInt); timerInt = ringInt = null;
    $("timerFace").classList.remove("ring");
    $("timerFace").textContent = "00:00";
  }
  $("timerStop")._onOk = stopTimer;
  var actx = null;
  function beep() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5].forEach(function (t) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(actx.destination);
        g.gain.setValueAtTime(0.3, actx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + t + 0.2);
        o.start(actx.currentTime + t); o.stop(actx.currentTime + t + 0.2);
      });
    } catch (e) {}
  }

  // ================================================================
  //  PHOTOS (fond d'écran + diaporama)
  // ================================================================
  // Fond d'écran : tes photos (dossier photos/) si tu en as mis,
  // sinon de beaux paysages pris au hasard sur Internet (gratuit).
  var photos = [], bgFlip = false, photoIdx = 0, bgIdx = 0;
  function initPhotos() {
    photos = [];
    var perso = null; try { perso = localStorage.getItem("matele_fond_perso"); } catch (e) {}
    if (perso) { photos.push(perso); showBg(perso); return; }   // photo envoyée du téléphone comme fond
    (cfg.photos || []).forEach(function (src) {
      var img = new Image();
      img.onload = function () { photos.push(src); if (photos.length === 1) showBg(src); };   // ta photo s'affiche dès qu'elle est prête
      img.src = src;
    });
  }
  // Fond d'écran : 1) tes photos (dossier photos/) ; sinon 2) un paysage DESSINÉ par l'appli,
  // affiché tout de suite (marche toujours, même sans Internet), puis 3) si possible une photo en ligne.
  var onlineOk = null;   // null = pas encore testé, true/false ensuite
  function showBg(src) {
    var el = bgFlip ? $("bgA") : $("bgB"), other = bgFlip ? $("bgB") : $("bgA");
    el.style.backgroundImage = "url('" + src + "')";
    el.classList.remove("show"); void el.offsetWidth; // relance le zoom doux
    el.classList.add("show"); other.classList.remove("show");
    bgFlip = !bgFlip;
  }
  function drawnBg() { try { return window.Wallpaper ? window.Wallpaper.next() : ""; } catch (e) { return ""; } }
  function tryOnline(cb) {
    if (cfg.fondEnLigne === false || onlineOk === false) return cb(null);
    var src = "https://picsum.photos/1920/1080?random=" + Date.now(), img = new Image(), done = false;
    var t = setTimeout(function () { if (!done) { done = true; onlineOk = false; cb(null); } }, 8000);
    img.onload = function () { if (!done) { done = true; clearTimeout(t); onlineOk = true; cb(src); } };
    img.onerror = function () { if (!done) { done = true; clearTimeout(t); onlineOk = false; cb(null); } };
    img.src = src;
  }
  function rotateBg() {
    if (photos.length) {
      var p = photos[bgIdx++ % photos.length], im = new Image();
      im.onload = function () { showBg(p); };
      im.onerror = function () { var d = drawnBg(); if (d) showBg(d); };
      im.src = p; return;
    }
    if (onlineOk !== true) { var d = drawnBg(); if (d) showBg(d); }   // affichage immédiat
    tryOnline(function (src) { if (src) showBg(src); });
  }
  function drawPhoto() {
    var src = photos.length ? photos[photoIdx] : (onlineOk ? "https://picsum.photos/1920/1080?random=" + Date.now() : drawnBg());
    $("photoFull").style.backgroundImage = "url('" + src + "')";
  }
  $("photoNext")._onOk = function () { if (photos.length) photoIdx = (photoIdx + 1) % photos.length; drawPhoto(); };
  $("photoPrev")._onOk = function () { if (photos.length) photoIdx = (photoIdx - 1 + photos.length) % photos.length; drawPhoto(); };

  // ================================================================
  //  RÉGLAGES
  // ================================================================
  var FIELDS = [
    ["nomFoyer", "Nom affiché"], ["ville", "Ville (météo)"],
    ["theme", "Thème (premium, cartes ou clair)"], ["jarvisNom", "Nom de l'IA"], ["appellation", "Comment l'IA t'appelle"],
    ["latitude", "Latitude"], ["longitude", "Longitude"],
    ["geminiCle", "Clé Gemini (IA)"], ["geminiModele", "Modèle Gemini"],
    ["primCle", "Clé PRIM (transports en commun)"], ["arretRef", "Arrêts (auto, ou identifiants séparés par des virgules)"],
    ["arretNom", "Nom de la gare"], ["agendaIcs", "Lien iCal de l'agenda"],
    ["voixTele", "Voix sur la télé (oui / non)"], ["recapDemarrage", "Récap au démarrage (oui / non)"], ["fbApiKey", "Firebase : apiKey"], ["fbUrl", "Firebase : databaseURL"], ["urlTelecommande", "Adresse de la télécommande"]
  ];
  function buildForm() {
    $("form").innerHTML = FIELDS.map(function (f) {
      return '<label>' + f[1] + '<input type="' + (/Cle$/.test(f[0]) ? "password" : "text") + '" class="focusable" id="f_' + f[0] + '" value="' + esc(String(cfg[f[0]] == null ? "" : cfg[f[0]])) + '"></label>';
    }).join("");
  }
  function formChanged() {
    return FIELDS.some(function (f) { var el = $("f_" + f[0]); return el && el.value.trim() !== String(cfg[f[0]] == null ? "" : cfg[f[0]]); });
  }
  $("saveSettings")._onOk = function () { saveForm(false); };
  function saveForm(leaving) {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem("matele") || "{}"); } catch (e) {}
    // on ne garde que ce qui diffère de l'appli installée : une nouvelle version (nouvelles clés) reste prioritaire
    var base = { fbApiKey: (DEFAULT.firebase || {}).apiKey, fbUrl: (DEFAULT.firebase || {}).databaseURL };
    FIELDS.forEach(function (f) {
      var el = $("f_" + f[0]); if (!el) return;
      var v = el.value.trim(), d = f[0] in base ? base[f[0]] : DEFAULT[f[0]];
      if (v === String(d == null ? "" : d)) delete saved[f[0]]; else saved[f[0]] = v;
    });
    function fv(k) { var el = $("f_" + k); return el ? el.value.trim() : ""; }
    var fbChanged = fv("fbApiKey") !== (cfg.fbApiKey || "") || fv("fbUrl") !== (cfg.fbUrl || "") || fv("urlTelecommande") !== (cfg.urlTelecommande || "");
    try { localStorage.setItem("matele", JSON.stringify(saved)); } catch (e) {}
    if (fbChanged) { toast("Réglages enregistrés ✓ — redémarrage de la liaison…"); setTimeout(function () { location.reload(); }, 1500); return; }
    cfg = load();
    applyTheme();
    refreshAll();
    toast("Réglages enregistrés ✓");
  }

  // ================================================================
  //  OUTILS
  // ================================================================
  function isoDay(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function getJSON(url, headers) {
    return fetch(url, { headers: headers || {} }).then(function (r) {
      if (!r.ok) throw new Error(r.status); return r.json();
    });
  }
  function getText(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); });
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  var toastT;
  function toast(t) {
    $("toast").textContent = t; $("toast").classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { $("toast").classList.remove("show"); }, 2500);
  }

  var onShow = { apps: buildAllApps, settings: buildForm, photos: drawPhoto, rer: loadRer, agenda: loadAgenda, ai: hud };

  function refreshAll() { tick(); loadWeather(); loadRer(); loadAgenda(); buildApps(); }

  // ---------- Interface pour la liaison téléphone (link.js)
  window.MaTele = {
    cfg: function () { return cfg; },
    say: function (t, keep) { speak(t, keep); }, cleanSay: function (t) { return cleanSay(t); },
    stopRefs: function () { return stopRefs(); }, transportStatus: function () { return trState; }, monitor: function (r) { return monitor(r); },
    jarvis: function (q) { activity(); return jarvis(q, true); },
    notify: function (title, text, talk) { activity(); overlay(title, text); if (talk) speak((title ? title + ". " : "") + text); },
    setBg: function (src) { showBg(src); }, refreshPhotos: function () { initPhotos(); },
    rebuild: function (tiles) {   // tiles = reconstruire la rangée (tuiles masquées) en gardant la sélection
      var onHome = activeScreen().id === "home", sel = current && current.classList.contains("mtile") ? current.getAttribute("data-title") : null;
      if (tiles) {
        buildApps();
        if (onHome) { var m = null; Array.prototype.forEach.call(document.querySelectorAll(".mtile"), function (t) { if (t.getAttribute("data-title") === sel) m = t; }); setFocus(m || document.querySelector(".mtile")); }
      }
      if (onHome && current && current.classList.contains("mtile")) window.__hero(current);
    },
    poke: function () { activity(); }, hello: function () { return hello(); },
    botSay: function (t) { addMsg(t, "bot"); speak(t); }, clean: function (t) { return cleanSay(t); },
    key: function (k) {
      var map = { up: "up", down: "down", left: "left", right: "right" };
      if (map[k]) move(map[k]);
      else if (k === "ok") activate(current);
      else if (k === "back") back();
      else if (k === "home") goHome();
    },
    go: function (s) {
      var m = /^quiz:([a-z]{1,20})$/.exec(String(s || ""));
      if (m && window.Quiz) { show("quiz"); return window.Quiz.start(m[1]); }
      if (SCREENS[s]) { if (SCREENS[s] === "home") goHome(); else show(SCREENS[s]); }
    },
    app: openAppByName,
    timer: function (m) { startTimer(Math.max(1, Math.min(180, parseInt(m, 10) || 5))); },
    onShow: onShow, show: show, isTizen: IS_TIZEN, isWeb: WEB, findInstalled: findInstalled, discoverApps: discoverApps,
    installed: function () { return installed; }, appByName: appByName, launch: launchApp, meteoOk: function () { return !!meteoTexte; }, gemini: function (b) { return gemini(b); }, bgState: function () { return { online: onlineOk, photos: photos.length }; }, toast: toast, esc: esc, active: function () { return activeScreen().id; },
    focusFirst: function () { setFocus(focusables()[0]); }, focusEl: setFocus, back: back,
    phone: function (on) { $("phoneInd").textContent = on ? "📱 Téléphone connecté" : ""; if (activeScreen().id === "ai") hud(); }
  };

  // ================================================================
  //  RÉCAP DE DÉMARRAGE : « Bonjour Monsieur », météo, transports, agenda, actualités
  // ================================================================
  var briefText = "", briefTimer = null;
  function briefOn() { return !/^(non|false|0|off)$/i.test(String(cfg.recapDemarrage)); }
  function brRow(id, ico, label, txt) {
    var el = $(id); if (!el) return;
    el.innerHTML = '<span class="br-ico">' + ico + '</span><span class="br-lab">' + esc(label) + '</span><span class="br-val">' + esc(txt) + "</span>";
  }
  function briefTransports() {
    if (!cfg.primCle) return "";
    var parts = String(rerTexte || "").split(" ; "), seen = {}, out = [];
    parts.forEach(function (p) { var k = (/^(RER B|T\d+|Tram)/.exec(p) || [""])[0]; if (p && !seen[k]) { seen[k] = 1; out.push(p); } });
    return out.slice(0, 2).join(" · ");
  }
  function briefAgenda() {
    if (agendaToday.length) return agendaToday.slice(0, 3).map(function (e) { return (e.start.allDay ? "" : hm(e.start.d) + " ") + (e.title || ""); }).join(" · ");
    return agendaState === "off" ? "Votre agenda est vide. Voulez-vous le compléter ?" : "Rien de prévu aujourd'hui.";
  }
  function isEvening() { var h = new Date().getHours(); return h >= 18 || h < 4; }
  function hello() { return (isEvening() ? "Bonsoir " : "Bonjour ") + (cfg.appellation || "Monsieur"); }
  function briefMeteo() { return isEvening() && demainTexte ? "Demain : " + demainTexte : meteoTexte; }
  function briefExtras() {
    var out = [];
    if (window.Maison) { var n = window.Maison.notesText(); if (n) out.push(n); var c = window.Maison.countdownText(); if (c) out.push(c); }
    if (pluieTexte) out.push(pluieTexte + ".");
    if (perturbTexte) out.push("Info trafic : " + perturbTexte.split(" | ")[0] + ".");
    return out;
  }
  function briefLocal() {
    var s = hello() + ". ";
    if (briefMeteo()) s += (isEvening() ? "Pour demain au " : "Météo au ") + (cfg.ville || "") + " : " + (isEvening() && demainTexte ? demainTexte : meteoTexte) + ". ";
    var t = briefTransports(); if (t && !isEvening()) s += "Transports : " + t + ". ";
    s += agendaToday.length ? (isEvening() ? "Demain : " : "Aujourd'hui : ") + briefAgenda() + ". " : briefAgenda() + " ";
    briefExtras().forEach(function (x) { s += x + " "; });
    return s.replace(/\.\./g, ".") + (isEvening() ? "Bonne soirée, je vous laisse accéder au menu." : "Je vous laisse accéder au menu.");
  }
  function startBrief() {
    if (!briefOn()) return;
    var ap = cfg.appellation || "Monsieur";
    show("brief", false);
    $("brHello").textContent = hello();
    $("brText").textContent = "Je prépare votre récapitulatif…";
    ["brMeteo", "brTrans", "brAgendaRow", "brNews", "brNotes"].forEach(function (id) { $(id).innerHTML = ""; });
    reactor("thinking");
    speak(hello() + ".");
    var t0 = Date.now();
    (function wait() {   // on attend météo, transports et agenda (8 s maximum)
      var ready = meteoTexte && (!cfg.primCle || rerTried) && agendaState;
      if (!ready && Date.now() - t0 < 8000) { setTimeout(wait, 300); return; }
      brRow("brMeteo", ICON.weather, isEvening() ? "Demain" : "Météo", (briefMeteo() || "Indisponible pour le moment") + (pluieTexte ? " · " + pluieTexte : ""));
      if (cfg.primCle) brRow("brTrans", perturbTexte ? ICON.alert : ICON.train, "Transports", perturbTexte ? "Info trafic : " + perturbTexte.split(" | ")[0].slice(0, 120) : (briefTransports() || "Horaires indisponibles"));
      var ex = window.Maison ? [window.Maison.notesText(), window.Maison.countdownText()].filter(Boolean).join(" · ") : "";
      if (ex) brRow("brNotes", ICON.note, "Maison", ex);
      brRow("brAgendaRow", ICON.cal(new Date().getDate()), "Agenda", briefAgenda());
      $("brAgenda").textContent = agendaToday.length ? "Voir l'agenda" : "Compléter l'agenda";
      brRow("brNews", ICON.spark, "Actualités", cfg.geminiCle ? "Je regarde les titres du jour…" : "Ajoute ta clé Gemini pour les actualités");
      if (!cfg.geminiCle) return finish(briefLocal(), "");
      var data = (isEvening() ? "C'est le soir : parle de DEMAIN. Météo de demain : " + (demainTexte || "inconnue") : "Météo : " + (meteoTexte || "inconnue")) +
        (pluieTexte ? ". Alerte : " + pluieTexte : "") +
        ". Transports : " + (isEvening() ? "ne pas en parler" : (briefTransports() || "non disponibles")) + (perturbTexte ? ". Info trafic : " + perturbTexte.split(" | ")[0] : "") +
        ". Agenda " + (isEvening() ? "de demain" : "du jour") + " : " + (agendaToday.length ? briefAgenda() : (agendaState === "off" ? "vide, propose de le compléter" : "rien")) +
        (briefExtras().length ? ". À dire aussi : " + briefExtras().join(" ") : "") + ".";
      var prompt = "Fais le récapitulatif de démarrage de la télé, lu à voix haute. Réponds EXACTEMENT sur deux lignes :\n" +
        "PAROLE: le texte à dire (100 mots max, sans markdown ni emoji), qui commence par « " + hello() + ". », résume la météo, les transports, " +
        "l'agenda (s'il est vide, demande si je veux le compléter), puis donne 2 titres d'actualité importants du jour en France, très brièvement, " +
        "et termine par « Je vous laisse accéder au menu. »\nACTU: les 2 titres d'actualité, séparés par « | »\n" +
        "Données en direct (" + new Date().toLocaleString("fr-FR") + ") : " + data;
      var body = { contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }] };
      var done = false, to = setTimeout(function () { if (!done) { done = true; finish(briefLocal(), ""); } }, 20000);
      function ask(b) { return gemini(b).then(function (j) { return ((j.candidates && j.candidates[0].content && j.candidates[0].content.parts) || []).map(function (p) { return p.text || ""; }).join(""); }); }
      ask(body).then(null, function () { var b2 = { contents: body.contents }; return ask(b2); })   // recherche web indisponible → sans actualités
        .then(function (txt) {
          if (done) return; done = true; clearTimeout(to);
          var said = (/PAROLE\s*:\s*([\s\S]*?)(?:\n\s*ACTU\s*:|$)/i.exec(txt) || [])[1] || "", news = (/ACTU\s*:\s*([^\n]+)/i.exec(txt) || [])[1] || "";
          said = cleanSay(said);
          if (said.toLowerCase().indexOf(hello().toLowerCase()) !== 0 || said.length > 900) said = "";   // récap non conforme → celui de l'appli
          finish(said || briefLocal(), news.replace(/[*#_`]/g, "").trim());
        }, function () { if (!done) { done = true; clearTimeout(to); finish(briefLocal(), ""); } });
    })();
    function finish(text, news) {
      if (activeScreen().id !== "brief") return;   // déjà parti vers le menu
      reactor();
      briefText = text;
      $("brText").textContent = "";   // le texte est dit à voix haute ; l'écran garde le résumé par rubrique
      brRow("brNews", ICON.spark, "Actualités", news ? news.split("|").map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 2).join(" · ") : "Pas d'actualités pour le moment");
      speak(text.replace(/^(Bonjour|Bonsoir) [^.]*\.\s*/, ""), true);   // le « Bonjour » a déjà été dit
      clearTimeout(briefTimer);
      briefTimer = setTimeout(function () { if (activeScreen().id === "brief") goHome(); }, 3 * 60000);  // personne ? menu au bout de 3 min
    }
  }
  $("brGo")._onOk = function () { stopSpeak(); clearTimeout(briefTimer); goHome(); };
  $("brAgain")._onOk = function () { if (briefText) speak(briefText); };
  $("brAgenda")._onOk = function () {
    stopSpeak(); clearTimeout(briefTimer); screenStack = [];
    if (agendaToday.length) return show("agenda");
    show("ai");
    var m = "Quel rendez-vous dois-je ajouter, " + (cfg.appellation || "Monsieur") + " ? Dites par exemple : « dentiste jeudi à 15 h » (micro du téléphone ou clavier).";
    addMsg(m, "bot"); speak(m);
    setFocus($("aiInput"));
  };

  // ---------- Démarrage
  function applyTheme() {
    document.body.classList.toggle("theme-cartes", cfg.theme === "cartes");
    document.body.classList.toggle("theme-premium", cfg.theme === "premium");
  }
  applyTheme();
  buildChips();
  refreshAll();
  initPhotos();
  setFocus(document.querySelector(".mtile"));
  setInterval(tick, 10000);
  setInterval(loadRer, 90000);           // transports : toutes les 90 s
  setInterval(loadWeather, 15 * 60000);  // météo : tous les 1/4 d'heure
  setInterval(loadAgenda, 30 * 60000);   // agenda : toutes les 30 min
  discoverApps();
  rotateBg();
  setInterval(rotateBg, 5 * 60000);
  startBrief();   // « Bonjour Monsieur » + récap avant le menu
  // Écran de veille (10 min sans rien toucher sur l'accueil) et mode nuit (22 h – 7 h : plus doux pour les yeux)
  var lastAct = Date.now();
  function activity() { lastAct = Date.now(); if (document.body.classList.contains("saver")) { document.body.classList.remove("saver"); return true; } return false; }
  document.addEventListener("keydown", function (e) { if (activity()) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  setInterval(function () {
    var h = new Date().getHours();
    document.body.classList.toggle("night", h >= 22 || h < 7);
    var idle = Date.now() - lastAct > (parseFloat(cfg.veilleMinutes) || 10) * 60000;
    if (idle && !/^(non|0)$/i.test(String(cfg.veilleMinutes)) && activeScreen().id === "home" && !document.body.classList.contains("saver")) {
      $("svClock").textContent = $("clock").textContent; $("svDate").textContent = $("date").textContent;
      $("svInfo").textContent = [$("wTemp").textContent, (window.Maison && window.Maison.countdownText()) || ""].filter(Boolean).join(" · ");
      document.body.classList.add("saver");
    }
    if (document.body.classList.contains("saver")) { $("svClock").textContent = $("clock").textContent; }
  }, 15000);
  setInterval(function () { if (current && current.classList.contains("mtile")) window.__hero(current); }, 3000);      // fond d'écran : toutes les 5 minutes
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refreshAll(); });
})();
