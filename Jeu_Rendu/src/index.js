/***********************************************************************/
/** NIVEAU 1
/***********************************************************************/
class Niveau1 extends Phaser.Scene {
  constructor() {
    super({ key: 'Niveau1' });
  }

  // Permet de recevoir des données lors du changement de scène
  init(data) {
    // Si on arrive depuis le Niveau 2, on aura data.depart === 'porte'
    this.spawnChoisi = data.depart || 'spawn_player';
  }

  preload() {
    this.load.image('tiles', 'src/assets/tileset.png');
    this.load.image('img_ciel', 'src/assets/sky.png'); 
    this.load.image('img_fond1', 'src/assets/fond_layer1.png');
    this.load.image('img_fond2', 'src/assets/fond_layer2.png');
    this.load.image('img_soleil', 'src/assets/Sun.png');
    
    this.load.tilemapTiledJSON('map1', 'src/mapresource.json');

    this.load.spritesheet('img_perso', 'src/assets/hero2.png', {
      frameWidth: 80,
      frameHeight: 80,
    });
    this.load.spritesheet('img_porte', 'src/assets/animDoor.png', {
      frameWidth: 55,
      frameHeight: 75,
    });
  }

  create() {
    this.enTransition = false;

    // 1. Fonds Parallaxe
    this.sun = this.add.tileSprite(0, 0, 200, 200, 'img_soleil');
    this.ciel = this.add.tileSprite(0, 0, 1920, 1080, 'img_ciel')
      .setOrigin(0, 0)
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
    const decorLayer = map.createLayer('décor', tileset, 0, 0);
    const mortLayer = map.createLayer('mort', tileset, 0, 0);

    platformsLayer.setCollisionByProperty({ collide: true });
    if (mortLayer) {
      mortLayer.setCollisionByExclusion([-1, 0]);
    }

    // 3. Objets & Coordonnées
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

    // Porte statique
    this.porte = this.physics.add.staticSprite(doorX, doorY, 'img_porte');

    // 4. Joueur
    this.player = this.physics.add.sprite(startX, startY, 'img_perso');
    this.player.body.setSize(45, 70);
    this.player.body.setOffset(20, 10);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.2); 
    this.player.body.onWorldBounds = true; 

    // Collisions joueur
    this.physics.add.collider(this.player, platformsLayer);
    
    if (mortLayer) {
      this.physics.add.collider(this.player, mortLayer, () => {
        this.tuerJoueur();
      });
    }

    // Caméra & Limites
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player);

    this.player.body.world.on('worldbounds', (body, up, down, left, right) => {
      if (body.gameObject === this.player && down) {
        this.tuerJoueur();
      }
    });

    // 5. Entrées clavier
    this.clavier = this.input.keyboard.createCursorKeys();
    this.toucheAction = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // 6. Animations (vérification d'existence pour éviter les erreurs lors des retours)
    if (!this.anims.exists('anim_tourne_gauche')) {
      this.anims.create({
        key: 'anim_tourne_gauche',
        frames: this.anims.generateFrameNumbers('img_perso', { start: 3, end: 4 }),
        frameRate: 6,
        repeat: -1
      });
    }

    if (!this.anims.exists('anim_tourne_droite')) {
      this.anims.create({
        key: 'anim_tourne_droite',
        frames: this.anims.generateFrameNumbers('img_perso', { start: 0, end: 1 }),
        frameRate: 6,
        repeat: -1
      });
    }

    if (!this.anims.exists('anim_face')) {
      this.anims.create({
        key: 'anim_face',
        frames: [{ key: 'img_perso', frame: 2 }],
        frameRate: 20
      });
    }

    if (!this.anims.exists('anim_porte')) {
      this.anims.create({
        key: 'anim_porte',
        frames: this.anims.generateFrameNumbers('img_porte', { start: 0, end: 10 }),
        frameRate: 15,
        repeat: 0
      });
    }
  }

  tuerJoueur() {
    this.physics.pause();
    this.player.setTint(0xff0000);
  }

  update() {
    if (this.enTransition) return;

    // Parallaxe
    const camX = this.cameras.main.scrollX;
    this.fond1.tilePositionX = camX * 0.4;
    this.fond2.tilePositionX = camX * 0.2;

    // Contrôles
    if (this.clavier.right.isDown) {
      this.player.setVelocityX(275);
      this.player.anims.play('anim_tourne_droite', true); 
    } else if (this.clavier.left.isDown) {
      this.player.setVelocityX(-275);
      this.player.anims.play('anim_tourne_gauche', true); 
    } else {
      this.player.setVelocityX(0);
      this.player.anims.play('anim_face'); 
    } 

    if ((this.clavier.up.isDown || this.clavier.space.isDown) && this.player.body.blocked.down) {
      this.player.setVelocityY(-450);
    }

    // Aller au Niveau 2 : overlap porte + touche E
    const surLaPorte = this.physics.overlap(this.player, this.porte);
    if (surLaPorte && Phaser.Input.Keyboard.JustDown(this.toucheAction)) {
      this.enTransition = true;
      this.player.setVelocity(0, 0);
      this.porte.anims.play('anim_porte', true);

      this.time.delayedCall(450, () => {
        this.scene.start('Niveau2');
      });
    }
  }
}

