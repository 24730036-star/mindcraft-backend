import { Router } from "express";
import { readSheet, appendRow } from "../config/sheets";
import { getNextId } from "../utils/id";
import { AccessLog, AccessLevel } from "../types/accessLog";

const router = Router();
const SHEET_NAME = "AccessLog";

function mapRowToAccessLog(row: string[]): AccessLog {
  return {
    id: Number(row[0]),
    storyId: Number(row[1]),
    viewerId: Number(row[2]),
    level: row[3] as AccessLevel,
    createdAt: row[4] ?? "",
  };
}

// GET /api/access-log?storyId=&viewerId=
router.get("/", async (req, res) => {
  try {
    const storyId = req.query.storyId ? Number(req.query.storyId) : undefined;
    const viewerId = req.query.viewerId ? Number(req.query.viewerId) : undefined;

    const rows = await readSheet(SHEET_NAME);
    let logs = rows.map(mapRowToAccessLog);

    if (storyId) logs = logs.filter((l) => l.storyId === storyId);
    if (viewerId) logs = logs.filter((l) => l.viewerId === viewerId);

    res.json(logs);
  } catch (err) {
    console.error("[GET /api/access-log] ERROR:", err);
    res.status(500).json({ error: "Failed to fetch access logs" });
  }
});

// POST /api/access-log  { storyId, viewerId, level }
router.post("/", async (req, res) => {
  try {
    const { storyId, viewerId, level } = req.body ?? {};
    if (!storyId || !viewerId || !level) {
      return res
        .status(400)
        .json({ error: "storyId, viewerId, level은 필수입니다." });
    }

    const id = await getNextId(SHEET_NAME);
    const now = new Date().toISOString();

    const newRow: (string | number)[] = [
      id,
      Number(storyId),
      Number(viewerId),
      level,
      now,
    ];

    await appendRow(SHEET_NAME, newRow);

    const log: AccessLog = {
      id,
      storyId: Number(storyId),
      viewerId: Number(viewerId),
      level,
      createdAt: now,
    };

    res.status(201).json(log);
  } catch (err) {
    console.error("[POST /api/access-log] ERROR:", err);
    res.status(500).json({ error: "Failed to create access log" });
  }
});

export default router;
