# Modifier depuis l'ordinateur, jouer sur l'iPad

> **But** : vous changez une créature, un exercice, une aventure depuis votre
> ordinateur ; l'iPad de votre enfant se met à jour **tout seul**, sans que
> personne n'ait à recharger la page.

Ce document répond à quatre questions :

1. [Quelle est la limite de stockage ?](#1-limite-de-stockage)
2. [Comment l'iPad se met-il à jour tout seul ?](#2-comment-lipad-se-met-à-jour-tout-seul)
3. [Comment modifier l'aventure sans se perdre dans les menus ?](#3-modifier-laventure--le-mode-édition)
4. [Quelle est la procédure, pas à pas ?](#4-la-procédure-pas-à-pas)

---

## 1. Limite de stockage

**Il n'y a pas de chiffre unique.** Chaque navigateur calcule un quota à partir
de l'espace libre du disque de l'appareil. C'est pourquoi Pokexplo **mesure** la
place réellement disponible plutôt que d'annoncer une valeur :

> `/admin` → **Tableau de bord** → panneau **« Stockage sur cet appareil »**

Vous y lisez l'occupation réelle, le quota accordé, et vous pouvez demander le
**stockage persistant**.

Ordres de grandeur, à titre indicatif :

| Navigateur | Quota habituel | Effacement automatique |
| --- | --- | --- |
| Safari / iPadOS | ≈ 20 % de l'espace libre du disque | Oui : après **7 jours** sans visite, pour un site **non ajouté à l'écran d'accueil** |
| Chrome / Edge | jusqu'à 60 % de l'espace libre | Non, tant que le disque n'est pas saturé |

Ce que pèse le contenu :

| Élément | Poids approximatif |
| --- | --- |
| Contenu texte complet (créatures, exercices, carte, quêtes) | 300 à 800 ko |
| Une voix enregistrée (2 à 4 secondes) | 20 à 60 ko |
| Les ~200 voix d'une aventure V1 entièrement doublée | 4 à 12 Mo |
| Une image de créature importée (PNG 512 px) | 50 à 300 ko |

Autrement dit : **le texte ne pèse rien**, ce sont les voix et les images qui
occupent la place — et même une aventure entièrement doublée reste très loin du
quota d'un iPad.

### Deux précautions qui évitent de perdre les sauvegardes

1. **Ajoutez Pokexplo à l'écran d'accueil de l'iPad** (Partager → « Sur l'écran
   d'accueil »). Safari n'efface pas les données d'une application installée.
2. Ouvrez ensuite `/admin` → Tableau de bord → **« Demander le stockage
   persistant »**.

> Une sauvegarde n'est jamais supprimée par l'application elle-même
> (`CLAUDE.md` §2) : elle ne peut disparaître que si le navigateur efface les
> données du site. Les deux étapes ci-dessus suppriment ce risque.

---

## 2. Comment l'iPad se met à jour tout seul

Le contenu de l'aventure tient dans **un seul fichier** :
`public/content/bundle.json`. Dès qu'il change dans le dépôt, la CI reconstruit
le site, et l'iPad le récupère seul.

```
Ordinateur                    GitHub                      iPad de l'enfant
──────────                    ──────                      ────────────────
/admin  ── Envoyer ──▶  public/content/bundle.json
                              │
                              └── CI (deploy.yml) ──▶ gh-pages
                                                          │
                                       vérification automatique :
                                        • au lancement
                                        • à chaque retour au premier plan
                                        • au retour du réseau
                                        • toutes les 10 minutes
                                                          │
                                                    nouvelle version ?
                                                          │
                                        application à un moment sûr (§111) :
                                        jamais pendant un exercice,
                                        un combat ou une capture
```

Trois garanties :

- **L'enfant ne voit rien.** La bascule attend la fin de l'exercice, du combat
  ou de la capture en cours ; elle se fait au retour au Centre.
- **Hors ligne, rien ne bouge.** Si le site est injoignable, le contenu installé
  reste en place et le jeu reste jouable.
- **Une version publiée depuis l'Admin de l'iPad n'est jamais écrasée**
  (§97). Si vous publiez depuis l'iPad lui-même, cet appareil garde sa version
  jusqu'à ce que vous reveniez à la version du site (Admin → Releases).

**Combien de temps ?** Environ 2 minutes de build côté GitHub, puis au plus
10 minutes côté iPad — immédiat si l'application revient au premier plan.

---

## 3. Modifier l'aventure : le mode édition

Naviguer dans treize menus pour changer une phrase, c'est long. Le **mode
édition** permet de modifier l'aventure **là où on la voit** : on ouvre l'écran
de l'enfant, et chaque texte, lieu ou créature devient modifiable d'un geste.

### Y entrer

- `/parents` → **« Modifier l'aventure »**, ou
- `/admin` → **Prévisualiser** → **« Éditer sur place »**.

Un bandeau mauve apparaît en haut : c'est le seul signe que le mode est actif.
Il indique aussi si le brouillon est enregistré. **« Quitter l'édition »** rend
l'écran à l'enfant, à l'identique.

> Un enfant ne peut jamais y entrer : le bouton n'existe que pour un
> administrateur connecté (§93), et le mode n'est pas mémorisé d'une session à
> l'autre.

### Ce qui se modifie, et où l'on touche

| Sur l'écran | On touche | On modifie |
| --- | --- | --- |
| Carte | le crayon sur un lieu | son nom, sa région, ses exercices, sa phrase d'arrivée |
| Carte | le titre d'une région (en mauve) | le nom de la région, son nom court sur la carte |
| Centre | le titre du chapitre | le titre, les voix d'ouverture et de fin |
| Centre | la bulle du Professeur | la quête proposée : titre et répliques |
| Rencontre | la créature | son nom, son habitat, ses syllabes, sa description, sa voix |
| Exercice | la consigne | consigne, deux indices, félicitations — et leurs voix |
| Pokédex | le nom d'une créature | idem créature |

Les textes se saisissent **dans l'enregistreur de voix**, jamais ailleurs :
c'est le seul point d'entrée pour associer une voix à un texte, et c'est lui qui
signale une voix devenue obsolète quand le texte change.

### Ce qui reste dans les menus

Le mode édition modifie ce qui existe. **Créer, supprimer, relier** reste dans
`/admin` : ajouter une créature ou un lieu, composer une Arène, dessiner la
carte, changer le type ou la difficulté d'un exercice, enregistrer une série de
voix à la chaîne. Chaque tiroir propose **« Ouvrir dans les menus »** pour y
aller d'un geste, sur l'élément qu'on regardait.

### Deux vues, un seul brouillon

Le mode édition et les menus écrivent dans **le même brouillon** : ce que vous
changez d'un côté apparaît immédiatement de l'autre, sans rien à synchroniser.
Pendant l'édition, les écrans affichent ce brouillon plutôt que la version
publiée — c'est le mécanisme de « Prévisualiser » (§118).

**Rien n'est publié pour autant.** Tant que vous n'avez pas fait
`Admin → Releases → Publier` (puis, pour l'iPad, `Envoyer sur le site`),
l'enfant continue de jouer la version en service.

> **Utilisez un profil de test.** Le mode édition se pose sur une vraie partie :
> ouvrir une rencontre depuis la carte démarre réellement cette rencontre dans
> la sauvegarde ouverte. Créez un profil « Test » depuis l'accueil pour explorer
> l'aventure sans toucher à la progression de votre enfant.

---

## 4. La procédure, pas à pas

Une fois l'aventure modifiée — en mode édition, dans les menus, ou les deux —
il reste à l'envoyer sur l'iPad.

### Option A — un bouton (recommandé)

Une seule préparation, une fois pour toutes.

**Préparation (5 minutes) :**

1. Sur GitHub : votre photo → **Settings** → **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Réglez :
   - **Repository access** : *Only select repositories* → votre dépôt Pokexplo ;
   - **Permissions** → *Repository permissions* → **Contents : Read and write** ;
   - **Expiration** : ce que vous voulez (il faudra le régénérer ensuite).
3. Copiez le jeton (`github_pat_…`).
4. Sur votre ordinateur, ouvrez le site → `/admin` → **Releases** → panneau
   **« Envoyer le contenu sur l'iPad et tous les appareils »**.
5. Vérifiez le propriétaire et le nom du dépôt (ils sont pré-remplis depuis
   l'adresse du site), collez le jeton, laissez la branche vide.

> Le jeton reste **dans le navigateur de cet ordinateur**. Il n'entre jamais
> dans le dépôt, ni dans une publication, ni dans un contenu exporté
> (`CLAUDE.md` §2). Le bouton **« Oublier le jeton »** l'efface.

**À chaque modification :**

1. `/admin` sur votre ordinateur → modifiez créatures, exercices, biomes,
   nœuds, arènes, quêtes, textes…
2. Vérifiez le **Tableau de bord** : aucune erreur rouge.
3. **Releases** → **« Envoyer sur le site »**.
4. C'est fini. L'iPad se met à jour seul.

### Option B — sans jeton, en déposant le fichier

1. `/admin` → **Releases** → **« Déposer le fichier soi-même »** →
   **« Exporter le contenu »**. Vous obtenez `bundle.json`.
2. Sur github.com, ouvrez votre dépôt → dossier `public/content/` →
   **Add file** → **Upload files** → déposez `bundle.json` → **Commit changes**.
3. C'est fini : la CI reconstruit, l'iPad suit.

> L'export **estampille** toujours un nouveau numéro de version. C'est ce
> numéro, et lui seul, qui déclenche la mise à jour sur l'iPad : ne modifiez
> jamais `contentVersion` à la main.

### Et les images et les voix ?

Le fichier `bundle.json` ne transporte **que du texte et des chemins**. Trois
origines possibles (détail dans `docs/MEDIA.md`) :

| Origine | Voyage avec `bundle.json` ? | Quoi faire |
| --- | --- | --- |
| Fichier du dépôt (`public/media/…`) | **Oui** | Déposez l'image dans `public/media/creatures/` et indiquez ce chemin dans Admin → Images |
| Adresse externe (`https://…`) | **Oui** | Collez l'adresse dans Admin → Images |
| Import depuis l'appareil | **Non** | Le fichier reste sur l'appareil qui l'a importé |

L'Admin vous prévient explicitement, au moment de l'export, si des images
n'existent que sur cet appareil.

Les **voix enregistrées** suivent la même règle : elles vivent dans le magasin
de médias de l'appareil qui les a enregistrées. Pour les diffuser partout, il
faut soit les déposer dans `public/media/`, soit utiliser Firebase (option C).
En attendant, le jeu reste utilisable : la voix de synthèse prend le relais et
**l'absence de voix ne fait jamais planter l'application**.

### Option C — Firebase (temps réel, aucune reconstruction)

Utile seulement si vous voulez que les **voix enregistrées** et les **images
importées** voyagent elles aussi, et que la mise à jour soit immédiate.

1. Créez un projet sur [console.firebase.google.com](https://console.firebase.google.com).
2. Activez **Authentication** → méthodes **E-mail/mot de passe** *et* **Anonyme**.
3. Créez votre compte administrateur (e-mail + mot de passe).
4. Activez **Firestore** et **Storage**.
5. Dans Firestore, créez le document `playerAccounts/<votre-uid>` avec le champ
   `role: "ADMIN"`. L'uid s'affiche dans le message d'erreur si vous tentez
   d'entrer dans l'Admin avant cette étape.
6. Déployez les règles de sécurité du dépôt (`firestore.rules`,
   `storage.rules`) : elles sont en **deny by default**.
7. Sur GitHub : dépôt → **Settings** → **Secrets and variables** → **Actions** →
   ajoutez les six valeurs de la configuration Web Firebase :
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
8. Relancez le déploiement (**Actions** → *Deploy* → *Run workflow*).

L'écran d'accès à l'Admin demande alors un **e-mail et un mot de passe** au lieu
d'un code : le rôle ADMIN vit dans Firestore et n'est jamais accordé depuis le
navigateur. L'enfant, lui, joue avec un compte anonyme créé automatiquement.

Ensuite, **Admin → Releases → Publier** suffit : l'iPad voit le nouveau pointeur
de release et bascule, sans reconstruction du site.

---

## En cas de problème

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| L'iPad n'a pas changé | La CI n'a pas fini | Onglet **Actions** du dépôt : le workflow *Deploy* doit être vert |
| L'iPad n'a toujours pas changé | L'application est en arrière-plan | Ouvrez-la : la vérification se fait au retour au premier plan |
| L'iPad garde son ancienne aventure | Vous aviez publié une release **depuis l'iPad** | Admin sur l'iPad → **Releases** → revenez à la version du site |
| « GitHub refuse le jeton » | Permission manquante ou jeton expiré | Régénérez un jeton avec **Contents : Read and write** sur ce dépôt |
| Des images manquent | Elles avaient été importées depuis un appareil | Déposez-les dans `public/media/creatures/`, ou passez par Firebase |
| Le bouton « Envoyer » est grisé | Le contenu comporte des erreurs | Admin → **Tableau de bord** : corrigez les lignes rouges |
