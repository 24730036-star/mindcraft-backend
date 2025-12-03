// utils/id.ts
import { readSheet } from "../config/sheets";

export async function getNextId(sheetName: string): Promise<number> {
  const rows = await readSheet(sheetName, "A2:A");
  if (!rows || rows.length === 0) return 1;

  const ids = rows
    .map((r) => Number(r[0]))
    .filter((n) => !Number.isNaN(n));

  const maxId = ids.length ? Math.max(...ids) : 0;
  return maxId + 1;
}
