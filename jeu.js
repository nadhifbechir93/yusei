/* ================================================================
   UNDERCOVER — page des invités (aucun compte nécessaire)
   Connexion anonyme : l'invité ne peut que rejoindre la partie
   et lire SON mot. Il n'a aucun accès à la télé ni à la maison.
   ================================================================ */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var gid = (new URLSearchParams(location.search).get("g") || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 24);
  function show(id) { ["sJoin", "sWait", "sWord", "sOut", "sEnd", "sGone"].forEach(function (s) { $(s).classList.toggle("on", s === id); }); }
  if (gid.length < 16) { show("sGone"); return; }
  history.replaceState(null, "", location.pathname + "?g=" + gid);

  firebase.initializeApp(window.FIREBASE_CONFIG);
  var auth = firebase.auth(), db = firebase.database(), TS = firebase.database.ServerValue.TIMESTAMP;
  var uid = null, myName = localStorage.getItem("uc_name") || "", word = null, revealed = false, meta = null;
  var ROLE_TXT = { civil: "Civil", under: "Undercover", white: "Mr White" };
  $("name").value = myName;

  auth.signInAnonymously().then(function (c) {
    uid = c.user.uid;
    db.ref("games/" + gid + "/meta").on("value", function (s) {
      meta = s.val();
      if (!meta) { show("sGone"); return; }
      refresh();
    }, function () { show("sGone"); });
    db.ref("games/" + gid + "/secret/" + uid).on("value", function (s) {
      word = s.val(); revealed = false; refresh();
    }, function () {});
  }).catch(function () { $("err").textContent = "Connexion impossible. Vérifie ta connexion Internet."; show("sJoin"); });

  var joined = false;
  $("fJoin").onsubmit = function (e) {
    e.preventDefault();
    var n = $("name").value.replace(/\s+/g, " ").trim().slice(0, 20);
    if (!n || !uid) return;
    db.ref("games/" + gid + "/players/" + uid).set({ name: n, ts: TS }).then(function () {
      joined = true; myName = n; localStorage.setItem("uc_name", n); $("me").textContent = n; refresh();
    }).catch(function () { $("err").textContent = "La partie a déjà commencé ou n'existe plus."; });
  };

  function refresh() {
    if (!meta) return;
    var out = meta.out || {};
    if (meta.state === "end" && word && meta.round === word.round) {
      var w = meta.winner;
      $("endTxt").textContent = w === "civil" ? "Les civils gagnent !" : w === "under" ? "Les infiltrés gagnent !" : w === "white" ? "Mr White gagne !" : "Fin de la manche";
      var words = meta.words || {};
      $("endWords").innerHTML = "";
      [["Civils", words.civil], ["Infiltrés", words.under]].forEach(function (p) {
        var d = document.createElement("div"), sp = document.createElement("span"), b = document.createElement("b");
        sp.textContent = p[0]; b.textContent = p[1] || "?"; d.appendChild(sp); d.appendChild(b); $("endWords").appendChild(d);
      });
      show("sEnd"); return;
    }
    if (meta.state === "play" && word && meta.round === word.round) {
      if (out[uid]) { $("outTxt").textContent = "Tu as été éliminé. Tu étais : " + (ROLE_TXT[out[uid]] || "?") + "."; show("sOut"); return; }
      drawCard(); show("sWord"); return;
    }
    if (meta.state === "lobby" && joined) { show("sWait"); return; }
    if (meta.state !== "lobby" && !word) { $("err").textContent = "La partie est en cours : attends la prochaine."; }
    show("sJoin");
  }
  function drawCard() {
    var c = $("card");
    if (!revealed) { c.className = "card hidden"; $("cardTxt").textContent = "Appuie pour voir ton mot"; return; }
    c.className = word.white ? "card white" : "card";
    $("cardTxt").textContent = word.white ? "Tu es Mr White 🎩 (tu n'as pas de mot : écoute et bluffe !)" : word.w;
  }
  $("card").onclick = function () { revealed = !revealed; if (navigator.vibrate) navigator.vibrate(10); drawCard(); };
})();
