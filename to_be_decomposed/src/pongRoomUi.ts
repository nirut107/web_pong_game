import { GAME_CONSTANTS, allAiPlayers } from "./constants";
import {
  checkMatchStartCountdown,
  clearCountdownCallback,
} from "./pongCountdownOverlay";
import { navigateTo } from "./route";
import getScene, {
  destroyBabylonScene,
  runRenderLoop,
  setCameraView,
} from "./pongSetupBabylon";
import type {
  IPongRoom,
  IPongMatchPayload,
  IPongGamePlay,
} from "./models/PongRoom";
import { IPongPlayer, userToPongPlayer } from "./models/Player";
import { pongSocketService } from "./services";
import {
  setElement,
  hideSelector,
  showSelector,
  _t,
  getCurrentUser,
  getRoomId,
  getUserId,
  getCurrentLanguage,
} from "./util";

import type { User } from "./route";
import { ModalButton, showNotification } from "./manage";
import { translateWord } from "./translate";
import { translateWord } from "./translate";

const pongSocket = pongSocketService.getSocket();

let clientPongMatch: IPongRoom | null = null;
let controller = -1;

let emitEvent = true;
let isGuest = true;
let isHost: boolean = false;

let usersInTheRoom: IPongPlayer[] = [];

const dragHandler = () => {
  let originalParent: HTMLElement | null = null;
  const draggableElements =
    document.querySelectorAll<HTMLElement>(".draggable");

  draggableElements.forEach((el) => {
    if (el.getAttribute("listened") == undefined) {
      el.addEventListener("dragstart", (e: DragEvent) => {
        originalParent = el.parentNode as HTMLElement;

        if (e.dataTransfer) e.dataTransfer.setData("text/plain", el.id);
        setTimeout(() => (el.style.display = "none"), 0);
      });

      el.addEventListener("dragend", () => {
        if (el && el.style) el.style.display = "";
      });

      el.setAttribute("listened", "true");
    }
  });

  const droppableElements =
    document.querySelectorAll<HTMLElement>(".droppable");

  droppableElements.forEach((dropZone) => {
    if (dropZone.getAttribute("listened") == undefined) {
      const roomId = getRoomId();
      dropZone.addEventListener("dragover", (e) => {
        e.preventDefault(); // allow drop
      });

      dropZone.addEventListener("drop", (e) => {
        const draggedId = e.dataTransfer?.getData("text/plain") ?? "";
        const draggedEl = document.getElementById(draggedId);

        // if (dropZone.id === 'ulDragConsole' ||  dropZone.children.length === 0)
        let dropOK = false;
        const occupiedBy = dropZone.getAttribute("data-occupied-by");
        console.log(`occupiedBy =${occupiedBy}=`, occupiedBy);
        if (occupiedBy === undefined || occupiedBy == "") dropOK = true;
        if (dropZone.id === "ulPlayerList" && dropZone != originalParent)
          dropOK = true;

        // handle the drop
        if (dropOK) {
          // draggedValue will be the userId
          const el = document.getElementById(draggedId);
          const draggedValue = el?.getAttribute("data-id") ?? "";

          if (originalParent) {
            const theParentDropZone =
              originalParent.closest("[data-position-id]");
            if (theParentDropZone)
              theParentDropZone.setAttribute("data-occupied-by", "");
          }
          // check if the parent of the dragged item also has the data-occupied-by, if yes, set them to empty as well

          const theOriginalParent = document.getElementById(draggedId)
            ?.parentNode as HTMLElement;
          const occupiedBy =
            theOriginalParent?.getAttribute("data-occupied-by") ?? "";
          // console.log(` before updating occupiedBy `,occupiedBy)
          if (occupiedBy !== undefined && occupiedBy != "")
            theOriginalParent.setAttribute("data-occupied-by", "");

          if (draggedEl) dropZone.appendChild(draggedEl);

          let removeFromSeat = false;
          if (dropZone.id != `ulPlayerList`)
            dropZone.setAttribute("data-occupied-by", draggedValue);
          else removeFromSeat = true;

          if (draggedEl) {
            draggedEl.style.margin = "auto";
            draggedEl.style.display = "block";
            draggedEl.style.textAlign = "center";
          }
          let droppedAt = dropZone.getAttribute("data-position-id");

          console.log(" DROP SENDING pos ", droppedAt, draggedValue);

          if (removeFromSeat) {
            setRoomMode(roomId, "unseat-player", draggedValue);
          } else {
            setRoomMode(roomId, "player", {
              pos: dropZone.getAttribute("data-position-id"),
              value: draggedValue,
            });
          }
        }
      });

      dropZone.addEventListener("dragleave", (e) => {
        const draggedId = e.dataTransfer?.getData("text/plain");
        if (!draggedId) return;
        const draggedEl = document.getElementById(draggedId);

        if (!dropZone.contains(draggedEl)) {
        }
      });
    } else dropZone.setAttribute("listened", "true");
  });
};

// let camWasSet   = false

const isAIPlayer = (userId: number) => {
  switch (userId) {
    case 4242:
    case 424242:
    case 42424242:
      return true;
  }
  return false;
};

const roomState = {
  camWasSet: false,
  msPayloadCount: 0,
  currentCam: 3,
};

export interface IListenerHandler {
  listenerId: string;
  eventType: string;
}

let keyListenerHanlder: IListenerHandler[] = [];

