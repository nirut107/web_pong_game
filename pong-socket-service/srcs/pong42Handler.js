import GAME_CONSTANTS, { allAiPlayers } from "./constants.js"
import msRequestCreateGame, { msFetchTournament, msFetchTournaments, msRequestUpdateMatchResult, msRequestJoinTournament, getActiveTournament, msRequestCreateTournament, msRequestStoreInBlockchain } from "./microservices/gameMS.js"
import newMatch from "./models/match.js"
import { newAIPlayer } from "./models/player.js"
import PongError from "./models/pongError.js"
import emitError from "./modules/emitError.js"
import { moveThePaddle } from "./modules/gamePlayLogic.js"
import { addMatchToRooms, addPlayerToNewMatch, findMatch, setMatchPlayerAtPosition, setMatchPlayersRequired } from "./modules/matchLogic.js"

import { validateMatch, startMatch, initializeThisMatch, isRatedGame } from "./modules/pongGame.js"
import { resetLastTournament, setupServerSchedules } from "./modules/scheduler.js"
import handleSpecial from "./modules/specialLogic.js"
import { broadcastCustom, checkAndMarkTournamentAsStarted } from "./modules/tournament.js"
import rooms, { addUserToLobby, joinServerRoom, lobbyUsers, registerSocketListWithUser, removeSocketFromSocketList, getUserFromSocketId, socketList , leaveServerRoom } from "./pong42ServerSetup.js"


let roomPing = {

}

let roomMapping = {

} 


const isAIPlayer = (userId) => {
    if(userId == 4242 || userId == 424242 || userId == 42424242)
        return true 
    return false
}
const getAILevel = (userId) => {
    switch(userId)
    {
        case 4242     : return 1
        case 424242   : return 2
        case 42424242 : return 3
    }
    return 0 
}
const getAIPlayer = (userId) => {
    let matchedId  = null 
    allAiPlayers.forEach( aiPlayer => {
        if( aiPlayer.userId == userId)
            matchedId = aiPlayer 
    })

    return matchedId 
}

const getUsersInTheRoom = (roomId) => {
    if(!roomMapping[ roomId])
        return {}

    return Object.values( roomMapping[ roomId ])
}

const getDistinctUsersInRoom = (roomId, removeKeyUser=false) => {
    console.log(`getDistinctUsersInRoom `, roomId) 
    if(roomMapping[ roomId ])
        return Object.values(roomMapping[ roomId ])
    return {}
}    

const removeRoomMapping = (roomId) => {
    if(!GAME_CONSTANTS.PONG_DELETE_ROOM_ON_SOCKET_EVENT)
        return 

    if(roomMapping[ roomId ])
        delete roomMapping[ roomId ]
    return true 
}

const emitRoomList = async (socket , io ) => {
    let debugTournamentRoom = false 
    const availableRooms = Object.values(rooms).filter(room  =>  {

        let defaultReturn =  room.matchStatus == 'CREATED' || room.matchStatus == 'INIT' 
        
        if(!debugTournamentRoom)
            return defaultReturn
        return  defaultReturn || room.tournamentId > 0
    })


    console.log(`AVAILABLE ROOMS`, availableRooms.length)

    console.log('emitting room list to everyone in lobby')
    // console.log('Avail Rooms', availableRooms)
    io.to('lobby').emit('room-list', { rooms: availableRooms} )      

    const size = io.of("/").adapter.rooms.get("lobby")?.size || 0;
    console.log(` currently ${size} users in lobby`)
}

const stringUserId = (userId) => `u${userId}`


const addUserToRoomMapping = (user , roomId ) => {

    // the room is there 
    if(!roomMapping[ roomId ])
        roomMapping[roomId] = {}
    if(!roomMapping[roomId]?.[ stringUserId(user?.userId)])
        roomMapping[roomId][ stringUserId(user?.userId) ] = user 
}
const controlDeleteRoom = (pongSocket, io , roomId) => {


    if(!GAME_CONSTANTS.PONG_DELETE_ROOM_ON_SOCKET_EVENT)
        return 

    console.log(` FFF - noone left, try to remove the room ${roomId} itself and emit the room list` )
    delete roomMapping[roomId]
    
    delete rooms[ roomId]
    emitRoomList(pongSocket, io )

}

