import { startSinglePlay } from "./coderushgame.ts";
import { socketService } from "./services";
import { sentPrivateMessage } from "./liveChat";
import { userInfo, navigateTo, token } from "./route.ts";
import { dict, translatePage } from "./translate.ts";
import { showNotification } from "./manage.ts";
import { FriendList, BlocklistResponse } from "./friendlist.ts";
import { ta } from "date-fns/locale";

type RoomList = {
  [roomId: string]: inRommList;
};

type inRommList = {
  gameName: string;
  username: string[];
  users: string[];
};

async function fetchFriendlist(id: number) {
  try {
    const response = await fetch(`/api/v1/users/${id}/friends`);
    let friends: FriendList[] = await response.json();
    const res = await fetch("/api/v1/chat/blocklist", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const blocklists: BlocklistResponse = await res.json();
    friends = friends.filter(
      (friend) =>
        !blocklists.blocklist.some(
          (blocked) => blocked.blocked_id === friend.userId
        )
    );
    const friendsContainer = document.getElementById(
      "invitfriend"
    ) as HTMLElement;
    friendsContainer.style.display = "flex";
    friendsContainer.style.flexDirection = "column";
    friendsContainer.textContent = "";
    if (!friends || !Array.isArray(friends) || friends.length === 0) {
      const card = document.createElement("div");
      card.classList.add("invitfriend-card", "friend-card");
      card.textContent = "No Friend";
      card.style.cursor = "default";
      friendsContainer.appendChild(card);
      return;
    }
    if (!friendsContainer) return;
    friendsContainer.innerHTML = "";

    friends.forEach((friend: FriendList, index) => {
      const card = document.createElement("div");
      card.classList.add("invitfriend-card", "friend-card");
      card.setAttribute("data-index", index.toString());

      const avatar = document.createElement("img");
      avatar.src = friend.avatarUrl;
      avatar.alt = "";
      avatar.classList.add("invitfriend-avatar");

      const info = document.createElement("div");
      info.classList.add("invitfriend-info");

      const name = document.createElement("div");
      name.classList.add("invitfriend-name");
      name.id = "friendname";
      name.textContent = friend.displayName;

      const status = document.createElement("div");
      const statusClass = friend.onlineStatus.toLowerCase().includes("online")
        ? "status-online"
        : "status-offline";
      status.classList.add("invitfriend-status", statusClass, "tsl");
      status.setAttribute("data-tsl", friend.onlineStatus);
      // status.textContent = dict[friend.onlineStatus];

      const inviteButton = document.createElement("button");
      inviteButton.classList.add("invite-button");
      inviteButton.classList.add("tsl");
      inviteButton.textContent = dict["invite"];
      inviteButton.setAttribute("data-tsl", "invite");
      inviteButton.addEventListener("click", () => {
        console.log(`Inviting ${friend.displayName} (ID: ${friend.userId})`);
        const path = location.pathname;
        // card.style.backgroundColor = "#5e5ead";
        card.classList.add("bg-sky-700");
        inviteButton.setAttribute("data-tsl", "invited");
        inviteButton.classList.remove("invite-button");
        inviteButton.classList.add("invite-button-clicked");
        inviteButton.style.border = "none";
        inviteButton.onclick = () => {
          return;
        };
        sentPrivateMessage(path, friend.userId, friend.avatarUrl);
      });

      info.appendChild(name);
      info.appendChild(status);
      card.appendChild(avatar);
      card.appendChild(info);
      card.appendChild(inviteButton);
      friendsContainer.appendChild(card);
      translatePage();
    });
  } catch (error) {
    console.error("Error fetching friends:", error);
  }
}

// <=========== for get component ===========>

async function fetchHtmlFile(filePath: string): Promise<void> {
  const contentDiv = document.getElementById("content");
  if (!contentDiv) return;

  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const htmlContent = await response.text();

    contentDiv.innerHTML = htmlContent;
  } catch (error) {
    console.error("Error fetching the HTML file:", error);
    contentDiv.innerHTML = "<p>Error loading content.</p>";
  }
}

let g_roomId: string = "";
let lastpath = window.location.pathname;
let GameName: string;
let g_gameId: number = 0;
let participant_id: number = 0;
// let username: string;
// let userUID: number;

// Use the centralized socket service
const socket = socketService.getSocket();

// <============ API to create Game =============== >
// async function createGame(player: number) {
//   const res = await fetch("http://localhost:3003/api/v1/games", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${token}`,
//     },
//     body: JSON.stringify({
//       game_type: "coderush",
//       position: null,
//       players: player,
//     }),
//   });

//   const game = await res.json();
//   return game;
// }

// Set up event handlers
socket.on("connect", () => {
  const current = window.location.pathname;

  if (current === "/pingpong/roomlist") {
    GameName = "pingpong";
    socket.emit("requestRooms", { GameName });
  }
  if (current === "/coderush/roomlist") {
    GameName = "coderush";
    socket.emit("requestRooms", { GameName });
  }
  lastpath = window.location.pathname;
});

