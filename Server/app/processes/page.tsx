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
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

type ProcessStatus = "running" | "stopped" | "warning";

interface ProcessItem {
    id: string;
    name: string;
    host: string;
    cpu: number;
    memory: number;
    diskRead: number;
    diskWrite: number;
    status: ProcessStatus;
}

const initialProcesses: ProcessItem[] = [];

export default function ProcessesPage() {
    const { status } = useSession();
    const router = useRouter();

    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [machineFilter, setMachineFilter] = useState<string>("all");
    const [machines, setMachines] = useState<string[]>([]);
    const [allProcesses, setAllProcesses] = useState<ProcessItem[]>([]);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [dataAge, setDataAge] = useState<number>(0);
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
    const [sortField, setSortField] = useState<"cpu" | "memory" | "name" | "diskRead" | "diskWrite" | null>(null);
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [previousProcessData, setPreviousProcessData] = useState<Map<string, {readBytes: number, writeBytes: number, timestamp: number}>>(new Map());
    const { showToast } = useToast();

    const itemsPerPage = 50;

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    // Fetch available machines
    useEffect(() => {
        const fetchMachines = async () => {
            try {
                const res = await fetch('/api/machines');
                if (!res.ok) throw new Error('Failed to fetch machines');
                const data = await res.json();
                setMachines(data.machines || []);
            } catch (e) {
                console.error('Error fetching machines:', e);
            }
        };
        fetchMachines();
    }, []);

    // WebSocket connection for live process data
    useEffect(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws/liveview`;
        
        let ws: WebSocket;
        
        try {
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('Processes WebSocket connected');
                setIsConnected(true);
                setConnectionError(null);
                
                if (machineFilter === "all") {
                    // Subscribe to all available machines
                    machines.forEach(machine => {
                        ws.send(JSON.stringify({
                            type: 'subscribe',
                            deviceName: machine
                        }));
                    });
                } else {
                    // Subscribe to the selected machine
                    ws.send(JSON.stringify({
                        type: 'subscribe',
                        deviceName: machineFilter
                    }));
                }
            };

            ws.onmessage = (event) => {
                console.log('WebSocket message received:', {
                    type: typeof event.data,
                    data: event.data,
                    isString: typeof event.data === 'string',
                    isObject: typeof event.data === 'object'
                });

                try {
                    // Skip non-JSON messages like "Connected" or "Received JSON..."
                    if (typeof event.data === 'string' && 
                        (event.data.startsWith('Connected') || 
                         event.data.startsWith('Received JSON') ||
                         event.data === 'Connected')) {
                        console.log('Skipping non-JSON message:', event.data);
                        return;
                    }

                    let data;
                    
                    // Handle different data types
                    if (typeof event.data === 'string') {
                        console.log('Parsing JSON string:', event.data);
                        data = JSON.parse(event.data);
                    } else if (typeof event.data === 'object') {
                        console.log('Using object directly:', event.data);
                        data = event.data;
                    } else {
                        console.log('Unexpected data type:', typeof event.data, event.data);
                        return;
                    }
                    
                    console.log('Processed data:', data);
                    
                    // Check if this is process data
                    if (data && data.processes && Array.isArray(data.processes) && data.device) {
                        console.log('✅ Valid process data received:', {
                            processCount: data.processes.length,
                            deviceName: data.device.deviceName,
                            sampleProcess: data.processes[0]
                        });
                        
                        // Map process data to our interface
                        const mappedProcesses: ProcessItem[] = data.processes.map((proc: any, index: number) => {
                            // Clean and validate CPU percentage
                            let cpuPercent = proc.cpu_percent || 0;
                            if (cpuPercent > 100) {
                                cpuPercent = Math.min(cpuPercent, 100);
                            }
                            
                            // Clean and validate memory percentage
                            let memoryPercent = proc.memory_percent || 0;
                            if (memoryPercent > 100) {
                                memoryPercent = Math.min(memoryPercent, 100);
                            }

                            // Extract disk I/O data from io_counters
                            let diskRead = 0;
                            let diskWrite = 0;
                            
                            if (proc.io_counters && Array.isArray(proc.io_counters) && proc.io_counters.length >= 4) {
                                // io_counters array: [read_count, write_count, read_bytes, write_bytes, read_chars, write_chars]
                                const currentReadBytes = proc.io_counters[2] || 0;
                                const currentWriteBytes = proc.io_counters[3] || 0;
                                
                                // Convert to GB for cumulative totals
                                diskRead = Math.round((currentReadBytes / 1024 / 1024 / 1024) * 100) / 100; // Convert to GB with 2 decimal places
                                diskWrite = Math.round((currentWriteBytes / 1024 / 1024 / 1024) * 100) / 100; // Convert to GB with 2 decimal places
                                }

                            // Determine status based on process state
                            let processStatus: ProcessStatus = "running";
                            if (proc.status === "stopped" || proc.status === "terminated") {
                                processStatus = "stopped";
                            } else if (cpuPercent > 80 || memoryPercent > 80) {
                                processStatus = "warning";
                            }

                            return {
                                id: `${data.device.deviceName}-${proc.pid || index}`,
                                name: proc.name || "Unknown Process",
                                host: data.device.deviceName,
                                cpu: Math.round(cpuPercent),
                                memory: Math.round(memoryPercent),
                                diskRead: diskRead,
                                diskWrite: diskWrite,
                                status: processStatus
                            };
                        });

                        // Filter out system processes
                        const filteredProcesses = mappedProcesses.filter(p => {
                            const name = p.name.toLowerCase();
                            return !name.includes('system idle process') && 
                                   !name.includes('system interrupts') &&
                                   !name.includes('dpc');
                        });

                        console.log('✅ Setting processes:', {
                            total: mappedProcesses.length,
                            filtered: filteredProcesses.length,
                            sample: filteredProcesses[0]
                        });
                        
                        // Update processes - accumulate from multiple machines or replace for single machine
                        setAllProcesses(prevProcesses => {
                            if (machineFilter === "all") {
                                // For "all machines", accumulate processes from different machines
                                // Remove old processes from this machine and add new ones
                                const otherMachineProcesses = prevProcesses.filter(p => p.host !== data.device.deviceName);
                                return [...otherMachineProcesses, ...filteredProcesses];
                            } else {
                                // For single machine, replace all processes
                                return filteredProcesses;
                            }
                        });
                        
                        // Update data age tracking
                        const now = new Date();
                        setLastUpdateTime(now);
                        setDataAge(0);
                    } else {
                        console.log('❌ Not process data:', {
                            hasProcesses: !!(data && data.processes),
                            isArray: Array.isArray(data?.processes),
                            hasDevice: !!(data && data.device),
                            dataKeys: data ? Object.keys(data) : 'no data'
                        });
                    }
                } catch (error) {
                    console.error('❌ Error parsing WebSocket process data:', error, 'Data:', event.data);
                }
            };

            ws.onclose = () => {
                console.log('Processes WebSocket disconnected');
                setIsConnected(false);
                setConnectionError('Connection lost');
            };

            ws.onerror = (error) => {
                console.error('Processes WebSocket error:', error);
                setConnectionError('Connection error');
                setIsConnected(false);
            };

        } catch (error) {
            console.error('Failed to create processes WebSocket connection:', error);
            setConnectionError('Failed to connect');
        }

        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, [machineFilter, machines]);

    // Clear process list when machine filter changes
    useEffect(() => {
        setAllProcesses([]);
        setPreviousProcessData(new Map());
    }, [machineFilter]);

    // Update data age every second
    useEffect(() => {
        if (!lastUpdateTime) return;

        const interval = setInterval(() => {
            const now = new Date();
            const ageInSeconds = Math.floor((now.getTime() - lastUpdateTime.getTime()) / 1000);
            setDataAge(ageInSeconds);
        }, 1000);

        return () => clearInterval(interval);
    }, [lastUpdateTime]);

    // Handle sorting
    const handleSort = (field: "cpu" | "memory" | "name" | "diskRead" | "diskWrite") => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("desc");
        }
        setCurrentPage(1); // Reset to first page when sorting changes
    };

    // Handle page change
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // Client-side filtering, sorting, and pagination
    const filteredAndSortedProcesses = useMemo(() => {
        let filtered = allProcesses;

        // Apply machine filter
        if (machineFilter !== "all") {
            filtered = filtered.filter(p => p.host === machineFilter);
        }

        // Apply status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(p => p.status === statusFilter);
        }

        // Apply search filter
        if (query) {
            filtered = filtered.filter(p => 
                `${p.name} ${p.host}`.toLowerCase().includes(query.toLowerCase())
            );
        }

        // Apply sorting
        if (sortField) {
            filtered = [...filtered].sort((a, b) => {
                let aValue: number | string;
                let bValue: number | string;
                
                switch (sortField) {
                    case "cpu":
                        aValue = a.cpu;
                        bValue = b.cpu;
                        break;
                    case "memory":
                        aValue = a.memory;
                        bValue = b.memory;
                        break;
                    case "diskRead":
                        aValue = a.diskRead;
                        bValue = b.diskRead;
                        break;
                    case "diskWrite":
                        aValue = a.diskWrite;
                        bValue = b.diskWrite;
                        break;
                    case "name":
                        aValue = a.name.toLowerCase();
                        bValue = b.name.toLowerCase();
                        break;
                    default:
                        return 0;
                }
                
                if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
                if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [allProcesses, statusFilter, query, sortField, sortDirection]);

    // Pagination
    const totalCount = filteredAndSortedProcesses.length;
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProcesses = filteredAndSortedProcesses.slice(startIndex, endIndex);

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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-green-600" /> Running</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-gray-900">{allProcesses.filter(r => r.status === "running").length}</p>
                                {lastUpdateTime && (
                                    <p className={`text-xs mt-1 ${dataAge > 60 ? "text-red-500" : "text-gray-500"}`}>
                                        {dataAge > 60 ? "No recent data" : `Updated ${dataAge}s ago`}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-amber-600" /> Warning</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-gray-900">{allProcesses.filter(r => r.status === "warning").length}</p>
                                {lastUpdateTime && (
                                    <p className={`text-xs mt-1 ${dataAge > 60 ? "text-red-500" : "text-gray-500"}`}>
                                        {dataAge > 60 ? "No recent data" : `Updated ${dataAge}s ago`}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-red-600" /> Stopped</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold text-gray-900">{allProcesses.filter(r => r.status === "stopped").length}</p>
                                {lastUpdateTime && (
                                    <p className={`text-xs mt-1 ${dataAge > 60 ? "text-red-500" : "text-gray-500"}`}>
                                        {dataAge > 60 ? "No recent data" : `Updated ${dataAge}s ago`}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    <Card className="mt-4">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Processes</CardTitle>
                                <div className="flex items-center gap-2">
                                    {isConnected ? (
                                        <>
                                            {dataAge > 60 ? (
                                                <Badge variant="outline" className="text-red-600">
                                                    No Data
                                                </Badge>
                                            ) : (
                                                <Badge variant="default" className="bg-green-600">
                                                    Live
                                                </Badge>
                                            )}
                                            {lastUpdateTime && (
                                                <Badge 
                                                    variant="outline" 
                                                    className={dataAge > 60 ? "text-red-600" : dataAge > 10 ? "text-amber-600" : "text-green-600"}
                                                >
                                                    {dataAge}s old
                                                </Badge>
                                            )}
                                        </>
                                    ) : (
                                        <Badge variant="outline" className="text-red-600">
                                            {connectionError || "Disconnected"}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
                                <div className="flex gap-2 items-center">
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
                                    <Select value={machineFilter} onValueChange={setMachineFilter}>
                                        <SelectTrigger className="w-48">
                                            <SelectValue placeholder="Machine" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Machines</SelectItem>
                                            {machines.map((machine) => (
                                                <SelectItem key={machine} value={machine}>
                                                    {machine}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-gray-50"
                                            onClick={() => handleSort("name")}
                                        >
                                            <div className="flex items-center gap-2">
                                                Name
                                                {sortField === "name" ? (
                                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                                ) : (
                                                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead>Host</TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-gray-50"
                                            onClick={() => handleSort("cpu")}
                                        >
                                            <div className="flex items-center gap-2">
                                                CPU
                                                {sortField === "cpu" ? (
                                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                                ) : (
                                                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-gray-50"
                                            onClick={() => handleSort("memory")}
                                        >
                                            <div className="flex items-center gap-2">
                                                Memory (%)
                                                {sortField === "memory" ? (
                                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                                ) : (
                                                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                                                )}
                                            </div>
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-gray-50"
                                            onClick={() => handleSort("diskRead")}
                                        >
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center gap-2">
                                                        Disk Read (GB)
                                                        {sortField === "diskRead" ? (
                                                            sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                                        ) : (
                                                            <ArrowUpDown className="h-4 w-4 opacity-50" />
                                                        )}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Cumulative total disk read since process started</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableHead>
                                        <TableHead 
                                            className="cursor-pointer hover:bg-gray-50"
                                            onClick={() => handleSort("diskWrite")}
                                        >
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex items-center gap-2">
                                                        Disk Write (GB)
                                                        {sortField === "diskWrite" ? (
                                                            sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                                        ) : (
                                                            <ArrowUpDown className="h-4 w-4 opacity-50" />
                                                        )}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Cumulative total disk write since process started</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableHead>


                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedProcesses.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{p.name}</TableCell>
                                            <TableCell>{p.host}</TableCell>
                                            <TableCell>{p.cpu}%</TableCell>
                                            <TableCell>{p.memory}%</TableCell>
                                            <TableCell>{p.diskRead} GB</TableCell>
                                            <TableCell>{p.diskWrite} GB</TableCell>

                                            <TableCell>{statusBadge(p.status)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            
                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-sm text-gray-700">
                                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} processes
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                        >
                                            Previous
                                        </Button>
                                        
                                        {/* Page numbers */}
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentPage - 2 + i;
                                                }
                                                
                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={currentPage === pageNum ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => handlePageChange(pageNum)}
                                                        className="w-8 h-8 p-0"
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
        </DashboardLayout>
    );
}


