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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { UserRole } from "@/types/types";
import { useToast } from "@/components/providers/ToastProvider";

type UserRow = {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    createdAt: string;
};

export default function UsersPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [rows, setRows] = useState<UserRow[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);
    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        password: "",
        role: UserRole.STANDARD
    });
    const { showToast } = useToast();

    const filtered = useMemo(() => {
        return rows.filter((u) => `${u.email} ${u.name}`.toLowerCase().includes(query.toLowerCase()));
    }, [rows, query]);

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
        if (status === "loading") return;
        if (status === "unauthenticated") router.push("/login");
        if (status === "authenticated" && session?.user?.role !== UserRole.ADMIN) {
            router.push("/dashboard");
        }
    }, [status, session, router]);

    useEffect(() => {
        if (status !== "authenticated") return;
        loadUsers();
    }, [status]);

    if (status === "loading") {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    const roleBadge = (role: UserRole) => {
        return <Badge variant={role === UserRole.ADMIN ? "default" : "secondary"}>{role}</Badge>;
    };

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

    const resetPassword = async (id: string) => {
        try {
            const res = await fetch(`/api/users`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Failed to reset password (${res.status})`);
            }
            
            const data = await res.json();
            showToast({ 
                type: "success", 
                message: `Password reset successfully. New password: ${data.newPassword}` 
            });
        } catch (e: any) {
            const msg = e?.message || "Failed to reset password";
            showToast({ type: "error", message: msg });
        }
    };

    const removeUser = async (id: string) => {
        try {
            const res = await fetch(`/api/users`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Failed to remove user (${res.status})`);
            }
            
            // Remove user from local state
            setRows((prev) => prev.filter((u) => u.id !== id));
            showToast({ type: "success", message: "User removed successfully" });
        } catch (e: any) {
            const msg = e?.message || "Failed to remove user";
            showToast({ type: "error", message: msg });
        }
    };

    const createUser = async () => {
        try {
            const res = await fetch(`/api/users`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newUser)
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || `Failed to create user (${res.status})`);
            }
            
            const createdUser = await res.json();
            
            // Add user to local state
            setRows((prev) => [...prev, createdUser]);
            
            // Reset form and close dialog
            setNewUser({
                name: "",
                email: "",
                password: "",
                role: UserRole.STANDARD
            });
            setIsAddUserOpen(false);
            
            showToast({ type: "success", message: "User created successfully" });
        } catch (e: any) {
            const msg = e?.message || "Failed to create user";
            showToast({ type: "error", message: msg });
        }
    };

    return (
        <DashboardLayout title="Users">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Manage Users</CardTitle>
                        <Sheet open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                            <SheetTrigger asChild>
                                <Button className="cursor-pointer hover:bg-primary/90 transition-colors">
                                    Add User
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="sm:max-w-[500px] p-6">
                                <SheetHeader className="mb-6">
                                    <SheetTitle className="text-xl">Add New User</SheetTitle>
                                    <SheetDescription className="text-sm text-muted-foreground">
                                        Create a new user account. All fields are required.
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="grid gap-6 py-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-sm font-medium">
                                            Name
                                        </Label>
                                        <Input
                                            id="name"
                                            value={newUser.name}
                                            onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full"
                                            placeholder="Enter full name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-sm font-medium">
                                            Email
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                                            className="w-full"
                                            placeholder="Enter email address"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-sm font-medium">
                                            Password
                                        </Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={newUser.password}
                                            onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                                            className="w-full"
                                            placeholder="Enter password"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role" className="text-sm font-medium">
                                            Role
                                        </Label>
                                        <Select 
                                            value={newUser.role} 
                                            onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value as UserRole }))}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                                                <SelectItem value={UserRole.STANDARD}>Standard</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <SheetFooter className="mt-8 pt-6 border-t">
                                    <div className="flex gap-3 w-full">
                                        <Button 
                                            variant="outline" 
                                            onClick={() => setIsAddUserOpen(false)}
                                            className="flex-1 cursor-pointer hover:bg-secondary/80 transition-colors"
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            onClick={createUser}
                                            disabled={!newUser.name || !newUser.email || !newUser.password}
                                            className="flex-1 cursor-pointer hover:bg-primary/90 transition-colors"
                                        >
                                            Create User
                                        </Button>
                                    </div>
                                </SheetFooter>
                            </SheetContent>
                        </Sheet>
                    </div>
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
                                <TableRow key={u.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="font-medium">{u.name}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {roleBadge(u.role)}
                                            <Select value={u.role} onValueChange={(v) => updateRole(u.id, v as UserRole)}>
                                                <SelectTrigger className="w-36 cursor-pointer hover:bg-accent/50 transition-colors">
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
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button 
                                                        variant="secondary" 
                                                        className="cursor-pointer hover:bg-secondary/80 transition-colors"
                                                    >
                                                        Reset Password
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Reset Password</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to reset the password for {u.name} ({u.email})? 
                                                            A new temporary password will be generated and displayed.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="cursor-pointer hover:bg-secondary/80 transition-colors">
                                                            Cancel
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction 
                                                            onClick={() => resetPassword(u.id)}
                                                            className="cursor-pointer hover:bg-primary/90 transition-colors"
                                                        >
                                                            Reset Password
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                            
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button 
                                                        variant="destructive" 
                                                        className="cursor-pointer hover:bg-destructive/90 transition-colors"
                                                    >
                                                        Remove
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Remove User</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to remove {u.name} ({u.email})? 
                                                            This action cannot be undone and will permanently delete the user account.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="cursor-pointer hover:bg-secondary/80 transition-colors">
                                                            Cancel
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction 
                                                            onClick={() => removeUser(u.id)}
                                                            className="cursor-pointer hover:bg-destructive/90 transition-colors"
                                                        >
                                                            Remove User
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
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


