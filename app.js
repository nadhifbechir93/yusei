/* ================================================================
   YUSEI — télécommande téléphone (Firebase)
   Aucun secret ici : la clé Gemini reste sur la télé.
   La sécurité repose sur les règles Firebase (database.rules.json) :
   seuls les comptes Google listés peuvent piloter la télé.
   ================================================================ */
(function () {
  "use strict";
  firebase.initializeApp(window.FIREBASE_CONFIG);
  var auth = firebase.auth(), db = firebase.database();
  var $ = function (id) { return document.getElementById(id); };
  var TS = firebase.database.ServerValue.TIMESTAMP;
  var tv = null, replyRef = null, myCmds = {}, startedAt = Date.now();

  function view(id) {
    ["vLogin", "vPair", "vMain"].forEach(function (v) { $(v).classList.toggle("on", v === id); });
  }
  var toastT;
  function toast(t, bad) {
    var el = $("toast"); el.textContent = t; el.style.background = bad ? "var(--red)" : "var(--ok)";
    el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove("on"); }, 2500);
  }
  function vibrate() { if (navigator.vibrate) navigator.vibrate(15); }

  // ---------- Code d'appairage reçu par le QR code
  var params = new URLSearchParams(location.search);
  var urlCode = (params.get("code") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  if (urlCode) { $("pairCode").value = urlCode; history.replaceState(null, "", location.pathname); }

  // ---------- Connexion Google
  $("btnLogin").onclick = function () {
    var p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt: "select_account" });
    auth.signInWithPopup(p).catch(function (e) {
      if (/popup|operation-not-supported/.test(e.code || "")) return auth.signInWithRedirect(p);
      $("loginErr").textContent = "Connexion impossible : " + (e.message || e.code);
    });
  };
  function logout() { localStorage.removeItem("jarvis_tv"); auth.signOut(); }
  $("btnLogout").onclick = logout; $("btnLogout2").onclick = logout;

  auth.onAuthStateChanged(function (user) {
    if (!user) { view("vLogin"); return; }
    // Test d'autorisation : seuls les comptes listés dans les règles peuvent lire la liste des télés.
    db.ref("house/tvs").once("value").then(function (snap) {
      var tvs = snap.val() || {};
      renderTvList(tvs);
      var saved = localStorage.getItem("jarvis_tv");
      if (!urlCode && saved && tvs[saved]) openTv(saved, tvs[saved].nom);
      else view("vPair");
    }).catch(function () {
      $("loginErr").textContent = "Le compte " + user.email + " n'est pas autorisé sur cette maison.";
      auth.signOut();
    });
  });

  // ---------- Appairage
  function renderTvList(tvs) {
    var ids = Object.keys(tvs);
    $("tvList").innerHTML = "";
    if (!ids.length) return;
    var p = document.createElement("p"); p.className = "sub"; p.textContent = "Ou choisis une télé déjà connectée :";
    $("tvList").appendChild(p);
    ids.forEach(function (id) {
      var b = document.createElement("button");
      b.textContent = "📺 " + (tvs[id].nom || "Télé");
      b.onclick = function () { openTv(id, tvs[id].nom); };
      $("tvList").appendChild(b);
    });
  }
  $("btnPair").onclick = function () {
    var code = $("pairCode").value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    var nom = ($("pairName").value || "Télé").trim().slice(0, 40);
    $("pairErr").textContent = "";
    if (!/^[A-Z0-9]{8}$/.test(code)) { $("pairErr").textContent = "Le code fait 8 caractères."; return; }
    db.ref("pairing/" + code).once("value").then(function (s) {
      var p = s.val();
      if (!p || !p.tvUid) throw new Error("Code invalide ou expiré.");
      if (Date.now() - p.ts > 11 * 60000) throw new Error("Code expiré, regarde le nouveau code sur la télé.");
      return db.ref("house/tvs/" + p.tvUid).set({ nom: nom, code: code, ts: TS }).then(function () { return p.tvUid; });
    }).then(function (id) {
      vibrate(); toast("Télé connectée ✓");
      urlCode = "";
      openTv(id, nom);
    }).catch(function (e) { $("pairErr").textContent = e.message || "Échec de la connexion."; });
  };

  // ---------- Écran principal
  function openTv(id, nom) {
    tv = id;
    localStorage.setItem("jarvis_tv", id);
    $("tvName").textContent = nom || "Télé";
    view("vMain");
    watchDraw();
    if (replyRef) replyRef.off();
    replyRef = db.ref("house/reply/" + tv).limitToLast(10);
    replyRef.on("child_added", function (s) {
      var r = s.val() || {};
      if (!myCmds[r.cmd]) return;          // réponse à la demande d'un autre téléphone
      delete myCmds[r.cmd];
      s.ref.remove().catch(function () {});
      showAnswer(r.text);
    });
  }
  db.ref(".info/connected").on("value", function (s) { $("netDot").classList.toggle("on", !!s.val()); });

  function send(type, extra) {
    if (!tv) return Promise.resolve();
    var c = { type: type, ts: TS };
    for (var k in extra) c[k] = extra[k];
    vibrate();
    var ref = db.ref("house/cmd/" + tv).push();
    if (type === "jarvis") myCmds[ref.key] = 1;
    return ref.set(c).catch(function () {
      toast("Commande refusée (télé déconnectée ?)", true);
      if (type === "jarvis") reactor("");
    });
  }

  // Télécommande
  document.querySelectorAll("[data-key]").forEach(function (b) { b.onclick = function () { vibrate(); send("key", { arg: b.dataset.key }); }; });
  document.querySelectorAll("[data-go]").forEach(function (b) { b.onclick = function () { send("go", { arg: b.dataset.go }); }; });
  document.querySelectorAll("[data-app]").forEach(function (b) { b.onclick = function () { send("app", { arg: b.dataset.app }); }; });
  document.querySelectorAll("[data-timer]").forEach(function (b) { b.onclick = function () { send("timer", { arg: b.dataset.timer }); toast("Minuteur lancé"); }; });

  // ---------- Yusei
  function reactor(s) { $("btnMic").className = "reactor " + (s || ""); }
  function askYusei(text) {
    text = (text || "").trim().slice(0, 500);
    if (!text) return;
    $("live").textContent = "« " + text + " »";
    $("answer").classList.remove("on");
    reactor("think");
    send("jarvis", { text: text });
    clearTimeout(askYusei.t);
    askYusei.t = setTimeout(function () { reactor(""); }, 30000);
  }
  function showAnswer(t) {
    clearTimeout(askYusei.t);
    reactor("");
    $("answer").textContent = t; $("answer").classList.add("on");
    speak(t);
  }
  $("askForm").onsubmit = function (e) {
    e.preventDefault();
    askYusei($("askInput").value); $("askInput").value = ""; $("askInput").blur();
  };

  // Voix → texte (micro du téléphone)
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null, listening = false;
  if (!SR) $("micHint").textContent = "Micro non disponible sur ce navigateur : écris ta demande.";
  $("btnMic").onclick = function () {
    if (!SR) return;
    if (listening) { rec.stop(); return; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    rec = new SR();
    rec.lang = "fr-FR"; rec.interimResults = true; rec.maxAlternatives = 1;
    var finalText = "";
    rec.onstart = function () { listening = true; reactor("listen"); $("micHint").textContent = "Je vous écoute…"; vibrate(); };
    rec.onresult = function (e) {
      var t = "";
      for (var i = e.resultIndex; i < e.results.length; i++) {
        t += e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      $("live").textContent = t;
    };
    rec.onerror = function (e) { if (e.error === "not-allowed") toast("Autorise le micro pour parler à Yusei", true); };
    rec.onend = function () {
      listening = false; $("micHint").textContent = "Appuie et parle à Yusei";
      if (finalText.trim()) askYusei(finalText); else reactor("");
    };
    rec.start();
  };

  // Texte → voix
  var voice = null;
  function pickVoice() {
    var vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    voice = vs.filter(function (v) { return /^fr/i.test(v.lang); })
      .sort(function (a, b) { return (/male|homme|thomas|paul|henri/i.test(b.name) ? 1 : 0) - (/male|homme|thomas|paul|henri/i.test(a.name) ? 1 : 0); })[0] || null;
  }
  if (window.speechSynthesis) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  $("optVoice").checked = localStorage.getItem("jarvis_voice") === "1";   // par défaut c'est la télé qui parle
  $("optVoice").onchange = function () { localStorage.setItem("jarvis_voice", $("optVoice").checked ? "1" : "0"); };
  function speak(t) {
    if (!window.speechSynthesis || !$("optVoice").checked) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(t);
    u.lang = "fr-FR"; u.rate = 1.02; u.pitch = 0.9;
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  }

  // ---------- Onglets
  document.querySelectorAll(".tab").forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("on", x === b); });
      document.querySelectorAll(".tabpane").forEach(function (p) { p.classList.toggle("on", p.id === b.dataset.tab); });
      if (b.dataset.tab === "tabDraw") { sizePad(); send("go", { arg: "dessin" }); }
    };
  });
  $("btnUndercover").onclick = function () { send("go", { arg: "undercover" }); toast("Undercover s'ouvre sur la télé"); };

  // ---------- Dessin en direct
  var pad = $("pad"), pctx = pad.getContext("2d");
  var COLORS = ["#111827", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#8b5a2b"];
  var color = COLORS[0], width = 10, erasing = false, cur = null, flushT = null, mine = {}, drawRef = null;
  $("palette").innerHTML = "";
  COLORS.forEach(function (c, i) {
    var b = document.createElement("button"); b.className = "swatch" + (i === 0 ? " on" : ""); b.style.background = c;
    b.setAttribute("aria-label", "Couleur");
    b.onclick = function () { color = c; erasing = false; selectIn("#palette", b); selectIn(".sizes", null, "[data-erase]"); };
    $("palette").appendChild(b);
  });
  function selectIn(sel, btn, off) {
    document.querySelectorAll(sel + " button").forEach(function (x) { if (!off || x.matches(off)) x.classList.toggle("on", x === btn); });
  }
  document.querySelectorAll(".sizes [data-w]").forEach(function (b) {
    b.onclick = function () { width = +b.dataset.w; document.querySelectorAll(".sizes [data-w]").forEach(function (x) { x.classList.toggle("on", x === b); }); };
  });
  document.querySelector(".sizes [data-erase]").onclick = function () {
    erasing = !erasing; this.classList.toggle("on", erasing);
  };
  function sizePad() { pctx.lineCap = "round"; pctx.lineJoin = "round"; }
  function paint(s) {
    var pts = s.p.split(";").map(function (q) { return q.split(",").map(Number); });
    pctx.strokeStyle = s.c; pctx.fillStyle = s.c; pctx.lineWidth = s.w; pctx.lineCap = "round"; pctx.lineJoin = "round";
    if (pts.length === 1) { pctx.beginPath(); pctx.arc(pts[0][0], pts[0][1], s.w / 2, 0, 7); pctx.fill(); return; }
    pctx.beginPath(); pctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) pctx.lineTo(pts[i][0], pts[i][1]);
    pctx.stroke();
  }
  function clearPad() { pctx.fillStyle = "#fff"; pctx.fillRect(0, 0, pad.width, pad.height); }
  clearPad();
  function pos(e) {
    var r = pad.getBoundingClientRect();
    return [Math.max(0, Math.min(1000, Math.round((e.clientX - r.left) / r.width * 1000))),
            Math.max(0, Math.min(563, Math.round((e.clientY - r.top) / r.height * 563)))];
  }
  function flush(final) {
    if (!cur || !tv) return;
    if (cur.pts.length >= (final ? 1 : 2)) {
      var s = { p: cur.pts.map(function (p) { return p[0] + "," + p[1]; }).join(";"), c: erasing ? "#ffffff" : color, w: erasing ? Math.max(24, width * 2) : width, ts: TS };
      var ref = db.ref("house/draw/" + tv).push(); mine[ref.key] = 1;
      ref.set(s).catch(function () { toast("Dessin refusé (télé déconnectée ?)", true); });
    }
    cur.pts = cur.pts.slice(-1); // le morceau suivant repart du dernier point
  }
  pad.addEventListener("pointerdown", function (e) {
    e.preventDefault(); pad.setPointerCapture(e.pointerId);
    cur = { pts: [pos(e)] };
    paint({ p: cur.pts[0].join(","), c: erasing ? "#ffffff" : color, w: erasing ? Math.max(24, width * 2) : width });
    clearInterval(flushT); flushT = setInterval(function () { flush(false); }, 80);
  });
  pad.addEventListener("pointermove", function (e) {
    if (!cur) return;
    var p = pos(e), last = cur.pts[cur.pts.length - 1];
    if (last && Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 3) return;
    paint({ p: (last ? last.join(",") + ";" : "") + p.join(","), c: erasing ? "#ffffff" : color, w: erasing ? Math.max(24, width * 2) : width });
    cur.pts.push(p);
    if (cur.pts.length > 300) flush(false);
  });
  function end() { if (!cur) return; clearInterval(flushT); flush(true); cur = null; }
  pad.addEventListener("pointerup", end); pad.addEventListener("pointercancel", end);
  $("btnClear").onclick = function () { if (confirm("Effacer tout le tableau ?")) { send("clear", {}); clearPad(); } };
  $("btnShowBoard").onclick = function () { send("go", { arg: "dessin" }); };
  function watchDraw() {
    if (drawRef) drawRef.off();
    clearPad();
    drawRef = db.ref("house/draw/" + tv);
    drawRef.on("child_added", function (s) { if (!mine[s.key]) paint(s.val()); });
    drawRef.on("value", function (s) { if (!s.exists()) clearPad(); });
  }

  // ---------- Menu
  $("btnMenu").onclick = function () { $("menu").classList.add("on"); };
  $("btnClose").onclick = function () { $("menu").classList.remove("on"); };
  $("btnSwitch").onclick = function () {
    $("menu").classList.remove("on");
    db.ref("house/tvs").once("value").then(function (s) { renderTvList(s.val() || {}); view("vPair"); });
  };
  $("btnForget").onclick = function () {
    if (!tv || !confirm("Déconnecter cette télé pour TOUS les téléphones ? Il faudra la réappairer avec le QR code.")) return;
    db.ref("house/tvs/" + tv).remove().then(function () {
      localStorage.removeItem("jarvis_tv"); tv = null;
      $("menu").classList.remove("on"); toast("Télé déconnectée");
      db.ref("house/tvs").once("value").then(function (s) { renderTvList(s.val() || {}); view("vPair"); });
    });
  };
})();
