"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@/types/types";
import { useToast } from "@/components/providers/ToastProvider";

type UserRow = {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    createdAt: string;
};

const initialUsers: UserRow[] = [
    { id: "u1", email: "admin@gmail.com", name: "Admin User", role: UserRole.ADMIN, createdAt: "2024-01-02" },
    { id: "u2", email: "standard@gmail.com", name: "Standard User", role: UserRole.STANDARD, createdAt: "2024-02-10" },
];

export default function UsersPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [rows, setRows] = useState<UserRow[]>(initialUsers);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const { showToast } = useToast();

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") router.push("/login");
        if (status === "authenticated" && session?.user?.role !== UserRole.ADMIN) {
            router.push("/dashboard");
        }
    }, [status, session, router]);

    if (status === "loading") {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    const filtered = useMemo(() => {
        return rows.filter((u) => `${u.email} ${u.name}`.toLowerCase().includes(query.toLowerCase()));
    }, [rows, query]);

    const roleBadge = (role: UserRole) => {
        return <Badge variant={role === UserRole.ADMIN ? "default" : "secondary"}>{role}</Badge>;
    };

    const loadUsers = async () => {
        try {
            setIsLoading(true);
            setError("");
            const res = await fetch(`/api/users`);
            if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
            const data: UserRow[] = await res.json();
            setRows(data);
        } catch (e: any) {
            const msg = e?.message || "Failed to load users";
            setError(msg);
            showToast({ type: "error", message: msg });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (status !== "authenticated") return;
        loadUsers();
    }, [status]);

    const updateRole = async (id: string, role: UserRole) => {
        const previous = rows;
        setRows((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
        try {
            const res = await fetch(`/api/users`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, role })
            });
            if (!res.ok) throw new Error(`Failed to update role (${res.status})`);
            showToast({ type: "success", message: "Role updated" });
        } catch (e) {
            setRows(previous);
            showToast({ type: "error", message: "Failed to update role" });
        }
    };

    const resetPassword = (id: string) => {
        // Placeholder: Call API to send reset or force-change
        // toast.success("Password reset link sent");
        void id;
    };

    const removeUser = (id: string) => {
        setRows((prev) => prev.filter((u) => u.id !== id));
    };

    return (
        <DashboardLayout title="Users">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Users</CardTitle>
                </CardHeader>
                <CardContent>

                    {isLoading && <p className="text-sm text-muted-foreground mb-2">Loading...</p>}
                    {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell className="font-medium">{u.name}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {roleBadge(u.role)}
                                            <Select value={u.role} onValueChange={(v) => updateRole(u.id, v as UserRole)}>
                                                <SelectTrigger className="w-36">
                                                    <SelectValue placeholder="Role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                                                    <SelectItem value={UserRole.STANDARD}>Standard</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TableCell>
                                    <TableCell>{u.createdAt}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="secondary" onClick={() => resetPassword(u.id)}>Reset Password</Button>
                                            <Button variant="destructive" onClick={() => removeUser(u.id)}>Remove</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}


