// backend/config/sheets.ts
import { google, sheets_v4 } from 'googleapis';

// ★ 구글 스프레드시트 ID (예전 코드에서 쓰던 값 그대로)
const SPREADSHEET_ID = '10zY5a1D00T1dLYis02eM2vprGyb9gInLWjjjntVSZBI';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let sheetsClient: sheets_v4.Sheets | null = null;

// 공용 클라이언트 생성 함수
async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) return sheetsClient;

  // ★ 환경변수에서 JSON 문자열 가져오기
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_JSON 환경변수가 설정되어 있지 않습니다.'
    );
  }

  // 문자열 → 객체로 파싱
  const credentials = JSON.parse(json);

  // 파일 경로(keyFile) 대신 credentials 사용
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

// 시트 읽기
export async function readSheet(sheetName: string, range = 'A2:Z') {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${range}`,
  });
  return res.data.values ?? [];
}

// 행 추가 (회원가입, 스토리 등록 등에서 사용)
export async function appendRow(
  sheetName: string,
  row: (string | number | null)[]
) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });
}
