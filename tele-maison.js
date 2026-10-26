/* ================================================================
   MAISON — ce que tu envoies depuis la télécommande, même de dehors :
   messages, liste de courses, pense-bêtes, photo, compte à rebours,
   tuiles masquées. Tout est gardé dans ta base Firebase et s'affiche
   dès que la télé est allumée (sécurité : règles Firebase).
   ================================================================ */
(function () {
  "use strict";
  var T = window.MaTele, $ = function (id) { return document.getElementById(id); }, esc = T.esc;
  var notes = {}, courses = {}, rappels = {}, prefs = {}, uid = null, timer = null;
  var seenKey = "matele_notes_vues", seen = {};
  try { seen = JSON.parse(localStorage.getItem(seenKey) || "{}"); } catch (e) {}
  function F() { return window.Fire; }
  function list(o) { return Object.keys(o || {}).map(function (k) { var v = o[k]; return v && typeof v === "object" ? { id: k, v: v } : null; }).filter(Boolean); }
  function merge(store, path, data) {
    if (path === "/") { Object.keys(store).forEach(function (k) { delete store[k]; }); if (data && typeof data === "object") Object.keys(data).forEach(function (k) { store[k] = data[k]; }); return; }
    var p = path.replace(/^\//, "").split("/");
    if (p.length === 1) { if (data == null) delete store[p[0]]; else store[p[0]] = data; }
    else if (store[p[0]]) { if (data == null) delete store[p[0]][p[1]]; else store[p[0]][p[1]] = data; }
  }
  function txt(s, n) { return String(s == null ? "" : s).replace(/[\u0000-\u001f]/g, " ").slice(0, n); }

  // ---------- Messages à distance
  var lastJ = {};
  function same(k, data) { var j = JSON.stringify(data || null); if (lastJ[k] === j) return true; lastJ[k] = j; return false; }
  function onNotes(path, data) {
    if (path === "/" && same("notes", data)) return;
    merge(notes, path, data);
    var now = Date.now();
    list(notes).forEach(function (n) {
      if (typeof n.v.ts !== "number" || now - n.v.ts > 48 * 3600000) { F().rest("DELETE", "house/notes/" + uid + "/" + n.id).catch(function () {}); delete notes[n.id]; return; }
      if (!seen[n.id]) {
        seen[n.id] = now; saveSeen();
        T.notify("Message de la maison", txt(n.v.text, 200), true);   // affiché + dit une fois
      }
    });
    T.rebuild();
  }
  function saveSeen() {
    var keep = {}; Object.keys(seen).forEach(function (k) { if (Date.now() - seen[k] < 7 * 864e5) keep[k] = seen[k]; }); seen = keep;
    try { localStorage.setItem(seenKey, JSON.stringify(seen)); } catch (e) {}
  }
  function notesSorted() { return list(notes).sort(function (a, b) { return b.v.ts - a.v.ts; }); }

  // ---------- Liste de courses
  function onCourses(path, data) { if (path === "/" && same("courses", data)) return; merge(courses, path, data); drawCourses(); T.rebuild(); }
  function courseList() { return list(courses).filter(function (c) { return typeof c.v.t === "string"; }).sort(function (a, b) { return (a.v.done ? 1 : 0) - (b.v.done ? 1 : 0) || a.v.ts - b.v.ts; }); }
  function drawCourses() {
    var el = $("csList"); if (!el) return;
    var l = courseList(), cur = document.querySelector("#csList .cs-item.focused"), curId = cur && cur.getAttribute("data-cid");
    if (!F() || !F().ready()) { el.innerHTML = '<div class="cs-empty">La liste de courses a besoin de la liaison avec le téléphone (Réglages › Connecter mon téléphone).</div>'; return; }
    if (!l.length) { el.innerHTML = '<div class="cs-empty">La liste est vide. Dis à Yusei : « ajoute du pain », ou ajoute depuis ton téléphone.</div>'; return; }
    el.innerHTML = l.map(function (c) {
      return '<div class="cs-item focusable' + (c.v.done ? " done" : "") + '" data-cid="' + esc(c.id) + '"><span class="cs-box"></span><span class="cs-t">' + esc(txt(c.v.t, 60)) + "</span></div>";
    }).join("");
    Array.prototype.forEach.call(el.querySelectorAll(".cs-item"), function (it) {
      it._onOk = function () { var c = courses[it.getAttribute("data-cid")]; if (c) toggle(it.getAttribute("data-cid"), !c.done); };
      if (curId && it.getAttribute("data-cid") === curId) T.focusEl(it);
    });
    if (cur && !curId) T.focusFirst();
  }
  function refreshCourses() { if (uid) F().rest("GET", "house/courses/" + uid).then(function (d) { onCourses("/", d); }, function () {}); }
  function toggle(id, done) {
    var c = courses[id]; if (!c || !F()) return;
    F().rest("PUT", "house/courses/" + uid + "/" + id, { t: c.t, done: !!done, ts: c.ts }).then(refreshCourses, function () { T.toast("Impossible de modifier la liste"); });
  }
  function norm(s) { return String(s || "").toLowerCase().normalize ? String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim() : String(s || "").toLowerCase().trim(); }
  function addCourse(t) {
    t = txt(t, 60).trim(); if (!t) return false;
    if (!F() || !F().ready()) { T.toast("Relie d'abord ton téléphone pour la liste de courses"); return false; }
    if (courseList().some(function (c) { return norm(c.v.t) === norm(t) && !c.v.done; })) return true;   // déjà dans la liste
    F().rest("POST", "house/courses/" + uid, { t: t.charAt(0).toUpperCase() + t.slice(1), ts: F().NOW }).then(refreshCourses, function () { T.toast("Impossible d'ajouter à la liste"); });
    return true;
  }
  function delCourse(t) {
    var n = norm(t), hit = courseList().filter(function (c) { return norm(c.v.t).indexOf(n) >= 0 || n.indexOf(norm(c.v.t)) >= 0; });
    hit.forEach(function (c) { F().rest("DELETE", "house/courses/" + uid + "/" + c.id).then(refreshCourses, function () {}); });
    return hit.length > 0;
  }
  if ($("csClean")) $("csClean")._onOk = function () {
    var d = courseList().filter(function (c) { return c.v.done; });
    d.forEach(function (c) { F().rest("DELETE", "house/courses/" + uid + "/" + c.id).then(refreshCourses, function () {}); });
    T.toast(d.length ? d.length + " article(s) retiré(s)" : "Aucun article coché");
  };
  T.onShow.courses = drawCourses;

  // ---------- Pense-bêtes (affichés et dits à l'heure prévue)
  function onRappels(path, data) { if (path === "/" && same("rappels", data)) return; merge(rappels, path, data); checkRappels(); }
  function checkRappels() {
    var now = Date.now();
    list(rappels).forEach(function (r) {
      if (typeof r.v.at !== "number" || r.v.at > now) return;
      delete rappels[r.id];
      F().rest("DELETE", "house/rappels/" + uid + "/" + r.id).catch(function () {});
      if (now - r.v.at < 6 * 3600000) T.notify("Pense-bête", txt(r.v.text, 120), true);   // trop vieux (télé éteinte) : ignoré
    });
  }

  // ---------- Photo envoyée du téléphone
  var lastPhoto = 0;
  try { lastPhoto = +localStorage.getItem("matele_photo_ts") || 0; } catch (e) {}
  function onPhoto(path, data) {
    if (path !== "/") return;   // la photo est toujours envoyée en entier
    if (!data || typeof data.d !== "string" || data.d.indexOf("data:image/jpeg;base64,") !== 0 || typeof data.ts !== "number") return;
    if (data.ts <= lastPhoto) return;
    lastPhoto = data.ts;
    try { localStorage.setItem("matele_photo_ts", String(lastPhoto)); } catch (e) {}
    var src = data.d;
    $("ppImg").style.backgroundImage = "url('" + src + "')";
    $("ppCap").textContent = data.fond ? "Photo reçue du téléphone · elle devient ton fond d'écran" : "Photo reçue du téléphone";
    document.body.classList.add("photo-on"); T.poke();
    setTimeout(function () { document.body.classList.remove("photo-on"); }, 20000);
    if (data.fond) {
      try { localStorage.setItem("matele_fond_perso", src); } catch (e) {}
      T.setBg(src); T.refreshPhotos && T.refreshPhotos();
    }
  }
  document.addEventListener("keydown", function (e) { if (document.body.classList.contains("photo-on")) { document.body.classList.remove("photo-on"); e.stopImmediatePropagation(); e.preventDefault(); } }, true);

  // ---------- Préférences : compte à rebours, tuiles masquées
  function onPrefs(path, data) {
    if (path === "/" && same("prefs", data)) return;
    if (path === "/") prefs = data && typeof data === "object" ? data : {};
    else merge(prefs, path, data);
    var before = (window.__prefs && window.__prefs.masquer) || "";
    window.__prefs = { masquer: typeof prefs.masquer === "string" ? prefs.masquer : "" };
    T.rebuild(before !== window.__prefs.masquer);
  }
  function countdownText() {
    var c = prefs.compte;
    if (!c || typeof c.titre !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(c.date || "")) return "";
    var p = c.date.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]), t = new Date(); t.setHours(0, 0, 0, 0);
    var n = Math.round((d - t) / 864e5);
    if (n < 0) return "";
    return n === 0 ? txt(c.titre, 40) + " : c'est aujourd'hui !" : txt(c.titre, 40) + " : J-" + n;
  }

  // ---------- Démarrage / arrêt avec la liaison du téléphone
  // Relevé régulier plutôt que des flux permanents : la télé (navigateur 2018) limite à 6 connexions
  // simultanées vers Firebase, déjà utilisées par la télécommande, le dessin et les jeux.
  var lastPhotoTs = null, polling = false;
  function get(p) { return F().rest("GET", p); }
  function pollAll() {
    if (!uid || !F() || !F().ready()) return;
    get("house/notes/" + uid).then(function (d) { onNotes("/", d); }, function () {});
    get("house/courses/" + uid).then(function (d) { onCourses("/", d); }, function () {});
    get("house/rappels/" + uid).then(function (d) { onRappels("/", d); }, function () {});
    get("house/prefs/" + uid).then(function (d) { onPrefs("/", d); }, function () {});
    get("house/photo/" + uid + "/ts").then(function (ts) {   // la photo (lourde) n'est téléchargée que si elle a changé
      if (typeof ts === "number" && ts !== lastPhotoTs && ts > lastPhoto) {
        lastPhotoTs = ts; get("house/photo/" + uid).then(function (d) { onPhoto("/", d); }, function () {});
      }
    }, function () {});
  }
  var fastT = null;
  function stop() { clearInterval(timer); clearInterval(fastT); polling = false; }
  function start() {
    stop(); uid = F().uid(); polling = true;
    pollAll();
    timer = setInterval(function () { pollAll(); checkRappels(); }, 8000);
    // écran Courses ouvert : liste rafraîchie plus souvent
    fastT = setInterval(function () { if (T.active() === "courses") get("house/courses/" + uid).then(function (d) { onCourses("/", d); }, function () {}); }, 2500);
  }
  if (F() && F().onLink) F().onLink(function (on) { if (on) start(); else stop(); });

  // Fond d'écran personnel déjà reçu (gardé sur la télé)

  window.Maison = {
    addCourse: addCourse, delCourse: delCourse,
    notesText: function () { var n = notesSorted(); return n.length ? "Message : « " + txt(n[0].v.text, 120) + " »" + (n.length > 1 ? " (+" + (n.length - 1) + ")" : "") : ""; },
    countdownText: countdownText,
    coursesText: function () { var l = courseList().filter(function (c) { return !c.v.done; }); return l.map(function (c) { return c.v.t; }).join(", "); },
    chips: function () {
      var out = [], n = notesSorted(), cd = countdownText(), l = courseList().filter(function (c) { return !c.v.done; }).length;
      if (n.length) out.push(["note", "« " + txt(n[0].v.text, 60) + " »"]);
      if (cd) out.push(["cal", cd]);
      if (l) out.push(["cart", l + " article" + (l > 1 ? "s" : "") + " à acheter"]);
      return out;
    },
    _state: function () { return { notes: notes, courses: courses, rappels: rappels, prefs: prefs }; }
  };
})();
