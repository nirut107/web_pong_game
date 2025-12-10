import { newPlayer,  newAIPlayer, newDummyPlayer } from "./player.js"
import { newMatchSettings } from './matchSettings.js'

const newMatch = (user, options) => {
    const theMatch = {      
       id: null , 
       roomId: options?.roomId ? options.roomId: `room_${Date.now()}`, 
       createdAt: Date.now(), 

       matchStatus: options?.matchStatus ? options.matchStatus  : "CREATED" ,
       matchSettings: options?.matchSettings ? options.matchSettings :  newMatchSettings(), 
       matchStartsAt: null, 
       matchEndsAt: null, 
       
       tournamentId: options?.tournamentId ? options.tournamentId : null  ,
       
       score: [0, 0], 
       // players
       hostPlayer: options?.hostPlayer ? options.hostPlayer : null , 
       playersRequired: options?.playersRequired ? options.playersRequired : 2, 
       players : options?.players ? options.players : [], 
       gamePlay : options?.gamePlay ? options.gamePlay: null , 
       intervalId : null ,
       winnerSide : -1 , 
       sockets: [] , 
       classicMode : false ,
       baf : false,

       
    }
    theMatch.players[0] = user 

    if(!options?.hostPlayer)
        theMatch.hostPlayer = user?.userId

    console.log(` theMatch.playersRequired !!! = `, theMatch.playersRequired) 
    for(let i=1;i < theMatch.playersRequired;i++)
    {
        console.log(`setting  `, i )
        theMatch.players[ i] = null 
    }
    
    theMatch.containsAi = false 
    return theMatch 
}

// const newDummyMatch = () => {
//     const theMatch = newMatch()
//     theMatch.roomId = 'room_dummy'
    
//     theMatch.hostPlayer = 'GET'
//     const thePlayer = newDummyPlayer()
//     theMatch.players.push(thePlayer)
// }



export { 
    newMatch, 
    // newDummyMatch  
}

export default newMatch 