/***********************************************************************/
/** AUDIO : gestion multi-pistes synchronisées
/***********************************************************************/

const VOLUME_MAX = 0.4;

function initialiserMusiques(scene) {
  let pisteBase = scene.sound.get('musique');
  let pisteVar = scene.sound.get('musique_variation');

  // Création des pistes si elles n'existent pas encore
  if (!pisteBase) {
    pisteBase = scene.sound.add('musique', { loop: true, volume: VOLUME_MAX });
  }
  if (!pisteVar) {
    pisteVar = scene.sound.add('musique_variation', { loop: true, volume: 0 });
  }

  // Lancement synchronisé des deux pistes
  if (!pisteBase.isPlaying) {
    pisteBase.play();
  }
  if (!pisteVar.isPlaying) {
    pisteVar.play();
  }

  return { pisteBase, pisteVar };
}

/**
 * Règle le mix selon le niveau courant (transition de volume de 800 ms)
 * @param {Phaser.Scene} scene 
 * @param {'base' | 'variation'} mode 
 */
function changerAmbiance(scene, mode = 'base') {
  const { pisteBase, pisteVar } = initialiserMusiques(scene);

  const volCibleBase = mode === 'base' ? VOLUME_MAX : 0;
  const volCibleVar = mode === 'variation' ? VOLUME_MAX : 0;

  // Fondu pour la piste de base
  scene.tweens.add({
    targets: pisteBase,
    volume: volCibleBase,
    duration: 800,
    ease: 'Linear'
  });

  // Fondu pour la variation
  scene.tweens.add({
    targets: pisteVar,
    volume: volCibleVar,
    duration: 800,
    ease: 'Linear'
  });
}