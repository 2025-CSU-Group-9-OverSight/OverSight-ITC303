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

    const updateRole = (id: string, role: UserRole) => {
        setRows((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
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
                    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
                        <div className="flex gap-2 items-center">
                            <Input placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />
                            <Button>Invite User</Button>
                        </div>
                    </div>

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


