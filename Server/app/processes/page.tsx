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
import { Activity, Play, Square, RefreshCw } from "lucide-react";

type ProcessStatus = "running" | "stopped" | "warning";

interface ProcessItem {
    id: string;
    name: string;
    host: string;
    cpu: number;
    memory: number;
    status: ProcessStatus;
}

const initialProcesses: ProcessItem[] = [
    { id: "1", name: "Collector Service", host: "srv-01", cpu: 14, memory: 512, status: "running" },
    { id: "2", name: "Ingest Worker", host: "srv-02", cpu: 32, memory: 1024, status: "warning" },
    { id: "3", name: "Report Generator", host: "srv-03", cpu: 4, memory: 256, status: "stopped" },
    { id: "4", name: "Metrics API", host: "srv-01", cpu: 18, memory: 768, status: "running" },
];

export default function ProcessesPage() {
    const { status } = useSession();
    const router = useRouter();

    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [rows, setRows] = useState<ProcessItem[]>(initialProcesses);

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

    const handleStart = (id: string) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "running" } : r)));
    };
    const handleStop = (id: string) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "stopped" } : r)));
    };
    const handleRestart = (id: string) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "running" } : r)));
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
                                        <TableHead className="text-right">Actions</TableHead>
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
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="secondary" onClick={() => handleRestart(p.id)}>
                                                        <RefreshCw className="h-4 w-4 mr-1" /> Restart
                                                    </Button>
                                                    {p.status !== "running" ? (
                                                        <Button size="sm" onClick={() => handleStart(p.id)}>
                                                            <Play className="h-4 w-4 mr-1" /> Start
                                                        </Button>
                                                    ) : (
                                                        <Button size="sm" variant="destructive" onClick={() => handleStop(p.id)}>
                                                            <Square className="h-4 w-4 mr-1" /> Stop
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
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


