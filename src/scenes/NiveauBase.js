/***********************************************************************/
/** NIVEAU DE BASE
/** Contient ce qui est IDENTIQUE dans tous les niveaux :
/**   - la création des joueurs (1 ou 2 selon le menu), leurs commandes et déplacements
/**   - la caméra qui suit les joueurs
/**   - le pistolet : ramassage, tir, balles
/**   - l'ouverture de la porte
/**   - la mort
/** Niveau1 et Niveau2 "héritent" de cette classe avec : class Niveau1 extends NiveauBase
/** => on écrit la logique une seule fois, au lieu de la copier dans chaque niveau.
/***********************************************************************/

// Distance horizontale maximale entre les deux joueurs (en pixels).
// L'écran fait 1920 px de large : au-delà, un joueur sortirait de l'écran.
const ECART_MAX_JOUEURS = 1700;

// Réglages du tir
const VITESSE_BALLE = 1000;     // pixels par seconde
const DELAI_ENTRE_TIRS = 300;   // millisecondes minimum entre deux tirs d'un même joueur

// Teinte d'une porte fermée. Un setTint MULTIPLIE les couleurs : 0x808080 divise leur luminosité par deux
// (une porte brune devient brun foncé). Plus la valeur est proche de 0x000000, plus la porte est sombre.
const TEINTE_PORTE_FERMEE = 0x808080;

// Vies et ennemis
const VIES_MAX = 3;                   // nombre de cœurs de chaque joueur
const DUREE_INVINCIBILITE = 1500;     // ms d'invincibilité après avoir été touché
const DELAI_ATTAQUE_FANTOMES = 3000;  // ms entre deux attaques des fantômes (timer récurrent)

class NiveauBase extends Phaser.Scene {

  // À appeler au tout début de create() de chaque niveau : remet les variables à zéro.
  // (Quand un niveau recommence, c'est le MEME objet scène qui est réutilisé :
  // ses variables gardent leur ancienne valeur tant qu'on ne les réinitialise pas.)
  initialiserNiveau() {
    this.enTransition = false;           // vrai pendant l'ouverture d'une porte
    this.estMort = false;
    this.portesVerrouillables = [];      // portes fermées tant que les ennemis ne sont pas tous vaincus
    this.messagePorteAffiche = false;
  }

  /*********************************************************************/
  /** JOUEURS
  /*********************************************************************/

  // Crée le joueur 1 en (x, y) et, si le menu a choisi "2 joueurs", le joueur 2 juste à côté
  // (tuto "multi-joueurs" : le second personnage réutilise le sprite du premier).
  creerJoueurs(x, y) {
    // Mode de jeu choisi dans le menu (mémoire globale 'registry'), 2 par défaut
    const nbJoueurs = this.registry.get('nbJoueurs') || 2;

    this.player = this.creerJoueur(x, y, null);
    this.player2 = null;
    this.joueurs = [this.player];   // liste des joueurs présents : on la parcourt partout

    if (nbJoueurs === 2) {
      this.player2 = this.creerJoueur(x + 70, y, 0xffd24d);   // joueur 2 teinté en jaune
      this.joueurs.push(this.player2);

      // Les deux joueurs se bloquent : on peut se pousser ou monter sur la tête de l'autre
      this.physics.add.collider(this.player, this.player2);
    }

    // La caméra suit un point invisible placé au milieu des joueurs (voir mettreAJourCamera)
    this.cibleCamera = this.add.zone(x, y, 1, 1);
    this.cameras.main.startFollow(this.cibleCamera);
    this.mettreAJourCamera();

    // Collision avec le bord du monde : le bord du bas tue le joueur qui tombe
    // (tuto "mourir en tombant dans un trou" : événement 'worldbounds')
    this.physics.world.on('worldbounds', (body, haut, bas) => {
      const joueur = body.gameObject;
      if (bas && this.joueurs.includes(joueur)) {
        this.tuerJoueur(joueur);
      }
    });

    this.creerVies();
  }

