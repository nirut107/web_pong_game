import { loadMenu } from "./createroom.ts";
import { fetchProfile } from "./profile.ts";
import { loadLoginPage } from "./login.ts";
import { translatePage } from "./translate.ts";
import { loadGameLibrary, loadProfile, fetchHtmlFileManage } from "./manage.js";
import { fetchRoomlist, joinRoomCoderush } from "./createroom.ts";
import { joinGameCoderush } from "./coderushgame.ts";
import { startLivechat } from "./liveChat.ts";
import { generateTournament } from "./tournament.ts";
import {
  pongLobbyEventHandlers,
  pongRoomEventHandlers,
  sharedSocketHandler,
} from "./pongSocketHandler.ts";
import { pongSocketService } from "./services.ts";
import { lobbyUiHandler, roomSocketHandler } from "./pongLobby.ts";
import { getCurrentUser } from "./util.ts";

import { loadGamePage } from "./pongSetupBabylon.ts";
import roomUiHandler from "./pongRoomUi.ts";
import { User } from "./friendlist.ts";

export interface Data {
  id: number;
  username: string;
}

export interface Route {
  file: string;
  id: string;
  callback: () => void;
}

export interface DynamicRoute {
  file: string;
  id: string;
  paramIndex: number;
  callback: (param: string) => void;
}

interface RefreshToken {
  token: string;
}

type DynamicRoutes = Record<string, DynamicRoute>;

type Routes = Record<string, Route>;

let userInfo: User = {} as User;
let dataUser: Data = {} as Data;
let token: any = null;

