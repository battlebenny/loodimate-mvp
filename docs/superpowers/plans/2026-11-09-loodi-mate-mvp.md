# Loodi-mate MVP : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** livrer la PWA Loodi-mate (parcours P0 à P6, événements de mesure H1 à H3) en production sur Vercel pour la démo du 16 novembre 2026, puis une copie d'exercice sur Lovable.

**Architecture :** SPA Vite/React servie par Vercel. Toute la logique serveur vit dans `server/core/` (Web standard, sans dépendance), derrière une fonction Vercel unique `api/router.ts`. La logique métier pure (scores, fait marquant, noms, stats) vit dans `shared/` et sert au front comme au serveur. Airtable est le seul stockage, accessible uniquement côté serveur.

**Tech Stack :** Vite 6, React 19, TypeScript 5.6, Tailwind CSS 4, React Router 7, vite-plugin-pwa 1, Vitest, `@loodi/ui` (tokens, lecture seule), `@loodi/assets`, `@fontsource/*`.

**Spec :** `docs/superpowers/specs/2026-11-08-loodi-mate-mvp-design.md`. Les sources qu'il référence font partie de la spec et sont à lire avant toute tâche :
- `CLAUDE.md` (ID Airtable des tables et des champs) ;
- `Mon projet - Loodi-mate.md` et `Wireframes Loodi-mate.md` (dossier Obsidian indiqué dans `CLAUDE.md`) ;
- maquettes : copie locale non versionnée dans `.wireframes/*.dc.html` (le canevas claude.ai fait foi). Les maquettes fixent le **contenu et les textes** des écrans. Leur style (Inter, noir, bleu) est un style de wireframe à remplacer par l'identité Loodi.

## Global Constraints

