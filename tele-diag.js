/* ================================================================
   DIAGNOSTIC — vérifie en un clic, SUR LA VRAIE TÉLÉ, que tout marche :
   installation, mise en place (clés), mise en marche (réseau, liaison)
   et applis (YouTube…). Réglages › Diagnostic.
   ================================================================ */
(function () {
  "use strict";
  var T = window.MaTele, $ = function (id) { return document.getElementById(id); }, esc = T.esc;
  var running = false;

  function row(id, label) {
    return '<div class="dg-row" id="dg_' + id + '"><span class="dg-ico">…</span><span class="dg-lab">' + esc(label) +
      '</span><span class="dg-msg">en cours</span></div>';
  }
  function set(id, st, msg) {
    var el = $("dg_" + id); if (!el) return;
    el.className = "dg-row " + st;
    el.querySelector(".dg-ico").textContent = st === "ok" ? "✓" : st === "warn" ? "!" : st === "ko" ? "✕" : "–";
    el.querySelector(".dg-msg").textContent = msg;
  }
  function timeout(p, ms) {
    return new Promise(function (res, rej) { var t = setTimeout(function () { rej(new Error("délai dépassé")); }, ms); p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); }); });
  }

  var TESTS = [
    ["mode", "1. Installation : mode de fonctionnement"],
    ["keys", "1. Installation : touches de la télécommande"],
    ["launch", "1. Installation : droit de lancer d'autres applis"],
    ["store", "2. Mise en place : mémoire des réglages"],
    ["gemini", "2. Mise en place : clé Gemini (Yusei)"],
    ["prim", "2. Mise en place : transports en commun (PRIM)"],
    ["ical", "2. Mise en place : agenda"],
    ["fb", "2. Mise en place : liaison avec le téléphone"],
    ["net", "3. Mise en marche : Internet (météo)"],
    ["bg", "3. Mise en marche : fond d'écran"],
    ["perf", "3. Mise en marche : fluidité de l'animation"],
    ["yt", "4. Applis : YouTube"],
    ["nf", "4. Applis : Netflix"],
    ["pv", "4. Applis : Prime Video"]
  ];

  function run() {
    if (running) return; running = true;
    var cfg = T.cfg(), ok = 0, warn = 0, ko = 0;
    $("dgList").innerHTML = TESTS.map(function (t) { return row(t[0], t[1]); }).join("");
    $("dgSum").textContent = "Tests en cours…";
    function S(id, st, msg) { set(id, st, msg); if (st === "ok") ok++; else if (st === "warn") warn++; else if (st === "ko") ko++; }
    var jobs = [];

    // ---- 1. Installation
    if (T.isTizen) S("mode", "ok", "Appli installée sur la télé (méthode B)");
    else if (T.isWeb) S("mode", "ok", "Navigateur de la télé (méthode A) — Netflix/Prime via le bouton Accueil");
    else S("mode", "warn", "Ouvert sur un ordinateur (aperçu)");
    if (T.isTizen) {
      try { var k = tizen.tvinputdevice.getKey("ColorF0Red"); S("keys", k ? "ok" : "warn", k ? "Flèches, OK, Retour et touches couleur actives" : "Touches couleur indisponibles"); }
      catch (e) { S("keys", "warn", "Touches couleur indisponibles (flèches et OK fonctionnent)"); }
      S("launch", typeof tizen.application.launch === "function" ? "ok" : "ko", typeof tizen.application.launch === "function" ? "Autorisé" : "Non autorisé : réinstalle l'appli");
    } else {
      S("keys", "ok", "Flèches + OK (ou pointeur) du navigateur");
      S("launch", T.isWeb ? "warn" : "skip", T.isWeb ? "Impossible depuis un navigateur : YouTube s'ouvre en version web" : "Non testable ici");
    }

    // ---- 2. Mise en place
    try { localStorage.setItem("__dg", "1"); var r = localStorage.getItem("__dg"); localStorage.removeItem("__dg"); S("store", r === "1" ? "ok" : "ko", r === "1" ? "Les réglages sont bien gardés" : "Les réglages ne seront pas gardés"); }
    catch (e) { S("store", "ko", "Mémoire indisponible : les réglages seront perdus au redémarrage"); }

    if (!cfg.geminiCle) S("gemini", "warn", "Pas de clé : Yusei ne répondra pas (Réglages)");
    else jobs.push(timeout(T.gemini({ contents: [{ role: "user", parts: [{ text: "Réponds juste : OK" }] }] }), 20000).then(function () {
      S("gemini", "ok", "Yusei répond (modèle " + T.cfg().geminiModele + ")");
    }, function (e) { S("gemini", "ko", String(e.message || "Pas de réponse").slice(0, 110)); }));

    if (!cfg.primCle) S("prim", "warn", "Non configuré (facultatif)");
    else jobs.push(timeout(T.stopRefs(), 30000).then(function (refs) {
      if (!refs.length) { S("prim", "ko", (T.transportStatus().msg || "Arrêts introuvables : vérifie la clé PRIM et le nom de la gare").slice(0, 160)); return; }
      return timeout(T.monitor(refs[0]), 15000).then(function () { S("prim", "ok", "Horaires reçus (" + refs.length + " arrêt" + (refs.length > 1 ? "s : RER + tram" : "") + ")"); });
    }).catch(function (e) { S("prim", "ko", /40[13]/.test(e.message) ? "Clé refusée" : "Injoignable (" + e.message + ")"); }));

    if (!cfg.agendaIcs) S("ical", "warn", "Non configuré (facultatif)");
    else jobs.push(timeout(fetch(cfg.agendaIcs), 15000).then(function (r) { return r.text().then(function (t) {
      S("ical", r.ok && /BEGIN:VCALENDAR/.test(t) ? "ok" : "ko", r.ok && /BEGIN:VCALENDAR/.test(t) ? "Agenda lu" : "Lien invalide (prends l'adresse secrète iCal)"); }); },
      function (e) { S("ical", "ko", "Injoignable (" + e.message + ")"); }));

    if (!cfg.fbApiKey || !cfg.fbUrl) S("fb", "warn", "Non configuré : renseigne Firebase dans Réglages");
    else if (window.LinkStatus === "ok") S("fb", "ok", "Téléphone connecté");
    else if (window.LinkStatus === "wait") S("fb", "ok", "Prête : scanne le QR code (Connecter mon téléphone)");
    else S("fb", "ko", "Connexion impossible : vérifie apiKey / databaseURL et l'authentification Anonyme");

    // ---- 3. Mise en marche
    jobs.push(timeout(fetch("https://api.open-meteo.com/v1/forecast?latitude=" + cfg.latitude + "&longitude=" + cfg.longitude + "&current=temperature_2m"), 12000)
      .then(function (r) { S("net", r.ok ? "ok" : "ko", r.ok ? "Connecté" : "Erreur " + r.status); }, function () { S("net", "ko", "Pas d'Internet sur la télé"); }));
    jobs.push(new Promise(function (res) {
      var img = new Image(), done = false;
      var t = setTimeout(function () { if (!done) { done = true; S("bg", "ok", "Paysages dessinés par l'appli (photos en ligne trop lentes)"); res(); } }, 12000);
      img.onload = function () { if (!done) { done = true; clearTimeout(t); S("bg", "ok", cfg.photos && cfg.photos.length ? "Ton fond d'écran personnel est chargé" : "Photos en ligne chargées"); res(); } };
      img.onerror = function () { if (!done) { done = true; clearTimeout(t); S("bg", "ok", "Paysages dessinés par l'appli (photos en ligne indisponibles)"); res(); } };
      img.src = (cfg.photos && cfg.photos[0]) || "https://picsum.photos/320/180?random=" + Date.now();
    }));
    jobs.push(new Promise(function (res) {
      var n = 0, t0 = performance.now();
      (function f() { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else {
        var fps = Math.round(n * 1000 / (performance.now() - t0));
        S("perf", fps >= 40 ? "ok" : fps >= 20 ? "warn" : "ko", fps + " images/s" + (fps < 40 ? " : passe au thème « clair », plus léger" : ""));
        res(); } })();
    }));

    // ---- 4. Applis
    jobs.push(new Promise(function (res) { T.discoverApps(res); }).then(function () {
      [["yt", "YouTube"], ["nf", "Netflix"], ["pv", "Prime Video"]].forEach(function (p) {
        var a = T.appByName(p[1]);
        if (!a) { S(p[0], "skip", "Pas de tuile pour cette appli"); return; }
        if (T.isTizen) {
          var f = T.findInstalled(a);
          S(p[0], f ? "ok" : "warn", f ? "Installée — se lance depuis la tuile (" + f.id + ")" : "Pas installée : installe-la depuis Apps, puis relance le test");
        } else if (T.isWeb) {
          S(p[0], a.web ? "ok" : "warn", a.web ? "Version web : s'ouvre dans le navigateur (Retour pour revenir)" : "Via le bouton Accueil de la télécommande");
        } else S(p[0], "skip", "Testable sur la télé");
      });
    }));

    Promise.all(jobs.map(function (p) { return p.catch(function () {}); })).then(function () {
      running = false;
      $("dgSum").textContent = ko ? ko + " problème(s) à corriger, " + warn + " point(s) d'attention, " + ok + " OK"
        : warn ? "Tout fonctionne ✓ (" + warn + " point(s) facultatif(s) ou d'attention)" : "Tout fonctionne ✓";
      $("dgSum").className = "dg-sum " + (ko ? "ko" : warn ? "warn" : "ok");
      window.__diagDone = { ok: ok, warn: warn, ko: ko };
    });
  }

  $("dgRun")._onOk = run;
  $("dgYt")._onOk = function () { T.launch("", "YouTube"); };
  T.onShow.diag = function () { window.__diagDone = null; run(); };
})();
