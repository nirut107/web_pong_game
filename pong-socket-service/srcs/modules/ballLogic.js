const randomBallDirection = () => {
    // const degreeToRad = (degree) => degree * (Math.PI / 180)
    // const randDegree = Math.random() * 90 - 45
    // const randRad = degreeToRad(randDegree)
    // return {
    //     x:-0.3 ,
    //     z:-0.3 ,
    // }
    // return {
    //     x :  Math.sin(randRad),
    //     z :  Math.cos(randRad) * (Math.random() > 0.5 ? 1: -1)
    // }
    const angleRanges = [
        [30, 60],
        [120, 150],
        [210, 240],
        [300, 330],
      ]
    
      const range = angleRanges[Math.floor(Math.random() * angleRanges.length)]
      const degree = Math.random() * (range[1] - range[0]) + range[0]
      const radian = degree * (Math.PI / 180);

    return {
       x: Math.sin(radian) , 
       z: Math.cos(radian) , 
    }
}

const applyBounceVariant = (ballDirection , maxDegree = 0.1) => {

    const applyValue = (Math.random() * 2 - 1) * maxDegree
    ballDirection.x += applyValue
    return applyValue  

}

export {
    randomBallDirection, 
    applyBounceVariant
}


export default randomBallDirection 