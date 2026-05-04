import { getMongoClientPromise } from "./mongodb";

export async function getDb() {
  try {
    const client = await getMongoClientPromise();
    const dbName = process.env.MONGODB_DB || "abgc";
    return client.db(dbName);
  } catch (error: any) {
    console.error("Error getting database:", error);
    if (error.message?.includes("MONGODB_URI")) {
      throw new Error("MongoDB connection string is missing. Please check environment variables.");
    }
    throw new Error(`Database connection failed: ${error.message || "Unknown error"}`);
  }
}

export async function getCollection(collectionName: string) {
  try {
    const db = await getDb();
    return db.collection(collectionName);
  } catch (error: any) {
    console.error(`Error getting collection "${collectionName}":`, error);
    throw error; // Re-throw to let caller handle
  }
}