async function fetchUserUID() {
  token = localStorage.getItem("token");
  if (!token) {
    return;
  }
  const response = await fetch("/api/v1/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  console.log("data of user", data);
  return data;
}

const routes: Routes = {
  "/": {
    file: "/profile.html",
    id: "content",
    callback: () => loadProfile(),
  },
  "/gamelibrary": {
    file: "/Gamelibrary.html",
    id: "content",
    callback: () => {
      const pongSocket = pongSocketService.getSocket();
      sharedSocketHandler(pongSocket);
      loadGameLibrary();
    },
  },

  // done-ish
  "/pongLobby": {
    file: "/pongLobby.html",
    id: "content",
    callback: () => {
      const pongSocket = pongSocketService.getSocket();
      lobbyUiHandler();
      pongLobbyEventHandlers();
      pongSocket.emit("user-join-room", {
        user: getCurrentUser(),
        roomId: "lobby",
      });
      pongSocket.emit("room-list");
    },
  },
  "/coderush/mode": {
    file: "/menu.html",
    id: "content",
    callback: () => loadMenu("coderush"),
  },
  "/coderush/roomlist": {
    file: "/roomView.html",
    id: "content",
    callback: () => fetchRoomlist(),
  },
  "/login": {
    file: "/login.html",
    id: "content",
    callback: () => loadLoginPage(),
  },
  "/tournament": {
    file: "/tournament.html",
    id: "content",
    callback: () => generateTournament(),
  },
};

const dynamicRoutes: DynamicRoutes = {
  "/coderush/room_": {
    file: "/inRoomView.html",
    id: "content",
    paramIndex: 2,
    callback: (id: string) => joinRoomCoderush(id),
  },
  "/coderush/gameplay/": {
    file: "/gametype.html",
    id: "content",
    paramIndex: 3,
    callback: (id: string) => joinGameCoderush(id),
  },
  "/pong/": {
    file: "/pongTemplate.html",
    id: "content",
    paramIndex: 2,
    callback: async (id: string) => {
      const path = window.location.pathname;
      console.log(
        ` 777 - ROUTE - dynamic route /pong/ being called with id  ${id}`
      );
      console.log(` 777 - getRoomId = `, id);
      const header = document.getElementById("header") as HTMLElement;
      if (header) {
        header.style.display = "none";
      }
      const pongSocket = pongSocketService.getSocket();
      pongSocket.emit("user-join-room", {
        user: getCurrentUser(),
        roomId: id,
      });
      pongRoomEventHandlers();

      console.log(" MOVED FROM LISTENER INTO DYNAMIC ROUTE CALLBACK");
      pongSocket.emit("join-match", {
        roomId: id,
        user: getCurrentUser(),
      });
      pongSocket.emit("get-players-in-room", {
        roomId: id,
      });

      console.warn(` 20:21 - sharedSocketHandler `);
      sharedSocketHandler(pongSocket);
      console.warn(` 20:21 - roomSocketHandler `);
      roomSocketHandler(pongSocket);
      console.warn(` 20:21 - roomUiHandler `);

      roomUiHandler(path);

      await loadGamePage();
    },
  },
};

function checkMatchRoute(path: string) {
  for (const routePath in dynamicRoutes) {
    if (path.startsWith(routePath)) {
      return dynamicRoutes[routePath];
    }
  }
  console.log(`no route ${path}`);
}

async function checkDynamicRoute(path: string) {
  const route = checkMatchRoute(path);
  if (!route) {
    navigateTo("/");
    return;
  }
  try {
    await fetchHtmlFileManage(route.file, route.id);
    const param = path.split("/");
    console.log("param", param, route);
    route.callback(param[route.paramIndex]);
    translatePage();
    history.pushState({ path }, "", path);
  } catch (err) {
    console.error("Navigation error:", err);
  }
}

export async function navigateBack(path: string) {
  const route = routes[path];
  const header = document.getElementById("header") as HTMLElement;
  if (header) {
    header.style.display = "flex";
  }
  if (!route) {
    checkDynamicRoute(path);
    return;
  }
  try {
    await fetchHtmlFileManage(routes[path].file, routes[path].id);
    route.callback();
  } catch (err) {
    console.error("Navigation error:", err);
  }
}

export async function checkRoute(current: string) {
  dataUser = await fetchUserUID();
  console.log("dataUser", dataUser);
  if (!dataUser) {
    navigateTo("/login");
    return;
  }
  userInfo = await fetchProfile(dataUser.id, dataUser.username);
  console.log("sucess load userInfo", userInfo);
  if (!userInfo) {
    navigateTo("/login");
    return;
  }
  localStorage.setItem("language", userInfo.language);
  startLivechat(dataUser);
  console.log(userInfo);
  const settingBtn = document.getElementById("settingBtn") as HTMLElement;
  settingBtn.style.display = "flex";
  navigateTo(current);
}

export async function navigateTo(path: string) {
  console.log("navigateto", path);

  console.log("check dataUser and userInfo", dataUser, userInfo);
  token = localStorage.getItem("token");

  if (isTokenExpired(token)) {
    console.log("refeshToken");
    try {
      const response = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          refreshToken: localStorage.getItem("refreshToken"),
        }),
      });
      console.log(response);
      if (response.ok) {
        const data: RefreshToken = await response.json();
        console.log(data);
        token = data.token;
        localStorage.setItem("token", token);
      } else {
        throw Error("refreshToken Fail");
      }
    } catch (error) {
      path = "/login";
    }
  }

  if (path != "/login" && (!dataUser || !userInfo)) {
    checkRoute(path);
  }
  const header = document.getElementById("header") as HTMLElement;
  if (header) {
    header.style.display = "flex";
  }
  const route = routes[path];
  if (!route) {
    checkDynamicRoute(path);
    return;
  }
  try {
    await fetchHtmlFileManage(routes[path].file, routes[path].id);
    route.callback();
    translatePage();
    history.pushState({ path }, "", path);
  } catch (err) {
    console.error("Navigation error:", err);
  }
}
export async function updateUserInfo() {
  userInfo = await fetchProfile(dataUser.id, dataUser.username);
  if (!userInfo) {
    navigateTo("/login");
    return;
  }
}

function isTokenExpired(token: string | null): boolean {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    console.log("exp now", payload.exp, currentTime);
    const timeLeft = Math.floor((payload.exp - currentTime) / 60);
    console.log(`Token will expire in ${timeLeft} minute(s).`);

    return payload.exp < currentTime;
  } catch (e) {
    console.error("Invalid token", e);
    return true;
  }
}

export { dataUser, userInfo, token };
