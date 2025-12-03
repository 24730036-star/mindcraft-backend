// backend/routes/stories.ts
import { Router } from "express";
import { readSheet, appendRow, updateRow } from "../config/sheets";
import { getNextId } from "../utils/id";

const router = Router();
const SHEET_NAME = "Stories";

/**
 * 스프레드시트 컬럼 순서:
 *  A: id
 *  B: ownerId
 *  C: title
 *  D: genre
 *  E: keywords
 *  F: teaser
 *  G: outline
 *  H: detail
 *  I: createdAt
 *  J: updatedAt
 */
export interface Story {
  id: number;
  ownerId: number;
  title: string;
  genre: string;
  keywords: string;
  teaser: string;
  outline: string;
  detail: string;
  createdAt: string;
  updatedAt: string;
}

function rowToStory(row: string[]): Story {
  return {
    id: Number(row[0]),
    ownerId: Number(row[1]),
    title: row[2] ?? "",
    genre: row[3] ?? "",
    keywords: row[4] ?? "",
    teaser: row[5] ?? "",
    outline: row[6] ?? "",
    detail: row[7] ?? "",
    createdAt: row[8] ?? "",
    updatedAt: row[9] ?? "",
  };
}

function storyToRow(story: Story): string[] {
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
  ];
}

/* ===========================
   GET /api/stories
   전체 스토리 목록
=========================== */
router.get("/", async (req, res) => {
  try {
    const rows = await readSheet(SHEET_NAME);

    if (!rows || rows.length === 0) {
      return res.json([]);
    }

    const stories = rows.map((row) => rowToStory(row));
    return res.json(stories);
  } catch (err) {
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
    const rows = await readSheet(SHEET_NAME);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Story not found" });
    }

    const row = rows.find((r) => Number(r[0]) === id);
    if (!row) {
      return res.status(404).json({ error: "Story not found" });
    }

    return res.json(rowToStory(row));
  } catch (err) {
    console.error("[GET /api/stories/:id] ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch story" });
  }
});

/* ===========================
   POST /api/stories
   스토리 생성
=========================== */
router.post("/", async (req, res) => {
  try {
    const { ownerId, title, genre, keywords, teaser, outline, detail } = req.body;

    if (!ownerId || !title) {
      return res
        .status(400)
        .json({ error: "ownerId와 title은 필수 값입니다." });
    }

    const newId = await getNextId(SHEET_NAME);
    const now = new Date().toISOString();

    const story: Story = {
      id: newId,
      ownerId: Number(ownerId),
      title: title ?? "",
      genre: genre ?? "",
      keywords: keywords ?? "",
      teaser: teaser ?? "",
      outline: outline ?? "",
      detail: detail ?? "",
      createdAt: now,
      updatedAt: now,
    };

    await appendRow(SHEET_NAME, storyToRow(story));

    return res.status(201).json(story);
  } catch (err) {
    console.error("[POST /api/stories] ERROR:", err);
    return res.status(500).json({ error: "Failed to create story" });
  }
});

/* ===========================
   PUT /api/stories/:id
   스토리 수정
=========================== */
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await readSheet(SHEET_NAME);

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

    const updated: Story = {
      ...currentStory,
      ownerId:
        req.body.ownerId !== undefined
          ? Number(req.body.ownerId)
          : currentStory.ownerId,
      title: req.body.title ?? currentStory.title,
      genre: req.body.genre ?? currentStory.genre,
      keywords: req.body.keywords ?? currentStory.keywords,
      teaser: req.body.teaser ?? currentStory.teaser,
      outline: req.body.outline ?? currentStory.outline,
      detail: req.body.detail ?? currentStory.detail,
      createdAt: currentStory.createdAt || now,
      updatedAt: now,
    };

    // 헤더 한 줄 있다고 가정해서 +2
    await updateRow(SHEET_NAME, rowIndex + 2, storyToRow(updated));

    return res.json(updated);
  } catch (err) {
    console.error("[PUT /api/stories/:id] ERROR:", err);
    return res.status(500).json({ error: "Failed to update story" });
  }
});

export default router;
