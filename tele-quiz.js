/* ================================================================
   QUIZ EN FAMILLE — la télé pose les questions, chacun répond sur son
   téléphone (QR code, sans compte). Points : bonne réponse + rapidité.
   La bonne réponse n'est envoyée aux téléphones qu'après la question
   (impossible de tricher), règles Firebase à l'appui.
   ================================================================ */
(function () {
  "use strict";
  var T = window.MaTele, $ = function (id) { return document.getElementById(id); }, esc = T.esc;
  var QTIME = 20, NQ = 10, LETTERS = ["A", "B", "C", "D"];
  var SHAPES = ['<svg viewBox="0 0 24 24"><path d="M12 4 21 19H3z"/></svg>', '<svg viewBox="0 0 24 24"><path d="M12 3 21 12 12 21 3 12z"/></svg>',
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/></svg>', '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>'];
  var g = null, pStream = null, aStream = null, tick = null, next = null;
  function F() { return window.Fire; }
  function rnd(n) { var a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] % n; }
  function rid(n) { var A = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789", s = ""; for (var i = 0; i < n; i++) s += A.charAt(rnd(A.length)); return s; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function render(html, focusId) { $("qz").innerHTML = html; if (focusId && $(focusId)) T.focusEl($(focusId)); else T.focusFirst(); }
  function on(id, fn) { var el = $(id); if (el) el._onOk = fn; }
  function btn(id, label, cls) { return '<div class="btn focusable ' + (cls || "") + '" id="' + id + '">' + label + "</div>"; }
  function path(p) { return "quiz/" + g.gid + (p ? "/" + p : ""); }
  function players() { return Object.keys(g.players).filter(function (u) { return g.players[u] && typeof g.players[u].name === "string"; }); }
  function pname(u) { return String(g.players[u].name).replace(/[\u0000-\u001f]/g, "").slice(0, 20); }
  var ICO = '<svg class="h-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.8v.4"/><circle cx="12" cy="16.8" r=".7"/></svg>';

  function pickQuestions(cat) {
    var B = window.QUIZ_Q || {}, pool = [];
    if (cat === "melange" || !B[cat]) Object.keys(B).forEach(function (k) { if (k !== "enfants") pool = pool.concat(B[k]); });
    else pool = B[cat].slice();
    pool = shuffle(pool.slice()).slice(0, cat === "enfants" ? 6 : NQ);
    if (cat === "enfants" || cat === "sciences") for (var i = 0; i < (cat === "enfants" ? 4 : 2); i++) pool.push(window.QUIZ_MATH(rnd));
    return shuffle(pool).slice(0, NQ).map(function (q) {   // on mélange aussi l'ordre des réponses
      var idx = shuffle([0, 1, 2, 3]);
      return { text: q[0], c: idx.map(function (i) { return q[1][i]; }), good: idx.indexOf(q[2]) };
    });
  }

  // ---------- Ouverture / salon
  function needLink() {
    render('<div class="qz-center"><h1>' + ICO + ' Quiz en famille</h1><p class="qz-lead">Le quiz utilise les téléphones des joueurs : il a besoin de la liaison Firebase (Réglages › Connecter mon téléphone).</p>' + btn("qzBack", "← Retour", "ghost") + "</div>");
    on("qzBack", T.back);
  }
  T.onShow.quiz = function () {
    if (!F() || !F().ready()) return needLink();
    if (!g) newGame("melange"); else draw();
  };
  function newGame(cat) {
    stopAll();
    g = { gid: rid(20), cat: cat || "melange", players: {}, answers: {}, scores: {}, qs: [], i: -1, state: "lobby", t0: 0, round: null };
    F().rest("PUT", path("meta"), { host: F().uid(), state: "lobby", cat: window.QUIZ_CATS[g.cat] || "", ts: F().NOW }).then(function () {
      pStream = F().stream(path("players"), function (p, data) {
        if (p === "/") g.players = data || {};
        else { var u = p.replace(/^\//, "").split("/")[0]; if (data) g.players[u] = data; else delete g.players[u]; }
        if (g.state === "lobby") lobbyPlayers();
      });
      aStream = F().stream(path("answers"), onAnswers);
      draw();
    }).catch(function () { T.toast("Impossible de créer le quiz"); });
  }
  function stopAll() {
    clearInterval(tick); clearTimeout(next);
    if (pStream) { pStream.close(); pStream = null; }
    if (aStream) { aStream.close(); aStream = null; }
  }
  function draw() { if (g.state === "lobby") lobby(); else if (g.state === "play") question(); else if (g.state === "reveal") reveal(); else end(); }

  function lobby() {
    var url = F().phoneUrl() + "/quiz.html?g=" + g.gid;
    var qr = qrcode(0, "M"); qr.addData(url); qr.make();
    var cats = Object.keys(window.QUIZ_CATS).map(function (k) {
      return '<div class="qz-cat focusable' + (k === g.cat ? " on" : "") + '" data-cat="' + k + '">' + esc(window.QUIZ_CATS[k]) + "</div>";
    }).join("");
    render('<div class="qz-lobby"><div class="qz-qr">' + qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true }) + '<div class="qz-scan">Scanne pour jouer</div></div>' +
      '<div class="qz-side"><h1>' + ICO + ' Quiz en famille</h1>' +
      '<p class="qz-lead">Chacun scanne le QR code et répond sur son téléphone. Plus tu réponds vite, plus tu gagnes de points.</p>' +
      '<div class="qz-cats">' + cats + '</div>' +
      '<div class="qz-count" id="qzCount"></div><div class="qz-players" id="qzPlayers"></div>' +
      '<div class="tiles">' + btn("qzGo", "Lancer le quiz") + btn("qzQuit", "Quitter", "ghost") + "</div></div></div>", "qzGo");
    Array.prototype.forEach.call(document.querySelectorAll(".qz-cat"), function (el) {
      el._onOk = function () {
        g.cat = el.getAttribute("data-cat");
        Array.prototype.forEach.call(document.querySelectorAll(".qz-cat"), function (x) { x.className = "qz-cat focusable" + (x === el ? " on" : ""); });
        F().rest("PUT", path("meta"), { host: F().uid(), state: "lobby", cat: window.QUIZ_CATS[g.cat] || "", ts: F().NOW }).catch(function () {});
      };
    });
    on("qzGo", startGame); on("qzQuit", quit);
    lobbyPlayers();
  }
  function lobbyPlayers() {
    var el = $("qzPlayers"); if (!el) return;
    var ps = players();
    $("qzCount").textContent = ps.length ? ps.length + " joueur" + (ps.length > 1 ? "s" : "") + " prêt" + (ps.length > 1 ? "s" : "") : "En attente des joueurs…";
    el.innerHTML = ps.map(function (u, i) { return '<span class="qz-p" style="-webkit-animation-delay:' + (i * 60) + "ms;animation-delay:" + (i * 60) + 'ms">' + esc(pname(u)) + "</span>"; }).join("");
  }

  // ---------- Partie
  function startGame() {
    if (!players().length) { T.toast("Il faut au moins un joueur : scannez le QR code"); return; }
    if (g.round == null) g.round = 0; else g.round++;
    if (g.round > 8) { quit(true); return newGame(g.cat); }   // au-delà, on repart sur une partie neuve
    g.qs = pickQuestions(g.cat); g.i = -1; g.scores = {};
    players().forEach(function (u) { g.scores[u] = 0; });
    T.say("C'est parti pour le quiz ! " + g.qs.length + " questions.");
    nextQuestion();
  }
  function qk() { return String((g.round || 0) * NQ + g.i); }   // n° de question unique (une réponse par question, règles Firebase)
  function names() { var n = {}; players().forEach(function (u) { n[u] = pname(u); }); return n; }
  function pushMeta(extra) {
    var m = { host: F().uid(), state: g.state, cat: window.QUIZ_CATS[g.cat] || "", n: g.qs.length, scores: g.scores, names: names(), ts: F().NOW };
    Object.keys(extra || {}).forEach(function (k) { m[k] = extra[k]; });
    return F().rest("PUT", path("meta"), m).catch(function () {});
  }
  function nextQuestion() {
    clearTimeout(next); clearInterval(tick);
    g.i++;
    if (g.i >= g.qs.length) return finish();
    var q = g.qs[g.i]; g.state = "play"; g.t0 = Date.now(); g.got = {};
    pushMeta({ q: qk(), text: q.text, c: { 0: q.c[0], 1: q.c[1], 2: q.c[2], 3: q.c[3] }, deadline: Date.now() + QTIME * 1000 });
    question();
    tick = setInterval(function () {
      var left = Math.max(0, QTIME - (Date.now() - g.t0) / 1000);
      var r = $("qzRing"); if (r) r.style.strokeDashoffset = String(276.5 * (1 - left / QTIME));
      var s = $("qzSec"); if (s) s.textContent = Math.ceil(left);
      if (left <= 0) doReveal();
    }, 250);
  }
  function onAnswers(p, data) {
    if (p === "/") g.answers = data || {};
    else {
      var seg = p.replace(/^\//, "").split("/");
      if (seg.length === 1) g.answers[seg[0]] = data;
      else { g.answers[seg[0]] = g.answers[seg[0]] || {}; g.answers[seg[0]][seg[1]] = data; }
    }
    if (g.state !== "play") return;
    var k = qk();
    players().forEach(function (u) { if (!g.got[u] && g.answers[u] && g.answers[u][k]) g.got[u] = Date.now(); });   // heure d'arrivée = rapidité
    answeredCount();
    if (players().length && players().every(function (u) { return g.got[u]; })) doReveal();
  }
  function answeredCount() {
    var el = $("qzAns"); if (!el) return;
    var n = players().filter(function (u) { return g.got[u]; }).length;
    el.textContent = n + " / " + players().length + " ont répondu";
    Array.prototype.forEach.call(document.querySelectorAll(".qz-av"), function (a) { a.className = "qz-av" + (g.got[a.getAttribute("data-u")] ? " ok" : ""); });
  }
  function question() {
    var q = g.qs[g.i];
    render('<div class="qz-play"><div class="qz-top"><span class="qz-num">Question ' + (g.i + 1) + " / " + g.qs.length + '</span><span class="qz-catname">' + esc(window.QUIZ_CATS[g.cat] || "") + "</span>" +
      '<svg class="qz-timer" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" class="qz-ring-bg"/><circle cx="50" cy="50" r="44" class="qz-ring" id="qzRing"/></svg><span class="qz-sec" id="qzSec">' + QTIME + "</span></div>" +
      '<div class="qz-q">' + esc(q.text) + "</div>" +
      '<div class="qz-grid">' + q.c.map(function (c, i) { return '<div class="qz-a a' + i + '"><span class="qz-shape">' + SHAPES[i] + '</span><span class="qz-l">' + LETTERS[i] + '</span><span class="qz-t">' + esc(c) + "</span></div>"; }).join("") + "</div>" +
      '<div class="qz-foot"><span class="qz-ans" id="qzAns"></span><span class="qz-avs">' + players().map(function (u) { return '<span class="qz-av" data-u="' + esc(u) + '">' + esc(pname(u).charAt(0).toUpperCase()) + "</span>"; }).join("") + "</span>" +
      btn("qzSkip", "Voir la réponse", "ghost") + "</div></div>", "qzSkip");
    on("qzSkip", doReveal);
    answeredCount();
  }
  function doReveal() {
    if (g.state !== "play") return;
    clearInterval(tick);
    var q = g.qs[g.i], k = qk();
    g.state = "reveal"; g.last = {};
    players().forEach(function (u) {
      var a = g.answers[u] && g.answers[u][k];
      if (a && a.a === q.good) {
        var dt = Math.max(0, Math.min(QTIME, ((g.got[u] || Date.now()) - g.t0) / 1000));
        var pts = 500 + Math.round(500 * (1 - dt / QTIME));
        g.scores[u] = (g.scores[u] || 0) + pts; g.last[u] = pts;
      } else g.last[u] = 0;
    });
    pushMeta({ q: k, text: q.text, c: { 0: q.c[0], 1: q.c[1], 2: q.c[2], 3: q.c[3] }, good: q.good });
    reveal();
    T.say("La bonne réponse était : " + q.c[q.good] + ".");
    next = setTimeout(nextQuestion, 7000);
  }
  function ranking() { return players().sort(function (a, b) { return (g.scores[b] || 0) - (g.scores[a] || 0); }); }
  function reveal() {
    var q = g.qs[g.i], k = qk(), count = [0, 0, 0, 0];
    players().forEach(function (u) { var a = g.answers[u] && g.answers[u][k]; if (a && a.a >= 0 && a.a <= 3) count[a.a]++; });
    var top = ranking().slice(0, 5), max = Math.max(1, g.scores[top[0]] || 0);
    render('<div class="qz-play"><div class="qz-top"><span class="qz-num">Question ' + (g.i + 1) + " / " + g.qs.length + "</span></div>" +
      '<div class="qz-q small">' + esc(q.text) + "</div>" +
      '<div class="qz-grid rev">' + q.c.map(function (c, i) { return '<div class="qz-a a' + i + (i === q.good ? " good" : " bad") + '"><span class="qz-shape">' + SHAPES[i] + '</span><span class="qz-l">' + LETTERS[i] + '</span><span class="qz-t">' + esc(c) + '</span><span class="qz-n">' + count[i] + "</span></div>"; }).join("") + "</div>" +
      '<div class="qz-board">' + top.map(function (u, i) {
        return '<div class="qz-row"><span class="qz-rk">' + (i + 1) + '</span><span class="qz-nm">' + esc(pname(u)) + '</span><span class="qz-bar"><i style="width:' + Math.round(100 * (g.scores[u] || 0) / max) + '%"></i></span><span class="qz-sc">' + (g.scores[u] || 0) + "</span>" +
          (g.last[u] ? '<span class="qz-plus">+' + g.last[u] + "</span>" : '<span class="qz-plus zero">+0</span>') + "</div>";
      }).join("") + "</div>" +
      '<div class="qz-foot">' + btn("qzNext", g.i + 1 >= g.qs.length ? "Voir le podium" : "Question suivante") + "</div></div>", "qzNext");
    on("qzNext", nextQuestion);
  }
  function finish() {
    clearInterval(tick); clearTimeout(next);
    g.state = "end"; pushMeta({}); end();
    var r = ranking();
    if (r.length) T.say("Bravo " + pname(r[0]) + ", champion du quiz avec " + (g.scores[r[0]] || 0) + " points !");
  }
  function end() {
    var r = ranking(), pod = [r[1], r[0], r[2]];
    render('<div class="qz-center"><h1>' + ICO + " Podium</h1>" +
      '<div class="qz-podium">' + pod.map(function (u, i) {
        if (!u) return '<div class="qz-step empty"></div>';
        var place = i === 1 ? 1 : i === 0 ? 2 : 3;
        return '<div class="qz-step p' + place + '"><div class="qz-who">' + esc(pname(u)) + '</div><div class="qz-pts">' + (g.scores[u] || 0) + ' pts</div><div class="qz-block"><b>' + place + "</b></div></div>";
      }).join("") + "</div>" +
      (r.length > 3 ? '<p class="qz-lead">' + r.slice(3).map(function (u, i) { return (i + 4) + ". " + esc(pname(u)) + " (" + (g.scores[u] || 0) + ")"; }).join(" · ") + "</p>" : "") +
      '<div class="tiles">' + btn("qzAgain", "Rejouer (mêmes joueurs)") + btn("qzNew", "Nouvelle partie") + btn("qzQuit", "Quitter", "ghost") + "</div></div>", "qzAgain");
    on("qzAgain", function () { g.state = "lobby"; pushMeta({}); startGame(); });
    on("qzNew", function () { quit(true); newGame(g ? g.cat : "melange"); });
    on("qzQuit", function () { quit(); });
  }
  function quit(keep) {
    if (!g) return;
    stopAll();
    F().rest("DELETE", path()).catch(function () {});
    g = null;
    if (!keep) T.back();
  }
  window.Quiz = {
    start: function (cat) {
      if (!F() || !F().ready()) return needLink();
      cat = window.QUIZ_CATS[cat] ? cat : "melange";
      if (g && g.state === "lobby") { g.cat = cat; lobby(); return; }
      if (g) quit(true);
      newGame(cat);
    },
    state: function () { return g ? { gid: g.gid, state: g.state, i: g.i, good: g.qs[g.i] && g.qs[g.i].good, scores: g.scores, n: g.qs.length } : null; },
    _reveal: function () { doReveal(); }, _next: function () { nextQuestion(); }
  };
})();
