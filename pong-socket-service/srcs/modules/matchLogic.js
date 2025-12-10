import GAME_CONSTANTS from "../constants.js"
import newPlayer from "../models/player.js"
import newPlayerPaddle from "../models/playerPaddle.js"
import PongError from "../models/pongError.js"
import rooms from "../pong42ServerSetup.js"

const findMatch = (roomId) => {
    if(rooms[roomId] === undefined || !rooms[roomId])
        throw PongError(`Invalid payload - match ${roomId} not found`, 404 )

    return rooms[roomId]

}



const setMatchPlayersRequired = (theMatch, reqs) => {
    
    theMatch.playersRequired = reqs


    const p1 = theMatch.players[0]
    const p2 = theMatch.players[1]


    console.log(p1,p2, "still OK???")

    theMatch.players = new Array(reqs).fill(null)
    theMatch.players[0] = p1
    theMatch.players[1] = p2



    // if( theMatch.players.length > reqs)
    // {
    //     delete theMatch.players[2]
    //     delete theMatch.players[3]
    // }
    // else 
    // {
    //     theMatch.players[2] = null 
    //     theMatch.players[3] = null
    // }


}

const setMatchPlayerAtPosition = (theMatch , player, position) => {

    if( theMatch.playersRequired - 1< position)
        throw PongError(`Invalid payload - positon ${position} is exceeding playersRequired ${theMatch.playersRequired}`, 400)

    let wasSit = false
    for( let i = 0;i<theMatch.players.length;i++)
    {
        if(i == position && theMatch.players[i] != null && theMatch.players[i].userId != player.userId)
            throw PongError(`Invalid payload - position #${i+1} was occupied`)
        if (theMatch.players[i]?.userId == player.userId)
        {
            wasSit = true 
            theMatch.players[i] = null 

        }

    }
    theMatch.players[ position ] = player 
    return wasSit 

}

const addPlayerToNewMatch = (player, match) => {
    console.log(" inside addPlayerToNewMatch()")

    if (match.matchStatus != 'CREATED')
        throw PongError(`Invalid match state - ${match.matchStatus}`, 400)
    
    if(match.playersRequired < match.players.length + 1) 
        throw PongError(`Invalid match state - room is already full`, 400)

    const theNewPlayer = newPlayer(player)

    match.players.push(theNewPlayer)
    let pos = {
        z :  (match.players.length % 2 == 1 ? (- GAME_CONSTANTS.TABLE_DEPTH / 2) :(GAME_CONSTANTS.TABLE_DEPTH / 2))
    }

    let thePaddle = newPlayerPaddle({pos:pos})
    console.log(`SS paddle ${pos}`, thePaddle)
    match.gamePlay.paddles.push( thePaddle )
}    


const unsetPlayerAtPos = (pos, theMatch) => {
    theMatch.players[pos] = null 
}

const setPlayerAtPosToTheMatch = (player, pos, theMatch) => {
    console.log(" inside setPlayerAtPosToNewMatch()")

    let wasSit = -1 
    for(let i =0; i < theMatch.players.length;i++)
        if(theMatch.players[i]?.userId == player.userId) 
            wasSit = i 
        
    console.log(`wasSit = `, wasSit)

    if (theMatch.matchStatus != 'CREATED')
        throw PongError(`Invalid match state - ${theMatch.matchStatus}`, 400)
    
    const theNewPlayer = newPlayer(player)

    theMatch.players[ pos ] = theNewPlayer

    if(wasSit != -1 )
        unsetPlayerAtPos(wasSit , theMatch)
}





const addMatchToRooms = (theMatch) => {

    if(rooms[ theMatch.roomId ])
        throw PongError(`match ${theMatch.roomId} is already exists`) 
    rooms[ theMatch.roomId ] = theMatch 
    return rooms.length 
}

export { 
    findMatch, 
    addPlayerToNewMatch, 
    addMatchToRooms,
    setMatchPlayersRequired,  
    setMatchPlayerAtPosition, 
    setPlayerAtPosToTheMatch,
    unsetPlayerAtPos, 
}    
export default findMatch 
