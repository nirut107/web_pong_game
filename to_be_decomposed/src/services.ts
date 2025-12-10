

// Can move these to env instead.
const API_CONFIG = {
  auth: "/api/v1/auth",
  user: "http://localhost:3001/api/v1",
  game: "http://localhost:3003/api/v1",
  chat: "http://localhost:3004/api/v1",
  analytics: "http://localhost:3005/api/v1",
  gateway: "http://localhost:8000/api/v1",
  socket: "https://localhost:8888",
  pongSocket: "https://localhost:9999",
  // socket: "https://10.13.5.4:8888",
  // pongSocket: "https://10.13.5.4:9999",
};

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

// function getCookie(name: string): string | null {
// 	const value = `; ${document.cookie}`;
// 	const parts = value.split(`; ${name}=`);
// 	if (parts.length === 2) {
// 		const cookieValue = parts.pop();
// 		return cookieValue ? cookieValue.split(';').shift() || null : null;
// 	}
// 	return null;
// }

// function setCookie(name: string, value: string, days: number = 7): void {
// 	const date = new Date();
// 	date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
// 	const expires = `expires=${date.toUTCString()}`;
// 	document.cookie = `${name}=${value};${expires};path=/`;
// }

// function clearCookie(name: string): void {
// 	document.cookie = `${name}=; path=/; max-age=0`;
// }

