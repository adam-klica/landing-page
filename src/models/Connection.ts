export interface Connection {
  _id?: string;
  userId: string; // User koji šalje zahtev
  connectionId: string; // User kome se šalje zahtev
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
  updatedAt: Date;
}
