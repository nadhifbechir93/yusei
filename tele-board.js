/* ================================================================
   TABLEAU À DESSIN — les traits arrivent du téléphone en direct
   Coordonnées reçues : x 0..1000, y 0..563 (format 16:9)
   ================================================================ */
(function () {
  "use strict";
  var T = window.MaTele, cv = document.getElementById("board"), ctx = cv.getContext("2d");
  var K = 1.92, strokes = {};
  function bg() {
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = "rgba(17,24,39,.06)";
    for (var x = 48; x < cv.width; x += 48) for (var y = 48; y < cv.height; y += 48) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
  function valid(s) {
    return s && typeof s.p === "string" && s.p.length <= 6000 && /^[0-9;,]*$/.test(s.p) &&
      typeof s.c === "string" && /^#[0-9a-fA-F]{6}$/.test(s.c) && typeof s.w === "number" && s.w >= 1 && s.w <= 40;
  }
  function draw(s) {
    var pts = s.p.split(";").map(function (q) { var a = q.split(","); return [(+a[0]) * K, (+a[1]) * K]; })
      .filter(function (p) { return isFinite(p[0]) && isFinite(p[1]); });
    if (!pts.length) return;
    ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = s.w * K; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], s.w * K / 2, 0, 7); ctx.fill(); return; }
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  window.Board = {
    reset: function () { strokes = {}; bg(); },
    add: function (id, s, live) {
      if (strokes[id] || !valid(s)) return;   // trait déjà dessiné ou trait invalide : ignoré
      strokes[id] = 1; draw(s);
      document.getElementById("boardHint").style.opacity = "0";
      if (live && T.active() !== "draw" && T.active() !== "undercover") T.show("draw");
    }
  };
  document.getElementById("boardClear")._onOk = function () {
    if (window.Fire && window.Fire.ready()) window.Fire.clearBoard(); else window.Board.reset();
    document.getElementById("boardHint").style.opacity = "1";
  };
  bg();
})();
