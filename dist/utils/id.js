"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextId = getNextId;
// utils/id.ts
const sheets_1 = require("../config/sheets");
async function getNextId(sheetName) {
    const rows = await (0, sheets_1.readSheet)(sheetName, "A2:A");
    if (!rows || rows.length === 0)
        return 1;
    const ids = rows
        .map((r) => Number(r[0]))
        .filter((n) => !Number.isNaN(n));
    const maxId = ids.length ? Math.max(...ids) : 0;
    return maxId + 1;
}
