import { User } from "../route"

interface IPongPlayer  {
    userId:  number , 
    nick: string | null ,
    rating: number | null , 
    avatar: string | null, 
    aiSpecialCB: null, 
    statuses: string [], 
    aiLevel: number
}

export const userToPongPlayer = (user:User) => {
    let player: IPongPlayer = {} as IPongPlayer 
    player.userId = user.userId
    player.nick = user.displayName
    player.avatar = user.avatarUrl 
    player.aiLevel = 0
    return player 
}  


export type {
    IPongPlayer
}

