import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Delete the auth token cookie
  response.cookies.delete("auth-token");
  
  // Also set it to expired to ensure it's removed (must match the same settings as when it was set)
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
    expires: new Date(0),
  });
  
  return response;
}