const newGuestBadge = (
  thePlayer: IPongPlayer,
  checkExistingFirst = true,
  targetDom = "ulPlayerList"
) => {
  console.log(" @@@ INSIDE NEW GUEST BADGE ");
  if (
    checkExistingFirst &&
    document.querySelector(`.human-player[data-id="${thePlayer.userId}"]`)
  )
    return false;

  if (isAIPlayer(thePlayer.userId)) return false;

  let theDom = newHumanBadge(thePlayer, true, false);
  const parentDom = document.getElementById(targetDom);
  if (parentDom) {
    parentDom.append(theDom);
    dragHandler();
  }

  return true;
};

const removeGuestBadge = (user: IPongPlayer) => {
  const targetDom = document.querySelector(
    `.human-player[data-id="${user.userId}"]`
  );
  if (!targetDom) return;

  if (
    document.querySelector(
      `.player-position[data-occupied-by="${user.userId}"]`
    ) != null
  )
    return false;

  targetDom.remove();
  return true;
};

const setRoomMode = (roomId: string, roomMode: string, roomValue: any) => {
  console.log(` 888 - emitting set-room-mode`, roomId, roomMode, roomValue);
  console.log(
    ` 888 - 3 checkes `,
    roomMode == "player",
    !roomValue.pos,
    roomValue.pos == null
  );

  let userPayload = getCurrentUser();
  if (roomMode == "player") {
    if (!roomValue.pos) {
      console.log("Try detecting him here");
      return false;
    }
    if (usersInTheRoom.length > 0) {
      usersInTheRoom.forEach((user) => {
        if (user.userId == roomValue.value) {
          userPayload = user;
          console.log("user payload was overwritten as ", userPayload);
        }
      });
    }
  }

  pongSocket.emit("set-room-mode", {
    roomId,
    mode: roomMode,
    value: roomValue,
    user: userPayload,
  });
};

const newHumanBadge = (
  thePlayer: IPongPlayer,
  isDraggable: boolean,
  isHost = false
) => {
  console.log(` inside newHumanBadge - pongRoomUi.ts `);
  console.log(thePlayer);
  const newDPlayer = document.createElement("div");
  if (isDraggable) {
    newDPlayer.setAttribute("draggable", "true");
    newDPlayer.classList.add("draggable");
  } else {
    newDPlayer.setAttribute("draggable", "false");
    newDPlayer.classList.add("undraggable");
  }

  newDPlayer.classList.add("human-player");
  newDPlayer.classList.add("human-player-item");
  newDPlayer.classList.add("solar-flare-button");
  newDPlayer.setAttribute("data-id", String(thePlayer.userId));
  newDPlayer.id = `humanBadge${thePlayer.userId}`;
  newDPlayer.textContent = thePlayer.nick
    ? thePlayer.nick
    : String(thePlayer?.userId);

  if (isHost) newDPlayer.innerHTML += _t('<span class="host-icon">✱</span>');
  return newDPlayer;
};

const newAiBadge = (thePlayer: IPongPlayer, isDraggable: boolean) => {
  console.log(` newAiBadge`, isDraggable);

  const theId = `aiBadge${thePlayer.userId}`;
  // check if the basge was there
  if (document.getElementById(theId)) return;

  // const cont = document.createElement('div')
  // cont.classList.append('badge-container')

  const liAiBadge = document.createElement("div");
  liAiBadge.classList.add("ai-player");
  liAiBadge.classList.add("ai-player-item");
  liAiBadge.classList.add("movable-badge");
  liAiBadge.classList.add("solar-flare-button");
  if (isDraggable) {
    liAiBadge.setAttribute("draggable", "true");
    liAiBadge.classList.add("draggable");
  } else {
    liAiBadge.setAttribute("draggable", "false");
    liAiBadge.classList.add("undraggable");
  }

  liAiBadge.setAttribute("data-id", String(thePlayer.userId));
  liAiBadge.id = `aiBadge${thePlayer.userId}`;
  //liAiBadge.textContent = thePlayer.nick? thePlayer.nick : thePlayer.username
  let nick = thePlayer.nick ? thePlayer.nick : thePlayer.userId;
  liAiBadge.textContent = `${nick}`;

  return liAiBadge;
};

let aiBadgesCreated = false;
const createAiBadges = (targetId = "ulPlayerList", isDraggable = false) => {
  if (aiBadgesCreated) return;
  let targetDom = document.getElementById(targetId);
  if (!targetDom) {
    console.log(`cannot find target DOM`);
    return false;
  }
  const aiPlayers = allAiPlayers;

  aiPlayers.map((ai: IPongPlayer) => {
    let theBadge = newAiBadge(ai, isDraggable);
    if (theBadge) targetDom.appendChild(theBadge);
  });
};

let registeredKeyboard = false;

