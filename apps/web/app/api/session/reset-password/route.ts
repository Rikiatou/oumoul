import { NextRequest, NextResponse } from "next/server";
import { apiRoutes } from "@oumoul/config";

export async function POST(request: NextRequest) {
  const payload = await request.json();

  const response = await fetch(`${apiRoutes.backend.base}${apiRoutes.backend.auth}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(data ?? { message: "Échec de la réinitialisation" }, { status: response.status });
  }

  return NextResponse.json(data ?? { success: true }, { status: 200 });
}
