"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Cpu, HardDrive, MemoryStick, RefreshCw } from "lucide-react";

type VmRecord = {
    id: string;
    name: string;
    host: string;
    cpu: number;     // percentage 0-100
    memory: number;  // percentage 0-100
    disk: number;    // percentage 0-100
};

const initialVms: VmRecord[] = [
    { id: "vm-1", name: "vm-app-01", host: "esx-01", cpu: 42, memory: 63, disk: 55 },
    { id: "vm-2", name: "vm-db-01", host: "esx-02", cpu: 68, memory: 71, disk: 80 },
    { id: "vm-3", name: "vm-cache-01", host: "esx-01", cpu: 22, memory: 34, disk: 28 },
    { id: "vm-4", name: "vm-api-02", host: "esx-03", cpu: 57, memory: 48, disk: 61 },
];

export default function ReportsPage() {
    const { status } = useSession();
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [timeRange, setTimeRange] = useState("24");
    const [rows, setRows] = useState<VmRecord[]>(initialVms);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

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

    const filtered = useMemo(() => {
        return rows.filter((v) => `${v.name} ${v.host}`.toLowerCase().includes(query.toLowerCase()));
    }, [rows, query]);

    const avg = (key: keyof VmRecord) => {
        const nums = rows.map((r) => (typeof r[key] === "number" ? (r[key] as number) : 0));
        return Math.round(nums.reduce((a, b) => a + b, 0) / Math.max(1, nums.length));
    };

    const refreshData = async () => {
        try {
            setIsLoading(true);
            setError("");
            const params = new URLSearchParams();
            if (query) params.set("search", query);
            const res = await fetch(`/api/vms?${params.toString()}`);
            if (!res.ok) throw new Error(`Failed to load VMs (${res.status})`);
            const data: { id: string; name: string; host: string; cpu: number; memory: number; disk: number; }[] = await res.json();
            setRows(data);
        } catch (e: any) {
            setError(e?.message || "Failed to load VMs");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        const load = async () => {
            try {
                setIsLoading(true);
                setError("");
                const params = new URLSearchParams();
                if (query) params.set("search", query);
                const res = await fetch(`/api/vms?${params.toString()}`, { signal: controller.signal });
                if (!res.ok) throw new Error(`Failed to load VMs (${res.status})`);
                const data = await res.json();
                setRows(data);
            } catch (e: any) {
                if (e?.name !== "AbortError") setError(e?.message || "Failed to load VMs");
            } finally {
                setIsLoading(false);
            }
        };
        load();
        return () => controller.abort();
    }, [query]);

    return (
        <DashboardLayout title="Reports">
            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="all">All VMs</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
                        <div className="flex gap-2 items-center">
                            <Select value={timeRange} onValueChange={setTimeRange}>
                                <SelectTrigger className="w-44">
                                    <SelectValue placeholder="Time Range" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="24">Last 24 Hrs</SelectItem>
                                    <SelectItem value="7">Last 7 Days</SelectItem>
                                    <SelectItem value="30">Last 30 Days</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="secondary" onClick={refreshData}>
                                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5 text-blue-600" /> Avg CPU</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-gray-900">{avg("cpu")}%</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><MemoryStick className="h-5 w-5 text-violet-600" /> Avg Memory</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-gray-900">{avg("memory")}%</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5 text-green-600" /> Avg Disk</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-gray-900">{avg("disk")}%</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="all">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Virtual Machines</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
                                <div className="flex gap-2 items-center">
                                    <Input placeholder="Search VM or host" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />
                                    <Select value={timeRange} onValueChange={setTimeRange}>
                                        <SelectTrigger className="w-44">
                                            <SelectValue placeholder="Time Range" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="24">Last 24 Hrs</SelectItem>
                                            <SelectItem value="7">Last 7 Days</SelectItem>
                                            <SelectItem value="30">Last 30 Days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {isLoading && <p className="text-sm text-muted-foreground mb-2">Loading...</p>}
                            {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>VM</TableHead>
                                        <TableHead>Host</TableHead>
                                        <TableHead>CPU %</TableHead>
                                        <TableHead>Memory %</TableHead>
                                        <TableHead>Disk %</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((v) => (
                                        <TableRow key={v.id}>
                                            <TableCell className="font-medium">{v.name}</TableCell>
                                            <TableCell>{v.host}</TableCell>
                                            <TableCell>{v.cpu}</TableCell>
                                            <TableCell>{v.memory}</TableCell>
                                            <TableCell>{v.disk}</TableCell>
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


