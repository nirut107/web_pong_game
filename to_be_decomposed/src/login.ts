import { startLivechat } from "./liveChat.ts";
import { showNotification } from "./manage.ts";
import { closeModal } from "./profile.ts";
import { checkRoute, navigateTo } from "./route.ts";
import { translatePage, translateWord } from "./translate.ts";

declare global {
  interface Window {
    google: any;
  }
}

let tokenClient: any;

export async function loadLoginPage() {
  const signUpButton = document.getElementById("signUp") as HTMLElement | null;
  const signInButton = document.getElementById("signIn") as HTMLElement | null;
  const container = document.getElementById("container") as HTMLElement | null;
  const chatbutton = document.getElementById(
    "chat-button"
  ) as HTMLButtonElement;
  const settingBtn = document.getElementById("settingBtn") as HTMLElement;
  settingBtn.style.display = "none";
  chatbutton.style.display = "none";
  settingBtn.style.display = "none";

  const changeLangBtn = document.getElementById(
    "changelang-btn1"
  ) as HTMLButtonElement;
  const langdropdown = document.getElementById(
    "lang-dropdown"
  ) as HTMLButtonElement;
  if (changeLangBtn) {
    changeLangBtn.classList.remove("hidden");
  }
  changeLangBtn.onmouseenter = () => {
    langdropdown.classList.remove("hidden");
  };
  langdropdown.onclick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    if (target.tagName === "LI") {
      const selectedLang = target.getAttribute("data-lang");
      if (selectedLang) {
        localStorage.setItem("language", selectedLang);
        langdropdown.classList.add("hidden");
        translatePage();
      }
    }
  };
  langdropdown.onmouseleave = () => {
    langdropdown.classList.add("hidden");
  };
  changeLangBtn.onmouseleave = () => {
    langdropdown.classList.add("hidden");
  };
  langdropdown.onmouseenter = () => {
    langdropdown.classList.remove("hidden");
  };

  try {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id:
        "68618451086-rr000c5396dbmotu76577ecr5jjcr16j.apps.googleusercontent.com",
      scope: "openid profile email",
      callback: (tokenResponse: any) => {
        console.log("Access Token:", tokenResponse.access_token);

        fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        })
          .then((res) => res.json())
          .then(async (user) => {
            console.log("User Info:", user);
            const connectRes = await fetch(
              "/api/v1/auth/oauth/connect",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                  provider: "google",
                  providerUserId: user.sub,
                  username: user.name,
                  email: user.email,
                  avatarUrl: user.picture,
                }),
              }
            );
            const connectData = await connectRes.json();
            handleSuccessfulAuth(connectData);
          });
      },
    });
  } catch (error) {
    console.log(error);
  }

  const button = document.getElementById("myGoogleButton") as HTMLButtonElement;
  button.onclick = () => {
    console.log("google login");
    tokenClient.requestAccessToken();
  };

  if (signUpButton && container) {
    signUpButton.addEventListener("click", () => {
      container.classList.add("right-panel-active");
    });
  }

  if (signInButton && container) {
    signInButton.addEventListener("click", () => {
      container.classList.remove("right-panel-active");
    });
  }

  function getAuthToken(): string | null {
    return localStorage.getItem("token");
  }

  function showLoginError(message: string, tsl: string): void {
    showNotification(
      message,
      [
        {
          text: "OK",
          onClick: () => {},
          datatsl: "ok",
        },
      ],
      tsl
    );
  }

  function showSignupError(message: string, tsl: string): void {
    showNotification(
      message,
      [
        {
          text: "OK",
          onClick: () => {},
          datatsl: "ok",
        },
      ],
      tsl
    );
  }

  function handleSuccessfulAuth(data: any): void {
    if (data?.token) {
      localStorage.setItem("token", data.token);
    }

    if (data?.refreshToken) {
      localStorage.setItem("refreshToken", data.refreshToken);
    }

    if (data?.user?.username) {
      localStorage.setItem("userUID", data.user.username);
    }
    const chatbutton = document.getElementById(
      "chat-button"
    ) as HTMLButtonElement;
    const chatMessages = document.getElementById(
      "chat-messages"
    ) as HTMLDivElement;
    chatMessages.textContent = "";
    chatbutton.style.display = "flex";
    checkRoute("/");
  }

  const loginForm = document.querySelector(
    "form.signin-form"
  ) as HTMLFormElement | null;
  if (loginForm) {
    loginForm.addEventListener("submit", async (e: Event) => {
      e.preventDefault();

      const errorElement = document.getElementById(
        "login-error"
      ) as HTMLElement | null;
      if (errorElement) {
        errorElement.style.display = "none";
      }

      const usernameInput = document.querySelector(
        'form.signin-form input[name="username"]'
      ) as HTMLInputElement | null;
      const passwordInput = document.querySelector(
        'form.signin-form input[name="password"]'
      ) as HTMLInputElement | null;
      const totpInput = document.querySelector(
        'form.signin-form input[name="totp"]'
      ) as HTMLInputElement | null;

      if (!usernameInput || !passwordInput) {
        showLoginError(
          "Username and password fields are required",
          "userandpassreq"
        );
        return;
      }

      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();
      const totpToken = totpInput ? totpInput.value.trim() : "";

      if (!username || !password) {
        showLoginError("Username and password are required", "userandpassreq");
        return;
      }

      const submitButton = loginForm.querySelector(
        'input[type="submit"]'
      ) as HTMLInputElement | null;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.value = "Logging in...";
      }

      try {
        const response = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            username,
            password,
            totpToken: totpToken || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || `${response.status}`);
        }

        if (data.requires2FA) {
          const totpContainer = document.getElementById(
            "totp-container"
          ) as HTMLElement | null;
          if (totpContainer) {
            totpContainer.style.display = "block";
            totpContainer.innerHTML = `
                            <div class="totp-message tsl" data-tsl="faRequired">Two-factor authentication is required</div>
<div class="input-field">
  <input 
    type="text" 
    name="totp" 
    class="tsl" 
    data-tsl="enterCodePlaceholder" 
    placeholder="Enter 6-digit code" 
    maxlength="6" 
    required 
    pattern="[0-9]{6}" 
  />
</div>

                        `;
            translatePage();
            const newTotpInput = totpContainer.querySelector(
              'input[name="totp"]'
            ) as HTMLInputElement | null;
            if (newTotpInput) {
              newTotpInput.focus();
              newTotpInput.addEventListener("input", (e: Event) => {
                const target = e.target as HTMLInputElement;
                target.value = target.value.replace(/[^0-9]/g, "");
              });
            }
          }

          if (data.temporaryToken) {
            localStorage.setItem("temp_token", data.temporaryToken);
          }

          if (submitButton) {
            submitButton.disabled = false;
            submitButton.value = "Login";
          }
          return;
        }

        handleSuccessfulAuth(data);
      } catch (error: unknown) {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.value = "Login";
        }

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Login failed. Please check your credentials.";
        showLoginError(errorMessage, "loginfail");
      }
    });
  }

  const signupForm = document.querySelector(
    "form.signup-form"
  ) as HTMLFormElement | null;
  if (signupForm) {
    signupForm.addEventListener("submit", async (e: Event) => {
      e.preventDefault();

      const errorElement = document.getElementById(
        "signup-error"
      ) as HTMLElement | null;
      if (errorElement) {
        errorElement.style.display = "none";
      }

      const usernameInput = document.querySelector(
        'form.signup-form input[name="username"]'
      ) as HTMLInputElement | null;
      const emailInput = document.querySelector(
        'form.signup-form input[name="email"]'
      ) as HTMLInputElement | null;
      const passwordInput = document.querySelector(
        'form.signup-form input[name="password"]'
      ) as HTMLInputElement | null;
      const repasswordInput = document.querySelector(
        'form.signup-form input[name="repassword"]'
      ) as HTMLInputElement | null;

      if (!usernameInput || !emailInput || !passwordInput || !repasswordInput) {
        showSignupError("All fields are required", "allreq");
        return;
      }

      const username = usernameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      const repassword = repasswordInput.value.trim();

      if (username.length > 15) {
        showSignupError("Maximum 15 characters allowed.", "maxchar");
        return;
      }
      if (!username || !email || !password || !repassword) {
        showSignupError("All fields are required", "allreq");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showSignupError("Please enter a valid email address", "validemail");
        return;
      }

      if (password.length < 8) {
        showSignupError(
          "Password must be at least 8 characters long",
          "minpass"
        );
        return;
      }

      if (password != repassword) {
        showSignupError("Password is not match", "passmatch");
        return;
      }

      const policyCheckBox = document.getElementById(
        "policyCheckBox"
      ) as HTMLInputElement | null;
      if (!policyCheckBox || !policyCheckBox.checked) {
        showSignupError(
          "Accepting the privacy policy is required.",
          "policyreq"
        );
        return;
      }

      const signUpSubmit = document.getElementById(
        "signUpSubmit"
      ) as HTMLInputElement | null;
      if (signUpSubmit) {
        signUpSubmit.disabled = true;
        signUpSubmit.value = "Signing up...";
      }

      try {
        const response = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            username,
            email,
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.log("respone", data);
          throw new Error(data.error || response.status);
        }

        if (!data.token) {
          const loginResponse = await fetch(
            "/api/v1/auth/login",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                username,
                password,
              }),
            }
          );

          const loginData = await loginResponse.json();

          if (!loginResponse.ok) {
            throw new Error(
              "Registration successful but login failed. Please go to login page."
            );
          }

          handleSuccessfulAuth(loginData);
        } else {
          handleSuccessfulAuth(data);
        }
      } catch (error: any) {
        if (signUpSubmit) {
          signUpSubmit.disabled = false;
          signUpSubmit.value = "Sign up";
        }
        console.log("error", error.message);
        showSignupError(error.message, error.message);
      }
    });
  }

  const token = getAuthToken();
  if (token) {
    fetch("/api/v1/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data?.id) {
          const chatbutton = document.getElementById(
            "chat-button"
          ) as HTMLButtonElement;
          const chatMessages = document.getElementById(
            "chat-messages"
          ) as HTMLDivElement;
          chatMessages.textContent = "";
          chatbutton.style.display = "flex";
          checkRoute("/");
        }
      })
      .catch(() => {});
  }
  setupPolicyModal();
}

