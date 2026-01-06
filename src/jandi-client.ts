import type {
  JandiConfig,
  RoomsResponse,
  MessagesResponse,
  CommentsResponse,
} from "./types.js";

const BASE_URL = "https://i1.jandi.com";

export class JandiClient {
  private config: JandiConfig;

  constructor(config: JandiConfig) {
    this.config = config;
  }

  private getBaseHeaders(): Record<string, string> {
    return {
      Authorization: `bearer ${this.config.accessToken}`,
      "Content-Type": "application/json",
      "x-team-id": this.config.teamId,
      "x-member-id": this.config.memberId,
      "x-account-id": this.config.accountId,
      "x-user-agent": "Jandi/25.50 (web; Windows; 10.0; Browser; Chrome;)",
    };
  }

  async getRooms(): Promise<RoomsResponse> {
    const url = `${BASE_URL}/start-api/v4/teams/${this.config.teamId}/rooms`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getBaseHeaders(),
        Accept: "application/vnd.tosslab.jandi-v4+json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get rooms: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<RoomsResponse>;
  }

  async getMessages(
    roomId: string,
    count: number = 30,
    linkId?: string,
  ): Promise<MessagesResponse> {
    let url = `${BASE_URL}/message-api/v2/teams/${this.config.teamId}/rooms/${roomId}/messages?count=${count}`;

    if (linkId) {
      url += `&linkId=${linkId}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getBaseHeaders(),
        Accept: "application/vnd.tosslab.jandi-v2+json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get messages: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<MessagesResponse>;
  }

  async getComments(
    postId: string,
    count: number = 10,
  ): Promise<CommentsResponse> {
    const url = `${BASE_URL}/message-api/v1/teams/${this.config.teamId}/posts/${postId}/comments?count=${count}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getBaseHeaders(),
        Accept: "application/vnd.tosslab.jandi-v1+json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get comments: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<CommentsResponse>;
  }
}

export function createJandiClient(): JandiClient {
  const accessToken = process.env.JANDI_ACCESS_TOKEN;
  const teamId = process.env.JANDI_TEAM_ID;
  const memberId = process.env.JANDI_MEMBER_ID;
  const accountId = process.env.JANDI_ACCOUNT_ID;

  if (!accessToken || !teamId || !memberId || !accountId) {
    throw new Error(
      "Missing Jandi credentials. Please set JANDI_ACCESS_TOKEN, JANDI_TEAM_ID, JANDI_MEMBER_ID, JANDI_ACCOUNT_ID environment variables.",
    );
  }

  return new JandiClient({
    accessToken,
    teamId,
    memberId,
    accountId,
  });
}
