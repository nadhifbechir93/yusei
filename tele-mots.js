/* ================================================================
   UNDERCOVER — bibliothèque de paires de mots (proches mais différents)
   Ajoute tes propres paires : ["mot 1", "mot 2"]
   ================================================================ */
window.UC_MOTS = {
  "Cuisine": [
    ["Pizza", "Tarte flambée"], ["Couscous", "Paella"], ["Croissant", "Pain au chocolat"], ["Crêpe", "Gaufre"],
    ["Thé", "Café"], ["Miel", "Confiture"], ["Glace", "Sorbet"], ["Burger", "Sandwich"], ["Riz", "Pâtes"],
    ["Pomme", "Poire"], ["Citron", "Orange"], ["Fraise", "Framboise"], ["Chocolat", "Caramel"], ["Soupe", "Bouillon"],
    ["Tajine", "Pot-au-feu"], ["Sushi", "Nems"], ["Fromage", "Yaourt"], ["Ketchup", "Mayonnaise"], ["Poivre", "Sel"],
    ["Brioche", "Pain de mie"], ["Jus d'orange", "Limonade"], ["Lasagnes", "Gratin"], ["Datte", "Figue"], ["Kebab", "Tacos"]
  ],
  "Maison": [
    ["Canapé", "Fauteuil"], ["Douche", "Baignoire"], ["Oreiller", "Coussin"], ["Fourchette", "Cuillère"],
    ["Frigo", "Congélateur"], ["Lampe", "Bougie"], ["Tapis", "Moquette"], ["Fenêtre", "Porte"], ["Balai", "Aspirateur"],
    ["Tasse", "Verre"], ["Armoire", "Commode"], ["Four", "Micro-ondes"], ["Savon", "Shampoing"], ["Couverture", "Couette"],
    ["Escalier", "Ascenseur"], ["Clé", "Cadenas"], ["Réveil", "Montre"], ["Rideau", "Store"]
  ],
  "Animaux": [
    ["Chat", "Chien"], ["Lion", "Tigre"], ["Dauphin", "Requin"], ["Cheval", "Âne"], ["Abeille", "Guêpe"],
    ["Aigle", "Faucon"], ["Crocodile", "Alligator"], ["Lapin", "Lièvre"], ["Poule", "Canard"], ["Grenouille", "Crapaud"],
    ["Papillon", "Libellule"], ["Pingouin", "Manchot"], ["Loup", "Renard"], ["Ours", "Panda"], ["Souris", "Hamster"],
    ["Chameau", "Dromadaire"], ["Escargot", "Limace"], ["Hibou", "Chouette"], ["Mouton", "Chèvre"], ["Girafe", "Zèbre"]
  ],
  "Lieux": [
    ["Plage", "Piscine"], ["École", "Collège"], ["Hôpital", "Pharmacie"], ["Cinéma", "Théâtre"], ["Montagne", "Colline"],
    ["Forêt", "Jungle"], ["Boulangerie", "Pâtisserie"], ["Gare", "Aéroport"], ["Musée", "Bibliothèque"], ["Supermarché", "Marché"],
    ["Parc", "Jardin"], ["Désert", "Savane"], ["Île", "Presqu'île"], ["Château", "Palais"], ["Stade", "Gymnase"],
    ["Restaurant", "Cafétéria"], ["Hôtel", "Camping"], ["Lac", "Rivière"], ["Paris", "Londres"], ["Tokyo", "Séoul"]
  ],
  "Objets & tech": [
    ["Téléphone", "Tablette"], ["Ordinateur", "Console"], ["Casque", "Écouteurs"], ["Stylo", "Crayon"],
    ["Cahier", "Classeur"], ["Télécommande", "Manette"], ["Appareil photo", "Caméra"], ["Parapluie", "Imperméable"],
    ["Lunettes", "Lentilles"], ["Sac à dos", "Valise"], ["Clavier", "Souris"], ["Ciseaux", "Couteau"], ["Livre", "Magazine"],
    ["Ballon", "Bulle"], ["Montre connectée", "Bracelet"], ["Imprimante", "Scanner"], ["Wi-Fi", "Bluetooth"], ["Selfie", "Portrait"]
  ],
  "Transports": [
    ["Voiture", "Moto"], ["Vélo", "Trottinette"], ["Avion", "Hélicoptère"], ["Bateau", "Sous-marin"], ["Bus", "Tramway"],
    ["Métro", "RER"], ["Taxi", "VTC"], ["Fusée", "Satellite"], ["Camion", "Tracteur"], ["Train", "TGV"], ["Roller", "Skate"]
  ],
  "Métiers": [
    ["Médecin", "Infirmier"], ["Professeur", "Directeur"], ["Pompier", "Policier"], ["Boulanger", "Pâtissier"],
    ["Pilote", "Steward"], ["Coiffeur", "Barbier"], ["Plombier", "Électricien"], ["Chanteur", "Rappeur"], ["Footballeur", "Basketteur"],
    ["Avocat", "Juge"], ["Dentiste", "Ophtalmo"], ["Cuisinier", "Serveur"], ["Architecte", "Maçon"], ["Youtubeur", "Streamer"]
  ],
  "Sports & loisirs": [
    ["Football", "Rugby"], ["Tennis", "Ping-pong"], ["Natation", "Plongée"], ["Ski", "Snowboard"], ["Boxe", "Karaté"],
    ["Échecs", "Dames"], ["Puzzle", "Lego"], ["Cartes", "Dominos"], ["Danse", "Gym"], ["Basket", "Handball"],
    ["Course", "Marathon"], ["Pêche", "Chasse"], ["Jeu vidéo", "Jeu de société"], ["Karaoké", "Concert"], ["Dessin", "Peinture"]
  ],
  "Nature & météo": [
    ["Soleil", "Lune"], ["Pluie", "Neige"], ["Orage", "Tempête"], ["Nuage", "Brouillard"], ["Arc-en-ciel", "Aurore"],
    ["Rose", "Tulipe"], ["Arbre", "Buisson"], ["Volcan", "Geyser"], ["Étoile", "Planète"], ["Été", "Printemps"],
    ["Sable", "Gravier"], ["Cascade", "Fontaine"], ["Océan", "Mer"], ["Feuille", "Pétale"]
  ],
  "Vêtements": [
    ["Pull", "Gilet"], ["Basket", "Botte"], ["Casquette", "Bonnet"], ["Jean", "Jogging"], ["Écharpe", "Foulard"],
    ["Chemise", "T-shirt"], ["Manteau", "Doudoune"], ["Pyjama", "Peignoir"], ["Chaussettes", "Collants"], ["Gants", "Moufles"]
  ],
  "Fêtes & famille": [
    ["Anniversaire", "Mariage"], ["Cadeau", "Surprise"], ["Gâteau", "Tarte"], ["Bébé", "Enfant"], ["Grand-père", "Oncle"],
    ["Vacances", "Week-end"], ["Pique-nique", "Barbecue"], ["Ballon de baudruche", "Guirlande"], ["Photo de famille", "Selfie de groupe"],
    ["Aïd", "Ramadan"], ["Nouvel An", "Anniversaire"], ["Valise", "Sac de voyage"]
  ],
  "École": [
    ["Cahier de textes", "Agenda"], ["Feutre", "Surligneur"], ["Gomme", "Effaceur"], ["Règle", "Équerre"], ["Cartable", "Trousse"],
    ["Récréation", "Cantine"], ["Maîtresse", "Surveillant"], ["Dictée", "Rédaction"], ["Contrôle", "Examen"], ["Tableau", "Écran"],
    ["Calculatrice", "Compas"], ["Bibliothèque", "CDI"], ["Devoirs", "Exercices"], ["Vacances scolaires", "Week-end"], ["Collège", "Lycée"],
    ["Bulletin", "Carnet"], ["Gymnase", "Cour"], ["Craie", "Marqueur"]
  ],
  "Pays & villes": [
    ["France", "Belgique"], ["Tunisie", "Maroc"], ["Japon", "Corée du Sud"], ["Italie", "Espagne"], ["Le Bourget", "Drancy"],
    ["Tokyo", "Kyoto"], ["Rome", "Venise"], ["New York", "Los Angeles"], ["Tunis", "Sousse"], ["Marseille", "Nice"], ["Égypte", "Turquie"],
    ["Brésil", "Argentine"], ["Canada", "États-Unis"], ["Sahara", "Atlas"], ["Dubaï", "Doha"], ["Allemagne", "Suisse"],
    ["Djerba", "Hammamet"], ["Lyon", "Bordeaux"], ["Chine", "Japon"]
  ],
  "Jeux vidéo": [
    ["Mario", "Luigi"], ["Sonic", "Mario"], ["PlayStation", "Xbox"], ["Nintendo Switch", "Game Boy"], ["Manette", "Joystick"],
    ["Minecraft", "Roblox"], ["Fortnite", "Call of Duty"], ["Zelda", "Final Fantasy"], ["Pokémon Rouge", "Pokémon Bleu"], ["Tetris", "Pac-Man"],
    ["FIFA", "Rocket League"], ["Mario Kart", "Course de voitures"], ["Boss final", "Niveau bonus"], ["Sauvegarde", "Point de contrôle"], ["Pikachu", "Rondoudou"],
    ["Link", "Zelda"], ["Peach", "Daisy"], ["Bowser", "Donkey Kong"]
  ],
  "Films & dessins animés": [
    ["Cinéma", "Télévision"], ["Dessin animé", "Film"], ["Pop-corn", "Bonbons"], ["Super-héros", "Super-vilain"], ["Princesse", "Reine"],
    ["Pirate", "Corsaire"], ["Robot", "Extraterrestre"], ["Sorcier", "Magicien"], ["Dragon", "Dinosaure"], ["Fantôme", "Vampire"],
    ["Bande-annonce", "Générique"], ["Acteur", "Doubleur"], ["Série", "Saga"], ["Comédie", "Film d'aventure"], ["Ticket", "Abonnement"]
  ],
  "Manga · Héros": [
    ["Naruto", "Luffy"], ["Goku", "Vegeta"], ["Sasuke", "Itachi"], ["Zoro", "Sanji"], ["Light Yagami", "L"],
    ["Eren", "Livaï"], ["Tanjiro", "Zenitsu"], ["Deku", "Bakugo"], ["Gon", "Kirua"], ["Ichigo", "Rukia"],
    ["Gohan", "Trunks"], ["Kakashi", "Jiraiya"], ["Nami", "Robin"], ["Nezuko", "Shinobu"], ["Itadori", "Megumi"],
    ["Gojo", "Sukuna"], ["Saitama", "Genos"], ["Sakura", "Hinata"], ["Mikasa", "Armin"], ["Tsubasa", "Isagi"],
    ["Conan", "Kaito Kid"], ["Sangoku", "Krilin"], ["Shanks", "Barbe Blanche"], ["Kenshin", "Saitō"], ["Yugi", "Kaiba"]
  ],
  "Manga · Séries": [
    ["One Piece", "Naruto"], ["Dragon Ball Z", "Dragon Ball Super"], ["Naruto", "Boruto"], ["Bleach", "Jujutsu Kaisen"], ["Demon Slayer", "Jujutsu Kaisen"],
    ["Death Note", "Code Geass"], ["Pokémon", "Digimon"], ["L'Attaque des Titans", "Kaiju n°8"], ["My Hero Academia", "One Punch Man"], ["Hunter x Hunter", "Yu Yu Hakusho"],
    ["Yu-Gi-Oh!", "Beyblade"], ["Captain Tsubasa", "Blue Lock"], ["Haikyū!!", "Kuroko's Basket"], ["Sailor Moon", "Cardcaptor Sakura"], ["Détective Conan", "Kindaichi"],
    ["Fairy Tail", "Black Clover"], ["Chainsaw Man", "Fire Force"], ["Spy x Family", "Kaguya-sama"], ["Saint Seiya", "Ken le Survivant"], ["JoJo's Bizarre Adventure", "Mob Psycho 100"],
    ["Fullmetal Alchemist", "Soul Eater"], ["Tokyo Revengers", "Tokyo Ghoul"], ["Sword Art Online", "Solo Leveling"], ["Doraemon", "Pokémon"]
  ],
  "Manga · Pouvoirs & objets": [
    ["Sharingan", "Byakugan"], ["Rasengan", "Chidori"], ["Kamehameha", "Final Flash"], ["Fruit du Démon", "Alter"], ["Death Note", "Livre de sorts"],
    ["Super Saiyan", "Mode Sage"], ["Haki", "Nen"], ["Sabre de Zoro", "Katana de Tanjiro"], ["Chapeau de paille", "Bandeau frontal"], ["Boules de cristal", "Pierres d'infinité"],
    ["Nuage magique", "Planeur"], ["Capsule", "Pokéball"], ["Clone de l'ombre", "Clone de lumière"], ["Respiration de l'eau", "Respiration du feu"], ["Titan colossal", "Titan cuirassé"],
    ["Zanpakutō", "Sabre laser"], ["Bankai", "Shikai"], ["Gear Second", "Gear Fifth"], ["Extension du territoire", "Barrière magique"], ["Carte Magie", "Carte Piège"]
  ],
  "Manga · Lieux & groupes": [
    ["Konoha", "Suna"], ["Akatsuki", "Brigade fantôme"], ["Équipage du Chapeau de paille", "Équipage de Barbe Blanche"], ["Grand Line", "Nouveau Monde"], ["Bataillon d'exploration", "Brigade spéciale"],
    ["Pourfendeurs de démons", "Exorcistes"], ["Capsule Corp", "Kame House"], ["Académie Yuei", "Lycée de Jujutsu"], ["Namek", "Planète Vegeta"], ["Mur Maria", "Mur Rose"],
    ["Soul Society", "Hueco Mundo"], ["Marine", "Révolutionnaires"], ["Ninja", "Samouraï"], ["Équipe 7", "Équipe 10"], ["Tournoi des arts martiaux", "Examen chûnin"],
    ["Wano", "Skypiea"], ["Village caché", "Château"], ["Arène Pokémon", "Ligue Pokémon"]
  ],
  "Manga · Japon & culture": [
    ["Ramen", "Udon"], ["Sushi", "Onigiri"], ["Katana", "Sabre"], ["Shōnen", "Shōjo"], ["Manga", "Anime"],
    ["Cosplay", "Déguisement"], ["Mangaka", "Animateur"], ["Kimono", "Yukata"], ["Torii", "Pagode"], ["Matcha", "Thé vert"],
    ["Mochi", "Dango"], ["Akihabara", "Shibuya"], ["Sensei", "Senpai"], ["Kawaii", "Chibi"], ["Opening", "Ending"],
    ["Tome", "Chapitre"], ["Shuriken", "Kunai"], ["Bentō", "Pique-nique"], ["Sakura", "Momiji"], ["Mont Fuji", "Volcan"]
  ]
};
