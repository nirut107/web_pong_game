import jwt from 'jsonwebtoken'
import GAME_CONSTANTS from "../constants.js"
import PongError from "../models/pongError.js"
import getIS8601ODate, { getNextISODate } from '../modules/helper.js'
import broadcastToRoom from '../modules/gameRuntime.js'
import { broadcastTournament } from '../modules/tournament.js'
import { CronExpressionParser } from 'cron-parser'



const _getAvalancheServiceSocket = () => {
  const avaSocket =  io( GAME_CONSTANTS.AVALANCHE_SERVER , {
    reconnection: false,
    transportOptions: {
        polling: {
            extraHeaders: {        
            }
        }
    },
  })  
  avaSocket.on("connect", () => {
      console.log(` FFF => avaSocket was connected to ${GAME_CONSTANTS.AVALANCHE_SERVER}`)
  })
  avaSocket.on("disconnect", (reason) => {
      console.log(` FFF => avaSocket was disconnected, `, reason)
  })
  avaSocket.on("connect_error", (err) => {
      console.error("Connection error:", err.message)
  })
    
  ava.Socket.on("error", (err) => {
      console.error("General socket error:", err.message)
  })
    


  return avaSocket 
}



const getServerAuthToken = async (userId , username='server', email='server') => {
    //return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUsInVzZXJuYW1lIjoicnVqamkiLCJlbWFpbCI6InJ1ampqaUBqampqaWlpLmNvbSIsImlhdCI6MTc0NzQ1Njc2MSwiZXhwIjoxNzQ3NDYwMzYxfQ.wR8QS-qRvBCtndI7ufUSyu9NJxKgaQmWUF2mIGFQ-GM'   
    const token = jwt.sign(
      {
        userId , 
        username ,
        email ,
      },
      process.env.JWT_SECRET || 'changeme'
    )

    console.log(` the token is ${token}`)
    return token
}


// const _try = async () => {

//     try {
//         const res = await fetch("http://game-service:3000/api/v1/games", {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify({
//             game_type: "pong",
//             position: null,
//             players: 2
//           }),
//         });
//         const game = await res.json();
//         console.log("game", game);
//         return game.id;
//       } catch (error) {
//         console.log(error);
//         if (error.cause) console.log("Underlying error:", error.cause);
//       }
// }


