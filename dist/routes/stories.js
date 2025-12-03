"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sheets_1 = require("../config/sheets");
const id_1 = require("../utils/id");
const sheetRow_1 = require("../utils/sheetRow");
const router = (0, express_1.Router)();
const SHEET_NAME = "Stories";
// row → Story
function mapRowToStory(row) {
    var _a, _b, _c, _d, _e, _f;
    return {
        id: Number(row[0]),
        ownerId: Number(row[1]),
        title: row[2],
        genre: row[3],
        keywords: (_a = row[4]) !== null && _a !== void 0 ? _a : "",
        teaser: (_b = row[5]) !== null && _b !== void 0 ? _b : "",
        outline: (_c = row[6]) !== null && _c !== void 0 ? _c : "",
        detail: (_d = row[7]) !== null && _d !== void 0 ? _d : "",
        createdAt: (_e = row[8]) !== null && _e !== void 0 ? _e : "",
        updatedAt: (_f = row[9]) !== null && _f !== void 0 ? _f : "",
    };
}
// 공개 레벨에 따른 마스킹
function maskStoryForViewer(story, viewerId) {
    // 본인 글이면 전체 공개
    if (viewerId && viewerId === story.ownerId)
        return story;
    // 리스트용(1단계): 티저까지만, outline/detail 제거
    return {
        ...story,
        outline: "",
        detail: "",
    };
}
// GET /api/stories - 목록 (viewerId 쿼리 선택)
router.get("/", async (req, res) => {
    try {
        const viewerId = req.query.viewerId
            ? Number(req.query.viewerId)
            : undefined;
        const rows = await (0, sheets_1.readSheet)(SHEET_NAME);
        const stories = rows.map(mapRowToStory).map((s) => maskStoryForViewer(s, viewerId));
        res.json(stories);
    }
    catch (err) {
        console.error("[GET /api/stories] ERROR:", err);
        res.status(500).json({ error: "Failed to fetch stories" });
    }
});
// GET /api/stories/:id - 상세 (현재 MVP: 본인은 전체, 타인은 1단계까지만)
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const viewerId = req.query.viewerId
            ? Number(req.query.viewerId)
            : undefined;
        const rows = await (0, sheets_1.readSheet)(SHEET_NAME);
        const row = rows.find((r) => Number(r[0]) === id);
        if (!row)
            return res.status(404).json({ error: "Story not found" });
        const story = mapRowToStory(row);
        const masked = maskStoryForViewer(story, viewerId);
        res.json(masked);
    }
    catch (err) {
        console.error("[GET /api/stories/:id] ERROR:", err);
        res.status(500).json({ error: "Failed to fetch story" });
    }
});
// POST /api/stories - 스토리 등록
router.post("/", async (req, res) => {
    var _a;
    try {
        const { ownerId, title, genre, keywords = "", teaser = "", outline = "", detail = "", } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        if (!ownerId || !title || !genre) {
            return res
                .status(400)
                .json({ error: "ownerId, title, genre는 필수입니다." });
        }
        const id = await (0, id_1.getNextId)(SHEET_NAME);
        const now = new Date().toISOString();
        const newRow = [
            id,
            Number(ownerId),
            title,
            genre,
            keywords,
            teaser,
            outline,
            detail,
            now,
            now,
        ];
        await (0, sheets_1.appendRow)(SHEET_NAME, newRow);
        const story = {
            id,
            ownerId: Number(ownerId),
            title,
            genre,
            keywords,
            teaser,
            outline,
            detail,
            createdAt: now,
            updatedAt: now,
        };
        res.status(201).json(story);
    }
    catch (err) {
        console.error("[POST /api/stories] ERROR:", err);
        res.status(500).json({ error: "Failed to create story" });
    }
});
// PUT /api/stories/:id - 수정 (작성자만)
router.put("/:id", async (req, res) => {
    var _a;
    try {
        const id = Number(req.params.id);
        const { ownerId, title, genre, keywords = "", teaser = "", outline = "", detail = "", } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        const rowIndex = await (0, sheetRow_1.findRowIndexById)(SHEET_NAME, id);
        if (!rowIndex)
            return res.status(404).json({ error: "Story not found" });
        const rows = await (0, sheets_1.readSheet)(SHEET_NAME);
        const row = rows.find((r) => Number(r[0]) === id);
        if (!row)
            return res.status(404).json({ error: "Story not found" });
        const existing = mapRowToStory(row);
        if (ownerId && Number(ownerId) !== existing.ownerId) {
            return res
                .status(403)
                .json({ error: "작성자만 수정할 수 있습니다." });
        }
        const now = new Date().toISOString();
        const updated = [
            id,
            existing.ownerId,
            title !== null && title !== void 0 ? title : existing.title,
            genre !== null && genre !== void 0 ? genre : existing.genre,
            keywords !== null && keywords !== void 0 ? keywords : existing.keywords,
            teaser !== null && teaser !== void 0 ? teaser : existing.teaser,
            outline !== null && outline !== void 0 ? outline : existing.outline,
            detail !== null && detail !== void 0 ? detail : existing.detail,
            existing.createdAt,
            now,
        ];
        await (0, sheets_1.updateRow)(SHEET_NAME, rowIndex, updated);
        res.json({
            ...existing,
            title: updated[2],
            genre: updated[3],
            keywords: updated[4],
            teaser: updated[5],
            outline: updated[6],
            detail: updated[7],
            updatedAt: now,
        });
    }
    catch (err) {
        console.error("[PUT /api/stories/:id] ERROR:", err);
        res.status(500).json({ error: "Failed to update story" });
    }
});
// DELETE /api/stories/:id - 삭제 (MVP: 실제 삭제 대신 아직은 미구현으로 둬도 됨)
// 필요하면 여기에서 "삭제" 상태 컬럼 추가 후 처리하도록 확장 가능.
exports.default = router;
