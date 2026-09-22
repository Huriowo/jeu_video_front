// chargement des librairies

/***********************************************************************/
/** CONFIGURATION GLOBALE DU JEU ET LANCEMENT 
/***********************************************************************/

// configuration générale du jeu
var config = {
  type: Phaser.AUTO,
  width: 1920, // largeur en pixels
  height: 1080, // hauteur en pixels
  physics: {
    // définition des parametres physiques
    default: "arcade", // mode arcade : le plus simple : des rectangles pour gérer les collisions. Pas de pentes
    arcade: {
      // parametres du mode arcade
      gravity: {
        y: 300 // gravité verticale : acceleration ddes corps en pixels par seconde
      },
      debug: false // permet de voir les hitbox et les vecteurs d'acceleration quand mis à true
    }
  },
  scene: {
    // une scene est un écran de jeu. Pour fonctionner il lui faut 3 fonctions  : create, preload, update
    preload: preload, // la phase preload est associée à la fonction preload, du meme nom (on aurait pu avoir un autre nom)
    create: create, // la phase create est associée à la fonction create, du meme nom (on aurait pu avoir un autre nom)
    update: update // la phase update est associée à la fonction update, du meme nom (on aurait pu avoir un autre nom)
  }
};

// création et lancement du jeu
new Phaser.Game(config);
var player;
var clavier;

/***********************************************************************/
/** FONCTION PRELOAD 
/***********************************************************************/

/** La fonction preload est appelée une et une seule fois,
 * lors du chargement de la scene dans le jeu.
 * On y trouve surtout le chargement des assets (images, son ..)
 */
function preload() {
    this.load.image('tiles', "src/assets/tileset.png");
    this.load.image("img_ciel", "src/assets/sky.png"); 
    this.load.tilemapTiledJSON('map', 'src/mapresource.json');
    this.load.spritesheet("img_perso", "src/assets/hero2.png", {
    frameWidth: 80,
    frameHeight: 80,
  });
}

/***********************************************************************/
/** FONCTION CREATE 
/***********************************************************************/

/* La fonction create est appelée lors du lancement de la scene
 * si on relance la scene, elle sera appelée a nouveau
 * on y trouve toutes les instructions permettant de créer la scene
 * placement des peronnages, des sprites, des platesformes, création des animations
 * ainsi que toutes les instructions permettant de planifier des evenements
 */
function create() {
  // 1. Fond en premier pour qu'il reste à l'arrière-plan
  this.add.image(960, 540, "img_ciel");

  // 2. Tilemap
  const map = this.make.tilemap({ key: 'map' });

  // Remplace 'spritebgresource' par le nom réel de ton jeu de tuiles dans Tiled
  const tileset = map.addTilesetImage('spritebgresource', 'tiles');

  // 'plateformes' tout en minuscules comme dans le JSON
  const platformsLayer = map.createLayer('plateformes', tileset, 0, 0);
  
  // Active les tuiles solides (adapte selon ta propriété Tiled)
  platformsLayer.setCollisionByProperty({ collide: true });

  // 3. Joueur
  player = this.physics.add.sprite(100, 450, 'img_perso'); 
  player.setCollideWorldBounds(true); 
  player.setBounce(0.2); 

  // 4. Collider joueur / plateformes
  this.physics.add.collider(player, platformsLayer);

  // 5. Entrées clavier et animations
  clavier = this.input.keyboard.createCursorKeys(); 

  // Définir les limites de la caméra selon la taille réelle de la carte (2400x1600)
  this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

// Définir les limites du monde physique pour que le joueur ne soit pas bloqué à Y=1080
  this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

// Suivre le joueur
  this.cameras.main.startFollow(player);

  this.anims.create({
    key: "anim_tourne_gauche",
    frames: this.anims.generateFrameNumbers("img_perso", { start: 3, end: 4 }),
    frameRate: 6,
    repeat: -1
  }); 

  this.anims.create({
    key: "anim_tourne_droite",
    frames: this.anims.generateFrameNumbers("img_perso", { start: 0, end: 1 }),
    frameRate: 6,
    repeat: -1
  }); 

  this.anims.create({
    key: "anim_face",
    frames: [{ key: "img_perso", frame: 2 }],
    frameRate: 20
  }); 
}

/***********************************************************************/
/** FONCTION UPDATE 
/***********************************************************************/

function update() {
  if (clavier.right.isDown) {
    player.setVelocityX(160);
    player.anims.play('anim_tourne_droite', true); 
  } 
  else if (clavier.left.isDown) {
    player.setVelocityX(-160);
    player.anims.play('anim_tourne_gauche', true); 
  } else {
    player.setVelocityX(0);
    player.anims.play('anim_face'); 
  } 
  if ((clavier.up.isDown || clavier.space.isDown) /* & player.body.touching.down*/) {
      player.setVelocityY(-330);
  }
}