// msRequestCreateGame activate when the start button was being clicked
// this will update theMatch.id ( NOT roomId ) , and join all the participates
// including AI players, the returned response participan_id was not used (but mapped ) though
const msRequestCreateGame = async (theMatch , theUser) => {

    let doMakeRequest = true 
    const endpoint = GAME_CONSTANTS.MS_GAME_ENDPOINT_PREFIX + 'games'
    const joinEndpoint = GAME_CONSTANTS.MS_GAME_ENDPOINT_PREFIX + 'games/:id/join'

    console.log(` <== inside msRequestCreateGame(), endpoint = `, endpoint )
    const method = 'POST'
    const payload = {
        "game_type": "pong",
        "position": null,
        "players": 2
    }

    if(theMatch.tournamentId)
      payload.tournament_id = parseInt(theMatch.tournamentId)

    if(doMakeRequest)
    {
        const authToken = await getServerAuthToken(theUser.userId) 
        
        return await fetch(endpoint, {
            method: method, 
            headers: {
                'Content-type': 'application/json', 
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
        }).then( async response => {
          if(!response.ok)
            {
                let errorObj
                try {
                  errorObj = await response.json()
                }
                catch {
                  errorObj = { error: "Unknown error"}
                }
              throw PongError(errorObj.error, response.status)
            }
          return  response.json()
            
        }).then( async (data) => {


            console.log(" CCC - assigning match id here ")
            console.log(`before -  ${theMatch?.id} , after id - ${data.id}`)

            theMatch.id = data.id
            // now looping through the users
            const registeredPlayers = []
            registeredPlayers.push(theUser.userId)

            theMatch.players.forEach( async (player,index) => {
              if( player == null)
                return 
              if( registeredPlayers.includes(player.userId))
                return   
                
              let thisJoinEndPoint = joinEndpoint.replace(':id', theMatch.id)

              let joinToken = await getServerAuthToken(player.userId)    
              
              fetch( thisJoinEndPoint, {
                method: "POST",
                headers: {
                   'Authorization': `Bearer ${joinToken}` 
                }
              })
              .then( async response => {
                if(!response.ok)
                {
                      let errorObj
                      try {
                        errorObj = await response.json()
                      }
                      catch {
                        errorObj = { error: "Unknown error"}
                      }
                    throw PongError(errorObj.error, response.status)
                }                
                return  response.json()
              })
              .then( async  (data) => {
                // just in case, set the participant_id back to each player 
                // **** BUT the host**** , 
                // since he was joined at the time of room creation
                theMatch.players[ index ].participant_id = data.participant_id
              }) 
            })

            return true 
        }).catch(err => {
            console.error('doMakeRequest: Fetch failed:', err);
            return false 
        })
    }
    else 
    {
        console.log("Use random generated instead")
        theMatch.id = Math.floor( Math.random() * 1000  - 1 )
    }
    return true   
}

// 2025-06-09 
const msRequestUpdateGame = async (theMatch, options) => {
    const endpoint = `${GAME_CONSTANTS.MS_GAME_ENDPOINT_PREFIX}games/${theMatch.id}`
    const method = 'PATCH'

    const payload = options
    const authToken = await getServerAuthToken('server') 
    return await fetch(endpoint, {
      method,
      headers: {
        'Content-type': 'application/json', 
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    }).then(async response => {    
      console.log(` response  = `, response)
      if(!response.ok)
        {
            let errorObj
            try {
              errorObj = await response.json()
            }
            catch {
              errorObj = { error: "Unknown error"}
            }
          throw PongError(errorObj.error, response.status)
        }
  
    }).then( data => {
  
    }).catch(err => {
      console.error('msRequestUpdateGame(): Fetch failed:', err);
      return false 
    })
}



const msRequestStoreInBlockchain = async (theMatch) => {
  console.log(` BLOCKCHAIN_DEBUG - INSIDE msRequestStoreInBlockchain() `)
  console.log(` theMatch`, theMatch)

  try {
    if(!theMatch.tournamentId || !theMatch.tournamentPosition)
    {   // only tournament match counts
        console.log("Premature return?")
        return false 
    }
    //const avaSocket = _getAvalancheServiceSocket()

    const endpoint = `${GAME_CONSTANTS.AVALANCHE_SERVER}submitScore`
    console.log(` BLOCKCHAIN_DEBUG - endpoint = ${endpoint}` )
    const method = 'POST'

    
        const payloadP1 = {
          tournamentId: theMatch.tournamentId, 
          position: theMatch.tournamentPosition,          
        }
        payloadP1.playerId = theMatch.players[0].userId 
        payloadP1.score = theMatch.score[0]
        console.log(`  BLOCKCHAIN_DEBUG - try fetching blockchain #1 with payload`, payloadP1)
        fetch(endpoint, {
          method: method,
          headers: {
            'Content-Type': 'application/json'
          },           
          body: JSON.stringify(payloadP1)
        }).then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} - ${res.statusText}`);
          }
        }).catch(err => {
          console.log(' BLOCKCHAIN_DEBUG => fail fecth#1', err.message)
        })
        

        const payloadP2 = {
          tournamentId: theMatch.tournamentId, 
          position: theMatch.tournamentPosition,          
        }
        payloadP2.playerId = theMatch.players[1].userId 
        payloadP2.score = theMatch.score[1]
        console.log(`  FFF - try fetching blockchain #2 with payload`, payloadP2)
        fetch(endpoint, {
          method: method,
          headers: {
            'Content-Type': 'application/json'
          }, 
          body: JSON.stringify(payloadP2)
        }).then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} - ${res.statusText}`);
          }
        }).catch(err => {
          console.log(' BLOCKCHAIN_DEBUG => fail fecth#2', err.message)
        })

        // extra payload for winner
        
        
        if(theMatch.tournamentPosition == '3L1vs3R1')
        {
          const payloadWinner = {
            tournamentId: theMatch.tournamentId, 
            position: 'WINNER',          
          }          
          payloadWinner.playerId = theMatch.winnerSide == 0 ?  theMatch.players[0].userId : theMatch.players[1].userId
          payloadWinner.score = theMatch.winnerSide == 0 ? theMatch.score[0] : theMatch.score[1]
          console.log(`  FFF - EXTRA , try fetching blockchain with winner payload`, payloadWinner )
          fetch(endpoint, {
            method: method,
            headers: {
              'Content-Type': 'application/json'
            }, 
            body: JSON.stringify(payloadWinner)
          }).then(res => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status} - ${res.statusText}`);
            }
          }).catch(err => {
            console.log(' BLOCKCHAIN_DEBUG => fail fecth#3', err.message)
          })
        }


    
    
  }
  catch (error)
  {
    console.error(` SILENT ERROR while using blockchain service `, error.message)
  }


}