async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const token = getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data;
    try {
      if (response.headers.get("content-type")?.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (parseError) {
      data = { error: "Failed to parse response" };
    }

    if (!response.ok) {
      if (response.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          return fetchWithAuth(url, options);
        } else {
          handleAuthFailure();
          throw new ApiError("Authentication required", 401, data);
        }
      }

      throw new ApiError(
        data.message || data.error || "API request failed",
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Network error: ${(error as Error).message}`, 0);
  }
}

function handleAuthFailure(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userUID");
}

async function refreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refreshToken");

  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_CONFIG.auth}/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    localStorage.setItem("token", data.token);
    if (data.refreshToken) {
      localStorage.setItem("refreshToken", data.refreshToken);
    }

    return true;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return false;
  }
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  profile?: {
    displayName: string;
    avatarUrl?: string;
    status?: string;
    bio?: string;
  } | null;
}

export interface AuthResponse {
  token?: string;
  refreshToken?: string;
  user?: User;
  requires2FA?: boolean;
  isAuthenticated?: boolean;
  message?: string;
}

export const authService = {
  async login(
    username: string,
    password: string,
    totpToken?: string
  ): Promise<AuthResponse> {
    try {
      const endpoints = [
        `${API_CONFIG.gateway}/auth/login`,
        `${API_CONFIG.auth}/login`,
      ];

      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          const data = await fetchWithAuth(endpoint, {
            method: "POST",
            body: JSON.stringify({
              username,
              password,
              totpToken,
            }),
          });

          if (data.token && !data.user) {
            try {
              localStorage.setItem("token", data.token);

              const userResponse = await this.checkAuthStatus();

              return {
                ...data,
                user: userResponse.user,
                isAuthenticated: true,
              };
            } catch (userError) {
              return data;
            }
          }

          return data;
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError || new Error("Login failed");
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw error;
    }
  },

  async register(
    username: string,
    email: string,
    password: string
  ): Promise<AuthResponse> {
    try {
      const data = await fetchWithAuth(`${API_CONFIG.auth}/register`, {
        method: "POST",
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      });

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw error;
    }
  },

  async checkAuthStatus(): Promise<AuthResponse> {
    try {
      const data = await fetchWithAuth(`${API_CONFIG.auth}/status`);
      return data;
    } catch (error) {
      return { isAuthenticated: false };
    }
  },

  async setup2FA(): Promise<{
    qrCodeUrl: string;
    secret: string;
    qrCode: string;
  }> {
    try {
      const data = await fetchWithAuth(`${API_CONFIG.auth}/2fa/setup`, {
        method: "POST",
        body: JSON.stringify({ test: "test" }),
      });
      return { ...data, qrCode: data.qrCode };
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw error;
    }
  },

  async verify2FA(
    token: string
  ): Promise<{ success: boolean; message: string; valid: boolean }> {
    try {
      console.log("verify", token);
      const data = await fetchWithAuth(`${API_CONFIG.auth}/2fa/verify`, {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      return { ...data, valid: data.valid};
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
	  console.log(error)
      return {success:false, message: "error", valid: false };
    }
  },

  async enable2FA(
    token: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const data = await fetchWithAuth(`${API_CONFIG.auth}/2fa/enable`, {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw error;
    }
  },

  async disable2FA(
    token?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const data = await fetchWithAuth(`${API_CONFIG.auth}/2fa/disable`, {
        method: "POST",
        body: JSON.stringify(token ? { token } : {}),
      });
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw error;
    }
  },

  async get2FAStatus(): Promise<{ isEnabled: boolean; isSetup: boolean }> {
    try {
      const data = await fetchWithAuth(`${API_CONFIG.auth}/2fa/status`);
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      return { isEnabled: false, isSetup: false };
    }
  },
};

/**
 * User service methods
 */
export const userService = {
  /**
   * Get the current user's profile
   */
  async getProfile(): Promise<{
    id: string;
    username: string;
    email: string;
    isActive: boolean;
    profile: {
      displayName: string;
      avatarUrl?: string;
      status?: string;
      bio?: string;
    } | null;
  }> {
    // Try the new unified endpoint first
    try {
      return await fetchWithAuth(`${API_CONFIG.gateway}/profile`);
    } catch (error) {
      // Fall back to the auth service /me endpoint
      return fetchWithAuth(`${API_CONFIG.auth}/me`);
    }
  },

  /**
   * Update the current user's profile
   */
  async updateProfile(profileData: {
    displayName?: string;
    avatarUrl?: string;
    status?: string;
    bio?: string;
  }): Promise<any> {
    return fetchWithAuth(`${API_CONFIG.user}/users/me/profile`, {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  },

  /**
   * Upload a user avatar
   */
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append("avatar", file);

    return fetchWithAuth(`${API_CONFIG.user}/users/me/avatar`, {
      method: "POST",
      headers: {},
      body: formData,
    });
  },

  async getFriends(): Promise<any[]> {
    return fetchWithAuth(`${API_CONFIG.user}/users/me/friends`);
  },

  async addFriend(username: string): Promise<any> {
    return fetchWithAuth(`${API_CONFIG.user}/users/me/friends`, {
      method: "POST",
      body: JSON.stringify({ username }),
    });
  },

  async removeFriend(friendId: string): Promise<void> {
    return fetchWithAuth(`${API_CONFIG.user}/users/me/friends/${friendId}`, {
      method: "DELETE",
    });
  },
};

/**
 * Game service methods
 */
export const gameService = {
  async getGameHistory(): Promise<any[]> {
    return fetchWithAuth(`${API_CONFIG.game}/games/history`);
  },

  async createGame(gameType: string, config: any): Promise<any> {
    return fetchWithAuth(`${API_CONFIG.game}/games`, {
      method: "POST",
      body: JSON.stringify({ type: gameType, config }),
    });
  },

  async joinGame(gameId: string): Promise<any> {
    return fetchWithAuth(`${API_CONFIG.game}/games/${gameId}/join`, {
      method: "POST",
    });
  },

  async getActiveGames(): Promise<any[]> {
    return fetchWithAuth(`${API_CONFIG.game}/games/active`);
  },

  async getLeaderboard(gameType?: string): Promise<any[]> {
    const endpoint = gameType
      ? `${API_CONFIG.analytics}/leaderboard?gameType=${gameType}`
      : `${API_CONFIG.analytics}/leaderboard`;
    return fetchWithAuth(endpoint);
  },
};

/**
 * Chat service methods
 */
export const chatService = {
  async getChannels(): Promise<any[]> {
    return fetchWithAuth(`${API_CONFIG.chat}/channels`);
  },

  async createChannel(name: string, isPrivate: boolean = false): Promise<any> {
    return fetchWithAuth(`${API_CONFIG.chat}/channels`, {
      method: "POST",
      body: JSON.stringify({ name, isPrivate }),
    });
  },

  async getChannelMessages(channelId: string): Promise<any[]> {
    return fetchWithAuth(`${API_CONFIG.chat}/channels/${channelId}/messages`);
  },

  async sendChannelMessage(channelId: string, message: string): Promise<any> {
    return fetchWithAuth(`${API_CONFIG.chat}/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: message }),
    });
  },

  async getDirectMessages(userId: string): Promise<any[]> {
    return fetchWithAuth(`${API_CONFIG.chat}/messages/direct/${userId}`);
  },

  async sendDirectMessage(userId: string, message: string): Promise<any> {
    return fetchWithAuth(`${API_CONFIG.chat}/messages/direct`, {
      method: "POST",
      body: JSON.stringify({ recipientId: userId, content: message }),
    });
  },
};