  // Création d'un joueur (même code pour les deux, seule la teinte change)
  creerJoueur(x, y, teinte) {
    const joueur = this.physics.add.sprite(x, y, 'img_perso');
    joueur.body.setSize(45, 70);
    joueur.body.setOffset(20, 10);
    joueur.setCollideWorldBounds(true);
    joueur.setBounce(0.2);
    joueur.body.onWorldBounds = true;   // nécessaire pour recevoir l'événement 'worldbounds'
    joueur.direction = 'right';         // dernière direction regardée (sert au tir)
    joueur.peutTirer = true;            // passe à false pendant le délai entre deux tirs
    joueur.vies = VIES_MAX;             // points de vie (affichés en cœurs)
    joueur.invincible = false;          // vrai juste après avoir été touché
    joueur.sautsFaits = 0;              // 0 au sol, 1 après le saut, 2 après le double saut
    if (teinte !== null) joueur.setTint(teinte);

    // Image du pistolet tenu par le joueur : cachée tant que le pistolet n'est pas ramassé
    joueur.armeImage = this.add.image(x, y, 'img_pistolet')
      .setScale(0.6)
      .setVisible(this.registry.get('armeRamassee') === true);
    return joueur;
  }

  // Active la collision de TOUS les joueurs avec un calque.
  // 'quandContact' (facultatif) est appelée avec le joueur concerné.
  collisionJoueurs(calque, quandContact) {
    this.joueurs.forEach((joueur) => {
      this.physics.add.collider(joueur, calque, quandContact ? () => quandContact.call(this, joueur) : null);
    });
  }

  /*********************************************************************/
  /** CLAVIER ET DEPLACEMENTS
  /*********************************************************************/

  configurerClavier() {
    const touches = Phaser.Input.Keyboard.KeyCodes;

    // Joueur 1 : flèches (+ espace pour sauter), M pour tirer, E pour la porte
    this.clavier = this.input.keyboard.createCursorKeys();
    this.toucheTir = this.input.keyboard.addKey(touches.M);
    this.toucheAction = this.input.keyboard.addKey(touches.E);

    // Joueur 2 : Z (saut), Q (gauche), D (droite), F pour tirer, R pour la porte
    this.j2Haut = this.input.keyboard.addKey(touches.Z);
    this.j2Gauche = this.input.keyboard.addKey(touches.Q);
    this.j2Droite = this.input.keyboard.addKey(touches.D);
    this.toucheTir2 = this.input.keyboard.addKey(touches.F);
    this.toucheAction2 = this.input.keyboard.addKey(touches.R);
  }

  // À appeler dans update() : chaque joueur est commandé par SES touches
  deplacerJoueurs() {
    if (this.estMort) return;

    // 'JustDown' = la touche vient d'être enfoncée (une seule fois par appui).
    // On l'interroge à CHAQUE image : sinon un appui ancien resterait "en attente"
    // et déclencherait un double saut à retardement.
    const sautPresse1 = Phaser.Input.Keyboard.JustDown(this.clavier.up)
      || Phaser.Input.Keyboard.JustDown(this.clavier.space);
    const sautPresse2 = Phaser.Input.Keyboard.JustDown(this.j2Haut);

    this.deplacerJoueur(
      this.player, this.player2,
      this.clavier.left.isDown, this.clavier.right.isDown,
      this.clavier.up.isDown || this.clavier.space.isDown, sautPresse1
    );
    if (this.player2) {
      this.deplacerJoueur(
        this.player2, this.player,
        this.j2Gauche.isDown, this.j2Droite.isDown,
        this.j2Haut.isDown, sautPresse2
      );
    }
  }

  // saut : la touche de saut est maintenue ; sautPresse : elle vient d'être enfoncée
  deplacerJoueur(joueur, autreJoueur, gauche, droite, saut, sautPresse) {
    // Avec deux joueurs : on ne peut pas s'éloigner de l'autre de plus de ECART_MAX_JOUEURS
    if (autreJoueur) {
      if (droite && joueur.x - autreJoueur.x > ECART_MAX_JOUEURS) droite = false;
      if (gauche && autreJoueur.x - joueur.x > ECART_MAX_JOUEURS) gauche = false;
    }

    if (droite) {
      joueur.direction = 'right';
      joueur.setVelocityX(275);
      joueur.anims.play('anim_tourne_droite', true);
    } else if (gauche) {
      joueur.direction = 'left';
      joueur.setVelocityX(-275);
      joueur.anims.play('anim_tourne_gauche', true);
    } else {
      joueur.setVelocityX(0);
      joueur.anims.play('anim_face');
    }

    // Compteur de sauts : remis à 0 dès qu'on touche le sol
    const auSol = joueur.body.blocked.down;
    if (auSol) {
      joueur.sautsFaits = 0;
    } else if (joueur.sautsFaits === 0) {
      joueur.sautsFaits = 1;   // on est tombé d'une plateforme sans sauter : le saut au sol est "perdu"
    }

    if (saut && auSol) {
      // Saut normal : possible seulement au sol
      joueur.setVelocityY(-450);
      joueur.sautsFaits = 1;
    } else if (sautPresse && !auSol && joueur.sautsFaits === 1
      && this.registry.get('doubleSaut') === true) {
      // DOUBLE SAUT : un second saut en l'air, seulement si les bottes sont ramassées
      joueur.setVelocityY(-450);
      joueur.sautsFaits = 2;
    }
  }

