# Loodi-mate MVP

Compagnon de partie de jeux de société : enregistrer une partie en moins d'une minute, la transformer en souvenir partageable, suivre ses stats. MVP de fin de formation Jedha Product Builder (démo le 16 novembre 2026), puis test réel d'environ 4 semaines (8 à 12 joueurs).

## Contexte produit (à lire avant toute tâche)

Source de vérité, hors repo (accès autorisé dans `.claude/settings.json`) :
`/Users/bgermain/Library/CloudStorage/SynologyDrive-battle_benny/Obsidian/battle_benny/Projets/Loodi-mate/Formation Jedha/`

- `Mon projet - Loodi-mate.md` : hypothèses H1 à H3, critères de réussite, parcours P0 à P6, décisions datées. Les décisions prévalent sur tout le reste.
- `Wireframes Loodi-mate.md` : écrans, données, événements à émettre, règles du fait marquant.

Ne duplique pas ces docs dans le repo. Si une décision produit est prise pendant le dev, propose un bloc daté à ajouter dans "Décisions prises" de `Mon projet - Loodi-mate.md` (format : `- AAAA-MM-JJ : …`).

## Stack et contraintes

- Framework : **à choisir** (première tâche). Contraintes : déploiement Vercel, PWA mobile d'abord, fonctions serveur.
- Versionné sur GitHub, déployé sur Vercel.
- Backend temporaire : Airtable, **accès uniquement via des fonctions serveur**. Aucun token côté client.
- Secrets dans `.env` (non versionné, lecture interdite à Claude) : `AIRTABLE_API_TOKEN`, `BGG_API_TOKEN`. Variables à recréer dans Vercel.
- API BGG : usage validé (clé obtenue), visuels des jeux compris.
- Pas de comptes utilisateurs : un ID d'appareil (stocké localement) identifie le joueur onboardé ; les invités du souvenir ont un ID visiteur anonyme stocké dans le navigateur.
- Photos : 0 à 3 par partie, pièces jointes Airtable. Compresser côté client (limite de taille de l'API Airtable, à vérifier).
- Faire simple : la question filtre est "est-ce nécessaire pour valider une hypothèse ou pour la démo ?". Le reste va au parking lot.

## Base Airtable "MVP Jedha Loodi mate"

Base `appTGUCdqHkz3EEbA`. Utiliser les ID (pas les noms) dans le code. Dates en UTC.

**Joueurs** `tbluswyc5kjhijKxJ`
- Prénom `fld89EkONAx3tHxeY` (primaire, unique insensible à la casse) · ID appareil `fldFEjODj2Uk3WsqL` · Onboardé le `flduJ35W19HoqlYjs` (date)
- Liens inverses : Parties créées `fld6vtyT3bKcHlJ6g` · Participations `fldlItRFp18O7uV7T` · Événements `fldhEnbNjTyS5MW0D`
- Calculés (KPI, ne pas écrire) : Nb parties créées, Onboardé, Saisisseur, Réutilise, Nb consultations stats, Consulte stats

**Jeux** `tblDk3LXpbar0LAB1`
- Nom `fldAnVODrYejo2dpw` · BGG ID `fldlkTXCAgKHSiLU4` · Visuel (URL) `fldPilY9VREyMrjIQ` · Template `fldU8PkHgWoDNhb64` ("scores par manche" | "vainqueur seulement") · Parties `fld5FCjjQkIpmarGS`

**Parties** `tblgy5ycSeMQ6JPOZ`
- Ref `fldtHgYlu2T6TOXSI` (ex. `azul-2026-11-04`) · Jeu `fldlOoPOBV1f7C7VN` · Créateur `fldhWCXLEEWEa5X9E` · Statut `fld1l7j5BZJPZMHGG` ("en cours" | "terminée")
- Créée le `fldvCakGk5g9zX3vx` · Terminée le `flddAOHmIJeGxI5Gc` · Template `fldehUg7djsAAiY9g` (copié du jeu) · Nb manches `fld3Cm14ZUZjv6MF9`
- Durée de création (s) `fld1czNj5gTVdtfI5` · Fait marquant `fldm563SLgRHEJ4Nq` · Jeton de partage `fldA184ebaPG5OCt7` (aléatoire, 12 car.) · Photos `fldo336tSfRj2gjNX`
- Liens inverses : Participations `fldUJfNg76i4iN4bv` · Événements `fldsAVnvavI3RWV1f`
- Calculés : Comptée H1, Terminée

**Participations** `tbl3ceg2pfP2EqirJ`
- Ref `fldv5gNOFn90Xtz5u` (ex. `azul-2026-11-04 · Benny`) · Partie `fldwqgIYkOWuitIjx` · Joueur `fldcgjuCywGMzvZnZ`
- Scores `fldb6Tco43rbJv3qC` (JSON, ex. `[8,12,10]`, vide si "vainqueur seulement") · Total `flddk8mqHcmOuDH20` (calculé côté serveur) · Vainqueur `fldubb4LPMPNqYKzu` (case à cocher, stockée explicitement)
- Calculés : ID appareil (Joueur), Non onboardé

**Événements** `tblOe6jCZGUYeeauA` (mesure des hypothèses, à émettre fidèlement)
- ID `fldWnp0mlT1GJhBB3` · ID visiteur `fld0QTk20feR8pkla` · Action `fldaAhR3eM2AQazDR` · Origine `fldPy3TH2KX7OEF75` ("app" | "lien") · Date `fld4INdNyFgepFDBr` · Partie `fldYX3NPtUQKjgtOB` · Joueur `fldUeaM60JMHwL7cr` (événements app : retrouver le joueur via l'ID appareil)
- Actions : `appareil_cree`, `creation_debut`, `partie_creee`, `partie_terminee`, `lien_partage`, `souvenir_ouvert`, `cta_clic`, `stats_consultees`

Un dashboard "Pilotage hypothèses" (interface Airtable) lit ces tables : ne pas renommer ni supprimer de champs sans le signaler.

## Conventions

- Code et commentaires en anglais, textes de l'interface en français.
- Commits courts et fréquents, une fonctionnalité par branche si possible.
