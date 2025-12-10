import { authService, checkAuthStatus } from "./services";
import { navigateTo } from "./route.ts";
import { fetchHtmlFileManage } from "./manage.js";
import { translatePage } from "./translate.ts";

let modal: HTMLElement;
export async function load2FA(): Promise<void> {
  try {
    await fetchHtmlFileManage("/twofa.html", "FAmodal");
    console.log("Initializing 2FA module...");
    modal = document.getElementById("FAmodal") as HTMLElement;
    modal.style.display = "flex";

    const authStatus = await checkAuthStatus();

    if (!authStatus.isAuthenticated) {
      console.error("User not authenticated, redirecting to login");
      navigateTo("/login");
      return;
    }

    const status = await authService.get2FAStatus();
    console.log("2FA status:", status);
    const content = document.getElementById("twoFAmodal") as HTMLElement;
    content.onclick = (event: MouseEvent) => {
      if (event.target === content) {
        modal.innerHTML = "";
        modal.style.display = "none";
      }
    };

    if (status.isEnabled) {
      showDisable2FAInterface();
    } else if (status.isSetup) {
      showEnable2FAInterface();
    } else {
      showSetup2FAInterface();
    }
  } catch (error) {
    console.error("Error initializing 2FA:", error);
    const contentDiv = document.getElementById("2FAcontent");
    if (contentDiv) {
      contentDiv.innerHTML = `
				<div style="text-align: center; padding: 20px;">
  <h2 class="tsl" data-tsl="errorLoading2FA">Error Loading 2FA Settings</h2>
  <p class="tsl" data-tsl="errorOccurred">An error occurred while loading your two-factor authentication settings:</p>
  <p style="color: red;">${
    error instanceof Error ? error.message : "Unknown error"
  }</p>
  <button class="tsl" data-tsl="returnToMenu" onclick="location.href='/menu'">Return to Menu</button>
</div>

			`;
    }
    translatePage();
  }
}

async function showSetup2FAInterface(): Promise<void> {
  const contentDiv = document.getElementById("2FAcontent");
  if (!contentDiv) return;

  contentDiv.innerHTML = "";

  const setupContainer = document.createElement("div");
  setupContainer.id = "2fa-setup-container";
  setupContainer.innerHTML = `
   <h2 class="tsl" data-tsl="setup2FA">Set Up Two-Factor Authentication</h2>

<p class="tsl" data-tsl="setup2FADesc">
  Two-factor authentication adds an extra layer of security to your account. 
  Once enabled, you'll need to enter a verification code from your authentication app 
  each time you sign in to your account.
</p>

<div id="qrcode-container" style="display: flex; justify-content: center; margin: 20px 0;">
  <p class="tsl" data-tsl="loadingQR">Loading QR code...</p>
</div>

<div id="manual-entry-container" style="margin: 20px 0; display: none;">
  <p class="tsl" data-tsl="manualEntryHelp">
    If you can't scan the QR code, you can manually enter this code in your app:
  </p>
  <div id="secret-key" style="font-family: monospace; background: #f0f0f0; padding: 10px; border-radius: 4px; color: black;"></div>
</div>

<div style="display: flex; justify-content: center;">
  <button id="show-manual-entry-btn" class="tsl" data-tsl="showManualCode">
    Can't scan? Show manual entry code
  </button>
</div>

<div id="verification-container" style="margin-top: 20px;">
  <p class="tsl" data-tsl="enterCodeVerify" style="margin-bottom: 10px;">
    Enter the 6-digit verification code from your authentication app:
  </p>
  <input type="text" id="verification-code" placeholder="000000" maxlength="6" style="font-size: 18px; letter-spacing: 4px; padding: 8px;">
  <p id="verification-error" class="tsl" data-tsl="invalidCode" style="color: red; display: none;"></p>
  <button id="verify-btn" class="tsl" data-tsl="verifyEnable2FA">Verify and Enable 2FA</button>
</div>

<div style="margin-top: 30px;">
  <p class="tsl" data-tsl="backupNotice">
    <strong>Important:</strong> Store these backup codes in a safe place. If you lose your device, you'll need these codes to access your account.
  </p>
  <div id="backup-codes" style="font-family: monospace; background: #f0f0f0; padding: 10px; border-radius: 4px; display: none;"></div>
</div>

<div class="back-btn" style="margin-top: 20px;">
  <button id="back-btn" class="tsl" data-tsl="backToProfile">Back to Profile</button>
</div>

  `;

  contentDiv.appendChild(setupContainer);
  translatePage();

  const showManualEntryBtn = document.getElementById("show-manual-entry-btn");
  const verifyBtn = document.getElementById("verify-btn");
  const backBtn = document.getElementById("back-btn");

  if (showManualEntryBtn) {
    showManualEntryBtn.addEventListener("click", () => {
      const manualEntryContainer = document.getElementById(
        "manual-entry-container"
      );
      if (manualEntryContainer) {
        manualEntryContainer.style.display = "block";
      }
      showManualEntryBtn.style.display = "none";
    });
  }

  if (verifyBtn) {
    verifyBtn.addEventListener("click", verifyAndEnable2FA);
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      modal.innerHTML = "";
      modal.style.display = "none";
    });
  }

  try {
    console.log("Calling setup2FA API...");
    const result = await authService.setup2FA();
    console.log("Setup2FA result:", result);

    const qrcodeContainer = document.getElementById("qrcode-container");
    if (qrcodeContainer && result.qrCode) {
      qrcodeContainer.innerHTML = `<img src="${result.qrCode}" alt="2FA QR Code">`;
    } else if (qrcodeContainer) {
      qrcodeContainer.innerHTML =
        '<p style="color: red;">Error: QR code data not received from server.</p>';
    }

    const secretKeyElement = document.getElementById("secret-key");
    if (secretKeyElement && result.secret) {
      secretKeyElement.textContent = result.secret;
    } else if (secretKeyElement) {
      secretKeyElement.textContent =
        "Error: Secret key not received from server.";
    }
  } catch (error) {
    console.error("Error setting up 2FA:", error);
    const qrcodeContainer = document.getElementById("qrcode-container");
    if (qrcodeContainer) {
      qrcodeContainer.innerHTML = `
				<p style="color: red;">Error generating QR code: ${
          error instanceof Error ? error.message : "Server connection failed"
        }</p>
				<p>Please check your network connection and try again later, or contact support if the issue persists.</p>
			`;
    }
  }
}

