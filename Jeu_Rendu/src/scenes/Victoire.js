/***********************************************************************/
/** ECRAN DE VICTOIRE (Victoire)
/** Affiché quand les joueurs franchissent la porte finale du Niveau 2.
/** Un bouton ramène au menu pour rejouer.
/***********************************************************************/
class Victoire extends Phaser.Scene {
  constructor() {
    super({ key: 'Victoire' });
  }

  create() {
    const largeur = this.scale.width;
    const hauteur = this.scale.height;
    this.retourLance = false;

    // Décor : le même que le menu
    this.add.image(0, 0, 'img_ciel').setOrigin(0, 0);
    this.add.image(largeur - 180, 170, 'img_soleil').setScale(1.2);
    this.add.tileSprite(0, 800, largeur, 540, 'img_fond2').setOrigin(0, 1);
    this.add.tileSprite(0, hauteur, largeur, 540, 'img_fond1').setOrigin(0, 1);

    // Jingle de victoire (la musique de fond continue)
    this.sound.play('sfx_victoire');

    // Textes : le message s'adapte au nombre de joueurs de la partie
    const nbJoueurs = this.registry.get('nbJoueurs') || 2;
    this.add.text(largeur / 2, 300, 'VICTOIRE !', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '170px',
      color: '#ffd24d',
      stroke: '#0a1e32',
      strokeThickness: 18
    }).setOrigin(0.5);

    this.add.text(largeur / 2, 500,
      (nbJoueurs === 2 ? 'Bravo à vous deux ! ' : 'Bravo ! ') + 'Tous les ennemis ont été vaincus.', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '46px',
        color: '#ffffff',
        stroke: '#0a1e32',
        strokeThickness: 10
      }).setOrigin(0.5);

    // Bouton REJOUER : retour au menu (la progression est remise à zéro par le menu)
    const bouton = this.add.image(largeur / 2, 680, 'img_bouton_rejouer')
      .setInteractive({ useHandCursor: true });
    bouton.on('pointerover', () => bouton.setScale(1.08));
    bouton.on('pointerout', () => bouton.setScale(1));
    bouton.on('pointerdown', () => this.retourAuMenu());
  }

  retourAuMenu() {
    if (this.retourLance) return;
    this.retourLance = true;
    this.scene.start('Menu');
  }
}
