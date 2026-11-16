# Architecture Loodi-mate MVP

Doc technique (état au 2026-11-13). Les diagrammes sont en Mermaid : ils s'affichent directement sur GitHub et dans Obsidian.

Sommaire :

1. [Vue d'ensemble](#1-vue-densemble)
2. [Couches du code](#2-couches-du-code)
3. [API serveur](#3-api-serveur)
4. [Parcours clés](#4-parcours-clés)
5. [Modèle de données Airtable](#5-modèle-de-données-airtable)
6. [Événements de mesure](#6-événements-de-mesure)
7. [Workflows n8n](#7-workflows-n8n)

---

## 1. Vue d'ensemble

Une PWA React (Vite) servie en statique par Vercel, et une seule fonction serveur (`api/router.ts`) qui reçoit tous les appels `/api/*`. Seule cette fonction détient les tokens Airtable et BGG. n8n lit la même base Airtable en tâche planifiée pour calculer H2 et envoyer le rapport hebdo.

```mermaid
flowchart LR
  subgraph Users["Utilisateurs"]
    P["Joueur onboardé<br/>(PWA installée,<br/>ID appareil)"]
    G["Invité du souvenir<br/>(navigateur,<br/>ID visiteur anonyme)"]
  end

  subgraph Vercel["Vercel"]
    SPA["PWA React<br/>index.html + assets<br/>(service worker Workbox)"]
    FN["Fonction serveur<br/>api/router.ts<br/>→ server/core"]
  end

  subgraph Ext["Services externes"]
    AT[("Airtable<br/>base MVP Jedha Loodi mate")]
    ATC["Airtable Content API<br/>(upload photos)"]
    BGG["BoardGameGeek<br/>XML API2"]
  end

  subgraph N8N["n8n (planifié)"]
    W1["H2 Visiteurs souvenir<br/>chaque jour 6h"]
    W2["Rapport KPI hebdo<br/>vendredi 9h"]
  end

  DASH["Interface Airtable<br/>Pilotage hypothèses"]
  MAIL["Boîte mail<br/>du porteur de projet"]

  P -->|"/ , /nouvelle, /partie/:id, /stats"| SPA
  G -->|"/s/:token"| SPA
  SPA -->|"fetch /api/* + X-Device-Id"| FN
  FN -->|"REST, AIRTABLE_API_TOKEN"| AT
  FN -->|"uploadAttachment"| ATC
  ATC --> AT
  FN -->|"search / thing, BGG_API_TOKEN"| BGG
  W1 -->|"lecture + upsert"| AT
  W2 -->|"lecture"| AT
  W2 -->|"SMTP"| MAIL
  DASH -->|"lecture"| AT
```

Routage Vercel (`vercel.json`) :

```mermaid
flowchart LR
  R["Requête entrante"] --> Q{"chemin<br/>commence par /api/ ?"}
  Q -->|oui| A["/api/router?path=…<br/>fonction serveur"]
  Q -->|non| I["/index.html<br/>React Router côté client"]
```

En dev, `dev/api-plugin.ts` branche le même `server/core` en middleware Vite : un seul code serveur pour local et production.

---

## 2. Couches du code

```mermaid
flowchart TB
  subgraph Client["src/ (navigateur)"]
    direction TB
    APP["App.tsx<br/>gate : install → bienvenue → app<br/>route publique /s/:token"]
    FEAT["features/<br/>home · new-party · sheet · souvenir<br/>guest · stats · onboarding · install"]
    UI["components/<br/>shell · ui (+ @loodi/ui)"]
    LIB["lib/<br/>api · device · track · queue<br/>draft · image · platform · demo"]
    APP --> FEAT --> UI
    FEAT --> LIB
  end

  subgraph Shared["shared/ (client + serveur)"]
    SH["types · scoring · stats · highlight<br/>refs · token · names · french"]
  end

  subgraph Server["server/core/ (fonction Vercel)"]
    direction TB
    RT["router.ts + index.ts<br/>matching méthode + motif"]
    ROUTES["routes/<br/>players · parties · games<br/>events · stats"]
    SVC["services/<br/>logique métier, idempotence,<br/>émission des événements serveur"]
    AIR["airtable/<br/>client · db (interface) · schema (ID)<br/>formula"]
    BGGM["bgg.ts"]
    RT --> ROUTES --> SVC --> AIR
    ROUTES --> BGGM
  end

  ADP["api/router.ts (Vercel)<br/>dev/api-plugin.ts (Vite)"]

  LIB -->|"HTTP /api/*"| ADP --> RT
  FEAT --> SH
  SVC --> SH
```

Points notables :

- `airtable/schema.ts` centralise les ID de tables et de champs (jamais les noms).
- `airtable/db.ts` est une interface : les tests serveur tournent sur `tests/helpers/fakeDb.ts`.
- `lib/device.ts` gère `mate.deviceId`, `mate.player` et `mate.visitorId` dans `localStorage`.
- `lib/queue.ts` sérialise les sauvegardes de feuille et le "Terminer" pour qu'ils arrivent dans l'ordre.
- `lib/image.ts` compresse les photos côté client (JPEG, 1600 px max, qualité 0,82) ; le serveur refuse au-delà de 5 Mo et de 3 photos.

---

## 3. API serveur

Toutes les routes passent par `server/core/router.ts`. L'identité vient de l'en-tête `X-Device-Id` ; seule `shared/:token` est publique (lecture du souvenir par jeton).

```mermaid
flowchart LR
  subgraph Players["Joueurs"]
    p1["GET players/me"]
    p2["POST players/onboard<br/>mode new | claim | link"]
    p3["GET players/lookup?name="]
    p4["GET players/known"]
  end
  subgraph Parties["Parties"]
    r1["POST parties"]
    r2["GET parties?status="]
    r3["GET parties/:id"]
    r4["PUT parties/:id/sheet"]
    r5["POST parties/:id/finish"]
    r6["PATCH parties/:id/souvenir"]
    r7["POST parties/:id/photos"]
    r8["DELETE parties/:id/photos/:photoId"]
    r9["GET shared/:token<br/>(public)"]
  end
  subgraph Other["Autres"]
    g1["GET games/search?q=<br/>cache 24 h"]
    e1["POST events<br/>actions client uniquement"]
    s1["GET stats"]
    h1["GET health"]
  end
```

---

## 4. Parcours clés

### 4.1 Premier lancement et onboarding

```mermaid
sequenceDiagram
  autonumber
  actor U as Joueur
  participant App as PWA (App.tsx)
  participant LS as localStorage
  participant API as /api
  participant AT as Airtable

  U->>App: ouvre l'app
  App->>LS: deviceId ? player ?
  alt mobile non installé
    App-->>U: InstallPage (installer ou passer)
  end
  App-->>U: WelcomePage (prénom)
  U->>App: saisit son prénom
  App->>API: GET players/lookup?name=
  API->>AT: Joueurs par prénom
  API-->>App: free | unclaimed | onboarded
  App->>LS: ensureDeviceId()
  App->>API: POST players/onboard (X-Device-Id)
  API->>AT: crée ou rattache le Joueur (ID appareil, Onboardé le)
  API->>AT: Événement appareil_cree
  API-->>App: PlayerDTO
  App->>LS: setIdentity(deviceId, player)
```

### 4.2 Créer, saisir et terminer une partie

```mermaid
sequenceDiagram
  autonumber
  actor U as Saisisseur
  participant App as PWA
  participant API as /api
  participant BGG as BoardGameGeek
  participant AT as Airtable

  U->>App: "Nouvelle partie"
  App-)API: POST events creation_debut
  U->>App: tape un nom de jeu
  App->>API: GET games/search?q=
  API->>BGG: search + thing (visuel)
  API-->>App: résultats (cache 24 h)
  U->>App: choisit jeu + joueurs, "Créer"
  App->>API: POST parties (durée de création)
  API->>AT: Jeu (find or create), Joueurs manquants (batch)
  API->>AT: Partie "en cours" + jeton de partage
  API->>AT: Participations
  API->>AT: Événement partie_creee (ID déterministe)
  API-->>App: PartyDTO
  loop pendant la partie (file ordonnée)
    U->>App: saisit les scores
    App->>API: PUT parties/:id/sheet
    API->>AT: Scores, Total, Vainqueur
  end
  opt photos (0 à 3)
    App->>App: compressImage()
    App->>API: POST parties/:id/photos (base64)
    API->>AT: uploadAttachment (Content API)
  end
  U->>App: "Terminer"
  App->>API: POST parties/:id/finish
  API->>AT: Statut "terminée", Terminée le, Fait marquant
  API->>AT: Événement partie_terminee (idempotent)
  API-->>App: souvenir
  App-->>U: SouvenirPage
```

Idempotence : un nouvel essai de `POST parties` retrouve la partie déjà créée (même créateur, même jeu, mêmes joueurs) ; `finish` sur une partie déjà terminée renvoie le souvenir et garantit l'événement.

### 4.3 Partage et vue invité

```mermaid
sequenceDiagram
  autonumber
  actor S as Saisisseur
  actor I as Invité
  participant App as PWA
  participant API as /api
  participant AT as Airtable

  S->>App: "Partager" (ShareSheet)
  App-)API: POST events lien_partage (origine app)
  S-->>I: envoie /s/:token (WhatsApp, SMS…)
  I->>App: ouvre /s/:token (GuestPage)
  App->>API: GET shared/:token
  API->>AT: Partie par jeton
  API-->>App: souvenir (lecture seule)
  App-)API: POST events souvenir_ouvert (origine lien,<br/>ID visiteur = deviceId sinon visitorId)
  opt
    I->>App: "Essayer Loodi-mate"
    App-)API: POST events cta_clic (origine lien)
  end
```

---

## 5. Modèle de données Airtable

Base `appTGUCdqHkz3EEbA`. Les champs calculés (KPI "Hx · …", "Filtre · …") ne sont jamais écrits par l'app.

```mermaid
erDiagram
  JOUEURS ||--o{ PARTIES : "crée (Créateur)"
  JOUEURS ||--o{ PARTICIPATIONS : "joue"
  JOUEURS ||--o{ EVENEMENTS : "émet (événements app)"
  JEUX ||--o{ PARTIES : "est joué dans"
  PARTIES ||--o{ PARTICIPATIONS : "contient"
  PARTIES ||--o{ EVENEMENTS : "concerne"
  PARTIES ||--o{ VISITEURS_SOUVENIR : "est rouverte par"

  JOUEURS {
    string Prenom PK "unique, insensible à la casse"
    string ID_appareil "vide si non onboardé"
    date Onboarde_le
    number H1_Cree_2_parties "calculé"
    number H3_Consulte_stats_2_fois "calculé"
  }
  JEUX {
    string Nom
    number BGG_ID
    string Visuel_URL
    string Template "scores par manche | vainqueur seulement"
  }
  PARTIES {
    string Ref "ex. azul-2026-11-04"
    string Statut "en cours | terminée"
    date Creee_le
    date Terminee_le
    string Template "copié du jeu"
    number Nb_manches
    number Duree_creation_s
    string Fait_marquant
    string Jeton_partage "12 caractères"
    attachment Photos "0 à 3"
  }
  PARTICIPATIONS {
    string Ref "ex. azul-2026-11-04 · Benny"
    json Scores "ex. [8,12,10]"
    number Total "calculé côté serveur"
    boolean Vainqueur
  }
  EVENEMENTS {
    string ID "idempotence"
    string ID_visiteur
    string Action
    string Origine "app | lien"
    date Date
  }
  VISITEURS_SOUVENIR {
    string Cle PK "visiteur|partie (upsert)"
    string ID_visiteur
    string Type "onboardé | invité"
    date Premiere_ouverture
    number Nb_ouvertures
    number H2_Rouvre_sans_renvoi "0 | 100"
    number H2_Rouvre_tout "0 | 100"
    number Filtre_Dans_le_plafond "0 | 1"
  }
```

`Visiteurs souvenir` (`tblaj4pcEiOalng9Z`) n'est écrite que par n8n ; l'app ne la lit pas.

---

## 6. Événements de mesure

Les événements alimentent les hypothèses. Trois sont émis par le serveur (fiables, ID déterministe), cinq par le client via `lib/track.ts` (fire-and-forget, `keepalive`, un nouvel essai après 3 s avec le même ID ; le serveur déduplique sur l'ID).

```mermaid
flowchart LR
  subgraph Srv["Émis par le serveur (services/)"]
    a1["appareil_cree<br/>onboard()"]
    a2["partie_creee<br/>createParty()"]
    a3["partie_terminee<br/>finishParty()"]
  end
  subgraph Cli["Émis par le client (track → POST events)"]
    c1["creation_debut<br/>NewPartyPage"]
    c2["lien_partage<br/>ShareSheet"]
    c3["souvenir_ouvert<br/>SouvenirPage / GuestPage"]
    c4["cta_clic<br/>GuestPage"]
    c5["stats_consultees<br/>StatsPage"]
  end
  EV[("Événements")]
  Srv --> EV
  Cli --> EV

  EV --> H1["H1 Enregistrement<br/>durée, réutilisation, terminées"]
  EV --> H2["H2 Souvenirs<br/>réouverture 48 h+ sans renvoi"]
  EV --> H3["H3 Statistiques<br/>consultations 2+"]
```

| Hypothèse | Événements utilisés | Calcul |
|---|---|---|
| H1 | `partie_creee`, `partie_terminee`, `cta_clic` | Champs calculés Airtable + rapport hebdo |
| H2 | `souvenir_ouvert`, `lien_partage` | Workflow n8n quotidien → `Visiteurs souvenir` |
| H3 | `stats_consultees` | Champs calculés sur `Joueurs` |

---

## 7. Workflows n8n

Exports dans `_n8n/`. Les deux workflows sont actifs et n'utilisent que des ID de base et de tables.

### 7.1 Enchaînement dans le temps

```mermaid
flowchart LR
  APP["App<br/>(événements en continu)"] --> EV[("Événements")]
  EV --> D["n8n quotidien 6h<br/>H2 Visiteurs souvenir"]
  D --> VS[("Visiteurs souvenir")]
  VS --> W["n8n vendredi 9h<br/>Rapport KPI hebdo"]
  EV --> W
  W --> M["Mail HTML<br/>charte Loodi-mate"]
  VS --> DB["Dashboard Airtable<br/>Pilotage hypothèses"]
```

### 7.2 `Loodi-mate · H2 Visiteurs souvenir (quotidien)`

```mermaid
flowchart TB
  T["⏰ Chaque jour 6h<br/>Schedule Trigger"]
  E["Événements<br/>Airtable search<br/>Action = souvenir_ouvert OU lien_partage"]
  J["Joueurs<br/>Airtable search · Execute Once<br/>ID appareil non vide"]
  P["Parties<br/>Airtable search · Execute Once"]
  C["Calcul H2<br/>Code · Run Once for All Items"]
  U["Visiteurs souvenir (upsert)<br/>Airtable upsert · clé = Clé<br/>typecast"]
  T --> E --> J --> P --> C --> U
```

Logique du nœud `Calcul H2` :

```mermaid
flowchart TB
  A["Ouvertures souvenir_ouvert<br/>groupées par visiteur × partie"] --> B["1re ouverture = t0<br/>tardives = ouvertures après t0 + 48 h"]
  B --> R{"au moins une<br/>tardive ?"}
  R -->|non| R0["Rouvre (tout) = 0<br/>Rouvre sans renvoi = 0"]
  R -->|oui| R1["Rouvre (tout) = 100"]
  R1 --> S{"une tardive en origine app<br/>OU aucun lien_partage<br/>entre t0 et elle ?"}
  S -->|oui| S1["Rouvre sans renvoi = 100"]
  S -->|non| S0["Rouvre sans renvoi = 0"]

  A --> TY{"ID visiteur =<br/>un ID appareil connu ?"}
  TY -->|oui| ON["Type = onboardé<br/>Dans le plafond = 1"]
  TY -->|non| IN["Type = invité"]
  IN --> PL{"parmi les N premiers invités<br/>de la partie ?<br/>(N = nb de participations)"}
  PL -->|oui| PL1["Dans le plafond = 1"]
  PL -->|non| PL0["Dans le plafond = 0"]
```

Le plafond évite qu'un lien très partagé gonfle H2 : on ne compte pas plus d'invités qu'il n'y avait de joueurs autour de la table. Le champ calculé `Filtre · 1re ouverture il y a 48 h+` (côté Airtable) écarte les lignes trop récentes pour être jugées.

### 7.3 `Loodi-mate - Rapport KPI hebdo`

```mermaid
flowchart TB
  T["⏰ Chaque vendredi 9h<br/>Schedule Trigger"]
  L1["Lire Parties"]
  L2["Lire Joueurs"]
  L3["Lire Participations"]
  L4["Lire Événements"]
  L5["Lire Visiteurs souvenir"]
  K["Calculer les KPI<br/>Code → { sujet, html }"]
  M["Send an Email<br/>SMTP · format HTML"]
  T --> L1 --> L2 --> L3 --> L4 --> L5 --> K --> M
```

Les cinq lectures sont chaînées (Execute Once, Always Output Data) pour que le nœud Code puisse lire chacune par son nom via `$('…')`, même quand une table est vide.

Contenu du mail :

```mermaid
flowchart LR
  K["Calculer les KPI"] --> Head["En-tête<br/>onboardés / 8–12<br/>parties · saisisseurs<br/>(+ cette semaine)"]
  K --> S1["H1 Enregistrement<br/>réutilisation ≥ 50 %<br/>durée médiane < 60 s<br/>terminées ≥ 90 % (créées 24 h+)<br/>participants non onboardés<br/>clics CTA"]
  K --> S2["H2 Souvenirs<br/>rouvre 48 h+ sans renvoi ≥ 50 %<br/>(total, onboardés, invités)<br/>rouvre tout compris<br/>liens · visiteurs uniques"]
  K --> S3["H3 Statistiques<br/>saisisseurs consultant 2+ fois ≥ 50 %<br/>total consultations"]
```

Chaque KPI porte une pastille "Seuil atteint", "Sous le seuil" ou "Pas encore de données", et son effectif `n` (effectifs faibles pendant le test).

À compléter dans n8n avant usage : `fromEmail` / `toEmail` (valeurs d'exemple dans l'export), credential SMTP, et `LOGO_URL` dans le nœud Code (PNG public, sinon pastille de repli).
