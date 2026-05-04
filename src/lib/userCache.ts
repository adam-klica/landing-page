import { unstable_cache, revalidateTag } from "next/cache";
import { ObjectId } from "mongodb";
import { getCollection } from "./db";

const TTL_SECONDS = 60;

export type CachedAuthUser = {
  _id: string;
  username: string;
  email: string;
  role: string;
  displayName: string;
  organization?: string;
  location?: string;
  role_custom?: string;
  interests?: string;
  profilePicture?: string;
  registeredPlatforms: { lms: boolean; ecommerce: boolean; dms: boolean };
} | null;

export function userTag(userId: string) {
  return `user:${userId}`;
}

export async function getCachedAuthUser(userId: string): Promise<CachedAuthUser> {
  const fetcher = unstable_cache(
    async (id: string) => {
      const collection = await getCollection("users");
      const user = await collection.findOne(
        { _id: new ObjectId(id) },
        {
          projection: {
            username: 1,
            email: 1,
            role: 1,
            displayName: 1,
            organization: 1,
            location: 1,
            role_custom: 1,
            interests: 1,
            profilePicture: 1,
            registeredPlatforms: 1,
          },
        }
      );
      if (!user) return null;
      return {
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        displayName: user.displayName || user.username,
        organization: user.organization,
        location: user.location,
        role_custom: user.role_custom,
        interests: user.interests,
        profilePicture: user.profilePicture,
        registeredPlatforms: user.registeredPlatforms || {
          lms: false,
          ecommerce: false,
          dms: false,
        },
      };
    },
    ["auth-me", userId],
    { revalidate: TTL_SECONDS, tags: [userTag(userId)] }
  );
  return fetcher(userId);
}

export function invalidateUser(userId: string) {
  // Next.js 16 requires explicit profile arg ('max' = invalidate immediately)
  (revalidateTag as (tag: string, profile?: "max" | "default") => void)(
    userTag(userId),
    "max"
  );
}
