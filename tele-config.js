// ================================================================
//  MA TÉLÉ — RÉGLAGES
//  Version navigateur : la liaison Firebase est reprise automatiquement de config.js.
//  Les clés (Gemini, PRIM) se tapent dans l'écran Réglages de la télé.
//  (Tout reste aussi modifiable dans l'écran "Réglages" de la télé.)
// ================================================================
window.MATELE_CONFIG = {
  nomFoyer: "Famille Nadhif",
  theme: "premium",         // "premium", "cartes" ou "clair"

  // --- Météo (gratuit, aucune clé) -------------------------------
  ville: "Le Bourget",
  latitude: 48.9356,
  longitude: 2.4253,

  // --- Yusei ------------------------------------------------------
  jarvisNom: "YUSEI",
  appellation: "Monsieur",   // comment Yusei t'appelle
  voixTele: "oui",           // "non" = Yusei répond sans parler sur la télé
  voixNom: "Charon",
  recapDemarrage: "oui",
  veilleMinutes: 10,          // écran de veille après 10 min sans rien toucher ("non" pour le couper)
  ageEnfant: 6,               // âge pour les histoires du soir     // "non" = pas de « Bonjour Monsieur » + récap au démarrage         // voix Gemini (Charon = grave et posée)

  // --- Assistant IA : Google Gemini (gratuit) --------------------
  // Clé gratuite : https://aistudio.google.com  > "Get API key"
  geminiCle: "",
  geminiModele: "gemini-3.5-flash",

  // --- Transports en commun en direct (RER B + tram T11) : Île-de-France Mobilités (gratuit)
  // Compte + jeton gratuit : https://prim.iledefrance-mobilites.fr
  primCle: "",
  // Identifiant de l'arrêt (MonitoringRef) de la gare du Bourget,
  // à copier depuis le jeu de données "Arrêts" sur le site PRIM.
  // Format du type : "STIF:StopArea:SP:XXXXX:"
  arretRef: "auto",
  arretNom: "Le Bourget",

  // --- Agenda familial -------------------------------------------
  // Google Agenda > Paramètres de l'agenda > "Adresse secrète au format iCal"
  agendaIcs: "",

  // --- Fond d'écran (change toutes les 5 minutes) -----------------
  // Laisse vide [] : paysages au hasard pris sur Internet.
  // Ou mets tes photos dans le dossier "photos/" et liste-les ici :
  // photos: ["photos/photo1.jpg", "photos/photo2.jpg"],
  photos: ["tele-fond.jpg"],   // ton fond : Paris · Tunisie · désert
  fondEnLigne: false,   // false = uniquement les paysages dessinés par l'appli (aucune connexion)

  // --- Liaison avec le téléphone (Firebase, gratuit) -------------
  // Copie ici les valeurs de ton projet Firebase (voir LISEZMOI.txt)
  firebase: {
    apiKey: "",
    databaseURL: ""   // ex : https://ton-projet-default-rtdb.europe-west1.firebasedatabase.app
  },
  // Adresse de la télécommande une fois en ligne (ex : https://ton-projet.web.app)
  urlTelecommande: "",

  // --- Raccourcis vers les applis Samsung ------------------------
  // La télé retrouve chaque appli installée par son nom (match) ; "ids" = identifiants connus en secours.
  // Le logo officiel est repris automatiquement depuis l'appli installée sur la télé.
  // Tu peux aussi mettre ta propre image : { ..., logo: "logos/monimage.png" }
  applis: [
    { nom: "YouTube", match: "youtube", ids: ["9Ur5IzDKqV.TizenYouTube", "111299001912"], couleur: "#ff3b30",
      web: "https://www.youtube.com/" },          // web : utilisé dans la version navigateur
    { nom: "Netflix", match: "netflix", ids: ["3201907018807", "11101200001", "org.tizen.netflix-app"], couleur: "#e50914" },
    { nom: "Prime Video", match: "prime ?video|amazon", ids: ["3201910019365", "3201512006785", "org.tizen.ignition"], couleur: "#1fa2e8" },
    // Les suivantes n'apparaissent sur l'accueil QUE si elles sont installées sur la télé :
    { nom: "myCANAL", match: "canal", couleur: "#111111", siInstallee: true },
    { nom: "france.tv", match: "france ?\\.?tv", couleur: "#1f3cff", siInstallee: true },
    { nom: "TF1+", match: "tf1", couleur: "#0b4aa2", siInstallee: true },
    { nom: "M6+", match: "m6", couleur: "#2b2b8f", siInstallee: true },
    { nom: "Arte", match: "arte", couleur: "#f15a24", siInstallee: true },
    { nom: "Apple TV", match: "apple ?tv", couleur: "#1c1c1e", siInstallee: true },
    { nom: "Spotify", match: "spotify", couleur: "#1db954", siInstallee: true },
    { nom: "Deezer", match: "deezer", couleur: "#a238ff", siInstallee: true },
    { nom: "Twitch", match: "twitch", couleur: "#9146ff", siInstallee: true },
    { nom: "Plex", match: "plex", couleur: "#e5a00d", siInstallee: true },
    { nom: "Crunchyroll", match: "crunchyroll", couleur: "#f47521", siInstallee: true }
  ]
};
