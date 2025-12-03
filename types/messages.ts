export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  read: boolean;     // ✅ boolean 으로 변경
  createdAt: string;
}