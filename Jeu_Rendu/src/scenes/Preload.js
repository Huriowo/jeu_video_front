/***********************************************************************/
/** SCENE DE PRECHARGEMENT (Preload)
/** Charge UNE SEULE FOIS tous les assets du jeu et crée toutes les animations.
/** Les autres scènes (Menu, Niveau1, Niveau2) n'ont donc plus de preload() :
/** elles peuvent être lancées dans n'importe quel ordre sans rien oublier.
/***********************************************************************/
class Preload extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload() {
    const largeur = this.scale.width;
    const hauteur = this.scale.height;

    // --- Petite barre de chargement ---
    this.add.text(largeur / 2, hauteur / 2 - 70, 'Chargement…', {
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.add.rectangle(largeur / 2, hauteur / 2, 608, 44).setStrokeStyle(4, 0xffffff);
    const barre = this.add.rectangle(largeur / 2 - 300, hauteur / 2, 0, 32, 0xffffff)
      .setOrigin(0, 0.5);
    // L'événement 'progress' donne une valeur entre 0 et 1
    this.load.on('progress', (valeur) => {
      barre.width = 600 * valeur;
    });

    // --- Décors et tileset ---
    this.load.image('tiles', 'src/assets/tileset.png');
    this.load.image('img_ciel', 'src/assets/sky.png');
    this.load.image('img_ciel2', 'src/assets/sky2.png');
    this.load.image('img_fond1', 'src/assets/fond_layer1.png');
    this.load.image('img_fond2', 'src/assets/fond_layer2.png');
    this.load.image('img_soleil', 'src/assets/Sun.png');

    // --- Menu : un bouton par mode de jeu + logo ---
    this.load.image('img_logo', 'src/assets/logo_game.png');
    this.load.image('img_bouton_1j', 'src/assets/bouton_1joueur.png');
    this.load.image('img_bouton_2j', 'src/assets/bouton_2joueurs.png');

    // --- Écran de victoire ---
    this.load.image('img_bouton_rejouer', 'src/assets/bouton_rejouer.png');

    // --- Objets à ramasser : bottes de double saut ---
    this.load.image('img_botte', 'src/assets/botte1.png');

    // --- Arme et munitions ---
    this.load.image('img_pistolet', 'src/assets/toy_gun.png');
    this.load.image('img_balle', 'src/assets/bullet2.png');

    // --- Cartes Tiled (une par niveau) ---
    this.load.tilemapTiledJSON('map1', 'src/mapresource.json');
    this.load.tilemapTiledJSON('map2', 'src/mapresource2.json');

    // --- Son en .ogg ---
    this.load.audio('musique', [
      'src/assets/audio/main_theme.ogg',
    ]);
    this.load.audio('musique_variation', [
      'src/assets/audio/main_theme2.ogg',
    ]);
    this.load.audio('sfx_tir', 'src/assets/audio/sfx_tir.ogg');
    this.load.audio('sfx_impact', 'src/assets/audio/sfx_impact.ogg');
    this.load.audio('sfx_porte', 'src/assets/audio/sfx_porte.ogg');
    this.load.audio('sfx_mort', 'src/assets/audio/sfx_mort.ogg');
    this.load.audio('sfx_ramassage', 'src/assets/audio/sfx_ramassage.ogg');
    this.load.audio('sfx_degat', 'src/assets/audio/sfx_degat.ogg');
    this.load.audio('sfx_verrou', 'src/assets/audio/sfx_verrou.ogg');
    this.load.audio('sfx_victoire', 'src/assets/audio/sfx_victoire.ogg');
    this.load.audio('sfx_ennemi_mort', 'src/assets/audio/sfx_ennemi_mort.ogg');

    // --- Interface : cœurs de vie (plein / vide) ---
    this.load.image('img_coeur_plein', 'src/assets/coeur1.png');
    this.load.image('img_coeur_vide', 'src/assets/coeur2.png');

    // --- Spritesheets ---
    this.load.spritesheet('img_perso', 'src/assets/hero2.png', {
      frameWidth: 80,
      frameHeight: 80
    });
    // Ennemi au sol : 4 images de 60x75 ; ennemi volant (fantôme) : 4 images de 80x80
    this.load.spritesheet('img_ennemi1', 'src/assets/enemy1.png', {
      frameWidth: 60,
      frameHeight: 75
    });
    this.load.spritesheet('img_ennemi2', 'src/assets/enemy2.png', {
      frameWidth: 80,
      frameHeight: 80
    });
    this.load.spritesheet('img_porte', 'src/assets/animDoor.png', {
      frameWidth: 55,
      frameHeight: 75
    });
  }

  create() {
    // Les animations sont stockées dans le gestionnaire GLOBAL du jeu :
    // créées ici une fois, elles sont utilisables dans toutes les scènes.
    this.anims.create({
      key: 'anim_tourne_gauche',
      frames: this.anims.generateFrameNumbers('img_perso', { start: 3, end: 4 }),
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: 'anim_tourne_droite',
      frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 1 }),
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: 'anim_face',
      frames: [{ key: 'img_perso', frame: 2 }],
      frameRate: 20
    });

    // animDoor.png fait 550 px de large pour des frames de 55 px : 10 frames, numérotées de 0 à 9
    this.anims.create({
      key: 'anim_porte',
      frames: this.anims.generateFrameNumbers('img_porte', { start: 0, end: 9 }),
      frameRate: 15,
      repeat: 0
    });

    // Animations des deux types d'ennemis
    this.anims.create({
      key: 'anim_ennemi1',
      frames: this.anims.generateFrameNumbers('img_ennemi1', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });

    this.anims.create({
      key: 'anim_ennemi2',
      frames: this.anims.generateFrameNumbers('img_ennemi2', { start: 0, end: 3 }),
      frameRate: 5,
      repeat: -1
    });

    // Tout est prêt : on passe à la page d'accueil
    this.scene.start('Menu');
  }
}
