import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Rewrite /agent-hub/api/* → localhost:3001/api/*
  if (pathname.startsWith('/agent-hub/api/')) {
    const url = new URL(request.url);
    url.hostname = '127.0.0.1';
    url.port = '3001';
    url.pathname = pathname.replace('/agent-hub', '');
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/agent-hub/api/:path*'],
};
