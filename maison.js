/* ================================================================
   ONGLET MAISON — messages, courses, pense-bêtes, photo, compte à
   rebours, tuiles, et lancement du quiz. Tout passe par ta base
   Firebase : ça marche aussi quand tu n'es pas à la maison.
   ================================================================ */
(function () {
  "use strict";
  var Y = window.Yusei, db = Y.db, TS = Y.TS, $ = function (id) { return document.getElementById(id); };
  var refs = [], tv = null, prefs = {}, photoData = null;
  var TILES = ["Météo", "Transports en commun", "Agenda", "Courses", "Télévision", "Toutes mes applis", "Quiz en famille", "Enfants", "Tableau", "Undercover", "Minuteur", "Photos", "YouTube", "Netflix", "Prime Video"];
  var CATS = [["melange", "Mélange"], ["culture", "Culture générale"], ["france", "France"], ["japon", "Japon"], ["sciences", "Sciences et maths"], ["enfants", "Spécial enfants"]];
  var qcat = "melange";

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function sorted(v, key) { return Object.keys(v || {}).map(function (k) { return { id: k, v: v[k] }; }).filter(function (x) { return x.v && typeof x.v === "object"; }).sort(function (a, b) { return (a.v[key] || 0) - (b.v[key] || 0); }); }
  function fail() { Y.toast("Refusé : vérifie que la télé est bien reliée", true); }
  function watch(path, cb) { var r = db.ref(path); r.on("value", function (s) { cb(s.val()); }, function () {}); refs.push(r); }

  Y.onTv(function (id) {
    refs.forEach(function (r) { try { r.off(); } catch (e) {} }); refs = []; tv = id;
    watch("house/notes/" + tv, drawNotes);
    watch("house/courses/" + tv, drawCourses);
    watch("house/rappels/" + tv, drawRappels);
    watch("house/prefs/" + tv, function (v) { prefs = v || {}; drawPrefs(); });
  });

  // ---------- Messages
  $("noteForm").onsubmit = function (e) {
    e.preventDefault();
    var t = $("noteText").value.replace(/\s+/g, " ").trim().slice(0, 200);
    if (!t || !tv) return;
    db.ref("house/notes/" + tv).push().set({ text: t, ts: TS }).then(function () { $("noteText").value = ""; Y.vibrate(); Y.toast("Message envoyé à la télé"); }, fail);
  };
  function drawNotes(v) {
    var ul = $("noteList"); ul.innerHTML = "";
    sorted(v, "ts").reverse().forEach(function (n) {
      var li = el("li"), sp = el("span", "it-t", n.v.text), x = el("button", "x", "×");
      x.setAttribute("aria-label", "Supprimer"); x.onclick = function () { db.ref("house/notes/" + tv + "/" + n.id).remove().catch(fail); };
      li.appendChild(sp); li.appendChild(x); ul.appendChild(li);
    });
  }

  // ---------- Courses
  $("csForm").onsubmit = function (e) {
    e.preventDefault();
    var t = $("csText").value.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!t || !tv) return;
    t = t.charAt(0).toUpperCase() + t.slice(1);
    db.ref("house/courses/" + tv).push().set({ t: t, ts: TS }).then(function () { $("csText").value = ""; Y.vibrate(); }, fail);
  };
  var courses = {};
  function drawCourses(v) {
    courses = v || {};
    var ul = $("csItems"); ul.innerHTML = "";
    var l = sorted(v, "ts").filter(function (c) { return typeof c.v.t === "string"; });
    l.sort(function (a, b) { return (a.v.done ? 1 : 0) - (b.v.done ? 1 : 0); });
    if (!l.length) ul.appendChild(el("li", "empty", "La liste est vide."));
    l.forEach(function (c) {
      var li = el("li", c.v.done ? "done" : ""), box = el("button", "chk" + (c.v.done ? " on" : "")), sp = el("span", "it-t", c.v.t), x = el("button", "x", "×");
      box.setAttribute("aria-label", c.v.done ? "Décocher" : "Cocher");
      box.onclick = function () { Y.vibrate(); db.ref("house/courses/" + tv + "/" + c.id).set({ t: c.v.t, done: !c.v.done, ts: c.v.ts }).catch(fail); };
      sp.onclick = box.onclick;
      x.onclick = function () { db.ref("house/courses/" + tv + "/" + c.id).remove().catch(fail); };
      li.appendChild(box); li.appendChild(sp); li.appendChild(x); ul.appendChild(li);
    });
  }
  $("csCleanTel").onclick = function () {
    Object.keys(courses).forEach(function (k) { if (courses[k] && courses[k].done) db.ref("house/courses/" + tv + "/" + k).remove().catch(function () {}); });
  };

  // ---------- Pense-bêtes
  (function () { var d = new Date(Date.now() + 3600000); d.setMinutes(0, 0, 0); $("rpAt").value = local(d); })();
  function local(d) { function p(n) { return ("0" + n).slice(-2); } return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()); }
  $("rpForm").onsubmit = function (e) {
    e.preventDefault();
    var t = $("rpText").value.replace(/\s+/g, " ").trim().slice(0, 120), at = new Date($("rpAt").value).getTime();
    if (!t || !tv) return;
    if (!at || at < Date.now() - 60000) { Y.toast("Choisis une heure à venir", true); return; }
    db.ref("house/rappels/" + tv).push().set({ text: t, at: at, ts: TS }).then(function () { $("rpText").value = ""; Y.vibrate(); Y.toast("Pense-bête programmé"); }, fail);
  };
  function drawRappels(v) {
    var ul = $("rpList"); ul.innerHTML = "";
    sorted(v, "at").forEach(function (r) {
      var d = new Date(r.v.at), li = el("li");
      li.appendChild(el("span", "it-w", d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }) + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })));
      li.appendChild(el("span", "it-t", r.v.text));
      var x = el("button", "x", "×"); x.onclick = function () { db.ref("house/rappels/" + tv + "/" + r.id).remove().catch(fail); };
      li.appendChild(x); ul.appendChild(li);
    });
  }

  // ---------- Photo (réduite et compressée sur le téléphone avant l'envoi)
  $("phFile").onchange = function () {
    var f = this.files && this.files[0]; if (!f) return;
    var img = new Image(), url = URL.createObjectURL(f);
    img.onload = function () {
      var W = 1600, s = Math.min(1, W / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      var q = 0.82, d = c.toDataURL("image/jpeg", q);
      while (d.length > 440000 && q > 0.35) { q -= 0.08; d = c.toDataURL("image/jpeg", q); }
      if (d.length > 440000) { c.width = Math.round(c.width * 0.7); c.height = Math.round(c.height * 0.7); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); d = c.toDataURL("image/jpeg", 0.7); }
      URL.revokeObjectURL(url);
      photoData = d; $("phPrev").style.backgroundImage = "url('" + d + "')"; $("phPrev").classList.add("on"); $("phSend").disabled = false;
    };
    img.src = url;
  };
  $("phSend").onclick = function () {
    if (!photoData || !tv) return;
    $("phSend").disabled = true;
    db.ref("house/photo/" + tv).set({ d: photoData, fond: $("phFond").checked, ts: TS }).then(function () { Y.vibrate(); Y.toast("Photo envoyée à la télé"); $("phSend").disabled = false; }, function () { fail(); $("phSend").disabled = false; });
  };

  // ---------- Compte à rebours + tuiles masquées (un seul enregistrement « préférences »)
  function savePrefs(p) {
    var o = { ts: TS };
    if (p.compte && p.compte.titre && p.compte.date) o.compte = { titre: p.compte.titre, date: p.compte.date };
    if (typeof p.masquer === "string") o.masquer = p.masquer;
    return db.ref("house/prefs/" + tv).set(o);
  }
  $("cdForm").onsubmit = function (e) {
    e.preventDefault();
    var t = $("cdTitle").value.trim().slice(0, 40), d = $("cdDate").value;
    if (!tv) return;
    var p = { compte: t && /^\d{4}-\d{2}-\d{2}$/.test(d) ? { titre: t, date: d } : null, masquer: prefs.masquer || "" };
    savePrefs(p).then(function () { Y.vibrate(); Y.toast(p.compte ? "Compte à rebours enregistré" : "Compte à rebours retiré"); }, fail);
  };
  function drawPrefs() {
    var c = prefs.compte;
    if (c && c.titre) {
      $("cdTitle").value = c.titre; $("cdDate").value = c.date;
      var p = c.date.split("-"), n = Math.round((new Date(+p[0], +p[1] - 1, +p[2]) - new Date(new Date().toDateString())) / 864e5);
      $("cdNow").textContent = n >= 0 ? "Sur la télé : « " + c.titre + " : J-" + n + " »" : "La date est passée.";
    } else $("cdNow").textContent = "Aucun compte à rebours. Laisse le titre vide pour le retirer.";
    var hidden = String(prefs.masquer || "").toLowerCase().split(",").map(function (x) { return x.trim(); });
    var box = $("tilesBox"); box.innerHTML = "";
    TILES.forEach(function (t) {
      var off = hidden.indexOf(t.toLowerCase()) >= 0, b = el("button", "chip" + (off ? " off" : " on"), t);
      b.onclick = function () {
        var list = TILES.filter(function (x) { var h = hidden.indexOf(x.toLowerCase()) >= 0; return x === t ? !h : h; });
        savePrefs({ compte: prefs.compte, masquer: list.join(",") }).catch(fail);
      };
      box.appendChild(b);
    });
  }

  // ---------- Quiz
  CATS.forEach(function (c) {
    var b = el("button", "chip" + (c[0] === qcat ? " on" : ""), c[1]);
    b.onclick = function () { qcat = c[0]; Array.prototype.forEach.call($("qzCats").children, function (x) { x.className = "chip" + (x === b ? " on" : ""); }); };
    $("qzCats").appendChild(b);
  });
  $("btnQuiz").onclick = function () { Y.send("go", { arg: "quiz:" + qcat }); Y.toast("Le quiz s'ouvre sur la télé"); };
})();
