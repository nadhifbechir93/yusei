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
  ]
};
