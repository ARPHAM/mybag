import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Danh sách các route không yêu cầu đăng nhập
const publicRoutes = ['/login', '/register'];

// Danh sách các route yêu cầu đăng nhập (bao gồm các sub-routes của chúng)
// Trong Next.js 14/15 app router, các routes chính nằm trong (main) như: profile, finance, health, tasks, menu, shopping, settings
const protectedRoutes = ['/profile', '/finance', '/health', '/tasks', '/menu', '/shopping', '/settings', '/'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Bỏ qua middleware cho các API routes, static files, next auth, images, v.v.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const hasAccessToken = request.cookies.has('auth_token');
  const hasRefreshToken = request.cookies.has('refresh_token');
  
  // Coi như có đăng nhập nếu 1 trong 2 token tồn tại (nếu access token hết hạn thì interceptor/API tự refresh)
  const isAuthenticated = hasAccessToken || hasRefreshToken;

  // Nếu truy cập route public (login, register) nhưng ĐÃ đăng nhập -> Đá về /profile
  if (publicRoutes.includes(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL('/profile', request.url));
  }

  // Nếu truy cập route protected nhưng CHƯA đăng nhập -> Đá về /login
  // Hoặc truy cập bất cứ route nào không phải public mà chưa đăng nhập (bao quát)
  if (!publicRoutes.includes(pathname) && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Nếu truy cập root (/) mà đã đăng nhập -> Đá về /profile
  if (pathname === '/' && isAuthenticated) {
    return NextResponse.redirect(new URL('/profile', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Chỉ chạy middleware trên những route UI, bỏ qua file tĩnh và api
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