const setGamePlay = async (gamePlay: IPongGamePlay) => {
  let scene = getScene();
  if (!scene) return;

  const ballMesh = scene.getMeshById("ball");
  if (ballMesh == null) return;

  ballMesh.position.x = gamePlay.ball.pos.x;
  ballMesh.position.z = gamePlay.ball.pos.z;

  for (let i = 0; i < gamePlay.paddles.length; i++) {
    const thePaddleId = `paddleP${i + 1}`;
    const thePaddle = scene.getMeshById(thePaddleId);
    if (thePaddle) {
      // console.log(`found paddle ${thePaddleId}`, gamePlay)
      // console.log(gamePlay.paddles[i])
      thePaddle.position.x = gamePlay.paddles[i].pos.x;
      thePaddle.position.z = gamePlay.paddles[i].pos.z;
      // console.warn(" 22:55 CHANGING HERE? TO SEE IF THE SCALING WORKS ON VECOTR INSTEAD OF NUMBER")
      // thePaddle.position.scale = gamePlay.paddles[i].scale
      //thePaddle.scaling.scaleInPlace( gamePlay.paddles[i].scale )
      // console.warn(" 22:55 NOPE?")
      // thePaddle.position.speed = gamePlay.paddles[i].speed
    } else {
      console.log(`mesh ${thePaddleId} not found`);
    }
  }
};

const setMatchIsOver = (theMatch: IPongRoom) => {
  clearCountdownCallback();

  const theDom = document.getElementById("pongForfeit");
  if (theDom && theDom.style) theDom.style.display = "none";

  if (theMatch.resignedBy != null) {
    if (theMatch.resignedBy == 0) theMatch.winnerSide = 1;
    else theMatch.winnerSide = 0;

    let theSide = controller % 2;
    const theDom = document.getElementById("matchOverExtraResignText");
    if (theDom) {
      if (theSide == theMatch.resignedBy)
        theDom.textContent = String(translateWord("reasonYourTeamHasResigned"));
      else
        theDom.textContent = String(
          translateWord("reasonYourOpponenetTeamHasResigned")
        );
    }
  }
  if (theMatch.winnerSide == -1) setElement("pWinner", "NOONE");
  else {
    const theWinners: string[] = [];
    theMatch.players.forEach((player, ind) => {
      if (ind == theMatch.playersRequired) return;
      if (ind % 2 == theMatch.winnerSide)
        theWinners.push(player?.nick ? player.nick : String(player?.userId));
    });
    setElement("pWinner", theWinners.join(", "));
  }
  showSelector(".match-over", "flex");
};

const sendSignal = (pongSocket: any, move: string, startOrStop: string, overCon:number | null=null) => {
  if (controller % 2 == 0) {
    // console.log('revert controll')
    move = move == "left" ? "right" : "left";
  }

  if(overCon == null)
    overCon = controller 

  // console.log(` !!@!! sendSignal`, move ,startOrStop )
  pongSocket.emit("move-paddle", {
    roomId: getRoomId(),
    player: overCon,
    move: move,
    keyEvent: startOrStop,
  });
};

const giveupMatch = () => {};

const gameIsPaused = () => {
  if (!clientPongMatch) throw Error("invalid payload - match not found");
  // WTH, i used the wrong value all along?
  // return clientPongMatch.gameIsPaused
  return clientPongMatch.gamePlay.gameIsPaused;
};

