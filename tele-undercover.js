/* ================================================================
   UNDERCOVER — jeu d'ambiance avec les téléphones des invités
   - La télé crée une partie (identifiant secret de 20 caractères).
   - Les invités scannent le QR code : jeu.html sur leur téléphone.
   - Chaque invité ne peut lire QUE son propre mot (règles Firebase).
   ================================================================ */
(function () {
  "use strict";
  var T = window.MaTele, $ = function (id) { return document.getElementById(id); }, esc = T.esc;
  var game = null, playersStream = null;
  var SPY = '<svg class="uc-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5h18"/><path d="M6.2 11.5l1.4-5.2a2 2 0 0 1 2.7-1.3l1.7.8 1.7-.8a2 2 0 0 1 2.7 1.3l1.4 5.2"/><circle cx="8" cy="16.2" r="2.7"/><circle cx="16" cy="16.2" r="2.7"/><path d="M10.7 16h2.6"/></svg>';
  var ROLE_TXT = { civil: "Civil", under: "Undercover", white: "Mr White" };

  function F() { return window.Fire; }
  function rid(n) {
    var A = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789", a = new Uint32Array(n), s = "";
    window.crypto.getRandomValues(a);
    for (var i = 0; i < n; i++) s += A.charAt(a[i] % A.length);
    return s;
  }
  function rnd(n) { var a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] % n; }
  function shuffle(arr) { for (var i = arr.length - 1; i > 0; i--) { var j = rnd(i + 1), t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }
  function render(html) { $("uc").innerHTML = html; T.focusFirst(); }
  function btn(id, label, cls) { return '<div class="btn focusable ' + (cls || "") + '" id="' + id + '">' + label + "</div>"; }
  function on(id, fn) { var el = $(id); if (el) el._onOk = fn; }
  function path(p) { return "games/" + game.gid + (p ? "/" + p : ""); }
  function names(ids) { return ids.map(function (u) { return game.players[u] ? game.players[u].name : "?"; }); }

  // ---------- Ouverture
  T.onShow.undercover = function () {
    if (!F() || !F().ready()) {
      render('<h1>' + SPY + ' Undercover</h1>'+'<p class="uc-big">Pour jouer, les invités scannent un QR code avec leur téléphone. Ce QR code a besoin de la liaison Firebase : renseigne-la dans Réglages (apiKey et databaseURL), puis reviens ici.</p>' + btn("ucBack", "← Retour", "ghost"));
      on("ucBack", T.back);
      return;
    }
    if (!game) newGame(); else draw();
  };

  function newGame() {
    game = { gid: rid(20), players: {}, roles: {}, out: {}, words: null, nbUnder: 0, white: false, used: {}, theme: (game && game.theme) || "", round: 0, state: "lobby", pending: null };
    F().rest("PUT", path("meta"), { host: F().uid(), state: "lobby", round: 0, ts: F().NOW }).then(function () {
      if (playersStream) playersStream.close();
      playersStream = F().stream(path("players"), function (p, data) {
        if (p === "/") game.players = data || {};
        else {
          var uid = p.replace(/^\//, "").split("/")[0];
          if (data) game.players[uid] = data; else delete game.players[uid];
        }
        // ne garder que des noms propres
        Object.keys(game.players).forEach(function (u) {
          var n = game.players[u] && game.players[u].name;
          if (typeof n !== "string" || !n.trim()) delete game.players[u];
          else game.players[u].name = n.slice(0, 20);
        });
        if (game.state === "lobby") updateLobbyPlayers();
      });
      draw();
    }).catch(function () { T.toast("Impossible de créer la partie"); });
  }

  function draw() {
    if (game.state === "lobby") lobby();
    else if (game.state === "play") play();
    else end();
  }

  // ---------- Salon d'attente
  function lobby() {
    var url = F().phoneUrl() + "/jeu.html?g=" + game.gid;
    var qr = qrcode(0, "M"); qr.addData(url); qr.make();
    render('<div class="uc-lobby"><div class="uc-qr">' + qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true }) + '<div class="uc-scan">Scanne pour rejoindre</div></div>' +
      '<div class="uc-side"><h1>' + SPY + ' Undercover</h1>' +
      '<p class="uc-lead">Chaque joueur reçoit un mot secret sur son téléphone. Un ou plusieurs <b>infiltrés</b> ont un mot légèrement différent… À vous de les démasquer !</p>' +
      '<div class="uc-ths">' + themeChips() + '</div>' +
      '<div class="uc-count" id="ucCount"></div><div class="uc-players" id="ucPlayers"></div>' +
      '<div class="uc-actions">' + btn("ucDeal", "Distribuer les mots") + btn("ucUnder", "") + btn("ucWhite", "") + btn("ucQuit", "Quitter", "ghost") + "</div>" +
      '<p class="muted small">OK sur un prénom pour retirer ce joueur.</p></div></div>');
    on("ucDeal", deal); on("ucQuit", quit);
    on("ucUnder", function () { game.nbUnder = (game.nbUnder + 1) % 4; optLabels(); });
    on("ucWhite", function () { game.white = !game.white; optLabels(); });
    Array.prototype.forEach.call(document.querySelectorAll(".uc-th"), function (el) {
      el._onOk = function () {
        game.theme = el.dataset.th; game.used = {};
        Array.prototype.forEach.call(document.querySelectorAll(".uc-th"), function (x) { x.className = "qz-cat uc-th focusable" + (x === el ? " on" : ""); });
        T.toast("Thème : " + el.textContent);
      };
    });
    optLabels(); updateLobbyPlayers();
  }
  // ---------- Thèmes (« Tous », « Tous les mangas », puis chaque thème)
  var ALL = "", MANGAS = "*manga";
  function themeList() { return [[ALL, "Tous les thèmes"], [MANGAS, "Tous les mangas"]].concat(Object.keys(window.UC_MOTS).map(function (k) { return [k, k]; })); }
  function themeChips() {
    return themeList().map(function (t) {
      return '<div class="qz-cat uc-th focusable' + ((game.theme || "") === t[0] ? " on" : "") + '" data-th="' + esc(t[0]) + '">' + esc(t[1]) + "</div>";
    }).join("");
  }
  function themeKeys() {
    var th = game.theme || "", keys = Object.keys(window.UC_MOTS);
    if (th === MANGAS) return keys.filter(function (k) { return /^manga/i.test(k); });
    if (th && window.UC_MOTS[th]) return [th];
    return keys;
  }
  function optLabels() {
    $("ucUnder").textContent = "Infiltrés : " + (game.nbUnder ? game.nbUnder : "auto");
    $("ucWhite").textContent = "Mr White : " + (game.white ? "oui" : "non");
  }
  function updateLobbyPlayers() {
    if (!$("ucPlayers")) return;
    var ids = Object.keys(game.players);
    $("ucCount").textContent = ids.length + (ids.length > 1 ? " joueurs" : " joueur") + (ids.length < 3 ? " · il en faut au moins 3" : "");
    var keep = document.querySelector(".focused") && document.querySelector(".focused").id;
    $("ucPlayers").innerHTML = ids.map(function (u) {
      return '<div class="uc-p focusable" data-uid="' + esc(u) + '">' + esc(game.players[u].name) + "</div>";
    }).join("") || '<div class="muted">En attente des invités…</div>';
    Array.prototype.forEach.call(document.querySelectorAll("#ucPlayers .uc-p"), function (el) {
      el._onOk = function () {
        F().rest("DELETE", path("players/" + el.dataset.uid)).catch(function () {});
        T.toast(el.textContent + " a été retiré");
        T.focusEl($("ucDeal"));
      };
    });
    if (keep && $(keep)) T.focusEl($(keep));
  }

  // ---------- Distribution des rôles
  function pickPair() {
    var all = [];
    themeKeys().forEach(function (cat) { window.UC_MOTS[cat].forEach(function (p) { all.push(p); }); });
    var fresh = all.filter(function (p) { return !game.used[p.join("|")]; });
    if (!fresh.length) { game.used = {}; fresh = all; }
    var pair = fresh[rnd(fresh.length)].slice();
    game.used[pair.join("|")] = 1;
    return rnd(2) ? pair : [pair[1], pair[0]];
  }
  function deal() {
    var ids = Object.keys(game.players), n = ids.length;
    if (n < 3) { T.toast("Il faut au moins 3 joueurs"); return; }
    var auto = n <= 5 ? 1 : n <= 8 ? 2 : 3;
    var nbU = Math.max(1, Math.min(game.nbUnder || auto, Math.floor((n - 1) / 2)));
    var white = game.white && n >= 4 ? 1 : 0;
    if (nbU + white > Math.floor((n - 1) / 2) + 1) white = 0;
    var pair = pickPair();
    game.words = { civil: pair[0], under: pair[1] };
    game.roles = {}; game.out = {}; game.round++; game.pending = null;
    shuffle(ids).forEach(function (u, i) { game.roles[u] = i < nbU ? "under" : i < nbU + white ? "white" : "civil"; });
    function writes() { return ids.map(function (u) {
      var r = game.roles[u];
      return F().rest("PUT", path("secret/" + u), { w: r === "white" ? "" : r === "under" ? game.words.under : game.words.civil, white: r === "white", round: game.round });
    }); }
    F().rest("DELETE", path("secret")).then(function () { return Promise.all(writes()); }).then(function () {
      return F().rest("PUT", path("meta"), { host: F().uid(), state: "play", round: game.round, ts: F().NOW });
    }).then(function () {
      var order = shuffle(Object.keys(game.roles));
      while (game.roles[order[0]] === "white" && order.length > 1) order.push(order.shift()); // Mr White ne commence jamais
      game.order = order; game.state = "play";
      play();
    }).catch(function () { T.toast("Distribution impossible, réessaie"); });
  }

  // ---------- Partie
  function alive() { return game.order.filter(function (u) { return !game.out[u]; }); }
  function play() {
    var a = alive();
    var html = '<h1>' + SPY + ' Undercover <span class="uc-round">Manche ' + game.round + "</span></h1>" +
      '<p class="uc-lead">Chacun dit <b>un mot</b> pour décrire son mot secret, dans cet ordre, puis vous votez. Sélectionne le joueur éliminé.</p>' +
      '<div class="uc-grid">' + game.order.map(function (u, i) {
        var o = game.out[u];
        return '<div class="uc-card focusable' + (o ? " out" : "") + '" data-uid="' + esc(u) + '"><span class="uc-n">' + (i + 1) + "</span>" +
          esc(game.players[u] ? game.players[u].name : "?") + (o ? '<span class="uc-role ' + o + '">' + ROLE_TXT[o] + "</span>" : "") + "</div>";
      }).join("") + "</div>" + '<div class="uc-actions">' + btn("ucEnd", "Révéler les mots", "ghost") + btn("ucQuit", "Quitter", "ghost") + "</div>";
    render(html);
    on("ucQuit", quit); on("ucEnd", function () { finish(null); });
    Array.prototype.forEach.call(document.querySelectorAll(".uc-card"), function (el) {
      el._onOk = function () { if (!game.out[el.dataset.uid]) confirmOut(el.dataset.uid); };
    });
    var first = document.querySelector(".uc-card:not(.out)"); if (first) T.focusEl(first);
    if (!a.length) finish(null);
  }
  function confirmOut(u) {
    var nm = esc(game.players[u] ? game.players[u].name : "?");
    render('<div class="uc-center"><h1>Éliminer ' + nm + " ?</h1>" + '<div class="uc-actions center">' + btn("ucYes", "Oui, éliminer") + btn("ucNo", "Annuler", "ghost") + "</div></div>");
    on("ucNo", play);
    on("ucYes", function () { eliminate(u); });
  }
  function eliminate(u) {
    var r = game.roles[u], nm = esc(game.players[u] ? game.players[u].name : "?");
    game.out[u] = r;
    var patch = {}; patch["out/" + u] = r;
    F().rest("PATCH", path("meta"), patch).catch(function () {});
    var html = '<div class="uc-center"><div class="uc-reveal ' + r + '">' + nm + " était<br><b>" + ROLE_TXT[r] + "</b></div>";
    if (r === "white") {
      html += '<p class="uc-lead">Mr White a une chance : il doit deviner le mot des civils à voix haute.</p><div class="uc-actions center">' +
        btn("ucFound", "Il a trouvé !") + btn("ucMissed", "Raté", "ghost") + "</div></div>";
      render(html);
      on("ucFound", function () { finish("white"); });
      on("ucMissed", next);
    } else {
      html += '<div class="uc-actions center">' + btn("ucNext", "Continuer") + "</div></div>";
      render(html); on("ucNext", next);
    }
  }
  function next() {
    var a = alive(), civ = a.filter(function (u) { return game.roles[u] === "civil"; }).length, bad = a.length - civ;
    if (bad === 0) finish("civil");
    else if (civ <= 1) finish("under");
    else play();
  }
  function finish(winner) {
    game.state = "end"; game.winner = winner;
    F().rest("PATCH", path("meta"), { state: "end", winner: winner || "none", words: game.words }).catch(function () {});
    end();
  }
  function end() {
    var w = game.winner, title = w === "civil" ? "Les civils gagnent !" : w === "under" ? "Les infiltrés gagnent !" : w === "white" ? "Mr White gagne !" : "Fin de la manche";
    var list = Object.keys(game.roles).map(function (u) {
      var r = game.roles[u];
      return '<div class="uc-p ' + r + '">' + esc(game.players[u] ? game.players[u].name : "?") + ' <span class="uc-role ' + r + '">' + ROLE_TXT[r] + "</span></div>";
    }).join("");
    render('<div class="uc-center"><h1>' + title + "</h1>" +
      '<div class="uc-words"><div><span>Mot des civils</span><b>' + esc(game.words.civil) + '</b></div><div><span>Mot des infiltrés</span><b>' + esc(game.words.under) + "</b></div></div>" +
      '<div class="uc-players end">' + list + "</div>" +
      '<div class="uc-actions center">' + btn("ucAgain", "Rejouer") + btn("ucNew", "Changer de joueurs", "ghost") + btn("ucQuit", "Quitter", "ghost") + "</div></div>");
    on("ucAgain", deal);
    on("ucNew", function () { F().rest("DELETE", path()).catch(function () {}); if (playersStream) playersStream.close(); newGame(); });
    on("ucQuit", quit);
  }
  function quit() {
    if (game) F().rest("DELETE", path()).catch(function () {});
    if (playersStream) { playersStream.close(); playersStream = null; }
    game = null;
    T.key("home");
  }
  window.UC = { state: function () { return game; } };
})();
