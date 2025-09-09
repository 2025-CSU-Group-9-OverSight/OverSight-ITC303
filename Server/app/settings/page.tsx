"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/providers/ToastProvider";

export default function SettingsPage() {
    const { status } = useSession();
    const router = useRouter();
    const [theme, setTheme] = useState<string>("light");
    const [density, setDensity] = useState<string>("comfortable");
    const [timeFormat, setTimeFormat] = useState<string>("24h");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>("");
    const { showToast } = useToast();

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    const loadSettings = async () => {
        try {
            setIsLoading(true);
            setMessage("");
            const res = await fetch(`/api/settings/me`);
            if (!res.ok) throw new Error(`Failed to load settings (${res.status})`);
            const data = await res.json();
            setTheme(data.theme || "light");
            setDensity(data.density || "comfortable");
            setTimeFormat(data.timeFormat || "24h");
        } catch (e: any) {
            const msg = e?.message || "Failed to load settings";
            setMessage(msg);
            showToast({ type: "error", message: msg });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (status !== "authenticated") return;
        loadSettings();
    }, [status]);

    const handleSave = async () => {
        try {
            setIsLoading(true);
            setMessage("");
            const res = await fetch(`/api/settings/me`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ theme, density, timeFormat })
            });
            if (!res.ok) throw new Error(`Failed to save settings (${res.status})`);
            setMessage("Saved");
            showToast({ type: "success", message: "Settings saved" });
        } catch (e: any) {
            const msg = e?.message || "Failed to save settings";
            setMessage(msg);
            showToast({ type: "error", message: msg });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout title="Settings">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Theme</Label>
                            <Select value={theme} onValueChange={setTheme}>
                                <SelectTrigger className="w-56">
                                    <SelectValue placeholder="Select theme" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="system">System</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Density</Label>
                            <Select value={density} onValueChange={setDensity}>
                                <SelectTrigger className="w-56">
                                    <SelectValue placeholder="Select density" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="compact">Compact</SelectItem>
                                    <SelectItem value="comfortable">Comfortable</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Preferences</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Time Format</Label>
                            <Select value={timeFormat} onValueChange={setTimeFormat}>
                                <SelectTrigger className="w-56">
                                    <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="12h">12-hour</SelectItem>
                                    <SelectItem value="24h">24-hour</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Separator />
                        <div className="flex items-center gap-3">
                            <Button onClick={handleSave} disabled={isLoading}>Save changes</Button>
                            {isLoading && <span className="text-sm text-muted-foreground">Saving...</span>}
                            {message && <span className="text-sm text-muted-foreground">{message}</span>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}


