// ======================
// Users Sheet
// ======================

export interface User {
  id: number;
  email: string;
  password: string;   // bcrypt hashed password
  name: string;
  role: string;       // "creator" | "developer" | "both"
  bio: string;
  preferredGenres: string;  // comma-separated string
  portfolio: string;
  createdAt: string;  // ISO date
}

// ======================
// Stories Sheet
// ======================

export interface Story {
  id: number;
  ownerId: number;
  title: string;
  genre: string;
  keywords: string;   // comma-separated
  teaser: string;
  outline: string;
  detail: string;
  createdAt: string;
  updatedAt: string;
}

// ======================
// Messages Sheet
// ======================

export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  read: string;   // "TRUE" | "FALSE"
  createdAt: string;
}

// ======================
// AccessLog Sheet
// ======================

export interface AccessLog {
  id: number;
  storyId: number;
  viewerId: number;
  level: "INTEREST" | "VIEW_OUTLINE" | "VIEW_DETAIL";
  createdAt: string;
}
