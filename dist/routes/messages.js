"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sheets_1 = require("../config/sheets");
const id_1 = require("../utils/id");
const sheetRow_1 = require("../utils/sheetRow");
const router = (0, express_1.Router)();
const SHEET_NAME = "Messages";
function mapRowToMessage(row) {
    var _a;
    return {
        id: Number(row[0]),
        senderId: Number(row[1]),
        receiverId: Number(row[2]),
        content: row[3],
        read: row[4] === "TRUE" || row[4] === "Y",
        createdAt: (_a = row[5]) !== null && _a !== void 0 ? _a : "",
    };
}
// GET /api/messages?userId=xx  → 해당 유저가 보낸/받은 전체 메시지
router.get("/", async (req, res) => {
    try {
        const userId = req.query.userId ? Number(req.query.userId) : undefined;
        if (!userId) {
            return res.status(400).json({ error: "userId 쿼리가 필요합니다." });
        }
        const rows = await (0, sheets_1.readSheet)(SHEET_NAME);
        const messages = rows
            .map(mapRowToMessage)
            .filter((m) => m.senderId === userId || m.receiverId === userId);
        res.json(messages);
    }
    catch (err) {
        console.error("[GET /api/messages] ERROR:", err);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});
// POST /api/messages  { senderId, receiverId, content }
router.post("/", async (req, res) => {
    var _a;
    try {
        const { senderId, receiverId, content } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        if (!senderId || !receiverId || !content) {
            return res
                .status(400)
                .json({ error: "senderId, receiverId, content는 필수입니다." });
        }
        const id = await (0, id_1.getNextId)(SHEET_NAME);
        const now = new Date().toISOString();
        const newRow = [
            id,
            Number(senderId),
            Number(receiverId),
            content,
            "FALSE",
            now,
        ];
        await (0, sheets_1.appendRow)(SHEET_NAME, newRow);
        const message = {
            id,
            senderId: Number(senderId),
            receiverId: Number(receiverId),
            content,
            read: false,
            createdAt: now,
        };
        res.status(201).json(message);
    }
    catch (err) {
        console.error("[POST /api/messages] ERROR:", err);
        res.status(500).json({ error: "Failed to send message" });
    }
});
// POST /api/messages/:id/read  → 읽음 처리
router.post("/:id/read", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const rowIndex = await (0, sheetRow_1.findRowIndexById)(SHEET_NAME, id);
        if (!rowIndex)
            return res.status(404).json({ error: "Message not found" });
        const rows = await (0, sheets_1.readSheet)(SHEET_NAME);
        const row = rows.find((r) => Number(r[0]) === id);
        if (!row)
            return res.status(404).json({ error: "Message not found" });
        // read 컬럼만 TRUE로 교체
        row[4] = "TRUE";
        await (0, sheets_1.updateRow)(SHEET_NAME, rowIndex, row);
        res.json({ ok: true });
    }
    catch (err) {
        console.error("[POST /api/messages/:id/read] ERROR:", err);
        res.status(500).json({ error: "Failed to mark message as read" });
    }
});
exports.default = router;
