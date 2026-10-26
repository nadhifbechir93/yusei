/* ================================================================
   FONDS D'ÉCRAN DESSINÉS DANS L'APPLI (aucune connexion nécessaire)
   Paysages de montagnes, lac, dunes ou aurore, avec des couleurs
   qui suivent l'heure : aube, jour, coucher de soleil, nuit étoilée.
   ================================================================ */
(function () {
  "use strict";
  var W = 1920, H = 1080;

  function rng(seed) { // générateur pseudo-aléatoire reproductible
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  }
  function mix(a, b, t) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
  function css(c, a) { return a == null ? "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")" : "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  // Palettes selon le moment de la journée : [haut du ciel, horizon, astre, relief lointain, relief proche]
  var PAL = {
    aube:   [[64, 84, 160], [255, 176, 140], [255, 232, 190], [118, 104, 160], [44, 46, 86]],
    jour:   [[58, 128, 214], [176, 214, 240], [255, 250, 225], [92, 132, 170], [34, 80, 88]],
    soir:   [[52, 44, 110], [255, 128, 84], [255, 214, 140], [120, 70, 110], [40, 26, 58]],
    nuit:   [[8, 14, 38], [36, 52, 98], [235, 238, 255], [30, 42, 78], [10, 16, 34]]
  };
  function moment(h) { return h >= 6 && h < 9 ? "aube" : h >= 9 && h < 17 ? "jour" : h >= 17 && h < 20 ? "soir" : "nuit"; }

  function ridge(ctx, r, base, amp, color, rough) {
    ctx.beginPath(); ctx.moveTo(0, H);
    var y = base, p1 = r() * 6, p2 = r() * 6, f1 = 0.0016 + r() * 0.002, f2 = 0.006 + r() * 0.006;
    for (var x = 0; x <= W; x += 8) {
      y = base - amp * (0.55 * Math.sin(x * f1 + p1) + 0.3 * Math.sin(x * f2 + p2) + rough * (r() - 0.5));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }

  function draw(seed, hour) {
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d"), r = rng(seed), m = moment(hour), P = PAL[m];
    var scene = ["montagnes", "lac", "dunes", "aurore"][Math.floor(r() * 4)];
    if (scene === "aurore" && m !== "nuit") scene = "montagnes";

    // ciel
    var g = ctx.createLinearGradient(0, 0, 0, H * 0.75);
    g.addColorStop(0, css(P[0])); g.addColorStop(1, css(P[1]));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // étoiles la nuit
    if (m === "nuit") {
      for (var i = 0; i < 260; i++) {
        ctx.fillStyle = "rgba(255,255,255," + (0.25 + r() * 0.7).toFixed(2) + ")";
        var s = r() < 0.08 ? 2.4 : 1.3; ctx.fillRect(r() * W, r() * H * 0.6, s, s);
      }
    }
    // aurore boréale
    if (scene === "aurore") {
      for (var k = 0; k < 3; k++) {
        var ag = ctx.createLinearGradient(0, 120, 0, 620);
        var col = [[80, 255, 180], [120, 200, 255], [190, 120, 255]][k];
        ag.addColorStop(0, css(col, 0)); ag.addColorStop(0.5, css(col, 0.28)); ag.addColorStop(1, css(col, 0));
        ctx.fillStyle = ag; ctx.beginPath(); ctx.moveTo(0, 640);
        var ph = r() * 6;
        for (var x = 0; x <= W; x += 20) ctx.lineTo(x, 260 + k * 60 + 90 * Math.sin(x / 260 + ph));
        for (var x2 = W; x2 >= 0; x2 -= 20) ctx.lineTo(x2, 520 + k * 40 + 60 * Math.sin(x2 / 300 + ph + 1));
        ctx.closePath(); ctx.fill();
      }
    }
    // soleil / lune avec halo
    var sx = 300 + r() * (W - 600), sy = m === "jour" ? 180 + r() * 120 : 300 + r() * 160, sr = m === "nuit" ? 60 : 90;
    var halo = ctx.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 5);
    halo.addColorStop(0, css(P[2], 0.55)); halo.addColorStop(1, css(P[2], 0));
    ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = css(P[2]); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();

    // reliefs
    if (scene === "dunes") {
      for (var d = 0; d < 4; d++) ridge(ctx, r, 620 + d * 120, 80 - d * 10, css(mix(mix(P[1], [214, 150, 90], 0.6), P[4], d / 3.4)), 0.02);
    } else {
      var layers = 5;
      for (var l = 0; l < layers; l++) {
        var t = l / (layers - 1);
        ridge(ctx, r, 520 + l * 95, 230 - l * 32, css(mix(P[3], P[4], t)), scene === "montagnes" ? 0.12 : 0.05);
      }
      if (scene === "lac") { // lac avec reflet de l'astre
        var lg = ctx.createLinearGradient(0, 840, 0, H);
        lg.addColorStop(0, css(mix(P[1], P[0], 0.4), 0.95)); lg.addColorStop(1, css(P[0], 0.95));
        ctx.fillStyle = lg; ctx.fillRect(0, 860, W, H - 860);
        for (var w = 0; w < 26; w++) {
          ctx.fillStyle = css(P[2], 0.06 + r() * 0.18);
          ctx.fillRect(sx - 120 + r() * 240 - 60, 880 + w * 8, 120 + r() * 120, 3);
        }
      }
    }
    // léger voile pour la lisibilité du texte
    var v = ctx.createLinearGradient(0, H * 0.55, 0, H);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    try { return cv.toDataURL("image/jpeg", 0.88); } catch (e) { return cv.toDataURL(); }
  }

  var n = Math.floor(Math.random() * 1000);
  window.Wallpaper = {
    next: function () { n++; return draw(n * 7919 + new Date().getDate(), new Date().getHours()); },
    draw: draw, moment: moment
  };
})();
