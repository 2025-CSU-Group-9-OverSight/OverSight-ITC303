"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/providers/ToastProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Camera, X } from "lucide-react";

export default function AccountPage() {
    const { status, data: session } = useSession();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [profilePicture, setProfilePicture] = useState<string>("");
    const [currentPassword, setCurrentPassword] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);
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
            setProfilePicture(data.profilePicture || "");
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

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append("profilePicture", file);

            const res = await fetch("/api/account/me", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to upload profile picture");
            }

            const data = await res.json();
            setProfilePicture(data.profilePictureUrl);
            showToast({ type: "success", message: "Profile picture uploaded successfully" });
        } catch (e: any) {
            const msg = e?.message || "Failed to upload profile picture";
            showToast({ type: "error", message: msg });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveProfilePicture = async () => {
        try {
            setIsUploading(true);
            const res = await fetch("/api/account/me", {
                method: "DELETE",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to remove profile picture");
            }

            setProfilePicture("");
            showToast({ type: "success", message: "Profile picture removed successfully" });
        } catch (e: any) {
            const msg = e?.message || "Failed to remove profile picture";
            showToast({ type: "error", message: msg });
        } finally {
            setIsUploading(false);
        }
    };

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
                        {/* Profile Picture Section */}
                        <div className="space-y-4">
                            <Label>Profile Picture</Label>
                            <div className="flex items-center space-x-4">
                                <Avatar className="w-20 h-20">
                                    <AvatarImage src={profilePicture} alt="Profile" />
                                    <AvatarFallback>
                                        <User className="w-8 h-8" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <div className="flex space-x-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                        >
                                            <Camera className="w-4 h-4 mr-2" />
                                            {isUploading ? "Uploading..." : "Upload"}
                                        </Button>
                                        {profilePicture && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleRemoveProfilePicture}
                                                disabled={isUploading}
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        JPG, PNG, GIF, or WebP. Max 5MB.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Separator />

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


