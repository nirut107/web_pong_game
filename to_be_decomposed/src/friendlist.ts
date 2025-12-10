import { sentPrivateMessage } from "./liveChat";
import { fetchHtmlFileManage, loadProfile } from "./manage.ts";
import { userInfo, dataUser } from "./route.ts";
import { translatePage, translateWord } from "./translate.ts";
import { showNotification } from "./manage.ts";

export interface FriendList {
  id: number;
  userId: number;
  username: string;
  avatarUrl: string;
  relationship: string;
  displayName: string;
  onlineStatus: string;
}

export interface BlockedUser {
  blocked_id: number;
}

export interface BlocklistResponse {
  success: boolean;
  blocklist: BlockedUser[];
}

export interface User {
  avatarUrl: string;
  bio: string;
  displayName: string;
  id: number;
  status: string;
  userId: number;
  language: string;
}

export interface UserInfo {
  displayName: string;
  avatarUrl: string;
  status: string;
}

interface FriendRequest {
  id: number;
  userId: number;
  displayName: string;
  avatarUrl: string;
}

let friends: FriendList[] = [];
let requestfriendlist: FriendRequest[];

async function fetchProfile(userId: number) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }
    const res = await fetch(`/api/v1/users/${userId}/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch profile");
    }
    const profile = await res.json();
    return profile;
  } catch (err: any) {
    return null;
  }
}

async function performSearch() {
  const id = (document.getElementById("searchInput") as HTMLInputElement).value;

  let profile: UserInfo = await fetchProfile(Number(id));
  console.log("search", profile);
  let result = document.getElementById("searchResults") as HTMLElement;
  result.textContent = "";
  result.style.marginTop = "20px";
  const card = document.createElement("div");
  card.classList.add("friend-card");
  if (
    !profile ||
    !profile.avatarUrl ||
    !profile.displayName ||
    !profile.status
  ) {
    card.innerHTML = `<div>${translateWord("nouser")}</div>`;
    result.append(card);
    return;
  }
  if (!profile.status) {
    profile.status = "online";
  }
  card.innerHTML = `
    <img src="${profile.avatarUrl}" alt="" class="friend-avatar" />
    <div class="friend-info">
      <div class="friend-name" id="nameoffind"></div>
      <div class="friend-status ${
        profile.status.toLowerCase().includes("online")
          ? "status-online"
          : "status-offline"
      }">${profile.status}</div>
    </div>
