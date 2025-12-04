// backend/config/sheets.ts
import { google } from "googleapis";

/**
 *  Google Sheets 기본 설정
 */
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// 스프레드시트 ID (지금 쓰고 있는 ID 그대로 사용)
const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_ID || "10zY5a1D00T1dLYis02eM2vprGyb9gInLWjjjntVSZBI";

/**
 * row 한 줄 타입
 *  - boolean 도 들어올 수 있으니까 boolean 포함
 */
export type SheetRow = (string | number | boolean | null)[];

/**
 * Render 에서는 서비스 계정 JSON 전체가
 * GOOGLE_APPLICATION_CREDENTIALS_JSON 환경변수에 들어 있다고 가정
 */
function getGoogleAuth() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!raw) {
    throw new Error(
      "[sheets] GOOGLE_APPLICATION_CREDENTIALS_JSON env is not set"
    );
  }

  let credentials: any;
  try {
    credentials = JSON.parse(raw);
  } catch (e) {
    console.error("[sheets] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON");
    throw e;
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
}

/**
 * sheets 클라이언트 생성
 */
async function getSheetsClient() {
  // getClient() 가 AnyAuthClient 를 돌려줘서 타입 에러가 나므로 any 로 캐스팅
  const auth = (await getGoogleAuth().getClient()) as any;

  return google.sheets({
    version: "v4",
    auth,
  });
}

/**
 * 시트 읽기
 */
export async function readSheet(
  sheetName: string,
  range = "A2:Z"
): Promise<string[][]> {
  const sheets = await getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${range}`,
  });

  return (res.data.values ?? []) as string[][];
}

/**
 * 한 줄 append
 */
export async function appendRow(sheetName: string, row: SheetRow) {
  const sheets = await getSheetsClient();

  // undefined 는 null 로 바꿔서 넣기
  const normalizedRow = row.map((v) =>
    typeof v === "undefined" ? null : (v as string | number | boolean | null)
  );

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [normalizedRow],
    },
  });
}

/**
 * 한 줄 update
 *  - rowIndex: 1부터 시작하는 실제 엑셀 줄 번호
 */
export async function updateRow(
  sheetName: string,
  rowIndex: number,
  row: SheetRow
) {
  const sheets = await getSheetsClient();

  const normalizedRow = row.map((v) =>
    typeof v === "undefined" ? null : (v as string | number | boolean | null)
  );

  const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [normalizedRow],
    },
  });
}
