import GAME_CONSTANTS from "./constants"
import getScene, { roomState }  from "./pongSetupBabylon"
import * as BABYLON from '@babylonjs/core'
import { getUserId } from "./util"
import { IPongRoom } from "./models/PongRoom"
import specialAnimation from "./pongSpecialAnimation"





const _scaleAnimation = (scene: BABYLON.Scene , targetMesh:BABYLON.AbstractMesh , fromScale:BABYLON.Vector3 , toScale:BABYLON.Vector3 , durationInSecs:number) => {

    if(!scene) 
        throw Error("Client error - invalid scene")

    const scaleAnim = new BABYLON.Animation(
        "scaleDown", // name
        "scaling",   // property to animate
        60,          // frames per second
        BABYLON.Animation.ANIMATIONTYPE_VECTOR3, // type of property
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
      )
      
      // Keyframes
      const keys = [
        { frame: 0, value: fromScale },
        { frame: 60 * durationInSecs , value: toScale } 
      ]
      
      scaleAnim.setKeys(keys);
      
      // Add the animation to the mesh
      targetMesh.animations = [scaleAnim];
      
      // Start animation
      scene.beginAnimation(targetMesh, 0, durationInSecs * 60 , false);
}




const _moveCamera = (scene:BABYLON.Scene , finalCam:BABYLON.ArcRotateCamera , duration=2 ) => {
    
    const FPS = 60 
    
    const camera = scene.activeCamera as BABYLON.ArcRotateCamera 
    if(!camera)
        return 
    
    const alpha1 = camera.alpha
    const beta1 = camera.beta
    const radius1 = camera.radius
    
    const alpha2 = finalCam.alpha
    const beta2 = finalCam.beta
    const radius2 = finalCam.radius

    // prepare the animations
    const animAlpha = new BABYLON.Animation("animAlpha", "alpha", FPS, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
    const animBeta  = new BABYLON.Animation("animBeta",  "beta",  FPS, BABYLON.Animation.ANIMATIONTYPE_FLOAT);
    const animRadius= new BABYLON.Animation("animRadius","radius",FPS, BABYLON.Animation.ANIMATIONTYPE_FLOAT);

    animAlpha.setKeys([
        { frame: 0, value: alpha1 },
        { frame: FPS * duration , value: alpha2 }
    ])

    animBeta.setKeys([
        { frame: 0, value: beta1 },
        { frame: FPS * duration, value: beta2 }
    ])

    animRadius.setKeys([
        { frame: 0, value: radius1 },
        { frame: FPS * duration, value: radius2 }
    ])
    // // Create the animation
    // const animation = new BABYLON.Animation(
    //     "cameraMove",
    //     "position",
    //     FPS, 
    //     BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
    //     BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
    // )
    
    camera.animations = [animAlpha, animBeta, animRadius];
    scene.beginAnimation(camera, 0, FPS * duration , false)
}


let callbackTimeoutStacks:any[]  = [] 

const clearCallbackTimeoutStacks = () => {
    callbackTimeoutStacks.map( cb => {
      clearTimeout(cb)   
    })
    callbackTimeoutStacks = []
}

let currentCamPos: BABYLON.ArcRotateCamera | null  = null 
let fractolEffect = false 

const activateFractol = (theMatch:IPongRoom , paddleNo:number , paddleEffectedSide:number) => {
    const currentUserId = getUserId()
    let inEffect = false 
    let currentPaddleNo = null 
    theMatch.players.forEach( (player,index) => {        
        if( player.userId == currentUserId)
            currentPaddleNo = index         
    }) 
    if(currentPaddleNo == null)
        return 
    
    if(currentPaddleNo % 2 == paddleEffectedSide)
       inEffect = true 
    console.warn("CHECK THIS" , currentPaddleNo % 2 == paddleEffectedSide, inEffect)
    if(!inEffect)
    {
        console.log('  PRE-CHECK RETURNS, ' , !inEffect, currentPaddleNo == null )
        return     
    }
    fractolEffect = true 
    
        
    
    const scene = getScene()
    if(!scene)
        return 
    
    currentCamPos = scene.activeCamera as BABYLON.ArcRotateCamera 
    const thePaddle = scene.getMeshById(`paddleP${currentPaddleNo + 1}`)        
    if(!thePaddle)
    {
        console.error('Mesh NOT FOUND Error')
        return 
    }
    
    const camFractol = new BABYLON.FreeCamera("fractolCam", thePaddle.position.clone(), scene)
      
    const cameraRig = new BABYLON.TransformNode("cameraRig", scene);
    cameraRig.parent = thePaddle; // or thePaddle.addChild(cameraRig);
    camFractol.parent = cameraRig;
    
    camFractol.parent = cameraRig;
    camFractol.setTarget(BABYLON.Vector3.Zero()); // look at paddle relative to rig

    roomState.camWasSet = true 


    scene.activeCamera = camFractol 
   
    let time = 0;
    const maxSwing = Math.PI / 4; 

    scene.onBeforeRenderObservable.add(() => {
        time += scene.getEngine().getDeltaTime() / 1000; 
        cameraRig.rotation.y = Math.sin(time * 0.5) * maxSwing; 
    });
    
    
    
    let cbTimeout = setTimeout(() => {
        deactivateFractol(theMatch, paddleNo, paddleEffectedSide)        
    }, GAME_CONSTANTS.SPECIAL_FRACTOL_DURATION * 1000)    
    callbackTimeoutStacks.push(cbTimeout)
    
}

const deactivateFractol = (theMatch:IPongRoom , paddleNo:number, paddleEffectedSide:number ) => {
    console.log(` inside deactivateFractol`)
    const scene = getScene()
    if(!scene)
        return 
    if(fractolEffect && currentCamPos)
       scene.activeCamera = currentCamPos      
    fractolEffect = false
}    


const activateMinitalk = (theMatch: IPongRoom, paddleNo:number, paddleEffectedSide:number) => {
    console.log('inside activateMinitalk, effectedSide = ', paddleEffectedSide)
    
    const scene = getScene()
    if(!scene)
        throw Error("Client error - cannot load scene")
    for(let i=paddleEffectedSide; i<theMatch.playersRequired; i+=2 )
    {
        const mesh = scene.getMeshById(`paddleP${i + 1}`)
        if(mesh)
        {
            let theScale = GAME_CONSTANTS.SPECIAL_MINITALK_SCALE
            let sourceScale = new BABYLON.Vector3(1.0, 1.0, 1.0)
            let targetScale = new BABYLON.Vector3(theScale, theScale, theScale)

            _scaleAnimation(scene, mesh , sourceScale, targetScale, 2)
        }           
        else
            console.error(' mesh not found ')
    }
    console.log('done setting')
    
    let cbTimeout = setTimeout(() => {
        deactivateMinitalk(theMatch, paddleNo, paddleEffectedSide)        
    }, GAME_CONSTANTS.SPECIAL_MINITALK_DURATION * 1000)    
    callbackTimeoutStacks.push(cbTimeout)
}

const deactivateMinitalk = (theMatch:IPongRoom , paddleNo:number, paddleEffectedSide:number) => {
    console.log('deactivateMinitalk being called')
    const scene = getScene()
    if(!scene)
        return     
    for(let i=paddleEffectedSide; i<theMatch.playersRequired; i+=2 )
    {
        const mesh = scene.getMeshById(`paddleP${i + 1}`)
        if(mesh)
        {
            let theScale = GAME_CONSTANTS.SPECIAL_MINITALK_SCALE
            const sourceScale = new BABYLON.Vector3( theScale, theScale, theScale  )
            const targetScale = new BABYLON.Vector3( 1.0, 1.0, 1.0)
            _scaleAnimation(scene, mesh , sourceScale, targetScale, 2)
        }
            
        else
            console.error(' mesh not found ')
    }    
}



const activateFtirc = (theMatch:IPongRoom , paddleNo:number , paddleEffectedSide:number ) => {
    
    console.log('inside activateFtirc , effectedSide = ', paddleEffectedSide)
    let currentPaddleNo = null 
    let inEffect = null 
    const currentUserId = getUserId()
    theMatch.players.forEach( (player,index) => {        
        if( player.userId == currentUserId)
            currentPaddleNo = index         
    }) 
    if(currentPaddleNo != null && currentPaddleNo % 2 == paddleEffectedSide)
       inEffect = true 
    
    if(currentPaddleNo == null)
        return 
    
    if(inEffect)
    {
        let endPos 
        const scene = getScene() 
        if(!scene)
            return 
        
        if (currentPaddleNo % 2 == 0)
            endPos =  new BABYLON.ArcRotateCamera('camIRCSide0' , 4  , 1 , 45, new BABYLON.Vector3(0,0,0,) , scene)
        else 
            endPos = new BABYLON.ArcRotateCamera('camIRCSide1' , 0.4  , Math.PI / 3, 30 , new BABYLON.Vector3(0,0,0,) , scene)
                    
        _moveCamera(scene, endPos)
        let cbTimeout = setTimeout(() => {
            deactivateFtirc(theMatch, paddleNo, paddleEffectedSide)        
        }, GAME_CONSTANTS.SPECIAL_FTIRC_DURATION * 1000)    
        callbackTimeoutStacks.push(cbTimeout)
    }
}

const deactivateFtirc = (theMatch:IPongRoom, paddleNo:number, paddleEffectedSide:number) => {
    console.log('inside deactivateFtirc , effectedSide = ', paddleEffectedSide)
    const scene = getScene()
    if(!scene)
        return     
    let currentPaddleNo = null 
    let inEffect = null 
    const currentUserId = getUserId()
    theMatch.players.forEach( (player,index) => {        
        if( player.userId == currentUserId)
            currentPaddleNo = index         
    }) 
    inEffect = true 
    if(currentPaddleNo == null)
        return 
    
    if(inEffect)
    {
        let endPos 
                
        if(currentPaddleNo % 2 == 0)
            endPos = new BABYLON.ArcRotateCamera('camReturn1' , GAME_CONSTANTS.CAM_P1_ALPHA, GAME_CONSTANTS.CAM_P1_BETA, GAME_CONSTANTS.CAM_P1_RADIUS , new BABYLON.Vector3(0,0,0,) , scene)
        else 
            endPos = new BABYLON.ArcRotateCamera('camReturn2' , GAME_CONSTANTS.CAM_P2_ALPHA, GAME_CONSTANTS.CAM_P2_BETA, GAME_CONSTANTS.CAM_P2_RADIUS , new BABYLON.Vector3(0,0,0,) , scene)
        _moveCamera(scene, endPos)
    }    
}



const activateSolong = (theMatch:IPongRoom, paddleNo:number, paddleEffectedSide:number) => {
    console.log('inside activateSolong, effectedSide = ', paddleEffectedSide)
    console.log('done setting')
    
    let cbTimeout = setTimeout(() => {
        deactivateSolong(theMatch, paddleNo, paddleEffectedSide)        
    }, GAME_CONSTANTS.SPECIAL_SOLONG_DURATION * 1000)    
    callbackTimeoutStacks.push(cbTimeout)
}

const deactivateSolong = (theMatch:IPongRoom, paddleNo:number, paddleEffectedSide:number) => {
    console.log('deactivateSolong being called')
    const scene = getScene()
    if(!scene)
        return     
}

// specialId = string 'minitalk',
// effectedTeam = int [0|1]
const activateSpecial = (theMatch:IPongRoom, paddleNo:number, special:any, effectedTeam:number) => {
    
    const scene = getScene()
    if(!scene)
        return 
    console.log(' in activateSpecial' , special.id, effectedTeam)
    
    // playSound(specialId)
    const thePaddle = scene.getMeshById(`paddleP${paddleNo + 1}`)
    if(!thePaddle)
        return 

    let imagePath = `/images/cards/${special.id}.png`    
    specialAnimation(scene, thePaddle.position.clone() , imagePath )
    
    let callbackFunction = null
    console.log("specialId = ", special.id)
    
    switch(special.id)
    {
        case 'fractol'  :  callbackFunction = activateFractol
                           break 
        case 'solong'   :  callbackFunction = activateSolong
                           break 
        case 'ftirc'    :  callbackFunction = activateFtirc
                           break 
        
        case 'minitalk' :  
        default         :  callbackFunction = activateMinitalk
                           break
    }
    
    if(callbackFunction)
    {
        let cb = setTimeout( () => {
            callbackFunction( theMatch , paddleNo, effectedTeam)        
        }, 3000)
        callbackTimeoutStacks.push(cb)
    }
}


export default activateSpecial 
export {
    activateSpecial ,
    clearCallbackTimeoutStacks , 
}