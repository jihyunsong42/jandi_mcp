// Jandi API response types

export interface JandiConfig {
  refreshToken?: string;
  email?: string;
  password?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  ts: number;
}

export interface UserInfoResponse {
  uuid: string;
  name: string;
  memberships: Array<{
    teamId: number;
    memberId: number;
    name: string;
    domain: string;
  }>;
}

export interface Room {
  id: number;
  name: string;
  type: string;
  description?: string;
  memberCount?: number;
}

export interface RoomsResponse {
  rooms?: Room[];
  topics?: Room[];
  channels?: Room[];
  [key: string]: unknown;
}

export interface Message {
  id: number;
  content?: {
    body?: string;
    text?: string;
  };
  writer?: {
    id: number;
    name: string;
  };
  writerId?: number;
  writerName?: string;
  createdAt?: string;
  createTime?: string;
  linkId?: number;
}

export interface MessagesResponse {
  messages?: Message[];
  records?: Message[];
  [key: string]: unknown;
}

export interface Comment {
  id: number;
  content?: {
    body?: string;
    text?: string;
  };
  writer?: {
    id: number;
    name: string;
  };
  createdAt?: string;
}

export interface CommentsResponse {
  comments?: Comment[];
  records?: Comment[];
  [key: string]: unknown;
}

export interface Member {
  id: number;
  name: string;
  email?: string;
  profileImageUrl?: string;
  department?: string;
  position?: string;
  status?: string;
}

export interface MembersResponse {
  members?: Member[];
  records?: Member[];
  [key: string]: unknown;
}
