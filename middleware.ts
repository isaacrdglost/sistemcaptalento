import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const role = token?.role as
      | "recruiter"
      | "admin"
      | "comercial"
      | undefined;
    const { pathname } = req.nextUrl;

    // /admin/* — só admin
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // /comercial/* — só comercial e admin
    if (pathname.startsWith("/comercial")) {
      if (role !== "comercial" && role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Comercial não acessa rotas operacionais — vai pra /comercial
    if (role === "comercial") {
      const operacional =
        pathname === "/dashboard" ||
        pathname.startsWith("/dashboard/") ||
        pathname.startsWith("/vagas") ||
        pathname.startsWith("/talentos") ||
        pathname.startsWith("/contratacoes");
      if (operacional) {
        return NextResponse.redirect(new URL("/comercial", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/vagas/:path*",
    "/talentos/:path*",
    "/clientes/:path*",
    "/configuracoes/:path*",
    "/admin/:path*",
    "/comercial/:path*",
    "/contratacoes/:path*",
  ],
};
