// backend/routes/users.ts
import { Router } from "express";
import { readSheet, appendRow } from "../config/sheets";

const router = Router();

interface SheetUserRow {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
  bio?: string;
  preferredGenres?: string;
  portfolio?: string;
  createdAt?: string;
}

function rowToSafeUser(row: (string | number | boolean | null)[]): SheetUserRow {
  return {
    id: Number(row[0] ?? 0),
    email: String(row[1] ?? ""),
    password: String(row[2] ?? ""),
    name: String(row[3] ?? ""),
    role: String(row[4] ?? ""),
    bio: row[5] ? String(row[5]) : "",
    preferredGenres: row[6] ? String(row[6]) : "",
    portfolio: row[7] ? String(row[7]) : "",
    createdAt: row[8] ? String(row[8]) : "",
  };
}

function toResponseUser(row: SheetUserRow) {
  const { password, ...safe } = row;
  return safe;
}

// GET /api/users
router.get("/", async (_req, res) => {
  try {
    const rows = await readSheet("Users");
    const users = rows.map(rowToSafeUser).map(toResponseUser);
    res.json(users);
  } catch (err: any) {
    console.error("[GET /api/users] ERROR:", err);
    res.status(500).json({
      error: "Failed to fetch users",
      detail: String(err?.message ?? err),
    });
  }
});

// POST /api/users/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, role, bio, preferredGenres, portfolio } = req.body as {
      email?: string;
      password?: string;
      name?: string;
      role?: string;
      bio?: string;
      preferredGenres?: string;
      portfolio?: string;
    };

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: "email, password, name, role 는 필수입니다." });
    }

    const rows = await readSheet("Users");

    const exists = rows.some((r) => String(r[1] ?? "") === email);
    if (exists) {
      return res.status(400).json({ error: "이미 사용 중인 이메일입니다." });
    }

    let maxId = 0;
    for (const r of rows) {
      const id = Number(r[0] ?? 0);
      if (!Number.isNaN(id) && id > maxId) maxId = id;
    }
    const newId = maxId + 1;
    const now = new Date().toISOString();

    await appendRow("Users", [
      String(newId),
      email,
      password,
      name,
      role,
      bio ?? "",
      preferredGenres ?? "",
      portfolio ?? "",
      now,
    ]);

    const user: SheetUserRow = {
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
  } catch (err: any) {
    console.error("[POST /api/users/register] ERROR:", err);
    res.status(500).json({
      error: "회원가입에 실패했습니다.",
      detail: String(err?.message ?? err),
    });
  }
});

export default router;
