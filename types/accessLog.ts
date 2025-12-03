// AccessLog 한 줄 데이터 구조
export interface AccessLog {
  id: number;
  storyId: number;
  viewerId: number;
  level: AccessLevel;
  createdAt: string;
}

// 접근 레벨 ENUM (PRD 기준)
export type AccessLevel =
  | "INTEREST"      // 관심 버튼 누름
  | "VIEW_OUTLINE"  // 개요 열람
  | "VIEW_DETAIL";  // 상세 열람 (현재는 작성자 본인만)
