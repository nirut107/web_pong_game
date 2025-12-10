import GAME_CONSTANTS   from "../constants.js"
import { removeRoomMapping } from "../pong42Handler.js"
import rooms from "../pong42ServerSetup.js"
import { debugDatetime } from "./pongGame.js"

const removeAllRoomWithId = (roomId, confirmDelete=false) => {
    console.log(` GOING TO REMOVE ROOM ${roomId}`)
    if (confirmDelete)
    {
        delete rooms [ roomId ]
        removeRoomMapping( roomId )  
        
        console.log("AFTER DELETING")
        console.log(rooms)
    }
}

const janitor = (io) => {

    
    const toRemoveTimestamp = Date.now() + GAME_CONSTANTS.ROOM_TIMEOUT_IN_SECS
    console.log(`janitor() being called, toRemoveTimestamp = ${debugDatetime(toRemoveTimestamp)}`)
    let changes = 0 
    Object.keys(rooms).forEach(roomId => {
        const theRoom = rooms[ roomId ]


        if (theRoom.matchStatus == 'OVER' && theRoom.matchEndsAt > toRemoveTimestamp )
            return removeAllRoomWithId( roomId )

        if (theRoom.matchStatus == 'INIT' ||  theRoom.matchStatus == 'CREATED')
        {
            // tournament will be removed when finish only 

            console.log(` theRoom createdAt = ` , debugDatetime(theRoom.createdAt))
            if(theRoom.tournamentId != null )
                return
            if(theRoom.sockets.length > 0)
                return  
            if( theRoom.createdAt < toRemoveTimestamp )
            {
                console.log(" triggering here???? ")
                changes++ 
                return removeAllRoomWithId( roomId , true)
            }
                
            console.log(` this room survives janitor task`)
        }
    })

    if(changes != 0)
    {
        const availableRooms = Object.values(rooms).filter(room  =>  {
            return room.matchStatus == 'CREATED' || room.matchStatus == 'INIT'
        })
        io.to('lobby').emit('room-list', {
            rooms: availableRooms
        })
    }

}


let janitorTaskInterval = null 
const janitorSchedule = (io, msInterval) => {

    janitorTaskInterval = setInterval( () => {
        janitor(io )
    }, msInterval)

}

export default janitorSchedule
export { janitorSchedule , janitorTaskInterval} 