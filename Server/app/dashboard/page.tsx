"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRole } from "@/types/types";
import DashboardLayout from "@/components/dashboard-layout";
import { Progress } from "@/components/ui/progress";
import { DatePickerDemo } from "@/components/date-picker";
import LiveMetricsChart from "@/components/live-metrics-chart";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Users, 
  Cpu,
  Settings, 
  BarChart3, 
  Shield, 
  Activity, 
  Database,
  UserPlus,
  Key,
  Monitor,
  AlertTriangle,
  HardDrive,
  MemoryStick
} from "lucide-react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cpuUsage, setCpuUsage] = useState(70);
  const [memoryUsage, setMemoryUsage] = useState(65);
  const [diskUsage, setDiskUsage] = useState(45);

  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const isAdmin = session?.user?.role === UserRole.ADMIN;
  const dashboardTitle = isAdmin ? "Admin Dashboard" : "Dashboard";

  return (
    <DashboardLayout title={dashboardTitle}>
        <div className="flex flex-row gap-4">
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Select a machine" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Machines</SelectItem>
                </SelectContent>
            </Select>
            <div className="flex flex-col gap-4">
            <Select>
                <SelectTrigger>
                    <SelectValue placeholder="Select Time Period" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="24">Last 24 Hrs</SelectItem>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                </SelectContent>
            </Select>
            </div>
        </div>
        <div className="flex flex-col gap-4"></div>
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Cpu className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-black">CPU Usage</p>
                  <p className="text-small text-muted-foreground text-gray-900">Average across all machines</p>
                  <p className="text-2xl font-bold text-gray-900">{cpuUsage}%</p>
                  <Progress value={cpuUsage} className="h-2 mt-2 [&>div]:bg-blue-500 bg-gray-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MemoryStick className="h-8 w-8 text-violet-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-black">Memory Usage</p>
                  <p className="text-small text-muted-foreground text-blue-900">Average across all machines</p>
                  <p className="text-2xl font-bold text-gray-900">{memoryUsage}%</p>
                  <Progress value={memoryUsage} className="h-2 mt-2 [&>div]:bg-violet-500 bg-gray-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <HardDrive className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-2xl font-bold text-black">Disk Usage</p>
                  <p className="text-small text-muted-foreground text-gray-900">Average across all machines</p>
                  <p className="text-2xl font-bold text-gray-900">{diskUsage}%</p>
                  <Progress value={diskUsage} className="h-2 mt-2 [&>div]:bg-green-500 bg-gray-300" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
        {/* Live Metrics */}
        <div className="flex flex-col gap-4">
            <LiveMetricsChart title="Live System Metrics" />
        </div>

       
    </DashboardLayout>
  );
}
