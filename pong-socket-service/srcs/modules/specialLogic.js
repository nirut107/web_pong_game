import GAME_CONSTANTS from "../constants.js"
import PongError from "../models/pongError.js"
import broadcastToRoom from "./gameRuntime.js"

const specialTimeoutStack = []

const restoreFractol = (theMatch , thePaddle, effectedTeam) => {
    
    theMatch.players.forEach( (player,index) => {
        if(index % 2 != effectedTeam)
            return 
        player.statuses = player.statuses.filter(item => item != 'fractol')            
    })

}

const handleFractol = (theMatch , thePaddle, effectedTeam) => {
    try 
    {
        theMatch.players.forEach( (player,index) => {
            if(index % 2 != effectedTeam)
                return 
            player.statuses.push('fractol')
        })  
        
        let restoreAiVision = setTimeout(() => {
            restoreFractol(theMatch , thePaddle, effectedTeam)
        }, GAME_CONSTANTS.SPECIAL_FRACTOL_DURATION * 1000)
        specialTimeoutStack.push(restoreAiVision)

    }
    catch (error)
    {
        console.error(error)
    }
    
}    



const restoreMinitalk = (theMatch , thePaddle, effectedTeam) => {
    
    try {
        for(let i = effectedTeam; i+=2 ; i <= 3)
        {
            theMatch.gamePlay.paddles[ i ].scale = 1 
        }    
    }
    catch (error)
    {
        console.log(`Silently handling the error #minitalk`)
    }
}

const handleMinitalk = (theMatch , thePaddle, effectedTeam) => {
    
    for(let i = effectedTeam;  i < theMatch.playersRequired;i+=2 )
    {
        if( theMatch.gamePlay.paddles[ i ].scale != 1)
            continue 
        
        theMatch.gamePlay.paddles[ i ].scale = GAME_CONSTANTS.SPECIAL_MINITALK_SCALE 
    }
    
    let restoreScale = setTimeout(() => {
        restoreMinitalk(theMatch , thePaddle, effectedTeam)
    }, GAME_CONSTANTS.SPECIAL_MINITALK_DURATION * 1000)
    specialTimeoutStack.push(restoreScale)
}




const restoreSolong = (theMatch , thePaddle, effectedTeam) => {
    
    try {
        for(let i = effectedTeam;  theMatch.playersRequired;i+=2)
            theMatch.gamePlay.paddles[ i ].speed = 1 
    }
    catch (error)
    {
        console.log(`Silently handling the error, #restoresolong`)
    }
}

const handleSolong = (theMatch , thePaddle, effectedTeam) => {
    
    try {
    
        for(let i = effectedTeam;  i < theMatch.playersRequired;i+=2 )
        {
            if( theMatch.gamePlay.paddles[ i ].speed != 1)
                throw PongError("Effected already in used")
            
            theMatch.gamePlay.paddles[ i ].speed = GAME_CONSTANTS.SPECIAL_SOLONG_SPEED 
        }
        
        let restoreSpeed = setTimeout(() => {
            restoreSolong(theMatch , thePaddle, effectedTeam)
        }, GAME_CONSTANTS.SPECIAL_SOLONG_DURATION * 1000)
        specialTimeoutStack.push(restoreSpeed)
    }
    catch (error) 
    {
        console.log(`Silently handling the error , #handlesolong`, error)
    }
    
    
}


const clearSpecialStack = () => {
    specialTimeoutStack.forEach( id => clearTimeout(id))
    specialTimeoutStack = []
}

const restoreFtirc = (theMatch , thePaddle, effectedTeam) => {
    
    try {
        theMatch.players.forEach( (player,index) => {
            if(index % 2 != effectedTeam)
                return 
            player.statuses.push('ftirc')
        })
    }
    catch (error)
    {
        console.log(`Silently handling the error , #restoreftirc`)
    }
}

const handleFtirc = (theMatch , thePaddle, effectedTeam) => {
    

    try {
        theMatch.players.forEach( (player,index) => {
                if(index % 2 != effectedTeam)
                    return 
                player.statuses.push('ftirc')
            })  

        
        let restoreCam = setTimeout(() => {
            restoreFtirc(theMatch , thePaddle, effectedTeam)
        }, GAME_CONSTANTS.SPECIAL_FTIRC_DURATION * 1000)
        specialTimeoutStack.push(restoreCam)    
    }
    catch (error)
    {
        console.log(`Silently handling the error, #handleftirc`)
    }
}


const handleSpecial = (theMatch, paddleNo ,  specialId) => {
    
    // console.log(` *** IN `, paddleNo, specialName)
    
    console.log(` *** INSIDE handleSpecial`, theMatch.gamePlay)
    const thePaddle = theMatch.gamePlay.paddles[ paddleNo ]
    
    if(!thePaddle)
        throw PongError(`Invalid Paddle Value - ${paddleNo}`)
    // console.log(thePaddle)
    if(thePaddle.special == null)
        throw PongError("Special was empty")
    
    const effectedTeam = paddleNo % 2 == 0 ? 1 : 0
    // console.log("Still OK at here???")
    let theUsingSpecial = null 
    switch(thePaddle.special.id )
    {
        case 'fractol'  :   
                            handleFractol(theMatch, thePaddle, effectedTeam )
                            break 
        case 'solong'   :   
                            handleSolong(theMatch, thePaddle, effectedTeam )
                            break 
        case 'ftirc'   :    
                            handleFtirc(theMatch, thePaddle, effectedTeam )
                            break 
                            
        case 'minitalk' :
                            handleMinitalk(theMatch , thePaddle, effectedTeam)
                            break;
        default         :   
                            throw PongError(`Invalid payload - special ${thePaddle.special.id}`)
    }
    
        
    broadcastToRoom( theMatch.roomId, 'special-effect', {
                            match: theMatch, 
                            special : thePaddle.special ,
                            usedBy: paddleNo , 
                            effectedTeam : (paddleNo % 2 == 0 ? 1 : 0)                            
    })

    // used
    thePaddle.special = null  
    

}


export default handleSpecial
export {
    handleSpecial,
    clearSpecialStack, 
}