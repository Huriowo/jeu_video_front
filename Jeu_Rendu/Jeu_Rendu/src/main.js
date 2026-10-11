/***********************************************************************/
/** CONFIGURATION DU JEU
/** Ce fichier est chargé en dernier (voir index.html) : il assemble les scènes.
/***********************************************************************/
const config = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  // Le jeu est dessiné en 1920x1080 puis ajusté à la taille de la fenêtre
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 800 },
      debug: false
    }
  },
  // Le jeu démarre sur la première scène de la liste (Preload),
  // qui enchaîne ensuite sur Menu, puis Niveau1 / Niveau2, et enfin Victoire.
  scene: [Preload, Menu, Niveau1, Niveau2, Victoire]
};

new Phaser.Game(config);
