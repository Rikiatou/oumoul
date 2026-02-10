import { NextRequest, NextResponse } from "next/server";
import { apiRoutes } from "@oumoul/config";

const REFRESH_COOKIE = "oumoul_refresh";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const response = await fetch(`${apiRoutes.backend.base}${apiRoutes.backend.auth}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(data ?? { message: "Échec de connexion" }, { status: response.status });
  }

  const refreshToken = data?.refreshToken as string | undefined;
  const reply = NextResponse.json(cleanAuthPayload(data));

  if (refreshToken) {
    reply.cookies.set(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  return reply;
}

function cleanAuthPayload(input: unknown) {
  if (!input || typeof input !== "object") return input;
  const { refreshToken, ...rest } = input as Record<string, unknown>;
  void refreshToken;
  return rest;
}
