import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/getDb";

type ProcessStatus = "running" | "stopped" | "warning";

interface ProcessItem {
    id: string;
    name: string;
    host: string;
    cpu: number;
    memory: number;
    diskRead: number;
    diskWrite: number;
    diskReadRate: number;
    diskWriteRate: number;
    status: ProcessStatus;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const search = (searchParams.get("search") || "").toLowerCase();
        const machine = searchParams.get("machine");
        const sortBy = searchParams.get("sortBy") as "cpu" | "memory" | "name" | "diskRead" | "diskWrite" | "diskReadRate" | "diskWriteRate" | null;
        const sortOrder = searchParams.get("sortOrder") as "asc" | "desc" | null;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const hours = parseInt(searchParams.get("hours") || "1"); // Get processes from last hour by default

        const db = await getDb();
        const processLog = db.collection('processLog');

        // Build query to get recent process data
        const timeFilter = new Date();
        timeFilter.setHours(timeFilter.getHours() - hours);
        
        const query: any = {
            timestamp: { $gte: timeFilter }
        };

        // Add machine filter if specified
        if (machine && machine !== "all") {
            query['meta.deviceName'] = machine;
        }

        // Get the most recent process logs
        const recentLogs = await processLog
            .find(query)
            .sort({ timestamp: -1 })
            .limit(10) // Get last 10 process snapshots
            .toArray();

        if (recentLogs.length === 0) {
            return NextResponse.json({
                data: [],
                totalCount: 0,
                page: 1,
                totalPages: 0
            });
        }

        // Get the most recent process data
        const latestLog = recentLogs[0];
        const processes = latestLog.processes || [];

        // Map process data to our interface
        const mappedProcesses: ProcessItem[] = processes.map((proc: any, index: number) => {
            // Clean and validate CPU percentage
            let cpuPercent = proc.cpu_percent || 0;
            
            // Handle edge cases for CPU percentage
            if (cpuPercent > 100) {
                // If CPU is over 100%, it's likely a measurement error or system idle process
                // Cap it at 100% for display purposes
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
            let diskReadRate = 0;
            let diskWriteRate = 0;
            
            if (proc.io_counters && Array.isArray(proc.io_counters) && proc.io_counters.length >= 4) {
                // io_counters array: [read_count, write_count, read_bytes, write_bytes, read_chars, write_chars]
                const currentReadBytes = proc.io_counters[2] || 0;
                const currentWriteBytes = proc.io_counters[3] || 0;
                
                // Convert to GB for cumulative totals
                diskRead = Math.round((currentReadBytes / 1024 / 1024 / 1024) * 100) / 100; // Convert to GB with 2 decimal places
                diskWrite = Math.round((currentWriteBytes / 1024 / 1024 / 1024) * 100) / 100; // Convert to GB with 2 decimal places
                
                // Note: Rate calculation requires previous data which is not available in API route
                // Rates will be 0 for API responses, real-time rates are calculated in WebSocket handler
            }

            // Determine status based on process state
            let processStatus: ProcessStatus = "running";
            if (proc.status === "stopped" || proc.status === "terminated") {
                processStatus = "stopped";
            } else if (cpuPercent > 80 || memoryPercent > 80) {
                processStatus = "warning";
            }

            return {
                id: `${latestLog.meta.deviceName}-${proc.pid || index}`,
                name: proc.name || "Unknown Process",
                host: latestLog.meta.deviceName,
                cpu: Math.round(cpuPercent),
                memory: Math.round(memoryPercent), // Memory usage as percentage
                diskRead: diskRead,
                diskWrite: diskWrite,
                diskReadRate: diskReadRate,
                diskWriteRate: diskWriteRate,
                status: processStatus
            };
        });

        // Apply filters
        let filteredData = mappedProcesses;
        
        // Filter out system processes that aren't useful for monitoring
        filteredData = filteredData.filter(p => {
            const name = p.name.toLowerCase();
            // Filter out system idle process and other system processes that show misleading data
            return !name.includes('system idle process') && 
                   !name.includes('system interrupts') &&
                   !name.includes('dpc');
        });
        
        if (status && status !== "all") {
            filteredData = filteredData.filter(p => p.status === status);
        }
        
        if (search) {
            filteredData = filteredData.filter(p => 
                `${p.name} ${p.host}`.toLowerCase().includes(search)
            );
        }

        // Apply sorting
        if (sortBy) {
            filteredData.sort((a, b) => {
                let aValue: number | string;
                let bValue: number | string;
                
                switch (sortBy) {
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
                    case "diskReadRate":
                        aValue = a.diskReadRate;
                        bValue = b.diskReadRate;
                        break;
                    case "diskWriteRate":
                        aValue = a.diskWriteRate;
                        bValue = b.diskWriteRate;
                        break;
                    case "name":
                        aValue = a.name.toLowerCase();
                        bValue = b.name.toLowerCase();
                        break;
                    default:
                        return 0;
                }
                
                if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
                if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
                return 0;
            });
        }

        // Calculate pagination
        const totalCount = filteredData.length;
        const totalPages = Math.ceil(totalCount / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = filteredData.slice(startIndex, endIndex);

        return NextResponse.json({
            data: paginatedData,
            totalCount,
            page,
            totalPages,
            limit
        });

    } catch (error) {
        console.error('Error fetching processes:', error);
        return NextResponse.json(
            { error: 'Failed to fetch processes' },
            { status: 500 }
        );
    }
}


