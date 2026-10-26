/* ================================================================
   QUIZ EN FAMILLE — page des joueurs (aucun compte nécessaire)
   Connexion anonyme : le joueur peut rejoindre et envoyer UNE réponse
   par question. Il n'a accès ni à la télé, ni aux réponses des autres.
   ================================================================ */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var gid = (new URLSearchParams(location.search).get("g") || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 24);
  var VIEWS = ["sJoin", "sWait", "sPlay", "sSent", "sResult", "sEnd", "sGone"];
  function show(id) { VIEWS.forEach(function (s) { $(s).classList.toggle("on", s === id); }); }
  if (gid.length < 16) { show("sGone"); return; }
  history.replaceState(null, "", location.pathname + "?g=" + gid);
  firebase.initializeApp(window.FIREBASE_CONFIG);
  var auth = firebase.auth(), db = firebase.database(), TS = firebase.database.ServerValue.TIMESTAMP;
  var uid = null, meta = null, joined = false, answered = {}, myName = localStorage.getItem("uc_name") || "", barT = null;
  var LETTERS = ["A", "B", "C", "D"];
  $("name").value = myName;

  auth.signInAnonymously().then(function (c) {
    uid = c.user.uid;
    db.ref("quiz/" + gid + "/meta").on("value", function (s) { meta = s.val(); if (!meta) { show("sGone"); return; } refresh(); }, function () { show("sGone"); });
  }).catch(function () { $("err").textContent = "Connexion impossible. Vérifie ta connexion Internet."; show("sJoin"); });

  $("fJoin").onsubmit = function (e) {
    e.preventDefault();
    var n = $("name").value.replace(/\s+/g, " ").trim().slice(0, 20);
    if (!n || !uid) return;
    db.ref("quiz/" + gid + "/players/" + uid).set({ name: n, ts: TS }).then(function () {
      joined = true; myName = n; localStorage.setItem("uc_name", n); $("me").textContent = n; refresh();
    }).catch(function () { $("err").textContent = "Le quiz a déjà commencé : attends la prochaine partie."; });
  };

  function scoreOf(u) { return (meta && meta.scores && meta.scores[u]) || 0; }
  function rank() {
    var s = (meta && meta.scores) || {}, ids = Object.keys(s).sort(function (a, b) { return s[b] - s[a]; });
    return { pos: ids.indexOf(uid) + 1, total: ids.length, ids: ids };
  }
  function refresh() {
    if (!meta) return;
    $("myScore").textContent = joined && meta.scores && meta.scores[uid] != null ? scoreOf(uid) + " pts" : "";
    if (!joined) { if (meta.state !== "lobby") $("err").textContent = "Le quiz a déjà commencé : attends la prochaine partie."; show("sJoin"); return; }
    if (meta.state === "lobby") { $("waitTxt").textContent = "Thème : " + (meta.cat || "Mélange") + ". Regarde la télé, le quiz va commencer."; show("sWait"); return; }
    if (meta.state === "play") {
      if (answered[meta.q] != null) { show("sSent"); return; }
      drawQuestion(); show("sPlay"); return;
    }
    if (meta.state === "reveal") {
      var mine = answered[meta.q], good = meta.good, r = rank();
      var ok = mine === good;
      $("verdict").className = "verdict " + (mine == null ? "none" : ok ? "ok" : "ko");
      $("verdict").textContent = mine == null ? "Trop tard !" : ok ? "Bonne réponse !" : "Raté !";
      $("resTxt").textContent = "La réponse était " + LETTERS[good] + " : " + ((meta.c && meta.c[good]) || "");
      $("rankTxt").textContent = r.pos ? "Tu es " + (r.pos === 1 ? "1er" : r.pos + "e") + " sur " + r.total + " · " + scoreOf(uid) + " points" : "";
      if (navigator.vibrate) navigator.vibrate(ok ? [30, 40, 30] : 120);
      show("sResult"); return;
    }
    if (meta.state === "end") {
      var rr = rank(), names = meta.names || {};
      $("podium").innerHTML = "";
      rr.ids.slice(0, 3).forEach(function (u, i) {
        var d = document.createElement("div"); d.className = "pod p" + (i + 1);
        var b = document.createElement("b"); b.textContent = (i + 1) + ". " + (names[u] || "?");
        var sp = document.createElement("span"); sp.textContent = scoreOf(u) + " pts";
        d.appendChild(b); d.appendChild(sp); $("podium").appendChild(d);
      });
      $("endTxt").textContent = rr.pos ? (rr.pos === 1 ? "Bravo, tu es le champion !" : "Tu termines " + rr.pos + "e avec " + scoreOf(uid) + " points.") : "";
      show("sEnd");
    }
  }
  function drawQuestion() {
    $("qNum").textContent = "Question " + (((+meta.q) % 10) + 1) + (meta.n ? " / " + meta.n : "");
    $("qText").textContent = meta.text || "";
    var box = $("answers"); box.innerHTML = "";
    for (var i = 0; i < 4; i++) {
      var b = document.createElement("button"); b.className = "ans a" + i; b.setAttribute("data-i", i);
      var l = document.createElement("span"); l.className = "l"; l.textContent = LETTERS[i];
      var t = document.createElement("span"); t.className = "t"; t.textContent = (meta.c && meta.c[i]) || "";
      b.appendChild(l); b.appendChild(t); b.onclick = choose; box.appendChild(b);
    }
    clearInterval(barT);
    var dl = meta.deadline || 0, total = 20000;
    barT = setInterval(function () { var left = Math.max(0, dl - Date.now()); $("qBar").style.width = Math.min(100, 100 * left / total) + "%"; if (!left) clearInterval(barT); }, 200);
  }
  function choose() {
    var a = +this.getAttribute("data-i"), q = meta.q;
    if (answered[q] != null) return;
    answered[q] = a;
    if (navigator.vibrate) navigator.vibrate(15);
    db.ref("quiz/" + gid + "/answers/" + uid + "/" + q).set({ a: a, ts: TS }).then(function () { show("sSent"); }, function () { show("sSent"); });
  }
})();
