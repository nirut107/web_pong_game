import type {
  IPongRoom,
  IPongRoomPayload,
  IPongUserPayload,
  IPongMatchPayload,
} from "./models/PongRoom";
import { navigateTo } from "./route";
import { pongSocketService } from "./services";
import {
  _t,
  getCurrentUser,
  getRoomId,
  getUserId,
  hideSelector,
  showSelector,
} from "./util";
import { IPongPlayer, userToPongPlayer } from "./models/Player";
import getScene, { destroyBabylonScene, roomState, runRenderLoop } from "./pongSetupBabylon";
import {
  guestSocketJoinTheRoom,
  setMatch,
  setupRoomFromMatch,
} from "./pongRoomUi";
import { dragHandler } from "./pongRoomUi";
import { newHumanBadge } from "./pongRoomUi";
import GAME_CONSTANTS from "./constants";
import { translatePage } from "./translate";
import { showNotification } from "./manage";
import { pl } from "date-fns/locale";

let usersInTheRoom: IPongPlayer[] = [];

// const setRoomMode = (roomId:string, roomMode:string, roomValue:any) => {

//     console.log(`emitting set-room-mode` , roomId, roomMode , roomValue )
//     console.log(` 3 checkes `, roomMode =='player' , !roomValue.pos , roomValue.pos == null)

//     //let userPayload = userToPongPlayer( getCurrentUser())
//     let userPayload = getCurrentUser()
//     if(roomMode =='player' )
//     {

//         if(!roomValue.pos )
//         {
//             console.log("Try detecting him here")
//             return false
//         }
//         if(usersInTheRoom.length > 0)
//         {
//             usersInTheRoom.forEach( user => {
//                 if(user.userId == roomValue.value)
//                 {
//                     userPayload = user
//                     console.log('user payload was overwritten as ', userPayload)
//                 }
//             })
//         }
//     }
//     const pongSocket = pongSocketService.getSocket()
//     pongSocket.emit('set-room-mode', {
//         roomId,
//         mode: roomMode,
//         value: roomValue ,
//         user: userPayload,
//     })
// }

export const isAIPlayer = (userId: number) => {
  switch (userId) {
    case 4242:
    case 424242:
    case 42424242:
      return true;
  }
  return false;
};
export const newGuestBadge = (
  user: IPongPlayer,
  checkExistingFirst: boolean = true,
  targetDom: string = "ulPlayerList"
) => {
  console.log(" @@@ INSIDE NEW GUEST BADGE ");
  if (
    checkExistingFirst &&
    document.querySelector(`.human-player[data-id="${user.userId}"]`)
  )
    return false;

  if (isAIPlayer(user?.userId)) return false;

  let theDom = newHumanBadge(user, true, false);
  const parentDom = document.getElementById(targetDom);
  if (parentDom) {
    parentDom.append(theDom);

    dragHandler();
  }

  return true;
};

// const removeGuestBadge = (user:IPongPlayer, checkExistingFirst:boolean=true ) => {

//     const targetDom = document.querySelector(`.human-player[data-id="${user.userId}"]`)
//     if(!targetDom)
//         return

//     if( document.querySelector(`.player-position[data-occupied-by="${user.userId}"]`) != null)
//         return false

//     targetDom.remove()
//     return true

// }

const createRoomNode = (room: IPongRoom) => {
  const liDom = document.createElement("div");
  liDom.classList.add("clickable");
  liDom.dataset.roomId = room.roomId ?? "";
  liDom.addEventListener("click", () => {
    navigateTo(`/pong/${room.roomId}`);
  });

  let playersSat = 0;
  room.players.forEach((player) => {
    if (player?.userId !== undefined) playersSat++;
  });

  let roomMode;
  let roomOption = "";
  if (room.classicMode) {
    roomOption =
      `<span class="unrated tsl pong-room-mode" data-tsl="ClassicPong">${_t("ClassicPong")}</span> • `;
    roomMode =
      `<span class="rating-unrated unrated tsl" data-tsl="unrated">Unrated</span>`;
  } else if (room.playersRequired == 4) {
    roomOption =
      `<span class="unrated pong-room-mode tsl" data-tsl="CasualParty">${_t("CasualParty")}</span> • `;
    roomMode =
      `<span class="rating-unrated unrated tsl" data-tsl="unrated">Unrated</span>`;
  } else {
    roomOption = "";
    roomMode =
      '<span class="rating-rated rated tsl" data-tsl="rated">Rated</span>';
  }

  //let content = `${roomMode} ${room.roomId} - <span class="tsl" data-tsl="${room.matchSettings.type}">${room.matchSettings.type}</span> - ${playersSat} / ${room.playersRequired}`

  let divDom = document.createElement("div");
  divDom.classList.add("room-card-blue");
  divDom.classList.add("clickable");
  divDom.dataset.roomId = room.roomId ?? "";
  divDom.addEventListener("click", () => {
    navigateTo(`/pong/${room.roomId}`);
  });
  divDom.innerHTML = `<div class="content">
            <div class="left-content">
                <div class="room-id"><span>${room.roomId}</span> <span data-tsl="by" class="tsl">by</span> <span>${room.players[0]?.nick ?? "-"}</span></div>
                <div class="game-rule">${roomOption} <span class="rating">${roomMode}</span> • ${_t(room.matchSettings.type)}</div>
            </div>
            <div class="right-content">
                <div class="player-count">👥 ${playersSat}/${room.playersRequired}</div>
                <button class="join-btn tsl" data-tsl="join">${_t("Join")}</button>
            </div>
        </div>`;

  return divDom;
};

