"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/routes/users.ts
const express_1 = require("express");
const sheets_1 = require("../config/sheets");
const id_1 = require("../utils/id");
const router = (0, express_1.Router)();
// 시트 → User 객체
function rowToUser(row) {
    return {
        id: Number(row[0]),
        email: row[1],
        password: row[2],
        name: row[3],
        role: (row[4] || "creator"),
        bio: row[5] || "",
        preferredGenres: row[6] || "",
        portfolio: row[7] || "",
        createdAt: row[8] || "",
    };
}
// User 객체 → 시트 한 줄
function userToRow(u) {
    var _a, _b, _c, _d;
    return [
        u.id,
        u.email,
        u.password,
        u.name,
        u.role,
        (_a = u.bio) !== null && _a !== void 0 ? _a : "",
        (_b = u.preferredGenres) !== null && _b !== void 0 ? _b : "",
        (_c = u.portfolio) !== null && _c !== void 0 ? _c : "",
        (_d = u.createdAt) !== null && _d !== void 0 ? _d : new Date().toISOString(),
    ];
}
/** GET /api/users  : 유저 전체 조회 */
router.get("/", async (req, res) => {
    try {
        const rows = await (0, sheets_1.readSheet)("Users"); // 시트 이름
        if (!rows)
            return res.json([]);
        const users = rows.map(rowToUser).map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
            bio: u.bio,
            preferredGenres: u.preferredGenres,
            portfolio: u.portfolio,
            createdAt: u.createdAt,
        }));
        res.json(users);
    }
    catch (err) {
        console.error("[GET /api/users] ERROR", err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});
/** POST /api/users/register : 회원가입 */
router.post("/register", async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: "필수 항목이 누락되었습니다." });
        }
        const rows = (await (0, sheets_1.readSheet)("Users")) || [];
        // 이메일 중복 체크
        const exists = rows.some((row) => row[1] === email);
        if (exists) {
            return res.status(409).json({ error: "이미 사용 중인 이메일입니다." });
        }
        const nextId = await (0, id_1.getNextId)("Users"); // 유틸에 이미 있음
        const newUser = {
            id: nextId,
            email,
            password,
            name,
            role,
            bio: "",
            preferredGenres: "",
            portfolio: "",
            createdAt: new Date().toISOString(),
        };
        await (0, sheets_1.appendRow)("Users", userToRow(newUser));
        // 비밀번호 빼고 리턴 (프론트의 BackendSafeUser 형태)
        const { password: _, ...safeUser } = newUser;
        res.status(201).json(safeUser);
    }
    catch (err) {
        console.error("[POST /api/users/register] ERROR", err);
        res.status(500).json({ error: "회원가입에 실패했습니다." });
    }
});
/** POST /api/users/login : 로그인 */
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "이메일/비밀번호가 필요합니다." });
        }
        const rows = (await (0, sheets_1.readSheet)("Users")) || [];
        const userRow = rows.find((row) => row[1] === email && row[2] === password);
        if (!userRow) {
            return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
        }
        const user = rowToUser(userRow);
        const { password: _, ...safeUser } = user;
        // 프론트에서 (data as any).user 로 받으니까 이 형태로
        res.json({ user: safeUser });
    }
    catch (err) {
        console.error("[POST /api/users/login] ERROR", err);
        res.status(500).json({ error: "로그인에 실패했습니다." });
    }
});
exports.default = router;
