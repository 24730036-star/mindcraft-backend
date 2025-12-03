import { google } from 'googleapis';
import path from 'path';

// index.ts (백엔드 엔트리)
import express from "express";
import cors from "cors";
import usersRouter from "./routes/users";
import storiesRouter from "./routes/stories";
import messagesRouter from "./routes/messages";
import accessLogRouter from "./routes/accessLog";


interface Story {
  id: number;
  title: string;
  authorId: number;
  genres: string[];
  teaser: string;
  overview: string;
  fullStory: string;
  recruitmentStatus: string;
}


const app = express();
const port = process.env.PORT || 4000;

// 백엔드 폴더 안에 실제로 존재하는 JSON 파일 이름과 맞추세요.
const KEYFILEPATH = path.resolve('mindcraft-sheets-service.json');
// 여기는 이미 제대로 들어가 있음
const SPREADSHEET_ID = '10zY5a1D00T1dLYis02eM2vprGyb9gInLWjjjntVSZBI';

app.use(cors());
app.use(express.json());
app.use("/api/users", usersRouter);
app.use("/api/stories", storiesRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/access-log", accessLogRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

async function readStories(): Promise<Story[]> {
  const rows = await readSheet('Stories'); // 시트 이름 정확히 확인!

  if (!rows) return [];

  const stories: Story[] = rows.map((row) => ({
    id: Number(row[0]),
    authorId: Number(row[1]),
    title: row[2] || '',
    genres: row[3] ? row[3].split(',').map((g: string) => g.trim()) : [],
    teaser: row[4] || '',
    overview: row[5] || '',
    fullStory: row[6] || '',
    recruitmentStatus: row[7] || '모집중',
  }));

  return stories;
}


async function authSheets() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  // getClient() 따로 안 쓰고 GoogleAuth 자체를 auth로 넘깁니다.
  const sheets = google.sheets({
    version: 'v4',
    auth, // 타입 오류 없이 통과
  });

  return sheets;
}


async function readSheet(sheetName: string, range = 'A2:Z') {
  const sheets = await authSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${range}`,
  });
  return res.data.values;
}

app.get('/api/users', async (req, res) => {
  try {
    const rows = await readSheet('Users');

    if (!rows) {
      return res.json([]);
    }

    const users = rows.map((row) => ({
      id: Number(row[0]),
      name: row[1],
      role: row[2],
      avatar: row[3],
      bio: row[4],
      preferredGenres: row[5]?.split(',') || [],
      portfolioLink: row[6],
      trustScore: parseFloat(row[7]),
      achievements: {
        collaborations: Number(row[8]),
        recommendations: Number(row[9]),
      },
    }));

    res.json(users);
  } catch (err: any) {
    console.error('[GET /api/users] ERROR:', err);
    res.status(500).json({
      error: 'Failed to fetch users',
    });
  }
});

// 스토리 목록 (1단계용: 기본 정보 위주)
app.get('/api/stories', async (req, res) => {
  try {
    const stories = await readStories();

    // 1단계: 전체 공개용 필드만 보내기 (원하면 fullStory 포함해도 됨)
    const publicStories = stories.map((story) => ({
      id: story.id,
      title: story.title,
      authorId: story.authorId,
      genres: story.genres,
      teaser: story.teaser,
      overview: story.overview,         // 프론트에서 단계에 따라 숨길 수 있음
      fullStory: story.fullStory,       // 아직은 프론트에서 제어, 이후 단계에서 서버 쪽에서도 마스킹
      recruitmentStatus: story.recruitmentStatus,
    }));

    res.json(publicStories);
  } catch (err) {
    console.error('[GET /api/stories] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[SERVER ERROR]", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(port, () => {
  console.log(`✔ Backend running on http://localhost:${port}`);
});
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
