---
name: Loodi-mate
description: Compagnon de partie de l'écosystème Loodi — chaque partie devient un souvenir.
colors:
  mate-green: "#2E8B57"
  mate-green-strong: "#267247"
  mate-green-hover: "#20613D"
  mate-green-text-dark: "#6DAE89"
  mate-green-soft: "#EEF6F2"
  paper: "#FAFAF8"
  paper-dark: "#1A1A18"
  surface: "#FFFFFF"
  warm-subtle: "#F2F0EC"
  warm-subtle-dark: "#3A3A35"
  ink: "#1A1A18"
  ink-dark: "#E8E7E4"
  ink-soft: "#6B6B60"
  ink-soft-dark: "#A3A39A"
  glass-navy-dark: "rgba(17,24,39,0.7)"
  loodi-orange: "#CA4A16"
  loodi-sun: "#F5C842"
  info-text: "#1D4ED8"
  info-surface: "#EFF6FF"
  success-text: "#047857"
  danger: "#DC2626"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
  title:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
  quote:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.375
  body:
    fontFamily: "DM Sans, Inter, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.05em"
  caption:
    fontFamily: "DM Sans, Inter, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  control: "12px"
  card: "18px"
  dialog: "20px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.mate-green-strong}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.mate-green-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.warm-subtle}"
  button-ghost:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.control}"
    height: "48px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "12px 16px"
  card-selected:
    backgroundColor: "{colors.mate-green-soft}"
    rounded: "{rounded.card}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 16px"
  chip-player:
    textColor: "{colors.mate-green-strong}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
---

# Design System: Loodi-mate

## Overview

**Creative North Star: "La boîte à souvenirs"**

Chaque partie enregistrée devient un objet qu'on garde : une image, un résultat, une phrase qui raconte ce qui s'est passé. Le système visuel sert cette promesse en s'effaçant. L'interface est un papier chaud et calme, la typographie éditoriale (Playfair) porte les moments qui comptent (titres, fait marquant), et le vert Mate n'apparaît que là où il y a une action ou une victoire. Pendant la saisie, autour de la table et d'une main, tout est sobre, large et rapide ; après la partie, le souvenir prend la place : image pleine largeur, gagnant, récit.

Mate est une app de l'écosystème Loodi et en hérite la charte via `@loodi/ui` (tokens, MiniHeader, barre du bas). Loodi-collec et Loodi-friends font référence : un écart avec leurs patterns est un défaut, pas un style. Les composants sont chaleureux et posés : fonds chauds, bords doux, sélection lue par une teinte plutôt que par un contour, ombres presque absentes.

Mate rejette explicitement le tableur et le dashboard de scores (grilles denses à la BG Stats), l'esthétique gaming néon, et le registre enfantin ou cartoon : la voix Loodi est ludique sans être enfantine.

