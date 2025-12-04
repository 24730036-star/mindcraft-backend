// backend/routes/users.ts
import { Router } from "express";
import { appendRow, readSheet, updateRowById } from "../config/sheets";

const router = Router();

type BackendRole = "creator" | "developer" | "both" | string;

interface SheetUserRow {
  id: number;
  email: string;
  password: string;
  name: string;
  role: BackendRole;
  bio: string;
  preferredGenres: string;
  portfolio: string;
  createdAt: string;
}

function mapRowToUser(row: string[]): SheetUserRow {
  return {
    id: Number(row[0]),
    email: row[1] || "",
    password: row[2] || "",
    name: row[3] || "",
    role: (row[4] || "") as BackendRole,
    bio: row[5] || "",
    preferredGenres: row[6] || "",
    portfolio: row[7] || "",
    createdAt: row[8] || "",
  };
}

// 안전한 유저 객체(비밀번호 제거)
function toSafeUser(row: SheetUserRow) {
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

/* ============================
   GET /api/users
============================ */
router.get("/", async (_req, res) => {
  try {
    const rows = await readSheet("Users");

    const users = rows
      .filter((r) => r[0]) // id가 있는 행만
      .map(mapRowToUser)
      .map(toSafeUser);

    res.json(users);
  } catch (err: any) {
    console.error("[GET /api/users] ERROR:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch users", detail: String(err?.message ?? err) });
  }
});

/* ============================
   POST /api/users/register
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
      return res.status(400).json({ error: "email, password, name, role are required" });
    }

    const rows = await readSheet("Users");
    const users = rows.filter((r) => r[0]).map(mapRowToUser);

    // id = 최대값 + 1
    const nextId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;

    const now = new Date().toISOString();

    const newRow: (string | number | null)[] = [
      nextId,
      email,
      password,
      name,
      role,
      "", // bio
      "", // preferredGenres
      "", // portfolio
      now,
    ];

    await appendRow("Users", newRow);

    const safeUser = toSafeUser({
      id: nextId,
      email,
      password,
      name,
      role,
      bio: "",
      preferredGenres: "",
      portfolio: "",
      createdAt: now,
    });

    res.status(201).json(safeUser);
  } catch (err: any) {
    console.error("[POST /api/users/register] ERROR:", err);
    res
      .status(500)
      .json({ error: "Failed to register user", detail: String(err?.message ?? err) });
  }
});

/* ============================
   POST /api/users/login
============================ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const rows = await readSheet("Users");
    const users = rows.filter((r) => r[0]).map(mapRowToUser);

    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.json({ user: toSafeUser(found) });
  } catch (err: any) {
    console.error("[POST /api/users/login] ERROR:", err);
    res
      .status(500)
      .json({ error: "Failed to login", detail: String(err?.message ?? err) });
  }
});

/* ============================
   PUT /api/users/:id
   - 프로필 수정용
   - 프론트에서 보내는 body 예시:
     {
       "name": "새 이름",
       "role": "creator",
       "bio": "...",
       "preferredGenres": "RPG,판타지",
       "portfolio": "https://..."
     }
============================ */
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const { name, role, bio, preferredGenres, portfolio } = req.body as {
      name?: string;
      role?: BackendRole;
      bio?: string;
      preferredGenres?: string; // 프론트에서 이미 join해서 보낸다고 가정
      portfolio?: string;
    };

    let updatedUser: SheetUserRow | null = null;

    await updateRowById("Users", id, (row) => {
      const current = mapRowToUser(row);

      const next: SheetUserRow = {
        ...current,
        name: name ?? current.name,
        role: role ?? current.role,
        bio: bio ?? current.bio,
        preferredGenres: preferredGenres ?? current.preferredGenres,
        portfolio: portfolio ?? current.portfolio,
      };

      updatedUser = next;

      return [
        String(next.id),
        next.email,
        next.password,
        next.name,
        String(next.role),
        next.bio,
        next.preferredGenres,
        next.portfolio,
        next.createdAt,
      ];
    });

    if (!updatedUser) {
      // updateRowById에서 throw되므로 여기까지 오기 어렵지만 방어 코드
      return res.status(500).json({ error: "Failed to update user" });
    }

    res.json(toSafeUser(updatedUser));
  } catch (err: any) {
    console.error("[PUT /api/users/:id] ERROR:", err);
    res
      .status(500)
      .json({ error: "Failed to update user", detail: String(err?.message ?? err) });
  }
});

export default router;
