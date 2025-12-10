import { allAiPlayers } from "../constants.js"
import pongError from "./pongError.js"

const newPlayer = (option) => {
    return {
        userId:  option?.userId ? option?.userId : 0 , 
        username: option?.username ? option?.username : 'unknown' , 
        nick: option?.nick ? option?.nick : 'UnknownPlayer' , 
        rating: option?.rating ? option.rating : 1000, 
        avatar: option?.avatar ? option.avatar : 'defaultAvatar.jpg', 
        aiSpecialCB: null, 
        statuses: [], 
        aiLevel: 0
    }
}


const newDummyPlayer = (options = {}) => {
    const thePlayer = newPlayer()
    thePlayer.userId = options?.userId ? options.userId : 7 
    thePlayer.username = options?.username ? options.username : 'bworrawa'
    thePlayer.nick = options?.nick ? options.nick : 'GET'
    thePlayer.rating = options?.rating ? options.rating : 1000 
    thePlayer.avatar = options?.avatar ? options.avatar : 'defaultVatar.jpg'
    thePlayer.aiLevel = 0 
    return thePlayer
}



const newAIPlayer = (options = {}, aiLevel = 1) => {

    aiLevel -- 

    if(aiLevel < 0 || aiLevel >= allAiPlayers.length )
        throw pongError(`Invalid AI Player Level ${aiLevel}`, 400)
    const theAi = allAiPlayers[ aiLevel ]
    const thePlayer = newPlayer()
    thePlayer.userId = theAi.userId 
    thePlayer.username = theAi.username
    thePlayer.nick = theAi.nick
    thePlayer.rating = theAi.rating
    thePlayer.aiLevel = theAi.aiLevel 

    return thePlayer 
}



export { newPlayer , newDummyPlayer , newAIPlayer }
export default newPlayer 