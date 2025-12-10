import GAME_CONSTANTS from "./constants.js"


const rooms = {} 


const lobbyUsers = {}
const serverRooms = {}


const socketList = {}
const userList = {}



// const _getDistinctUsersInRoom = (io, roomId) => {
//     const socketIds = io.sockets.adapter.rooms.get(roomId);
//     // const userIds = new Set();
//     const userList = {} 
//     if (socketIds) {
//         for (const socketId of socketIds) {
//             const info = socketList[socketId];
//             if (info) 
//             {
//                 if(userList[ info.user.userId ])
//                     continue 
//                 userList [ info.user.userId ] =info.user 
//             }                
//         }
//     }
//     return Object.values(userList)
// }




const dumpUserList = () => {
    console.log(` *** dumpUserList = `)
    Object.keys(userList).forEach( key => {
        const roomList = Array.from(userList[ key ] .rooms)
        const socketList = Array.from(userList[ key ] .sockets)
        console.log(`          - user #${key} => [${socketList.join(", ")}] in rooms [${roomList.join(", ")}]`)        
    }) 
    console.log(` *** dumpSocketList = `)
    Object.keys(socketList).forEach( key => {
        
        console.log(`          - socket #${key} => #${socketList[key].userId} in ${socketList[key].currentRoom}`)
    }) 
}


const registerSocketListWithUser = (pongSocket, user) => {
    socketList[ pongSocket.id] = { 
        user: user, 
        userId: user.userId, 
        currentRoom: null 
    }
    if( !userList[ user.userId] )
    {
        userList[ user.userId] = {
            user: user, 
            userId: user.userId, 
            sockets: new Set(),
            rooms: new Set()
        }   
    }
    userList[ user.userId ].sockets.add( pongSocket.id )

    console.log(`registerSocketListWithUser === ${user.userId}`)
    dumpUserList() 

    
}

const removeSocketFromSocketList = (socketId) => {

    const socketInfo = socketList[ socketId ]
    if(!socketInfo)
        return 
    if(userList[ socketInfo?.userId ])
    {
        console.log(userList[ socketInfo?.userId ])
        userList[ socketInfo?.userId ].sockets?.delete( socketId )
    }
        
    if( userList[ socketInfo?.userId ].sockets.size === 0)
        delete userList[ socketInfo?.userId ]
    delete socketList[ socketId ]
}

const getUserFromSocketId = (socketId) => {
    if( socketList[ socketId ])
        return socketList[ socketId ].user 
    return null 
} 



const getLobbyUserkey = (userId) => {
    return `u${userId}`
}


const addUserToLobby = (user) =>
{
    const theKey = getLobbyUserkey(user.userId)
    lobbyUsers[ theKey ] = user 
    return theKey      
}
    
const removeUserFromLobby = (userId) => {

    const theKey = getLobbyUserkey(userId)
    delete lobbyUsers[ theKey ]
}


const joinServerRoom = (pongSocket, roomId , user) => {

    console.log(` <== joinServerRoom() `, pongSocket.id, roomId , user)
    pongSocket.join(roomId)
    if( !serverRooms[ roomId ])
        serverRooms [ roomId ] = {}
    const theRoom = serverRooms [ roomId ]

    if(!user)
    {
        console.error(`user object not found, simply return?`, 400)
        return false 
    }
    
    const userKey = getLobbyUserkey(user.userId) 
    if(theRoom[ userKey ] != undefined)
    {
        if(theRoom[ userKey ].socketId != pongSocket.id)
            theRoom[ userKey ].socketId = pongSocket.id
        theRoom[ userKey ].timestamp = Date.now() 
    }
    else 
    {
        theRoom[ userKey ] = {
            user: user , 
            socketId : pongSocket.id ,
            timestamp: Date.now() , 
        }
    }
    console.log(`**** all_users_in_rooms =`, JSON.parse(JSON.stringify(serverRooms)))
}


const leaveServerRoom = (pongSocket, roomId ) => {

    if(!GAME_CONSTANTS.PONG_DELETE_ROOM_ON_SOCKET_EVENT)
        return 

    console.log(" ### LEAVE SERVER ROOM", pongSocket.id,  roomId )

    if(!serverRooms[roomId])
        return 
    let theRoom = serverRooms[roomId]
    
    for ( const [ key, checkingUser] of Object.entries(theRoom))
    {
        if( checkingUser.socketId == pongSocket.id)
        {
            delete theRoom[ key ]
            if (Object.keys(theRoom).length == 0 && roomId != 'lobby') 
            {

                console.log(`All the sockets have left the room ${key}, cleaning up here`)
                delete serverRooms[roomId]
            }
                
            return true 
        }
    }
    return false 
}

export { 
    rooms, 
    lobbyUsers, 
    addUserToLobby, 
    removeUserFromLobby, 
    joinServerRoom, 
    leaveServerRoom,
    registerSocketListWithUser,
    removeSocketFromSocketList,
    getUserFromSocketId,
    socketList ,    
}
export default rooms 