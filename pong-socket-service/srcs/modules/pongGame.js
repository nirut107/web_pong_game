import GAME_CONSTANTS from "../constants.js"
import newGamePlay from "../models/gamePlay.js"
import newMatch from "../models/match.js"
import newMatchSettings from "../models/matchSettings.js"
import newPlayerPaddle from "../models/playerPaddle.js"
import PongError from "../models/pongError.js"
import randomBallDirection from "./ballLogic.js"
import calculateMove from "./gamePlayLogic.js"
import { addPlayerToNewMatch } from "./matchLogic.js"
import { randomSpecial } from '../models/special.js'

let i = 0 

const debugDatetime = (ts) => {
    const date = new Date(ts)
  
    const pad = n => String(n).padStart(2, '0')
  
    const year = date.getFullYear()
    const month = pad(date.getMonth() + 1)
    const day = pad(date.getDate())
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    const seconds = pad(date.getSeconds())
  
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}  

const displayDatetime = (ts) => {
    return debugDatetime(ts)
}

const setWinner = (theMatch, side ) => {

    theMatch.matchStatus = 'OVER'
    console.log(`side ???`, side)
    theMatch.winnerSide = side 
    console.log("\ntheMatch is over, do the cleaning up!")

}


const pongLoop = (socket , io, theMatch ) => {


    if(theMatch.gamePlay.gameIsPaused)
    {   
        // process.stdout.write('P');
        return 
    }        

    calculateMove(socket, io, theMatch)
    // io.to(theMatch.roomId).emit('game-data', theMatch.gamePlay )
    io.to( theMatch.roomId).emit('game-data', theMatch.gamePlay )
    process.stdout.write('D');
    //  console.log(theMatch.gamePlay)

}



// turns the created => init
const initializeThisMatch = (theMatch) => {

    console.log(`initializeThisMatch ... `)
    console.log(" HHH - Check the Match , should there be players?")
    console.log(theMatch)
    console.log(theMatch?.players)
    console.log(` HHH - end checking `)

    theMatch.gamePlay = newGamePlay(theMatch)   

    for(let i=0; i<theMatch.players.length;i++)
    {
        let fact = i > 1 ? -1 : 1 
        const thePos = {
            x: theMatch.playersRequired == 4 ? 
             (GAME_CONSTANTS.TABLE_WIDTH / 4) * fact : 0,
            z: (i%2 ==0) ?  (GAME_CONSTANTS.TABLE_DEPTH /2 ) : (0 - (GAME_CONSTANTS.TABLE_DEPTH /2 ) )
        }

        console.log(` i , thePos `,  i , thePos )   
        theMatch.gamePlay.paddles[ i ] = newPlayerPaddle({ pos: thePos})
    }

    console.log("randomlyGivenSpecials() is being called")
    randomlyGivenSpecials(theMatch)


    const theNow = Date.now()
    for(let i=0;i<theMatch.playersRequired; i++)
    {
        if ( theMatch.players[i]?.aiLevel)
        {
            // DEBUGNOTE: setting AI's time to use special here
            // set up AI's timeout to use trigger
            let CB = (Math.random() * (GAME_CONSTANTS.PONG_AI_SPECIAL_TO_SECS -  GAME_CONSTANTS.PONG_AI_SPECIAL_FROM_SECS))
            console.log(` for ai player on seat#${i+1}, CB = ${CB} sec`)
            CB = Date.now() + (CB * 1000); 
            theMatch.players[i].aiSpecialCB = CB; 
            theMatch.players[i].lastBallPos = { x:0 , z:0}
            theMatch.players[i].oldBallPos = { x:0 , z:0}
            let addition = (250 * i)
            theMatch.players[i].shouldSeeBallAt = theNow + addition 
            console.log(` current timestamp / next due for AI is   ` , debugDatetime(theNow) , addition , debugDatetime(theMatch.players[i].shouldSeeBallAt) )

            
            theMatch.containsAi = true 
        }
    }
    theMatch.gamePlay.gameStartTimestamp = theMatch.matchStartsAt = theNow 
    theMatch.gamePlay.ball.dir = randomBallDirection()
    theMatch.gamePlay.gameIsPaused = true 

    theMatch.matchStatus = 'INIT'

}



const randomlyGivenSpecials = (theMatch) => {
    
    for(let i=0;i < theMatch.gamePlay.paddles.length; i++)
    {
         let thePaddle = theMatch.gamePlay.paddles[i]
         console.log("BEFORE", thePaddle)
         if(!theMatch.classicMode)
            thePaddle.special =  randomSpecial()    
         console.log("777AFTER", thePaddle , thePaddle.special)
    }
        
    
}


// const initializeMatch = (socket,io) => {
//     const theMatch = newMatch()
//     theMatch.gamePlay = newGamePlay(theMatch)   
//     theMatch.gamePlay.gameStartTimestamp = theMatch.matchStartsAt = Date.now()
//     theMatch.gamePlay.ball.dir = randomBallDirection()
//     theMatch.gamePlay.gameIsPaused = true 
    
//     console.log("randomlyGivenSpecials() is being called")
//     randomlyGivenSpecials(theMatch)
    
//     return theMatch
// }


const initializeDummyMatch = (socket, io) => {

    const theMatch = initializeMatch()

    // const dummyMS = newMatchSettings()
    // dummyMS.type = 'FirstTo10'
    // dummyMS.scoreToWin = 10     
    // theMatch.matchSettings = dummyMS 

    theMatch.roomId = 'room_dummy'
    return theMatch

}

const validateMatch = (pongSocket, io, theMatch) => {
    console.log(`validateMatch() , error from this  function should returned to the emitter (host), not to everyone `)

    try {
        let containsHumanPlayer = false 
        for(let i=0; i < theMatch.playersRequired;i++ )
        {
            if(theMatch.players[i] == null)
            {
                console.log(theMatch.players)
                throw PongError(`Invalid room state - Players are not full yet , empty at pos ${i+1}`)
            }
                
            if(!theMatch.players[i].aiLevel )
            {
                console.log(` this one is human`, theMatch.players[i])
                containsHumanPlayer = true 
            }
            else
            {
                console.log(` this one is not  human?`, theMatch.players[i])
            }
                
        }
    
        console.log(`theMatch is now`, theMatch)
        if(!containsHumanPlayer)
            throw PongError("Invalid room state - Must contain at least 1 human player")
    }
    catch (error)
    {
        pongSocket.emit('pong-error',error )
        return false 
    }

    
        
    
    
    return true 

    

}


const startMatch = (socket , io , theMatch) => {
    console.log(`startMatch()`)
    const roomId = theMatch.roomId 
    theMatch.matchStatus = 'IN_PROGRESS'

    const pongGameInterval = setInterval(() => {
        pongLoop(socket, io, theMatch )
        if(theMatch.matchStatus == 'OVER')
            clearInterval(pongGameInterval)

    }, GAME_CONSTANTS.BROADCAST_RATE) 
}

const isRatedGame = (theMatch) => {
    if(theMatch.playersRequired == 4)
        return false 
    if(theMatch.classicMode)
        return false 
    return true 
}


export { 
    // initializeMatch, 
    initializeDummyMatch,  
    validateMatch, 
    startMatch,  
    setWinner, 
    initializeThisMatch, 
    debugDatetime ,
    displayDatetime , 
    isRatedGame 

}
export default startMatch