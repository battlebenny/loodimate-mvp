# Loodi-mate MVP

Compagnon de partie de jeux de société, en PWA mobile. Il sert à trois choses :

- enregistrer une partie en moins d'une minute ;
- la transformer en **souvenir partageable** par lien ;
- suivre ses statistiques de joueur.

C'est le MVP de fin de formation **Jedha Product Builder**. La démo a lieu le 16 novembre 2026. Il sera ensuite testé en conditions réelles pendant environ 4 semaines, avec 8 à 12 joueurs.

> Ce projet vit en dehors de l'intégration Loodi One. Il n'y a ni comptes utilisateurs ni bridge natif : c'est une application web autonome qui reprend l'identité visuelle Loodi.

---

## Utiliser l'app

1. **Bienvenue** : au premier lancement, saisis ton prénom. Le téléphone devient ton identifiant, sans compte ni mot de passe. Si le prénom existe déjà, l'app demande « C'est toi ? » pour rattacher ce nouvel appareil.
2. **Nouvelle partie** : cherche le jeu (catalogue BoardGameGeek) et ajoute les joueurs. « Moi » est déjà ajouté. Choisis ensuite le mode « scores par manche » ou « vainqueur seulement ».
3. **Feuille de score** : saisis les manches, utilise le bouton ± pour les scores négatifs, ajoute jusqu'à 3 photos, puis appuie sur **Terminer**.
4. **Souvenir** : il montre le classement, un fait marquant généré automatiquement (modifiable) et les photos. Le bouton **Partager** copie un lien qui s'ouvre sans installer l'app.
5. **Parties** : la liste des parties en cours et terminées.
6. **Stats** : parties jouées, victoires, records et moyennes par jeu, victoires par joueur.

**Installer l'app sur son téléphone** :

- Sur iPhone : dans Safari, Partager puis « Sur l'écran d'accueil ».
- Sur Android : dans Chrome, menu puis « Installer l'application ».

Sur iPhone, l'app installée ne partage pas les données de Safari. Ressaisis ton prénom et réponds « Oui, c'est moi ».

---

## Stack

| Couche | Choix |
|---|---|
| Front | Vite 6, React 19, TypeScript, React Router 7, Tailwind CSS 4 |
| PWA | `vite-plugin-pwa` (manifest, service worker), icônes générées par `@vite-pwa/assets-generator` |
| Design | Tokens `@loodi/ui`, consommés **en lecture seule**. Accent Mate `#2E8B57` |
| Serveur | Une seule fonction Vercel (`api/router.ts`) qui délègue à un cœur indépendant de la plateforme (`server/core`) |
| Données | Airtable, via l'API REST, **uniquement côté serveur** |
| Jeux | API XML BoardGameGeek (recherche, visuels) |
| Tests | Vitest, avec une fausse base Airtable en mémoire |
| Hébergement | Vercel |

---

## Prérequis

- Node.js 22 ou plus récent, et npm.
- Un accès à la base Airtable « MVP Jedha Loodi mate » et un jeton d'API avec les droits lecture et écriture sur cette base.
- Un jeton d'API BoardGameGeek.

---

## Installation

```bash
git clone git@github.com:battlebenny/loodimate-mvp.git
cd loodimate-mvp
npm install
cp .env.example .env
```

Renseigne ensuite `.env`. Ce fichier n'est **jamais versionné**.

| Variable | Rôle |
|---|---|
| `AIRTABLE_API_TOKEN` | Jeton d'API Airtable (lecture et écriture sur la base) |
| `AIRTABLE_BASE_ID` | ID de la base, `appTGUCdqHkz3EEbA` |
| `BGG_API_TOKEN` | Jeton de l'API BoardGameGeek |

Aucun de ces secrets n'est exposé au navigateur : seules les fonctions serveur les lisent.

---

## Développement

```bash
npm run dev
```

L'app est servie sur <http://localhost:5173>. En local, un middleware Vite (`dev/api-plugin.ts`) sert les routes `/api/*` avec le même cœur serveur qu'en production. Il n'y a donc pas besoin de `vercel dev`.

Pour tester sur un vrai téléphone du même réseau Wi-Fi :