const registerKeyboardInput = () => {
  console.warn(" REGISTER KEYBOARD EVENT ");

  // if(controller < 0)
  // {
  //     console.warn("CONTROLLER #NULL return ")
  //     return
  // }

  if (registeredKeyboard) {
    console.warn("CONTROLLER ALREADY REGISTERED return ");
    return false;
  }

  console.warn(" general registerKeyboardINput");

  window.addEventListener("keydown", (event) => {

    if(clientPongMatch?.classicMode && clientPongMatch?.baf)
    {
      if (controller >= 0 && event.key === "ArrowRight")
        sendSignal(pongSocket, "right", "start", 1);
      if (controller >= 0 && event.key === "ArrowLeft")
        sendSignal(pongSocket, "left", "start", 1);
      if (controller >= 0 && event.key === "s")
        sendSignal(pongSocket, "right", "start", 0);
      if (controller >= 0 && event.key === "w")
        sendSignal(pongSocket, "left", "start", 0);  
      return 
    }
      


    if (controller >= 0 && event.key === "ArrowRight")
      sendSignal(pongSocket, "right", "start");
    if (controller >= 0 && event.key === "ArrowLeft")
      sendSignal(pongSocket, "left", "start");

    // 2025-05-29 ,additional key up & down for classic mode?
    if (controller >= 0 && event.key === "ArrowUp") {
      if (clientPongMatch?.classicMode) {
        if (controller % 2 == 0) sendSignal(pongSocket, "left", "start");
        else sendSignal(pongSocket, "right", "start");
      }
    }
    if (controller >= 0 && event.key === "ArrowDown") {
      if (clientPongMatch?.classicMode) {
        if (controller % 2 == 0) sendSignal(pongSocket, "right", "start");
        else sendSignal(pongSocket, "left", "start");
      }
    }
  });

  let tempLH: IListenerHandler = { listenerId: "dummy", eventType: "keydown" };
  keyListenerHanlder.push(tempLH);
  let handler 
  handler = window.addEventListener("keyup", (event) => {

    if(clientPongMatch?.classicMode && clientPongMatch?.baf)
      {
        if (controller >= 0 && event.key === "ArrowRight")
          sendSignal(pongSocket, "right", "stop", 1);
        if (controller >= 0 && event.key === "ArrowLeft")
          sendSignal(pongSocket, "left", "stop", 1);
        if (controller >= 0 && event.key === "s")
          sendSignal(pongSocket, "right", "stop", 0);
        if (controller >= 0 && event.key === "w")
          sendSignal(pongSocket, "left", "stop", 0);  
        return 
      }
  
    if (controller >= 0 && event.key === "ArrowRight")
      sendSignal(pongSocket, "right", "stop");
    if (controller >= 0 && event.key === "ArrowLeft")
      sendSignal(pongSocket, "left", "stop");
    if (controller >= 0 && event.key === "ArrowUp") {
      if (clientPongMatch?.classicMode) {
        if (controller % 2 == 0) sendSignal(pongSocket, "left", "stop");
        else sendSignal(pongSocket, "right", "stop");
      }
    }
    if (controller >= 0 && event.key === "ArrowDown") {
      if (clientPongMatch?.classicMode) {
        if (controller % 2 == 0) sendSignal(pongSocket, "right", "stop");
        else sendSignal(pongSocket, "left", "stop");
      }
    }
  });
  keyListenerHanlder.push({ listenerId: "dummy", eventType: "keyup" });

  handler = window.addEventListener("keypress", (event) => {
    console.log(` key: ${event.key} pressed`);

    switch (event.key) {
      case "0":
        console.log(` 0 pressed: cam1`);
        if (
          controller >= 0 &&
          !gameIsPaused() &&
          GAME_CONSTANTS.GAME_ALLOW_DEBUG_KEY
        )
          setCameraView(getScene(), 0);
        break;

      case "1":
        console.log(` 1 pressed: cam1`);
        if (
          controller >= 0 &&
          !gameIsPaused() &&
          GAME_CONSTANTS.GAME_ALLOW_DEBUG_KEY
        )
          setCameraView(getScene(), 1);
        break;
      case "2":
        console.log(` 2 pressed: cam2`);
        if (
          controller >= 0 &&
          !gameIsPaused() &&
          GAME_CONSTANTS.GAME_ALLOW_DEBUG_KEY
        )
          setCameraView(getScene(), 2);
        break;
      case "3":
        console.log(` 3 pressed: cam3`);
        if (
          controller >= 0 &&
          !gameIsPaused() &&
          GAME_CONSTANTS.GAME_ALLOW_DEBUG_KEY
        )
          setCameraView(getScene(), 3);
        break;
      case "4":
        console.log(` 4 pressed: cam4`);
        if (
          controller >= 0 &&
          !gameIsPaused() &&
          GAME_CONSTANTS.GAME_ALLOW_DEBUG_KEY
        )
          setCameraView(getScene(), 4);
        break;
      case "5":
        console.log(` 5 pressed: cam4`);
        if (
          controller >= 0 &&
          !gameIsPaused() &&
          GAME_CONSTANTS.GAME_ALLOW_DEBUG_KEY
        )
          setCameraView(getScene(), 5);
        break;
      case "r":
        console.log(` r pressed: re-start-game`);
        if (
          controller >= 0 &&
          !gameIsPaused() &&
          GAME_CONSTANTS.GAME_ALLOW_DEBUG_KEY
        )
          pongSocket.emit("re-start-game", { roomId: getRoomId() });
        break;
      case "m":
        console.log(` m pressed: match-info`);
        if (
          controller >= 0 &&
          !gameIsPaused() &&
          GAME_CONSTANTS.GAME_ALLOW_DEBUG_KEY
        )
          pongSocket.emit("match-info", { roomId: getRoomId() });
        break;
      case "d":
        console.log(` m pressed: debug AI visible ball `);
        const scene = getScene();
        if (scene) {
          const theDebugBall = scene.getMeshById("debugBall");
          if (theDebugBall) theDebugBall.isVisible = !theDebugBall.isVisible;
        }

        break;

      // case 's'    :   console.log(` s pressed: sound test`)
      // playSound('minitalk')
      // break
      case "p":
        console.log(` p pressed: start-game`);
        if (controller >= 0 && GAME_CONSTANTS.GAME_ALLOW_DEBUG_KEY)
          pongSocket.emit("pause-game", { roomId: getRoomId() });

        break;
      // case 'z'    :

      case "Enter":
      case " ":
        console.log(" THE SPECIAL KEY PRESSED");
        if (!clientPongMatch) {
          console.error(" CLIENT NULL MATCH RETURN ");
          return;
        }

        if (controller < 0) return;

        console.log(` TUE_DEBUG , controller = ${controller}`);

        let specialId = clientPongMatch.gamePlay.paddles[controller].special;
        if (specialId == null) {
          console.error(" NULL SPEICAL RETURN ");
          return;
        }

        if (controller >= 0 && !clientPongMatch.gamePlay.gameIsPaused) {
          console.warn(" EMITING SPECIAL???? ");
          pongSocket.emit("special", {
            roomId: getRoomId(),
            player: controller,
            special: specialId,
          });
        }

        break;

      default:
        break;
    }
  });
  keyListenerHanlder.push({ listenerId: "dummy", eventType: "keypress" });

  registeredKeyboard = true;
};