function showEnable2FAInterface(): void {
  const contentDiv = document.getElementById("2FAcontent");
  if (!contentDiv) return;

  contentDiv.innerHTML = "";

  const enableContainer = document.createElement("div");
  enableContainer.id = "2fa-enable-container";
  enableContainer.innerHTML = `
    <h2 class="tsl" data-tsl="enableTwo">Enable Two-Factor Authentication</h2>
<p class="tsl" data-tsl="alreadySetup">
  Your account is already set up for two-factor authentication, but it's not currently enabled.
</p>
<div id="verification-container" style="margin-top: 20px;">
  <p class="tsl" data-tsl="enterCode" style="margin-bottom: 10px;">
    Enter the 6-digit verification code from your authentication app to enable 2FA:
  </p>
  <input type="text" id="verification-code" placeholder="000000" maxlength="6" style="font-size: 18px; letter-spacing: 4px; padding: 8px;">
  <p id="verification-error" class="tsl" data-tsl="invalidCode" style="color: red; display: none;"></p>
  <button id="enable-btn" class="tsl" data-tsl="enable2FA">Enable 2FA</button>
</div>

<div class="back-btn" style="margin-top: 20px;">
  <button id="setup-new-btn" class="tsl" data-tsl="setupNewDevice">Set up with a new device</button>
  <button id="back-btn" class="tsl" data-tsl="backToProfile">Back to Profile</button>
</div>

  `;

  contentDiv.appendChild(enableContainer);
  translatePage();

  const enableBtn = document.getElementById("enable-btn");
  const setupNewBtn = document.getElementById("setup-new-btn");
  const backBtn = document.getElementById("back-btn");

  if (enableBtn) {
    enableBtn.addEventListener("click", verifyAndEnable2FA);
  }

  if (setupNewBtn) {
    setupNewBtn.addEventListener("click", showSetup2FAInterface);
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      modal.innerHTML = "";
      modal.style.display = "none";
    });
  }
}

function showDisable2FAInterface(): void {
  const contentDiv = document.getElementById("2FAcontent");
  if (!contentDiv) return;

  contentDiv.innerHTML = "";

  const disableContainer = document.createElement("div");
  disableContainer.id = "2fa-disable-container";
  disableContainer.innerHTML = `
   <h2 class="tsl" data-tsl="manage2FA">Manage Two-Factor Authentication</h2>

<p class="tsl" data-tsl="faEnabled">
  Two-factor authentication is currently <strong style="color: #88ec88;">Enabled</strong> for your account.
</p>

<div style="margin-top: 20px; padding: 70px; background-color: #393a60; border-radius: 4px; color: white;">
  <h2 class="tsl" data-tsl="disable2FAHeading" style="color: #f87474;">Disable 2FA</h2>
  <p class="tsl" data-tsl="disableWarning" style="color: #d37a71;">
    Warning: Disabling 2FA will make your account less secure.
  </p>
  <p class="tsl" data-tsl="enterCodeToDisable" style="margin: 10px 0px;">
    Please enter the 6-digit verification code from your authenticator app:
  </p>
  <input type="text" id="verification-code" placeholder="000000" maxlength="6" style="font-size: 18px; letter-spacing: 4px; padding: 8px;">
  <p id="verification-error" class="tsl" data-tsl="invalidCode" style="color: red; display: none;"></p>
  <button id="disable-btn" class="tsl" data-tsl="disable2FA">Disable 2FA</button>
</div>

<div class="back-btn" style="margin-top: 20px;">
  <button id="back-btn" class="tsl" data-tsl="backToProfile">Back to Profile</button>
</div>

  `;

  contentDiv.appendChild(disableContainer);
  translatePage();

  const disableBtn = document.getElementById("disable-btn");
  const backBtn = document.getElementById("back-btn");

  if (disableBtn) {
    disableBtn.addEventListener("click", verifyAndDisable2FA);
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      modal.innerHTML = "";
      modal.style.display = "none";
    });
  }
}