- Code et commentaires en anglais, textes d'interface en français.
- Aucun token côté client. Secrets serveur : `AIRTABLE_API_TOKEN`, `AIRTABLE_BASE_ID`, `BGG_API_TOKEN`. Ne jamais lire `.env` ni `.env.*` (règle du projet).
- Airtable : toujours utiliser les ID de champs et de tables de `CLAUDE.md`, jamais les noms. Lire avec `returnFieldsByFieldId=true`. Ne jamais écrire dans un champ calculé, ni créer, renommer ou supprimer un champ.
- Dates écrites en ISO UTC. Dates affichées et date de la Ref de partie en `Europe/Paris`.
- Imports relatifs dans `server/` et `shared/` avec l'extension `.js` (convention de collec, réécrite en `.ts` pour Deno au portage Lovable). `server/` et `shared/` n'importent ni React, ni `process`, ni un paquet npm.
- `@loodi/ui` est consommé en lecture seule (`@loodi/ui/tokens.css`). Rien n'est modifié dans `Loodi-apps/`.
- Accent : `var(--color-module-mate)` (#2E8B57), uniquement sur l'action principale et les états actifs. Surfaces opaques, cibles tactiles ≥ 44 px, contraste AA, clair/sombre selon le système, `prefers-reduced-motion` respecté.
- Valeurs Airtable des listes : templates `scores par manche` | `vainqueur seulement` ; statuts `en cours` | `terminée` ; origines `app` | `lien` ; actions `appareil_cree`, `creation_debut`, `partie_creee`, `partie_terminee`, `lien_partage`, `souvenir_ouvert`, `cta_clic`, `stats_consultees`.
- Une branche par tâche (`feat/<nom>`), fusionnée dans `main` après revue. Commits courts, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Points réservés à Benny** (spec §12) : structure des dossiers, gestion d'état, API interne, messages d'erreur et de chargement, icônes, micro-animations. Ce plan les fixe et Benny le valide. Tout écart à ce plan sur ces points doit lui être demandé avant d'être codé.

## Review Focus

1. **iOS : l'app installée n'a pas le même stockage que Safari.** Un testeur qui s'onboarde dans Safari puis installe l'app se retrouve avec un nouvel ID appareil, et son prénom est déjà pris. Comportement attendu : sur iOS hors mode installé, l'écran Bienvenue invite d'abord à installer l'app. Si le prénom appartient déjà à un joueur avec appareil, l'app propose « C'est toi sur un autre appareil ? », qui ajoute le nouvel ID appareil au joueur (liste séparée par des virgules dans le même champ). Tests : Task 3 (`linkDevice` ajoute sans écraser) et Task 2 (formule de recherche par `FIND`).
2. **Apostrophes et accents dans les noms** (« Azul : Pavillon d'été », « Inès », « D'Artagnan ») dans les formules `filterByFormula`. Attendu : pas d'erreur 422 et une correspondance exacte, insensible à la casse. Test : Task 2 (`escapeFormulaString`, `byNameFormula`).
3. **Scores négatifs** (Skull King) : le clavier numérique iOS n'a pas de signe moins. Attendu : un bouton « ± » par joueur inverse le signe de la dernière case touchée, et les totaux et vainqueurs gèrent les négatifs. Tests : Task 1 (`computeTotal` avec négatifs, `preselectWinners` avec totaux tous négatifs) et Task 9 (bouton ±).
4. **Partie « vide » au moment de Terminer** : aucun score saisi ou tous les totaux à 0 en « scores par manche », ou aucun vainqueur coché en « vainqueur seulement » (décidé le 09/11). Attendu :
   - une confirmation avant d'enregistrer : « Aucun score saisi » ou « Aucun vainqueur choisi », puis « Terminer quand même ? » [Terminer quand même] [Revenir à la feuille] ;
   - si le joueur confirme, la partie passe en `terminée` (elle compte pour H1) ;
   - elle n'apparaît **pas** dans les stats, mais reste dans l'historique et a son souvenir ;
   - aucun vainqueur présélectionné, bandeau « Pas de vainqueur · Touche pour choisir », fait marquant vide avec « Ajouter un fait marquant ».
   
   Tests : Task 1 (`isEmptyResult`, `preselectWinners` → `[]` si tout est null ou à 0, `buildHighlight` → `null`), Task 8 (dialogue de confirmation) et Task 12 (partie vide exclue des stats).
5. **Envoi en double** : un double tap sur « Créer » ou « Terminer », ou une relance d'événement après une erreur réseau. Attendu : une seule partie créée, un seul `partie_terminee`, pas d'événement dupliqué. Tests : Task 6 (`finishParty` sur une partie déjà terminée ne réémet rien), Task 4 (événement en relance avec un ID existant ignoré) et Task 8 (bouton désactivé pendant l'envoi).

---

## Structure des fichiers

```
api/router.ts                  Vercel adapter → server/core/router.ts
vercel.json                    rewrites /api/* → /api/router?path=*, SPA fallback
dev/api-plugin.ts              Vite dev middleware mounting the same core router
server/core/
  env.ts                       type Env
  http.ts                      HttpError, json(), readJson()
  router.ts                    handle(path, request, env): Promise<Response>
  airtable/schema.ts           table + field IDs, select values
  airtable/client.ts           AirtableClient (list, create, update, uploadAttachment)
  airtable/formula.ts          escapeFormulaString, byNameFormula, byIdsFormula, byDeviceFormula
  bgg.ts                       searchGames (XML → JSON)
  services/players.ts          onboarding, lookup, known names
  services/games.ts            findOrCreateGame, setGameTemplate
  services/parties.ts          create, saveSheet, finish, updateSouvenir, read, list
  services/photos.ts           addPhoto
  services/events.ts           recordEvent
  services/stats.ts            loadStats → shared/stats
shared/
  types.ts  scoring.ts  highlight.ts  french.ts  names.ts  refs.ts  stats.ts  token.ts
src/
  main.tsx  App.tsx  styles/index.css
  lib/api.ts  lib/device.ts  lib/track.ts  lib/draft.ts  lib/image.ts  lib/format.ts
  components/shell/{AppShell,MiniHeader,BottomNav}.tsx  components/ui/*.tsx
  features/{onboarding,home,new-party,sheet,souvenir,guest,stats}/*.tsx
scripts/port-lovable.mjs  scripts/purge-demo.mjs  scripts/demo-manifest.json
tests/ (mirrors shared/ and server/)
```

## API interne (contrat entre les tâches)

Chaque appel envoie l'en-tête `X-Device-Id` quand il est connu. Erreurs : `{ error: { code: string, message: string } }`, où `message` est en français et affichable tel quel.

| Méthode et route | Corps / requête | Réponse |
|---|---|---|
| `GET /players/me` | | `PlayerDTO` ou 404 |
| `POST /players/onboard` | `{ firstName, mode: 'new' \| 'claim' \| 'link' }` | `PlayerDTO`, ou 409 `{code:'claimable'\|'taken'}` |
| `GET /players/lookup?name=` | | `{ status: 'free' \| 'unclaimed' \| 'onboarded', player?: {id,name} }` |
| `GET /players/known` | | `{ names: string[] }` (joueurs des parties créées par l'appareil, hors joueur de l'appareil) |
| `GET /games/search?q=` | | `{ results: BggGame[] }` (max 6) |
| `POST /parties` | `CreatePartyInput` | `PartyDTO` |
| `GET /parties?status=en cours\|terminée` | | `{ parties: PartySummaryDTO[] }` |
| `GET /parties/:id` | | `PartyDTO` (créateur uniquement) |
| `PUT /parties/:id/sheet` | `SheetInput` | `PartyDTO` |
| `POST /parties/:id/finish` | `SheetInput` | `PartyDTO` (statut terminée, fait marquant généré) |
| `PATCH /parties/:id/souvenir` | `{ scores?, winners?, highlight? }` | `PartyDTO` |
| `POST /parties/:id/photos` | `{ base64, contentType, filename }` | `PartyDTO` |
| `GET /shared/:token` | | `PartyDTO` sans `shareToken` ni droits d'écriture |
| `GET /stats` | | `StatsDTO` |
| `POST /events` | `EventInput` | 204 |

---

### Task 0 : socle du projet, déployé de bout en bout

**Files :**
- Create : `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles/index.css`, `server/core/env.ts`, `server/core/http.ts`, `server/core/router.ts`, `api/router.ts`, `dev/api-plugin.ts`, `vercel.json`, `public/` (icônes PWA)
- Test : `tests/server/router.test.ts`

**Interfaces :**
- Produces : `type Env = { AIRTABLE_API_TOKEN: string; AIRTABLE_BASE_ID: string; BGG_API_TOKEN: string }`. `handle(path: string, request: Request, env: Env): Promise<Response>`. `class HttpError extends Error { status: number; code: string }`. `json(data: unknown, status?: number): Response`. Route de santé `GET /health` → `{ ok: true }`.

- [ ] **Step 1 :** initialiser le projet en reprenant `package.json` et `tsconfig.json` de `Loodi-apps/loodi-collec` comme modèle (mêmes versions majeures, `"type": "module"`, `allowImportingTsExtensions`, `strict`, `noUncheckedIndexedAccess`). Dépendances : `react`, `react-dom`, `react-router-dom`, `@loodi/ui`, `@loodi/assets`, `@fontsource/playfair-display`, `@fontsource/dm-sans`, `@fontsource/jetbrains-mono`. Dev : `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `vite-plugin-pwa`, `vitest`, `@vercel/node`, `typescript`. Scripts : `dev`, `build` (`tsc -b && vite build`), `test` (`vitest run`).
- [ ] **Step 2 : écrire le test qui échoue** `tests/server/router.test.ts` :
  ```ts
  it('answers health', async () => {
    const res = await handle('health', new Request('http://x/api/health'), env)
    expect(res.status).toBe(200); expect(await res.json()).toEqual({ ok: true })
  })
  it('returns 404 json on unknown route', async () => {
    const res = await handle('nope', new Request('http://x/api/nope'), env)
    expect(res.status).toBe(404); expect((await res.json()).error.code).toBe('not_found')
  })
  it('maps HttpError to its status and code', ...) // a route throwing new HttpError(409,'taken','…') → 409
  ```
- [ ] **Step 3 :** lancer `npx vitest run tests/server/router.test.ts`. Attendu : FAIL (module absent).
- [ ] **Step 4 :** implémenter `server/core/http.ts` et `router.ts`. Le routeur fait correspondre la méthode et le chemin à une table de routes (paramètres `:id`, `:token`). Les tâches suivantes ajoutent leurs routes dans cette table. Toute erreur non prévue → 500 `{code:'internal'}`, sans fuite du message Airtable.
- [ ] **Step 5 :** relancer le test. Attendu : PASS.
- [ ] **Step 6 :** écrire `api/router.ts`, qui exporte `GET`, `POST`, `PUT` et `PATCH` en signature Web (`(request: Request) => Response`). Il lit `path` dans la query et l'`Env` dans `process.env`. Écrire aussi `vercel.json` :
  ```json
  { "rewrites": [
    { "source": "/api/:path*", "destination": "/api/router?path=:path*" },
    { "source": "/((?!api/).*)", "destination": "/index.html" } ] }
  ```
  Puis `dev/api-plugin.ts` : un middleware Vite (`configureServer`) qui convertit la requête Node en `Request`, charge l'env via `loadEnv(mode, cwd, '')` et appelle `handle`.
- [ ] **Step 7 :** écrire `src/styles/index.css` : `@import "tailwindcss"`, `@import "@loodi/ui/tokens.css"`, polices `@fontsource` (Playfair 600/700, DM Sans 400/500/600/700, JetBrains Mono 400). Ajouter un bloc `@theme inline` qui expose les alias utilisés (`--color-bg: var(--color-theme-bg)`, surfaces, textes, bordures, `--color-accent: var(--color-module-mate)`, polices, rayons). `body` reçoit fond, police et couleur des tokens. Le thème sombre suit `prefers-color-scheme`, en appliquant la classe attendue par `tokens.css` : lire ce fichier pour connaître le sélecteur.
- [ ] **Step 8 :** PWA (`vite-plugin-pwa`) : `registerType: 'autoUpdate'`, nom « Loodi-mate », `short_name` « Mate », `display: 'standalone'`, `theme_color: '#2E8B57'`, `lang: 'fr'`. Icônes 192, 512 et maskable, plus `apple-touch-icon` 180, générées depuis `Loodi-apps/design/assets/icons/mate.svg` copié dans `public/` (outil : `@vite-pwa/assets-generator`). `navigateFallbackDenylist: [/^\/api\//]` et aucun `runtimeCaching` sur `/api`.
- [ ] **Step 9 : vérifier** `npm run build` (sans erreur), `npm run dev`, puis `curl -s localhost:5173/api/health` → `{"ok":true}`.
- [ ] **Step 10 :** commit `chore: scaffold vite app, core router, pwa`, puis push de la branche et fusion dans `main`.
- [ ] **Step 11 (action de Benny) :** créer le projet Vercel lié au repo `battlebenny/loodimate-mvp` (preset « Vite »), saisir les 3 variables d'environnement, déployer. **Vérifier** que `https://<domaine>/api/health` → `{"ok":true}` et qu'une route profonde (`/stats`) sert l'app. Si la signature Web échoue sur Vercel, repli : adaptateur `VercelRequest`/`VercelResponse` converti en `Request` dans `api/router.ts` (comme `loodi-collec/api/bgg.ts`), sans toucher au cœur.

### Task 1 : logique métier pure (`shared/`)

**Files :**
- Create : `shared/types.ts`, `shared/scoring.ts`, `shared/french.ts`, `shared/highlight.ts`, `shared/names.ts`, `shared/refs.ts`, `shared/token.ts`
- Test : `tests/shared/scoring.test.ts`, `highlight.test.ts`, `names.test.ts`, `refs.test.ts`, `token.test.ts`

**Interfaces :**
- Produces :
  ```ts
  type Template = 'scores par manche' | 'vainqueur seulement'
  type Scores = (number | null)[]              // one entry per round
  computeTotal(scores: Scores): number | null   // null when every cell is empty
  preselectWinners(totals: { id: string; total: number | null }[]): string[]   // [] when every total is null or 0
  isEmptyResult(template: Template, totals: (number | null)[], winnerIds: string[]): boolean
  type HighlightInput = { template: Template; gameName: string;
    players: { id: string; name: string; total: number | null }[];
    winnerIds: string[]; previousBestOfWinner: number | null }
  buildHighlight(i: HighlightInput): string | null
  withDe(name: string): string                  // "de Benny" | "d'Inès"
  withQue(name: string): string                 // "que Benny" | "qu'Inès"
  points(n: number): string                     // "1 point" | "12 points" | "-1 point"
  joinNames(names: string[]): string            // "X", "X et Y", "X, Y et Z"
  sameName(a: string, b: string): boolean       // trim + case-insensitive (accents significant)
  normalizeName(raw: string): string            // trim, collapse spaces
  slugify(s: string): string                    // "Azul : Pavillon d'été" → "azul-pavillon-d-ete"
  partyRef(gameName: string, createdAt: Date): string          // "azul-2026-11-04" (Paris date)
  participationRef(partyRef: string, playerName: string): string // "azul-2026-11-04 · Benny"
  newShareToken(): string                       // 12 chars [A-Za-z0-9], crypto.getRandomValues
  ```
  `shared/types.ts` définit aussi les DTO de l'API interne (`PlayerDTO`, `BggGame`, `CreatePartyInput`, `SheetInput`, `PartyDTO`, `PartySummaryDTO`, `StatsDTO`, `EventInput`) avec les champs utilisés par les tâches 3 à 12. `SheetInput = { template: Template; rounds: number; scores: Record<string /*participationId*/, Scores>; winners: string[] /*participationIds*/ }`.

- [ ] **Step 1 : écrire les tests qui échouent.** Valeurs exactes :
  - `computeTotal([8,12,10])` → 30 ; `[8,null,-3]` → 5 ; `[null,null]` → null.
  - `preselectWinners` : `[a:30,b:30,c:12]` → `[a,b]` ; `[a:-5,b:-2]` → `[b]` ; tous null → `[]` ; tous à 0 (ou null et 0 mélangés) → `[]`.
  - `isEmptyResult(template, totals, winnerIds)` : « scores par manche » avec totaux tous null ou à 0 et sans vainqueur coché → true ; avec un total à 12 → false ; « vainqueur seulement » sans vainqueur → true ; avec un vainqueur → false ; vainqueur coché à la main sur une feuille sans score → false.
  - `buildHighlight`, une règle par test, dans l'ordre de priorité (textes de `Wireframes Loodi-mate.md`) :
    - égalité `a=30,b=30`, winners `[a,b]` → `"Égalité entre Léa et Max avec 30 points"` ; à 3 → `"Égalité entre Léa, Max et Inès avec 30 points"` ;
    - record : winner Inès 58, `previousBestOfWinner` 51 → `"Nouveau record d'Inès sur Azul : 58 points"` ; `previousBestOfWinner` null (aucune partie précédente) → pas de record ; 58 = 58 → pas de record ;
    - écart : Léa 47, Benny 41 → `"Victoire de Léa avec 47 points, 6 de plus que Benny"` ; second Inès → `"…, 6 de plus qu'Inès"` ; écart 1 → `"1 de plus"` ;
    - « vainqueur seulement » → `"Belle victoire de Léa"`, `"Belle victoire d'Inès et Max"` ; partie à un seul joueur → `"Belle victoire de Léa"` ;
    - vainqueurs choisis à la main différents des meilleurs totaux → règle 4 (`"Belle victoire de …"`) ;
    - aucun vainqueur → `null`.
  - `withDe` : « Inès », « Élodie », « Yann », « Hugo », « Ôscar » → « d'Inès », « d'Élodie », « d'Yann », « de Hugo », « d'Ôscar » (voyelles a e i o u y, accentuées comprises, majuscule ou non ; pas d'élision devant h).
  - `sameName(' thomas ', 'Thomas')` → true ; `('Ines','Inès')` → false.
  - `partyRef('Azul', new Date('2026-11-04T23:30:00Z'))` → `"azul-2026-11-05"` (date de Paris).
  - `newShareToken()` : longueur 12, regex `/^[A-Za-z0-9]{12}$/`, 1 000 tirages tous distincts.
- [ ] **Step 2 :** `npx vitest run tests/shared`. Attendu : FAIL.
- [ ] **Step 3 :** implémenter. Le fait marquant applique la première règle qui s'applique, avec ces définitions :
  - « vainqueurs automatiques » = `preselectWinners`, et les règles 1 à 3 ne s'appliquent que si `winnerIds` y correspond exactement (même ensemble) ;
  - règle 1 : au moins 2 vainqueurs ;
  - règle 2 : un seul vainqueur et `total > previousBestOfWinner` (non null) ;
  - règle 3 : un seul vainqueur et au moins 2 joueurs avec un total ; le second est le meilleur total suivant.
- [ ] **Step 4 :** relancer. Attendu : PASS.
- [ ] **Step 5 :** commit `feat(shared): scoring, highlight, names, refs`.

### Task 2 : client Airtable et formules

**Files :**
- Create : `server/core/airtable/schema.ts`, `client.ts`, `formula.ts`
- Test : `tests/server/airtable.test.ts`

**Interfaces :**
- Consumes : `Env`, `HttpError`.
- Produces :
  ```ts
  const T = { players, games, parties, participations, events }   // table IDs from CLAUDE.md
  const F = { players: { name, device, onboardedAt, createdParties, participations }, games: {...}, parties: {...}, participations: {...}, events: {...} } // writable + read field IDs
  type AirRecord = { id: string; createdTime: string; fields: Record<string, unknown> }
  class AirtableClient {
    constructor(env: Env, fetchImpl?: typeof fetch)
    list(table: string, opts?: { filterByFormula?: string; fields?: string[]; sort?: { field: string; direction: 'asc'|'desc' }[]; maxRecords?: number }): Promise<AirRecord[]>   // follows offset pagination
    getByIds(table: string, ids: string[]): Promise<AirRecord[]>                  // chunks of 50 via byIdsFormula
    create(table: string, rows: Record<string, unknown>[]): Promise<AirRecord[]>  // chunks of 10
    update(table: string, rows: { id: string; fields: Record<string, unknown> }[]): Promise<AirRecord[]> // PATCH, chunks of 10
    uploadAttachment(recordId: string, fieldId: string, file: { base64: string; contentType: string; filename: string }): Promise<void>
  }
  escapeFormulaString(s: string): string          // escapes \ and '
  byNameFormula(fieldId: string, name: string): string   // LOWER(TRIM({fld}))=LOWER('…')
  byDeviceFormula(fieldId: string, deviceId: string): string // FIND(',{id},', ','&SUBSTITUTE({fld},' ','')&',')>0
  byIdsFormula(ids: string[]): string             // OR(RECORD_ID()='a',…)
  ```
- [ ] **Step 1 : écrire les tests qui échouent** (avec un `fetch` simulé) :
  - `create` de 23 lignes → 3 requêtes POST de 10, 10 et 3, avec `typecast: false` et des clés de `fields` en ID de champ ;
  - `list` suit `offset` sur 2 pages et envoie `returnFieldsByFieldId=true` ;
  - 429 → une nouvelle tentative après 1 s, puis `HttpError(503,'busy','Le service est très demandé, réessaie dans un instant.')` ;
  - `uploadAttachment` → POST sur `https://content.airtable.com/v0/{baseId}/{recordId}/{fieldId}/uploadAttachment` avec le corps `{contentType,file,filename}` ;
  - `byNameFormula(F.players.name, "D'Artagnan")` contient `'d\'artagnan'` échappé et ne casse pas ;
  - `byDeviceFormula` trouve `abc` dans `"xyz,abc"` mais pas dans `"abcd"`.
- [ ] **Step 2 :** lancer. Attendu : FAIL.
- [ ] **Step 3 :** implémenter (`https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{table}`, `Authorization: Bearer`).
- [ ] **Step 4 :** relancer. Attendu : PASS.
- [ ] **Step 5 :** commit `feat(server): airtable client and formulas`.

### Task 3 : joueurs et onboarding P0

**Files :**
- Create : `server/core/services/players.ts`, `server/core/services/events.ts` (sa fonction `recordEvent` est ajoutée ici pour `appareil_cree`), `src/lib/api.ts`, `src/lib/device.ts`, `src/features/onboarding/WelcomePage.tsx`, `src/components/ui/{Button,TextField}.tsx`
- Modify : `server/core/router.ts` (routes `players/*`), `src/App.tsx`
- Test : `tests/server/players.test.ts`

**Interfaces :**
- Produces :
  ```ts
  findPlayerByDevice(db: AirtableClient, deviceId: string): Promise<PlayerDTO | null>
  onboard(db, deviceId: string, firstName: string, mode: 'new'|'claim'|'link'): Promise<PlayerDTO>
  linkDevice(current: string | null, deviceId: string): string      // "a" + "b" → "a,b", no duplicate
  lookupName(db, name: string): Promise<{ status: 'free'|'unclaimed'|'onboarded'; player?: { id: string; name: string } }>
  recordEvent(db, e: { action: string; origin: 'app'|'lien'; visitorId: string; partyId?: string; eventId?: string; retry?: boolean }): Promise<void>
  // src/lib/device.ts
  getDeviceId(): string | null; setIdentity(deviceId: string, player: PlayerDTO): void; getPlayer(): PlayerDTO | null
  getVisitorId(): string        // deviceId if onboarded, else persistent anonymous UUID
  isIosSafariNotInstalled(): boolean
  // src/lib/api.ts
  api<T>(method: string, path: string, body?: unknown, opts?: { keepalive?: boolean }): Promise<T>  // throws ApiError { status, code, message }
  ```
- [ ] **Step 1 : écrire les tests qui échouent :**
  - `onboard` d'un nouveau prénom → création avec prénom, ID appareil et `Onboardé le` = date UTC du jour, puis émission d'`appareil_cree` (origine app, joueur lié) ;
  - prénom existant sans appareil et mode `new` → `HttpError(409,'claimable')` ; mode `claim` → ID appareil ajouté au joueur existant, `appareil_cree` émis ;
  - prénom existant avec appareil et mode `new` → 409 `taken` ; mode `link` → `linkDevice` ajoute l'ID sans écraser l'ancien ;
  - `linkDevice('a','a')` → `'a'` ; `linkDevice(null,'b')` → `'b'`.
  - `recordEvent` : l'événement porte ID, ID visiteur, action, origine, date ISO et partie. Le joueur est lié s'il est trouvé par ID visiteur. Avec `retry: true` et un ID déjà présent → aucune création.
- [ ] **Step 2 :** lancer. Attendu : FAIL.
- [ ] **Step 3 :** implémenter les services et les routes `GET players/me`, `POST players/onboard`, `GET players/lookup`.
- [ ] **Step 4 :** relancer. Attendu : PASS.
- [ ] **Step 5 :** écrire `WelcomePage`, en reprenant le contenu de `.wireframes/Main.dc.html` :
  - titre « Garde la trace de vos parties », sous-titre, champ « Ton prénom », aide, bouton « C'est parti » ;
  - logo Loodi via `@loodi/assets` ;
  - si `isIosSafariNotInstalled()`, un encart d'abord : « Installe Loodi-mate sur ton écran d'accueil : touche Partager puis « Sur l'écran d'accueil » », avec un lien secondaire « Continuer dans Safari » ;
  - réponse 409 `claimable` → « Un·e {prénom} joue déjà dans vos parties. C'est toi ? » [Oui, c'est moi] [Non] ; « Non » demande d'ajouter une initiale (« Thomas B. ») ;
  - réponse 409 `taken` → « C'est toi sur un autre appareil ? » [Oui] (mode `link`) [Non, ajouter une initiale].
  
  Au démarrage, `App` affiche `WelcomePage` si `getDeviceId()` est absent ou si `GET players/me` → 404.
- [ ] **Step 6 : vérifier** dans le navigateur (vue mobile 390×844, `npm run dev`) :
  - onboarding de « Testdev » → enregistrement Joueurs visible via le connecteur Airtable, plus un événement `appareil_cree` lié ;
  - rechargement → plus d'écran Bienvenue ;
  - supprimer ensuite ces enregistrements de test via le connecteur.
- [ ] **Step 7 :** commit `feat: onboarding P0`.

### Task 4 : shell de l'app (MiniHeader, BottomNav) et suivi d'événements côté client

**Files :**
- Create : `src/components/shell/{AppShell,MiniHeader,BottomNav}.tsx`, `src/components/shell/shell.css`, `src/lib/track.ts`
- Modify : `src/App.tsx`, `server/core/router.ts` (`POST events`)
- Test : `tests/src/track.test.ts`

**Interfaces :**
- Consumes : `recordEvent`, `api`, `getVisitorId`.
- Produces :
  ```ts
  track(action: 'creation_debut'|'lien_partage'|'souvenir_ouvert'|'cta_clic'|'stats_consultees', opts: { origin: 'app'|'lien'; partyId?: string }): void
  // fire-and-forget: eventId = crypto.randomUUID(); one retry after 3 s with retry:true; never throws
  <AppShell title? back? hideNav? >{children}</AppShell>
  ```
- [ ] **Step 1 : écrire les tests qui échouent** (`fetch` simulé) :
  - `track` n'attend jamais le réseau (retour synchrone) ;
  - sur un échec réseau, une seule nouvelle tentative, avec le même `eventId` et `retry: true` ;
  - deux échecs → abandon silencieux (console.warn).
- [ ] **Step 2 :** lancer. Attendu : FAIL. **Step 3 :** implémenter `track` et la route `POST events`. **Step 4 :** PASS.
- [ ] **Step 5 :** recréer MiniHeader et BottomNav en lisant comme référence `Loodi-apps/loodi-one/packages/@loodi/ui/src/MiniHeader.tsx`, `BottomNav.tsx`, `mini-header.css`, `bottom-nav.css` :
  - **MiniHeader** : 52 px plus safe area ; logo et wordmark Loodi (clair et sombre via `@loodi/assets`) ; tuile « Mate » ; bouton retour (`aria-label="Retour"`) à la place du logo quand `back` est fourni ; voile en verre dont l'opacité suit le défilement. Pas de menu, pas de bouton compte.
  - **BottomNav** : 3 entrées, **Parties** (`/`), **Nouvelle partie** (`/nouvelle`), **Stats** (`/stats`), icônes en trait SVG inline, état actif en accent Mate, pas de bouton « Loodi ». Masquée sur `/nouvelle` et `/partie/:id/feuille`.
  
  Rien n'est importé de `@loodi/ui` en dehors des tokens.
- [ ] **Step 6 :** déclarer les routes React Router : `/`, `/nouvelle`, `/partie/:id/feuille`, `/partie/:id`, `/stats`, `/s/:token` (cette dernière hors shell applicatif et sans onboarding).
- [ ] **Step 7 : vérifier** dans le navigateur, en clair et en sombre, en 390×844 : header, navigation entre les 3 onglets, onglet actif en accent, safe areas.
- [ ] **Step 8 :** commit `feat: app shell and event tracking`.

### Task 5 : recherche BGG et jeux

**Files :**
- Create : `server/core/bgg.ts`, `server/core/services/games.ts`
- Modify : `server/core/router.ts` (`GET games/search`)
- Test : `tests/server/bgg.test.ts`, `tests/server/games.test.ts`, `tests/fixtures/bgg-search.xml`, `tests/fixtures/bgg-thing.xml`

**Interfaces :**
- Produces :
  ```ts
  searchGames(q: string, env: Env, fetchImpl?: typeof fetch): Promise<BggGame[]>  // BggGame = { bggId: number; name: string; year: number | null; image: string | null }
  findOrCreateGame(db, g: { bggId?: number; name: string; image?: string | null }): Promise<{ id: string; name: string; template: Template; image: string | null }>
  setGameTemplate(db, gameId: string, template: Template): Promise<void>
  ```
- [ ] **Step 1 : écrire les tests qui échouent :**
  - le XML de recherche (fixture) donne au plus 6 résultats triés, avec les noms décodés (`&amp;` → `&`, `&#039;` → `'`) ;
  - les visuels et l'année viennent de `thing?id=` (appel unique, ID séparés par des virgules) ;
  - les deux appels portent `Authorization: Bearer <BGG_API_TOKEN>` ;
  - une requête de moins de 2 caractères renvoie `[]` sans appel ;
  - BGG en erreur ou en 202 (file d'attente) → `[]` ;
  - `findOrCreateGame` retrouve un jeu par BGG ID, ou par nom sans BGG ID pour un texte libre, sinon le crée avec le template `scores par manche`.
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter (endpoints `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=` puis `/thing?id=`, parsing par expressions régulières sans dépendance, `Cache-Control: public, max-age=86400` sur la réponse de la route). **Step 4 :** PASS.
- [ ] **Step 5 :** commit `feat(server): bgg search and games`.

### Task 6 : parties (création, feuille, fin, souvenir, photos, lecture)

**Files :**
- Create : `server/core/services/parties.ts`, `server/core/services/photos.ts`
- Modify : `server/core/router.ts`
- Test : `tests/server/parties.test.ts`

**Interfaces :**
- Consumes : `AirtableClient`, `findOrCreateGame`, `setGameTemplate`, `recordEvent`, `findPlayerByDevice`, tout `shared/`.
- Produces :
  ```ts
  type CreatePartyInput = { game: { bggId?: number; name: string; image?: string | null };
    players: { name: string; playerId?: string }[]; creationSeconds: number }
  createParty(db, deviceId, input): Promise<PartyDTO>
  saveSheet(db, deviceId, partyId, s: SheetInput): Promise<PartyDTO>
  finishParty(db, deviceId, partyId, s: SheetInput): Promise<PartyDTO>
  updateSouvenir(db, deviceId, partyId, p: { scores?: Record<string, Scores>; winners?: string[]; highlight?: string }): Promise<PartyDTO>
  addPhoto(db, deviceId, partyId, file): Promise<PartyDTO>
  getParty(db, deviceId, partyId): Promise<PartyDTO>
  getSharedParty(db, token): Promise<PartyDTO>
  listParties(db, deviceId, status): Promise<PartySummaryDTO[]>
  previousBestOf(db, playerId: string, gameId: string, excludePartyIds: string[]): Promise<number | null> // deduped via shared/stats findDuplicates
  ```
  `PartyDTO = { id, ref, status, template, rounds, createdAt, finishedAt, creatorName, game: { id, name, image }, players: { participationId, playerId, name, scores, total, winner }[], highlight, photos: { url, thumbUrl }[], shareToken?, canEdit }`.
- [ ] **Step 1 : écrire les tests qui échouent :**
  - `createParty` crée les joueurs inconnus (prénom seul, sans appareil), le jeu si besoin, la partie (Ref, jeu, créateur, statut `en cours`, Créée le, template copié du jeu, Nb manches 1, durée de création arrondie en secondes, jeton de partage), puis les participations (Ref, partie, joueur, scores `"[null]"` ou vides pour « vainqueur seulement »). Elle émet `partie_creee` lié à la partie et au créateur. Le nombre d'appels Airtable reste ≤ 6 pour 4 joueurs dont 2 nouveaux ;
  - `saveSheet` écrit Scores (JSON), Total recalculé côté serveur, Nb manches et template de la partie, et met à jour le template du jeu s'il a changé ;
  - `finishParty` :
    - passe le statut à `terminée` avec Terminée le ;
    - écrit les vainqueurs (ceux de l'entrée s'ils sont fournis, sinon `preselectWinners`) et le fait marquant (`buildHighlight` avec `previousBestOf`) ;
    - émet `partie_terminee` **une seule fois** : une partie déjà terminée → 409 `already_finished`, sans événement ;
  - `updateSouvenir` :
    - après une correction de scores ou de vainqueurs, le fait marquant est régénéré **seulement** si le texte stocké est égal au texte que les règles produisaient pour l'état d'avant (sinon, le texte modifié à la main est gardé) ;
    - `highlight` fourni → texte enregistré tel quel ;
    - Terminée le inchangé ;
  - `addPhoto` : 4e photo → 409 `photo_limit` (« 3 photos maximum ») ; sinon appel à `uploadAttachment` sur le champ Photos ;
  - tout appel en écriture avec un appareil qui n'est pas celui du créateur → 403 `forbidden` ;
  - `getSharedParty` avec un jeton inconnu → 404 ; le DTO renvoyé a `canEdit: false` et pas de `shareToken`.
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter les services et les routes de la table « API interne ». **Step 4 :** PASS.
- [ ] **Step 5 :** commit `feat(server): parties lifecycle`.

### Task 7 : écran Nouvelle partie (P1)

**Files :**
- Create : `src/features/new-party/{NewPartyPage,GamePicker,PlayerPicker}.tsx`
- Modify : `server/core/router.ts` (`GET players/known`, s'il n'existe pas encore), `server/core/services/players.ts` (`knownNames`)
- Test : `tests/server/players.test.ts` (ajout)

**Interfaces :**
- Produces : `knownNames(db, deviceId): Promise<string[]>`. Navigation vers `/partie/:id/feuille` après création.
- [ ] **Step 1 : test qui échoue :** `knownNames` renvoie les joueurs des parties créées par l'appareil, sans doublon, triés par fréquence décroissante, sans le joueur de l'appareil.
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter. **Step 4 :** PASS.
- [ ] **Step 5 :** écrire la page, en reprenant le contenu de `.wireframes/NouvellePartie.dc.html` :
  - `track('creation_debut', {origin:'app'})` une seule fois au montage (garde par `useRef`), et `performance.now()` mémorisé ;
  - Jeu : recherche avec un délai de 250 ms, suggestions BGG (nom et année), ligne « Utiliser « … » tel quel · texte libre », carte du jeu choisi avec « Changer » ;
  - Joueurs : **le joueur de l'appareil est ajouté par défaut** en première puce, sous son prénom (décidé le 09/11), et reste retirable ; champ « Ajouter un joueur » avec bouton « Ajouter » ; suggestions « Déjà venus : » issues de `knownNames` ;
  - avant l'ajout d'un nom tapé, appel à `players/lookup` :
    - `onboarded` ou `unclaimed` → « {Nom} : ce joueur ? » [Oui] [Non, ajouter une initiale] ;
    - nom déjà dans la partie (`sameName`) → demander une initiale ;
  - bouton « Créer la partie », actif dès qu'il y a un jeu et au moins un joueur, désactivé pendant l'envoi ; la durée transmise est `(now − début) / 1000`.
- [ ] **Step 6 : vérifier** dans le navigateur : créer une partie Azul à 3 joueurs en moins de 30 s ; enregistrements et `creation_debut` puis `partie_creee` visibles via le connecteur ; un double tap rapide sur « Créer » ne crée qu'une partie. Supprimer ensuite les données de test.
- [ ] **Step 7 :** commit `feat: new party P1`.

### Task 8 : feuille de score (P1, P3)

**Files :**
- Create : `src/features/sheet/{SheetPage,ScoreBlock,WinnerPicker,PhotoButton}.tsx`, `src/lib/draft.ts`, `src/lib/image.ts`
- Test : `tests/src/draft.test.ts`, `tests/src/image.test.ts`

**Interfaces :**
- Consumes : `PartyDTO`, `SheetInput`, `computeTotal`, `preselectWinners`.
- Produces :
  ```ts
  loadDraft(partyId): SheetInput | null; saveDraft(partyId, s: SheetInput): void; clearDraft(partyId): void
  compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<{ base64: string; contentType: 'image/jpeg'; filename: string }>
  fitWithin(w: number, h: number, maxSide: number): { width: number; height: number }
  ```
- [ ] **Step 1 : écrire les tests qui échouent :**
  - le brouillon survit à un aller-retour par `localStorage` ;
  - passer de 3 à 2 manches tronque les tableaux ; passer de 2 à 3 ajoute `null` ;
  - `fitWithin(4032,3024,1600)` → `{1600,1200}` ; `(800,600,1600)` → inchangé.
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter (`createImageBitmap(file, { imageOrientation: 'from-image' })` → canvas → `toBlob('image/jpeg', quality)`). **Step 4 :** PASS.
- [ ] **Step 5 :** écrire la page, en reprenant `.wireframes/Scores.dc.html` :
  - en-tête : nom du jeu et « Sauvegarde automatique » ;
  - sélecteur « Scores par manche » | « Vainqueur seulement » avec « Choix mémorisé pour ce jeu » ;
  - stepper Manches (minimum 1) ; libellés M1…Mn ; un bloc par joueur avec total en direct ;
  - cases en `type="text" inputmode="numeric"` qui acceptent `-` ; un bouton « ± » par joueur inverse le signe de la dernière case touchée de ce joueur ;
  - « Qui a gagné ? Plusieurs si égalité. » avec cases à cocher pour l'autre template ;
  - bouton photo avec badge n/3 et miniatures (`<input type="file" accept="image/*" capture="environment">`, compression, `POST photos`, inactif à 3) ;
  - « Terminer la partie ».
  
  Chaque modification passe par `saveDraft`. Envoi au serveur (`PUT sheet`) : au changement de manches ou de template ; au retour (bouton retour) ; sur `visibilitychange` hidden avec `keepalive`.
  
  « Terminer » : si `isEmptyResult(...)`, un dialogue (`<dialog>` accessible) s'ouvre d'abord : titre « Aucun score saisi » (« Aucun vainqueur choisi » en « vainqueur seulement »), texte « La partie sera enregistrée comme terminée, mais elle ne comptera pas dans les statistiques. », boutons [Terminer quand même] et [Revenir à la feuille]. Ensuite `POST finish` → `clearDraft` → navigation vers `/partie/:id`, **sans** `souvenir_ouvert`. Pendant l'envoi le bouton est désactivé.
  
  Reprise (P3) : la page charge `GET parties/:id`, puis applique le brouillon local s'il existe. Une partie déjà terminée redirige vers le souvenir.
- [ ] **Step 6 : vérifier** dans le navigateur :
  - partie à 4 joueurs et 3 manches, score négatif via « ± » ;
  - recharger la page en cours de saisie → scores conservés ;
  - photo depuis un fichier de 4 Mo → pièce jointe de moins de 600 Ko dans Airtable ;
  - Terminer → `partie_terminee` émis une fois.
- [ ] **Step 7 :** commit `feat: score sheet P1/P3`.

### Task 9 : souvenir (P2, P4)

**Files :**
- Create : `src/features/souvenir/{SouvenirPage,SouvenirView,WinnerBanner,EditResultSheet,ShareSheet,PhotoViewer,HighlightCard}.tsx`, `src/lib/format.ts`
- Test : `tests/src/format.test.ts`

**Interfaces :**
- Produces :
  ```ts
  <SouvenirView party={PartyDTO} mode="owner" | "guest" onEdit? onShare? onAddPhoto? />  // reused by Task 10
  formatLongDate(iso): string        // "Samedi 7 novembre 2026"
  formatShortDate(iso): string       // "Sam. 31 oct."
  formatTime(iso): string            // "21:10"
  winnerTitle(p: PartyDTO): { title: string; subtitle: string }
  ```
- [ ] **Step 1 : écrire les tests qui échouent :**
  - `winnerTitle` → `"Léa gagne"` avec `"47 points, 6 de plus que Benny"` ;
  - égalité → `"Léa et Max ex aequo"` avec `"Égalité au sommet"` ;
  - aucun vainqueur → `"Pas de vainqueur"` avec `"Touche pour choisir"` ;
  - « vainqueur seulement » → sous-titre vide ;
  - les dates au format de Paris.
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter. **Step 4 :** PASS.
- [ ] **Step 5 :** écrire la vue, en reprenant `.wireframes/Souvenir.dc.html` et `SouvenirVainqueur.dc.html` :
  - grande photo en haut (touche → visionneuse plein écran, balayage pour la suivante) ; sans photo, visuel BGG du jeu, sinon aplat avec « Pas encore de photo · touche pour en ajouter une » ;
  - miniatures numérotées ; bouton photo en surimpression si moins de 3 ;
  - titre du jeu, puis « {date longue} · N joueurs » ;
  - bandeau vainqueur (touche → feuille « Corriger le résultat » : cases à cocher et cellules de score, « OK » → `PATCH souvenir`) ;
  - classement (pas de classement pour « vainqueur seulement ») ;
  - carte « Le fait marquant » avec « Modifier » (texte libre, max 280 caractères), ou « Ajouter un fait marquant » si vide ;
  - bouton « Partager le souvenir » → feuille : « Partager via… (WhatsApp, SMS) » (`navigator.share` avec l'URL `/s/{shareToken}`, titre « {Jeu} · souvenir Loodi-mate ») et « Copier le lien » (presse-papiers, retour « Lien copié »). `track('lien_partage')` est émis après un partage réussi ou une copie, **pas** sur une annulation (`AbortError`). Le bouton natif est masqué si `navigator.share` est absent.
  
  `SouvenirPage` émet `track('souvenir_ouvert', {origin:'app', partyId})` au montage **seulement** quand on arrive depuis l'Accueil (`location.state.from === 'home'`).
- [ ] **Step 6 : vérifier** dans le navigateur :
  - corriger un score → classement et fait marquant mis à jour ;
  - modifier le fait marquant à la main, puis corriger un score → le texte manuel est conservé ;
  - copier le lien → `lien_partage` ;
  - ouverture depuis l'Accueil → `souvenir_ouvert` avec origine `app`.
- [ ] **Step 7 :** commit `feat: souvenir P2/P4`.

### Task 10 : vue invité (P6)

**Files :**
- Create : `src/features/guest/GuestPage.tsx` (ajoute `<meta name="robots" content="noindex">` au montage)

- [ ] **Step 1 :** écrire la page, en reprenant `.wireframes/Invite.dc.html` :
  - MiniHeader sans retour ni menu, pas de BottomNav, aucun onboarding ;
  - bandeau « Souvenir partagé », puis « Partagé par {créateur} · Garde aussi la trace de tes parties » ;
  - `SouvenirView mode="guest"` (rien n'est modifiable, visionneuse photo active) ;
  - bouton discret « Essayer Loodi-mate » → `track('cta_clic', {origin:'lien', partyId})` puis navigation vers `/` ;
  - au montage : `track('souvenir_ouvert', {origin:'lien', partyId})` avec `getVisitorId()` ;
  - jeton inconnu → « Ce souvenir n'existe pas ou plus. » ;
  - `/s/:token` est servi même sans ID appareil.
- [ ] **Step 2 : vérifier** dans une fenêtre de navigation privée (sans ID appareil) : souvenir lisible, `souvenir_ouvert` avec un ID visiteur anonyme ; recharger → même ID visiteur ; CTA → `cta_clic`. Depuis l'appareil créateur, l'ID visiteur est l'ID appareil.
- [ ] **Step 3 :** commit `feat: guest view P6`.

### Task 11 : Accueil, onglet Parties (P3, P4)

**Files :**
- Create : `src/features/home/{HomePage,PartyRow}.tsx`

- [ ] **Step 1 :** écrire la page, en reprenant `.wireframes/Accueil.dc.html`, **sans** le bouton « Nouvelle partie » ni l'icône stats (ils passent dans la BottomNav) :
  - « Salut {prénom} » ;
  - « En cours (n) » : vignette, jeu, puis « Manche N · » seulement en « scores par manche », puis « N joueurs · commencée à HH:MM », et action « Reprendre » → feuille ;
  - « Parties terminées » : vignette (1re photo, sinon visuel BGG), jeu, puis « {date courte} · {Léa gagne | Léa et Max ex aequo} · N photo(s) » → souvenir avec `state: { from: 'home' }` ;
  - état vide : « Aucune partie pour l'instant. Lance la première avec Nouvelle partie. » ;
  - chargement avec squelettes ; en cas d'erreur, message et bouton « Réessayer ».
- [ ] **Step 2 : vérifier** dans le navigateur avec 1 partie en cours et 2 terminées, dont une « vainqueur seulement » (pas de « Manche » affichée).
- [ ] **Step 3 :** commit `feat: home P3/P4`.

### Task 12 : statistiques (P5)

**Files :**
- Create : `shared/stats.ts`, `server/core/services/stats.ts`, `src/features/stats/StatsPage.tsx`
- Modify : `server/core/router.ts` (`GET stats`)
- Test : `tests/shared/stats.test.ts`, `tests/server/stats.test.ts`

**Interfaces :**
- Produces :
  ```ts
  type FinishedParty = { id: string; gameId: string; gameName: string; template: Template; finishedAt: string;
    players: { playerId: string; name: string; total: number | null; winner: boolean }[] }
  findDuplicates(parties: FinishedParty[]): Set<string>      // ids to drop (keeps earliest finishedAt)
  computeStats(meId: string, parties: FinishedParty[]): StatsDTO
  // StatsDTO = { parties: number; wins: number; winRate: number /*integer %*/;
  //   byGame: { gameId; name; parties; wins; best: number|null; avg: number|null; min: number|null; hasScores: boolean }[];
  //   winsByPlayer: { name: string; wins: number }[] }
  loadStats(db, deviceId): Promise<StatsDTO>
  ```
- [ ] **Step 1 : écrire les tests qui échouent :**
  - **doublons** : 2 parties avec même jeu, mêmes joueurs, mêmes vainqueurs, mêmes totaux, terminées à 12 min d'écart → 1 seule comptée ; à 31 min → 2 ; même jeu et mêmes joueurs mais totaux différents → 2 ; « vainqueur seulement », même vainqueur, à 10 min d'écart → 1 (cas limite accepté) ;
  - totaux : parties = 12, victoires = 5 → `winRate` 42 ;
  - par jeu : `best`, `avg` (arrondi entier), `min` calculés sur les totaux **du joueur de l'appareil** ; jeu « vainqueur seulement » → `hasScores: false` et valeurs null ; tri par nombre de parties décroissant ;
  - `winsByPlayer` : victoires de chaque joueur présent dans ces parties, triées décroissant ;
  - seules les parties `terminée` comptent ;
  - une partie vide (`isEmptyResult` vrai : aucun vainqueur et aucun total non nul) est exclue des stats et de `previousBestOf`.
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter. `loadStats` suit cette chaîne : participations du joueur, puis leurs parties terminées, puis toutes leurs participations, puis les jeux et les joueurs (≤ 6 requêtes). `previousBestOf` (Task 6) réutilise `findDuplicates`. **Step 4 :** PASS.
- [ ] **Step 5 :** écrire la page, en reprenant `.wireframes/Stats.dc.html` :
  - « Mes statistiques », puis « Parties où {prénom} a joué » ;
  - 3 tuiles : parties, victoires, % de victoires ;
  - « Par jeu » : « N parties · K victoires », puis « Record » en avant, « moy. · min » en dessous, ou « sans score » ;
  - « Victoires dans ces parties » sous forme de barres, le joueur de l'appareil en accent ;
  - `track('stats_consultees', {origin:'app'})` une fois par montage (garde par `useRef`) ;
  - état vide : « Termine une première partie pour voir tes stats. »
- [ ] **Step 6 : vérifier** dans le navigateur : les chiffres correspondent aux données (connecteur Airtable) ; `stats_consultees` est émis une seule fois.
- [ ] **Step 7 :** commit `feat: stats P5`.

### Task 13 : données de démo et purge

**Files :**
- Create : `scripts/demo-manifest.json`, `scripts/purge-demo.mjs`, `docs/demo.md`

- [ ] **Step 1 :** créer les données via le connecteur Airtable (pas l'app) :
  - 5 joueurs onboardés (Benny, Léa, Max, Inès, Hugo). Benny a l'ID appareil `demo-jedha` (celui du téléphone de démo), les autres `demo-<prénom>`. S'y ajoutent 2 joueurs non onboardés ;
  - 6 jeux réels avec BGG ID et visuel (Azul, 7 Wonders, Skull King, Cascadia, Cardia et Cluedo, ce dernier en « vainqueur seulement ») ;
  - environ 20 parties terminées sur les 5 dernières semaines, dont : un record battu, 2 égalités, un doublon enregistré par deux joueurs, des scores négatifs à Skull King ;
  - 2 parties en cours ;
  - des événements cohérents pour chaque action, avec des réouvertures de lien à plus de 48 h ;
  - 3 photos (images libres de droits) sur 2 parties.
  
  Les ID d'appareil et de visiteur sont préfixés `demo-`. Chaque ID d'enregistrement créé va dans `scripts/demo-manifest.json` (`{ table: string[] }`).
- [ ] **Step 2 :** écrire `purge-demo.mjs` : il lit le manifeste, puis supprime dans l'ordre événements, participations, parties, joueurs et jeux, par lots de 10. Mode `--dry-run` par défaut, `--confirm` pour supprimer. Lancement par Benny : `node --env-file=.env scripts/purge-demo.mjs --dry-run`.
- [ ] **Step 3 :** écrire `docs/demo.md` : comment faire apparaître l'appareil de démo sur le téléphone (URL cachée `/?demo=demo-jedha` qui enregistre l'ID appareil `demo-jedha` en local, décidé le 09/11, **active seulement si l'ID commence par `demo-`**), le scénario de démo des parcours, et la date de purge (après le 16 novembre).
- [ ] **Step 4 : vérifier** : chaque section du dashboard « Pilotage hypothèses » affiche une valeur ; l'app avec l'appareil `demo-jedha` montre Accueil, souvenirs et stats remplis ; `purge-demo.mjs --dry-run` liste exactement le contenu du manifeste.
- [ ] **Step 5 :** commit `chore: demo data manifest and purge script`.

### Task 14 : recette finale (avant la démo)

- [ ] **Step 1 :** `npm test` et `npm run build` sans erreur.
- [ ] **Step 2 :** sur la production Vercel, depuis un vrai téléphone iOS et un Android (Benny) :
  - installation de la PWA, puis onboarding ;
  - une partie complète chronométrée sous la minute jusqu'à « Créer » ;
  - une photo, Terminer, un partage WhatsApp ;
  - ouverture du lien sur un autre téléphone, puis le CTA ;
  - les stats.
- [ ] **Step 3 :** contrôler les 8 actions dans la table Événements, avec les liens Partie et Joueur remplis là où ils sont attendus.
- [ ] **Step 4 :** proposer à Benny le bloc daté de décisions prises pendant le dev, à ajouter dans `Mon projet - Loodi-mate.md`.

### Task 15 : copie d'exercice Lovable (après la démo si besoin)

**Files :**
- Create : `scripts/port-lovable.mjs`, `docs/lovable.md`

- [ ] **Step 1 :** écrire `port-lovable.mjs`, qui produit `dist-lovable/` :
  - `supabase/functions/_shared/{core,shared}` avec les imports `.js` réécrits en `.ts` ;
  - `supabase/functions/api/index.ts` (`Deno.serve`, chemin = ce qui suit `/api/`, `Env` lu dans `Deno.env`) ;
  - le front, avec `VITE_API_BASE` pointant vers l'URL de la fonction.
- [ ] **Step 2 :** écrire `docs/lovable.md` (actions de Benny) :
  - créer le projet Lovable relié à un nouveau repo GitHub ;
  - y pousser `dist-lovable/` ;
  - saisir les 3 secrets dans Lovable Cloud ;
  - vérifier `/health`.
- [ ] **Step 3 : vérifier** `deno check dist-lovable/supabase/functions/api/index.ts` (si Deno est installé), sinon un déploiement de test sur Lovable affiche l'Accueil et `/health`.
- [ ] **Step 4 :** commit `chore: lovable port script`.