const removeUserIdFromRoomMapping = (pongSocket, io , userId , roomId) => {
    console.log(` inside removeUserIdFromRoomMapping() ... `)
    if(!roomMapping[ roomId ])
        return false 
    if(!roomMapping[ roomId][stringUserId(userId)])
        return false 
    console.log(` - FFF - ***** FOUND ROOM , TO DELETE `, roomMapping[ roomId][stringUserId(userId)])
    console.log(` *** FFF BIG roomMapping = ` , roomMapping)


    const theMatch = rooms[ roomId]
    // skip the tournament rooms 
    if(theMatch && theMatch.tournamentId > 0)
        return true 

    console.log(` HHHH  --- WHY DELETE HERE???????`)
    console.log(`theMacth = `, theMatch)
    console.log(` HHHH  --- WHY DELETE HERE???????`)


    delete roomMapping[ roomId][stringUserId(userId)]
    if(Object.keys(roomMapping[roomId]).size === undefined || Object.keys(roomMapping[roomId]).size == 0)
    {
        console.log(` TUE_DEBUG pinging all the clients , roomId = `, roomId )
        roomPing[ roomId ] = {            
            callbackId : null , 
            count: 0
        };
        io.to(roomId).emit('ping')
        roomPing[ roomId ].callbackId =  setTimeout( async () => {
            console.log(` TUE_DEBUG , before removing pong `)

            const count = await io.in(roomId).fetchSockets()

        io.in(roomId).fetchSockets().then(sockets => {
            if (sockets.length === 0) {
                controlDeleteRoom(pongSocket , io, roomId)
            } else {
              // Room still has active clients
            }
        })


            // if(roomPing[ roomId ].count == 0)
            //     controlDeleteRoom(pongSocket , io, roomId)

        }, 3000);
        

    }
    else
    {
        console.log(` FFF - someone is left, with size = `, Object.keys(roomMapping[roomId]).size)
        console.log(` FFG - skipping delete`)
    }
        
    return true 
}





