# MEDIA — Ajouter des images et des sons

> Question de départ : *« comment j'ajoute des images dans l'appli, et comment
> faire en sorte qu'elles apparaissent sur toutes les plateformes ? »*

Il y a **trois façons** de donner une image à une créature (ou un son à un
biome), et elles n'ont pas du tout les mêmes conséquences.

| Voie | Apparaît sur | Hors connexion | Effort |
| --- | --- | --- | --- |
| **1. Fichier du dépôt** *(recommandé)* | tous les appareils | ✅ oui | dépôt + déploiement |
| **2. Adresse `https://`** | tous les appareils | ❌ non | copier-coller |
| **3. Import depuis l'appareil** | **cet appareil seulement** | ✅ oui | immédiat |

---

## 1. Fichier du dépôt — la voie recommandée

C'est la seule qui donne, sans aucun serveur, une image visible partout et
disponible hors connexion. Le fichier est publié avec le site sur GitHub Pages
et mis en cache par le Service Worker.

1. Déposez l'image dans le dépôt :

   ```
   public/media/creatures/pikachu.png
   ```

2. Dans `#/admin → Images`, choisissez la créature et saisissez le chemin
   **sans `public/`** :

   ```
   media/creatures/pikachu.png
   ```

3. Commit, push. Le déploiement publie l'image avec le site.

Formats conseillés : **PNG** avec fond transparent, carré, 256 × 256 px environ.
Une image plus grande fonctionne, mais alourdit le chargement sur iPad.

Les mêmes règles valent pour les autres médias :

```
public/media/biomes/foret.jpg        →  media/biomes/foret.jpg
public/media/music/foret.m4a         →  media/music/foret.m4a
public/media/voice/professor/x.m4a   →  media/voice/professor/x.m4a
```

## 2. Adresse externe

Collez une adresse complète dans le champ « Image de la créature » :

```
https://exemple.org/images/pikachu.png
```

Elle s'affiche sur tous les appareils, **tant que le site distant reste
disponible et que l'iPad a du réseau**. À éviter pour une application censée
fonctionner en voiture ou en avion.

## 3. Import depuis l'appareil

`#/admin → Images → Importer depuis cet appareil`.

Pratique pour essayer une image en dix secondes. Mais le fichier est rangé dans
le stockage du navigateur (IndexedDB) : **il n'existe que sur cet appareil**.
L'Admin le signale explicitement.

---

## Faire voyager le CONTENU, pas seulement les images

Attention : sans Firebase, **le contenu lui-même est local à l'appareil**. Si
vous associez une image à une créature sur le Mac, l'iPad ne le saura pas — même
si l'image, elle, est bien dans le dépôt.

Deux solutions.

### A. Déposer le contenu dans le dépôt (sans serveur)

1. `#/admin → Releases → Exporter le contenu` → télécharge `bundle.json`.
2. Placez ce fichier dans le dépôt :

   ```
   public/content/bundle.json
   ```

3. Commit, push.

Au prochain chargement, l'application détecte ce fichier et l'adopte comme
**contenu de référence** : tous les appareils reçoivent vos créatures, vos
textes, votre carte et vos images.

Deux garde-fous :

- une release publiée depuis l'Admin (`release_0002` et suivantes) n'est
  **jamais** écrasée par cette voie — seul le contenu de référence l'est (§97) ;
- hors connexion, l'application ne remplace rien : elle garde ce qui est
  installé.

Pensez à changer `contentVersion` dans le fichier exporté à chaque nouvelle
version — c'est ce champ que l'application compare pour savoir s'il faut
adopter le nouveau contenu.

### B. Activer Firebase

Renseignez les variables `VITE_FIREBASE_*` (voir `.env.example`). Le contenu,
les sauvegardes et les médias sont alors partagés entre tous les appareils, en
temps réel, et l'Admin devient utilisable depuis n'importe lequel d'entre eux.

C'est la bonne solution si vous prévoyez d'enregistrer beaucoup de voix depuis
l'iPad et de jouer sur un autre appareil.

---

## Si une image manque

L'enfant ne voit **jamais** d'image cassée (§174) : la créature retombe
automatiquement sur son dessin généré en SVG. Côté Admin, la provenance de
chaque image est affichée en clair : *Dessin généré*, *Fichier du site*,
*Adresse externe* ou *Cet appareil uniquement*.
