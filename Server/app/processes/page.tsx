"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

type ProcessStatus = "running" | "stopped" | "warning";

interface ProcessItem {
    id: string;
    name: string;
    host: string;
    cpu: number;
    memory: number;
    status: ProcessStatus;
}

const initialProcesses: ProcessItem[] = [];

export default function ProcessesPage() {
    const { status } = useSession();
    const router = useRouter();

    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [rows, setRows] = useState<ProcessItem[]>(initialProcesses);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const { showToast } = useToast();

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    const filtered = useMemo(() => {
        return rows.filter((p) => {
            const matchesQuery = `${p.name} ${p.host}`.toLowerCase().includes(query.toLowerCase());
            const matchesStatus = statusFilter === "all" ? true : p.status === statusFilter;
            return matchesQuery && matchesStatus;
        });
    }, [rows, query, statusFilter]);

    useEffect(() => {
        // fetch processes from mock API when filters change
        const controller = new AbortController();
        const run = async () => {
            setIsLoading(true);
            setError("");
            try {
                const params = new URLSearchParams();
                if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
                if (query) params.set("search", query);
                const res = await fetch(`/api/processes?${params.toString()}`, { signal: controller.signal });
                if (!res.ok) throw new Error(`Failed to load processes (${res.status})`);
                const data: { id: string; name: string; host: string; cpuPct?: number; cpu?: number; memoryMb?: number; memory?: number; status: ProcessStatus; }[] = await res.json();
                const mapped: ProcessItem[] = data.map(d => ({
                    id: d.id,
                    name: d.name,
                    host: d.host,
                    cpu: typeof d.cpuPct === "number" ? d.cpuPct : (typeof d.cpu === "number" ? d.cpu : 0),
                    memory: typeof d.memoryMb === "number" ? d.memoryMb : (typeof d.memory === "number" ? d.memory : 0),
                    status: d.status,
                }));
                setRows(mapped);
            } catch (e: any) {
                if (e?.name !== "AbortError") {
                    const msg = e?.message || "Failed to load processes";
                    setError(msg);
                    showToast({ type: "error", message: msg });
                }
            } finally {
                setIsLoading(false);
            }
        };
        run();
        return () => controller.abort();
    }, [query, statusFilter]);

    if (status === "loading") {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    const statusBadge = (s: ProcessStatus) => {
        const variant = s === "running" ? "default" : s === "warning" ? "secondary" : "outline";
        const label = s === "running" ? "Running" : s === "warning" ? "Warning" : "Stopped";
        return <Badge variant={variant}>{label}</Badge>;
    };

    return (
        <DashboardLayout title="Processes">
            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="all">All Processes</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-green-600" /> Running</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-gray-900">{rows.filter(r => r.status === "running").length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-amber-600" /> Warning</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-gray-900">{rows.filter(r => r.status === "warning").length}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-red-600" /> Stopped</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-gray-900">{rows.filter(r => r.status === "stopped").length}</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="all">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Processes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
                                <div className="flex gap-2 items-center">
                                    <Input placeholder="Search name or host" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="running">Running</SelectItem>
                                            <SelectItem value="warning">Warning</SelectItem>
                                            <SelectItem value="stopped">Stopped</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Host</TableHead>
                                        <TableHead>CPU</TableHead>
                                        <TableHead>Memory (MB)</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{p.name}</TableCell>
                                            <TableCell>{p.host}</TableCell>
                                            <TableCell>{p.cpu}%</TableCell>
                                            <TableCell>{p.memory}</TableCell>
                                            <TableCell>{statusBadge(p.status)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </DashboardLayout>
    );
}


