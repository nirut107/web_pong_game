
import * as BABYLON from '@babylonjs/core'


const specialAnimation = (scene, position, imagePath ) => {
  const card = BABYLON.MeshBuilder.CreatePlane(
    "card",
    {
      width: 0.3,
      height: 0.4,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    },
    scene
  )

  
  card.position = position 


  const cardMaterial = new BABYLON.StandardMaterial("card", scene);
  cardMaterial.diffuseTexture = new BABYLON.Texture(
    imagePath ,
    scene
  )
  cardMaterial.backFaceCulling = false;
  card.material = cardMaterial;


  
  card.scaling.set(0, 0, 0);


  const animGroup = new BABYLON.AnimationGroup("cardFX");
  const scaleAnim = new BABYLON.Animation(
    "scaleUp",
    "scaling",
    30,
    BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
  )
  scaleAnim.setKeys([
    { frame: 0, value: new BABYLON.Vector3(0, 0, 0) },
    { frame: 30, value: new BABYLON.Vector3(1, 1, 1) }, // 1 second scale-up
  ])
  animGroup.addTargetedAnimation(scaleAnim, card)

  // Floating Y animation
  const floatAnim = new BABYLON.Animation(
    "floatUp",
    "position.y",
    30,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
  )
  
  floatAnim.setKeys([
    { frame: 0, value: card.position.y },
    { frame: 60, value: card.position.y + 0.5 },
  ])
  
  animGroup.addTargetedAnimation(floatAnim, card)

  
  const spinAnim = new BABYLON.Animation(
    "spinY",
    "rotation.y",
    30,
    BABYLON.Animation.ANIMATIONTYPE_FLOAT,
    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
  );
  spinAnim.setKeys([
    { frame: 0, value: 0 },
    { frame: 20, value: Math.PI * 4 },     // fast spin
    { frame: 40, value: Math.PI * 6 },     // slow spin
    { frame: 60, value: Math.PI * 8 },     // stop , face forward
  ])
  
  animGroup.addTargetedAnimation(spinAnim, card)

  
  animGroup.play()

  
  setTimeout(() => {
  
    setTimeout(() => {
      card.dispose();
    }, 1000)
  }, 2000)
}


export default specialAnimation 
export {
    specialAnimation
}