/**
 * Check authentication status on page load
 * Call this function on every page to ensure authentication
 */
export async function checkAuthStatus(): Promise<AuthResponse> {
  const token = getAuthToken();

  if (!token) {
    // Try to refresh if we have a refresh token
    const refreshed = await refreshToken();
    if (!refreshed) {
      handleAuthFailure();
      return { isAuthenticated: false };
    }
  }

  try {
    const user = await userService.getProfile();
    return { isAuthenticated: true, user };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      handleAuthFailure();
    }
    return { isAuthenticated: false };
  }
}

import io from "socket.io-client";
import { showNotification } from "./manage";

export const socketService = {
  socket: null as any,
  getSocket() {
    if (!this.socket) {
      this.socket = io(API_CONFIG.socket, {
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        secure: false,
        rejectUnauthorized: false,
        transports: ["websocket", "polling"],
        withCredentials: true,
        auth: {
          token: getAuthToken(),
        },
      });

      this.socket.on("connect_error", (error: any) => {
        console.error("Socket connection error:", error);
      });

      this.socket.on("error", (error: any) => {
        console.error("Socket error:", error);
      });

      this.socket.on("connect", () => {
        console.log("Socket connected successfully to", API_CONFIG.socket);
      });
    }
    return this.socket;
  },
  emit(event: string, data: any) {
    const socket = this.getSocket();
    socket.emit(event, data);
  },
  on(event: string, callback: Function) {
    const socket = this.getSocket();
    socket.on(event, callback);
  },
  off(event: string, callback?: Function) {
    const socket = this.getSocket();
    if (callback) {
      socket.off(event, callback);
    } else {
      socket.off(event);
    }
  },
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  },
};



export const pongSocketService = {
  socket: null as any,
  getSocket() {
    if (!this.socket) {
      this.socket = io(API_CONFIG.pongSocket, {
        path: "/pong" ,
        // cors: {
        //   origin: "*", 
        //   methods: ["GET", "POST"],
        //   credentials: false,
        // },
        secure: true 
    
      });

      this.socket.on("connect_error", (error: any) => {
        console.error("Socket connection error:", error);
      });


      let hasHandledSocketError = false ;

      this.socket.on("error", (error: any) => {
        if (hasHandledSocketError) return;
          hasHandledSocketError = true;

        console.error("Socket error:", error);
        showNotification( error.message  , [
          {
               text : 'OK',  
               onClick: async () => {
                  // await navigateTo("/gamelibrary")
               }                      
               
           } as ModalButton 
        ] , "txtErrorMessage")
      });

      this.socket.on("connect", () => {
        console.log("Socket connected successfully to", API_CONFIG.socket);
      });
    }
    return this.socket;
  },
  emit(event: string, data: any) {
    const socket = this.getSocket();
    socket.emit(event, data);
  },
  on(event: string, callback: Function) {
    const socket = this.getSocket();
    socket.on(event, callback);
  },
  off(event: string, callback?: Function) {
    const socket = this.getSocket();
    if (callback) {
      socket.off(event, callback);
    } else {
      socket.off(event);
    }
  },
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  },
};


// Export the services
export default {
  auth: authService,
  user: userService,
  game: gameService,
  chat: chatService,
  socket: socketService,
  pongSocket: pongSocketService, 
  checkAuthStatus,
};
