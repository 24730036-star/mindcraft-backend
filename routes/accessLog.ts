// backend/routes/accessLog.ts
import { Router } from "express";
import { readSheet, appendRow } from "../config/sheets";
import { getNextId } from "../utils/id";

const router = Router();

/**
 * AccessLog 시트 컬럼 구조 (가정):
 *  A: id
 *  B: storyId
 *  C: viewerId
 *  D: level (예: "INTEREST" | "VIEW_OUTLINE" | "VIEW_DETAIL")
 *  E: timestamp (ISO 문자열)
 */

/**
 * POST /api/access-log
 * body: { storyId: number, viewerId: number, level: "INTEREST" | "VIEW_OUTLINE" | "VIEW_DETAIL" }
 * → AccessLog 시트에 한 줄 기록
 */
router.post("/", async (req, res) => {
  try {
    const { storyId, viewerId, level } = req.body as {
      storyId?: number;
      viewerId?: number;
      level?: string;
    };

    if (!storyId || !viewerId || !level) {
      return res
        .status(400)
        .json({ error: "storyId, viewerId, level 값이 필요합니다." });
    }

    // ✅ 여기서 rows를 넘기지 말고, 시트 이름을 넘겨서 getNextId 사용
    const nextId = await getNextId("AccessLog");

    await appendRow("AccessLog", [
      String(nextId),          // id (A열)
      String(storyId),         // storyId (B열)
      String(viewerId),        // viewerId (C열)
      String(level),           // level (D열)
      new Date().toISOString() // timestamp (E열)
    ]);

    return res.json({ id: nextId });
  } catch (err) {
    console.error("[POST /api/access-log] ERROR:", err);
    return res.status(500).json({ error: "AccessLog 기록에 실패했습니다." });
  }
});

/**
 * GET /api/access-log/interest-summary?storyId=1&userId=2
 *
 * - 모든 사용자: 관심 수(count)만 조회 가능
 * - 글 작성자(스토리 ownerId와 userId가 같은 경우): 관심 표시한 사람 목록(viewers)까지 조회 가능
 *
 * 응답:
 *  { count: number }
 * 혹은
 *  { count: number, viewers: { id: number; name: string }[] }
 */
router.get("/interest-summary", async (req, res) => {
  try {
    const storyIdParam = req.query.storyId;
    if (!storyIdParam) {
      return res.status(400).json({
        error: "storyId 쿼리 파라미터가 필요합니다.",
      });
    }

    const storyId = Number(storyIdParam);
    const requesterId = req.query.userId
      ? Number(req.query.userId)
      : undefined;

    // AccessLog, Stories, Users 시트 읽기
    const [accessRowsRaw, storiesRowsRaw, usersRowsRaw] = await Promise.all([
      readSheet("AccessLog"),
      readSheet("Stories"),
      readSheet("Users"),
    ]);

    const accessRows = accessRowsRaw ?? [];
    const storiesRows = storiesRowsRaw ?? [];
    const usersRows = usersRowsRaw ?? [];

    // 해당 스토리에 대한 INTEREST 기록만 필터링
    const interestRows = accessRows.filter(
      (row) => Number(row[1]) === storyId && row[3] === "INTEREST"
    );

    // ✅ 같은 사람이 여러 번 눌러도 "유저 수"만 세도록 Set 사용
    const uniqueViewerIds = new Set<number>();
    for (const row of interestRows) {
      const viewerId = Number(row[2]);
      if (!Number.isNaN(viewerId)) {
        uniqueViewerIds.add(viewerId);
      }
    }

    const count = uniqueViewerIds.size;

    // 기본 응답: count만
    const response: {
      count: number;
      viewers?: { id: number; name: string }[];
    } = { count };

    // 요청자가 글 작성자인지 확인
    if (requesterId) {
      const storyRow = storiesRows.find(
        (row) => Number(row[0]) === storyId
      );
      const ownerId = storyRow ? Number(storyRow[1]) : undefined;

      if (ownerId === requesterId) {
        // ✅ 글 작성자일 때만 관심 표시한 사람 목록 조회
        const viewers: { id: number; name: string }[] = [];

        for (const viewerId of uniqueViewerIds) {
          const uRow = usersRows.find((u) => Number(u[0]) === viewerId);

          // Users 시트: [id, email, password, name, role, bio, preferredGenres, portfolio, createdAt, updatedAt, status]
          const name =
            (uRow && uRow[3]) || // name
            (uRow && uRow[1]) || // email fallback
            `user-${viewerId}`;

          viewers.push({ id: viewerId, name });
        }

        response.viewers = viewers;
      }
    }

    return res.json(response);
  } catch (err) {
    console.error("[GET /api/access-log/interest-summary] ERROR:", err);
    return res.status(500).json({
      error: "관심 표시 요약 정보를 불러오는 데 실패했습니다.",
    });
  }
});

export default router;
