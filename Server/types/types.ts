export type User = {
    id: string;
    name?: string;
    email: string;
    password: string;
    role: UserRole;
    profilePicture?: string;
    createdAt: Date;
    updatedAt: Date;
}

export enum UserRole {
    ADMIN = "admin",
    STANDARD = "standard"
}

export enum AlertSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}

export enum AlertStatus {
    ACTIVE = "active",
    ACKNOWLEDGED = "acknowledged",
    RESOLVED = "resolved"
}

export enum AlertType {
    CPU_HIGH = "cpu_high",
    MEMORY_HIGH = "memory_high",
    DISK_HIGH = "disk_high",
    PROCESS_CRASH = "process_crash",
    SERVICE_DOWN = "service_down",
    CONNECTION_LOST = "connection_lost"
}

export type Alert = {
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    status: AlertStatus;
    title: string;
    description: string;
    deviceName: string;
    timestamp: Date;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
    resolvedAt?: Date;
    metadata?: Record<string, any>;
}