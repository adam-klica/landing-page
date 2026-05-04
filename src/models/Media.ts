export interface Media {
  _id?: string;
  filename: string;
  originalName: string;
  url: string; // base64 data URI
  size: number;
  type: string; // MIME type
  extension?: string;
  createdAt: Date;
  createdBy?: string; // User ID who uploaded
}
