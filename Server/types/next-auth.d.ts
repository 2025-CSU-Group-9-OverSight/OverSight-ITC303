import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string;
      email: string;
      role: "admin" | "standard";
      profilePicture?: string;
    };
  }

  interface User {
    id: string;
    name?: string;
    email: string;
    role: "admin" | "standard";
    profilePicture?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "admin" | "standard";
    profilePicture?: string;
  }
}
