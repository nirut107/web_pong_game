import { sentPrivateMessage } from "./liveChat";
import { translatePage, translateWord } from "./translate.ts";
import { checkRoute, navigateTo, token } from "./route.ts";
import { formatDistanceToNow, parseISO, parse } from "date-fns";
import { enUS, th, ja, es, Locale } from "date-fns/locale";
import { BlocklistResponse, User } from "./friendlist.ts";

interface PrivateChatChanel {
  id: number;
  lastMessage: string;
  lastMessageTime: string;
  otherUserId: number;
  otherUsername: string;
  otheravatarUrl: string;
  unreadCount: number;
}

interface Message {
  content: string;
  createdAt: string;
  id: number;
  read: boolean;
  receiverId: number;
  senderId: number;
}

let updateFriendsList: ((newData: PrivateChatChanel[]) => void) | null = null;
let blocklists: BlocklistResponse;
let activeAvatarUrl: string;

async function fetchHtmlFileMange(
  filePath: string,
  toId: string
): Promise<void> {
  const contentDiv = document.getElementById(toId);
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

async function privateChat(id: number, data: PrivateChatChanel[]) {
  const privatechat = document.getElementById(
    "privatechatmodal"
  ) as HTMLElement;
  console.log("pre", data);
  await fetchHtmlFileMange("/privatechat.html", "privatechatcontent");
  const messagesContainer = document.getElementById(
    "messages-container"
  ) as HTMLElement;
  const messagebox = document.getElementById("message-box") as HTMLInputElement;
  const messageInput = document.getElementById(
    "message-input"
  ) as HTMLInputElement;
  privatechat.style.display = "flex";
  if (data.length == 0) {
    messagesContainer.style.width = "100%";
    messagesContainer.textContent = translateWord("noChat");
    messagesContainer.style.color = "black";
    messagebox.style.display = "none";
  } else {
    messagesContainer.style.width = "76%";
    messagebox.style.display = "";
    messagesContainer.style.color = "#e6e6e6";
  }
  const closeprivate = document.getElementById(
    "closeprivate"
  ) as HTMLButtonElement;

  const res = await fetch("/api/v1/chat/blocklist", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  blocklists = await res.json();

  async function setUnread() {
    let numunread = document.getElementById("chat-notification") as HTMLElement;
    try {
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
    } catch (err) {
      checkRoute("/");
    }
  }

  closeprivate.onclick = async () => {
    if (location.pathname == "/") {
      await setUnread();
    }
    privatechat.style.display = "none";
  };
  privatechat.onclick = async (event: MouseEvent) => {
    if (event.target === privatechat) {
      if (location.pathname == "/") {
        await setUnread();
      }
      privatechat.style.display = "none";
    }
  };

  const friendsContainer = document.getElementById(
    "friends-container"
  ) as HTMLElement;
  const chatContent = document.getElementById("chat-content") as HTMLElement;
  const chatFriendName = document.getElementById(
    "chat-friend-name"
  ) as HTMLElement;
  const sendButton = document.getElementById(
    "send-button"
  ) as HTMLButtonElement;

  let activeFriendId = 1;
  let frist = true;
  let isupdatelist = true;
  let isupdatechat = true;

  async function renderFriends(
    friendList = data,
    updatelist = isupdatelist,
    updatechat = isupdatechat
  ) {
    friendList = friendList.filter(
      (friend) =>
        !blocklists.blocklist.some(
          (blocked) => blocked.blocked_id === friend.otherUserId
        )
    );
    if (friendList.length == 0) {
      return;
    }
    if (frist) {
      activeFriendId = data[0].otherUserId;
    }

    async function featchprofile() {
      let profile: User = {} as User;
      if (activeFriendId == 999) {
        profile.avatarUrl = "/image/server.png";
        profile.userId = 999;
        profile.displayName = "System";
      } else {
        const res = await fetch(`/api/v1/users/${activeFriendId}/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          throw new Error("Failed to fetch profile");
        }
        profile = await res.json();
      }
      activeFriendId = profile.userId;
      console.log("loadChat", activeFriendId);
      loadChat(friendList[0], profile);
    }

    if (frist || updatelist) {
      async function updatelists() {
        console.log("update", friendList);
        friendsContainer.innerHTML = "";
        friendsContainer.textContent = "";
        friendList.forEach(async (friend) => {
          const res = await fetch(
            `/api/v1/users/${friend.otherUserId}/profile`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (!res.ok) {
            throw new Error("Failed to fetch profile");
          }
          const profile: User = await res.json();
          const friendElement = document.createElement("div");
          friendElement.className = `friend-item ${
            friend.otherUserId === activeFriendId ? "active" : ""
          }`;
          const avatarDiv = document.createElement("div");
          avatarDiv.className = "avatarp";
          console.log("===========", profile);
          if (profile.userId == 999) {
            avatarDiv.style.backgroundImage = `url("/image/server.png")`;
          } else {
            avatarDiv.style.backgroundImage = `url("${profile.avatarUrl} ")`;
          }
          if (activeFriendId == profile.userId) {
            activeAvatarUrl = profile.avatarUrl;
          }

          const infoDiv = document.createElement("div");
          infoDiv.className = "friend-info";

          const nameDiv = document.createElement("div");
          nameDiv.className = "friend-names";
          if (profile.displayName.length > 8) {
            profile.displayName = profile.displayName.slice(0, 8) + "...";
          }
          nameDiv.textContent = profile.displayName;

          const messageDiv = document.createElement("div");

          messageDiv.className = "last-message tsl";
          messageDiv.setAttribute("msgId", profile.userId.toString());
          if (friend.lastMessage.startsWith("/coderush/room_")) {
            messageDiv.setAttribute("data-tsl", "joinroom");
            messageDiv.textContent = "join room";
          } else {
            let message = friend.lastMessage;
            if (message.length > 15) {
              message = message.slice(0, 15) + "...";
            }
            messageDiv.textContent = message;
          }

          infoDiv.appendChild(nameDiv);
          infoDiv.appendChild(messageDiv);

          const timeDiv = document.createElement("div");
          timeDiv.className = "message-time";
          timeDiv.setAttribute("timeId", profile.userId.toString());
          const createdAt = parseISO(friend.lastMessageTime);
          createdAt.setHours(
            createdAt.getHours() - new Date().getTimezoneOffset() / 60
          );
          const localeMap: Record<string, Locale> = {
            en: enUS,
            th: th,
            jp: ja,
            sp: es,
          };
          let language: string | null = localStorage.getItem("language");
          if (!language) {
            language = "en";
          }
          const result = formatDistanceToNow(createdAt, {
            addSuffix: true,
            locale: localeMap[language],
          });
          timeDiv.textContent = result;

          friendElement.append(avatarDiv, infoDiv, timeDiv);
          friendElement.addEventListener("click", async () => {
            friendElement.style.backgroundColor = "";
            activeFriendId = profile.userId;
            activeAvatarUrl = profile.avatarUrl;
            await loadChat(friend, profile);
            document.querySelectorAll(".friend-item").forEach((item) => {
              item.classList.remove("active");
            });
            friendElement.classList.add("active");
          });
          if (friend.unreadCount > 0 && friend.otherUserId != activeFriendId) {
            friendElement.style.backgroundColor = "#ffc7ab";
          } else {
            friendElement.style.backgroundColor = "";
          }
          friendsContainer.appendChild(friendElement);
          translatePage();
        });
      }
      updatelists();
    }
    if (updatechat || friendList[0].otherUserId == activeFriendId) {
      featchprofile();
    }

    if (frist) {
      frist = false;
    }
  }

  async function loadChat(chatChanel: PrivateChatChanel, profile: User) {
    chatContent.style.display = "flex";
    chatFriendName.textContent = profile.displayName;
    const avatarImage = document.getElementById("chat-avatar") as HTMLElement;
    avatarImage.style.backgroundImage = `url("${profile.avatarUrl}")`;
    const res = await fetch(
      `/api/v1/messages/conversations/${chatChanel.id}/messages`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const friendMessages: Message[] = await res.json();
    messagesContainer.innerHTML = "";

    if (friendMessages) {
      friendMessages.forEach((message) => {
        const messageElement = document.createElement("div");
        messageElement.className = `messagep ${
          message.receiverId == id ? "received" : "sent"
        }`;

        const contentDiv = document.createElement("div");

        if (
          message.content.startsWith("/coderush/room_") ||
          message.content.startsWith("/pong/room_")
        ) {
          contentDiv.onclick = () => {
            const chatmodal = document.getElementById(
              "chat-modal"
            ) as HTMLElement;
            if (chatmodal) {
              chatmodal.style.display = "none";
            }
            navigateTo(message.content);
          };
          const msgDiv = document.createElement("div");
          const path = message.content.split("/");
          msgDiv.className = "message-content tsl";
          msgDiv.textContent = `Play ${path[1]} with me`;
          msgDiv.setAttribute("data-tsl", `play${path[1]}`);
          messageElement.appendChild(msgDiv);
          contentDiv.textContent = "join room";
          contentDiv.className = "message-btn tsl";
          contentDiv.setAttribute("data-tsl", "joinroom");
        }
        if (message.senderId == 999) {
          const list = message.content.split("|");
          list.forEach((msg) => {
            if (msg.startsWith("/pong")) {
              const span = document.createElement("button");
              span.style.color = "green";
              span.textContent = translateWord("battle room");
              span.style.cursor = "pointer";
              span.onclick = () => {
                navigateTo(msg);
              };
              contentDiv.appendChild(span);
            } else {
              const span = document.createElement("span");
              span.className = "tsl";
              span.textContent = `${translateWord(msg)} `;
              contentDiv.appendChild(span);
            }
          });
        } else {
          contentDiv.textContent = message.content;
        }
        contentDiv.className = "message-content";
        const timeDiv = document.createElement("div");
        timeDiv.className = "message-time-stamp";
        const createdAt = parse(
          message.createdAt,
          "yyyy-MM-dd HH:mm:ss",
          new Date()
        );
        createdAt.setHours(
          createdAt.getHours() - new Date().getTimezoneOffset() / 60
        );
        const localeMap: Record<string, Locale> = {
          en: enUS,
          th: th,
          jp: ja,
          sp: es,
        };
        let language: string | null = localStorage.getItem("language");
        if (!language) {
          language = "en";
        }
        const result = formatDistanceToNow(createdAt, {
          addSuffix: true,
          locale: localeMap[language],
        });
        console.log("time", message.createdAt, createdAt, result);
        timeDiv.textContent = result;

        messageElement.appendChild(contentDiv);
        messageElement.appendChild(timeDiv);

        messagesContainer.appendChild(messageElement);
        translatePage();
      });

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  async function sendMessage() {
    let messageText = messageInput.value.trim();
    messageInput.value = "";
    console.log(activeFriendId, activeAvatarUrl);
    if (activeFriendId == 999) return;
    if (messageText) {
      await sentPrivateMessage(messageText, activeFriendId, activeAvatarUrl);

      const friendIndex = data.findIndex(
        (f) => f.otherUserId === activeFriendId
      );
      if (friendIndex !== -1) {
        const now = new Date();
        const formatted =
          now.getFullYear() +
          "-" +
          String(now.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(now.getDate()).padStart(2, "0") +
          " " +
          String(now.getHours()).padStart(2, "0") +
          ":" +
          String(now.getMinutes()).padStart(2, "0") +
          ":" +
          String(now.getSeconds()).padStart(2, "0");
        if (friendIndex == 0) {
          document.querySelectorAll(".last-message").forEach((dom) => {
            const last = dom.getAttribute("msgId");
            if (last == activeFriendId.toString()) {
              if (messageText.length > 15) {
                messageText = messageText.slice(0, 15) + "...";
              }
              dom.textContent = messageText;
            }
          });
          document.querySelectorAll(".message-time").forEach((dom) => {
            const last = dom.getAttribute("timeId");
            if (last == activeFriendId.toString()) {
              dom.textContent = formatted;
            }
          });
        } else {
          data[friendIndex].lastMessage = messageText;
          data[friendIndex].lastMessageTime = formatted;
          const [updatedFriend] = data.splice(friendIndex, 1);
          data.unshift(updatedFriend);
        }
        await renderFriends(data, friendIndex == 0 ? false : true, true);
        console.log(data, activeFriendId);
      }
    }
  }

  updateFriendsList = async function (newData: PrivateChatChanel[]) {
    data = newData;
    await renderFriends(data, true, false);
  };

  sendButton.addEventListener("click", sendMessage);

  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
  await renderFriends();
  translatePage();
}

async function ReceivedMessage() {
  const allPrivateChat = await fetch("/api/v1/messages/conversations", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const newData = await allPrivateChat.json();
  console.log("reciveData", newData);

  if (updateFriendsList) {
    updateFriendsList(newData);
  } else {
    console.warn("updateFriendsList is not initialized yet");
  }
}

export { privateChat, ReceivedMessage };
