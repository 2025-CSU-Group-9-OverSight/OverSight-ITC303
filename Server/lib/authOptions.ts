import CredentialsProvider from "next-auth/providers/credentials";
import getDb from "@/lib/getDb";
import bcrypt from "bcryptjs";

export const authOptions = {
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
                            profilePicture: user.profilePicture,
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
        async jwt({ token, user }: any) {
            if (user) {
                token.role = user.role;
                token.profilePicture = user.profilePicture;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (token) {
                session.user.role = token.role;
                session.user.id = token.sub || '';
                session.user.profilePicture = token.profilePicture;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt" as const,
        maxAge: 24 * 60 * 60, // 24 hours
    },
    secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development-only",
    debug: process.env.NODE_ENV === "development",
};
