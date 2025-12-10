// import * as BABYLON from "@babylonjs/core";
import { navigateTo } from "./route.js";
import { pongSocketService } from "./services.js";
import { getRoomId } from "./util.js";
import { type IPongRoom , type IPongRoomsPayload , type IPongRoomPayload , type IPongUserPayload , type IPongGamePlay, type IPongSpecialEffect, PongError, IPongError, IPongMatchPayload} from "./models/PongRoom.js";
import { reloadRoomList, updateRoom } from "./pongLobby.js";
import { cleanupClientRoom, newGuestBadge, removeGuestBadge, setGamePlay } from "./pongRoomUi.js";
import createCountdownOverlay from "./pongCountdownOverlay.js";
import activateSpecial  from './pongClientSpecial'
import { ModalButton, showNotification } from "./manage.js";
import { translateWord } from "./translate.js";

let pongSocketLobbyHandled = false 
let pongSocketRoomHandled = false 


const pongSocket = pongSocketService.getSocket()

pongSocket.on("connect" , async () => {
   
})



let sharedSocketHandlerWasLoaded = false 

export const sharedSocketHandler = (pongSocket:any) => {

    // if(sharedSocketHandlerWasLoaded)
    //     return 
    console.log(` TUE_DEBUG - sharedSocketHandler() was loaded`)

    pongSocket.off('user-join-room')
    pongSocket.on('user-join-room', (payload:IPongUserPayload) => {
        console.log(` <=== TUE_DEBUG user-join-room` , payload)
        const roomId = getRoomId()
        if( roomId != 'lobby')
            newGuestBadge(payload.user)
        if(roomId)
        {
            console.log(` TUE_DEBUG - ponging`)
            pongSocket.emit('pong', { roomId })
        }
        else 
        {
            console.log(` TUE_DEBUG - the roomId was empty somewhat`)
        }
     })

    pongSocket.off('pong-error')
    pongSocket.on('pong-error', (payload:any) => {
        console.log(` <=== pong-error` , payload )
        
        showNotification(
            translateWord( payload?.message) 
            , [
                {
                   text: "OK", 
                   onClick : async () => {
                    await navigateTo('/pongLobby')
                   }  ,
                   datatsl : "OK" 
                }
            ] 
            , 
            'error' 
        )
     })

 
     pongSocket.off('user-left-room')
     pongSocket.on('user-left-room', (payload:IPongUserPayload) => {
         console.log(` <=== user-left-room` , payload)         
         removeGuestBadge( payload.user )
     })
     
     sharedSocketHandlerWasLoaded = true 
}




export const pongLobbyEventHandlers = () => {
    console.log(` pongLobbyEventHandlers being loaded`)
    if(pongSocketLobbyHandled)
        return 

    console.log(` I MEAN REALLY REALLY LOAD`)

    pongSocket.off('room-created')
    pongSocket.on('room-created', (payload:IPongRoomPayload) => {
        console.log(` <=== room-created`, payload)
        navigateTo(`/pong/${payload?.roomId}` )        
    })

    // generate the whole list of room
    pongSocket.off('room-list')
    pongSocket.on('room-list', (payload:IPongRoomsPayload) => {
        console.log(` <=== room-list`, payload)
        reloadRoomList(payload.rooms)
    })

    pongSocket.off('ping')
    pongSocket.on('ping', () => {
        console.log(` <=== ping`)
        pongSocket.emit('pong', { roomId: getRoomId() } )
    })


    // update single room status, if there's no such room , create new one  
    pongSocket.off('update-room')
    pongSocket.on('update-room', (payload:IPongMatchPayload) => {
        console.log(` <=== update-room` , payload)
        updateRoom( payload?.roomId ?? "", payload?.match) 
        
    })

    // send player to the room
    pongSocket.off('to-room')
    pongSocket.on('to-room', (payload:IPongRoomPayload) => {
        console.log(` <=== to-room `, payload)
        navigateTo(`/pong/${payload?.roomId}` )        
    })


    pongSocketLobbyHandled = true 
}

export const pongRoomEventHandlers = () => {

    // if(pongSocketRoomHandled)
    //     return 
    console.log("TUE_DEBUG just me?")
    const btnCopyToClipboard = document.getElementById(
        "btnCopyToClipboard"
      ) as HTMLInputElement;
      if (btnCopyToClipboard && !btnCopyToClipboard.getAttribute("listened")) {
        console.log("TUE_DEBUG copy to clipboard?")
        btnCopyToClipboard.addEventListener('click', () => {
          navigator.clipboard.writeText(window.location.href)
            .then(() => {
                console.log('URL copied to clipboard:', window.location.href)
            })
            .catch(err => {
              console.error('Failed to copy URL:', err)
            })
        })
        btnCopyToClipboard.setAttribute("listened", "1")
      }


    document
      .querySelectorAll(".back-to-library").forEach( theDom => {
         console.log(` BACK CREATED `)
         console.log(theDom.getAttribute('listened'))

         if(!theDom.getAttribute('listened'))
         {
          console.log(` BACK CREATED XXXX `)
          theDom.addEventListener('click', () => {
            console.log(" GOT ME ")
            navigateTo('/gameLibrary')        
          })
          theDom.setAttribute('listened', '1')
         }
         
      })

    pongSocket.off('game-data')
    pongSocket.on('game-data', (payload:IPongGamePlay) => {
        // console.log(" >>> Payload here" , payload)
        setGamePlay(payload)
    })

    pongSocket.off('countdown')
    pongSocket.on('countdown', (payload:any) => {
        console.log(` <== countdown `)        
        createCountdownOverlay('canvasContainer', payload?.cd , payload.message )    
    })  

    


    // needs to check after this line!
    pongSocket.off('disconnect')
    pongSocket.on("disconnect" , (payload:any) => {
        console.warn("Disconnected from the server")

        cleanupClientRoom(getRoomId(), false)
    })

    pongSocket.off('special-effect')
    pongSocket.on("special-effect", (payload:IPongSpecialEffect) => {
        try {
              console.log(' <== special-effect - 88888', payload)
              if(!payload.match)                
                throw PongError("Invalid payload - match expected", 400)
              
              const targetPowerDiv = document.getElementById(`specialPlayer${payload?.usedBy + 1}`)
              if(targetPowerDiv)
              {
                 console.error(`specialPlayer${payload?.usedBy + 1} is there`)
                 targetPowerDiv.style.display = 'none'
                 targetPowerDiv.innerHTML = ''
              }
                 
              else 
                 console.error(`specialPlayer${payload?.usedBy + 1} NOT EXISTS`)
                 activateSpecial(payload.match, payload.usedBy, payload.special, payload.effectedTeam )
            }
            catch(error:any)
            {
              
              showNotification( error.message, 
                [
                    {
                        text : 'OK',                        
                    } as ModalButton 
                ], 
                'txtError'
              ) 
              console.error(error.message)
            }
          })
        
        
    
    
    
   
    pongSocketRoomHandled = true 
}







