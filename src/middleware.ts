import { withAuth, NextRequestWithAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export function handleMiddleware(req: NextRequestWithAuth | any) {
  const token = req.nextauth?.token;
  const isAuth = !!token;
  const pathname = req.nextUrl.pathname;

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register');

  // Giriş yapmış kullanıcı login/register sayfalarına giderse dashboard'a yönlendir
  if (isAuthPage) {
    if (isAuth) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return null;
  }

  // Yalnızca ADMIN rolünün erişebileceği sayfalar (HIGH-01)
  const isAdminOnlyPage =
    pathname.startsWith('/dashboard/users') ||
    pathname.startsWith('/dashboard/reports');

  if (isAdminOnlyPage && token?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export default withAuth(
  handleMiddleware,
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isAuthPage =
          req.nextUrl.pathname.startsWith('/login') ||
          req.nextUrl.pathname.startsWith('/register');

        if (isAuthPage) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
