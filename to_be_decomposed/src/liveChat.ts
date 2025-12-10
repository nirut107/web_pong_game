import { socketService } from "./services";
import { privateChat, ReceivedMessage } from "./privatechat";
import { checkRoute, token } from "./route.ts";
import {
  friends,
  FriendList,
  BlockedUser,
  BlocklistResponse,
  User,
} from "./friendlist.ts";
import { showNotification } from "./manage.ts";
import { navigateTo } from "./index.ts";
import { translateWord } from "./translate.ts";

const chatButton = document.getElementById("chat-button") as HTMLDivElement;
const chatModal = document.getElementById("chat-modal") as HTMLDivElement;
const chatClose = document.getElementById("chat-close") as HTMLButtonElement;
const chatForm = document.getElementById("chat-form") as HTMLFormElement;
const chatInput = document.getElementById("chat-input") as HTMLInputElement;
const chatMessages = document.getElementById("chat-messages") as HTMLDivElement;

interface Data {
  id: number;
  username: string;
}

interface Msg {
  id: number;
  participant1Id: number;
  participant2Id: number;
}

interface Message {
  id: number;
  username: string;
  message: string;
  timestamp: string;
  server: boolean;
}

interface AllMessageEvent {
  allMessages: Message[];
}

interface NewMessageEvent {
  id: number;
  message: string;
  username: string;
  server: boolean;
}

interface PrivateMessageEvent {
  fromUID: string;
  fromUsername: string;
  message: string;
  path: string | null;
  avatarUrl: string;
}

let isOpen: boolean = false;
let socket = socketService.getSocket();
let dataUser: Data;
let blocklists: BlocklistResponse;
export let isModalOpen: boolean = false;

async function init() {
  updateUserStatus("online");
}

