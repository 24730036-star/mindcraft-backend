import { Router } from "express";
import { readSheet, appendRow, updateRow } from "../config/sheets";
import { getNextId } from "../utils/id";
import { findRowIndexById } from "../utils/sheetRow";
import { Message } from "../types/messages";

const router = Router();
const SHEET_NAME = "Messages";

function mapRowToMessage(row: string[]): Message {
  return {
    id: Number(row[0]),
    senderId: Number(row[1]),
    receiverId: Number(row[2]),
    content: row[3],
    read: row[4] === "TRUE" || row[4] === "Y",
    createdAt: row[5] ?? "",
  };
}

// GET /api/messages?userId=xx  → 해당 유저가 보낸/받은 전체 메시지
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    if (!userId) {
      return res.status(400).json({ error: "userId 쿼리가 필요합니다." });
    }

    const rows = await readSheet(SHEET_NAME);
    const messages = rows
      .map(mapRowToMessage)
      .filter(
        (m) => m.senderId === userId || m.receiverId === userId
      );

    res.json(messages);
  } catch (err) {
    console.error("[GET /api/messages] ERROR:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /api/messages  { senderId, receiverId, content }
router.post("/", async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body ?? {};
    if (!senderId || !receiverId || !content) {
      return res
        .status(400)
        .json({ error: "senderId, receiverId, content는 필수입니다." });
    }

    const id = await getNextId(SHEET_NAME);
    const now = new Date().toISOString();

    const newRow: (string | number | boolean)[] = [
      id,
      Number(senderId),
      Number(receiverId),
      content,
      "FALSE",
      now,
    ];

    await appendRow(SHEET_NAME, newRow);

    const message: Message = {
      id,
      senderId: Number(senderId),
      receiverId: Number(receiverId),
      content,
      read: false,
      createdAt: now,
    };

    res.status(201).json(message);
  } catch (err) {
    console.error("[POST /api/messages] ERROR:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// POST /api/messages/:id/read  → 읽음 처리
router.post("/:id/read", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rowIndex = await findRowIndexById(SHEET_NAME, id);
    if (!rowIndex) return res.status(404).json({ error: "Message not found" });

    const rows = await readSheet(SHEET_NAME);
    const row = rows.find((r) => Number(r[0]) === id);
    if (!row) return res.status(404).json({ error: "Message not found" });

    // read 컬럼만 TRUE로 교체
    row[4] = "TRUE";
    await updateRow(SHEET_NAME, rowIndex, row);

    res.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/messages/:id/read] ERROR:", err);
    res.status(500).json({ error: "Failed to mark message as read" });
  }
});

export default router;
