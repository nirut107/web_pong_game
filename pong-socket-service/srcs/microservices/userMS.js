import GAME_CONSTANTS from "../constants.js"
import PongError from "../models/pongError.js"


const msFetchUser = async (userId) => {
    try { 
        const endpoint = `${GAME_CONSTANTS.MS_USER_ENDPOINT_PREFIX}users/${userId}/profile`
        const res = await fetch( endpoint, {
            method: 'GET', 
        })
          
        if (!res.ok) 
            throw PongError("Failed to fetch profile")
        const profile = await res.json();    
          const thisUser = {
            userId: profile.userId, 
            nick: profile?.displayName ?? `${profile.userId}`,
            avatar: profile?.avatarUrl
          }
          return thisUser       
    } catch(error)
    {
        const thisUser = {
            userId, 
            nick: "",
            avatar: "" 
        }
        return thisUser
    }
    

} 


export {
    msFetchUser
}

export default msFetchUser 