/***********************************************************************/
/** NIVEAU 2
/***********************************************************************/
class Niveau2 extends Phaser.Scene {
  constructor() {
    super({ key: 'Niveau2' });
  }

  preload() {
    this.load.tilemapTiledJSON('map2', 'src/mapresource2.json');
  }

  create() {
    this.enTransition = false;

    // 1. Fonds Parallaxe
    this.sun = this.add.tileSprite(0, 0, 200, 200, 'img_soleil');
    this.ciel = this.add.tileSprite(0, 0, 1920, 1080, 'img_ciel')
      .setOrigin(0, 0)
      .setScrollFactor(0);

    const hauteurFond1 = this.textures.get('img_fond1').getSourceImage().height;
    const hauteurFond2 = this.textures.get('img_fond2').getSourceImage().height;

    this.fond2 = this.add.tileSprite(0, 800, 1920, hauteurFond2, 'img_fond2')
      .setOrigin(0, 1)
      .setScrollFactor(0);
    this.fond1 = this.add.tileSprite(0, 1080, 1920, hauteurFond1, 'img_fond1')
      .setOrigin(0, 1)
      .setScrollFactor(0);

    // 2. Tilemap Niveau 2 (2400 x 1600 px)
    const map2 = this.make.tilemap({ key: 'map2' });
    const tileset2 = map2.addTilesetImage('tileset', 'tiles');

    const decorLayer = map2.createLayer('décor', tileset2, 0, 0);
    const decor2Layer = map2.createLayer('décor2', tileset2, 0, 0);
    const platformsLayer = map2.createLayer('plateformes', tileset2, 0, 0);

    platformsLayer.setCollisionByProperty({ collide: true });

    // 3. Porte de la Map 2 (x: 201, y: 1316)
    const portePoint = map2.findObject('objets', obj => obj.name === 'porte');
    const doorX = portePoint ? portePoint.x : 201;
    const doorY = portePoint ? portePoint.y : 1316;

    this.porte = this.physics.add.staticSprite(doorX, doorY, 'img_porte');

    // 4. Joueur (apparaît devant la porte au Niveau 2)
    this.player = this.physics.add.sprite(doorX, doorY, 'img_perso');
    this.player.body.setSize(45, 70);
    this.player.body.setOffset(20, 10);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.2); 
    this.player.body.onWorldBounds = true; 

    this.physics.add.collider(this.player, platformsLayer);

    // Caméra & Limites
    this.cameras.main.setBounds(0, 0, map2.widthInPixels, map2.heightInPixels);
    this.physics.world.setBounds(0, 0, map2.widthInPixels, map2.heightInPixels);
    this.cameras.main.startFollow(this.player);

    this.player.body.world.on('worldbounds', (body, up, down, left, right) => {
      if (body.gameObject === this.player && down) {
        this.physics.pause();
        this.player.setTint(0xff0000);
      }
    });

    // 5. Entrées clavier
    this.clavier = this.input.keyboard.createCursorKeys();
    this.toucheAction = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  update() {
    if (this.enTransition) return;

    // Parallaxe
    const camX = this.cameras.main.scrollX;
    this.fond1.tilePositionX = camX * 0.4;
    this.fond2.tilePositionX = camX * 0.2;

    // Contrôles
    if (this.clavier.right.isDown) {
      this.player.setVelocityX(275);
      this.player.anims.play('anim_tourne_droite', true); 
    } else if (this.clavier.left.isDown) {
      this.player.setVelocityX(-275);
      this.player.anims.play('anim_tourne_gauche', true); 
    } else {
      this.player.setVelocityX(0);
      this.player.anims.play('anim_face'); 
    } 

    if ((this.clavier.up.isDown || this.clavier.space.isDown) && this.player.body.blocked.down) {
      this.player.setVelocityY(-450);
    }

    // Retour au Niveau 1 : overlap porte + touche E
    const surLaPorte = this.physics.overlap(this.player, this.porte);
    if (surLaPorte && Phaser.Input.Keyboard.JustDown(this.toucheAction)) {
      this.enTransition = true;
      this.player.setVelocity(0, 0);
      this.porte.anims.play('anim_porte', true);

      // On précise qu'on veut réapparaître à la porte dans le Niveau 1
      this.time.delayedCall(450, () => {
        this.scene.start('Niveau1', { depart: 'porte' });
      });
    }
  }
}

/***********************************************************************/
/** CONFIGURATION DU JEU
/***********************************************************************/
const config = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 800 },
      debug: false
    }
  },
  scene: [Niveau1, Niveau2]
};

new Phaser.Game(config);