const serverEmitMatchStatus = (socket, io , theMatch) => {

    io.to(theMatch.roomId).emit('match-data', {match: theMatch })

}

export { serverEmitMatchStatus }