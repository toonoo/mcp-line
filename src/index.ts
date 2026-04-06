import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

const LINE_API_BASE = "https://api.line.me/v2/bot";

interface LineTextMessage {
  type: "text";
  text: string;
}

interface LineImageMessage {
  type: "image";
  originalContentUrl: string;
  previewImageUrl: string;
}

type LineMessage = LineTextMessage | LineImageMessage;

interface LinePushRequest {
  to: string;
  messages: LineMessage[];
}

interface LineBroadcastRequest {
  messages: LineMessage[];
}

interface LineBotInfoResponse {
  userId: string;
  basicId: string;
  displayName: string;
  pictureUrl?: string;
  chatMode: string;
  markAsReadMode: string;
}

interface LineFollowersResponse {
  total?: number;
  followers?: string[];
}

interface LineErrorResponse {
  message: string;
  details?: Array<{ message: string; property: string }>;
}

// ─── Environment ──────────────────────────────────────────────────────────────

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const DEFAULT_USER_ID = process.env.LINE_DEFAULT_USER_ID;

if (!CHANNEL_ACCESS_TOKEN) {
  console.error(
    "ERROR: LINE_CHANNEL_ACCESS_TOKEN environment variable is required.\n" +
      "Get it from: https://developers.line.biz/console/ → Your Channel → Messaging API → Channel access token"
  );
  process.exit(1);
}

// ─── LINE API Client ──────────────────────────────────────────────────────────

async function lineRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${LINE_API_BASE}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const responseText = await response.text();

  if (!response.ok) {
    let errorMessage = `LINE API error ${response.status}`;
    try {
      const errorBody = JSON.parse(responseText) as LineErrorResponse;
      errorMessage = `LINE API ${response.status}: ${errorBody.message}`;
      if (errorBody.details && errorBody.details.length > 0) {
        const details = errorBody.details.map((d) => d.message).join(", ");
        errorMessage += ` (${details})`;
      }
    } catch {
      if (responseText) errorMessage += `: ${responseText}`;
    }
    throw new Error(errorMessage);
  }

  return responseText ? (JSON.parse(responseText) as T) : ({} as T);
}

function errorResult(err: unknown) {
  return {
    content: [{ type: "text" as const, text: String(err) }],
    isError: true,
  };
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "mcp-line",
  version: "1.0.0",
});

// Tool: send_text
server.tool(
  "send_text",
  "ส่งข้อความ text ไปยัง LINE user ที่กำหนด",
  {
    text: z
      .string()
      .min(1)
      .max(5000)
      .describe("ข้อความที่ต้องการส่ง (สูงสุด 5000 ตัวอักษร)"),
    userId: z
      .string()
      .optional()
      .describe(
        "LINE userId ของผู้รับ (ถ้าไม่ระบุจะใช้ LINE_DEFAULT_USER_ID จาก env)"
      ),
  },
  async ({ text, userId }) => {
    const targetId = userId ?? DEFAULT_USER_ID;
    if (!targetId) {
      return errorResult(
        "ไม่มี userId — กรุณาระบุ userId หรือตั้งค่า LINE_DEFAULT_USER_ID ใน environment"
      );
    }
    try {
      await lineRequest<object>("POST", "/message/push", {
        to: targetId,
        messages: [{ type: "text", text }],
      } satisfies LinePushRequest);
      return {
        content: [
          { type: "text", text: `ส่งข้อความสำเร็จ → userId: ${targetId}` },
        ],
      };
    } catch (err) {
      return errorResult(err);
    }
  }
);

