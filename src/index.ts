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

// Tool schemas
const GetMessagesSchema = z.object({
  roomId: z.string().describe("Room/Channel ID to get messages from"),
  count: z
    .number()
    .optional()
    .default(30)
    .describe("Number of messages to retrieve (default: 30)"),
});

const GetCommentsSchema = z.object({
  postId: z.string().describe("Post ID to get comments from"),
  count: z
    .number()
    .optional()
    .default(10)
    .describe("Number of comments to retrieve (default: 10)"),
});

// Format message for display
function formatMessage(msg: any): string {
  const writerId = msg.message?.writerId || msg.fromEntity || "Unknown";
  const content = msg.message?.content?.body || "(no content)";
  const time = msg.message?.createdAt || "";
  return `[${time}] User ${writerId}: ${content}`;
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
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const client = createJandiClient();

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
        const response = await client.getMessages(parsed.roomId, parsed.count);

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

        return {
          content: [
            {
              type: "text",
              text: `Retrieved ${messages.length} messages:\n\n${messageList}`,
            },
          ],
        };
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Jandi MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