const reloadRoomList = (rooms: IPongRoom[], divId = "ulPongRoomList") => {
  const ulDom = document.getElementById(divId);
  if (!ulDom) return;
  ulDom.innerHTML = "";
  rooms.map((room) => {
    ulDom.appendChild(createRoomNode(room));
  });

  if (rooms.length == 0)
    ulDom.innerHTML = `<span class="tsl" data-tsl="labelNoRoomAvailable">(no room available)</span>`;

  translatePage();
};

const updateRoom = (theRoomId: string, theRoom: IPongRoom) => {
  console.log(` trying to updateRoom()`, `[data-room-id="${theRoomId}"]`);
  let targetDom = document.querySelector(`[data-room-id="${theRoomId}"]`);
  if (targetDom) {
    const newDom = createRoomNode(theRoom);
    targetDom.replaceWith(newDom);
  } else {
    targetDom = document.createElement("li");
  }
  translatePage();
};

// const btnPongHowToPlay
const btnPongHowToPlayHandler = () => {
  
  const theDom = document.getElementById("btnPongHowToPlay");
  console.log(` GGG --> `, theDom , theDom?.getAttribute("listened") == undefined)
  if(theDom && theDom.getAttribute("listened") == undefined)
  {
    console.log(` GGG - event listener added`)
    theDom.addEventListener("click", (_) => {
      console.log(` GGG - trigger click!`)
      const targetDom = document.getElementById('modalPongHowToPlay')
      console.log(` GGG - targetDom = `, targetDom)
      if(targetDom)
      {
        // targetDom.style.display = targetDom.style.display == 'none'? 'flex' :'none' ;
        targetDom.classList.remove('hidden')
        targetDom.style.display = 'flex'
        targetDom.style.visibility = 'visible'
        // targetDom.style.zIndex = '2000'
        console.log(` GGG - > style = `, targetDom.style.display)
      }
      else 
      {
        console.log(` GGG - WTH?`)
      }
        

    })
    theDom.setAttribute("listened", "1")
  }

  document.querySelectorAll('.close-modal-btn').forEach( theDom => {
    if(theDom.getAttribute("listened") == undefined)
    {
      theDom.addEventListener( "click", () => {
        const modalDom =  document.getElementById("modalPongHowToPlay")
       if(modalDom)
          modalDom.style.display = 'none';
      })
       
       theDom.setAttribute("listened", "1")
    }
  })

  
}