const setupRoomFromMatch = (payload: IPongMatchPayload) => {
  console.log(` inside setupRoomFromMatch()`, payload);
  const currentUser = getCurrentUser();
  if (!payload.match) return;
  const theMatch = payload.match;
  if (theMatch.matchStatus != "CREATED" && theMatch.matchStatus != "INIT")
    return;
  const isHost = currentUser?.userId == theMatch?.hostPlayer;

  console.error(` ERROR ME currentUser`, currentUser, theMatch.hostPlayer);

  if (isHost) {
    showSelector(".host-only", "flex");
    hideSelector(".guest-only");
  } else showSelector(".guest-only");

  // disable emitting event to prevent looping back & forth
  emitEvent = false;
  const radLabel = `radPlayersRequired${theMatch.playersRequired}`;
  const radPlayers = document.getElementById(radLabel) as HTMLInputElement;
  if (radPlayers && radPlayers?.checked != undefined) {
    radPlayers.checked = true;
  }

  document.querySelectorAll(".button-players-req").forEach((dom) => {
    dom.removeAttribute("data-selected");
    let theVal = dom.getAttribute("data-value");
    if (theVal && Number(theVal) == theMatch.playersRequired)
      dom.setAttribute("data-selected", "true");
  });

  // let gameMode = null
  let gameModeText = "FirstTo5";

  switch (theMatch?.matchSettings?.type) {
    case "FirstTo5":
    case "FirstTo10":
    case "3minute":
    case "5minute":
      gameModeText = theMatch?.matchSettings?.type;
      break;
  }

  const radGameType = document.querySelector(
    `[name="gameMode"][value="${theMatch?.matchSettings?.type}"]`
  ) as HTMLInputElement;
  if (radGameType) {
    document.querySelectorAll(".button-match-type").forEach((dom) => {
      dom.removeAttribute("data-selected");
    });

    let matchTypeDom = document.querySelector(
      `.button-match-type[data-game-mode="${theMatch?.matchSettings?.type}"]`
    );
    if (matchTypeDom) matchTypeDom.setAttribute("data-selected", "true");
    else console.warn("XXX not found and skip");

    radGameType.checked = true;
  }

  let el = document.getElementById("spanMatchSettingsType");
  if (el) el.textContent = String(translateWord(gameModeText));
  el = document.getElementById("spanPlayersRequired");
  if (el) el.textContent = String(theMatch.playersRequired);

  let meJoined = false;
  Object.values(theMatch.players).forEach((player) => {
    if (currentUser && player?.userId == currentUser?.userId) meJoined = true;
  });

  let lblGameMode = document.getElementById("lblGameMode");
  if (lblGameMode)
    lblGameMode.textContent = String(
      translateWord(theMatch.matchSettings.type)
    );

  // always create AI badge, in case already took a seat
  createAiBadges("ulPlayerList", isHost);

  for (let i = 0; i < theMatch.players.length; i++) {
    const player = theMatch.players[i];
    const target = document.getElementById(`labelPlayer${i + 1}`);

    // set 4 players label on the game overlay
    console.log(`target`, target, `labelPlayer${i + 1}`);
    if (!player && target) {
      // target.textContent = '-'
    } else {
      let nick = player?.nick ? player.nick : String(player?.userId);
      if (target) target.textContent = nick;
    }

    let showJoinButton = false;
    // let newlyCreatedBadge = false

    console.log(
      ` #### CHECKING IF is AIPlayer for `,
      player?.userId,
      isAIPlayer(player?.userId)
    );
    const theDropZone = document.getElementById("ulPlayerList");
    if (player === null) {
      // check if there's previously Human Badge before?
      const qSelector = `#dropZonePlayer${i} .human-player`;
      console.log(` WED_DEBUG qSelector = `, qSelector);
      document.querySelectorAll(qSelector).forEach((dom) => {
        console.log(` WED_DEBUG dom.id = `, dom.id);

        if (theDropZone) theDropZone.appendChild(dom);
        else {
          console.log(`drpopZone not exist`);
        }
      });

      showJoinButton = true;
    } else if (isAIPlayer(player.userId)) {
      let aiBadge = document.querySelector(
        `.ai-player[data-id="${player.userId}"]`
      );
      const seat = document.getElementById(`dropZonePlayer${i}`);
      if (seat) {
        if (aiBadge) seat.appendChild(aiBadge);
        seat.setAttribute("data-occupied-by", String(player.userId));
      }
    } else {
      let humanBadge = document.querySelector(
        `.human-player[data-id="${player.userId}"]`
      ) as HTMLElement;
      if (!humanBadge) {
        console.log(
          " SOMEHOW HUMAN BADGE WAS NOT CREATED, CREATE ONE",
          player.userId
        );
        humanBadge = newHumanBadge(
          player,
          isHost,
          player.userId == theMatch.hostPlayer
        );
        // newlyCreatedBadge = true
      } else {
        console.log(`DOM was there for ${player.userId}`);
      }

      humanBadge.style.display = "block";
      // WTF ORIGINAL
      // document.getElementById(`divJoinMatchAtPos${i}`).appendChild( humanBadge )
      let dropZone = document.getElementById(`dropZonePlayer${i}`);
      if (dropZone) {
        dropZone.appendChild(humanBadge);
        dropZone.setAttribute("data-occupied-by", String(player.userId));
      } else {
        console.log(` WED_DEBUG XXX`);
      }
    }

    // display or hide guest "Join" button
    // let theJoinButton = document.getElementById(`btnJoinMatchAtPos${i}`)
    let theJoinButton = document.getElementById(`divJoinMatchAtPos${i}`);
    if (theJoinButton) {
      if (showJoinButton && isGuest && !meJoined)
        theJoinButton.style.display = "inline-block";
      else theJoinButton.style.display = "none";
    }
  }

  if (theMatch.playersRequired == 4) 
    {
      console.log("FRI_DEBUG show 4")
      showSelector(".game-4p-only", "flex");
      showSelector(".ponggame-4p-only", "block");
    }
  else 
    {
      console.log("FRI_DEBUG hide 4")
      hideSelector(".game-4p-only");
      hideSelector(".ponggame-4p-only");
    } 

  // lastly , check if the start game button should be clickable

  const btnStartGame = document.getElementById(
    "btnStartGame"
  ) as HTMLInputElement;
  if (btnStartGame) {
    btnStartGame.disabled = true;
    let emptySeats = false;
    for (let i = 0; i < theMatch.playersRequired; i++) {
      if (theMatch.players[i] == null) emptySeats = true;
    }

    if (!emptySeats) btnStartGame.disabled = false;
  }

  const btnCopyToClipboard = document.getElementById(
    "btnCopyToClipboard"
  ) as HTMLInputElement;
  if (btnCopyToClipboard && !btnCopyToClipboard.getAttribute("listened")) {
    console.log("TUE_DEBUG copy to clipboard?");
    btnCopyToClipboard.addEventListener("click", () => {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => {
          console.log("URL copied to clipboard:", window.location.href);
        })
        .catch((err) => {
          console.error("Failed to copy URL:", err);
        });
    });
    btnCopyToClipboard.setAttribute("listened", "1");
  }

  emitEvent = true;
};

