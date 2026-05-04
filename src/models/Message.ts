/**
 * NOTE:
 * This project uses the native MongoDB driver (not Mongoose).
 * These model files are kept as plain TypeScript interfaces for shared typing.
 */

export interface Message {
  _id?: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  message: string;
  fileUrl?: string;
  isRead: boolean;
  createdAt: Date;
  isPinned?: boolean;
  pinnedAt?: Date;
  pinnedBy?: string;
  reactions?: {
    emoji: string;
    userId: string;
  }[];
}
