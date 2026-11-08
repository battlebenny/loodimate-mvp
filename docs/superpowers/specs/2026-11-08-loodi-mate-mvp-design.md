# Loodi-mate MVP : document d'architecture

Date : 2026-11-08. Statut : à valider (questions du relecteur tranchées le 08/11).

Ce document décrit **comment** construire le MVP. Le **quoi** (hypothèses, parcours P0 à P6, écrans, événements, règles du fait marquant, décisions) est dans les docs produit Obsidian, source de vérité, non dupliquées ici :

- `Mon projet - Loodi-mate.md` (les "Décisions prises" prévalent sur tout)
- `Wireframes Loodi-mate.md` (écrans, données lues/écrites, événements, fait marquant)
- Canevas de wireframes : https://claude.ai/artifact/KXPkyFs5teEo99DEAb98MA (8 écrans 390×844)

Le modèle Airtable (ID de tables et de champs) est dans `CLAUDE.md`.

## 1. Intention

Une PWA mobile que 8 à 12 testeurs installent depuis un lien, pour enregistrer une partie en moins d'une minute, la transformer en souvenir partageable et suivre leurs stats. Chaque action mesurable émet un événement fidèle dans Airtable : le MVP vaut par la qualité de la mesure de H1, H2 et H3 autant que par l'app.

Échéances : démo live le 16 novembre 2026 (données simulées + premiers résultats réels), puis environ 4 semaines de test réel.

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
- Les 7 parcours P0 à P6 fonctionnels en production pour la démo, stats (P5) incluses.
- Événements émis exactement comme spécifiés (8 actions), avec liens Partie et Joueur remplis.
- Double déploiement : Vercel (cible principale) et Lovable (pratique de l'outil de formation), même front, même logique serveur.
- Identité visuelle Loodi (tokens `@loodi/ui`, accent Mate).

**Non-objectifs**
- Comptes, connexion, intégration au shell Loodi One (bridge, auth, launcher, composants partagés `@loodi/ui`), version native mobile. Le MiniHeader et la BottomNav sont **recréés localement** (voir §4), pas importés.
- Mode hors ligne complet (le service worker ne sert qu'à l'installation et au cache des assets).
- Jeux coopératifs, score le plus bas gagnant, gestion des ressources (parking lot).

**Anti-objectifs** (échec même si "ça marche")
- Un token Airtable ou BGG visible côté client.
- Une saisie de partie qui dépasse une minute à cause de l'app (lenteurs réseau bloquantes, étapes en trop).
- Des événements manquants, dupliqués ou mal liés qui faussent le dashboard "Pilotage hypothèses".
- Une modification du design system partagé `@loodi/ui` ou du schéma Airtable sans le signaler.

## 3. Stack (décidée)

Alignée sur `loodi-collec` (même écosystème, même pattern déjà en production) :

- **Front** : Vite + React 19 + TypeScript + Tailwind CSS v4 + React Router. PWA via `vite-plugin-pwa` (manifeste, icônes, service worker `autoUpdate`, aucune mise en cache des appels API).
- **Serveur** : logique métier dans un module TypeScript indépendant de toute plateforme (`server/core/`), sans dépendance npm, n'utilisant que `fetch`, `Request`/`Response` et les API Web standard. Les secrets lui sont passés en paramètre (pas de `process.env` ni `Deno.env` dans le cœur).
- **Adaptateurs fins** (quelques lignes chacun) :
  - Vercel : une fonction unique `api/[...path].ts` (signature Web standard).
  - Lovable : une Edge Function unique (Supabase/Lovable Cloud, Deno) qui appelle le même cœur.
- **Une seule fonction "routeur"** de chaque côté, plutôt qu'une fonction par route : un seul point à porter et à configurer.
- Le front appelle `${VITE_API_BASE}/<route>` : `/api` sur Vercel, l'URL de l'Edge Function sur Lovable.
- **Tests** : Vitest sur la logique pure (cœur serveur et calculs front).

Inconnue à lever en tout début de dev (spike court) : la façon dont l'Edge Function importe le cœur partagé (le bundler Supabase et Lovable n'acceptent pas forcément un import hors de `supabase/functions/`). Repli prévu : le cœur vit dans `supabase/functions/_shared/` et la fonction Vercel l'importe depuis là. Le choix est fait par le spike, pas à l'aveugle.

## 4. Design

