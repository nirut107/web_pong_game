import { showNotification } from "./manage";
import { navigateTo } from "./route";
import { authService, checkAuthStatus } from "./services";
import { translatePage } from "./translate";

interface AuthResponse {
  token?: string;
  refreshToken?: string;
  user?: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  requires2FA?: boolean;
  message?: string;
}

export function initializeAuth(): void {
  const isLoginPage =
    window.location.pathname === "/login" || window.location.pathname === "/";

  if (isLoginPage) {
    setupLoginForm();
    setupSignupForm();
    setup2FAForm();
  } else {
    checkAuthOnLoad();
  }
}

function setupLoginForm(): void {
  const loginForm = document.querySelector<HTMLFormElement>("form.signin-form");

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const errorElement = document.getElementById("login-error");
    if (errorElement) {
      errorElement.textContent = "";
      errorElement.style.display = "none";
    }

    const usernameInput = document.querySelector<HTMLInputElement>(
      'form.signin-form input[name="username"]'
    );
    const passwordInput = document.querySelector<HTMLInputElement>(
      'form.signin-form input[name="password"]'
    );
    const totpInput = document.querySelector<HTMLInputElement>(
      'form.signin-form input[name="totp"]'
    );

    if (!usernameInput || !passwordInput) {
      showLoginError("Username and password are required", "userandpassreq");
      return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const totpToken = totpInput?.value.trim();

    if (!username || !password) {
      showLoginError("Username and password are required", "userandpassreq");
      return;
    }

    // Disable the submit button to prevent multiple submissions
    const submitButton = loginForm.querySelector<HTMLButtonElement>(
      'input[type="submit"]'
    );
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.value = "Logging in...";
    }

    try {
      const response = await authService.login(username, password, totpToken);

      if (response.requires2FA) {
        showTotpInput();
        // Re-enable the button
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.value = "Login";
        }
        return;
      }

      handleSuccessfulLogin(response);
    } catch (error) {
      // Re-enable the button
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.value = "Login";
      }

      if (typeof error === "object" && error !== null && "message" in error) {
        showLoginError((error as Error).message, (error as Error).message);
      } else {
        showLoginError(
          "Login failed. Please check your credentials and try again.",
          "loginfail"
        );
      }
    }
  });
}

function handleSuccessfulLogin(response: AuthResponse): void {
  if (response.token) {
    localStorage.setItem("token", response.token);
    document.cookie = `token=${response.token}; path=/; max-age=${
      60 * 60 * 24 * 7
    }`; // 7 days
  }

  if (response.refreshToken) {
    localStorage.setItem("refreshToken", response.refreshToken);
    document.cookie = `refreshToken=${response.refreshToken}; path=/; max-age=${
      60 * 60 * 24 * 30
    }`; // 30 days
  }

  if (response.user?.username) {
    localStorage.setItem("userUID", response.user.username);
    document.cookie = `userUID=${response.user.username}; path=/; max-age=${
      60 * 60 * 24 * 7
    }`; // 7 days
  }
}

function setupSignupForm(): void {
  const signupForm =
    document.querySelector<HTMLFormElement>("form.signup-form");

  if (!signupForm) return;

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const errorElement = document.getElementById("signup-error");
    if (errorElement) {
      errorElement.textContent = "";
      errorElement.style.display = "none";
    }

    const usernameInput = document.querySelector<HTMLInputElement>(
      'form.signup-form input[name="username"]'
    );
    const emailInput = document.querySelector<HTMLInputElement>(
      'form.signup-form input[name="email"]'
    );
    const passwordInput = document.querySelector<HTMLInputElement>(
      'form.signup-form input[name="password"]'
    );

    if (!usernameInput || !emailInput || !passwordInput) {
      showSignupError("All fields are required");
      return;
    }

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !email || !password) {
      showSignupError("All fields are required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showSignupError("Please enter a valid email address");
      return;
    }

    if (password.length < 8) {
      showSignupError("Password must be at least 8 characters long");
      return;
    }

    // Disable the submit button to prevent multiple submissions
    const submitButton = signupForm.querySelector<HTMLButtonElement>(
      'input[type="submit"]'
    );
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.value = "Signing up...";
    }

    try {
      const response = await authService.register(username, email, password);
      handleSuccessfulLogin(response);
    } catch (error) {
      // Re-enable the button
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.value = "Sign up";
      }

      if (typeof error === "object" && error !== null && "message" in error) {
        showSignupError((error as Error).message);
      } else {
        showSignupError("Registration failed. Please try again.");
      }
    }
  });
}

function setup2FAForm(): void {
  const totpContainer = document.getElementById("totp-container");
  if (!totpContainer) return;
}

function showTotpInput(): void {
  const totpContainer = document.getElementById("totp-container");
  if (!totpContainer) return;

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
  const totpInput =
    document.querySelector<HTMLInputElement>('input[name="totp"]');
  if (totpInput) {
    totpInput.focus();

    totpInput.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      target.value = target.value.replace(/[^0-9]/g, "");
    });
  }
}

async function checkAuthOnLoad(): Promise<void> {
  try {
    const result = await checkAuthStatus();

    if (!result.isAuthenticated) {
      redirectToLogin();
    }
  } catch (error) {
    redirectToLogin();
  }
}

function redirectToLogin(): void {
  // Clear all authentication data
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userUID");

  // Clear cookies
  document.cookie = "token=; path=/; max-age=0";
  document.cookie = "refreshToken=; path=/; max-age=0";
  document.cookie = "userUID=; path=/; max-age=0";

  // Redirect to login page if not already there
  navigateTo("/login");
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

function showSignupError(message: string): void {
  let errorElement = document.getElementById("signup-error");

  if (!errorElement) {
    errorElement = document.createElement("div");
    errorElement.id = "signup-error";
    errorElement.classList.add("error-message");

    const signupForm = document.querySelector("form.signup-form");
    if (signupForm && signupForm.firstChild) {
      signupForm.insertBefore(errorElement, signupForm.firstChild.nextSibling);
    }
  }

  errorElement.textContent = message;
  errorElement.style.display = "block";
}

document.addEventListener("DOMContentLoaded", initializeAuth);
