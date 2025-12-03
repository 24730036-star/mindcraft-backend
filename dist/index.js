"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const googleapis_1 = require("googleapis");
const path_1 = __importDefault(require("path"));
// index.ts (백엔드 엔트리)
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const users_1 = __importDefault(require("./routes/users"));
const stories_1 = __importDefault(require("./routes/stories"));
const messages_1 = __importDefault(require("./routes/messages"));
const accessLog_1 = __importDefault(require("./routes/accessLog"));
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
// 백엔드 폴더 안에 실제로 존재하는 JSON 파일 이름과 맞추세요.
const KEYFILEPATH = path_1.default.resolve('mindcraft-sheets-service.json');
// 여기는 이미 제대로 들어가 있음
const SPREADSHEET_ID = '10zY5a1D00T1dLYis02eM2vprGyb9gInLWjjjntVSZBI';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/users", users_1.default);
app.use("/api/stories", stories_1.default);
app.use("/api/messages", messages_1.default);
app.use("/api/access-log", accessLog_1.default);
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
async function readStories() {
    const rows = await readSheet('Stories'); // 시트 이름 정확히 확인!
    if (!rows)
        return [];
    const stories = rows.map((row) => ({
        id: Number(row[0]),
        authorId: Number(row[1]),
        title: row[2] || '',
        genres: row[3] ? row[3].split(',').map((g) => g.trim()) : [],
        teaser: row[4] || '',
        overview: row[5] || '',
        fullStory: row[6] || '',
        recruitmentStatus: row[7] || '모집중',
    }));
    return stories;
}
async function authSheets() {
    const auth = new googleapis_1.google.auth.GoogleAuth({
        keyFile: KEYFILEPATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    // getClient() 따로 안 쓰고 GoogleAuth 자체를 auth로 넘깁니다.
    const sheets = googleapis_1.google.sheets({
        version: 'v4',
        auth, // 타입 오류 없이 통과
    });
    return sheets;
}
async function readSheet(sheetName, range = 'A2:Z') {
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
        const users = rows.map((row) => {
            var _a;
            return ({
                id: Number(row[0]),
                name: row[1],
                role: row[2],
                avatar: row[3],
                bio: row[4],
                preferredGenres: ((_a = row[5]) === null || _a === void 0 ? void 0 : _a.split(',')) || [],
                portfolioLink: row[6],
                trustScore: parseFloat(row[7]),
                achievements: {
                    collaborations: Number(row[8]),
                    recommendations: Number(row[9]),
                },
            });
        });
        res.json(users);
    }
    catch (err) {
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
            overview: story.overview, // 프론트에서 단계에 따라 숨길 수 있음
            fullStory: story.fullStory, // 아직은 프론트에서 제어, 이후 단계에서 서버 쪽에서도 마스킹
            recruitmentStatus: story.recruitmentStatus,
        }));
        res.json(publicStories);
    }
    catch (err) {
        console.error('[GET /api/stories] ERROR:', err);
        res.status(500).json({ error: 'Failed to fetch stories' });
    }
});
app.get("/", (req, res) => {
    res.json({ status: "ok" });
});
app.use(
// eslint-disable-next-line @typescript-eslint/no-unused-vars
(err, req, res, next) => {
    console.error("[SERVER ERROR]", err);
    res.status(500).json({ error: "Internal server error" });
});
app.listen(port, () => {
    console.log(`✔ Backend running on http://localhost:${port}`);
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
