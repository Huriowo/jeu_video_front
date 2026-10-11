/***********************************************************************/
/** NIVEAU 2
/** Carte Tiled 'map2' (2400 x 1600 px), ciel fixe, bottes de double saut,
/** porte de retour vers le Niveau 1 et porte FINALE (écran de victoire).
/** Les assets et les animations sont chargés dans Preload.js.
/***********************************************************************/
class Niveau2 extends NiveauBase {
  constructor() {
    super({ key: 'Niveau2' });
  }

  create() {
    this.initialiserNiveau();

    // Musique de fond : si elle joue déjà (venant du Niveau 1), elle continue sans coupure
    changerAmbiance(this, 'variation');

    // 1. Fond fixe (uniquement le ciel, sans images de scrolling)
    this.ciel = this.add.tileSprite(0, 0, 1920, 1080, 'img_ciel2')
      .setOrigin(0, 0)
      .setScrollFactor(0);

    // 2. Tilemap Niveau 2 (2400 x 1600 px)
    const map2 = this.make.tilemap({ key: 'map2' });
    const tileset2 = map2.addTilesetImage('tileset', 'tiles');

    // Calques de décor (sans collision) : l'ordre de création = l'ordre d'affichage
    map2.createLayer('décor', tileset2, 0, 0);
    map2.createLayer('décor2', tileset2, 0, 0);
    const platformsLayer = map2.createLayer('plateformes', tileset2, 0, 0);

    platformsLayer.setCollisionByProperty({ collide: true });

    // 3. Portes de la Map 2
    // 'porte' (x: 201, y: 1316) : retour au Niveau 1, toujours ouverte
    const portePoint = map2.findObject('objets', obj => obj.name === 'porte');
    const doorX = portePoint ? portePoint.x : 201;
    const doorY = portePoint ? portePoint.y : 1316;
    this.porte = this.creerPorte(doorX, doorY, false);

    // 'porte2' : porte FINALE, en haut de la tour. Grisée tant que les ennemis ne sont pas tous vaincus.
    const porte2Point = map2.findObject('objets', obj => obj.name === 'porte2');
    this.porteFinale = this.creerPorte(
      porte2Point ? porte2Point.x : 194,
      porte2Point ? porte2Point.y : 515,
      true
    );

    // 4. Joueurs (apparaissent devant la porte au Niveau 2) et collisions avec la carte
    this.creerJoueurs(doorX, doorY);
    this.collisionJoueurs(platformsLayer);

    // Tir : le pistolet ramassé au Niveau 1 est conservé (mémorisé dans le registre)
    this.configurerTirs(platformsLayer);

    // Ennemis placés dans Tiled (voir NiveauBase)
    this.configurerEnnemis(map2, platformsLayer);

    // Bottes de double saut : objet 'botte1' du calque d'objets de Tiled.
    // On ne les crée pas si elles ont déjà été ramassées (niveau relancé après une mort).
    const bottesPoint = map2.findObject('objets', obj => obj.name === 'botte1');
    this.bottes = null;
    if (bottesPoint && this.registry.get('doubleSaut') !== true) {
      this.bottes = this.physics.add.staticSprite(bottesPoint.x, bottesPoint.y, 'img_botte').setScale(0.8);
      // Le premier joueur qui les touche les ramasse pour toute l'équipe
      this.joueurs.forEach((joueur) => {
        this.physics.add.overlap(joueur, this.bottes, () => this.ramasserBottes(), null, this);
      });
    }

    // Caméra & Limites
    this.cameras.main.setBounds(0, 0, map2.widthInPixels, map2.heightInPixels);
    this.physics.world.setBounds(0, 0, map2.widthInPixels, map2.heightInPixels);

    // 5. Entrées clavier (joueur 1 et joueur 2)
    this.configurerClavier();
  }

  update() {
    if (this.enTransition) return;

    // Déplacements, tirs, pistolets affichés et caméra
    this.deplacerJoueurs();
    this.gererTirs();
    this.mettreAJourArmes();
    this.mettreAJourEnnemis();
    this.mettreAJourCamera();

    // Retour au Niveau 1 : un joueur sur la porte + sa touche d'action
    if (this.actionSurPorte(this.porte)) {
      // On précise qu'on veut réapparaître à la porte dans le Niveau 1
      this.ouvrirPorte(this.porte, () => this.scene.start('Niveau1', { depart: 'porte' }));
    }

    // Porte finale : elle s'ouvre seulement si tous les ennemis sont vaincus, et mène à la victoire
    if (this.actionSurPorte(this.porteFinale)) {
      if (this.porteFinale.verrouillee) {
        this.refuserPorte();
      } else {
        this.ouvrirPorte(this.porteFinale, () => this.scene.start('Victoire'));
      }
    }
  }
}
