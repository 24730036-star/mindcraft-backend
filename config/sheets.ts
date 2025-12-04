// backend/config/sheets.ts
import { google } from "googleapis";

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID;

if (!SHEETS_ID) {
  console.error("[sheets] GOOGLE_SHEETS_ID env is not set");
}

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

/**
 * Google Sheets 클라이언트 초기화
 * - GOOGLE_APPLICATION_CREDENTIALS_JSON 환경변수에서 서비스 계정 키(JSON 문자열)를 읽어 사용
 */
async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw) {
    throw new Error("[sheets] GOOGLE_APPLICATION_CREDENTIALS_JSON env is not set");
  }

  let credentials: any;
  try {
    credentials = JSON.parse(raw);
  } catch (e) {
    console.error("[sheets] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:", e);
    throw e;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

/**
 * 특정 시트 범위 읽기
 * 예: sheetName="Users", range="A2:H"
 */
export async function readSheet(
  sheetName: string,
  range = "A2:Z"
): Promise<string[][]> {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_ID!,
    range: `${sheetName}!${range}`,
    majorDimension: "ROWS",
  });

  return (res.data.values as string[][]) || [];
}

/**
 * 마지막 행 뒤에 새 행 추가
 * values: 각 컬럼 값 배열
 * 반환값: 새로 추가된 행의 rowIndex (A1 기준 숫자, 예: 2, 3, 4 ...)
 */
export async function appendRow(
  sheetName: string,
  values: (string | number | null)[]
): Promise<number> {
  const sheets = await getSheetsClient();
  const range = `${sheetName}!A:Z`;

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEETS_ID!,
    range,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [values],
    },
  });

  // 새 row index = 현재 전체 행 개수 + 1 (헤더 포함이라고 가정)
  const all = await readSheet(sheetName);
  // 우리가 읽는 건 A2부터니까, 실제 시트 rowIndex = all.length + 1 (헤더 1줄 + 데이터)
  const rowIndex = all.length + 1;
  return rowIndex;
}

/**
 * Users 시트에서 첫 번째 컬럼(id)이 일치하는 행을 찾아 업데이트
 * - sheetName: "Users"
 * - id: 숫자 ID
 * - updater: 기존 row를 받아서 수정된 row를 리턴하는 함수
 */
export async function updateRowById(
  sheetName: string,
  id: number,
  updater: (row: string[]) => string[]
): Promise<void> {
  const sheets = await getSheetsClient();

  // A2부터 읽기 → rows[0]은 실제 시트의 2행(A2)
  const rows = await readSheet(sheetName);

  const index = rows.findIndex((row) => Number(row[0]) === id);
  if (index === -1) {
    throw new Error(`[sheets] Row with id=${id} not found in sheet "${sheetName}"`);
  }

  const currentRow = rows[index];
  const newRow = updater(currentRow);

  // 실제 시트 row 번호 (헤더가 1행, A2가 rows[0]이므로 +2)
  const sheetRowNumber = index + 2;

  const range = `${sheetName}!A${sheetRowNumber}:Z${sheetRowNumber}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEETS_ID!,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values: [newRow],
    },
  });
}
