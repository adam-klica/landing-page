import { MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Lazily creates (and caches) the MongoDB client promise.
 *
 * Important:
 * - We avoid throwing and connecting at module scope, because that can cause
 *   Next.js route modules to fail to load and return a generic 500 (text/plain)
 *   instead of our JSON error response.
 */
export function getMongoClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    const error = new Error("Missing MONGODB_URI environment variable. Please check your environment variables in Hostinger control panel.");
    console.error("MongoDB Error:", error.message);
    return Promise.reject(error);
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      // Add connection options for better reliability across regions / cold starts
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 120000,
      maxIdleTimeMS: 60000,
      maxPoolSize: 10,
      retryReads: true,
    });
    global._mongoClientPromise = client.connect().catch((error) => {
      // Clear the promise on error so we can retry
      global._mongoClientPromise = undefined;
      console.error("MongoDB Connection Error:", error.message);
      throw new Error(`Failed to connect to MongoDB: ${error.message}. Please check your MONGODB_URI and MongoDB Atlas whitelist settings.`);
    });
  }

  return global._mongoClientPromise;
}