async function verifyAndEnable2FA(): Promise<void> {
  const verificationCodeInput = document.getElementById(
    "verification-code"
  ) as HTMLInputElement;
  const verificationError = document.getElementById("verification-error");
  const enableBtn =
    document.getElementById("enable-btn") ||
    document.getElementById("verify-btn");

  if (!verificationCodeInput || !verificationError) return;

  const code = verificationCodeInput.value.trim();

  if (!/^\d{6}$/.test(code)) {
    verificationError.textContent = "Please enter a valid 6-digit code.";
    verificationError.style.display = "block";
    return;
  }

  try {
    if (enableBtn) {
      enableBtn.textContent = "Verifying...";
      enableBtn.setAttribute("data-tsl", "Verifying");
      translatePage();
      enableBtn.setAttribute("disabled", "true");
    }

    const verifyResult = await authService.verify2FA(code);
    console.log(verifyResult);
    if (!verifyResult.valid) {
      verificationError.textContent =
        "Invalid verification code. Please try again.";
      verificationError.setAttribute("data-tsl", "Invalidveri");
      verificationError.style.display = "block";
      if (enableBtn) {
        enableBtn.textContent = "Enable 2FA";
        enableBtn.removeAttribute("disabled");
      }
      translatePage();
      return;
    }

    const enableResult = await authService.enable2FA(code);

    if (enableResult.success) {
      alert("Two-factor authentication has been enabled for your account.");
      modal = document.getElementById("FAmodal") as HTMLElement;
      modal.innerHTML = "";
      modal.style.display = "none";
    } else {
      verificationError.textContent = "Failed to enable 2FA. Please try again.";
      verificationError.style.display = "block";
      if (enableBtn) {
        enableBtn.textContent = "Enable 2FA";
        enableBtn.removeAttribute("disabled");
      }
    }
  } catch (error) {
    console.error("Error enabling 2FA:", error);
    verificationError.textContent =
      "An error occurred. Please try again later.";
    verificationError.style.display = "block";
    if (enableBtn) {
      enableBtn.textContent = "Enable 2FA";
      enableBtn.removeAttribute("disabled");
    }
  }
}

async function verifyAndDisable2FA(): Promise<void> {
  const verificationCodeInput = document.getElementById(
    "verification-code"
  ) as HTMLInputElement;
  const verificationError = document.getElementById("verification-error");
  const disableBtn = document.getElementById("disable-btn");

  if (!verificationCodeInput || !verificationError) return;

  const code = verificationCodeInput.value.trim();

  if (!/^\d{6}$/.test(code)) {
    verificationError.textContent = "Please enter a valid 6-digit code.";
    verificationError.setAttribute("data-tsl", "validSix");
    verificationError.style.display = "block";
    translatePage();
    return;
  }

  try {
    if (disableBtn) {
      disableBtn.textContent = "Verifying...";
      disableBtn.setAttribute("data-tsl", "Verifying");
      translatePage();
      disableBtn.setAttribute("disabled", "true");
    }

    const verifyResult = await authService.verify2FA(code);

    if (!verifyResult.valid) {
      verificationError.textContent =
        "Invalid verification code. Please try again.";
      verificationError.setAttribute("data-tsl", "Invalidveri");
      verificationError.style.display = "block";
      if (disableBtn) {
        disableBtn.textContent = "Disable 2FA";
        disableBtn.removeAttribute("disabled");
      }
      translatePage();
      return;
    }

    const confirmDisable = confirm(
      "Are you sure you want to disable two-factor authentication? This will make your account less secure."
    );

    if (!confirmDisable) {
      if (disableBtn) {
        disableBtn.textContent = "Disable 2FA";
        disableBtn.setAttribute("data-tsl", "disable2FAHeading");
        disableBtn.removeAttribute("disabled");
      }
      translatePage();
      return;
    }

    const disableResult = await authService.disable2FA();

    if (disableResult.success) {
      alert("Two-factor authentication has been disabled for your account.");
      modal = document.getElementById("FAmodal") as HTMLElement;
      modal.innerHTML = "";
      modal.style.display = "none";
    } else {
      verificationError.textContent =
        "Failed to disable 2FA. Please try again.";
      verificationError.setAttribute("data-tsl", "FailedVeri");
      verificationError.style.display = "block";
      if (disableBtn) {
        disableBtn.textContent = "Disable 2FA";
        disableBtn.setAttribute("data-tsl", "disable2FAHeading");
        disableBtn.removeAttribute("disabled");
      }
    }
  } catch (error) {
    console.error("Error disabling 2FA:", error);
    verificationError.textContent =
      "An error occurred. Please try again later.";
    verificationError.setAttribute("data-tsl", "erroroccurred");
    verificationError.style.display = "block";
    if (disableBtn) {
      disableBtn.textContent = "Disable 2FA";
      disableBtn.setAttribute("data-tsl", "disable2FAHeading");
      disableBtn.removeAttribute("disabled");
    }
  }
  translatePage();
}