const guestSocketJoinTheRoom = (
  theMatch: IPongRoom,
  usersInRoom: IPongPlayer[]
) => {
  let isGuest = true;
  let isHost = false;
  const theUser = getCurrentUser();

  if (theUser && theMatch?.hostPlayer == theUser?.userId) {
    isHost = true;
    isGuest = false;
  }

  usersInTheRoom = usersInRoom;
  Object.values(usersInRoom).map((user) => {
    let newDPlayer = document.querySelector(
      `.human-player[data-id="${user.userId}"]`
    );

    if (newDPlayer === null) newDPlayer = newHumanBadge(user, isHost);

    let tookSeat = false;

    // looping through seats
    theMatch.players.forEach((player, index) => {
      let targetDom = document.getElementById(`dropZonePlayer${index}`);
      if (targetDom)
        targetDom.setAttribute(
          "data-occupied-by",
          String(player?.userId ? player.userId : "")
        );
      // console.log(`777 dropZonePlayer${index} was set to `, targetDom.getAttribute('data-occupied-by'))

      if (player && player.userId == user.userId) {
        console.log(` seat was taken ${user.userId} ${user.nick}`);
        console.log(`dropZonePlayer${index}`);

        if (targetDom) targetDom.appendChild(newDPlayer);
        else console.log(` target DOM not found`);

        let joinBtn = document.getElementById(`btnJoinMatchAtPos${index}`);
        // apply for guest only
        if (joinBtn && !isHost) {
          joinBtn.style.display = isGuest ? "none" : "flex";
          console.log(` here??? `, joinBtn.style.display);
        }
        tookSeat = true;
      } else console.log(` seat was NOT taken `);
    });

    let thePlayerListDom = document.getElementById("ulPlayerList");
    if (!tookSeat && thePlayerListDom) thePlayerListDom.appendChild(newDPlayer);

    let pos = null;
    theMatch.players.forEach((player, ind) => {
      if (player?.userId == user.userId) pos = ind;
    });
    console.log(`newDPlayer: `, newDPlayer);
  });
  // done add the draggable users, add the handler
  dragHandler();
};

const cleanupClientRoom = (unusedRoomId: string, destroyBabylon = false) => {
  // pongSocket.leave(roomId)
  //
  console.log(
    ` cleanupClientRoom() is being called, with roomId ${getRoomId()}`
  );
  pongSocket.emit("user-left-room", { roomId: getRoomId() });

  // event listensers
  clearCountdownCallback();
  keyListenerHanlder.forEach((listenerMap) => {
    //let { listenerId , eventType } = listenerMap
    console.warn(
      " CLEANINGUP CLIENT ROOM HASN'T CLEANED UP PROPERLY, PLEASE CHECK"
    );

    // document.removeEventListener(eventType, listenerId)
  });

  if (destroyBabylon) destroyBabylonScene();
};

