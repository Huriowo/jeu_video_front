/***********************************************************************/
/** NIVEAU 1
/** Carte Tiled 'map1' (4800 x 1600 px), fonds en parallaxe, porte vers le Niveau 2.
/** Les assets et les animations sont chargés dans Preload.js.
/***********************************************************************/
class Niveau1 extends NiveauBase {
  constructor() {
    super({ key: 'Niveau1' });
  }

  // Permet de recevoir des données lors du changement de scène
  init(data) {
    // Si on arrive depuis le Niveau 2, on aura data.depart === 'porte'
    this.spawnChoisi = data.depart || 'spawn_player';
  }

  create() {
    this.initialiserNiveau();

    // Musique de fond (en boucle, lancée une seule fois pour tout le jeu)
    changerAmbiance(this, 'base');

    // 1. Fonds Parallaxe (l'ordre de création = l'ordre d'affichage : du plus lointain au plus proche)
    this.ciel = this.add.tileSprite(0, 0, 1920, 1080, 'img_ciel')
      .setOrigin(0, 0)
      .setScrollFactor(0);

    // Le soleil est créé APRÈS le ciel (sinon le ciel, opaque, le recouvre)
    // et reste fixe à l'écran grâce à setScrollFactor(0)
    this.soleil = this.add.image(1650, 170, 'img_soleil')
      .setScrollFactor(0);

    const hauteurFond1 = this.textures.get('img_fond1').getSourceImage().height;
    const hauteurFond2 = this.textures.get('img_fond2').getSourceImage().height;

    this.fond2 = this.add.tileSprite(0, 800, 1920, hauteurFond2, 'img_fond2')
      .setOrigin(0, 1)
      .setScrollFactor(0);
    this.fond1 = this.add.tileSprite(0, 1080, 1920, hauteurFond1, 'img_fond1')
      .setOrigin(0, 1)
      .setScrollFactor(0);

    // 2. Tilemap Niveau 1 (4800 x 1600 px)
    const map = this.make.tilemap({ key: 'map1' });
    const tileset = map.addTilesetImage('spritebgresource', 'tiles');

    const platformsLayer = map.createLayer('plateformes', tileset, 0, 0);
    map.createLayer('décor', tileset, 0, 0);   // décor : pas de collision, on n'a pas besoin de garder une référence
    const mortLayer = map.createLayer('mort', tileset, 0, 0);

    platformsLayer.setCollisionByProperty({ collide: true });
    if (mortLayer) {
      // Calque de pièges : INVISIBLE (Phaser ignore la case "visible" de Tiled)
      // mais toujours ACTIF : les collisions lisent les données des tuiles, pas l'affichage.
      mortLayer.setVisible(false);
      mortLayer.setCollisionByExclusion([-1, 0]);
    }

    // 3. Objets & Coordonnées (calque d'objets 'objets' de Tiled)
    const spawnInitial = map.findObject('objets', obj => obj.name === 'spawn_player');
    const portePoint = map.findObject('objets', obj => obj.name === 'porte');
    const doorX = portePoint ? portePoint.x : 4518;
    const doorY = portePoint ? portePoint.y : 1076;

    // Détermine le point de départ selon qu'on démarre le jeu ou qu'on revient du Niveau 2
    let startX = spawnInitial ? spawnInitial.x : 200;
    let startY = spawnInitial ? spawnInitial.y : 1300;

    if (this.spawnChoisi === 'porte') {
      startX = doorX;
      startY = doorY;
    }

    // Porte vers le Niveau 2 : grisée (fermée) tant que les ennemis du niveau ne sont pas tous vaincus
    this.porte = this.creerPorte(doorX, doorY, true);

    // 4. Joueurs (créés dans NiveauBase) et collisions avec la carte
    this.creerJoueurs(startX, startY);
    this.collisionJoueurs(platformsLayer);

    // Tir : groupe de balles qui s'écrasent sur les plateformes (voir NiveauBase)
    this.configurerTirs(platformsLayer);

    // Ennemis placés dans Tiled (voir NiveauBase)
    this.configurerEnnemis(map, platformsLayer);

    // Pistolet à ramasser : objet 'gun' du calque d'objets de Tiled.
    // On ne le crée pas s'il a déjà été ramassé (retour depuis le Niveau 2, ou niveau relancé).
    const gunPoint = map.findObject('objets', obj => obj.name === 'gun');
    this.pistolet = null;
    if (gunPoint && this.registry.get('armeRamassee') !== true) {
      this.pistolet = this.physics.add.staticSprite(gunPoint.x, gunPoint.y, 'img_pistolet');
      // Le premier joueur qui touche le pistolet le ramasse pour toute l'équipe
      this.joueurs.forEach((joueur) => {
        this.physics.add.overlap(joueur, this.pistolet, () => this.ramasserPistolet(), null, this);
      });
    }

    if (mortLayer) {
      // Quand l'un des joueurs touche un piège, c'est lui qui meurt
      this.collisionJoueurs(mortLayer, (joueur) => this.tuerJoueur(joueur));
    }

    // Caméra & Limites
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // 5. Entrées clavier (joueur 1 et joueur 2)
    this.configurerClavier();
  }

  // Après une mort, on réapparaît là où on était entré dans le niveau
  // (au spawn de départ, ou à la porte si on revenait du Niveau 2)
  recommencerNiveau() {
    this.scene.restart({ depart: this.spawnChoisi });
  }

  update() {
    if (this.enTransition) return;

    // Parallaxe
    const camX = this.cameras.main.scrollX;
    this.fond1.tilePositionX = camX * 0.4;
    this.fond2.tilePositionX = camX * 0.2;

    // Déplacements, tirs, pistolets affichés et caméra
    this.deplacerJoueurs();
    this.gererTirs();
    this.mettreAJourArmes();
    this.mettreAJourEnnemis();
    this.mettreAJourCamera();

    // Un joueur sur la porte + sa touche d'action : la porte s'ouvre, ou refuse si elle est fermée
    if (this.actionSurPorte(this.porte)) {
      if (this.porte.verrouillee) {
        this.refuserPorte();
      } else {
        this.ouvrirPorte(this.porte, () => this.scene.start('Niveau2'));
      }
    }
  }
}
