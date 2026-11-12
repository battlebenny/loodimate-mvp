# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite en PWA mobile d'abord, fonctions serveur Vercel, Airtable comme backend temporaire (accès uniquement côté serveur), API BoardGameGeek pour les jeux et leurs visuels.

## Users

Des groupes d'amis qui jouent régulièrement à des jeux de société (d'une fois par semaine à une fois par mois), ados ou adultes. Deux rôles :

- **le saisisseur**, qui enregistre la partie sur son téléphone, autour de la table, pendant ou juste après le jeu ;
- **les invités**, les autres joueurs de la tablée, qui reçoivent le souvenir par lien (souvent dans la conversation du groupe) sans installer l'app ni s'inscrire.

## Product Purpose

Mate est le compagnon de partie de l'écosystème Loodi. Il permet d'enregistrer une partie en moins d'une minute, de la transformer en souvenir partageable et de suivre ses statistiques dans la durée. Le succès : les joueurs enregistrent leurs parties d'eux-mêmes, reviennent consulter leurs souvenirs et suivent leurs résultats.

État actuel : MVP de la formation Jedha Product Builder (démo le 16 novembre 2026, puis test réel d'environ 4 semaines). Hypothèses, critères de réussite, parcours et décisions datées sont dans le vault Obsidian, `Projets/Loodi-mate/Formation Jedha/Mon projet - Loodi-mate.md` ; ils ne sont pas dupliqués ici.

## Positioning

Là où les applis de suivi (MyLudo, BG Stats) s'arrêtent aux scores, Mate fait de chaque partie un **souvenir** : un jeu, des joueurs, un résultat, un fait marquant et des photos, partagé avec toute la tablée par un simple lien.

## Operating Context

- Utilisé au téléphone, autour d'une table de jeu, souvent d'une main, avec une attention partagée : la saisie doit rester rapide et récupérable (brouillon et sauvegarde automatique de la feuille).
- Installé comme PWA depuis l'écran d'accueil ; un écran d'installation guide iPhone, Android et les navigateurs intégrés des messageries.
- Les souvenirs circulent dans les conversations de groupe (WhatsApp, SMS) et s'ouvrent dans un navigateur, sans compte.
- Les actions clés émettent des événements de mesure des hypothèses (table Événements) : toute évolution doit les préserver fidèlement.

## Capabilities and Constraints

- Pas de comptes : un ID d'appareil identifie le joueur onboardé (prénom unique, initiale en cas d'homonyme) ; les invités ont un ID visiteur anonyme.
- Jeux par recherche BoardGameGeek, avec repli sur un jeu ajouté à la main.
- Deux types de feuille, mémorisés par jeu : « scores par manche » et « vainqueur seulement ».
- 0 à 3 photos par partie, compressées côté client.
- Fait marquant généré automatiquement (égalité, record personnel, écart avec le 2e, sinon « Belle victoire de… »), toujours modifiable.
- Souvenir partagé par lien à jeton : lisible par toute personne qui a le lien, sans compte et sans modification possible.
- Lexique fixe : partie, feuille, manche, souvenir, fait marquant, prénom (jamais « nom »), statistiques (« Stats » seulement dans l'onglet).
- Hors périmètre actuel : gestion des ressources en cours de partie, entité « partie » partagée entre plusieurs saisisseurs, comptes Loodi.

## Brand Commitments

Mate hérite de la voix Loodi : chaleureuse, conviviale et directe, ludique sans être enfantine, sérieuse sur les données et légère dans les micro-interactions. Comme un ami passionné de jeux qui sait aussi être organisé. Règles de rédaction :

- **Tutoiement partout**, comme Loodi-friends. Quand l'utilisateur parle (titres, boutons à la première personne), « Mes statistiques », « Oui, c’est moi ».
- **Nom** : « Mate » dans l'app ; « Loodi-mate » seulement face à l'extérieur (vue invité, titre de partage, manifeste).
- **Le groupe d'amis** s'appelle « ta tablée », terme partagé avec Loodi-friends.
- **Erreurs** : « Impossible de [action]. Réessaie dans un instant. » ; dire ce qui a échoué et comment s'en sortir, sans code technique.
- **Pas de point médian** : reformuler sans marque de genre (« Léa joue déjà sur Mate. C’est la même personne ? »).
- **Typographie française** : apostrophe ’, espace insécable fine avant ? ! ;, espace insécable avant : et %, et à l'intérieur des « ».
- Pas d'emoji dans l'interface ; icônes au trait.
- Ne jamais promettre ce que le produit ne garantit pas (par exemple, un lien partagé n'est pas « privé »).

## Evidence on Hand

- Jeu de données de démo (joueurs, jeux et parties fictifs, événements simulés) : `scripts/demo-data.json`, décrit dans `docs/demo.md`.
- Aucun témoignage, aucune donnée d'usage réelle ni capture de test utilisateur à ce jour : ne pas en inventer.

## Product Principles

1. Enregistrer une partie prend moins d'une minute ; tout le reste passe après.
2. La partie devient un souvenir, pas une ligne de tableau.
3. Partager ne demande rien à l'invité : un lien, aucun compte.
4. Chaque état (vide, chargement, erreur, succès) propose une suite claire.
5. Mesurer fidèlement les hypothèses ; ce qui n'aide ni à les valider ni à la démo va au parking lot.

## Accessibility & Inclusion

WCAG AA, navigation clavier, VoiceOver/TalkBack, thème clair/sombre, safe areas natives et respect de `prefers-reduced-motion`. Les états (vainqueur, sélection, chargement) ne reposent jamais sur la couleur seule.