const roomUiHandler = (path: string) => {
  // const roomId = getRoomId()

  window.addEventListener("beforeunload", () => {
    // not found cleanUpRoom()
  });

  document.querySelectorAll(".select-player").forEach((selectedDom) => {
    // const roomId = getRoomId()

    const dom = selectedDom as HTMLInputElement;
    if (dom.getAttribute("listened") == undefined) {
      dom.addEventListener("change", () => {
        console.log(`select was being changed`, dom.getAttribute("data-pos"));
        if (dom.value != "0" && emitEvent) {
          setRoomMode(getRoomId(), "player", {
            pos: dom.getAttribute("data-pos"),
            value: dom.value,
          });
        }
      });
      dom.setAttribute("listened", "true");
    }
  });

  document.querySelectorAll('[name="gameMode"]').forEach((suchDom) => {
    const dom = suchDom as HTMLInputElement;
    if (dom.getAttribute("listened") == undefined) {
      dom.addEventListener("change", () => {
        if (emitEvent)
          setRoomMode(getRoomId(), "match-settings-type", dom.value);
      });
      dom.setAttribute("listened", "true");
    }
  });

  document.querySelectorAll('[name="playersRequired"]').forEach((suchDom) => {
    const dom = suchDom as HTMLInputElement;
    if (dom.getAttribute("listened") == undefined) {
      dom.addEventListener("change", () => {
        if (emitEvent) setRoomMode(getRoomId(), "players-required", dom.value);
      });
      dom.setAttribute("listened", "true");
    }
  });

  let theDom = document.getElementById("btnFatalErrorBack");
  if (theDom && theDom.getAttribute("listened") == undefined) {
    theDom.addEventListener("click", () => {
      const theDom = document.getElementById("sectionFatalError");
      if (theDom && theDom.style) theDom.style.display = "none";
      let targetPage = document
        .getElementById("btnFatalErrorBack")
        ?.getAttribute("data-path");
      if (!targetPage) targetPage = "/pongLobby";
      navigateTo(targetPage);
    });
    theDom.setAttribute("listened", "true");
  }

  document.querySelectorAll(".join-match-at-pos").forEach((dom) => {
    const theUser = getCurrentUser();
    if (dom.getAttribute("listened") != undefined) return;
    dom.addEventListener("click", (event) => {
      console.log(`the pos = `, dom.getAttribute("data-pos"));
      const payload = {
        roomId: getRoomId(),
        mode: "player",
        value: {
          pos: dom.getAttribute("data-pos"),
          value: theUser?.userId,
        },
        user: theUser,
      };
      console.log(` the join payload `, payload);
      if (emitEvent) pongSocket.emit("set-room-mode", payload);
    });
    dom.setAttribute("listened", "true");
  });

  document
    .querySelectorAll(".back-to-lobby, #btnWonBackToLobby")
    .forEach((suchDom) => {
      const dom = suchDom as HTMLInputElement;
      if (dom.getAttribute("listened") == undefined) {
        if (path.startsWith("/tournament")) {
          dom.textContent = String(translateWord("Back to Tournament"));
        } else {
          dom.textContent = String(translateWord("Back to Pong Lobby"));
        }
        dom.onclick = () => {
          const content = document.getElementById("content") as HTMLElement;
          const header = document.getElementById("header") as HTMLElement;
          if (header) header.style.display = "flex";
          if (content) content.style.position = "";

          console.warn(`try deleting babylon stuff here`);
          const scene = getScene();
          if (scene) destroyBabylonScene();
          console.log(` FFF - trying to leave roon`);
          pongSocket.emit("user-left-room", {});
          console.log(` FFF - left`);

          if (path.startsWith("/tournament")) {
            navigateTo("/tournament");
          } else {
            navigateTo("/pongLobby");
          }
        };
        dom.setAttribute("listened", "true");
      }
    });

  theDom = document.getElementById("pongForfeit");
  if (theDom && theDom.getAttribute("listened") == undefined) {
    theDom.addEventListener("click", () => {
      showNotification(
        "Give up the match for your team?",
        [
          {
            text: "Cancel",
            onClick: () => console.log("Cancel giving up"),
            datatsl: "cancel",
          },
          {
            text: "Give up",
            onClick: async () => {
              console.log("emitting forfeit signal");
              pongSocket.emit("forfeit", {
                userId: getUserId(),
                roomId: getRoomId(),
              });
              navigateTo(path);
            },
            danger: true,
            datatsl: "giveup",
          },
        ],
        "confirmTeamGiveup"
      );
    });
  }

  theDom = document.getElementById("btnStartGame");
  if (theDom && theDom.getAttribute("listened") == undefined) {
    theDom.addEventListener("click", () => {
      // reset just to make sure the cam was set
      roomState.msPayloadCount = 0;
      pongSocket.emit("start-game", { roomId: getRoomId() });
    });
    theDom.setAttribute("listened", "true");
  }
};

const getSpecialIcon = (specialId: string, id = "specialHowToText") => {
  const title = _t(id, getCurrentLanguage());

  switch (specialId) {
    case "solong":
    case "ftirc":
    case "minitalk":
    case "fractol":
      return `<img src="/images/cards/${specialId}.png" class="special-icon tsl" data-tsl="pongHowToSpecial" title="${specialId}" alt="Press Spacebar or Enter to activate special" title="${title}">`;
  }
  return "";
};

