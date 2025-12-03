"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sheets_1 = require("../config/sheets");
const id_1 = require("../utils/id");
const router = (0, express_1.Router)();
const SHEET_NAME = "AccessLog";
function mapRowToAccessLog(row) {
    var _a;
    return {
        id: Number(row[0]),
        storyId: Number(row[1]),
        viewerId: Number(row[2]),
        level: row[3],
        createdAt: (_a = row[4]) !== null && _a !== void 0 ? _a : "",
    };
}
// GET /api/access-log?storyId=&viewerId=
router.get("/", async (req, res) => {
    try {
        const storyId = req.query.storyId ? Number(req.query.storyId) : undefined;
        const viewerId = req.query.viewerId ? Number(req.query.viewerId) : undefined;
        const rows = await (0, sheets_1.readSheet)(SHEET_NAME);
        let logs = rows.map(mapRowToAccessLog);
        if (storyId)
            logs = logs.filter((l) => l.storyId === storyId);
        if (viewerId)
            logs = logs.filter((l) => l.viewerId === viewerId);
        res.json(logs);
    }
    catch (err) {
        console.error("[GET /api/access-log] ERROR:", err);
        res.status(500).json({ error: "Failed to fetch access logs" });
    }
});
// POST /api/access-log  { storyId, viewerId, level }
router.post("/", async (req, res) => {
    var _a;
    try {
        const { storyId, viewerId, level } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        if (!storyId || !viewerId || !level) {
            return res
                .status(400)
                .json({ error: "storyId, viewerId, level은 필수입니다." });
        }
        const id = await (0, id_1.getNextId)(SHEET_NAME);
        const now = new Date().toISOString();
        const newRow = [
            id,
            Number(storyId),
            Number(viewerId),
            level,
            now,
        ];
        await (0, sheets_1.appendRow)(SHEET_NAME, newRow);
        const log = {
            id,
            storyId: Number(storyId),
            viewerId: Number(viewerId),
            level,
            createdAt: now,
        };
        res.status(201).json(log);
    }
    catch (err) {
        console.error("[POST /api/access-log] ERROR:", err);
        res.status(500).json({ error: "Failed to create access log" });
    }
});
exports.default = router;
