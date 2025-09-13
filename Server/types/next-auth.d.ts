import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string;
      email: string;
      role: "admin" | "standard";
    };
  }

  interface User {
    id: string;
    name?: string;
    email: string;
    role: "admin" | "standard";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "admin" | "standard";
  }
}
