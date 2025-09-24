import getDb from "../lib/getDb";
import { Alert, AlertType, AlertSeverity, AlertStatus } from "../types/types";
import { ObjectId } from "mongodb";

async function seedAlerts() {
    try {
        console.log("Starting alert seeding...");
        
        const db = await getDb();
        const alertLog = db.collection("alertLog");
        
        // Clear existing alerts
        const deleteResult = await alertLog.deleteMany({});
        console.log(`Cleared ${deleteResult.deletedCount} existing alerts`);
        
        // Sample alerts
        const sampleAlerts: Omit<Alert, 'id'>[] = [
            {
                type: AlertType.CPU_HIGH,
                severity: AlertSeverity.HIGH,
                status: AlertStatus.ACTIVE,
                title: "High CPU Usage Detected",
                description: "CPU usage has exceeded 85% for more than 5 minutes on device D_Stin",
                deviceName: "D_Stin",
                timestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
                metadata: {
                    cpuUsage: 87.3,
                    threshold: 85,
                    duration: "5m 23s"
                }
            },
            {
                type: AlertType.MEMORY_HIGH,
                severity: AlertSeverity.MEDIUM,
                status: AlertStatus.ACTIVE,
                title: "Memory Usage Warning",
                description: "Memory usage is at 78% on device Tim-PC",
                deviceName: "Tim-PC",
                timestamp: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
                metadata: {
                    memoryUsage: 78.2,
                    threshold: 75,
                    availableMemory: "7.2 GB"
                }
            },
            {
                type: AlertType.DISK_HIGH,
                severity: AlertSeverity.CRITICAL,
                status: AlertStatus.ACTIVE,
                title: "Critical Disk Space Alert",
                description: "Disk C: is 91% full on device Tim-PC",
                deviceName: "Tim-PC",
                timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
                metadata: {
                    diskUsage: 91.9,
                    threshold: 90,
                    freeSpace: "41.2 GB",
                    partition: "C:\\"
                }
            },
            {
                type: AlertType.PROCESS_CRASH,
                severity: AlertSeverity.HIGH,
                status: AlertStatus.ACKNOWLEDGED,
                title: "Process Crash Detected",
                description: "Application 'chrome.exe' crashed unexpectedly on device D_Stin",
                deviceName: "D_Stin",
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                acknowledgedBy: "admin@gmail.com",
                acknowledgedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
                metadata: {
                    processName: "chrome.exe",
                    pid: 1234,
                    exitCode: -1,
                    crashReason: "Access Violation"
                }
            },
            {
                type: AlertType.SERVICE_DOWN,
                severity: AlertSeverity.CRITICAL,
                status: AlertStatus.ACTIVE,
                title: "Critical Service Down",
                description: "Windows Update service has stopped on device Tim-PC",
                deviceName: "Tim-PC",
                timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
                metadata: {
                    serviceName: "Windows Update",
                    serviceDisplayName: "Windows Update",
                    expectedStatus: "Running",
                    actualStatus: "Stopped"
                }
            },
            {
                type: AlertType.CONNECTION_LOST,
                severity: AlertSeverity.MEDIUM,
                status: AlertStatus.RESOLVED,
                title: "Connection Lost",
                description: "Lost connection to monitoring agent on device D_Stin",
                deviceName: "D_Stin",
                timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
                resolvedAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000), // 3.5 hours ago
                metadata: {
                    lastSeen: new Date(Date.now() - 4 * 60 * 60 * 1000),
                    reconnectedAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
                    downtime: "30 minutes"
                }
            },
            {
                type: AlertType.CPU_HIGH,
                severity: AlertSeverity.LOW,
                status: AlertStatus.ACTIVE,
                title: "CPU Usage Elevated",
                description: "CPU usage is moderately high at 72% on device D_Stin",
                deviceName: "D_Stin",
                timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
                metadata: {
                    cpuUsage: 72.1,
                    threshold: 70,
                    duration: "2m 15s"
                }
            },
            {
                type: AlertType.MEMORY_HIGH,
                severity: AlertSeverity.HIGH,
                status: AlertStatus.ACTIVE,
                title: "Memory Usage Critical",
                description: "Memory usage has reached 89% on device Tim-PC",
                deviceName: "Tim-PC",
                timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
                metadata: {
                    memoryUsage: 89.4,
                    threshold: 85,
                    availableMemory: "3.6 GB"
                }
            }
        ];
        
        // Insert alerts with generated IDs
        const alertsWithIds = sampleAlerts.map(alert => ({
            ...alert,
            id: new ObjectId().toString()
        }));
        
        const result = await alertLog.insertMany(alertsWithIds);
        console.log(`Successfully seeded ${result.insertedCount} alerts:`);
        
        alertsWithIds.forEach(alert => {
            console.log(`- ${alert.title} (${alert.severity}) - ${alert.deviceName}`);
        });
        
        console.log("Alert seeding completed successfully!");
        
    } catch (error) {
        console.error("Error seeding alerts:", error);
        process.exit(1);
    }
}

seedAlerts();
