// routes/_accessLogHelper.ts
import { appendRow } from "../config/sheets";
import { getNextId } from "../utils/id";
import { AccessLevel } from "../types/accessLog";

const SHEET_NAME = "AccessLog";

export async function appendAccessLog(
  storyId: number,
  viewerId: number,
  level: AccessLevel
) {
  const id = await getNextId(SHEET_NAME);
  const now = new Date().toISOString();

  const newRow: (string | number)[] = [id, storyId, viewerId, level, now];
  await appendRow(SHEET_NAME, newRow);
}
