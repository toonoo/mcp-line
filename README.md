# mcp-line

MCP Server สำหรับส่งข้อความไปยัง LINE ผ่าน LINE Messaging API

## ความสามารถ (Tools)

| Tool | คำอธิบาย |
|------|---------|
| `send_text` | ส่งข้อความ text ไปยัง LINE user ที่กำหนด |
| `send_image` | ส่งรูปภาพไปยัง LINE user ที่กำหนด |
| `broadcast_text` | broadcast ข้อความไปยังทุกคนที่เป็น friend ของ bot |
| `get_bot_info` | ดึงข้อมูล LINE bot เช่น ชื่อ, รูปโปรไฟล์, จำนวน follower |

## ความต้องการเบื้องต้น

- **Node.js 18 ขึ้นไป** (ตรวจสอบด้วย `node --version`) — [ดาวน์โหลด Node.js](https://nodejs.org/)
- LINE Messaging API Channel Access Token ([สร้างได้ที่ LINE Developers Console](https://developers.line.biz/console/))

## การติดตั้ง

### Claude Desktop

เพิ่มการตั้งค่าใน `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-line": {
      "command": "npx",
      "args": ["-y", "@studiotoonoo/mcp-line@latest"],
      "env": {
        "LINE_CHANNEL_ACCESS_TOKEN": "your_channel_access_token_here",
        "LINE_DEFAULT_USER_ID": "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add mcp-line -- npx -y @studiotoonoo/mcp-line@latest
```

จากนั้นตั้งค่า environment variables:

```bash
export LINE_CHANNEL_ACCESS_TOKEN="your_channel_access_token_here"
export LINE_DEFAULT_USER_ID="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Smithery

ติดตั้งผ่าน [Smithery Marketplace](https://smithery.ai/server/toonoo/mcp-line) แล้วกรอก token ใน config form

## Environment Variables

| Variable | Required | คำอธิบาย |
|----------|----------|---------|
| `LINE_CHANNEL_ACCESS_TOKEN` | ✅ | Channel Access Token จาก LINE Developers Console |
| `LINE_DEFAULT_USER_ID` | ❌ | LINE userId ของผู้รับ default (ขึ้นต้นด้วย `U...`) |

## วิธีหา LINE Channel Access Token

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. เลือก Provider → Channel → **Messaging API**
3. เลื่อนลงไปที่ **Channel access token** → กด **Issue**

## วิธีหา LINE User ID

ส่ง message ใดๆ ให้ bot ก่อน จากนั้นดู User ID ได้จาก:
- LINE Developers Console → Messaging API → **Webhook**
- หรือใช้ tool `get_bot_info` เพื่อดู User ID ของตัวเอง

## ตัวอย่างการใช้งาน

```
ส่งข้อความ "สวัสดี" ไปหา LINE ของฉัน
```

```
broadcast ข้อความ "แจ้งเตือน: ระบบจะ maintenance วันพรุ่งนี้ 02:00-04:00 น."
```

```
ดึงข้อมูล LINE bot ของฉัน
```

## License

MIT
