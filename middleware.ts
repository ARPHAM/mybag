import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authToken = request.cookies.get('auth_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const hasToken = Boolean(authToken || refreshToken);

  const isAuthPage = pathname.startsWith('/login');
  const isApiRoute = pathname.startsWith('/api');
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/icons') ||
    pathname.includes('.');

  if (isApiRoute || isStaticAsset) {
    return NextResponse.next();
  }

  // Nếu đã có token phiên đăng nhập mà truy cập trang /login -> chuyển về Dashboard chính
  if (isAuthPage && hasToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Nếu chưa có bất kỳ token xác thực nào mà truy cập vào các trang riêng tư -> chuyển hướng về /login
  if (!isAuthPage && !hasToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes handle their own auth & return 401 JSON)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
