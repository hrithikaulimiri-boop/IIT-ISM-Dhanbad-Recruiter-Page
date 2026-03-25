declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: number;
      name: string;
      email: string;
      role: "admin" | "recruiter";
      companyId?: number;
      portalType?: "INF" | "JNF";
    };
  }

  interface User {
    id: number;
    name: string;
    email: string;
    role: "admin" | "recruiter";
    companyId?: number;
    portalType?: "INF" | "JNF";
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    user?: {
      id: number;
      name: string;
      email: string;
      role: "admin" | "recruiter";
      companyId?: number;
      portalType?: "INF" | "JNF";
    };
  }
}
