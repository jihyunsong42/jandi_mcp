#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createJandiClient } from "./jandi-client.js";
import type { Message, Comment } from "./types.js";

const server = new Server(
  {
    name: "jandi-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Create client once at startup
let jandiClient: ReturnType<typeof createJandiClient> | null = null;

function getClient() {
  if (!jandiClient) {
    jandiClient = createJandiClient();
  }
  return jandiClient;
}

// Tool schemas
const GetMessagesSchema = z.object({
  roomId: z.string().describe("Room/Channel ID to get messages from"),
  count: z
    .number()
    .optional()
    .default(30)
    .describe("Number of messages to retrieve (default: 30)"),
  ts: z
    .number()
    .optional()
    .describe(
      "Timestamp in milliseconds to fetch messages before this time (e.g., 1767193200000 for 2025-12-31)",
    ),
});

const GetCommentsSchema = z.object({
  postId: z.string().describe("Post ID to get comments from"),
  count: z
    .number()
    .optional()
    .default(10)
    .describe("Number of comments to retrieve (default: 10)"),
});

const FindDmByNameSchema = z.object({
  name: z.string().describe("Name of the person to find DM room for"),
});

// Format message for display
function formatMessage(msg: any): string {
  const writerId = msg.message?.writerId || msg.fromEntity || "Unknown";
  const content = msg.message?.content?.body || "(no content)";
  const time = msg.message?.createdAt || "";
  const contentType = msg.message?.contentType || msg.contentType || "unknown";
  const feedbackId = msg.feedbackId || msg.message?.feedbackId || null;
  const messageId = msg.messageId || msg.message?.id || null;
  const commentCount = msg.message?.commentCount || 0;
  const attachments = msg.message?.attachments || [];

  // 타입 라벨 결정
  let typeLabel = "";

  // feedbackId가 양수면 다른 메시지에 달린 댓글
  if (feedbackId && feedbackId > 0) {
    typeLabel = `[댓글 → #${feedbackId}]`;
  } else {
    // 원본 메시지 (feedbackId가 -1 또는 없음)
    let msgType = "";
    if (contentType === "text") {
      msgType = "메시지";
    } else if (contentType === "sticker") {
      msgType = "스티커";
    } else if (contentType === "file") {
      msgType = "파일";
    } else if (contentType === "poll") {
      msgType = "투표";
    } else {
      msgType = contentType;
    }

    typeLabel = `[${msgType} #${messageId}]`;
    if (commentCount > 0) {
      typeLabel += ` (댓글 ${commentCount}개)`;
    }
  }

  // 첨부파일 정보
  let attachmentInfo = "";
  if (attachments.length > 0) {
    const attachList = attachments.map((att: any) => {
      const name = att.content?.title || att.content?.name || "파일";
      const type = att.content?.type || "";
      const fileUrl = att.content?.fileUrl || "";
      const thumbnailUrl =
        att.content?.extraInfo?.largeThumbnailUrl ||
        att.content?.extraInfo?.thumbnailUrl ||
        "";
      if (type.startsWith("image/")) {
        // 이미지는 썸네일 URL 포함
        return `[이미지: ${name}]\n      URL: ${thumbnailUrl || fileUrl}`;
      } else {
        return `[파일: ${name}]\n      URL: ${fileUrl}`;
      }
    });
    attachmentInfo = `\n    📎 첨부:\n      ${attachList.join("\n      ")}`;
  }

  return `${typeLabel} [${time}] User ${writerId}: ${content}${attachmentInfo}`;
}

// Format comment for display
function formatComment(comment: any): string {
  const writerId = comment.writerId || "Unknown";
  const content = comment.content?.body || "(no content)";
  const time = comment.createdAt || "";
  return `[${time}] User ${writerId}: ${content}`;
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "jandi_get_rooms",
        description: "Get list of rooms/channels/topics in the team",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "jandi_get_messages",
        description: "Get messages from a specific room/channel",
        inputSchema: {
          type: "object",
          properties: {
            roomId: {
              type: "string",
              description: "Room/Channel ID to get messages from",
            },
            count: {
              type: "number",
              description: "Number of messages to retrieve (default: 30)",
            },
            ts: {
              type: "number",
              description:
                "Timestamp in milliseconds to fetch messages before this time (e.g., 1767193200000 for 2025-12-31)",
            },
          },
          required: ["roomId"],
        },
      },
      {
        name: "jandi_get_comments",
        description: "Get comments from a specific post",
        inputSchema: {
          type: "object",
          properties: {
            postId: {
              type: "string",
              description: "Post ID to get comments from",
            },
            count: {
              type: "number",
              description: "Number of comments to retrieve (default: 10)",
            },
          },
          required: ["postId"],
        },
      },
      {
        name: "jandi_find_dm_by_name",
        description:
          "Find a DM room by person's name. Returns roomId and member info.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description:
                "Name of the person to find DM room for (partial match supported)",
            },
          },
          required: ["name"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const client = getClient();

    switch (name) {
      case "jandi_get_rooms": {
        const response = (await client.getRooms()) as any;

        let result = "";

        // Topics (channels)
        const topics = response.topics || [];
        if (topics.length > 0) {
          result += `=== Channels/Topics (${topics.length}) ===\n`;
          result += topics
            .map((t: any) => `- [${t.id}] ${t.name} (${t.type})`)
            .join("\n");
          result += "\n\n";
        }

        // 1:1 DMs
        const chats = response.chats || [];
        if (chats.length > 0) {
          result += `=== 1:1 DMs (${chats.length}) ===\n`;
          result += chats
            .map(
              (c: any) =>
                `- [${c.id}] companion:${c.companionId} - "${c.lastMessage?.text?.substring(0, 50) || ""}..."`,
            )
            .join("\n");
          result += "\n\n";
        }

        // Group DMs
        const groupChats = response.groupChats || [];
        if (groupChats.length > 0) {
          result += `=== Group DMs (${groupChats.length}) ===\n`;
          result += groupChats
            .map(
              (g: any) =>
                `- [${g.id}] ${g.name || "(unnamed)"} (${g.members?.length || 0} members)`,
            )
            .join("\n");
        }

        if (!result) {
          result = `Raw response: ${JSON.stringify(response, null, 2)}`;
        }

        return {
          content: [{ type: "text", text: result.trim() }],
        };
      }

      case "jandi_get_messages": {
        const parsed = GetMessagesSchema.parse(args);
        const response = await client.getMessages(
          parsed.roomId,
          parsed.count,
          undefined,
          parsed.ts,
        );

        // Handle various response formats
        const messages = response.messages || response.records || [];

        if (!Array.isArray(messages) || messages.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Messages response: ${JSON.stringify(response, null, 2)}`,
              },
            ],
          };
        }

        const messageList = messages.map(formatMessage).join("\n");

        // 이미지 첨부파일 수집
        const imageContents: Array<{
          type: "image";
          data: string;
          mimeType: string;
        }> = [];
        for (const msg of messages as any[]) {
          const attachments = msg.message?.attachments || [];
          for (const att of attachments) {
            const type = att.content?.type || "";
            if (type.startsWith("image/")) {
              // 썸네일 URL을 먼저 사용 (fileUrl은 인증 문제가 있을 수 있음)
              const imageUrl =
                att.content?.extraInfo?.largeThumbnailUrl ||
                att.content?.extraInfo?.thumbnailUrl ||
                att.content?.fileUrl;
              if (imageUrl) {
                const imageData = await client.downloadImage(imageUrl);
                if (imageData) {
                  imageContents.push({
                    type: "image",
                    data: imageData.base64,
                    mimeType: imageData.mimeType,
                  });
                }
              }
            }
          }
        }

        // 텍스트 + 이미지 반환
        const content: Array<{
          type: string;
          text?: string;
          data?: string;
          mimeType?: string;
        }> = [
          {
            type: "text",
            text: `Retrieved ${messages.length} messages:\n\n${messageList}`,
          },
        ];

        // 이미지 추가
        for (const img of imageContents) {
          content.push(img);
        }

        return { content };
      }

      case "jandi_get_comments": {
        const parsed = GetCommentsSchema.parse(args);
        const response = await client.getComments(parsed.postId, parsed.count);

        // Handle various response formats
        const comments = response.comments || response.records || [];

        if (!Array.isArray(comments) || comments.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Comments response: ${JSON.stringify(response, null, 2)}`,
              },
            ],
          };
        }

        const commentList = comments.map(formatComment).join("\n");

        return {
          content: [
            {
              type: "text",
              text: `Retrieved ${comments.length} comments:\n\n${commentList}`,
            },
          ],
        };
      }

      case "jandi_find_dm_by_name": {
        const parsed = FindDmByNameSchema.parse(args);
        const searchName = parsed.name.toLowerCase();

        // Get members and rooms
        const [membersResponse, roomsResponse] = await Promise.all([
          client.getMembers(),
          client.getRooms(),
        ]);

        const members =
          membersResponse.members ||
          membersResponse.records ||
          (membersResponse as any) ||
          [];
        const chats = (roomsResponse as any).chats || [];

        // Find members matching the name
        const matchingMembers = (Array.isArray(members) ? members : []).filter(
          (m: any) => m.name?.toLowerCase().includes(searchName),
        );

        if (matchingMembers.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No members found matching "${parsed.name}"`,
              },
            ],
          };
        }

        // Find DM rooms for matching members
        const results = matchingMembers.map((member: any) => {
          const dmRoom = chats.find((c: any) => c.companionId === member.id);
          return {
            memberId: member.id,
            name: member.name,
            email: member.profile?.email || "",
            department: member.profile?.department || "",
            position: member.profile?.position || "",
            roomId: dmRoom?.id || null,
            hasRoom: !!dmRoom,
          };
        });

        let resultText = `Found ${results.length} member(s) matching "${parsed.name}":\n\n`;
        results.forEach((r: any) => {
          resultText += `- ${r.name} (${r.position || "직책 없음"})\n`;
          resultText += `  Email: ${r.email || "없음"}\n`;
          resultText += `  Department: ${r.department || "없음"}\n`;
          resultText += `  Member ID: ${r.memberId}\n`;
          if (r.roomId) {
            resultText += `  DM Room ID: ${r.roomId} ✅\n`;
          } else {
            resultText += `  DM Room: 없음 (대화 기록 없음)\n`;
          }
          resultText += "\n";
        });

        return {
          content: [
            {
              type: "text",
              text: resultText.trim(),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  // Initialize client and login before accepting connections
  const client = getClient();
  await client.initialize();
  console.error("Jandi client initialized");

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Jandi MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
