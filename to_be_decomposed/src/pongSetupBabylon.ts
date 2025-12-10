import * as BABYLON from '@babylonjs/core'
import GAME_CONSTANTS from './constants'

import sticker42bkk from './assets/42bkk.png';
// import { Inspector } from '@babylonjs/inspector'
import { Engine, Scene } from '@babylonjs/core';


let scene:Scene | null = null 
let engine:Engine | null = null 
let canvas:HTMLCanvasElement | null = null 
let sceneReadyPromise = null


interface IRoomState {
    camWasSet: boolean,
    currentCam: number, 
    msPayloadCount: number 
}

const roomState:IRoomState = {
    camWasSet : false ,     
    msPayloadCount : 0 ,
    currentCam: 3 
}



const setCameraView = (scene:any, camNo:number ) => {

    console.log(`setCameraView as camNo = ${camNo}` )

    if(scene.cameras && scene.cameras[camNo])
        scene.activeCamera = scene.cameras[camNo]
    
    console.log(` now the active cam has id = ` , scene.activeCamera?.id)

    const defaultLight = scene.lights[0]
    if(camNo == 0)
    {
        defaultLight.setEnabled(false)
        
        const customLight = new BABYLON.DirectionalLight("customLight", 
            new BABYLON.Vector3(-3 , -2 , -1) , scene )
        customLight.intensity = 0.75
        const customLight2 = new BABYLON.DirectionalLight("customLight2", 
            new BABYLON.Vector3(3 , -2 , 1) , scene )
        customLight2.intensity = 0.75
        
    }
    else
    {
        defaultLight.setEnabled(true)
        
        for(let i= 1;i<=2;i++) 
        {
            if(scene.lights[i] && scene.lights[i].dispose)
                scene.lights[i].dispose()    
        }
        
        
    }
}


// setup table composible meshes
const setupTable = (scene:Scene) => {
    // setup meshes
    // 1.) table 
    const table = BABYLON.MeshBuilder.CreateBox('table', {
        width: GAME_CONSTANTS.TABLE_WIDTH ,
        depth: GAME_CONSTANTS.TABLE_DEPTH,
        height: GAME_CONSTANTS.TABLE_HEIGHT
    })
    table.position.y = 0 - GAME_CONSTANTS.TABLE_HEIGHT / 2
    const tableMaterial = new BABYLON.StandardMaterial("tableMaterial")
    table.material  = tableMaterial 
    tableMaterial.diffuseColor = new BABYLON.Color3(0.1,0.1,0.1)

    const glowLayer = new BABYLON.GlowLayer("glow", scene)
    glowLayer.intensity = GAME_CONSTANTS.GFX_GLOWING_INTENSITY 
    
    
    // 2.) 42 bkk logo 
    const sticker = BABYLON.MeshBuilder.CreatePlane("sticker", { width: 2, height: 2 }, scene)
    const stickerMat = new BABYLON.StandardMaterial("stickerMat", scene)
    stickerMat.diffuseTexture = new BABYLON.Texture( sticker42bkk  , scene)
    
    stickerMat.backFaceCulling = false
    sticker.material = stickerMat
  
    sticker.position = new BABYLON.Vector3(0, GAME_CONSTANTS.TABLE_HEIGHT / 4, 0)
    sticker.rotation.x = Math.PI / 2
    sticker.rotation.z = - (Math.PI / 2)


    // 3.) side borders
    const borderTop = BABYLON.MeshBuilder.CreateBox('borderTop', {
        width: GAME_CONSTANTS.BORDER_WIDTH  ,
        height: GAME_CONSTANTS.BORDER_HEIGHT, 
        depth: GAME_CONSTANTS.TABLE_DEPTH - (GAME_CONSTANTS.PADDLE_DEPTH)
    })
    borderTop.position = new BABYLON.Vector3(GAME_CONSTANTS.TABLE_WIDTH / 2 + (GAME_CONSTANTS.BORDER_WIDTH /2 ), 
        GAME_CONSTANTS.BORDER_HEIGHT / 2
    , 0 )
    const borderMaterial = new BABYLON.StandardMaterial("borderMat");
    borderMaterial.diffuseColor = BABYLON.Color3.Black()
    borderMaterial.emissiveColor = new BABYLON.Color3(0,1,0.75)
    borderTop.material = borderMaterial

    const borderBottom = BABYLON.MeshBuilder.CreateBox('borderBottom', {
        width: GAME_CONSTANTS.BORDER_WIDTH  ,
        height: GAME_CONSTANTS.BORDER_HEIGHT, 
        depth: GAME_CONSTANTS.TABLE_DEPTH - (GAME_CONSTANTS.PADDLE_DEPTH)
    })
    borderBottom.position = new BABYLON.Vector3( 0 - (GAME_CONSTANTS.TABLE_WIDTH / 2) - (GAME_CONSTANTS.BORDER_WIDTH /2 ), 
        GAME_CONSTANTS.BORDER_HEIGHT / 2
    , 0 )
    borderBottom.material = borderMaterial


    // solong flood 
    
}


