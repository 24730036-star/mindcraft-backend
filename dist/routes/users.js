"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sheets_1 = require("../config/sheets");
const router = (0, express_1.Router)();
const SHEET_NAME = "Users";
/** 시트에서 모든 행 읽어오기 (헤더 제외) */
async function getAllUserRows() {
    const rows = await (0, sheets_1.readSheet)(SHEET_NAME, "A2:I");
    return rows !== null && rows !== void 0 ? rows : [];
}
/** 시트 row → SheetUserRow */
function mapRowToSheetUser(row) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    return {
        id: Number((_a = row[0]) !== null && _a !== void 0 ? _a : 0),
        email: (_b = row[1]) !== null && _b !== void 0 ? _b : "",
        password: (_c = row[2]) !== null && _c !== void 0 ? _c : "",
        name: (_d = row[3]) !== null && _d !== void 0 ? _d : "",
        role: (_e = row[4]) !== null && _e !== void 0 ? _e : "",
        bio: (_f = row[5]) !== null && _f !== void 0 ? _f : "",
        preferredGenres: (_g = row[6]) !== null && _g !== void 0 ? _g : "",
        portfolio: (_h = row[7]) !== null && _h !== void 0 ? _h : "",
        createdAt: (_j = row[8]) !== null && _j !== void 0 ? _j : "",
    };
}
/** SheetUserRow → 프론트로 보내 줄 유저 객체(비밀번호 제거) */
function toSafeUser(row) {
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        bio: row.bio,
        preferredGenres: row.preferredGenres,
        portfolio: row.portfolio,
        createdAt: row.createdAt,
    };
}
/** 새 ID 생성: 현재 시트의 max(id)+1 */
async function getNextUserId() {
    const rows = await getAllUserRows();
    if (rows.length === 0)
        return 1;
    const ids = rows.map((r) => { var _a; return Number((_a = r[0]) !== null && _a !== void 0 ? _a : 0) || 0; });
    return Math.max(...ids) + 1;
}
/* ============================
   GET /api/users  (리스트)
============================ */
router.get("/", async (_req, res) => {
    try {
        const rows = await getAllUserRows();
        const users = rows.map(mapRowToSheetUser).map(toSafeUser);
        res.json(users);
    }
    catch (err) {
        console.error("[GET /api/users] ERROR:", err);
        res.status(500).json({
            error: "Failed to fetch users",
            detail: String(err),
        });
    }
});
/* ============================
   POST /api/users/register  (회원가입)
   body: { email, password, name, role }
============================ */
router.post("/register", async (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        if (!email || !password || !name || !role) {
            return res.status(400).json({
                error: "email, password, name, role 은 필수입니다.",
            });
        }
        const rows = await getAllUserRows();
        const existing = rows
            .map(mapRowToSheetUser)
            .find((u) => u.email === email);
        if (existing) {
            return res.status(400).json({ error: "이미 가입된 이메일입니다." });
        }
        const id = await getNextUserId();
        const createdAt = new Date().toISOString();
        const row = [
            id,
            email,
            password,
            name,
            role,
            "",
            "",
            "",
            createdAt,
        ];
        await (0, sheets_1.appendRow)(SHEET_NAME, row);
        const newUser = {
            id,
            email,
            name,
            role,
            bio: "",
            preferredGenres: "",
            portfolio: "",
            createdAt,
        };
        res.status(201).json(newUser);
    }
    catch (err) {
        console.error("[POST /api/users/register] ERROR:", err);
        res.status(500).json({
            error: "회원가입 처리 중 오류가 발생했습니다.",
            detail: String(err),
        });
    }
});
/* ============================
   POST /api/users/login  (로그인)
   body: { email, password }
============================ */
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "email과 password는 필수입니다." });
        }
        const rows = await getAllUserRows();
        const match = rows
            .map(mapRowToSheetUser)
            .find((u) => u.email === email && u.password === password);
        if (!match) {
            return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
        }
        const safeUser = toSafeUser(match);
        res.json({ user: safeUser });
    }
    catch (err) {
        console.error("[POST /api/users/login] ERROR:", err);
        res.status(500).json({
            error: "로그인 처리 중 오류가 발생했습니다.",
            detail: String(err),
        });
    }
});
/* ============================
   PUT /api/users/:id  (프로필 수정)
   body: { name?, role?, bio?, preferredGenres?, portfolio? }
============================ */
router.put("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!id || Number.isNaN(id)) {
            return res.status(400).json({ error: "잘못된 id 입니다." });
        }
        const { name, role, bio, preferredGenres, portfolio } = req.body;
        const rows = await getAllUserRows();
        const sheetUsers = rows.map(mapRowToSheetUser);
        const target = sheetUsers.find((u) => u.id === id);
        if (!target) {
            return res.status(404).json({ error: "해당 사용자를 찾을 수 없습니다." });
        }
        const updated = {
            ...target,
            name: name !== null && name !== void 0 ? name : target.name,
            role: role !== null && role !== void 0 ? role : target.role,
            bio: bio !== null && bio !== void 0 ? bio : target.bio,
            preferredGenres: preferredGenres !== null && preferredGenres !== void 0 ? preferredGenres : target.preferredGenres,
            portfolio: portfolio !== null && portfolio !== void 0 ? portfolio : target.portfolio,
        };
        // 👇 row 타입을 명시해 줌
        const row = [
            updated.id,
            updated.email,
            updated.password,
            updated.name,
            updated.role,
            updated.bio,
            updated.preferredGenres,
            updated.portfolio,
            updated.createdAt,
        ];
        // 👇 updateRowById 를 4개의 인자로 호출
        await (0, sheets_1.updateRowById)(SHEET_NAME, 0, id, row);
        const safeUser = toSafeUser(updated);
        res.json(safeUser);
    }
    catch (err) {
        console.error("[PUT /api/users/:id] ERROR:", err);
        res.status(500).json({
            error: "프로필 수정 중 오류가 발생했습니다.",
            detail: String(err),
        });
    }
});
exports.default = router;
