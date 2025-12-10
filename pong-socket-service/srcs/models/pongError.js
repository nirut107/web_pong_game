const PongError = (message, code ) => {
    const theError = {}
    theError.message = message 
    theError.code = code 
    return theError 
}

const PongFatalError = (message, code ) => {
    const theError = PongError(message, code) 
    theError.fatal = true 
    return theError 
}

export { PongError , PongFatalError }
export default PongError 