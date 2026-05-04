import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { UserRole } from "@/models/User";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
}

// Role hierarchy: admin > moderator > editor > user
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  moderator: 3,
  editor: 2,
  user: 1,
};

// Check if user has required role or higher
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function createToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(): Promise<JWTPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireAdmin(): Promise<JWTPayload> {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Error("Forbidden - Admin access required");
  }
  return user;
}

// Require moderator or higher (moderator, admin)
export async function requireModerator(): Promise<JWTPayload> {
  const user = await requireAuth();
  if (!hasRole(user.role, "moderator")) {
    throw new Error("Forbidden - Moderator access required");
  }
  return user;
}

// Require editor or higher (editor, moderator, admin)
export async function requireEditor(): Promise<JWTPayload> {
  const user = await requireAuth();
  if (!hasRole(user.role, "editor")) {
    throw new Error("Forbidden - Editor access required");
  }
  return user;
}
