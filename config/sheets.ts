// config/sheets.ts
import path from "path";
import { google, sheets_v4 } from "googleapis";

const KEYFILEPATH = path.resolve("mindcraft-sheets-service.json");
const SPREADSHEET_ID = "10zY5a1D00T1dLYis02eM2vprGyb9gInLWjjjntVSZBI";

// 1) 인증 + sheets 클라이언트 생성
async function getSheets(): Promise<sheets_v4.Sheets> {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const client = await auth.getClient();

  return google.sheets({
    version: "v4",
    auth, // auth: client 가 아니라 auth 넘기는 게 타입 충돌이 적습니다.
  });
}

// 2) 읽기: 2행부터 Z열까지 (필요하면 range 변경해서 사용)
export async function readSheet(
  sheetName: string,
  range = "A2:Z"
): Promise<string[][]> {
  const sheets = await getSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${range}`,
  });

  // 데이터 없을 때 undefined 방지
  return (res.data.values as string[][]) || [];
}

// 3) 추가(append): 맨 마지막 다음 행에 추가
export async function appendRow(
  sheetName: string,
  values: (string | number | boolean | null)[]
): Promise<void> {
  const sheets = await getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: "RAW",
    requestBody: {
      values: [values],
    },
  });
}

// 4) 수정(update): 특정 행 전체를 새 값으로 교체
export async function updateRow(
  sheetName: string,
  rowIndex: number, // 실제 시트의 행 번호 (헤더 포함, 예: 2,3,4...)
  values: (string | number | boolean | null)[]
): Promise<void> {
  const sheets = await getSheets();

  const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values: [values],
    },
  });
}
