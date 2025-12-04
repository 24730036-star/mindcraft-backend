"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleAuth = getGoogleAuth;
exports.getSheetsClient = getSheetsClient;
exports.readSheet = readSheet;
exports.appendRow = appendRow;
exports.updateRow = updateRow;
exports.updateRowById = updateRowById;
// backend/config/sheets.ts
const googleapis_1 = require("googleapis");
/**
 * 사용할 스프레드시트 ID
 *  - Render 환경 변수 GOOGLE_SHEETS_ID 가 있으면 그 값을 사용
 *  - 없으면 하드코딩된 ID 사용 (필요하면 수정)
 */
const SPREADSHEET_ID = (_a = process.env.GOOGLE_SHEETS_ID) !== null && _a !== void 0 ? _a : "10zY5a1D00T1dLYis02eM2vprGyb9gInLWjjjntVSZBI";
/** 서비스 계정 JSON 을 env 에서 읽어오기 */
function parseCredentials() {
    const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!json) {
        throw new Error("[sheets] GOOGLE_APPLICATION_CREDENTIALS_JSON env is not set");
    }
    return JSON.parse(json);
}
/** GoogleAuth 생성 */
async function getGoogleAuth() {
    const credentials = parseCredentials();
    const auth = new googleapis_1.google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return auth;
}
/** Sheets 클라이언트 생성 */
async function getSheetsClient() {
    const auth = await getGoogleAuth();
    // 타입 에러 방지를 위해 auth 를 any 로 캐스팅
    return googleapis_1.google.sheets({
        version: "v4",
        auth: auth,
    });
}
/** 시트 읽기 */
async function readSheet(sheetName, range = "A2:Z") {
    var _a;
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!${range}`,
    });
    return ((_a = res.data.values) !== null && _a !== void 0 ? _a : []);
}
/** 한 줄 추가 */
async function appendRow(sheetName, row) {
    var _a;
    const sheets = await getSheetsClient();
    const values = [
        row.map((v) => v === null || v === undefined ? null : String(v)),
    ];
    const res = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A:A`,
        valueInputOption: "RAW",
        requestBody: { values },
    });
    const updates = res.data.updates;
    const updatedRange = (_a = updates === null || updates === void 0 ? void 0 : updates.updatedRange) !== null && _a !== void 0 ? _a : "";
    // 예: "Users!A5:G5" → 5 추출
    const match = updatedRange.match(/!.*?(\d+):/);
    const rowIndex = match ? Number(match[1]) : -1;
    return rowIndex;
}
/** 특정 행 번호(ArowIndex)를 통째로 업데이트 */
async function updateRow(sheetName, rowIndex, row) {
    const sheets = await getSheetsClient();
    const values = [
        row.map((v) => v === null || v === undefined ? null : String(v)),
    ];
    const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: "RAW",
        requestBody: { values },
    });
}
/**
 * ID 컬럼에서 id를 찾아서 그 행을 업데이트
 *  - sheetName: 시트 이름 (예: "Users")
 *  - idColumnIndex: 0 기반 인덱스 (A열=0, B열=1 ...)
 *  - idValue: 찾을 ID 값
 *  - row: 새 행 데이터
 */
async function updateRowById(sheetName, idColumnIndex, idValue, row) {
    // A2부터 읽어오므로 실제 시트 행 번호 = index + 2
    const rows = await readSheet(sheetName, "A2:Z");
    const targetIndex = rows.findIndex((r) => {
        const cell = r[idColumnIndex];
        return cell === String(idValue);
    });
    if (targetIndex === -1) {
        throw new Error(`[sheets] updateRowById: row not found in "${sheetName}" for id=${idValue}`);
    }
    const rowIndex = targetIndex + 2; // 헤더가 1행, 데이터는 2행부터
    await updateRow(sheetName, rowIndex, row);
}