// start socketEvent handler =============================================
const pong42Handler = (pongSocket, io) => {

    let mappedUser = {}
    let theRoomId = null 

    const _letUserJoinRoom = (socket, io, user ,roomId) => {
        if(!user)
            throw PongError("Invalid payload - user expected", 400)
        if(!roomId)
            return 
    
        mappedUser = user 
        theRoomId = roomId 

        let theMatch = null 
        // registerSocketListWithUser(pongSocket, payload?.user)
        // make sure the room exists        
        if(roomId == 'lobby')
        {
            addUserToRoomMapping( user , roomId)
        }
        else 
        {
            console.log(` is here?????`)

            try {
                theMatch = findMatch(roomId)
            }
            catch (error)
            {
                if (error.code == 404)
                    return false 
                else 
                    throw error 
            }
            
            addUserToRoomMapping( user , roomId)
            // add to room structure itself directly

            // check if the user was in the socket list already?
            let alreadyJoined = false
            for(let i=0; i< theMatch.sockets.length; i++)
            {
                if(theMatch.sockets[i]?.userId == user.
                    userId)
                    alreadyJoined = true 
            }
            if(!alreadyJoined)
                theMatch.sockets.push(user)

        }
            
        console.log(` <== server emitting user-join-room to room ${roomId}, with payload`, { user })        
        io.to(roomId).emit('user-join-room', { user})            


        console.log(`=== DEBUG rooms  - roomMapping ==========`)
        console.log(JSON.parse(JSON.stringify(roomMapping)))
        if (theMatch)
        {
            console.log(`=== DEBUG rooms  - theMatch.sockets ==========`)
            console.log(theMatch.sockets)
        }
        
        console.log(`=== END DEBUG rooms ==========\n\n\n\n`)

    }    

    // init , register local variable , add to the global roomMapping
    pongSocket.on("init", (payload) => {
        console.log(` <== init ,  aka socket-init? payload = `, payload)
       try {

            let {user, roomId} = payload             
            _letUserJoinRoom(pongSocket, io, user ,roomId)
            
        }
        catch (error)
        {
            console.error(`error [${error.code}] ${error.message}`)
            if(error.code && error.code != 400)
                pongSocket.emit('pong-error', error)            
            
        }
    })

    pongSocket.on('pong', ({roomId}) => {
        console.log(` <=== ping-pong`)
        if(roomPing[ roomId])
            roomPing[ roomId ].count ++

    });


    // user-join-room ,  same as init, register local variable , add to the global roomMapping
    pongSocket.on("user-join-room", (payload) => {
        console.log(` <== user-join-room = `, payload)
        try {
            
            let {user, roomId} = payload 
            if(user == null)
                return 

            let leavePreviousRooms = true
            if(leavePreviousRooms)
            {
                for(const room of pongSocket.rooms)
                    pongSocket.leave(room)
            }

            pongSocket.join(roomId)
            _letUserJoinRoom(pongSocket, io, user ,roomId)
            emitRoomList(pongSocket, io)
            
        }
        catch(error)
        {
            console.error(`error [${error.code}] ${error.message}`)
            pongSocket.emit('pong-error', error)
        }
    })

    // user-left-room , remove the roomMapping currently bound to roomId , mappedUser 
    pongSocket.on("user-left-room", payload => {
        console.log(` <== user-left-room = `, payload)
        try {
            
            pongSocket.leave(theRoomId)
            removeUserIdFromRoomMapping( pongSocket , io ,  mappedUser.userId   , theRoomId )
            console.log(`emitting the message i'm leaving` , mappedUser )
            if(theRoomId)
            {
                if(!theRoomId.startsWith('lobby')) 
                    findMatch(theRoomId)
                io.to(theRoomId).emit('user-left-room', { user: mappedUser})

                console.log(` FFF - mappedUser = `, mappedUser)
            }           
            theRoomId = null 

        }
        catch (error)
        {
            if(error.code && error.code != 404)
            {
                console.error(error.message )
                pongSocket.emit('pong-error', error)
            }
            
        }       
    })

    // disconnect , same as user-left-room 
    pongSocket.on("disconnect", () => {
        console.log(` <== disconnected = `)
        try {
            removeUserIdFromRoomMapping( pongSocket, io,  mappedUser.userId   , theRoomId )
            console.log(`emitting the message i'm leaving` , mappedUser )
            if(theRoomId)
            {
                if(!theRoomId.startsWith('lobby')) 
                    findMatch(theRoomId)
                io.to(theRoomId).emit('user-left-room', { user: mappedUser})
            }           
            theRoomId = null 
        }
        catch (error)
        {
            console.error(error.message )
            pongSocket.emit('pong-error', error)
        }       
    })


    pongSocket.on('get-users-in-room', payload => {
        try {
            const theMatch = findMatch(payload?.roomId)
            getUsersInTheRoom(theMatch.roomId)
        }
        catch(error)
        {
            console.error(error.essage)
        }
    })


    // join-match ,  check if the room exists , join such room and emit 'match-status'
    pongSocket.on("join-match", async payload => {
        console.log(` <=== join-match`, payload)
        let theMatch 
        try {
            if(payload?.roomId === undefined)
                throw PongError("Invalid payload - roomId not found", 404)
            if(!payload.user || !payload.user.userId)
                return pongSocket.emit("error", PongError("Unauthorized", 403))
    
            theMatch = findMatch(payload.roomId)
            // pongSocket.join(payload.roomId) moved!
            joinServerRoom(pongSocket, payload.roomId, payload?.user)
            console.log(` NOTE room ${payload.roomId} joined`)
        }
        catch (error)
        {
            console.log(`error [${error.code}] ${error.message}`)
            emitError(pongSocket, io , error)
        }
        
        console.log('server emit :: match-status')
        pongSocket.emit('match-status', { match: theMatch})
        
    })



    pongSocket.on("move-paddle", payload => {
        try {
            const theMatch = findMatch(payload?.roomId)
            if (theMatch.matchStatus != 'IN_PROGRESS')
                throw PongError(`Invalid match status ${theMatch.matchStatus}`)
            if( payload?.player < 0 || payload.player >= theMatch.players.size )
                throw PongError(`Invalid payload ${payload?.player}`)
            moveThePaddle( pongSocket, io, theMatch.gamePlay , payload )
        }
        catch(error)
        {
            console.error(`error: `, error.message , error.code )
        }

    }) 




    pongSocket.on("start-game", async (payload) => {

          try {
            console.log(" <=== start-game")
            console.log("game being started!")
            const theMatch = findMatch(payload?.roomId)            
            console.log(` theMatch loaded is `, theMatch)
            rooms[ theMatch.roomId] = theMatch
            if(!validateMatch(pongSocket, io, theMatch ))
                return 
            console.log(` ================= BEFORE initializeThisMatch(theMatch)`)
            
            initializeThisMatch(theMatch)

            console.log("Done initialize match")
            
            if(theMatch.matchStatus == 'IN_PROGRESS' && theMatch.matchStartsAt != null )
            {
                throw PongError(`Invalid match state - ${theMatch.matchStatus}`)
            }

            let registerWithMicroservice = true 
            if(theMatch.playersRequired == 4 || theMatch.classicMode)
                registerWithMicroservice = false 

            if(registerWithMicroservice && !theMatch.id)
            {                    
                console.log(' CCC - YOU ARE NOT SUPPOSED TO SEE ME ')
                console.log(` CCC - theMatch.id = ` , theMatch?.id)
                const msResult = await msRequestCreateGame( theMatch , { userId: theMatch.hostPlayer}  )
                console.log(` msResult = ${msResult}`)
                if(!msResult)
                    throw PongError("Cannot create Pong game record on game service", 400)
            }
            else 
            {
                console.log("!!!!!!!!!!!!!!! NEED CHECK , SKIPPING registerWithMicroserve ")
            }
    

                

            
            io.to(theMatch.roomId).emit("match-start-ok", {})            
            io.to(theMatch.roomId).emit("match-status", { match : theMatch})            
            io.to( theMatch.roomId).emit('game-data', theMatch.gamePlay )
            

            console.log(`=====================`)
            console.log(`theGamePlay` , JSON.parse(  (JSON.stringify(theMatch.gamePlay.paddles))))
            console.log(`=====================`)
            io.to(theMatch.roomId).emit("countdown", { cd:3 , message:"GO!"})            
            theMatch.gamePlay.gameIsPaused = true 
            startMatch(pongSocket, io, theMatch)                
            setTimeout( () => {
                theMatch.gamePlay.gameIsPaused = false
                // 2025-05-29 add extra emission so the gameIsPaused flag will be properly set
                io.to(theMatch.roomId).emit("match-status", { match : theMatch})
            }, 5000)
                
                        

          }
          catch (error)
          {
            if(error.message == "EXIT")
                throw error 
            pongSocket.emit('pong-error', error)
            console.log(`error:` , error.message)
          }

    })

    pongSocket.on("match-info", payload => {
        try {
            console.log("match info")
            const theMatch = findMatch(payload?.roomId)

            pongSocket.emit('match-info', theMatch)

        }
        catch (error)
        {
          console.log(`error:` , error.message)
        }
    })

    // pongSocket.on("re-start-game", payload => {

    //     try {
    //         console.log("game being re-started!")
    //         const theMatch = initializeMatch(pongSocket, io)
    //         rooms[ theMatch.roomId] = theMatch

    //         if(theMatch.matchStatus == 'IN_PROGRESS')
    //             return 
    //         validateMatch(pongSocket, io, theMatch )
    //         startMatch(pongSocket, io, theMatch)            

    //     }
    //     catch (error)
    //     {
    //       console.log(`error:` , error.message)
    //     }
    // })


    pongSocket.on("pause-game", payload => {
        try {
            console.log("game being paused!")
            const theMatch = findMatch(payload?.roomId)
            console.log(theMatch.gamePlay.gameIsPaused)
            theMatch.gamePlay.gameIsPaused = !theMatch.gamePlay.gameIsPaused

          }
          catch (error)
          {
            console.log(`error:` , error.message)
          }
    })


    pongSocket.on('forfeit', payload => {

        try {
            console.log(" <=== forfeit" , payload)
            if(!payload.roomId)
                throw PongError("Invalid payload - roomId is required", 400)
            if(!payload.userId)
                throw PongError("Invalid payload - userId is required", 400)

            const theMatch = findMatch(payload.roomId)
            if(theMatch.matchStatus != 'IN_PROGRESS')
                throw PongError("Invalid match status ", 400)

            let loserIndex = null 
            theMatch.players.forEach( (player,index) => {
                if(player && player.userId == payload.userId)
                    loserIndex = index
            })

            if(loserIndex == null )
                throw PongError(`Invalid payload - unknown player ${payload.userId}`)

            loserIndex %= 2
            console.log(` finally loserIndex = ${loserIndex}`)
            theMatch.score[loserIndex] = 0
            theMatch.matchStatus = 'OVER'
            theMatch.winnerSide = loserIndex == 0 ? 1 : 0 

            theMatch.matchEndsAt = Date.now()
            theMatch.resignedBy =  loserIndex
            io.to(theMatch.roomId).emit('match-status', { match: theMatch  })                        
            if(isRatedGame(theMatch))
                msRequestUpdateMatchResult(theMatch)


            // Thuesday Fix - forfeit should check for the rest as well 
            if(theMatch.tournamentId)
            {
                console.log(`  THUU_DEBUG = trying to call msRequestStoreInBlockchain() `)                
                msRequestStoreInBlockchain(theMatch)
                console.log(` EEE === broadcastCustom('updateTournament') `)
                broadcastCustom('updateTournament')    
                console.log(` END === broadcastCustom('updateTournament') `)
            }
            else
                console.log(" EEE - Is not a tournament match ")
            
            

            console.log(" BBB - THE MATCH IS OVER , CHECK IF TOURNAMENT THEN fire-and-forget it")
            if(theMatch.tournamentId)
            {
                
                checkAndMarkTournamentAsStarted().catch(err =>  {
                    console.log(" BBB - ERROR CAUGHT AS , " , err.message)
                })
            }
            

        }
        catch (error) 
        {
            pongSocket.emit('pong-error', error)
            console.error(`error:` , error.message)
        }

    })


    pongSocket.on('leave-room', payload => {
        console.log(` <=== leave-room `, payload )
        leaveServerRoom(pongSocket, payload?.roomId)
    })


    pongSocket.on('create-room', async payload => {        
        try {

            console.log(` <=== create-room`)
            console.log(payload)
            if(!payload.user)
                throw PongError("Invalid payload - user expected", 400)

            

            const theMatch = newMatch(payload.user )
            theMatch.hostPlayer = payload?.userId 

            let registerWithMicroservice = true 


            if(payload?.players && payload.players == "4")
            {
                theMatch.playersRequired = 4 
                registerWithMicroservice = false
            }

            if(payload?.classic )
            {
                theMatch.classicMode = true 
                registerWithMicroservice = false
            }

            if(payload?.baf )
                theMatch.baf = true 


            // MOVE msRequestCreateGame toi start-game
            //  console.log(`!!!!! registerWithMicroservice = ${registerWithMicroservice}`)

            // if(registerWithMicroservice)
            // {
            //     console.log("!!!!!!!!!!!!!!! NEED CHECK , DOING registerWithMicroserve ")                
            //     const msResult = await msRequestCreateGame( theMatch ,payload.user  )
            //     console.log(` msResult = ${msResult}`)
            //     if(!msResult)
            //         throw PongError("Cannot create Pong game record on game service", 400)
            // }
            // else 
            // {
            //     console.log("!!!!!!!!!!!!!!! NEED CHECK , SKIPPING registerWithMicroserve ")
            // }

            // console.log(payload?.user )
            // console.log(`finally, generated` , theMatch)
            addMatchToRooms(theMatch)
            pongSocket.emit('room-created', { roomId: theMatch.roomId})
            
            joinServerRoom(pongSocket, theMatch.roomId , payload.user)
            pongSocket.leave("lobby")
            emitRoomList(pongSocket, io )



        }
        catch (error) 
        {
            pongSocket.emit('pong-error', error)
            console.error(`error:` , error.message)
        }
    })



    pongSocket.on('special' , payload => {
         try {
            console.log(' <== special ')
            const theMatch = findMatch(payload?.roomId)
            if(theMatch?.matchStatus != 'IN_PROGRESS')
                throw PongError(`Invalid match state ${theMatch.matchStatus}`)
            if(payload?.player === undefined)
                throw PongError('Invalid controller', payload?.player)
            
            // theMatch , paddleNo , specialId
            handleSpecial(theMatch, payload.player , payload?.special)
            
          }
          catch (error)
          {
            console.error(`error:` , error.message)            
          }
    })





 
    // lobby events
    pongSocket.on('join-lobby', payload => {        
        console.error(' **** join-lobby TEMPORARY DISABLED')
        console.log(roomMapping)
        return 
        if(!payload.user || !payload.user.userId)
            return pongSocket.emit("error", PongError("Unauthorized", 403))
        console.log(`.......... [SOCKET EVENT] someone ${pongSocket.id} has joined the lobby` )
        joinServerRoom(pongSocket, 'lobby', payload?.user)
        if(!pongSocket.rooms.has('lobby'))
        {
            // pongSocket.join("lobby")
            joinServerRoom(pongSocket, "lobby", user)
        }
        addUserToLobby(payload?.user) 
    })



    pongSocket.on('join-game-library', async (payload) => {
        console.log(` <== join-game-library`)

        pongSocket.join('/gamelibrary')

       
        const theTour = await getActiveTournament()
        io.to('/gamelibrary').emit('current-tournament', {
            tournament: theTour
        })


    })

    pongSocket.on('new-tournament', async (_) => {
        
        await resetLastTournament()
        setupServerSchedules()
    })


    pongSocket.on('room-list', async payload => {
        console.log('<===  room-list CHECKING EVENT?')
        emitRoomList(pongSocket, io)
    })

    // create-tournament => debug only needs to be remove
    pongSocket.on('create-tournament', async (payload) => {
        await msRequestCreateTournament("Test Tournament ")
        const theTour = await getActiveTournament()
        io.to('/gamelibrary').emit('current-tournament', {
            tournament: theTour
        })
    })    
    
    pongSocket.on('join-tournament', async (payload) => {

        try {
            if(!payload.tournamentId)
                throw PongError("Invalid payload - tournamentId expected", 400)
            if(!payload.userId)
                throw PongError("Invalid payload - userId expected", 400)
    
            await msRequestJoinTournament(payload.tournamentId, payload.userId)    
            const theTour = await getActiveTournament()
            io.to('/gamelibrary').emit('current-tournament', {
                tournament: theTour
            })
        }
        catch (error)
        {
            pongSocket.emit('error', error)
            console.error(`error:` , error.message)
        }


    })

    

    // room events
    
    pongSocket.on('get-players-in-room', async payload => {
        let theMatch = null 
        try 
        {
            

            console.log(` ---- roomMapping  ------` )
            console.log(roomMapping)

            console.log(` <=== get-players-in-room  `, payload)
            if(payload.roomId == 'lobby')
                return ;
            theMatch = findMatch(payload?.roomId)

            console.log(` *** roomMapping = `, roomMapping )
            const usersInRoom = getDistinctUsersInRoom (payload.roomId)


            console.log( `??? DISTINCT user in room?`, { users : usersInRoom })
            
            io.to(theMatch.roomId).emit('players-in-room', { users : usersInRoom , match : theMatch})  
            
        }
        catch(error)
        {
            if(theMatch && theMatch.roomId)
                io.to(theMatch.roomId).emit('players-in-room', { users : [] , match : null})  
            
        }
    })
    

    pongSocket.on('set-room-mode', payload => {
        // roomId , mode , value 
        console.log(` <=== set-room-mode `, payload)
        try {
            const theMatch = findMatch(payload?.roomId)

            if(theMatch.matchStatus != 'CREATED')
                throw PongError(`Invalid match status ${theMatch.matchStatus}`, 400)



            switch( payload?.mode)
            {
                case 'unseat-player'        :
                                                if (!payload.value || payload.value < 0)
                                                    throw PongError('Invalid payload - player is required')
                                                
                                                let foundSome = false 
                                                theMatch.players.forEach( (player,index) => {

                                                    if(player && player.userId == payload.value)
                                                    {
                                                        foundSome = true 
                                                        theMatch.players[ index ] = null 
                                                    }
                                                })
                                                if(!foundSome && false)
                                                    throw PongError(`User not found in the match`)


                                                break

                case 'player'               :
                                                // payload.value.pos = position
                                                // payload.value.value = userId
                                                if( payload?.value?.pos < 0 )
                                                    throw PongError(`invalid payload - pos ${payload?.value?.pos}`) 
                                                if( payload?.value?.value <= 0)
                                                    throw PongError(`invalid payload - value ${payload?.value?.value}`) 
                                                if(!payload?.user)
                                                    throw PongError("Invalid payload - user is requried")

                                                // overwriting Human Player with AI player 
                                                let thePlayer  = payload.user 
                                                if( isAIPlayer(payload?.value?.value) )
                                                {   
                                                    console.log(` #### payload.value.value =` , payload?.value?.value)
                                                    // thePlayer = newAIPlayer( {}, Math.abs(payload.value.value) )
                                                    // thePlayer = newAIPlayer( {}, getAILevel(payload.value.value) )
                                                    const theAiPlayer = getAIPlayer(payload.value.value)
                                                    if(!theAiPlayer)
                                                        throw PongError (` Invalid payload - unknown AI player ${payload.value.value}`, 400)
                                                    thePlayer = newAIPlayer( theAiPlayer , theAiPlayer.aiLevel  )
                                                }
                                                else
                                                {
                                                    const theId = payload.value.value 
                                                    theMatch.players.forEach( player => {
                                                        console.log(`player XXX = `, player)
                                                        if( player?.userId == theId )
                                                            thePlayer = player 
                                                    })
                                                    
                                                    if(thePlayer == null)
                                                        throw PongError(`Invalid payload - user ${theId} not found` , 404)
                                                }
                                                

                                                // console.log(' seems OK here')
                                                // theMatch.players[ payload?.value?.pos ] = payload?.value?.value 
                                                setMatchPlayerAtPosition( theMatch, thePlayer , payload?.value?.pos)
                                                break  

                case 'match-settings-type'  :
                                               if( ["FirstTo5", "FirstTo10" , "3Minute", "5Minute"].includes(payload?.value))
                                               {
                                                    console.log(' seems OK here #1')
                                                    theMatch.matchSettings.type = payload.value 
                                                    break  
                                               }
                                               throw PongError(`Invalid payload match-settings-type - ${payload?.value}`)
                case 'players-required'  :
                                                if( payload?.value == '2' || payload?.value == '4')
                                                {
                                                     console.log(' seems OK here 2')
                                                     setMatchPlayersRequired(theMatch, parseInt(payload.value))
                                                     break  

                                                }
                                                throw PongError(`Invalid payload players-required - ${payload?.value}`)
 


                default                     :  throw PongError(`Invalid payload mode - ${payload?.mode}`)
            }

            io.to(theMatch.roomId).emit('room-status', {
                match:theMatch,
                socketUsers: [] 
            })
            io.to('lobby').emit('update-room', {"roomId" : theMatch.roomId, match:theMatch} )

        }
        catch (error)
        {
            console.error(`error [${error?.code}] : ${error.message}`)
            pongSocket.emit('pong-error', error)
        }

    })

}
// end socketEvent handler =============================================






export default pong42Handler 

export { pong42Handler , getDistinctUsersInRoom , removeRoomMapping }