  // La caméra est centrée sur le milieu des joueurs (avec un seul joueur : sur lui)
  mettreAJourCamera() {
    let sommeX = 0;
    let sommeY = 0;
    this.joueurs.forEach((joueur) => {
      sommeX += joueur.x;
      sommeY += joueur.y;
    });
    this.cibleCamera.setPosition(sommeX / this.joueurs.length, sommeY / this.joueurs.length);
  }

  /*********************************************************************/
  /** PISTOLET ET TIR
  /** (tuto "Rajouter une fonction de tir, des balles et des cibles")
  /*********************************************************************/

  // À appeler dans create() de chaque niveau, une fois les joueurs créés.
  // 'calquePlateformes' : les balles s'y écrasent au lieu de le traverser.
  configurerTirs(calquePlateformes) {
    // Groupe qui contient toutes les balles en vol
    this.groupeBalles = this.physics.add.group();

    // Une balle qui touche un mur ou le sol disparaît.
    // On utilise un OVERLAP et non un collider : la balle va très vite (1000 px/s) et la
    // détection de collision "solide" de Phaser sur les tuiles la laisse parfois traverser
    // les murs. Le 3e paramètre filtre les tuiles : seules les tuiles pleines comptent
    // (sans filtre, les cases vides du calque déclencheraient aussi l'overlap).
    this.physics.add.overlap(
      this.groupeBalles,
      calquePlateformes,
      (balle) => balle.destroy(),
      (balle, tuile) => tuile.collides,
      this
    );

    // Une balle qui atteint un bord du monde disparaît (comme pour la mort des joueurs :
    // c'est l'événement 'worldbounds', on regarde juste quel objet l'a déclenché)
    this.physics.world.on('worldbounds', (body) => {
      if (this.groupeBalles.contains(body.gameObject)) {
        body.gameObject.destroy();
      }
    });
  }

  // À appeler dans update() : un joueur tire s'il a le pistolet et appuie sur SA touche de tir
  gererTirs() {
    if (this.estMort) return;

    if (Phaser.Input.Keyboard.JustDown(this.toucheTir)) {
      this.tirer(this.player);
    }
    if (this.player2 && Phaser.Input.Keyboard.JustDown(this.toucheTir2)) {
      this.tirer(this.player2);
    }
  }

  tirer(joueur) {
    // Pas de pistolet ramassé, ou tir trop rapproché : rien ne se passe
    if (this.registry.get('armeRamassee') !== true || !joueur.peutTirer) return;

    // Direction : +1 vers la droite, -1 vers la gauche
    const coefDir = (joueur.direction === 'left') ? -1 : 1;

    // La balle apparaît au bout du pistolet
    const balle = this.groupeBalles.create(joueur.x + 50 * coefDir, joueur.y + 8, 'img_balle');
    balle.setFlipX(coefDir === -1);          // l'image de la balle regarde vers la droite
    balle.body.allowGravity = false;         // la balle vole en ligne droite
    balle.setVelocityX(VITESSE_BALLE * coefDir);
    balle.setCollideWorldBounds(true);
    balle.body.onWorldBounds = true;         // pour recevoir l'événement 'worldbounds'

    this.sound.play('sfx_tir', { volume: 0.6 });

    // TIMER ONE-SHOT : le joueur ne peut plus tirer pendant DELAI_ENTRE_TIRS ms
    joueur.peutTirer = false;
    this.time.delayedCall(DELAI_ENTRE_TIRS, () => {
      joueur.peutTirer = true;
    });
  }

  // Le pistolet ramassé suit chaque joueur et se retourne avec lui (à appeler dans update())
  mettreAJourArmes() {
    this.joueurs.forEach((joueur) => {
      const coefDir = (joueur.direction === 'left') ? -1 : 1;
      joueur.armeImage.setPosition(joueur.x + 22 * coefDir, joueur.y + 12);
      joueur.armeImage.setFlipX(coefDir === -1);
    });
  }

