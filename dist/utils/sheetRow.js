"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRowIndexById = findRowIndexById;
// utils/sheetRow.ts
const sheets_1 = require("../config/sheets");
async function findRowIndexById(sheetName, id) {
    const rows = await (0, sheets_1.readSheet)(sheetName);
    const idx = rows.findIndex((r) => Number(r[0]) === id);
    if (idx === -1)
        return null;
    // 시트에서 실제 행 번호 = 데이터 시작 2행 + 배열 index
    return idx + 2;
}