- Consommer `@loodi/ui` depuis le registre npm public (vérifié : collec le résout depuis registry.npmjs.org, aucun token requis) **en lecture seule**, uniquement pour `tokens.css` (couleurs, rayons, espacements, typographies, clair/sombre) et les logos via `@loodi/assets`. Aucun composant de shell One importé.
- **Continuité avec l'écosystème (décidé le 08/11)** : le projet a ses **propres versions** du MiniHeader et de la BottomNav, qui reprennent l'apparence et le comportement de ceux de Loodi One (`loodi-one/packages/@loodi/ui/src/MiniHeader.tsx`, `BottomNav.tsx` et leurs CSS, lus comme référence, jamais modifiés). C'est une version simplifiée : sans bridge, sans launcher d'applications, sans compte ni paramètres.
  - MiniHeader : logo et wordmark Loodi, tuile "Mate", bouton retour sur les écrans secondaires, verre qui apparaît au défilement.
  - BottomNav : **Parties · Nouvelle partie · Stats**, sans bouton lanceur "Loodi" (décidé le 08/11). L'Accueil (onglet Parties) ne fait que lister les parties en cours et terminées, comme dans le wireframe. Le bouton "Nouvelle partie" et l'icône stats de l'en-tête de l'Accueil disparaissent : tout passe par la BottomNav. Elle est masquée sur Nouvelle partie et sur la Feuille de score pour garder la saisie sous la minute *(mon choix)*.
  - Vue invité (P6) : MiniHeader sans menu, pas de BottomNav, CTA "Essayer Loodi-mate" *(mon choix)*.
  - Les wireframes ne montrent ni l'un ni l'autre : ils fixent le contenu des écrans, le cadre vient de l'écosystème.
- Polices : Playfair Display (titres), DM Sans (texte), JetBrains Mono (données chiffrées si utile), via `@fontsource` comme collec.
- Accent du module : `--color-module-mate` (#2E8B57, vert forêt), réservé à l'action principale et aux états actifs (règle "accent rare" de collec et friends).
- Règles reprises de collec et friends : surfaces opaques (pas de flou), une action principale par écran, cibles tactiles ≥ 44 px, contraste AA, clair/sombre suivant le système, `prefers-reduced-motion`.
- Fonds et icônes de `Loodi-apps/design/assets` utilisables en copie locale (aucune modification de la source).
- Les styles propres au MVP vivent dans ce repo. En cas de doute sur une règle design, demander : certains docs design de loodi-one sont des restes ; collec et friends font foi.

**Rôle de chaque déploiement (décidé le 08/11)** : Vercel est la production. Les testeurs installent la version Vercel et les liens de partage pointent vers son domaine (stable pendant les 4 semaines). Lovable est une copie d'exercice, portée depuis ce repo en fin de dev vers un **repo GitHub séparé** (Lovable réorganise le projet et pousse ses propres commits), branchée sur la même base Airtable mais jamais diffusée aux testeurs.

## 5. Identité et sécurité

- **Prénom déjà existant à l'onboarding (décidé le 08/11)** : si le joueur existant n'a pas d'ID appareil, l'app demande « C'est toi ? ». Oui : l'ID appareil est ajouté à ce joueur (son historique compte dans ses stats et il passe "onboardé"). Non, ou si le joueur a déjà un ID appareil : il faut saisir un autre prénom (suggestion avec suffixe, "Thomas B.").
- **ID appareil** : UUID généré au premier lancement (P0), stocké en `localStorage`, envoyé dans un en-tête à chaque appel. Le serveur retrouve le Joueur par ce champ.
- **ID visiteur** (vue invité) : si l'appareil est onboardé, on réutilise son ID appareil (permet d'exclure du calcul H2 les réouvertures du saisisseur) ; sinon, UUID anonyme en `localStorage`. *(mon choix)*
- **Droits d'écriture** : seul l'appareil créateur d'une partie peut la modifier (feuille, souvenir, photos, fait marquant). Le serveur vérifie que l'ID appareil correspond au Créateur.
- **Vue invité** : accès par jeton de partage (12 caractères aléatoires, généré côté serveur), route `/s/<jeton>`, lecture seule, page en `noindex`.
- Secrets `AIRTABLE_API_TOKEN` et `BGG_API_TOKEN` uniquement côté serveur, configurés séparément dans Vercel et dans Lovable.

## 6. Synchronisation avec Airtable

Limite Airtable : 5 requêtes/s par base, 10 enregistrements par requête d'écriture. Principe : **synchro par lots aux actions clés** (validé).

- La partie en cours vit d'abord dans le navigateur (`localStorage`) : chaque frappe est sauvegardée localement, sans réseau.
- Écritures serveur aux moments clés : **Créer** (partie + participations + nouveaux joueurs + jeu si nouveau, en lots), **changement du nombre de manches ou de template**, **ajout de photo**, **sortie de la feuille** (navigation ou passage en arrière-plan), **Terminer** (scores, totaux, vainqueurs, fait marquant, statut), **corrections sur le souvenir**.
- Le **Total** est recalculé côté serveur à partir du JSON des scores.
- `souvenir_ouvert` est émis en P6 (origine "lien") **et** en P4 quand le saisisseur ouvre un souvenir dans l'app (origine "app") (décidé le 08/11). Le calcul H2 (n8n) filtre sur origine = "lien".
- Les **événements** sont envoyés sans bloquer l'interface (envoi asynchrone, avec une nouvelle tentative si échec).
- Reprise (P3) : depuis l'état local s'il existe, sinon depuis Airtable.

