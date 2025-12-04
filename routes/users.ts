import { Router } from "express";
import { readSheet, appendRow, updateRowById } from "../config/sheets";

const router = Router();

export type BackendRole = "creator" | "developer" | "both" | string;

export interface BackendSafeUser {
  id: number;
  email: string;
  name: string;
  role: BackendRole;
  bio?: string;
  preferredGenres?: string;
  portfolio?: string;
  createdAt?: string;
}

// 시트 한 행을 내부 User 타입으로
interface SheetUserRow {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
  bio: string;
  preferredGenres: string;
  portfolio: string;
  createdAt: string;
}

const SHEET_NAME = "Users";

/** 시트에서 모든 행 읽어오기 (헤더 제외) */
async function getAllUserRows(): Promise<string[][]> {
  const rows = await readSheet(SHEET_NAME, "A2:I");
  return rows ?? [];
}

/** 시트 row → SheetUserRow */
function mapRowToSheetUser(row: string[]): SheetUserRow {
  return {
    id: Number(row[0] ?? 0),
    email: row[1] ?? "",
    password: row[2] ?? "",
    name: row[3] ?? "",
    role: row[4] ?? "",
    bio: row[5] ?? "",
    preferredGenres: row[6] ?? "",
    portfolio: row[7] ?? "",
    createdAt: row[8] ?? "",
  };
}

/** SheetUserRow → 프론트로 보내 줄 유저 객체(비밀번호 제거) */
function toSafeUser(row: SheetUserRow): BackendSafeUser {
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
async function getNextUserId(): Promise<number> {
  const rows = await getAllUserRows();
  if (rows.length === 0) return 1;

  const ids = rows.map((r) => Number(r[0] ?? 0) || 0);
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
  } catch (err) {
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
    const { email, password, name, role } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      role?: BackendRole;
    };

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

    const row: (string | number | boolean | null)[] = [
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

    await appendRow(SHEET_NAME, row);

    const newUser: BackendSafeUser = {
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
  } catch (err) {
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
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

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
  } catch (err) {
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

    const { name, role, bio, preferredGenres, portfolio } = req.body as {
      name?: string;
      role?: BackendRole;
      bio?: string;
      preferredGenres?: string;
      portfolio?: string;
    };

    const rows = await getAllUserRows();
    const sheetUsers = rows.map(mapRowToSheetUser);
    const target = sheetUsers.find((u) => u.id === id);

    if (!target) {
      return res.status(404).json({ error: "해당 사용자를 찾을 수 없습니다." });
    }

    const updated: SheetUserRow = {
      ...target,
      name: name ?? target.name,
      role: role ?? target.role,
      bio: bio ?? target.bio,
      preferredGenres: preferredGenres ?? target.preferredGenres,
      portfolio: portfolio ?? target.portfolio,
    };

    // 👇 row 타입을 명시해 줌
    const row: (string | number | boolean | null)[] = [
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
    await updateRowById(SHEET_NAME, 0, id, row);

    const safeUser = toSafeUser(updated);
    res.json(safeUser);
  } catch (err) {
    console.error("[PUT /api/users/:id] ERROR:", err);
    res.status(500).json({
      error: "프로필 수정 중 오류가 발생했습니다.",
      detail: String(err),
    });
  }
});

export default router;
