"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/routes/users.ts
const express_1 = require("express");
const sheets_1 = require("../config/sheets");
const router = (0, express_1.Router)();
const SHEET_NAME = "Users";
// 시트 -> 백엔드 유저 객체
function rowToUser(row) {
    return {
        id: Number(row[0]),
        email: row[1] || "",
        password: row[2] || "",
        name: row[3] || "",
        role: row[4] || "",
        bio: row[5] || "",
        preferredGenres: row[6] || "",
        portfolio: row[7] || "",
        createdAt: row[8] || "",
        updatedAt: row[9] || "",
        status: row[10] || "active",
    };
}
// 유저 객체 -> 시트 행
function userToRow(user) {
    var _a;
    return [
        String(user.id),
        user.email,
        user.password,
        user.name,
        user.role,
        user.bio,
        user.preferredGenres,
        user.portfolio,
        user.createdAt,
        user.updatedAt,
        (_a = user.status) !== null && _a !== void 0 ? _a : "active",
    ];
}
// 클라이언트에 보내는 안전한 유저(비밀번호 제외)
function toSafeUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        bio: user.bio,
        preferredGenres: user.preferredGenres,
        portfolio: user.portfolio,
        createdAt: user.createdAt,
    };
}
// GET /api/users
router.get("/", async (_req, res) => {
    try {
        const rows = await (0, sheets_1.readSheet)(SHEET_NAME);
        if (!rows || rows.length === 0) {
            return res.json([]);
        }
        const users = rows
            .map(rowToUser)
            .filter((u) => u.status !== "deleted");
        res.json(users.map(toSafeUser));
    }
    catch (err) {
        console.error("[GET /api/users] ERROR:", err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});
// POST /api/users/register
router.post("/register", async (req, res) => {
    var _a;
    try {
        const { email, password, name, role } = req.body;
        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: "모든 필드를 입력해야 합니다." });
        }
        const rows = (_a = await (0, sheets_1.readSheet)(SHEET_NAME)) !== null && _a !== void 0 ? _a : [];
        // 이메일 중복 체크 (deleted는 무시)
        const existing = rows
            .map(rowToUser)
            .find((u) => u.status !== "deleted" && u.email === email);
        if (existing) {
            return res.status(400).json({ error: "이미 가입된 이메일입니다." });
        }
        const nextId = rows.length > 0
            ? Math.max(...rows.map((r) => Number(r[0]) || 0)) + 1
            : 1;
        const now = new Date().toISOString();
        const newUser = {
            id: nextId,
            email,
            password,
            name,
            role,
            bio: "",
            preferredGenres: "",
            portfolio: "",
            createdAt: now,
            updatedAt: now,
            status: "active",
        };
        await (0, sheets_1.appendRow)(SHEET_NAME, userToRow(newUser));
        res.status(201).json(toSafeUser(newUser));
    }
    catch (err) {
        console.error("[POST /api/users/register] ERROR:", err);
        res.status(500).json({ error: "회원가입에 실패했습니다." });
    }
});
// POST /api/users/login
router.post("/login", async (req, res) => {
    var _a;
    try {
        const { email, password } = req.body;
        const rows = (_a = await (0, sheets_1.readSheet)(SHEET_NAME)) !== null && _a !== void 0 ? _a : [];
        const users = rows.map(rowToUser);
        const user = users.find((u) => u.status !== "deleted" &&
            u.email === email &&
            u.password === password);
        if (!user) {
            return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
        }
        res.json({ user: toSafeUser(user) });
    }
    catch (err) {
        console.error("[POST /api/users/login] ERROR:", err);
        res.status(500).json({ error: "로그인에 실패했습니다." });
    }
});
// PUT /api/users/:id  (프로필 수정)
router.put("/:id", async (req, res) => {
    var _a;
    try {
        const userId = Number(req.params.id);
        const { name, role, bio, preferredGenres, portfolio } = req.body;
        const rows = (_a = await (0, sheets_1.readSheet)(SHEET_NAME)) !== null && _a !== void 0 ? _a : [];
        const targetRow = rows.find((r) => Number(r[0]) === userId);
        if (!targetRow) {
            return res.status(404).json({ error: "User not found" });
        }
        const oldUser = rowToUser(targetRow);
        if (oldUser.status === "deleted") {
            return res.status(404).json({ error: "User not found" });
        }
        const now = new Date().toISOString();
        const updatedUser = {
            ...oldUser,
            name: name !== null && name !== void 0 ? name : oldUser.name,
            role: role !== null && role !== void 0 ? role : oldUser.role,
            bio: bio !== null && bio !== void 0 ? bio : oldUser.bio,
            preferredGenres: preferredGenres !== null && preferredGenres !== void 0 ? preferredGenres : oldUser.preferredGenres,
            portfolio: portfolio !== null && portfolio !== void 0 ? portfolio : oldUser.portfolio,
            updatedAt: now,
        };
        await (0, sheets_1.updateRowById)(SHEET_NAME, 0, userId, userToRow(updatedUser));
        res.json(toSafeUser(updatedUser));
    }
    catch (err) {
        console.error("[PUT /api/users/:id] ERROR:", err);
        res.status(500).json({ error: "Failed to update user" });
    }
});
// DELETE /api/users/:id  (회원 탈퇴 = status를 deleted로 변경)
router.delete("/:id", async (req, res) => {
    var _a;
    try {
        const userId = Number(req.params.id);
        const rows = (_a = await (0, sheets_1.readSheet)(SHEET_NAME)) !== null && _a !== void 0 ? _a : [];
        const targetRow = rows.find((r) => Number(r[0]) === userId);
        if (!targetRow) {
            return res.status(404).json({ error: "User not found" });
        }
        const oldUser = rowToUser(targetRow);
        if (oldUser.status === "deleted") {
            return res.status(404).json({ error: "User already deleted" });
        }
        const now = new Date().toISOString();
        const deletedUser = {
            ...oldUser,
            status: "deleted",
            updatedAt: now,
        };
        await (0, sheets_1.updateRowById)(SHEET_NAME, 0, userId, userToRow(deletedUser));
        res.json({ success: true });
    }
    catch (err) {
        console.error("[DELETE /api/users/:id] ERROR:", err);
        res.status(500).json({ error: "Failed to delete user" });
    }
});
exports.default = router;
