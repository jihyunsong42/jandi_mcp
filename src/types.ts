// Jandi API response types

export interface JandiConfig {
  accessToken: string;
  teamId: string;
  memberId: string;
  accountId: string;
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