socket.on("roomlist", (data: any) => {
  const { rooms } = data;
  updateRoomList(rooms);
});
socket.on("roomFull", async (data: any) => {
  const { rooms } = data;
  const current = window.location.pathname;
  if (current.startsWith("/coderush")) {
    showNotification(
      "The room you tried to join id Full",
      [
        {
          text: "Go back",
          onClick: () => {
            const invitfriend = document.getElementById(
              "invitfriend"
            ) as HTMLElement;
            invitfriend.style.display = "none";
            navigateTo("/");
          },
          datatsl: "goback",
        },
      ],
      "roomfull"
    );
    return;
  }
  updateRoomList(rooms);
});
socket.on("invalidRoom", async (data: any) => {
  const { rooms } = data;
  console.log("invalidroom");
  const current = window.location.pathname;
  if (current.startsWith("/coderush") || current.startsWith("/pingpong")) {
    showNotification(
      "The room you tried to join does not exist.",
      [
        {
          text: "Go back",
          onClick: () => {
            const invitfriend = document.getElementById(
              "invitfriend"
            ) as HTMLElement;
            invitfriend.style.display = "none";
            navigateTo("/");
          },
          datatsl: "goback",
        },
      ],
      "roomNotexist"
    );
    return;
  }
  updateRoomList(rooms);
});
socket.on("joinRoom", (data: any) => {
  const { userID, roomId, username } = data;
  inRoom(userID, roomId, username);
});
socket.on("leaveOldRoom", () => {
  console.log("leaveOldRoom");
  socket.emit("leaveOldRoom", { roomId: g_roomId });
});

export const loadMenu = async (game: string) => {
  GameName = game;
  const back = document.getElementById("BackBtn") as HTMLButtonElement;
  back.onclick = async () => {
    await navigateTo("/gamelibrary");
    lastpath = window.location.pathname;
  };
  document.getElementById("matchingBtn")?.addEventListener("click", () => {
    navigateTo("/coderush/roomlist");
    lastpath = window.location.pathname;
  });
  document
    .getElementById("singlePlayBtn")
    ?.addEventListener("click", startgame);
  // const bg = document.getElementById("MenuGame");

  // if (bg) {
  //   if (GameName == "coderush") {
  //     bg.style.backgroundImage = `url("/image/coderush-bg.png")`;
  //   } else {
  //     bg.style.backgroundImage = `url("/image/pong-bg.jpg")`;
  //   }
  // }
  document
    .getElementById("btncrHowToPlay")
    ?.addEventListener("click", btncrHowToPlayHandler);
};

async function startgame() {
  console.log("startclicked");
  if (GameName == "coderush") {
    // console.log("single coderush");
    // const game: Game = await createGame(1);
    // console.log(game);
    // g_gameId = game.id;
    // participant_id = await joinGame(game.id);
    startSinglePlay();
    // history.pushState(null, "", `/${GameName}/mode`);
  }
}

async function updateRoomList(rooms: RoomList) {
  let listRoomDisplay = document.getElementById("roomList");
  if (!listRoomDisplay) {
    await fetchHtmlFile("/roomView.html");
    listRoomDisplay = document.getElementById("roomList");

    const createRoomBtn = document.getElementById("createRoomBtn");
    createRoomBtn?.addEventListener("click", createRoom);

    const leaveRoomBtn = document.getElementById("leaveRoomBtn");
    leaveRoomBtn?.addEventListener("click", leaveRoomview);
    lastpath = window.location.pathname;
  }

  if (!listRoomDisplay) return;

  listRoomDisplay.innerHTML = "";
  console.log("rooms:", rooms);

  Object.keys(rooms).forEach((roomId) => {
    const li = document.createElement("li");
    li.textContent = `Room's ${rooms[roomId].username[0]}   -   ${rooms[roomId].users.length}/2 `;

    const joinButton = document.createElement("img");
    joinButton.src = "/image/join.png";
    joinButton.alt = "Join Room";
    joinButton.addEventListener("click", () => joinRoomCoderush(roomId));
    li.appendChild(joinButton);
    listRoomDisplay!.appendChild(li);
  });
}

function createRoom(): void {
  const header = document.getElementById("header") as HTMLElement;
  if (header) {
    header.style.display = "none";
  }
  socket.emit("createRoom", {
    userUID: userInfo.userId,
    GameName,
    username: userInfo.displayName,
  });
}

export async function joinRoomCoderush(roomId: string) {
  console.log("userInfo", userInfo, userInfo.userId);
  if (!userInfo.userId) return;
  socket.emit("joinRoom", {
    userUID: userInfo.userId,
    roomId,
    GameName,
    username: userInfo.displayName,
  });
}

