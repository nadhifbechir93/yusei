/* ================================================================
   LIAISON TÉLÉPHONE ⇄ TÉLÉ (Firebase, sécurisée)
   - La télé se connecte de façon anonyme (identifiant unique et secret).
   - Elle affiche un code d'appairage à usage unique (QR code).
   - Seul un compte Google autorisé (règles Firebase) peut l'appairer
     et lui envoyer des commandes.
   - La télé n'exécute que des commandes de la liste blanche ci-dessous.
   ================================================================ */
(function () {
  "use strict";
  var T = window.MaTele, cfg = T.cfg(), F = cfg.firebase || {};
  var $ = function (id) { return document.getElementById(id); };
  window.LinkStatus = "off";

  function setStatus(s, txt) {
    window.LinkStatus = s;
    var el = $("linkStatus");
    el.textContent = txt; el.className = "link-status" + (s === "ok" ? " ok" : "");
    $("linkSteps").style.display = s === "ok" ? "none" : "";
    T.phone(s === "ok");
  }

  if (!F.apiKey || !F.databaseURL) {
    setStatus("off", "Liaison pas encore configurée");
    $("linkCode").textContent = "—";
    $("linkQr").innerHTML = '<div class="qr-off"><b>Pas de QR code pour l\'instant</b>' +
      "Le QR code apparaîtra dès que la liaison Firebase sera renseignée (Réglages › Firebase : apiKey et databaseURL)." +
      "<br><br>Tout le reste de l'appli fonctionne sans.</div>";
    $("linkSteps").style.display = "none";
    return;
  }

  var DB = F.databaseURL.replace(/\/+$/, "");
  var auth = { id: null, refresh: null, uid: null, exp: 0 };
  var tvStream = null, cmdStream = null, pairCode = null, pairTimer = null, refreshTimer = null;
  var done = {};

  // ---------- Authentification anonyme (API REST Firebase Auth)
  function saveAuth() {
    try { localStorage.setItem("matele_auth", JSON.stringify({ refresh: auth.refresh, uid: auth.uid })); } catch (e) {}
  }
  function signIn() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem("matele_auth") || "null"); } catch (e) {}
    if (saved && saved.refresh) {
      return fetch("https://securetoken.googleapis.com/v1/token?key=" + encodeURIComponent(F.apiKey), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(saved.refresh)
      }).then(json).then(function (j) {
        auth.id = j.id_token; auth.refresh = j.refresh_token; auth.uid = j.user_id;
        auth.exp = Date.now() + (+j.expires_in) * 1000; saveAuth();
      }).catch(function (e) {
        if (String(e.message).indexOf("TOKEN") >= 0 || String(e.message).indexOf("USER") >= 0) {
          try { localStorage.removeItem("matele_auth"); } catch (e2) {}
          return signUp();
        }
        throw e;
      });
    }
    return signUp();
  }
  function signUp() {
    return fetch("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + encodeURIComponent(F.apiKey), {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnSecureToken: true })
    }).then(json).then(function (j) {
      auth.id = j.idToken; auth.refresh = j.refreshToken; auth.uid = j.localId;
      auth.exp = Date.now() + (+j.expiresIn) * 1000; saveAuth();
    });
  }
  function json(r) {
    return r.json().then(function (j) {
      if (!r.ok || j.error) throw new Error((j.error && (j.error.message || j.error)) || r.status);
      return j;
    });
  }
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      signIn().then(startStreams).catch(retryLater);
    }, Math.max(60000, auth.exp - Date.now() - 5 * 60000));
  }

  // ---------- Base de données (REST + flux temps réel)
  function url(path) { return DB + "/" + path + ".json?auth=" + encodeURIComponent(auth.id); }
  function rest(method, path, body) {
    return fetch(url(path), { method: method, headers: { "Content-Type": "application/json" }, body: body == null ? undefined : JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error("db " + r.status); return r.json(); });
  }
  var NOW = { ".sv": "timestamp" };
  function stream(path, onData) {
    var es = new EventSource(url(path));
    function handle(e) { try { var m = JSON.parse(e.data); onData(m.path, m.data, e.type); } catch (x) {} }
    es.addEventListener("put", handle);
    es.addEventListener("patch", handle);
    es.addEventListener("auth_revoked", function () { es.close(); signIn().then(startStreams).catch(retryLater); });
    es.addEventListener("cancel", function () { es.close(); retryLater(); });
    return es;
  }

  // ---------- Appairage
  var ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I pour éviter les confusions
  function randomCode() {
    var a = new Uint32Array(8), s = "";
    window.crypto.getRandomValues(a);
    for (var i = 0; i < 8; i++) s += ALPHA.charAt(a[i] % ALPHA.length);
    return s;
  }
  function newPairCode() {
    clearTimeout(pairTimer);
    var old = pairCode;
    pairCode = randomCode();
    if (old) rest("DELETE", "pairing/" + old).catch(function () {});
    return rest("PUT", "pairing/" + pairCode, { tvUid: auth.uid, ts: NOW }).then(function () {
      $("linkCode").textContent = pairCode;
      var link = (cfg.urlTelecommande || "").replace(/\/+$/, "") + "/?code=" + pairCode;
      var qr = qrcode(0, "M"); qr.addData(link); qr.make();
      $("linkQr").innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
      setStatus("wait", "En attente du téléphone…");
      pairTimer = setTimeout(newPairCode, 10 * 60000);
    });
  }
  function clearPairCode() {
    clearTimeout(pairTimer);
    if (pairCode) rest("DELETE", "pairing/" + pairCode).catch(function () {});
    pairCode = null;
    $("linkCode").textContent = "—";
    $("linkQr").innerHTML = '<div style="font-size:160px">✅</div>';
  }

  // ---------- Commandes reçues (liste blanche)
  var TYPES = { jarvis: 1, key: 1, go: 1, app: 1, timer: 1, clear: 1 };
  function onCmds(path, data) {
    var list = {};
    if (path === "/") list = data || {};
    else list[path.replace(/^\//, "").split("/")[0]] = data;
    Object.keys(list).forEach(function (id) {
      var c = list[id];
      if (!c || done[id]) return;
      done[id] = 1;
      rest("DELETE", "house/cmd/" + auth.uid + "/" + id).catch(function () {});
      if (!TYPES[c.type] || typeof c.ts !== "number" || Date.now() - c.ts > 3 * 60000) return; // trop vieille = ignorée
      var arg = typeof c.arg === "string" ? c.arg.slice(0, 40) : "";
      switch (c.type) {
        case "jarvis":
          if (typeof c.text !== "string") return;
          T.jarvis(c.text.slice(0, 500)).then(function (txt) {
            if (txt) rest("POST", "house/reply/" + auth.uid, { text: String(txt).slice(0, 2000), cmd: id, ts: NOW }).catch(function () {});
          });
          break;
        case "key": T.key(arg); break;
        case "go": T.go(arg); break;
        case "app": T.app(arg); break;
        case "timer": T.timer(arg); break;
        case "clear": clearBoard(); break;
      }
    });
  }

  // ---------- Tableau à dessin (traits envoyés par le téléphone)
  function onDraw(path, data) {
    if (!window.Board) return;
    if (path === "/") {
      window.Board.reset();
      if (data) Object.keys(data).forEach(function (id) { window.Board.add(id, data[id]); });
    } else {
      var id = path.replace(/^\//, "").split("/")[0];
      if (data) window.Board.add(id, data, true);
    }
  }
  function clearBoard() {
    if (window.Board) window.Board.reset();
    rest("DELETE", "house/draw/" + auth.uid).catch(function () {});
  }

  // ---------- Démarrage des flux
  var linkHooks = [], hooksOn = false;
  function closeStreams() {
    if (cmdStream) { cmdStream.close(); cmdStream = null; }
    if (drawStream) { drawStream.close(); drawStream = null; }
    if (hooksOn) { hooksOn = false; linkHooks.forEach(function (fn) { try { fn(false); } catch (e) {} }); }
  }
  var drawStream = null;
  function startStreams() {
    scheduleRefresh();
    if (tvStream) tvStream.close();
    closeStreams(); // relancés avec le nouveau jeton (sinon tout s'arrête au bout d'1 h)
    tvStream = stream("house/tvs/" + auth.uid, function (path, data) {
      var paired = !(path === "/" && !data);
      if (paired) {
        if (window.LinkStatus !== "ok") { clearPairCode(); setStatus("ok", "Téléphone connecté ✓"); }
        if (!cmdStream) cmdStream = stream("house/cmd/" + auth.uid, onCmds);
        if (!drawStream) drawStream = stream("house/draw/" + auth.uid, onDraw);
        if (!hooksOn) { hooksOn = true; linkHooks.forEach(function (fn) { try { fn(true); } catch (e) {} }); }   // messages, courses… (maison.js)
      } else {
        closeStreams();
        newPairCode().catch(retryLater);
      }
    });
  }

  // Accès Firebase pour les autres modules (jeu Undercover, tableau)
  window.Fire = {
    ready: function () { return window.LinkStatus === "ok" && !!auth.uid; },
    uid: function () { return auth.uid; },
    rest: rest, stream: stream, NOW: NOW,
    clearBoard: clearBoard,
    onLink: function (fn) { linkHooks.push(fn); if (hooksOn) fn(true); },
    phoneUrl: function () { return (cfg.urlTelecommande || "").replace(/\/+$/, ""); }
  };
  var retryT;
  function retryLater() {
    setStatus("off", "Connexion impossible, nouvel essai dans 1 min…");
    clearTimeout(retryT);
    retryT = setTimeout(function () { signIn().then(startStreams).catch(retryLater); }, 60000);
  }

  $("linkForget")._onOk = function () {
    rest("DELETE", "house/tvs/" + auth.uid).then(function () {
      T.toast("Tous les téléphones ont été déconnectés");
    }).catch(function () { T.toast("Impossible pour l'instant"); });
  };

  signIn().then(startStreams).catch(retryLater);
})();