// setup paddles, from 2 up to 4 paddles
// RGBs were fixed as RED / BLUE / YELLOW / GREEN
const setupPaddles = (scene:Scene) => {
    const paddleP1:any = BABYLON.MeshBuilder.CreateBox('paddleP1', {
        width: GAME_CONSTANTS.PADDLE_WIDTH, 
        height: GAME_CONSTANTS.PADDLE_HEIGHT,
        depth: GAME_CONSTANTS.PADDLE_DEPTH, 
    }, scene)
    const paddle1Material = new BABYLON.StandardMaterial('paddleP1materail')
    paddleP1.material = paddle1Material
    
    paddle1Material.diffuseColor = new BABYLON.Color3(1.0,  0.6, 0.6)
    paddle1Material.alpha = GAME_CONSTANTS.PADDLE_ALPHA
    paddleP1.position.y = GAME_CONSTANTS.PADDLE_HEIGHT / 2
    paddleP1.position.z = (GAME_CONSTANTS.TABLE_DEPTH / 2) + (GAME_CONSTANTS.PADDLE_DEPTH)

    const paddleP2 = BABYLON.MeshBuilder.CreateBox('paddleP2', {
        width: GAME_CONSTANTS.PADDLE_WIDTH, 
        height: GAME_CONSTANTS.PADDLE_HEIGHT,
        depth: GAME_CONSTANTS.PADDLE_DEPTH, 
    }, scene)
    const paddle2Material = new BABYLON.StandardMaterial('paddleP2material') as BABYLON.StandardMaterial
    paddle2Material.diffuseColor = new BABYLON.Color3(0.6, 0.6, 1.0)
    paddle2Material.alpha = GAME_CONSTANTS.PADDLE_ALPHA
    paddleP2.material = paddle2Material
    paddleP2.position.y = GAME_CONSTANTS.PADDLE_HEIGHT / 2
    paddleP2.position.z = 0 - ((GAME_CONSTANTS.TABLE_DEPTH / 2) + (GAME_CONSTANTS.PADDLE_DEPTH))

    const paddleP3 = BABYLON.MeshBuilder.CreateBox('paddleP3', {
        width: GAME_CONSTANTS.PADDLE_WIDTH, 
        height: GAME_CONSTANTS.PADDLE_HEIGHT,
        depth: GAME_CONSTANTS.PADDLE_DEPTH, 
    }, scene)    
    const paddle3Material = new BABYLON.StandardMaterial('paddleP3material')
    paddle3Material.diffuseColor = new BABYLON.Color3(1.0, 1.0 , 0.6)
    paddle3Material.alpha = GAME_CONSTANTS.PADDLE_ALPHA
    paddleP3.material = paddle3Material    
    paddleP3.position.x = GAME_CONSTANTS.TABLE_WIDTH / 4 * -1 
    paddleP3.position.y = GAME_CONSTANTS.PADDLE_HEIGHT / 2
    paddleP3.position.z = ((GAME_CONSTANTS.TABLE_DEPTH / 2) + (GAME_CONSTANTS.PADDLE_DEPTH))

    const paddleP4 = BABYLON.MeshBuilder.CreateBox('paddleP4', {
        width: GAME_CONSTANTS.PADDLE_WIDTH, 
        height: GAME_CONSTANTS.PADDLE_HEIGHT,
        depth: GAME_CONSTANTS.PADDLE_DEPTH, 
    }, scene)
    const paddle4Material = new BABYLON.StandardMaterial('paddleP4material')    
    paddle4Material.diffuseColor = new BABYLON.Color3(0.6, 1.0 , 0.6)
    paddle4Material.alpha = GAME_CONSTANTS.PADDLE_ALPHA
    paddleP4.material = paddle4Material
    paddleP4.position.x = GAME_CONSTANTS.TABLE_WIDTH / 4 * -1  
    paddleP4.position.y = GAME_CONSTANTS.PADDLE_HEIGHT / 2
    paddleP4.position.z = 0 - ((GAME_CONSTANTS.TABLE_DEPTH / 2) + (GAME_CONSTANTS.PADDLE_DEPTH))

}


