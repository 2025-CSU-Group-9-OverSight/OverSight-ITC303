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
    resolvedAt?: string;
}

export default function AlertsPage() {
    const { status } = useSession();
    const router = useRouter();
    const [alerts, setAlerts] = useState<AlertData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>("all");

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    useEffect(() => {
        fetchAlerts();
    }, [filterStatus]);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filterStatus !== "all") params.append("status", filterStatus);
            
            const response = await fetch(`/api/alertLog?${params.toString()}`);
            const data = await response.json();
            setAlerts(data.alerts || []);
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

    const getStatusBadge = (acknowledged: boolean, resolvedAt?: string) => {
        if (resolvedAt) {
            return <Badge variant="secondary">Resolved</Badge>;
        } else if (acknowledged) {
            return <Badge variant="default">Acknowledged</Badge>;
        } else {
            return <Badge variant="destructive">Active</Badge>;
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
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                </SelectContent>
                            </Select>
                            
                            
                            <Button onClick={fetchAlerts} variant="outline">
                                Refresh
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts List */}
                <Card>
                    <CardHeader>
                        <CardTitle>System Alerts ({alerts.length})</CardTitle>
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
                                                        {getStatusBadge(alert.meta.acknowledged, alert.resolvedAt)}
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
                                                {!alert.meta.acknowledged && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => updateAlertStatus(alert._id, "acknowledged")}
                                                    >
                                                        Acknowledge
                                                    </Button>
                                                )}
                                                {alert.meta.acknowledged && !alert.resolvedAt && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => updateAlertStatus(alert._id, "resolved")}
                                                    >
                                                        Resolve
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Alert>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}