async function inRoom(userID: number[], Id: string, usernames: string[]) {
  await fetchHtmlFile("/inRoomView.html");
  await fetchFriendlist(userInfo.userId);
  console.log("room", userID, Id);
  g_roomId = Id;
  const roomIdDisplay = document.getElementById("roomIdDisplay");

  if (roomIdDisplay) {
    roomIdDisplay.textContent = `${usernames[0]}`;
  }

  const leaveRoomBtn = document.getElementById("leaveRoomBtn");
  leaveRoomBtn?.addEventListener("click", leaveRoom);

  history.pushState(null, "", `/${GameName}/${g_roomId}`);
  updatePlayerList(userID, g_roomId, usernames);
}

async function leaveRoom() {
  console.log("leaveroom", g_roomId);
  const friendsContainer = document.getElementById(
    "invitfriend"
  ) as HTMLElement;
  friendsContainer.style.display = "none";
  socket.emit("leaveRoom", {
    roomId: g_roomId,
    userUID: userInfo.userId,
    GameName: "coderush",
  });
  navigateTo("/coderush/roomlist");
  lastpath = window.location.pathname;
}

async function leaveRoomview() {
  await navigateTo("/coderush/mode");
  lastpath = window.location.pathname;
}

function updatePlayerList(
  players: number[],
  roomId: string,
  usernames: string[]
): void {
  const playerList = document.getElementById("playerList");
  if (!playerList) return;

  console.log("player inroom", players);
  playerList.innerHTML = "";
  playerList.textContent = "";
  usernames.forEach((name) => {
    const div = document.createElement("div");
    const li = document.createElement("div");
    const span = document.createElement("span");
    span.classList.add("tsl");
    div.classList.add("li");
    span.textContent = "player";
    span.setAttribute("data-tsl", "player");
    li.textContent = ` : ${name}`;
    div.appendChild(span);
    div.appendChild(li);
    playerList.appendChild(div);
  });

  if (players.length === 2) {
    let startButton = document.getElementById(
      "startGameButton"
    ) as HTMLImageElement | null;
    const isHost = userInfo.userId === players[0];

    if (isHost && !startButton) {
      startButton = document.createElement("img");
      startButton.id = "startGameButton";
      startButton.src = "/image/start.png";
      startButton.alt = "Start Game";
      startButton.addEventListener("click", async () => {
        console.log("clickstart");

        if (GameName == "coderush") {
          socket.emit("serverStartMultiGame", {
            allPlayer: players,
            roomId,
            allUsername: usernames,
            tokenuser: token,
          });
        }
      });

      const startbtnContainer = document.getElementById("startbtn");
      startbtnContainer?.appendChild(startButton);
    } else if (startButton) {
      startButton.style.display = isHost ? "" : "none";
    }
  }
  lastpath = window.location.pathname;
  translatePage();
}

export async function fetchRoomlist() {
  document
    .getElementById("createRoomBtn")
    ?.addEventListener("click", createRoom);
  document
    .getElementById("leaveRoomBtn")
    ?.addEventListener("click", leaveRoomview);

  socket.emit("requestRooms", { GameName });
}

window.addEventListener("popstate", () => {
  const current = window.location.pathname;
  console.log("pop", current, lastpath);
  if (lastpath === "/roomlist") {
    socket.emit("leaveRoomView", { GameName });
  }
  if (lastpath.startsWith("/coderush/room_")) {
    console.log(lastpath);
    const friendsContainer = document.getElementById(
      "invitfriend"
    ) as HTMLElement;
    friendsContainer.style.display = "none";
    socket.emit("leaveRoom", {
      roomId: g_roomId,
      userUID: userInfo.userId,
      GameName: "coderush",
    });
  }
  lastpath = current;
});

window.addEventListener("load", (event) => {
  const current = window.location.pathname;
  console.log(current, event);
  lastpath = current;
  if (current.startsWith("/room_")) {
    g_roomId = current.split("/")[1];
  }
});

const btncrHowToPlayHandler = () => {
  const theDom = document.getElementById("btncrHowToPlay") as HTMLButtonElement;
  const targetDom = document.getElementById("modalcrHowToPlay") as HTMLElement;
  if (theDom) {
    if (targetDom) {
      const currentDisplay = targetDom.style.display || "none";
      targetDom.style.display = currentDisplay == "flex" ? "none" : "flex";
    }
  }
  document.querySelectorAll(".close-modal-btn").forEach((closeBtn) => {
    closeBtn.addEventListener("click", () => {
      const modalDom = document.getElementById("modalcrHowToPlay");
      if (modalDom) {
        modalDom.style.display = "none";
      }
    })
  })
  // const theDomback = document.getElementById(
  //   "closeHowToPlay"
  // ) as HTMLButtonElement;
  // if (theDomback && targetDom) {
  //   theDomback.onclick = () => {
  //     targetDom.style.display = "none";
  //   };
  // }
  // targetDom.onclick = (event: MouseEvent) => {
  //   if (event.target === targetDom) {
  //     targetDom.style.display = "none";
  //   }
  // };
};

export { g_roomId, g_gameId, participant_id };
