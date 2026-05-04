/**
 * NOTE:
 * This project uses the native MongoDB driver (not Mongoose).
 * These model files are kept as plain TypeScript interfaces for shared typing.
 */

export interface Group {
  _id?: string;
  name: string;
  description?: string;
  createdBy: string;
  members: string[];
  createdAt: Date;
  updatedAt: Date;
}
