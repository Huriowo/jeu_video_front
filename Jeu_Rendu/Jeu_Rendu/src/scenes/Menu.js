/***********************************************************************/
/** PAGE D'ACCUEIL (Menu)
/** Un fond, un titre et deux boutons cliquables : jouer à 1 ou à 2 joueurs.
/** (tuto "Créer une page d'accueil ou un menu lancé avec un clic de souris")
/***********************************************************************/
// Les images des boutons font 600 x 200 px : on les affiche à 80 % (480 x 160 px)
const ECHELLE_BOUTON = 0.8;

class Menu extends Phaser.Scene {
  constructor() {
    super({ key: 'Menu' });
  }

  create() {
    const largeur = this.scale.width;   // 1920
    const hauteur = this.scale.height;  // 1080
    this.partieLancee = false;          // évite de lancer deux fois le niveau

    // 1. Décor : mêmes images que le Niveau 1, mais fixes
    this.add.image(0, 0, 'img_ciel').setOrigin(0, 0);
    this.add.image(largeur - 180, 170, 'img_soleil').setScale(1.2);
    this.add.tileSprite(0, 800, largeur, 540, 'img_fond2').setOrigin(0, 1);
    this.add.tileSprite(0, hauteur, largeur, 540, 'img_fond1').setOrigin(0, 1);

    // 2. Titre
    this.add.image(largeur / 2, 200, 'img_logo').setScale(0.4);

    // 3. Deux boutons : le nombre de joueurs choisi est transmis à lancerJeu()
    this.creerBouton(largeur / 2, 440, 'img_bouton_1j', 1);
    this.creerBouton(largeur / 2, 640, 'img_bouton_2j', 2);

    // 4. Rappel des commandes
    const styleCommandes = {
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      color: '#ffffff',
      stroke: '#0a1e32',
      strokeThickness: 8,
      align: 'center'
    };
    this.add.text(largeur / 2, 870,
      'Joueur 1 : flèches (se déplacer / sauter)  -  M : tirer  -  E : porte\n' +
      'Joueur 2 : Z (sauter), Q / D (se déplacer)  -  F : tirer  -  R : porte\n' +
      'Ramassez le pistolet (niveau 1) et les bottes de double saut (niveau 2).\n' +
      'Tuez tous les ennemis d\'un niveau pour ouvrir sa porte !', styleCommandes
    ).setOrigin(0.5);
  }

  // Une image rendue interactive qui lance la partie avec 'nbJoueurs' joueurs
  creerBouton(x, y, cleImage, nbJoueurs) {
    const bouton = this.add.image(x, y, cleImage)
      .setScale(ECHELLE_BOUTON)
      .setInteractive({ useHandCursor: true });

    // Survol : le bouton grossit légèrement
    bouton.on('pointerover', () => bouton.setScale(ECHELLE_BOUTON * 1.08));
    bouton.on('pointerout', () => bouton.setScale(ECHELLE_BOUTON));

    // Clic : on lance le jeu
    bouton.on('pointerdown', () => this.lancerJeu(nbJoueurs));
    return bouton;
  }

  lancerJeu(nbJoueurs) {
    if (this.partieLancee) return;
    this.partieLancee = true;

    // Le registre (this.registry) est une mémoire GLOBALE partagée par toutes les scènes :
    // les niveaux y liront le mode de jeu et l'état du pistolet.
    this.registry.set('nbJoueurs', nbJoueurs);
    this.registry.set('armeRamassee', false);
    this.registry.set('doubleSaut', false);       // bottes de double saut ramassées ?
    this.registry.set('nettoyeNiveau1', false);   // tous les ennemis du niveau 1 vaincus ?
    this.registry.set('nettoyeNiveau2', false);   // tous les ennemis du niveau 2 vaincus ?

    // Niveau 1 démarre sans donnée : les joueurs apparaissent sur 'spawn_player'
    this.scene.start('Niveau1');
  }
}