const btnCreateRoomHandler = () => {
  let theDom = document.getElementById("btnCreateRoom");
  if (theDom && theDom.getAttribute("listened") == undefined) {
    theDom.addEventListener("click", (event: MouseEvent) => {
      event.preventDefault();
      console.log("Click Event bound!");
      const header = document.getElementById("header") as HTMLElement;
      header.style.display = "none";
      const pongSocket = pongSocketService.getSocket();
      pongSocket.emit("create-room", {
        userId: getUserId(),
        user: getCurrentUser(),
      });
    });
    theDom.setAttribute("listened", "1");
  }

  
  theDom = document.getElementById("btnCreateCasualRoom");
  if (theDom && theDom.getAttribute("listened") == undefined) {
    theDom.addEventListener("click", (event: MouseEvent) => {
      event.preventDefault();
      console.log("Click Event bound!");
      const header = document.getElementById("header") as HTMLElement;
      header.style.display = "none";
      const pongSocket = pongSocketService.getSocket();
      pongSocket.emit("create-room", {
        userId: getUserId(),
        user: getCurrentUser(),
        players: 4,
      });
    });
    theDom.setAttribute("listened", "1");
  }

  theDom = document.getElementById("btnCreateClassicRoom");
  if (theDom && theDom.getAttribute("listened") == undefined) {
    theDom.addEventListener("click", (event: MouseEvent) => {
      event.preventDefault();
      console.log("Click Event bound!");
      const header = document.getElementById("header") as HTMLElement;
      header.style.display = "none";
      const pongSocket = pongSocketService.getSocket();
      pongSocket.emit("create-room", {
        userId: getUserId(),
        user: getCurrentUser(),
        classic: 1,
      });
    });
    theDom.setAttribute("listened", "1");
  }

  theDom = document.getElementById("btnCreateBAFClassicRoom");
  if (theDom && theDom.getAttribute("listened") == undefined) {
    theDom.addEventListener("click", (event: MouseEvent) => {
      console.log("Click Event bound!");
      const header = document.getElementById("header") as HTMLElement;
      header.style.display = "none";
      const pongSocket = pongSocketService.getSocket();
      pongSocket.emit("create-room", {
        userId: getUserId(),
        user: getCurrentUser(),
        classic: 1,
        baf: 1, 
      });
    });
    theDom.setAttribute("listened", "1");
  }


  theDom = document.getElementById("btnGetRoomList");
  if (theDom && theDom.getAttribute("listened") == undefined) {
    console.log("Click Event bound! -get-room-list");
    theDom.addEventListener("click", (event: MouseEvent) => {
      event.preventDefault();

      const pongSocket = pongSocketService.getSocket();
      pongSocket.emit("get-room-list", {
        userId: getUserId(),
        user: getCurrentUser(),
        classic: 1,
      });
    });
    theDom.setAttribute("listened", "1");
  }


  // moved to button
  theDom = document.getElementById("btnLeaveRoom");
  if (theDom && theDom.getAttribute("listened") == undefined) {
    theDom.addEventListener("click", (event: MouseEvent) => {
      event.preventDefault();
      navigateTo("/gamelibrary");
    });
    theDom.setAttribute("listened", "1");
  }
};

const lobbyUiHandler = () => {
  console.log(`  lobbyUiHandler() being called` )
  btnCreateRoomHandler();
  btnPongHowToPlayHandler();
};

// ====================================================================

const roomSocketHandler = (pongSocket: any) => {
  // let playerOptions = {}

  pongSocket.off("match-status");
  pongSocket.on("match-status", (payload: IPongMatchPayload) => {
    console.warn(" NEED RESTORE TRY-CATCH");
    console.log("<=== match-status", payload);

    // try {

    const theMatch = payload?.match;
    if (!theMatch) return;
    setMatch(payload.match);

    // }
    // catch (error)
    // {
    //     console.error(`error ${error.code}, ${error.message}`)
    //     alert(error.message)
    // }
  });

  pongSocket.off("match-info");
  pongSocket.on("match-info", (payload: IPongMatchPayload) => {
    console.log("<=== match-info", payload);
  });

  pongSocket.off("match-start-ok");
  pongSocket.on("match-start-ok", (payload: IPongMatchPayload) => {
    console.log(` < === match-start-ok `, payload);
    // reset for dynamic view
    roomState.msPayloadCount = 0;
    hideSelector(".match-setting,.match-over");
    runRenderLoop();
  });

  // initializie field for room settings
  pongSocket.off("room-status");
  pongSocket.on("room-status", (payload: IPongMatchPayload) => {
    console.log(` <== room status `, payload);
    console.log(payload.match.roomId)
    // navigateTo(`/pong/${payload.match.roomId}`)
    setupRoomFromMatch(payload);
  });

  pongSocket.off("predict");
  pongSocket.on("predict", (payload: any) => {
    console.log(" ===== predict", payload);

    if (!GAME_CONSTANTS.PONG_SHOW_AI_POV) return;

    const theScene = getScene();
    if (!theScene) return;
    const debugBall = theScene.getMeshById("debugBall");

    if (debugBall) {
      if(!debugBall.isVisible)
          debugBall.isVisible = true

      debugBall.position.x = payload.x;
      debugBall.position.z = payload.z;
      // const theActualBall = theScene.getMeshById("ball");
      // if(theActualBall)
      //   debugBall.position.z = theActualBall?.position.z 
    }

    console.log("position is now", debugBall);
  });

  pongSocket.off("players-in-room");
  pongSocket.on("players-in-room", (payload: any) => {
    console.log(" <== XX players-in-room handler,", payload);
    guestSocketJoinTheRoom(payload.match, payload.users);
  });

  pongSocket.off("user-join-room");
  pongSocket.on("user-join-room", (payload: IPongUserPayload) => {
    console.log(` < === user-join-room (room.js) `, payload);
    const theRoomId = getRoomId();
    if(theRoomId)
      pongSocket.emit('ping', { roomId: theRoomId})
    newGuestBadge(payload.user, true);
  });

  // emit 2 events upon enter
  console.warn(" DELME 23:01 - emit 2 events upon enter");
  // moved to callback !
};
// ==============================================================

export {
  lobbyUiHandler,
  reloadRoomList,
  updateRoom,
  roomSocketHandler,
  // dragHandler ,
};
