
const emitError = (socket, io , error, emitMode='socket') => {
    if(emitMode == 'io')
        return io.emit('pong-error', error)
    socket.emit('pong-error', error)
}


export default emitError 