```bash
npm run dev -- --host
```

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de dev, avec l'API locale |
| `npm test` | Lance tous les tests une fois |
| `npm run test:watch` | Relance les tests à chaque modification |
| `npm run build` | Contrôle des types puis build de production dans `dist/` |
| `npm run preview` | Sert le build de production (sans l'API) |
| `npm run icons` | Régénère les icônes PWA à partir de `public/` |

**Attention : la base de dev est la base de production.** Toute partie créée en local arrive dans Airtable et dans le dashboard de suivi des hypothèses. Supprime tes données de test après usage.

---

## Architecture

```
api/router.ts          Point d'entrée Vercel : traduit la requête vers server/core
dev/api-plugin.ts      Même chose en local, comme middleware Vite
server/core/
  router.ts, index.ts  Table des routes, handle(path, request, env)
  airtable/            Client REST (débit limité, nouvel essai sur 429), schéma (ID de tables et champs), formules
  services/            Logique métier : joueurs, parties, événements, jeux, stats
  routes/              Adaptateurs HTTP vers les services
  bgg.ts               Recherche BoardGameGeek
shared/                Code commun au client et au serveur : types, calcul des scores, fait marquant, stats
src/
  app/                 Contexte joueur
  components/shell/    MiniHeader et BottomNav propres au MVP
  components/ui/       Bouton, champ, feuille, dialogue…
  features/            Un dossier par écran : onboarding, home, new-party, sheet, souvenir, guest, stats
  lib/                 Client API, ID appareil, événements, file d'attente, compression d'images
tests/                 Tests Vitest (serveur, shared, client) et une fausse base Airtable
scripts/               Génération et purge des données de démo
```

**Principes** :

- **Identité sans compte.** Un ID d'appareil, gardé dans `localStorage`, identifie le joueur onboardé. Un invité qui ouvre un souvenir reçoit un ID visiteur anonyme.
- **Airtable n'est appelé que côté serveur**, avec les ID de champs et jamais leurs noms. Les dates sont en UTC. Les écritures partent par lots de 10, avec un débit limité pour rester sous les quotas d'Airtable.
- **Les actions sont rejouables.** Créer et terminer une partie peuvent être renvoyés sans créer de doublon (réseau instable en soirée jeux).
- **Les événements mesurent les hypothèses** (`appareil_cree`, `creation_debut`, `partie_creee`, `partie_terminee`, `lien_partage`, `souvenir_ouvert`, `cta_clic`, `stats_consultees`). Ils sont envoyés sans bloquer l'interface, avec un nouvel essai, et le serveur ignore les doublons.
- **Les photos sont compressées sur le téléphone** (1600 px, JPEG) avant envoi en pièce jointe Airtable.
- **Le code est conçu pour un portage vers Deno** : les imports relatifs gardent l'extension `.js`, et `server/core` n'utilise que `Request` et `Response`.

### API interne

Toutes les routes sont sous `/api`.

| Méthode | Route | Usage |
|---|---|---|
| GET | `health` | Vérification du déploiement |
| GET | `players/me` | Joueur rattaché à l'appareil |
| GET | `players/lookup` | Prénom déjà pris ? |
| GET | `players/known` | Joueurs déjà rencontrés (suggestions) |
| POST | `players/onboard` | Onboarding ou rattachement d'un appareil |
| GET | `games/search` | Recherche BGG |
| GET | `parties` | Parties de l'appareil |
| POST | `parties` | Créer une partie |
| GET | `parties/:id` | Détail d'une partie |
| PUT | `parties/:id/sheet` | Sauvegarder la feuille de score |
| POST | `parties/:id/finish` | Terminer la partie |
| PATCH | `parties/:id/souvenir` | Corriger le résultat ou le fait marquant |
| POST | `parties/:id/photos` | Ajouter une photo (3 au maximum) |
| GET | `shared/:token` | Souvenir public, vu par un invité |
| GET | `stats` | Statistiques du joueur |
| POST | `events` | Enregistrer un événement de mesure |

### Base Airtable

Le schéma complet, avec les ID de tables et de champs, se trouve dans [`CLAUDE.md`](CLAUDE.md) et dans [`server/core/airtable/schema.ts`](server/core/airtable/schema.ts). Un dashboard Airtable, « Pilotage hypothèses », lit ces tables. **Préviens avant de renommer ou de supprimer un champ.**

---

## Déploiement (Vercel)

1. Importe le repo dans Vercel, avec le preset **Vite**.
2. Dans *Settings → Environment Variables*, ajoute `AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID` et `BGG_API_TOKEN`.
3. Déploie. Chaque push sur `main` part en production, et chaque branche obtient une préversion.
4. Vérifie que `https://<domaine>/api/health` renvoie `{"ok":true}`. Recharge ensuite une page profonde (par exemple `/stats`) pour contrôler le routage.

Le fichier `vercel.json` envoie `/api/*` vers la fonction unique et toutes les autres URL vers l'application.

---

## Démo

Le mode démo s'ouvre avec l'URL `/?demo=demo-jedha`. Le guide complet est dans [`docs/demo.md`](docs/demo.md) : préparation du téléphone, contenu du jeu de données, scénario et purge.

```bash
node --env-file=.env scripts/purge-demo.mjs            # aperçu, ne supprime rien
node --env-file=.env scripts/purge-demo.mjs --confirm  # supprime les données de démo
```

---

## Contribuer

- **Avant de coder**, lis la documentation produit. Elle n'est pas dupliquée ici (voir [`docs/README.md`](docs/README.md)). Les décisions datées de `Mon projet - Loodi-mate.md` font foi.
- **La question filtre** : « Est-ce nécessaire pour valider une hypothèse ou pour la démo ? » Si la réponse est non, l'idée va au parking lot.
- **Branches** : une fonctionnalité par branche (`feat/…`, `fix/…`), puis une pull request vers `main`.
- **Commits** : courts et fréquents, préfixés (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- **Tests d'abord** : toute logique serveur ou `shared/` arrive avec son test Vitest. `npm test` et `npm run build` doivent passer avant une PR.
- **Langues** : code et commentaires en anglais, textes de l'interface en français.
- **Design** : ne modifie jamais `@loodi/ui`. Les styles propres au MVP restent dans `src/styles/`. Les références visuelles sont les applications Collec et Friends.
- **Secrets** : jamais dans le code ni dans le client. Toute nouvelle variable va dans `.env.example` et dans Vercel.
- **Décision produit prise pendant le dev** : propose une ligne datée (`- AAAA-MM-JJ : …`) à ajouter dans « Décisions prises ».

Les documents de conception technique se trouvent dans `docs/superpowers/` : la spécification et le plan d'implémentation.

---

## Licence

Projet privé, réalisé dans le cadre de la formation Jedha. Tous droits réservés.
