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
    } else if (el.scrollIntoView) el.scrollIntoView({ block: "nearest", inline: "nearest" });
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
    document.body.classList.toggle("dim", id !== "home");
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
    if (screenStack.length) {
      var id = screenStack.pop();
      show(id, false);
      return;
    }
    goTV(); // Retour sur l'accueil = revenir à la télé
  }

  function activate(el) {
    if (!el) return;
    if (el.tagName === "INPUT") { el.focus(); return; }
    if (el.dataset.go) return show(el.dataset.go);
    if (el.classList.contains("back")) return back();
    if (el.dataset.app) return launchApp(el.dataset.app, el.dataset.name);
    if (el.dataset.action === "tv") return goTV();
    if (el.dataset.min) return startTimer(+el.dataset.min);
    if (el.dataset.prompt) return askAI(el.dataset.prompt);
    if (el._onOk) return el._onOk();
  }

  document.addEventListener("keydown", function (e) {
    var typing = document.activeElement && document.activeElement.tagName === "INPUT";
    switch (e.keyCode) {
      case KEY.LEFT: if (!typing) { move("left"); e.preventDefault(); } break;
      case KEY.RIGHT: if (!typing) { move("right"); e.preventDefault(); } break;
      case KEY.UP: if (typing) document.activeElement.blur(); move("up"); e.preventDefault(); break;
      case KEY.DOWN: if (typing) document.activeElement.blur(); move("down"); e.preventDefault(); break;
      case KEY.ENTER:
        if (typing) {
          var inp = document.activeElement; inp.blur();
          if (inp.id === "aiInput") sendAI();
        } else activate(current);
        e.preventDefault(); break;
      case KEY.BACK: case KEY.ESC: back(); e.preventDefault(); break;
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
  var meteoTexte = "";
  function wmo(c) { return WMO[c] || ["🌡", "—"]; }

  function loadWeather() {
    $("wCity").textContent = $("wCity2").textContent = cfg.ville;
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + cfg.latitude + "&longitude=" + cfg.longitude +
      "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FParis";
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
    }).catch(function () { $("wDesc").textContent = "Météo indisponible"; });
  }

  // ================================================================
  //  RER B — API PRIM Île-de-France Mobilités
  // ================================================================
  function loadRer() {
    $("rerName").textContent = $("rerName2").textContent = cfg.arretNom || "";
    if (!cfg.primCle || !cfg.arretRef) {
      var msg = '<li class="muted">À configurer dans Réglages (clé PRIM gratuite)</li>';
      $("rerList").innerHTML = $("rerBig").innerHTML = msg;
      return;
    }
    var url = "https://prim.iledefrance-mobilites.fr/marketplace/stop-monitoring?MonitoringRef=" + encodeURIComponent(cfg.arretRef);
    getJSON(url, { apikey: cfg.primCle }).then(function (j) {
      var visits = j.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit || [];
      var rerB = visits.filter(function (v) { return JSON.stringify(v.MonitoredVehicleJourney.LineRef || "").indexOf("C01743") >= 0; });
      if (rerB.length) visits = rerB;
      var now = Date.now();
      var deps = visits.map(function (v) {
        var mvj = v.MonitoredVehicleJourney, call = mvj.MonitoredCall || {};
        var t = call.ExpectedDepartureTime || call.ExpectedArrivalTime || call.AimedDepartureTime;
        var dest = (mvj.DestinationName && mvj.DestinationName[0] && mvj.DestinationName[0].value) ||
          (call.DestinationDisplay && call.DestinationDisplay[0] && call.DestinationDisplay[0].value) || "—";
        return { t: new Date(t), dest: dest };
      }).filter(function (d) { return d.t.getTime() > now - 60000; })
        .sort(function (a, b) { return a.t - b.t; });
      if (!deps.length) { $("rerList").innerHTML = $("rerBig").innerHTML = '<li class="muted">Aucun départ annoncé</li>'; return; }
      function line(d) {
        var min = Math.max(0, Math.round((d.t - now) / 60000));
        return '<li><span class="when">' + (min === 0 ? "À quai" : min + " min") + '</span><span class="what">' + esc(d.dest) + " · " + hm(d.t) + "</span></li>";
      }
      rerTexte = deps.slice(0, 4).map(function (d) { return "dans " + Math.max(0, Math.round((d.t - now) / 60000)) + " min vers " + d.dest; }).join(" ; ");
      $("rerList").innerHTML = deps.slice(0, 3).map(line).join("");
      $("rerBig").innerHTML = deps.slice(0, 10).map(line).join("");
    }).catch(function () { $("rerList").innerHTML = $("rerBig").innerHTML = '<li class="muted">Horaires indisponibles</li>'; });
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
  function loadAgenda() {
    if (!cfg.agendaIcs) {
      $("agendaList").innerHTML = $("agendaBig").innerHTML = '<li class="muted">À configurer dans Réglages (lien iCal)</li>';
      return;
    }
    getText(cfg.agendaIcs).then(function (txt) {
      var lines = txt.replace(/\r\n[ \t]/g, "").split(/\r?\n/), evs = [], ev = null;
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
      if (!evs.length) { $("agendaList").innerHTML = $("agendaBig").innerHTML = '<li class="muted">Rien de prévu cette semaine</li>'; return; }
      function line(e) {
        var d = e.start.d, isToday = d.toDateString() === new Date().toDateString();
        var day = isToday ? "Auj." : d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
        return '<li><span class="when">' + day + (e.start.allDay ? "" : " " + hm(d)) + '</span><span class="what">' + esc(e.title || "(sans titre)") + "</span></li>";
      }
      agendaTexte = evs.slice(0, 6).map(function (e) { return e.start.d.toLocaleString("fr-FR", { weekday: "long", hour: "2-digit", minute: "2-digit" }) + " : " + (e.title || ""); }).join(" ; ");
      $("agendaList").innerHTML = evs.slice(0, 3).map(line).join("");
      $("agendaBig").innerHTML = evs.slice(0, 10).map(line).join("");
    }).catch(function () { $("agendaList").innerHTML = $("agendaBig").innerHTML = '<li class="muted">Agenda indisponible</li>'; });
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
    sliders: svg('<path d="M4 7h9.5M18.5 7H20M4 17h4M12.5 17H20"/><circle cx="16" cy="7" r="2.3"/><circle cx="10" cy="17" r="2.3"/>'),
    cal: function (d) {
      return svg('<rect x="3.5" y="5" width="17" height="15.5" rx="3.2"/><path d="M3.5 9.8h17M8 3v4M16 3v4"/>' +
        '<text x="12" y="17.6" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor" stroke="none" font-family="Inter,Arial,sans-serif">' + d + "</text>");
    }
  };

  function buildApps() {
    // Une tuile = nom, icône, description, couleurs. Chaque thème l'affiche à sa façon.
    var premium = cfg.theme === "premium";
    function t(attrs, ico, label, cls, effet, elem, rare, c1, c2) {
      return '<div class="mtile focusable ' + (cls || "") + '" data-el="' + elem + '" data-title="' + label + '" data-sub="' + effet + '"' +
        (c1 ? ' style="--c:' + c1 + ";--c2:" + (c2 || c1) + '"' : "") + " " + attrs + '>' +
        '<div class="c-top"><span class="c-name">' + label + '</span><span class="c-rare">' + rare + '</span></div>' +
        '<div class="c-art">' + ico + '</div>' +
        '<div class="c-desc">' + effet + '</div><span class="c-holo"></span></div>';
    }
    var nom = esc(cfg.jarvisNom || "Yusei");
    var html = t('data-go="ai"', ICON.spark, nom, "star", "Votre assistant : il répond à tout et pilote la maison.", "legend", "★★★★★");
    if (premium) {
      html += t('data-go="weather"', ICON.weather, "Météo", "", "Prévisions sur 7 jours au " + esc(cfg.ville) + ".", "azur", "", "#4facfe", "#2b5fd9");
      html += t('data-go="rer"', ICON.train, "RER B", "", "Prochains départs en temps réel.", "azur", "", "#3a8dde", "#1d3f8f");
      html += t('data-go="agenda"', ICON.cal(new Date().getDate()), "Agenda", "", "Les rendez-vous de la semaine.", "azur", "", "#ff8a5c", "#d9433b");
    }
    if (!WEB) html += t('data-action="tv"', ICON.tv, "Télévision", "", "Retour aux chaînes.", "azur", "★★", "#6b7a90", "#2c3445");
    (cfg.applis || []).forEach(function (a) {
      if (WEB && !a.web) return;   // navigateur : seules les applis avec une version web (YouTube)
      if (a.siInstallee && !(IS_TIZEN && findInstalled(a))) return;   // tuile seulement si l'appli est sur la télé
      html += t('data-app="' + esc((a.ids || [])[0] || a.id || a.nom) + '" data-name="' + esc(a.nom) + '"',
        '<span class="m-app">' + esc(a.nom) + "</span>", esc(a.nom), "",
        "Ouvre " + esc(a.nom) + ".", "ecarlate", "★★★", esc(a.couleur), "#141414");
    });
    if (!WEB) html += t('data-go="apps"', ICON.grid, "Toutes mes applis", "", "Toutes les applications installées sur la télé.", "gris", "★★", "#64748b", "#1e293b");
    html += t('data-go="draw"', ICON.pen, "Tableau", "", "Dessine en direct depuis ton téléphone.", "emeraude", "★★", "#2dd4bf", "#0f766e");
    html += t('data-go="undercover"', ICON.spy, "Undercover", "", "Le jeu d'ambiance : trouve l'infiltré parmi tes invités.", "ecarlate", "★★★★", "#a78bfa", "#5b21b6");
    html += t('data-go="timer"', ICON.timer, "Minuteur", "", "Compte le temps.", "emeraude", "★★", "#34d399", "#047857");
    html += t('data-go="photos"', ICON.photo, "Photos", "", "Souvenirs de famille.", "emeraude", "★★", "#f472b6", "#be185d");
    html += t('data-go="settings"', ICON.sliders, "Réglages", "", "Configure la maison.", "gris", "★", "#9ca3af", "#4b5563");
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
    $("heroChips").innerHTML = chips.map(function (c) { return '<span class="chipx">' + c[0] + esc(c[1]) + "</span>"; }).join("");
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
      parameters: { type: "object", properties: { ecran: { type: "string", enum: ["accueil", "meteo", "rer", "agenda", "photos", "minuteur", "jarvis", "dessin", "undercover"] } }, required: ["ecran"] } },
    { name: "regarder_la_television", description: "Ferme l'interface et revient aux chaînes de télévision.", parameters: { type: "object", properties: {} } },
    { name: "changer_fond_ecran", description: "Change l'image de fond d'écran.", parameters: { type: "object", properties: {} } }
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

  var SCREENS = { accueil: "home", meteo: "weather", rer: "rer", agenda: "agenda", photos: "photos", minuteur: "timer", jarvis: "ai", dessin: "draw", undercover: "undercover" };
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
  function pickModel() {
    return gauth("models?pageSize=200", {}).then(function (res) {
      var list = ((res.json && res.json.models) || []).filter(function (m) {
        return (m.supportedGenerationMethods || []).indexOf("generateContent") >= 0 && /flash/.test(m.name) && !/(tts|image|audio|live|embed|transcribe|lite)/.test(m.name);
      }).map(function (m) { return m.name.replace(/^models\//, ""); });
      list.sort(function (a, b) { return b.localeCompare(a, "en", { numeric: true }); }); // le plus récent d'abord
      return list[0] || null;
    });
  }
  function gemini(body, retried) {
    return gauth("models/" + encodeURIComponent(cfg.geminiModele) + ":generateContent", { method: "POST", body: JSON.stringify(body) }).then(function (res) {
      var e = res.json && res.json.error;
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
      "Contexte en direct — date : " + new Date().toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) +
      ". Météo : " + (meteoTexte || "inconnue") + ". RER B : " + (rerTexte || "non configuré") + ". Agenda : " + (agendaTexte || "non configuré") + ".";
    return gemini({ systemInstruction: { parts: [{ text: sys }] }, contents: history.slice(-12), tools: TOOLS }).then(function (j) {
      var parts = (j.candidates && j.candidates[0].content && j.candidates[0].content.parts) || [];
      var txt = "", calls = [];
      parts.forEach(function (p) { if (p.text) txt += p.text; if (p.functionCall) calls.push(p.functionCall); });
      txt = txt.replace(/[*#_`]/g, "").trim() || (calls.length ? "C'est fait, " + (cfg.appellation || "Monsieur") + "." : "Je n'ai pas de réponse, " + (cfg.appellation || "Monsieur") + ".");
      history.push({ role: "model", parts: [{ text: txt }] });
      setMsg(wait, txt);
      reactor();
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
    (cfg.photos || []).forEach(function (src) {
      var img = new Image();
      img.onload = function () { photos.push(src); };
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
    ["primCle", "Clé PRIM (RER)"], ["arretRef", "Identifiant d'arrêt (MonitoringRef)"],
    ["arretNom", "Nom de la gare"], ["agendaIcs", "Lien iCal de l'agenda"],
    ["fbApiKey", "Firebase : apiKey"], ["fbUrl", "Firebase : databaseURL"], ["urlTelecommande", "Adresse de la télécommande"]
  ];
  function buildForm() {
    $("form").innerHTML = FIELDS.map(function (f) {
      return '<label>' + f[1] + '<input type="' + (/Cle$/.test(f[0]) ? "password" : "text") + '" class="focusable" id="f_' + f[0] + '" value="' + esc(String(cfg[f[0]] == null ? "" : cfg[f[0]])) + '"></label>';
    }).join("");
  }
  $("saveSettings")._onOk = function () {
    var saved = {};
    FIELDS.forEach(function (f) { saved[f[0]] = $("f_" + f[0]).value.trim(); });
    var fbChanged = saved.fbApiKey !== cfg.fbApiKey || saved.fbUrl !== cfg.fbUrl || saved.urlTelecommande !== (cfg.urlTelecommande || "");
    try { localStorage.setItem("matele", JSON.stringify(saved)); } catch (e) {}
    if (fbChanged) { toast("Réglages enregistrés ✓ — redémarrage de la liaison…"); setTimeout(function () { location.reload(); }, 1500); return; }
    cfg = load();
    applyTheme();
    refreshAll();
    toast("Réglages enregistrés ✓");
  };

  // ================================================================
  //  OUTILS
  // ================================================================
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
    jarvis: function (q) { return jarvis(q, true); },
    key: function (k) {
      var map = { up: "up", down: "down", left: "left", right: "right" };
      if (map[k]) move(map[k]);
      else if (k === "ok") activate(current);
      else if (k === "back") back();
      else if (k === "home") goHome();
    },
    go: function (s) { if (SCREENS[s]) { if (SCREENS[s] === "home") goHome(); else show(SCREENS[s]); } },
    app: openAppByName,
    timer: function (m) { startTimer(Math.max(1, Math.min(180, parseInt(m, 10) || 5))); },
    onShow: onShow, show: show, isTizen: IS_TIZEN, isWeb: WEB, findInstalled: findInstalled, discoverApps: discoverApps,
    installed: function () { return installed; }, appByName: appByName, launch: launchApp, meteoOk: function () { return !!meteoTexte; }, gemini: function (b) { return gemini(b); }, bgState: function () { return { online: onlineOk, photos: photos.length }; }, toast: toast, esc: esc, active: function () { return activeScreen().id; },
    focusFirst: function () { setFocus(focusables()[0]); }, focusEl: setFocus, back: back,
    phone: function (on) { $("phoneInd").textContent = on ? "📱 Téléphone connecté" : ""; if (activeScreen().id === "ai") hud(); }
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
  setInterval(loadRer, 60000);           // RER : chaque minute
  setInterval(loadWeather, 15 * 60000);  // météo : tous les 1/4 d'heure
  setInterval(loadAgenda, 30 * 60000);   // agenda : toutes les 30 min
  discoverApps();
  rotateBg();
  setInterval(rotateBg, 5 * 60000);
  setInterval(function () { if (current && current.classList.contains("mtile")) window.__hero(current); }, 3000);      // fond d'écran : toutes les 5 minutes
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refreshAll(); });
})();