  // Appelée quand un joueur touche l'objet pistolet posé dans le niveau.
  // Le pistolet est à toute l'équipe : dès qu'il est ramassé, TOUS les joueurs peuvent tirer.
  ramasserPistolet() {
    if (!this.pistolet) return;      // déjà ramassé (les deux joueurs peuvent le toucher en même temps)
    this.pistolet.destroy();
    this.pistolet = null;

    // On mémorise dans le registre : l'arme est conservée en changeant de niveau
    // ou quand le niveau recommence après une mort
    this.registry.set('armeRamassee', true);
    this.joueurs.forEach((joueur) => joueur.armeImage.setVisible(true));

    this.sound.play('sfx_ramassage');
    this.afficherMessage('Pistolet récupéré !  M / F pour tirer');
  }

  // Appelée quand un joueur touche les bottes posées dans le niveau.
  // Comme le pistolet, elles sont à toute l'équipe : TOUS les joueurs peuvent alors double-sauter.
  ramasserBottes() {
    if (!this.bottes) return;
    this.bottes.destroy();
    this.bottes = null;

    this.registry.set('doubleSaut', true);   // mémorisé : conservé si le niveau recommence
    this.joueurs.forEach((joueur) => joueur.iconeBottes.setVisible(true));

    this.sound.play('sfx_ramassage');
    this.afficherMessage('Bottes récupérées !  Appuyez deux fois sur saut pour double-sauter', 3500);
  }

  /*********************************************************************/
  /** MESSAGES
  /*********************************************************************/

