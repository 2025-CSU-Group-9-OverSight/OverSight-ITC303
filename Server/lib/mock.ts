import { UserRole } from "@/types/types";

export type MockProcess = {
  id: string;
  name: string;
  host: string;
  cpuPct: number;
  memoryMb: number;
  status: "running" | "warning" | "stopped";
  updatedAt: string;
};

export type MockVm = {
  id: string;
  name: string;
  host: string;
  cpu: number;
  memory: number;
  disk: number;
  updatedAt: string;
};

export type MockUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
};

export type MockSettings = {
  theme: "light" | "dark" | "system";
  density: "compact" | "comfortable";
  timeFormat: "12h" | "24h";
};

const now = () => new Date().toISOString();

export const mockProcesses: MockProcess[] = [
  { id: "1", name: "Collector Service", host: "srv-01", cpuPct: 14, memoryMb: 512, status: "running", updatedAt: now() },
  { id: "2", name: "Ingest Worker", host: "srv-02", cpuPct: 32, memoryMb: 1024, status: "warning", updatedAt: now() },
  { id: "3", name: "Report Generator", host: "srv-03", cpuPct: 4, memoryMb: 256, status: "stopped", updatedAt: now() },
  { id: "4", name: "Metrics API", host: "srv-01", cpuPct: 18, memoryMb: 768, status: "running", updatedAt: now() },
];

export const mockVms: MockVm[] = [
  { id: "vm-1", name: "vm-app-01", host: "esx-01", cpu: 42, memory: 63, disk: 55, updatedAt: now() },
  { id: "vm-2", name: "vm-db-01", host: "esx-02", cpu: 68, memory: 71, disk: 80, updatedAt: now() },
  { id: "vm-3", name: "vm-cache-01", host: "esx-01", cpu: 22, memory: 34, disk: 28, updatedAt: now() },
  { id: "vm-4", name: "vm-api-02", host: "esx-03", cpu: 57, memory: 48, disk: 61, updatedAt: now() },
];

export const mockUsers: MockUser[] = [
  { id: "u1", email: "admin@gmail.com", name: "Admin User", role: UserRole.ADMIN, createdAt: "2024-01-02T00:00:00Z" },
  { id: "u2", email: "standard@gmail.com", name: "Standard User", role: UserRole.STANDARD, createdAt: "2024-02-10T00:00:00Z" },
];

export const mockSettingsByUserId: Record<string, MockSettings> = {
  default: { theme: "light", density: "comfortable", timeFormat: "24h" },
};


