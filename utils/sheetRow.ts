// utils/sheetRow.ts
import { readSheet, updateRow } from "../config/sheets";

export async function findRowIndexById(
  sheetName: string,
  id: number
): Promise<number | null> {
  const rows = await readSheet(sheetName);
  const idx = rows.findIndex((r) => Number(r[0]) === id);
  if (idx === -1) return null;

  // 시트에서 실제 행 번호 = 데이터 시작 2행 + 배열 index
  return idx + 2;
}
