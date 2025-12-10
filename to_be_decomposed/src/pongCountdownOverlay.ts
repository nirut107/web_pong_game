import { IPongRoom } from "./models/PongRoom"
import { formatSeconds } from "./util"


const secsToCheck = 3;

let cdCallback : ReturnType<typeof setTimeout> | null  = null 
let cdMatchStartCallback: ReturnType<typeof setTimeout> | null  = null 


const setMatchCoutdownInterval = (matchStartsAt:number , targetDivId:string, targetModal:string) => {
  let secsToStart = (matchStartsAt - Date.now())/ 1000   
  if(secsToStart < secsToCheck)
  {
      console.log(" CLOSING COUNTDOWN OVERLAY at matchStartsAt , secsToStart", matchStartsAt , secsToStart)
      let modal = document.getElementById(targetModal)
      if(modal)
          modal.style.display = 'none'
      if(cdMatchStartCallback)
        clearInterval(cdMatchStartCallback)   
      return  
  }  
  const target =  document.getElementById(targetDivId)
  if(target)
      target.textContent = formatSeconds( secsToStart )  
}


const checkMatchStartCountdown = (theMatch:IPongRoom , targetDivId:string ='divMatchStartsIn', targetModal:string='divMatchIsYetToStart') => {

  console.log(" 999 - checkMatchStartCountdown() is being called")

  const targetDom = document.getElementById(targetModal)
  if(!targetDom)
    return 
  targetDom.style.display = 'none'

  if(!theMatch || !theMatch.matchStartsAt)
    return 

  

  console.log(` theMatch is here `, theMatch.matchStatus)

  if(theMatch.matchStatus == 'CREATED' || theMatch.matchStatus == 'INITED')
    console.log(theMatch.matchStatus) 
  else   
    return 
  console.log("REACH HERE????")

  let secsToStart = (theMatch.matchStartsAt - Date.now())/ 1000
  

  if(secsToStart < secsToCheck)
    return // let the websocket handle the rest

  targetDom.style.display = 'flex'
  console.log(" GOING TO SET THE COUNTDOWN INTERVAL BEFORE MATCH")
  console.log(theMatch.matchStartsAt , Date.now() , targetDivId , targetModal )
  console.log(` YET TO START? ` , theMatch.matchStartsAt >  Date.now())
  setMatchCoutdownInterval(theMatch.matchStartsAt , targetDivId, targetModal)

  const target =  document.getElementById(targetDivId)
  if(target)
  {
    // target.textContent = formatSeconds( secsToStart )    
    console.log("setInterval was being called XXXX")
    cdMatchStartCallback = setInterval( () => {
      setMatchCoutdownInterval(theMatch.matchStartsAt , targetDivId, targetModal)
    }, 1000)
  }
}


const createCountdownOverlay = (overlayElementId='mainCanvas' , cdStartFrom=3 ,zeroText ='GO' ) => {
    console.log(" COUNTDOWN OVARELAY BEING CALLED")
  
    const targetElement = document.getElementById(overlayElementId)
    if(!targetElement)
    { 
      console.error("Target Overlay not found")
      return 
    }
      
  
    const overlayContainer = document.createElement('div')
    overlayContainer.id = 'countdown-overlay'
    overlayContainer.classList.add('countdownOverlay')
    
    const countdownNumber = document.createElement('div')
    countdownNumber.id = 'countdown-number' 
    countdownNumber.classList.add('countdownText')
  
    overlayContainer.appendChild(countdownNumber) 
  
    ///const canvasRect = targetElement.getBoundingClientRect()
    const canvasParent = targetElement.parentElement
  
  
    if (canvasParent) {
      canvasParent.style.position = 'relative' 
      canvasParent.insertBefore(overlayContainer, targetElement.nextSibling) 
      
    } else {
      document.body.appendChild(overlayContainer) 
      
      
    }
  
    
    targetElement.style.position = 'relative' 
    targetElement.appendChild(overlayContainer)
    
    
    let count = cdStartFrom 

    let countdownCallbacks: any[] = [] 
    
    
    const updateCountdown = () => {
      // Display current count
      
      countdownNumber.style.transform = 'scale(0.5)'
      countdownNumber.style.opacity = '1'
      
      // If not at zero yet, continue countdown
      if (count > 0) {
        // Start animation after a short delay
        cdCallback = setTimeout(() => {
          countdownNumber.style.transform = 'scale(1)'
          
          countdownNumber.style.opacity = '0'
        }, 500)
        countdownCallbacks.push(cdCallback)
        
        // Decrement counter
        cdCallback = setTimeout(() => {
          
          
          updateCountdown()
  
          
          countdownNumber.textContent = String(count)
          
          if(count == 0 && zeroText)
              countdownNumber.textContent = zeroText 
          count--
          
        }, 1000)
        countdownCallbacks.push(cdCallback)
      } else {
        setTimeout(() => {
          overlayContainer.remove()
          if(count == 0)
          {
            countdownCallbacks.map( cd => clearTimeout(cd) )
          }
        }, 1000)
      }
    }
    updateCountdown()
  }
  
  const clearCountdownCallback = () => {
    if(cdCallback)
    {
      clearTimeout(cdCallback)
      cdCallback = null 
    }

    
  }
  
  
  export {
    clearCountdownCallback , 
    createCountdownOverlay , 
    checkMatchStartCountdown , 
  }
  export default createCountdownOverlay