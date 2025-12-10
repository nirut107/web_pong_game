import { IPongPlayer, userToPongPlayer } from "./models/Player.js";
import { userInfo } from "./route.js";
import type { User } from './route.js'
import { translateWord } from "./translate.js";




export interface PongError  {
    message: string , 
    code : number | null , 
}

let currentUser:IPongPlayer  = {} as IPongPlayer; 

export const setElement = (domId:string , domContent:string, returnDom:boolean = false) => {

    let theDom = document.getElementById(domId)
    if(theDom && returnDom)
        return theDom 
    if(theDom && theDom.innerHTML !== undefined)
        theDom.innerHTML = domContent
    else 
    {
        // console.warn(`dom ${domId} not found, return simple span instead`)
        theDom = document.createElement('div')
    }
    return theDom 
} 

export const getCurrentUser = ():IPongPlayer => {
    // console.warn(`userInfo (type = User) is now` , userInfo)
    currentUser = userToPongPlayer(userInfo) 
    console.warn(`currentUser (type = IPongUser) is now` , currentUser)
    return currentUser 
} 

const getRoomId = (startUrl: string | null = null):string => {
  let parts: string[] 
  if(startUrl)
      parts = startUrl.split('/').filter(Boolean)
  else 
      parts = window.location.pathname.split('/').filter(Boolean)
  console.log( "PATH NAME", window.location.pathname)
  if(parts[0] === 'pongLobby')
    return 'lobby'
  if((parts[0] === 'room' || parts[0] === 'pong') && parts[1]) 
    return parts[1]  
  return "" 
};

const getUserId = ():number | null  => {
  const theUser  = getCurrentUser()  
  if(!theUser)
    return null 
  return theUser.userId 
};


const displayeFatalError = (error: PongError) => {
  console.log('EEE - me?')
  let theDom = document.getElementById('sectionFatalError')
  if(theDom && theDom.style) 
     theDom.style.display = 'block'
  setElement('divErrorCode' , String(error?.code))
  setElement('divErrorMessage' , error?.message)
}

const debugDatetime = (ts:number):string => {

  const date = new Date(ts)

  const pad = (n:number) => String(n).padStart(2, '0')

  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const getCurrentLanguage = () => {
  return 'en'
}

const _t = (textId:string , lang: string | null =null) => {

  if(!lang)
    lang = localStorage.getItem("language");
  if (lang) {
    lang = "en"
  }

  switch(textId)
  {
      case 'FirstTo5' :  return String(translateWord("FirstTo5"));
      case 'FirstTo10' :  return String(translateWord("FirstTo10"));
      case '3Minute' :  return String(translateWord("mode3Minute"));
      case '5Minute' :  return String(translateWord("mode5Minute"));
  }

  return textId 
}


const formatSeconds = (seconds:number) => {
  
  const hh = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const ss = String(Math.floor(seconds % 60)).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}


const hideSelector = (str:string , hidStyle:string ='none') => {
  document.querySelectorAll(str).forEach( dom => {
    const el = dom as HTMLElement
    if(el.style != undefined)
      el.style.display = hidStyle
  })
}
const showSelector = (str:string , showStyle:string ='block') => {
  document.querySelectorAll(str).forEach( dom => {
    const el = dom as HTMLElement
    if(el.style != undefined)
      el.style.display = showStyle
  })
}




export {
    getRoomId, 
    displayeFatalError,
    getCurrentLanguage, 
    getUserId, 
    debugDatetime,
    formatSeconds, 
    _t ,
    hideSelector , 
    showSelector , 
}