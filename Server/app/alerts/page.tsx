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
            <div className="space-y-6">
                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold">Alert Filters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Main Filter Controls */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 min-w-0">
                                <label className="text-sm font-medium text-muted-foreground mb-2 block">
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
                            
                            <div className="flex-1 min-w-0">
                                <label className="text-sm font-medium text-muted-foreground mb-2 block">
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
                                <Button onClick={fetchAlerts} variant="outline" className="w-full sm:w-auto">
                                    Refresh
                                </Button>
                            </div>
                        </div>
                        
                        {/* Quick Filter Buttons */}
                        <div className="flex flex-wrap gap-2">
                            <Button 
                                variant={filterStatus === "unacknowledged" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFilterStatus("unacknowledged")}
                                className="text-xs sm:text-sm"
                            >
                                Unacknowledged Only
                            </Button>
                            <Button 
                                variant={timeFilter === "24hours" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setTimeFilter("24hours")}
                                className="text-xs sm:text-sm"
                            >
                                Last 24h
                            </Button>
                            <Button 
                                variant={timeFilter === "7days" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setTimeFilter("7days")}
                                className="text-xs sm:text-sm"
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
                                className="text-xs sm:text-sm"
                            >
                                Reset Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts List */}
            <Card>
                <CardHeader>
                        <CardTitle className="text-lg font-semibold">
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
                    <CardContent className="p-0 sm:p-6">
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
                            <div className="space-y-3 p-4 sm:p-0">
                                {alerts.map((alert) => (
                                    <Alert key={alert._id} variant={getSeverityColor(alert.reading, alert.threshold)} className="p-4">
                                        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                            {/* Main Alert Content */}
                                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                                                {getSeverityIcon(alert.reading, alert.threshold)}
                                                <div className="flex-1 min-w-0">
                                                    {/* Alert Header */}
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                                        <div className="flex items-center space-x-2">
                                                            {getTypeIcon(alert.meta.type)}
                                                            <AlertTitle className="text-base font-semibold">
                                                                {alert.meta.type.toUpperCase()} Alert
                                                            </AlertTitle>
                                                        </div>
                                                        <div className="flex-shrink-0">
                                                            {getStatusBadge(alert.currentStatus)}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Alert Message */}
                                                    <AlertDescription className="text-sm mb-3 leading-relaxed">
                                                        {alert.message}
                                                    </AlertDescription>
                                                    
                                                    {/* Alert Details */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-muted-foreground">
                                                        <div className="flex items-center space-x-2">
                                                            <Monitor className="h-3 w-3 flex-shrink-0" />
                                                            <span className="truncate" title={alert.meta.deviceName}>
                                                                {alert.meta.deviceName}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Clock className="h-3 w-3 flex-shrink-0" />
                                                            <span className="truncate" title={new Date(alert.timestamp).toLocaleString()}>
                                                                {new Date(alert.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="sm:col-span-2 lg:col-span-1">
                                                            <span className="font-medium">
                                                                {alert.reading}% / {alert.threshold}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Action Button */}
                                            <div className="flex justify-end lg:justify-start">
                                                {alert.currentStatus === 'unacknowledged' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => updateAlertStatus(alert._id, "acknowledged")}
                                                        className="w-full sm:w-auto"
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
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-4 border-t px-4 sm:px-0">
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
                                        className="text-xs sm:text-sm"
                                    >
                                        Acknowledge All Unacknowledged
                                    </Button>
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right">
                                    <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                                        <span className="font-medium text-red-600">
                                            {alerts.filter(alert => alert.currentStatus === 'unacknowledged').length} unacknowledged
                                        </span>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="font-medium text-blue-600">
                                            {alerts.filter(alert => alert.currentStatus === 'acknowledged').length} acknowledged
                                        </span>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="font-medium text-gray-600">
                                            {alerts.filter(alert => alert.currentStatus === 'archived').length} archived
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-6 pt-4 border-t px-4 sm:px-0">
                                {/* Page Size and Info */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs sm:text-sm text-muted-foreground">Per page:</span>
                                        <Select value={alertsPerPage.toString()} onValueChange={(value) => {
                                            setAlertsPerPage(parseInt(value));
                                            setCurrentPage(1); // Reset to first page when changing page size
                                        }}>
                                            <SelectTrigger className="w-16 h-8">
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
                                    <div className="text-xs sm:text-sm text-muted-foreground">
                                        Showing {((currentPage - 1) * alertsPerPage) + 1} to {Math.min(currentPage * alertsPerPage, totalCount)} of {totalCount} alerts
                                    </div>
                                </div>
                                
                                {/* Navigation Buttons */}
                                <div className="flex items-center justify-center space-x-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="h-8 px-2 text-xs"
                                    >
                                        First
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="h-8 px-2 text-xs"
                                    >
                                        Prev
                                    </Button>
                                    <span className="text-xs sm:text-sm text-muted-foreground px-2">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="h-8 px-2 text-xs"
                                    >
                                        Next
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages}
                                        className="h-8 px-2 text-xs"
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


