import { fetchProfileInfo, updateProfile } from "./profile.ts";
import { fetchFriends, BlocklistResponse, UserInfo } from "./friendlist.ts";
import {
  checkRoute,
  navigateTo,
  navigateBack,
  token,
  userInfo,
} from "./route.ts";
import { fetchHistory } from "./dashboard_and_history.ts";
import { fetchDashboard } from "./dashboard_and_history.ts";
import { translatePage, translateWord } from "./translate.ts";
import { load2FA } from "./twofa.ts";
import { pongSocketService } from "./services.ts";
import { getCurrentUser, getUserId } from "./util.ts";
import {
  fetchProfileUser,
  getAllMessage,
  updateUserStatus,
} from "./liveChat.ts";
import GAME_CONSTANTS from "./constants.ts";
import { ExitFromTournament } from "./tournament.ts";

interface IPongActiveTournament {
  id: number;
  name: string;
  status: string;
  winner_id: number | null;
  winner_username: number | null;
  max_participants: number;
  current_participants: number;
  tournament_starts_at: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  games: any[];
}

export async function fetchHtmlFileManage(
  filePath: string,
  toId: string
): Promise<void> {
  const contentDiv = document.getElementById(toId);
  if (!contentDiv) return;
  if (toId == "content") {
    contentDiv.innerHTML = "";
    contentDiv.style.position = "";
  }
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

export async function loadProfile() {
  await fetchProfileInfo();
  await fetchFriends();
  await fetchHistory();
  await fetchDashboard();
  translatePage();
  const game_gate = document.getElementById("game-gate") as HTMLImageElement;
  game_gate.onclick = () => {
    navigateTo("/gamelibrary");
  };
}

export async function loadGameLibrary() {
  const pongSocket = pongSocketService.getSocket();
  const home = document.getElementById("HomeBtn") as HTMLButtonElement;

  pongSocket.emit("join-game-library", {
    userId: getCurrentUser()?.userId,
  });

  let activeTournament: IPongActiveTournament | null = null;
  pongSocket.on("current-tournament", (payload: any) => {
    console.log(` <== current-tournament`, payload);
    activeTournament = payload.tournament;
    console.warn(
      "in manage.ts, please use the payload.tournament to fill the HTML element in Gamelibrary.html"
    );

    const timebox = document.getElementById("notonstart") as HTMLElement;
    const started = document.getElementById("started") as HTMLElement;
    const currently = document.getElementById("currently") as HTMLElement;
    const timeStart = document.getElementById("timeStart") as HTMLElement;
    const timeJoin = document.getElementById("timejoin") as HTMLElement;
    //const utcDate = new Date(payload.tournament.tournament_starts_at);
    // - GAME_CONSTANTS.PONG_MINUTES_CLOSE_REGISTER
    //
    const tempDate = new Date(payload.tournament.tournament_starts_at);
    const utcDate = new Date(
      tempDate.getTime() +
        GAME_CONSTANTS.PONG_MINUTES_BETWEEN_TOURNAMENT_MATCHES * 60 * 1000
    );
    const localTime = utcDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // utcDate.setMinutes(utcDate.getMinutes() );
    // utcDate.setMinutes(utcDate.getMinutes());
    // const timejoin = utcDate.toLocaleTimeString([], {
    const timejoin = tempDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    console.log("MON_DEBUG   localTime = ", localTime);
    console.log("MON_DEBUG   timejoin = ", timejoin);
    const now = new Date();

    const divActiveTournament = document.getElementById(
      "divActiveTournament"
    ) as HTMLElement;

    console.log(` 8999 compare dates utcDate > now`, utcDate, now);
    const theJoinBtn = document.getElementById("btnJoinTournament");
    const theParts = document.getElementById("divParts");

    if (tempDate > now) {
      console.log("MON_DEBUG - TOUR CASE 1");
      divActiveTournament.textContent =
        payload.tournament.name.length > 15
          ? payload.tournament.name.slice(0, 20) + "..."
          : payload.tournament.name;
      timeStart.textContent = localTime;
      timeJoin.textContent = timejoin;
      if (theJoinBtn) theJoinBtn.style.visibility = "visible";
      if (theParts) theParts.style.visibility = "visible";
    } else {
      console.log("MON_DEBUG - TOUR CASE 2");
      if (started) {
        started.style.display = "flex";
        timebox.style.display = "none";
      }

      if (theJoinBtn) theJoinBtn.style.visibility = "hidden";
      if (theParts) theParts.style.visibility = "hidden";
    }

    if (currently && payload?.tournament?.max_participants)
      currently.textContent = `${payload.tournament.current_participants} / ${payload.tournament.max_participants}`;
    else if (currently) {
      currently.textContent = `-`;
    }
  });

  const octopus = document.getElementById("otp") as HTMLImageElement;
  if (octopus) {
    octopus.onclick = () => {
      octopus.src = "/image/pink-cute.gif";
      octopus.classList.remove("otp-jump");

      void octopus.offsetWidth;

      octopus.classList.add("otp-jump");
    };
  }
  if (home) {
    home.onclick = async () => {
      await navigateTo("/");
    };
  }
  console.log("gramelibrary");
  const loader = document.getElementById("cloud");
  if (loader) {
    setTimeout(() => {
      loader.classList.add("fade-out");
    }, 500);
  }
  const PingPongGame = document.getElementById(
    "pongGameBtn"
  ) as HTMLButtonElement;
  const TypeGame = document.getElementById("typeGameBtn") as HTMLButtonElement;
  if (PingPongGame) {
    PingPongGame.onclick = async () => {
      await navigateTo("/pongLobby");
    };
  }
  if (TypeGame) {
    TypeGame.onclick = async () => {
      await navigateTo("/coderush/mode");
    };
  }

  const tournament = document.getElementById(
    "tournamentBtn"
  ) as HTMLButtonElement;
  if (tournament) {
    tournament.onclick = async () => {
      await navigateTo("/tournament");
    };
  }

  const joinTournamentBtn = document.getElementById("btnJoinTournament");
  if (joinTournamentBtn) {
    joinTournamentBtn.addEventListener("click", () => {
      console.log("btnJoinTournament is being clicked");
      console.log(
        ` activeTournament , listened `,
        activeTournament,
        joinTournamentBtn.getAttribute("listened")
      );
      if (
        activeTournament &&
        joinTournamentBtn.getAttribute("listened") == undefined
      ) {
        console.log(` emitting join-tournament event to server with payload `);
        pongSocket.emit("join-tournament", {
          userId: getUserId(),
          tournamentId: activeTournament.id,
        });
        joinTournamentBtn.setAttribute("listened", "1");
      } else {
        console.log(" activeTournament was empty???");
      }
    });
  }

  const createTournamentBtn = document.getElementById("btnCreateTournament");
  if (
    createTournamentBtn &&
    createTournamentBtn.getAttribute("listened") == undefined
  ) {
    createTournamentBtn.addEventListener("click", () => {
      console.log("create-tournament");
      pongSocket.emit("create-tournament", {});
    });
    createTournamentBtn.setAttribute("listened", "1");
  }
}

export async function managedload2FA() {
  load2FA();
}

export type ModalButton = {
  text: string;
  onClick: () => void;
  danger?: boolean;
  datatsl: string;
};

export async function showNotification(
  message: string,
  buttons: ModalButton[],
  datatsl: string
) {
  const modal = document.getElementById("notification-modal")!;
  const messageDiv = document.getElementById("modal-message")!;
  const buttonsDiv = document.getElementById("modal-buttons")!;

  console.log(message, datatsl);
  messageDiv.textContent = message;
  messageDiv.setAttribute("data-tsl", datatsl);
  buttonsDiv.innerHTML = "";

  buttons.forEach(({ text, onClick, danger, datatsl }) => {
    const btn = document.createElement("button");
    btn.classList.add("tsl");
    btn.setAttribute("data-tsl", datatsl);
    btn.textContent = text;
    btn.onclick = () => {
      hideModal();
      onClick();
    };
    if (danger) btn.classList.add("danger");
    buttonsDiv.appendChild(btn);
  });

  modal.classList.remove("hidden");
  translatePage();
}

function hideModal() {
  document.getElementById("notification-modal")!.classList.add("hidden");
}

window.addEventListener("DOMContentLoaded", async () => {
  const current = window.location.pathname;
  await checkRoute(current);
});

window.addEventListener("popstate", async () => {
  const current = window.location.pathname;
  navigateBack(current);
});

const logoBtn = document.getElementById("logoBtn") as HTMLButtonElement;
if (!logoBtn) {
  console.error("logoBtn not found");
} else {
  if (window.location.pathname != "/login") {
    logoBtn.onclick = async () => {
      ExitFromTournament();
      await navigateTo("/");
    };
  }
}

// async function updateUserStatus(status: string) {
//   try {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       return;
//     }
//     console.log(token);
//     await fetch(`/api/v1/users/${userInfo.userId}/status`, {
//       method: "PUT",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify({ status }),
//     });
//   } catch (error) {
//     console.error("Status update error:", error);
//   }
// }

const setting = document.getElementById("settingBtn") as HTMLButtonElement;
const box = document.getElementById("boxSetting") as HTMLButtonElement;
const logout = document.getElementById("logoutBtn") as HTMLButtonElement;
const settingbox = document.getElementById("settingbox") as HTMLButtonElement;
const blocklistBtn = document.getElementById(
  "blocklist-btn"
) as HTMLButtonElement;
const changelang = document.getElementById(
  "changelang-btn"
) as HTMLButtonElement;
// const changelangBtns = document.getElementsByClassName("changelang-btn");

setting.addEventListener("mouseenter", () => {
  console.log(` WED_DEBUG mouseenter event`);
  settingbox.style.display = "flex";

  box.addEventListener("mouseenter", () => {
    settingbox.style.display = "flex";
    // settingbox.classList.remove('hidden')
    setting.style.animation = "spin 2s linear infinite";
  });
});
box.addEventListener("mouseleave", () => {
  settingbox.style.display = "none";
  // settingbox.classList.add('hidden')
  setting.style.animation = "";
  langModal.classList.remove("show");
});

settingbox.addEventListener("mouseenter", () => {
  settingbox.style.display = "flex";
  setting.style.animation = "spin 2s linear infinite";
});

settingbox.addEventListener("mouseleave", () => {
  settingbox.style.display = "none";
  setting.style.animation = "";
  langModal.style.display = "none";
  langModal.classList.remove("show");
});

logout.onclick = async () => {
  await updateUserStatus("offline");
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userUID");
  localStorage.setItem("language", "en");

  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie =
    "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "userUID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  settingbox.style.display = "none";
  logout.style.display = "none";
  logout.style.display = "";
  navigateTo("/login");
};

const langModal = document.getElementById("langModal") as HTMLElement;

changelang.addEventListener("click", () => {
  console.log("changelang");
  langModal.style.display = "flex";
  settingbox.style.display = "flex";
  setting.style.animation = "spin 2s linear infinite";
});

langModal.addEventListener("mouseenter", () => {
  settingbox.style.display = "flex";
  setting.style.animation = "spin 2s linear infinite";
  langModal.style.display = "flex";
});
langModal.addEventListener("mouseleave", () => {
  settingbox.style.display = "none";
  setting.style.animation = "";
  langModal.style.display = "none";
  langModal.classList.remove("show");
});
langModal.addEventListener("click", (e: MouseEvent) => {
  const target = e.target as HTMLElement;

  if (target.tagName === "LI") {
    const selectedLang = target.getAttribute("data-lang");
    if (selectedLang) {
      updateProfile(userInfo.userId, { language: selectedLang });
      localStorage.setItem("language", selectedLang);
      settingbox.style.display = "none";
      setting.style.animation = "";
      langModal.style.display = "none";
      langModal.classList.remove("show");
      const path = window.location.pathname;
      getAllMessage();
      navigateTo(path);
    }
  }
});

const setup2fa = document.getElementById("setup-2fa-btn") as HTMLButtonElement;
setup2fa.onclick = () => {
  managedload2FA();
};

const blockModal = document.getElementById("blockModal") as HTMLElement;
blocklistBtn.onclick = async () => {
  let change: boolean = false;
  const res = await fetch("/api/v1/chat/blocklist", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const blocklists: BlocklistResponse = await res.json();
  const blocklistcancel = document.getElementById(
    "btn-blocklistcancel"
  ) as HTMLButtonElement;
  blockModal.style.display = "flex";
  blocklistcancel.onclick = () => {
    blockModal.style.display = "none";
    if (change) {
      loadProfile();
    }
  };
  document.addEventListener("click", (event: MouseEvent) => {
    if (event.target === blockModal) {
      blockModal.style.display = "none";
      if (change) {
        loadProfile();
      }
    }
  });
  let result = document.getElementById("blocklist-list") as HTMLElement;
  result.textContent = "";
  if (blocklists.blocklist.length == 0) {
    const card = document.createElement("div");
    card.classList.add("friend-card", "tsl");
    card.innerHTML = `<div>${translateWord("noBlock")}</div>`;
    result.append(card);
    return;
  }

  blocklists.blocklist.forEach(async (block) => {
    let profile: UserInfo = await fetchProfileUser(block.blocked_id);
    console.log("search", profile);
    const card = document.createElement("div");
    card.classList.add("block-card");
    card.innerHTML = `
  
  <div style="display: flex; gap: 15px;">
  <img src="${profile.avatarUrl}" alt="" class="friend-avatar" />
  <div>
    <div  id="${profile.displayName}"></div>
    <div class="friend-status tsl ${
      profile.status.toLowerCase().includes("online")
        ? "status-online"
        : "status-offline"
    }" data-tsl="${profile.status}">${profile.status}</div>
    </div>
  </div>
<button class="btnr tsl" data-tsl="unblock" id="${
      "unBlock" + profile.displayName
    }" style="background-color: red;">Unblock</button>
`;
    result.appendChild(card);
    translatePage();
    const name = document.getElementById(
      `${profile.displayName}`
    ) as HTMLElement;
    name.textContent = profile.displayName;
    const unblock = document.getElementById(
      `${"unBlock" + profile.displayName}`
    ) as HTMLButtonElement;
    unblock.onclick = async () => {
      try {
        await fetch(`/api/v1/chat/blocklist/${block.blocked_id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.log(err);
      }
      card.style.display = "none";
      change = true;
    };
  });
  translatePage();
};
// <============== delete account ===================>
const deleteBtn = document.getElementById("deleteBtn") as HTMLButtonElement;

deleteBtn.onclick = async () => {
  showNotification(
    "This action will permanently deactivate the account.\nAre you sure you sure to delete it?",
    [
      {
        text: "Cancel",
        onClick: () => console.log("Ar"),
        datatsl: "cancel",
      },
      {
        text: "Yes",
        onClick: async () => {
          deleteaccount();
        },
        danger: true,
        datatsl: "delete",
      },
    ],
    "sureToDel"
  );
};
async function deleteaccount() {
  try {
    let res = await fetch(`/api/v1/auth/deleteaccount/${userInfo.userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("delete auth service", res);
    res = await fetch(`/api/v1/users/${userInfo.userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("delete user service", res);
    res = await fetch(`/api/v1/analytics/metrics/${userInfo.userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("delete analytics service", res);
    await updateUserStatus("offline");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userUID");

    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie =
      "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie =
      "userUID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    settingbox.style.display = "none";
    logout.style.display = "none";
    logout.style.display = "";
    navigateTo("/login");
  } catch (err) {
    console.error(err);
  }
  console.log("detele acc here");
}
