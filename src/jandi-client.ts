import type {
  JandiConfig,
  RoomsResponse,
  MessagesResponse,
  CommentsResponse,
  MembersResponse,
  TokenResponse,
  UserInfoResponse,
} from "./types.js";

const BASE_URL = "https://i1.jandi.com";

export class JandiClient {
  private refreshToken: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private teamId: string | null = null;
  private memberId: string | null = null;
  private accountId: string | null = null;
  private initialized: boolean = false;

  constructor(config: JandiConfig) {
    this.refreshToken = config.refreshToken;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    const response = await fetch(`${BASE_URL}/inner-api/token`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.tosslab.jandi-v4+json",
        "Content-Type": "application/json;charset=UTF-8",
        "x-user-agent": "Jandi/25.46 (web; Windows; 10.0; Browser; Chrome;)",
        Origin: "https://www.jandi.com",
      },
      body: JSON.stringify({
        refresh_token: this.refreshToken,
        grant_type: "refresh_token",
        platform: "web",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to refresh token: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data = (await response.json()) as TokenResponse;
    this.accessToken = data.access_token;
    // Set expiry 5 minutes before actual expiry to be safe
    this.tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
  }

  /**
   * Fetch user info to get teamId, memberId, accountId
   */
  private async fetchUserInfo(): Promise<void> {
    if (!this.accessToken) {
      throw new Error("Access token not available");
    }

    const response = await fetch(`${BASE_URL}/account-api/v1/me`, {
      method: "GET",
      headers: {
        Authorization: `bearer ${this.accessToken}`,
        Accept: "application/vnd.tosslab.jandi-v1+json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch user info: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as UserInfoResponse;
    this.accountId = data.uuid;

    if (data.memberships && data.memberships.length > 0) {
      const membership = data.memberships[0];
      this.teamId = String(membership.teamId);
      this.memberId = String(membership.memberId);
    } else {
      throw new Error("No team membership found");
    }
  }

  /**
   * Ensure we have a valid token and user info
   */
  private async ensureInitialized(): Promise<void> {
    // Check if token needs refresh
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      await this.refreshAccessToken();
    }

    // Fetch user info if not initialized
    if (!this.initialized) {
      await this.fetchUserInfo();
      this.initialized = true;
    }
  }

  private getBaseHeaders(): Record<string, string> {
    return {
      Authorization: `bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "x-team-id": this.teamId!,
      "x-member-id": this.memberId!,
      "x-account-id": this.accountId!,
      "x-user-agent": "Jandi/25.50 (web; Windows; 10.0; Browser; Chrome;)",
    };
  }

  /**
   * Make an API request with automatic token refresh on 401
   */
  private async makeRequest<T>(url: string, options: RequestInit): Promise<T> {
    await this.ensureInitialized();

    let response = await fetch(url, options);

    // If 401, try refreshing token and retry once
    if (response.status === 401) {
      await this.refreshAccessToken();
      // Update authorization header with new token
      const headers = options.headers as Record<string, string>;
      headers.Authorization = `bearer ${this.accessToken}`;
      response = await fetch(url, { ...options, headers });
    }

    if (!response.ok) {
      throw new Error(
        `Request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<T>;
  }

  async getRooms(): Promise<RoomsResponse> {
    await this.ensureInitialized();
    const url = `${BASE_URL}/start-api/v4/teams/${this.teamId}/rooms`;

    return this.makeRequest<RoomsResponse>(url, {
      method: "GET",
      headers: {
        ...this.getBaseHeaders(),
        Accept: "application/vnd.tosslab.jandi-v4+json",
      },
    });
  }

  async getMessages(
    roomId: string,
    count: number = 30,
    linkId?: string,
  ): Promise<MessagesResponse> {
    await this.ensureInitialized();
    let url = `${BASE_URL}/message-api/v2/teams/${this.teamId}/rooms/${roomId}/messages?count=${count}`;

    if (linkId) {
      url += `&linkId=${linkId}`;
    }

    return this.makeRequest<MessagesResponse>(url, {
      method: "GET",
      headers: {
        ...this.getBaseHeaders(),
        Accept: "application/vnd.tosslab.jandi-v2+json",
      },
    });
  }

  async getComments(
    postId: string,
    count: number = 10,
  ): Promise<CommentsResponse> {
    await this.ensureInitialized();
    const url = `${BASE_URL}/message-api/v1/teams/${this.teamId}/posts/${postId}/comments?count=${count}`;

    return this.makeRequest<CommentsResponse>(url, {
      method: "GET",
      headers: {
        ...this.getBaseHeaders(),
        Accept: "application/vnd.tosslab.jandi-v1+json",
      },
    });
  }

  async getMembers(): Promise<MembersResponse> {
    await this.ensureInitialized();
    const url = `${BASE_URL}/start-api/v4/teams/${this.teamId}`;

    return this.makeRequest<MembersResponse>(url, {
      method: "GET",
      headers: {
        ...this.getBaseHeaders(),
        Accept: "application/vnd.tosslab.jandi-v4+json",
      },
    });
  }

  async downloadImage(
    imageUrl: string,
  ): Promise<{ base64: string; mimeType: string } | null> {
    try {
      await this.ensureInitialized();

      const response = await fetch(imageUrl, {
        method: "GET",
        headers: {
          Authorization: `bearer ${this.accessToken}`,
          "x-team-id": this.teamId!,
          "x-member-id": this.memberId!,
          "x-account-id": this.accountId!,
        },
      });

      if (!response.ok) {
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = response.headers.get("content-type") || "image/png";

      return { base64, mimeType };
    } catch {
      return null;
    }
  }
}

export function createJandiClient(): JandiClient {
  const refreshToken = process.env.JANDI_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error(
      "Missing Jandi credentials. Please set JANDI_REFRESH_TOKEN environment variable.",
    );
  }

  return new JandiClient({
    refreshToken,
  });
}