<div class="addfriend" id="addfriendbtnonfind"></div>
  `;

  result.appendChild(card);
  const name = document.getElementById("nameoffind") as HTMLElement;
  const addfriend = document.getElementById(
    "addfriendbtnonfind"
  ) as HTMLElement;
  name.textContent = profile.displayName;
  if (id == dataUser.id.toString()) {
    addfriend.style.display = "none";
    return;
  }

  console.log(friends);
  if (friends.find((friend) => friend.userId.toString() == id)) {
    addfriend.style.background = `url("/image/befriend.png")`;
    addfriend.style.backgroundRepeat = "no-repeat";
    addfriend.style.backgroundSize = "cover";
    addfriend.style.cursor = "default";
    addfriend.title = "already be friend";
    return;
  }
  if (requestfriendlist.find((friend) => friend.userId.toString() == id)) {
    addfriend.style.background = `url("/image/added.png")`;
    addfriend.style.cursor = "default";
    addfriend.style.backgroundRepeat = "no-repeat";
    addfriend.style.backgroundSize = "cover";
    return;
  }
  addfriend.classList.add("addfriendbtn");
  addfriend.onclick = async () => {
    addfriend.style.background = `url("/image/added.png")`;
    addfriend.style.backgroundRepeat = "no-repeat";
    addfriend.style.backgroundSize = "cover";
    addfriend.style.cursor = "default";
    addfriend.onclick = () => {};
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }
    const res = await fetch("/api/v1/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    let uid = await res.json();
    if (!uid) return;

    const response = await fetch("/api/v1/users/friend-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        senderId: uid.id,
        receiverId: id,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log("Friend added successfully:", data);
    } else {
      console.error("Error adding friend:", data.message);
    }
  };
}

export async function fetchFriends() {
  await fetchHtmlFileManage("/friend.html", "friend-content");

  // <====================    search-friend-btn  ====================>

  const searchfriend = document.getElementById(
    "search-friend-btn"
  ) as HTMLButtonElement;
  if (searchfriend) {
    searchfriend.onclick = () => {
      console.log("click");
      const model = document.getElementById("searchfriend") as HTMLElement;
      model.style.display = "flex";
      const input = document.getElementById("searchInput") as HTMLInputElement;
      input.value = "";
      (document.getElementById("searchResults") as HTMLElement).innerHTML = "";
      const close = document.getElementById(
        "close-search-btn"
      ) as HTMLButtonElement;
      if (close) {
        close.onclick = () => {
          closeModal("searchfriend");
        };
      }
      model.onclick = (event) => {
        if (event.target === model) {
          console.log("close");
          closeModal("searchfriend");
        }
      };
      const trySearch = document.getElementById(
        "performSearch"
      ) as HTMLButtonElement;
      trySearch.onclick = () => {
        performSearch();
        input.value = "";
      };
    };
  }

  // <================ friend request =====================>
  const requestfriend = document.getElementById("reqfriend") as HTMLElement;
  const modals = document.getElementById("friendrequest") as HTMLElement;
  requestfriendlist = await fetch(
    `/api/v1/users/${dataUser.id}/friend-requests`
  ).then((res) => res.json());
  let numreq = document.getElementById("req-notification") as HTMLElement;
  if (requestfriendlist.length > 0) {
    numreq.textContent = requestfriendlist.length.toString();
  } else {
    numreq.style.display = "none";
  }
  requestfriend.onclick = () => {
    if (!modals) {
      console.error("Modal not found");
      return;
    }
    modals.style.display = "flex";
    const canclereq = document.getElementById(
      "closerequestbtn"
    ) as HTMLButtonElement;
    canclereq.onclick = () => {
      closeModal("friendrequest");
    };
    modals.onclick = (event: MouseEvent) => {
      if (event.target === modals) {
        closeModal("friendrequest");
      }
    };

    const container = document.querySelector(
      ".friendrequestlist"
    ) as HTMLElement;
    container.innerHTML = "";
    const card = document.createElement("div");
    card.classList.add("friend-card");
    if (requestfriendlist.length == 0) {
      card.textContent = "No freind request";
      card.classList.add("tsl");
      card.setAttribute("data-tsl", "nofriendreq");
      card.style.cursor = card.style.cursor = "default";
      container.appendChild(card);
      translatePage();
      return;
    }
    requestfriendlist.forEach((request, index) => {
      const card = document.createElement("div");
      card.classList.add("friend-card");
      card.setAttribute("data-index", index.toString());

      const avatar = document.createElement("img");
      avatar.src = request.avatarUrl;
      avatar.alt = "";
      avatar.classList.add("friend-avatar");
      card.appendChild(avatar);

      const info = document.createElement("div");
      info.classList.add("friend-info");

      const name = document.createElement("div");
      name.classList.add("friend-name");
      name.textContent = request.displayName;

      info.appendChild(name);
      card.appendChild(info);

      const actions = document.createElement("div");
      actions.classList.add("friend-actions");

      const acceptBtn = document.createElement("button");
      acceptBtn.classList.add("accept-btn","btnr", "tsl");
      acceptBtn.setAttribute("data-tsl", "Accept")
      acceptBtn.textContent = translateWord("Accept");
      acceptBtn.style.padding = "5px";
      acceptBtn.style.marginRight = "5px";
      acceptBtn.onclick = async () => {
        try {
          const res = await fetch(
            `/api/v1/users/friend-requests/${request.id}/accept`,
            {
              method: "POST",
            }
          );

          if (res.ok) {
            card.remove();
            fetchFriendlist();
            requestfriendlist = await fetch(
              `/api/v1/users/${dataUser.id}/friend-requests`
            ).then((res) => res.json());
            if (requestfriendlist.length > 0) {
              numreq.textContent = requestfriendlist.length.toString();
            } else {
              numreq.style.display = "none";
            }
          } else {
            console.error("Failed to accept request:", await res.text());
          }
        } catch (error) {
          console.log(error);
        }
      };

      const denyBtn = document.createElement("button");
      denyBtn.classList.add("deny-btn","btnr","tsl");
      denyBtn.setAttribute("data-tsl", "Deny")
      denyBtn.textContent = translateWord("Deny");
      denyBtn.style.padding = "5px";
      denyBtn.onclick = async () => {
        try {
          const res = await fetch(
            `/api/v1/users/friend-requests/${request.id}`,
            {
              method: "DELETE",
            }
          );

          if (res.ok) {
            card.remove();
            requestfriendlist = await fetch(
              `/api/v1/users/${dataUser.id}/friend-requests`
            ).then((res) => res.json());
            if (requestfriendlist.length > 0) {
              numreq.textContent = requestfriendlist.length.toString();
            } else {
              numreq.style.display = "none";
            }
          } else {
            console.error("Failed to accept request:", await res.text());
          }
        } catch (error) {
          console.log(error);
        }
      };

      actions.appendChild(acceptBtn);
      actions.appendChild(denyBtn);
      card.appendChild(actions);
      container.appendChild(card);
    });
  };

  // <================ private chat ================ >
  let numunread = document.getElementById("chat-notification") as HTMLElement;
  const token = localStorage.getItem("token");
  if (!token) {
    return;
  }
  const res = await fetch("/api/v1/messages/unread/count", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const allunread = await res.json();
  console.log(allunread);
  let unread = allunread.count;
  if (unread != 0) {
    numunread.style.background = "red";
    numunread.textContent = unread.toString();
  } else {
    numunread.style.background = "";
  }

  // <================  friend list =================>
  async function fetchFriendlist() {
    try {
      const response = await fetch(`/api/v1/users/${dataUser.id}/friends`);

      friends = await response.json();
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
      const friendsContainer = document.querySelector(
        ".friends"
      ) as HTMLElement;
      friendsContainer.textContent = "";
      console.log("friend", friends, dataUser.id);
      if (!friends || !Array.isArray(friends) || friends.length === 0) {
        const card = document.createElement("div");
        card.textContent = "No Friend";
        card.classList.add("tsl");
        card.setAttribute("data-tsl", "nofriend");
        card.style.alignSelf = "center";
        friendsContainer.appendChild(card);
        translatePage();
        return;
      }
      if (!friendsContainer) return;
      friendsContainer.innerHTML = "";

      friends.forEach((friend: FriendList, index) => {
        const card = document.createElement("div");
        card.classList.add("friend-card");
        card.setAttribute("data-index", index.toString());
        card.onclick = () => openFriendModal(friend.userId, userInfo);

        const avatar = document.createElement("img");
        avatar.src = friend.avatarUrl;
        avatar.alt = "";
        avatar.classList.add("friend-avatar");

        const info = document.createElement("div");
        info.classList.add("friend-info");

        const name = document.createElement("div");
        name.classList.add("friend-name");
        name.id = "friendname";
        name.textContent = friend.displayName;

        const status = document.createElement("div");

        const statusClass = friend.onlineStatus.toLowerCase().includes("online")
          ? "status-online"
          : "status-offline";
        status.classList.add("friend-status", statusClass, "tsl");
        status.textContent = friend.onlineStatus;
        status.setAttribute("data-tsl", friend.onlineStatus);

        info.appendChild(name);
        info.appendChild(status);
        card.appendChild(avatar);
        card.appendChild(info);
        friendsContainer.appendChild(card);
      });
      translatePage();
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  }
  fetchFriendlist();
}

async function openFriendModal(id: number, profile: User) {
  console.log("2", profile);
  const token = localStorage.getItem("token");
  if (!token) {
    return;
  }
  const res = await fetch(`/api/v1/users/${id}/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const friend: User = await res.json();
  (document.getElementById("friendModalImage") as HTMLImageElement).src =
    friend.avatarUrl;
  (document.getElementById("friendModalName") as HTMLElement).textContent =
    friend.displayName;
  (document.getElementById("friendModalStatus") as HTMLElement).textContent =
    friend.status;
  (document.getElementById("friendModalBio") as HTMLElement).textContent =
    friend.bio ?? "No bio provided.";
  (document.getElementById("cancelfriendModal") as HTMLButtonElement).onclick =
    () => {
      closeModal("friendModal");
    };
  const blockfriend = document.getElementById(
    "blockfriendbtn"
  ) as HTMLButtonElement;
  blockfriend.onclick = async () => {
    showNotification(
      "Are you sure you want to block this user?\nThey won't be able to message or interact with you anymore.",
      [
        {
          text: "Cancel",
          onClick: () => console.log("User chose not to block."),
          datatsl: "cancel",
        },
        {
          text: "Block",
          onClick: async () => {
            console.log("User confirmed block.");
            await fetch("/api/v1/chat/blocklist", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                blockedId: friend.userId,
              }),
            });
            loadProfile();
          },
          danger: true,
          datatsl: "block",
        },
      ],
      "notiBlock"
    );
  };
  const modal = document.getElementById("friendModal") as HTMLElement;
  modal.style.display = "flex";

  modal.onclick = (event: MouseEvent) => {
    if (event.target === modal) {
      closeModal("friendModal");
    }
  };
  const sentmsg = document.getElementById(
    "send-button-friend"
  ) as HTMLButtonElement;
  const msg = document.getElementById(
    "message-input-friend"
  ) as HTMLInputElement;
  sentmsg.onclick = () => {
    const message = msg.value.trim();
    if (!message) return;
    console.log("send-button-friend", id);
    sentPrivateMessage(message, id, profile.avatarUrl);
    msg.value = "";
  };
  msg.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const message = msg.value.trim();
      if (!message) return;
      console.log("send-button-friend", id);
      sentPrivateMessage(message, id, profile.avatarUrl);
      msg.value = "";
    }
  });
}
function closeModal(modalId: string) {
  (document.getElementById(modalId) as HTMLElement).style.display = "none";
}

export { friends };
