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
        y: 800 // gravité verticale : acceleration ddes corps en pixels par seconde
      },
      debug: true // permet de voir les hitbox et les vecteurs d'acceleration quand mis à true
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

// Variables pour les couches de parallaxe
var ciel;
var fond1;

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
    this.load.image("img_fond1", "src/assets/fond_layer1.png");
    this.load.image("img_fond2", "src/assets/fond_layer2.png");
    this.load.image("img_soleil", "src/assets/Sun.png");
    this.load.tilemapTiledJSON('map', 'src/mapresource.json');
    this.load.spritesheet("img_perso", "src/assets/hero2.png", {
    frameWidth: 80,
    frameHeight: 80,
  });
    this.load.spritesheet('img_porte', 'src/assets/animDoor.png', {
    frameWidth: 55,
    frameHeight: 75,
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
  // 1. Fonds en TileSprite (ancrés à l'écran via setScrollFactor(0))
  sun = this.add.tileSprite(0, 0, 200, 200, "img_soleil")
  ciel = this.add.tileSprite(0, 0, 1920, 1080, "img_ciel")
    .setOrigin(0, 0)
    .setScrollFactor(0);

  const hauteurFond1 = this.textures.get('img_fond1').getSourceImage().height;
  const hauteurFond2 = this.textures.get('img_fond2').getSourceImage().height;

  fond2 = this.add.tileSprite(0, 800, 1920, hauteurFond2, "img_fond2")
    .setOrigin(0, 1)
    .setScrollFactor(0);
  fond1 = this.add.tileSprite(0, 1080, 1920, hauteurFond1, "img_fond1")
    .setOrigin(0, 1)
    .setScrollFactor(0);

  // 2. Tilemap
  const map = this.make.tilemap({ key: 'map' });

  // Remplace 'spritebgresource' par le nom réel de ton jeu de tuiles dans Tiled
  const tileset = map.addTilesetImage('spritebgresource', 'tiles');
  const spawnPoint = map.findObject('objets', obj => obj.name === 'spawn_player');

  const startX = spawnPoint ? spawnPoint.x : 100;
  const startY = spawnPoint ? spawnPoint.y : 1300;

  // 'plateformes' tout en minuscules comme dans le JSON
  const platformsLayer = map.createLayer('plateformes', tileset, 0, 0);
  const decorLayer = map.createLayer('décor', tileset, 0, 0);

  const objetsLayer = map.getObjectLayer('objets');
  
  // Active les tuiles solides (adapte selon ta propriété Tiled)
  platformsLayer.setCollisionByProperty({ collide: true });

  // 3. Joueur
  player = this.physics.add.sprite(startX, startY, 'img_perso');
  player.body.setSize(45, 70);
  player.body.setOffset(20, 10);
  player.setCollideWorldBounds(true);
  player.setBounce(0.2); 
  player.body.onWorldBounds = true; 

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

  player.body.world.on(
    "worldbounds", // evenement surveillé
    function (body, up, down, left, right) {
      // on verifie si la hitbox qui est rentrée en collision est celle du player,
      // et si la collision a eu lieu sur le bord inférieur du player
      if (body.gameObject === player && down == true) {
        // si oui : GAME OVER on arrete la physique et on colorie le personnage en rouge
        this.physics.pause();
        player.setTint(0xff0000);
      }
    },
    this
  ); 

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

  this.anims.create({
    key: 'anim_porte',
    frames: this.anims.generateFrameNumbers('img_porte', { start: 0, end: 10 }),
      frameRate: 50,
      repeat: 1,
  });
}


/***********************************************************************/
/** FONCTION UPDATE 
/***********************************************************************/

function update() {
  // Mise à jour de la position des textures pour l'effet parallaxe
  const camX = this.cameras.main.scrollX;
  fond1.tilePositionX = camX * 0.4;  // Premier plan d'arrière-plan (plus rapide)
  fond2.tilePositionX = camX * 0.2;
  if (clavier.right.isDown) {
    player.setVelocityX(275);
    player.anims.play('anim_tourne_droite', true); 
  } 
  else if (clavier.left.isDown) {
    player.setVelocityX(-275);
    player.anims.play('anim_tourne_gauche', true); 
  } else {
    player.setVelocityX(0);
    player.anims.play('anim_face'); 
  } 
  if ((clavier.up.isDown || clavier.space.isDown) && player.body.blocked.down) {
    player.setVelocityY(-450);
  }
}