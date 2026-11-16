# Démo du 16 novembre

## Préparer le téléphone de démo

1. **Navigateur (Android, ordinateur)** : ouvrir l'app de production avec l'URL cachée **`/?demo=demo-jedha`**. L'app enregistre l'ID appareil `demo-jedha` et se présente comme **Benny**. Seuls les ID commençant par `demo-` sont acceptés.
2. **App installée sur iPhone** : une PWA installée a son propre stockage et s'ouvre toujours sur `/`. Installer l'app, l'ouvrir, saisir le prénom **Benny** : l'écran propose « C'est toi sur un autre appareil ? », répondre **Oui, c'est moi**. L'appareil est ajouté à Benny et l'app affiche tout l'historique de démo.
3. Ajouter 2 ou 3 vraies photos de soirée jeux sur deux souvenirs (bouton photo du souvenir) : le jeu de données n'en contient pas (pas d'images libres de droits fiables).

## Contenu du jeu de données (inséré le 2026-11-09)

- Joueurs : Benny, Inès, Léa, Hugo, Thomas (données fictives d'origine de la base) + Max, Camille, Jade (onboardés, appareils `demo-*`) et Noé (non onboardé).
- Autres joueurs de démo, même URL avec leur ID : `demo-max` et `demo-jade` (dernier souvenir sans scores, Max sans visuel), `demo-camille` (une partie en cours), `demo-ines` (Inès, dernier souvenir 7 Wonders avec scores et fait marquant, utile pour vérifier la couverture de l'accueil).
- Jeux : Azul, 7 Wonders, The Resistance: Avalon (d'origine, visuel BGG ajouté à Azul et 7 Wonders) + Skull King, Cascadia, Cluedo.
- 18 parties terminées entre le 6 octobre et le 7 novembre, 2 parties en cours (Skull King de Benny, Cascadia de Camille).
- Cas démontrables : record battu (Azul 61 puis 73, Skull King 230), égalités (7 Wonders, Cascadia), scores négatifs (Skull King), « vainqueur seulement » (Cluedo, Avalon), **doublon** (Azul du 27/10 enregistré par Benny et par Max : compté une seule fois dans les stats), temps de création 27 à 71 s.
- Ajout du 2026-11-13 : une partie de **Heat: Pedal to the Metal** à 6 joueurs créée par Benny (Benny, Inès, Léa, Hugo, Thomas, Max), championnat en 3 courses, points selon la place d'arrivée (9, 6, 4, 3, 2, 1) : Benny 24, Inès 19, Max 12, Léa et Hugo 7 (égalité), Thomas 6. Créée via l'API de l'app, elle a émis ses vrais événements `partie_creee` et `partie_terminee` ; la purge la supprime avec eux.
- Ajout du 2026-11-16 (vue calendrier de l'accueil) : 4 parties créées par Benny pour avoir plusieurs parties le même jour : **sam. 7 nov.** Azul (Benny 68) et Skull King (record de Hugo, 110) en plus de Cascadia, **ven. 13 nov.** 7 Wonders (Inès 61) en plus de Heat, **sam. 24 oct.** Cascadia (record de Léa, 86) en plus de Skull King. Générées par `scripts/demo-sameday-gen.ts` avec les règles de l'app, événements `demo-ev-131` à `142` ; la purge les supprime (manifeste).
- 130 événements cohérents (IDs `demo-ev-001` à `130`) : créations, fins, partages, ouvertures de liens par des visiteurs `demo-visitor-*` dont des réouvertures à plus de 48 h (H2), clics CTA, consultations de stats.

Générateur : `scripts/demo-gen.ts` (réutilise les règles de l'app), données générées : `scripts/demo-data.json`.

## Scénario de démo (≈ 4 min)

1. **Accueil** : parties en cours et terminées (P3, P4).
2. **Nouvelle partie** chronométrée : jeu BGG, joueurs (« Moi » déjà ajouté), Créer (< 1 min, H1).
3. **Feuille** : 2 manches, un score négatif avec ±, une photo, Terminer → **souvenir** avec fait marquant (P2).
4. **Partager** le lien, l'ouvrir sur un 2e téléphone : vue invité et CTA (P6, H2).
5. **Stats** : record, moyenne, victoires par joueur, le doublon compté une fois (P5, H3).
6. Dashboard Airtable « Pilotage hypothèses ».

## Après la démo : purge (à faire après le 16 novembre)

```bash
node --env-file=.env scripts/purge-demo.mjs            # aperçu, ne supprime rien
node --env-file=.env scripts/purge-demo.mjs --confirm  # supprime et restaure
```

Le script supprime les événements `demo-ev-*`, les participations et parties du manifeste, les joueurs et jeux créés pour la démo, puis restaure l'appareil d'origine de Benny et vide les visuels ajoutés à Azul et 7 Wonders (`scripts/demo-manifest.json`). Les parties réellement jouées pendant la démo ne sont pas touchées.
