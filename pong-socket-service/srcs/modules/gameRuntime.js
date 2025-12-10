
import PongError from '../models/pongError.js'

let ioInstance = null 





const setIo = (expectedIo) => {
    console.log("Set IO is being called")
    ioInstance = expectedIo 
    
    console.log(typeof ioInstance)
}

// const broadcastToRoom = (roomId, event, payload) => 
// {
//   if (!ioInstance) {
//     throw  PongError ("IO not initialized yet", 500)
//   }
//   ioInstance.to(roomId).emit(event, payload)
// }

const broadcastToRoom = (roomId, event, payload) => {
  // console.log(`[broadcastToRoom] called for room: ${roomId}, event: ${event}`);
  // console.log(`[broadcastToRoom] ioInstance type:`, typeof ioInstance);
  // if (!ioInstance) {
  //   console.error("❌ IO not initialized yet when broadcasting to", roomId);
  //   throw PongError("IO not initialized yet", 500);
  // }

  
  ioInstance.to(roomId).emit(event, payload);
};

export  {
    setIo, 
    ioInstance ,
    broadcastToRoom, 
}

export default broadcastToRoom