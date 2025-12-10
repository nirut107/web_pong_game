const specialMinitalk = () => {
    return {
        name : 'Mini Talk', 
        id: 'minitalk', 
    }
}

const specialFractol = () => {
    return {
        name : 'Fract-ol' ,
        id: 'fractol',  

    }
}

const specialSolong = () => {
    return {
        name : 'So Long' ,
        id: 'solong',  
    }
}
const specialFtirc = () => {
    return {
        name : 'Ft_irc' ,
        id: 'ftirc',  
    }
}


const randomSpecial = () => {
    // intentionally make fractol the least possible, 
    const specials = [        
        specialMinitalk(), 
        specialMinitalk(), 
        specialSolong() ,
        specialSolong() ,
        specialFtirc(), 
        specialFtirc(), 
        specialFractol(),
    ]
    const randValue = Math.floor(Math.random() * specials.length)
    return specials[ randValue ]
}


export {
    specialMinitalk ,
    specialFractol , 
    specialSolong , 
    randomSpecial, 
}

export default randomSpecial 