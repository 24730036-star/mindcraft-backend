"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/routes/stories.ts
const express_1 = require("express");
const sheets_1 = require("../config/sheets");
const id_1 = require("../utils/id");
const router = (0, express_1.Router)();
const SHEET_NAME = "Stories";
function rowToStory(row) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    return {
        id: Number(row[0]),
        ownerId: Number(row[1]),
        title: (_a = row[2]) !== null && _a !== void 0 ? _a : "",
        genre: (_b = row[3]) !== null && _b !== void 0 ? _b : "",
        keywords: (_c = row[4]) !== null && _c !== void 0 ? _c : "",
        teaser: (_d = row[5]) !== null && _d !== void 0 ? _d : "",
        outline: (_e = row[6]) !== null && _e !== void 0 ? _e : "",
        detail: (_f = row[7]) !== null && _f !== void 0 ? _f : "",
        createdAt: (_g = row[8]) !== null && _g !== void 0 ? _g : "",
        updatedAt: (_h = row[9]) !== null && _h !== void 0 ? _h : "",
        status: (_j = row[10]) !== null && _j !== void 0 ? _j : "모집중", // 비어있으면 기본값
    };
}
function storyToRow(story) {
    var _a;
    return [
        String(story.id),
        String(story.ownerId),
        story.title,
        story.genre,
        story.keywords,
        story.teaser,
        story.outline,
        story.detail,
        story.createdAt,
        story.updatedAt,
        (_a = story.status) !== null && _a !== void 0 ? _a : "모집중",
    ];
}
/* ===========================
   GET /api/stories
   전체 스토리 목록
=========================== */
router.get("/", async (_req, res) => {
    try {
        const rows = await (0, sheets_1.readSheet)(SHEET_NAME);
        if (!rows || rows.length === 0) {
            return res.json([]);
        }
        const stories = rows.map((row) => rowToStory(row));
        return res.json(stories);
    }
    catch (err) {
        console.error("[GET /api/stories] ERROR:", err);
        return res.status(500).json({ error: "Failed to fetch stories" });
    }
});
/* ===========================
   GET /api/stories/:id
   스토리 상세
=========================== */
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const rows = await (0, sheets_1.readSheet)(SHEET_NAME);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "Story not found" });
        }
        const row = rows.find((r) => Number(r[0]) === id);
        if (!row) {
            return res.status(404).json({ error: "Story not found" });
        }
        return res.json(rowToStory(row));
    }
    catch (err) {
        console.error("[GET /api/stories/:id] ERROR:", err);
        return res.status(500).json({ error: "Failed to fetch story" });
    }
});
/* ===========================
   POST /api/stories
   스토리 생성
=========================== */
router.post("/", async (req, res) => {
    var _a, _b;
    try {
        const { ownerId, title, genre, keywords, teaser, outline, detail } = req.body;
        if (!ownerId || !title) {
            return res
                .status(400)
                .json({ error: "ownerId와 title은 필수 값입니다." });
        }
        const newId = await (0, id_1.getNextId)(SHEET_NAME);
        const now = new Date().toISOString();
        // 프론트에서 생성 시에는 진행도 값이 없으므로 기본값 "모집중"
        const status = (_b = (_a = req.body.recruitmentStatus) !== null && _a !== void 0 ? _a : req.body.status) !== null && _b !== void 0 ? _b : "모집중";
        const story = {
            id: newId,
            ownerId: Number(ownerId),
            title: title !== null && title !== void 0 ? title : "",
            genre: genre !== null && genre !== void 0 ? genre : "",
            keywords: keywords !== null && keywords !== void 0 ? keywords : "",
            teaser: teaser !== null && teaser !== void 0 ? teaser : "",
            outline: outline !== null && outline !== void 0 ? outline : "",
            detail: detail !== null && detail !== void 0 ? detail : "",
            createdAt: now,
            updatedAt: now,
            status,
        };
        await (0, sheets_1.appendRow)(SHEET_NAME, storyToRow(story));
        return res.status(201).json(story);
    }
    catch (err) {
        console.error("[POST /api/stories] ERROR:", err);
        return res.status(500).json({ error: "Failed to create story" });
    }
});
/* ===========================
   PUT /api/stories/:id
   스토리 수정 (진행도 포함)
=========================== */
router.put("/:id", async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const id = Number(req.params.id);
        const rows = await (0, sheets_1.readSheet)(SHEET_NAME);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: "Story not found" });
        }
        // 수정할 행 찾기
        const rowIndex = rows.findIndex((row) => Number(row[0]) === id);
        if (rowIndex === -1) {
            return res.status(404).json({ error: "Story not found" });
        }
        const currentStory = rowToStory(rows[rowIndex]);
        const now = new Date().toISOString();
        // 프론트에서 넘어오는 값: recruitmentStatus
        const newStatus = (_c = (_b = (_a = req.body.recruitmentStatus) !== null && _a !== void 0 ? _a : req.body.status) !== null && _b !== void 0 ? _b : currentStory.status) !== null && _c !== void 0 ? _c : "모집중";
        const updated = {
            ...currentStory,
            ownerId: req.body.ownerId !== undefined
                ? Number(req.body.ownerId)
                : currentStory.ownerId,
            title: (_d = req.body.title) !== null && _d !== void 0 ? _d : currentStory.title,
            genre: (_e = req.body.genre) !== null && _e !== void 0 ? _e : currentStory.genre,
            keywords: (_f = req.body.keywords) !== null && _f !== void 0 ? _f : currentStory.keywords,
            teaser: (_g = req.body.teaser) !== null && _g !== void 0 ? _g : currentStory.teaser,
            outline: (_h = req.body.outline) !== null && _h !== void 0 ? _h : currentStory.outline,
            detail: (_j = req.body.detail) !== null && _j !== void 0 ? _j : currentStory.detail,
            createdAt: currentStory.createdAt || now,
            updatedAt: now,
            status: newStatus,
        };
        // 헤더 한 줄 있다고 가정해서 +2
        await (0, sheets_1.updateRow)(SHEET_NAME, rowIndex + 2, storyToRow(updated));
        return res.json(updated);
    }
    catch (err) {
        console.error("[PUT /api/stories/:id] ERROR:", err);
        return res.status(500).json({ error: "Failed to update story" });
    }
});
exports.default = router;
