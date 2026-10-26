/* ================================================================
   COIN DES ENFANTS — histoire du soir, aide aux devoirs, quiz des petits
   ================================================================ */
(function () {
  "use strict";
  var T = window.MaTele, $ = function (id) { return document.getElementById(id); };
  var busy = false;
  function storyBox(t, cls) { var b = $("kdStoryBox"); b.className = "story" + (cls ? " " + cls : ""); b.textContent = t; }
  function story() {
    if (busy) return;
    var cfg = T.cfg();
    if (!cfg.geminiCle) { storyBox("Il faut la clé Gemini (Réglages) pour que Yusei invente des histoires."); return; }
    busy = true; storyBox("Yusei invente une histoire…", "wait");
    var age = parseInt(cfg.ageEnfant, 10) || 6;
    var themes = ["un petit renard qui a peur du noir", "une étoile tombée dans un jardin", "un chat qui veut voler", "un dragon qui collectionne les nuages",
      "une tortue qui organise une course", "un robot qui apprend à rire", "une baleine qui chante pour la lune", "un petit train de nuit"];
    var theme = themes[Math.floor(Math.random() * themes.length)];
    T.gemini({
      systemInstruction: { parts: [{ text: "Tu es Yusei, un conteur doux pour enfants. Tu écris en français simple, sans markdown, sans emoji, sans titre. " +
        "L'histoire est rassurante, sans violence ni peur, avec une jolie morale, et se termine en invitant à bien dormir." } ] },
      contents: [{ role: "user", parts: [{ text: "Raconte une histoire du soir (environ 220 mots) pour un enfant de " + age + " ans, avec " + theme + "." }] }]
    }).then(function (j) {
      var parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [], t = "";
      parts.forEach(function (p) { if (p.text) t += p.text; });
      t = T.clean(t).slice(0, 2200);
      busy = false;
      if (!t) { storyBox("Yusei n'a pas trouvé d'histoire, réessaie dans un instant."); return; }
      storyBox(t); T.say(t);
    }, function () { busy = false; storyBox("Les serveurs de Google ne répondent pas, réessaie dans une minute."); });
  }
  $("kdStory")._onOk = story;
  $("kdHomework")._onOk = function () {
    T.show("ai");
    T.botSay("D'accord ! Lis-moi l'exercice ou écris-le avec le téléphone. Je vais t'aider étape par étape, sans te donner directement la réponse.");
  };
  $("kdQuiz")._onOk = function () { T.go("quiz:enfants"); };
  T.onShow.enfants = function () { storyBox(""); };
})();