**Key Characteristics:**
- Papier chaud (#FAFAF8) et surfaces « warm » (#F2F0EC) en clair ; graphite chaud (#1A1A18) en sombre.
- Un seul accent de module, le vert Mate, décliné en tokens locaux pour tenir le contraste AA.
- Playfair pour les titres et le fait marquant, DM Sans pour tout le reste.
- Shell partagé Loodi : MiniHeader de 52 px en haut, barre de navigation flottante en verre en bas.
- Clair et sombre à parité, safe areas natives, `prefers-reduced-motion` respecté.

## Colors

Un papier chaud presque neutre, un graphite chaud en sombre, et un seul accent vert réservé à l'action et à la victoire.

### Primary
- **Vert Mate** (mate-green) : couleur du module Mate dans l'écosystème Loodi. Utilisée pleine pour les anneaux de focus, les contours d'accent et les teintes ; jamais comme texte (contraste insuffisant).
- **Vert Mate profond** (mate-green-strong) : fond des boutons principaux sous texte blanc, et accent utilisé comme texte en clair (AA).
- **Vert Mate pressé** (mate-green-hover) : survol et appui des boutons principaux.
- **Vert Mate clair** (mate-green-text-dark) : accent utilisé comme texte en mode sombre (AA sur le graphite).
- **Vert Mate voile** (mate-green-soft) : fond teinté de la sélection et des éléments mis en avant (partie en cours, jeu choisi, vainqueur, carte du gagnant). En sombre, le voile passe à 16 % de vert.

Ces quatre déclinaisons sont des tokens locaux (`--color-module-mate-strong|hover|text|soft` dans `src/styles/index.css`), à remonter dans `@loodi/ui` au passage du MVP au produit final.

### Secondary
- **Orange Loodi** (loodi-orange) et **Soleil Loodi** (loodi-sun) : couleurs de marque de l'écosystème, présentes uniquement dans le logo et la tuile « Mate » du header. Elles ne servent jamais d'accent d'interface dans Mate.

### Neutral
- **Papier** (paper) / **Graphite chaud** (paper-dark) : fond de page.
- **Surface** (surface) : cartes, champs, boutons secondaires. En sombre, blanc à 5 %.
- **Warm** (warm-subtle / warm-subtle-dark) : contours, séparateurs, fonds de survol, piste des contrôles segmentés. C'est l'équivalent de `border-warm` dans Collec.
- **Encre** (ink / ink-dark) : texte principal.
- **Encre douce** (ink-soft / ink-soft-dark) : métadonnées, labels de section, icônes secondaires.
- **Verre marine** (glass-navy-dark) : verre de la barre du bas en mode sombre, conservé tel quel.

### Status
- **Info** (info-text sur info-surface) : bandeaux d'information, comme l'aperçu de la vue invité.
- **Succès** (success-text) : confirmations courtes (« Lien copié »).
- **Danger** (danger) : erreurs et actions destructives.

### Named Rules
**The One Accent Rule.** Le vert Mate est le seul accent de l'interface. L'orange et le jaune Loodi restent dans le logo.

**The AA Accent Rule.** Le vert Mate pur ne porte jamais de texte. Le texte d'accent utilise `accent-text` (profond en clair, clair en sombre) ; le texte blanc se pose sur `accent-strong`.

## Typography

**Display Font:** Playfair Display (avec Georgia, serif)
**Body Font:** DM Sans (avec Inter, system-ui)

**Character:** Un serif éditorial réservé aux moments de récit (titres de page, nom du jeu, fait marquant), face à une sans humaniste, chaleureuse et très lisible, pour tout ce qui se manipule.

### Hierarchy
- **Display** (600, 1,75 rem, 1,15) : titre de page (`page-title`) et nom du jeu sur le souvenir.
- **Title** (700, 1,25 rem, 1,2) : titres des feuilles du bas et des états vides.
- **Quote** (400 italique, 1,125 rem, 1,375) : le fait marquant, en citation.
- **Body** (400, 0,9375 rem, 1,5) : texte courant ; 1 rem pour les lignes de liste et les champs.
- **Label** (500, 0,75 rem, espacement 0,05 em, capitales) : labels de section (`section-label`), en encre douce.
- **Caption** (500, 0,6875 rem) : libellés de la barre du bas.

### Named Rules
**The Story Serif Rule.** Playfair ne sert qu'à raconter (titres, nom du jeu, fait marquant). Les boutons, champs, listes et chiffres sont en DM Sans.

**The French Typography Rule.** Apostrophe typographique, espace insécable avant « : », « ? », « ! » et dans les guillemets (règle de PRODUCT.md, appliquée aussi aux libellés visuels).

## Layout

Mobile d'abord : une colonne centrée de 560 px maximum, avec des marges latérales de 20 px. Le MiniHeader est fixe en haut (52 px plus la safe area) ; la barre de navigation flotte en bas, à 16 px du bord, 448 px maximum. Le contenu réserve sa place sous le header et au-dessus de la barre ; quand un écran a une barre d'action fixe (feuille de score, souvenir), la navigation se masque.

Le rythme vertical s'appuie sur l'échelle Loodi (4, 8, 12, 16, 20 px) : 10 px entre les lignes d'une liste, 24 px entre les sections. Les pages de détail (le souvenir) suivent la page détail de Collec : header au-dessus, image 3:2 bord à bord, contenu en dessous ; aucun élément fixe ne recouvre le haut de page, pour pouvoir s'intégrer sous le shell de Loodi-one.

**The No Overlay Header Rule.** Rien ne passe sous le MiniHeader au repos : le contenu commence à son bord inférieur. Seule exception, la couverture de l'accueil, comme la scène d'accueil de Collec : une image d'ambiance sous un voile couleur fond, opaque en haut, qui garde le header lisible.

## Elevation & Depth

Le système est plat par défaut ; la profondeur vient du tonal (papier, surface, warm) et du verre. Les ombres sont rares et ambiantes, jamais structurelles.

### Shadow Vocabulary
- **Ambient mid** (`0 10px 15px -3px rgba(0,0,0,0.05)`) : barre de navigation flottante.
- **Large** (ombre `shadow-lg` de Tailwind) : feuilles du bas, au-dessus d'un fond assombri et flouté.
- **Petite** (`shadow-sm`) : segment actif d'un contrôle segmenté.

### Named Rules
**The Flat Card Rule.** Les cartes n'ont pas d'ombre : un fond surface et un contour warm de 1 px suffisent.

## Shapes

Des bords doux et réguliers : 12 px pour tout ce qui se touche (boutons, champs, vignettes), 18 px pour les cartes, 20 px pour le haut des feuilles du bas et les dialogues, pilule pour les puces et la barre de navigation. Contours de 1 px uniquement, en warm. Les vignettes de jeu sont arrondies et recadrées en couverture.

## Components

### Buttons
Calqués sur le Button de Collec.
- **Shape :** coins doux (12 px), hauteur 48 px, `font-medium`.
- **Primary :** vert Mate profond, texte blanc ; survol et appui en vert pressé.
- **Secondary :** surface et contour warm, texte encre ; survol sur fond warm.
- **Ghost :** texte encre douce ; survol sur fond warm, texte encre.
- **Focus :** anneau de 2 px en vert Mate, décalé de 2 px.

### Chips
- **Puce joueur sélectionnée :** pilule, contour vert, fond vert à 15 %, texte d'accent, croix pour retirer.
- **Suggestion :** pilule sans contour sur fond warm, texte encre douce, icône « + » au trait ; contour vert au survol.

### Cards / Containers
- **Corner Style :** 18 px.
- **Background :** surface ; voile vert pour l'état sélectionné ou en cours.
- **Shadow Strategy :** aucune (voir Elevation).
- **Border :** 1 px warm ; vert à 30 % quand sélectionné.
- **Internal Padding :** 12 px × 16 px.

### Inputs / Fields
- **Style :** surface, contour warm de 1 px, 12 px, hauteur 48 px.
- **Focus :** contour vert Mate.
- **Error :** texte d'aide en rouge danger sous le champ.

### Navigation
- **MiniHeader** partagé (`@loodi/ui`) : logo Loodi et tuile « Mate », retour quand il y a lieu, sans menu ni compte ; verre qui apparaît au défilement.
- **Barre du bas** (copie locale alignée sur `bottom-nav.css`) : pilule de verre, trois onglets (Parties, Nouvelle partie, Stats), icônes au trait de 20 px. Onglet actif en vert Mate, indicateur en pilule concentrique avec la barre (retrait de 4 px), inactifs à 72 % d'opacité pour tenir l'AA.

### Bottom Sheet
Calquée sur Collec : poignée, titre en Playfair, croix de 44 px, fond assombri et flouté, entrée en glissement de 250 ms.

### Couverture d'accueil (signature)
L'image de la partie mise en avant (photo, sinon visuel du jeu calé en haut) remplit le haut de l'accueil, sous le header, derrière un voile dégradé couleur fond (opaque en haut, transparent au milieu, opaque en bas). Dessus : le salut en label vert, le titre en Display 32 px, la ligne de contexte (« Dernier souvenir · date » pour un souvenir), le gagnant avec trophée pour un souvenir, et un bouton principal (« Reprendre la partie » ou « Revoir le souvenir »). Une partie en cours passe avant le dernier souvenir.

### Souvenir (signature)
Image 3:2 bord à bord (photo de la partie, sinon visuel du jeu calé en haut), bouton photo en surimpression (36 px, fond noir à 40 % flouté, icône blanche de 16 px). Puis le nom du jeu en Display, la carte du gagnant sur voile vert avec trophée, le fait marquant en citation (Playfair italique, filet vert à gauche), puis le classement en lignes simples.

## Do's and Don'ts

### Do:
- **Do** reprendre d'abord le pattern équivalent de Collec ou Friends avant d'en inventer un.
- **Do** consommer `@loodi/ui` tel quel (tokens, MiniHeader) et créer un token local nommé comme le futur token partagé quand il manque.
- **Do** montrer la sélection par le voile vert (mate-green-soft), avec un contour d'accent discret.
- **Do** utiliser `accent-text` pour tout texte vert et `accent-strong` sous du texte blanc.
- **Do** garder des cibles tactiles de 44 px minimum, 48 px pour les contrôles principaux.

### Don't:
- **Don't** construire des grilles de chiffres façon tableur ou dashboard : un score se lit en ligne simple, le souvenir passe avant les statistiques.
- **Don't** utiliser de néons, de fonds saturés ou d'effets « gaming ».
- **Don't** glisser vers l'enfantin : pas de couleurs primaires vives, pas d'illustrations cartoon, pas d'emoji.
- **Don't** utiliser l'orange Loodi comme accent d'interface dans Mate.
- **Don't** faire passer du contenu sous le MiniHeader au repos (hors couverture voilée de l'accueil) ni ajouter d'éléments fixes en haut de page.
- **Don't** modifier `@loodi/ui` depuis Mate.
