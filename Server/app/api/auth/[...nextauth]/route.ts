import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { TEMPLATE_USERS } from "@/lib/auth";
import getDb from "@/lib/getDb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Authenticate against database only
          const db = await getDb();
          const usersCollection = db.collection("users");
          const user = await usersCollection.findOne({ email: credentials.email });

          if (user && await bcrypt.compare(credentials.password, user.password)) {
            console.log(`User ${credentials.email} authenticated successfully from database`);
            return {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              role: user.role,
              profilePicture: user.profilePicture, // Add this line
            };
          }

          console.log(`Authentication failed for ${credentials.email} - user not found or password incorrect`);
          return null;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.profilePicture = user.profilePicture; // This line is correct
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role;
        session.user.id = token.sub || '';
        session.user.profilePicture = token.profilePicture; // This line is correct
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development-only",
  debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };
