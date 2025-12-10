import { IPongPlayer } from "./Player"

//createdAt: Date.now(), 

// matchStatus: options?.matchStatus ? options.matchStatus  : "CREATED" ,
// matchSettings: options?.matchSettings ? options.matchSettings :  newMatchSettings(), 
// matchStartsAt: null, 
// matchEndsAt: null, 

// tournamentId: options?.tournamentId ? options.tournamentId : null  ,

// score: [0, 0], 
// // players
// hostPlayer: options?.hostPlayer ? options.hostPlayer : null , 
// playersRequired: options?.playersRequired ? options.playersRequired : 2, 
// players : options?.players ? options.players : [], 
// gamePlay : options?.gamePlay ? options.gamePlay: null , 
// intervalId : null ,
// winnerSide : -1 , 
// sockets: [] , 

import { Socket } from "socket.io-client";


class MatchSettings {
    type:string = 'FirstTo5' 
    scoreToWin:number = 5 
    timeLimit: number|null  = null 
}


export class IPongSpecial {
    id: string = '';
    name : string = '';
}
export class IPaddleController {
    cont: {
            isLeft : boolean,
            isRight: boolean,
            tsToReleaseKey: number, 
    }
    
    constructor() {
        this.cont = {
            isLeft: false, 
            isRight: false, 
            tsToReleaseKey: Infinity,
        }
    }
}

interface IPaddle {
    pos: IVector2D, 
    scale: number
    speed: number 
    special: IPongSpecial | null, 
    cont: IPaddleController, 

}

interface IVector2D {
    x: number
    z: number
}

interface IBall {
    pos: IVector2D 
    dir: IVector2D 
    speed: number  
}
export interface IPongGamePlay {

    ball: IBall 
    paddles: IPaddle[] , 
    gameStartTimestamp: number 
    gameIsPaused: boolean 
}



interface IPongRoom {
    id: number 
    roomId: string
    createdAt: number,
    matchStatus: string , 
    matchSettings: MatchSettings
    matchStartsAt: number, 
    matchEndsAt: number, 
    tournamentId: number|null , 
    score: [number,number],
    hostPlayer: number|null ,
    playersRequired: number, 
    players: IPongPlayer[],
    intervalId: ReturnType<typeof setInterval>;
    winnerSide: number,
    socket: Socket[]
    gamePlay: IPongGamePlay,
    controller: number | null 
    classicMode: boolean ,
    baf: boolean | null, 
    resignedBy: number | null 

    
}
interface IPongRoomsPayload {
    rooms : IPongRoom[] 
}

interface IPongRoomPayload {
    roomId: string 
}


interface IPongMatchPayload {
    match: IPongRoom
    roomId: string | null  
}


interface IPongUserPayload {
    user: IPongPlayer 
}



interface IPongSpecialEffect {
    match: IPongRoom , 
    gamePlay: IPongGamePlay , 
    special : IPongSpecial, 
    usedBy: number,
    effectedTeam: number, 
}


interface IPongError 
{
    message: string
    code: number | null 
    fatal:boolean| null 
}


interface IPongTournamentParticipant 
{
    id: number
    user_id: number
    username: string 
    status: string 

}

interface IPongActiveTournament
{
    id: number
    name: string
    status: string 
    winner_id: number|null
    winner_username: number |null
    max_participants: number,
    current_participants: number, 
    tournament_starts_at: string
    created_at: string
    started_at: string | null,
    completed_at: string | null,
    participants: IPongTournamentParticipant[]
    games: any[]
}

const PongError = (message:string, code:number | null  ) => {
    const theError = {} as IPongError
    theError.message = message 
    theError.code = code 
    return theError 
}

const PongFatalError = (message:string, code:number | null  ) => {
    const theError = PongError(message, code) 
    theError.fatal = true 
    return theError 
}


export type { 
    IPongRoom , 
    IPongRoomsPayload ,
    IPongRoomPayload ,
    IPongMatchPayload ,
    IPongUserPayload ,
    IPongSpecialEffect ,
    IPongError ,
    IPongTournamentParticipant , 
    IPongActiveTournament , 
}

export {
    PongError ,
    PongFatalError , 
}
