import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import getDb from "@/lib/getDb";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { TEMPLATE_USERS } from "@/lib/auth";

// Create auth options for server-side usage
const authOptions = {
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
                        return {
                            id: user._id.toString(),
                            name: user.name,
                            email: user.email,
                            role: user.role,
                        };
                    }

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
            }
            return token;
        },
        async session({ session, token }: any) {
            if (token) {
                session.user.role = token.role;
                session.user.id = token.sub || '';
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

// GET /api/account/me - Get current user's account information
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const db = await getDb();
        const usersCollection = db.collection("users");
        
        const user = await usersCollection.findOne(
            { email: session.user.email },
            { projection: { password: 0 } } // Exclude password from response
        );

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            id: user._id,
            name: user.name || "",
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        });

    } catch (error) {
        console.error("Error fetching user account:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PUT /api/account/me - Update current user's account information
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, email, currentPassword, newPassword } = body;

        // Debug logging (can be removed in production)
        console.log("PUT /api/account/me - Request body:", { name, email, hasCurrentPassword: !!currentPassword, hasNewPassword: !!newPassword });

        // Validate input - check for meaningful updates
        const hasNameUpdate = name !== undefined && name.trim() !== "";
        const hasEmailUpdate = email !== undefined && email.trim() !== "";
        const hasPasswordUpdate = newPassword !== undefined && newPassword.trim() !== "";

        if (!hasNameUpdate && !hasEmailUpdate && !hasPasswordUpdate) {
            console.log("PUT /api/account/me - No valid fields provided for update");
            return NextResponse.json(
                { error: "At least one field must be provided for update" },
                { status: 400 }
            );
        }

        const db = await getDb();
        const usersCollection = db.collection("users");
        
        // Get current user data
        const currentUser = await usersCollection.findOne({ email: session.user.email });
        
        if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Debug: Log user info (can be removed in production)
        console.log("PUT /api/account/me - Current user from DB:", {
            id: currentUser._id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            hasPassword: !!currentUser.password
        });

        // If changing password, validate current password
        if (hasPasswordUpdate) {
            if (!currentPassword) {
                console.log("PUT /api/account/me - Current password required for password change");
                return NextResponse.json(
                    { error: "Current password is required to change password" },
                    { status: 400 }
                );
            }

            // Verify current password
            console.log("PUT /api/account/me - Comparing passwords:", {
                providedPassword: currentPassword,
                storedPasswordHash: currentUser.password.substring(0, 20) + "...",
                passwordLength: currentUser.password.length
            });
            
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
            console.log("PUT /api/account/me - Password comparison result:", isCurrentPasswordValid);
            
            if (!isCurrentPasswordValid) {
                console.log("PUT /api/account/me - Current password is incorrect");
                return NextResponse.json(
                    { error: "Current password is incorrect" },
                    { status: 400 }
                );
            }

            // Validate new password
            if (newPassword.length < 8) {
                console.log("PUT /api/account/me - New password too short");
                return NextResponse.json(
                    { error: "New password must be at least 8 characters long" },
                    { status: 400 }
                );
            }
        }

        // If changing email, check if it's already taken
        if (hasEmailUpdate && email !== session.user.email) {
            const existingUser = await usersCollection.findOne({ email });
            if (existingUser) {
                console.log("PUT /api/account/me - Email already taken");
                return NextResponse.json(
                    { error: "Email is already taken" },
                    { status: 400 }
                );
            }
        }

        // Prepare update data
        const updateData: any = {
            updatedAt: new Date()
        };

        if (hasNameUpdate) updateData.name = name;
        if (hasEmailUpdate) updateData.email = email;
        if (hasPasswordUpdate) {
            updateData.password = await bcrypt.hash(newPassword, 12);
        }

        // Update user
        const result = await usersCollection.updateOne(
            { email: session.user.email },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Return updated user data (excluding password)
        const updatedUser = await usersCollection.findOne(
            { email: hasEmailUpdate ? email : session.user.email },
            { projection: { password: 0 } }
        );

        if (!updatedUser) {
            return NextResponse.json({ error: "Failed to retrieve updated user" }, { status: 500 });
        }

        return NextResponse.json({
            id: updatedUser._id,
            name: updatedUser.name || "",
            email: updatedUser.email,
            role: updatedUser.role,
            createdAt: updatedUser.createdAt,
            updatedAt: updatedUser.updatedAt
        });

    } catch (error) {
        console.error("Error updating user account:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
