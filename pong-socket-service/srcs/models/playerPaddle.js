

const newPlayerPaddle = (options = {}) => {


    const thePlayerPaddle = {
        pos: {x:0, z:0} , 
        scale: 1,
        speed: 1, 
        special: null, 
        cont: {
            isLeft : false,
            isRight: false,
            tsToReleaseKey: Infinity, 
        },
        
    }
    if(options?.pos) {
        console.log(" pos SET")
        if(options?.pos.x)
            thePlayerPaddle.pos.x = options.pos.x
        if(options?.pos.y)
            thePlayerPaddle.pos.y = options.pos.y
        if(options?.pos.z)
            thePlayerPaddle.pos.z = options.pos.z
    }
    if(options?.scale)
        thePlayerPaddle.scale = options.scale 
    if(options?.speed)
        thePlayerPaddle.speed = options.speed
    if(options?.special)
        thePlayerPaddle.special = options.special
    console.log(`inside here DONE`, thePlayerPaddle)

    
    return thePlayerPaddle
}

const dummyPlayerPaddle = (options = {}) => {

    
    const thePlayerPaddle = newPlayerPaddle()

    if(options?.pos) {
        
        if(options?.pos.x)
            thePos.x = options.pos.x
        if(options?.pos.y)
            thePos.y = options.pos.y
        if(options?.pos.z)
            thePos.z = options.pos.z
        
    }
    if(options?.scale)
        thePlayerPaddle.scale = options.scale 
    if(options?.speed)
        thePlayerPaddle.speed = options.speed
    if(options?.special)
        thePlayerPaddle.special = options.special

    
    return thePlayerPaddle
}


export { newPlayerPaddle , dummyPlayerPaddle }
export default newPlayerPaddle