// setup the main ball , 
const setupBalls = (scene:Scene) => {
            // setup ball 
    const ball = BABYLON.MeshBuilder.CreateSphere('ball', {
        diameter: GAME_CONSTANTS.BALL_DIAMETER
    }, scene)
    ball.position.y = GAME_CONSTANTS.BALL_DIAMETER / 2
    const ballMaterial = new BABYLON.StandardMaterial("ballMaterial", scene)
    // ballMaterial.diffuseTexture = new BABYLON.Texture('../resources/up.png')
    ball.material = ballMaterial


    const debugBall = BABYLON.MeshBuilder.CreateSphere('debugBall', {
        diameter: 0.1
    }, scene)
    const debugBallMaterial = new BABYLON.StandardMaterial("debugballMaterial", scene)
    debugBallMaterial.diffuseColor = new BABYLON.Color3 (0.6, 0.8 , 0.2)
    debugBall.material = debugBallMaterial
    debugBall.position = new BABYLON.Vector3(0,0.1, 0)

    if(!GAME_CONSTANTS.SHOW_AI_FORECAST_POS)
        debugBall.isVisible = false 
    // force hide the debug ball
    debugBall.isVisible = false 


}


// setupScene, returns as promise
const setupScene = () => {

 
    sceneReadyPromise = new Promise((resolve,reject) => {
        try {
            
            canvas = document.getElementById('mainCanvas') as HTMLCanvasElement
            if(!canvas)
                throw new Error("Unable to locate mainCanvas DOM")
            
            
            engine = new BABYLON.Engine(canvas, true)            
            const createdScene = new BABYLON.Scene(engine)

            let skyboxMaterial = null 

            // setup cameras 
            createdScene.createDefaultLight()
            new BABYLON.ArcRotateCamera('camBEV' , Math.PI , 0 , GAME_CONSTANTS.TABLE_DEPTH - 2.5 , new BABYLON.Vector3(0,0,0,) , createdScene)
            new BABYLON.ArcRotateCamera('camP1' , GAME_CONSTANTS.CAM_P1_ALPHA, GAME_CONSTANTS.CAM_P1_BETA, GAME_CONSTANTS.CAM_P1_RADIUS , new BABYLON.Vector3(0,0,0,) , createdScene)
            new BABYLON.ArcRotateCamera('camP2' , GAME_CONSTANTS.CAM_P2_ALPHA, GAME_CONSTANTS.CAM_P2_BETA, GAME_CONSTANTS.CAM_P2_RADIUS , new BABYLON.Vector3(0,0,0,) , createdScene)
            new BABYLON.ArcRotateCamera('camAud' , GAME_CONSTANTS.CAM_AUD_ALPHA, GAME_CONSTANTS.CAM_AUD_BETA, GAME_CONSTANTS.CAM_AUD_RADIUS , new BABYLON.Vector3(0,0,0,) , createdScene) 
            new BABYLON.ArcRotateCamera('camIRC1' , 4  , 1 , 45, new BABYLON.Vector3(0,0,0,) , createdScene)
            new BABYLON.ArcRotateCamera('camIRC2' , 0.4  , Math.PI / 3, 30 , new BABYLON.Vector3(0,0,0,) , createdScene)
            createdScene.activeCamera = createdScene.cameras[1]

            setupPaddles(createdScene)
            setupTable(createdScene)    
            setupBalls(createdScene)

            // var utilLayer = new BABYLON.UtilityLayerRenderer(createdScene)
            // utilLayer.utilityLayerScene.autoClearDepthAndStencil = false
            // const gizmo = new BABYLON.PositionGizmo(utilLayer)




            // background

            // const reflectionTexture = new BABYLON.CubeTexture("../src/images/cubemap.dds", createdScene)
            // const reflectionTexture = new BABYLON.CubeTexture("../src/images/environment.env", createdScene)
            // reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE
            

            const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, createdScene)
            skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMat", createdScene,)
            

            skyboxMaterial.backFaceCulling = false
            skyboxMaterial.disableLighting = true

            
            let skyboxPrefix = `/images/textures/${GAME_CONSTANTS.PONG_SKYBOX_THEME}`
            console.warn(` skyboxPrefix = `,skyboxPrefix)


            skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(skyboxPrefix , createdScene  ,  ["_px.png", "_py.png", "_pz.png", "_nx.png", "_ny.png", "_nz.png"])
            // skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture(skyboxPrefix , createdScene  ,  ["_px.jpg", "_py.jpg", "_pz.jpg", "_nx.jpg", "_ny.jpg", "_nz.jpg"])

            skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;

            skybox.material = skyboxMaterial;
            
            
            // // ORIGINAL
            // skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", scene)
            // skyboxMaterial.backFaceCulling = false
            // skyboxMaterial.reflectionTexture = reflectionTexture
            // skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE
            // skyboxMaterial.disableLighting = true
            // skybox.material = skyboxMaterial;

            


            // debugging stuff 
            // if(createdScene.getMeshById('ball')) 
            // {
            //   gizmo.attachedMesh = createdScene.getMeshById('ball')

            //   gizmo.updateGizmoRotationToMatchAttachedMesh = false;
            //   gizmo.updateGizmoPositionToMatchAttachedMesh = true;    
            // }
            

            
            const runScene = true 
            if(runScene)
            {
                engine.runRenderLoop( () => {
                    if(createdScene && createdScene.activeCamera)
                        createdScene.render()                    
                })
            }
            

            window.addEventListener('resize', _ => {
                if(engine)
                    engine.resize()
            })

        

        scene = createdScene
        scene.registerBeforeRender(() => {
            if(skyboxMaterial.reflectionTexture)
            {
                // drifting effect
                const texture = skyboxMaterial.reflectionTexture as BABYLON.CubeTexture;
                if (texture) 
                    texture.rotationY += GAME_CONSTANTS.GFX_BG_DRIFT_RATE 

            }
                
        })
          
        //   Inspector.Show(scene, {})
          resolve(scene)
        
        } catch (error)
        {
            reject(error)
        }

    })  
  
    return sceneReadyPromise
}


let renderLoopIsRunning = false 

const runRenderLoop = () => {     
    if(!renderLoopIsRunning && engine)
        {
            engine.runRenderLoop( () => {
                // calculatePositions(scene, gameLogic)
                const theScene = getScene()
                if(theScene)
                    theScene.render()
            })
            renderLoopIsRunning = true 
     }
}     

const stopRenderLoop = () =>  {

}

const getScene = () => {
    return scene 
}


const loadGamePage = async () => {

    await setupScene()
    scene = getScene()
}


const destroyBabylonScene = () => {
    console.log(` destroy babylon object`)
    if (scene) {
        scene.dispose()
        scene = null;
    }

    if (engine) {
        engine.stopRenderLoop()
        // should we?
        engine.dispose()
        engine = null
    }

    const canvas = document.getElementById('mainCanvas');
    if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
    }

    
    roomState.camWasSet = false 

    // camWasSet = false

    window.removeEventListener('resize', () => {
        if (engine) 
            engine.resize();
    });
}

export { 
    setupScene, 
    getScene, 
    setCameraView, 
    loadGamePage,
    engine,
    runRenderLoop,
    stopRenderLoop,
    destroyBabylonScene,
    roomState 

    
}
export default getScene 