const setMatch = (theMatch: IPongRoom) => {
  if (!theMatch) return false;

  // initial match display
  clientPongMatch = theMatch;

  const theUser = getCurrentUser();
  console.log(`getCurrentUser() =>`, theUser);

  // setElement('scorePlayerLeft', theMatch.score[0] )
  // setElement('scorePlayerRight', theMatch.score[1] )
  document.querySelectorAll(".score-player-left").forEach((suchDom) => {
    const dom = suchDom as HTMLElement;
    dom.textContent = String(theMatch.score[0]);
  });
  document.querySelectorAll(".score-player-right").forEach((suchDom) => {
    const dom = suchDom as HTMLElement;
    dom.textContent = String(theMatch.score[1]);
  });

  // debug stuff
  // let theDom = document.getElementById('divRoomId')
  // if (theDom)
  //     theDom.textContent = theMatch.roomId

  // setup match
  // if(theMatch.matchStatus == 'CREATED' || theMatch.matchStatus == 'INIT')
  // {
  //console.warn(` DEBUG SKIPPING SHOULD RESTORE ME`)
  // setupRoomFromPayload( { match : theMatch})
  setupRoomFromMatch({ match: theMatch });

  //
  //  }

  isHost = clientPongMatch.hostPlayer == theUser?.userId;

  // Babylon setups
  let scene = getScene();
  // hide paddles #3, #4 by default

  let hideMultiPaddles = theMatch.playersRequired != 2;
  if (!scene) {
    console.log("Scene is not ready");
    return;
  }

  let mesh = scene.getMeshById(`paddleP3`);
  if (mesh) mesh.isVisible = hideMultiPaddles;
  mesh = scene.getMeshById(`paddleP4`);
  if (mesh) mesh.isVisible = hideMultiPaddles;
  if (clientPongMatch.playersRequired == 4)
  { console.log('FRIXXX #1')
    showSelector(".game-4p-only", "flex");
    showSelector(".ponggame-4p-only", "block");
  }
    
  else 
  {
    console.log('FRIXXX #2')
    hideSelector(".game-4p-only,.ponggame-4p-only");
  }

  let lblGameMode = document.getElementById("lblGameMode");
  if (lblGameMode) lblGameMode.textContent = _t(theMatch.matchSettings.type);

  // game's overlay names
  // reset with no-one
  console.log(" MON_DEBUG , reset controller with noone");
  clientPongMatch.controller = controller = -1;
  clientPongMatch.players.forEach((player, index) => {
    const labelDom = document.getElementById(`labelPlayer${index + 1}`);
    let nick = null;

    if (player?.nick) {
      nick = player?.nick ? player.nick : String(player?.userId);
    }

    if (labelDom && nick) labelDom.textContent = nick;
    const pongBack = document.getElementById("pongBackLib");
    console.log(` MON_DEBUG player?.userId `, player?.userId, theUser?.userId);

    if (player?.userId == theUser?.userId && clientPongMatch) {
      console.log(` CONTROLLER # ${index} ASSIGNED`);
      clientPongMatch.controller = controller = index;
      const forfeitBtn = document.getElementById("pongForfeit");
      if (forfeitBtn) forfeitBtn.style.display = "block";

      // hide back button for players
      if (pongBack) pongBack.style.display = "none";
    } else {
      // if(pongBack)
      //   pongBack.style.display = 'block';
    }

    let mesh = scene.getMeshById(`paddleP${index + 1}`);
    if (mesh) mesh.isVisible = true;
  });

  if (clientPongMatch.gamePlay) {
    clientPongMatch.gamePlay.paddles.forEach((thePaddle, index) => {
      const targetSpecialDiv = document.getElementById(
        `specialPlayer${index + 1}`
      );
      console.log(` checking on specialPlayer${index + 1}`);
      if (!targetSpecialDiv) return;
      if (thePaddle.special == null) {
        targetSpecialDiv.style.display = "none";
      } else {
        targetSpecialDiv.style.display = "block";
        console.log(" 8888  thePaddle.special.name = ", thePaddle.special.name);
        targetSpecialDiv.innerHTML = getSpecialIcon(thePaddle.special.id);
      }
    });
  }

  registerKeyboardInput();
  console.log(` 999 THE CONTROLLER IS ${controller}`);
  const backBtn = document.getElementById("pongBackLib");
  if (backBtn) backBtn.style.display = "none";

  if (controller >= 0) {
    if (theMatch.classicMode) {
      console.log(`classicMode was set, setCam 0 `);
      setCameraView(getScene(), 0);
    } else {
      console.log(
        `camWasSet => controller = ${controller}, setting view ${
          (controller % 2) + 1
        }`
      );
      console.log(`roomState.currentCam = `, roomState.currentCam);

      if (
        roomState.currentCam == undefined ||
        roomState.currentCam == 3 ||
        !roomState.camWasSet ||
        roomState.msPayloadCount == 0
      ) {
        roomState.camWasSet = true;
        setCameraView(getScene(), (controller % 2) + 1);
        console.log(` camWasSet was FALSE , do the  setting`);
      } else {
        console.log(` camWasSet was true , skip setting`);
      }
    }
  } else {
    console.log("setting guest view");
    setCameraView(getScene(), 3);
    if (backBtn) backBtn.style.display = "block";

    roomState.camWasSet = true;
  }
  roomState.msPayloadCount++;

  console.log("888HERE???");
  checkMatchStartCountdown(theMatch);

  if (theMatch.matchStatus == "OVER") {
    console.log(`mathc is over`);
    return setMatchIsOver(theMatch);
  }

  if (theMatch.matchStatus == "CREATED") {
    console.log("show match settings");
    return showSelector(".match-setting", "flex");
  }
  if (theMatch.matchStatus != "IN_PROGRESS" && theMatch.matchStatus != "OVER") {
    console.log("match has yet to started");
    return;
  }
  hideSelector(".match-setting");
  runRenderLoop();
  setGamePlay(theMatch.gamePlay);
};

export {
  roomUiHandler,
  setupRoomFromMatch,
  cleanupClientRoom,
  setMatch,
  setRoomMode,
  emitEvent,
  // isHost,
  // isGuest,
  newHumanBadge,
  newAiBadge,
  newGuestBadge,
  removeGuestBadge,
  guestSocketJoinTheRoom,
  keyListenerHanlder,
  // camWasSet ,
  // setCamWasSetup,
  dragHandler,
  setGamePlay,
  roomState,
};
export default roomUiHandler;
