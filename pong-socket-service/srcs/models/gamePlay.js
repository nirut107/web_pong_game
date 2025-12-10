import GAME_CONSTANTS from "../constants.js"
import newPlayerPaddle from "./playerPaddle.js"

const newGamePlay = (theMatch) => {
    console.log(` ***** newGamePlay is being called `)   
    const theGamePlay = {
        ball: {
            pos: { x: 0 , z: 0} ,
            dir: { x: 0 , z: 0 },
            speed: 1
        },
        paddles: [

        ], 
        gameStartTimestamp: null , 
        gameIsPaused: true, 

    }

    for( let i=0; i <theMatch.playersRequired; i++)
    {
        console.log(` in this loop ${i}`)
        const thePos = {
            x: theMatch.playersRequired == 4 ? 
             (GAME_CONSTANTS.TABLE_WIDTH / 4) : (0 - GAME_CONSTANTS.TABLE_WIDTH / 4),
            z: (i%2 ==0) ?  (GAME_CONSTANTS.TABLE_DEPTH /2 ) : (0 - (GAME_CONSTANTS.TABLE_DEPTH /2 ) )
        }

        console.log(` i , thePos `,  i , thePos )   
        theGamePlay.paddles[ i ] = newPlayerPaddle( { pos: thePos} )
    }
    console.log("Everything is OK for now")
    return theGamePlay
}


export { newGamePlay } 
export default newGamePlay 