function setupPolicyModal() {
  const readPolicyBtn = document.getElementById(
    "readPolicy"
  ) as HTMLButtonElement | null;
  const policyModal = document.getElementById(
    "policyModal"
  ) as HTMLElement | null;
  const cancelPolicyBtn = document.getElementById(
    "cancelPolicyBtn"
  ) as HTMLButtonElement | null;
  const acceptPolicyBtn = document.getElementById(
    "acceptPolicyBtn"
  ) as HTMLButtonElement | null;
  const policyBox = document.getElementById("policyBox") as HTMLElement | null;
  const policyCheckBox = document.getElementById(
    "policyCheckBox"
  ) as HTMLInputElement | null;

  if (
    !readPolicyBtn ||
    !policyModal ||
    !cancelPolicyBtn ||
    !acceptPolicyBtn ||
    !policyBox ||
    !policyCheckBox
  ) {
    console.error("One or more required elements are missing.");
    return;
  }

  readPolicyBtn.addEventListener("click", () => {
    policyModal.style.display = "flex";
    acceptPolicyBtn.disabled = true;
    acceptPolicyBtn.classList.add("opacity-50", "cursor-not-allowed");
  });

  cancelPolicyBtn.addEventListener("click", () => {
    closeModal("policyModal");
  });

  policyModal.addEventListener("click", (event: MouseEvent) => {
    if (event.target === policyModal) {
      closeModal("policyModal");
    }
  });

  policyBox.addEventListener("scroll", () => {
    const atBottom =
      policyBox.scrollTop + policyBox.clientHeight >=
      policyBox.scrollHeight - 1;
    if (atBottom) {
      acceptPolicyBtn.disabled = false;
      acceptPolicyBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
  });

  acceptPolicyBtn.addEventListener("click", async () => {
    if (acceptPolicyBtn.disabled) return;

    policyCheckBox.checked = true;
    closeModal("policyModal");
  });
}
