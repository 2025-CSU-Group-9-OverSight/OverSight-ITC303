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
    const [timeFilter, setTimeFilter] = useState<string>("24hours");
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
            <div className="w-full space-y-6">
                {/* Filters */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-semibold">Alert Filters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Main Filter Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">
                                    Status Filter
                                </label>
                                <Select value={filterStatus} onValueChange={setFilterStatus}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
                                        <SelectItem value="acknowledged">Acknowledged</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">
                                    Time Period
                                </label>
                                <Select value={timeFilter} onValueChange={setTimeFilter}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Time period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="24hours">Last 24 Hours</SelectItem>
                                        <SelectItem value="7days">Last 7 Days</SelectItem>
                                        <SelectItem value="30days">Last 30 Days</SelectItem>
                                        <SelectItem value="all">All Time</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="flex items-end">
                                <Button onClick={fetchAlerts} variant="outline" className="w-full">
                                    <Clock className="h-4 w-4 mr-2" />
                                    Refresh
                                </Button>
                            </div>
                        </div>
                        
                        {/* Quick Filter Buttons */}
                        <div className="flex flex-wrap gap-3">
                            <Button 
                                variant={filterStatus === "unacknowledged" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFilterStatus("unacknowledged")}
                                className="text-sm"
                            >
                                Unacknowledged Only
                            </Button>
                            <Button 
                                variant={timeFilter === "24hours" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setTimeFilter("24hours")}
                                className="text-sm"
                            >
                                Last 24h
                            </Button>
                            <Button 
                                variant={timeFilter === "7days" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setTimeFilter("7days")}
                                className="text-sm"
                            >
                                Last 7d
                            </Button>
                            <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setFilterStatus("all");
                                    setTimeFilter("24hours");
                                }}
                                className="text-sm"
                            >
                                Reset Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts List */}
            <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-semibold">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <span>System Alerts ({totalCount} total)</span>
                                {timeFilter !== 'all' && (
                                    <span className="text-sm font-normal text-muted-foreground">
                                        - {timeFilter === '24hours' ? 'Last 24 Hours' : 
                                            timeFilter === '7days' ? 'Last 7 Days' : 
                                            timeFilter === '30days' ? 'Last 30 Days' : timeFilter}
                                    </span>
                                )}
                            </div>
                        </CardTitle>
                </CardHeader>
                    <CardContent className="p-0">
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
                            <div className="space-y-4 p-6">
                                {alerts.map((alert) => (
                                    <Alert key={alert._id} variant={getSeverityColor(alert.reading, alert.threshold)} className="p-6 !grid-cols-1 !gap-0">
                                        <div className="w-full">
                                            {/* Alert Header Row */}
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                                                <div className="flex items-center space-x-3">
                                                    {getSeverityIcon(alert.reading, alert.threshold)}
                                                    <div className="flex items-center space-x-2">
                                                        {getTypeIcon(alert.meta.type)}
                                                        <AlertTitle className="text-lg font-semibold">
                                                            {alert.meta.type.toUpperCase()} Alert
                                                        </AlertTitle>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    {getStatusBadge(alert.currentStatus)}
                                                    {alert.currentStatus === 'unacknowledged' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => updateAlertStatus(alert._id, "acknowledged")}
                                                            className="whitespace-nowrap"
                                                        >
                                                            Acknowledge
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Alert Message */}
                                            <div className="mb-4">
                                                <AlertDescription className="text-base leading-relaxed">
                                                    {alert.message}
                                                </AlertDescription>
                                            </div>
                                            
                                            {/* Alert Details - Full Width Layout */}
                                            <div className="pt-4 border-t border-border/50">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                                    <div className="flex items-start space-x-3">
                                                        <Monitor className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Device</div>
                                                            <div className="text-sm font-semibold text-foreground" title={alert.meta.deviceName}>
                                                                {alert.meta.deviceName}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-start space-x-3">
                                                        <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Time</div>
                                                            <div className="text-sm font-semibold text-foreground" title={new Date(alert.timestamp).toLocaleString()}>
                                                                {new Date(alert.timestamp).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-start space-x-3">
                                                        <div className="h-5 w-5 flex items-center justify-center mt-0.5">
                                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Current Usage</div>
                                                            <div className="text-lg font-bold text-blue-600">
                                                                {alert.reading}%
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-start space-x-3">
                                                        <div className="h-5 w-5 flex items-center justify-center mt-0.5">
                                                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Threshold</div>
                                                            <div className="text-lg font-bold text-orange-600">
                                                                {alert.threshold}%
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Alert>
                                ))}
                            </div>
                        )}
                        
                        {/* Bulk Actions */}
                        {alerts.length > 0 && (
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-6 py-4 bg-muted/30 border-t">
                                <div className="flex items-center space-x-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            // Acknowledge all unacknowledged alerts on current page
                                            const unacknowledgedAlerts = alerts.filter(alert => alert.currentStatus === 'unacknowledged');
                                            unacknowledgedAlerts.forEach(alert => updateAlertStatus(alert._id, "acknowledged"));
                                        }}
                                        disabled={!alerts.some(alert => alert.currentStatus === 'unacknowledged')}
                                        className="text-sm"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Acknowledge All Unacknowledged
                                    </Button>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <div className="flex flex-wrap justify-center lg:justify-end gap-4">
                                        <div className="flex items-center space-x-1">
                                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                            <span className="font-medium text-red-600">
                                                {alerts.filter(alert => alert.currentStatus === 'unacknowledged').length} unacknowledged
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span className="font-medium text-blue-600">
                                                {alerts.filter(alert => alert.currentStatus === 'acknowledged').length} acknowledged
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                                            <span className="font-medium text-gray-600">
                                                {alerts.filter(alert => alert.currentStatus === 'archived').length} archived
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-6 py-4 bg-muted/30 border-t">
                                {/* Page Size and Info */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-sm text-muted-foreground">Per page:</span>
                                        <Select value={alertsPerPage.toString()} onValueChange={(value) => {
                                            setAlertsPerPage(parseInt(value));
                                            setCurrentPage(1); // Reset to first page when changing page size
                                        }}>
                                            <SelectTrigger className="w-20 h-9">
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
                                
                                {/* Navigation Buttons */}
                                <div className="flex items-center justify-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="h-9 px-3 text-sm"
                                    >
                                        First
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="h-9 px-3 text-sm"
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground px-3">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="h-9 px-3 text-sm"
                                    >
                                        Next
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="h-9 px-3 text-sm"
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


