"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/providers/ToastProvider";

export default function AccountPage() {
    const { status, data: session } = useSession();
    const router = useRouter();
    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [currentPassword, setCurrentPassword] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");
    const { showToast } = useToast();

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    const loadAccountData = async () => {
        try {
            setIsLoading(true);
            setMessage("");
            const res = await fetch(`/api/account/me`);
            if (!res.ok) throw new Error(`Failed to load account data (${res.status})`);
            const data = await res.json();
            setName(data.name || "");
            setEmail(data.email || "");
        } catch (e: any) {
            const msg = e?.message || "Failed to load account data";
            setMessage(msg);
            showToast({ type: "error", message: msg });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (status !== "authenticated") return;
        loadAccountData();
    }, [status]);

    const handleSave = async () => {
        try {
            setIsLoading(true);
            setMessage("");
            
            // Validate password fields if changing password
            if (newPassword || currentPassword) {
                if (!currentPassword) {
                    throw new Error("Current password is required to change password");
                }
                if (newPassword !== confirmPassword) {
                    throw new Error("New passwords do not match");
                }
                if (newPassword.length < 8) {
                    throw new Error("New password must be at least 8 characters long");
                }
            }
            
            const updateData: any = { name, email };
            if (newPassword && currentPassword) {
                updateData.currentPassword = currentPassword;
                updateData.newPassword = newPassword;
            }
            
            const res = await fetch(`/api/account/me`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updateData)
            });
            if (!res.ok) throw new Error(`Failed to save account data (${res.status})`);
            setMessage("Account updated successfully");
            showToast({ type: "success", message: "Account updated successfully" });
            
            // Clear password fields after successful update
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (e: any) {
            const msg = e?.message || "Failed to save account data";
            setMessage(msg);
            showToast({ type: "error", message: msg });
        } finally {
            setIsLoading(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <DashboardLayout title="Account Management">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle>Account Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your full name"
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email address"
                                className="w-full"
                            />
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Change Password</h3>
                            <p className="text-sm text-muted-foreground">
                                Leave password fields empty if you don't want to change your password.
                            </p>
                            
                            <div className="space-y-2">
                                <Label htmlFor="currentPassword">Current Password</Label>
                                <Input
                                    id="currentPassword"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter your current password"
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter your new password"
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your new password"
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <Separator />

                        <div className="flex items-center gap-3">
                            <Button onClick={handleSave} disabled={isLoading}>
                                {isLoading ? "Saving..." : "Save Changes"}
                            </Button>
                            {message && (
                                <span className={`text-sm ${message.includes("successfully") ? "text-green-600" : "text-red-600"}`}>
                                    {message}
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}