// Tool: send_image
server.tool(
  "send_image",
  "ส่งรูปภาพไปยัง LINE user ที่กำหนด",
  {
    originalContentUrl: z
      .string()
      .url()
      .describe("URL รูปภาพขนาดเต็ม (HTTPS, JPEG/PNG/GIF, สูงสุด 10MB)"),
    previewImageUrl: z
      .string()
      .url()
      .describe("URL รูปภาพ thumbnail (HTTPS, JPEG/PNG/GIF, สูงสุด 1MB)"),
    userId: z
      .string()
      .optional()
      .describe(
        "LINE userId ของผู้รับ (ถ้าไม่ระบุจะใช้ LINE_DEFAULT_USER_ID จาก env)"
      ),
  },
  async ({ originalContentUrl, previewImageUrl, userId }) => {
    const targetId = userId ?? DEFAULT_USER_ID;
    if (!targetId) {
      return errorResult(
        "ไม่มี userId — กรุณาระบุ userId หรือตั้งค่า LINE_DEFAULT_USER_ID ใน environment"
      );
    }
    try {
      await lineRequest<object>("POST", "/message/push", {
        to: targetId,
        messages: [{ type: "image", originalContentUrl, previewImageUrl }],
      } satisfies LinePushRequest);
      return {
        content: [
          { type: "text", text: `ส่งรูปภาพสำเร็จ → userId: ${targetId}` },
        ],
      };
    } catch (err) {
      return errorResult(err);
    }
  }
);

// Tool: broadcast_text
server.tool(
  "broadcast_text",
  "broadcast ข้อความ text ไปยังทุกคนที่เป็น friend ของ bot",
  {
    text: z
      .string()
      .min(1)
      .max(5000)
      .describe("ข้อความที่ต้องการ broadcast (สูงสุด 5000 ตัวอักษร)"),
  },
  async ({ text }) => {
    try {
      await lineRequest<object>("POST", "/message/broadcast", {
        messages: [{ type: "text", text }],
      } satisfies LineBroadcastRequest);
      return {
        content: [{ type: "text", text: "Broadcast สำเร็จ — ส่งถึงทุก friend ของ bot แล้ว" }],
      };
    } catch (err) {
      return errorResult(err);
    }
  }
);

// Tool: get_bot_info
server.tool(
  "get_bot_info",
  "ดึงข้อมูล LINE bot เช่น ชื่อ, รูปโปรไฟล์, จำนวน follower",
  {},
  async () => {
    const [botInfoResult, followersResult] = await Promise.allSettled([
      lineRequest<LineBotInfoResponse>("GET", "/info"),
      lineRequest<LineFollowersResponse>("GET", "/followers/ids?limit=1"),
    ]);

    const lines: string[] = [];

    if (botInfoResult.status === "fulfilled") {
      const info = botInfoResult.value;
      lines.push(`ชื่อ Bot: ${info.displayName}`);
      lines.push(`Basic ID: ${info.basicId}`);
      lines.push(`User ID: ${info.userId}`);
      if (info.pictureUrl) lines.push(`รูปโปรไฟล์: ${info.pictureUrl}`);
      lines.push(`Chat Mode: ${info.chatMode}`);
    } else {
      lines.push(`ดึงข้อมูล bot ไม่ได้: ${botInfoResult.reason}`);
    }

    if (followersResult.status === "fulfilled") {
      const followers = followersResult.value;
      if (followers.total !== undefined) {
        lines.push(`จำนวน Followers: ${followers.total}`);
      }
    } else {
      lines.push(`ดึงจำนวน follower ไม่ได้ (อาจต้องใช้ verified account): ${followersResult.reason}`);
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// ─── Start Server ─────────────────────────────────────────────────────────────

async function main() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : null;

  if (PORT) {
    // HTTP mode — สำหรับ deploy บน cloud / Smithery
    const sessions = new Map<string, StreamableHTTPServerTransport>();

    const httpServer = createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Session-Id");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
      if (pathname !== "/mcp") {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }

      // อ่าน body
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const rawBody = Buffer.concat(chunks).toString();

      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      // session เดิม
      if (sessionId && sessions.has(sessionId)) {
        const transport = sessions.get(sessionId)!;
        await transport.handleRequest(req, res, rawBody);
        return;
      }

      // session ใหม่
      if (req.method === "POST") {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });

        transport.onclose = () => {
          if (transport.sessionId) sessions.delete(transport.sessionId);
        };

        await server.connect(transport);

        if (transport.sessionId) {
          sessions.set(transport.sessionId, transport);
        }

        await transport.handleRequest(req, res, rawBody);
        return;
      }

      res.writeHead(400);
      res.end("Bad Request");
    });

    httpServer.listen(PORT, () => {
      console.error(`mcp-line HTTP server running on port ${PORT}`);
      console.error(`MCP endpoint: http://localhost:${PORT}/mcp`);
    });
  } else {
    // stdio mode — สำหรับ Claude Desktop / Claude Code
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch(console.error);
