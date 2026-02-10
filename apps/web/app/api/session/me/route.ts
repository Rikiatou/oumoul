import { NextRequest, NextResponse } from "next/server";
import { apiRoutes } from "@oumoul/config";

const REFRESH_COOKIE = "oumoul_refresh";

export async function GET(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const response = await fetch(`${apiRoutes.backend.base}${apiRoutes.backend.auth}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const reply = NextResponse.json({ user: null }, { status: 200 });
    reply.cookies.delete(REFRESH_COOKIE);
    return reply;
  }

  const reply = NextResponse.json(cleanAuthPayload(data));
  if (data?.refreshToken) {
    reply.cookies.set(REFRESH_COOKIE, data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  return reply;
}

export async function DELETE() {
  const reply = NextResponse.json({ success: true }, { status: 200 });
  reply.cookies.delete(REFRESH_COOKIE);
  return reply;
}

function cleanAuthPayload(input: unknown) {
  if (!input || typeof input !== "object") return input;
  const { refreshToken, ...rest } = input as Record<string, unknown>;
  void refreshToken;
  return rest;
}