const msRequestUpdateMatchResult = async (theMatch) => {

  const endpoint = `${GAME_CONSTANTS.MS_GAME_ENDPOINT_PREFIX}games/${theMatch.id}`
  const method = 'PATCH'

  let winnerId = null 
  let loserId = null 
  let scoreWinner = 0
  let scoreLoser = 0
  
  if(theMatch.winnerSide == 0)
  { 
      winnerId = theMatch.players[0]?.userId
      loserId = theMatch.players[1]?.userId
      scoreWinner = theMatch.score[0]
      scoreLoser = theMatch.score[1]
  }
  else {
      winnerId = theMatch.players[1]?.userId
      loserId = theMatch.players[0]?.userId
      scoreWinner = theMatch.score[1]
      scoreLoser = theMatch.score[0]

  }
  console.log(` winnerId , loserId = ` , winnerId , loserId)
  if (winnerId === null)
    throw PongError("Fatal Error - cannot find winnerId participate", 500)
  if (loserId === null)
    throw PongError("Fatal Error - cannot find loserId participate", 500)
  


  const payload = {
      "status" : "completed",
      "winner_id" : winnerId,
      "loser_id" : loserId,
      "score_winner" : scoreWinner, 
      "score_loser" : scoreLoser,      
  }

  const parts = []
  theMatch.players.forEach( (player,index) => {
    parts.push({
      "user_id": player?.userId,
      "score": theMatch.score[index],
      "is_winner": theMatch.winnerSide == index 
    })    
  })

  payload.participants = parts
  // endpoint doesn't handle this -_-''
  
  // if(theMatch.matchStartsAt)
  // {
  //   let secs = (theMatch.matchEndsAt??Date.now() - theMatch.matchStartsAt) / 1000
  //   payload.remarks = String(Math.round(secs))
  //   console.log(` remarks was set as ${payload.remarks}`)
  // }
  

  console.log(" FINAL PAYLOAD ===> CHECKME ", payload)
  console.log(" FINAL PAYLOAD ===> endpoint ", endpoint)

  const authToken = await getServerAuthToken('server') 

  return await fetch(endpoint, {
    method,
    headers: {
      'Content-type': 'application/json', 
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(payload)
  }).then(async response => {    
    console.log(` response  = `, response)
    if(!response.ok)
      {
          let errorObj
          try {
            errorObj = await response.json()
          }
          catch {
            errorObj = { error: "Unknown error"}
          }
        throw PongError(errorObj.error, response.status)
      }

  }).then( data => {

  }).catch(err => {
    console.error('msRequestUpdateMatchResult: Fetch failed:', err);
    return false 
  })

}


// server SCHEDULER use
const msRequestCreateTournament = async (name=null , maxParticipants=null, tourStartCronSchedule = null, overwriteSchedule = null) => {
  let nextSchedule 
  if(tourStartCronSchedule == null)
  {
    tourStartCronSchedule = GAME_CONSTANTS.CRONJOB_PONG_TOURNAMENT_START_AT
    
    const interval = CronExpressionParser.parse(tourStartCronSchedule) 
    // nextSchedule = applyTimestampOffset( interval , GAME_CONSTANTS.TOURNAMENT_OFFSET_CREATE_TIME)
    nextSchedule = interval
  }
  else {
    nextSchedule = getNextISODate(tourStartCronSchedule)
  }


  if(overwriteSchedule != null)
  {
    
    nextSchedule = getIS8601ODate(overwriteSchedule)
    console.log(` HHH - NOTE THAT schedule has been overwritted as `, overwriteSchedule)
  }
    
  
  console.log(" inside msRequestCreateTournament() ")
  console.log(" cronSchedule = ", tourStartCronSchedule)
  console.log(" nextSchedule = ", nextSchedule)
  const endpoint = GAME_CONSTANTS.MS_GAME_ENDPOINT_PREFIX + 'tournaments'
  const authToken = await getServerAuthToken('server') 


  const payload = {
    "name" : name?? GAME_CONSTANTS.PONG_TOURNAMENT_DEFAULT_TOUR_NAME ,
    "max_participants" : maxParticipants ?? GAME_CONSTANTS.PONG_TOURNAMENT_DEFAULT_MAX_PARTICIPANTS ,
    "tournament_starts_at" : nextSchedule
  }

  console.log("Endpoint = ", endpoint)
  return await fetch(endpoint, {
    method: "POST",
    headers: {
      'Content-type': 'application/json', 
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(payload)
  }).then(async response => {
    if(!response.ok)
    {
        let errorObj
        try {
          errorObj = await response.json()
        }
        catch {
          errorObj = { error: "Unknown error"}
        }
      throw PongError(errorObj.error, response.status)
    }
    return response.json()

  }).then( data => {
    console.log("Finally get " , data)
    return data 

  }).catch(err => {
    console.error('msRequestCreateTournament: Fetch failed:', err);
    return false 
  })

}

// websocket event
const msRequestJoinTournament = async (tournamentId, userId) => {

  console.log(" inside msRequestJoinTournament() ")
  if(!tournamentId)
    throw PongError("Invalid payload - tournamentId expected", 400)
  if(!userId)
    throw PongError("Invalid payload - userId expected")

  const endpoint = GAME_CONSTANTS.MS_GAME_ENDPOINT_PREFIX + `tournaments/${tournamentId}/join`
  const authToken = await getServerAuthToken(userId) 
  console.log("Endpoint = ", endpoint)
  return await fetch(endpoint, {
    method: "POST",
    headers: {
      'Authorization': `Bearer ${authToken}`
    },    
  }).then( async response => {

    if(!response.ok)
      {
          let errorObj
          try {
            errorObj = await response.json()
          }
          catch {
            errorObj = { error: "Unknown error"}
          }
        throw PongError(errorObj.error, response.status)
      }
    return response.json()

  }).then( data => {
    console.log("Finally get " , data)
    return data

  }).catch(err => {
    console.error('msRequestJoinTournament: Fetch failed:', err);
    throw PongError(err.message, err.code??400)
    return false 
  })

}

// activate game play of the for THE FIRST round 
// server SCHEDULER use
const msRequestStartTournament = async (tournamentId  ) => {

  let endpoint = GAME_CONSTANTS.MS_GAME_ENDPOINT_PREFIX + `tournaments/${tournamentId}/start`
  const authToken = await getServerAuthToken('server') 
  console.log(`endpoint = ${endpoint}`)
  return await fetch(endpoint, {
    method: "POST",
    headers: {
      'Authorization': `Bearer ${authToken}`
    },    
  }).then( async response => {
    if(!response.ok)
    {
        let errorObj
        try {
          errorObj = await response.json()
          console.log(`errorObj returned as `,errorObj)
        }
        catch {
          errorObj = { error: "Unknown error"}
        }
      throw PongError(errorObj.error, response.status)
    }
    return response.json()

  }).then( data => {
    console.log("Finally get " , data)
    return data 

  }).catch(err => {
    // hos not enough participants
    if(err.code == 400 && err.message.startsWith('Tournament needs at least '))
    {
       const theCanceledMsg = `The tournament has not enough participants and has been canceled`
       broadcastTournament(null, theCanceledMsg)
    }
    console.error('msRequestStartTournament: Fetch failed:', err);
    throw err 
  })
}




const msFetchTournaments = async (status =null, limit=20 , offset=0) => {
  // console.log(" inside msFetchTournaments ", status , limit , offset)
  let endpoint = GAME_CONSTANTS.MS_GAME_ENDPOINT_PREFIX + `tournaments`
  console.log(` msFetchTournaments() endpoint = ` , endpoint)
  const qs = []
  if(status)
    qs.push(`status=${encodeURIComponent(status)}`)
  if(limit > 0)
    qs.push(`limit=${encodeURIComponent(limit)}`)
  if(offset > 0)
    qs.push(`offset=${encodeURIComponent(offset)}`)  
  
  if(qs.length)
    endpoint += `?`+ qs.join('&')

//   console.log("Endpoint XXX = ", endpoint)
  return await fetch(endpoint, {
    method: "GET",
    headers: {
      'Content-type': 'application/json', 
    },    
  }).then( async response => {
    if(!response.ok)
      {
          let errorObj
          try {
            errorObj = await response.json()
          }
          catch {
            errorObj = { error: "Unknown error"}
          }
        throw PongError(errorObj.error, response.status)
      }
    return response.json()

  }).then( data => {
   // console.log("Finally get " , data)
    return data 

  }).catch(err => {
    console.error('msFetchTournaments: Fetch failed:', err);
    return false 
  })
}


const msFetchTournament = async (tournamentId) => {
  // console.log(" inside msFetchTournament ")
  if(!tournamentId)
    throw PongError("Invalid payload - expect tournamentId", 400)
  const endpoint = GAME_CONSTANTS.MS_GAME_ENDPOINT_PREFIX + `tournaments/${tournamentId}`
  // console.log("Endpoint = ", endpoint)
  return await fetch(endpoint, {
    method: "GET",
    headers: {
      'Content-type': 'application/json', 
    },    
  }).then( async response => {
    if(!response.ok)
      {
          let errorObj
          try {
            errorObj = await response.json()
          }
          catch {
            errorObj = { error: "Unknown error"}
          }
        throw PongError(errorObj.error, response.status)
      }
    return response.json()

  }).then( data => {
    // console.log("Finally get " , data)
    return data 

  }).catch(err => {
    // console.error('msFetchTournaments: Fetch failed:', err);
    return false 
  })
}

const getActiveTournament = async () => {

  const activeTournaments = await msFetchTournaments(null, 5)
  let activeOne = null
  let theTour  = {} 
  
  try {
    if(!activeTournaments && activeTournaments?.tournament?.length == 0)
        throw PongError("No active tournament for now", 404)
        
    activeTournaments.forEach( theTour => {
        if(!activeOne && (theTour.status != 'completed' && theTour.status != 'canceled'))
            activeOne = theTour 
    })
    console.log(` finally got some active Tournament`)
    if(!activeOne || activeOne?.length == 0)
      throw PongError("No active tournament for now", 404)

    // console.log("Still OK HERE?")

    
    theTour = await msFetchTournament(activeOne.id)
  }
  catch(error)
  {
    console.log("The exception was caught , but what next?", error)
    return [] ; 
  }
  
  return theTour    

}


const msRequestAdvanceRound = async (tournamentId , currentRound = 1) => {

  console.log(" ==> inside msRequestAdvanceRound()")
  try {

    if(!tournamentId)
      throw PongError("Invalid payload - tournamentID expected", 400)

    const endpoint = GAME_CONSTANTS.MS_GAME_ENDPOINT_PREFIX + `tournaments/${tournamentId}/advance-round`
    const method = 'POST'

    const payload = {
      current_round : currentRound 
    }
    const authToken = await getServerAuthToken('server') 

    console.log( " 999 - FETCHING CHECK endpoint = ",endpoint )
    console.log(" 999 method ", method)
    console.log(" 999 payload ", payload)

    return await fetch(endpoint, {
      method: method, 
      headers: {
          'Content-type': 'application/json', 
          'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    }).then( async response => {
      if(!response.ok)
        {
            let errorObj
            try {
              errorObj = await response.json()
            }
            catch {
              errorObj = { error: "Unknown error"}
            }
          throw PongError(errorObj.error, response.status)
        }
      return  response.json()
        
    }).then( async (data) => {
        console.log(` DDD - response for tournaments/${tournamentId}/advance-round`)
        console.log(data)
        return data
    }).catch(err => {
        console.error('doMakeRequest: Fetch failed:', err);
        return false 
    })
    }
    catch(error)
    {
      console.log("Error cuaght as" , error)

    }

}



const msRequestFinalizeTournament = async (tournamentId, winnerPlayerId) => {

  try {

    if(!tournamentId)
      throw PongError("Invalid payload - tournamentID expected", 400)
    if(!winnerPlayerId)
      throw PongError("Invalid payload - winnerPlayerID expected", 400)

    const endpoint = GAME_CONSTANTS.MS_GAME_ENDPOINT_PREFIX + `tournaments/${tournamentId}/complete`
    const method = 'POST'

    const payload = {
      winner_id : winnerPlayerId 
    }
    const authToken = await getServerAuthToken('server') 

    console.log( " DDD - FETCHING CHECK endpoint = ",endpoint )
    console.log(" DDD method ", method)
    console.log(" DDD payload ", payload)

    return await fetch(endpoint, {
      method: method, 
      headers: {
          'Content-type': 'application/json', 
          'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    }).then( async response => {
      if(!response.ok)
        {
            let errorObj
            try {
              errorObj = await response.json()
            }
            catch {
              errorObj = { error: "Unknown error"}
            }
          throw PongError(errorObj.error, response.status)
        }
      return  response.json()
        
    }).then( async (data) => {
      
        console.log(` DDD - response for tournaments/${tournamentId}/complete`)
        console.log(data)
        return data
    }).catch(err => {
        console.error('msRequestFinalizeTournament: Fetch failed:', err);
        return false 
    })
    }
    catch(error)
    {
      console.log("Error cuaght as" , error)

    } 

}

export {
    msRequestCreateGame ,
    msRequestUpdateGame , 
    msRequestUpdateMatchResult , 

    msRequestCreateTournament , 
    msRequestStartTournament , 
    msRequestJoinTournament , 
    msRequestAdvanceRound ,
    msRequestFinalizeTournament , 
    msRequestStoreInBlockchain , 

    msFetchTournaments , 
    msFetchTournament ,
    getActiveTournament ,
    getServerAuthToken  ,
    


} 

export default msRequestCreateGame