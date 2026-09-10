# Images et sons livrés avec le site

Déposez ici les fichiers que vous voulez voir apparaître **sur tous les
appareils** :

```
public/media/creatures/pikachu.png   →  media/creatures/pikachu.png
public/media/biomes/foret.jpg        →  media/biomes/foret.jpg
public/media/voice/professor/x.m4a   →  media/voice/professor/x.m4a
```

Le chemin à saisir dans `/admin` est celui de droite : **sans `public/`**.

Ces fichiers sont publiés avec le site, mis en cache par le Service Worker et
donc disponibles hors connexion.

Voir `docs/MEDIA.md`.
