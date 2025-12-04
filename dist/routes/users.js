"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/routes/users.ts
const express_1 = require("express");
const sheets_1 = require("../config/sheets");
const router = (0, express_1.Router)();
function rowToSafeUser(row) {
    var _a, _b, _c, _d, _e;
    return {
        id: Number((_a = row[0]) !== null && _a !== void 0 ? _a : 0),
        email: String((_b = row[1]) !== null && _b !== void 0 ? _b : ""),
        password: String((_c = row[2]) !== null && _c !== void 0 ? _c : ""),
        name: String((_d = row[3]) !== null && _d !== void 0 ? _d : ""),
        role: String((_e = row[4]) !== null && _e !== void 0 ? _e : ""),
        bio: row[5] ? String(row[5]) : "",
        preferredGenres: row[6] ? String(row[6]) : "",
        portfolio: row[7] ? String(row[7]) : "",
        createdAt: row[8] ? String(row[8]) : "",
    };
}
function toResponseUser(row) {
    const { password, ...safe } = row;
    return safe;
}
// GET /api/users
router.get("/", async (_req, res) => {
    var _a;
    try {
        const rows = await (0, sheets_1.readSheet)("Users");
        const users = rows.map(rowToSafeUser).map(toResponseUser);
        res.json(users);
    }
    catch (err) {
        console.error("[GET /api/users] ERROR:", err);
        res.status(500).json({
            error: "Failed to fetch users",
            detail: String((_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : err),
        });
    }
});
// POST /api/users/register
router.post("/register", async (req, res) => {
    var _a, _b;
    try {
        const { email, password, name, role, bio, preferredGenres, portfolio } = req.body;
        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: "email, password, name, role 는 필수입니다." });
        }
        const rows = await (0, sheets_1.readSheet)("Users");
        const exists = rows.some((r) => { var _a; return String((_a = r[1]) !== null && _a !== void 0 ? _a : "") === email; });
        if (exists) {
            return res.status(400).json({ error: "이미 사용 중인 이메일입니다." });
        }
        let maxId = 0;
        for (const r of rows) {
            const id = Number((_a = r[0]) !== null && _a !== void 0 ? _a : 0);
            if (!Number.isNaN(id) && id > maxId)
                maxId = id;
        }
        const newId = maxId + 1;
        const now = new Date().toISOString();
        await (0, sheets_1.appendRow)("Users", [
            String(newId),
            email,
            password,
            name,
            role,
            bio !== null && bio !== void 0 ? bio : "",
            preferredGenres !== null && preferredGenres !== void 0 ? preferredGenres : "",
            portfolio !== null && portfolio !== void 0 ? portfolio : "",
            now,
        ]);
        const user = {
            id: newId,
            email,
            password,
            name,
            role,
            bio,
            preferredGenres,
            portfolio,
            createdAt: now,
        };
        res.status(201).json(toResponseUser(user));
    }
    catch (err) {
        console.error("[POST /api/users/register] ERROR:", err);
        res.status(500).json({
            error: "회원가입에 실패했습니다.",
            detail: String((_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : err),
        });
    }
});
exports.default = router;