export async function updateUserStatus(status: string) {
  try {
    await fetch(`/api/v1/users/${dataUser.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
  } catch (error) {
    console.error("Status update error:", error);
  }
  if (status == "offline" && socket.connected) {
    socket.removeAllListeners();
    socket.disconnect();
  }
}

export function getAllMessage() {
  socket.emit("getAllMessage");
}

export async function startLivechat(data: Data) {
  socket = socketService.getSocket();
  socket.connect();
  dataUser = data;
  socket.emit("joinChat", { userUID: dataUser.id });
  console.log("start live chat", dataUser);
  init();

  socket.emit("getAllMessage");

  socket.on("allMessage", async function (data: AllMessageEvent) {
    console.log("all chat", data);
    const res = await fetch("/api/v1/chat/blocklist", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    blocklists = await res.json();
    data.allMessages = data.allMessages.filter(
      (msg) =>
        !blocklists.blocklist.some(
          (blocked: BlockedUser) => blocked.blocked_id === msg.id
        )
    );
    chatMessages.textContent = "";
    chatMessages.innerHTML = "";
    data.allMessages.forEach(async (msg: Message) => {
      const divs = document.createElement("div");
      const div = document.createElement("div");
      div.classList.add("user-message");
      if (msg.server) {
        const list = msg.message.split("|");
        const head = document.createElement("span");
        head.textContent = `${translateWord(msg.username)}  :   `;
        div.appendChild(head);
        list.forEach((msg) => {
          if (msg.startsWith("/pong")) {
            const span = document.createElement("span");
            span.style.color = "green";
            span.textContent = translateWord("battle room");
            span.style.cursor = "pointer";
            console.log(msg);
            span.onclick = () => {
              checkRoute(msg);
            };

            div.appendChild(span);
          } else {
            const span = document.createElement("span");
            span.textContent = `${translateWord(msg)} `;
            div.append(span);
          }
        });
      } else {
        const users: User = await fetchProfileUser(msg.id);
        div.textContent = `${users.displayName}  :   ${msg.message}`;
        if (msg.id != dataUser.id && msg.id != 999) {
          div.onclick = () => {
            showUserDetail(msg.id);
          };
        }
      }
      divs.appendChild(div);
      chatMessages.appendChild(divs);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  });

  socket.on("newMessage", async function (data: NewMessageEvent) {
    if (
      blocklists.blocklist.some((user) => {
        user.blocked_id == data.id;
      })
    ) {
      return;
    }
    console.log("mewMessage", data);
    const divs = document.createElement("div");
    const div = document.createElement("div");
    if (data.server) {
      const list = data.message.split("|");
      const head = document.createElement("span");
      head.textContent = `${translateWord(data.username)}  :   `;
      div.appendChild(head);
      console.log("list", data);
      list.forEach(async (msg) => {
        console.log("list", msg);
        if (msg.startsWith("/pong")) {
          const span = document.createElement("span");
          span.style.color = "green";
          span.textContent = translateWord("battle room");
          span.style.cursor = "pointer";
          console.log(msg);
          span.onclick = () => {
            checkRoute(msg);
          };
          div.appendChild(span);
        } else {
          const span = document.createElement("span");
          span.textContent = `${translateWord(msg)} `;
          div.append(span);
        }
      });
      divs.classList.add("user-message");
    } else {
      const users: User = await fetchProfileUser(data.id);
      div.classList.add("user-message");
      div.textContent = `${users.displayName}  :   ${data.message}`;
      if (!data.server && data.id != dataUser.id) {
        div.onclick = () => {
          showUserDetail(data.id);
        };
      }
    }
    divs.appendChild(div);
    chatMessages.appendChild(divs);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  socket.on("receivePrivate", async function (data: PrivateMessageEvent) {
    console.log("isOpen", isOpen, data);
    if (
      blocklists.blocklist.some((user) => {
        user.blocked_id.toString() == data.fromUID;
      })
    ) {
      return;
    }
    if (isOpen) {
      await ReceivedMessage();
    } else {
      await fetchHtmlFile("/chatNotification.html", "notification");
      const modal = document.getElementById("chatNotification") as HTMLElement;
      const avatar = document.getElementById("chatNotification__avatar");
      const content = document.getElementById("chatNotification__content");
      const name = document.getElementById("chatNotification__name");
      const time = document.getElementById("chatNotification__time");
      const msg = document.getElementById("chatNotification__message");
      if (data.fromUID == "999") {
        data.message = data.message.replace(/\|.*?\|/, "");
      }
      if (avatar && name && time && msg && content) {
        let date = new Date();
        const minutes = date.getMinutes();
        name.textContent = data.fromUsername;
        time.textContent = `${date.getHours()} : ${
          minutes < 10 ? "0" + minutes : minutes
        }`;
        avatar.style.backgroundImage = `url("${data.avatarUrl}")`;
        msg.textContent = data.message;
        if (data.path) {
          const btn = document.createElement("button");
          btn.textContent = "Join room";
          btn.style.marginTop = "8px";
          btn.onclick = () => {
            if (data.path) navigateTo(data.path);
          };
          content.appendChild(btn);
        }
      }

      modal.onclick = async () => {
        const allPrivateChat = await fetch("/api/v1/messages/conversations", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        chatModal.style.display = "flex";
        chatButton.style.display = "none";
        const data = await allPrivateChat.json();
        chatForm.style.display = "none";
        chatMessages.style.display = "none";
        privatechatmodal.style.display = "flex";
        liveChatBtn.classList.remove("btnActive");
        friendChatBtn.classList.add("btnActive");
        isOpen = true;
        privateChat(dataUser.id, data);
      };
      setTimeout(() => {
        modal.onclick = () => {};
      }, 5000);
      let numunread = document.getElementById(
        "chat-notification"
      ) as HTMLElement;
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
    }
  });
  socket.on("loadgamelibrary", () => {
    const path = window.location.pathname;
    console.log("pathgamelibrary", path);
    if (path == "/gamelibrary") {
      navigateTo("/gamelibrary");
    }
  });
}

export async function fetchProfileUser(userId: number) {
  const token = localStorage.getItem("token");
  if (!token) {
    return;
  }
  try {
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
    console.error("Error fetching profile:", err.message);
    return null;
  }
}

async function showUserDetail(id: number) {
  const userModel = document.getElementById("userdModal") as HTMLElement;
  const cancleModel = document.getElementById(
    "btn-usercancel"
  ) as HTMLButtonElement;
  const addfriend = document.getElementById("addfriendbtn") as HTMLElement;
  const blockfriend = document.getElementById(
    "blockfriendbtns"
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
                blockedId: id,
              }),
            });
            userModel.style.display = "none";
            socket.emit("getAllMessage");
          },
          danger: true,
          datatsl: "block",
        },
      ],
      "notiBlock"
    );
  };
  let befriend = false;
  let friend: FriendList[];
  friend = friends;
  console.log("friends", friends);
  if (friends.length == 0) {
    const response = await fetch(`/api/v1/users/${dataUser.id}/friends`);

    friend = await response.json();
  }
  friend.forEach((f) => {
    console.log("allfriend", f);
    if (f.userId == id) {
      addfriend.style.display = "none";
      befriend = true;
    }
  });

  if (!befriend) {
    addfriend.onclick = async () => {
      const response = await fetch("/api/v1/users/friend-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          senderId: dataUser.id,
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
  userModel.style.display = "flex";
  const userInfo: User = await fetchProfileUser(id);
  (document.getElementById("userModalImage") as HTMLImageElement).src =
    userInfo.avatarUrl;
  (document.getElementById("userModalName") as HTMLElement).textContent =
    userInfo.displayName;
  (document.getElementById("userModalStatus") as HTMLElement).textContent =
    userInfo.status;
  (document.getElementById("userModalBio") as HTMLElement).textContent =
    userInfo.bio ?? "No bio provided.";
  userModel.onclick = (event) => {
    if (event.target === userModel) {
      userModel.style.display = "none";
    }
  };
  cancleModel.onclick = () => {
    userModel.style.display = "none";
  };
}

async function fetchHtmlFile(filePath: string, toID: string): Promise<void> {
  const contentDiv = document.getElementById(toID);
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

fetchHtmlFile("chat.html", "live-chat");
const liveChatBtn = document.getElementById("liveChatBtn") as HTMLButtonElement;
const friendChatBtn = document.getElementById(
  "friendChatBtn"
) as HTMLButtonElement;
const privatechatmodal = document.getElementById(
  "privatechatmodal"
) as HTMLButtonElement;

chatButton.addEventListener("click", async () => {
  chatModal.style.display = "flex";
  chatMessages.style.display = "flex";
  chatForm.style.display = "flex";
  privatechatmodal.style.display = "none";
  liveChatBtn.classList.add("btnActive");
  friendChatBtn.classList.remove("btnActive");
  isModalOpen = true;
  chatButton.style.display = "none";
});
liveChatBtn.onclick = () => {
  chatForm.style.display = "flex";
  chatMessages.style.display = "flex";
  privatechatmodal.style.display = "none";
  liveChatBtn.classList.add("btnActive");
  friendChatBtn.classList.remove("btnActive");
  isOpen = false;
};

friendChatBtn.onclick = async () => {
  chatForm.style.display = "none";
  chatMessages.style.display = "none";
  privatechatmodal.style.display = "flex";
  liveChatBtn.classList.remove("btnActive");
  friendChatBtn.classList.add("btnActive");
  const allPrivateChat = await fetch("/api/v1/messages/conversations", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  isOpen = true;
  const data = await allPrivateChat.json();
  console.log("allprivatechat", data);
  privateChat(dataUser.id, data);
};

chatClose.addEventListener("click", async () => {
  chatModal.style.display = "none";
  await setUnread();
  isOpen = false;
  isModalOpen = false;
  chatButton.style.display = "flex";
});

chatModal.onclick = async (event: MouseEvent) => {
  if (event.target === chatModal) {
    chatModal.style.display = "none";
    await setUnread();
    isOpen = false;
    isModalOpen = false;
    chatButton.style.display = "flex";
  }
};

chatForm.addEventListener("submit", (e: Event) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (message !== "") {
    // socket.emit("systemPM", {
    //   msg: message,
    //   userId: dataUser.id,
    //   isTournamentPlayer: false,
    //   roomId: 1,
    // });
    console.log("=======sent");
    socket.emit("sendMessage", {
      message,
      username: dataUser.username,
      userUID: dataUser.id,
    });
    chatInput.value = "";
  }
});

// startLivechat();

async function setUnread() {
  let numunread = document.getElementById("chat-notification") as HTMLElement;
  const res = await fetch("/api/v1/messages/unread/count", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const allunread = await res.json();
  let unread = allunread.count;
  if (unread != 0) {
    numunread.style.background = "red";
    numunread.textContent = unread.toString();
  } else {
    numunread.style.background = "";
    numunread.textContent = "";
  }
}

async function sentMessage(toid: number, msg: string) {
  try {
    const getMsgId = await fetch(
      `/api/v1/messages/conversations/user/${toid}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    let getMsgData: Msg;
    let chatId;
    console.log("getId", getMsgId, toid);
    if (getMsgId.status == 200) {
      getMsgData = await getMsgId.json();
      chatId = getMsgData.id;
      console.log("getId", getMsgId);
    } else {
      await fetch(`/api/v1/messages/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otherUserId: toid }),
      });

      const getMsgId = await fetch(
        `/api/v1/messages/conversations/user/${toid}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      getMsgData = await getMsgId.json();
      chatId = getMsgData.id;
    }
    const res = await fetch(
      `/api/v1/messages/conversations/${chatId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: msg }),
      }
    );
    console.log("sent msg", res);
  } catch (error) {
    console.error("sent message error:", error);
  }
}

export async function sentPrivateMessage(
  messages: string,
  toUID: number,
  avatarUrl: string
) {
  console.log("3", toUID, avatarUrl);
  const message = messages.trim();
  if (!toUID || !message) return;

  const current = window.location.pathname;
  let path: string | null = null;
  if (
    current.startsWith("/coderush/room_") ||
    current.startsWith("/pingpong/room_")
  ) {
    path = current;
  }
  await sentMessage(toUID, message);
  socketService.emit("privateMessage", {
    fromUID: dataUser.id,
    fromUsername: dataUser.username,
    toUID,
    message,
    path,
    avatarUrl,
  });
}

window.addEventListener("beforeunload", () => {
  updateUserStatus("offline");
});
