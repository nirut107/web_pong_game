import { showNotification } from "./manage.ts";
import { userInfo, dataUser, updateUserInfo } from "./route.ts";

export function closeModal(modalId: string) {
  (document.getElementById(modalId) as HTMLElement).style.display = "none";
}

export async function updateProfile(userId: number, profileData: {}) {
  const token = localStorage.getItem("token");
  if (!token) {
    return;
  }
  const res = await fetch(`/api/v1/users/${userId}/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });

  if (res.status == 409) {
    showNotification(
      "Display name already exists.",
      [
        {
          text: "Cancel",
          onClick: () => {
            return false;
          },
          datatsl: "cancel",
        },
      ],
      "nameexists"
    );
    return false;
  }
  console.log("result change username", res);
  return true;
}


export async function fetchProfile(userId: number, username: string) {
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
    console.log(
      "profile check=======================================",
      profile
    );
    if (profile.avatarUrl == null || !profile.language) {
      throw new Error("Failed to fetch profile");
    }
    return profile;
  } catch (err: any) {
    console.error("Error fetching profile:", err.message);
    if (err.message == "Failed to fetch profile") {
      const random = Math.floor(Math.random() * 4) + 1;
      let data = {
        displayName: username,
        avatarUrl: `/image/avatar/${random}df.jpeg`,
        status: "Online",
        bio: "this user has nothing to say",
        language: `${localStorage.getItem("language") || "en"}`,
      };
      console.log("bfup");
      await updateProfile(userId, data);
      const res = await fetch(`/api/v1/users/${userId}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch profile");
      }
      const profile = await res.json();
      if (profile.avatarUrl == null && profile.bio == null) {
        throw new Error("Failed to fetch profile");
      }
      return profile;
    }
  }
}

export async function fetchProfileInfo() {
  // <====== profile Image =============>
  const profileImage = document.getElementById(
    "profileImage"
  ) as HTMLImageElement;
  const imageInput = document.getElementById("imageUpload") as HTMLInputElement;
  console.log("avatar", userInfo);
  profileImage.src = userInfo.avatarUrl;

  profileImage.onclick = () => {
    imageInput.click();
  };

  imageInput.onchange = async () => {
    const file = imageInput.files?.[0];
    console.log("file", file);
    if (!file) {
      alert("Please select a PNG image.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(`/api/v1/users/avatar-upload/${dataUser.id}`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await updateUserInfo();
        console.log(userInfo.avatarUrl);
        profileImage.src = userInfo.avatarUrl;
        imageInput.value = "";
      } else {
        showNotification(
          "Can not upload thid file",
          [
            {
              text: "OK",
              onClick: () => console.log("ok"),
              datatsl: "ok",
            },
          ],
          ""
        );
      }
    } catch (err) {
      console.error(err);
    }
  };
  // <============ profile info ============>
  const info = document.getElementById("info") as HTMLDivElement;
  const editInfo = document.getElementById("edit-info") as HTMLButtonElement;
  info.textContent = userInfo.bio;

  editInfo.onclick = () => {
    const modal = document.getElementById("editInfoModal") as HTMLButtonElement;
    modal.style.display = "flex";
    const cancleEditName = document.getElementById(
      "cancleEditInfo"
    ) as HTMLButtonElement;

    const saveName = document.getElementById("saveInfo") as HTMLButtonElement;
    saveName.onclick = async () => {
      const newInfo: string = (
        document.getElementById("newInfo") as HTMLInputElement
      ).value;
      if (newInfo.trim() !== "") {
        info.textContent = newInfo;
        let datas = {
          bio: newInfo,
        };
        await updateProfile(dataUser.id, datas);
        updateUserInfo();
        closeModal("editInfoModal");
      }
    };
    cancleEditName.onclick = () => {
      closeModal("editInfoModal");
    };
    modal.onclick = (event: MouseEvent) => {
      if (event.target === modal) {
        closeModal("editInfoModal");
      }
    };
  };

  const profileName = document.getElementById("userName") as HTMLElement;
  const profileID = document.getElementById("userId") as HTMLElement;

  const editUsername = document.getElementById(
    "edit-name"
  ) as HTMLButtonElement;
  profileName.textContent = userInfo.displayName;
  profileID.textContent = userInfo.userId.toString();
  editUsername.onclick = () => {
    const modal = document.getElementById("editNameModal") as HTMLButtonElement;
    modal.style.display = "flex";
    modal.onclick = (event: MouseEvent) => {
      const cancleEditName = document.getElementById(
        "cancleEditName"
      ) as HTMLButtonElement;
      const saveName = document.getElementById("saveName") as HTMLButtonElement;
      saveName.onclick = async () => {
        const input = document.getElementById(
          "newUsername"
        ) as HTMLInputElement;
        const newName: string = input.value;
        if (newName.length > 15) {
          showNotification(
            "Maximum 15 characters allowed.",
            [
              {
                text: "OK",
                onClick: () => {
                  input.value = "";
                },
                datatsl: "ok",
              },
            ],
            "maxchar"
          );
        } else if (newName.trim() !== "") {
          profileName.textContent = newName;
          console.log(newName);
          let datas = {
            displayName: newName,
          };
          if (!(await updateProfile(dataUser.id, datas))) {
            profileName.textContent = userInfo.displayName;
          }
          closeModal("editNameModal");
        }
        cancleEditName.onclick = () => {
          closeModal("editNameModal");
        };
        if (event.target === modal) {
          closeModal("editNameModal");
        }
      };
    };
  };
}
