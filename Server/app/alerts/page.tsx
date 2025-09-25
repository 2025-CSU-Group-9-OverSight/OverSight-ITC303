"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertType, AlertSeverity, AlertStatus } from "@/types/types";
import { 
    AlertTriangle, 
    AlertCircle, 
    Info, 
    XCircle, 
    CheckCircle, 
    Clock,
    Cpu,
    HardDrive,
    MemoryStick,
    Monitor,
    Wifi,
    WifiOff
} from "lucide-react";

interface AlertData {
    _id: string;
    timestamp: string;
    meta: {
        type: string;
        deviceName: string;
        acknowledged: boolean;
    };
    threshold: number;
    reading: number;
    message: string;
    acknowledgedAt?: string;
    currentStatus: string;
}

export default function AlertsPage() {
    const { status } = useSession();
    const router = useRouter();
    const [alerts, setAlerts] = useState<AlertData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [timeFilter, setTimeFilter] = useState<string>("7days");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [alertsPerPage, setAlertsPerPage] = useState(10);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    useEffect(() => {
        fetchAlerts();
    }, [filterStatus, timeFilter, currentPage, alertsPerPage]);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filterStatus !== "all") params.append("status", filterStatus);
            if (timeFilter !== "all") params.append("timeFilter", timeFilter);
            params.append("page", currentPage.toString());
            params.append("limit", alertsPerPage.toString());
            
            const response = await fetch(`/api/alertLog?${params.toString()}`);
            const data = await response.json();
            setAlerts(data.alerts || []);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotalCount(data.pagination?.totalCount || 0);
        } catch (error) {
            console.error("Error fetching alerts:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateAlertStatus = async (alertId: string, newStatus: string) => {
        try {
            await fetch(`/api/alertLog?id=${alertId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            fetchAlerts(); // Refresh the list
        } catch (error) {
            console.error("Error updating alert:", error);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'cpu':
                return <Cpu className="h-4 w-4" />;
            case 'ram':
                return <MemoryStick className="h-4 w-4" />;
            case 'disk':
                return <HardDrive className="h-4 w-4" />;
            default:
                return <AlertCircle className="h-4 w-4" />;
        }
    };

    const getSeverityIcon = (reading: number, threshold: number) => {
        const percentage = (reading / threshold) * 100;
        if (percentage >= 100) return <XCircle className="h-4 w-4 text-red-500" />;
        if (percentage >= 90) return <AlertTriangle className="h-4 w-4 text-orange-500" />;
        if (percentage >= 80) return <AlertCircle className="h-4 w-4 text-yellow-500" />;
        return <Info className="h-4 w-4 text-blue-500" />;
    };

    const getSeverityColor = (reading: number, threshold: number) => {
        const percentage = (reading / threshold) * 100;
        if (percentage >= 100) return "destructive";
        if (percentage >= 90) return "destructive";
        return "default";
    };

    const getStatusBadge = (currentStatus: string) => {
        switch (currentStatus) {
            case 'acknowledged':
                return <Badge variant="secondary">Acknowledged</Badge>;
            case 'archived':
                return <Badge variant="outline">Archived</Badge>;
            case 'unacknowledged':
            default:
                return <Badge variant="destructive">Unacknowledged</Badge>;
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
        <DashboardLayout title="Alerts">
            <div className="space-y-6">
                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle>Alert Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
                                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                                </SelectContent>
                            </Select>
                            
                            <Select value={timeFilter} onValueChange={setTimeFilter}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Time period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="24hours">Last 24 Hours</SelectItem>
                                    <SelectItem value="7days">Last 7 Days</SelectItem>
                                    <SelectItem value="30days">Last 30 Days</SelectItem>
                                    <SelectItem value="all">All Time</SelectItem>
                                </SelectContent>
                            </Select>
                            
                            <Button onClick={fetchAlerts} variant="outline">
                                Refresh
                            </Button>
                        </div>
                        
                        {/* Quick Filters */}
                        <div className="flex gap-2 mt-4">
                            <Button 
                                variant={filterStatus === "unacknowledged" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFilterStatus("unacknowledged")}
                            >
                                Unacknowledged Only
                            </Button>
                            <Button 
                                variant={timeFilter === "24hours" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setTimeFilter("24hours")}
                            >
                                Last 24h
                            </Button>
                            <Button 
                                variant={timeFilter === "7days" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setTimeFilter("7days")}
                            >
                                Last 7d
                            </Button>
                            <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setFilterStatus("all");
                                    setTimeFilter("7days");
                                }}
                            >
                                Reset Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts List */}
            <Card>
                <CardHeader>
                        <CardTitle>
                            System Alerts ({totalCount} total)
                            {timeFilter !== 'all' && (
                                <span className="text-sm font-normal text-muted-foreground ml-2">
                                    - {timeFilter === '24hours' ? 'Last 24 Hours' : 
                                        timeFilter === '7days' ? 'Last 7 Days' : 
                                        timeFilter === '30days' ? 'Last 30 Days' : timeFilter}
                                </span>
                            )}
                        </CardTitle>
                </CardHeader>
                <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="text-muted-foreground">Loading alerts...</div>
                            </div>
                        ) : alerts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Alerts Found</h3>
                                <p className="text-muted-foreground">
                                    {filterStatus !== "all" 
                                        ? "No alerts match your current filters." 
                                        : "All systems are running normally."}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {alerts.map((alert) => (
                                    <Alert key={alert._id} variant={getSeverityColor(alert.reading, alert.threshold)}>
                                        <div className="flex items-start justify-between w-full">
                                            <div className="flex items-start space-x-3 flex-1">
                                                {getSeverityIcon(alert.reading, alert.threshold)}
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-1">
                                                        {getTypeIcon(alert.meta.type)}
                                                        <AlertTitle className="text-base">
                                                            {alert.meta.type.toUpperCase()} Alert
                                                        </AlertTitle>
                                                        {getStatusBadge(alert.currentStatus)}
                                                    </div>
                                                    <AlertDescription className="text-sm">
                                                        {alert.message}
                                                    </AlertDescription>
                                                    <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                                                        <span className="flex items-center space-x-1">
                                                            <Monitor className="h-3 w-3" />
                                                            <span>{alert.meta.deviceName}</span>
                                                        </span>
                                                        <span className="flex items-center space-x-1">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{new Date(alert.timestamp).toLocaleString()}</span>
                                                        </span>
                                                        <span>
                                                            Reading: {alert.reading}% (Threshold: {alert.threshold}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex space-x-2 ml-4">
                                                {alert.currentStatus === 'unacknowledged' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => updateAlertStatus(alert._id, "acknowledged")}
                                                    >
                                                        Acknowledge
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Alert>
                                ))}
                            </div>
                        )}
                        
                        {/* Bulk Actions */}
                        {alerts.length > 0 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            // Acknowledge all unacknowledged alerts on current page
                                            const unacknowledgedAlerts = alerts.filter(alert => alert.currentStatus === 'unacknowledged');
                                            unacknowledgedAlerts.forEach(alert => updateAlertStatus(alert._id, "acknowledged"));
                                        }}
                                        disabled={!alerts.some(alert => alert.currentStatus === 'unacknowledged')}
                                    >
                                        Acknowledge All Unacknowledged
                                    </Button>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {alerts.filter(alert => alert.currentStatus === 'unacknowledged').length} unacknowledged, {alerts.filter(alert => alert.currentStatus === 'acknowledged').length} acknowledged, {alerts.filter(alert => alert.currentStatus === 'archived').length} archived
                                </div>
                            </div>
                        )}
                        
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-muted-foreground">Alerts per page:</span>
                                        <Select value={alertsPerPage.toString()} onValueChange={(value) => {
                                            setAlertsPerPage(parseInt(value));
                                            setCurrentPage(1); // Reset to first page when changing page size
                                        }}>
                                            <SelectTrigger className="w-20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="5">5</SelectItem>
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="20">20</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Showing {((currentPage - 1) * alertsPerPage) + 1} to {Math.min(currentPage * alertsPerPage, totalCount)} of {totalCount} alerts
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                    >
                                        First
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                    >
                                        Last
                                    </Button>
                                </div>
                            </div>
                        )}
                </CardContent>
            </Card>
            </div>
        </DashboardLayout>
    );
}


