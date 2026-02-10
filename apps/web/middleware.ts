import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = [/^\/dashboard(\/.*)?$/];
const REFRESH_COOKIE = "oumoul_refresh";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((pattern) => pattern.test(pathname));

  if (!isProtected) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