  // Texte fixé à l'écran en haut, qui disparaît seul après 'duree' millisecondes
  afficherMessage(texte, duree = 3000) {
    const message = this.add.text(this.scale.width / 2, 110, texte, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '52px',
      color: '#ffffff',
      stroke: '#0a1e32',
      strokeThickness: 10
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // TIMER ONE-SHOT : le message est supprimé après 'duree' ms
    this.time.delayedCall(duree, () => message.destroy());
  }

  /*********************************************************************/
  /** VIES DES JOUEURS (cœurs affichés en haut de l'écran)
  /*********************************************************************/

  // Affiche VIES_MAX cœurs par joueur : joueur 1 en haut à gauche, joueur 2 en haut à droite
  creerVies() {
    const largeur = this.scale.width;
    const styleNom = {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '30px',
      color: '#ffffff',
      stroke: '#0a1e32',
      strokeThickness: 6
    };

    this.joueurs.forEach((joueur, i) => {
      const sens = (i === 0) ? 1 : -1;            // 1 : vers la droite, -1 : vers la gauche
      const xBord = (i === 0) ? 30 : largeur - 30;

      this.add.text(xBord, 40, (i === 0) ? 'J1' : 'J2', styleNom)
        .setOrigin(i === 0 ? 0 : 1, 0.5).setScrollFactor(0).setDepth(100);

      joueur.coeurs = [];
      for (let k = 0; k < VIES_MAX; k++) {
        const coeur = this.add.image(xBord + sens * (90 + k * 46), 40, 'img_coeur_plein')
          .setScale(0.55).setScrollFactor(0).setDepth(100);
        joueur.coeurs.push(coeur);
      }

      // Icône des bottes de double saut, affichée une fois qu'elles sont ramassées
      joueur.iconeBottes = this.add.image(xBord + sens * (90 + VIES_MAX * 46 + 14), 40, 'img_botte')
        .setScale(0.5).setScrollFactor(0).setDepth(100)
        .setVisible(this.registry.get('doubleSaut') === true);
    });
  }

  // Redessine les cœurs d'un joueur : plein pour une vie restante, noir pour une vie perdue
  mettreAJourCoeurs(joueur) {
    joueur.coeurs.forEach((coeur, k) => {
      coeur.setTexture(k < joueur.vies ? 'img_coeur_plein' : 'img_coeur_vide');
    });
  }

  // Un joueur est touché par un ennemi : il perd un cœur, puis il est invincible un court instant.
  // À 0 cœur, il meurt (et le niveau recommence).
  perdreVie(joueur) {
    if (this.estMort || joueur.invincible) return;

    joueur.vies--;
    this.mettreAJourCoeurs(joueur);
    this.sound.play('sfx_degat');

    if (joueur.vies <= 0) {
      this.tuerJoueur(joueur);
      return;
    }

    joueur.invincible = true;
    joueur.setAlpha(0.5);            // joueur à moitié transparent pendant l'invincibilité
    joueur.setVelocityY(-300);       // petit sursaut

    // TIMER ONE-SHOT : fin de l'invincibilité
    this.time.delayedCall(DUREE_INVINCIBILITE, () => {
      joueur.invincible = false;
      joueur.setAlpha(1);
    });
  }

  /*********************************************************************/
  /** ENNEMIS
  /** Nombre FINI d'ennemis, placés dans Tiled (calque d'objets 'objets') :
  /**   - 'spawn_ennemi1' : ennemi au sol, patrouille autour de son point (propriété 'patrouille')
  /**   - 'spawn_ennemi2' : fantôme volant, attaque le joueur proche (propriété 'detection')
  /** (tuto "Rajouter des cibles" + "Utiliser des timers")
  /*********************************************************************/

  // À appeler dans create() de chaque niveau, APRES configurerTirs()
  configurerEnnemis(carte, calquePlateformes) {
    this.groupeEnnemis = this.physics.add.group();

    // Le niveau a-t-il déjà été nettoyé (on y revient depuis l'autre niveau) ?
    // Dans ce cas on ne recrée aucun ennemi. L'info est gardée dans le registre.
    this.cleNettoye = 'nettoye' + this.scene.key;               // ex. 'nettoyeNiveau1'
    this.niveauNettoye = this.registry.get(this.cleNettoye) === true;

    // Compteur affiché en haut au centre
    this.texteEnnemis = this.add.text(this.scale.width / 2, 40, '', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '34px',
      color: '#ffffff',
      stroke: '#0a1e32',
      strokeThickness: 8
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    if (!this.niveauNettoye) {
      // On parcourt les objets de la carte et on crée un ennemi par point d'apparition
      carte.getObjectLayer('objets').objects.forEach((point) => {
        if (point.name === 'spawn_ennemi1') {
          this.creerEnnemiSol(point.x, point.y, this.lireProp(point, 'patrouille', 100));
        } else if (point.name === 'spawn_ennemi2') {
          this.creerEnnemiVolant(point.x, point.y, this.lireProp(point, 'detection', 700));
        }
      });
    }

    // Collisions : les ennemis marchent sur les plateformes
    this.physics.add.collider(this.groupeEnnemis, calquePlateformes);

    // Une balle qui touche un ennemi : voir toucherEnnemi()
    this.physics.add.overlap(this.groupeBalles, this.groupeEnnemis,
      (balle, ennemi) => this.toucherEnnemi(balle, ennemi), null, this);

    // Un joueur qui touche un ennemi perd un cœur
    this.joueurs.forEach((joueur) => {
      this.physics.add.overlap(joueur, this.groupeEnnemis, () => this.perdreVie(joueur), null, this);
    });

    // TIMER RECURRENT : toutes les 3 secondes, les fantômes foncent sur le joueur le plus proche
    // (tuto "timers" : this.time.addEvent avec loop: true)
    this.time.addEvent({
      delay: DELAI_ATTAQUE_FANTOMES,
      callback: this.attaquerFantomes,
      callbackScope: this,
      loop: true
    });

    this.mettreAJourCompteurEnnemis();
  }

  // Lit une propriété personnalisée d'un objet Tiled (ou renvoie 'defaut' si elle n'existe pas)
  lireProp(objet, nom, defaut) {
    const propriete = (objet.properties || []).find((p) => p.name === nom);
    return propriete ? propriete.value : defaut;
  }

  // Ennemi au sol : 3 points de vie, va et vient entre xMin et xMax
  creerEnnemiSol(x, y, patrouille) {
    const ennemi = this.groupeEnnemis.create(x, y, 'img_ennemi1');
    ennemi.genre = 'sol';
    ennemi.pointsVie = 3;
    ennemi.vitesse = 70;
    ennemi.xMin = x - patrouille;
    ennemi.xMax = x + patrouille;
    ennemi.body.setSize(46, 60);
    ennemi.body.setOffset(7, 15);
    ennemi.setCollideWorldBounds(true);
    ennemi.anims.play('anim_ennemi1');
    // Le sens de départ alterne d'un ennemi à l'autre
    ennemi.setVelocityX(ennemi.vitesse * (this.groupeEnnemis.getLength() % 2 === 0 ? 1 : -1));
  }

  // Fantôme : 2 points de vie, flotte sur place et attaque (voir attaquerFantomes)
  creerEnnemiVolant(x, y, detection) {
    const ennemi = this.groupeEnnemis.create(x, y, 'img_ennemi2');
    ennemi.genre = 'vol';
    ennemi.pointsVie = 2;
    ennemi.departX = x;            // point où le fantôme revient après chaque attaque
    ennemi.departY = y;
    ennemi.detection = detection;  // distance à partir de laquelle il attaque
    ennemi.enAttaque = false;
    ennemi.body.allowGravity = false;
    ennemi.body.setSize(58, 58);     // un peu plus petit que le dessin (70 px) : touche seulement au contact net
    ennemi.body.setOffset(11, 11);   // centré dans l'image de 80 x 80
    ennemi.setCollideWorldBounds(true);
    ennemi.anims.play('anim_ennemi2');
  }

  // À appeler dans update() : fait patrouiller les ennemis au sol, arrête les fantômes au repos
  mettreAJourEnnemis() {
    this.groupeEnnemis.getChildren().forEach((ennemi) => {
      if (ennemi.genre === 'sol') {
        // Demi-tour aux limites de la zone de patrouille, ou face à un obstacle
        if (ennemi.x <= ennemi.xMin || ennemi.body.blocked.left) {
          ennemi.setVelocityX(ennemi.vitesse);
        } else if (ennemi.x >= ennemi.xMax || ennemi.body.blocked.right) {
          ennemi.setVelocityX(-ennemi.vitesse);
        }
        ennemi.setFlipX(ennemi.body.velocity.x < 0);
      } else if (!ennemi.enAttaque
        && Phaser.Math.Distance.Between(ennemi.x, ennemi.y, ennemi.departX, ennemi.departY) < 15) {
        ennemi.setVelocity(0, 0);   // de retour à son point de départ : il se pose
      }
    });
  }

  // Appelée par le TIMER RECURRENT : chaque fantôme assez proche d'un joueur lui fonce dessus
  attaquerFantomes() {
    if (this.estMort) return;

    this.groupeEnnemis.getChildren().forEach((ennemi) => {
      if (ennemi.genre !== 'vol') return;

      // Joueur le plus proche
      let cible = null;
      let distanceMin = Infinity;
      this.joueurs.forEach((joueur) => {
        const distance = Phaser.Math.Distance.Between(ennemi.x, ennemi.y, joueur.x, joueur.y);
        if (distance < distanceMin) {
          distanceMin = distance;
          cible = joueur;
        }
      });

      if (cible && distanceMin <= ennemi.detection) {
        ennemi.enAttaque = true;
        this.physics.moveToObject(ennemi, cible, 320);   // fonce vers le joueur

        // TIMER ONE-SHOT : après 0,8 s l'attaque est finie, le fantôme retourne à son point de départ
        this.time.delayedCall(800, () => {
          if (!ennemi.active) return;   // il a été détruit entre-temps
          ennemi.enAttaque = false;
          this.physics.moveTo(ennemi, ennemi.departX, ennemi.departY, 180);
        });
      }
    });
  }

  // Une balle touche un ennemi : la balle disparaît, l'ennemi perd un point de vie
  toucherEnnemi(balle, ennemi) {
    if (!balle.active) return;
    balle.destroy();

    ennemi.pointsVie--;
    if (ennemi.pointsVie <= 0) {
      this.sound.play('sfx_ennemi_mort');
      ennemi.destroy();
      this.mettreAJourCompteurEnnemis();
    } else {
      this.sound.play('sfx_impact');
      // Flash rouge très court pour montrer qu'il est touché
      ennemi.setTint(0xff0000);
      this.time.delayedCall(120, () => {
        if (ennemi.active) ennemi.clearTint();
      });
    }
  }

  // Met à jour le compteur affiché. Quand il n'y a plus aucun ennemi, le niveau est "nettoyé".
  mettreAJourCompteurEnnemis() {
    const restants = this.groupeEnnemis.countActive(true);
    this.texteEnnemis.setText('Ennemis restants : ' + restants);

    if (restants === 0 && !this.niveauNettoye) {
      this.niveauNettoye = true;
      this.registry.set(this.cleNettoye, true);   // mémorisé : les ennemis ne reviendront pas
      this.deverrouillerPortes();                 // les portes grisées retrouvent leur couleur
      this.sound.play('sfx_ramassage');
      this.afficherMessage('Tous les ennemis sont vaincus !  La porte est ouverte.');
    }
  }

  /*********************************************************************/
  /** PORTES
  /** Une porte "verrouillable" est grisée et refuse de s'ouvrir tant que tous les
  /** ennemis du niveau ne sont pas vaincus.
  /*********************************************************************/

  // Crée une porte en (x, y). Si 'verrouillable' est vrai, elle est fermée (grisée avec setTint)
  // tant que le niveau n'est pas nettoyé.
  creerPorte(x, y, verrouillable) {
    const porte = this.physics.add.staticSprite(x, y, 'img_porte');
    porte.verrouillee = verrouillable && this.registry.get('nettoye' + this.scene.key) !== true;

    if (porte.verrouillee) {
      porte.setTint(TEINTE_PORTE_FERMEE);      // porte grise = porte fermée
      this.portesVerrouillables.push(porte);
    }
    return porte;
  }

  // Appelée quand le dernier ennemi du niveau est vaincu : les portes retrouvent leur couleur
  deverrouillerPortes() {
    this.portesVerrouillables.forEach((porte) => {
      porte.verrouillee = false;
      porte.clearTint();
    });
  }

  // Vrai si un joueur est sur la porte ET appuie sur SA touche d'action
  // (E pour le joueur 1, R pour le joueur 2). L'autre joueur peut être n'importe où.
  actionSurPorte(porte) {
    const joueur1 = this.physics.overlap(this.player, porte)
      && Phaser.Input.Keyboard.JustDown(this.toucheAction);
    const joueur2 = this.player2 !== null
      && this.physics.overlap(this.player2, porte)
      && Phaser.Input.Keyboard.JustDown(this.toucheAction2);
    return joueur1 || joueur2;
  }

  // Porte fermée : bruit sourd et message expliquant quoi faire
  refuserPorte() {
    if (this.messagePorteAffiche) return;   // évite d'empiler les messages si on appuie plusieurs fois
    this.messagePorteAffiche = true;

    this.sound.play('sfx_verrou');
    this.afficherMessage('Vous devez tuer tous les ennemis pour passer !', 2500);

    // TIMER ONE-SHOT : on autorise un nouveau message quand le précédent a disparu
    this.time.delayedCall(2500, () => {
      this.messagePorteAffiche = false;
    });
  }

  // Animation + bruitage de la porte, puis 'actionApres' est lancée après 450 ms
  // (TIMER ONE-SHOT : le temps de voir la porte s'ouvrir)
  ouvrirPorte(porte, actionApres) {
    this.enTransition = true;
    this.joueurs.forEach((joueur) => joueur.setVelocity(0, 0));
    porte.anims.play('anim_porte', true);
    this.sound.play('sfx_porte');
    this.time.delayedCall(450, actionApres, null, this);
  }

  /*********************************************************************/
  /** MORT
  /*********************************************************************/

  // Appelée quand un joueur touche un piège (calque 'mort') ou tombe hors de la carte.
  // 'joueur' est celui qui est mort : si l'un des deux meurt, le niveau recommence pour tous.
  tuerJoueur(joueur) {
    // Garde-fou : plusieurs collisions peuvent appeler cette fonction dans la même image
    if (this.estMort) return;
    this.estMort = true;

    this.sound.play('sfx_mort');        // bruitage de mort
    this.physics.pause();               // tout se fige
    joueur.setTint(0xff0000);           // le joueur qui est mort devient rouge

    // Message fixé à l'écran (setScrollFactor(0) : il ne bouge pas avec la caméra)
    this.add.text(this.scale.width / 2, this.scale.height / 2 - 100, 'PERDU !', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '140px',
      color: '#ffffff',
      stroke: '#0a1e32',
      strokeThickness: 16
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // TIMER ONE-SHOT : on relance le niveau après 3 secondes
    // (tuto "timers" : this.time.delayedCall(délai, callback, args, scope))
    this.time.delayedCall(3000, this.recommencerNiveau, null, this);
  }

  // Relance la scène en cours. Un niveau peut redéfinir cette méthode
  // s'il a besoin de transmettre des données (voir Niveau1).
  recommencerNiveau() {
    this.scene.restart();
  }
}
