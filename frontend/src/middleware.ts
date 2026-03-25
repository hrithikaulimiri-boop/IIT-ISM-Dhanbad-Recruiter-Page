import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware() {
    // handled by callbacks
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        if (pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/portal-select")) {
          return true;
        }

        if (!token) return false;
        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/jobs/:path*",
    "/applications/:path*",
    "/documents/:path*",
  ],
};
