"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendAccessLog = appendAccessLog;
// routes/_accessLogHelper.ts
const sheets_1 = require("../config/sheets");
const id_1 = require("../utils/id");
const SHEET_NAME = "AccessLog";
async function appendAccessLog(storyId, viewerId, level) {
    const id = await (0, id_1.getNextId)(SHEET_NAME);
    const now = new Date().toISOString();
    const newRow = [id, storyId, viewerId, level, now];
    await (0, sheets_1.appendRow)(SHEET_NAME, newRow);
}