## 7. Photos

- 0 à 3 par partie, prises via `<input type="file" accept="image/*" capture="environment">`.
- Compression dans le navigateur : environ 1600 px sur le grand côté, JPEG qualité ~0,82 (cible 300 à 500 Ko), orientation EXIF respectée. Qualité visée : nette sur téléphone, plein écran compris.
- Envoi en base64 vers la fonction serveur, qui le transmet à l'endpoint d'upload de pièce jointe d'Airtable (limite 5 Mo par fichier). Pas de stockage intermédiaire.
- Le visuel BGG sert de repli quand il n'y a aucune photo.

## 8. BGG

- Recherche (autocomplétion) et détail (visuel, année) via la fonction serveur, avec le token BGG. Réponses XML converties en JSON côté serveur, mises en cache (en-têtes HTTP de cache).
- Repli texte libre si BGG ne répond pas ou si le jeu n'existe pas.
- Un jeu choisi est créé dans la table Jeux à la première partie (ou retrouvé par BGG ID, ou par nom pour un jeu en texte libre). Le template choisi est mémorisé sur le jeu.

## 9. Logique métier à tester (Vitest, en TDD)

- Total d'un joueur, vainqueurs présélectionnés (tous les joueurs au meilleur score), égalités.
- Fait marquant : les 4 règles par priorité et l'élision "d'" (voyelles accentuées comprises), selon `Wireframes Loodi-mate.md`.
- Noms : unicité insensible à la casse, suffixe ("Thomas B.") pour un doublon dans la partie ou un autre joueur homonyme.
- Stats : parties, victoires, taux, par jeu (record, moyenne, minimum ; pas de scores pour "vainqueur seulement").
- Ref de partie (`azul-2026-11-04`) et de participation (`azul-2026-11-04 · Benny`).

**Choix du builder (à relire)**
- Stats P5 : toutes les participations du joueur de l'appareil, y compris les parties enregistrées par un autre appareil (joueur confirmé via "ce joueur ?").
- **Dédoublonnage à l'affichage (décidé le 08/11)** : une même partie enregistrée par plusieurs saisisseurs n'est comptée qu'une fois dans les stats et dans la règle "record personnel". Deux parties terminées sont considérées comme la même si elles ont toutes ces caractéristiques :
  - même jeu ;
  - exactement les mêmes joueurs ;
  - mêmes vainqueurs ;
  - mêmes totaux (template "scores par manche") ;
  - "Terminée le" à moins de 30 min d'écart.

  Les données Airtable ne sont **pas** modifiées : chaque saisisseur garde sa partie et son souvenir, et la mesure H1 (parties créées par joueur) reste intacte. Cas limite accepté : deux parties "vainqueur seulement" très courtes avec le même gagnant, terminées à moins de 30 min d'écart.
- Une partie terminée ne revient pas sur la feuille de score : les corrections se font depuis le souvenir (vainqueurs, scores). `partie_terminee` n'est émis qu'une fois et "Terminée le" n'est pas modifié par une correction.
- Fait marquant : régénéré après une correction des vainqueurs ou des scores, sauf s'il a été modifié à la main (le texte saisi est conservé).

## 10. Données de démo

Jeu de données simulé, plus riche que les données fictives actuelles, créé via le connecteur Airtable (aucune modification de schéma) : plusieurs joueurs, jeux des deux templates, records battus, égalités, parties en cours et terminées, photos, événements cohérents. Objectif : chaque parcours et chaque section du dashboard est démontrable. Ces données vivent dans la base actuelle, sont marquées (ID appareil préfixé `demo-`, et tout ce qui en dépend : parties, participations, événements, jeux créés pour la démo) et sont **purgées après le 16 novembre** par un script fourni avec le seed (décidé le 08/11). Le dashboard reste ainsi juste pendant le test réel.

## 11. Ordre de développement

1. Socle : projet Vite, tokens et polices, PWA installable, routeur serveur Vercel, spike d'import Lovable, déploiement Vercel de bout en bout.
2. P0 Bienvenue (joueur + ID appareil, `appareil_cree`).
3. P1 Nouvelle partie (BGG, joueurs, `creation_debut`, `partie_creee` avec durée) et Feuille de score (deux templates, photos).
4. P2 Souvenir (vainqueurs, corrections, fait marquant, photos, partage, `partie_terminee`, `lien_partage`).
5. P6 Vue invité (`souvenir_ouvert`, `cta_clic`).
6. Accueil avec P3 et P4 (listes en cours et terminées).
7. P5 Statistiques (`stats_consultees`).
8. Données de démo, portage Lovable, vérification du dashboard sur des données réelles.

## 12. Laissé au builder

Structure des dossiers et des composants, gestion d'état front, détails de l'API interne (routes, formats), messages d'erreur et états de chargement (en français, ton Loodi), icônes, micro-animations.
